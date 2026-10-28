import { loadImg } from "../content/images.js";
import { BULLET_COLOR, MAP_THEMES, SHIELD_COLOR, mapSheets } from "../content/maps.js";
import { CRATE_ATLAS, CRATE_KEYS } from "../content/maps-extra.js";
import { OBJ_CRATES, objBadge } from "../content/maps-more.js";
import {
  IMG_MAP,
  PAGE_GAMES,
  PAGE_SPECIAL,
  avgOf,
  blueMap,
  mixRgb,
  newsCss,
  pageButtons,
  pageCss,
  pageDailyKey,
  pagePals,
  pageThemeOk,
  palFrom,
  pgRgb,
  tabMap,
} from "../content/page-themes.js";
import { mapApplyNow, mapNext, mapShade, mapTheme } from "./map-themes.js";
import { root } from "./panel.js";
import { SETTINGS, storageLoaded } from "./storage.js";

// ---------- Page themes: the TankTrouble page itself (background, header, side boxes, buttons, lobby pictures) in a map's colours ----------
export let pageEverOn = false,
  pageKeyNow = null,
  pageStyle = null,
  lastMapKey = null;
export function pagePal(key) {
  // a page palette from the map's own colours (worked out once per map and shade)
  if (PAGE_SPECIAL[key]) {
    const S = PAGE_SPECIAL[key];
    if (pagePals[key]) {
      return pagePals[key];
    }
    const P = palFrom(key, pgRgb(S.floor), pgRgb(S.wall), pgRgb(S.acc));
    P.deco = S.deco(P);
    return (pagePals[key] = P);
  }
  const T = mapT(key);
  if (!T) {
    return null;
  }
  const id = key + "|" + T.shade;
  if (pagePals[id]) {
    return pagePals[id];
  }
  const floor = avgOf((g, w, h) => T.floor(g, 0, w, h), 96, 96) || [200, 200, 200],
    wall = avgOf((g, w, h) => T.wall(g, w, h), 48, 12) || mixRgb(floor, [0, 0, 0], 0.4);
  return (pagePals[id] = palFrom(
    key,
    floor,
    wall,
    pgRgb(SHIELD_COLOR[key] || BULLET_COLOR[key] || (T.bullet && T.bullet[0]) || "#ff8800"),
  ));
}
function pageKeyWanted() {
  const m = SETTINGS.pageMode || "off";
  if (!SETTINGS.on || m === "off") {
    return null;
  }
  if (m === "fixed") {
    return pageThemeOk(SETTINGS.pageFixed) ? SETTINGS.pageFixed : null;
  }
  if (m === "daily") {
    return pageDailyKey();
  }
  const k =
    mapTheme ||
    (mapNext !== undefined ? mapNext : null) ||
    (SETTINGS.mapMode === "fixed" ? SETTINGS.mapFixed : null) ||
    lastMapKey;
  if (k) {
    lastMapKey = k;
  }
  return MAP_THEMES[k] && k !== "standard" ? k : null; // 'map': the map in play (or the last one)
}
export const pageForMaze = () => {
  if (!((SETTINGS.pageMode === "fixed" || SETTINGS.pageMode === "daily") && SETTINGS.pageToMaze)) {
    return null;
  }
  const k = pageKeyWanted();
  return k && PAGE_SPECIAL[k] ? PAGE_SPECIAL[k].maze : k;
}; // the maze uses the page theme too (a seasonal one: its map)
function forumCss(P) {
  // forum threads and replies: in the theme's colours, in a plain dark mode, or left as they are (Settings: Forum posts)
  const fm = SETTINGS.pageForum || "theme";
  if (fm === "off") {
    return "";
  }
  const c =
    fm === "dark"
      ? { bg: "#1e2126", bg2: "#16181c", ink: "#e9e9ea", dim: "#a3a9b3", line: "#3a3f47", link: "#8fb4ff" }
      : { bg: P.panel, bg2: P.panel2, ink: P.ink, dim: P.dim, line: P.accent + "88", link: P.head };
  return `.bubble{background:linear-gradient(${c.bg},${c.bg2})!important;color:${c.ink}!important;border-color:${c.line}!important}
.bubble .header,.bubble .content,.bubble .content *{color:${c.ink}!important}.bubble .details{color:${c.dim}!important}.bubble a{color:${c.link}!important}
.bubble textarea,.bubble input{background:transparent!important;color:${c.ink}!important;caret-color:${c.ink};border-color:${c.line}!important;box-sizing:border-box;max-width:100%}.bubble textarea::placeholder,.bubble input::placeholder{color:${c.dim}!important;opacity:1}
.bubble .pointer.inner{background:${c.bg}!important}.bubble .pointer.border{background:${c.line}!important;border-color:${c.line}!important}
${fm === "theme" ? `#createThreadButton,#createReplyButton,.forum button.medium{background:linear-gradient(${P.pBtnTop},${P.pBtnBot})!important}` : ""}`;
}
let imgSaveT = 0;
const imgSave = (acc) => {
  clearTimeout(imgSaveT);
  imgSaveT = setTimeout(() => {
    const o = {};
    for (const id in IMG_MAP) {
      if (typeof IMG_MAP[id] === "string" && id.endsWith("|" + acc)) {
        o[id] = IMG_MAP[id];
      }
    }
    try {
      localStorage.setItem("ttcl_page_imgs2", JSON.stringify(o));
    } catch {}
  }, 1500);
};
function pageImgCss(P) {
  // page pictures recoloured to the theme: the forum's blue page and back buttons, pins and liked thumbs, the header's big tabs
  let css = `#header .tab.selected img.selected{filter:drop-shadow(0 0 5px ${P.accent})}`;
  const tail = "|" + P.accent;
  for (const im of document.querySelectorAll(
    'img[src*="/forum/back"],img[src*="/forum/page"],img[src*="/forum/pinned"],img[src*="/forum/likeSelected"],#header .tab img',
  )) {
    const u = im.getAttribute("src");
    if (!u || /["\\|]/.test(u)) {
      continue;
    }
    const id = u + tail;
    if (IMG_MAP[id]) {
      continue;
    }
    const tab = /\/header\/tab/.test(u),
      map = (i) => (tab ? tabMap(i, P, /Selected/.test(u)) : blueMap(i, P, true));
    IMG_MAP[id] = 1;
    const i = new Image();
    i.onload = () => {
      try {
        IMG_MAP[id] = map(i).toDataURL("image/webp", 0.92);
        imgSave(P.accent);
      } catch {
        IMG_MAP[id] = 2;
      }
      setTimeout(() => {
        try {
          pageTick();
        } catch {}
      }, 0);
    };
    i.onerror = () => {
      IMG_MAP[id] = 2;
    };
    i.src = u;
  }
  for (const id in IMG_MAP) {
    if (typeof IMG_MAP[id] === "string" && id.endsWith(tail)) {
      css += `img[src="${id.slice(0, -tail.length)}"]{content:url("${IMG_MAP[id]}")}`;
    }
  } // (every one made so far, on the page or not: ready before the pictures appear)
  return css;
}
let pageReady = false,
  pageCssSaved = null; // (true once your settings have loaded; until then the last page theme is put up straight away, so pages don't flash unthemed)
function pageTick() {
  if (!pageReady) {
    if (!storageLoaded) {
      return;
    }
    pageReady = true;
  }
  const key = pageKeyWanted(),
    P = key ? pagePal(key) : null,
    forum = /^\/forum/.test(location.pathname);
  const base = P ? pageCss(P, true) + newsCss(P) + pageImgCss(P) : "",
    css = base + (P && forum ? forumCss(P) : ""); // (every page gets the whole theme; the forum setting only changes the posts)
  if (pageCssSaved !== base) {
    pageCssSaved = base;
    try {
      if (base) {
        localStorage.setItem("ttcl_page_css", base);
      } else {
        localStorage.removeItem("ttcl_page_css");
      }
    } catch {}
  }
  if (css && !pageStyle) {
    pageStyle = document.createElement("style");
    pageStyle.id = "ttcl-page-theme";
    (document.head || document.documentElement).appendChild(pageStyle);
  }
  if (pageStyle && pageStyle.textContent !== css) {
    pageStyle.textContent = css;
  }
  try {
    // the Color Lab panel (and the garage's Color Lab buttons) in the theme's accent; the panel stays dark, so its text stays readable
    let ps = root.getElementById("ttcl-panel-theme");
    const pcss = P
      ? `button:not(.grey):not(.warning):not(.link):not(:disabled):not(.tab){background:linear-gradient(${P.pBtnTop},${P.pBtnBot})}
.panel{border-color:${P.pBtnTop}}.hdr{background:linear-gradient(${P.pBtnTop},${P.pBtnBot})}.tab{color:#f2f2f2}.sublbl,.help h4{color:${P.pHead}!important}
.fbMe{background:linear-gradient(${P.panel},${P.panel2})!important;color:${P.ink}!important;border:1px solid ${P.accent}66}.fbMe .fbH{border-color:${P.accent}55!important}.fbCl{background:linear-gradient(${P.pBtnTop},${P.pBtnBot})!important;color:#fff!important}`
      : "";
    if (pcss && !ps) {
      ps = document.createElement("style");
      ps.id = "ttcl-panel-theme";
      root.appendChild(ps);
    }
    if (ps && ps.textContent !== pcss) {
      ps.textContent = pcss;
    }
  } catch {}
  pageKeyNow = key;
  if (P) {
    pageEverOn = true;
  }
  if (!pageEverOn) {
    return;
  } // (nothing to do, or undo, until a page theme is first used)
  for (const g of [...PAGE_GAMES]) {
    if (!g || g.pendingDestroy || !g.world) {
      PAGE_GAMES.delete(g);
      continue;
    }
    if (g.state && g.state.current === "Game") {
      continue;
    } // (never during a round: the maze has nothing to theme here, and the round gets every frame)
    pageButtons(g, P);
  }
}
let pageBurstT = 0;
const pageBurst = () => {
  let n = 0;
  clearInterval(pageBurstT);
  pageBurstT = setInterval(() => {
    try {
      pageTick();
    } catch {}
    if (++n >= 25) {
      clearInterval(pageBurstT);
    }
  }, 80);
}; // (just after a page opens: themed at once, not a second later)
export function mapT(key) {
  const T = MAP_THEMES[key];
  if (!T) {
    return null;
  }
  const sh = mapShade(key),
    v = T[sh] || T[T.def];
  return Object.assign({ name: T.name, shade: sh }, v);
} // the look in use (light or dark)

// ---------- and 12 more, each with shots that look like nothing else (patterned, so no two maps' bullets match) ----------
let crateAtlas = null,
  crateAtlasReq = null;
function cratePic(key) {
  const i = CRATE_KEYS.indexOf(key);
  if (i < 0) {
    return null;
  }
  if (!crateAtlas) {
    if (!crateAtlasReq) {
      crateAtlasReq = loadImg(CRATE_ATLAS).then((im) => {
        if (!im) {
          crateAtlasReq = null;
          return;
        }
        crateAtlas = im;
        for (const id in mapSheets) {
          if (/\|o$/.test(id)) {
            delete mapSheets[id];
          }
        }
        try {
          mapApplyNow(true);
        } catch {}
      });
    }
    return null;
  }
  return [crateAtlas, (i % 8) * 128, Math.floor(i / 8) * 128];
}

export function startPage() {
  try {
    Object.assign(IMG_MAP, JSON.parse(localStorage.getItem("ttcl_page_imgs2") || "{}"));
  } catch {}
  try {
    localStorage.removeItem("ttcl_page_imgs");
  } catch {} // (an older, bigger copy)
  try {
    const c = localStorage.getItem("ttcl_page_css");
    if (c) {
      pageStyle = document.createElement("style");
      pageStyle.id = "ttcl-page-theme";
      pageStyle.textContent = c;
      (document.head || document.documentElement).appendChild(pageStyle);
    }
  } catch {}
  setInterval(pageTick, 1000);
  pageBurst();
  for (const m of ["pushState", "replaceState"]) {
    const o = history[m];
    if (typeof o === "function") {
      history[m] = function () {
        const r = o.apply(this, arguments);
        try {
          pageBurst();
        } catch {}
        return r;
      };
    }
  }
  addEventListener("popstate", () => pageBurst());
  document.addEventListener("DOMContentLoaded", () => pageBurst());
  for (const key of CRATE_KEYS) {
    const drawn = OBJ_CRATES[key];
    OBJ_CRATES[key] = (g, gl, k, d) => {
      const p = cratePic(key);
      if (!p) {
        if (drawn) {
          return drawn(g, gl, k, d);
        }
        g.fillStyle = "rgba(0,0,0,.45)";
        g.beginPath();
        g.roundRect(6, 6, 52, 52, 10);
        g.fill();
        return objBadge(g, gl, k, "#f4efe2", "#16171d", null, 17);
      } // (until the pictures load)
      g.save();
      g.shadowColor = "rgba(0,0,0,.4)";
      g.shadowBlur = 3;
      g.shadowOffsetX = 1.5;
      g.shadowOffsetY = 2;
      g.drawImage(p[0], p[1], p[2], 128, 128, 0, 0, 63, 63);
      g.restore();
      objBadge(g, gl, k, "#f4efe2", "#16171d", "rgba(20,20,26,.85)", 13.5);
    };
  }
}
