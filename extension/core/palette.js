import { ACC_BOXES, ACC_SLOTS, GX_PAINT, PATTERN_AVG, boxLabel, isPat, normHex, patId } from "../content/colours.js";
import { CUSTOM_BOX_PICS } from "../content/custom-boxes.js";
import { normVal, showVal, toCss } from "../content/registries.js";
import { renderAccToggles, renderAccs } from "./accessories.js";
import { CUSTOM_BOXES, boxShown, customItems, customTitle, gxCanIcon, gxPaintIcon } from "./custom-box-art.js";
import { customBoxPic } from "./draw-swap.js";
import { BOX15_IMG, getBox15 } from "./garage-boxes.js";
import { colourName, favPaintId, favPaints, gameItemName, isFav, toggleFav } from "./garage-search.js";
import { $, iconMap, schedulePreview, selPart, setPart, toast } from "./panel.js";
import { COLOR_HISTORY, SETTINGS, allBoxes, saveSettings, saveToStorage } from "./storage.js";

// Colour sets offered by the swatch menu and the random-source menu
function colourSets() {
  const sets = [
    ["recent", "Recent colours", COLOR_HISTORY.map(normVal).filter(Boolean)],
    ["favs", "Favourites", favPaints().map(normVal).filter(Boolean)],
    ["patterns", "Pattern paints", Object.keys(PATTERN_AVG).map((id) => "p:" + id)],
  ];
  const boxes = allBoxes();
  const ids = new Set([...Object.keys(boxes), ...Object.keys(ACC_BOXES)]);
  [...ids].sort((a, b) => a - b).forEach((id) => sets.push(["box:" + id, boxLabel(id), boxes[id] || []]));
  // (No 'Extra' tile: the accessory numbers in no box have no art anywhere — only empty placeholders.)
  CUSTOM_BOXES.forEach((b) => {
    if (boxShown(b)) {
      sets.push(["custom:" + b.id, b.name, b.paints]);
    }
  }); // custom boxes
  return sets;
}
function fillSelect(sel, opts, value) {
  sel.innerHTML = "";
  opts.forEach(([v, t]) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = t;
    sel.appendChild(o);
  });
  sel.value = opts.some(([v]) => v === value) ? value : opts[0][0];
}
export function renderSources() {
  const sets = colourSets();
  renderSwatchTabs(sets);
  fillSelect(
    $("rndSrc"),
    [
      ["any", "Any colour"],
      ["saved", "My saved colours"],
      ["patterns", "Pattern paints"],
      ["boxes", "All box colours"],
      ...sets.filter(([v, , list]) => v.startsWith("box:") && list.length).map(([v, t]) => [v, t]),
      ...CUSTOM_BOXES.filter(
        (b) => boxShown(b) && ((b.paints || []).length || ACC_SLOTS.some(([slot]) => customItems(b, slot).length)),
      ).map((b) => ["custom:" + b.id, b.name + " (Color Lab)"]),
    ],
    SETTINGS.rnd,
  );
  renderAccToggles();
}
// big picture data → a short blob: link (made once), so tab pictures don't make the page re-read megabytes of text
const blobUrls = new Map();
export function lightUrl(u) {
  if (typeof u !== "string" || !u.startsWith("data:")) {
    return u;
  }
  let b = blobUrls.get(u);
  if (!b) {
    try {
      const i = u.indexOf(","),
        bin = atob(u.slice(i + 1)),
        a = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) {
        a[k] = bin.charCodeAt(k);
      }
      b = URL.createObjectURL(new Blob([a], { type: u.slice(5, u.indexOf(";")) }));
    } catch {
      b = u;
    }
    blobUrls.set(u, b);
  }
  return b;
}
// Swatch sets as picture tiles: Recent, Patterns, then each box with the game's own box art
// Find in Swatches: the box tiles narrowed by a search (box name, or a paint or item in it) and by group
const swIndex = {};
function swWords(v, t, list) {
  // everything a tile can be found by
  if (swIndex[v]) {
    return swIndex[v];
  }
  const w = [t];
  (list || []).forEach((c) => {
    const id = isPat(c) ? patId(c) : null;
    if (id && GX_PAINT[id]) {
      w.push(GX_PAINT[id].name, id);
    } else if (!id) {
      const h = normHex(c);
      if (h) {
        w.push(colourName(h), "#" + h.slice(2));
      }
    }
  });
  if (v.startsWith("custom:")) {
    const cb = CUSTOM_BOXES.find((b) => "custom:" + b.id === v);
    if (cb) {
      ACC_SLOTS.forEach(([slot]) =>
        customItems(cb, slot).forEach((k) => {
          const key = String(k).replace(/^ttcl:/, "");
          w.push(customTitle(key), key);
        }),
      );
    }
  } else if (v.startsWith("box:")) {
    const slots = ACC_BOXES[v.slice(4)] || {};
    for (const sl in slots) {
      (slots[sl] || []).forEach((n) => {
        w.push(gameItemName(sl + n), sl + n);
      });
    }
  }
  return (swIndex[v] = w.join(" | ").toLowerCase());
}
let swQuery = "";
function renderSwatchTabs(sets) {
  const bar = $("swTabs");
  bar.innerHTML = "";
  if (!sets.some(([v]) => v === SETTINGS.swatch)) {
    SETTINGS.swatch = "recent";
  }
  const grp = SETTINGS.swGroup || "all",
    q = swQuery.trim().toLowerCase();
  if ($("swGroup").value !== grp) {
    $("swGroup").value = grp;
  }
  const shownSets = sets.filter(([v, t, list]) => {
    const fixed = v === "recent" || v === "favs" || v === "patterns";
    if (grp === "cl" && !v.startsWith("custom:") && !fixed) {
      return false;
    }
    if (grp === "game" && v.startsWith("custom:")) {
      return false;
    }
    if (q && !(fixed ? t.toLowerCase().includes(q) : swWords(v, t, list).includes(q))) {
      return false;
    }
    return true;
  });
  if (!shownSets.length) {
    bar.innerHTML = '<div class="empty" style="padding:8px;color:#aaa">Nothing found</div>';
    return;
  }
  shownSets.forEach(([v, t]) => {
    const tab = document.createElement("div");
    tab.className = "swtab" + (v === SETTINGS.swatch ? " on" : "");
    const pic = document.createElement("div");
    pic.className = "pic";
    const short =
      v === "favs"
        ? "Favourites"
        : v === "recent"
          ? "Recent"
          : v === "patterns"
            ? "Patterns"
            : v === "extra"
              ? "Extra"
              : v === "trophies"
                ? "Trophies"
                : v.startsWith("custom:")
                  ? t
                  : boxLabel(v.slice(4));
    tab.title = v.startsWith("box:")
      ? `${short} (box ${v.slice(4)})`
      : v === "extra"
        ? "Accessories in the game files but in no box (unreleased or unobtainable)"
        : v === "trophies"
          ? "Hidden trophies you have earned"
          : t;
    if (v === "recent") {
      pic.textContent = "🕘";
    } else if (v === "favs") {
      pic.textContent = "★";
      pic.style.color = "#ffd23a";
    } else if (v === "extra") {
      pic.textContent = "✨";
    } else if (v === "trophies") {
      pic.textContent = "🏆";
    } else if (v.startsWith("custom:")) {
      const cb = CUSTOM_BOXES.find((b) => "custom:" + b.id === v),
        u = cb && CUSTOM_BOX_PICS[cb.id];
      if (u) {
        pic.classList.add("box");
        pic.style.backgroundImage = `url(${lightUrl(u)})`;
      } else {
        pic.textContent = "?";
        if (cb) {
          customBoxPic(cb).then((x) => {
            if (x && pic.isConnected) {
              pic.textContent = "";
              pic.classList.add("box");
              pic.style.backgroundImage = `url(${lightUrl(x)})`;
            }
          });
        }
      } // just this tile, when its picture is ready
    } else if (v === "patterns") {
      const u = iconMap && (iconMap.icon107 || iconMap.icon60);
      if (u) {
        pic.classList.add("round");
        pic.style.backgroundImage = `url(${u})`;
      } else {
        pic.textContent = "▦";
      }
    } else {
      const u = (iconMap && iconMap["box" + v.slice(4)]) || (v === "box:15" && BOX15_IMG);
      if (u) {
        pic.classList.add("box");
        pic.style.backgroundImage = `url(${u})`;
      } else {
        pic.textContent = "?";
        if (v === "box:15") {
          getBox15().then((img) => {
            if (img) {
              renderSwatchTabs(sets);
            }
          });
        }
      } // its placeholder art
    }
    const lbl = document.createElement("span");
    lbl.textContent = short;
    tab.append(pic, lbl);
    tab.onclick = () => {
      SETTINGS.swatch = v;
      saveSettings();
      renderSwatchTabs(sets);
      renderPalette();
    };
    bar.appendChild(tab);
  });
}
export function renderPalette() {
  const pal = $("pal");
  pal.innerHTML = "";
  const sets = colourSets(),
    key = SETTINGS.swatch || "recent",
    set = sets.find(([v]) => v === key) || sets[0];
  const list = set[2],
    recent = set[0] === "recent";
  const accOnly =
    !list.length &&
    (key === "favs" ||
      key === "extra" ||
      key.startsWith("custom:") ||
      (key.startsWith("box:") && ACC_BOXES[key.slice(4)]));
  pal.hidden = !!accOnly;
  renderAccs();
  if (accOnly) {
    return;
  }
  const canUrl = !recent && iconMap && iconMap.sprayCan;
  pal.classList.toggle("cans", !!canUrl);
  const favs = key === "favs";
  pal.title = recent
    ? "Click: paint the selected part · Right-click: remove"
    : favs
      ? "Click: paint the selected part · Right-click: remove from favourites"
      : "Click: paint the selected part · Right-click: ★ favourite";
  if (!list.length) {
    pal.innerHTML =
      '<div class="empty">' +
      (recent
        ? "Colours you save will show up here."
        : favs
          ? "Right-click any paint or item in a box to add it here (or ☆ in the garage's Find)."
          : "Nothing here yet.") +
      "</div>";
    return;
  }
  list.forEach((c, i) => {
    const s = document.createElement("div");
    const art =
      isPat(c) &&
      (GX_PAINT[patId(c)]
        ? canUrl
          ? gxCanIcon(patId(c))
          : gxPaintIcon(patId(c))
        : iconMap && iconMap["icon" + patId(c)]);
    if (canUrl) {
      s.className = "can";
      s.style.setProperty("--can", `url(${canUrl})`);
      if (iconMap.sprayCanShade) {
        s.style.setProperty("--shade", `url(${iconMap.sprayCanShade})`);
      }
      const body = document.createElement("div");
      body.className = "body";
      body.style.backgroundImage = `url(${canUrl})` + (art ? `,url(${art})` : "");
      body.style.backgroundColor = art ? "#fff" : toCss(c) || "#000";
      const shade = document.createElement("div");
      shade.className = "shade";
      s.append(body, shade);
    } else {
      s.className = "sw" + (art ? " pt" : "");
      s.style.backgroundColor = toCss(c) || "#000";
      if (art) {
        s.style.backgroundImage = `url(${art})`;
      }
    }
    s.title = showVal(c);
    s.onclick = () => {
      setPart(selPart, c);
      schedulePreview();
    };
    if (recent) {
      s.oncontextmenu = (e) => {
        e.preventDefault();
        COLOR_HISTORY.splice(COLOR_HISTORY.indexOf(c), 1);
        saveToStorage();
        renderPalette();
      };
    } else {
      s.oncontextmenu = (e) => {
        e.preventDefault();
        const on = toggleFav(favPaintId(c));
        toast(on ? "★ Added to favourites" : "Removed from favourites");
        renderPalette();
      };
    }
    if (!recent && !favs && isFav(favPaintId(c))) {
      s.classList.add("fav");
    }
    pal.appendChild(s);
  });
}

export function startPalette() {
  $("swFind").addEventListener("keydown", (e) => e.stopPropagation());
  $("swFind").addEventListener("input", () => {
    swQuery = $("swFind").value;
    renderSwatchTabs(colourSets());
  });
  $("swGroup").onchange = () => {
    SETTINGS.swGroup = $("swGroup").value;
    saveSettings();
    renderSwatchTabs(colourSets());
  };
  // mouse wheel scrolls the tile row sideways
  $("swTabs").addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        $("swTabs").scrollLeft += e.deltaY;
        e.preventDefault();
      }
    },
    { passive: false },
  );
}
