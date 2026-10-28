import { post } from "../content/bridge-messages.js";
import { BOXES, GX_PAINT, isPat, patId } from "../content/colours.js";
import { flatHex } from "../content/registries.js";
import { syncDevTrophies } from "./achievements.js";
import { customAccValue } from "./custom-box-art.js";
import { loggedInIds, refreshSoon, warmLooks } from "./game-socket.js";
import { laikaDog } from "./laika-look.js";
import { shareMyLooks } from "./look-sharing.js";
import { renderPalette, renderSources } from "./palette.js";
import { panel } from "./panel.js";
import { syncPower } from "./panel-actions.js";
import { partyRoll, syncDev, syncParty } from "./random.js";
import { renderList } from "./saved-looks.js";
import { keepOnScreen } from "./settings.js";
import { registerRaceNumber } from "./trophy-art.js";
import { tutAuto } from "./updates.js";

// ---------- storage (extension storage, via bridge.js) ----------
// This script runs inside the page so it can see the game's traffic, which means it can't use
// chrome.storage directly. bridge.js runs in the extension's isolated world and loads/saves for it
// over window.postMessage.
export let PLAYER_COLOR_MAP = {};
export let COLOR_HISTORY = [];
export let GUI_POS = { x: 50, y: 50 };
export let SETTINGS = {
  on: true,
  party: false,
  rnd: "any",
  swatch: "recent",
  rndAcc: [],
  garageAll: false,
  mazePatterns: true,
}; // rndAcc: accessory slots 🎲 also rolls // on = master switch
// Hidden Laika trophies: streak = Laika kills in a row without dying (per tank), unlocked/seen per tank
export let STATS = {
  streak: {},
  best: {},
  unlocked: {},
  seen: {},
  dstreak: {},
  dbest: {},
  weapons: {},
  gstreak: {},
  gbest: {},
};
export const saveStats = () => post({ type: "save", items: { tt_stats: STATS } });
export const resetStats = () => {
  STATS = {
    streak: {},
    best: {},
    unlocked: {},
    seen: {},
    dstreak: {},
    dbest: {},
    weapons: {},
    gstreak: {},
    gbest: {},
  };
  saveStats();
};
export const trimHistory = () => {
  COLOR_HISTORY = COLOR_HISTORY.slice(0, 32);
};
export const wipeSavedLooks = () => {
  PLAYER_COLOR_MAP = {};
  COLOR_HISTORY = [];
};
export let BOX_EXTRA = {}; // box colours seen in garages that aren't in the built-in table (e.g. retired boxes)
const OLD_KEYS = ["tt_custom_colors", "tt_color_history", "tt_gui_pos"];
export const saveToStorage = () => {
  post({ type: "save", items: { tt_custom_colors: PLAYER_COLOR_MAP, tt_color_history: COLOR_HISTORY } });
  try {
    shareMyLooks();
  } catch {}
};
export const savePos = () => post({ type: "save", items: { tt_gui_pos: GUI_POS } });
export const saveSettings = () => {
  post({ type: "save", items: { tt_settings: SETTINGS } });
  post({ type: "badge", on: SETTINGS.on });
};
export const saveBoxes = () => post({ type: "save", items: { tt_boxes: BOX_EXTRA } });
export const seenEarly = new Set(),
  warmedIds = new Set(); // tanks the game asked about before saved data loaded
export let storageLoaded = false,
  hintSeen = true; // hintSeen is set from storage on load
export let TUTS = null,
  WAS_USER = false; // tutorial progress (tt_tutorial), and whether this browser had Color Lab data before

let storageWait = []; // details requests waiting for your saved looks (a moment at most)
export const whenStorage = () =>
  storageLoaded
    ? Promise.resolve()
    : new Promise((r) => {
        storageWait.push(r);
        setTimeout(r, 1500);
      });
function onStorageInit(data) {
  storageLoaded = true;
  setTimeout(() => {
    storageWait.forEach((r) => r());
    storageWait = [];
  }, 0);
  {
    let n = 0;
    const up = () => {
      try {
        if (loggedInIds().length) {
          return shareMyLooks();
        }
      } catch {}
      if (++n < 40) {
        setTimeout(up, 3000);
      }
    };
    setTimeout(up, 3000);
  } // your look goes up once your tanks are known
  if (data) {
    let colors = data.tt_custom_colors,
      hist = data.tt_color_history,
      pos = data.tt_gui_pos;
    if (!data.tt_migrated) {
      // One-time move of anything saved by the old userscript / pre-1.1 versions (page localStorage)
      const old = (k, d) => {
        try {
          return JSON.parse(localStorage.getItem(k)) || d;
        } catch {
          return d;
        }
      };
      colors = Object.assign({}, old("tt_custom_colors", {}), colors || {});
      if (!hist || !hist.length) {
        hist = old("tt_color_history", []);
      }
      if (!pos) {
        pos = old("tt_gui_pos", null);
      }
      post({
        type: "migrate",
        items: {
          tt_custom_colors: colors,
          tt_color_history: hist || [],
          tt_gui_pos: pos || GUI_POS,
          tt_migrated: true,
        },
      });
    }
    hintSeen = !!data.tt_seen_hint;
    TUTS = data.tt_tutorial && typeof data.tt_tutorial === "object" ? data.tt_tutorial : null;
    WAS_USER = !!(
      data.tt_seen_hint ||
      data.tt_settings ||
      (data.tt_custom_colors && Object.keys(data.tt_custom_colors).length)
    );
    if (data.tt_settings) {
      SETTINGS = Object.assign(SETTINGS, data.tt_settings);
    }
    try {
      registerRaceNumber();
    } catch {}
    syncDevTrophies();
    if (!Array.isArray(SETTINGS.rndAcc)) {
      SETTINGS.rndAcc =
        SETTINGS.rndAcc === "all"
          ? ["turret", "barrel", "front", "back"]
          : SETTINGS.rndAcc && SETTINGS.rndAcc !== "off"
            ? [SETTINGS.rndAcc]
            : [];
    }
    if (data.tt_boxes) {
      BOX_EXTRA = data.tt_boxes;
    }
    if (data.tt_stats && typeof data.tt_stats === "object") {
      STATS = Object.assign(STATS, data.tt_stats);
    }
    ["dstreak", "dbest", "weapons", "gstreak", "gbest"].forEach((k) => {
      if (!STATS[k]) {
        STATS[k] = {};
      }
    });
    PLAYER_COLOR_MAP = colors || {};
    for (const id in PLAYER_COLOR_MAP) {
      normEntry(PLAYER_COLOR_MAP[id]);
    }
    COLOR_HISTORY = hist || [];
    if (pos && typeof pos.x === "number") {
      GUI_POS = pos;
    }
  }
  post({ type: "badge", on: SETTINGS.on });
  if (typeof onDataLoaded === "function") {
    onDataLoaded();
  }
}

// A saved tank: { nickname, playerName, enabled, active, presets:[{name,turret,base,treads}], turret, base, treads }
// turret/base/treads mirror the active preset (older saves had only those, so they become preset "Main").
export function normEntry(e) {
  if (!Array.isArray(e.presets) || !e.presets.length) {
    e.presets = [{ name: "Main", turret: e.turret || null, base: e.base || null, treads: e.treads || null }];
  }
  if (!(e.active >= 0 && e.active < e.presets.length)) {
    e.active = 0;
  }
  if (e.enabled === undefined) {
    e.enabled = true;
  }
  syncActive(e);
  return e;
}
export function syncActive(e) {
  const p = e.presets[e.active];
  e.turret = p.turret || null;
  e.base = p.base || null;
  e.treads = p.treads || null;
  e.acc = p.acc || null;
  e.maze = p.maze || null;
}
export const presetSig = (x) =>
  !x
    ? ""
    : JSON.stringify([
        x.turret || null,
        x.base || null,
        x.treads || null,
        Object.entries(x.acc || {})
          .map(([k, v]) => k + "=" + v)
          .sort(),
        Object.entries(x.maze || {})
          .map(([k, v]) => k + "=" + v)
          .sort(),
      ]); // two looks are the same when this matches
export const hasLook = (p) => !!(p && (p.turret || p.base || p.treads || (p.acc && Object.keys(p.acc).length)));

// ---------- colour helpers ----------
export function allBoxes() {
  const out = {};
  for (const src of [BOXES, BOX_EXTRA]) {
    for (const id in src) {
      out[id] = out[id] || [];
      for (const c of src[id]) {
        if (!out[id].includes(c)) {
          out[id].push(c);
        }
      }
    }
  }
  for (const id in out) {
    if (!out[id].length) {
      delete out[id];
    }
  }
  return out;
}

// ---- add-on registries (filled in the ADD-ONS section further down; read lazily) ----
export const mkColour = (v) => {
  if (isPat(v) && GX_PAINT[patId(v)]) {
    // drawn by the extension; until it's ready, its main colour
    const iv = customAccValue(patId(v));
    return iv
      ? { type: "image", rawValue: v, numericValue: flatHex(v), imageValue: iv }
      : { type: "numeric", rawValue: v, numericValue: flatHex(v), imageValue: "" };
  }
  return isPat(v)
    ? { type: "image", rawValue: v, numericValue: flatHex(v), imageValue: patId(v) }
    : { type: "numeric", rawValue: v, numericValue: v, imageValue: "" };
};

// Saved data arrives from extension storage a moment after start-up
function onDataLoaded() {
  keepOnScreen();
  if (panel.classList.contains("open")) {
    renderSources();
    renderPalette();
    renderList();
    syncPower();
    syncParty();
    syncDev();
  }
  if (SETTINGS.party) {
    partyRoll();
  } // party mode stays on across reloads
  const ids = Object.keys(PLAYER_COLOR_MAP).filter((id) => seenEarly.has(id));
  if (ids.length) {
    refreshSoon(ids);
  } // only tanks the game already drew before the data arrived (normally none: their details wait for it)
  warmLooks(); // your saved looks' pictures straight away, so no tank shows a stand-in picture first
  if (SETTINGS.laikaDog) {
    try {
      laikaDog();
    } catch {}
  } // Laika's dog sheet, ready before the menu's dog is made
  if (!hintSeen) {
    hintSeen = true;
    post({ type: "save", items: { tt_seen_hint: true } });
  }
  const go = () => setTimeout(tutAuto, 2500);
  if (document.body) {
    go();
  } else {
    document.addEventListener("DOMContentLoaded", go);
  }
}

// ---------- tutorial, What's new and help ----------
export function tutSave(patch) {
  TUTS = Object.assign({ ver: 0, seen: {} }, TUTS || {}, patch);
  post({ type: "save", items: { tt_tutorial: TUTS } });
}

export function startStorage() {
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.__ttcl !== true || d.dir !== "toPage") {
      return;
    }
    if (d.type === "init" && !storageLoaded) {
      onStorageInit(d.data || {});
    } else if (d.type === "migrated") {
      OLD_KEYS.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
    }
  });
  post({ type: "hello" });
  setTimeout(() => {
    if (!storageLoaded) {
      onStorageInit(null);
    }
  }, 4000); // never hang the game if the bridge is missing
}
