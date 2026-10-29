// TankTrouble Color Lab — storage bridge.
// Runs in the extension's isolated world (where chrome.storage is available) and loads/saves data for
// content.js, which runs inside the page. Only the keys below can be read or written.
import { applyVault, readAccountKey, readDetails, readVault } from "./vault.js";

(() => {
  const KEYS = [
    "tt_custom_colors",
    "tt_color_history",
    "tt_gui_pos",
    "tt_migrated",
    "tt_seen_hint",
    "tt_settings",
    "tt_boxes",
    "tt_stats",
    "tt_tutorial",
  ];
  // A copy of everything is also kept in TankTrouble's own site storage in this browser, so removing and re-adding the
  // extension (or loading it from another folder) doesn't lose saved looks: a fresh install restores from it.
  const BK = "ttcl_backup";
  let bt = 0;
  const backup = () => {
    clearTimeout(bt);
    bt = setTimeout(() => {
      try {
        localStorage.setItem(BK, JSON.stringify({ v: 1, at: Date.now(), data }));
      } catch {}
    }, 400);
  };
  const merge = (a, b) => {
    // an imported file joined with what's here: its entries win, nothing here is lost
    if (Array.isArray(a) && Array.isArray(b)) {
      const seen = new Set(),
        out = [];
      for (const x of b.concat(a)) {
        const k = JSON.stringify(x);
        if (!seen.has(k)) {
          seen.add(k);
          out.push(x);
        }
      }
      return out;
    }
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
      return Object.assign({}, a, b);
    }
    return b === undefined ? a : b;
  };
  let data = null;
  // The player's privacy choice ("share" or "local"), kept apart from the page's settings so only the player can make it
  const CONSENT = "ttcl_consent";
  let consent;
  const alive = () => {
    try {
      return !!(chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  };
  try {
    if (chrome.extension && chrome.extension.inIncognitoContext) {
      document.documentElement.dataset.ttclIncog = "1";
    }
  } catch {}
  try {
    document.documentElement.dataset.ttclVer = chrome.runtime.getManifest().version;
    document.documentElement.dataset.ttclStore = chrome.runtime.getManifest().update_url ? "1" : "0";
  } catch {} // (content.js shows update notes after an update) // (Incognito: Color Lab stays offline, see content.js)
  const toPage = (msg) => window.postMessage(Object.assign({ __ttcl: true, dir: "toPage" }, msg), location.origin);
  const pick = (items) => {
    const o = {};
    if (items) {
      for (const k of KEYS) {
        if (k in items) {
          o[k] = items[k];
        }
      }
    }
    return o;
  };

  // ---- keys: the copy's random key, and each account's own key (vault.js). Neither is given to the page ----
  const PID = /^\d{1,12}$/;
  let copyKeyWait = null;
  const readCopyKey = () =>
    copyKeyWait ||
    (copyKeyWait = new Promise((res) => {
      chrome.storage.local.get("ttcl_share_key", (it) => {
        let key = it && it.ttcl_share_key;
        try {
          const old = localStorage.getItem("ttcl_share_key");
          if (!key && old) {
            key = old;
          }
          localStorage.removeItem("ttcl_share_key");
        } catch {} // (older versions also kept it in the site storage)
        if (!key || !/^[0-9a-f]{64}$/.test(key)) {
          const b = new Uint8Array(32);
          crypto.getRandomValues(b);
          key = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
        }
        chrome.storage.local.set({ ttcl_share_key: key });
        res(key);
      });
    }));
  const callAccount = (key, acct) =>
    new Promise((res) => {
      try {
        chrome.runtime.sendMessage({ type: "share", op: "account", key, acct }, (r) => {
          void chrome.runtime.lastError;
          res(r || { ok: false, status: 0 });
        });
      } catch {
        res({ ok: false, status: 0 });
      }
    });
  const accountWait = {};
  const readAccount = (pid) => {
    // the account's key, or null without one. Worked out again every 10 minutes (sooner after a failed move)
    const c = accountWait[pid];
    if (c && Date.now() < c.until) {
      return c.wait;
    }
    const wait = readAccountNow(pid);
    accountWait[pid] = { until: Date.now() + 10 * 60000, wait };
    wait.then((a) => {
      if (a && !a.moved) {
        accountWait[pid].until = Date.now() + 2 * 60000;
      }
    });
    return wait;
  };
  async function readAccountNow(pid) {
    const vault = await readVault(),
      had = vault[pid],
      details = await readDetails(pid);
    let entry = had;
    if (details && (!had || had.fp !== details.fp)) {
      // a new account here, or its email or oldest lab message changed: a new key, and the tank moves over to it from
      // the old key (the account's previous key, or the copy's random key), so it stays proven
      entry = { k: await readAccountKey(details.secret, pid), fp: details.fp, old: had ? had.k : null, moved: false };
    }
    if (!entry) {
      return null;
    }
    if (!entry.moved) {
      const r = await callAccount(entry.k, { op: "move", pid, old: entry.old || (await readCopyKey()) });
      entry.moved = r.ok || r.status === 403; // (403: the old key never proved it, so there's nothing to move)
    }
    vault[pid] = entry;
    await applyVault(vault);
    return { key: entry.k, moved: entry.moved };
  }
  const keyFor = async (d) => {
    // a tank's own look and proof use its account's key; a message is sent with the key of the account it's sent as
    const pid = ["put", "delete", "vstart", "vcheck"].includes(d.op) ? d.pid : d.op === "fbsend" ? d.as : null;
    if (PID.test(String(pid || ""))) {
      const a = await readAccount(String(pid));
      if (a) {
        return a.key;
      }
    }
    return readCopyKey();
  };
  async function accountOp(d) {
    // the page's requests about an account's backup. The page gets the backup, never a key
    // (an account that has never messaged the laboratory uses the copy's random key: proven again on a new computer)
    const pid = String(d.pid),
      a = await readAccount(pid),
      key = a ? a.key : await readCopyKey();
    if (d.act === "pull") {
      const r = await callAccount(key, { op: "get", pid, ver: Number.isInteger(d.ver) ? d.ver : undefined });
      if (!r.ok) {
        return { status: r.status, error: r.data && r.data.error };
      }
      const save = r.data.save;
      if (!save) {
        return { none: true };
      }
      let saved = null;
      try {
        saved = JSON.parse(save.blob);
      } catch {}
      return saved ? { data: saved, ver: save.ver, at: save.at } : { none: true };
    }
    if (d.act === "push") {
      const base = Number(d.base) || 0;
      const r = await callAccount(key, {
        op: "put",
        pid,
        base,
        ver: base + 1,
        blob: JSON.stringify(d.data),
      });
      return {
        ok: !!r.ok,
        status: r.status,
        ver: r.data && r.data.ver,
        at: r.data && r.data.at,
        wait: r.data && r.data.wait,
        error: r.data && r.data.error,
      };
    }
    if (["hist", "delete", "messages"].includes(d.act)) {
      const r = await callAccount(key, { op: d.act, pid });
      return { ok: !!r.ok, status: r.status, data: r.data };
    }
    return { error: "bad act" };
  }
  // The owner's actions are confirmed here, in the extension's own world. A script in TankTrouble's page can ask for one,
  // but it can't see or click this box (it only takes real clicks), so it can't act as the owner
  const readOwnerAsk =
    DEV_BUILD &&
    ((d) => {
      if (d.op === "owner" && d.act === "action" && d.adm && typeof d.adm === "object") {
        const parts = Object.entries(d.adm).map(([k, v]) => k + ": " + String(v).slice(0, 120));
        return "Admin action\n" + parts.join("\n");
      }
      if (d.op === "inbox" && d.act === "reply") {
        return "Reply to a message\n" + String(d.text || "").slice(0, 300);
      }
      if (d.op === "inbox" && d.act === "unmute") {
        return "Let copy " + String(d.kh || "").slice(0, 12) + " message again";
      }
      return null;
    });
  const applyOwnerAsk =
    DEV_BUILD &&
    ((what) =>
      new Promise((resolve) => {
        const host = document.createElement("div");
        const root = host.attachShadow({ mode: "closed" });
        root.innerHTML =
          "<style>.b{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);font:14px Arial,sans-serif}" +
          ".c{width:340px;max-width:calc(100vw - 24px);background:#111;color:#fff;border:3px solid #e3a008;border-radius:12px;padding:14px}" +
          ".t{font-weight:bold;margin:0 0 6px}.w{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-height:240px;overflow:auto;background:#1d1d1d;border-radius:6px;padding:8px;margin:0 0 10px}" +
          "button{font:bold 13px Arial,sans-serif;border:0;border-radius:6px;padding:7px 14px;margin-right:6px;cursor:pointer}.ok{background:#2fa84f;color:#fff}.no{background:#555;color:#fff}</style>" +
          '<div class="b"><div class="c"><p class="t">🔒 Confirm (Color Lab owner)</p><p class="w"></p><button class="ok">Do it</button><button class="no">Cancel</button></div></div>';
        root.querySelector(".w").textContent = what;
        const close = (ok) => (e) => {
          if (!e.isTrusted) {
            return;
          }
          host.remove();
          resolve(ok);
        };
        root.querySelector(".ok").addEventListener("click", close(true));
        root.querySelector(".no").addEventListener("click", close(false));
        document.documentElement.appendChild(host);
      }));

  // The privacy choice: drawn here, out of the page's reach, and it only takes real clicks
  let consentCard = null;
  const applyConsentAsk = () => {
    if (consentCard) {
      return;
    }
    consentCard = document.createElement("div");
    const root = consentCard.attachShadow({ mode: "closed" });
    root.innerHTML =
      "<style>.b{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);font:13px/1.45 Arial,sans-serif;color:#fff}" +
      ".c{width:340px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:auto;box-sizing:border-box;background:rgba(0,0,0,.92);border:3px solid #427fff;border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.6)}" +
      ".c>*:not(h3){margin-left:14px;margin-right:14px}" +
      "h3{margin:0 0 10px;padding:7px 14px 6px;font:normal 20px TankTrouble,Arial,sans-serif;color:#fff;background:linear-gradient(#427fff,#0014ab);text-shadow:0 2px 0 rgba(0,0,0,.35)}" +
      "p{margin-top:0;margin-bottom:8px}ul{margin-top:0;margin-bottom:8px;padding-left:18px}li{margin:0 0 4px;font-size:12px}b{color:#9db8ff}a{color:#8fc1ff}.s{font-size:12px;color:#aaa}" +
      ".r{display:flex;gap:7px;margin-top:8px;margin-bottom:12px}" +
      "button{flex:1;font:16px TankTrouble,Arial,sans-serif;line-height:20px;white-space:nowrap;border:none;border-radius:5px;padding:7px 6px;cursor:pointer;color:#fff;background:linear-gradient(#427fff,#0014ab);box-shadow:0 3px 4px rgba(0,0,0,.5)}" +
      "button:hover{filter:brightness(1.12)}button:active{box-shadow:0 1px 4px rgba(0,0,0,.5);transform:translateY(2px)}</style>" +
      '<div class="b"><div class="c"><h3>Before you start 🔒</h3>' +
      "<p>Color Lab works on your own screen without any server. If you choose <b>Share</b>, it also uses Color Lab's server (run by its author on Cloudflare), which gets:</p><ul>" +
      "<li>your logged-in tanks' player IDs, their public names and the looks you give them, so other Color Lab players see your looks</li>" +
      "<li>whether you're online or idle and in the lobby, a queue or a game (your name only shows if you turn on <b>Show me as online</b>)</li>" +
      "<li>the player IDs of tanks on your screen, to fetch their Color Lab looks</li>" +
      "<li>a backup of your looks and achievement progress (on unless you turn it off in ⚙ Settings > Backup)</li>" +
      "<li>messages and reports, only when you send one. They go to the author's private Discord, and Cloudflare's AI tags their topic</li>" +
      "<li>a scrambled code of your connection, to stop abuse</li></ul>" +
      '<p class="s">To prove a tank is yours, Color Lab changes one thing on it for about a second, after asking you. It also makes a key for your account on this computer from the account\'s email and its oldest laboratory message. Those never leave your computer, and the server keeps only a scrambled copy of the key. Nothing is sold or used for ads. ' +
      '<a href="https://github.com/wazzey/tanktrouble-color-lab/blob/main/PRIVACY.md" target="_blank" rel="noopener noreferrer">Privacy policy</a></p>' +
      "<p class=\"s\">Keep it local: nothing about you goes to the server, and you won't see other players' looks, the online list or messages. You can change it any time with the 🟢 Online button.</p>" +
      '<div class="r"><button class="sh">🎨 Share</button><button class="lo">🔒 Keep it local</button></div></div></div>';
    const choose = (value) => (e) => {
      if (!e.isTrusted) {
        return;
      }
      consentCard.remove();
      consentCard = null;
      consent = value;
      chrome.storage.local.set({ [CONSENT]: value });
      toPage({ type: "consent", value });
    };
    root.querySelector(".sh").addEventListener("click", choose("share"));
    root.querySelector(".lo").addEventListener("click", choose("local"));
    document.documentElement.appendChild(consentCard);
  };

  window.addEventListener("message", (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.__ttcl !== true || d.dir !== "toExt") {
      return;
    }
    if (!alive()) {
      return;
    } // the extension was reloaded or updated: this old copy stops quietly (refresh the page)
    if (d.type === "hello") {
      if (data) {
        toPage({ type: "init", data, consent });
      }
    } else if (d.type === "save") {
      const items = pick(d.items);
      delete items.tt_migrated;
      Object.assign(data || (data = {}), items);
      try {
        chrome.storage.local.set(items);
      } catch {}
      backup();
    } else if (d.type === "export") {
      toPage({ type: "exported", data: pick(data) });
    } else if (d.type === "import" && d.items && typeof d.items === "object") {
      const inc = pick(d.items),
        cur = data || {},
        out = {};
      for (const k of KEYS) {
        if (k in inc || k in cur) {
          out[k] = k === "tt_settings" || k === "tt_gui_pos" ? inc[k] || cur[k] : merge(cur[k], inc[k]);
        }
      }
      out.tt_migrated = true;
      data = out;
      chrome.storage.local.set(out, () => {
        backup();
        toPage({ type: "imported", ok: !chrome.runtime.lastError });
      });
    } else if (d.type === "badge") {
      try {
        const p = chrome.runtime.sendMessage({ type: "badge", on: !!d.on });
        if (p && p.catch) {
          p.catch(() => {});
        }
      } catch {}
    } else if (d.type === "supportId") {
      // the start of this copy's key hash, as the owner's admin page shows it (it can't be used to get into anything)
      readCopyKey()
        .then((key) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)))
        .then((h) =>
          toPage({
            type: "supportIdRes",
            rid: d.rid,
            id: [...new Uint8Array(h)]
              .slice(0, 5)
              .map((x) => x.toString(16).padStart(2, "0"))
              .join(""),
          }),
        )
        .catch(() => toPage({ type: "supportIdRes", rid: d.rid, id: null }));
    } else if (d.type === "consentAsk") {
      applyConsentAsk();
    } else if (d.type === "acct" && consent !== "share") {
      toPage({ type: "acctRes", rid: d.rid, res: { status: 0, error: "not shared" } });
    } else if (d.type === "acct" && PID.test(String(d.pid || ""))) {
      accountOp(d)
        .catch(() => ({ error: "failed" }))
        .then((res) => toPage({ type: "acctRes", rid: d.rid, res }));
    } else if (d.type === "artFile" && typeof d.name === "string" && /^[\w.-]+$/.test(d.name)) {
      // Color Lab's own pictures, read from the extension's art folder on your PC when the page needs one
      fetch(chrome.runtime.getURL("art/" + d.name))
        .then((r) => (r.ok ? r.blob() : null))
        .catch(() => null)
        .then((blob) => toPage({ type: "artFile", name: d.name, blob }));
    } else if (
      d.type === "share" &&
      (d.op === "get" ||
        d.op === "put" ||
        d.op === "delete" ||
        d.op === "watch" ||
        d.op === "latest" ||
        d.op === "report" ||
        d.op === "vstart" ||
        d.op === "vcheck" ||
        d.op === "fbsend" ||
        d.op === "fblist" ||
        d.op === "online" ||
        d.op === "announce" ||
        (DEV_BUILD && (d.op === "inbox" || d.op === "alerts" || d.op === "fdraft" || d.op === "owner")))
    ) {
      // Shared looks: the extension's background page talks to Color Lab's look server, never the page itself.
      // Your tanks' looks are locked to your account's key, or this copy's own key, both kept here.
      const send = (key) => {
        try {
          chrome.runtime.sendMessage(
            {
              type: "share",
              op: d.op,
              ids: d.ids,
              pid: d.pid,
              look: d.look,
              key,
              text: d.text,
              image: d.image,
              images: d.images,
              pids: d.pids,
              srv: d.srv,
              act: d.act,
              kh: d.kh,
              fid: d.fid,
              idle: d.idle,
              away: d.away,
              wh: d.wh,
              ifor: d.ifor,
              inv: d.inv,
              show: d.show,
              shsrv: d.shsrv,
              about: d.about,
              kind: d.kind,
              adm: DEV_BUILD ? d.adm : undefined,
              read: DEV_BUILD ? d.read : undefined,
            },
            (res) => {
              void chrome.runtime.lastError;
              toPage({ type: "shareRes", rid: d.rid, res: res || null });
            },
          );
        } catch {
          toPage({ type: "shareRes", rid: d.rid, res: null });
        }
      };
      const go = () => {
        if (d.op === "get" || d.op === "watch" || d.op === "latest") {
          send(null);
        } else {
          keyFor(d)
            .catch(() => readCopyKey())
            .then(send);
        }
      };
      if (consent !== "share" && d.op !== "latest" && d.op !== "announce") {
        toPage({ type: "shareRes", rid: d.rid, res: null });
        return;
      } // (the player hasn't chosen Share: only the update check and announcements, which carry nothing about them)
      const ask = DEV_BUILD ? readOwnerAsk(d) : null;
      if (DEV_BUILD && ask) {
        applyOwnerAsk(ask).then((ok) => {
          if (ok) {
            go();
          } else {
            toPage({ type: "shareRes", rid: d.rid, res: { ok: false, status: 0, data: { error: "cancelled" } } });
          }
        });
      } else {
        go();
      }
    } else if (DEV_BUILD && d.type === "devReload") {
      // (reload the extension from the page while testing)
      try {
        const p = chrome.runtime.sendMessage({ type: "devReload" });
        if (p && p.catch) {
          p.catch(() => {});
        }
      } catch {}
    } else if (d.type === "migrate") {
      const items = pick(d.items);
      Object.assign(data || (data = {}), items);
      chrome.storage.local.set(items, () => {
        if (!chrome.runtime.lastError) {
          toPage({ type: "migrated" });
        }
      });
      backup();
    }
  });

  // a watched tank's look was just saved: straight to the page
  chrome.runtime.onMessage.addListener((m) => {
    if (m && m.type === "shareLive" && alive()) {
      toPage({ type: "shareLive", pid: m.pid, look: m.look });
    } else if (m && m.type === "annLive" && alive()) {
      toPage({ type: "annLive", ann: m.ann });
    }
  });

  chrome.storage.local.get(KEYS.concat(CONSENT), (items) => {
    data = items || {};
    consent = data[CONSENT];
    delete data[CONSENT];
    if (!KEYS.some((k) => k in data)) {
      // nothing saved: a fresh install. Bring back the copy from the site storage, if there is one
      try {
        const b = JSON.parse(localStorage.getItem(BK) || "null");
        if (b && b.data && typeof b.data === "object") {
          data = pick(b.data);
          chrome.storage.local.set(data);
          data.tt_restored = true;
        }
      } catch {}
    } else {
      backup();
    }
    toPage({ type: "init", data, consent });
  });
})();
