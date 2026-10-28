import { applyLabView, labDraw, labOpen } from "./lab.js";
import { shareCall } from "./look-sharing.js";
import { toast } from "./panel.js";
import { SETTINGS, saveSettings } from "./storage.js";
import { CL_TEAM } from "./team-badges.js";
import { esc } from "./trophy-counting.js";
import { mdLite, verNewer } from "./updates.js";

let FORUM_DRAFT;
let annShown;
let annRead;
// ---------- Live announcements: sent by the Color Lab team from the server; every copy shows a new one once ----------
export let annBusy = false,
  annList = [];
export function annMark(ids) {
  let ch = false;
  for (const i of ids) {
    if (!annRead.has(String(i))) {
      annRead.add(String(i));
      ch = true;
    }
  }
  if (ch) {
    try {
      localStorage.setItem("ttclAnnRead", JSON.stringify([...annRead].slice(-80)));
    } catch {}
  }
}
export const annUnread = () => annList.filter((a) => !annRead.has(String(a.id))).length;
export const annLink = (u) => {
  try {
    const x = new URL(String(u || ""));
    if (x.protocol !== "https:") {
      return null;
    }
    const ok =
      (x.hostname === "github.com" && /^\/wazzey\//.test(x.pathname)) ||
      /(^|\.)tanktrouble\.com$/.test(x.hostname) ||
      (DEV_BUILD && ["discord.gg", "discord.com"].includes(x.hostname));
    return ok ? x.href : null;
  } catch {
    return null;
  }
}; // (buttons only lead to Color Lab's GitHub or TankTrouble)
const STORE_COPY = () => document.documentElement.dataset.ttclStore === "1"; // installed from the Chrome Web Store (set by bridge.js)
async function annShow(a) {
  // a new announcement: a box in the top right corner (up to 3 stacked, newest on top). It never covers the middle, dims the page or takes the keyboard,
  // and it closes by itself after 30 seconds (not while the mouse is on it). Closed without OK, it stays unread in Message Color Lab > Announcements
  if (!a || !a.id || annShown.has(String(a.id))) {
    return;
  }
  if (a.zipOnly && STORE_COPY()) {
    return;
  } // (for copies installed from GitHub only: the Chrome Web Store copy updates by itself)
  if (a.kind === "update") {
    // a new release, live: only for copies older than it (missed it? the update pop-up still comes at the next check)
    if (!a.tag || SETTINGS.updSkip === a.tag) {
      return;
    }
    const r = await shareCall({ op: "latest" }).catch(() => null);
    if (!r || !r.current || r.store || !verNewer(a.tag, r.current)) {
      return;
    } /* (a Chrome Web Store copy: the store updates it) */
    SETTINGS.updPending = a.tag;
    saveSettings();
  }
  if (annShown.has(String(a.id))) {
    return;
  }
  annShownAdd(a.id);
  if (!document.getElementById("ttclAnnCss")) {
    const st = document.createElement("style");
    st.id = "ttclAnnCss";
    st.textContent =
      "#ttclAnnWrap{position:fixed;top:62px;right:12px;width:310px;max-width:calc(100vw - 24px);z-index:2147483000;display:flex;flex-direction:column;gap:8px;pointer-events:none}" +
      ".ttclAnn{pointer-events:auto;position:relative;background:#101626;color:#e9edf7;border:2px solid #3f78ff;border-radius:9px;box-shadow:0 6px 18px rgba(0,0,0,.55);font:13px/1.45 Arial,sans-serif;overflow:hidden;animation:ttclAnnIn .25s ease-out;transition:opacity .3s,transform .3s}.ttclAnn.out{opacity:0;transform:translateX(40px)}" +
      "@keyframes ttclAnnIn{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}.ttclAnn .ah{display:flex;align-items:center;gap:6px;padding:6px 8px 6px 10px;background:linear-gradient(#427fff,#0014ab);color:#fff;font:15px TankTrouble,Arial,sans-serif}" +
      ".ttclAnn .ah span{flex:1;min-width:0;overflow-wrap:anywhere}.ttclAnn .ah small{font:11px Arial,sans-serif;opacity:.85;white-space:nowrap}.ttclAnn .ah span{font-size:14px}.ttclAnn .at{font:bold 14px Arial,sans-serif;margin:0 0 4px;color:#fff}.ttclAnn .af .lk{margin-right:auto;align-self:center;font:11px Arial,sans-serif;color:#9db8ff;cursor:pointer;text-decoration:underline}.ttclAnn .ax{background:none;border:0;color:#fff;font:bold 16px Arial;cursor:pointer;padding:0 2px;line-height:1}.ttclAnn .ab{max-height:min(30vh,220px);overflow-y:auto;overflow-x:hidden;overflow-wrap:anywhere;padding:7px 10px 4px}" +
      ".ttclAnn .ab ul{margin:4px 0 6px 18px;padding:0}.ttclAnn .ab li{margin:2px 0}.ttclAnn .af{display:flex;gap:6px;justify-content:flex-end;padding:4px 10px 9px}.ttclAnn .af button{font:13px TankTrouble,Arial,sans-serif;border:0;border-radius:5px;padding:3px 10px;cursor:pointer;color:#fff;background:linear-gradient(#427fff,#0014ab)}.ttclAnn .af button.alt{background:linear-gradient(#777,#444)}" +
      ".ttclAnn .tm{position:absolute;left:0;bottom:0;height:3px;background:#3f78ff;width:100%;transform-origin:left;animation:ttclAnnT 30s linear forwards}.ttclAnn:hover .tm{animation-play-state:paused}@keyframes ttclAnnT{to{transform:scaleX(0)}}";
    document.head.appendChild(st);
  }
  let wrap = document.getElementById("ttclAnnWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "ttclAnnWrap";
    (document.body || document.documentElement).appendChild(wrap);
  }
  const box = document.createElement("div");
  box.className = "ttclAnn";
  const upd = a.kind === "update";
  box.innerHTML =
    '<div class="ah"><span>' +
    (upd ? "✨ New Color Lab version" : "📢 Color Lab announcement") +
    ' <small>· just now</small></span><button class="ax" title="Later: close it for now (it stays in Message Color Lab &gt; Announcements)">✕</button></div>' +
    '<div class="ab"><div class="at">' +
    esc(String(a.title || "Color Lab").slice(0, 120)) +
    "</div>" +
    mdLite(String(a.body || "").slice(0, 3000)) +
    '</div><div class="af"></div><div class="tm" title="Closes by itself in 30 seconds. Point at the box to keep it open"></div>';
  let gone = false;
  const close = (read) => {
    if (gone) {
      return;
    }
    gone = true;
    if (read) {
      annMark([a.id]);
    }
    box.classList.add("out");
    setTimeout(() => box.remove(), 320);
  };
  const link = annLink(a.link),
    f = box.querySelector(".af");
  const btn = (t, alt, fn) => {
    const b = document.createElement("button");
    b.textContent = t;
    if (alt) {
      b.className = "alt";
    }
    b.tabIndex = -1;
    b.onmousedown = (e) => e.preventDefault();
    b.onclick = (e) => {
      e.stopPropagation();
      fn();
    };
    f.appendChild(b);
  }; // (buttons never take the keyboard: space and the arrows keep driving the tank)
  if (!upd) {
    const lk = document.createElement("span");
    lk.className = "lk";
    lk.textContent = "All announcements";
    lk.title = "Open Message Color Lab > Announcements";
    lk.onmousedown = (e) => e.preventDefault();
    lk.onclick = (e) => {
      e.stopPropagation();
      close(false);
      try {
        labOpen();
        applyLabView("ann");
        annMark(annList.map((x) => x.id));
        labDraw();
      } catch {}
    };
    f.appendChild(lk);
  }
  if (link) {
    btn(String(a.linkText || "Open").slice(0, 40), false, () => {
      window.open(link, "_blank", "noopener");
      close(true);
    });
  }
  btn(upd ? "Later" : "Got it", !!link, () => close(!upd));
  const x = box.querySelector(".ax");
  x.tabIndex = -1;
  x.onmousedown = (e) => e.preventDefault();
  x.onclick = (e) => {
    e.stopPropagation();
    close(true);
  };
  box.addEventListener("mousedown", (e) => {
    if (!e.target.closest("a,button")) {
      e.preventDefault();
    }
  }); // (clicking the box doesn't take focus from the game either)
  box.querySelector(".tm").addEventListener("animationend", () => close(false)); // (30 seconds without the mouse on it: it slides away, still unread in Announcements)
  wrap.insertBefore(box, wrap.firstChild);
  while (wrap.children.length > 3) {
    wrap.lastChild.remove();
  } // (newest on top, at most 3)
}
function annShownAdd(id) {
  annShown.add(String(id));
  try {
    localStorage.setItem("ttclAnnShown", JSON.stringify([...annShown].slice(-80)));
  } catch {}
}
async function annCheck() {
  // (the live connection brings announcements at once; this also asks every minute, for tabs without one)
  if (annBusy || document.hidden) {
    return;
  }
  annBusy = true;
  try {
    const r = await shareCall({ op: "announce" });
    if (r && r.ok && r.data && Array.isArray(r.data.list)) {
      annList = r.data.list.filter((x) => !(x && x.zipOnly && STORE_COPY())).slice(0, 20);
    }
    if (r && r.ok && r.data && r.data.team && typeof r.data.team === "object") {
      for (const k of Object.keys(CL_TEAM)) {
        delete CL_TEAM[k];
      }
      for (const [k, v] of Object.entries(r.data.team).slice(0, 20)) {
        if (/^\d{1,12}$/.test(k) && Array.isArray(v)) {
          CL_TEAM[k] = [
            esc(String(v[0] || "Color Lab").slice(0, 24)),
            esc(String(v[1] || "").slice(0, 80)),
            v[2] === "dev" ? "dev" : "",
            String(v[3] || "DEV")
              .replace(/[^\w .+-]/g, "")
              .slice(0, 12),
          ];
        }
      }
    }
    /* (who wears the Color Lab badge comes from the server) */ annShow(r && r.ok && r.data && r.data.ann);
  } catch {
  } finally {
    annBusy = false;
  }
}

export function startAnnouncements() {
  FORUM_DRAFT = DEV_BUILD ? (/[#&]ttcl-draft=(\d{1,12})/.exec(location.hash) || [])[1] || null : null; // (DEV build: a forum reply typed in Discord, read before the forum tidies the address)
  annShown = new Set(
    (() => {
      try {
        return JSON.parse(localStorage.getItem("ttclAnnShown") || "[]");
      } catch {
        return [];
      }
    })().map(String),
  ); // (announcements already popped up on this computer: each pops up once)
  annRead = new Set(
    (() => {
      try {
        return JSON.parse(localStorage.getItem("ttclAnnRead") || "[]");
      } catch {
        return [];
      }
    })().map(String),
  );
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.__ttcl !== true || d.dir !== "toPage" || d.type !== "annLive") {
      return;
    }
    try {
      annShow(d.ann);
      if (d.ann && d.ann.kind !== "update") {
        setTimeout(annCheck, 2500);
      }
    } catch {}
  }); // (and the Announcements list in Message Color Lab gets it too)
  setTimeout(annCheck, 5000);
  setInterval(annCheck, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      setTimeout(annCheck, 1500);
    }
  });
  // The owner's DEV copy: a forum reply typed in Discord (its link ends in #ttcl-draft=N) is filled into the forum's reply box, ready to Post
  if (DEV_BUILD && FORUM_DRAFT && /\/forum/.test(location.pathname)) {
    (async () => {
      const r = await shareCall({ op: "fdraft", fid: FORUM_DRAFT }).catch(() => null);
      const text = r && r.ok && r.data && r.data.text;
      if (!text) {
        if (r) {
          toast("Couldn't get that reply from the server (it may be over a week old)", true);
        }
        return;
      }
      for (let n = 0; n < 40; n++) {
        const ta = [...document.querySelectorAll("textarea")].find(
          (t) => t.offsetParent && /write a reply/i.test(t.placeholder || ""),
        );
        if (ta) {
          if (!ta.value.trim()) {
            ta.focus();
            ta.value = text;
            ta.dispatchEvent(new Event("input", { bubbles: true }));
            ta.dispatchEvent(new Event("change", { bubbles: true }));
          }
          ta.scrollIntoView({ block: "center" });
          toast("📝 Your reply from Discord is filled in: check it and press Post");
          return;
        }
        await new Promise((res) => setTimeout(res, 500));
      }
      try {
        await navigator.clipboard.writeText(text);
        toast("Couldn't find the reply box: your reply is copied, paste it in");
      } catch {
        toast("Couldn't find the reply box", true);
      }
    })().catch(() => {});
  }
}
