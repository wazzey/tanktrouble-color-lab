// TankTrouble Color Lab - shared looks server (Cloudflare Worker + D1, database bound as "DB").
// Stores each player's Color Lab look so other Color Lab users can see it, with the tank's public TankTrouble name (for the admin page). No IPs are stored (a connection is only
// kept as a scrambled one-way code that changes every day, for the limits, reports and bans).
//   GET    /v1/looks?ids=1,2,3        -> { looks: { "1": { look, updated } } }   (up to 16 ids)
//   PUT    /v1/looks/<playerId>       body { key, look }   (the first copy to save a player ID owns it: same key needed after)
//   DELETE /v1/looks/<playerId>       body { key }
//   GET    /v1/live  (WebSocket)       send {"watch":[ids]}; a look saved for a watched tank arrives at once as {"pid","look","updated"}
//   POST   /v1/verify/start, /v1/verify/check  body { pid, key }  prove a tank is yours (see "Proving a tank is yours" below)
//   POST   /v1/report                 body { pid, key }   report a shared look (enough different people: it's hidden)
//   GET    /admin                     the owner's admin page (needs the ADMIN_TOKEN secret: npx wrangler secret put ADMIN_TOKEN)
// Alerts: set ALERT_WEBHOOK (a Discord webhook address) with  npx wrangler secret put ALERT_WEBHOOK
//         and ALERT_MENTION (your Discord user ID) with  npx wrangler secret put ALERT_MENTION  so each alert pings you
//         or, with the bot set up, ALERT_CHANNEL_ID (your logs channel) to send alerts through the bot instead of the webhook
// Proven tanks only: PROVEN_ONLY = "1" under [vars] in wrangler.toml - a look is only saved, and only shown, for a tank its owner proved
// To remove a look by hand: Cloudflare dashboard > D1 > the database > Console: DELETE FROM looks WHERE pid = '123';
// Abuse guard: a copy of Color Lab (and each internet connection) can only take a few new player IDs a day, and a key or
// connection can be banned: INSERT INTO banned (hash) VALUES ('<keyhash>'); (the connection is kept only as a scrambled
// one-way code, for a day, and never next to a look).

const MAX_IDS = 16,
  MAX_LOOK = 2048,
  MIN_GAP_MS = 1000,
  MAX_WATCH = 64;
const NEW_PER_DAY = 3,
  DAY = 86400000,
  NEW_AT_ONCE = 2,
  BURST = 600000; // (and at most 4 new tanks in 10 minutes: one browser can hold up to 4 tanks at once)
const BAN_AFTER = 5; // a copy (or connection) that tries to change this many tanks shared by other copies in a day is banned
const REPORTS_TO_HIDE = 5; // (different people reporting the same unproven look within 7 days before it's hidden; REPORTS_TO_HIDE under [vars] changes it)
const PROBE_BAN = 5; // trying to prove this many different tanks in a day without managing any of them = probing other players' tanks: banned
const MIN_AGE_HOURS = 3; // a TankTrouble account must be this old to have a look shared (when proven-only mode is off)
// A brand-new account has to wait this long before it can be proven and share its look (NEW_ACCOUNT_HOURS under [vars] changes it)
const newAccountHours = (env) => {
  const h = Number(env.NEW_ACCOUNT_HOURS);
  return h >= 0 ? h : 24;
};
function tooNew(env, d) {
  const h = newAccountHours(env),
    age = Date.now() / 1000 - Number(d && d.created);
  if (!h || !(Number(d && d.created) > 0)) {
    return 0;
  }
  return age >= h * 3600 ? 0 : Math.max(1, Math.ceil((h * 3600 - age) / 3600));
} // (hours still to wait, or 0)
// Bans happen for one thing only: trying to change the look of tanks another copy of Color Lab already shares or proved
// (BAN_AFTER of them in a day). Everything else (limits, guests, unproven tanks) is just refused. // REPORTS_TO_HIDE different people reporting a look hides it (unless its owner proved the tank is theirs)
// Quarantine (automatic): a copy that goes after other players' tanks is put on hold, with its connection. It can't save,
// prove or report anything and its looks are hidden (not deleted) until the owner checks it on the admin page and either
// releases it or bans it.
async function quarantineWho(env, ctx, kh, ih, ipp, why) {
  const now = Date.now();
  await env.DB.batch(
    [kh, ih, ipp]
      .filter(Boolean)
      .map((h) =>
        env.DB.prepare("INSERT OR IGNORE INTO quarantine (hash, grp, why, at) VALUES (?, ?, ?, ?)").bind(
          h,
          kh,
          why,
          now,
        ),
      ),
  );
  const mine = (await env.DB.prepare("SELECT pid FROM looks WHERE keyhash = ?").bind(kh).all()).results || [];
  if (env.HUB) {
    for (const r of mine) {
      ctx.waitUntil(
        hub(env)
          .notify(String(r.pid), null, now)
          .catch(() => {}),
      );
    }
  } // (its looks disappear for everyone straight away)
  const nm = mine.length
    ? (
        (await env.DB.prepare(
          `SELECT group_concat(name, ', ') AS n FROM names WHERE pid IN (${mine.map(() => "?").join(",")})`,
        )
          .bind(...mine.map((r) => String(r.pid)))
          .first()) || {}
      ).n
    : "";
  ctx.waitUntil(
    alert(
      env,
      "quarantine",
      "Put a copy of Color Lab (" +
        kh.slice(0, 10) +
        ") on hold: " +
        why +
        ". Its own tanks: " +
        (nm || mine.length || "none") +
        ". Check it on the admin page",
    ),
  );
}
const onHold = (env, ...hashes) =>
  env.DB.prepare(`SELECT 1 FROM quarantine WHERE hash IN (${hashes.map(() => "?").join(",")})`)
    .bind(...hashes)
    .first();
async function whoOf(env, h) {
  // the usernames seen on a copy or connection code (tanks it proved, claimed or shared)
  try {
    return (
      (
        (await env.DB.prepare(
          "SELECT group_concat(DISTINCT COALESCE(n.name, x.pid)) AS w FROM (SELECT pid FROM verified WHERE keyhash = ?1 UNION SELECT pid FROM claims WHERE who = ?1 AND pid GLOB '[0-9]*' UNION SELECT pid FROM looks WHERE keyhash = ?1) x LEFT JOIN names n ON n.pid = x.pid",
        )
          .bind(h)
          .first()) || {}
      ).w || ""
    );
  } catch {
    return "";
  }
}
async function banWho(env, ctx, kh, ih, now, ipp) {
  // banned: and every look it saved is taken down, so the real tanks show again at once
  const gone = (await env.DB.prepare("SELECT pid FROM looks WHERE keyhash = ?").bind(kh).all()).results || [];
  const whoNames =
    (
      (await env.DB.prepare(
        "SELECT group_concat(DISTINCT COALESCE(n.name, x.pid)) AS w FROM (SELECT pid FROM verified WHERE keyhash IN (?1, ?2) UNION SELECT pid FROM claims WHERE who IN (?1, ?2) AND pid GLOB '[0-9]*' UNION SELECT pid FROM looks WHERE keyhash = ?1) x LEFT JOIN names n ON n.pid = x.pid",
      )
        .bind(kh, ih)
        .first()) || {}
    ).w || null; // (kept: the claims it leaves expire after a day)
  await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO banned (hash, at, kind, who) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)",
    ).bind(kh, now, "copy", whoNames, ih, now, "connection", whoNames, ipp || ih, now, "connection", whoNames),
    env.DB.prepare("DELETE FROM looks WHERE keyhash = ?").bind(kh),
  ]); // (the copy, and its connection for good)
  if (env.HUB) {
    for (const r of gone) {
      ctx.waitUntil(
        hub(env)
          .notify(String(r.pid), null, now)
          .catch(() => {}),
      );
    }
  }
  const nm = gone.length
    ? (
        (await env.DB.prepare(
          `SELECT group_concat(name, ', ') AS n FROM names WHERE pid IN (${gone.map(() => "?").join(",")})`,
        )
          .bind(...gone.map((r) => String(r.pid)))
          .first()) || {}
      ).n
    : "";
  ctx.waitUntil(
    alert(
      env,
      "ban",
      "Banned a copy of Color Lab (" +
        kh.slice(0, 10) +
        ") for trying to change other players' looks; " +
        gone.length +
        " of its looks removed" +
        (nm ? " (" + nm + ")" : ""),
    ),
  );
}
let tablesReady = false;
async function ensureTables(env) {
  if (tablesReady) {
    return;
  }
  await env.DB.batch([
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS looks (pid TEXT PRIMARY KEY, look TEXT NOT NULL, keyhash TEXT NOT NULL, updated INTEGER NOT NULL)",
    ),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS claims (who TEXT NOT NULL, pid TEXT NOT NULL, at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS claims_who ON claims (who, at)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS banned (hash TEXT PRIMARY KEY)"),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS verified (pid TEXT PRIMARY KEY, keyhash TEXT NOT NULL, at INTEGER NOT NULL)",
    ),
    env.DB.prepare("DROP TABLE IF EXISTS challenges"), // (left over from the first way of proving; not used)
    env.DB.prepare("CREATE TABLE IF NOT EXISTS reports (pid TEXT NOT NULL, who TEXT NOT NULL, at INTEGER NOT NULL)"),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS hidden (pid TEXT PRIMARY KEY, keyhash TEXT NOT NULL, at INTEGER NOT NULL)",
    ),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS events (at INTEGER NOT NULL, kind TEXT NOT NULL, detail TEXT NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS events_at ON events (at)"), // the alerts check reads only the last 2 days, not the whole table
    env.DB.prepare("CREATE TABLE IF NOT EXISTS trusted (hash TEXT PRIMARY KEY)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS blocked (hash TEXT PRIMARY KEY, until INTEGER NOT NULL)"),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS quarantine (hash TEXT PRIMARY KEY, grp TEXT NOT NULL, why TEXT NOT NULL, at INTEGER NOT NULL)",
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS look_history (id INTEGER PRIMARY KEY AUTOINCREMENT, pid TEXT NOT NULL, kh TEXT, at INTEGER NOT NULL, cc TEXT, look TEXT)",
    ), // (every look saved, for the admin page: kept 30 days)
    env.DB.prepare("CREATE INDEX IF NOT EXISTS look_history_pid ON look_history (pid, at)"),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, keyhash TEXT NOT NULL, who TEXT NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL)",
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS replies (fid INTEGER NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL)",
    ),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS feedback_pids (fid INTEGER NOT NULL, pid TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS forum_seen (thread TEXT PRIMARY KEY, last INTEGER NOT NULL)"),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS forum_drafts (id INTEGER PRIMARY KEY AUTOINCREMENT, thread TEXT NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL)",
    ), // (forum replies typed in Discord, for the owner to paste or have filled in)
    env.DB.prepare("CREATE TABLE IF NOT EXISTS alerted (k TEXT PRIMARY KEY, at INTEGER NOT NULL)"),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS presence (kh TEXT PRIMARY KEY, ver TEXT, first INTEGER NOT NULL, last INTEGER NOT NULL)",
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS seen_accts (pid TEXT PRIMARY KEY, kh TEXT, ver TEXT, first INTEGER NOT NULL, last INTEGER NOT NULL)",
    ), // (every account seen logged in on a v1.4.1+ copy: the admin page's player list)
    env.DB.prepare("CREATE TABLE IF NOT EXISTS logged (kh TEXT PRIMARY KEY, pids TEXT NOT NULL, at INTEGER NOT NULL)"),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS release (id INTEGER PRIMARY KEY, tag TEXT NOT NULL, body TEXT NOT NULL, at INTEGER NOT NULL)",
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS announce (id INTEGER PRIMARY KEY, text TEXT NOT NULL, at INTEGER NOT NULL)",
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS bcast_log (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT NOT NULL, at INTEGER NOT NULL)",
    ), // (every announcement: v1.4 copies get them as a message from Color Lab)
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS bcast (id INTEGER PRIMARY KEY, n INTEGER NOT NULL, title TEXT, body TEXT NOT NULL, link TEXT, ltext TEXT, until INTEGER, at INTEGER NOT NULL)",
    ), // (a live announcement: every v1.4+ copy shows it) // (a message from the owner, shown at the top of the update pop-up)
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS swept (pid TEXT NOT NULL, name TEXT, guest INTEGER, why TEXT NOT NULL, at INTEGER NOT NULL)",
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS copies (kh TEXT NOT NULL, ih TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (kh, ih))",
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS names (pid TEXT PRIMARY KEY, name TEXT NOT NULL, guest INTEGER NOT NULL, at INTEGER NOT NULL)",
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS proofs (pid TEXT NOT NULL, keyhash TEXT NOT NULL, part TEXT NOT NULL, kind TEXT NOT NULL, want TEXT NOT NULL, back TEXT NOT NULL, stage INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (pid, keyhash))",
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS saves (pid TEXT PRIMARY KEY, ver INTEGER NOT NULL, blob TEXT NOT NULL, at INTEGER NOT NULL)",
    ), // (an account's backup: its saved looks and achievement progress)
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS save_hist (pid TEXT NOT NULL, ver INTEGER NOT NULL, blob TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (pid, ver))",
    ), // (the last few versions, so a ruined save can be put back)
  ]);
  try {
    await env.DB.prepare("ALTER TABLE logged ADD COLUMN srv TEXT").run();
  } catch {}
  for (const t of ["bcast", "bcast_log"]) {
    try {
      await env.DB.prepare("ALTER TABLE " + t + " ADD COLUMN zip INTEGER").run();
    } catch {}
  } // (an announcement only for copies installed from GitHub, not the Chrome Web Store)
  try {
    await env.DB.prepare("ALTER TABLE banned ADD COLUMN at INTEGER").run();
  } catch {} // (when it was banned, and whether it's a copy or a connection)
  try {
    await env.DB.prepare("ALTER TABLE banned ADD COLUMN kind TEXT").run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE banned ADD COLUMN who TEXT").run();
  } catch {} // (the usernames seen on it when it was banned)
  try {
    await env.DB.prepare("ALTER TABLE presence ADD COLUMN off INTEGER").run();
  } catch {} // (the player switched Color Lab to offline on purpose)
  try {
    await env.DB.prepare("ALTER TABLE presence ADD COLUMN offat INTEGER").run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE reports ADD COLUMN kh TEXT").run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE presence ADD COLUMN inv INTEGER").run();
  } catch {} // (invisible: not shown or counted for other players; the owner still sees it) // (which copy of Color Lab sent a report: only the owner sees who)
  try {
    await env.DB.prepare("ALTER TABLE logged ADD COLUMN away INTEGER").run();
  } catch {} // (in the lobby with the tab in the background for a while: offline for other players, the owner still sees it)
  try {
    await env.DB.prepare("ALTER TABLE logged ADD COLUMN wh TEXT").run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE logged ADD COLUMN sat INTEGER").run();
  } catch {} // (when the copy went idle or away) // (where the player is: lobby, game or queue)
  try {
    await env.DB.prepare("ALTER TABLE logged ADD COLUMN shown INTEGER").run();
  } catch {} // (the player chose to be shown to other Color Lab players)
  try {
    await env.DB.prepare("ALTER TABLE logged ADD COLUMN shsrv INTEGER").run();
  } catch {} // (and chose to show which TankTrouble server they're on)
  try {
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS presence_last ON presence (last)").run();
  } catch {}
  try {
    await env.DB.prepare("ALTER TABLE logged ADD COLUMN idle INTEGER").run();
  } catch {} // (away from the game: tab hidden or no input for a few minutes) // (the TankTrouble server a copy plays on; already there after the first time)
  tablesReady = true;
}
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const ipPerm = (env, req) =>
  sha256((env.IP_SALT || "ttcl-ip-v1") + "|perm|" + (req.headers.get("CF-Connecting-IP") || "")); // (a connection's lasting code: only ever stored for a banned connection)
const ipHash = (env, req) =>
  sha256(
    (env.IP_SALT || "ttcl-ip-v1") +
      "|" +
      (req.headers.get("CF-Connecting-IP") || "") +
      "|" +
      Math.floor(Date.now() / DAY),
  ); // (changes every day: can't be followed from one day to the next)

// ---------- alerts: kept for the admin page, and sent to the owner's Discord (or similar) webhook if one is set ----------
const URGENT = new Set(["quarantine", "flood", "spam", "admin lockout", "urgent test"]); // (only these ping you; everything else is posted quietly)
async function alert(env, kind, text) {
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO events (at, kind, detail) VALUES (?, ?, ?)").bind(
        Date.now(),
        kind,
        String(text).slice(0, 500),
      ),
      env.DB.prepare("DELETE FROM events WHERE at < ?").bind(Date.now() - 30 * DAY),
    ]);
  } catch {}
  const urgent = URGENT.has(kind),
    who =
      urgent && /^\d{15,22}$/.test(String(env.ALERT_MENTION || "").trim()) ? String(env.ALERT_MENTION).trim() : null; // (your Discord user ID: urgent alerts ping you)
  const msg = JSON.stringify({
    content: (who ? "<@" + who + "> 🚨 " : "") + "**Color Lab " + kind + "**: " + String(text).slice(0, 1800),
    allowed_mentions: { users: who ? [who] : [] },
  });
  if (env.DISCORD_BOT_TOKEN && env.ALERT_CHANNEL_ID) {
    let why; // (through the bot, into your logs channel; if Discord says no, the reason is noted on the admin page)
    try {
      const r = await fetch(
        "https://discord.com/api/v10/channels/" + String(env.ALERT_CHANNEL_ID).trim() + "/messages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bot " + String(env.DISCORD_BOT_TOKEN).trim() },
          body: msg,
        },
      );
      if (r.ok) {
        return;
      }
      why = r.status + " " + (await r.text()).slice(0, 200);
    } catch (e) {
      why = String((e && e.message) || e).slice(0, 200);
    }
    try {
      await env.DB.prepare("INSERT INTO events (at, kind, detail) VALUES (?, ?, ?)")
        .bind(Date.now(), "discord error", "Couldn't post the " + kind + " alert to #logs: " + why)
        .run();
    } catch {}
  } // (through the bot, into your logs channel)
  if (env.ALERT_WEBHOOK) {
    try {
      await fetch(env.ALERT_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: msg });
    } catch {}
  } // (or through the webhook)
}
// The same warning only once a day (pattern alerts)
async function alertOnce(env, key, kind, text) {
  try {
    const r = await env.DB.prepare("SELECT at FROM alerted WHERE k = ?").bind(key).first();
    if (r && Date.now() - r.at < DAY) {
      return;
    }
    await env.DB.prepare("INSERT OR REPLACE INTO alerted (k, at) VALUES (?, ?)").bind(key, Date.now()).run();
  } catch {
    return;
  }
  await alert(env, kind, text);
}
// Who's using Color Lab: every copy checks for message replies every 5 minutes while TankTrouble is open, so a copy seen in the
// last 15 minutes is online. Saved at most every 10 minutes a copy (a skipped save writes nothing), for the admin page only.
const presSeen = new Map(),
  presInv = new Map();
const loggedSeen = new Map();
const presOff = new Map();
async function touchPresence(env, kh, req, pids, srv, idle, show, shsrv, away, wh, ifor) {
  const now = Date.now();
  const sh = show === true ? 1 : 0,
    ss = show === true && shsrv === true ? 1 : 0; // (nobody is shown to others unless their copy says so; the server name only if they chose that too)
  if (Array.isArray(pids)) {
    const p =
      pids
        .map(String)
        .filter((x) => PID.test(x))
        .slice(0, 4)
        .sort()
        .join(",") +
      "#" +
      String(srv || "")
        .replace(/[^\w ()-]/g, "")
        .slice(0, 24) +
      "#" +
      (idle ? 1 : 0) +
      "#" +
      sh +
      "#" +
      ss +
      "#" +
      (away ? 1 : 0) +
      "#" +
      (["lobby", "game", "queue"].includes(wh) ? wh : ""); // (copies from v1.4 say which tanks are logged in right now; saved only when that changes)
    if (loggedSeen.get(kh) !== p) {
      loggedSeen.set(kh, p);
      const [ps, sv, id, , , aw, w] = p.split("#");
      const quiet = id === "1" || aw === "1",
        sat = quiet ? now - Math.min(Math.max(Number(ifor) || 0, 0), 1440) * 60000 : null; // (idle or away since: the copy says how many minutes)
      try {
        await env.DB.prepare(
          "INSERT INTO logged (kh, pids, srv, idle, shown, shsrv, away, wh, sat, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(kh) DO UPDATE SET pids = excluded.pids, srv = excluded.srv, idle = excluded.idle, shown = excluded.shown, shsrv = excluded.shsrv, away = excluded.away, wh = excluded.wh, sat = CASE WHEN excluded.sat IS NULL THEN NULL WHEN logged.sat IS NULL OR logged.idle IS NOT excluded.idle OR logged.away IS NOT excluded.away THEN excluded.sat ELSE logged.sat END, at = excluded.at",
        )
          .bind(kh, ps, sv || null, id === "1" ? 1 : 0, sh, ss, aw === "1" ? 1 : 0, w || null, sat, now)
          .run();
        pubOnline = { at: 0, data: null };
      } catch {}
    }
  } else if (show === false && loggedSeen.get(kh) !== "off") {
    loggedSeen.set(kh, "off");
    try {
      await env.DB.prepare("UPDATE logged SET shown = 0, shsrv = 0 WHERE kh = ?").bind(kh).run();
    } catch {}
  } // (sharing switched off: gone from the list at once)
  if (now - (presSeen.get(kh) || 0) < 60000) {
    return;
  }
  presSeen.set(kh, now); // (last seen kept to within a minute, so a copy coming back right after its tab was closed shows online again quickly)
  const ver = String(req.headers.get("x-ttcl-version") || new URL(req.url).searchParams.get("v") || "?").slice(0, 12);
  try {
    await env.DB.prepare(
      "INSERT INTO presence (kh, ver, first, last) VALUES (?, ?, ?, ?) ON CONFLICT(kh) DO UPDATE SET ver = excluded.ver, last = excluded.last WHERE presence.last < ? OR presence.ver <> excluded.ver",
    )
      .bind(kh, ver, now, now, now - 60000)
      .run();
  } catch {}
  if (Array.isArray(pids) && ver !== "?" && !verAbove("1.4.1", ver)) {
    const ps = pids
      .map(String)
      .filter((x) => PID.test(x))
      .slice(0, 4);
    if (ps.length) {
      try {
        await env.DB.batch(
          ps.map((pid) =>
            env.DB.prepare(
              "INSERT INTO seen_accts (pid, kh, ver, first, last) VALUES (?, ?, ?, ?, ?) ON CONFLICT(pid) DO UPDATE SET kh = excluded.kh, ver = excluded.ver, last = excluded.last",
            ).bind(pid, kh, ver, now, now),
          ),
        );
      } catch {}
    }
  }
}
// What every Color Lab user can see of who's online: only players who turned "show me" on, only tanks proven to be theirs, never
// guests, never versions or last-seen times; the server name only if they chose to show it. Worked out once a minute for everyone.
const ONLINE_MS = 7 * 60000,
  IDLE_HIDE_MS = 15 * 60000; // (idle for 15 minutes: other players see them as offline; the owner still sees them)
let pubOnline = { at: 0, data: null };
async function publicOnline(env, now) {
  if (pubOnline.data && now - pubOnline.at < 30000) {
    return pubOnline.data;
  }
  const c = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM presence p WHERE p.last > ? AND COALESCE(p.inv, 0) = 0 AND NOT EXISTS (SELECT 1 FROM logged l WHERE l.kh = p.kh AND (l.away = 1 OR (l.idle = 1 AND l.sat < ?)))",
    )
      .bind(now - ONLINE_MS, now - IDLE_HIDE_MS)
      .first(),
    online = c ? c.n : 0;
  const rows =
    (
      await env.DB.prepare(
        "SELECT l.kh, l.pids, l.srv, l.idle, l.shsrv, l.wh FROM logged l JOIN presence p ON p.kh = l.kh WHERE l.shown = 1 AND COALESCE(p.inv, 0) = 0 AND COALESCE(l.away, 0) = 0 AND NOT (COALESCE(l.idle, 0) = 1 AND l.sat < ?) AND p.last > ? ORDER BY p.last DESC LIMIT 60",
      )
        .bind(now - IDLE_HIDE_MS, now - ONLINE_MS)
        .all()
    ).results || [];
  const pids = [...new Set(rows.flatMap((r) => (r.pids ? r.pids.split(",") : [])))].slice(0, 120),
    own = {},
    nm = {};
  if (pids.length) {
    const q = pids.map(() => "?").join(",");
    for (const r of (
      await env.DB.prepare(`SELECT pid, keyhash FROM verified WHERE pid IN (${q})`)
        .bind(...pids)
        .all()
    ).results || []) {
      own[r.pid] = r.keyhash;
    }
    for (const r of (
      await env.DB.prepare(`SELECT pid, name, guest FROM names WHERE pid IN (${q})`)
        .bind(...pids)
        .all()
    ).results || []) {
      nm[r.pid] = r;
    }
  }
  let asked = 0;
  for (const r of rows) {
    for (const p of (r.pids || "").split(",")) {
      if (own[p] === r.kh && !nm[p] && asked++ < 4) {
        const d = await rememberName(env, p);
        if (d) {
          nm[p] = { name: d.username, guest: d.guest ? 1 : 0 };
        }
      }
    }
  }
  const seen = new Set(),
    list = [];
  for (const r of rows) {
    const ps = (r.pids || "").split(",").filter((p) => p && own[p] === r.kh && nm[p] && !nm[p].guest && !seen.has(p));
    if (!ps.length) {
      continue;
    }
    ps.forEach((p) => seen.add(p));
    list.push({
      srv: r.shsrv ? r.srv || null : null,
      idle: !!r.idle,
      wh: ["lobby", "game", "queue"].includes(r.wh) ? r.wh : null,
      on: true,
      mins: 0,
      ver: null,
      accounts: [],
      logged: ps.map((p) => ({ pid: p, name: nm[p].name, guest: false })),
    });
  }
  pubOnline = { at: now, data: { online, hidden: Math.max(0, online - list.length), list } };
  return pubOnline.data;
}
// The accounts behind a connection: the tanks shared by the copies seen on it in the last day (for alerts)
async function namesOnConnection(env, ih) {
  try {
    const r = await env.DB.prepare(
      "SELECT group_concat(COALESCE(n.name || CASE WHEN n.guest = 1 THEN ' (guest)' ELSE '' END, l.pid), ', ') AS w FROM looks l LEFT JOIN names n ON n.pid = l.pid WHERE l.keyhash IN (SELECT kh FROM copies WHERE ih = ? AND at > ?)",
    )
      .bind(ih, Date.now() - DAY)
      .first();
    return r && r.w ? String(r.w).slice(0, 300) : "";
  } catch {
    return "";
  }
}
// Pattern: lots of different copies of Color Lab from one connection in a day (someone making copies to get round limits)
async function watchCopy(env, ctx, kh, ih) {
  try {
    const r = await env.DB.prepare("INSERT OR IGNORE INTO copies (kh, ih, at) VALUES (?, ?, ?)")
      .bind(kh, ih, Date.now())
      .run();
    if (!(r && r.meta && r.meta.changes)) {
      return;
    } // (seen before: nothing new)
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM copies WHERE ih = ? AND at > ?")
      .bind(ih, Date.now() - DAY)
      .first();
    if (n && n.n >= 5) {
      ctx.waitUntil(
        alertOnce(
          env,
          "copies:" + ih,
          "pattern",
          n.n +
            " different copies of Color Lab used one connection today (newest " +
            kh.slice(0, 10) +
            "). Accounts on them: " +
            ((await namesOnConnection(env, ih)) || "none that share a look yet") +
            ". Someone may be making copies to get round the limits",
        ),
      );
    }
  } catch {}
}
// A tank as "name (player ID)" for alerts: the name kept from earlier, or asked from TankTrouble now
async function tankName(env, pid) {
  try {
    const k = await env.DB.prepare("SELECT name, guest FROM names WHERE pid = ?").bind(String(pid)).first();
    if (k) {
      return k.name + (k.guest ? " (guest, " : " (") + pid + ")";
    }
    const d = await rememberName(env, pid);
    if (d) {
      return d.username + (d.guest ? " (guest, " : " (") + pid + ")";
    }
  } catch {}
  return "player " + pid;
}

// ---------- forum watch: new replies on your TankTrouble forum threads are posted to Discord and ping you ----------
// Checked every minute (the second cron in wrangler.toml). FORUM_THREADS (thread IDs, comma-separated) and FORUM_OWNER
// (your player IDs, comma-separated: the first is the one named in "mentions you"; replies from any of them come as "Your forum reply") can be set under [vars]; FORUM_CHANNEL_ID picks the channel (else #reports).
// Who sent a report (for the owner only): the accounts on the reporter's copy of Color Lab
async function reporterNames(env, kh) {
  if (!kh) {
    return "someone without a Color Lab key";
  }
  try {
    const pids = new Set(
      (
        (
          await env.DB.prepare(
            "SELECT pid FROM verified WHERE keyhash = ? UNION SELECT pid FROM looks WHERE keyhash = ?",
          )
            .bind(kh, kh)
            .all()
        ).results || []
      ).map((r) => String(r.pid)),
    );
    const lg = await env.DB.prepare("SELECT pids FROM logged WHERE kh = ?").bind(kh).first();
    if (lg && lg.pids) {
      for (const p of String(lg.pids).split(",")) {
        if (/^\d+$/.test(p)) {
          pids.add(p);
        }
      }
    }
    const names = [];
    for (const p of [...pids].slice(0, 6)) {
      names.push(await tankName(env, p));
    }
    return (names.length ? names.join(", ") : "a copy with no accounts yet") + " (copy " + kh.slice(0, 10) + ")";
  } catch {
    return "copy " + kh.slice(0, 10);
  }
}
// The /forum command in your Discord server (the forum channel's server), set up by itself once every couple of days
async function forumCommand(env) {
  try {
    const channel = env.FORUM_CHANNEL_ID || env.REPORT_CHANNEL_ID;
    if (!env.DISCORD_BOT_TOKEN || !channel || !forumAuto(env)) {
      return;
    }
    await ensureTables(env);
    if (await env.DB.prepare("SELECT at FROM alerted WHERE k = 'cmd:forum:1'").first()) {
      return;
    }
    await env.DB.prepare("INSERT OR REPLACE INTO alerted (k, at) VALUES ('cmd:forum:1', ?)").bind(Date.now()).run();
    const app = await (await discordPost(env, "/oauth2/applications/@me", { method: "GET" })).json(),
      ch = await (await discordPost(env, "/channels/" + channel, { method: "GET" })).json();
    if (!app || !app.id || !ch || !ch.guild_id) {
      return;
    }
    const r = await discordPost(env, "/applications/" + app.id + "/guilds/" + ch.guild_id + "/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "forum",
        description: "Post on the Color Lab forum thread as ColorLab",
        type: 1,
        default_member_permissions: "8",
      }),
    });
    if (!r.ok) {
      await alert(env, "forum post", "❌ Could not set up the /forum command: " + r.status);
    }
  } catch {}
}
async function forumWatch(env) {
  const channel = env.FORUM_CHANNEL_ID || env.REPORT_CHANNEL_ID;
  if (!env.DISCORD_BOT_TOKEN || !channel) {
    return;
  }
  const owners = String(env.FORUM_OWNER || "3887207")
      .split(",")
      .map((x) => x.trim())
      .filter((x) => /^\d+$/.test(x)),
    owner = owners[0] || "3887207",
    threads = String(env.FORUM_THREADS || "475180")
      .split(",")
      .map((t) => t.trim())
      .filter((t) => /^\d+$/.test(t));
  const me = String(env.ALERT_MENTION || "").trim(),
    ping = /^\d{15,22}$/.test(me) ? me : null,
    showMine = env.FORUM_SHOW_MINE !== "0";
  let myName = null;
  try {
    const k = await env.DB.prepare("SELECT name, at FROM names WHERE pid = ?").bind(owner).first(); // (your name, asked from TankTrouble at most once a day)
    if (k && Date.now() - k.at < DAY) {
      myName = k.name;
    } else {
      const d = await rememberName(env, owner);
      myName = d ? d.username : k && k.name;
    }
  } catch {}
  for (const th of threads) {
    try {
      const r = await fetch("https://tanktrouble.com/ajax/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "ttcl-share (Color Lab forum watch)" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tanktrouble.forum.getForumReplies",
          id: 1,
          params: [Number(th), Number.MAX_SAFE_INTEGER, "older", 0, 10],
        }),
      });
      const j = await r.json(),
        d = j && j.result && j.result.result && j.result.data;
      if (!d || !Array.isArray(d.replies)) {
        continue;
      }
      const reps = d.replies.filter((x) => x && !x.deleted).sort((a, b) => a.id - b.id),
        top = reps.reduce((m, x) => Math.max(m, x.id), 0);
      const seen = await env.DB.prepare("SELECT last FROM forum_seen WHERE thread = ?").bind(th).first();
      if (top && (!seen || top > seen.last)) {
        await env.DB.prepare(
          "INSERT INTO forum_seen (thread, last) VALUES (?, ?) ON CONFLICT(thread) DO UPDATE SET last = MAX(last, excluded.last)",
        )
          .bind(th, top)
          .run();
      } // (only written when there's a new reply)
      const since = seen ? seen.last : 0,
        fresh = Date.now() / 1000 - 30 * 60; // (first check of a thread: only replies from the last 30 minutes, so old ones aren't posted)
      const title = d.thread && d.thread.header ? String(d.thread.header).slice(0, 80) : "thread " + th;
      for (const x of reps
        .filter(
          (reply) =>
            (seen ? reply.id > since : reply.created > fresh) && (showMine || !owners.includes(String(reply.creator))),
        )
        .slice(-5)) {
        // (your own replies, from any of your accounts, come too: marked as yours, with no ping and no Reply button. FORUM_SHOW_MINE = "0" hides them)
        const mine = owners.includes(String(x.creator)),
          who = await tankName(env, x.creator),
          text = String(x.message || "").slice(0, 1200);
        const named =
          !mine &&
          myName &&
          new RegExp(
            "(^|[^\\p{L}\\p{N}])" + myName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^\\p{L}\\p{N}])",
            "iu",
          ).test(text);
        await discordPost(env, "/channels/" + channel + "/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: mine
              ? "📝 **Your forum reply** on *" +
                title +
                "* as " +
                who +
                "\n<https://tanktrouble.com/forum?threadId=" +
                th +
                "&id=" +
                x.id +
                ">\n>>> " +
                (text || "(no text)")
              : (ping ? "<@" + ping + "> " : "") +
                "💬 **New forum reply" +
                (named ? " (mentions you)" : "") +
                "** on *" +
                title +
                "* from " +
                who +
                "\n<https://tanktrouble.com/forum?threadId=" +
                th +
                "&id=" +
                x.id +
                ">\n>>> " +
                (text || "(no text)"),
            allowed_mentions: { users: ping && !mine ? [ping] : [] },
            components: mine
              ? []
              : [
                  {
                    type: 1,
                    components: [
                      { type: 2, style: 1, label: "Reply on the forum", custom_id: "freply:" + th + ":" + x.id },
                    ],
                  },
                ],
          }),
        });
      }
    } catch {}
  }
}

// ---------- proving a tank is yours ----------
// TankTrouble shows every tank's paints and items to anyone, but only the tank's owner can change them. So the server picks
// a small change (put one of the paints the tank is already wearing on another part, or take one item off), the owner's
// Color Lab makes it through the game's own garage, the server sees it on TankTrouble, and Color Lab puts the tank back.
// A proven tank can't be shared by anyone else, and its owner takes it back from whoever shared it first.
async function ttDetails(pid) {
  try {
    const r = await fetch("https://tanktrouble.com/ajax/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "ttcl-share (Color Lab look server)" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tanktrouble.getPlayerDetails", id: 1, params: [String(pid)] }),
    });
    const j = await r.json();
    const d = j && j.result && j.result.data;
    return d && String(d.playerId) === String(pid) ? d : null;
  } catch {
    return null;
  }
}
// The tank's TankTrouble name, kept with its look for the admin page (so a guest's name isn't lost when the guest is gone)
async function rememberName(env, pid, d) {
  try {
    if (!d) {
      d = await ttDetails(pid);
    }
    if (!d || !d.username) {
      return null;
    }
    await env.DB.prepare("INSERT OR REPLACE INTO names (pid, name, guest, at) VALUES (?, ?, ?, ?)")
      .bind(String(pid), String(d.username).slice(0, 40), d.guest ? 1 : 0, Date.now())
      .run();
    return d;
  } catch {
    return null;
  }
}
async function nameStale(env, pid) {
  try {
    const r = await env.DB.prepare("SELECT at FROM names WHERE pid = ?").bind(String(pid)).first();
    return !r || Date.now() - r.at > DAY;
  } catch {
    return true;
  }
}
const PARTS = [
    ["turret", "turretColour"],
    ["base", "baseColour"],
    ["tread", "treadColour"],
  ],
  SLOTS = ["turret", "barrel", "front", "back"];
function pickChallenge(d) {
  const raw = (k) => (d[k] && typeof d[k].rawValue === "string" ? d[k].rawValue : null),
    opts = [];
  for (const [part, k] of PARTS) {
    for (const [, k2] of PARTS) {
      const a = raw(k),
        b = raw(k2);
      if (a && b && a !== b) {
        opts.push({ part, kind: "colour", want: b, restore: a });
      }
    }
  }
  if (!opts.length) {
    for (const slot of SLOTS) {
      const v = String(d[slot + "Accessory"] ?? "0");
      if (v !== "0") {
        opts.push({ part: slot, kind: "acc", want: "0", restore: v });
      }
    }
  }
  return opts.length ? opts[Math.floor(Math.random() * opts.length)] : null;
}
const nowValue = (d, c) =>
  c.kind === "colour"
    ? (d[(PARTS.find((p) => p[0] === c.part) || [])[1]] || {}).rawValue
    : String(d[c.part + "Accessory"] ?? "0");

// ---------- feedback and reports, answered from Discord ----------
// A player sends a message (and maybe a screenshot) from Color Lab; a Discord bot posts it in your reports channel with a
// Reply button. Your reply (typed in Discord) is kept here and shows up in that player's Color Lab. Needs these secrets:
// DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, REPORT_CHANNEL_ID, and REPLY_USERS (Discord user IDs allowed to reply, comma-separated).
// Images are passed straight to Discord, never kept here; only the text and replies are kept (for that player to read).
const MIN_WORDS = 5,
  FEEDBACK_A_DAY = 15,
  MAX_TEXT = 1500,
  MAX_IMAGE = 2 * 1024 * 1024,
  MAX_IMAGES = 3; // (links like Lightshot's in the text show as previews in Discord too)
async function discordPost(env, path, init) {
  return fetch(
    "https://discord.com/api/v10" + path,
    Object.assign({}, init, {
      headers: Object.assign({ Authorization: "Bot " + env.DISCORD_BOT_TOKEN }, (init && init.headers) || {}),
    }),
  );
}
// A rough check for messages that are just key-mashing or noise: 2 = unreadable (turned away), 1 = doubtful (posted, marked), 0 = fine
// Cloudflare Workers AI picks a topic tag for Discord (skipped if the AI binding is missing or slow)
async function aiTag(env, text) {
  if (!env.AI) {
    return "";
  }
  const tags = {
    bug: "🐞 bug",
    abuse: "🚨 look abuse",
    theme: "🎨 theme",
    idea: "💡 idea",
    question: "❓ question",
    spam: "🗑️ spam",
  };
  try {
    const r = await Promise.race([
      env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        max_tokens: 5,
        messages: [
          {
            role: "system",
            content:
              "Classify a message sent to a Chrome extension that recolours TankTrouble tanks. Reply with exactly one word: bug, abuse (someone changed other players' looks), theme, idea, question, or spam.",
          },
          { role: "user", content: text.slice(0, 800) },
        ],
      }),
      new Promise((res) => setTimeout(() => res(null), 4000)),
    ]);
    const w = String((r && r.response) || "")
      .toLowerCase()
      .match(/bug|abuse|theme|idea|question|spam/);
    return w ? " · " + tags[w[0]] : "";
  } catch {
    return "";
  }
}
function spamScore(text) {
  const t = text.toLowerCase(),
    words = t.match(/\p{L}{2,}/gu) || [],
    real = words.filter((w) => [...w].length >= 3);
  if (/(.)\1{7,}/u.test(t) || (real.length < 2 && words.length < 3)) {
    return 2;
  } // (aaaaaaaa, or hardly any words; any language)
  const latin = real.filter((w) => /^[a-z]+$/.test(w)),
    noVowel = latin.length >= 3 ? latin.filter((w) => !/[aeiouy]/.test(w)).length / latin.length : 0; // (the vowel check only for English-looking words)
  const mash = (t.match(/asdf|sdfg|qwer|wert|zxcv|hjkl|jkl;|dfgh|fghj|ghjk/g) || []).length;
  const uniq = new Set(t.replace(/\s/g, "")).size,
    longJunk = real.filter((w) => w.length > 18).length;
  if (noVowel > 0.5 || mash >= 2 || uniq < 6) {
    return 2;
  }
  if (noVowel > 0.25 || mash >= 1 || longJunk >= 2 || real.length < 4) {
    return 1;
  }
  return 0;
}
// Swearing and slurs: a message with any of these isn't sent. Letters are compared after undoing look-alike swaps
// (n1gg@, sh!t) and repeats (fuuuck), and letters spelled out one by one (c u n t, f.u.c.k) are joined up
const BAD_ANYWHERE = ["nigg", "niga", "nigr", "fuck", "faggot", "fagot", "motherf"]; // (even inside other words)
const BAD_WORDS = [
  "negro",
  "fag",
  "retard",
  "tranny",
  "chink",
  "kike",
  "spick",
  "wetback",
  "gook",
  "paki",
  "coon",
  "dyke",
  "fuk",
  "fck",
  "fuq",
  "shit",
  "sht",
  "cunt",
  "bitch",
  "btch",
  "bastard",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "wank",
  "wanker",
  "twat",
  "prick",
  "asshole",
  "arsehole",
  "jackass",
  "bollocks",
  "porn",
  "rape",
  "rapist",
  "kys",
]; // (as a word, or with an ending like -s, -ed, -er, -ing, -y)
const ENDINGS = ["", "s", "es", "ed", "er", "ers", "ing", "y", "ie", "ies", "head", "face"];
const once = (w) => w.replace(/(\p{L})\1+/gu, "$1");
function isOffensive(text) {
  const plain = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[0@4]/g, (c) => ({ 0: "o", "@": "a", 4: "a" })[c])
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t");
  const words = plain.split(/[^\p{L}]+/u).filter(Boolean);
  for (const run of plain.match(/(?:(?<!\p{L})\p{L}(?!\p{L})[^\p{L}]*){3,}/gu) || []) {
    words.push(run.replace(/[^\p{L}]/gu, ""));
  } // (c u n t)
  const joined = words.join("");
  if (BAD_ANYWHERE.some((x) => joined.includes(x) || once(joined).includes(x))) {
    return true;
  }
  const bad = new Set(BAD_WORDS.map(once));
  if (words.some((w) => w === "spic" || w === "spics")) {
    return true;
  } // (not "spicy")
  return words.some((w) => {
    const v = once(w);
    return ENDINGS.some((e) => v.endsWith(e) && bad.has(once(v.slice(0, v.length - e.length))));
  });
}
const isOwner = async (env, kh) => {
  if (
    env.OWNER_COPY &&
    !String(env.OWNER_COPY)
      .toLowerCase()
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .some((x) => String(kh).startsWith(x))
  ) {
    return false;
  } // (OWNER_COPY can list several copies: "a0ea9d93e17a,1234abcd5678")
  return !!(await env.DB.prepare("SELECT 1 FROM trusted WHERE hash = ?").bind(kh).first());
}; // (the owner's own copy only: inbox, alerts and the full online list)
async function sendFeedback(env, req, ctx) {
  if (!env.DISCORD_BOT_TOKEN || !env.REPORT_CHANNEL_ID) {
    return json({ error: "feedback isn't set up yet" }, 503);
  }
  let b;
  try {
    const t = await req.text();
    if (t.length > MAX_IMAGES * MAX_IMAGE * 1.4 + 6000) {
      return json({ error: "too big" }, 413);
    }
    b = JSON.parse(t);
  } catch {
    return json({ error: "bad json" }, 400);
  }
  if (!b || typeof b.key !== "string" || !KEY.test(b.key)) {
    return json({ error: "bad key" }, 400);
  }
  const text = String(b.text || "")
    .replace(/\r/g, "")
    .trim()
    .slice(0, MAX_TEXT);
  if ((text.match(/[\p{L}\p{N}]{2,}/gu) || []).length < MIN_WORDS) {
    return json({ error: "please describe what's going on in at least " + MIN_WORDS + " words" }, 400);
  } // (a short description is needed)
  await ensureTables(env);
  const kh = await sha256(b.key),
    ih = await ipHash(env, req),
    now = Date.now();
  if (
    (await env.DB.prepare("SELECT 1 FROM banned WHERE hash IN (?, ?)").bind(kh, ih).first()) ||
    (await onHold(env, kh, ih))
  ) {
    // (a banned or held copy can't message your Discord; what it tried to send is noted on the admin page)
    try {
      await env.DB.prepare("INSERT INTO events (at, kind, detail) VALUES (?, ?, ?)")
        .bind(now, "held message", "From " + kh.slice(0, 10) + ": " + text.slice(0, 300))
        .run();
    } catch {}
    return json({ error: "not allowed" }, 403);
  }
  const rude = await env.DB.prepare("SELECT COUNT(*) AS n FROM claims WHERE who IN (?, ?) AND at > ? AND pid = 'x'")
    .bind(kh, ih, now - DAY)
    .first();
  if (rude && rude.n >= 3) {
    return json({ error: "you can't send messages for a day after trying to send offensive ones" }, 429);
  }
  if (isOffensive(text)) {
    // not sent: kept on the admin page, and a copy that keeps trying can't send anything for a day
    await env.DB.batch([
      env.DB.prepare("INSERT INTO claims (who, pid, at) VALUES (?, 'x', ?), (?, 'x', ?)").bind(kh, now, ih, now),
      env.DB.prepare("INSERT INTO events (at, kind, detail) VALUES (?, ?, ?)").bind(
        now,
        "blocked message",
        "From " + kh.slice(0, 10) + ": " + text.slice(0, 300),
      ),
    ]);
    return json({ error: "please keep it friendly: messages with swearing or slurs aren't sent" }, 400);
  }
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM claims WHERE who IN (?, ?) AND at > ? AND pid = 'f'")
    .bind(kh, ih, now - DAY)
    .first();
  if (n && n.n >= FEEDBACK_A_DAY) {
    return json(
      {
        error:
          "you've reached " +
          FEEDBACK_A_DAY +
          " messages today. If it's urgent, please reply on the Color Lab forum thread",
      },
      429,
    );
  }
  const last = await env.DB.prepare("SELECT text, at FROM feedback WHERE keyhash = ? ORDER BY id DESC LIMIT 10")
    .bind(kh)
    .all();
  const prev = last.results || [];
  if (prev[0] && now - prev[0].at < 60000) {
    return json({ error: "please wait a minute between messages" }, 429);
  } // (not too quickly)
  if (prev.some((p) => p.text.trim().toLowerCase() === text.toLowerCase())) {
    return json({ error: "you already sent that message" }, 400);
  } // (the same message again)
  const junk = spamScore(text);
  // (every message still reaches Discord so you can check it; doubtful ones are just marked)
  const raw = (Array.isArray(b.images) ? b.images : typeof b.image === "string" && b.image ? [b.image] : []).filter(
    (x) => typeof x === "string" && x,
  );
  if (raw.length > MAX_IMAGES) {
    return json({ error: MAX_IMAGES + " screenshots at most" }, 400);
  }
  const imgs = [];
  for (const [index, d] of raw.entries()) {
    const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(d);
    if (!m) {
      return json({ error: "screenshots must be PNG or JPEG" }, 400);
    }
    const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    if (bin.length > MAX_IMAGE) {
      return json({ error: "a screenshot is too big (2 MB at most)" }, 413);
    }
    imgs.push({
      bin,
      type: "image/" + m[1],
      name: "screenshot" + (index + 1) + "." + (m[1] === "png" ? "png" : "jpg"),
    });
  }
  const pids = (Array.isArray(b.pids) ? b.pids : [])
      .map(String)
      .filter((x) => PID.test(x))
      .slice(0, 4),
    about = PID.test(String(b.about || "")) ? String(b.about) : null;
  // the copy's main account: the first tank it proved. Its messages always carry that name, whichever account is logged in now
  const main = await env.DB.prepare("SELECT pid FROM verified WHERE keyhash = ? ORDER BY at LIMIT 1").bind(kh).first(),
    mainName = main ? await tankName(env, main.pid) : null;
  const now2 = (
    await Promise.all(pids.filter((p) => !main || p !== String(main.pid)).map((p) => tankName(env, p)))
  ).join(", ");
  const from = mainName ? mainName + (now2 ? " (playing as " + now2 + ")" : "") : now2 || "not logged in",
    aboutName = about ? await tankName(env, about) : null;
  const ins = await env.DB.prepare("INSERT INTO feedback (keyhash, who, text, at) VALUES (?, ?, ?, ?)")
    .bind(kh, from, text, now)
    .run();
  const fid = ins.meta && ins.meta.last_row_id;
  await env.DB.prepare("INSERT INTO claims (who, pid, at) VALUES (?, 'f', ?), (?, 'f', ?)")
    .bind(kh, now, ih, now)
    .run();
  if (pids.length) {
    await env.DB.batch(
      pids.map((p) => env.DB.prepare("INSERT INTO feedback_pids (fid, pid) VALUES (?, ?)").bind(fid, p)),
    );
  } // (the conversation belongs to these accounts too)
  const kind =
    (b.kind === "report" ? "⚑ Report" : "📨 Feedback") +
    (await aiTag(env, text)) +
    (junk === 2 ? " 🗑️ (looks like spam)" : junk === 1 ? " ⚠️ (might be spam)" : "");
  const payload = {
    content:
      "**" + kind + " #" + fid + "** from " + from + (aboutName ? "\nAbout: " + aboutName : "") + "\n>>> " + text,
    allowed_mentions: { parse: [] }, // (nobody can ping your server through this)
    components: [{ type: 1, components: [{ type: 2, style: 1, label: "Reply", custom_id: "reply:" + fid }] }],
  };
  const fd = new FormData();
  fd.append("payload_json", JSON.stringify(payload));
  imgs.forEach((im, index) => fd.append("files[" + index + "]", new Blob([im.bin], { type: im.type }), im.name));
  const r = await discordPost(env, "/channels/" + env.REPORT_CHANNEL_ID + "/messages", { method: "POST", body: fd });
  if (!r.ok) {
    return json({ error: "couldn't reach Discord, try again later" }, 502);
  }
  return json({ ok: true, id: fid });
}
// ---------- an account's backup: its saved looks and achievement progress ----------
// Each account has its own key, worked out on the player's computer from the account's email, player ID and oldest
// laboratory message, so every computer the player uses gets the same one. Reading or changing the backup needs the key.
const MAX_SAVE = 44000,
  SAVE_GAP_MS = 50000,
  SAVE_KEEP = 5,
  WRONG_KEYS = 10;
async function account(env, req, ctx) {
  let b;
  try {
    const t = await req.text();
    if (t.length > MAX_SAVE + 1000) {
      return json({ error: "too big" }, 413);
    }
    b = JSON.parse(t);
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const pid = PID.test(String((b && b.pid) || "")) ? String(b.pid) : null;
  if (!b || typeof b.key !== "string" || !KEY.test(b.key) || !pid) {
    return json({ error: "bad request" }, 400);
  }
  await ensureTables(env);
  const kh = await sha256(b.key),
    old = typeof b.old === "string" && KEY.test(b.old) ? await sha256(b.old) : null,
    ih = await ipHash(env, req),
    now = Date.now(),
    op = String(b.op || "");
  if (
    await env.DB.prepare("SELECT 1 FROM banned WHERE hash IN (?, ?, ?)")
      .bind(kh, old || kh, ih)
      .first()
  ) {
    return json({ error: "not allowed" }, 403);
  }
  if (await onHold(env, kh, old || kh, ih)) {
    return json({ error: "on hold: the owner of Color Lab will check this copy" }, 403);
  } // (a banned or held copy can't move its tanks to a new key either)
  const owner = await env.DB.prepare("SELECT keyhash FROM verified WHERE pid = ?").bind(pid).first(),
    right = owner && (owner.keyhash === kh || (op === "move" && owner.keyhash === old));
  if (owner && !right) {
    // a wrong key for a proven account: a connection that keeps trying is stopped for the day, and the owner is told
    const tries = await env.DB.prepare("SELECT COUNT(*) AS n FROM claims WHERE who = ? AND pid = ? AND at > ?")
      .bind("w:" + ih, "w" + pid, now - DAY)
      .first();
    if (tries && tries.n >= WRONG_KEYS) {
      return json({ error: "too many wrong keys today" }, 429);
    }
    await env.DB.prepare("INSERT INTO claims (who, pid, at) VALUES (?, ?, ?)")
      .bind("w:" + ih, "w" + pid, now)
      .run();
    if (tries && tries.n + 1 === WRONG_KEYS) {
      ctx.waitUntil(
        (async () =>
          alert(
            env,
            "pattern",
            "A connection tried " + WRONG_KEYS + " wrong keys for " + (await tankName(env, pid)) + " today (guessing?)",
          ))(),
      );
    }
    return json({ error: "prove this tank is yours first" }, 403);
  }
  if (!owner) {
    return json({ error: "prove this tank is yours first" }, 403);
  }
  if (op === "move") {
    // the account's key changed (a copy from before account keys, or the email changed): the copy that has the old key
    // moves the tank over to the new one, so it stays proven
    if (owner.keyhash !== kh) {
      await env.DB.batch([
        env.DB.prepare("UPDATE verified SET keyhash = ?, at = ? WHERE pid = ?").bind(kh, now, pid),
        env.DB.prepare("UPDATE looks SET keyhash = ? WHERE pid = ? AND keyhash = ?").bind(kh, pid, old),
        env.DB.prepare("UPDATE hidden SET keyhash = ? WHERE pid = ? AND keyhash = ?").bind(kh, pid, old),
      ]);
    }
    return json({ ok: true });
  }
  const cur = await env.DB.prepare("SELECT ver, blob, at FROM saves WHERE pid = ?").bind(pid).first();
  if (op === "get") {
    if (b.ver != null && cur && Number(b.ver) !== cur.ver) {
      const h = await env.DB.prepare("SELECT ver, blob, at FROM save_hist WHERE pid = ? AND ver = ?")
        .bind(pid, Number(b.ver) || 0)
        .first();
      return h ? json({ ok: true, save: h }) : json({ error: "gone" }, 404);
    }
    return json({ ok: true, save: cur || null });
  }
  if (op === "hist") {
    const rows =
      (await env.DB.prepare("SELECT ver, at FROM save_hist WHERE pid = ? ORDER BY ver DESC").bind(pid).all()).results ||
      [];
    return json({ ok: true, current: cur ? { ver: cur.ver, at: cur.at } : null, older: rows });
  }
  if (op === "delete") {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM saves WHERE pid = ?").bind(pid),
      env.DB.prepare("DELETE FROM save_hist WHERE pid = ?").bind(pid),
    ]);
    return json({ ok: true });
  }
  if (op === "put") {
    let blob = null;
    try {
      const o = typeof b.blob === "string" && b.blob.length <= MAX_SAVE ? JSON.parse(b.blob) : null;
      blob = o && typeof o === "object" && !Array.isArray(o) ? b.blob : null;
    } catch {}
    if (!blob) {
      return json({ error: "bad save" }, 400);
    }
    const ver = (cur ? cur.ver : 0) + 1;
    if (Number(b.base) !== (cur ? cur.ver : 0) || Number(b.ver) !== ver) {
      return json({ error: "changed", ver: cur ? cur.ver : 0 }, 409);
    } // (another computer saved first: this one takes that in and tries again)
    if (cur && now - cur.at < SAVE_GAP_MS) {
      return json({ error: "too fast", wait: SAVE_GAP_MS - (now - cur.at) }, 429);
    }
    const steps = [];
    if (cur) {
      steps.push(
        env.DB.prepare("INSERT OR REPLACE INTO save_hist (pid, ver, blob, at) VALUES (?, ?, ?, ?)").bind(
          pid,
          cur.ver,
          cur.blob,
          cur.at,
        ),
        env.DB.prepare(
          "DELETE FROM save_hist WHERE pid = ?1 AND ver NOT IN (SELECT ver FROM save_hist WHERE pid = ?1 ORDER BY ver DESC LIMIT ?2)",
        ).bind(pid, SAVE_KEEP),
      );
    } // (the last few versions are kept, so a ruined backup can be put back)
    steps.push(
      env.DB.prepare("INSERT OR REPLACE INTO saves (pid, ver, blob, at) VALUES (?, ?, ?, ?)").bind(pid, ver, blob, now),
    );
    await env.DB.batch(steps);
    return json({ ok: true, ver, at: now });
  }
  if (op === "messages") {
    // the account's conversations with Color Lab, from whichever computer they were sent
    return json({ ok: true, items: await feedbackOf(env, kh) });
  }
  return json({ error: "bad op" }, 400);
}
async function feedbackOf(env, kh) {
  // messages sent with this key, and older ones sent by an account it has proven (so they follow the player to another computer)
  const items =
    (
      await env.DB.prepare(
        "SELECT f.id, f.who, f.text, f.at FROM feedback f WHERE f.keyhash = ?1 OR f.id IN (SELECT fp.fid FROM feedback_pids fp JOIN verified v ON v.pid = fp.pid WHERE v.keyhash = ?1) ORDER BY f.id DESC LIMIT 50",
      )
        .bind(kh)
        .all()
    ).results || [];
  for (const it of items) {
    it.replies =
      (await env.DB.prepare("SELECT text, at FROM replies WHERE fid = ? ORDER BY at").bind(it.id).all()).results || [];
  }
  return items;
}
async function listFeedback(env, req) {
  // a player's own messages and your replies (by their copy's key, so only they see them)
  let b;
  try {
    b = JSON.parse((await req.text()).slice(0, 500));
  } catch {
    return json({ error: "bad json" }, 400);
  }
  if (!b || typeof b.key !== "string" || !KEY.test(b.key)) {
    return json({ error: "bad key" }, 400);
  }
  await ensureTables(env);
  const kh = await sha256(b.key);
  await touchPresence(
    env,
    kh,
    req,
    b.pids,
    b.srv,
    b.idle === true,
    b.show === true ? true : b.show === false ? false : undefined,
    b.shsrv === true,
    b.away === true,
    String(b.wh || ""),
    b.ifor,
  );
  try {
    const iv = b.inv === true ? 1 : 0;
    if (presInv.get(kh) !== iv) {
      presInv.set(kh, iv);
      await env.DB.prepare("UPDATE presence SET inv = ? WHERE kh = ?").bind(iv, kh).run();
    }
  } catch {}
  try {
    if (b.off === true) {
      presOff.set(kh, 1);
      await env.DB.prepare("UPDATE presence SET off = 1, offat = ? WHERE kh = ?").bind(Date.now(), kh).run();
    } else if (presOff.get(kh) !== 0) {
      presOff.set(kh, 0);
      await env.DB.prepare("UPDATE presence SET off = 0 WHERE kh = ? AND off = 1").bind(kh).run();
    }
  } catch {} // (back online clears it)
  const items = await feedbackOf(env, kh);
  const main = await env.DB.prepare("SELECT pid FROM verified WHERE keyhash = ? ORDER BY at LIMIT 1").bind(kh).first(),
    me = main
      ? ((await env.DB.prepare("SELECT name FROM names WHERE pid = ?").bind(String(main.pid)).first()) || {}).name
      : null;
  // announcements: each one comes as a message from Color Lab (v1.4 shows a "Reply from Color Lab" note and keeps it in the Message Color Lab box)
  if (verAbove("1.4.1", req.headers.get("x-ttcl-version") || "0")) {
    try {
      const an =
        (
          await env.DB.prepare("SELECT id, title, body, at FROM bcast_log WHERE at > ? ORDER BY id DESC LIMIT 20")
            .bind(Date.now() - 90 * DAY)
            .all()
        ).results || [];
      for (const a of an) {
        items.push({
          id: -a.id,
          who: "Color Lab",
          text: "📢 Announcement to every Color Lab player",
          at: a.at - 1,
          replies: [{ text: (a.title ? a.title + ": " : "") + a.body, at: a.at }],
        });
      }
    } catch {}
  }
  return json({ items, me: me || null });
}
// The owner's inbox inside TankTrouble (only for a trusted copy, like the owner's DEV copy): every player's messages, and replying
// to them from there (the reply also shows in Discord, so both stay in step)
async function inbox(env, req, ctx, act) {
  let b;
  try {
    b = JSON.parse((await req.text()).slice(0, 8000));
  } catch {
    return json({ error: "bad json" }, 400);
  }
  if (!b || typeof b.key !== "string" || !KEY.test(b.key)) {
    return json({ error: "bad key" }, 400);
  }
  await ensureTables(env);
  const kh = await sha256(b.key);
  if (!(await isOwner(env, kh))) {
    return json({ error: "not allowed" }, 403);
  }
  if (act === "list") {
    // one row a player copy: who, their latest message, and whether it still needs a reply (a reply answers every message sent before it, from Discord or from TankTrouble)
    const rows =
      (
        await env.DB.prepare(
          "SELECT t.keyhash, t.n, t.at, f.who, f.text, (SELECT COUNT(*) FROM feedback f2 WHERE f2.keyhash = t.keyhash AND NOT EXISTS (SELECT 1 FROM replies r JOIN feedback f3 ON f3.id = r.fid WHERE f3.keyhash = f2.keyhash AND (r.fid = f2.id OR r.at >= f2.at))) AS open FROM (SELECT keyhash, MAX(id) AS last, COUNT(*) AS n, MAX(at) AS at FROM feedback GROUP BY keyhash) t JOIN feedback f ON f.id = t.last ORDER BY t.at DESC LIMIT 100",
        ).all()
      ).results || [];
    return json({
      threads: rows.map((r) => ({
        id: r.keyhash,
        who: r.who,
        text: String(r.text || "").slice(0, 140),
        at: r.at,
        n: r.n,
        open: r.open,
      })),
    });
  }
  if (act === "thread") {
    const t = String(b.kh || "");
    if (!/^[0-9a-f]{64}$/.test(t)) {
      return json({ error: "bad thread" }, 400);
    }
    const items =
      (
        await env.DB.prepare("SELECT id, who, text, at FROM feedback WHERE keyhash = ? ORDER BY id DESC LIMIT 60")
          .bind(t)
          .all()
      ).results || [];
    for (const it of items) {
      it.replies =
        (await env.DB.prepare("SELECT text, at FROM replies WHERE fid = ? ORDER BY at").bind(it.id).all()).results ||
        [];
    }
    return json({ items });
  }
  if (act === "reply") {
    const fid = Number(b.fid),
      text = String(b.text || "")
        .replace(/\r/g, "")
        .trim()
        .slice(0, 1500);
    if (!fid || !text) {
      return json({ error: "write a reply first" }, 400);
    }
    const f = await env.DB.prepare("SELECT id, who FROM feedback WHERE id = ?").bind(fid).first();
    if (!f) {
      return json({ error: "no such message" }, 404);
    }
    await env.DB.prepare("INSERT INTO replies (fid, text, at) VALUES (?, ?, ?)").bind(fid, text, Date.now()).run();
    if (env.DISCORD_BOT_TOKEN && env.REPORT_CHANNEL_ID) {
      ctx.waitUntil(
        discordPost(env, "/channels/" + env.REPORT_CHANNEL_ID + "/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content:
              "↩️ **Reply to #" +
              fid +
              "** (" +
              String(f.who || "").slice(0, 60) +
              "), sent from TankTrouble:\n>>> " +
              text,
            allowed_mentions: { parse: [] },
          }),
        }).catch(() => {}),
      );
    }
    return json({ ok: true });
  }
  return json({ error: "unknown" }, 400);
}
async function verifyDiscord(env, req, body) {
  // Discord signs every button press; anything not signed by Discord is refused
  try {
    const sig = req.headers.get("X-Signature-Ed25519") || "",
      ts = req.headers.get("X-Signature-Timestamp") || "";
    const hex = (h) => new Uint8Array((h.match(/../g) || []).map((x) => parseInt(x, 16)));
    let k;
    try {
      k = await crypto.subtle.importKey("raw", hex(env.DISCORD_PUBLIC_KEY), { name: "Ed25519" }, false, ["verify"]);
    } catch {
      k = await crypto.subtle.importKey(
        "raw",
        hex(env.DISCORD_PUBLIC_KEY),
        { name: "NODE-ED25519", namedCurve: "NODE-ED25519" },
        false,
        ["verify"],
      );
    }
    return await crypto.subtle.verify(
      k.algorithm.name === "Ed25519" ? "Ed25519" : "NODE-ED25519",
      k,
      hex(sig),
      new TextEncoder().encode(ts + body),
    );
  } catch {
    return false;
  }
}
// ---------- forum replies posted from Discord ----------
// With FORUM_AUTOPOST = "1" under [vars] and your TankTrouble login stored as secrets (npx wrangler secret put TT_LOGIN, then TT_PASSWORD:
// only you type them, they're stored encrypted and can't be read back), a reply typed in Discord is posted on the forum as you: the server
// logs in exactly like the forum page does, posts, and logs out. Only the Discord users in REPLY_USERS can do it, only on the threads
// in FORUM_THREADS, at most FORUM_POSTS_A_DAY times a day, and every post is noted in #logs. Set FORUM_AUTOPOST = "0" to switch it off.
const forumAuto = (env) =>
  env.FORUM_AUTOPOST === "1" && !!String(env.TT_LOGIN || "").trim() && !!String(env.TT_PASSWORD || "");
const FORUM_POSTS_A_DAY = 20;
async function ttCall(method, params, cookie) {
  const r = await fetch("https://tanktrouble.com/ajax/", {
    method: "POST",
    headers: Object.assign(
      { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Color Lab forum reply)" },
      cookie ? { Cookie: cookie } : {},
    ),
    body: JSON.stringify({ jsonrpc: "2.0", method: "tanktrouble." + method, id: 1, params }),
  });
  let j = null;
  try {
    j = await r.json();
  } catch {}
  const set =
    typeof r.headers.getSetCookie === "function" ? r.headers.getSetCookie() : [r.headers.get("set-cookie") || ""];
  return { j, cookies: set.filter(Boolean).map((c) => c.split(";")[0]) };
}
async function forumPost(env, th, text) {
  return ttAs(String(env.TT_LOGIN), String(env.TT_PASSWORD), "forum.createForumReply", [Number(th), text]);
}
async function ttAs(login, password, method, params) {
  // log in, do one forum action, log out: like the forum page in a browser
  const pw = btoa(unescape(encodeURIComponent(String(password)))); // (the page sends the password base64-encoded)
  const a = await ttCall("account.authenticate", [String(login).trim(), pw]);
  const ad = a.j && a.j.result;
  if (!ad || !ad.result) {
    return {
      ok: false,
      why:
        "login failed: " +
        String((ad && ad.message) || (a.j && a.j.error && a.j.error.message) || "no answer from TankTrouble").slice(
          0,
          200,
        ),
    };
  }
  const jar = new Map();
  for (const c of a.cookies) {
    const k = c.split("=")[0];
    if (k) {
      jar.set(k, c);
    }
  }
  const cookie = [...jar.values()].join("; ");
  const pid = ad.data && ad.data.playerDetails && (ad.data.playerDetails.playerId || ad.data.playerDetails.id);
  if (!cookie) {
    return { ok: false, why: "TankTrouble logged in but gave no session" };
  }
  try {
    const p = await ttCall(method, params, cookie),
      pd = p.j && p.j.result;
    if (pd && pd.result) {
      return { ok: true, pid };
    }
    return {
      ok: false,
      why: String((pd && pd.message) || (p.j && p.j.error && p.j.error.message) || "no answer from TankTrouble").slice(
        0,
        200,
      ),
    };
  } finally {
    if (pid) {
      try {
        await ttCall("account.deauthenticate", [pid], cookie);
      } catch {}
    }
  }
}
// A new release, announced on the forum: when GitHub publishes a release, its notes are posted to the
// first thread in FORUM_THREADS as you (FORUM_AUTOPOST, TT_LOGIN / TT_PASSWORD), once per version. FORUM_RELEASE_POST = "0"
// under [vars] switches just this off. Until STORE_URL is set it says the Chrome Web Store is coming soon; after, it links it.
// The forum only takes plain text (no emoji) up to about 1,150 characters: anything else is turned away
const FORUM_MAX = 1100;
function forumSafe(t) {
  return String(t || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2713/g, "")
    .replace(/\p{Extended_Pictographic}|\u200D|\uFE0F|[\u{1F3FB}-\u{1F3FF}]/gu, "")
    .replace(/[^\n\x20-\x7E\u00A0-\u00FF]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/(^|\n)- +/g, "$1- ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function releaseForumText(env, r) {
  const tag = String(r.tag_name || ""),
    body = String(r.body || "");
  const strip = (t) =>
    t
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      .trim();
  const lines = [],
    sha = (/\*\*SHA-256:\*\*\s*`([0-9a-f]{64})`/i.exec(body) || [])[1];
  for (const l of body.split("\n")) {
    const m = /^\s*[-*]\s+(.+)$/.exec(l);
    if (m) {
      lines.push("- " + strip(m[1]));
    }
  }
  const store = String(env.STORE_URL || ""),
    storeOk = /^https:\/\/chromewebstore\.google\.com\/detail\/[\w-]+\/[a-p]{32}$/.test(store);
  const title = String(r.name || "").replace(/^v[\d.]+:\s*/, "");
  let t = releaseForumBody(env, r, tag, title, lines, sha, storeOk, store, false);
  t = forumSafe(t);
  if (t.length <= FORUM_MAX) {
    return t;
  }
  while (t.length > FORUM_MAX && lines.length > 1) {
    // too long for the forum: fewer points, and a note to see the full notes
    lines.pop();
    t = forumSafe(releaseForumBody(env, r, tag, title, lines, sha, storeOk, store, true));
  }
  return t.slice(0, FORUM_MAX);
}
function releaseForumBody(env, r, tag, title, lines, sha, storeOk, store, cut) {
  let t = "Color Lab " + tag + " is out!" + (title ? "\n" + title : "") + "\n\n";
  if (lines.length) {
    t += "What's new:\n" + lines.join("\n") + (cut ? "\n- ...and more in the full notes (link below)" : "") + "\n\n";
  }
  if (storeOk) {
    t +=
      "🛒 Get it from the Chrome Web Store (installs in one click and updates by itself): " +
      store +
      "\nAlready on the store copy? It updates by itself, nothing to do.\n\n" +
      "Using the zip from GitHub instead: " +
      (r.html_url || "https://github.com/wazzey/tanktrouble-color-lab/releases");
  } else {
    t +=
      "Download: " +
      (r.html_url || "https://github.com/wazzey/tanktrouble-color-lab/releases") +
      (sha
        ? "\nSHA-256: " + sha + "\n(Check it matches before installing. Your looks are kept when you update.)"
        : "") +
      "\n\n🛒 Coming soon to the Chrome Web Store! Once it is there, Color Lab installs in one click and updates by itself, and your looks come with you when you switch. The link will be posted here.";
  }
  if (storeOk && sha) {
    t += "\nSHA-256 (zip): " + sha;
  }
  return t;
}
// The thread's first post (title and description) is kept up to date as its creator (FORUM_EDIT_LOGIN / FORUM_EDIT_PASSWORD
// secrets, e.g. rip): on a new release the version in the title, "(latest: v...)", the SHA-256, the "no longer work online"
// line and the WHAT'S NEW list are updated. Everything else in the post is left exactly as you wrote it. FORUM_THREAD_EDIT = "0" switches it off.
async function releaseThreadEdit(env, r, force) {
  try {
    if (
      env.FORUM_THREAD_EDIT === "0" ||
      !String(env.FORUM_EDIT_LOGIN || "").trim() ||
      !String(env.FORUM_EDIT_PASSWORD || "")
    ) {
      return;
    }
    const tag = String(r.tag_name || "");
    if (!/^v\d+(\.\d+)*$/.test(tag)) {
      return;
    }
    await ensureTables(env);
    const key = "forumedit:" + tag;
    if (!force && (await env.DB.prepare("SELECT at FROM alerted WHERE k = ?").bind(key).first())) {
      return;
    } // (once per version)
    await env.DB.prepare("INSERT OR REPLACE INTO alerted (k, at) VALUES (?, ?)").bind(key, Date.now()).run();
    const th = String(env.FORUM_THREADS || "475180")
      .split(",")[0]
      .trim();
    const g = await ttCall("forum.getForumReplies", [Number(th), Number.MAX_SAFE_INTEGER, "older", 0, 1]),
      t = g.j && g.j.result && g.j.result.data && g.j.result.data.thread;
    if (!t || typeof t.message !== "string") {
      return alert(env, "forum post", "❌ " + tag + ": could not read the thread to update it");
    }
    const body = String(r.body || ""),
      sha = (/\*\*SHA-256:\*\*\s*`([0-9a-f]{64})`/i.exec(body) || [])[1],
      min = String(env.MIN_VERSION || "").trim();
    const header = String(t.header || ""),
      newHeader = header.replace(/v\d+(?:\.\d+)+/, tag);
    let msg = t.message.replace(/\(latest: v[\d.]+\)/, "(latest: " + tag + ")");
    if (sha) {
      msg = msg.replace(/SHA-256: [0-9a-f]{64}/, "SHA-256: " + sha);
    }
    if (min) {
      msg = msg.replace(
        /(^|\n)(?:v[\d.]+ and older|Versions older than v[\d.]+) no longer work online/,
        "$1Versions older than v" + min + " no longer work online",
      );
    }
    const points = [];
    for (const l of body.split("\n")) {
      const m = /^\s*[-*]\s+(.+)$/.exec(l);
      if (m) {
        let x = forumSafe(m[1].replace(/\*\*/g, "").replace(/`/g, ""));
        if (x.length > 120) {
          x = x.slice(0, 117).replace(/\s+\S*$/, "") + "...";
        }
        if (x) {
          points.push("- " + x);
        }
      }
    }
    const limit = Math.max(t.message.length, 2200);
    if (points.length && /== WHAT'S NEW[^\n]*==/.test(msg)) {
      let n = Math.min(points.length, 8),
        out;
      do {
        out = msg.replace(
          /== WHAT'S NEW[^\n]*==\n(?:-[^\n]*(?:\n|$))*/,
          "== WHAT'S NEW (" + tag + ") ==\n" + points.slice(0, n).join("\n") + "\n",
        );
        n--;
      } while (out.length > limit && n > 0);
      msg = out;
    }
    if (newHeader === header && msg === t.message) {
      return;
    } // (nothing to change)
    const res = await ttAs(String(env.FORUM_EDIT_LOGIN), String(env.FORUM_EDIT_PASSWORD), "forum.editForumThread", [
      Number(th),
      newHeader,
      msg.slice(0, limit),
    ]);
    await alert(
      env,
      "forum post",
      res.ok
        ? "Updated the thread for " + tag + " (title: " + newHeader + ")"
        : "❌ The thread was not updated for " + tag + ": " + res.why,
    );
  } catch (e) {
    await alert(env, "forum post", "❌ The thread was not updated: " + String((e && e.message) || e).slice(0, 200));
  }
}
async function releaseForumPost(env, r, force) {
  try {
    if (!forumAuto(env) || env.FORUM_RELEASE_POST === "0") {
      return;
    }
    const tag = String(r.tag_name || "");
    if (!/^v\d+(\.\d+)*$/.test(tag)) {
      return;
    }
    await ensureTables(env);
    const key = "forumrel:" + tag;
    if (!force && (await env.DB.prepare("SELECT at FROM alerted WHERE k = ?").bind(key).first())) {
      return;
    } // (once per version)
    await env.DB.prepare("INSERT OR REPLACE INTO alerted (k, at) VALUES (?, ?)").bind(key, Date.now()).run();
    const th = String(env.FORUM_THREADS || "475180")
      .split(",")[0]
      .trim();
    const res = await forumPost(env, th, releaseForumText(env, r));
    await alert(
      env,
      "forum post",
      res.ok
        ? "Posted the " + tag + " release on the forum (thread " + th + ")"
        : "❌ The " + tag + " release was not posted on the forum: " + res.why,
    );
  } catch (e) {
    await alert(
      env,
      "forum post",
      "❌ The release was not posted on the forum: " + String((e && e.message) || e).slice(0, 200),
    );
  }
}
async function forumPostFromDiscord(env, th, rid, text, app, token) {
  const say = (content) =>
    fetch("https://discord.com/api/v10/webhooks/" + app + "/" + token + "/messages/@original", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: String(content).slice(0, 1990), allowed_mentions: { parse: [] } }),
    }).catch(() => {});
  try {
    await ensureTables(env);
    const threads = String(env.FORUM_THREADS || "475180")
      .split(",")
      .map((t) => t.trim());
    if (!threads.includes(String(th))) {
      return say("❌ Not posted: replies from Discord only go to your own threads (FORUM_THREADS).");
    }
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE kind = 'forum post' AND at > ?")
      .bind(Date.now() - DAY)
      .first();
    if (n && n.n >= FORUM_POSTS_A_DAY) {
      return say(
        "❌ Not posted: that's " +
          FORUM_POSTS_A_DAY +
          " forum replies from Discord today already.\n\nYour reply:\n" +
          text,
      );
    }
    text = forumSafe(text).slice(0, FORUM_MAX); // (the forum takes plain text only, and not too long)
    if (!text) {
      return say("❌ Not posted: nothing left once emoji are taken out (the forum only takes plain text).");
    }
    const r = await forumPost(env, th, text),
      link = "https://tanktrouble.com/forum?threadId=" + th + (rid && rid !== "0" ? "&id=" + rid : "");
    if (r.ok) {
      await alert(env, "forum post", "Posted on the forum from Discord (thread " + th + "): " + text.slice(0, 300));
      return say("✅ **Posted on the forum:** <" + link + ">\n>>> " + text);
    }
    await alert(env, "forum post failed", "A forum reply from Discord was not posted (thread " + th + "): " + r.why);
    return say(
      "❌ **Not posted:** " + r.why + "\nYour reply is below, to copy and paste instead: <" + link + ">\n\n" + text,
    );
  } catch (e) {
    return say("❌ Not posted: " + String((e && e.message) || e).slice(0, 200) + "\n\n" + text);
  }
}
async function discordInteraction(env, req, ctx) {
  const body = await req.text();
  if (!env.DISCORD_PUBLIC_KEY || !(await verifyDiscord(env, req, body))) {
    return new Response("bad signature", { status: 401 });
  }
  const i = JSON.parse(body),
    reply = (data) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  if (i.type === 1) {
    return reply({ type: 1 });
  } // (Discord checking the address works)
  const user = (i.member && i.member.user) || i.user || {},
    allowed = String(env.REPLY_USERS || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  if (!allowed.includes(String(user.id))) {
    return reply({ type: 4, data: { content: "Only the Color Lab team can reply.", flags: 64 } });
  }
  const id = String((i.data && i.data.custom_id) || "");
  if (i.type === 2 && i.data && i.data.name === "forum") {
    // /forum: a new reply on the Color Lab thread as ColorLab, typed straight in Discord (no notification needed)
    const th = String(env.FORUM_THREADS || "475180")
      .split(",")[0]
      .trim();
    return reply({
      type: 9,
      data: {
        custom_id: "fsend:" + th + ":0",
        title: "Post on the Color Lab thread",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "text",
                style: 2,
                label: forumAuto(env) ? "Your post (posted on the forum as ColorLab)" : "Your forum post",
                min_length: 1,
                max_length: 2000,
                required: true,
              },
            ],
          },
        ],
      },
    });
  }
  if (i.type === 3 && /^reply:\d+$/.test(id)) {
    return reply({
      type: 9,
      data: {
        custom_id: "send:" + id.slice(6),
        title: "Reply in Color Lab", // (the Reply button: a box to type the answer)
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "text",
                style: 2,
                label: "Your reply (the player sees this)",
                min_length: 1,
                max_length: 1000,
                required: true,
              },
            ],
          },
        ],
      },
    });
  }
  if (i.type === 5 && /^send:\d+$/.test(id)) {
    const fid = Number(id.slice(5)),
      text = String(((((i.data.components || [])[0] || {}).components || [])[0] || {}).value || "").slice(0, 1000);
    await ensureTables(env);
    if (!(await env.DB.prepare("SELECT 1 FROM feedback WHERE id = ?").bind(fid).first())) {
      return reply({ type: 4, data: { content: "That message is gone.", flags: 64 } });
    }
    await env.DB.prepare("INSERT INTO replies (fid, text, at) VALUES (?, ?, ?)").bind(fid, text, Date.now()).run();
    return reply({
      type: 4,
      data: { content: "↩️ **Reply to #" + fid + "** (sent to the player): " + text, allowed_mentions: { parse: [] } },
    });
  }
  if (i.type === 3 && /^freply:\d+:\d+$/.test(id)) {
    const [, th, rid] = id.split(":"); // a forum reply: typed here, then copied (phone) or filled in by the owner's DEV copy (PC); it's posted from your own browser, so your login never leaves it
    return reply({
      type: 9,
      data: {
        custom_id: "fsend:" + th + ":" + rid,
        title: "Reply on the forum",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "text",
                style: 2,
                label: forumAuto(env) ? "Your reply (posted on the forum as you)" : "Your forum reply",
                min_length: 1,
                max_length: 2000,
                required: true,
              },
            ],
          },
        ],
      },
    });
  }
  if (i.type === 5 && /^fsend:\d+:\d+$/.test(id)) {
    const [, th, rid] = id.split(":"),
      text = String(((((i.data.components || [])[0] || {}).components || [])[0] || {}).value || "").slice(0, 2000);
    if (forumAuto(env) && ctx && i.application_id && i.token) {
      // posted straight away by the server, logged in as you (FORUM_AUTOPOST, with TT_LOGIN / TT_PASSWORD as secrets)
      ctx.waitUntil(forumPostFromDiscord(env, th, rid, text, i.application_id, i.token));
      return reply({ type: 5, data: { flags: 64 } });
    } // ("thinking…" while it logs in and posts)
    await ensureTables(env);
    const r = await env.DB.prepare("INSERT INTO forum_drafts (thread, text, at) VALUES (?, ?, ?)")
      .bind(th, text, Date.now())
      .run();
    const did = r && r.meta && r.meta.last_row_id;
    await env.DB.prepare("DELETE FROM forum_drafts WHERE at < ?")
      .bind(Date.now() - 7 * DAY)
      .run();
    const link = "https://tanktrouble.com/forum?threadId=" + th + "&id=" + rid + (did ? "#ttcl-draft=" + did : "");
    if (i.application_id && i.token && ctx) {
      ctx.waitUntil(
        new Promise((resolve) => setTimeout(resolve, 800))
          .then(() =>
            fetch("https://discord.com/api/v10/webhooks/" + i.application_id + "/" + i.token, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content:
                  "👉 **Open the thread and paste it:** " +
                  link +
                  "\n(On your PC with Color Lab DEV, the reply is filled in for you: just press Post.)",
                flags: 64,
                allowed_mentions: { parse: [] },
              }),
            }),
          )
          .catch(() => {}),
      );
    } // (sent just after the reply below: a follow-up needs the first answer to be there)
    return reply({ type: 4, data: { content: text, flags: 64, allowed_mentions: { parse: [] } } });
  } // (just your text, so "Copy Text" copies only that; the link comes next)
  return reply({ type: 4, data: { content: "Unknown action.", flags: 64 } });
}

// ---------- the owner's admin page ----------
function adminOk(env, req) {
  const clean = (v) =>
    String(v || "")
      .trim()
      .replace(/^["']+|["']+$/g, "")
      .trim(); // (a stray space, new line or quotes from pasting don't matter)
  const want = clean(env.ADMIN_TOKEN),
    got = clean(req.headers.get("x-admin"));
  if (!want || got.length !== want.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < want.length; i++) {
    diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  }
  return diff === 0;
}
async function adminApi(env, ctx, req, url) {
  if (!String(env.ADMIN_TOKEN || "").trim()) {
    return json(
      {
        error: "The server has no ADMIN_TOKEN yet: run  npx wrangler secret put ADMIN_TOKEN  in the ttcl-share folder",
      },
      403,
    );
  }
  await ensureTables(env);
  const now = Date.now(),
    aih = await ipHash(env, req); // (wrong keys: 5 in an hour from one connection locks it out for the hour)
  const fails = await env.DB.prepare("SELECT COUNT(*) AS n FROM claims WHERE who = ? AND pid = 'a' AND at > ?")
    .bind(aih, now - 3600000)
    .first();
  if (fails && fails.n >= 5) {
    return json({ error: "Too many wrong admin keys: locked for an hour" }, 429);
  }
  if (!adminOk(env, req)) {
    await env.DB.prepare("INSERT INTO claims (who, pid, at) VALUES (?, 'a', ?)").bind(aih, now).run();
    if (fails && fails.n + 1 >= 5) {
      ctx.waitUntil(
        (async () =>
          alert(
            env,
            "admin lockout",
            "Someone typed a wrong admin key 5 times and is locked out for an hour (connection " +
              aih.slice(0, 10) +
              "; accounts seen on it today: " +
              ((await namesOnConnection(env, aih)) || "none") +
              "). If it wasn't you, someone is guessing your admin key",
          ))(),
      );
    }
    return json({ error: "Wrong admin key. Check it was pasted whole" }, 403);
  }
  if (url.pathname === "/v1/admin/summary") {
    const q = (sql, ...b) =>
      env.DB.prepare(sql)
        .bind(...b)
        .all()
        .then((r) => r.results || []);
    try {
      const miss = await q(
        "SELECT DISTINCT x.pid FROM (SELECT pid FROM verified UNION SELECT pid FROM looks UNION SELECT pid FROM seen_accts UNION SELECT pid FROM claims WHERE pid GLOB '[0-9]*' AND at > ?) x LEFT JOIN names n ON n.pid = x.pid WHERE n.pid IS NULL LIMIT 8",
        Date.now() - 2 * DAY,
      );
      await Promise.all(miss.map((r) => rememberName(env, r.pid)));
    } catch {} // (tanks whose names aren't known yet are looked up, a few a time, so the page shows names, not numbers)
    return json({
      minVersion: env.MIN_VERSION || "",
      announce: await env.DB.prepare("SELECT text, at FROM announce WHERE id = 1")
        .first()
        .catch(() => null),
      bcast: await env.DB.prepare("SELECT n, title, body, link, ltext, until, at FROM bcast WHERE id = 1")
        .first()
        .catch(() => null),
      looks: await q(
        "SELECT l.pid, l.look, l.keyhash, l.updated, v.at AS verified, n.name, n.guest FROM looks l LEFT JOIN verified v ON v.pid = l.pid AND v.keyhash = l.keyhash LEFT JOIN names n ON n.pid = l.pid ORDER BY l.updated DESC LIMIT 100",
      ),
      owners: await q(
        "SELECT l.keyhash, COUNT(*) AS tanks, MAX(l.updated) AS last, group_concat(COALESCE(n.name || CASE WHEN n.guest = 1 THEN ' (guest)' ELSE '' END, l.pid), ', ') AS who FROM looks l LEFT JOIN names n ON n.pid = l.pid GROUP BY l.keyhash ORDER BY tanks DESC LIMIT 30",
      ),
      reports: await Promise.all(
        (
          await q(
            "SELECT r.pid, COUNT(DISTINCT r.who) AS people, MAX(r.at) AS last, group_concat(DISTINCT r.kh) AS khs, n.name, n.guest FROM reports r LEFT JOIN names n ON n.pid = r.pid WHERE r.at > ? GROUP BY r.pid ORDER BY last DESC LIMIT 50",
            now - 7 * DAY,
          )
        ).map(async (r) =>
          Object.assign(r, {
            by: (
              await Promise.all(
                String(r.khs || "")
                  .split(",")
                  .filter(Boolean)
                  .slice(0, 5)
                  .map((k) => reporterNames(env, k)),
              )
            ).join("; "),
          }),
        ),
      ),
      hidden: await q("SELECT pid, keyhash, at FROM hidden ORDER BY at DESC LIMIT 50"),
      banned: await q(
        "SELECT b.hash, b.at, COALESCE(b.kind, CASE WHEN EXISTS (SELECT 1 FROM presence p WHERE p.kh = b.hash) THEN 'copy' ELSE 'connection' END) AS kind, COALESCE(b.who, (SELECT group_concat(DISTINCT COALESCE(n.name, x.pid)) FROM (SELECT pid FROM verified WHERE keyhash = b.hash UNION SELECT pid FROM claims WHERE who = b.hash AND pid GLOB '[0-9]*' UNION SELECT pid FROM looks WHERE keyhash = b.hash) x LEFT JOIN names n ON n.pid = x.pid)) AS who FROM banned b ORDER BY b.at IS NULL, b.at DESC LIMIT 200",
      ),
      trusted: (await q("SELECT hash FROM trusted")).map((r) => r.hash),
      held: await q(
        "SELECT q.grp, MAX(q.why) AS why, MAX(q.at) AS at, (SELECT group_concat(COALESCE(n.name || CASE WHEN n.guest = 1 THEN ' (guest)' ELSE '' END, l.pid), ', ') FROM looks l LEFT JOIN names n ON n.pid = l.pid WHERE l.keyhash = q.grp) AS who FROM quarantine q GROUP BY q.grp ORDER BY at DESC",
      ),
      events: await q("SELECT at, kind, detail FROM events ORDER BY at DESC LIMIT 100"),
      stats: await (async () => {
        const one = async (sql, ...b) =>
          (
            (await env.DB.prepare(sql)
              .bind(...b)
              .first()
              .catch(() => null)) || {}
          ).n || 0; // (the overview at the top of the page)
        return {
          copiesDay: await one("SELECT COUNT(*) AS n FROM presence WHERE last > ?", now - DAY),
          copiesWeek: await one("SELECT COUNT(*) AS n FROM presence WHERE last > ?", now - 7 * DAY),
          copiesMonth: await one("SELECT COUNT(*) AS n FROM presence WHERE last > ?", now - 30 * DAY),
          newDay: await one("SELECT COUNT(*) AS n FROM presence WHERE first > ?", now - DAY),
          newWeek: await one("SELECT COUNT(*) AS n FROM presence WHERE first > ?", now - 7 * DAY),
          looksDay: await one("SELECT COUNT(*) AS n FROM look_history WHERE at > ?", now - DAY),
          looksWeek: await one("SELECT COUNT(*) AS n FROM look_history WHERE at > ?", now - 7 * DAY),
          tanksShared: await one("SELECT COUNT(*) AS n FROM looks"),
          proven: await one("SELECT COUNT(*) AS n FROM verified"),
          provenWeek: await one("SELECT COUNT(*) AS n FROM verified WHERE at > ?", now - 7 * DAY),
          msgsWeek: await one("SELECT COUNT(*) AS n FROM feedback WHERE at > ?", now - 7 * DAY),
          reportsWeek: await one("SELECT COUNT(*) AS n FROM reports WHERE at > ?", now - 7 * DAY),
          banned: await one("SELECT COUNT(*) AS n FROM banned"),
        };
      })(),
      lookTop: await q(
        "SELECT h.pid, SUM(CASE WHEN h.at > ? THEN 1 ELSE 0 END) AS d1, SUM(CASE WHEN h.at > ? THEN 1 ELSE 0 END) AS d7, COUNT(*) AS d30, MAX(h.at) AS last, COUNT(DISTINCT h.kh) AS copies, group_concat(DISTINCT h.cc) AS ccs, n.name, n.guest FROM look_history h LEFT JOIN names n ON n.pid = h.pid GROUP BY h.pid ORDER BY d7 DESC, d30 DESC LIMIT 30",
        now - DAY,
        now - 7 * DAY,
      ),
      lookLog: await (async () => {
        const rows = await q(
          "SELECT h.id, h.pid, h.kh, h.at, h.cc, h.look, n.name, n.guest FROM look_history h LEFT JOIN names n ON n.pid = h.pid ORDER BY h.id DESC LIMIT 150",
        ); // (what changed: compared with that tank's look before)
        const parse = (x) => {
            try {
              return JSON.parse(x) || {};
            } catch {
              return {};
            }
          },
          label = {
            turret: "turret",
            base: "base",
            treads: "treads",
            bullet: "bullet",
            acc: "items",
            fb: "in-maze",
            mz: "in-maze",
          };
        const out = [];
        for (const r of rows.slice(0, 100)) {
          let prev = rows.find((x) => x.pid === r.pid && x.id < r.id);
          if (!prev) {
            prev = await env.DB.prepare(
              "SELECT look FROM look_history WHERE pid = ? AND id < ? ORDER BY id DESC LIMIT 1",
            )
              .bind(r.pid, r.id)
              .first()
              .catch(() => null);
          }
          const a = parse(r.look),
            b = prev ? parse(prev.look) : null,
            ch = b
              ? [
                  ...new Set(
                    [...Object.keys(a), ...Object.keys(b)]
                      .filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
                      .map((k) => label[k] || k),
                  ),
                ]
              : null;
          out.push({
            pid: r.pid,
            name: r.name,
            guest: r.guest,
            at: r.at,
            kh: r.kh,
            cc: r.cc,
            changed: ch ? (ch.length ? ch.join(", ") : "saved again, no change") : "first look saved",
          });
        }
        return out;
      })(),
      swept: await q("SELECT pid, name, guest, why, at FROM swept ORDER BY at DESC LIMIT 200"),
      users141: await (async () => {
        // every player who has used v1.4.1 or newer: accounts logged in on those copies, and the tanks they proved or shared
        const cps = (await q("SELECT kh, ver, first, last FROM presence")).filter(
          (c) => c.ver && c.ver !== "?" && !verAbove("1.4.1", c.ver),
        );
        const byKh = {};
        for (const c of cps) {
          byKh[c.kh] = c;
        }
        const acc = {};
        const add = (pid, kh, first, last, ver) => {
          if (!PID.test(String(pid))) {
            return;
          }
          const a = acc[pid] || (acc[pid] = { pid: String(pid), first, last, ver, copies: new Set() });
          a.first = Math.min(a.first, first);
          a.last = Math.max(a.last, last);
          if (verAbove(ver, a.ver)) {
            a.ver = ver;
          }
          if (kh) {
            a.copies.add(kh);
          }
        };
        for (const r of await q("SELECT pid, kh, ver, first, last FROM seen_accts")) {
          add(r.pid, r.kh, r.first, r.last, r.ver);
        }
        if (cps.length) {
          for (const r of await q("SELECT kh, pids FROM logged")) {
            const c = byKh[r.kh];
            if (c) {
              String(r.pids || "")
                .split(",")
                .filter(Boolean)
                .forEach((pid) => add(pid, r.kh, c.first, c.last, c.ver));
            }
          }
          for (const r of await q(
            "SELECT pid, keyhash AS kh FROM verified UNION SELECT pid, keyhash AS kh FROM looks",
          )) {
            const c = byKh[r.kh];
            if (c) {
              add(r.pid, r.kh, c.first, c.last, c.ver);
            }
          }
        }
        const ids = Object.keys(acc),
          nm = {};
        for (let i = 0; i < ids.length; i += 90) {
          const part = ids.slice(i, i + 90);
          for (const r of await q(
            `SELECT pid, name, guest FROM names WHERE pid IN (${part.map(() => "?").join(",")})`,
            ...part,
          )) {
            nm[r.pid] = r;
          }
        }
        return {
          copies: cps.length,
          list: Object.values(acc)
            .map((a) => ({
              pid: a.pid,
              name: nm[a.pid] ? nm[a.pid].name : null,
              guest: !!(nm[a.pid] && nm[a.pid].guest),
              ver: a.ver,
              first: a.first,
              last: a.last,
              copies: a.copies.size,
            }))
            .sort((x, y) => y.last - x.last),
        };
      })(),
      presence: await (async () => {
        const rows = await q(
          "SELECT p.kh, p.ver, p.first, p.last, p.off, p.offat, p.inv, l.away, l.wh, l.idle, l.srv, l.sat, l.pids AS lpids, (SELECT group_concat(COALESCE(n.name || CASE WHEN n.guest = 1 THEN ' (guest)' ELSE '' END, a.pid), ', ') FROM (SELECT pid FROM verified WHERE keyhash = p.kh UNION SELECT pid FROM looks WHERE keyhash = p.kh) a LEFT JOIN names n ON n.pid = a.pid) AS who, (SELECT 1 FROM trusted t WHERE t.hash = p.kh) AS mine FROM presence p LEFT JOIN logged l ON l.kh = p.kh WHERE p.last > ? ORDER BY p.last DESC LIMIT 300",
          now - 30 * DAY,
        );
        const ids = [
            ...new Set(
              rows.flatMap((r) =>
                String(r.lpids || "")
                  .split(",")
                  .filter(Boolean),
              ),
            ),
          ],
          nm = {};
        for (let i = 0; i < ids.length; i += 90) {
          const part = ids.slice(i, i + 90);
          for (const r of await q(
            "SELECT pid, name FROM names WHERE pid IN (" + part.map(() => "?").join(",") + ")",
            ...part,
          )) {
            nm[r.pid] = r.name;
          }
        }
        const sa = {};
        for (const r of await q("SELECT kh, pid FROM seen_accts")) {
          (sa[r.kh] = sa[r.kh] || []).push(r.pid);
        }
        const more = [...new Set(Object.values(sa).flat())].filter((x) => !(x in nm));
        for (let i = 0; i < more.length; i += 90) {
          const part = more.slice(i, i + 90);
          for (const r of await q(
            "SELECT pid, name, guest FROM names WHERE pid IN (" + part.map(() => "?").join(",") + ")",
            ...part,
          )) {
            nm[r.pid] = r.name + (r.guest ? " (guest)" : "");
          }
        }
        rows.forEach((r) => {
          r.nowAs = String(r.lpids || "")
            .split(",")
            .filter(Boolean)
            .map((x) => nm[x] || x)
            .join(", ");
          r.seenAs = [
            ...new Set(
              (sa[r.kh] || []).concat(
                String(r.lpids || "")
                  .split(",")
                  .filter(Boolean),
              ),
            ),
          ]
            .map((x) => nm[x] || x)
            .join(", ");
          delete r.lpids;
        });
        return rows;
      })(),
    });
  }
  if (url.pathname === "/v1/admin/name") {
    const pid = url.searchParams.get("pid") || "";
    if (!PID.test(pid)) {
      return json({ error: "bad pid" }, 400);
    }
    const d = await rememberName(env, pid);
    if (d) {
      return json({ pid, name: d.username, guest: !!d.guest });
    }
    const k = await env.DB.prepare("SELECT name, guest FROM names WHERE pid = ?").bind(pid).first();
    return json({ pid, name: k ? k.name : null, guest: k ? !!k.guest : null, gone: !!k });
  }
  if (url.pathname === "/v1/admin/action" && req.method === "POST") {
    let b;
    try {
      b = await req.json();
    } catch {
      return json({ error: "bad json" }, 400);
    }
    const pid = PID.test(String(b.pid || "")) ? String(b.pid) : null,
      hash = /^[0-9a-f]{64}$/.test(String(b.hash || "")) ? String(b.hash) : null;
    if (b.op === "delete" && pid) {
      await env.DB.prepare("DELETE FROM looks WHERE pid = ?").bind(pid).run();
      if (env.HUB) {
        ctx.waitUntil(
          hub(env)
            .notify(pid, null, now)
            .catch(() => {}),
        );
      }
    } else if (b.op === "ban" && (pid || hash)) {
      const kh =
        hash || ((await env.DB.prepare("SELECT keyhash FROM looks WHERE pid = ?").bind(pid).first()) || {}).keyhash;
      if (!kh) {
        return json({ error: "nothing to ban" }, 404);
      }
      await banWho(env, ctx, kh, kh, now);
    } else if (b.op === "unban" && hash) {
      await env.DB.prepare("DELETE FROM banned WHERE hash = ?").bind(hash).run();
    } else if (b.op === "release" && hash) {
      await env.DB.prepare("DELETE FROM quarantine WHERE grp = ?").bind(hash).run();
    } // (its looks show again)
    else if (b.op === "banheld" && hash) {
      const hs = (
        (await env.DB.prepare("SELECT hash FROM quarantine WHERE grp = ?").bind(hash).all()).results || []
      ).map((r) => r.hash);
      await banWho(env, ctx, hash, hs.find((h) => h !== hash) || hash, now, hs.filter((h) => h !== hash)[1]);
      await env.DB.prepare("DELETE FROM quarantine WHERE grp = ?").bind(hash).run();
    } else if (b.op === "trust" && hash) {
      await env.DB.prepare("INSERT OR IGNORE INTO trusted (hash) VALUES (?)").bind(hash).run();
    } else if (b.op === "untrust" && hash) {
      await env.DB.prepare("DELETE FROM trusted WHERE hash = ?").bind(hash).run();
    } else if (b.op === "bcast") {
      const body = String(b.body || "")
        .replace(/\r/g, "")
        .trim()
        .slice(0, 3000); // a live announcement: a new one (or "show again") gets a new number, so every copy shows it, even ones that closed the last
      if (!body) {
        await env.DB.prepare("DELETE FROM bcast WHERE id = 1").run();
      } else {
        const hrs = Math.max(0, Math.min(24 * 60, Number(b.hours) || 0)),
          link = /^https:\/\/[^\s]{1,300}$/.test(String(b.link || "")) ? String(b.link) : null;
        const zip = b.zipOnly === true ? 1 : 0;
        await env.DB.prepare("INSERT INTO bcast_log (title, body, at, zip) VALUES (?, ?, ?, ?)")
          .bind(
            String(b.title || "")
              .trim()
              .slice(0, 120) || null,
            body,
            now,
            zip,
          )
          .run();
        await env.DB.prepare(
          "INSERT OR REPLACE INTO bcast (id, n, title, body, link, ltext, until, at, zip) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(
            now,
            String(b.title || "")
              .trim()
              .slice(0, 120) || null,
            body,
            link,
            link
              ? String(b.ltext || "")
                  .trim()
                  .slice(0, 40) || "Open"
              : null,
            hrs ? now + hrs * 3600000 : null,
            now,
            zip,
          )
          .run();
      }
      bcastCache = null;
      if (body && env.HUB) {
        const r = await env.DB.prepare("SELECT n, title, body, link, ltext, zip FROM bcast WHERE id = 1").first();
        if (r) {
          ctx.waitUntil(
            hub(env)
              .announce({
                id: r.n,
                title: r.title || "",
                body: r.body,
                link: r.link || "",
                linkText: r.ltext || "",
                zipOnly: !!r.zip,
              })
              .catch(() => {}),
          );
        }
      }
    } // (v1.4.1+ copies with TankTrouble open show it straight away)
    else if (b.op === "relpost") {
      // the newest release, by hand: the one the server saved when GitHub published it (asked from GitHub only if there's none),
      // posted as a ColorLab reply on the thread and written into the thread's first post. For a release published before this was set up.
      await ensureTables(env);
      let rel = null;
      try {
        const row = await env.DB.prepare("SELECT tag, body FROM release WHERE id = 1").first();
        const j = row && JSON.parse(row.body);
        if (j && j.tag) {
          rel = { tag_name: j.tag, name: j.name || "", body: j.notes || "", html_url: j.url || "" };
        }
      } catch {}
      if (!rel || !String(rel.body || "").trim()) {
        const g = await fetch(RELEASES, {
          headers: { "User-Agent": "ttcl-share", Accept: "application/vnd.github+json" },
        });
        const j = g.ok ? await g.json() : null;
        if (j && j.tag_name) {
          rel = j;
        }
      }
      if (!rel || !rel.tag_name) {
        return json({ error: "no release saved yet, and GitHub did not answer" }, 502);
      }
      await releaseForumPost(env, rel, true);
      await releaseThreadEdit(env, rel, true);
      return json({ ok: true, tag: rel.tag_name });
    } else if (b.op === "announce") {
      const t = String(b.text || "")
        .replace(/\r/g, "")
        .trim()
        .slice(0, 1500);
      if (t) {
        await env.DB.prepare("INSERT OR REPLACE INTO announce (id, text, at) VALUES (1, ?, ?)").bind(t, now).run();
      } else {
        await env.DB.prepare("DELETE FROM announce WHERE id = 1").run();
      }
      annCache = null;
    } else if (b.op === "testlog") {
      await alert(env, "test", "Test from the admin page: #logs works");
      await alert(env, "urgent test", "Test from the admin page: urgent alerts ping you");
    } else if (b.op === "unhide" && pid) {
      await env.DB.prepare("DELETE FROM hidden WHERE pid = ?").bind(pid).run();
    } else if (b.op === "unverify" && pid) {
      await env.DB.prepare("DELETE FROM verified WHERE pid = ?").bind(pid).run();
    } else if (b.op === "clearreports" && pid) {
      await env.DB.prepare("DELETE FROM reports WHERE pid = ?").bind(pid).run();
    } else {
      return json({ error: "bad op" }, 400);
    }
    {
      const who = hash ? await whoOf(env, hash) : "";
      ctx.waitUntil(
        alert(
          env,
          "admin",
          b.op + " " + (pid || (hash || "").slice(0, 10)) + (who ? " (" + who.slice(0, 120) + ")" : ""),
        ),
      );
    }
    return json({ ok: true });
  }
  return json({ error: "not found" }, 404);
}
const ADMIN_PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Color Lab admin</title>
<style>body{font:14px system-ui,Arial;margin:16px;background:#14161a;color:#e8e8ea}h2{margin:18px 0 6px;font-size:16px}table{border-collapse:collapse;width:100%;max-width:1100px}td,th{border-bottom:1px solid #2c3036;padding:4px 6px;text-align:left;vertical-align:top;font-size:13px}
code{font-size:12px;color:#9fc3ff}button{background:#3b6fd8;color:#fff;border:0;border-radius:4px;padding:3px 8px;cursor:pointer;margin:1px}button.r{background:#b8323a}input{background:#0d0f12;color:#fff;border:1px solid #444;padding:5px;border-radius:4px;width:280px;max-width:100%}.dim{color:#9aa0a8}.ok{color:#5ccf7a}.bad{color:#ff7a6b}.wrap{overflow-x:auto}</style></head>
<body><h1 style="font-size:18px">Color Lab look server: admin</h1><p>Admin key: <input id="tok" type="password" placeholder="your ADMIN_TOKEN"> <button id="use">Use</button> <button id="ref">Refresh</button> <span id="msg" class="dim"></span></p><div id="out"></div>
<script>
const $=id=>document.getElementById(id);let T='';try{T=localStorage.getItem('ttcl_admin')||'';$('tok').value=T}catch(e){}
$('use').onclick=()=>{T=$('tok').value.trim();try{localStorage.setItem('ttcl_admin',T)}catch(e){}load()};$('ref').onclick=()=>load();
const api=(p,o)=>fetch(p,Object.assign({},o||{},{headers:{'x-admin':T,'Content-Type':'application/json'}})).then(r=>r.json());
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);const when=t=>t?new Date(t).toLocaleString():'';
const nameCell=a=>a.name?esc(a.name)+(a.guest?' <span class="dim">(guest)</span>':''):btn('who','who?',a);
const btn=(op,label,a,red)=>'<button'+(red?' class="r"':'')+' data-op="'+op+'" data-pid="'+esc(a.pid||'')+'" data-hash="'+esc(a.hash||'')+'">'+label+'</button>';
const mdl=t=>{const inl=x=>esc(x).replace(/\\*\\*(.+?)\\*\\*/g,'<b>$1</b>');let o='',ul=false;const cl=()=>{if(ul){o+='</ul>';ul=false}};for(const r of String(t||'').split(/\\n/).slice(0,40)){const l=r.trim();if(!l){cl();continue}if(/^[-*] /.test(l)){if(!ul){o+='<ul style="margin:4px 0 6px 18px;padding:0">';ul=true}o+='<li>'+inl(l.slice(2))+'</li>';continue}cl();o+=/^#{1,4} /.test(l)?'<p style="margin:8px 0 2px"><b>'+inl(l.replace(/^#+ /,''))+'</b></p>':'<p style="margin:4px 0">'+inl(l)+'</p>'}cl();return o};
const okLink=u=>{try{const x=new URL(u);if(x.protocol!=='https:')return false;return(x.hostname==='github.com'&&/^\\/wazzey\\//.test(x.pathname))||/(^|\\.)tanktrouble\\.com$/.test(x.hostname)||['discord.gg','discord.com'].includes(x.hostname)}catch(e){return false}};
function bcPrev(){const P=$('bcPrev');if(!P)return;const t=$('bcT').value,b=$('bcB').value,l=$('bcL').value.trim(),lt=$('bcLT').value.trim()||'Open';$('bcTn').textContent=t.length+'/120';$('bcBn').textContent=b.length+'/3000';
 const lw=l&&!okLink(l)?'<div style="color:#ff7a6b;font-size:12px;margin-top:4px">This link will not show: it must start with https:// and go to your GitHub, tanktrouble.com or Discord.</div>':'';
 P.innerHTML='<div style="width:310px;background:#101626;color:#e9edf7;border:2px solid #3f78ff;border-radius:9px;box-shadow:0 6px 18px rgba(0,0,0,.55);font:13px/1.45 Arial,sans-serif;overflow:hidden"><div style="display:flex;align-items:center;gap:6px;padding:6px 8px 6px 10px;background:linear-gradient(#427fff,#0014ab);color:#fff;font:14px Arial"><span style="flex:1">📢 Color Lab announcement <small style="opacity:.85">· just now</small></span><b>✕</b></div><div style="padding:7px 10px 4px;max-height:220px;overflow:auto"><div style="font:bold 14px Arial;color:#fff;margin:0 0 4px">'+esc(t||'Color Lab')+'</div>'+(mdl(b)||'<p class="dim">Your message</p>')+'</div><div style="display:flex;gap:6px;justify-content:flex-end;padding:4px 10px 9px;align-items:center"><span style="margin-right:auto;font-size:11px;color:#9db8ff;text-decoration:underline">All announcements</span>'+(l&&okLink(l)?'<span style="background:linear-gradient(#427fff,#0014ab);color:#fff;border-radius:5px;padding:3px 10px">'+esc(lt)+'</span>':'')+'<span style="background:'+(l&&okLink(l)?'linear-gradient(#777,#444)':'linear-gradient(#427fff,#0014ab)')+';color:#fff;border-radius:5px;padding:3px 10px">Got it</span></div><div style="height:3px;background:#3f78ff"></div></div>'+lw}
document.addEventListener('input',ev=>{if(ev.target.closest('#bcBox'))bcPrev();if(ev.target.id==='flt'){const q=ev.target.value.trim().toLowerCase();document.querySelectorAll('#out table tr').forEach(tr=>{if(tr.querySelector('th'))return;tr.style.display=!q||tr.textContent.toLowerCase().includes(q)?'':'none'})}});
document.addEventListener('click',async ev=>{const c=ev.target.closest('#relPost');if(!c)return;if(!confirm('Post the newest release on the forum now (a ColorLab reply, and update the first post)?'))return;c.disabled=true;const say=t=>{$('msg').textContent=t;if($('relMsg'))$('relMsg').textContent=t};say('Posting...');let r;try{r=await api('/v1/admin/action',{method:'POST',body:JSON.stringify({op:'relpost'})})}catch(e){r={error:'no answer from the server'}}c.disabled=false;say(r.ok?('Done for '+r.tag+': check #logs and the thread'):('Not done: '+(r.error||'failed')))});
document.addEventListener('click',async ev=>{const c=ev.target.closest('#bcGo,#bcClear');if(c){const body=c.id==='bcClear'?'':$('bcB').value;if(c.id==='bcGo'&&!body.trim()){$('msg').textContent='write a message first';return}const zip=!!($('bcZip')&&$('bcZip').checked);if(c.id==='bcGo'&&!confirm((zip?'Copies installed from GitHub only: ':'')+'Send this announcement to every Color Lab player now?'))return;if(c.id==='bcClear'&&!confirm('Stop showing the current announcement to players who open TankTrouble later? (It stays in their Announcements list.)'))return;const r=await api('/v1/admin/action',{method:'POST',body:JSON.stringify({op:'bcast',zipOnly:zip,title:$('bcT').value,body,link:$('bcL').value.trim(),ltext:$('bcLT').value,hours:$('bcH').value})});$('msg').textContent=r.ok?(body?'📢 Sent to everyone':'Stopped showing it'):(r.error||'failed');load()}});
document.addEventListener('click',async ev=>{const a=ev.target.closest('#annSave,#annClear');if(a){const text=a.id==='annClear'?'':$('ann').value;const r=await api('/v1/admin/action',{method:'POST',body:JSON.stringify({op:'announce',text})});$('msg').textContent=r.ok?(text?'message saved':'message cleared'):(r.error||'failed');load();return}});
document.addEventListener('click',async ev=>{const b=ev.target.closest('button[data-op]');if(!b)return;const op=b.dataset.op,pid=b.dataset.pid||null,hash=b.dataset.hash||null;
 if(op==='who'){const r=await api('/v1/admin/name?pid='+pid);b.parentNode.textContent=r.name?(r.name+(r.guest?' (guest)':'')+(r.gone?' (gone now)':'')):'unknown (not saved before it was gone)';return}
 if(op!=='testlog'&&!confirm(op+' '+(pid||hash)+'?'))return;const r=await api('/v1/admin/action',{method:'POST',body:JSON.stringify({op,pid,hash})});$('msg').textContent=r.ok?op+' done':(r.error||'failed');load()});
async function load(){const d=await api('/v1/admin/summary');if(d.error){$('out').innerHTML='<p>'+esc(d.error)+'</p><p class="dim">The key you entered is '+T.length+' characters long.</p>';return}
const pr=d.presence||[],onl=pr.filter(p=>Date.now()-p.last<7*60000),off=pr.filter(p=>Date.now()-p.last>=7*60000),vers={};pr.forEach(p=>{vers[p.ver]=(vers[p.ver]||0)+1});
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' days ago'};
const vnum=v=>String(v||'').split('.').map(x=>parseInt(x)||0),vold=(a,b)=>{a=vnum(a);b=vnum(b);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)!==(b[i]||0))return(a[i]||0)<(b[i]||0)}return false};
const pstat=p=>(p.inv?'👻 ':'')+(p.inv?'<span class="dim">invisible</span> · ':'')+pstat0(p);const pstat0=p=>{const live=Date.now()-p.last<7*60000;if(d.minVersion&&p.ver&&p.ver!=='?'&&vold(p.ver,d.minVersion))return '<span class="bad">Too old: cannot connect, needs an update</span>';if(p.off)return '<span class="dim">Offline by choice since '+esc(when(p.offat))+'</span>';if(!live)return '<span class="dim">⚪ Offline (TankTrouble closed, or no contact)</span>';const w=p.wh==='game'?' · 🎮 in a game':p.wh==='queue'?' · ⏳ in a queue':p.wh==='lobby'?' · in the lobby':'';const sn=p.sat?' for '+ago(p.sat).replace(' ago',''):'';if(p.away)return '<span style="color:#7fb2ff">🔵 Away'+sn+'</span> <span class="dim">(lobby, tab in the background: offline for other players)</span>';if(p.idle)return '<span style="color:#f2c230">🟡 Idle'+sn+'</span><span class="dim">'+w+(p.sat&&Date.now()-p.sat>15*60000?' · offline for other players (idle 15+ min)':'')+'</span>';return '<span class="ok">🟢 Online</span><span class="dim">'+w+'</span>'};
const prow=p=>'<tr><td><code>'+esc(p.kh.slice(0,10))+'</code>'+(p.mine?' <span class="dim">(yours)</span>':'')+'</td><td>v'+esc(p.ver)+'</td><td>'+(p.nowAs&&Date.now()-p.last<7*60000?'<b>'+esc(p.nowAs)+'</b>'+(p.srv?' <span class="dim">('+esc(p.srv)+')</span>':''):p.nowAs?'<span class="dim">last: '+esc(p.nowAs)+'</span>':'<span class="dim">-</span>')+'</td><td>'+(p.who?esc(p.who):'<span class="dim">none shared yet</span>'+(p.seenAs?'<br><span class="dim">seen playing as: </span>'+esc(p.seenAs):''))+'</td><td>'+pstat(p)+'</td><td class="dim">'+ago(p.last)+'<br>'+when(p.last)+'</td><td class="dim">'+when(p.first)+'</td><td>'+((d.trusted||[]).includes(p.kh)?'<span class="ok">yours</span> '+btn('untrust','Untrust',{hash:p.kh}):btn('trust','Make it yours',{hash:p.kh}))+'</td></tr>';
const phead='<tr><th>Copy</th><th>Version</th><th>Playing as now</th><th>Accounts it shared</th><th>Status</th><th>Last seen</th><th>First seen</th><th>Owner</th></tr>';
let h='<p>'+btn('testlog','Send a test to #logs',{})+' <span class="dim">(one quiet message and one that pings you)</span> &nbsp; <input id="flt" placeholder="Search the page (name, player ID, copy...)" style="width:300px;max-width:100%;background:#222;color:#eee;border:1px solid #555;border-radius:5px;padding:5px"></p>';
const st=d.stats||{},tile=(n,l)=>'<div style="background:#181b22;border:1px solid #333;border-radius:8px;padding:8px 12px;min-width:120px"><div style="font-size:20px;font-weight:bold">'+n+'</div><div class="dim" style="font-size:12px">'+l+'</div></div>';
h+='<h2>Overview</h2><div style="display:flex;flex-wrap:wrap;gap:8px;max-width:1100px">'+tile(st.copiesDay,'copies used today')+tile(st.copiesWeek,'copies this week')+tile(st.copiesMonth,'copies this month')+tile(st.newDay+' / '+st.newWeek,'new copies today / week')+tile(st.looksDay+' / '+st.looksWeek,'looks saved today / week')+tile(st.tanksShared,'tanks with a shared look')+tile(st.proven+' (+'+st.provenWeek+')','proven tanks (new this week)')+tile(st.msgsWeek,'messages this week')+tile(st.reportsWeek,'reports this week')+tile(st.banned,'bans')+'</div>';
h+='<div id="bcBox" style="max-width:780px;border:1px solid #3f78ff66;border-radius:8px;padding:10px 14px;margin:16px 0;background:#181b22"><h2 style="margin-top:4px">📢 Send an announcement</h2>'
 +'<p class="dim" style="margin-top:0">Pops up in the top right corner for everyone playing with Color Lab v1.4.1 or newer, the moment you send it. It never blocks the game and closes by itself after 30 seconds. Players who open TankTrouble later still get it, and every announcement stays in Message Color Lab &gt; Announcements. (v1.4 players get it as a message within 5 minutes.)</p>'
 +'<p style="margin:6px 0 2px"><b>Title</b> <span class="dim" id="bcTn"></span></p><input id="bcT" maxlength="120" placeholder="e.g. Tournament this Saturday!" style="width:100%;box-sizing:border-box;background:#222;color:#eee;border:1px solid #555;border-radius:5px;padding:7px" value="'+esc(d.bcast?d.bcast.title||'':'')+'">'
 +'<p style="margin:10px 0 2px"><b>Message</b> <span class="dim" id="bcBn"></span><br><span class="dim">A blank line starts a new paragraph. Start a line with - for a bullet point or # for a heading. Put **stars** around words for bold.</span></p><textarea id="bcB" rows="6" maxlength="3000" placeholder="e.g. Join the Color Lab tournament at 7pm UK time. Reply on the forum thread with your tank name." style="width:100%;box-sizing:border-box;background:#222;color:#eee;border:1px solid #555;border-radius:5px;padding:7px">'+esc(d.bcast?d.bcast.body:'')+'</textarea>'
 +'<p style="margin:10px 0 2px"><b>Button</b> <span class="dim">(optional: only links to your GitHub, tanktrouble.com or Discord work)</span></p><input id="bcL" placeholder="Link, e.g. https://tanktrouble.com/forum?threadId=..." style="width:62%;box-sizing:border-box;background:#222;color:#eee;border:1px solid #555;border-radius:5px;padding:7px" value="'+esc(d.bcast?d.bcast.link||'':'')+'"> <input id="bcLT" maxlength="40" placeholder="Button text, e.g. Open the thread" style="width:36%;box-sizing:border-box;background:#222;color:#eee;border:1px solid #555;border-radius:5px;padding:7px" value="'+esc(d.bcast?d.bcast.ltext||'':'')+'">'
 +'<p style="margin:10px 0 2px"><b>Keep showing it to players who open TankTrouble later for</b> <select id="bcH" style="background:#222;color:#eee;border:1px solid #555;border-radius:5px;padding:5px"><option value="1">1 hour</option><option value="6">6 hours</option><option value="24" selected>1 day</option><option value="72">3 days</option><option value="168">1 week</option><option value="0">until I stop it</option></select></p>'
 +'<p style="margin:12px 0 4px"><b>Preview</b> <span class="dim">(what players see)</span></p><div id="bcPrev"></div>'
 +'<p style="margin:10px 0 2px"><label style="cursor:pointer"><input type="checkbox" id="bcZip"> <b>Only copies installed from GitHub</b> <span class="dim">(not the Chrome Web Store, which updates by itself: use this for update reminders)</span></label></p>'
 +'<p style="margin:12px 0 2px"><button id="bcGo" style="font-size:15px;padding:6px 14px">📢 Send to everyone now</button> <button id="bcClear" class="r">Stop showing it</button> <span class="dim">'+(d.bcast?'Showing now: <b>'+esc(d.bcast.title||'(no title)')+'</b>, sent '+esc(when(d.bcast.at))+(d.bcast.until?', until '+esc(when(d.bcast.until)):', until you stop it'):'Nothing is showing right now.')+'</span></p></div>';
h+='<h2>Forum</h2><p><button id="relPost">Post the newest release on the forum now</button> <b id="relMsg"></b> <span class="dim">ColorLab replies on the Color Lab thread with its notes, and the first post gets the new version, SHA-256 and what is new. New releases do this by themselves: this is only for one published before.</span></p>';
h+='<h2>Message for players still on v1.3</h2><p class="dim">Shown to older copies: inside the Please update pop-up of v1.3 (every visit, while MIN_VERSION is above their version) and at the top of the new-version pop-up. Leave it empty for none.'+(d.announce?' Last saved '+esc(when(d.announce.at))+'.':'')+'</p><textarea id="ann" rows="3" style="width:100%;max-width:760px;background:#222;color:#eee;border:1px solid #555;border-radius:5px;padding:6px">'+esc(d.announce?d.announce.text:'')+'</textarea><p><button id="annSave">Save message</button> <button id="annClear" class="r">Clear</button></p>';
h+='<h2>Most changed looks (last 30 days)</h2><p class="dim">How often each tank&#39;s shared look was changed, from how many copies of Color Lab and which countries.</p><div class="wrap"><table><tr><th>Player ID</th><th>Name</th><th>Today</th><th>7 days</th><th>30 days</th><th>Copies</th><th>Countries</th><th>Last change</th></tr>'+(d.lookTop||[]).map(r=>'<tr><td><code>'+esc(r.pid)+'</code></td><td>'+nameCell(r)+'</td><td>'+r.d1+'</td><td>'+r.d7+'</td><td>'+r.d30+'</td><td'+(r.copies>1?' class="bad"':'')+'>'+r.copies+'</td><td>'+esc(r.ccs||'')+'</td><td class="dim">'+when(r.last)+'</td></tr>').join('')+'</table></div>';
h+='<h2>Latest look changes</h2><p class="dim">Newest first: when, which tank, what changed, from which copy of Color Lab and which country.</p><div class="wrap" style="max-height:420px;overflow:auto"><table><tr><th>When</th><th>Player ID</th><th>Name</th><th>What changed</th><th>Copy</th><th>Country</th></tr>'+(d.lookLog||[]).map(r=>'<tr><td class="dim">'+when(r.at)+'</td><td><code>'+esc(r.pid)+'</code></td><td>'+nameCell(r)+'</td><td>'+esc(r.changed)+'</td><td><code>'+esc((r.kh||'').slice(0,10))+'</code></td><td>'+esc(r.cc||'')+'</td></tr>').join('')+'</table></div>';
{const cnt=f=>onl.filter(f).length;h+='<div class="tiles" style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0">'+[['🟢 Online',cnt(p=>!p.away&&!p.idle&&!p.off)],['🎮 In a game',cnt(p=>p.wh==='game')],['⏳ In a queue',cnt(p=>p.wh==='queue')],['🟡 Idle',cnt(p=>p.idle&&!p.away)],['🔵 Away',cnt(p=>p.away)],['👻 Invisible',cnt(p=>p.inv)]].map(x=>'<div style="background:#1d2733;border:1px solid #2c3a4a;border-radius:8px;padding:6px 10px"><b style="font-size:18px">'+x[1]+'</b><br><span class="dim">'+x[0]+'</span></div>').join('')+'</div>';}
h+='<h2>Online now ('+onl.length+')</h2><p class="dim">Copies of Color Lab with TankTrouble open in the last 7 minutes. Away = in the lobby with the tab in the background (other players see them as offline). Idle = no input for 5 minutes (still online for others). Last 30 days by version: '+(Object.keys(vers).map(v=>'v'+esc(v)+': '+vers[v]).join(' · ')||'none')+'</p><div class="wrap"><table>'+phead+onl.map(prow).join('')+'</table></div>';
h+='<h2>Offline (last 30 days, '+off.length+')</h2><div class="wrap"><table>'+phead+off.map(prow).join('')+'</table></div>';
h+='<h2>Latest events</h2><div class="wrap"><table>'+d.events.map(e=>'<tr><td class="dim">'+when(e.at)+'</td><td>'+esc(e.kind)+'</td><td>'+esc(e.detail)+'</td></tr>').join('')+'</table></div>';
h+='<h2>On hold (check these)</h2><p class="dim">Copies the server stopped for going after other players&#39; tanks. They are cut off from the server (they can&#39;t see, save, prove or report anything) and their looks are hidden until you release or ban them.</p><div class="wrap"><table><tr><th>Copy</th><th>Why</th><th>Its tanks</th><th>When</th><th></th></tr>'+(d.held||[]).map(h=>'<tr><td><code>'+esc(h.grp.slice(0,12))+'</code></td><td>'+esc(h.why)+'</td><td>'+esc(h.who||'none')+'</td><td class="dim">'+when(h.at)+'</td><td>'+btn('release','Release',{hash:h.grp})+btn('banheld','Ban',{hash:h.grp},1)+'</td></tr>').join('')+'</table></div>';
h+='<h2>Reported looks (last 7 days)</h2><div class="wrap"><table><tr><th>Player ID</th><th>Name</th><th>People</th><th>Reported by</th><th>Last</th><th></th></tr>'+d.reports.map(r=>'<tr><td><code>'+esc(r.pid)+'</code></td><td>'+nameCell(r)+'</td><td>'+r.people+'</td><td>'+(r.by?esc(r.by):'<span class="dim">not known (reported before this was added)</span>')+'</td><td class="dim">'+when(r.last)+'</td><td>'+btn('clearreports','Dismiss',r)+btn('ban','Ban sharer',r,1)+'</td></tr>').join('')+'</table></div>';
h+='<h2>Hidden after reports</h2><div class="wrap"><table>'+d.hidden.map(r=>'<tr><td><code>'+esc(r.pid)+'</code></td><td><code>'+esc(r.keyhash.slice(0,12))+'</code></td><td class="dim">'+when(r.at)+'</td><td>'+btn('unhide','Allow again',r)+btn('ban','Ban sharer',{hash:r.keyhash},1)+'</td></tr>').join('')+'</table></div>';
h+='<h2>Copies of Color Lab and the tanks they share</h2><p class="dim">Each copy is one install of Color Lab; its tanks are the accounts logged in on it. Guests only use Color Lab on their own screen, and new accounts wait a day before they can share.</p><div class="wrap"><table><tr><th>Copy</th><th>Tanks</th><th>Accounts</th><th>Last</th><th></th></tr>'+d.owners.map(o=>{const tr=d.trusted.includes(o.keyhash);return '<tr><td><code>'+esc(o.keyhash.slice(0,12))+'</code>'+(tr?' (trusted)':'')+(d.banned.some(x=>x.hash===o.keyhash)?' <b style="color:#e55">(BANNED)</b>':'')+'</td><td>'+o.tanks+'</td><td>'+esc(o.who||'')+'</td><td class="dim">'+when(o.last)+'</td><td>'+(tr?btn('untrust','Untrust',{hash:o.keyhash}):btn('trust','Trust',{hash:o.keyhash}))+btn('ban','Ban',{hash:o.keyhash},1)+'</td></tr>'}).join('')+'</table></div>';
h+='<h2>Latest shared looks</h2><div class="wrap"><table><tr><th>Player ID</th><th>Name</th><th>Copy</th><th>Proven</th><th>Updated</th><th>Look</th><th></th></tr>'+d.looks.map(l=>'<tr><td><code>'+esc(l.pid)+'</code></td><td>'+nameCell(l)+'</td><td><code>'+esc(l.keyhash.slice(0,12))+'</code></td><td>'+(l.verified?'yes':'')+'</td><td class="dim">'+when(l.updated)+'</td><td><code>'+esc(String(l.look).slice(0,140))+'</code></td><td>'+btn('delete','Delete',l)+btn('ban','Ban sharer',l,1)+(l.verified?btn('unverify','Unprove',l):'')+'</td></tr>').join('')+'</table></div>';
{const u=d.users141||{list:[]},ul=u.list||[],ug=ul.filter(r=>!r.guest).length;h+='<h2>Players on v1.4.1 or newer ('+ul.length+')</h2><p class="dim">Every account seen on a copy running v1.4.1 or newer: '+ug+' accounts and '+(ul.length-ug)+' guests, on '+(u.copies||0)+' copies. Newest first. (Kept as long as their copy is: up to 60 days after it was last seen.)</p><div class="wrap"><table><tr><th>Name</th><th>Player ID</th><th>Version</th><th>First seen</th><th>Last seen</th><th>Copies</th></tr>'+ul.map(r=>'<tr><td>'+(r.name?esc(r.name):'<span class="dim">unknown</span>')+(r.guest?' <span class="dim">(guest)</span>':'')+'</td><td><code>'+esc(r.pid)+'</code></td><td>'+esc(r.ver||'?')+'</td><td class="dim">'+when(r.first)+'</td><td class="dim">'+when(r.last)+'</td><td>'+r.copies+'</td></tr>').join('')+'</table></div>';}
h+='<h2>Removed by the daily sweep (last 90 days)</h2><p class="dim">Guest looks (guests only use Color Lab on their own screen) and accounts TankTrouble has banned. Names are kept here even after a guest is gone.</p><div class="wrap"><table><tr><th>When</th><th>Name</th><th>Player ID</th><th>Why</th></tr>'+(d.swept||[]).map(r=>'<tr><td class="dim">'+when(r.at)+'</td><td>'+(r.name?esc(r.name):'<span class="dim">unknown</span>')+(r.guest?' <span class="dim">(guest)</span>':'')+'</td><td><code>'+esc(r.pid)+'</code></td><td>'+esc(r.why)+'</td></tr>').join('')+'</table></div>';
h+='<h2>Banned ('+d.banned.length+')</h2><p class="dim">Newest first. A copy is one install of Color Lab; a connection is a network address (kept only as a scrambled code). A banned copy cannot share looks at all; a banned connection cannot start new proofs.</p><div class="wrap"><table><tr><th>When</th><th>Type</th><th>Accounts on it</th><th>Code</th><th></th></tr>'+d.banned.map(b=>'<tr><td class="dim">'+(b.at?when(b.at):'earlier (no time kept)')+'</td><td>'+esc(b.kind||'')+'</td><td>'+esc(b.who||'')+'</td><td><code>'+esc(b.hash.slice(0,12))+'</code></td><td>'+btn('unban','Unban',{hash:b.hash})+'</td></tr>').join('')+'</table></div>';$('out').innerHTML=h;bcPrev()}
if(T)load();
</script></body></html>`;
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign(
      {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store",
      },
      CORS,
      extra,
    ),
  }); // (answers are data, never a page: no sniffing, no caching unless a route says so)
const PID = /^\d{1,12}$/,
  KEY = /^[0-9a-f]{64}$/;
const COLOUR = /^(0x[0-9a-fA-F]{6}|p:[\w-]{1,48})$/,
  ACC = /^[\w:.-]{1,64}$/,
  BULLET = /^(turret|0x[0-9a-fA-F]{6}|p:[\w-]{1,48})$/;

// The browser and system a request came from, by name only (Brave says it's Chrome)
function getDevice(req) {
  const ua = String(req.headers.get("User-Agent") || "");
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Vivaldi/.test(ua)
        ? "Vivaldi"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : "an unknown browser";
  const system = /Windows/.test(ua)
    ? "Windows"
    : /CrOS/.test(ua)
      ? "ChromeOS"
      : /Mac OS X|Macintosh/.test(ua)
        ? "Mac"
        : /Android/.test(ua)
          ? "Android"
          : /Linux/.test(ua)
            ? "Linux"
            : "an unknown system";
  return browser + " on " + system;
}
async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
// Only a tank look gets through: three paint values, accessory slots and the in-maze switches. Anything else is left out.
function cleanLook(l) {
  if (!l || typeof l !== "object") {
    return null;
  }
  const out = {};
  for (const part of ["turret", "base", "treads"]) {
    const v = l[part];
    if (v == null) {
      continue;
    }
    if (typeof v === "string" && COLOUR.test(v)) {
      out[part] = v;
    }
  } // (a value this server doesn't know is left out)
  if (l.acc != null) {
    if (typeof l.acc !== "object") {
      return null;
    }
    const a = {};
    for (const slot of ["turret", "barrel", "front", "back", "tread", "background"]) {
      const v = l.acc[slot];
      if (v == null) {
        continue;
      }
      const s = String(v);
      if (ACC.test(s)) {
        a[slot] = s;
      }
    }
    if (Object.keys(a).length) {
      out.acc = a;
    }
  }
  if (l.maze != null) {
    if (typeof l.maze !== "object") {
      return null;
    }
    const m = {};
    for (const part of ["turret", "base", "treads"]) {
      if (typeof l.maze[part] === "boolean") {
        m[part] = l.maze[part];
      }
    }
    if (Object.keys(m).length) {
      out.maze = m;
    }
  }
  if (typeof l.bullet === "string" && BULLET.test(l.bullet)) {
    out.bullet = l.bullet;
  } // the bullets they chose
  if (l.fb != null && typeof l.fb === "object") {
    const f = {};
    for (const part of ["turret", "base", "treads"]) {
      if (typeof l.fb[part] === "string" && /^0x[0-9a-fA-F]{6}$/.test(l.fb[part])) {
        f[part] = l.fb[part];
      }
    }
    if (Object.keys(f).length) {
      out.fb = f;
    }
  } // each pattern's main colour, for older copies
  return Object.keys(out).length ? out : null;
}

import { DurableObject } from "cloudflare:workers";

// One hub holds every live connection. It sleeps between messages (hibernation), so idle connections cost nothing.
export class LookHub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }
  async fetch(req) {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ ids: [] });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  async webSocketMessage(ws, msg) {
    let m;
    try {
      m = JSON.parse(typeof msg === "string" ? msg : new TextDecoder().decode(msg));
    } catch {
      return;
    }
    if (m && Array.isArray(m.watch)) {
      ws.serializeAttachment({ ids: [...new Set(m.watch.map(String).filter((x) => PID.test(x)))].slice(0, MAX_WATCH) });
    }
  }
  async webSocketClose(ws) {
    try {
      ws.close();
    } catch {}
  }
  async announce(ann) {
    // an announcement from the owner: sent down every open connection at once
    const out = JSON.stringify({ ann });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(out);
      } catch {}
    }
  }
  async notify(pid, look, updated) {
    // a look was saved: send it to everyone watching that tank
    const out = JSON.stringify({ pid, look, updated });
    for (const ws of this.ctx.getWebSockets()) {
      let a = null;
      try {
        a = ws.deserializeAttachment();
      } catch {}
      if (a && a.ids && a.ids.includes(pid)) {
        try {
          ws.send(out);
        } catch {}
      }
    }
  }
}
const hub = (env) => env.HUB.get(env.HUB.idFromName("hub"));

// The newest release on GitHub, asked for at most once an hour (kept in Cloudflare's cache), so every Color Lab
// can check for updates without each one hitting GitHub (or needing permission to talk to it).
const RELEASES = "https://api.github.com/repos/wazzey/tanktrouble-color-lab/releases/latest";
// GitHub webhook (your Color Lab repo > Settings > Webhooks, "Releases" events, secret = GITHUB_WEBHOOK_SECRET): when a release is
// published, the update check knows at once and #logs is told. Signed by GitHub, so nobody else can fake a release.
async function githubRelease(env, req, ctx) {
  const secret = String(env.GITHUB_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    return json({ error: "no GITHUB_WEBHOOK_SECRET set" }, 503);
  }
  const raw = await req.text();
  if (raw.length > 200000) {
    return json({ error: "too big" }, 413);
  }
  const sig = String(req.headers.get("x-hub-signature-256") || "");
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac =
    "sha256=" +
    [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(raw)))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  let diff = mac.length ^ sig.length;
  for (let i = 0; i < mac.length; i++) {
    diff |= mac.charCodeAt(i) ^ (sig.charCodeAt(i) || 0);
  }
  if (diff) {
    return json({ error: "bad signature" }, 401);
  }
  const ev = req.headers.get("x-github-event");
  if (ev === "ping") {
    ctx.waitUntil(alert(env, "github", "GitHub webhook connected: releases will reach the server"));
    return json({ ok: true, pong: true });
  } // (a test from GitHub: a note in #logs so you can see it worked)
  let b;
  try {
    b = JSON.parse(raw);
  } catch {
    return json({ error: "bad json" }, 400);
  }
  if (ev !== "release" || !b.release) {
    return json({ ok: true, ignored: true });
  }
  const r = b.release;
  await ensureTables(env);
  if (!String(r.body || "").trim() && r.tag_name) {
    // (the release build attaches its notes a moment after GitHub announces the release: read them back from GitHub)
    for (let i = 0; i < 2 && !String(r.body || "").trim(); i++) {
      await new Promise((ok) => setTimeout(ok, 3000));
      try {
        const g = await fetch(
          "https://api.github.com/repos/wazzey/tanktrouble-color-lab/releases/tags/" + encodeURIComponent(r.tag_name),
          { headers: { "User-Agent": "ttcl-share", Accept: "application/vnd.github+json" } },
        );
        if (g.ok) {
          const j = await g.json();
          if (j && j.body) {
            Object.assign(r, { body: j.body, name: j.name || r.name });
          }
        }
      } catch {}
    }
  }
  let newest = null;
  try {
    newest = await env.DB.prepare("SELECT tag FROM release WHERE id = 1").first();
  } catch {}
  if (
    (b.action === "published" || b.action === "released" || b.action === "edited") &&
    newest &&
    newest.tag &&
    verAbove(newest.tag, r.tag_name)
  ) {
    return json({ ok: true, ignored: "older than " + newest.tag });
  } // (an older release edited, e.g. marked as superseded: the newest one stays the newest, and nothing is posted)
  if ((b.action === "published" || b.action === "released" || b.action === "edited") && !r.draft && !r.prerelease) {
    const body = JSON.stringify({
      tag: r.tag_name || null,
      name: r.name || "",
      notes: String(r.body || "").slice(0, 6000),
      url: r.html_url || "https://github.com/wazzey/tanktrouble-color-lab/releases",
      published: r.published_at || null,
    });
    await env.DB.prepare("INSERT OR REPLACE INTO release (id, tag, body, at) VALUES (1, ?, ?, ?)")
      .bind(String(r.tag_name), body, Date.now())
      .run();
    if (b.action !== "edited" && env.HUB) {
      ctx.waitUntil(
        hub(env)
          .announce({
            id: "release-" + r.tag_name,
            kind: "update",
            tag: String(r.tag_name),
            title: "Color Lab " + String(r.tag_name) + " is out ✨",
            body: popupNotes(String(r.body || ""))
              .replace(/\n+\*\*How to update[\s\S]*$/i, "")
              .slice(0, 2500),
            link: r.html_url || "https://github.com/wazzey/tanktrouble-color-lab/releases",
            linkText: "⬇ Get the update",
          })
          .catch(() => {}),
      );
    } // (copies with TankTrouble open hear about it at once, in the corner)
    if (b.action !== "edited") {
      ctx.waitUntil(releaseForumPost(env, r).then(() => releaseThreadEdit(env, r)));
    } // (a new release only: one reply on the forum thread, once per version. Editing a release never posts)
    if (b.action !== "edited") {
      ctx.waitUntil(
        alert(
          env,
          "release",
          "Color Lab " +
            r.tag_name +
            " was published on GitHub. Players get the update pop-up now. " +
            (r.html_url || "") +
            (env.MIN_VERSION && verAbove(r.tag_name, env.MIN_VERSION)
              ? " (MIN_VERSION is still " + env.MIN_VERSION + ": raise it when you want older versions cut off)"
              : ""),
        ),
      );
    }
  } else if (b.action === "deleted" || b.action === "unpublished") {
    // (a release taken down: the update check goes back to asking GitHub)
    await env.DB.prepare("DELETE FROM release WHERE id = 1 AND tag = ?").bind(String(r.tag_name)).run();
  }
  return json({ ok: true });
}
const verNum = (x) =>
  String(x || "")
    .replace(/^v/i, "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
const verAbove = (a, b) => {
  const x = verNum(a),
    y = verNum(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) {
      return (x[i] || 0) > (y[i] || 0);
    }
  }
  return false;
};
// The update pop-up in v1.3/v1.4 lays each list line out as a row (icon, then text), so bold or code at the start of a line
// gets squeezed into a one-letter-wide column. List lines are sent as plain text (the release page on GitHub keeps its formatting).
function popupNotes(n) {
  return String(n || "")
    .split(/\r?\n/)
    .map((l) =>
      /^\s*[-*] /.test(l)
        ? l
            .replace(/\*\*(.+?)\*\*/g, "$1")
            .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\w)/g, "$1$2")
            .replace(/`([^`]+)`/g, "$1")
        : l,
    )
    .join("\n");
}
let annCache = null; // (the owner's message, kept for 30 seconds in this server copy)
let bcastCache = null; // (the live announcement, kept for 20 seconds in this server copy)
async function latestRelease(env, ctx) {
  // the release GitHub told us about (the webhook) wins unless GitHub has a newer one, so the update pop-up shows at once with its notes
  let told = null;
  try {
    await ensureTables(env);
    const r = await env.DB.prepare("SELECT tag, body FROM release WHERE id = 1").first();
    if (r) {
      told = r;
    }
  } catch {}
  const cache = caches.default,
    key = new Request("https://ttcl-share.cache/v1/latest");
  const hit = await cache.match(key);
  if (hit) {
    const body = await hit.text();
    let tag = null;
    try {
      tag = JSON.parse(body).tag;
    } catch {}
    return new Response(told && !verAbove(tag, told.tag) ? told.body : body, {
      headers: Object.assign({ "Content-Type": "application/json" }, CORS),
    });
  }
  let out = { tag: null };
  try {
    const r = await fetch(RELEASES, { headers: { "User-Agent": "ttcl-share", Accept: "application/vnd.github+json" } });
    if (r.ok) {
      const j = await r.json();
      out = {
        tag: j.tag_name || null,
        name: j.name || "",
        notes: String(j.body || "").slice(0, 6000),
        url: j.html_url || "https://github.com/wazzey/tanktrouble-color-lab/releases",
        published: j.published_at || null,
      };
    }
  } catch {}
  if (!out.tag) {
    try {
      // (GitHub's API sometimes turns Cloudflare away: the release page's redirect still names the newest version)
      const r = await fetch("https://github.com/wazzey/tanktrouble-color-lab/releases/latest", {
        redirect: "manual",
        headers: { "User-Agent": "ttcl-share" },
      });
      const m = String(r.headers.get("location") || "").match(/\/releases\/tag\/([^/?#]+)/);
      if (m) {
        out = {
          tag: decodeURIComponent(m[1]),
          name: "",
          notes: "",
          url: "https://github.com/wazzey/tanktrouble-color-lab/releases/tag/" + m[1],
          published: null,
        };
      }
    } catch {}
  }
  if (told && !verAbove(out.tag, told.tag)) {
    return new Response(told.body, { headers: Object.assign({ "Content-Type": "application/json" }, CORS) });
  }
  const body = JSON.stringify(out);
  if (out.tag) {
    ctx.waitUntil(
      cache.put(
        key,
        new Response(body, {
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
        }),
      ),
    );
  }
  return new Response(body, { headers: Object.assign({ "Content-Type": "application/json" }, CORS) });
}

// Requests per connection, per minute (Cloudflare's rate limiting; skipped if the bindings aren't set up in wrangler.toml)
// A connection that keeps flooding past those limits is shut out for 45 to 90 minutes, and you get one alert.
const FLOOD_HITS = 60,
  floodHits = new Map();
const SAVES_A_MINUTE = 12,
  SPAM_10_MIN = 60,
  saves = new Map(); // look changes a copy can save a minute (fine for the 🎲 randomiser), and how many in 10 minutes counts as spam (alert) // (refused requests per connection, counted in this server copy's memory)
async function slowDown(env, req, kind, ctx) {
  const rl = kind === "read" ? env.RL_READ : env.RL_WRITE;
  if (!rl) {
    return false;
  }
  const ip = req.headers.get("CF-Connecting-IP") || "";
  let over = false;
  try {
    const { success } = await rl.limit({ key: kind + ":" + ip });
    over = !success;
  } catch {}
  if (over && ctx) {
    const now = Date.now(),
      h = floodHits.get(ip) || { n: 0, at: now };
    if (now - h.at > 60000) {
      h.n = 0;
      h.at = now;
    }
    h.n++;
    floodHits.set(ip, h);
    if (h.n === FLOOD_HITS) {
      ctx.waitUntil(
        (async () => {
          await ensureTables(env);
          const code = await ipPerm(env, req);
          const mins = 45 + Math.floor(Math.random() * 46); // (a random 45-90 minutes, so a flood can't be timed to the second)
          await env.DB.prepare("INSERT OR REPLACE INTO blocked (hash, until) VALUES (?, ?)")
            .bind(code, now + mins * 60000)
            .run();
          const who = await namesOnConnection(env, await ipHash(env, req));
          await alert(
            env,
            "flood",
            "A connection (" +
              code.slice(0, 10) +
              ") was flooding the server and is shut out for " +
              mins +
              " minutes. Accounts seen on it today: " +
              (who || "none that share a look"),
          );
        })().catch(() => {}),
      );
    }
  }
  return over;
}
async function cutOff(env, req) {
  // this connection is on hold (or banned): it gets nothing from look sharing
  try {
    await ensureTables(env);
    const a = await ipHash(env, req),
      b = await ipPerm(env, req);
    return !!(await env.DB.prepare(
      "SELECT 1 FROM quarantine WHERE hash IN (?, ?) UNION SELECT 1 FROM banned WHERE hash IN (?, ?)",
    )
      .bind(a, b, a, b)
      .first());
  } catch {
    return false;
  }
}
async function isBlocked(env, req) {
  // (shut out for flooding: checked before anything else, one quick read)
  try {
    await ensureTables(env);
    const r = await env.DB.prepare("SELECT until FROM blocked WHERE hash = ?")
      .bind(await ipPerm(env, req))
      .first();
    return !!(r && r.until > Date.now());
  } catch {
    return false;
  }
}
export default {
  // (the daily tidy-up also removes any guest looks: guests' looks are never shared)
  async scheduled(ev, env, ctx) {
    // every day: in proven-only mode, looks nobody proved are deleted, and old notes are tidied away
    await ensureTables(env);
    const now = Date.now();
    if (ev.cron !== "17 4 * * *") {
      await forumCommand(env); // (sets up /forum in Discord the first time, then every couple of days)
      await forumWatch(env);
      await new Promise((r) => setTimeout(r, 30000));
      return forumWatch(env);
    } // (every minute: only the forum watch, checked twice - at the start and half a minute later)
    if (env.PROVEN_ONLY === "1") {
      const un =
        "SELECT pid FROM looks WHERE pid NOT IN (SELECT l.pid FROM looks l JOIN verified v ON v.pid = l.pid AND v.keyhash = l.keyhash)";
      const w = await env.DB.prepare(
        "SELECT group_concat(COALESCE(n.name || CASE WHEN n.guest = 1 THEN ' (guest)' ELSE '' END, u.pid), ', ') AS w FROM (" +
          un +
          ") u LEFT JOIN names n ON n.pid = u.pid",
      ).first();
      const r = await env.DB.prepare("DELETE FROM looks WHERE pid IN (" + un + ")").run();
      const n = (r && r.meta && r.meta.changes) || 0;
      if (n) {
        await alert(
          env,
          "sweep",
          n + " unproven look" + (n === 1 ? "" : "s") + " removed: " + String((w && w.w) || "").slice(0, 400),
        );
      }
    }
    // guests' looks: noted by name (for the admin page), then removed
    const gl =
      (await env.DB.prepare("SELECT l.pid, n.name FROM looks l JOIN names n ON n.pid = l.pid WHERE n.guest = 1").all())
        .results || [];
    if (gl.length) {
      await env.DB.batch(
        gl
          .map((g) =>
            env.DB.prepare("INSERT INTO swept (pid, name, guest, why, at) VALUES (?, ?, 1, ?, ?)").bind(
              String(g.pid),
              g.name,
              "guest look removed",
              now,
            ),
          )
          .concat([env.DB.prepare("DELETE FROM looks WHERE pid IN (SELECT pid FROM names WHERE guest = 1)")]),
      );
    }
    // proven tanks whose account TankTrouble has since banned: their looks come down (a few each day, the longest-unchecked first)
    const pv =
      (
        await env.DB.prepare(
          "SELECT v.pid FROM verified v LEFT JOIN names n ON n.pid = v.pid ORDER BY COALESCE(n.at, 0) LIMIT 25",
        ).all()
      ).results || [];
    const out = [];
    for (const r of pv) {
      const d = await ttDetails(r.pid);
      if (!d) {
        continue;
      }
      await rememberName(env, r.pid, d);
      if (d.banned) {
        out.push((d.username || r.pid) + " (" + r.pid + ")");
        await env.DB.batch([
          env.DB.prepare("DELETE FROM looks WHERE pid = ?").bind(String(r.pid)),
          env.DB.prepare("DELETE FROM verified WHERE pid = ?").bind(String(r.pid)),
          env.DB.prepare("INSERT INTO swept (pid, name, guest, why, at) VALUES (?, ?, ?, ?, ?)").bind(
            String(r.pid),
            d.username || null,
            d.guest ? 1 : 0,
            "banned on TankTrouble",
            now,
          ),
        ]);
        if (env.HUB) {
          ctx.waitUntil(
            hub(env)
              .notify(String(r.pid), null, now)
              .catch(() => {}),
          );
        }
      }
    }
    // the day in one quiet message
    try {
      const c = async (sql, ...b) =>
          (
            (await env.DB.prepare(sql)
              .bind(...b)
              .first()) || {}
          ).n || 0,
        since = now - DAY;
      const eventCounts =
        (await env.DB.prepare("SELECT kind, COUNT(*) AS n FROM events WHERE at > ? GROUP BY kind").bind(since).all())
          .results || [];
      await alert(
        env,
        "daily summary",
        [
          "new copies: " + (await c("SELECT COUNT(DISTINCT kh) AS n FROM copies WHERE at > ?", since)),
          "newly proven tanks: " + (await c("SELECT COUNT(*) AS n FROM verified WHERE at > ?", since)),
          "shared looks: " +
            (await c("SELECT COUNT(*) AS n FROM looks")) +
            " (" +
            (await c("SELECT COUNT(*) AS n FROM looks WHERE updated > ?", since)) +
            " changed today)",
          "copies put on hold: " + (await c("SELECT COUNT(DISTINCT grp) AS n FROM quarantine WHERE at > ?", since)),
          "messages: " + (await c("SELECT COUNT(*) AS n FROM feedback WHERE at > ?", since)),
          "removed by the sweep: " +
            (gl.length
              ? gl.length +
                " guest look" +
                (gl.length === 1 ? "" : "s") +
                " (" +
                gl
                  .map((g) => g.name || g.pid)
                  .slice(0, 10)
                  .join(", ") +
                ")"
              : "no guest looks") +
            (out.length ? "; banned accounts: " + out.join(", ") : ""),
          "events: " + (eventCounts.length ? eventCounts.map((e) => e.kind + " " + e.n).join(", ") : "none"),
        ].join(" · "),
      );
    } catch {}
    await env.DB.batch([
      env.DB.prepare("DELETE FROM alerted WHERE at < ?").bind(now - 2 * DAY),
      env.DB.prepare("DELETE FROM copies WHERE at < ?").bind(now - 7 * DAY),
      env.DB.prepare("DELETE FROM presence WHERE last < ?").bind(now - 60 * DAY),
      env.DB.prepare("DELETE FROM seen_accts WHERE last < ?").bind(now - 60 * DAY),
      env.DB.prepare("DELETE FROM logged WHERE at < ?").bind(now - 30 * DAY),
      env.DB.prepare("DELETE FROM swept WHERE at < ?").bind(now - 90 * DAY),
      env.DB.prepare("DELETE FROM saves WHERE at < ?").bind(now - 365 * DAY), // (a year without a single change)
      env.DB.prepare("DELETE FROM save_hist WHERE at < ? OR pid NOT IN (SELECT pid FROM saves)").bind(now - 30 * DAY),
      env.DB.prepare(
        "DELETE FROM names WHERE at < ? AND pid NOT IN (SELECT pid FROM looks) AND pid NOT IN (SELECT pid FROM verified) AND pid NOT IN (SELECT pid FROM swept) AND pid NOT IN (SELECT pid FROM reports)",
      ).bind(now - 180 * DAY),
    ]); // (names not seen for six months and not needed for anything)
    await env.DB.batch([
      env.DB.prepare("DELETE FROM looks WHERE pid IN (SELECT pid FROM names WHERE guest = 1)"),
      env.DB.prepare("DELETE FROM claims WHERE at < ?").bind(now - DAY),
      env.DB.prepare("DELETE FROM proofs WHERE at < ?").bind(now - DAY),
      env.DB.prepare("DELETE FROM blocked WHERE until < ?").bind(now),
      env.DB.prepare("DELETE FROM reports WHERE at < ?").bind(now - 30 * DAY),
    ]);
  },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    // Old copies: with MIN_VERSION set (under [vars] in wrangler.toml), copies older than it can't use look sharing at all
    // (they still get the update check, so they're told about the new version). Copies send their version with every request.
    if (
      env.MIN_VERSION &&
      (url.pathname.startsWith("/v1/looks") ||
        url.pathname === "/v1/live" ||
        url.pathname.startsWith("/v1/verify") ||
        url.pathname === "/v1/report" ||
        url.pathname === "/v1/account" ||
        url.pathname.startsWith("/v1/feedback"))
    ) {
      const v = req.headers.get("x-ttcl-version") || url.searchParams.get("v") || "0",
        num = (x) =>
          String(x)
            .split(".")
            .map((n) => parseInt(n, 10) || 0);
      const a = num(v),
        b = num(env.MIN_VERSION);
      let older = false;
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if ((a[i] || 0) !== (b[i] || 0)) {
          older = (a[i] || 0) < (b[i] || 0);
          break;
        }
      }
      if (older) {
        // still noted on the admin page (its version and, from v1.4.1, the accounts it's on), though it only gets this answer
        if (req.method === "POST" || req.method === "PUT") {
          try {
            const sent = JSON.parse((await req.text()).slice(0, 500));
            if (sent && typeof sent.key === "string" && KEY.test(sent.key)) {
              await ensureTables(env);
              await touchPresence(env, await sha256(sent.key), req, sent.pids);
            }
          } catch {}
        }
        // v1.3's "Please update" pop-up shows this "min" text inside "(v... or newer is needed)", so the owner's message rides along in it
        let an = annCache && Date.now() - annCache.at < 30000 ? annCache.text : null;
        if (!annCache || Date.now() - annCache.at >= 30000) {
          try {
            await ensureTables(env);
            const r = await env.DB.prepare("SELECT text FROM announce WHERE id = 1").first();
            an = r && r.text ? String(r.text).replace(/\s+/g, " ").trim().slice(0, 400) : "";
          } catch {
            an = "";
          }
          annCache = { at: Date.now(), text: an };
        }
        return json(
          {
            error: "please update Color Lab",
            min: an ? env.MIN_VERSION + " or newer is needed). 📢 " + an + " (v" + env.MIN_VERSION : env.MIN_VERSION,
          },
          426,
        );
      }
    }
    if (url.pathname.startsWith("/v1/looks") || url.pathname === "/v1/live") {
      // (the update check is cached, so it's left out)
      if (await isBlocked(env, req)) {
        return json({ error: "shut out for an hour for flooding" }, 429);
      }
      if (await cutOff(env, req)) {
        return json({ error: "on hold: the owner of Color Lab will check this copy" }, 403);
      } // (on hold or banned: disconnected from look sharing)
      if (await slowDown(env, req, req.method === "GET" && url.pathname !== "/v1/live" ? "read" : "write", ctx)) {
        return json({ error: "slow down" }, 429);
      }
    }
    if (url.pathname === "/v1/live") {
      if (req.headers.get("Upgrade") !== "websocket" || !env.HUB) {
        return json({ error: "websocket only" }, 426);
      }
      return hub(env).fetch(req);
    }
    if (url.pathname === "/v1/looks" && req.method === "GET") {
      const ids = [...new Set((url.searchParams.get("ids") || "").split(",").filter((x) => PID.test(x)))].slice(
        0,
        MAX_IDS,
      );
      if (!ids.length) {
        return json({ looks: {} });
      }
      const proven = env.PROVEN_ONLY === "1";
      await ensureTables(env);
      const held =
        "AND l.keyhash NOT IN (SELECT hash FROM quarantine) AND l.pid NOT IN (SELECT pid FROM names WHERE guest = 1)"; // (and guests' looks are never shared) // (looks of a copy on hold are hidden)
      const { results } = await env.DB.prepare(
        proven
          ? `SELECT l.pid, l.look, l.updated FROM looks l JOIN verified v ON v.pid = l.pid AND v.keyhash = l.keyhash WHERE l.pid IN (${ids.map(() => "?").join(",")}) ${held}` // (only looks their tank's owner proved)
          : `SELECT l.pid, l.look, l.updated FROM looks l WHERE l.pid IN (${ids.map(() => "?").join(",")}) ${held}`,
      )
        .bind(...ids)
        .all();
      const looks = {};
      for (const r of results) {
        try {
          looks[r.pid] = { look: JSON.parse(r.look), updated: r.updated };
        } catch {}
      }
      return json({ looks }, 200, { "Cache-Control": "public, max-age=30" });
    }
    const m = /^\/v1\/looks\/(\d{1,12})$/.exec(url.pathname);
    if (m && (req.method === "PUT" || req.method === "DELETE")) {
      const pid = m[1];
      const text = await req.text();
      if (text.length > MAX_LOOK + 200) {
        return json({ error: "too big" }, 413);
      }
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: "bad json" }, 400);
      }
      if (!body || typeof body.key !== "string" || !KEY.test(body.key)) {
        return json({ error: "bad key" }, 400);
      }
      const kh = await sha256(body.key);
      await ensureTables(env);
      const ih = await ipHash(env, req),
        ipp = await ipPerm(env, req);
      if (await env.DB.prepare("SELECT 1 FROM banned WHERE hash = ?").bind(kh).first()) {
        return json({ error: "not allowed: this copy of Color Lab is blocked" }, 403);
      }
      // a banned connection (not this copy) only stops tanks that haven't proven they're theirs: a proven owner is unaffected
      let connBan = !!(await env.DB.prepare("SELECT 1 FROM banned WHERE hash IN (?, ?)").bind(ih, ipp).first());
      if (connBan) {
        const v0 = await env.DB.prepare("SELECT keyhash FROM verified WHERE pid = ?").bind(pid).first();
        if (v0 && v0.keyhash === kh) {
          connBan = false;
        }
      }
      if (connBan) {
        return json({ error: "not allowed: this connection is blocked, prove this tank in Settings first" }, 403);
      }
      if (await onHold(env, kh, ih, ipp)) {
        return json({ error: "on hold: the owner of Color Lab will check this copy" }, 403);
      }
      await watchCopy(env, ctx, kh, ih);
      await touchPresence(env, kh, req);
      const row = await env.DB.prepare("SELECT keyhash, updated FROM looks WHERE pid = ?").bind(pid).first();
      const ver = await env.DB.prepare("SELECT keyhash FROM verified WHERE pid = ?").bind(pid).first(),
        mine = !!(ver && ver.keyhash === kh); // (a tank its owner proved is theirs)
      if (
        req.method === "PUT" &&
        (await env.DB.prepare("SELECT 1 FROM hidden WHERE pid = ? AND keyhash = ?").bind(pid, kh).first())
      ) {
        return json({ error: "hidden after reports" }, 403);
      }
      if ((row && row.keyhash !== kh && !mine) || (ver && !mine)) {
        // trying to change a tank another copy shares: noted, and a copy that does it to several tanks is banned
        const now = Date.now();
        await env.DB.prepare("INSERT INTO claims (who, pid, at) VALUES (?, ?, ?), (?, ?, ?)")
          .bind(kh, "o" + pid, now, ih, "o" + pid, now)
          .run();
        const t = await env.DB.prepare(
          "SELECT COUNT(DISTINCT pid) AS n FROM claims WHERE who IN (?, ?) AND at > ? AND pid LIKE 'o%'",
        )
          .bind(kh, ih, now - DAY)
          .first();
        if (t && t.n >= BAN_AFTER) {
          await quarantineWho(
            env,
            ctx,
            kh,
            ih,
            ipp,
            "tried to change the looks of " + t.n + " tanks other copies share",
          );
        } // (one account on two computers only ever hits its own few tanks)
        return json({ error: "this player is owned by another copy of Color Lab" }, 403);
      }
      if (req.method === "DELETE") {
        if (row) {
          await env.DB.prepare("DELETE FROM looks WHERE pid = ?").bind(pid).run();
          if (env.HUB) {
            ctx.waitUntil(
              hub(env)
                .notify(pid, null, Date.now())
                .catch(() => {}),
            );
          }
        }
        return json({ ok: true });
      }
      const look = cleanLook(body.look);
      if (!look) {
        return json({ error: "bad look" }, 400);
      }
      const s = JSON.stringify(look);
      if (s.length > MAX_LOOK) {
        return json({ error: "too big" }, 413);
      }
      const now = Date.now();
      if (row && now - row.updated < MIN_GAP_MS) {
        return json({ error: "too fast" }, 429);
      }
      {
        const c = saves.get(kh) || { m: [], warned: 0 };
        c.m = c.m.filter((t) => now - t < 600000); // look changes from this copy in the last 10 minutes
        const lastMin = c.m.filter((t) => now - t < 60000).length;
        if (lastMin >= SAVES_A_MINUTE) {
          saves.set(kh, c);
          return json({ error: "too many changes: slow down" }, 429);
        } // (the newest look goes up a minute later)
        c.m.push(now);
        saves.set(kh, c);
        if (c.m.length >= SPAM_10_MIN && now - c.warned > 3600000) {
          c.warned = now;
          ctx.waitUntil(
            (async () =>
              alert(
                env,
                "spam",
                "A copy (" +
                  kh.slice(0, 10) +
                  ") saved " +
                  c.m.length +
                  " look changes in 10 minutes, most recently on " +
                  (await tankName(env, pid)),
              ))(),
          );
        }
      }
      if (req.method === "PUT") {
        // guests use Color Lab only on their own screen (for every copy, the owner's included)
        let g = await env.DB.prepare("SELECT guest FROM names WHERE pid = ?").bind(pid).first();
        if (!g || g.guest) {
          const d0 = await ttDetails(pid);
          if (d0) {
            await rememberName(env, pid, d0);
            g = { guest: d0.guest ? 1 : 0 };
          }
        } // (asked again for a guest: once it signs up as an account, it can share)
        if (g && g.guest) {
          return json({ error: "guest tanks can't share looks: log in to share yours" }, 403);
        }
      }
      if (!mine && env.PROVEN_ONLY === "1" && req.method === "PUT") {
        const d1 = await ttDetails(pid),
          wait = tooNew(env, d1);
        if (wait) {
          return json(
            {
              error:
                "this account is too new to share looks: try again in about " +
                wait +
                " hour" +
                (wait === 1 ? "" : "s"),
            },
            403,
          );
        } // (refused, not counted against anyone)
        return json({ error: "prove this tank is yours first" }, 403);
      } // only the proven owner saves a look (refused, not banned: nothing anyone else sees changes)
      if (!row && !mine) {
        // a player ID nobody has shared yet: only a few new ones a day, per copy and per connection
        const b = await env.DB.prepare(
          "SELECT COUNT(DISTINCT pid) AS n FROM claims WHERE who IN (?, ?) AND at > ? AND pid NOT LIKE 'o%' AND pid NOT LIKE 'r%' AND pid NOT LIKE 's%' AND pid NOT LIKE 'p%'",
        )
          .bind(kh, ih, now - BURST)
          .first();
        if (b && b.n >= NEW_AT_ONCE) {
          return json({ error: "too many new tanks at once" }, 403);
        } // (adding lots of tanks in a row)
        const n = await env.DB.prepare(
          "SELECT COUNT(DISTINCT pid) AS n FROM claims WHERE who IN (?, ?) AND at > ? AND pid NOT LIKE 'o%' AND pid NOT LIKE 'r%' AND pid NOT LIKE 's%' AND pid NOT LIKE 'p%'",
        )
          .bind(kh, ih, now - DAY)
          .first();
        if (n && n.n >= NEW_PER_DAY) {
          return json({ error: "too many new tanks today" }, 403);
        } // (refused, not banned)
        // the tank must be a real, not-banned TankTrouble account at least a few hours old
        const d = await ttDetails(pid),
          refuse = async (why) => json({ error: why }, 403); // (refused, never banned for this)
        if (!d) {
          return json({ error: "TankTrouble didn't answer, try again later" }, 503);
        }
        if (d.banned) {
          return refuse("this tank can't share looks");
        }
        if (d.guest) {
          return refuse("guest tanks can't share looks: log in to share yours");
        }
        if (
          !(await isOwner(env, kh)) &&
          !(Number(d.created) > 0 && Date.now() / 1000 - Number(d.created) >= MIN_AGE_HOURS * 3600)
        ) {
          return refuse("this account is too new to share looks: try again in a few hours");
        }
        await env.DB.batch([
          env.DB.prepare("INSERT INTO claims (who, pid, at) VALUES (?, ?, ?), (?, ?, ?)").bind(
            kh,
            pid,
            now,
            ih,
            pid,
            now,
          ),
          env.DB.prepare("DELETE FROM claims WHERE at < ?").bind(now - DAY),
        ]);
      }
      await env.DB.prepare(
        "INSERT INTO looks (pid, look, keyhash, updated) VALUES (?, ?, ?, ?) ON CONFLICT(pid) DO UPDATE SET look = excluded.look, keyhash = excluded.keyhash, updated = excluded.updated",
      )
        .bind(pid, s, kh, now)
        .run();
      ctx.waitUntil(
        (async () => {
          const same = await env.DB.prepare(
            "SELECT COUNT(*) AS n, COUNT(DISTINCT keyhash) AS c FROM looks WHERE look = ? AND updated > ?",
          )
            .bind(s, now - DAY)
            .first(); // (the same look turning up on lots of tanks)
          if (same && same.n >= 8) {
            await alertOnce(
              env,
              "look:" + (await sha256(s)).slice(0, 16),
              "pattern",
              "The same look was put on " +
                same.n +
                " tanks today (from " +
                same.c +
                " cop" +
                (same.c === 1 ? "y" : "ies") +
                "), most recently " +
                (await tankName(env, pid)) +
                ". Check the admin page",
            );
          }
        })().catch(() => {}),
      );
      ctx.waitUntil(
        env.DB.batch([
          env.DB.prepare("INSERT INTO look_history (pid, kh, at, cc, look) VALUES (?, ?, ?, ?, ?)").bind(
            pid,
            kh,
            now,
            String((req.cf && req.cf.country) || "").slice(0, 2) || null,
            s.slice(0, 4000),
          ),
          env.DB.prepare("DELETE FROM look_history WHERE at < ?").bind(now - 30 * DAY),
        ]).catch(() => {}),
      ); // (when, from which copy and which country: for the admin page)
      if (env.HUB) {
        ctx.waitUntil(
          hub(env)
            .notify(pid, look, now)
            .catch(() => {}),
        );
      } // everyone watching this tank gets it straight away
      if (await nameStale(env, pid)) {
        ctx.waitUntil(rememberName(env, pid, typeof d === "object" ? d : null));
      } // (its name, for the admin page)
      return json({ ok: true, updated: now });
    }
    if (url.pathname === "/discord" && req.method === "POST") {
      return discordInteraction(env, req, ctx);
    }
    if (url.pathname === "/v1/account" && req.method === "POST") {
      if (await isBlocked(env, req)) {
        return json({ error: "shut out for an hour for flooding" }, 429);
      }
      if (await slowDown(env, req, "write", ctx)) {
        return json({ error: "slow down" }, 429);
      }
      return account(env, req, ctx);
    }
    if (url.pathname === "/v1/bye" && req.method === "POST") {
      // the last TankTrouble tab of a copy was closed: it shows as offline at once
      let b = null;
      try {
        b = JSON.parse((await req.text()).slice(0, 300));
      } catch {}
      if (!b || typeof b.key !== "string" || !KEY.test(b.key)) {
        return json({ error: "bad key" }, 400);
      }
      if (await slowDown(env, req, "read", ctx)) {
        return json({ error: "slow down" }, 429);
      }
      await ensureTables(env);
      const kh = await sha256(b.key),
        t = Date.now();
      presSeen.delete(kh);
      loggedSeen.delete(kh);
      pubOnline = { at: 0, data: null };
      await env.DB.prepare("UPDATE presence SET last = ? WHERE kh = ? AND last > ?")
        .bind(t - ONLINE_MS - 1000, kh, t - ONLINE_MS)
        .run();
      return json({ ok: true });
    }
    if (url.pathname === "/v1/fdraft" && req.method === "POST") {
      // the owner's DEV copy: a forum reply typed in Discord, to fill in the reply box
      let b = null;
      try {
        b = JSON.parse((await req.text()).slice(0, 300));
      } catch {}
      if (!b || typeof b.key !== "string" || !KEY.test(b.key) || !/^\d{1,12}$/.test(String(b.id || ""))) {
        return json({ error: "bad request" }, 400);
      }
      await ensureTables(env);
      if (!(await isOwner(env, await sha256(b.key)))) {
        return json({ error: "not allowed" }, 403);
      }
      const d = await env.DB.prepare("SELECT thread, text FROM forum_drafts WHERE id = ?").bind(Number(b.id)).first();
      return json(d ? { thread: d.thread, text: d.text } : { error: "gone" }, d ? 200 : 404);
    }
    if (url.pathname === "/v1/alerts" && req.method === "POST") {
      // the owner's copy: the latest alerts, to show inside TankTrouble too
      if (await slowDown(env, req, "read", ctx)) {
        return json({ error: "slow down" }, 429);
      }
      let b = null;
      try {
        b = JSON.parse((await req.text()).slice(0, 300));
      } catch {}
      if (!b || typeof b.key !== "string" || !KEY.test(b.key)) {
        return json({ error: "bad key" }, 400);
      }
      await ensureTables(env);
      if (!(await isOwner(env, await sha256(b.key)))) {
        return json({ error: "not allowed" }, 403);
      }
      const rows =
        (
          await env.DB.prepare(
            "SELECT at, kind, detail FROM events WHERE at > ? AND kind NOT IN ('admin', 'test', 'github', 'daily summary', 'release') ORDER BY at DESC LIMIT 60",
          )
            .bind(Date.now() - 2 * DAY)
            .all()
        ).results || [];
      return json({
        alerts: rows.map((r) => ({ at: r.at, kind: r.kind, text: r.detail, urgent: URGENT.has(r.kind) })),
      });
    }
    if (
      (url.pathname === "/v1/inbox" || url.pathname === "/v1/inbox/thread" || url.pathname === "/v1/inbox/reply") &&
      req.method === "POST"
    ) {
      if (await slowDown(env, req, url.pathname === "/v1/inbox/reply" ? "write" : "read", ctx)) {
        return json({ error: "slow down" }, 429);
      }
      return inbox(env, req, ctx, url.pathname === "/v1/inbox" ? "list" : url.pathname.slice(10));
    }
    if (url.pathname === "/v1/online" && (req.method === "GET" || req.method === "POST")) {
      // how many Color Lab copies are online; the owner's (trusted) copy also gets who
      if (await slowDown(env, req, "read", ctx)) {
        return json({ error: "slow down" }, 429);
      }
      await ensureTables(env);
      const now = Date.now();
      const c = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM presence p WHERE p.last > ? AND COALESCE(p.inv, 0) = 0 AND NOT EXISTS (SELECT 1 FROM logged l WHERE l.kh = p.kh AND (l.away = 1 OR (l.idle = 1 AND l.sat < ?)))",
      )
        .bind(now - ONLINE_MS, now - IDLE_HIDE_MS)
        .first();
      const out = { online: c ? c.n : 0 };
      if (req.method === "POST") {
        let b = null;
        try {
          b = JSON.parse((await req.text()).slice(0, 300));
        } catch {}
        if (b && typeof b.key === "string" && KEY.test(b.key)) {
          const kh = await sha256(b.key);
          await touchPresence(env, kh, req);
          if (!(await isOwner(env, kh))) {
            return json(await publicOnline(env, now));
          } // (everyone else: the shared, opted-in view)
          {
            // (the owner's copy: everything below)
            const ownC = await env.DB.prepare("SELECT COUNT(*) AS n FROM presence WHERE last > ?")
              .bind(now - ONLINE_MS)
              .first();
            out.online = ownC ? ownC.n : out.online; // (the owner counts invisible copies too)
            const rows =
              (
                await env.DB.prepare(
                  "SELECT p.kh, p.ver, p.last, p.inv, (SELECT group_concat(a.pid || '|' || COALESCE(n.guest, 0) || '|' || COALESCE(replace(n.name, ';', ''), ''), ';') FROM (SELECT pid FROM verified WHERE keyhash = p.kh UNION SELECT pid FROM looks WHERE keyhash = p.kh) a LEFT JOIN names n ON n.pid = a.pid) AS acc FROM presence p WHERE p.last > ? ORDER BY p.last DESC LIMIT 200",
                )
                  .bind(now - DAY)
                  .all()
              ).results || [];
            // the logged-in tanks each copy reported (v1.4 on), with names (asked from TankTrouble for a few unknown ones)
            const lg = {},
              sv = {},
              idl = {},
              awy = {},
              whr = {},
              sats = {};
            for (const r of (
              await env.DB.prepare(
                "SELECT kh, pids, srv, idle, away, wh, sat FROM logged WHERE kh IN (SELECT kh FROM presence WHERE last > ?)",
              )
                .bind(now - DAY)
                .all()
            ).results || []) {
              lg[r.kh] = r.pids ? r.pids.split(",") : [];
              sv[r.kh] = r.srv || null;
              idl[r.kh] = !!r.idle;
              awy[r.kh] = !!r.away;
              whr[r.kh] = r.wh || null;
              sats[r.kh] = r.sat || null;
            }
            const want = [...new Set(Object.values(lg).flat())],
              nm = {};
            if (want.length) {
              for (const r of (
                await env.DB.prepare(
                  `SELECT pid, name, guest FROM names WHERE pid IN (${want.map(() => "?").join(",")})`,
                )
                  .bind(...want)
                  .all()
              ).results || []) {
                nm[r.pid] = r;
              }
            }
            let asked = 0;
            for (const p of want) {
              if (!nm[p] && asked++ < 6) {
                const d = await rememberName(env, p);
                if (d) {
                  nm[p] = { name: d.username, guest: d.guest ? 1 : 0 };
                }
              }
            }
            out.list = rows.map((r) => ({
              srv: sv[r.kh] || null,
              idle: !!idl[r.kh],
              logged: lg[r.kh]
                ? lg[r.kh].map((p) => ({ pid: p, name: nm[p] ? nm[p].name : null, guest: !!(nm[p] && nm[p].guest) }))
                : null,
              accounts: String(r.acc || "")
                .split(";")
                .filter(Boolean)
                .map((x) => {
                  const [pid, g, ...nameParts] = x.split("|");
                  return { pid, guest: g === "1", name: nameParts.join("|") || null };
                }),
              ver: r.ver,
              on: now - r.last < ONLINE_MS,
              mins: Math.round((now - r.last) / 60000),
              mine: r.kh === kh,
              inv: !!r.inv,
              away: !!awy[r.kh],
              wh: whr[r.kh] || null,
              qmins: sats[r.kh] ? Math.max(0, Math.round((now - sats[r.kh]) / 60000)) : null,
            }));
          }
        }
      }
      return json(out);
    }
    if (url.pathname === "/github" && req.method === "POST") {
      return githubRelease(env, req, ctx);
    } // (GitHub tells the server when a release is published) // (Discord's Interactions Endpoint URL)
    if (url.pathname === "/v1/feedback" || url.pathname === "/v1/feedback/mine") {
      if (req.method !== "POST") {
        return json({ error: "post only" }, 405);
      }
      if (await isBlocked(env, req)) {
        return json({ error: "shut out for an hour for flooding" }, 429);
      }
      if (await slowDown(env, req, url.pathname === "/v1/feedback" ? "write" : "read", ctx)) {
        return json({ error: "slow down" }, 429);
      }
      return url.pathname === "/v1/feedback" ? sendFeedback(env, req, ctx) : listFeedback(env, req);
    }
    if (url.pathname === "/admin") {
      return new Response(ADMIN_PAGE, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Frame-Options": "DENY",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
          "Content-Security-Policy":
            "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        },
      });
    }
    if (url.pathname.startsWith("/v1/admin/")) {
      return adminApi(env, ctx, req, url);
    }
    if (
      (url.pathname === "/v1/verify/start" || url.pathname === "/v1/verify/check" || url.pathname === "/v1/report") &&
      req.method === "POST"
    ) {
      if (await isBlocked(env, req)) {
        return json({ error: "shut out for an hour for flooding" }, 429);
      }
      if (await cutOff(env, req)) {
        return json({ error: "on hold: the owner of Color Lab will check this copy" }, 403);
      }
      if (await slowDown(env, req, "write", ctx)) {
        return json({ error: "slow down" }, 429);
      }
      let b;
      try {
        b = JSON.parse((await req.text()).slice(0, 500));
      } catch {
        return json({ error: "bad json" }, 400);
      }
      const pid = PID.test(String((b && b.pid) || "")) ? String(b.pid) : null;
      if (!pid) {
        return json({ error: "bad pid" }, 400);
      }
      const kh = typeof b.key === "string" && KEY.test(b.key) ? await sha256(b.key) : null;
      await ensureTables(env);
      const ih = await ipHash(env, req),
        now = Date.now();
      const ipp0 = await ipPerm(env, req);
      if (kh && (await env.DB.prepare("SELECT 1 FROM banned WHERE hash = ?").bind(kh).first())) {
        return json({ error: "not allowed: this copy of Color Lab is blocked" }, 403);
      }
      if (await env.DB.prepare("SELECT 1 FROM banned WHERE hash IN (?, ?)").bind(ih, ipp0).first()) {
        return json({ error: "not allowed: this connection is blocked" }, 403);
      } // (a banned connection stays blocked from proving and the other tools)
      if (await onHold(env, kh || ih, ih, ipp0)) {
        return json({ error: "on hold: the owner of Color Lab will check this copy" }, 403);
      }
      if (kh) {
        await watchCopy(env, ctx, kh, ih);
      }
      if (url.pathname === "/v1/report") {
        // someone reports a shared look: enough different people (and it isn't a proven tank) and it's hidden
        if (!(await env.DB.prepare("SELECT 1 FROM looks WHERE pid = ?").bind(pid).first())) {
          return json({ ok: true, none: true });
        }
        const mineN = await env.DB.prepare("SELECT COUNT(*) AS n FROM reports WHERE who = ? AND at > ?")
          .bind(ih, now - DAY)
          .first();
        if (mineN && mineN.n >= 10) {
          return json({ error: "too many reports today" }, 429);
        }
        const fresh = !(await env.DB.prepare("SELECT 1 FROM reports WHERE pid = ? AND who = ? AND at > ?")
          .bind(pid, ih, now - 7 * DAY)
          .first());
        if (fresh) {
          await env.DB.prepare("INSERT INTO reports (pid, who, at, kh) VALUES (?, ?, ?, ?)")
            .bind(pid, ih, now, kh)
            .run();
        } else {
          return json({ ok: true, already: true });
        }
        if (await nameStale(env, pid)) {
          ctx.waitUntil(rememberName(env, pid));
        }
        const n =
          (
            (await env.DB.prepare("SELECT COUNT(DISTINCT who) AS n FROM reports WHERE pid = ? AND at > ?")
              .bind(pid, now - 7 * DAY)
              .first()) || {}
          ).n || 0;
        const proven = await env.DB.prepare(
          "SELECT 1 FROM verified v JOIN looks l ON l.pid = v.pid AND l.keyhash = v.keyhash WHERE v.pid = ?",
        )
          .bind(pid)
          .first();
        if (n >= Math.max(2, Number(env.REPORTS_TO_HIDE) || REPORTS_TO_HIDE) && !proven) {
          const row = await env.DB.prepare("SELECT keyhash FROM looks WHERE pid = ?").bind(pid).first();
          if (row) {
            await env.DB.batch([
              env.DB.prepare("INSERT OR REPLACE INTO hidden (pid, keyhash, at) VALUES (?, ?, ?)").bind(
                pid,
                row.keyhash,
                now,
              ),
              env.DB.prepare("DELETE FROM looks WHERE pid = ?").bind(pid),
            ]);
            if (env.HUB) {
              ctx.waitUntil(
                hub(env)
                  .notify(pid, null, now)
                  .catch(() => {}),
              );
            }
            ctx.waitUntil(
              alert(
                env,
                "hidden",
                "Look on " +
                  (await tankName(env, pid)) +
                  " hidden after " +
                  n +
                  " reports (shared by " +
                  row.keyhash.slice(0, 10) +
                  ")",
              ),
            );
          }
        } else {
          ctx.waitUntil(
            (async () =>
              alert(
                env,
                "report",
                "Look on " +
                  (await tankName(env, pid)) +
                  " was reported by " +
                  (await reporterNames(env, kh)) +
                  (n > 1 ? " (" + n + " people this week)" : "") +
                  (proven ? " (a proven tank: reports can't hide it)" : ""),
              ))(),
          );
        }
        return json({ ok: true });
      }
      if (!kh) {
        return json({ error: "bad key" }, 400);
      }
      // Proving takes two steps the server sees on TankTrouble: the tank changes to what the server asked, then back again.
      // Only someone who can change the tank (its owner) can do both inside 3 minutes; each try is kept apart per copy,
      // and a copy (or connection) can only try a few times a tank and a few tanks a day.
      if (url.pathname === "/v1/verify/start") {
        {
          const g = await ttDetails(pid);
          if (g && g.guest) {
            return json({ error: "guest" }, 403);
          }
          const w = kh && (await isOwner(env, kh)) ? 0 : tooNew(env, g);
          if (w) {
            return json({ error: "too new", hours: w }, 403);
          }
        } // (guests can't be proven: they only use Color Lab on their own screen; not counted as a try)
        const tries = await env.DB.prepare(
          "SELECT COUNT(*) AS n, COUNT(DISTINCT pid) AS t FROM claims WHERE who IN (?, ?) AND at > ? AND pid LIKE 's%'",
        )
          .bind(kh, ih, now - DAY)
          .first();
        const here = await env.DB.prepare("SELECT COUNT(*) AS n FROM claims WHERE who = ? AND pid = ? AND at > ?")
          .bind(kh, "s" + pid, now - DAY)
          .first();
        if ((here && here.n >= 6) || (tries && tries.t >= 8)) {
          return json({ error: "too many tries today" }, 429);
        }
        await env.DB.prepare("INSERT INTO claims (who, pid, at) VALUES (?, ?, ?), (?, ?, ?)")
          .bind(kh, "s" + pid, now, ih, "s" + pid, now)
          .run();
        // probing: trying to prove several tanks and never managing it (tanks that aren't yours) gets the copy and its connection banned
        const probed = await env.DB.prepare(
          "SELECT COUNT(DISTINCT pid) AS n FROM claims WHERE who IN (?, ?) AND at > ? AND pid LIKE 's%' AND substr(pid, 2) NOT IN (SELECT substr(pid, 2) FROM claims WHERE who IN (?, ?) AND pid LIKE 'p%')",
        )
          .bind(kh, ih, now - DAY, kh, ih)
          .first();
        if (probed && probed.n >= PROBE_BAN) {
          await quarantineWho(
            env,
            ctx,
            kh,
            ih,
            await ipPerm(env, req),
            "tried to prove " + probed.n + " tanks it couldn't change (probing)",
          );
          return json({ error: "on hold" }, 403);
        }
        const d = await ttDetails(pid);
        if (!d) {
          return json({ error: "TankTrouble didn't answer" }, 502);
        }
        ctx.waitUntil(rememberName(env, pid, d));
        const c = pickChallenge(d);
        if (!c) {
          return json({ error: "cannot" }, 409);
        } // (every paint the same and no items: nothing to change)
        await env.DB.prepare(
          "INSERT OR REPLACE INTO proofs (pid, keyhash, part, kind, want, back, stage, at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
        )
          .bind(pid, kh, c.part, c.kind, c.want, c.restore, now)
          .run();
        return json({ ok: true, part: c.part, kind: c.kind, value: c.want, restore: c.restore });
      }
      const c = await env.DB.prepare("SELECT * FROM proofs WHERE pid = ? AND keyhash = ? AND at > ?")
        .bind(pid, kh, now - 180000)
        .first();
      if (!c) {
        return json({ error: "no challenge" }, 404);
      }
      const d = await ttDetails(pid);
      if (!d) {
        return json({ error: "TankTrouble didn't answer" }, 502);
      }
      const v = nowValue(d, c);
      if (c.stage === 0) {
        if (v !== c.want) {
          return json({ ok: false, step: "change" });
        }
        await env.DB.prepare("UPDATE proofs SET stage = 1 WHERE pid = ? AND keyhash = ?").bind(pid, kh).run();
        return json({ ok: false, step: "back" });
      } // (step 1 seen: now put it back)
      if (v !== c.back) {
        return json({ ok: false, step: "back" });
      }
      if (
        await env.DB.prepare("SELECT 1 FROM proofs WHERE pid = ? AND keyhash <> ? AND at > ?")
          .bind(pid, kh, now - 180000)
          .first()
      ) {
        // someone else was trying to prove this tank at the same time: nobody wins, try again later
        await env.DB.prepare("DELETE FROM proofs WHERE pid = ?").bind(pid).run();
        ctx.waitUntil(
          alert(
            env,
            "proof clash",
            "Two copies tried to prove " + (await tankName(env, pid)) + " at once; neither was accepted",
          ),
        );
        return json({
          ok: false,
          error: "someone else is trying to prove this tank right now: try again in a few minutes",
        });
      }
      const was = await env.DB.prepare("SELECT keyhash FROM looks WHERE pid = ?").bind(pid).first();
      await env.DB.batch([
        env.DB.prepare("INSERT OR REPLACE INTO verified (pid, keyhash, at) VALUES (?, ?, ?)").bind(pid, kh, now),
        env.DB.prepare("INSERT INTO claims (who, pid, at) VALUES (?, ?, ?), (?, ?, ?)").bind(
          kh,
          "p" + pid,
          now,
          ih,
          "p" + pid,
          now,
        ), // (proved: not counted as probing) env.DB.prepare('DELETE FROM proofs WHERE pid = ?').bind(pid),
        env.DB.prepare("DELETE FROM hidden WHERE pid = ?").bind(pid),
      ]);
      ctx.waitUntil(
        (async () => {
          const pv = await env.DB.prepare(
            "SELECT COUNT(DISTINCT pid) AS n FROM claims WHERE who = ? AND pid LIKE 'p%' AND at > ?",
          )
            .bind(kh, now - DAY)
            .first(); // (one copy proving lots of accounts)
          if (pv && pv.n >= 4) {
            await alertOnce(
              env,
              "proves:" + kh,
              "pattern",
              "One copy of Color Lab (" +
                kh.slice(0, 10) +
                ") proved " +
                pv.n +
                " different accounts today, most recently " +
                (await tankName(env, pid)) +
                ". Could be one person with several accounts, or someone collecting accounts",
            );
          }
        })().catch(() => {}),
      );
      if (was && was.keyhash !== kh) {
        await env.DB.prepare("DELETE FROM looks WHERE pid = ?").bind(pid).run();
        if (env.HUB) {
          ctx.waitUntil(
            hub(env)
              .notify(pid, null, now)
              .catch(() => {}),
          );
        }
        ctx.waitUntil(
          alert(
            env,
            "login",
            (await tankName(env, pid)) +
              " was proven on a different browser or computer (" +
              getDevice(req) +
              "), taking over from copy " +
              was.keyhash.slice(0, 10),
          ),
        );
      } else if (was && env.HUB) {
        const r2 = await env.DB.prepare("SELECT look, updated FROM looks WHERE pid = ?").bind(pid).first();
        if (r2) {
          try {
            ctx.waitUntil(
              hub(env)
                .notify(pid, JSON.parse(r2.look), r2.updated)
                .catch(() => {}),
            );
          } catch {}
        }
      } // (now proven: its look shows straight away)
      return json({ ok: true });
    }
    if (url.pathname === "/v1/announce" && req.method === "GET") {
      // the live announcement (v1.4+ copies ask every minute); nothing about the player is sent
      const t = Date.now();
      if (!bcastCache || t - bcastCache.at > 20000) {
        let r = null;
        try {
          await ensureTables(env);
          r = await env.DB.prepare("SELECT n, title, body, link, ltext, until, zip FROM bcast WHERE id = 1").first();
        } catch {}
        bcastCache = { at: t, r };
      }
      if (!bcastCache.list) {
        try {
          bcastCache.list = (
            (
              await env.DB.prepare(
                "SELECT l.id, l.title, l.body, l.at, l.zip, b.n, b.link, b.ltext FROM bcast_log l LEFT JOIN bcast b ON b.id = 1 AND b.at = l.at WHERE l.at > ? ORDER BY l.id DESC LIMIT 20",
              )
                .bind(t - 90 * DAY)
                .all()
            ).results || []
          ).map((x) => ({
            id: x.n || x.at,
            title: x.title || "",
            body: x.body,
            at: x.at,
            link: x.link || "",
            linkText: x.ltext || "",
            zipOnly: !!x.zip,
          }));
        } catch {
          bcastCache.list = [];
        }
      }
      const r = bcastCache.r,
        ann =
          r && (!r.until || r.until > t)
            ? {
                id: r.n,
                title: r.title || "",
                body: r.body,
                link: r.link || "",
                linkText: r.ltext || "",
                zipOnly: !!r.zip,
              }
            : null;
      let team = {
        22849244: ["Color Lab", "The official Color Lab account"],
        3887207: ["dev", "The developer of Color Lab", "dev"],
      }; // (who wears the Color Lab badge: TEAM_BADGES under [vars], as JSON like this, changes it for every v1.4.2+ copy)
      try {
        if (env.TEAM_BADGES) {
          const teamBadges = JSON.parse(env.TEAM_BADGES),
            ok = {};
          for (const k of Object.keys(teamBadges).slice(0, 20)) {
            if (/^\d{1,12}$/.test(k) && Array.isArray(teamBadges[k])) {
              ok[k] = [
                String(teamBadges[k][0] || "Color Lab").slice(0, 24),
                String(teamBadges[k][1] || "").slice(0, 80),
                teamBadges[k][2] === "dev" ? "dev" : "",
                String(teamBadges[k][3] || "DEV").slice(0, 12),
              ];
            }
          }
          team = ok;
        }
      } catch {}
      return json({ ann, list: bcastCache.list, team });
    } // (list: the announcements of the last 90 days, for the Announcements tab in Message Color Lab)
    if (url.pathname === "/v1/store" && req.method === "GET") {
      // Color Lab's Chrome Web Store page (STORE_URL under [vars] in wrangler.toml): copies installed from a zip offer to move there
      const u = String(env.STORE_URL || "");
      return json({ url: /^https:\/\/chromewebstore\.google\.com\/detail\/[\w-]+\/[a-p]{32}$/.test(u) ? u : null });
    }
    if (url.pathname === "/v1/latest" && req.method === "GET") {
      // the newest Color Lab release on GitHub (for the update pop-up)
      const res = await latestRelease(env, ctx);
      try {
        const j = JSON.parse(await res.clone().text());
        if (j && typeof j.notes === "string") {
          let an = null;
          try {
            await ensureTables(env);
            an = await env.DB.prepare("SELECT text FROM announce WHERE id = 1").first();
          } catch {}
          j.notes = popupNotes((an && an.text ? an.text + "\n\n" : "") + j.notes);
          return new Response(JSON.stringify(j), {
            headers: Object.assign({ "Content-Type": "application/json" }, CORS),
          });
        }
      } catch {}
      return res;
    }
    if (url.pathname === "/") {
      return json({ name: "TankTrouble Color Lab shared looks", ok: true });
    }
    return json({ error: "not found" }, 404);
  },
};
