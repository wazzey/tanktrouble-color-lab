import { GX_PAINT, isPat, patId } from "../content/colours.js";
import { LAIKA_SKINS } from "../content/laika.js";
import { MAP_THEMES, bulletArt, gameSeasonNow, mapThemeList } from "../content/maps.js";
import { OBJ_CRATES } from "../content/maps-more.js";
import { PAGE_SPECIAL, pageDailyKey, pageThemeName, pageThemeOk } from "../content/page-themes.js";
import { flatHex, toCss } from "../content/registries.js";
import { getCustomArt } from "./custom-box-art.js";
import { loggedInIds } from "./game-socket.js";
import { colourName, renderGarageMaze } from "./garage-search.js";
import { laikaDog, laikaSkinChanged, redoLaikaSkin } from "./laika-look.js";
import { getOverride, shareMyLooks } from "./look-sharing.js";
import { applyMapTheme, bulletMode, mapApplyNow, mapGameRef, mapTheme } from "./map-themes.js";
import { patternSourceFor } from "./maze.js";
import { mapT, pageKeyNow, pagePal } from "./page.js";
import { $, toast } from "./panel.js";
import { SETTINGS, saveSettings } from "./storage.js";

// ---------- settings page: what shows in the panel and the garage ----------
export const isShown = (k) => !(SETTINGS.hide && SETTINGS.hide[k]);
export const SET_ITEMS = {
  setPanel: [
    ["rnd", "🎲 Random and its ▾ options", "Random looks and where they come from"],
    ["party", "🎉 Party mode button", "If party mode is on it keeps going"],
    ["hex", "Hex code box", "Typing colours like #ff0000"],
    ["swatches", "Swatches", "Box-by-box paints, items and ★ favourites"],
  ],
  setGarage: [
    ["gsearch", "🔍 Find in garage", "The search list, bottom-left"],
    ["gdice", "🎲 Random look", ""],
    ["gpower", "⏻ On / off", ""],
    ["gmz", "Pattern in-maze buttons", ""],
  ],
};
// ---------- Maze tab: patterns in the maze, the map and bullets, all in one place ----------
export const BULLET_COLS = [
  "0xffffff",
  "0xfff200",
  "0xff8a00",
  "0xe02020",
  "0xff3fa0",
  "0x9b4dff",
  "0x1e5aff",
  "0x00e5ff",
  "0x2dff6e",
  "0x111214",
];
let bulletMask = null;
export function bulletWarn(v) {
  // a line under the bullet choices: how visible the colour is, and what Color Lab does about it
  let hex = null;
  try {
    if (v === "turret") {
      const o = getOverride(loggedInIds()[0] || "");
      hex = o && o.turret ? flatHex(o.turret) : null;
    } else if (v) {
      hex = flatHex(v);
    }
  } catch {}
  if (!hex) {
    return v === "turret"
      ? "Your bullets follow your turret paint. If it blends into a map's floor, Color Lab adds an edge so others can still see them."
      : "";
  }
  const n = parseInt(String(hex).slice(2), 16),
    lum = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
  if (lum < 0.2) {
    return "⚠ Very dark bullets are hard to see on dark maps. Color Lab adds a light edge there so others can still see them.";
  }
  if (lum > 0.82) {
    return "⚠ Very light bullets blend into light maps. Color Lab adds a dark edge there so others can still see them.";
  }
  return "On a map whose floor is close to this colour, Color Lab adds an edge so your bullets can still be seen.";
}
export function bulletIcon(v, size = 22) {
  // a small bullet picture for a choice: a colour, a paint, the game's black or a pair of colours
  if (!bulletMask) {
    bulletMask = document.createElement("canvas");
    bulletMask.width = bulletMask.height = 20;
    const g = bulletMask.getContext("2d");
    g.fillStyle = "#000";
    g.beginPath();
    g.arc(10, 10, 9.5, 0, 7);
    g.fill();
  }
  const c = document.createElement("canvas");
  c.width = c.height = 20;
  const g = c.getContext("2d");
  if (v === "normal") {
    g.drawImage(bulletMask, 0, 0);
    g.fillStyle = "rgba(255,255,255,.35)";
    g.beginPath();
    g.arc(8, 7.5, 1.8, 0, 7);
    g.fill();
  } else if (Array.isArray(v)) {
    bulletArt(g, bulletMask, 20, 20, v[0], v[1]);
  } else if (v === "turret") {
    const f = document.createElement("canvas");
    f.width = f.height = 20;
    const fg = f.getContext("2d");
    ["#e02020", "#2dff6e", "#1e5aff", "#fff200"].forEach((col, i) => {
      fg.fillStyle = col;
      fg.beginPath();
      fg.moveTo(10, 10);
      fg.arc(10, 10, 12, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
      fg.fill();
    });
    bulletArt(g, bulletMask, 20, 20, f, "#111318");
  } else {
    let fill = toCss(v) || "#888";
    if (isPat(v)) {
      const t = patternSourceFor(v);
      if (t && GX_PAINT[patId(v)]) {
        const f = document.createElement("canvas");
        f.width = f.height = 20;
        f.getContext("2d").drawImage(
          t,
          (t.width || 400) * 0.35,
          (t.height || 240) * 0.3,
          (t.width || 400) * 0.3,
          (t.height || 240) * 0.4,
          0,
          0,
          20,
          20,
        );
        fill = f;
      }
    }
    const n = parseInt((flatHex(v) || "0x888888").slice(2), 16),
      lum = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
    bulletArt(g, bulletMask, 20, 20, fill, lum > 0.55 ? "#111318" : "#f4f4f2");
  }
  c.style.width = c.style.height = size + "px";
  return c;
}
const mapThumbs = {};
export function mapThumb(key) {
  // a little square of the map: floor, a wall and a crate
  const copy = (src) => {
    const o = document.createElement("canvas");
    o.width = o.height = 44;
    o.getContext("2d").drawImage(src, 0, 0);
    return o;
  }; // (a canvas copied with cloneNode comes out blank)
  const T = key === "game" ? null : mapT(key),
    tk = key + "|" + (T ? T.shade : "") + "|" + (SETTINGS.crateStyle || "box");
  if (mapThumbs[tk]) {
    return copy(mapThumbs[tk]);
  }
  const c = document.createElement("canvas");
  c.width = c.height = 44;
  const g = c.getContext("2d");
  if (key === "game" || !T || T.keepStandard) {
    g.fillStyle = key === "game" ? "#d9d2c5" : "#e6e6e6";
    g.fillRect(0, 0, 44, 44);
    g.fillStyle = "#555";
    g.fillRect(0, 20, 44, 4);
    g.fillRect(20, 0, 4, 22);
    if (key === "game") {
      g.font = "18px sans-serif";
      g.textAlign = "center";
      g.fillText("🎃", 11, 40);
    }
  } else {
    const f = document.createElement("canvas");
    f.width = f.height = 200;
    T.floor(f.getContext("2d"), 0, 200, 200);
    g.drawImage(f, 0, 0, 44, 44);
    const w = document.createElement("canvas");
    w.width = 216;
    w.height = 16;
    T.wall(w.getContext("2d"), 216, 16);
    g.drawImage(w, 0, 0, 216, 16, -2, 20, 48, 4);
    g.save();
    g.translate(24, -2);
    g.rotate(Math.PI / 2);
    g.drawImage(w, 0, 0, 216, 16, 0, 0, 24, 4);
    g.restore();
    const k = document.createElement("canvas");
    k.width = k.height = 64;
    if (SETTINGS.crateStyle !== "box" && OBJ_CRATES[key]) {
      OBJ_CRATES[key](k.getContext("2d"), null, 0, T.shade === "dark");
    } else {
      T.crate(k.getContext("2d"), null, 0);
    }
    g.drawImage(k, 26, 26, 16, 16);
    if (T.bullet) {
      const b = bulletIcon(T.bullet, 7);
      g.drawImage(b, 7, 30, 7, 7);
    }
  }
  mapThumbs[tk] = c;
  return copy(c);
}
export function renderMazeTab() {
  const host = $("mazeBody");
  if (!host) {
    return;
  }
  host.innerHTML = "";
  const sec = (title, sub) => {
    const d = document.createElement("div");
    d.className = "mzsec";
    d.innerHTML = '<div class="sublbl"></div><small class="mzsub"></small>';
    d.children[0].textContent = title;
    d.children[1].textContent = sub || "";
    host.appendChild(d);
    return d;
  };
  const tiles = (parent) => {
    const t = document.createElement("div");
    t.className = "mztiles";
    parent.appendChild(t);
    return t;
  };
  const tile = (parent, icon, label, on, tip, fn) => {
    const b = document.createElement("button");
    b.className = "mztile" + (on ? " on" : "");
    b.title = tip || label;
    if (icon) {
      b.appendChild(icon);
    }
    const l = document.createElement("span");
    l.textContent = label;
    b.appendChild(l);
    b.onclick = fn;
    parent.appendChild(b);
    return b;
  };
  const reapply = () => {
    const g = mapGameRef && mapGameRef.deref();
    if (g && mapTheme) {
      try {
        applyMapTheme(g, mapTheme);
      } catch {}
    }
  };
  // tanks
  const st = sec("Tanks");
  const tg = document.createElement("div");
  tg.className = "setrow";
  tg.innerHTML =
    '<span class="tog' +
    (SETTINGS.mazePatterns !== false ? " on" : "") +
    '"></span><span><span>Pattern paints in the maze</span><small>Off = every pattern shows as its main colour</small></span>';
  tg.onclick = () => {
    SETTINGS.mazePatterns = SETTINGS.mazePatterns === false;
    saveSettings();
    renderMazeTab();
    try {
      renderGarageMaze();
    } catch {}
    toast("Patterns in the maze " + (SETTINGS.mazePatterns ? "on" : "off") + " (next round)");
  };
  st.appendChild(tg);
  const lk = document.createElement("div");
  lk.className = "setrow";
  lk.innerHTML =
    '<span class="tog' +
    (SETTINGS.laikaSkin !== false ? " on" : "") +
    "\"></span><span><span>Laika dresses up</span><small>Laika wears a theme's paints and hat: the Color Lab map's, or one you pick (unless you saved a look for her)</small></span>";
  lk.onclick = () => {
    SETTINGS.laikaSkin = SETTINGS.laikaSkin === false;
    saveSettings();
    redoLaikaSkin();
    laikaSkinChanged();
    renderMazeTab();
  };
  st.appendChild(lk);
  if (SETTINGS.laikaSkin !== false) {
    const lr = document.createElement("div");
    lr.className = "mzpaint";
    const ls = document.createElement("select");
    lr.title = "Which look Laika wears";
    const opt = (v, t) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      ls.appendChild(o);
    };
    opt("map", "Laika's look: follows the map");
    for (const k of Object.keys(LAIKA_SKINS)) {
      opt(k, "Laika's look: always " + (MAP_THEMES[k] ? MAP_THEMES[k].name : k));
    }
    ls.value = SETTINGS.laikaLook && LAIKA_SKINS[SETTINGS.laikaLook] ? SETTINGS.laikaLook : "map";
    ls.onchange = () => {
      SETTINGS.laikaLook = ls.value;
      saveSettings();
      redoLaikaSkin();
      laikaSkinChanged();
      toast("Laika's look changes the next time she appears");
    };
    lr.appendChild(ls);
    st.appendChild(lr);
  }
  const dg = document.createElement("div");
  dg.className = "setrow";
  dg.innerHTML =
    '<span class="tog' +
    (SETTINGS.laikaDog ? " on" : "") +
    "\"></span><span><span>🧪 Repaint Laika's dog too</span><small>Experimental: her robot dog in the same theme (hats, crowns, headbands and shades included). Switch off if anything looks wrong</small></span>";
  dg.onclick = () => {
    SETTINGS.laikaDog = !SETTINGS.laikaDog;
    saveSettings();
    laikaDog();
    renderMazeTab();
  };
  st.appendChild(dg);
  // page theme: the TankTrouble page in a map's colours
  {
    const pm = SETTINGS.pageMode || "off",
      sp = sec(
        "Page theme",
        "The page around the game (background, header, side boxes, buttons, lobby pictures, forum, news and shop) in a map's colours",
      );
    sp.id = "mzPage";
    const ps = document.createElement("div");
    ps.className = "mzseg";
    sp.appendChild(ps);
    for (const [m, t, tip] of [
      ["off", "Off", "The normal page"],
      ["map", "🗺 Match map", "The page follows the map you're playing on"],
      ["fixed", "One theme", "Always the same page theme"],
      ["daily", "📅 Daily", "A new page theme every day (the same one for everyone)"],
    ]) {
      const b = document.createElement("button");
      b.className = "small" + (pm === m ? "" : " grey");
      b.textContent = t;
      b.title = tip;
      b.onclick = () => {
        SETTINGS.pageMode = m;
        if (m === "fixed" && !pageThemeOk(SETTINGS.pageFixed)) {
          SETTINGS.pageFixed = pageKeyNow || "volcano";
        }
        saveSettings();
        renderMazeTab();
      };
      ps.appendChild(b);
    }
    if (pm !== "off") {
      const fl = document.createElement("small");
      fl.className = "mzsub";
      fl.textContent = "Forum threads and replies:";
      sp.appendChild(fl);
      const fs = document.createElement("div");
      fs.className = "mzseg";
      sp.appendChild(fs);
      const fm = SETTINGS.pageForum || "theme";
      for (const [v, t, tip] of [
        ["theme", "🎨 Themed", "Threads and replies in the page theme's colours"],
        ["dark", "🌙 Dark", "Threads and replies dark; the rest of the page keeps the theme"],
        ["off", "Normal", "Threads and replies as TankTrouble shows them"],
      ]) {
        const b = document.createElement("button");
        b.className = "small" + (fm === v ? "" : " grey");
        b.textContent = t;
        b.title = tip;
        b.onclick = () => {
          SETTINGS.pageForum = v;
          saveSettings();
          renderMazeTab();
        };
        fs.appendChild(b);
      }
    }
    if (pm === "fixed" || pm === "daily") {
      if (pm === "fixed") {
        const pr = document.createElement("div");
        pr.className = "mzpaint";
        const sel = document.createElement("select");
        for (const k of [
          ...Object.keys(PAGE_SPECIAL),
          ...mapThemeList().filter((themeKey) => themeKey !== "standard"),
        ]) {
          const o = document.createElement("option");
          o.value = k;
          o.textContent = "Page theme: " + pageThemeName(k);
          sel.appendChild(o);
        }
        sel.value = SETTINGS.pageFixed;
        sel.onchange = () => {
          SETTINGS.pageFixed = sel.value;
          saveSettings();
          renderMazeTab();
        };
        pr.appendChild(sel);
        sp.appendChild(pr);
        // the same list as colour tiles: header strip, page, box and accent colours of each theme (hover for its name)
        const grid = document.createElement("div");
        grid.style.cssText =
          "display:grid;grid-template-columns:repeat(auto-fill,minmax(38px,1fr));gap:4px;max-height:156px;overflow-y:auto;margin:4px 0 2px;padding:2px";
        for (const k of [...sel.options].map((o) => o.value)) {
          let P = null;
          try {
            P = pagePal(k);
          } catch {}
          if (!P) {
            continue;
          }
          const t = document.createElement("div"),
            on = k === SETTINGS.pageFixed;
          t.title = pageThemeName(k);
          t.style.cssText =
            "height:30px;border-radius:5px;cursor:pointer;box-sizing:border-box;border:2px solid " +
            (on ? "#fff" : "rgba(255,255,255,.18)") +
            ";background:linear-gradient(" +
            P.header +
            " 0 7px,transparent 7px),linear-gradient(90deg," +
            P.bgTop +
            " 0 45%," +
            P.panel +
            " 45% 100%);box-shadow:inset 0 -5px 0 " +
            P.accent +
            (on ? ",0 0 6px " + P.accent : "");
          t.onclick = () => {
            SETTINGS.pageFixed = k;
            saveSettings();
            renderMazeTab();
          };
          grid.appendChild(t);
        }
        sp.appendChild(grid);
        if (grid.querySelector('[style*="#fff"]')) {
          setTimeout(() => {
            try {
              const s1 = grid.querySelector('[style*="solid #fff"]');
              if (s1) {
                grid.scrollTop = s1.offsetTop - grid.offsetTop - 40;
              }
            } catch {}
          }, 0);
        }
      } else {
        const k = pageDailyKey(),
          n = document.createElement("small");
        n.className = "mzsub";
        n.textContent =
          "Today: " +
          (k ? pageThemeName(k) : "-") +
          " · Halloween, Christmas and Easter get their own theme on their dates";
        sp.appendChild(n);
      }
      const tm = document.createElement("div");
      tm.className = "setrow";
      tm.innerHTML =
        '<span class="tog' +
        (SETTINGS.pageToMaze ? " on" : "") +
        '"></span><span><span>Use it for the maze too</span><small>The maze (and Laika) get the same theme. Off = the maze keeps its own setting below</small></span>';
      tm.onclick = () => {
        SETTINGS.pageToMaze = !SETTINGS.pageToMaze;
        saveSettings();
        try {
          mapApplyNow();
        } catch {}
        renderMazeTab();
      };
      sp.appendChild(tm);
    }
  }
  // map
  const mode = SETTINGS.mapMode || "game",
    sm = sec("Map", "Floors, walls, crates and bullets - only on your screen");
  for (const [sk, sectionTitle, ssub] of [
    [
      "halloween",
      "🎃 Keep the game's Halloween maze",
      "From 1 October to 1 November, the game's own Halloween maze instead of your Color Lab map",
    ],
    [
      "christmas",
      "🎄 Keep the game's Christmas maze",
      "In December, the game's own Christmas maze instead of your Color Lab map",
    ],
  ]) {
    const on = !!(SETTINGS.keepSeason && SETTINGS.keepSeason[sk]),
      r = document.createElement("div");
    r.className = "setrow";
    r.innerHTML = '<span class="tog' + (on ? " on" : "") + '"></span><span><span></span><small></small></span>';
    r.children[1].children[0].textContent = sectionTitle;
    r.children[1].children[1].textContent = ssub + (gameSeasonNow() === sk ? " (on now)" : "");
    r.onclick = () => {
      SETTINGS.keepSeason = Object.assign({}, SETTINGS.keepSeason, { [sk]: !on });
      saveSettings();
      try {
        mapApplyNow();
      } catch {}
      renderMazeTab();
    };
    sm.appendChild(r);
  }
  const mzl = (t) => {
    const d = document.createElement("div");
    d.style.cssText = "font:11px Arial;opacity:.8;margin:7px 0 2px";
    d.textContent = t;
    sm.appendChild(d);
  };
  mzl("Which map:");
  const seg = document.createElement("div");
  seg.className = "mzseg";
  sm.appendChild(seg);
  for (const [m, t] of [
    ["game", "Game's"],
    ["fixed", "One map"],
    ["random", "🎲 Random"],
    ["cycle", "🔁 Take turns"],
  ]) {
    const b = document.createElement("button");
    b.className = "small" + (mode === m ? "" : " grey");
    b.textContent = t;
    b.onclick = () => {
      SETTINGS.mapMode = m;
      if (m === "fixed" && !MAP_THEMES[SETTINGS.mapFixed]) {
        SETTINGS.mapFixed = mapThemeList().find((k) => k !== "standard") || "standard";
      }
      saveSettings();
      try {
        mapApplyNow();
      } catch {}
      renderMazeTab();
    };
    seg.appendChild(b);
  }
  if (mode !== "game") {
    mzl("Light or dark:");
    const sh = document.createElement("div");
    sh.className = "mzseg";
    sm.appendChild(sh);
    const cur = ["light", "dark", "mix"].includes(SETTINGS.mapShade) ? SETTINGS.mapShade : "theme";
    for (const [v, t, tip] of [
      ["theme", "Each map's own", "Every map in its usual look"],
      ["light", "☀ Light", "Every map in its light version"],
      ["dark", "🌙 Dark", "Every map in its dark version (easier on the eyes)"],
      ["mix", "🎲 Mix", "Each round, light or dark at random"],
    ]) {
      const b = document.createElement("button");
      b.className = "small" + (cur === v ? "" : " grey");
      b.textContent = t;
      b.title = tip;
      b.onclick = () => {
        SETTINGS.mapShade = v;
        saveSettings();
        try {
          mapApplyNow(true);
        } catch {}
        renderMazeTab();
      };
      sh.appendChild(b);
    }
    mzl("Weapon crates:");
    const cs = document.createElement("div");
    cs.className = "mzseg";
    sm.appendChild(cs);
    const cst = SETTINGS.crateStyle !== "box" ? "object" : "box";
    for (const [v, t, tip] of [
      ["box", "📦 Crate boxes", "Weapon crates as boxes in the map's style"],
      [
        "object",
        "🎁 Themed crates",
        "Weapon crates as something from the map (a bubble, a tyre, a lantern...), the weapon's symbol on a badge",
      ],
    ]) {
      const b = document.createElement("button");
      b.className = "small" + (cst === v ? "" : " grey");
      b.textContent = t;
      b.title = tip;
      b.onclick = () => {
        SETTINGS.crateStyle = v;
        saveSettings();
        try {
          mapApplyNow(true);
        } catch {}
        renderMazeTab();
      };
      cs.appendChild(b);
    }
    const mt = tiles(sm),
      pick = mode === "fixed",
      inPool = (k) => !Array.isArray(SETTINGS.mapPool) || !SETTINGS.mapPool.length || SETTINGS.mapPool.includes(k);
    for (const k of mapThemeList()) {
      const on = pick ? SETTINGS.mapFixed === k : inPool(k);
      tile(
        mt,
        mapThumb(k),
        MAP_THEMES[k].name,
        on,
        pick ? "Use " + MAP_THEMES[k].name : on ? "In the mix - click to leave out" : "Left out - click to add",
        () => {
          if (pick) {
            SETTINGS.mapFixed = k;
          } else {
            const poolThemes = mapThemeList().filter(inPool),
              nx = on ? poolThemes.filter((x) => x !== k) : [...new Set([...poolThemes, k])];
            if (!nx.length) {
              return toast("Keep at least one map", true);
            }
            SETTINGS.mapPool = nx;
          }
          saveSettings();
          try {
            mapApplyNow();
          } catch {}
          renderMazeTab();
        },
      );
    }
    if (!pick) {
      const n = document.createElement("small");
      n.className = "mzsub";
      n.textContent = "Lit maps are in the mix";
      sm.appendChild(n);
    }
  }
  // bullets
  const sb = sec("Everyone's bullets"),
    bt = tiles(sb),
    bm = bulletMode(),
    mapB =
      ((MAP_THEMES[SETTINGS.mapFixed] && mapT(SETTINGS.mapFixed)) || mapT("deepsea")).bullet || mapT("deepsea").bullet;
  tile(
    bt,
    bulletIcon("normal"),
    "Normal",
    bm === "normal",
    "Plain bullets: the game's black, or white on a dark map so they stay easy to see",
    () => {
      SETTINGS.bulletMode = "normal";
      saveSettings();
      reapply();
      renderMazeTab();
    },
  );
  tile(bt, bulletIcon(mapB), "Map's", bm === "map", "Each map theme's own bullets (normal on the game's map)", () => {
    SETTINGS.bulletMode = "map";
    saveSettings();
    reapply();
    renderMazeTab();
  });
  tile(bt, bulletIcon("turret"), "Turrets", bm === "turret", "Each tank's bullets in its turret paint", () => {
    SETTINGS.bulletMode = "turret";
    saveSettings();
    reapply();
    renderMazeTab();
  });
  {
    const bp = document.createElement("div");
    bp.className = "setrow";
    bp.innerHTML =
      '<span class="tog' +
      (bm !== "normal" ? " on" : "") +
      "\"></span><span><span>Themed bullets on maps</span><small>Off = plain bullets on every map: the game's black, or white on a dark map so they never disappear. Your own bullet choice below isn't affected</small></span>";
    bp.onclick = () => {
      SETTINGS.bulletMode = bm === "normal" ? "map" : "normal";
      saveSettings();
      reapply();
      renderMazeTab();
    };
    sb.appendChild(bp);
  }
  const sy = sec("Your bullets", "Shows on every map, over everyone else's. Other Color Lab users see them too"),
    yt = tiles(sy),
    my = SETTINGS.myBullet || null,
    setMy = (v) => {
      SETTINGS.myBullet = v;
      saveSettings();
      renderMazeTab();
      try {
        shareMyLooks();
      } catch {}
    }; // (other Color Lab users see them too)
  tile(yt, bulletIcon("normal"), "Same", !my, "Like everyone else's", () => setMy(null));
  tile(
    yt,
    bulletIcon((getOverride(loggedInIds()[0] || "") && getOverride(loggedInIds()[0]).turret) || "turret"),
    "Turret",
    my === "turret",
    "Your turret paint",
    () => setMy("turret"),
  );
  const cols = tiles(sy);
  cols.classList.add("mzdots");
  for (const v of BULLET_COLS) {
    const b = tile(cols, bulletIcon(v, 20), "", my === v, colourName(v), () => setMy(v));
    b.classList.add("dot");
  }
  const cc = document.createElement("input");
  cc.type = "color";
  cc.className = "bulcol";
  cc.title = "Any colour";
  cc.value = my && !isPat(my) && my !== "turret" ? "#" + my.slice(2) : "#ffd400";
  cc.onchange = () => setMy("0x" + cc.value.slice(1));
  cols.appendChild(cc);
  const pr = document.createElement("div");
  pr.className = "mzpaint";
  const ps = document.createElement("select");
  const o0 = document.createElement("option");
  o0.value = "";
  o0.textContent = "A Color Lab paint…";
  ps.appendChild(o0);
  for (const k of Object.keys(GX_PAINT)
    .filter((paintKey) => paintKey.startsWith("pt-"))
    .sort((a, b) => GX_PAINT[a].name.localeCompare(GX_PAINT[b].name))) {
    const o = document.createElement("option");
    o.value = "p:" + k;
    o.textContent = GX_PAINT[k].name;
    ps.appendChild(o);
  }
  ps.value = isPat(my) ? my : "";
  ps.onchange = () => {
    if (ps.value) {
      getCustomArt(patId(ps.value)).then(() => renderMazeTab());
      setMy(ps.value);
    }
  };
  if (isPat(my)) {
    pr.appendChild(bulletIcon(my, 22));
  }
  pr.appendChild(ps);
  sy.appendChild(pr);
  {
    const wt = bulletWarn(my);
    if (wt) {
      const w = document.createElement("div");
      w.className = "hint";
      w.style.cssText = "margin:4px 0 0;font-size:11px;opacity:.9";
      w.textContent = wt;
      sy.appendChild(w);
    }
  }
}
