import { PAGE_GAMES } from "../content/page-themes.js";
import { NAME_TO_ID } from "./look-sharing.js";
import { SETTINGS } from "./storage.js";

// "Message Color Lab" laid out like the game's own message laboratory (a box on the right, then a full-page chat to
// write to the author and read replies)
export const D = (id) => document.getElementById(id);
// The Color Lab team's accounts get a badge by their name (in the Color Lab online list and on the forum)
export const CL_TEAM = {}; // (who wears the Color Lab badge comes from the server)
const CL_MINI =
  '<svg viewBox="0 0 32 32" width="11" height="11" style="vertical-align:-1px;margin-right:2px"><circle cx="16" cy="16" r="15" fill="#1d2b3a" stroke="#27c4a8" stroke-width="3"/><circle cx="11" cy="11" r="4.6" fill="#ef4444"/><circle cx="21" cy="11" r="4.6" fill="#facc15"/><circle cx="11" cy="21" r="4.6" fill="#3b82f6"/><circle cx="21" cy="21" r="4.6" fill="#22c55e"/></svg>';
const CL_DEV_SVG =
  '<rect x="2" y="4" width="28" height="24" rx="4" fill="#000" stroke="#22c55e" stroke-width="2.5"/><path d="M8 12 L13 16 L8 20" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="15" y="19" width="9" height="3" fill="#4ade80"/>'; // the developer's badge: a terminal >_
const CL_DEV_MINI =
  '<svg viewBox="0 0 32 32" width="11" height="11" style="vertical-align:-1px;margin-right:2px">' +
  CL_DEV_SVG +
  "</svg>";
export function clBadge(pid, px, mini) {
  const t = CL_TEAM[String(pid)];
  if (!t) {
    return "";
  }
  const dev = t[2] === "dev";
  if (mini) {
    return (
      '<span class="ttclTeam" title="' + t[1] + '" style="margin-left:2px">' + (dev ? CL_DEV_MINI : CL_MINI) + "</span>"
    );
  }
  if (dev) {
    return (
      '<span class="ttclTeam" title="' +
      t[1] +
      '" style="display:inline-block;white-space:nowrap;font:bold ' +
      (px || 9) +
      'px Consolas,monospace;line-height:1.35;padding:0 5px 0 3px;margin-left:3px;border-radius:7px;color:#4ade80;text-shadow:none;vertical-align:1px;background:linear-gradient(#111,#000);box-shadow:0 0 0 1px #22c55e">' +
      CL_DEV_MINI +
      "&gt;_ " +
      t[0] +
      "</span>"
    );
  }
  return (
    '<span class="ttclTeam" title="' +
    t[1] +
    '" style="display:inline-block;white-space:nowrap;font:bold ' +
    (px || 9) +
    'px Arial,sans-serif;line-height:1.35;padding:0 4px 0 2px;margin-left:3px;border-radius:7px;color:#fff;text-shadow:none;vertical-align:1px;background:linear-gradient(#2a3d52,#16212e);box-shadow:0 0 0 1px #27c4a8">' +
    CL_MINI +
    t[0] +
    "</span>"
  );
}
const CL_STAR = (t) =>
  '<span class="ttclTeamI" title="' +
  t[1] +
  '" style="position:absolute;right:-4%;top:-4%;width:30%;max-width:34px;min-width:12px;aspect-ratio:1;z-index:5;pointer-events:auto;filter:drop-shadow(0 1px 1px rgba(0,0,0,.6))"><svg viewBox="0 0 32 32" width="100%" height="100%">' +
  (t[2] === "dev"
    ? CL_DEV_SVG
    : '<circle cx="16" cy="16" r="15" fill="#1d2b3a" stroke="#27c4a8" stroke-width="2.5"/><circle cx="11" cy="11" r="4.4" fill="#ef4444"/><circle cx="21" cy="11" r="4.4" fill="#facc15"/><circle cx="11" cy="21" r="4.4" fill="#3b82f6"/><circle cx="21" cy="21" r="4.4" fill="#22c55e"/>') +
  "</svg></span>";
// in the game itself (lobby, player panel, score bar): the team's name gets a "(DEV) " tag and their tank the badge on its corner, where the game's old GM star went
const CL_TAG_IMG = {};
function clTagImg(kind) {
  if (CL_TAG_IMG[kind]) {
    return CL_TAG_IMG[kind];
  }
  const im = new Image();
  im.src =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128">' +
        (kind === "dev"
          ? CL_DEV_SVG
          : '<circle cx="16" cy="16" r="15" fill="#1d2b3a" stroke="#27c4a8" stroke-width="2.5"/><circle cx="11" cy="11" r="4.4" fill="#ef4444"/><circle cx="21" cy="11" r="4.4" fill="#facc15"/><circle cx="11" cy="21" r="4.4" fill="#3b82f6"/><circle cx="21" cy="21" r="4.4" fill="#22c55e"/>') +
        "</svg>",
    );
  return (CL_TAG_IMG[kind] = im);
}
function clTagGame(g) {
  const walk = (o, d) => {
    const ch = o && o.children;
    if (!ch || d > 9) {
      return;
    }
    for (const c of ch) {
      try {
        if (c.playerId != null) {
          clTagOne(g, c);
        }
      } catch {}
      walk(c, d + 1);
    }
  };
  walk(g.world, 0);
}
function clTagOne(g, c) {
  const t = SETTINGS.on ? CL_TEAM[String(c.playerId)] : null;
  if (c.tankName && typeof c.tankName.text === "string") {
    const tn = c.tankName,
      pre = t ? "(" + (t[3] || "DEV") + ") " : "",
      cur = tn.text,
      base = tn.__ttclPre && cur.startsWith(tn.__ttclPre) ? cur.slice(tn.__ttclPre.length) : cur;
    if (cur !== pre + base) {
      tn.text = pre + base;
    }
    tn.__ttclPre = pre;
    return;
  }
  const sp = c.children && c.children[0];
  if (!sp || !(sp.width > 20) || !/tankicon/i.test(String(sp.key || ""))) {
    return;
  }
  /* (only the tank icons, never the tanks driving in the maze) */ const kind = t
    ? t[2] === "dev"
      ? "dev"
      : "lab"
    : "";
  if (c.__ttclB && (c.__ttclB.__k !== kind || !c.__ttclB.parent)) {
    try {
      c.__ttclB.destroy();
    } catch {}
    c.__ttclB = null;
  }
  if (!kind || c.__ttclB) {
    return;
  }
  const im = clTagImg(kind);
  if (!im.complete || !im.naturalWidth) {
    return;
  }
  const key = "ttclTag-" + kind;
  if (!g.cache.checkImageKey(key)) {
    g.cache.addImage(key, null, im);
  }
  const W = Math.abs(sp.width),
    H = Math.abs(sp.height),
    b = g.make.image(sp.x + W * 0.33, sp.y + H * 0.31, key);
  b.anchor.set(0.5);
  b.width = b.height = W * 0.17;
  b.__k = kind;
  c.addChild(b);
  c.__ttclB = b;
}

export function startTeamBadges() {
  setInterval(() => {
    try {
      if (!/^\/forum/.test(location.pathname)) {
        return;
      } // the forum: a badge under the team's names
      for (const n of document.querySelectorAll(".tank stroked-player-name[data-player-id]")) {
        const id = n.getAttribute("data-player-id");
        if (!CL_TEAM[id] || (n.nextElementSibling && n.nextElementSibling.classList.contains("ttclTeamF"))) {
          continue;
        }
        const b = document.createElement("div");
        b.className = "ttclTeamF";
        b.style.cssText =
          "text-align:center;margin-top:3px;pointer-events:auto;position:relative;top:" +
          (parseFloat(getComputedStyle(n).top) || 0) +
          "px";
        b.innerHTML = clBadge(id, 10);
        n.after(b); /* (right under the name: the forum lifts the name up a little, so the badge goes up with it) */
      }
    } catch {}
  }, 1500);
  setInterval(() => {
    try {
      // the Color Lab team's tanks wear the Color Lab badge, like the game's old moderator star (seen by Color Lab users)
      const forum = /^\/forum/.test(location.pathname); // (the forum has the badge under the name instead)
      for (const ic of document.querySelectorAll("tank-icon[data-player-id]")) {
        const t = forum ? null : CL_TEAM[ic.getAttribute("data-player-id")];
        const has = ic.querySelector(":scope > .ttclTeamI");
        if (!t) {
          if (has) {
            has.remove();
          }
          continue;
        }
        if (has || !SETTINGS.on) {
          continue;
        }
        if (getComputedStyle(ic).position === "static") {
          ic.style.position = "relative";
        }
        ic.insertAdjacentHTML("beforeend", CL_STAR(t));
      }
      // the badge sits on the tank picture's top-right corner (the tank-icon box itself is only the name's height: the picture overflows it)
      for (const b of document.querySelectorAll("tank-icon[data-player-id] > .ttclTeamI")) {
        const ic = b.parentElement,
          cv = ic.querySelector(":scope > canvas, :scope > img");
        if (!cv) {
          continue;
        }
        const ir = ic.getBoundingClientRect(),
          cr = cv.getBoundingClientRect();
        if (!cr.width || !ir.width) {
          continue;
        }
        const z = Math.round(Math.max(12, Math.min(26, cr.width * 0.19)));
        const st =
          "width:" +
          z +
          "px;max-width:none;min-width:0;right:auto;left:" +
          Math.round(cr.right - ir.left - z * 0.9) +
          "px;top:" +
          Math.round(cr.top - ir.top + cr.height * 0.06) +
          "px";
        if (b.dataset.pos !== st) {
          b.dataset.pos = st;
          b.style.cssText += ";" + st;
        }
      }
      // and in a tank's profile box: the badge under the name (for everyone with Color Lab, the team's own copies too)
      const box = document.getElementById("tankinfo"),
        shown = box && box.getClientRects().length,
        un = shown && box.querySelector(".username"),
        nm = un && (un.querySelector("stroked-text") || {}).getAttribute?.("text");
      const pid = nm ? NAME_TO_ID[nm] : null,
        have = box && box.querySelector(".ttclTeamP");
      if (!pid || !CL_TEAM[pid] || !SETTINGS.on) {
        if (have) {
          have.remove();
        }
      } else if (!have || have.dataset.pid !== pid) {
        if (have) {
          have.remove();
        }
        const d = document.createElement("div");
        d.className = "ttclTeamP";
        d.dataset.pid = pid;
        d.style.cssText = "text-align:center;margin:3px 0 4px;pointer-events:auto";
        d.innerHTML = clBadge(pid, 11);
        un.after(d);
      }
    } catch {}
  }, 1500);
  setInterval(() => {
    for (const g of [...PAGE_GAMES]) {
      try {
        if (g && g.world && !g.pendingDestroy && !(g.canvas && g.canvas.closest(".garage"))) {
          clTagGame(g);
        } // (never on the tank in the garage)
      } catch {}
    }
  }, 1000);
}
