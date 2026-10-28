import { ACC_BOXES, ACC_SLOTS, BOXES, normHex } from "../content/colours.js";
import { CUSTOM_ICONS } from "../content/custom-boxes.js";
import { loadImg } from "../content/images.js";
import { TROPHIES, isTrophyVal } from "../content/laika-trophies.js";
import { GAME_NAMES } from "../content/registries.js";
import { DEV_TROPHIES } from "./achievements.js";
import { CUSTOM_BOXES, boxShown, customItems, customTitle, getCustomArt, isCustomKey } from "./custom-box-art.js";
import { loggedInIds, rpc } from "./game-socket.js";
import { favItemId, favItems, isFav, toggleFav } from "./garage-search.js";
import { renderPalette, renderSources } from "./palette.js";
import { $, formAcc, iconMap, schedulePreview, toast } from "./panel.js";
import { resolved } from "./saved-looks.js";
import { BOX_EXTRA, SETTINGS, STATS, resetStats, saveBoxes, saveSettings } from "./storage.js";
import { cropCanvas, getTrophyArt } from "./trophy-art.js";
import { unlockTrophy } from "./trophy-counting.js";

// ---------- accessories picker ----------
// Thumbnails: the game's accessory art is drawn in a full tank-icon frame, so crop each to its visible part.
export const thumbCache = {};
function accThumb(slot, id) {
  if (isTrophyVal(String(id))) {
    const key = String(id).slice(5);
    if (isCustomKey(key)) {
      return getCustomArt(key).then((f) =>
        CUSTOM_ICONS[key] ? cropCanvas(CUSTOM_ICONS[key]).toDataURL() : f ? cropCanvas(f).toDataURL() : null,
      );
    }
    return getTrophyArt([key]).then((a) => (a && a[key] ? a[key].thumb : null));
  }
  const key = slot + id;
  if (!thumbCache[key]) {
    thumbCache[key] = (async () => {
      const url = iconMap && iconMap["accessories/" + key];
      if (!url) {
        return null;
      }
      const img = await loadImg(url);
      if (!img) {
        return null;
      }
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const px = g.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width,
        y0 = c.height,
        x1 = -1,
        y1 = -1;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (px[(y * c.width + x) * 4 + 3] > 20) {
            if (x < x0) {
              x0 = x;
            }
            if (x > x1) {
              x1 = x;
            }
            if (y < y0) {
              y0 = y;
            }
            if (y > y1) {
              y1 = y;
            }
          }
        }
      }
      if (x1 < 0) {
        return null;
      }
      const w = x1 - x0 + 1,
        h = y1 - y0 + 1,
        o = document.createElement("canvas");
      o.width = w;
      o.height = h;
      o.getContext("2d").drawImage(c, x0, y0, w, h, 0, 0, w, h);
      return o.toDataURL();
    })();
  }
  return thumbCache[key];
}
function setThumb(el, slot, id) {
  el.textContent = "";
  el.style.backgroundImage = "";
  if (id == null || id === "0" || id === 0) {
    el.textContent = id == null ? "" : "—";
    return;
  }
  accThumb(slot, id).then((u) => {
    if (u) {
      el.style.backgroundImage = `url(${u})`;
    } else {
      el.textContent = "#" + id;
    }
  });
}
let accSlot = "turret",
  accBox = null,
  accFrom = "box";
// Every accessory the game has art for, by slot (read from the game's asset list, so unreleased items are included)
function artIds(slot) {
  const out = [];
  if (iconMap) {
    for (const k in iconMap) {
      const m = k.match(/^accessories\/([a-z]+)(\d+)$/);
      if (m && m[1] === slot) {
        out.push(+m[2]);
      }
    }
  }
  return out.sort((a, b) => a - b);
}
const boxedIds = (slot) => {
  const s = new Set();
  for (const b in ACC_BOXES) {
    (ACC_BOXES[b][slot] || []).forEach((id) => s.add(id));
  }
  return s;
};
const extraIds = (slot) => {
  const boxed = boxedIds(slot);
  return artIds(slot).filter((id) => !boxed.has(id));
};
function accItems(box, slot) {
  if (box === "favs") {
    return favItems(slot);
  }
  if (String(box).startsWith("custom:")) {
    const cb = CUSTOM_BOXES.find((b) => "custom:" + b.id === box);
    return cb ? customItems(cb, slot) : [];
  }
  return box === "extra" ? extraIds(slot) : (ACC_BOXES[box] && ACC_BOXES[box][slot]) || [];
}
const customAccAll = (slot) => CUSTOM_BOXES.filter(boxShown).flatMap((b) => customItems(b, slot)); // Color Lab's own items you can use
function accPool(slot) {
  if (accFrom === "box") {
    return accItems(accBox, slot);
  }
  const all = new Set(boxedIds(slot));
  artIds(slot).forEach((id) => all.add(id));
  customAccAll(slot).forEach((id) => all.add(id));
  return [...all];
}
const pickOne = (list) => (list.length ? String(list[Math.floor(Math.random() * list.length)]) : null);
function rollAcc(slots) {
  let n = 0;
  slots.forEach((slot) => {
    const v = pickOne(accPool(slot));
    if (v) {
      formAcc[slot] = v;
      n++;
    }
  });
  if (!n) {
    toast(accFrom === "box" ? "This box has nothing for that slot" : "No accessories found", true);
  }
  renderAccs();
  schedulePreview();
}
function setAccFrom(v) {
  accFrom = v;
  $("accFromBox").classList.toggle("on", v === "box");
  $("accFromAny").classList.toggle("on", v === "any");
}
const realAcc = (slot) => {
  const d = resolved && resolved.data;
  const v = d && d[slot + "Accessory"];
  return v == null ? null : String(v);
};
export function renderAccs() {
  if ($("swatches").hidden) {
    return;
  }
  // which box is open in Swatches (Recent / Patterns have no accessories)
  const key = SETTINGS.swatch || "recent";
  accBox =
    key === "favs" || key === "extra" || key === "trophies" || key.startsWith("custom:")
      ? key
      : key.startsWith("box:") && ACC_BOXES[key.slice(4)]
        ? key.slice(4)
        : null;
  $("accPart").hidden = !accBox;
  if (!accBox) {
    return;
  }
  if (!accItems(accBox, accSlot).length) {
    const first = ACC_SLOTS.find(([slot]) => accItems(accBox, slot).length);
    if (first) {
      accSlot = first[0];
    }
  }
  // slot tiles show what the tank will wear in that slot
  const slots = $("accSlots");
  slots.innerHTML = "";
  ACC_SLOTS.forEach(([slot, label]) => {
    const t = document.createElement("div");
    t.className =
      "accslot" +
      (slot === accSlot ? " sel" : "") +
      (formAcc[slot] != null ? " custom" : "") +
      (accItems(accBox, slot).length ? "" : " empty");
    t.title = formAcc[slot] != null ? `${label}: changed` : `${label}: the tank's own`;
    const th = document.createElement("div");
    th.className = "th";
    setThumb(th, slot, formAcc[slot] != null ? formAcc[slot] : realAcc(slot) || "0");
    const sp = document.createElement("span");
    sp.textContent = label;
    t.append(th, sp);
    t.onclick = () => {
      accSlot = slot;
      renderAccs();
    };
    slots.appendChild(t);
  });
  // items: Real (keep the tank's own), None, then this box's items for the slot
  const grid = $("accGrid");
  grid.innerHTML = "";
  const cur = formAcc[accSlot];
  const add = (val, title, label) => {
    const t = document.createElement("div");
    t.className = "acctile" + ((val === undefined ? cur == null : cur === val) ? " on" : "");
    t.title = title;
    const th = document.createElement("div");
    th.className = "th";
    if (label) {
      th.textContent = label;
    } else {
      setThumb(th, accSlot, val);
    }
    t.appendChild(th);
    t.onclick = () => {
      if (val === undefined) {
        delete formAcc[accSlot];
      } else {
        formAcc[accSlot] = val;
      }
      renderAccs();
      schedulePreview();
    };
    if (val !== undefined && val !== "0") {
      const fid = favItemId(accSlot, val);
      if (isFav(fid) && accBox !== "favs") {
        t.classList.add("fav");
      }
      t.title += accBox === "favs" ? " · right-click: remove from favourites" : " · right-click: ★ favourite";
      t.oncontextmenu = (e) => {
        e.preventDefault();
        const on = toggleFav(fid);
        toast(on ? "★ Added to favourites" : "Removed from favourites");
        renderAccs();
      };
    }
    grid.appendChild(t);
  };
  add(undefined, "Keep the tank's own", "Real");
  add("0", "No accessory here", "None");
  accItems(accBox, accSlot).forEach((id) =>
    add(String(id), isTrophyVal(String(id)) ? customTitle(String(id).slice(5)) : GAME_NAMES[accSlot + id] || `#${id}`),
  );
  // trophies: your current Laika streak
  const showTrophyInfo = accBox === "custom:galaxy" || accBox === "custom:arsenal"; // these boxes only exist once something is earned (always in preview mode)
  $("trophyNote").hidden = !showTrophyInfo;
  if (showTrophyInfo) {
    const ids = loggedInIds(),
      top = (o) => Math.max(0, ...ids.map((id) => (o && o[id]) || 0));
    let txt;
    if (accBox === "custom:galaxy") {
      txt = `Laika kills in a row: ${top(STATS.streak)} (best ${top(STATS.best)})`;
    } else {
      const w = (types) =>
        Math.max(0, ...ids.map((id) => types.reduce((n, k) => n + ((STATS.weapons[id] || {})[k] || 0), 0)));
      txt = `Dimitriums in a row: ${top(STATS.gstreak)} of 3 (best ${top(STATS.gbest)}) · Laser ${w([0])} · Missile ${w([3])} · Mine ${w([4])} · Gatling ${w([5])} · Shotgun/double ${w([1, 2])} (of 100)`;
    }
    $("trophyNote").textContent = txt + (DEV_TROPHIES ? " · preview mode" : "");
  }
  renderTrophyDev();
}
// Preview tools (DEV build only): play the real unlock pop-up for your first logged-in tank, or reset
function renderTrophyDev() {
  const box = $("trophyDev");
  box.hidden = !(DEV_TROPHIES && (accBox === "custom:galaxy" || accBox === "custom:arsenal"));
  if (box.hidden) {
    return;
  }
  box.innerHTML = "";
  const btn = (label, title, fn) => {
    const b = document.createElement("button");
    b.className = "small grey";
    b.textContent = label;
    b.title = title;
    b.onclick = fn;
    box.appendChild(b);
  };
  const me = () => loggedInIds()[0];
  TROPHIES.filter((t) => "custom:" + t.box === accBox).forEach((t) =>
    btn("Test: " + t.item, `Unlock "${t.name}" (${t.item}) for your first logged-in tank and show the pop-up`, () => {
      const id = me();
      if (!id) {
        return toast("Log in or play as a guest first", true);
      }
      unlockTrophy(id, t, true);
      toast("Unlocked " + t.item + " — check the pop-up, then the tank's achievements");
    }),
  );
  btn("Reset", "Lock all trophies again and clear the Laika streaks", () => {
    resetStats();
    toast("Trophies reset");
    renderAccs();
  });
}
// 🎩 toggles: any combination of slots (e.g. turret + barrel) for 🎲 Random and party mode
const accRollSlots = () => (Array.isArray(SETTINGS.rndAcc) ? SETTINGS.rndAcc : []);
export function renderAccToggles() {
  const row = $("rndAcc");
  row.querySelectorAll(".seg").forEach((x) => x.remove());
  const seg = document.createElement("span");
  seg.className = "seg";
  ACC_SLOTS.forEach(([slot, label]) => {
    const b = document.createElement("button");
    b.className = "small" + (accRollSlots().includes(slot) ? " on" : "");
    b.textContent = label;
    b.title = `Also roll a random ${label.toLowerCase()} accessory`;
    b.onclick = () => {
      const cur = accRollSlots();
      SETTINGS.rndAcc = cur.includes(slot) ? cur.filter((x) => x !== slot) : [...cur, slot];
      saveSettings();
      renderAccToggles();
    };
    seg.appendChild(b);
  });
  row.appendChild(seg);
}
// Accessories for 🎲 Random / party mode: from the box chosen in the random menu, otherwise from all of them
export function randomAccessories() {
  const slots = accRollSlots();
  if (!slots.length) {
    return null;
  }
  const src = SETTINGS.rnd || "",
    box = src.startsWith("box:") ? src.slice(4) : src.startsWith("custom:") ? src : null;
  const out = {};
  slots.forEach((slot) => {
    const pool = box ? accItems(box, slot) : [...new Set([...boxedIds(slot), ...artIds(slot), ...customAccAll(slot)])];
    const v = pickOne(pool);
    if (v) {
      out[slot] = v;
    }
  });
  return Object.keys(out).length ? out : null;
}

// Box colours from garages: the built-in table covers the current boxes; retired ones (e.g. the hacker
// box) get added the first time you look up a tank that owns them. One small request per tank, per session.
const garageChecked = new Set();
export async function collectBoxes(playerId) {
  if (!playerId || garageChecked.has(playerId)) {
    return;
  }
  garageChecked.add(playerId);
  try {
    const g = await rpc("garage.getGarageContent", [String(playerId)]);
    let added = false;
    for (const b of (g && g.boxes) || []) {
      const vals = (b.sprayCans || [])
        .map(
          (c) =>
            c.colour && (c.colour.type === "numeric" ? normHex(c.colour.numericValue) : "p:" + c.colour.imageValue),
        )
        .filter(Boolean);
      const known = new Set((BOXES[b.id] || []).concat(BOX_EXTRA[b.id] || []));
      const fresh = vals.filter((v) => !known.has(v));
      if (fresh.length) {
        BOX_EXTRA[b.id] = (BOX_EXTRA[b.id] || []).concat(fresh);
        added = true;
      }
    }
    if (added) {
      saveBoxes();
      renderSources();
      renderPalette();
      toast("New box colours found and saved");
    }
  } catch {}
}

export function startAccessories() {
  $("accRndSlot").onclick = () => rollAcc([accSlot]);
  $("accRndAll").onclick = () => rollAcc(ACC_SLOTS.map(([slot]) => slot));
  $("accFromBox").onclick = () => setAccFrom("box");
  $("accFromAny").onclick = () => setAccFrom("any");
  $("rndSrc").onchange = () => {
    SETTINGS.rnd = $("rndSrc").value;
    saveSettings();
  };
}
