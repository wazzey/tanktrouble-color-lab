import { ACC_BOXES, ACC_SLOTS, GX_ACC, GX_PAINT, isPat, normHex, patId } from "../content/colours.js";
import { CUSTOM_ART, CUSTOM_ICONS, boxPixelFn, paintLabel, recolour } from "../content/custom-boxes.js";
import {
  ART_BLOBS,
  ART_REV,
  BOX_ART_REV,
  BOX_GROUPS,
  CUSTOM_BOX_IDS,
  FOLDER_BACK,
  FOLDER_GAME,
  FOLDER_GROUP0,
  FOLDER_LAB,
  GARAGE_ART,
  GARAGE_PICS,
  bgActive,
  bgPending,
  bgQueue,
  boxInFolder,
  breathe,
  garageAllBoxes,
  garageContent,
  groupOfBox,
  isBlankPic,
  isLabBoxId,
  picDb,
  renderBoxNav,
} from "../content/garage-folders.js";
import { loadImg } from "../content/images.js";
import { MAZE_TILE } from "../content/maze-patterns.js";
import { EXT_ITEM } from "../content/registries.js";
import { ASSET_MAP, getAssetMap } from "./assets.js";
import {
  CUSTOM_BOXES,
  GALAXY_BOX,
  afterCustomArt,
  boxOfKey,
  boxShown,
  customItems,
  galaxyArt,
  garageArtReady,
  getCustomArt,
  isCustomKey,
} from "./custom-box-art.js";
import { trophyAccValue } from "./draw-swap.js";
import { garageSig, garageSnap, lookupById, refreshSoon, refreshTanks, warmLooks } from "./game-socket.js";
import { garageGame, hookPhaser, noteGaragePid, selPid, wantGarageBox } from "./garage.js";
import { buildGarageIndex, gsPicSoon } from "./garage-search.js";
import { PLAYER_COLOR_MAP, SETTINGS, allBoxes, mkColour, saveSettings } from "./storage.js";
import { TROPHY_ART, cropCanvas, getTrophyArt, noteBoneCarrier, readPixels } from "./trophy-art.js";

// ---------- tutorial arrows ----------
// The game points arrows at your tank for its tutorials. Only the first-hat one is kept (earn your first gold,
// buy and wear the hat) — and only while you're actually doing it for the first time. The rest are hidden.
// Tutorial numbers (the game's own order): 0 = earn gold & buy the hat, 1 = wear the hat, 2 = guest sign-up.
const TUT = {},
  hatFromStart = new Set();
let tutStyle = null;
export function noteTutorials(data) {
  if (!data || typeof data !== "object") {
    return;
  }
  for (const id in data) {
    const n = Number(data[id]);
    if (!Number.isFinite(n)) {
      continue;
    }
    TUT[id] = n;
    if (n === 0) {
      hatFromStart.add(id);
    }
  }
  syncTutorialArrows();
}
function syncTutorialArrows() {
  if (!tutStyle) {
    tutStyle = document.createElement("style");
    tutStyle.textContent = ".tutorialMarker{display:none!important}";
    (document.head || document.documentElement).appendChild(tutStyle);
  }
  // shown only for someone genuinely on their first hat (started at "earn gold" this session)
  tutStyle.disabled = Object.keys(TUT).some((id) => TUT[id] === 0 || (TUT[id] === 1 && hatFromStart.has(id)));
}
// The hat tutorials check your turret accessory (no. 3) and garage to decide you're done, and then tell the
// server. Color Lab must never make that happen falsely, so the hat is never faked for a tank on those steps.
export const hatTutorial = (id) => TUT[id] === 0 || TUT[id] === 1;

// ---------- in-game garage: Real / All ----------
// "Real" = the garage as the game sends it. "All" = every box, paint and accessory is added to the garage.
// Picking something you own goes to the server as normal; picking something you don't own is NOT sent —
// it's saved as this tank's Color Lab look instead (only you see it) and the garage is told it worked.
export const ownedRaw = {},
  ownedAcc = {}; // per player: what their real garage holds
export const garageMode = {}; // per player: whether the garage contents the game holds were made in All mode
// Real / All is per garage tank (SETTINGS.garageAllFor[id]); tanks never switched follow the last global choice
export const garageAllRaw = (pid) => {
  const f = SETTINGS.garageAllFor;
  return pid != null && f && Object.prototype.hasOwnProperty.call(f, String(pid))
    ? !!f[String(pid)]
    : !!SETTINGS.garageAll;
};
export const garageAllOn = (pid) => !!(SETTINGS.on && garageAllRaw(pid));
const colKey = (c) =>
  !c
    ? null
    : c.type === "image"
      ? "p:" + c.imageValue
      : typeof c.numericValue === "number"
        ? "0x" + c.numericValue.toString(16).padStart(6, "0")
        : normHex(c.numericValue);
export let BOX15_IMG = null; // the retired box's art isn't in the game any more: a plain placeholder box is drawn instead
export function getBox15() {
  if (BOX15_IMG) {
    return Promise.resolve(BOX15_IMG);
  }
  const cv = document.createElement("canvas");
  cv.width = 560;
  cv.height = 280;
  const g = cv.getContext("2d"); // closed | opened, like the game's own box sheets
  const box = (ox, open) => {
    const x = ox + 60,
      y = 110,
      w = 160,
      h = 130,
      gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, "#8a8f99");
    gr.addColorStop(1, "#5a5f69");
    g.lineJoin = "round";
    g.lineWidth = 6;
    g.strokeStyle = "#2a2d33";
    if (open) {
      g.fillStyle = "#3a3e46";
      g.fillRect(x + 8, y - 4, w - 16, 20);
      g.save();
      g.translate(x, y);
      g.rotate(-0.5);
      g.fillStyle = "#9aa0aa";
      g.fillRect(-6, -40, w + 12, 40);
      g.strokeRect(-6, -40, w + 12, 40);
      g.restore();
    }
    g.fillStyle = gr;
    g.fillRect(x, y, w, h);
    g.strokeRect(x, y, w, h);
    if (!open) {
      g.fillStyle = "#9aa0aa";
      g.fillRect(x - 8, y - 30, w + 16, 34);
      g.strokeRect(x - 8, y - 30, w + 16, 34);
    }
    g.fillStyle = "#e8eaee";
    g.font = "bold 72px Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("?", x + w / 2, y + h / 2 + 4);
  };
  box(0, false);
  box(280, true);
  return Promise.resolve((BOX15_IMG = cv.toDataURL("image/png")));
}

// ---------- Box folders in the garage ----------
const boxFolder = () => {
  const f = SETTINGS.boxFolder;
  if (!f || f === "all") {
    return "root";
  }
  return f.startsWith("lab:") && !BOX_GROUPS.some((x) => "lab:" + x.id === f) ? "lab" : f;
}; // an old group name -> Custom // 'root' (the two folders) | 'game' (Original) | 'lab' (Custom) | 'lab:<group>'
export function folderTarget(id) {
  id = +id;
  const f = boxFolder();
  if (id === FOLDER_BACK) {
    return f.startsWith("lab:") ? "lab" : "root";
  }
  if (id === FOLDER_GAME) {
    return "game";
  }
  if (id === FOLDER_LAB) {
    return "lab";
  }
  const gr = BOX_GROUPS[id - FOLDER_GROUP0];
  return gr ? "lab:" + gr.id : null;
}
let folderBase = null; // the game's own box picture (the grey TT crate), loaded once: every folder box is made from it
let folderBase2 = null; // the game's gold star box, for the Custom folder
async function folderArt() {
  if (folderBase) {
    return folderBase;
  }
  try {
    await getAssetMap();
    const u = ASSET_MAP && ASSET_MAP.box1,
      u2 = ASSET_MAP && ASSET_MAP.box2;
    if (u) {
      folderBase = await loadImg(u);
    }
    if (u2) {
      folderBase2 = await loadImg(u2);
    }
  } catch {}
  return folderBase;
}
function folderBoxPic(id) {
  // the game's crate in the folder's colour, a round emblem on it and the folder's name on a blue game-style label (closed + open frames)
  const key = "box" + id;
  if (GARAGE_PICS[key] || !folderBase) {
    return;
  }
  const gr = BOX_GROUPS[id - FOLDER_GROUP0];
  const spec =
    id === FOLDER_BACK
      ? ["Back", "⬅", "#8a90a0", true]
      : id === FOLDER_GAME
        ? ["Original", "📦", null, false]
        : id === FOLDER_LAB
          ? ["Custom", "✦", folderBase2 ? null : "#4f5cff", false]
          : [gr.name, gr.icon, gr.color || "#4f5cff", false];
  const c = document.createElement("canvas");
  c.width = 560;
  c.height = 280;
  const g = c.getContext("2d");
  for (let fr = 0; fr < 2; fr++) {
    const ox = fr * 280;
    const base = id === FOLDER_LAB && folderBase2 ? folderBase2 : folderBase,
      t = document.createElement("canvas");
    t.width = 280;
    t.height = 280;
    const tg = t.getContext("2d");
    tg.drawImage(base, fr * 280, 0, 280, 280, 0, 0, 280, 280);
    if (spec[2]) {
      tg.globalCompositeOperation = "color";
      tg.fillStyle = spec[2];
      tg.fillRect(0, 0, 280, 280);
      tg.globalCompositeOperation = "destination-in";
      tg.drawImage(base, fr * 280, 0, 280, 280, 0, 0, 280, 280);
      tg.globalCompositeOperation = "source-over";
    }
    if (spec[3]) {
      tg.globalCompositeOperation = "multiply";
      tg.fillStyle = "#9aa0ae";
      tg.fillRect(0, 0, 280, 280);
      tg.globalCompositeOperation = "destination-in";
      tg.drawImage(base, fr * 280, 0, 280, 280, 0, 0, 280, 280);
      tg.globalCompositeOperation = "source-over";
    }
    g.drawImage(t, ox + 6, 4, 268, 224); // the crate, a little fatter than a box (and shorter, to leave room for the label)
    const bx = ox + (fr ? 108 : 172),
      by = 126; // the emblem: a round badge on the crate's front
    g.fillStyle = "#141418";
    g.beginPath();
    g.arc(bx, by, 34, 0, 7);
    g.fill();
    const bg = g.createLinearGradient(0, by - 30, 0, by + 30);
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(1, "#d8dde6");
    g.fillStyle = bg;
    g.beginPath();
    g.arc(bx, by, 29, 0, 7);
    g.fill();
    g.font = "34px TankTrouble, Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = id === FOLDER_LAB ? "#4f5cff" : "#141418";
    g.fillText(spec[1], bx, by + 2);
    g.font = "28px TankTrouble, Arial, sans-serif";
    const w = Math.min(250, g.measureText(spec[0]).width + 34),
      lx = ox + 140 - w / 2; // the label, like the game's blue buttons
    g.fillStyle = "rgba(0,0,0,.45)";
    g.beginPath();
    g.roundRect(lx, 238, w, 38, 8);
    g.fill();
    const lb = g.createLinearGradient(0, 236, 0, 272);
    lb.addColorStop(0, "#427fff");
    lb.addColorStop(1, "#0014ab");
    g.fillStyle = lb;
    g.beginPath();
    g.roundRect(lx, 234, w, 38, 8);
    g.fill();
    g.fillStyle = "#ffffff";
    g.fillText(spec[0], ox + 140, 254, 236);
  }
  GARAGE_PICS[key] = c.toDataURL();
}
const folderBox = (id) => {
  folderBoxPic(id);
  return { id, accessories: [], sprayCans: [] };
};
async function boxFolderOut(res, json, g, changed) {
  garageAllBoxes[String(g.playerId)] = g.boxes.map((b) => b.id);
  setTimeout(renderBoxNav, 50);
  if (!garageAllOn(String(g.playerId))) {
    return res;
  } // Real: the game's own boxes, no folders
  await folderArt();
  for (const k of Object.keys(GARAGE_PICS)) {
    if (/^box91[01]\d$/.test(k) && !GARAGE_PICS[k]) {
      delete GARAGE_PICS[k];
    }
  }
  const f = boxFolder();
  let boxes;
  if (f === "root") {
    boxes = [folderBox(FOLDER_GAME), folderBox(FOLDER_LAB)];
  } else if (f === "lab") {
    boxes = BOX_GROUPS.map((gr, i) =>
      g.boxes.some((b) => isLabBoxId(b.id) && groupOfBox(b.id) === gr.id) ? folderBox(FOLDER_GROUP0 + i) : null,
    ).filter(Boolean);
  } else {
    boxes = g.boxes.filter((b) => boxInFolder(b.id, f));
  } // (Back is a button next to All / Done, not a box)
  json.result.data = Object.assign({}, g, { boxes });
  const headers = new Headers(res.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return new Response(JSON.stringify(json), { status: res.status, statusText: res.statusText, headers });
}
export function openBoxFolder(f) {
  SETTINGS.boxFolder = f;
  saveSettings();
  renderBoxNav();
  syncGarageBack();
  const id = selPid();
  if (!id) {
    return;
  }
  refreshTanks([id], true);
  wantGarageBox(id); // the garage reloads with that folder's boxes
  setTimeout(() => {
    try {
      const gm = garageGame && garageGame.deref();
      if (gm && gm.state && gm.isBooted !== false) {
        gm.state.start("Load");
      }
    } catch {}
  }, 30);
}
export function syncGarageBack() {
  // the ← Back button next to All / Done: shown inside a folder (All view), goes up one level
  const form = document.querySelector(".garage form");
  if (!form) {
    return;
  }
  const all = form.querySelector("button.ttcl-garage");
  if (!all) {
    return;
  }
  let b = form.querySelector("button.ttcl-gback");
  if (!b) {
    b = document.createElement("button");
    b.type = "button";
    b.tabIndex = -1;
    b.className = "small ttcl-gback";
    b.style.cssText = "margin-right:6px;vertical-align:middle;";
    b.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const f = boxFolder();
      openBoxFolder(f.startsWith("lab:") ? "lab" : "root");
    });
    all.parentNode.insertBefore(b, all);
  }
  const pid = selPid(),
    f = boxFolder(),
    show = !!pid && garageAllOn(pid) && f !== "root";
  b.style.display = show ? "" : "none";
  const up = f.startsWith("lab:") ? "Custom" : "the folders";
  const txt = "← Back";
  if (b.textContent !== txt) {
    b.textContent = txt;
  }
  b.title = "Back to " + up;
}
export async function rewriteGarage(res) {
  hookPhaser();
  try {
    const json = JSON.parse(await res.clone().text());
    const g = json && json.result && json.result.data;
    if (!g || !Array.isArray(g.boxes)) {
      return res;
    }
    const pid = String(g.playerId);
    noteGaragePid(pid);
    await Promise.race([warmLooks(pid), new Promise((r) => setTimeout(r, 3000))]).catch(() => {}); // this tank's Color Lab paints and items ready before the garage draws it
    garageSnap[pid] = lookupById(pid)
      .then(garageSig)
      .catch(() => null); // real look before any changes
    const raw = (ownedRaw[pid] = new Set()),
      acc = (ownedAcc[pid] = new Set());
    let numType = "string",
      accType = "number";
    for (const b of g.boxes) {
      for (const s of b.sprayCans || []) {
        if (s.colour) {
          raw.add(String(s.colour.rawValue));
          if (s.colour.type === "numeric") {
            numType = typeof s.colour.numericValue;
          }
        }
      }
      for (const a of b.accessories || []) {
        acc.add(a.type + ":" + a.value);
        accType = typeof a.value;
      }
    }
    garageMode[pid] = garageAllOn(pid);
    garageContent[pid] = g;
    if (!garageAllOn(pid)) {
      if (pid === selPid()) {
        buildGarageIndex(g);
      }
      return await boxFolderOut(res, json, g);
    }
    const all = allBoxes(),
      byId = {};
    g.boxes.forEach((b) => {
      byId[b.id] = b;
    });
    const ids = [...new Set([...Object.keys(all), ...Object.keys(ACC_BOXES)])].map(Number).sort((a, b) => a - b);
    if (!byId[15] && ids.includes(15)) {
      await Promise.race([getBox15(), new Promise((r) => setTimeout(r, 2500))]);
    }
    for (const id of ids) {
      const fresh = !byId[id];
      if (fresh && id === 15 && !BOX15_IMG) {
        continue;
      } // no box art → leave it out rather than show a blank
      const b = byId[id] || { id, accessories: [], sprayCans: [] };
      b.sprayCans = b.sprayCans || [];
      b.accessories = b.accessories || [];
      const haveC = new Set(b.sprayCans.map((s) => colKey(s.colour)));
      for (const v of all[id] || []) {
        if (haveC.has(v)) {
          continue;
        }
        haveC.add(v);
        const c = mkColour(v);
        if (c.type === "numeric" && numType === "number") {
          c.numericValue = parseInt(v, 16);
        }
        b.sprayCans.push({ colour: c, boxNumber: id });
      }
      const haveA = new Set(b.accessories.map((a) => a.type + ":" + a.value));
      const slots = ACC_BOXES[id] || {};
      for (const [slot] of ACC_SLOTS) {
        for (const n of slots[slot] || []) {
          if (haveA.has(slot + ":" + n)) {
            continue;
          }
          haveA.add(slot + ":" + n);
          if (slot === "turret" && n === 3 && hatTutorial(pid)) {
            continue;
          } // see hatTutorial
          b.accessories.push({ type: slot, value: accType === "string" ? String(n) : n, boxNumber: id });
        }
      }
      if (fresh && (b.sprayCans.length || b.accessories.length)) {
        g.boxes.push(b);
        byId[id] = b;
      }
    }
    await addCustomGarageBoxes(g, numType);
    if (pid === selPid()) {
      buildGarageIndex(g);
    }
    return boxFolderOut(res, json, g, true);
  } catch {
    return res;
  }
}
// Finished garage pictures are kept in the browser (IndexedDB), so opening the garage doesn't redraw every
// custom item each time. The cache empties itself whenever this extension's code or the game's art changes.
export let PIC_CACHE = null,
  picCacheReq = null,
  picCacheDirty = false,
  picCacheTimer = 0;
const picCacheRev = () => ART_REV + "|" + ((ASSET_MAP && ASSET_MAP.turret) || "");
const picEntryBox = (k) => {
  const m = /^(?:i:|a:|can:|sw:)(.+)$/.exec(k);
  if (m) {
    return boxOfKey(m[1]) || "";
  }
  const b = /^box(\d+)$/.exec(k);
  if (b) {
    const cb = CUSTOM_BOXES.find((x) => CUSTOM_BOX_IDS[x.id] === +b[1]);
    return cb ? cb.id : "";
  }
  return "";
};
export function picCacheLoad() {
  if (PIC_CACHE) {
    return Promise.resolve(PIC_CACHE);
  }
  if (picCacheReq) {
    return picCacheReq;
  }
  picCacheReq = (async () => {
    const rev = picCacheRev(),
      out = {};
    try {
      const db = await picDb();
      const all = await new Promise((res, rej) => {
        const tx = db.transaction("pics"),
          st = tx.objectStore("pics"),
          keys = st.getAllKeys(),
          vals = st.getAll();
        tx.oncomplete = () => res([keys.result, vals.result]);
        tx.onerror = () => rej(tx.error);
      });
      const m = {};
      all[0].forEach((k, i) => {
        m[k] = all[1][i];
      });
      if (m.__rev === rev) {
        const was = m.__boxrev || {};
        delete m.__rev;
        delete m.__boxrev;
        const drop = [];
        for (const k in m) {
          const b = picEntryBox(k);
          if (
            (b && (was[b] || "") !== (BOX_ART_REV[b] || "")) ||
            (typeof m[k] === "string" && m[k].startsWith("blob:")) ||
            /^box91\d\d$/.test(k)
          ) {
            drop.push(k);
          } else {
            out[k] = m[k];
          }
        } // (blob: addresses saved by older versions are dead now: dropped)
        if (drop.length || JSON.stringify(was) !== JSON.stringify(BOX_ART_REV)) {
          await new Promise((res) => {
            const tx = db.transaction("pics", "readwrite"),
              st = tx.objectStore("pics");
            drop.forEach((k) => st.delete(k));
            st.put(Object.assign({}, BOX_ART_REV), "__boxrev");
            tx.oncomplete = res;
            tx.onerror = res;
          });
        }
      } else {
        await new Promise((res) => {
          const tx = db.transaction("pics", "readwrite");
          tx.objectStore("pics").clear();
          tx.objectStore("pics").put(rev, "__rev");
          tx.objectStore("pics").put(Object.assign({}, BOX_ART_REV), "__boxrev");
          tx.oncomplete = res;
          tx.onerror = res;
        });
      }
      db.close();
    } catch {}
    for (const k in out) {
      if (typeof out[k] === "string") {
        if (!GARAGE_PICS[k]) {
          GARAGE_PICS[k] = out[k];
        }
      } else if (k.startsWith("a:")) {
        ART_BLOBS[k.slice(2)] = out[k];
      }
    }
    PIC_CACHE = out;
    return out;
  })();
  return picCacheReq;
}
// Just one saved picture (no need to read the whole store while the game is starting): checks the store is for this
// version of the pictures, then reads that one entry
let picRevOk = null,
  picBoxRev = null;
export async function picBlobGet(key) {
  if (ART_BLOBS[key] instanceof Blob) {
    return;
  }
  try {
    const db = await picDb();
    if (picRevOk == null) {
      picRevOk = await new Promise((res) => {
        const r = db.transaction("pics").objectStore("pics").get("__rev");
        r.onsuccess = () => res(r.result === picCacheRev());
        r.onerror = () => res(false);
      });
    }
    if (picRevOk && picBoxRev == null) {
      picBoxRev = await new Promise((res) => {
        const r = db.transaction("pics").objectStore("pics").get("__boxrev");
        r.onsuccess = () => res(r.result || {});
        r.onerror = () => res({});
      });
    }
    const bx = boxOfKey(key) || "";
    if (picRevOk && bx && ((picBoxRev || {})[bx] || "") !== (BOX_ART_REV[bx] || "")) {
      db.close();
      return;
    } // that box's pictures changed: drawn fresh
    if (picRevOk) {
      const b = await new Promise((res) => {
        const r = db
          .transaction("pics")
          .objectStore("pics")
          .get("a:" + key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      });
      if (b instanceof Blob) {
        ART_BLOBS[key] = b;
      }
    }
    db.close();
  } catch {}
}
export function picCacheSave() {
  // writes new garage pictures a moment later, in one go
  picCacheDirty = true;
  if (picCacheTimer) {
    return;
  }
  picCacheTimer = setTimeout(async () => {
    picCacheTimer = 0;
    if (!PIC_CACHE || !picCacheDirty) {
      return;
    }
    picCacheDirty = false;
    const add = {};
    for (const k in GARAGE_PICS) {
      if (
        PIC_CACHE[k] !== GARAGE_PICS[k] &&
        typeof GARAGE_PICS[k] === "string" &&
        !GARAGE_PICS[k].startsWith("blob:") &&
        !/^box91\d\d$/.test(k)
      ) {
        add[k] = GARAGE_PICS[k];
      }
    }
    if (!Object.keys(add).length) {
      return;
    }
    try {
      const db = await picDb();
      const tx = db.transaction("pics", "readwrite"),
        st = tx.objectStore("pics");
      for (const k in add) {
        st.put(add[k], k);
      }
      tx.oncomplete = () => {
        Object.assign(PIC_CACHE, add);
        db.close();
      };
    } catch {}
  }, 1500);
}
export const artOf = (key) =>
  (TROPHY_ART && TROPHY_ART[key] && TROPHY_ART[key].frame) || CUSTOM_ART[key] || GARAGE_ART[key] || null;
export function artCacheSave(key) {
  const f = GX_PAINT[key] ? MAZE_TILE[key] : artOf(key);
  if (!f || ART_BLOBS[key] || !PIC_CACHE || typeof f.toBlob !== "function" || isBlankPic(f)) {
    return;
  } // (a paint: its tile; never an empty picture)
  ART_BLOBS[key] = true; // (being saved)
  f.toBlob(async (blob) => {
    if (!blob) {
      delete ART_BLOBS[key];
      return;
    }
    ART_BLOBS[key] = blob;
    try {
      const db = await picDb();
      const tx = db.transaction("pics", "readwrite");
      tx.objectStore("pics").put(blob, "a:" + key);
      tx.oncomplete = () => {
        PIC_CACHE["a:" + key] = blob;
        db.close();
      };
    } catch {}
  }, "image/png");
}
export async function artRestore(key) {
  // the saved full picture back into a canvas (decoded off the main thread)
  const blob = ART_BLOBS[key];
  if (!(blob instanceof Blob)) {
    return false;
  }
  try {
    const bm = await createImageBitmap(blob),
      c = document.createElement("canvas");
    c.width = bm.width;
    c.height = bm.height;
    c.getContext("2d").drawImage(bm, 0, 0);
    if (bm.close) {
      bm.close();
    }
    if (isCustomKey(key) && !CUSTOM_ART[key]) {
      CUSTOM_ART[key] = c;
      afterCustomArt(key);
    } else {
      GARAGE_ART[key] = c;
    }
    return true;
  } catch {
    return false;
  }
}
// makes sure the garage has both pictures of an item: its shelf icon and its full picture
async function garageReady(key, isPaint) {
  if (GARAGE_PICS["i:" + key] && (artOf(key) || (ART_BLOBS[key] instanceof Blob && (await artRestore(key))))) {
    return true;
  }
  if (isPaint || isCustomKey(key)) {
    await getCustomArt(key);
  } else {
    await getTrophyArt([key]);
  }
  garagePicFor(key);
  artCacheSave(key);
  await breathe();
  return !!artOf(key); // false: couldn't be drawn, so it's left out rather than showing a stand-in
}
export let lazyArt = false;
let bgRunning = false;
// Only what's in view is drawn straight away (the box you open, what the garage tank wears, box pictures); the rest of
// the queue is drawn slowly while the garage is idle, so nothing stutters
async function garageQuick(key, isPaint) {
  if (!(isPaint || isCustomKey(key))) {
    return garageReady(key, isPaint);
  } // hidden-achievement rewards: drawn now (few)
  if (GARAGE_PICS["i:" + key]) {
    return true;
  } // its shelf picture is saved: the full picture is only made if a tank in the garage wears it
  bgAdd(key);
  return true;
}
export function bgAdd(key, front) {
  if (front || key.startsWith("box:")) {
    bgActive.add(key);
  }
  const i = bgQueue.indexOf(key);
  if (i > -1) {
    if (!front) {
      return;
    }
    bgQueue.splice(i, 1);
  }
  front ? bgQueue.unshift(key) : bgQueue.push(key);
  bgRun();
}
async function bgRun() {
  if (bgRunning) {
    return;
  }
  bgRunning = true;
  try {
    while (bgQueue.length) {
      let i = bgQueue.findIndex((k) => bgActive.has(k));
      if (i < 0) {
        await new Promise((r) => setTimeout(r, 1200));
        if (bgQueue.some((k) => bgActive.has(k))) {
          continue;
        }
        i = 0;
      } // nothing in view left: the rest, one at a time with pauses
      const key = bgQueue.splice(i, 1)[0];
      bgActive.delete(key);
      if (key.startsWith("box:")) {
        const cb = CUSTOM_BOXES.find((b) => b.id === key.slice(4)),
          id = cb && CUSTOM_BOX_IDS[cb.id];
        const pic = cb && (await customBoxSheet(cb).catch(() => null));
        if (pic && id) {
          GARAGE_PICS["box" + id] = pic;
          bgSwap("box" + id, pic);
          picCacheSave();
        }
      } else {
        try {
          await garageReady(key, !!GX_PAINT[key]);
        } catch {}
        const had = bgPending[key] || [];
        for (const p of had) {
          const u = p.big ? garageFrameFor(key, p.w) : GARAGE_PICS["i:" + key];
          if (u) {
            bgSwap(p.lk, u);
          }
        }
        delete bgPending[key];
        picCacheSave();
        gsPicSoon();
        if (had.length) {
          setTimeout(() => garageArtReady(key), 300);
        }
        // the garage's big tank was already drawn with the stand-in: tanks wearing it are redrawn now it's ready
        if (had.some((p) => p.big)) {
          const ids = Object.keys(PLAYER_COLOR_MAP).filter((id) => {
            const e = PLAYER_COLOR_MAP[id];
            return (
              e &&
              ((e.acc && Object.values(e.acc).some((v) => String(v) === "ttcl:" + key)) ||
                [e.turret, e.base, e.treads].includes("p:" + key))
            );
          });
          const gp = selPid();
          if (gp && !ids.includes(gp)) {
            ids.push(gp);
          }
          if (ids.length) {
            refreshSoon(ids);
          }
        }
      }
      await breathe();
      if (!bgActive.size) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  } finally {
    bgRunning = false;
  }
}
function bgSwap(lk, url) {
  // put the finished picture into the open garage in place of its stand-in (same size, so nothing moves)
  try {
    const gm = garageGame && garageGame.deref(),
      ent = gm && gm.cache && gm.cache._cache && gm.cache._cache.image[lk];
    if (!ent || !ent.data) {
      return;
    }
    const img = ent.data;
    img.onload = () => {
      try {
        if (ent.base && ent.base.dirty) {
          ent.base.dirty();
        }
      } catch {}
      img.onload = null;
    };
    img.src = url;
  } catch {}
}
export function bgBox(boxId) {
  // the box you opened goes first
  const cb = CUSTOM_BOXES.find((b) => CUSTOM_BOX_IDS[b.id] === +boxId);
  if (!cb) {
    return;
  }
  const keys = [];
  for (const v of cb.paints || []) {
    if (isPat(v)) {
      keys.push(patId(v));
    }
  }
  for (const [slot] of ACC_SLOTS) {
    for (const it of customItems(cb, slot)) {
      keys.push(it.slice(5));
    }
  }
  keys.reverse().forEach((k) => {
    if (bgQueue.includes(k)) {
      bgAdd(k, true);
    }
  });
}
async function addCustomGarageBoxes(g, numType) {
  try {
    await getAssetMap();
    await Promise.all([picCacheLoad(), loadTankParts()]);
    lazyArt = true;
    const sets = CUSTOM_BOXES.filter(boxShown);
    for (const cb of sets) {
      const id = CUSTOM_BOX_IDS[cb.id];
      if (!id) {
        continue;
      }
      if (!GARAGE_PICS["box" + id]) {
        bgAdd("box:" + cb.id, true);
      } // (its picture drawn in the background, the game's plain box until then)
      const box = { id, accessories: [], sprayCans: [] };
      for (const v of cb.paints || []) {
        const c = mkColour(v);
        if (isPat(v)) {
          if (!(await garageQuick(patId(v), true)) || c.type !== "image") {
            continue;
          }
        } else if (numType === "number") {
          c.numericValue = parseInt(v, 16);
        }
        box.sprayCans.push({ colour: c, boxNumber: id });
      }
      for (const [slot] of ACC_SLOTS) {
        for (const item of customItems(cb, slot)) {
          const key = item.slice(5);
          if (!isCustomKey(key)) {
            noteBoneCarrier();
          }
          if (!(await garageQuick(key))) {
            continue;
          } // saved pictures if there are any, otherwise drawn in the background
          const value = trophyAccValue(key);
          if (!value) {
            continue;
          }
          box.accessories.push({ type: slot, value, boxNumber: id });
        }
      }
      if (box.sprayCans.length || box.accessories.length) {
        g.boxes.push(box);
      }
    }
    picCacheSave();
  } catch {
  } finally {
    lazyArt = false;
  }
}
export function customBoxSheet(customBox) {
  // full closed|open sheet, recoloured
  if (customBox.pic) {
    return String(customBox.pic).startsWith("ttcl-art:")
      ? loadImg(customBox.pic).then((im) => {
          if (!im) {
            return null;
          }
          const c = document.createElement("canvas");
          c.width = im.naturalWidth || im.width;
          c.height = im.naturalHeight || im.height;
          c.getContext("2d").drawImage(im, 0, 0);
          return c.toDataURL();
        })
      : Promise.resolve(customBox.pic);
  } // (a lasting picture: a blob: address dies with the page, and the saved copy would show as a broken box)
  if (customBox.picFn) {
    return customBox.picFn();
  }
  if (customBox.trophies === "galaxy") {
    return galaxyArt().then(() => GALAXY_BOX);
  }
  const from = customBox.picFrom || customBox.from;
  return getAssetMap()
    .then((map) => (map["box" + from] ? loadImg(map["box" + from]) : null))
    .then((img) => (img ? recolour(img, boxPixelFn(customBox)).toDataURL() : null))
    .catch(() => null);
}
// the pictures the garage asks for: an item's icon (shelf), its full tank-icon frame (welding sparks), or a paint
export function garageFrameFor(key, W) {
  // the item in a full tank-icon frame of width W (the garage samples it for sparks)
  const id = "f:" + key + "@" + W;
  if (!GARAGE_PICS[id]) {
    const frame = artOf(key);
    if (!frame) {
      return null;
    }
    const c = document.createElement("canvas");
    c.width = W;
    c.height = Math.round((W * frame.height) / frame.width);
    c.getContext("2d").drawImage(frame, 0, 0, c.width, c.height);
    GARAGE_PICS[id] = c.toDataURL();
    picCacheSave();
  }
  return GARAGE_PICS[id];
}
// Shelf picture for an item that only exists as a tank-icon frame (auras, capes, halos...): shown worn on a plain
// tank so it's whole, not a cut-out with holes where the tank would be.
export let TANK_PARTS = null,
  tankPartsReq = null;
export function loadTankParts() {
  if (TANK_PARTS || tankPartsReq) {
    return tankPartsReq;
  }
  tankPartsReq = getAssetMap()
    .then(async (map) => {
      const P = {};
      await Promise.all(
        ["turret", "barrel", "base", "leftTread", "rightTread"].map(async (k) => {
          P[k] = map[k] ? await loadImg(map[k]) : null;
        }),
      );
      if (P.base && P.turret) {
        TANK_PARTS = P;
      }
      return TANK_PARTS;
    })
    .catch(() => null);
  return tankPartsReq;
}
export function wornIcon(key, frame) {
  const P = TANK_PARTS;
  if (!P || !frame || isBlankPic(frame)) {
    return null;
  } // (no shelf picture of a bare tank)
  const t = document.createElement("canvas");
  t.width = 640;
  t.height = 384;
  const tg = t.getContext("2d");
  const tank = document.createElement("canvas");
  tank.width = 640;
  tank.height = 384;
  const kg = tank.getContext("2d");
  for (const k of ["leftTread", "turret", "base", "rightTread", "barrel"]) {
    if (P[k]) {
      kg.drawImage(P[k], 0, 0, 640, 384);
    }
  }
  const aura =
      /^(gx-aura-|sh-aura$|hk-aura$|ho-aura$|sk-aura$|rc-aura$|gf-aura$|ds-aura$|cn-aura$|ac-aura$|sf-aura$|sm-aura$|kg-aura$|ww-aura$|tp-aura$|mc-aura$|cs-aura$)/.test(
        key,
      ) || !!(EXT_ITEM[key] && EXT_ITEM[key].aura),
    bx = GX_ACC[key] && GX_ACC[key].box;
  kg.globalCompositeOperation = "source-atop";
  kg.fillStyle = !aura
    ? "rgba(112,120,140,.9)"
    : bx === "shadow"
      ? "#1e1236"
      : bx === "hacker"
        ? "#0f2412"
        : bx === "holo"
          ? "#55609a"
          : bx === "sakura"
            ? "#5a2a44"
            : "#2b2f5a";
  kg.fillRect(0, 0, 640, 384);
  const back = GX_ACC[key] && GX_ACC[key].slot === "back";
  // the item's own outline, and how much of it the tank would cover
  const fc = document.createElement("canvas");
  fc.width = 640;
  fc.height = 384;
  fc.getContext("2d").drawImage(frame, 0, 0, 640, 384);
  const fd = readPixels(fc),
    td = readPixels(tank);
  let fx0 = 640,
    fy0 = 384,
    fx1 = -1,
    fy1 = -1,
    fn = 0,
    hid = 0;
  for (let y = 0; y < 384; y++) {
    for (let x = 0; x < 640; x++) {
      const i = (y * 640 + x) * 4 + 3;
      if (fd[i] > 20) {
        fn++;
        if (td[i] > 20) {
          hid++;
        }
        if (x < fx0) {
          fx0 = x;
        }
        if (x > fx1) {
          fx1 = x;
        }
        if (y < fy0) {
          fy0 = y;
        }
        if (y > fy1) {
          fy1 = y;
        }
      }
    }
  }
  if (back && fn && hid / fn < 0.5) {
    tg.drawImage(fc, 0, 0);
    tg.drawImage(tank, 0, 0);
  } else {
    tg.drawImage(tank, 0, 0);
    tg.drawImage(fc, 0, 0);
  } // (a back item the tank would mostly hide, e.g. a boombox or hood, goes on top so it shows)
  const eyes = /^ew-|^hk-visor$|^sk-kanzashi$/.test(key),
    head = () => {
      const h = document.createElement("canvas");
      h.width = 190;
      h.height = 150;
      h.getContext("2d").drawImage(t, 185, 92, 190, 150, 0, 0, 190, 150);
      return h;
    };
  // a small item hanging off the tank (e.g. sneakers on the barrel): zoom in on the item, with a bit of tank around it
  const near = () => {
    const w = fx1 - fx0 + 1,
      h = fy1 - fy0 + 1,
      m = Math.max(w, h) * 0.35,
      x0 = Math.max(0, Math.floor(fx0 - m)),
      y0 = Math.max(0, Math.floor(fy0 - m)),
      x1 = Math.min(640, Math.ceil(fx1 + m)),
      y1 = Math.min(384, Math.ceil(fy1 + m)),
      c = document.createElement("canvas");
    c.width = x1 - x0;
    c.height = y1 - y0;
    c.getContext("2d").drawImage(t, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
    return cropCanvas(c);
  };
  const full = !aura && !eyes ? cropCanvas(t) : null,
    small =
      full &&
      fx1 >= 0 &&
      (fx1 - fx0 + 1) * (fy1 - fy0 + 1) <
        full.width * full.height * (GX_ACC[key] && GX_ACC[key].slot === "barrel" ? 0.45 : 0.3);
  const crop = aura ? t : eyes ? head() : small ? near() : full,
    ic = document.createElement("canvas");
  ic.width = ic.height = 120;
  const k = Math.min(116 / crop.width, 116 / crop.height) * (aura ? 1.05 : 1);
  ic.getContext("2d").drawImage(
    crop,
    (120 - crop.width * k) / 2,
    (120 - crop.height * k) / 2,
    crop.width * k,
    crop.height * k,
  );
  return ic;
}
export function garagePicFor(key) {
  if (GARAGE_PICS["i:" + key]) {
    return;
  }
  const frame = artOf(key);
  if (!frame) {
    return;
  }
  if (!CUSTOM_ICONS[key] && GX_ACC[key]) {
    const w = wornIcon(key, frame);
    if (w) {
      CUSTOM_ICONS[key] = w;
    } else {
      loadTankParts();
      return;
    }
  }
  if (CUSTOM_ICONS[key]) {
    GARAGE_PICS["i:" + key] = CUSTOM_ICONS[key].toDataURL();
    return;
  }
  if (TROPHY_ART && TROPHY_ART[key] && TROPHY_ART[key].icon) {
    GARAGE_PICS["i:" + key] = TROPHY_ART[key].icon;
    return;
  }
  if (GX_PAINT[key]) {
    GARAGE_PICS["i:" + key] = paintLabel(MAZE_TILE[key] || frame, 104, 244, true, key).toDataURL();
    return;
  } // a spray can label, the shape of the game's (52x122) so it isn't squeezed
  const crop = cropCanvas(frame),
    n = document.createElement("canvas");
  n.width = n.height = 120;
  const k = Math.min(110 / crop.width, 110 / crop.height),
    w = crop.width * k,
    h = crop.height * k;
  n.getContext("2d").drawImage(crop, (120 - w) / 2, (120 - h) / 2, w, h);
  GARAGE_PICS["i:" + key] = n.toDataURL();
}
