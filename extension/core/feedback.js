import { loggedInIds } from "./game-socket.js";
import { shareCall, shareMine } from "./look-sharing.js";
import { $, panel, toast } from "./panel.js";
import { isAway, isIdle, quietFor, ttWhere } from "./presence.js";
import { SETTINGS, saveSettings } from "./storage.js";
import { showTab } from "./tabs.js";
import { esc } from "./trophy-counting.js";

// ---------- Feedback & reports: sent to the Color Lab team; their replies show up here ----------
export let fbImages = [],
  fbAbout = null,
  fbItems = []; // (up to 3 screenshots a message)
export function fbShowImages() {
  const p = $("fbPrev");
  if (!p) {
    return;
  }
  p.innerHTML = "";
  fbImages.forEach((d, n) => {
    const w = document.createElement("span");
    w.style.cssText = "position:relative;display:inline-block;margin-right:4px";
    const im = document.createElement("img");
    im.src = d;
    im.style.cssText = "height:34px;border:1px solid #555;border-radius:3px;vertical-align:middle";
    const x = document.createElement("button");
    x.className = "small grey";
    x.textContent = "✕";
    x.title = "Remove this screenshot";
    x.style.cssText = "padding:0 4px;margin-left:2px";
    x.onclick = () => {
      fbImages.splice(n, 1);
      fbShowImages();
    };
    w.append(im, x);
    p.appendChild(w);
  });
  const add = $("fbPic");
  if (add) {
    add.disabled = fbImages.length >= 3;
  }
  try {
    if (window.__ttclLabImgs) {
      window.__ttclLabImgs();
    }
  } catch {}
}
export function fbSetImage(dataUrl) {
  if (!dataUrl) {
    fbImages = [];
  } else if (fbImages.length < 3) {
    fbImages.push(dataUrl);
  } else {
    const m = $("fbMsg");
    if (m) {
      m.textContent = "3 screenshots at most";
    }
  }
  fbShowImages();
}
export function fbReadImage(file) {
  // a PNG or JPEG under 2 MB (bigger pictures are shrunk)
  if (!file || !/^image\//.test(file.type)) {
    return;
  }
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      let d = String(fr.result);
      if (d.length > 2.6e6 || !/^data:image\/(png|jpeg)/.test(d)) {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height)),
          c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        d = c.toDataURL("image/jpeg", 0.85);
      }
      fbSetImage(d);
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}
export let fbMe = null;
function fbRender() {
  const L = $("fbList");
  if (!L) {
    return;
  }
  L.innerHTML = "";
  const msgs = [];
  for (const it of fbItems) {
    msgs.push({ me: true, text: it.text, at: it.at, id: it.id });
    for (const r of it.replies) {
      msgs.push({ me: false, text: r.text, at: r.at, id: it.id });
    }
  }
  msgs.sort((a, b) => a.at - b.at);
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
  if (!msgs.length) {
    L.innerHTML = '<small class="mzsub" style="display:block;text-align:center">No messages yet</small>';
  }
  for (const m of msgs) {
    const d = document.createElement("div");
    d.className = m.me ? "fbMe" : "fbCl"; // (your messages light grey, Color Lab's replies blue, like the game's message laboratory; with a page theme, in its colours)
    d.style.cssText =
      "margin:0 0 6px;padding:5px 8px;border-radius:4px;font:12px/1.4 Arial;" +
      (m.me
        ? "background:linear-gradient(#f2f2f2,#d9d9d9);color:#111"
        : "background:linear-gradient(#4a8bff,#1a3fd0);color:#fff");
    d.innerHTML =
      '<div class="fbH" style="display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid ' +
      (m.me ? "#bbb" : "rgba(255,255,255,.35)") +
      ';padding-bottom:2px;margin-bottom:3px"><span>Message from <b>' +
      esc(m.me ? fbMe || "you" : "Color Lab") +
      "</b></span><span>" +
      ago(m.at) +
      '</span></div><div style="white-space:pre-wrap;overflow-wrap:anywhere">' +
      esc(m.text) +
      "</div>";
    L.appendChild(d);
  }
  L.scrollTop = L.scrollHeight; // (newest at the bottom, next to the box)
  const unread = fbItems.reduce((n, it) => n + it.replies.length, 0) - (SETTINGS.fbSeen || 0),
    h = $("fbHdr");
  if (h) {
    h.innerHTML =
      "Feedback &amp; reports 📨" +
      (unread > 0
        ? ' <span style="background:#e33;color:#fff;border-radius:8px;padding:0 6px;font-size:11px">' +
          unread +
          " new</span>"
        : "");
  }
}
function ttServerName() {
  // the TankTrouble server picked in the game's settings (London, Newark...)
  try {
    const id = (document.cookie.match(/(?:^|; )multiplayerserverid=([^;]+)/) || [])[1];
    if (!id) {
      return "";
    }
    const o = [...document.querySelectorAll("option")].find((x) => x.value === id);
    if (o && o.textContent.trim()) {
      return o.textContent.trim().slice(0, 24);
    }
    return (
      {
        "us-east1-mp2": "Newark",
        "eu-west1-mp1": "London",
        "asia-central1-mp1": "Singapore",
        "us-south1-mp1": "Dallas",
        "us-east2-mp1": "Atlanta",
        "us-west1-mp1": "Fremont",
        "australia-east1-mp1": "Sydney",
      }[id] || id.slice(0, 24)
    );
  } catch {
    return "";
  }
}
export async function fbRefresh(seen) {
  // ("Share my look" off: no accounts, server or idle status go with the check)
  const inv = SETTINGS.invisible === true; // (invisible: not shown or counted for other players)
  const r = await shareCall(
    shareMine()
      ? {
          op: "fblist",
          pids: loggedInIds().map(String).slice(0, 4),
          srv: ttServerName(),
          idle: isIdle(),
          away: isAway(),
          wh: ttWhere(),
          ifor: quietFor(),
          inv,
          show: !inv && SETTINGS.showOnline === true,
          shsrv: !inv && SETTINGS.showServer === true,
        }
      : { op: "fblist", inv, show: false },
  ).catch(() => null);
  if (!r || !r.ok || !r.data || !Array.isArray(r.data.items)) {
    return;
  }
  const before = fbItems.reduce((n, it) => n + it.replies.length, 0);
  fbItems = r.data.items;
  fbMe = r.data.me || fbMe;
  const now = fbItems.reduce((n, it) => n + it.replies.length, 0);
  if ((now > before && before > 0) || (now > (SETTINGS.fbSeen || 0) && !seen && !fbRefresh.told)) {
    fbRefresh.told = true;
    const last = fbItems.flatMap((it) => it.replies).sort((a, b) => b.at - a.at)[0];
    if (last && now > (SETTINGS.fbSeen || 0)) {
      toast("📨 Reply from Color Lab: " + String(last.text).slice(0, 120) + " (⚙ Settings > Feedback)");
    }
  }
  if (seen) {
    SETTINGS.fbSeen = now;
    saveSettings();
  }
  fbRender();
}
export function fbFast() {
  // just after sending: look for a reply every 20 seconds for 15 minutes (then every 5 minutes again)
  clearInterval(fbFast.t);
  let n = 0;
  fbFast.t = setInterval(() => {
    if (++n > 45) {
      clearInterval(fbFast.t);
    }
    try {
      fbRefresh(!!(panel.classList.contains("open") && !$("paneSet").hidden));
    } catch {}
  }, 20000);
}
export function fbOpen(aboutId) {
  fbAbout = aboutId || null;
  showTab("settings");
  const l = $("fbAboutLbl");
  if (l) {
    l.hidden = !fbAbout;
    l.textContent = fbAbout ? "About tank " + fbAbout + " (from its profile)" : "";
  }
  const t = $("fbText");
  if (t) {
    t.scrollIntoView({ block: "center" });
    t.focus();
  }
}
export const fbWords = (t) => (t.match(/[\p{L}\p{N}]{2,}/gu) || []).length;
const fbCount = () => {
  const t = $("fbText").value,
    w = fbWords(t),
    m = $("fbMsg");
  $("fbSend").disabled = w < 5;
  if (m && !/Sent|Sending|Not sent/.test(m.textContent)) {
    m.textContent = w < 5 ? "Describe what's going on (" + w + "/5 words)" : t.length + "/1500";
  }
};

export function startFeedback() {
  $("fbPic").onclick = () => $("fbFile").click();
  $("fbFile").onchange = (e) => {
    [...e.target.files].slice(0, 3 - fbImages.length).forEach(fbReadImage);
    e.target.value = "";
  };
  $("fbText").addEventListener("paste", (e) => {
    const fs = [...((e.clipboardData && e.clipboardData.files) || [])].filter((x) => /^image\//.test(x.type));
    if (fs.length) {
      e.preventDefault();
      fs.slice(0, 3 - fbImages.length).forEach(fbReadImage);
    }
  });
  $("fbText").addEventListener("input", fbCount);
  setTimeout(() => {
    try {
      fbCount();
    } catch {}
  }, 0);
  $("fbSend").onclick = async () => {
    const text = $("fbText").value.trim(),
      msg = $("fbMsg");
    if (fbWords(text) < 5) {
      msg.textContent = "Please describe what's going on in at least 5 words";
      return;
    }
    const b = $("fbSend");
    b.disabled = true;
    msg.textContent = "Sending…";
    const r = await shareCall({
      op: "fbsend",
      text,
      images: fbImages.length ? fbImages.slice(0, 3) : undefined,
      pids: loggedInIds().filter((id) => /^\d+$/.test(id)),
      about: fbAbout || undefined,
      kind: fbAbout ? "report" : "feedback",
    }).catch(() => null);
    b.disabled = false;
    if (r && r.ok) {
      msg.textContent = "✓ Sent. Thank you!";
      $("fbText").value = "";
      fbSetImage(null);
      fbAbout = null;
      $("fbAboutLbl").hidden = true;
      fbRefresh(true);
      fbFast();
    } else {
      msg.textContent =
        r && r.data && r.data.error ? "Not sent: " + r.data.error : "Not sent: couldn't reach the server";
    }
  };
}
