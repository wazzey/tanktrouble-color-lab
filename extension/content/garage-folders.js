import { GX_PAINT } from "./colours.js";

// ---------- Box folders in the garage ----------
// The garage's shelf can be narrowed to one folder: Original (the game's own boxes) or Custom (Color Lab's), and inside
// Custom a genre group (Achievements, Fantasy, Sci-Fi & Tech, Street & Style, Fun & Games, Nature). Chosen with the folder bar over the garage, with a Back button.
// Only what the game is shown changes: the search still finds everything.
export const BOX_GROUPS = [
  // by genre (paints and items together); a 'gear' group would only be for boxes that are accessories alone
  { id: "ach", name: "Achievements", icon: "🏆", color: "#e0b030", boxes: ["hall", "arsenal", "galaxy"] },
  {
    id: "fantasy",
    name: "Fantasy",
    icon: "🔮",
    color: "#9a5cff",
    boxes: ["heaven", "shadow", "spectral", "elements", "kingdom", "ninja", "sakura", "cursed"],
  },
  {
    id: "scifi",
    name: "Sci-Fi & Tech",
    icon: "🚀",
    color: "#18b8d8",
    boxes: ["hacker", "holo", "mech", "steampunk", "materials"],
  },
  {
    id: "street",
    name: "Street & Style",
    icon: "🏁",
    color: "#ff4f8a",
    boxes: ["racing", "graffiti", "agent", "wildwest", "eyewear", "streetwear"],
  },
  { id: "fun", name: "Fun & Games", icon: "🎲", color: "#ff8a1f", boxes: ["arcade", "casino", "sweets"] },
  { id: "nature", name: "Nature", icon: "🌴", color: "#2fb070", boxes: ["safari", "deepsea", "tropical"] },
];
export const isLabBoxId = (id) => Number(id) >= 9000;
export const groupOfBox = (id) => {
  const key = Object.keys(CUSTOM_BOX_IDS).find((k) => CUSTOM_BOX_IDS[k] === Number(id));
  const gr = key && BOX_GROUPS.find((x) => x.boxes.includes(key));
  return gr ? gr.id : "other";
};
// The folders are boxes on the garage's own shelf: Original, Custom, Custom's groups and Back, each with its name on it.
export const FOLDER_BACK = 9100,
  FOLDER_GAME = 9101,
  FOLDER_LAB = 9102,
  FOLDER_GROUP0 = 9110;
export const isFolderBox = (id) => +id >= 9100 && +id < 9120;
export function boxInFolder(id, f) {
  if (f === "all") {
    return true;
  }
  if (f === "game") {
    return !isLabBoxId(id);
  }
  if (f === "lab") {
    return isLabBoxId(id);
  }
  if (f.startsWith("lab:")) {
    return isLabBoxId(id) && groupOfBox(id) === f.slice(4);
  }
  return true;
}
export const garageAllBoxes = {}; // pid -> every box id in its garage (before the folder), for the folder bar's counts
export function renderBoxNav() {
  const old = document.getElementById("ttcl-boxnav");
  if (old) {
    old.remove();
  }
} // (the folders are boxes on the shelf now)

// Color Lab's own boxes (Spectral, Galaxy) in the garage: their pictures are made here and handed to the
// garage when it loads them (see hookPhaser). Item numbers are the same picture addresses used on tank icons.
export const CUSTOM_BOX_IDS = {
  spectral: 9001,
  galaxy: 9002,
  arsenal: 9003,
  elements: 9004,
  materials: 9005,
  holo: 9006,
  heaven: 9007,
  shadow: 9008,
  hacker: 9009,
  eyewear: 9010,
  sakura: 9011,
  racing: 9012,
  graffiti: 9013,
  deepsea: 9014,
  sweets: 9015,
  arcade: 9016,
  safari: 9017,
  steampunk: 9018,
  kingdom: 9019,
  wildwest: 9020,
  tropical: 9021,
  mech: 9022,
  casino: 9023,
  ninja: 9024,
  agent: 9025,
  hall: 9026,
  cursed: 9027,
  streetwear: 9028,
};
export const GARAGE_PICS = {}; // picture address marker → data URL for the garage loader
// ART_REV changes only when Color Lab's pictures change (not on every update), so saved pictures survive updates
export const ART_REV = "art-2026-10-28-v1e"; // (m: drops pictures saved blank while an item's picture file hadn't loaded)
export const BOX_ART_REV = {
  agent: "pic-items-3",
  ninja: "pic-items-3",
  graffiti: "pic-bandana-2",
  safari: "pic-hat-2",
  racing: "pic-exhaust-1",
  sakura: "pic-eyewear-1",
  elements: "boxpic-2",
  materials: "boxpic-2",
  eyewear: "boxpic-2",
  holo: "boxpic-2",
  arsenal: "boxpic-2",
}; // box id -> version: bump one box's entry when only its pictures change (the rest stay saved)
export const picDb = () =>
  new Promise((res, rej) => {
    const r = indexedDB.open("ttcl-pics", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("pics");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
// Each item's full picture (the frame worn on a tank) is kept too, so the garage never falls back to the
// stand-in picture an item is carried on (e.g. the smiley) when it hasn't been drawn yet this visit.
export const ART_BLOBS = {},
  GARAGE_ART = {};
export function isBlankPic(c) {
  // nothing drawn on it (e.g. its picture file failed to load)
  try {
    const t = document.createElement("canvas");
    t.width = t.height = 24;
    const g = t.getContext("2d", { willReadFrequently: true });
    g.drawImage(c, 0, 0, 24, 24);
    const d = g.getImageData(0, 0, 24, 24).data;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] > 8) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
export const breathe = () => new Promise((r) => setTimeout(r, 0)); // lets the page draw between heavy pictures
// The garage opens straight away: items whose pictures are saved go in as they are, the rest go in with a plain
// stand-in and are drawn in the background (the box you open first), then swapped into the open garage.
export const bgQueue = [],
  bgPending = {},
  bgActive = new Set();
export function noteRealGarageChange(body) {
  try {
    garageReal.add(String((JSON.parse(body).params || [])[0]));
  } catch {}
}
// Garage changes since the tank was last announced: only local ones (garageFake) or real ones too (garageReal)
export const garageFake = new Set(),
  garageReal = new Set();
// Until a Color Lab picture is ready: a paint shows its main colour, an item nothing (and the garage redraws once it's ready)
const standIns = {};
export function standInPic(key, big, w) {
  // the same size as the real picture, so swapping it later moves nothing
  const pa = GX_PAINT[key],
    W = big ? w || 640 : 120,
    H = big ? Math.round((W * 384) / 640) : 120,
    id = (pa ? pa.avg : "-") + "|" + W + "x" + H;
  if (standIns[id]) {
    return standIns[id];
  }
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (big) {
    g.fillStyle = "rgba(128,128,128,.01)";
    g.fillRect(W * 0.4, H * 0.4, W * 0.2, H * 0.2);
  } // (barely there: the welding sparks still have somewhere to come from)
  else if (pa) {
    g.fillStyle = "#" + String(pa.avg).replace(/^0x/, "").padStart(6, "0");
    g.beginPath();
    g.arc(60, 60, 44, 0, 7);
    g.fill();
  }
  return (standIns[id] = c.toDataURL());
}
export const garageContent = {};
// The garage's bottom bar (⏻ … Done) sits in the gap just under the boxes, above the tank icons and their names.
// Placed from the garage picture's own size (the garage lays everything out in proportion to it).
export function placeGarageSearch(p) {
  // bottom-left, but above anything else docked there (e.g. the Lobby Tools players bar)
  if (!p) {
    return;
  }
  let bottom = 12;
  for (const el of document.querySelectorAll("body > div")) {
    if (el === p || el.id === "tt-color-lab-host") {
      continue;
    }
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") {
      continue;
    }
    const fits = (r) => r.width && r.height && r.left <= 330 && r.bottom >= innerHeight - 140 && r.height <= 260; // only small bars docked at the bottom-left
    const r = el.getBoundingClientRect();
    if (fits(r)) {
      bottom = Math.max(bottom, Math.round(innerHeight - r.top + 8));
      continue;
    }
    if (el.shadowRoot && r.height > 260) {
      for (const c of el.shadowRoot.querySelectorAll("*")) {
        const cr = c.getBoundingClientRect();
        if (fits(cr)) {
          bottom = Math.max(bottom, Math.round(innerHeight - cr.top + 8));
        }
      }
    }
  } // (a full-page overlay such as Lobby Tools': its own bar inside it)
  const v = bottom + "px";
  if (p.style.bottom !== v) {
    p.style.bottom = v;
  }
}
// Mouse wheel over the garage's box row or item row scrolls it, one box / item per notch, exactly as if its arrow
// were held for that long (the game snaps the row back unless an arrow is held, so the wheel "holds" it)
export function garageWheel(st) {
  const gm0 = st && st.game,
    cv = gm0 && gm0.canvas;
  if (!cv) {
    return;
  }
  cv.__ttclSt = st;
  if (cv.__ttclWheel) {
    return;
  }
  cv.__ttclWheel = true;
  const hold = (sc) => {
    if (sc.__ttclHold) {
      return;
    }
    sc.__ttclHold = true;
    for (const ar of [sc.leftArrow, sc.rightArrow]) {
      if (!ar) {
        continue;
      }
      const ou = ar.update;
      ar.update = function () {
        const r = ou.apply(this, arguments);
        if (ar === sc.rightArrow && sc.__wheelMs > 0 && sc.exists) {
          sc.__wheelMs -= (sc.game && sc.game.time.elapsedMS) || 16;
          if (sc.__wheelDir > 0) {
            sc._scrollLeft();
          } else {
            sc._scrollRight();
          }
          if (sc.__wheelMs <= 0) {
            sc.__wheelMs = 0;
            sc._releaseScroll();
          }
        }
        return r;
      };
    }
  };
  cv.addEventListener(
    "wheel",
    (ev) => {
      try {
        const canvasState = cv.__ttclSt,
          gm = canvasState && canvasState.game;
        if (!gm) {
          return;
        }
        if (!gm.isBooted || !cv.isConnected) {
          return;
        }
        const r = cv.getBoundingClientRect(),
          x = ((ev.clientX - r.left) * gm.width) / r.width,
          y = ((ev.clientY - r.top) * gm.height) / r.height;
        const dir = Math.sign(Math.abs(ev.deltaY) >= Math.abs(ev.deltaX) ? ev.deltaY : ev.deltaX);
        if (!dir) {
          return;
        }
        for (const sc of [canvasState.accessoryScroller, canvasState.boxScroller]) {
          if (!sc || !sc.exists || !sc.visible || !sc.hitZone || !sc.currentItems || !sc.currentItems.length) {
            continue;
          }
          const b = sc.hitZone.getBounds();
          if (!(x >= b.x - 40 && x <= b.x + b.width + 40 && y >= b.y - 10 && y <= b.y + b.height + 10)) {
            continue;
          }
          if (sc.currentItems.filter((i) => i && i.alive).length >= sc.currentItems.length) {
            return;
          } // everything fits: nothing to scroll
          ev.preventDefault();
          hold(sc);
          const step = ((sc.itemWidth || 100) / (sc.maxScrollSpeed || 600)) * 1000; // ms to move one item
          if (sc.__wheelDir !== dir) {
            sc.__wheelMs = 0;
          }
          sc.__wheelDir = dir;
          sc.__wheelMs = Math.min(step * 6, (sc.__wheelMs || 0) + step);
          return;
        }
      } catch {}
    },
    { passive: false },
  );
}
export function fixGarageArrows(S) {
  try {
    for (const [sc, list] of [[S.accessoryScroller, S.currentAccessorySprites]]) {
      if (!sc || !Array.isArray(list) || !list.length || !S.game || !S.game.isBooted) {
        continue;
      }
      const shown = list.filter((x) => x && x.alive),
        first = list.indexOf(shown[0]);
      if (!shown.length || shown.length >= list.length) {
        continue;
      } // everything fits: no arrows needed
      const ok =
        sc.exists &&
        sc.visible &&
        sc.leftArrow &&
        sc.rightArrow &&
        sc.leftArrow.alive &&
        sc.rightArrow.alive &&
        Math.abs(sc.leftArrow.scale.x) > 0.3;
      if (ok) {
        continue;
      }
      if (sc.removeTimeout) {
        clearTimeout(sc.removeTimeout);
        sc.removeTimeout = null;
      }
      sc.spawn(0, 0, list, first, first + shown.length - 1, 0); // same call the game makes
    }
  } catch {}
}
