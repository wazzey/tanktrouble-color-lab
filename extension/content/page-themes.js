import { MAP_THEMES, mapThemeList } from "./maps.js";

// ---------- Page themes: the TankTrouble page itself (background, header, side boxes, buttons, lobby pictures) in a map's colours ----------
// Off / match the map in play / one fixed theme / a new theme every day (the same one for everyone that day). With a
// fixed or daily page theme the maze can use it too (pickMapTheme), and then Laika dresses for it like any map.
// The colours come from each map's own floor, walls and shots, so every map theme has a page theme. The full look is
// on every page (game, forum, news, shop), with the writing coloured to stay readable on it.
export const PAGE_GAMES = new Set(),
  pagePals = {};
export const pgRgb = (h) => {
  const n = parseInt(String(h).replace("#", "").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbHex = (c) =>
  "#" +
  c
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
export const mixRgb = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t),
  lumRgb = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
function hueSat(c) {
  const [r, g, b] = c.map((v) => v / 255),
    mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn;
  let h = 0;
  if (d) {
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  }
  h = (h * 60 + 360) % 360;
  const l = (mx + mn) / 2,
    sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [h, sat];
}
export function avgOf(draw, w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  try {
    draw(g, w, h);
  } catch {}
  const d = g.getImageData(0, 0, w, h).data;
  let r = 0,
    gg = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < d.length; i += 16) {
    if (d[i + 3] > 200) {
      r += d[i];
      gg += d[i + 1];
      b += d[i + 2];
      n++;
    }
  }
  return n ? [r / n, gg / n, b / n] : null;
}
// Seasonal page themes (not maps): their own colours, a light pattern on the background, and a map the maze can use with them
export const PAGE_SPECIAL = {
  dark: { name: "🌙 Dark", floor: "#15171c", wall: "#262a33", acc: "#4f8cff", maze: "space", deco: () => "" }, // a plain dark page (pick it under One theme)
  halloween: {
    name: "🎃 Halloween",
    floor: "#1a1022",
    wall: "#2b1838",
    acc: "#ff7a1a",
    maze: "haunted",
    deco: (P) =>
      `radial-gradient(circle at 20% 30%,#ff7a1a22 0 2px,transparent 3px) 0 0/90px 90px,radial-gradient(circle at 70% 60%,#9b5cff22 0 2px,transparent 3px) 0 0/120px 120px`,
  },
  christmas: {
    name: "🎄 Christmas",
    floor: "#0f2a1c",
    wall: "#7a1018",
    acc: "#e8343f",
    maze: "arctic",
    deco: (P) =>
      `radial-gradient(circle,#ffffff55 0 1.5px,transparent 2.5px) 0 0/70px 70px,radial-gradient(circle,#ffffff33 0 1px,transparent 2px) 35px 35px/70px 70px`,
  },
  easter: {
    name: "🐣 Easter",
    floor: "#f6f0ff",
    wall: "#b9e6c9",
    acc: "#c46be8",
    maze: "garden",
    deco: (P) =>
      `radial-gradient(ellipse 6px 8px,#ffd36b55 0 100%,transparent) 0 0/80px 80px,radial-gradient(ellipse 6px 8px,#8fd9ff55 0 100%,transparent) 40px 40px/80px 80px`,
  },
};
export const pageThemeName = (k) => (PAGE_SPECIAL[k] ? PAGE_SPECIAL[k].name : MAP_THEMES[k] ? MAP_THEMES[k].name : k);
export const pageThemeOk = (k) => !!(PAGE_SPECIAL[k] || (MAP_THEMES[k] && k !== "standard"));
const conRgb = (a, b) => {
  const l = (c) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
    },
    x = l(a),
    y = l(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}; // (contrast, as the web's readability guidelines measure it)
export function palFrom(key, floor, wall, acc) {
  // every page colour from a floor, a wall and an accent colour, each checked for readability
  if (Math.abs(lumRgb(acc) - lumRgb(floor)) < 0.18) {
    acc = mixRgb(acc, lumRgb(floor) > 0.5 ? [0, 0, 0] : [255, 255, 255], 0.35);
  } // (the accent always stands out from the floor)
  const dark = lumRgb(floor) < 0.45,
    ink = dark ? [244, 236, 228] : [24, 22, 26];
  const away = dark ? [0, 0, 0] : [255, 255, 255],
    toward = dark ? [255, 255, 255] : [0, 0, 0],
    W = [255, 255, 255];
  let panel = dark ? mixRgb(floor, wall, 0.45) : mixRgb(floor, [255, 255, 255], 0.35),
    panel2 = mixRgb(panel, dark ? [0, 0, 0] : wall, dark ? 0.35 : 0.25);
  for (let k = 0; k < 8 && Math.min(conRgb(ink, panel), conRgb(ink, panel2)) < 5.5; k++) {
    panel = mixRgb(panel, away, 0.15);
    panel2 = mixRgb(panel2, away, 0.15);
  } // (the boxes' writing always easy to read)
  let head = acc;
  for (let k = 0; k < 10 && Math.min(conRgb(head, panel), conRgb(head, panel2)) < 4; k++) {
    head = mixRgb(head, toward, 0.2);
  } // headings and links readable on the boxes
  let dim = mixRgb(ink, panel, 0.3);
  for (let k = 0; k < 8 && Math.min(conRgb(dim, panel), conRgb(dim, panel2)) < 4.5; k++) {
    dim = mixRgb(dim, ink, 0.3);
  } // (small grey writing, like forum dates)
  const [ah, as] = hueSat(acc);
  let bTop = mixRgb(acc, [255, 255, 255], 0.12),
    bBot = mixRgb(acc, [0, 0, 0], 0.55);
  for (let k = 0; k < 10 && (conRgb(W, bTop) < 3.2 || conRgb(W, mixRgb(bTop, bBot, 0.5)) < 4.6); k++) {
    bTop = mixRgb(bTop, [0, 0, 0], 0.15);
    bBot = mixRgb(bBot, [0, 0, 0], 0.15);
  } // (white button writing stays readable, top to bottom)
  let pHead = mixRgb(acc, [255, 255, 255], 0.45);
  for (let k = 0; k < 6 && lumRgb(pHead) < 0.6; k++) {
    pHead = mixRgb(pHead, [255, 255, 255], 0.3);
  } // (headings stand out on the dark panel)
  return {
    key,
    dark,
    floor: rgbHex(floor),
    bgTop: rgbHex(mixRgb(floor, dark ? [0, 0, 0] : [255, 255, 255], dark ? 0.55 : 0.35)),
    bgBot: rgbHex(mixRgb(floor, acc, 0.35)),
    header: rgbHex(mixRgb(mixRgb(wall, acc, 0.2), [0, 0, 0], dark ? 0.5 : 0.15)),
    accent: rgbHex(acc),
    head: rgbHex(head),
    ink: rgbHex(ink),
    dim: rgbHex(dim),
    panel: rgbHex(panel),
    panel2: rgbHex(panel2),
    btn:
      as < 0.18
        ? "saturate(0.15) brightness(" + (lumRgb(acc) > 0.5 ? 1.25 : 0.8) + ")"
        : "hue-rotate(" + Math.round(ah - 225) + "deg) saturate(" + Math.min(1.6, 0.7 + as).toFixed(2) + ")", // the game's blue buttons turned to the accent
    chat:
      as < 0.18
        ? "saturate(0.1) brightness(" + (lumRgb(acc) > 0.5 ? 1.3 : 0.85) + ")"
        : "hue-rotate(" + Math.round(ah - 225) + "deg) saturate(" + Math.min(1.6, 0.7 + as).toFixed(2) + ")", // (the game's blue chat bubble turned to the accent)
    pBtnTop: rgbHex(bTop),
    pBtnBot: rgbHex(bBot),
    pHead: rgbHex(pHead),
    overlay: "rgba(" + mixRgb(floor, [0, 0, 0], 0.72).map(Math.round).join(",") + ",.86)",
    icon: parseInt(rgbHex(mixRgb(floor, [255, 255, 255], dark ? 0.25 : 0.1)).slice(1), 16),
  }; // lobby game pictures tinted to the floor
}
function easterDay(y) {
  const a = y % 19,
    b = Math.floor(y / 100),
    c = y % 100,
    d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
} // (Easter Sunday)
function pageSeasonKey(d) {
  // the seasonal theme for a date, if any: the week before Halloween, 1-26 December, Easter week either side
  const m = d.getMonth(),
    day = d.getDate();
  if (m === 9 && day >= 24) {
    return "halloween";
  }
  if (m === 10 && day === 1) {
    return "halloween";
  }
  if (m === 11 && day <= 26) {
    return "christmas";
  }
  const e = easterDay(d.getFullYear()),
    diff = Math.round(
      (new Date(d.getFullYear(), m, day) - new Date(e.getFullYear(), e.getMonth(), e.getDate())) / 86400000,
    );
  return Math.abs(diff) <= 7 ? "easter" : null;
}
export function pageDailyKey() {
  // a new theme every day, the same one for everyone (a seasonal one on its dates)
  const d = new Date(),
    season = pageSeasonKey(d);
  if (season) {
    return season;
  }
  const keys = mapThemeList()
    .filter((k) => k !== "standard")
    .sort();
  if (!keys.length) {
    return null;
  }
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return keys[(day * 7919) % keys.length];
}
export function newsCss(P) {
  // news posts: ordinary ones on the theme's boxes, important ones on its button colours (white writing)
  return `.newsPost .wrapper{background:linear-gradient(${P.panel},${P.panel2})!important;color:${P.ink}!important;border:1px solid ${P.accent}77;box-shadow:0 0 12px ${P.accent}40}
.newsPost .wrapper .header,.newsPost .wrapper .header *{color:${P.head}!important}.newsPost .wrapper a{color:${P.head}!important}
.newsPost.important .wrapper{background:linear-gradient(${P.pBtnTop} -60%,${P.pBtnBot})!important;color:#fff!important}.newsPost.important .wrapper .header,.newsPost.important .wrapper .header *,.newsPost.important .wrapper a{color:#fff!important}`;
}
export function pageCss(P, full) {
  const head = `#header{background:linear-gradient(${P.header},${P.dark ? "#000" : P.panel2})!important;border-bottom:2px solid ${P.accent};box-shadow:0 3px 16px ${P.accent}88}#header .shadow{opacity:.25}#chat img.status{filter:${P.chat}}#header .tab:focus:not(:focus-visible){outline:none}
#overlay{background:${P.overlay}!important}#overlay input{border-color:${P.accent}!important}#overlay button:not(.warning):not(:disabled){background:linear-gradient(${P.pBtnTop},${P.pBtnBot})!important}`; // (sign up, log in and the other pop-ups: always dark behind, so their white writing stays readable)
  if (!full) {
    return head;
  }
  return (
    head +
    `html,body{background:${P.deco ? P.deco + "," : ""}radial-gradient(ellipse 120% 70% at 50% 115%,${P.bgBot} 0%,${P.floor} 40%,${P.bgTop} 100%) fixed!important}
.snippet:not(#scrapyardSnippet):not(#wallOfFameSnippet){background:linear-gradient(${P.panel},${P.panel2})!important;color:${P.ink}!important;border:1px solid ${P.accent}77;box-shadow:0 0 12px ${P.accent}40}
.snippet:not(#scrapyardSnippet):not(#wallOfFameSnippet) *{color:inherit}.snippet:not(#scrapyardSnippet):not(#wallOfFameSnippet) .header{color:${P.head}!important}.snippet:not(#scrapyardSnippet):not(#wallOfFameSnippet) a{color:${P.head}!important;text-decoration:underline}
#scrapyardSnippet,#wallOfFameSnippet{box-shadow:0 0 0 1px ${P.accent},0 0 12px ${P.accent}55}
#overlay button:not(.warning):not(:disabled),#overlay .garage form button:not(.warning){background:linear-gradient(${P.pBtnTop},${P.pBtnBot})!important;color:#fff!important}
#adduser .content{background:linear-gradient(${P.panel},${P.panel2})!important;border:1px solid ${P.accent}88;color:${P.ink}!important}#adduser .tab{background:${P.panel2}!important}
button:is(.small,.medium,.large):not(.warning):not(:disabled){background:linear-gradient(${P.pBtnTop},${P.pBtnBot})!important;color:#fff!important}button:is(.small,.medium,.large):not(.warning):not(:disabled):active{filter:brightness(.85)}
#tankinfo .content{background:linear-gradient(${P.panel},${P.panel2})!important;border:1px solid ${P.accent}88}#tankinfo .tab{background:${P.panel2}!important}
.forum .status,.forum .note,.forum .synchronisation{color:${P.ink}!important}${P.dark ? "" : 'img[src*="/forum/page"],img[src*="/forum/ellipsis"],img[src*="/forum/back"]{filter:drop-shadow(0 0 2px rgba(0,0,0,.55))}'}#adduser button:not(.warning){background:linear-gradient(${P.pBtnTop},${P.pBtnBot})!important}
#ttcl-gsearch{border-color:${P.pBtnTop}!important}#ttcl-gsearch :not(input)[style*="66, 127, 255"],#ttcl-gsearch :not(input)[style*="#427fff"],.garage :not(input)[style*="66, 127, 255"],.garage :not(input)[style*="#427fff"]{background:linear-gradient(${P.pBtnTop},${P.pBtnBot})!important}
#ttcl-gsearch .r button:not([style*="90, 90, 90"]){background:linear-gradient(${P.pBtnTop},${P.pBtnBot})!important;color:#fff!important}#ttcl-gsearch [style*="157, 184, 255"],#ttcl-gsearch [style*="#9db8ff"]{color:${P.pHead}!important}`
  );
}
export function blueMap(src, P, icon) {
  // the blue parts of a picture in the theme's colours (shade for shade); buttons get the page buttons' exact colours
  const w = src.naturalWidth || src.width,
    h = src.naturalHeight || src.height,
    c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(src, 0, 0);
  const acc = pgRgb(P.accent),
    lo = icon ? mixRgb(acc, [0, 0, 0], 0.5) : pgRgb(P.pBtnBot),
    hi = icon ? mixRgb(acc, [255, 255, 255], 0.2) : pgRgb(P.pBtnTop);
  const im = x.getImageData(0, 0, w, h),
    d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) {
      continue;
    }
    const o = [d[i], d[i + 1], d[i + 2]],
      [hu, sa] = hueSat(o);
    if (hu < 195 || hu > 265 || sa < 0.2) {
      continue;
    }
    const t = (lumRgb(o) - 0.12) / 0.39,
      col =
        t > 1
          ? mixRgb(hi, [255, 255, 255], Math.min(1, (t - 1) * 0.8))
          : t < 0
            ? mixRgb(lo, [0, 0, 0], Math.min(1, -t))
            : mixRgb(lo, hi, t),
      k = Math.min(1, (sa - 0.2) / 0.25);
    d[i] = o[0] + (col[0] - o[0]) * k;
    d[i + 1] = o[1] + (col[1] - o[1]) * k;
    d[i + 2] = o[2] + (col[2] - o[2]) * k;
  }
  x.putImageData(im, 0, 0);
  return c;
}
export function tabMap(src, P, sel) {
  // the header's big tabs: their white card in the theme's colour (the open page's tab stronger, as if pressed)
  const w = src.naturalWidth || src.width,
    h = src.naturalHeight || src.height,
    c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(src, 0, 0);
  const tint = mixRgb([255, 255, 255], pgRgb(P.accent), sel ? 0.55 : 0.22),
    im = x.getImageData(0, 0, w, h),
    d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) {
      continue;
    }
    const wc = Math.min(d[i], d[i + 1], d[i + 2]);
    if (wc < 110) {
      continue;
    } // (only the white in each pixel turns to the tint: the card and the light edges round the picture match, the picture keeps its colours)
    const k = Math.min(1, (wc - 110) / 90);
    for (let j = 0; j < 3; j++) {
      d[i + j] -= k * wc * (1 - tint[j] / 255);
    }
  }
  x.putImageData(im, 0, 0);
  return c;
}
export const IMG_MAP = {}; // recoloured pictures, kept in this browser so they're there the moment a page opens (only the current theme's are kept)
export function pageButtons(game, P) {
  // the game's own buttons (and lobby game pictures) in the theme's colours
  const want = P ? P.accent + P.pBtnTop + P.pBtnBot : "",
    walk = (o, d) => {
      if (!o || d > 10) {
        return;
      }
      const plus = o.key === "addtank" && o.texture && o.texture.baseTexture,
        bt = plus ? o.texture.baseTexture : o.baseTexture,
        btn = !plus && bt && /\/buttons\//.test(String(o.frameName)) && typeof o.renderTexture === "function";
      if (btn || plus) {
        // the buttons (the same colours as the page's buttons) and the add-tank plus
        if (bt.__ttclPage !== want) {
          const src = bt.__ttclBtnOrig || bt.source;
          if (src && src.width) {
            bt.__ttclBtnOrig = src;
            try {
              bt.source = want ? blueMap(src, P, plus) : src;
            } catch {
              bt.source = src;
            }
            bt.__ttclPage = want;
            if (bt.dirty) {
              bt.dirty();
            }
          }
        }
        if (btn && o.__ttclPage !== want) {
          o.__ttclPage = want;
          try {
            o.renderTexture();
          } catch {}
        }
      } else if ((o.key === "gameicon" || o.key === "gameiconplaceholder") && typeof o.tint === "number") {
        const t = P ? P.icon : 0xffffff;
        if (o.tint !== t) {
          o.tint = t;
        }
      } else if (
        typeof o.text === "string" &&
        typeof o.fill === "string" &&
        window.Phaser &&
        Phaser.Text &&
        o instanceof Phaser.Text
      ) {
        // dark writing on a dark page theme turns light, so it stays readable
        if (o.__ttclFill == null) {
          o.__ttclFill = o.fill;
        }
        const orig = o.__ttclFill,
          c = /^#[0-9a-f]{6}$/i.test(orig) ? pgRgb(orig) : null;
        const wantColour = P && P.dark && c && lumRgb(c) < 0.45 ? "#ececec" : orig;
        if (o.fill !== wantColour) {
          o.fill = wantColour;
        }
        if (typeof o.stroke === "string") {
          if (o.__ttclStroke == null) {
            o.__ttclStroke = o.stroke;
          }
          const so = o.__ttclStroke,
            sc = /^#[0-9a-f]{6}$/i.test(so) ? pgRgb(so) : null; // (a light outline round it goes dark too, e.g. "Telegraphing code...")
          const ws = wantColour !== orig && sc && lumRgb(sc) > 0.6 ? "#1a1a1a" : so;
          if (o.stroke !== ws) {
            o.stroke = ws;
          }
        }
      }
      const ch = o.children;
      if (ch) {
        for (let i = 0; i < ch.length; i++) {
          walk(ch[i], d + 1);
        }
      }
    };
  try {
    walk(game.world, 0);
  } catch {}
}
