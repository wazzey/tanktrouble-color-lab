// Toolbar button / Alt+C: toggle the panel on TankTrouble, or open TankTrouble if elsewhere.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.url || !/^https:\/\/tanktrouble\.com\//.test(tab.url)) {
    chrome.tabs.create({ url: "https://tanktrouble.com/" });
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        if (window.__ttColorLab) {
          window.__ttColorLab.toggle();
        }
      },
    });
  } catch (e) {
    console.warn("Color Lab toggle failed", e);
  }
});

// "OFF" badge on the toolbar icon while custom colours are paused (per tab)
chrome.runtime.onMessage.addListener((m, sender) => {
  if (!m || m.type !== "badge" || !sender.tab) {
    return;
  }
  chrome.action.setBadgeText({ tabId: sender.tab.id, text: m.on ? "" : "OFF" });
  chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: "#cc0000" });
});

// Alt/Option+V as a browser shortcut (so it can be changed at chrome://extensions/shortcuts)
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "refresh-tanks" || !tab || !/^https:\/\/tanktrouble\.com\//.test(tab.url || "")) {
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        if (window.__ttColorLab) {
          window.__ttColorLab.refresh();
        }
      },
    });
  } catch (e) {
    console.warn("Color Lab refresh failed", e);
  }
});

// Shared looks: Color Lab's look server (see "Look sharing" in Settings). Only player IDs and looks go to it.
const SHARE_BASE = "https://ttcl-share.wazzey.workers.dev";
const FROM_STORE = !!chrome.runtime.getManifest().update_url; // installed from the Chrome Web Store (a downloaded zip has no update_url)
const ttTabs = new Set(); // (TankTrouble tabs that have asked something: live announcements go to all of them)
chrome.runtime.onMessage.addListener((m, sender, reply) => {
  if (!m || m.type !== "share" || !sender.tab) {
    return;
  }
  if (sender.tab.incognito && !DEV_BUILD) {
    reply({ ok: false, status: 0, incognito: true });
    return;
  } // (an Incognito window: never online, nothing goes to the server)
  ttTabs.add(sender.tab.id);
  if (!["latest", "store", "announce", "watch"].includes(m.op)) {
    ttMark();
  } // (only a copy that's been talking to the server says goodbye when TankTrouble closes)
  const pid = /^\d{1,12}$/.test(String(m.pid || "")) ? String(m.pid) : null;
  let url,
    opt = {};
  if (m.op === "watch") {
    // the tanks this tab can see: their look changes come down the live connection
    const ids = (Array.isArray(m.ids) ? m.ids : [])
      .map(String)
      .filter((x) => /^\d{1,12}$/.test(x))
      .slice(0, 64);
    if (ids.length) {
      liveWatch.set(sender.tab.id, new Set(ids));
    } else {
      liveWatch.delete(sender.tab.id);
    }
    if (!liveWatch.size && live) {
      try {
        live.close();
      } catch {}
    } // nothing left to watch (e.g. logged out): the connection closes
    liveOpen();
    liveSend();
    reply({ ok: true, live: !!(live && live.readyState === 1) });
    return;
  }
  if (m.op === "latest") {
    // the newest release (for the update pop-up), with this copy's version to compare
    if (FROM_STORE) {
      reply({ ok: true, data: null, current: chrome.runtime.getManifest().version, store: true });
      return;
    } // (the Chrome Web Store updates its copies itself: no GitHub pop-up)
    fetch(SHARE_BASE + "/v1/latest", { cache: "no-store" })
      .then((r) => r.json().then((data) => reply({ ok: r.ok, data, current: chrome.runtime.getManifest().version })))
      .catch(() => reply({ ok: false }));
    return true;
  }
  if (m.op === "store") {
    // Color Lab's Chrome Web Store page (once it's there): copies installed from a zip offer to move to it
    if (FROM_STORE) {
      reply({ ok: true, data: null, store: true });
      return;
    }
    fetch(SHARE_BASE + "/v1/store", { cache: "no-store" })
      .then((r) => r.json().then((data) => reply({ ok: r.ok, data })))
      .catch(() => reply({ ok: false }));
    return true;
  }
  if (m.op === "get") {
    const ids = (Array.isArray(m.ids) ? m.ids : [])
      .map(String)
      .filter((x) => /^\d{1,12}$/.test(x))
      .slice(0, 16);
    if (!ids.length) {
      reply({ ok: true, data: { looks: {} } });
      return;
    }
    url = SHARE_BASE + "/v1/looks?ids=" + ids.join(",");
  } else if ((m.op === "put" || m.op === "delete") && pid && /^[0-9a-f]{64}$/.test(String(m.key || ""))) {
    url = SHARE_BASE + "/v1/looks/" + pid;
    opt = {
      method: m.op === "put" ? "PUT" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(m.op === "put" ? { key: m.key, look: m.look } : { key: m.key }),
    };
  } else if ((m.op === "fbsend" || m.op === "fblist") && /^[0-9a-f]{64}$/.test(String(m.key || ""))) {
    // feedback to the Color Lab team, and their replies
    url = SHARE_BASE + (m.op === "fbsend" ? "/v1/feedback" : "/v1/feedback/mine");
    opt = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        m.op === "fbsend"
          ? {
              key: m.key,
              text: String(m.text || "").slice(0, 1500),
              image: typeof m.image === "string" ? m.image : undefined,
              images: Array.isArray(m.images) ? m.images.filter((x) => typeof x === "string").slice(0, 3) : undefined,
              pids: Array.isArray(m.pids) ? m.pids.slice(0, 4) : [],
              about: m.about,
              kind: m.kind,
            }
          : {
              key: m.key,
              pids: Array.isArray(m.pids)
                ? m.pids
                    .map(String)
                    .filter((x) => /^\d{1,12}$/.test(x))
                    .slice(0, 4)
                : undefined,
              srv: typeof m.srv === "string" ? m.srv.slice(0, 24) : undefined,
              idle: m.idle === true,
              away: m.away === true,
              wh: ["lobby", "game", "queue"].includes(m.wh) ? m.wh : undefined,
              ifor: Math.max(0, Math.min(1440, Number(m.ifor) || 0)),
              inv: m.inv === true,
              show: m.show === true ? true : m.show === false ? false : undefined,
              shsrv: m.shsrv === true,
            },
      ),
    }; // (fblist: the tanks logged in right now, for the owner's "who's online" box)
  } else if (
    DEV_BUILD &&
    m.op === "inbox" &&
    /^[0-9a-f]{64}$/.test(String(m.key || "")) &&
    ["list", "thread", "reply", "unmute"].includes(m.act)
  ) {
    // the owner's inbox (only works for a trusted copy)
    url = SHARE_BASE + "/v1/inbox" + (m.act === "list" ? "" : "/" + m.act);
    opt = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: m.key,
        kh: typeof m.kh === "string" ? m.kh.slice(0, 64) : undefined,
        fid: Number(m.fid) || undefined,
        text: typeof m.text === "string" ? m.text.slice(0, 1500) : undefined,
      }),
    };
  } else if (
    DEV_BUILD &&
    m.op === "fdraft" &&
    /^[0-9a-f]{64}$/.test(String(m.key || "")) &&
    /^\d{1,12}$/.test(String(m.fid || ""))
  ) {
    // the owner's copy: a forum reply typed in Discord
    url = SHARE_BASE + "/v1/fdraft";
    opt = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: m.key, id: String(m.fid) }),
    };
  } else if (
    DEV_BUILD &&
    m.op === "owner" &&
    /^[0-9a-f]{64}$/.test(String(m.key || "")) &&
    ["summary", "action"].includes(m.act)
  ) {
    // the owner's in-game admin: the admin page's data and actions, for a copy the server trusts as the owner's
    url = SHARE_BASE + "/v1/owner/" + m.act;
    opt = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: m.key, adm: m.adm && typeof m.adm === "object" ? m.adm : undefined }),
    };
  } else if (DEV_BUILD && m.op === "alerts" && /^[0-9a-f]{64}$/.test(String(m.key || ""))) {
    // the owner's copy: recent server alerts
    url = SHARE_BASE + "/v1/alerts";
    opt = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: m.key }) };
  } else if (m.op === "online" && /^[0-9a-f]{64}$/.test(String(m.key || ""))) {
    // how many Color Lab players are online (and who, for the owner's copy)
    url = SHARE_BASE + "/v1/online";
    opt = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: m.key }) };
  } else if ((m.op === "report" || m.op === "vstart" || m.op === "vcheck") && pid) {
    // report a shared look / prove a tank is yours
    url = SHARE_BASE + (m.op === "report" ? "/v1/report" : m.op === "vstart" ? "/v1/verify/start" : "/v1/verify/check");
    opt = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pid, key: /^[0-9a-f]{64}$/.test(String(m.key || "")) ? m.key : undefined }),
    };
  } else if (m.op === "account" && /^[0-9a-f]{64}$/.test(String(m.key || "")) && m.acct && typeof m.acct === "object") {
    // an account's saved looks and achievements (already encrypted by bridge.js), and moving it to a new key
    const a = m.acct;
    url = SHARE_BASE + "/v1/account";
    opt = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: m.key,
        op: String(a.op || ""),
        pid: String(a.pid || ""),
        old: typeof a.old === "string" ? a.old : undefined,
        ver: Number.isInteger(a.ver) ? a.ver : undefined,
        base: Number.isInteger(a.base) ? a.base : undefined,
        blob: typeof a.blob === "string" ? a.blob : undefined,
        fresh: a.fresh === true ? true : undefined,
      }),
    };
  } else if (m.op === "announce") {
    // the Color Lab team's live announcement (nothing about you is sent)
    url = SHARE_BASE + "/v1/announce";
  } else {
    reply({ ok: false });
    return;
  }
  opt.headers = Object.assign({ "X-TTCL-Version": chrome.runtime.getManifest().version }, opt.headers || {}); // (the server can turn away copies too old to be safe)
  fetch(url, Object.assign({ cache: "no-store" }, opt))
    .then((r) => {
      if (r.status === 426) {
        liveOld = true;
      }
      return r;
    })
    .then((r) =>
      r
        .json()
        .catch(() => null)
        .then((data) => reply({ ok: r.ok, status: r.status, data })),
    )
    .catch(() => reply({ ok: false, status: 0 }));
  return true; // (answers later)
});

// Live looks: one connection to the look server tells this browser the moment a watched tank's look is saved, so it changes
// straight away (like a real look change) instead of at the next check. A ping every 20 s keeps it (and this page) awake.
const LIVE_URL = SHARE_BASE.replace(/^https/, "wss") + "/v1/live?v=" + chrome.runtime.getManifest().version;
const liveWatch = new Map(); // tab -> the tanks it can see
let liveOld = false; // (the server says this version is too old: online features stop until it's updated)
let live = null,
  liveTimer = 0,
  liveRetry = 1000,
  livePing = 0,
  liveSent = "";
function liveIds() {
  const all = new Set();
  for (const s of liveWatch.values()) {
    for (const id of s) {
      all.add(id);
    }
  }
  return [...all].slice(0, 64);
}
function liveSend() {
  if (!live || live.readyState !== 1) {
    return;
  }
  const msg = JSON.stringify({ watch: liveIds() });
  if (msg === liveSent) {
    return;
  }
  liveSent = msg;
  try {
    live.send(msg);
  } catch {}
}
function liveLater() {
  if (!liveWatch.size) {
    return;
  }
  clearTimeout(liveTimer);
  liveTimer = setTimeout(liveOpen, liveRetry);
  liveRetry = Math.min(liveRetry * 2, 60000);
}
function liveOpen() {
  if (live || !liveWatch.size || liveOld) {
    return;
  }
  try {
    live = new WebSocket(LIVE_URL);
  } catch {
    live = null;
    liveLater();
    return;
  }
  live.onopen = () => {
    liveRetry = 1000;
    liveSent = "";
    liveSend();
    clearInterval(livePing);
    livePing = setInterval(() => {
      try {
        if (live && live.readyState === 1) {
          live.send("ping");
        }
      } catch {}
    }, 20000);
  };
  live.onmessage = (e) => {
    if (e.data === "pong") {
      return;
    }
    let m;
    try {
      m = JSON.parse(e.data);
    } catch {
      return;
    }
    if (m && m.ann && typeof m.ann === "object") {
      for (const tabId of ttTabs) {
        chrome.tabs.sendMessage(tabId, { type: "annLive", ann: m.ann }).catch(() => ttTabs.delete(tabId));
      }
      return;
    } // (an announcement from the Color Lab team: every open tab shows it now)
    if (!m || !/^\d{1,12}$/.test(String(m.pid))) {
      return;
    }
    for (const [tabId, ids] of liveWatch) {
      if (ids.has(String(m.pid))) {
        chrome.tabs.sendMessage(tabId, { type: "shareLive", pid: String(m.pid), look: m.look || null }).catch(() => {
          liveWatch.delete(tabId);
        });
      }
    }
  };
  live.onclose = () => {
    live = null;
    clearInterval(livePing);
    liveLater();
  };
  live.onerror = () => {
    try {
      if (live) {
        live.close();
      }
    } catch {}
  };
}
// Closing TankTrouble: when the last TankTrouble tab closes (or goes to another site), the server is told at once, so this copy shows as
// offline straight away instead of after a few minutes. (If the browser itself is closed or the connection drops, it's after 5-7 minutes.)
function ttMark() {
  try {
    chrome.storage.session.set({ ttOpen: true });
  } catch {}
}
async function ttGone() {
  try {
    const st = await chrome.storage.session.get("ttOpen");
    if (!st || !st.ttOpen) {
      return;
    }
    const left = await chrome.tabs.query({ url: ["https://tanktrouble.com/*", "https://*.tanktrouble.com/*"] });
    if (left.length) {
      return;
    }
    await chrome.storage.session.set({ ttOpen: false });
    const it = await chrome.storage.local.get("ttcl_share_key"),
      key = it && it.ttcl_share_key;
    if (!key || !/^[0-9a-f]{64}$/.test(key)) {
      return;
    }
    await fetch(SHARE_BASE + "/v1/bye", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-TTCL-Version": chrome.runtime.getManifest().version },
      body: JSON.stringify({ key }),
      keepalive: true,
    });
  } catch {}
}
chrome.tabs.onRemoved.addListener(() => {
  setTimeout(ttGone, 300);
});
chrome.tabs.onUpdated.addListener((id, ch) => {
  if (ch.url && !/^https:\/\/([\w-]+\.)?tanktrouble\.com\//.test(ch.url)) {
    setTimeout(ttGone, 300);
  }
});
chrome.tabs.onRemoved.addListener((tabId) => {
  if (!liveWatch.delete(tabId)) {
    return;
  }
  if (liveWatch.size) {
    liveSend();
  } else if (live) {
    try {
      live.close();
    } catch {}
  }
});

// The DEV build only: the page can ask for the extension to reload itself while testing
if (DEV_BUILD) {
  chrome.runtime.onMessage.addListener((m) => {
    if (m && m.type === "devReload") {
      setTimeout(() => chrome.runtime.reload(), 100);
    }
  });
}
