import { PATTERN_AVG } from "../content/colours.js";
import { normVal, partyColours } from "../content/registries.js";
import { randomAccessories, renderAccs } from "./accessories.js";
import { DEV_TROPHIES, syncDevTrophies } from "./achievements.js";
import { CUSTOM_BOXES, boxShown } from "./custom-box-art.js";
import { loggedInIds, refreshTanks } from "./game-socket.js";
import { $, PARTS, formAcc, schedulePreview, setPart, toast } from "./panel.js";
import { saveForm } from "./panel-actions.js";
import { COLOR_HISTORY, PLAYER_COLOR_MAP, SETTINGS, allBoxes, saveSettings } from "./storage.js";

// ---------- random colours ----------
const randomHex = () =>
  "0x" +
  Math.floor(Math.random() * 0x1000000)
    .toString(16)
    .padStart(6, "0");
function savedPool() {
  const pool = new Set(COLOR_HISTORY.map(normVal).filter(Boolean));
  for (const id in PLAYER_COLOR_MAP) {
    for (const p of PLAYER_COLOR_MAP[id].presets || [PLAYER_COLOR_MAP[id]]) {
      ["turret", "base", "treads"].forEach((k) => {
        const c = normVal(p[k]);
        if (c) {
          pool.add(c);
        }
      });
    }
  }
  return [...pool];
}
function sourcePool(src) {
  if (src === "saved") {
    return savedPool();
  }
  if (src === "patterns") {
    return Object.keys(PATTERN_AVG).map((id) => "p:" + id);
  }
  const boxes = allBoxes();
  const customPaints = (b) => (b.paints || []).filter((v) => normVal(v));
  if (src === "boxes") {
    return [...new Set([...Object.values(boxes).flat(), ...CUSTOM_BOXES.filter(boxShown).flatMap(customPaints)])];
  }
  if (src && src.startsWith("box:")) {
    return boxes[src.slice(4)] || [];
  }
  if (src && src.startsWith("custom:")) {
    const b = CUSTOM_BOXES.find((x) => "custom:" + x.id === src);
    return b && boxShown(b) ? customPaints(b) : [];
  }
  return null; // any
}
// n colours from the chosen source; from saved colours, avoids repeats where the pool allows
export function randomColours(n, quiet) {
  const src = SETTINGS.rnd;
  if (src !== "any") {
    const pool = sourcePool(src) || [];
    if (pool.length) {
      const bag = pool.slice(),
        out = [];
      for (let i = 0; i < n; i++) {
        if (!bag.length) {
          bag.push(...pool);
        }
        out.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
      }
      return out;
    }
    if (!quiet) {
      toast("Nothing in that set yet — used random colours", true);
    }
  }
  return Array.from({ length: n }, randomHex);
}
// Party mode: your logged-in tanks get new random colours (from the chosen source) every round.
// Kept in memory only; your saved colours are untouched and come back when party mode is off.
export function partyRoll() {
  const ids = loggedInIds();
  if (!ids.length) {
    return;
  }
  ids.forEach((id) => {
    const [turret, base, treads] = randomColours(3, true);
    partyColours[id] = { turret, base, treads, acc: randomAccessories() };
  });
  refreshTanks(ids);
}
export function syncParty() {
  $("party").classList.toggle("on", !!SETTINGS.party);
  $("party").classList.toggle("grey", !SETTINGS.party);
}
// Dev options switch (DEV build only)
export function syncDev() {
  const b = $("devToggle");
  b.hidden = !DEV_BUILD;
  b.classList.toggle("on", DEV_TROPHIES);
  b.classList.toggle("grey", !DEV_TROPHIES);
  b.textContent = DEV_TROPHIES ? "DEV" : "DEV off";
}

export function startRandom() {
  $("devToggle").onclick = () => {
    SETTINGS.devOff = !SETTINGS.devOff;
    syncDevTrophies();
    saveSettings();
    syncDev();
    toast(
      DEV_TROPHIES
        ? "Dev options on - reload the page"
        : "Dev options off: works like the public copy - reload the page",
    );
  };
  syncDev();
  $("party").onclick = () => {
    SETTINGS.party = !SETTINGS.party;
    saveSettings();
    syncParty();
    if (SETTINGS.party) {
      partyRoll();
      toast("Party mode on: new colours every round");
    } else {
      const ids = Object.keys(partyColours);
      ids.forEach((id) => delete partyColours[id]);
      refreshTanks(ids);
      toast("Party mode off");
    }
  };
  $("rndAll").onclick = () => {
    const cs = randomColours(3);
    PARTS.forEach(([k], i) => setPart(k, cs[i]));
    const acc = randomAccessories();
    if (acc) {
      Object.assign(formAcc, acc);
      renderAccs();
    }
    schedulePreview();
  };

  $("save").onclick = () => saveForm(false);
}
