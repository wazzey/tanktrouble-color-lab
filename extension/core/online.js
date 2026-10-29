import { roundState } from "./achievements.js";
import { LOBBY_GAMES, loggedInIds, rpc } from "./game-socket.js";
import { GAME_STATE } from "./garage.js";
import { incognito, shareCall, shareMine, srvOn } from "./look-sharing.js";
import { toast } from "./panel.js";
import { SETTINGS, saveSettings } from "./storage.js";
import { clBadge } from "./team-badges.js";
import { esc } from "./trophy-counting.js";

// A "Color Lab" box under the battle mode box: how many Color Lab players are online and, for those who chose to be shown, who
// (and, if they chose that too, which server). Everyone, the owner included, sees the same list
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
  const people = []; // one row a player (a copy with several accounts gives several rows)
  for (const c of copies) {
    for (const a of Array.isArray(c.logged) ? c.logged : []) {
      people.push({
        pid: a.pid,
        name: a.name || "Player " + a.pid,
        on: c.on,
        mins: c.mins,
        srv: c.srv || "",
        idle: c.idle === true,
        away: c.away === true,
        wh: c.wh || "",
        qmins: c.qmins,
      });
    }
  }
  {
    const rank = (p) => (p.on ? 4 : 0) + (p.on && !p.away ? 2 : 0) + (p.on && !p.idle && !p.away ? 1 : 0),
      best = new Map(); // (one row an account: the same account on two copies shows its liveliest copy)
    for (const p of people) {
      const k = String(p.pid),
        q = best.get(k);
      best.set(k, !q || rank(p) > rank(q) || (rank(p) === rank(q) && p.mins < q.mins) ? p : q);
    }
    people.length = 0;
    people.push(...best.values());
  }
  people.sort((a, b) => b.on - a.on || a.mins - b.mins);
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
          (people.some((p) => p.on && p.idle) ? " · " + people.filter((p) => p.on && p.idle).length + " idle" : "")) +
    "</div>";
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
            (p.on && p.wh === "game"
              ? '<span title="In a game" style="font:11px Arial;margin-left:2px">🎮</span>'
              : p.on && p.wh === "queue"
                ? '<span title="In a queue" style="font:11px Arial;margin-left:2px">⏳</span>'
                : "") +
            clBadge(p.pid, 0, true) +
            gmTag(p.pid) +
            "</span></div>" +
            (open
              ? '<div style="margin:2px 0 5px 12px"><div title="Open their profile" style="width:56px;height:34px;position:relative;overflow:hidden;cursor:pointer"><tank-icon interactive size="small" data-player-id="' +
                esc(p.pid) +
                '" style="position:absolute;left:0;top:0;transform:scale(.4);transform-origin:0 0"></tank-icon></div>' +
                '<div style="font:11px Arial;line-height:1.35;margin-top:1px">' +
                (p.on
                  ? "<b>" +
                    (p.away ? "Away" : p.idle ? "Idle" : "Online") +
                    "</b>" +
                    ((p.away || p.idle) && p.qmins != null ? " " + p.qmins + " min" : "") +
                    (p.wh
                      ? " · " + (p.wh === "game" ? "in a game" : p.wh === "queue" ? "in a queue" : "in the lobby")
                      : "")
                  : ago(p.mins)) +
                (p.srv ? '<br><span style="opacity:.75">' + esc(p.srv) + "</span>" : "") +
                "</div></div>"
              : "") +
            "</div>"
          );
        })
        .join("") +
      "</div>";
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
  if (!shut && staffServer.length) {
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
  // (TankTrouble's own staff get a tag next to their name, looked up from TankTrouble, for everyone)
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
  setInterval(() => {
    if (!document.hidden) {
      staffCheck();
      staffRun();
    }
  }, 4000);
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
    setInterval(() => {
      try {
        if (!document.hidden) {
          onlineFetch();
        }
      } catch {}
    }, 30000);
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
