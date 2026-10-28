import { roundState } from "./achievements.js";
import { LOBBY_GAMES, loggedInIds, rpc } from "./game-socket.js";
import { GAME_STATE } from "./garage.js";
import { incognito, shareCall, shareMine, srvOn } from "./look-sharing.js";
import { toast } from "./panel.js";
import { SETTINGS, saveSettings } from "./storage.js";
import { clBadge } from "./team-badges.js";
import { esc } from "./trophy-counting.js";

// A "Color Lab" box under the battle mode box: how many Color Lab players are online and, for those who chose to be shown, who
// (and, if they chose that too, which server). The owner's DEV build sees everything: guests, hidden copies, versions, last seen
let onlineData = null,
  onlineErr = false,
  onlineAll = false,
  onlinePick = null,
  staffServer = [],
  gmTag = () => "";
// TankTrouble staff (the game's GM level: 1-8 moderators, 9 developers): each player looked up once from TankTrouble itself
// (never Color Lab's server), one at a time, and remembered for a day
let STAFF = {};
const staffQ = [],
  staffNew = new Set();
let staffBusy = false,
  staffSave = 0;
function staffOf(pid) {
  pid = String(pid);
  const e = STAFF[pid];
  if (e && Date.now() - e[2] < 86400000) {
    return e;
  }
  if (!staffNew.has(pid) && staffQ.length < 200) {
    staffNew.add(pid);
    staffQ.push(pid);
    staffRun();
  }
  return e || null;
}
function staffRun() {
  if (staffBusy || !staffQ.length || document.hidden) {
    return;
  }
  staffBusy = true;
  const pid = staffQ.shift();
  rpc("getPlayerDetails", [pid])
    .then((d) => {
      const g = Number(d && d.gmLevel) || 0;
      STAFF[pid] = [g, String((d && d.username) || ""), Date.now()];
      clearTimeout(staffSave);
      staffSave = setTimeout(() => {
        try {
          const ks = Object.keys(STAFF);
          if (ks.length > 3000) {
            for (const k of ks.slice(0, ks.length - 3000)) {
              delete STAFF[k];
            }
          }
          localStorage.setItem("ttclStaff", JSON.stringify(STAFF));
        } catch {}
      }, 3000);
      if (g > 0) {
        onlineDraw();
        staffCheck();
      }
    })
    .catch(() => {})
    .finally(() => {
      staffNew.delete(pid);
      staffBusy = false;
      setTimeout(staffRun, 700);
    });
} // (about 1 lookup a second at most)
const staffName = (g) => (g >= 9 ? "DEV" : "GM" + g);
// staff in your game (a heads-up once a game) and on your server (from the lobby's list of the server's games)
let staffGameKey = null,
  staffTold = new Set();
function staffCheck() {
  try {
    const mine = new Set(loggedInIds().map(String));
    const gc = GAME_STATE && GAME_STATE.gameController;
    if (gc !== staffGameKey) {
      staffGameKey = gc;
      staffTold = new Set();
    }
    if (roundState && roundState.online) {
      for (const pid of roundState.players) {
        if (mine.has(pid) || staffTold.has(pid)) {
          continue;
        }
        const e = staffOf(pid);
        if (e && e[0] > 0) {
          staffTold.add(pid);
          toast(
            "👮 [" +
              staffName(e[0]) +
              "] " +
              (e[1] || "A " + (e[0] >= 9 ? "developer" : "moderator")) +
              " is in this game",
          );
        }
      }
    }
    const list = []; // (the lobby's own list of this server's games, read as it arrives: fresh for 3 minutes)
    if (LOBBY_GAMES && Date.now() - LOBBY_GAMES.at < 180000) {
      for (const id of LOBBY_GAMES.ids) {
        if (mine.has(id)) {
          continue;
        }
        const e = staffOf(id);
        if (e && e[0] > 0) {
          list.push({ pid: id, g: e[0], name: e[1] });
        }
      }
    }
    const sig = JSON.stringify(list);
    if (sig !== JSON.stringify(staffServer)) {
      staffServer = list;
      onlineDraw();
    }
  } catch {}
}
export async function onlineFetch() {
  const r = await shareCall({ op: "online" }).catch(() => null);
  onlineErr = !(r && r.ok && r.data);
  if (!onlineErr) {
    onlineData = r.data;
    try {
      localStorage.setItem("ttclOnlineLast", JSON.stringify(r.data));
    } catch {}
  }
  onlineDraw();
  return !onlineErr;
}
function onlineDraw() {
  const old = document.getElementById("ttclOnline");
  if (!SETTINGS.on) {
    if (old) {
      old.remove();
    }
    return;
  }
  const host = document.getElementById("secondaryContent");
  if (!host) {
    return;
  }
  let box = old;
  if (!box || box.parentNode !== host) {
    if (box) {
      box.remove();
    }
    box = document.createElement("div");
    box.id = "ttclOnline";
    box.className = "snippet";
    const t = host.querySelector(".teaser");
    host.insertBefore(box, t ? t.nextSibling : null);
  }
  const copies = onlineData && Array.isArray(onlineData.list) ? onlineData.list : [],
    n = onlineData ? onlineData.online : 0,
    shut = !!SETTINGS.onlineShut;
  const ago = (m) =>
    m < 1
      ? "just now"
      : m < 60
        ? m + " min ago"
        : m < 1440
          ? Math.round(m / 60) + " h ago"
          : Math.round(m / 1440) + " days ago";
  const people = [],
    bare = { on: 0, off: 0 },
    bareOwn = []; // one row a player (a copy with several accounts gives several rows); copies with no account yet are just counted
  for (const c of copies) {
    // newer copies say which tanks are logged in right now; v1.3 copies only show the accounts they've shared, marked "?"
    const sure = Array.isArray(c.logged),
      acc = sure ? c.logged : Array.isArray(c.accounts) ? c.accounts : [];
    const own = (Array.isArray(c.accounts) ? c.accounts : []).filter((a) => !a.guest && a.name); // whose copy it is (the accounts that have shared from it)
    if (!acc.length) {
      bare[c.on ? "on" : "off"]++;
      if (sure && own.length && c.on) {
        bareOwn.push(own[0].name);
      }
      continue;
    }
    for (const a of acc) {
      const o = sure
        ? own.find((x) => String(x.pid) !== String(a.pid) && !acc.some((y) => String(y.pid) === String(x.pid)))
        : null; // playing on someone else's copy: a guest or another account
      people.push({
        pid: a.pid,
        name: a.name || "Player " + a.pid,
        guest: a.guest,
        on: c.on,
        mins: c.mins,
        ver: c.ver,
        sure,
        srv: c.srv || "",
        idle: !!c.idle,
        inv: !!c.inv,
        away: !!c.away,
        wh: c.wh || "",
        qmins: c.qmins,
        via: o ? o.name : "",
        unsh: sure && !(Array.isArray(c.accounts) && c.accounts.some((x) => String(x.pid) === String(a.pid))),
      });
    }
  } // (unsh: logged in on a copy that hasn't shared this account yet)
  const guests = people.filter((p) => p.guest),
    gAll = new Set(guests.map((p) => p.pid)).size; // (guests only use Color Lab locally: counted, not listed)
  for (let i = people.length - 1; i >= 0; i--) {
    if (people[i].guest) {
      people.splice(i, 1);
    }
  }
  {
    const rank = (p) => (p.on ? 4 : 0) + (p.on && !p.away ? 2 : 0) + (p.on && !p.idle && !p.away ? 1 : 0),
      best = new Map(); // (one row an account: the same account on two copies shows its liveliest copy)
    for (const p of people) {
      const k = String(p.pid),
        q = best.get(k);
      if (!q) {
        best.set(k, p);
        continue;
      }
      const keep = rank(p) > rank(q) || (rank(p) === rank(q) && p.mins < q.mins) ? p : q,
        other = keep === p ? q : p;
      keep.unsh = keep.unsh && other.unsh;
      keep.inv = keep.inv || other.inv;
      best.set(k, keep);
    }
    people.length = 0;
    people.push(...best.values());
  }
  people.sort((a, b) => b.on - a.on || a.mins - b.mins);
  const pend = [],
    seenP = new Set();
  for (let i = people.length - 1; i >= 0; i--) {
    if (people[i].unsh && !people[i].on && DEV_BUILD) {
      const q = people.splice(i, 1)[0];
      if (!seenP.has(q.pid)) {
        seenP.add(q.pid);
        pend.unshift(q);
      }
    }
  }
  {
    const shown = new Set(people.map((p) => String(p.pid)));
    for (let i = pend.length - 1; i >= 0; i--) {
      if (shown.has(String(pend[i].pid))) {
        const q = pend[i],
          p = people.find((x) => String(x.pid) === String(q.pid));
        if (p && q.on && (!p.on || q.mins < p.mins)) {
          Object.assign(p, {
            on: q.on,
            mins: q.mins,
            idle: q.idle,
            srv: q.srv,
            inv: q.inv,
            ver: q.ver,
            away: q.away,
            wh: q.wh,
            qmins: q.qmins,
          });
        }
        pend.splice(i, 1);
      }
    }
    people.sort((a, b) => b.on - a.on || a.mins - b.mins);
  } /* (the same account on another copy that's online right now: the row shows that copy's status) */ // (an account already listed, shared from another copy, isn't repeated under "not sharing yet") // (the owner's copy: accounts not yet allowed to share looks are listed apart)
  const st = (on, idle, away) =>
    '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;vertical-align:-1px;margin-right:3px;background:' +
    (on ? (away ? "#4a8cff" : idle ? "#f2c230" : "#2fd12f") : "#9a9a9a") +
    ';box-shadow:0 0 0 1px rgba(0,0,0,.45)"></span>';
  const OUT = "color:#fff;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 3px #000";
  let h =
    '<div class="content" style="padding:5px 6px 7px"><div class="header" data-k="tog" style="cursor:pointer;user-select:none" title="Show or hide the players">Color Lab <span style="display:inline-block;width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:8px solid currentColor;margin-left:3px;vertical-align:0;transform:rotate(' +
    (shut ? 0 : 90) +
    'deg)"></span></div>' +
    '<div style="font:bold 13px Arial;margin:3px 0 2px">' +
    (!srvOn()
      ? st(false) +
        (incognito()
          ? "Offline in Incognito windows"
          : SETTINGS.goOffline === true
            ? "Offline (not connected)"
            : "Not connected (logged out)")
      : onlineErr || !onlineData
        ? st(false) + "Server offline"
        : st(true) +
          n +
          " online" +
          (!DEV_BUILD && people.some((p) => p.on && p.idle)
            ? " · " + people.filter((p) => p.on && p.idle).length + " idle"
            : "")) +
    "</div>" +
    (DEV_BUILD && onlineData && people.length
      ? (() => {
          const on = people.filter((p) => p.on),
            c = (f) => on.filter(f).length,
            parts = [
              [c((p) => !p.idle && !p.away), "#2fd12f", "active"],
              [c((p) => p.idle && !p.away), "#f2c230", "idle"],
              [c((p) => p.away), "#4a8cff", "away"],
              [c((p) => p.inv), "", "👻"],
            ].filter((x) => x[0]);
          return parts.length
            ? '<div style="font:10px Arial;opacity:.85;margin:-1px 0 2px" title="Active: playing or recently clicked. Idle: no input for 5 min (still online for others). Away: lobby with the tab in the background for 3 min (offline for others). 👻: invisible">' +
                parts
                  .map(
                    (x) =>
                      (x[1]
                        ? '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' +
                          x[1] +
                          ';margin:0 2px 0 4px"></span>'
                        : " ") +
                      x[0] +
                      " " +
                      x[2],
                  )
                  .join("") +
                "</div>"
            : "";
        })()
      : "");
  if (!shut && people.length) {
    const show = people; // (names only, scrolling past ~10; click one for its tank)
    h +=
      '<div style="text-align:left;margin-top:4px;border-top:1px solid rgba(127,127,127,.35);padding-top:3px;max-height:230px;overflow-y:auto;padding-right:3px;scrollbar-width:thin;scrollbar-color:rgba(127,127,127,.6) transparent">' +
      show
        .map((p) => {
          const open = onlinePick === p.pid;
          return (
            '<div data-k="pick" data-pid="' +
            esc(p.pid) +
            '" style="cursor:pointer;padding:1px 0" title="Click to see their tank">' +
            '<div style="display:flex;align-items:center;gap:1px"><span style="flex:none;display:flex" title="' +
            (p.on
              ? p.away
                ? "Away: in the lobby with the tab in the background" +
                  (p.qmins != null ? " for " + p.qmins + " min" : "") +
                  " (offline for other players)"
                : p.idle
                  ? "Idle: no input" +
                    (p.qmins != null ? " for " + p.qmins + " min" : "") +
                    (p.qmins >= 15 ? " (offline for other players after 15 min idle)" : "")
                  : "Online"
              : "Offline") +
            '">' +
            st(p.on, p.idle, p.away) +
            '</span><span title="' +
            esc(p.name) +
            '" style="min-width:0;flex:0 1 auto;font:' +
            Math.max(9, Math.min(13, Math.floor((gmTag(p.pid) ? 118 : 140) / (String(p.name).length * 0.95)))) +
            "px TankTrouble,Arial;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" +
            OUT +
            '">' +
            esc(p.name) +
            '</span><span style="flex:none;white-space:nowrap">' +
            (p.inv
              ? '<span title="Invisible to other players" style="font:11px Arial;margin-left:2px">👻</span>'
              : "") +
            (DEV_BUILD && p.unsh
              ? '<span title="Logged in on a copy that hasn\'t shared this account\'s look yet (not proved, too new or blocked)" style="font:9px Arial;opacity:.75;margin-left:2px">new</span>'
              : "") +
            (p.on && p.wh === "game"
              ? '<span title="In a game" style="font:11px Arial;margin-left:2px">🎮</span>'
              : p.on && p.wh === "queue"
                ? '<span title="In a queue" style="font:11px Arial;margin-left:2px">⏳</span>'
                : "") +
            clBadge(p.pid, 0, true) +
            gmTag(p.pid) +
            (p.sure
              ? ""
              : '<span style="font:bold 11px Arial;' +
                OUT +
                '" title="v1.3 copy: online, but it can\'t say which of its accounts is logged in"> ?</span>') +
            (p.guest ? ' <span style="font:10px Arial">(guest)</span>' : "") +
            "</span></div>" +
            (open
              ? '<div style="margin:2px 0 5px 12px"><div title="Open their profile" style="width:56px;height:34px;position:relative;overflow:hidden;cursor:pointer"><tank-icon interactive size="small" data-player-id="' +
                esc(p.pid) +
                '" style="position:absolute;left:0;top:0;transform:scale(.4);transform-origin:0 0"></tank-icon></div>' +
                '<div style="font:11px Arial;line-height:1.35;margin-top:1px">' +
                (p.on
                  ? "<b>" +
                    (p.away ? "Away" : p.idle ? "Idle" : p.sure ? "Online" : "Online?") +
                    "</b>" +
                    (DEV_BUILD && (p.away || p.idle) && p.qmins != null ? " " + p.qmins + " min" : "") +
                    (p.wh
                      ? " · " + (p.wh === "game" ? "in a game" : p.wh === "queue" ? "in a queue" : "in the lobby")
                      : "")
                  : ago(p.mins)) +
                '<br><span style="opacity:.75">' +
                [p.srv ? esc(p.srv) : "", p.ver ? "v" + esc(p.ver) : ""].filter(Boolean).join(" · ") +
                "</span></div></div>"
              : "") +
            "</div>"
          );
        })
        .join("") +
      "</div>";
  }
  if (DEV_BUILD && !shut && pend.length) {
    h +=
      '<div style="font:11px Arial;margin-top:5px;text-align:left" title="Logged in on a copy of Color Lab but not allowed to share looks yet (not proved, too new or blocked)">⏳ Not sharing yet (' +
      pend.length +
      '): <span style="overflow-wrap:anywhere">' +
      pend.map((p) => esc(p.name)).join(", ") +
      "</span></div>";
  }
  if (DEV_BUILD && !shut && gAll) {
    const gs = [...new Map(guests.map((p) => [p.pid, p])).values()].sort((a, b) => b.on - a.on || a.mins - b.mins); // (guests: names only, local use)
    h +=
      '<div style="font:11px Arial;margin-top:5px;text-align:left" title="Guests only use Color Lab on their own screen">👤 Guests (' +
      gAll +
      '): <span style="overflow-wrap:anywhere">' +
      gs
        .map(
          (p) =>
            '<span title="' +
            esc(
              (p.on ? "Online" : "Seen " + ago(p.mins)) +
                (p.srv ? " · " + p.srv : "") +
                " · v" +
                p.ver +
                (p.via ? " · on " + p.via + "'s copy" : ""),
            ) +
            '" style="opacity:' +
            (p.on ? 1 : 0.6) +
            '">' +
            esc(p.name) +
            (p.via ? ' <span style="opacity:.75">(' + esc(p.via) + "'s copy)</span>" : "") +
            "</span>",
        )
        .join(", ") +
      "</span></div>";
  }
  const hid = onlineData && typeof onlineData.hidden === "number" ? onlineData.hidden : null;
  if (!shut && hid) {
    h +=
      '<div style="font:10px Arial;opacity:.75;margin-top:3px" title="Color Lab players who haven\'t chosen to be shown">+ ' +
      hid +
      " hidden</div>";
  }
  if (!shut && !(SETTINGS.showOnline === true && shareMine())) {
    h +=
      '<div style="font:10px Arial;opacity:.75;margin-top:3px" title="Turn it on in ⚙ Settings > Look sharing">' +
      (SETTINGS.invisible === true ? "👻 You're invisible to other players" : "You're hidden from other players") +
      "</div>";
  }
  if (!shut && hid === null && (bare.on || bare.off)) {
    h +=
      '<div style="font:10px Arial;opacity:.7;margin-top:3px" title="Copies with no account logged in or no shared look yet">+ ' +
      (bare.on + bare.off) +
      " more cop" +
      (bare.on + bare.off === 1 ? "y" : "ies") +
      (bareOwn.length
        ? ' <span title="Open, but logged out">(' + bareOwn.map(esc).join(", ") + "'s, logged out)</span>"
        : "") +
      "</div>";
  }
  if (DEV_BUILD && !shut && staffServer.length) {
    h +=
      '<div style="font:11px Arial;margin-top:5px;text-align:left" title="TankTrouble staff in games on your server">👮 Staff on this server: ' +
      staffServer
        .map((p) => '<span style="white-space:nowrap">' + esc(p.name || "Player " + p.pid) + gmTag(p.pid) + "</span>")
        .join(", ") +
      "</div>";
  }
  h += "</div>";
  if (box.__h !== h) {
    box.__h = h;
    box.innerHTML = h;
  }
  box.onclick = (e) => {
    if (e.target.closest("tank-icon")) {
      return;
    } // (the tank picture opens the game's own profile card)
    const k = e.target.closest("[data-k]");
    if (!k) {
      return;
    }
    if (k.dataset.k === "tog") {
      SETTINGS.onlineShut = !shut;
      saveSettings();
    } else if (k.dataset.k === "pick") {
      onlinePick = onlinePick === k.dataset.pid ? null : k.dataset.pid;
    } else {
      onlineAll = !onlineAll;
    }
    onlineDraw();
  };
}

export function startOnline() {
  try {
    STAFF = JSON.parse(localStorage.getItem("ttclStaff") || "{}") || {};
  } catch {}
  if (DEV_BUILD) {
    gmTag = function (pid) {
      const e = staffOf(pid),
        g = e ? e[0] : 0;
      return g > 0
        ? ' <span title="' +
            (g >= 9 ? "TankTrouble developer" : "TankTrouble moderator") +
            " (GM" +
            g +
            ')" style="font:bold 8px Arial;vertical-align:2px;margin-left:2px;padding:0 2px;border-radius:3px;color:#fff;text-shadow:none;background:' +
            (g >= 9 ? "#c0392b" : g >= 6 ? "#7d3cc8" : "#2f7fd6") +
            '">' +
            staffName(g) +
            "</span>"
        : "";
    };
  }
  if (DEV_BUILD) {
    setInterval(() => {
      if (!document.hidden) {
        staffCheck();
        staffRun();
      }
    }, 4000);
  }
  try {
    onlineData = JSON.parse(localStorage.getItem("ttclOnlineLast") || "null");
  } catch {} // the last list shows at once while the fresh one loads
  {
    {
      let tries = 0;
      const first = () => {
        onlineFetch()
          .then((ok) => {
            if (!ok && ++tries < 8) {
              setTimeout(first, 700);
            }
          })
          .catch(() => {});
      };
      setTimeout(first, 300);
    } // straight away, retrying until the extension is ready
    {
      let n = 0;
      const quick = setInterval(() => {
        try {
          if (onlineData || onlineErr) {
            onlineDraw();
          }
          if (document.getElementById("ttclOnline") || ++n > 80) {
            clearInterval(quick);
          }
        } catch {}
      }, 250);
    } // draws as soon as the page has the spot for it
    setInterval(
      () => {
        try {
          if (!document.hidden) {
            onlineFetch();
          }
        } catch {}
      },
      DEV_BUILD ? 15000 : 30000,
    );
    setInterval(() => {
      try {
        if (onlineData || onlineErr) {
          onlineDraw();
        }
      } catch {}
    }, 2000);
  }
  window.__ttclWhere = (pid) => {
    for (const c of (onlineData && onlineData.list) || []) {
      const acc = Array.isArray(c.logged) ? c.logged : [];
      if (acc.some((a) => String(a.pid) === String(pid))) {
        const m = c.mins;
        return {
          on: c.on,
          idle: !!c.idle,
          away: !!c.away,
          wh: c.wh || "",
          qmins: c.qmins,
          srv: c.srv || "",
          ago: m < 60 ? m + " min ago" : Math.round(m / 60) + " h ago",
        };
      }
    }
    return null;
  };
}
