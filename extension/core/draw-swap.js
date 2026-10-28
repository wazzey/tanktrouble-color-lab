import { GX_PAINT } from "../content/colours.js";
import { CUSTOM_BOX_PICS, partPaintFor } from "../content/custom-boxes.js";
import { CUSTOM_BOX_IDS, GARAGE_PICS, breathe } from "../content/garage-folders.js";
import { artSrc } from "../content/images.js";
import { isRewardKey } from "../content/laika.js";
import { MAZE_TILE } from "../content/maze-patterns.js";
import { ASSET_MAP, getAssetMap } from "./assets.js";
import { customAccValue, getCustomArt, isCustomKey } from "./custom-box-art.js";
import { artOf, customBoxSheet, picCacheLoad, picCacheSave } from "./garage-boxes.js";
import { BONE_CARRIER, getTrophyArt, trophyKeyArt } from "./trophy-art.js";

let picQueue;
export let origDrawImage;
export const queuedPic = (fn) =>
  (picQueue = picQueue
    .then(breathe)
    .then(fn)
    .catch(() => null));
export function customBoxPic(box) {
  if (CUSTOM_BOX_PICS[box.id]) {
    return Promise.resolve(CUSTOM_BOX_PICS[box.id]);
  }
  if (box.pic) {
    return (String(box.pic).startsWith("ttcl-art:") ? artSrc(box.pic) : Promise.resolve(box.pic)).then(
      (u) => (CUSTOM_BOX_PICS[box.id] = u),
    );
  }
  const gk = "box" + CUSTOM_BOX_IDS[box.id];
  return getAssetMap()
    .then(picCacheLoad)
    .then(() => {
      if (GARAGE_PICS[gk]) {
        return (CUSTOM_BOX_PICS[box.id] = GARAGE_PICS[gk]);
      }
      return queuedPic(() => customBoxSheet(box)).then((u) => {
        if (!u) {
          return null;
        }
        GARAGE_PICS[gk] = u;
        picCacheSave();
        return (CUSTOM_BOX_PICS[box.id] = u);
      });
    })
    .catch(() => null);
}

// --- showing a trophy on tanks ---
// The game builds accessory picture addresses from the accessory number, so a trophy's "number" is an address
// that leads to the real gold bone picture with a marker on it. When the game draws that picture, the
// trophy art is drawn instead.
export function trophyAccValue(key) {
  if (isCustomKey(key)) {
    return customAccValue(key);
  }
  if (!BONE_CARRIER) {
    getTrophyArt();
    return null;
  }
  return "/../../../../.." + BONE_CARRIER + "?ttcl=" + key + "&";
}
export const drawSwap = new WeakMap(),
  swapAsked = new Set(),
  pendingPaint = new WeakMap(),
  drawnArt = new Set();
let partUrls = null;
function partOfImg(img) {
  // which tank part a picture is (by its address in the game's asset list)
  if (!partUrls) {
    if (!ASSET_MAP) {
      return null;
    }
    partUrls = Object.assign({}, ASSET_MAP.parts || {});
    for (const p of ["turret", "barrel", "base", "leftTread", "rightTread"]) {
      if (ASSET_MAP[p]) {
        partUrls[ASSET_MAP[p].split("?")[0]] = p;
      }
    }
  }
  let u = img.src || "";
  try {
    u = new URL(u).pathname;
  } catch {}
  return partUrls[u] || null;
}

export function startDrawSwap() {
  // Box pictures for the Swatches tabs: the same saved pictures the garage uses (drawn once, then remembered),
  // and any not drawn yet are made one at a time so opening the panel doesn't stall the game.
  picQueue = Promise.resolve();
  origDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
    if (img instanceof HTMLImageElement) {
      let rep = drawSwap.get(img);
      if (rep === undefined) {
        const m = /[?&]ttcl=([\w-]+)/.exec(img.src || "");
        rep = m ? m[1] : null;
        drawSwap.set(img, rep);
      }
      const f = rep && artOf(rep);
      // not drawn yet: ask for it, and the tank is redrawn when it's ready
      if (rep && !f && !swapAsked.has(rep)) {
        swapAsked.add(rep);
        if (isRewardKey(rep)) {
          trophyKeyArt(rep);
        } else if (isCustomKey(rep)) {
          getCustomArt(rep);
        }
      }
      // ...and until then never the stand-in picture it's carried on (the game's Halloween pattern, or another item):
      // a paint shows its main colour, an item nothing
      if (rep && !f && isCustomKey(rep)) {
        const pa = GX_PAINT[rep];
        if (!pa || !pa.avg) {
          return;
        }
        const r =
          a.length === 2
            ? [a[0], a[1], img.naturalWidth || 0, img.naturalHeight || 0]
            : a.length === 4
              ? a
              : a.length === 8
                ? a.slice(4)
                : null;
        if (!r) {
          return;
        }
        const fs = this.fillStyle;
        this.fillStyle = "#" + String(pa.avg).replace(/^0x/, "").padStart(6, "0");
        this.fillRect(r[0], r[1], r[2], r[3]);
        this.fillStyle = fs;
        return;
      }
      // a part mask right after a Color Lab paint (the game paints each part as: paint, then that part's shape):
      // swap in the paint laid out for that part
      if (!rep && this.globalCompositeOperation === "destination-atop") {
        const pp = pendingPaint.get(this);
        if (pp) {
          pendingPaint.delete(this);
          const part = partOfImg(img),
            pc = part && partPaintFor(pp[0], part);
          if (pc && pp[1].length === 4) {
            this.globalCompositeOperation = "copy";
            origDrawImage.call(this, pc, ...pp[1]);
            this.globalCompositeOperation = "destination-atop";
          }
        }
      }
      if (f && !drawnArt.has(rep)) {
        drawnArt.add(rep);
      }
      if (f && GX_PAINT[rep] && MAZE_TILE[rep]) {
        if (this.globalCompositeOperation === "copy") {
          pendingPaint.set(this, [rep, a]);
        } else {
          pendingPaint.delete(this);
        }
      }
      if (f) {
        const iw = img.naturalWidth || f.width,
          ih = img.naturalHeight || f.height;
        if (a.length === 2) {
          return origDrawImage.call(this, f, a[0], a[1], iw, ih);
        }
        if (a.length === 4) {
          return origDrawImage.call(this, f, ...a);
        }
        if (a.length === 8) {
          const kx = f.width / iw,
            ky = f.height / ih;
          return origDrawImage.call(this, f, a[0] * kx, a[1] * ky, a[2] * kx, a[3] * ky, a[4], a[5], a[6], a[7]);
        }
      }
    }
    return origDrawImage.call(this, img, ...a);
  };
}
