import {
  applyLabView,
  labAdmin,
  labAlertNew,
  labAlertSeen,
  labDraw,
  labLoadAdmin,
  labOpen,
  labThreads,
} from "./lab.js";
import { shareCall, srvOn } from "./look-sharing.js";
import { SETTINGS } from "./storage.js";
import { D } from "./team-badges.js";
import { esc } from "./trophy-counting.js";

// ---------- The owner's admin, inside TankTrouble (DEV build only) ----------
// A box of its own under the Color Lab box, and a full-screen Admin window with the web admin page's tools in tabs. It works
// for a copy the server trusts as the owner's (OWNER_COPY and "Make it yours"), with that copy's key instead of the admin token.
const WEB_ADMIN = "https://ttcl-share.wazzey.workers.dev/admin";
let admData = null,
  admTab = "overview",
  admMsg = "",
  admFind = "",
  admSure = ""; // (the button waiting for a second click to confirm)

const ownerCall = (act, adm) => shareCall({ op: "owner", act, adm }).catch(() => null);
async function readSummary() {
  const r = await ownerCall("summary");
  admData = r && r.ok && r.data && !r.data.error ? r.data : { error: (r && r.data && r.data.error) || "no answer" };
}
async function applyAction(adm, done) {
  const r = await ownerCall("action", adm);
  admMsg = r && r.ok && r.data && r.data.ok ? done : "Not done: " + ((r && r.data && r.data.error) || "no answer");
  await readSummary();
  populateAdmin();
}

// ---- the box under the Color Lab box ----
function populateBox() {
  const host = document.getElementById("secondaryContent"),
    after = document.getElementById("ttclOnline");
  let box = document.getElementById("ttclAdmBox");
  if (!host || !after || !SETTINGS.on || !labAdmin) {
    if (box) {
      box.remove();
    }
    return;
  }
  if (!box || box.previousSibling !== after) {
    if (box) {
      box.remove();
    }
    box = document.createElement("div");
    box.id = "ttclAdmBox";
    box.className = "snippet";
    after.after(box);
    box.onclick = (e) => {
      const k = e.target.closest("[data-k]");
      if (k) {
        applyBoxClick(k.dataset.k);
      }
    };
  }
  const open = (labThreads || []).filter((t) => t.unread).length,
    badge = (n) =>
      n
        ? '<span style="position:absolute;top:-4px;left:50%;margin-left:5px;font:bold 10px Arial;line-height:13px;background:#e33;color:#fff;border-radius:7px;padding:0 4px">' +
          n +
          "</span>"
        : "";
  const h =
    '<div class="content" style="padding:5px 6px 7px"><div class="header" style="margin-bottom:4px">🔧 Admin</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(32px,1fr));gap:4px 2px;font:15px Arial;text-align:center">' +
    [
      ["adm", "🔧", "Admin"],
      ["inbox", "📨" + badge(open), "Inbox"],
      ["alerts", "⚠️" + badge(labAlertNew), "Alerts"],
      ["cf", "☁️", "Cloud"],
      ["dc", "💬", "Discord"],
    ]
      .map(
        ([k, t, label]) =>
          '<span data-k="' +
          k +
          '" title="' +
          label +
          '" style="position:relative;min-width:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;line-height:1.1"><span style="white-space:nowrap">' +
          t +
          '</span><span style="font:9px Arial;opacity:.85;margin-top:2px">' +
          label +
          "</span></span>",
      )
      .join("") +
    "</div></div>";
  if (box.__h !== h) {
    box.__h = h;
    box.innerHTML = h;
  }
}
function applyBoxClick(k) {
  if (k === "adm") {
    return adminOpen();
  }
  if (k === "cf") {
    return window.open("https://dash.cloudflare.com/", "_blank", "noopener");
  }
  if (k === "dc") {
    return window.open("https://discord.com/channels/@me", "_blank", "noopener");
  }
  labOpen();
  applyLabView(k);
  if (k === "alerts") {
    labAlertSeen();
  }
  labDraw();
  labLoadAdmin()
    .then(() => labDraw())
    .catch(() => {});
}

// ---- the Admin window ----
export function adminOpen() {
  let L = D("ttclAdm");
  if (!L) {
    L = document.createElement("div");
    L.id = "ttclAdm";
    document.body.appendChild(L);
    L.addEventListener("click", applyClick);
    L.addEventListener("input", (e) => {
      if (e.target.id === "admFind") {
        admFind = e.target.value.trim().toLowerCase();
        applyFind();
      }
    });
    ["keydown", "keyup", "keypress"].forEach((t) =>
      L.addEventListener(t, (e) => {
        if (e.key === "Escape") {
          adminClose();
        }
        e.stopPropagation();
      }),
    ); // (typing here never reaches the game)
  }
  admMsg = "Loading…";
  populateAdmin();
  readSummary().then(() => {
    admMsg = "";
    populateAdmin();
  });
}
function adminClose() {
  const L = D("ttclAdm");
  if (L) {
    L.remove();
  }
}
const TABS = [
  ["overview", "📊 Overview"],
  ["players", "👥 Players"],
  ["moderation", "🛡 Moderation"],
  ["announce", "📢 Announce"],
];
function populateAdmin() {
  const L = D("ttclAdm");
  if (!L) {
    return;
  }
  const keep = {};
  for (const id of ["bcT", "bcB", "bcL", "bcLT", "bcH", "ann"]) {
    if (D(id)) {
      keep[id] = D(id).value;
    }
  } // (what's being typed survives a refresh)
  let h =
    "<style>" +
    ADM_CSS +
    '</style><div class="top"><b class="ttl">🔧 Color Lab admin</b><span class="tabs">' +
    TABS.map(
      ([k, t]) => '<button data-tab="' + k + '"' + (admTab === k ? ' class="on"' : "") + ">" + t + "</button>",
    ).join("") +
    '</span><span class="right"><button data-a="inbox">📨 Inbox</button><button data-a="alerts">⚠️ Alerts</button><button data-a="refresh">↻</button><button data-a="web" title="The full admin page on the web">🌐</button><button data-a="close">✕</button></span></div>' +
    (admMsg ? '<div class="note">' + esc(admMsg) + "</div>" : "") +
    '<div class="body">';
  const d = admData;
  if (!d) {
    h += '<p class="dim">Loading…</p>';
  } else if (d.error) {
    h +=
      '<p class="bad">' +
      esc(d.error) +
      '</p><p class="dim">This copy needs to be trusted as yours on the web admin page (Make it yours), and its id listed in OWNER_COPY.</p>';
  } else {
    h += { overview: getOverview, players: getPlayers, moderation: getModeration, announce: getAnnounce }[admTab](d);
  }
  L.innerHTML = h + "</div>";
  for (const id in keep) {
    if (D(id)) {
      D(id).value = keep[id];
    }
  }
  applyFind();
}
function applyFind() {
  const L = D("ttclAdm");
  if (!L) {
    return;
  }
  for (const tr of L.querySelectorAll("table.find tr")) {
    if (!tr.querySelector("th")) {
      tr.style.display = !admFind || tr.textContent.toLowerCase().includes(admFind) ? "" : "none";
    }
  }
}

// ---- tabs ----
const when = (t) => (t ? new Date(t).toLocaleString() : "");
const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1
    ? "just now"
    : m < 60
      ? m + " min ago"
      : m < 1440
        ? Math.round(m / 60) + " h ago"
        : Math.round(m / 1440) + " days ago";
};
const btn = (adm, label, red) =>
  "<button data-act='" +
  esc(JSON.stringify(adm)) +
  "'" +
  (red ? ' class="red"' : "") +
  ">" +
  (admSure === JSON.stringify(adm) ? "Sure? Click again" : label) +
  "</button>";
const table = (heads, rows, empty, find) =>
  rows.length
    ? '<div class="wrap"><table' +
      (find ? ' class="find"' : "") +
      "><tr>" +
      heads.map((x) => "<th>" + x + "</th>").join("") +
      "</tr>" +
      rows.map((r) => "<tr>" + r.map((c) => "<td>" + c + "</td>").join("") + "</tr>").join("") +
      "</table></div>"
    : '<p class="dim">' + empty + "</p>";
const tile = (n, label) => '<div class="tile"><b>' + esc(n) + "</b><span>" + label + "</span></div>";
const live = (p) => Date.now() - p.last < 7 * 60000;
function getStatus(p) {
  if (!live(p)) {
    return '<span class="dim">⚪ offline</span>';
  }
  const where = p.wh === "game" ? " · 🎮 game" : p.wh === "queue" ? " · ⏳ queue" : p.wh === "lobby" ? " · lobby" : "";
  return (
    (p.inv ? "👻 " : "") +
    (p.away ? "🔵 away" : p.idle ? "🟡 idle" : '<span class="ok">🟢 online</span>') +
    '<span class="dim">' +
    where +
    "</span>"
  );
}
function getOverview(d) {
  const st = d.stats || {},
    pr = d.presence || [],
    onl = pr.filter(live);
  const open = (labThreads || []).filter((t) => t.unread).length;
  return (
    '<h3>Right now</h3><div class="tiles">' +
    tile(onl.length, "copies online") +
    tile(onl.filter((p) => p.wh === "game").length, "in a game") +
    tile(onl.filter((p) => p.idle || p.away).length, "idle or away") +
    tile(open, "unread messages") +
    tile(labAlertNew, "new alerts") +
    tile((d.muted || []).filter((m) => m.n >= 3).length, "stopped from messaging") +
    '</div><h3>Usage</h3><div class="tiles">' +
    tile(st.copiesDay, "copies used today") +
    tile(st.copiesWeek, "copies this week") +
    tile(st.newDay + " / " + st.newWeek, "new copies today / week") +
    tile(st.looksDay + " / " + st.looksWeek, "looks saved today / week") +
    tile(st.proven + " (+" + st.provenWeek + ")", "proven tanks (new this week)") +
    tile(st.msgsWeek, "messages this week") +
    tile(st.reportsWeek, "reports this week") +
    tile(st.banned, "bans") +
    "</div><h3>Latest events</h3>" +
    table(
      ["When", "What", ""],
      (d.events || [])
        .slice(0, 40)
        .map((e) => ['<span class="dim">' + ago(e.at) + "</span>", esc(e.kind), esc(e.detail)]),
      "Nothing yet.",
    ) +
    "<p>" +
    btn({ op: "testlog" }, "Send a test to #logs") +
    "</p>"
  );
}
function getPlayers(d) {
  const pr = d.presence || [],
    trusted = d.trusted || [];
  const own = (p) =>
    trusted.includes(p.kh)
      ? '<span class="ok">yours</span> ' + btn({ op: "untrust", hash: p.kh }, "Untrust")
      : btn({ op: "trust", hash: p.kh }, "Make it yours");
  const row = (p) => [
    "<code>" + esc(p.kh.slice(0, 10)) + "</code>" + (p.mine ? ' <span class="dim">(yours)</span>' : ""),
    "v" + esc(p.ver),
    p.nowAs
      ? live(p)
        ? "<b>" + esc(p.nowAs) + "</b>"
        : '<span class="dim">' + esc(p.nowAs) + "</span>"
      : '<span class="dim">-</span>',
    esc(p.who || p.seenAs || ""),
    getStatus(p) + (p.srv ? ' <span class="dim">' + esc(p.srv) + "</span>" : ""),
    '<span class="dim">' + ago(p.last) + "</span>",
    own(p) + btn({ op: "ban", hash: p.kh }, "Ban", true),
  ];
  const users = (d.users141 && d.users141.list) || [];
  return (
    '<input id="admFind" placeholder="Find a name, player ID or copy…" value="' +
    esc(admFind) +
    '"><h3>Online now (' +
    pr.filter(live).length +
    ")</h3>" +
    table(
      ["Copy", "Version", "Playing as", "Accounts", "Status", "Seen", ""],
      pr.filter(live).map(row),
      "Nobody online.",
      true,
    ) +
    "<h3>Seen in the last 30 days</h3>" +
    table(
      ["Copy", "Version", "Last playing as", "Accounts", "Status", "Seen", ""],
      pr.filter((p) => !live(p)).map(row),
      "None.",
      true,
    ) +
    "<h3>Accounts (" +
    users.length +
    ")</h3>" +
    table(
      ["Name", "Player ID", "Version", "First seen", "Last seen"],
      users.map((u) => [
        u.name
          ? esc(u.name) + (u.guest ? ' <span class="dim">(guest)</span>' : "")
          : '<span class="dim">unknown</span>',
        "<code>" + esc(u.pid) + "</code>",
        esc(u.ver || "?"),
        '<span class="dim">' + when(u.first) + "</span>",
        '<span class="dim">' + ago(u.last) + "</span>",
      ]),
      "None yet.",
      true,
    )
  );
}
function getModeration(d) {
  const nm = (r) =>
    r.name ? esc(r.name) + (r.guest ? ' <span class="dim">(guest)</span>' : "") : "<code>" + esc(r.pid) + "</code>";
  return (
    '<h3>Offensive messages today</h3><p class="dim">Refused for swearing or slurs. After 3 a copy can\'t message until tomorrow; nothing else about it changes.</p>' +
    table(
      ["Copy", "Tries", "Its tanks", "Last", ""],
      (d.muted || []).map((m) => [
        "<code>" + esc(m.hash.slice(0, 10)) + "</code>",
        m.n + (m.n >= 3 ? ' <span class="bad">stopped</span>' : ""),
        esc(m.who || "none"),
        '<span class="dim">' + ago(m.at) + "</span>",
        btn({ op: "unmute", hash: m.hash }, "Let them message again"),
      ]),
      "None today.",
    ) +
    '<h3>On hold</h3><p class="dim">Stopped by the server for going after other players\' tanks: cut off until you release or ban them.</p>' +
    table(
      ["Copy", "Why", "Its tanks", "When", ""],
      (d.held || []).map((x) => [
        "<code>" + esc(x.grp.slice(0, 10)) + "</code>",
        esc(x.why),
        esc(x.who || "none"),
        '<span class="dim">' + ago(x.at) + "</span>",
        btn({ op: "release", hash: x.grp }, "Release") + btn({ op: "banheld", hash: x.grp }, "Ban", true),
      ]),
      "Nobody on hold.",
    ) +
    "<h3>Reported looks (7 days)</h3>" +
    table(
      ["Tank", "People", "Reported by", "Last", ""],
      (d.reports || []).map((r) => [
        nm(r),
        r.people,
        esc(r.by || ""),
        '<span class="dim">' + ago(r.last) + "</span>",
        btn({ op: "clearreports", pid: r.pid }, "Dismiss") + btn({ op: "ban", pid: r.pid }, "Ban sharer", true),
      ]),
      "No reports.",
    ) +
    "<h3>Hidden after reports</h3>" +
    table(
      ["Tank", "Copy", "When", ""],
      (d.hidden || []).map((r) => [
        "<code>" + esc(r.pid) + "</code>",
        "<code>" + esc(r.keyhash.slice(0, 10)) + "</code>",
        '<span class="dim">' + ago(r.at) + "</span>",
        btn({ op: "unhide", pid: r.pid }, "Allow again") + btn({ op: "ban", hash: r.keyhash }, "Ban sharer", true),
      ]),
      "Nothing hidden.",
    ) +
    '<h3>Latest shared looks</h3><input id="admFind" placeholder="Find a name, player ID or copy…" value="' +
    esc(admFind) +
    '">' +
    table(
      ["Tank", "Copy", "Proven", "Updated", ""],
      (d.looks || []).map((l) => [
        nm(l) + ' <span class="dim">' + esc(l.pid) + "</span>",
        "<code>" + esc(l.keyhash.slice(0, 10)) + "</code>",
        l.verified ? "yes" : "",
        '<span class="dim">' + ago(l.updated) + "</span>",
        btn({ op: "delete", pid: l.pid }, "Delete") +
          (l.verified ? btn({ op: "unverify", pid: l.pid }, "Unprove") : "") +
          btn({ op: "ban", pid: l.pid }, "Ban sharer", true),
      ]),
      "None.",
      true,
    ) +
    "<h3>Banned (" +
    (d.banned || []).length +
    ")</h3>" +
    table(
      ["When", "Type", "Accounts on it", "Code", ""],
      (d.banned || []).map((b) => [
        '<span class="dim">' + (b.at ? ago(b.at) : "earlier") + "</span>",
        esc(b.kind || ""),
        esc(b.who || ""),
        "<code>" + esc(b.hash.slice(0, 10)) + "</code>",
        btn({ op: "unban", hash: b.hash }, "Unban"),
      ]),
      "Nobody banned.",
    )
  );
}
function getAnnounce(d) {
  const b = d.bcast || {};
  return (
    '<h3>📢 Send an announcement</h3><p class="dim">Pops up for every Color Lab player (v1.4.1+) straight away, and players who open TankTrouble later still get it. A blank line starts a new paragraph, - starts a bullet point, **stars** make bold.</p>' +
    '<label>Title<input id="bcT" maxlength="120" value="' +
    esc(b.title || "") +
    '"></label><label>Message<textarea id="bcB" rows="6" maxlength="3000">' +
    esc(b.body || "") +
    '</textarea></label><div class="two"><label>Button link (your GitHub, tanktrouble.com or Discord)<input id="bcL" value="' +
    esc(b.link || "") +
    '"></label><label>Button text<input id="bcLT" maxlength="40" value="' +
    esc(b.ltext || "") +
    '"></label></div><label>Keep showing it for <select id="bcH">' +
    [
      ["1", "1 hour"],
      ["6", "6 hours"],
      ["24", "1 day"],
      ["72", "3 days"],
      ["168", "1 week"],
      ["0", "until I stop it"],
    ]
      .map(([v, t]) => '<option value="' + v + '"' + (v === "24" ? " selected" : "") + ">" + t + "</option>")
      .join("") +
    '</select></label><label class="chk"><input type="checkbox" id="bcZip"> Only copies installed from GitHub (for update reminders)</label><p>' +
    '<button data-a="bcast" class="big">' +
    (admSure === "bcast" ? "Sure? Click again to send to everyone" : "📢 Send to everyone") +
    '</button> <button data-a="bcstop" class="red">' +
    (admSure === "bcstop" ? "Sure? Click again" : "Stop showing it") +
    '</button></p><p class="dim">' +
    (d.bcast
      ? "Showing now: <b>" +
        esc(b.title || "(no title)") +
        "</b>, sent " +
        ago(b.at) +
        (b.until ? ", until " + when(b.until) : ", until you stop it")
      : "Nothing is showing right now.") +
    '</p><h3>Message for players still on v1.3</h3><p class="dim">Shown in their Please update pop-up.</p><textarea id="ann" rows="3">' +
    esc(d.announce ? d.announce.text : "") +
    '</textarea><p><button data-a="annsave">Save message</button> <button data-a="annclear" class="red">Clear</button></p>' +
    '<h3>Forum</h3><p class="dim">New releases are posted on the forum by themselves; this is for one published before.</p><p>' +
    btn({ op: "relpost" }, "Post the newest release on the forum") +
    "</p>"
  );
}

// ---- clicks ----
async function applyClick(e) {
  const L = D("ttclAdm");
  if (e.target === L) {
    return adminClose();
  }
  const tab = e.target.closest("[data-tab]");
  if (tab) {
    admTab = tab.dataset.tab;
    admSure = "";
    admMsg = "";
    return populateAdmin();
  }
  const act = e.target.closest("[data-act]");
  if (act) {
    const key = act.dataset.act,
      adm = JSON.parse(key);
    if (adm.op !== "testlog" && admSure !== key) {
      admSure = key;
      setTimeout(() => {
        if (admSure === key) {
          admSure = "";
          populateAdmin();
        }
      }, 4000);
      return populateAdmin();
    } // (two clicks for anything that changes something)
    admSure = "";
    act.disabled = true;
    return applyAction(adm, adm.op + " done");
  }
  const a = e.target.closest("[data-a]");
  if (!a) {
    return;
  }
  const k = a.dataset.a;
  if (k === "close") {
    return adminClose();
  }
  if (k === "web") {
    return window.open(WEB_ADMIN, "_blank", "noopener");
  }
  if (k === "refresh") {
    admMsg = "Loading…";
    populateAdmin();
    await readSummary();
    admMsg = "";
    return populateAdmin();
  }
  if (k === "inbox" || k === "alerts") {
    adminClose();
    return applyBoxClick(k);
  }
  if ((k === "bcast" || k === "bcstop") && admSure !== k) {
    if (k === "bcast" && !D("bcB").value.trim()) {
      admMsg = "Write a message first";
      return populateAdmin();
    }
    admSure = k;
    return populateAdmin();
  }
  admSure = "";
  if (k === "bcast" || k === "bcstop") {
    return applyAction(
      {
        op: "bcast",
        zipOnly: D("bcZip").checked,
        title: D("bcT").value,
        body: k === "bcstop" ? "" : D("bcB").value,
        link: D("bcL").value.trim(),
        ltext: D("bcLT").value,
        hours: D("bcH").value,
      },
      k === "bcstop" ? "Stopped showing it" : "📢 Sent to everyone",
    );
  }
  if (k === "annsave" || k === "annclear") {
    return applyAction(
      { op: "announce", text: k === "annclear" ? "" : D("ann").value },
      k === "annclear" ? "Message cleared" : "Message saved",
    );
  }
}

const ADM_CSS = `#ttclAdm{position:fixed;inset:0;z-index:2147482001;background:rgba(8,10,16,.97);color:#e9edf7;font:14px/1.4 Arial,sans-serif;overflow-y:auto}
#ttclAdm .top{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 16px;background:linear-gradient(#427fff,#0014ab);box-shadow:0 3px 10px rgba(0,0,0,.5)}
#ttclAdm .ttl{font:20px TankTrouble,Arial}#ttclAdm .tabs{display:flex;gap:6px;flex-wrap:wrap}#ttclAdm .right{margin-left:auto;display:flex;gap:6px}
#ttclAdm button{cursor:pointer;background:linear-gradient(#5a5f6b,#343843);color:#fff;border:0;border-radius:6px;padding:5px 10px;font:13px Arial;margin:1px 3px 1px 0}
#ttclAdm .tabs button{background:rgba(255,255,255,.14);font-size:14px}#ttclAdm .tabs button.on{background:#fff;color:#0014ab;font-weight:bold}
#ttclAdm button.red{background:linear-gradient(#e0474f,#8f1219)}#ttclAdm button.big{font-size:15px;padding:7px 14px;background:linear-gradient(#427fff,#0014ab)}
#ttclAdm button:disabled{opacity:.5}#ttclAdm .note{padding:8px 16px;background:#1d2a44;border-bottom:1px solid #2f4a80}
#ttclAdm .body{max-width:1100px;margin:0 auto;padding:6px 16px 60px}#ttclAdm h3{font:bold 17px Arial;margin:18px 0 6px}
#ttclAdm .dim{color:#9aa3b5}#ttclAdm .ok{color:#5fd38a}#ttclAdm .bad{color:#ff7a6b}#ttclAdm code{color:#bcd0ff}
#ttclAdm .tiles{display:flex;flex-wrap:wrap;gap:8px}#ttclAdm .tile{background:#181d29;border:1px solid #2c3446;border-radius:8px;padding:8px 12px;min-width:120px}
#ttclAdm .tile b{display:block;font-size:20px}#ttclAdm .tile span{color:#9aa3b5;font-size:12px}
#ttclAdm .wrap{overflow-x:auto;border:1px solid #2c3446;border-radius:8px}#ttclAdm table{border-collapse:collapse;width:100%}
#ttclAdm th,#ttclAdm td{padding:5px 8px;border-bottom:1px solid #232a3a;text-align:left;vertical-align:top}#ttclAdm th{background:#181d29;font-weight:bold;white-space:nowrap}
#ttclAdm input,#ttclAdm textarea,#ttclAdm select{box-sizing:border-box;background:#111522;color:#eee;border:1px solid #3a4560;border-radius:6px;padding:6px 8px;font:14px Arial}
#ttclAdm #admFind{width:100%;max-width:420px;margin:8px 0 2px}#ttclAdm label{display:block;margin:8px 0}#ttclAdm label input,#ttclAdm label textarea{display:block;width:100%;margin-top:3px}
#ttclAdm label.chk input{display:inline;width:auto}#ttclAdm .two{display:flex;gap:10px}#ttclAdm .two label{flex:1}#ttclAdm textarea{width:100%}`;

export function startAdminPanel() {
  let tries = 0;
  setInterval(() => {
    try {
      populateBox();
    } catch {}
  }, 1500);
  const ask = setInterval(() => {
    if (labAdmin || !srvOn()) {
      if (labAdmin) {
        clearInterval(ask);
      }
      return;
    } // (nothing is asked until the copy is connected, so waiting costs nothing)
    if (tries++ >= 40) {
      clearInterval(ask);
      return;
    } // (the server isn't answering: the 5-minute check below tries again)
    labLoadAdmin()
      .then(() => populateBox())
      .catch(() => {});
  }, 3000);
  setInterval(
    () => {
      labLoadAdmin()
        .then(() => populateBox())
        .catch(() => {});
    },
    5 * 60 * 1000,
  ); // (unanswered messages for the box's badge)
}
