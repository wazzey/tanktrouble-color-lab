import { flatHex } from "./registries.js";
import { glFresh } from "./maze-patterns.js";

// ---------- Map themes and bullet skins ----------
// The maze's floors, walls, crates and bullets are pictures on the game's picture sheet ("game" atlas), one set per
// maze theme (Standard, Halloween, Christmas). A map theme repaints those pictures on a copy of the sheet and points the
// sheet at it, so everything in the round picks it up at once (only on your screen - the walls, crates and shots are
// the game's own). Bullet skins give each bullet its tank's turret paint, outlined so it shows on any floor.
export const MAP_THEMES = {}; // key -> { name, floor(g, i), space(g), wall(g), crate(g, glyph, n), bullet: [fill, outline], decor: [(g) => ...] }
export const mapSheets = {}; // base uid|theme -> canvas
export const mapNoise = (x, y, s) => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453;
  return v - Math.floor(v);
};
export function mapThemeList() {
  return Object.keys(MAP_THEMES);
}
export function gameSeasonNow() {
  // TankTrouble's own seasonal mazes: Halloween 1 Oct - 1 Nov (noon UTC), Christmas all of December
  const d = new Date(),
    m = d.getUTCMonth();
  if (m === 9 || (m === 10 && d.getUTCDate() === 1 && d.getUTCHours() < 12)) {
    return "halloween";
  }
  return m === 11 ? "christmas" : null;
}
export const mapBag = { key: "", left: [], last: null, recent: [] };
export function mapFrame(game, name) {
  try {
    const f = game.cache.getFrameData("game").getFrameByName(name);
    return f ? { x: f.x, y: f.y, w: f.width, h: f.height } : null;
  } catch {
    return null;
  }
}
export function crateGlyph(src, fr, n) {
  // the weapon symbol from the game's own crate (dark marks; the shield's light ring)
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, 64, 64);
  const d = g.getImageData(0, 0, 64, 64),
    p = d.data;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4,
        l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2],
        inside = x >= 13 && x <= 51 && y >= 13 && y <= 51;
      const on = inside && (n === 6 ? l > 185 : l < 110);
      p[i] = p[i + 1] = p[i + 2] = 0;
      p[i + 3] = on ? 255 : 0;
    }
  }
  g.putImageData(d, 0, 0);
  return c;
}
function inkGlyph(glyph, colour) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.drawImage(glyph, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = colour;
  g.fillRect(0, 0, 64, 64);
  return c;
}
export function drawGlyph(g, glyph, ink, halo) {
  // the symbol with a soft halo so it reads on any crate face
  if (halo) {
    g.save();
    g.shadowColor = halo;
    g.shadowBlur = 4;
    g.drawImage(inkGlyph(glyph, halo), 0, 0);
    g.restore();
  }
  g.drawImage(inkGlyph(glyph, ink), 0, 0);
}
// every map's shots in a colour of their own (the same in its light and dark look), none shared with another map
export const BULLET_COLOR = {
  deepsea: "#00d5e0",
  arcade: "#ff2bd6",
  sweets: "#ff8fc7",
  racing: "#fff200",
  sakura: "#c23b6e",
  safari: "#8d6e3f",
  steampunk: "#b87333",
  wildwest: "#8b2e16",
  tropical: "#ff6f3c",
  mech: "#2f7bff",
  graffiti: "#b6ff00",
  agent: "#9aa0ad",
  ninja: "#5b3fc4",
};
export const SHIELD_COLOR = {
  deepsea: "#00e0d0",
  arcade: "#ff2bd6",
  sweets: "#ff8fc7",
  racing: "#ffd400",
  sakura: "#ff9ec4",
  safari: "#e0a040",
  steampunk: "#d49a3a",
  kingdom: "#f2c94c",
  wildwest: "#e07a3a",
  tropical: "#ff6f3c",
  mech: "#ffc300",
  casino: "#e8c547",
  graffiti: "#c6ff1a",
  agent: "#d8dce6",
  ninja: "#c8242c",
  arctic: "#9fe0ff",
  volcano: "#ff4a00",
  jungle: "#5fd068",
  temple: "#3fd0c0",
  space: "#b388ff",
  haunted: "#9effd2",
  autumn: "#ff9a3a",
  pirate: "#e0b84a",
  lab: "#39ff88",
  swamp: "#a8c84a",
  garden: "#ff7fb0",
  crystal: "#e066ff",
}; // the shield's colour on each map
export const BULLET_DRAW = {
  // more shots of their own (drawn across the bullet's full size; the shape and size stay the game's)
  pearl: (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.35, h * 0.32, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
    gr.addColorStop(0, "#ffffff");
    gr.addColorStop(0.45, "#f3e9f7");
    gr.addColorStop(0.75, "#d6e6f5");
    gr.addColorStop(1, "#a9a2c4");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  },
  split: (g, w, h) => {
    g.fillStyle = "#00f0ff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ff2bd6";
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, 0);
    g.lineTo(0, h);
    g.closePath();
    g.fill();
  },
  candy: (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.save();
    g.translate(w / 2, h / 2);
    g.fillStyle = "#ff7eb6";
    for (let k = 0; k < 4; k++) {
      g.rotate(Math.PI / 2);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(w * 0.5, -h * 0.1, w * 0.4, h * 0.45);
      g.lineTo(w * 0.15, h * 0.5);
      g.quadraticCurveTo(w * 0.25, 0, 0, 0);
      g.fill();
    }
    g.restore();
  },
  iron: (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.35, h * 0.3, 0, w / 2, h / 2, Math.max(w, h) * 0.62);
    gr.addColorStop(0, "#b8bcc4");
    gr.addColorStop(0.4, "#5a5f68");
    gr.addColorStop(1, "#1c1e22");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  },
  egg: (g, w, h) => {
    g.fillStyle = "#f6e7c8";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#9a6a3a";
    for (const [x, y] of [
      [0.3, 0.35],
      [0.65, 0.3],
      [0.55, 0.65],
      [0.25, 0.7],
      [0.75, 0.6],
    ]) {
      g.fillRect(x * w, y * h, Math.max(1, w * 0.1), Math.max(1, h * 0.1));
    }
  },
  moon: (g, w, h) => {
    g.fillStyle = "#c9c6bd";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(80,78,72,.55)";
    for (const [x, y, r] of [
      [0.35, 0.4, 0.14],
      [0.65, 0.62, 0.11],
      [0.62, 0.3, 0.07],
    ]) {
      g.beginPath();
      g.arc(x * w, y * h, r * w, 0, 7);
      g.fill();
    }
  },
  beach: (g, w, h) => {
    const C = ["#ff3b30", "#ffffff", "#1e88ff", "#ffffff", "#ffd400", "#ffffff"];
    g.save();
    g.translate(w / 2, h / 2);
    for (let k = 0; k < 6; k++) {
      g.fillStyle = C[k];
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, w, (k * Math.PI) / 3, ((k + 1) * Math.PI) / 3);
      g.closePath();
      g.fill();
    }
    g.restore();
  },
  mirror: (g, w, h) => {
    g.fillStyle = "#9aa4b4";
    g.fillRect(0, 0, w, h);
    const n = 4;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        g.fillStyle = (x + y) % 2 ? "#e8eef8" : "#c9d2e0";
        g.fillRect((x * w) / n + 0.3, (y * h) / n + 0.3, w / n - 0.6, h / n - 0.6);
      }
    }
    g.fillStyle = "rgba(255,120,220,.55)";
    g.fillRect(w * 0.55, h * 0.25, w / n, h / n);
  },
  bee: (g, w, h) => {
    g.fillStyle = "#ffc61a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1a1406";
    for (const x of [0.28, 0.6]) {
      g.fillRect(x * w, 0, w * 0.15, h);
    }
  },
  circus: (g, w, h) => {
    g.fillStyle = "#e8202a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    for (const x of [0.15, 0.5, 0.85]) {
      g.fillRect(x * w - w * 0.09, 0, w * 0.18, h);
    }
    g.fillStyle = "#ffd400";
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5,
        r = k % 2 ? w * 0.13 : w * 0.3;
      g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  },
  football: (g, w, h) => {
    g.fillStyle = "#f8f8f8";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#141414";
    const pent = (cx, cy, r) => {
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
    };
    pent(w / 2, h / 2, w * 0.2);
    for (const a of [0, 1, 2, 3, 4]) {
      const t = -Math.PI / 2 + (a * 2 * Math.PI) / 5;
      pent(w / 2 + Math.cos(t) * w * 0.5, h / 2 + Math.sin(t) * h * 0.5, w * 0.14);
    }
  },
  galaxy: (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.5, h * 0.5, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
    gr.addColorStop(0, "#ffd6ff");
    gr.addColorStop(0.3, "#b04aff");
    gr.addColorStop(0.7, "#2a3aff");
    gr.addColorStop(1, "#0a0a3a");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    for (const [x, y] of [
      [0.25, 0.3],
      [0.7, 0.25],
      [0.3, 0.72],
      [0.72, 0.7],
    ]) {
      g.fillRect(x * w, y * h, Math.max(0.8, w * 0.07), Math.max(0.8, w * 0.07));
    }
  },
};
export function bulletOnFloor(hex, floor, thin) {
  // keep the map's bullet colour, but darker on a light floor / lighter on a dark one, so it always stands out
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex) || !floor) {
    return hex;
  }
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
    lum = (v) => (0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2]) / 255,
    fl = lum(floor),
    bl = lum(c);
  const dist = Math.hypot(c[0] - floor[0], c[1] - floor[1], c[2] - floor[2]);
  if (Math.abs(bl - fl) >= (thin ? 0.45 : 0.32) && dist > (thin ? 170 : 120)) {
    return hex;
  } // (thin = aim lines and lasers: a thin line needs more contrast than a bullet)
  const target = thin ? (fl > 0.5 ? 0.07 : 0.94) : fl > 0.5 ? Math.max(0.08, fl - 0.42) : Math.min(0.95, fl + 0.45),
    k = bl > 0.01 ? target / bl : 1;
  const out =
    fl > 0.5
      ? c.map((v) => Math.round(v * Math.min(1, k)))
      : c.map((v) => Math.round(v + (255 - v) * Math.max(0, Math.min(1, (target - bl) / Math.max(0.01, 1 - bl)))));
  return "#" + out.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}
// A colour too close to the floor for a thin line or a mine becomes a clearly different one: its hue turned about 50 degrees and
// made light on a dark floor / deep on a light one (a black or white turret, with no hue to turn, gets gold on a dark floor or deep blue on a light one)
export function altOnFloor(hex, floor) {
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex) || !floor) {
    return hex;
  }
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
    lum = (v) => (0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2]) / 255,
    fl = lum(floor),
    bl = lum(c);
  if (Math.abs(bl - fl) >= 0.45 && Math.hypot(c[0] - floor[0], c[1] - floor[1], c[2] - floor[2]) > 170) {
    return hex;
  }
  const r = c[0] / 255,
    g = c[1] / 255,
    b = c[2] / 255,
    mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn,
    sat = mx ? d / mx : 0;
  let h = 0;
  if (d > 0.001) {
    h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : mx === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  }
  const mid = fl > 0.3 && fl < 0.7; // (a mid-tone floor: the new colour goes further from it)
  if (sat < 0.15 || d < 0.12) {
    return fl > 0.5 ? (mid ? "#0f2a66" : "#1b4fa8") : mid ? "#fff07a" : "#ffd45a";
  } // (no real hue: near-black, near-white or grey)
  const S = 0.9,
    L = fl > 0.5 ? (mid ? 0.16 : 0.24) : mid ? 0.82 : 0.72,
    mk = (H) => {
      const k = (n) => (n + H / 30) % 12,
        a = S * Math.min(L, 1 - L),
        f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
      return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
    };
  let best = null,
    bd = -1;
  for (const dh of [50, -50, 180]) {
    const c2 = mk((h + dh + 360) % 360),
      dd = Math.hypot(c2[0] - floor[0], c2[1] - floor[1], c2[2] - floor[2]);
    if (dd > bd + 25) {
      bd = dd;
      best = c2;
    }
  } // (the turn that ends furthest from the floor; a slight lead keeps the nearest hue)
  return "#" + best.map((v) => v.toString(16).padStart(2, "0")).join("");
}
// An edge in the opposite brightness to the floor, drawn just inside a bullet's or mine's own shape (so its size never changes), stronger
// when its colour is close to the floor's: any colour a player picks stays visible on every map
export function rimFor(hex, floor) {
  try {
    if (!floor) {
      return null;
    }
    const n = parseInt(String(flatHex(hex) || "0x888888").slice(2), 16),
      lum = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255,
      fl = (0.3 * floor[0] + 0.59 * floor[1] + 0.11 * floor[2]) / 255;
    const dist = Math.hypot((n >> 16) - floor[0], ((n >> 8) & 255) - floor[1], (n & 255) - floor[2]),
      close = Math.abs(lum - fl) < 0.35 || dist < 130 || (fl > 0.3 && fl < 0.7);
    /* (a mid-tone floor: always the strong edge) */ return [fl > 0.5 ? "#0b0d12" : "#ffffff", close ? 0.95 : 0.5];
  } catch {
    return null;
  }
}
export function addRim(g, w, h, drawMask, color, alpha) {
  const r = document.createElement("canvas");
  r.width = w;
  r.height = h;
  const rg = r.getContext("2d");
  rg.fillStyle = color;
  rg.fillRect(0, 0, w, h);
  rg.globalCompositeOperation = "destination-in";
  drawMask(rg, 0, 0, w, h);
  rg.globalCompositeOperation = "destination-out";
  drawMask(rg, w * 0.17, h * 0.17, w * 0.66, h * 0.66);
  g.save();
  g.globalAlpha = alpha;
  g.drawImage(r, 0, 0);
  g.restore();
}
export const BULLET_STYLE = {
  casino: "chip",
  kingdom: "gold",
  graffiti: "spray:0",
  ruins: "pearl",
  neon: "split",
  candy: "candy",
  dungeon: "iron",
  farm: "egg",
  moon: "moon",
  toybox: "beach",
  disco: "mirror",
  beehive: "bee",
  circus: "circus",
  stadium: "football",
  galaxy: "galaxy",
}; // maps whose shots are something of their own (still exactly the game's bullet size)
export function bulletArt(g, mask, w, h, fill, outline, style, floor, rim) {
  // the bullet's own shape at its full size, filled (no outline ring, so it never looks smaller than the game's), softly shaded, with a glint
  const f = document.createElement("canvas");
  f.width = w;
  f.height = h;
  const fg = f.getContext("2d");
  if (style === "gold") {
    const gr = fg.createRadialGradient(w * 0.38, h * 0.35, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
    gr.addColorStop(0, "#fff7c2");
    gr.addColorStop(0.35, "#f2c94c");
    gr.addColorStop(0.75, "#c8961e");
    gr.addColorStop(1, "#7a5508");
    fg.fillStyle = gr;
    fg.fillRect(0, 0, w, h);
  } else if (style && style.startsWith("spray:")) {
    // sprayed: two or three neon colours misted together, a few speckles (each 'spray:n' its own mix)
    const n = +style.slice(6) || 0,
      NEON = ["#ff2d95", "#22e0ff", "#c6ff1a", "#9b4dff", "#ffd400", "#ff7a00"],
      pick = (j) => NEON[(n * 5 + j * 2 + (n >> 1)) % NEON.length];
    fg.fillStyle = pick(0);
    fg.fillRect(0, 0, w, h);
    for (let j = 1; j <= 1 + (n % 2); j++) {
      const x = w * (0.2 + mapNoise(n, j, 7) * 0.6),
        y = h * (0.2 + mapNoise(j, n, 8) * 0.6),
        r = Math.max(w, h) * (0.35 + mapNoise(n, j, 9) * 0.25);
      const gr = fg.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, pick(j));
      gr.addColorStop(0.6, pick(j));
      gr.addColorStop(1, "rgba(0,0,0,0)");
      fg.fillStyle = gr;
      fg.fillRect(0, 0, w, h);
    }
    fg.fillStyle = "rgba(255,255,255,.7)";
    for (let j = 0; j < 4; j++) {
      fg.fillRect(w * mapNoise(n, j, 11), h * mapNoise(j, n, 12), Math.max(1, w * 0.08), Math.max(1, h * 0.08));
    }
  } else if (BULLET_DRAW[style]) {
    BULLET_DRAW[style](fg, w, h);
  } else if (style === "chip") {
    // a casino chip: red face, white edge spots, a thin inner ring
    const cx = w / 2,
      cy = h / 2,
      r = Math.min(w, h) / 2;
    fg.fillStyle = "#c8102e";
    fg.fillRect(0, 0, w, h);
    fg.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      fg.save();
      fg.translate(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82);
      fg.rotate(a);
      fg.fillRect(-r * 0.1, -r * 0.16, r * 0.2, r * 0.32);
      fg.restore();
    }
    fg.strokeStyle = "rgba(255,255,255,.6)";
    fg.lineWidth = Math.max(0.8, r * 0.08);
    fg.beginPath();
    fg.arc(cx, cy, r * 0.5, 0, 7);
    fg.stroke();
  } else if (typeof fill === "string") {
    fg.fillStyle = fill;
    fg.fillRect(0, 0, w, h);
  } else {
    fg.drawImage(fill, 0, 0, w, h);
  }
  const sh = fg.createRadialGradient(w * 0.42, h * 0.4, 0, w / 2, h / 2, Math.max(w, h) * 0.55);
  sh.addColorStop(0, "rgba(255,255,255,.18)");
  sh.addColorStop(0.6, "rgba(0,0,0,0)");
  sh.addColorStop(1, "rgba(0,0,0,.28)");
  fg.fillStyle = sh;
  fg.fillRect(0, 0, w, h);
  if (style && floor) {
    try {
      // a patterned shot keeps its pattern, but is evenly darkened (light floor) or lightened (dark floor) if most of it blends in
      const fl = (0.3 * floor[0] + 0.59 * floor[1] + 0.11 * floor[2]) / 255,
        d = fg.getImageData(0, 0, w, h).data;
      let L = 0,
        far = 0,
        n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
        L += l;
        if (Math.abs(l - fl) > 0.3) {
          far++;
        }
        n++;
      }
      L /= n;
      if (far / n < 0.5) {
        if (fl > 0.45) {
          const k = Math.max(0.18, Math.min(1, (fl - 0.5) / Math.max(0.05, L)));
          fg.globalCompositeOperation = "multiply";
          const v = Math.round(255 * k);
          fg.fillStyle = `rgb(${v},${v},${v})`;
        } else {
          const k = Math.max(0, Math.min(0.75, (fl + 0.4 - L) / Math.max(0.05, 1 - L)));
          fg.globalCompositeOperation = "screen";
          const v = Math.round(255 * k);
          fg.fillStyle = `rgb(${v},${v},${v})`;
        }
        fg.fillRect(0, 0, w, h);
        fg.globalCompositeOperation = "source-over";
      }
    } catch {}
  }
  fg.globalCompositeOperation = "destination-in";
  fg.drawImage(mask, 0, 0, w, h);
  g.drawImage(f, 0, 0);
  if (rim) {
    try {
      addRim(g, w, h, (c2, x, y, ww, hh) => c2.drawImage(mask, x, y, ww, hh), rim[0], rim[1]);
    } catch {}
  }
  g.fillStyle = "rgba(255,255,255,.55)";
  g.beginPath();
  g.arc(w * 0.4, h * 0.38, Math.max(1, w * 0.09), 0, 7);
  g.fill();
}

// The game lays the same wall picture down turned either way (and flipped), so a wall lit on one side showed its
// highlight on the top of some walls and the bottom of others. Each wall is made mirror-symmetric (across and along),
// so every wall and corner looks the same whichever way the game turns it.
export function wallSym(T, src, orig) {
  const W = 216,
    H = 16,
    a = document.createElement("canvas");
  a.width = W;
  a.height = H;
  T.wall(a.getContext("2d"), W, H, src, orig);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.drawImage(a, 0, 0, W / 2, H / 2, 0, 0, W / 2, H / 2); // top-left quarter, as drawn
  g.save();
  g.translate(W, 0);
  g.scale(-1, 1);
  g.drawImage(a, 0, 0, W / 2, H / 2, 0, 0, W / 2, H / 2);
  g.restore(); // mirrored along
  g.save();
  g.translate(0, H);
  g.scale(1, -1);
  g.drawImage(c, 0, 0, W, H / 2, 0, 0, W, H / 2);
  g.restore(); // and across
  return c;
}
// Bullet skins: each bullet takes its owner's turret paint (or the colour), with an outline that stands out
export const bulletTex = {},
  bulletReal = {},
  bulletAsked = new Set();
// Mines in their owner's turret pattern (when that tank shows its turret pattern in the maze), same size and shape
export const mineTex = {};
// Homing missiles in their owner's turret pattern (the game tints them the turret colour, which is plain white for a patterned turret)
export const missileTex = {};
export function tintNum(t) {
  if (typeof t === "number") {
    return t;
  }
  if (typeof t === "string" && /^(0x|#)?[0-9a-f]{6}$/i.test(t.trim())) {
    return parseInt(t.trim().replace(/^(0x|#)/i, ""), 16);
  }
  return null;
}
// A mine whose colour is still close to the floor (a black mine on a dark map, a white one on a light map) gets an edge drawn on top of it
// by a second picture of the mine's own shape, so it's seen whatever its owner's turret colour
const mineRimTex = {};
export function mineRim(m, rim) {
  if (!rim || rim[1] < 0.9) {
    if (m.__ttclRim) {
      m.__ttclRim.visible = false;
    }
    return;
  }
  const game = m.game,
    fr = game && mapFrame(game, "mine");
  if (!fr) {
    return;
  }
  const key = rim[0] + rim[1];
  let tex = mineRimTex[key];
  if (!tex) {
    let base;
    try {
      base = game.cache.getBaseTexture("game");
    } catch {}
    const img = base && (base.__ttclMapOrig || base.source);
    if (!img) {
      return;
    }
    const c = document.createElement("canvas");
    c.width = fr.w;
    c.height = fr.h;
    const g = c.getContext("2d");
    g.fillStyle = rim[0];
    g.fillRect(0, 0, fr.w, fr.h);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(img, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    g.globalCompositeOperation = "destination-out";
    g.drawImage(img, fr.x, fr.y, fr.w, fr.h, fr.w * 0.17, fr.h * 0.17, fr.w * 0.66, fr.h * 0.66);
    tex = mineRimTex[key] = PIXI.Texture.fromCanvas(c);
  }
  glFresh(game, tex.baseTexture);
  let sp = m.__ttclRim;
  if (!sp) {
    sp = new PIXI.Sprite(tex);
    m.addChild(sp);
    m.__ttclRim = sp;
  } else if (sp.texture !== tex) {
    PIXI.Sprite.prototype.setTexture.call(sp, tex);
  }
  sp.anchor.set(m.anchor ? m.anchor.x : 0.5, m.anchor ? m.anchor.y : 0.5);
  sp.position.set(0, 0);
  sp.tint = 0xffffff;
  sp.alpha = rim[1];
  sp.visible = true;
}
// A floor that tiles seamlessly whichever way round the game lays it: built from cos(x) + cos(y) terms (unchanged by a quarter turn)
export function mapFloorField(g, w, h, base, fn) {
  const d = g.createImageData(w, h),
    p = d.data,
    [r0, g0, b0] = base;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [dr, dg, db] = fn((x / w) * Math.PI * 2, (y / h) * Math.PI * 2, x, y),
        i = (y * w + x) * 4;
      p[i] = Math.max(0, Math.min(255, r0 + dr));
      p[i + 1] = Math.max(0, Math.min(255, g0 + dg));
      p[i + 2] = Math.max(0, Math.min(255, b0 + db));
      p[i + 3] = 255;
    }
  }
  g.putImageData(d, 0, 0);
}
function pixelArt(g, rows, x0, y0, px, cols) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = cols[row[i]];
      if (c) {
        g.fillStyle = c;
        g.fillRect(x0 + i * px, y0 + j * px, px, px);
      }
    }
  });
}
MAP_THEMES.standard = {
  name: "Standard",
  keepStandard: true,
  floor: (g, i, w, h, src, orig) => {
    const f = orig("floor0-" + (i % 2));
    if (f) {
      g.drawImage(src, f.x, f.y, f.w, f.h, 0, 0, w, h);
    }
  },
  wall: (g, w, h, src, orig) => {
    const f = orig("wall0-0");
    if (f) {
      g.drawImage(src, f.x, f.y, f.w, f.h, 0, 0, w, h);
    }
  },
  crate: (g, glyph, k, src, orig) => {
    const f = orig("crate0-" + k);
    if (f) {
      g.drawImage(src, f.x, f.y, f.w, f.h, 0, 0, 64, 64);
    }
  },
};
MAP_THEMES.deepsea = {
  name: "Deep Sea",
  bullet: ["#fff3a8", "#0b1d3a"],
  decorRate: 0.2,
  decorAlpha: 0.9,
  floor: (g, i, w, h) =>
    mapFloorField(g, w, h, [44 + (i % 3) * 2, 122, 134], (a, b, x, y) => {
      // sea floor with rippling light
      const s =
          Math.cos(a * 3) +
          Math.cos(b * 3) +
          0.7 * (Math.cos((a + b) * 2) + Math.cos((a - b) * 2)) +
          0.5 * (Math.cos(a * 5 + Math.cos(b * 2)) + Math.cos(b * 5 + Math.cos(a * 2))),
        l = Math.pow(Math.max(0, 1 - Math.abs(s) * 2.2), 2) * 34,
        wave = (Math.cos(a) + Math.cos(b)) * 4,
        n = (mapNoise(x, y, 1) - 0.5) * 8;
      return [l * 0.55 + n + wave, l * 0.9 + n + wave, l * 0.85 + n + wave];
    }),
  space: (g, w, h) =>
    mapFloorField(g, w, h, [24, 76, 88], (a, b, x, y) => {
      const n = (mapNoise(x, y, 2) - 0.5) * 6;
      return [n, n, n];
    }),
  wall: (g, w, h) => {
    // sea rock with bits of coral
    g.fillStyle = "#0b1d22";
    g.fillRect(0, 0, w, h); // square ends, the exact shape bullets bounce off (as the game's own walls)
    g.fillStyle = "#2a5560";
    g.fillRect(1, 1, w - 2, h - 2);
    g.fillStyle = "#4f8b93";
    g.fillRect(1, 2, w - 2, 3);
    for (let k = 0; k < 9; k++) {
      const x = 12 + k * 24 + mapNoise(k, 1, 3) * 8,
        c = ["#ff7f6a", "#f1d08a", "#ff9ec4"][k % 3];
      g.fillStyle = c;
      g.beginPath();
      g.arc(x, h - 5, 2 + mapNoise(k, 2, 3) * 1.5, 0, 7);
      g.fill();
    }
  },
  crate: (g, glyph, k) => {
    // a treasure chest with the weapon on a sand-coloured plate
    g.fillStyle = "#3b2310";
    g.beginPath();
    g.roundRect(3, 5, 58, 55, 7);
    g.fill();
    const wood = g.createLinearGradient(0, 5, 0, 60);
    wood.addColorStop(0, "#b07a3c");
    wood.addColorStop(1, "#7a4f22");
    g.fillStyle = wood;
    g.beginPath();
    g.roundRect(5, 7, 54, 51, 6);
    g.fill();
    g.strokeStyle = "rgba(59,35,16,.6)";
    g.lineWidth = 1.5;
    for (const y of [20, 33, 46]) {
      g.beginPath();
      g.moveTo(6, y);
      g.lineTo(58, y);
      g.stroke();
    }
    g.fillStyle = "#e8c25a";
    g.fillRect(9, 7, 5, 51);
    g.fillRect(50, 7, 5, 51);
    g.fillStyle = "#a8842a";
    g.fillRect(9, 7, 1.5, 51);
    g.fillRect(50, 7, 1.5, 51);
    g.fillStyle = k === 6 ? "#3d8fe0" : "#f1d08a";
    g.beginPath();
    g.roundRect(15, 15, 34, 34, 5);
    g.fill();
    g.strokeStyle = "#3b2310";
    g.lineWidth = 2;
    g.stroke();
    if (glyph) {
      drawGlyph(g, glyph, k === 6 ? "#ffffff" : "#3b2310", null);
    }
  },
  decor: [
    (g, s) => {
      g.translate(s / 2, s / 2);
      g.fillStyle = "#f28c28";
      g.strokeStyle = "#a8531a";
      g.lineWidth = 2;
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? 9 : 24,
          t = (k * Math.PI) / 5;
        g.lineTo(Math.sin(t) * r, -Math.cos(t) * r);
      }
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = "#ffd0a0";
      for (let k = 0; k < 5; k++) {
        const t = (k * Math.PI * 2) / 5;
        g.beginPath();
        g.arc(Math.sin(t) * 12, -Math.cos(t) * 12, 1.6, 0, 7);
        g.fill();
      }
    }, // starfish
    (g, s) => {
      g.translate(s / 2, s / 2 + 8);
      g.fillStyle = "#ffb3c7";
      g.strokeStyle = "#c96a86";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 10);
      for (let k = 0; k <= 6; k++) {
        const t = Math.PI * (0.15 + (k * 0.7) / 6);
        g.lineTo(-Math.cos(t) * 24, -Math.sin(t) * 24 + 4);
      }
      g.closePath();
      g.fill();
      g.stroke();
      for (let k = 1; k < 6; k++) {
        const t = Math.PI * (0.15 + (k * 0.7) / 6);
        g.beginPath();
        g.moveTo(0, 10);
        g.lineTo(-Math.cos(t) * 22, -Math.sin(t) * 22 + 4);
        g.stroke();
      }
    }, // shell
    (g, s) => {
      g.translate(s / 2, s / 2 + 22);
      g.strokeStyle = "#2f8a4a";
      g.lineCap = "round";
      for (let k = 0; k < 6; k++) {
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo((k - 2.5) * 5, 0);
        g.quadraticCurveTo((k - 2.5) * 9, -22, (k - 2.5) * 6 + (k % 2 ? 8 : -8), -40 + (k % 3) * 6);
        g.stroke();
      }
    }, // sea grass
    (g, s) => {
      g.translate(s / 2, s / 2);
      for (const [x, y, r, c] of [
        [-12, 4, 9, "#8fa3a8"],
        [6, -6, 7, "#a9b8bb"],
        [10, 10, 5, "#7d9196"],
        [-4, -14, 4, "#b8c4c6"],
      ]) {
        g.fillStyle = c;
        g.beginPath();
        g.ellipse(x, y, r, r * 0.75, 0.4, 0, 7);
        g.fill();
        g.strokeStyle = "rgba(0,0,0,.25)";
        g.lineWidth = 1;
        g.stroke();
      }
    }, // pebbles
  ],
};
MAP_THEMES.arcade = {
  name: "Arcade",
  bullet: ["#fff200", "#14102a"],
  decorRate: 0.16,
  decorAlpha: 0.55,
  floor: (g, i, w, h) => {
    g.fillStyle = "#1e1645";
    g.fillRect(0, 0, w, h);
    const sq = w / 4;
    g.fillStyle = "rgba(130,90,255,.32)";
    for (let k = 1; k < 4; k++) {
      g.fillRect(k * sq - 1, 0, 2, h);
      g.fillRect(0, k * sq - 1, w, 2);
    }
    g.fillRect(0, 0, 1, h);
    g.fillRect(w - 1, 0, 1, h);
    g.fillRect(0, 0, w, 1);
    g.fillRect(0, h - 1, w, 1);
  }, // neon grid (lines on the edges halved, so tiles join up)
  space: (g, w, h) => {
    g.fillStyle = "#120d2c";
    g.fillRect(0, 0, w, h);
  },
  wall: (g, w, h) => {
    g.fillStyle = "#00a8c8";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#00e5ff";
    g.fillRect(1.5, 1.5, w - 3, h - 3);
    g.fillStyle = "#d8fbff";
    g.fillRect(1.5, h / 2 - 2.5, w - 3, 5);
  }, // a neon bar, square ends like the game's walls
  crate: (g, glyph, k) => {
    const neon = k === 6 ? "#00e5ff" : "#ff2bd6";
    g.fillStyle = "#0a0718";
    g.beginPath();
    g.roundRect(3, 3, 58, 58, 8);
    g.fill();
    g.fillStyle = "#14102a";
    g.beginPath();
    g.roundRect(5, 5, 54, 54, 7);
    g.fill();
    g.strokeStyle = neon;
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(7, 7, 50, 50, 6);
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,.35)";
    g.lineWidth = 1;
    g.beginPath();
    g.roundRect(11, 11, 42, 42, 4);
    g.stroke();
    if (glyph) {
      drawGlyph(g, glyph, k === 6 ? "#00e5ff" : "#fff200", neon);
    }
  },
  decor: [
    (g, s) => pixelArt(g, ["..y..", ".yyy.", "yyyyy", ".yyy.", "..y.."], s / 2 - 15, s / 2 - 15, 6, { y: "#fff200" }), // pixel star
    (g, s) =>
      pixelArt(g, ["...c", "..cc", ".cc.", "cccc", ".cc.", "cc..", "c..."], s / 2 - 12, s / 2 - 21, 6, {
        c: "#00e5ff",
      }), // pixel bolt
    (g, s) =>
      pixelArt(g, [".mmmm.", "mmmmmm", "mwmmwm", "mmmmmm", "mmmmmm", "m.mm.m"], s / 2 - 18, s / 2 - 18, 6, {
        m: "#ff2bd6",
        w: "#ffffff",
      }), // a pixel blob
    (g, s) => pixelArt(g, ["..g..", ".ggg.", "ggggg", "..g..", "..g.."], s / 2 - 15, s / 2 - 15, 6, { g: "#2dff6e" }), // pixel arrow
  ],
};
