import { annLink, annList, annMark, annUnread } from "./announcements.js";
import {
  fbFast,
  fbImages,
  fbItems,
  fbMe,
  fbReadImage,
  fbRefresh,
  fbSender,
  fbSetImage,
  fbShowImages,
  fbWords,
  populateSendAs,
} from "./feedback.js";
import { loggedInIds } from "./game-socket.js";
import { shareCall } from "./look-sharing.js";
import { pageKeyNow, pagePal } from "./page.js";
import { $, toast } from "./panel.js";
import { SETTINGS, saveSettings } from "./storage.js";
import { D } from "./team-badges.js";
import { esc } from "./trophy-counting.js";
import { mdLite } from "./updates.js";

const LAB_ICON =
  '<svg viewBox="0 0 32 32" width="26" height="26" style="vertical-align:middle"><circle cx="16" cy="16" r="15" fill="#1d2b3a" stroke="#27c4a8" stroke-width="2"/><circle cx="11" cy="11" r="4.2" fill="#ef4444"/><circle cx="21" cy="11" r="4.2" fill="#facc15"/><circle cx="11" cy="21" r="4.2" fill="#3b82f6"/><circle cx="21" cy="21" r="4.2" fill="#22c55e"/></svg>';
export let labView = "mine",
  labOlder = false,
  labThread = null,
  labThreads = null,
  labItems = null,
  labAdmin = null,
  labAlerts = [],
  labAlertNew = 0;
export const applyLabView = (view) => {
  labView = view;
};
// server alerts in the game too (Discord gets them anyway): new serious ones pop up as a message, and ⚠ in the online box lists them
async function labAlertPoll() {
  const r = await shareCall({ op: "alerts" }).catch(() => null);
  if (!r || !r.ok || !r.data) {
    return;
  }
  labAlerts = r.data.alerts || [];
  const seen = SETTINGS.alertSeen || 0,
    fresh = labAlerts.filter((a) => a.at > seen);
  labAlertNew = fresh.length;
  const urgent = fresh.filter((a) => a.urgent && a.at > (labAlertPoll.told || seen));
  if (urgent.length) {
    labAlertPoll.told = urgent[0].at;
    toast(
      "🚨 " +
        urgent[0].kind +
        ": " +
        String(urgent[0].text).slice(0, 140) +
        (urgent.length > 1 ? " (+" + (urgent.length - 1) + " more, ⚠ in the Color Lab box)" : ""),
      true,
    );
  }
  if (D("ttclLab") && labView === "alerts") {
    labDraw();
  }
}
export function labAlertSeen() {
  SETTINGS.alertSeen = Date.now();
  saveSettings();
  labAlertNew = 0;
}
const labAgo = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1
    ? "just now"
    : m < 60
      ? m + " minute" + (m === 1 ? "" : "s") + " ago"
      : m < 1440
        ? Math.round(m / 60) + " hour" + (Math.round(m / 60) === 1 ? "" : "s") + " ago"
        : m < 525600
          ? Math.round(m / 1440) + " day" + (Math.round(m / 1440) === 1 ? "" : "s") + " ago"
          : Math.round(m / 525600) + " years ago";
};
function labCss() {
  const P = pageKeyNow ? pagePal(pageKeyNow) : null;
  const me = P
      ? "linear-gradient(" + P.panel + "," + P.panel2 + ");color:" + P.ink
      : "linear-gradient(#eee,#ccc);color:#000",
    meLine = P ? P.accent + "88" : "#000";
  const cl = P ? "linear-gradient(" + P.pBtnTop + "," + P.pBtnBot + ")" : "linear-gradient(#427fff,#0014ab)";
  return `#ttclLab{position:fixed;inset:0;z-index:2147482000;background:rgba(8,5,3,.74);overflow-y:auto;color:#fff;text-align:center;font-family:Arial,sans-serif}
#ttclLab .col{width:600px;max-width:94vw;margin:28px auto 70px}#ttclLab .x{position:fixed;top:14px;right:22px;z-index:2}
#ttclLab .msg{background:${me};border-radius:5px;margin:20px auto;padding:3px;text-align:left;overflow-wrap:break-word;font-size:16px}
#ttclLab .msg .hd{border-bottom:1px solid ${meLine};margin:5px;padding-bottom:5px}#ttclLab .msg .ts{float:right}#ttclLab .msg .bd{margin:5px;white-space:pre-wrap}
#ttclLab .msg.imp{background:${cl};color:#fff}#ttclLab .msg.imp .hd{border-color:#fff}#ttclLab .nm{font-family:TankTrouble,Arial;font-size:19px}
#ttclLab h2{font:40px Arial,sans-serif;margin:34px 0 8px}#ttclLab .sub{font-size:19px;margin:0 0 14px}
#ttclLab textarea{box-sizing:border-box;width:100%;min-height:86px;background:#000;color:#fff;border:3px solid #9a9a9a;border-radius:9px;padding:10px 14px;font:16px monospace;resize:vertical}
#ttclLab .row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:6px 0 10px;font-size:13px;opacity:.9}
#ttclLab .tabs{display:flex;justify-content:center;gap:8px;margin:0 0 6px}#ttclLab .thr{cursor:pointer}#ttclLab .thr:hover{filter:brightness(1.07)}#ttclLab .thr.rd{opacity:.7}
#ttclLab .pv img{height:46px;border-radius:4px;border:1px solid #777;vertical-align:middle}#ttclLab .pv span{display:inline-block;margin:0 6px 6px 0}
#ttclLab .badge{background:#e33;color:#fff;border-radius:9px;padding:0 7px;font-size:12px;margin-left:4px}`;
}
function labBubble(me, who, at, text) {
  return (
    '<div class="msg' +
    (me ? "" : " imp") +
    '"><div class="hd"><span class="ts">' +
    labAgo(at) +
    "</span>Message from " +
    (me
      ? '<span class="nm">' + esc(who) + "</span>"
      : LAB_ICON.replace('width="26" height="26"', 'width="20" height="20"') + ' <span class="nm">Color Lab</span>') +
    '</div><div class="bd">' +
    esc(text) +
    "</div></div>"
  );
}
function labMsgs(items, who) {
  const m = [];
  for (const it of items || []) {
    m.push({ me: true, who: it.who || who, text: it.text, at: it.at, id: it.id });
    for (const r of it.replies || []) {
      m.push({ me: false, text: r.text, at: r.at });
    }
  }
  return m.sort((a, b) => a.at - b.at);
}
export async function labLoadAdmin() {
  const r = await shareCall({ op: "inbox", act: "list" }).catch(() => null);
  labAdmin = !!(r && r.ok);
  labThreads = labAdmin ? r.data.threads : null;
}
export function labOpen() {
  let L = D("ttclLab");
  if (!L) {
    L = document.createElement("div");
    L.id = "ttclLab";
    document.body.appendChild(L);
    L.addEventListener("click", (e) => {
      if (e.target === L) {
        labClose();
      }
    });
    document.addEventListener("keydown", labKey);
    ["keydown", "keyup", "keypress"].forEach((t) =>
      L.addEventListener(t, (e) => {
        if (e.key !== "Escape") {
          e.stopPropagation();
        }
      }),
    );
  } // (typing here never reaches the game: space and the arrows stay in the box)
  labView = "mine";
  labThread = null;
  labOlder = false;
  labDraw();
  fbRefresh(true)
    .then(() => labDraw())
    .catch(() => {});
  if (DEV_BUILD) {
    labLoadAdmin()
      .then(() => labDraw())
      .catch(() => {});
  }
}
function labKey(e) {
  if (e.key === "Escape" && D("ttclLab")) {
    labClose();
  }
}
function labClose() {
  const L = D("ttclLab");
  if (L) {
    L.remove();
  }
  document.removeEventListener("keydown", labKey);
  window.__ttclLabImgs = null;
}
export function labDraw() {
  const L = D("ttclLab");
  if (!L) {
    return;
  }
  let st = D("ttclLabCss");
  if (!st) {
    st = document.createElement("style");
    st.id = "ttclLabCss";
    document.head.appendChild(st);
  }
  st.textContent = labCss();
  const open = (labThreads || []).reduce((n, t) => n + (t.unread ? 1 : 0), 0);
  let h = '<button class="warning medium x" data-k="close" title="Close">×</button><div class="col">';
  const an = annUnread();
  if (!labAdmin) {
    h +=
      '<div class="tabs"><button class="medium' +
      (labView === "ann" ? " grey" : "") +
      '" data-k="mine">My messages</button><button class="medium' +
      (labView === "ann" ? "" : " grey") +
      '" data-k="ann">📢 Announcements' +
      (an ? '<span class="badge">' + an + "</span>" : "") +
      "</button></div>";
  }
  if (DEV_BUILD && labAdmin) {
    h +=
      '<div class="tabs"><button class="medium' +
      (labView === "mine" ? "" : " grey") +
      '" data-k="mine">My messages</button><button class="medium' +
      (labView === "inbox" || labView === "thread" ? "" : " grey") +
      '" data-k="inbox">Inbox' +
      (open ? '<span class="badge">' + open + "</span>" : "") +
      '</button><button class="medium' +
      (labView === "alerts" ? "" : " grey") +
      '" data-k="alerts">⚠ Alerts' +
      (labAlertNew ? '<span class="badge">' + labAlertNew + "</span>" : "") +
      '</button><button class="medium' +
      (labView === "ann" ? "" : " grey") +
      '" data-k="ann">📢' +
      (an ? '<span class="badge">' + an + "</span>" : "") +
      "</button></div>";
  }
  if (DEV_BUILD && labView === "alerts") {
    h +=
      '<h2 style="margin-top:14px">⚠ Alerts</h2><div class="sub">From the server, last 2 days (🚨 = serious, also pinged on Discord)</div>' +
      (labAlerts
        .map(
          (a) =>
            '<div class="msg' +
            (a.urgent ? " imp" : "") +
            '"' +
            (a.urgent ? ' style="background:linear-gradient(#e0474f,#8f1219)"' : "") +
            '><div class="hd"><span class="ts">' +
            labAgo(a.at) +
            "</span>" +
            (a.urgent ? "🚨 " : "") +
            "<b>" +
            esc(a.kind) +
            '</b></div><div class="bd">' +
            esc(a.text) +
            "</div>" +
            (a.kind === "blocked message" && /^From [0-9a-f]{10}/.test(a.text)
              ? '<button class="medium grey" data-k="unmute" data-id="' +
                a.text.slice(5, 15) +
                '">Let them message again</button>'
              : "") +
            "</div>",
        )
        .join("") || '<div class="sub">Nothing in the last 2 days.</div>');
  } else if (DEV_BUILD && labView === "inbox") {
    // every player's messages, newest first; unread ones (still waiting for a reply, or marked unread) stand out
    h +=
      '<h2 style="margin-top:14px">Inbox</h2><div class="sub">Messages from Color Lab players. Click one to read it and reply, or mark it read once it\'s dealt with.</div>';
    h +=
      (labThreads || [])
        .map(
          (t) =>
            '<div class="msg thr' +
            (t.unread ? "" : " rd") +
            '" data-k="thread" data-id="' +
            esc(t.id) +
            '"><div class="hd"><span class="ts">' +
            labAgo(t.at) +
            '</span><span class="nm">' +
            esc(t.who || "Player") +
            "</span> · " +
            t.n +
            " message" +
            (t.n === 1 ? "" : "s") +
            (t.open
              ? t.unread
                ? '<span class="badge">' + t.open + " to answer</span>"
                : " · " + t.open + " to answer"
              : " · answered") +
            ' <button class="small grey" data-k="mark" data-id="' +
            esc(t.id) +
            '" data-read="' +
            (t.unread ? "1" : "") +
            '">' +
            (t.unread ? "Mark read" : "Mark unread") +
            "</button>" +
            '</div><div class="bd">' +
            esc(t.text) +
            "</div></div>",
        )
        .join("") || '<div class="sub">No messages yet.</div>';
  } else if (DEV_BUILD && labView === "thread") {
    const msgs = labMsgs(labItems, ""),
      th = (labThreads || []).find((t) => t.id === labThread);
    h +=
      '<button class="medium" data-k="inbox">← Back to the inbox</button>' +
      (th
        ? ' <button class="medium grey" data-k="mark" data-id="' +
          esc(th.id) +
          '" data-read="' +
          (th.unread ? "1" : "") +
          '">' +
          (th.unread ? "Mark read" : "Mark unread") +
          "</button>"
        : "") +
      msgs.map((m) => labBubble(m.me, m.who, m.at, m.text)).join("");
    h +=
      '<h2>Reply as Color Lab</h2><div class="sub">They see it in Color Lab (and it\'s posted in Discord too).</div><textarea id="labText" maxlength="1500" placeholder="Reply"></textarea><div class="row"><span id="labMsg"></span><span id="labCount">0/1500</span></div><button class="medium" data-k="reply">Send reply</button>';
  } else if (labView === "ann") {
    // announcements from the Color Lab team, newest first (also the ones that popped up while you were away)
    h +=
      '<h2 style="margin-top:14px">📢 Announcements</h2><div class="sub">News from the Color Lab team, last 90 days.</div>';
    h +=
      annList
        .map((a) => {
          const lk = annLink(a.link);
          return (
            '<div class="msg"><div class="hd"><span class="ts">' +
            labAgo(a.at) +
            "</span><b>" +
            esc(String(a.title || "Color Lab").slice(0, 120)) +
            '</b></div><div class="bd" style="text-align:left">' +
            mdLite(String(a.body || "").slice(0, 3000)) +
            (lk
              ? '<div style="margin-top:6px"><button class="medium" data-k="annlink" data-u="' +
                esc(lk) +
                '">' +
                esc(String(a.linkText || "Open").slice(0, 40)) +
                "</button></div>"
              : "") +
            "</div></div>"
          );
        })
        .join("") || '<div class="sub" style="margin:14px 0">No announcements yet.</div>';
  } else {
    const msgs = labMsgs(fbItems, fbMe || "you"),
      show = labOlder ? msgs : msgs.slice(-10);
    if (msgs.length > show.length) {
      h += '<button class="medium" data-k="older">Show older</button>';
    }
    h += show.map((m) => labBubble(m.me, m.who, m.at, m.text)).join("") || "";
    h +=
      '<h2>Send a message to Color Lab</h2><div class="sub">Got ideas, found a bug, need help or just love Color Lab? Let us know!</div>' +
      '<textarea id="labText" maxlength="1500" placeholder="Message"></textarea>' +
      '<div class="pv" id="labPv" style="text-align:left"></div><div class="row"><button class="medium grey" data-k="pic">📎 Screenshots (up to 3)</button><span id="labMsg"></span><span id="labCount">0/5 words</span></div>' +
      '<select id="labAs" hidden></select><button class="medium" data-k="send">Send message</button>';
  }
  h += "</div>";
  const keep = D("labText") ? D("labText").value : "";
  L.innerHTML = h;
  const ta = D("labText");
  if (D("labAs")) {
    populateSendAs(D("labAs"));
  }
  if (ta) {
    ta.value = keep;
    const cnt = () => {
      const t = ta.value,
        w = fbWords(t),
        c = D("labCount");
      if (c) {
        c.textContent = labView === "thread" ? t.length + "/1500" : w < 5 ? w + "/5 words" : t.length + "/1500";
      }
    };
    ta.oninput = cnt;
    cnt();
    ta.onpaste = (e) => {
      const fs = [...((e.clipboardData && e.clipboardData.files) || [])].filter((x) => /^image\//.test(x.type));
      if (fs.length && labView === "mine") {
        e.preventDefault();
        fs.slice(0, 3 - fbImages.length).forEach(fbReadImage);
      }
    };
  }
  window.__ttclLabImgs = () => {
    const pv = D("labPv");
    if (!pv) {
      return;
    }
    pv.innerHTML = fbImages
      .map(
        (d, n) =>
          '<span><img src="' + d + '"> <button class="small grey" data-k="unpic" data-n="' + n + '">✕</button></span>',
      )
      .join("");
  };
  window.__ttclLabImgs();
  L.querySelectorAll(".msg").length && labView !== "inbox" && labView !== "ann" && (L.scrollTop = L.scrollHeight);
  L.onclick = async (e) => {
    if (e.target === L) {
      return;
    }
    const k = e.target.closest("[data-k]");
    if (!k) {
      return;
    }
    const a = k.dataset.k;
    if (a === "close") {
      return labClose();
    }
    if (DEV_BUILD && (a === "mine" || a === "inbox" || a === "alerts")) {
      labView = a;
      if (a === "inbox") {
        await labLoadAdmin();
      }
      if (a === "alerts") {
        labAlertSeen();
      }
      return labDraw();
    }
    if (DEV_BUILD && a === "mark") {
      const r = await shareCall({ op: "inbox", act: "mark", kh: k.dataset.id, read: k.dataset.read === "1" }).catch(
        () => null,
      );
      if (!(r && r.ok)) {
        toast("Couldn't do that, try again", true);
        return;
      }
      await labLoadAdmin();
      return labDraw();
    }
    if (DEV_BUILD && a === "unmute") {
      const r = await shareCall({ op: "inbox", act: "unmute", kh: k.dataset.id }).catch(() => null);
      toast(r && r.ok ? "They can send messages again" : "Couldn't do that, try the admin page", !(r && r.ok));
      return;
    }
    if (a === "ann") {
      labView = "ann";
      annMark(annList.map((x) => x.id));
      return labDraw();
    }
    if (a === "mine") {
      labView = "mine";
      return labDraw();
    }
    if (a === "annlink") {
      const u = annLink(k.dataset.u);
      if (u) {
        window.open(u, "_blank", "noopener");
      }
      return;
    }
    if (a === "older") {
      labOlder = true;
      return labDraw();
    }
    if (a === "pic") {
      return $("fbFile").click();
    }
    if (a === "unpic") {
      fbImages.splice(Number(k.dataset.n), 1);
      return fbShowImages();
    }
    if (DEV_BUILD && a === "thread") {
      labThread = k.dataset.id;
      const r = await shareCall({ op: "inbox", act: "thread", kh: labThread }).catch(() => null);
      labItems = r && r.ok ? r.data.items : [];
      labView = "thread";
      return labDraw();
    }
    const ta2 = D("labText"),
      msg = D("labMsg"),
      text = ta2 ? ta2.value.trim() : "";
    if (a === "send") {
      if (fbWords(text) < 5) {
        msg.textContent = "Please describe what's going on in at least 5 words";
        return;
      }
      k.disabled = true;
      msg.textContent = "Sending…";
      const r = await shareCall({
        op: "fbsend",
        text,
        images: fbImages.length ? fbImages.slice(0, 3) : undefined,
        pids: loggedInIds().filter((id) => /^\d+$/.test(id)),
        as: fbSender(),
        kind: "feedback",
      }).catch(() => null);
      if (r && r.ok) {
        ta2.value = "";
        fbSetImage(null);
        await fbRefresh(true).catch(() => {});
        fbFast();
        labDraw();
        const m2 = D("labMsg");
        if (m2) {
          m2.textContent = "✓ Sent. Thank you!";
        }
      } else {
        k.disabled = false;
        msg.textContent =
          r && r.data && r.data.error ? "Not sent: " + r.data.error : "Not sent: couldn't reach the server";
      }
      return;
    }
    if (DEV_BUILD && a === "reply") {
      const last = (labItems || [])[0];
      if (!text || !last) {
        msg.textContent = "Write a reply first";
        return;
      }
      k.disabled = true;
      msg.textContent = "Sending…";
      const r = await shareCall({ op: "inbox", act: "reply", fid: last.id, text }).catch(() => null);
      if (r && r.ok) {
        ta2.value = "";
        const r2 = await shareCall({ op: "inbox", act: "thread", kh: labThread }).catch(() => null);
        labItems = r2 && r2.ok ? r2.data.items : labItems;
        labLoadAdmin().catch(() => {});
        labDraw();
        const m2 = D("labMsg");
        if (m2) {
          m2.textContent = "✓ Reply sent";
        }
      } else {
        k.disabled = false;
        msg.textContent = "Not sent: " + ((r && r.data && r.data.error) || "couldn't reach the server");
      }
    }
  };
}
function labSnippet() {
  // the box under "Message the laboratory" on the right (in the page theme like the game's boxes)
  const host = document.getElementById("tertiaryContent");
  if (!host || !SETTINGS.on) {
    const o = D("ttclLabSnippet");
    if (o) {
      o.remove();
    }
    return;
  }
  let b = D("ttclLabSnippet");
  if (!b || b.parentNode !== host) {
    if (b) {
      b.remove();
    }
    b = document.createElement("div");
    b.id = "ttclLabSnippet";
    b.className = "snippet";
    b.style.cursor = "pointer";
    b.onclick = () => labOpen();
    const m = document.getElementById("messagesSnippet");
    host.insertBefore(b, m ? m.nextSibling : null);
  }
  const unread =
    Math.max(0, fbItems.reduce((n, it) => n + it.replies.length, 0) - (SETTINGS.fbSeen || 0)) + annUnread();
  const h =
    '<div class="content" style="padding:4px 6px 7px">' +
    LAB_ICON +
    '<div class="header" style="margin-top:2px">Message Color Lab' +
    (unread > 0
      ? ' <span style="background:#e33;color:#fff;border-radius:8px;padding:0 6px;font:11px Arial">' +
        unread +
        "</span>"
      : "") +
    "</div>Found a bug or got an idea for Color Lab? Let us know!</div>";
  if (b.__h !== h) {
    b.__h = h;
    b.innerHTML = h;
  }
}
// the game's own message laboratory in the page theme too
function labThemeGame() {
  const P = pageKeyNow ? pagePal(pageKeyNow) : null;
  let st = D("ttclGameLab");
  if (!st) {
    st = document.createElement("style");
    st.id = "ttclGameLab";
    document.head.appendChild(st);
  }
  const c = P
    ? `#overlay .messages .message{background:linear-gradient(${P.panel},${P.panel2})!important;color:${P.ink}!important}#overlay .messages .message .headers{border-color:${P.accent}88!important}#overlay .messages .message.important{background:linear-gradient(${P.pBtnTop},${P.pBtnBot})!important;color:#fff!important}#overlay .messages .message.important .headers{border-color:#fff!important}#overlay .messages textarea{background:#000!important;color:#fff!important}`
    : "";
  if (st.textContent !== c) {
    st.textContent = c;
  }
}

export function startLab() {
  setInterval(() => {
    try {
      labSnippet();
      labThemeGame();
    } catch {}
  }, 1500);
  if (DEV_BUILD) {
    setTimeout(() => {
      try {
        labAlertPoll();
      } catch {}
    }, 6000);
    setInterval(() => {
      try {
        if (!document.hidden) {
          labAlertPoll();
        }
      } catch {}
    }, 30000);
    document.addEventListener("visibilitychange", () => {
      try {
        if (!document.hidden) {
          labAlertPoll();
        }
      } catch {}
    });
  } // (back in the tab: anything missed shows at once)
}
