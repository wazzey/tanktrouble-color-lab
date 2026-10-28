import { post } from "../content/bridge-messages.js";
import { ACC_SLOTS } from "../content/colours.js";
import { loggedInIds, lookupById, refreshSoon } from "./game-socket.js";
import { needProof, proveTank, shareMine, srvOn } from "./look-sharing.js";
import { panel, toast } from "./panel.js";
import { MAX_PRESETS } from "./panel-actions.js";
import { renderList } from "./saved-looks.js";
import { renderSettings, uiConfirm } from "./settings.js";
import {
  PLAYER_COLOR_MAP,
  SETTINGS,
  STATS,
  normEntry,
  presetSig,
  saveSettings,
  saveStats,
  saveToStorage,
  storageLoaded,
} from "./storage.js";

// ---------- Backup: each logged-in account's looks and achievements, kept on Color Lab's server ----------
// bridge.js sends it with the account's own key (made from the account's details, so it's the same on every computer);
// this side decides what goes in it, when it goes up, and how it joins what's already here.
const STAT_KEYS = ["streak", "best", "unlocked", "seen", "dstreak", "dbest", "weapons", "gstreak", "gbest", "h2"];
const RUN_KEYS = ["streak", "dstreak", "gstreak"]; // (streaks going on right now: this computer's, never the higher)
const LOOK_WAIT_MS = 10000,
  STATS_WAIT_MS = 5 * 60000;
export const backupOn = () => SETTINGS.backup !== false;
export const STATE = {}; // pid -> { pulled, busy, status, at, dirtyAt }
const NAMES = {};

let rid = 0;
const waiting = {};
const acctCall = (act, pid, extra) =>
  new Promise((res) => {
    const n = ++rid;
    waiting[n] = res;
    post(Object.assign({ type: "acct", rid: n, act, pid: String(pid) }, extra || {}));
    setTimeout(() => {
      if (waiting[n]) {
        delete waiting[n];
        res({ error: "no answer" });
      }
    }, 30000);
  });

// ---- what a save holds ----
const cleanText = (v, n) => (typeof v === "string" ? v.replace(/[<>]/g, "").slice(0, n) : undefined);
const cleanPaint = (v) => (typeof v === "string" && v.length <= 64 && /^[\w#:.-]+$/.test(v) ? v : null);
function getCleanLook(e) {
  // a saved look from a save, kept to what a saved look can hold (a save is checked like anything from outside)
  if (!e || typeof e !== "object" || !Array.isArray(e.presets)) {
    return null;
  }
  const presets = [];
  for (const p of e.presets.slice(0, MAX_PRESETS)) {
    if (!p || typeof p !== "object") {
      continue;
    }
    const out = {
      name: cleanText(p.name, 40) || "Look",
      turret: cleanPaint(p.turret),
      base: cleanPaint(p.base),
      treads: cleanPaint(p.treads),
    };
    if (p.acc && typeof p.acc === "object") {
      out.acc = {};
      for (const [slot] of ACC_SLOTS) {
        if (p.acc[slot] != null && cleanPaint(String(p.acc[slot]))) {
          out.acc[slot] = String(p.acc[slot]);
        }
      }
    }
    if (p.maze && typeof p.maze === "object") {
      out.maze = {};
      for (const k of ["turret", "base", "treads"]) {
        if (typeof p.maze[k] === "boolean") {
          out.maze[k] = p.maze[k];
        }
      }
    }
    presets.push(out);
  }
  if (!presets.length) {
    return null;
  }
  return normEntry({
    nickname: cleanText(e.nickname, 40),
    playerName: cleanText(e.playerName, 40),
    enabled: e.enabled !== false,
    active: Number.isInteger(e.active) ? e.active : 0,
    presets,
  });
}
function getCleanValue(v, depth) {
  // achievement progress: numbers, short text, lists and objects only
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : 0;
  }
  if (typeof v === "boolean") {
    return v;
  }
  if (typeof v === "string") {
    return v.slice(0, 200);
  }
  if (depth > 4 || !v || typeof v !== "object") {
    return undefined;
  }
  if (Array.isArray(v)) {
    return v.slice(-60).map((x) => getCleanValue(x, depth + 1));
  }
  const out = {};
  for (const k of Object.keys(v).slice(0, 300)) {
    const x = getCleanValue(v[k], depth + 1);
    if (x !== undefined) {
      out[String(k).slice(0, 60)] = x;
    }
  }
  return out;
}
export function readSlice(pid) {
  // this computer's looks and achievement progress for one account
  const e = PLAYER_COLOR_MAP[pid],
    stats = {};
  for (const k of STAT_KEYS) {
    if (STATS[k] && STATS[k][pid] !== undefined) {
      stats[k] = STATS[k][pid];
    }
  }
  return {
    v: 1,
    look: e
      ? {
          nickname: e.nickname,
          playerName: e.playerName,
          enabled: e.enabled,
          active: e.active,
          presets: e.presets,
        }
      : null,
    stats,
  };
}
const isEmpty = (slice) => !slice.look && !Object.keys(slice.stats).length;
const sigOf = (slice) => JSON.stringify(slice);
const lookSigOf = (slice) => JSON.stringify(slice.look);
function getMergedValue(a, b) {
  // two computers' progress joined: the higher number, both lists, every key
  if (typeof a === "number" && typeof b === "number") {
    return Math.max(a, b);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const seen = new Set(),
      out = [];
    for (const x of a.concat(b)) {
      const k = JSON.stringify(x);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(x);
      }
    }
    return out.slice(-60);
  }
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const out = Object.assign({}, a);
    for (const k of Object.keys(b)) {
      out[k] = k in a ? getMergedValue(a[k], b[k]) : b[k];
    }
    return out;
  }
  return b === undefined ? a : b;
}
function getMergedSlice(local, remote) {
  // nothing is lost: every saved look from both (the same look once), and the best of both for achievements
  const look = getCleanLook(remote.look),
    stats = getMergedValue(getCleanValue(remote.stats || {}, 0) || {}, local.stats || {});
  for (const k of RUN_KEYS) {
    if (local.stats && local.stats[k] !== undefined) {
      stats[k] = local.stats[k];
    }
  }
  const out = { v: 1, look: local.look || look, stats };
  if (local.look && look) {
    const seen = new Set(local.look.presets.map(presetSig)),
      presets = local.look.presets.slice();
    for (const p of look.presets) {
      if (presets.length < MAX_PRESETS && !seen.has(presetSig(p))) {
        seen.add(presetSig(p));
        presets.push(p);
      }
    }
    out.look = Object.assign({}, local.look, { presets });
  }
  return out;
}
function applySlice(pid, slice) {
  // puts a save's looks and progress in place of this computer's, for this account
  const look = getCleanLook(slice && slice.look);
  if (look) {
    PLAYER_COLOR_MAP[pid] = look;
  }
  const stats = getCleanValue((slice && slice.stats) || {}, 0) || {};
  for (const k of STAT_KEYS) {
    if (stats[k] !== undefined) {
      STATS[k] = STATS[k] || {};
      STATS[k][pid] = stats[k];
    }
  }
  saveToStorage();
  saveStats();
  try {
    if (panel.classList.contains("open")) {
      renderList();
    }
  } catch {}
  refreshSoon([pid]);
}
const readMark = (pid) => (SETTINGS.backupMark || {})[pid] || { ver: 0, sig: "" };
function applyMark(pid, ver, slice) {
  // what was last in step with the server, for this account
  SETTINGS.backupMark = Object.assign({}, SETTINGS.backupMark, {
    [pid]: { ver, sig: sigOf(slice), look: lookSigOf(slice), at: Date.now() },
  });
  saveSettings();
}

// ---- keeping in step ----
const ready = () => storageLoaded && backupOn() && srvOn();
async function applyPull(pid) {
  const st = (STATE[pid] = STATE[pid] || {});
  st.tried = Date.now();
  const r = await acctCall("pull", pid);
  if (r.status === 403) {
    st.status = "unproven";
    st.later = Date.now() + 30 * 60000; // (asked again in half an hour, or straight after the tank is proven)
    if (!st.askedProof) {
      st.askedProof = true;
      if (SETTINGS.proveOk) {
        if (await proveTank(pid)) {
          st.askedProof = false;
          st.later = 0;
          return applyPull(pid);
        }
      } else {
        needProof([pid]);
      }
    }
    return false;
  }
  if (r.error || r.status) {
    st.status = "error";
    st.later = Date.now() + 2 * 60000;
    return false;
  }
  st.status = "ok";
  const local = readSlice(pid),
    mark = readMark(pid);
  if (r.none) {
    st.ver = 0;
    return true;
  } // (nothing on the server yet: it goes up with the next check)
  st.ver = r.ver;
  st.at = r.at;
  if (!local.look && r.data && r.data.look) {
    toast("Restored " + (NAMES[pid] || "your tank") + "'s looks and achievements from your backup");
  } // (a computer that has never had this account's looks)
  if (isEmpty(local)) {
    applySlice(pid, r.data);
    applyMark(pid, r.ver, readSlice(pid));
  } else if (sigOf(local) === mark.sig) {
    if (r.ver > mark.ver) {
      applySlice(pid, r.data);
      applyMark(pid, r.ver, readSlice(pid));
    }
  } else {
    // changed here and maybe elsewhere too: joined, then sent back up
    const merged = getMergedSlice(local, r.data || { stats: {} });
    if (sigOf(merged) !== sigOf(local)) {
      applySlice(pid, merged);
    }
    SETTINGS.backupMark = Object.assign({}, SETTINGS.backupMark, {
      [pid]: Object.assign({}, mark, { ver: r.ver }),
    });
  }
  return true;
}
async function applyPush(pid) {
  const st = (STATE[pid] = STATE[pid] || {}),
    slice = readSlice(pid),
    mark = readMark(pid);
  if (isEmpty(slice) || sigOf(slice) === mark.sig) {
    return;
  }
  const r = await acctCall("push", pid, { data: slice, base: st.ver != null ? st.ver : mark.ver });
  if (r.ok) {
    st.ver = r.ver;
    st.at = r.at;
    st.dirtyAt = 0;
    applyMark(pid, r.ver, slice);
  } else if (r.status === 409) {
    st.pulled = false;
  } // (another computer saved first: taken in at the next check, then sent again)
  else if (r.status === 429 && r.wait) {
    st.later = Date.now() + r.wait;
  } else if (r.status === 403) {
    st.pulled = false;
    st.status = "unproven";
    st.later = Date.now() + 30 * 60000;
  } // (another computer proved the tank since: this one waits, or goes again straight after it proves)
}
export async function applyBackupCheck(now) {
  if (!ready()) {
    return;
  }
  for (const pid of loggedInIds().filter((id) => /^\d{1,12}$/.test(String(id)))) {
    const st = (STATE[pid] = STATE[pid] || {});
    if (st.status === "unproven" && ((SETTINGS.proven || {})[pid] || 0) > (st.tried || 0)) {
      st.later = 0;
    } // (proven since: straight away)
    if (st.busy || (st.later && Date.now() < st.later)) {
      continue;
    }
    st.busy = true;
    try {
      if (!NAMES[pid]) {
        lookupById(pid)
          .then((d) => {
            if (d && d.username) {
              NAMES[pid] = d.username;
            }
          })
          .catch(() => {});
      }
      if (!st.pulled) {
        st.pulled = await applyPull(pid);
      }
      if (st.pulled) {
        const slice = readSlice(pid),
          mark = readMark(pid);
        if (sigOf(slice) !== mark.sig) {
          st.dirtyAt = st.dirtyAt || Date.now();
          const lookChanged = lookSigOf(slice) !== mark.look,
            wait = lookChanged ? LOOK_WAIT_MS : STATS_WAIT_MS;
          if (now || Date.now() - st.dirtyAt >= wait) {
            await applyPush(pid);
          }
        }
      }
    } catch {}
    st.busy = false;
  }
}

// ---- Settings > Backup ----
export async function readHistory(pid) {
  const r = await acctCall("hist", pid);
  return r.ok && r.data ? r.data : null;
}
export async function applyOlder(pid, ver) {
  // an earlier backup in place of this computer's looks and progress, with an undo
  const r = await acctCall("pull", pid, { ver });
  if (!r.data) {
    toast("Couldn't get that backup", true);
    return;
  }
  SETTINGS.backupUndo = { pid, at: Date.now(), slice: readSlice(pid) };
  applySlice(pid, r.data);
  saveSettings();
  STATE[pid] = Object.assign(STATE[pid] || {}, { dirtyAt: Date.now() - LOOK_WAIT_MS });
  toast("Earlier backup restored. Undo it in ⚙ Settings > Backup");
}
export function applyUndo() {
  const u = SETTINGS.backupUndo;
  if (!u || Date.now() - u.at > 7 * 86400000) {
    return;
  }
  applySlice(u.pid, u.slice);
  delete SETTINGS.backupUndo;
  saveSettings();
  toast("Put back how it was before the restore");
}
export async function applyDelete(pid) {
  const r = await acctCall("delete", pid);
  if (r.ok) {
    SETTINGS.backupMark = Object.assign({}, SETTINGS.backupMark);
    delete SETTINGS.backupMark[pid];
    saveSettings();
    STATE[pid] = { pulled: true, ver: 0, status: "ok" };
  }
  return !!r.ok;
}
export async function readAccountMessages() {
  // conversations sent as each logged-in account, from any computer
  if (!srvOn() || !(shareMine() || backupOn())) {
    return [];
  }
  const out = [];
  for (const pid of loggedInIds().filter((id) => /^\d{1,12}$/.test(String(id)))) {
    if (!STATE[pid] || STATE[pid].status !== "ok") {
      continue;
    } // (only once the server has accepted this copy's key for the account: a wrong key is counted as a guess)
    const r = await acctCall("messages", pid);
    if (r.ok && r.data && Array.isArray(r.data.items)) {
      out.push(...r.data.items);
    }
  }
  return out;
}
export const readSupportId = () =>
  new Promise((res) => {
    const n = ++rid;
    waiting[n] = res;
    post({ type: "supportId", rid: n });
    setTimeout(() => {
      if (waiting[n]) {
        delete waiting[n];
        res(null);
      }
    }, 5000);
  });
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
export function populateBackup(host, row) {
  // the Backup part of ⚙ Settings
  host.innerHTML = "";
  row(
    host,
    backupOn(),
    "Back up my looks and achievements",
    "Kept on Color Lab's server for your account, so they come back on any computer you log in on",
    () => {
      SETTINGS.backup = !backupOn();
      saveSettings();
      renderSettings();
      if (backupOn()) {
        applyBackupCheck();
      }
    },
  );
  if (!backupOn()) {
    return;
  }
  const ids = loggedInIds().filter((id) => /^\d{1,12}$/.test(String(id)));
  for (const pid of ids) {
    const st = STATE[pid] || {},
      line = document.createElement("small");
    line.className = "mzsub";
    line.style.display = "block";
    const who = NAMES[pid] || "Tank " + pid;
    line.textContent =
      who +
      ": " +
      (st.status === "unproven"
        ? "prove the tank is yours first (🛡 below)"
        : st.status === "error"
          ? "couldn't reach the server, trying again soon"
          : st.at
            ? "✓ backed up " + ago(st.at)
            : st.pulled
              ? "✓ backed up"
              : "checking…");
    host.appendChild(line);
  }
  const btns = document.createElement("div");
  btns.className = "row setbtns";
  btns.style.cssText = "gap:6px;flex-wrap:wrap;margin-top:4px";
  const mk = (text, title, fn, grey) => {
    const b = document.createElement("button");
    b.className = "small" + (grey ? " grey" : "");
    b.textContent = text;
    b.title = title;
    b.onclick = fn;
    btns.appendChild(b);
    return b;
  };
  if (ids.length) {
    mk("⏪ Restore an earlier backup", "The last 5 backups of your logged-in tank, from the last 30 days", async () => {
      const pid = ids[0],
        h = await readHistory(pid);
      if (!h || !h.older || !h.older.length) {
        toast("No earlier backups yet");
        return;
      }
      const pick = h.older[0];
      if (
        await uiConfirm(
          "Restore an earlier backup",
          "Put back " +
            (NAMES[pid] || "your tank") +
            "'s looks and achievements from " +
            ago(pick.at) +
            "? You can undo it.",
          "Restore",
        )
      ) {
        applyOlder(pid, pick.ver);
      }
    });
  }
  const u = SETTINGS.backupUndo;
  if (u && Date.now() - u.at < 7 * 86400000) {
    mk("↩ Undo restore", "Puts back how it was before you restored an earlier backup", () => {
      applyUndo();
      renderSettings();
    });
  }
  if (ids.length) {
    mk(
      "🗑 Delete my backup",
      "Removes this account's backup from Color Lab's server. Your looks on this computer stay",
      async () => {
        const pid = ids[0];
        if (
          await uiConfirm(
            "Delete your backup",
            "Remove " +
              (NAMES[pid] || "your tank") +
              "'s backup from Color Lab's server? Your looks on this computer stay.",
            "Delete",
            true,
          )
        ) {
          const ok = await applyDelete(pid);
          toast(
            ok ? "Backup deleted. Backup is now off, so it isn't made again" : "Couldn't delete it, try again",
            !ok,
          );
          if (ok) {
            SETTINGS.backup = false;
            saveSettings();
          }
          renderSettings();
        }
      },
      true,
    );
  }
  host.appendChild(btns);
}

export function startAccountSync() {
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.__ttcl !== true || d.dir !== "toPage") {
      return;
    }
    if (d.type === "acctRes" || d.type === "supportIdRes") {
      const f = waiting[d.rid];
      if (f) {
        delete waiting[d.rid];
        f(d.type === "acctRes" ? d.res || {} : d.id || null);
      }
    }
  });
  setInterval(() => {
    if (!document.hidden) {
      applyBackupCheck();
    }
  }, 15000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      applyBackupCheck(true);
    }
  }); // (leaving the tab: anything waiting goes up now)
}
