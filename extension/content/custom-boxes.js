import { EXT_PAINT_ART, EXT_UPRIGHT } from "./registries.js";
import { breathe } from "./garage-folders.js";
import { MAZE_TILE } from "./maze-patterns.js";
import { hexChannels, sampleRamp } from "./laika.js";
import { sakuraFlower, sakuraPetal } from "./sakura-shapes.js";

// --- custom boxes ---
// "Spectral": the Halloween box's accessories, recoloured (oranges → toxic green, reds → hot magenta,
// greys/blacks/whites → violet-tinted), plus a set of matching neon paints.
export const HEAVEN_BOX_PIC = "ttcl-art:d858c36c2927.webp"; // closed | open, built on the Standard box
// Items taken out of the boxes (still drawn for anyone already wearing one): the Arcade Joystick, the older Spiked Mine, the Mech Jetpack and Rockets
export const UNUSED_ITEMS = new Set(["ac-joystick", "spike-mine", "mc-jet", "mc-rockets"]);
export const CUSTOM_ART = {},
  CUSTOM_ICONS = {},
  customReq = {};
export const CUSTOM_BOX_PICS = {};
export function spectralPixel(d, i) {
  const r = d[i] / 255,
    g = d[i + 1] / 255,
    b = d[i + 2] / 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    l = (mx + mn) / 2,
    dl = mx - mn;
  let h = 0,
    sat = 0;
  if (dl > 0.0001) {
    sat = dl / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  let nh, ns;
  if (sat < 0.18) {
    nh = 272;
    ns = l > 0.9 ? 0.35 : 0.3;
  } // greys, blacks, whites → violet tint
  else if (h < 15 || h >= 330) {
    nh = 305;
    ns = Math.min(1, sat * 1.25);
  } // reds → hot magenta
  else if (h < 70) {
    nh = 118 + (h - 15) * 0.5;
    ns = Math.min(1, sat * 1.3);
  } // oranges/yellows → toxic green
  else {
    nh = (h + 160) % 360;
    ns = Math.min(1, sat * 1.2);
  }
  const c = (1 - Math.abs(2 * l - 1)) * ns,
    x = c * (1 - Math.abs(((nh / 60) % 2) - 1)),
    m0 = l - c / 2;
  const [rr, gg, bb] =
    nh < 60
      ? [c, x, 0]
      : nh < 120
        ? [x, c, 0]
        : nh < 180
          ? [0, c, x]
          : nh < 240
            ? [0, x, c]
            : nh < 300
              ? [x, 0, c]
              : [c, 0, x];
  d[i] = (rr + m0) * 255;
  d[i + 1] = (gg + m0) * 255;
  d[i + 2] = (bb + m0) * 255;
}
// gunmetal with gold edges for the Arsenal box (from the Standard box)
function arsenalPixel(d, i) {
  const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
  const c = sampleRamp(
    [
      [0, hexChannels("#0d0e10")],
      [0.35, hexChannels("#2e3238")],
      [0.6, hexChannels("#5b616b")],
      [0.8, hexChannels("#c9a24a")],
      [1, hexChannels("#fff1b8")],
    ],
    l,
  );
  d[i] = c[0];
  d[i + 1] = c[1];
  d[i + 2] = c[2];
}
export const boxPixelFn = (b) =>
  b.trophies
    ? arsenalPixel
    : b.pix === "fire"
      ? firePixel
      : b.pix === "chrome"
        ? chromePixel
        : b.pix === "holo"
          ? holoPixel
          : spectralPixel;
function firePixel(d, i) {
  const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
  const c = sampleRamp(
    [
      [0, hexChannels("#140200")],
      [0.35, hexChannels("#7a1000")],
      [0.6, hexChannels("#ff4a00")],
      [0.8, hexChannels("#ffb100")],
      [1, hexChannels("#fff6c0")],
    ],
    l,
  );
  d[i] = c[0];
  d[i + 1] = c[1];
  d[i + 2] = c[2];
}
function chromePixel(d, i) {
  const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
  const c = sampleRamp(
    [
      [0, hexChannels("#101216")],
      [0.4, hexChannels("#5b626e")],
      [0.7, hexChannels("#c3c9d3")],
      [1, hexChannels("#ffffff")],
    ],
    Math.min(1, l * 1.25),
  );
  d[i] = c[0];
  d[i + 1] = c[1];
  d[i + 2] = c[2];
}
function holoPixel(d, i) {
  const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255,
    p = i / 4,
    x = p % 560,
    y = Math.floor(p / 560),
    h = ((x + y) * 1.4) % 360;
  const s2 = 0.75,
    ll = 0.25 + l * 0.65,
    c = (1 - Math.abs(2 * ll - 1)) * s2,
    xx = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = ll - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, xx, 0]
      : h < 120
        ? [xx, c, 0]
        : h < 180
          ? [0, c, xx]
          : h < 240
            ? [0, xx, c]
            : h < 300
              ? [xx, 0, c]
              : [c, 0, xx];
  d[i] = (r + m) * 255;
  d[i + 1] = (g + m) * 255;
  d[i + 2] = (b + m) * 255;
}
export function recolour(img, fn) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height),
    d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]) {
      fn(d, i);
    }
  }
  g.putImageData(id, 0, 0);
  return c;
}
// Color Lab pictures come from the browser's saved copies first (decoded off the main thread), and are only
// drawn when there's no saved copy yet; a freshly drawn one is saved for next time. No stutter while the page loads.
export const savedReq = {};
// Tank pictures (garage, lobby, panel) stretch a paint over the whole picture, but the maze puts the whole paint on
// each part. So every Color Lab paint's picture version is laid out part by part the same way as the maze, and the
// maze (and the paint's swatch) keep the plain tile.
const PARTBOX = {
  leftTread: [266, 243, 495, 346],
  base: [141, 211, 455, 352],
  rightTread: [128, 229, 346, 368],
  turret: [196, 112, 493, 243],
}; // in the 640x384 picture; the turret box covers the dome and barrel together
PARTBOX.barrel = PARTBOX.turret;
// A paint for one part: the tile at the same scale on every part (the hull shows the whole tile) and centred on
// the part, so a stripe or a decal sits in the middle of each part instead of being cut off at its edge.
// The tank pictures show each paint the way the maze shows it (seen from above, the tile's top at the tank's front,
// its middle down the tank's centre line): the middle of the tile runs along the top of each part (the dome's
// crest and the barrel, the hull's deck), the near half of the tile wraps down the side we see, the far half
// over the top. The treads show the tile's left edge, as they do in the maze. Sponsor liveries keep their side
// decals readable (their tile is laid out for the side of the tank).
export const SIDE_DESIGN = { "pt-sponsor-red": 1, "pt-sponsor-blue": 1, "pt-sponsor-black": 1, "pt-sponsor-yellow": 1 }; // drawn for the side of the tank
// the liveries' treads: a sponsor's name printed along the whole tread, over and over (one long strip; the maze runs it up the
// tread, the pictures run it along the tread in rows)
const TREAD_PRINT = {
    "pt-sponsor-red": ["TURRET TYRES", "#8a0a10", "#e0242c", "#fff"],
    "pt-sponsor-blue": ["TREAD PERFORMANCE", "#0b2a6e", "#2a62d8", "#ffd400"],
    "pt-sponsor-black": ["RICOCHET RACING", "#0b0b0d", "#2a2c32", "#e0242c"],
    "pt-sponsor-yellow": ["MAZE MOTORSPORT", "#c99a00", "#ffd84a", "#111"],
  },
  treadPrints = {};
export function treadPrint(key) {
  if (treadPrints[key]) {
    return treadPrints[key];
  }
  const d = TREAD_PRINT[key];
  if (!d) {
    return null;
  }
  const [txt, dark, base, ink] = d;
  const c = document.createElement("canvas");
  c.width = 440;
  c.height = 44;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 44);
  gr.addColorStop(0, base);
  gr.addColorStop(1, dark);
  g.fillStyle = gr;
  g.fillRect(0, 0, 440, 44);
  g.font = '26px TankTrouble, Impact, "Arial Black", sans-serif';
  g.textBaseline = "middle";
  g.lineJoin = "round";
  const unit = txt + "  \u2022  ",
    uw = g.measureText(unit).width,
    n = Math.max(1, Math.round(440 / uw)),
    sx = 440 / (uw * n); // whole repeats, so the strip joins up end to end
  g.save();
  g.scale(sx, 1);
  g.strokeStyle = ink === "#111" ? "rgba(255,255,255,.75)" : "rgba(0,0,0,.7)";
  g.lineWidth = 4;
  g.fillStyle = ink;
  for (let i = 0; i < n; i++) {
    g.strokeText(unit, i * uw, 23);
    g.fillText(unit, i * uw, 23);
  }
  g.restore();
  return (treadPrints[key] = c);
}
// One rule for both views, so a paint sits on the same parts in the same way:
//  - the maze (tank facing up, seen from above) puts the paint on each part with its top at the tank's front, its left
//    edge on the tank's left side and its right edge on the right side; the treads get its left-edge strip
//  - the tank pictures (tank facing right, its right side towards you) show the same thing from the side: the paint turned
//    so its top is at the front (right), its left edge along the top of each part and its right edge along the bottom
//    (the near side); each part gets the whole paint, the treads the same strip as in the maze
// Sponsor liveries are drawn for the side view: they're upright on the pictures, and the maze turns them to match.
// paints with an up and a down (things that hang, grow, fall or stand, scenes, writing): kept upright on the tank pictures
// and the spray cans (the maze keeps the tile as it is)
const UPRIGHT_PAINTS = new Set(
  [
    "pt-brick",
    "pt-drips",
    "pt-tags",
    "pt-kelp",
    "pt-jelly",
    "pt-frosting",
    "pt-synthwave",
    "pt-scanline",
    "pt-tiger",
    "pt-zebra",
    "pt-castle",
    "pt-heraldry",
    "pt-wanted",
    "pt-canyon",
    "pt-tropsunset",
    "pt-waves",
    "pt-pixelpals",
    "pt-suits",
  ].concat(EXT_UPRIGHT),
);
const TREAD_STRIP = 12 / 68; // the share of the paint's width the maze puts on the treads
function partBoxDraw(g, k, box, t, sx, sy, sw, sh, upright) {
  const [x0, y0, x1, y1] = box,
    w = (x1 - x0) * k,
    h = (y1 - y0) * k;
  g.save();
  if (upright) {
    g.drawImage(t, sx, sy, sw, sh, x0 * k, y0 * k, w, h);
  } else {
    g.setTransform(0, h / sw, -w / sh, 0, x1 * k, y0 * k);
    g.drawImage(t, sx, sy, sw, sh, 0, 0, sw, sh);
  }
  g.restore();
}
function partPaint(t, part, key) {
  const W = t.width || 400,
    H = t.height || 240,
    k = W / 640,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const box = PARTBOX[part],
    tread = /Tread$/.test(part),
    side = !!SIDE_DESIGN[key];
  const pad = tread
    ? [box[0] - 20, box[1] - 10, box[2] + 20, box[3] + 10]
    : [box[0] - 6, box[1] - 6, box[2] + 6, box[3] + 6];
  if (UPRIGHT_PAINTS.has(key)) {
    const [x0, y0, x1, y1] = pad,
      w = (x1 - x0) * k,
      h = (y1 - y0) * k,
      sc = Math.max(w / W, h / H); // the whole paint, upright, covering the part without stretching
    g.drawImage(t, (W - w / sc) / 2, (H - h / sc) / 2, w / sc, h / sc, x0 * k, y0 * k, w, h);
    return c;
  }
  if (side && tread && TREAD_PRINT[key]) {
    const tp = treadPrint(key),
      [x0, y0, x1, y1] = pad,
      w = (x1 - x0) * k,
      h = (y1 - y0) * k,
      rh = (w * tp.height) / tp.width; // rows of the print, not stretched
    for (let y = 0; y < h; y += rh) {
      g.drawImage(tp, x0 * k, y0 * k + y, w, rh);
    }
  } else if (side) {
    if (tread) {
      partBoxDraw(g, k, pad, t, 0, H * 0.82, W, H * 0.18, true);
    } else {
      partBoxDraw(g, k, pad, t, 0, 0, W, H, true);
    }
  } else if (tread) {
    partBoxDraw(g, k, pad, t, 0, 0, W * TREAD_STRIP, H, false);
  } else {
    partBoxDraw(g, k, pad, t, 0, 0, W, H, false);
  }
  return c;
}
// Paints with their own side-view artwork (as the game's own paints have): drawn for the tank pictures part by part, lined up
// with the game's tank art (640x384), and shaded by the game like its own paints. The maze keeps the top-down tile.
const SV = {
  // where each part sits in the 640x384 picture
  domeTop: (x) => {
    const d = (x - 281) / 86;
    return 243 - 101 * Math.sqrt(Math.max(0, 1 - d * d));
  },
  barrel: (x, w) => {
    const tp = 155 - (x - 333) * 0.326,
      bt = 205 - (x - 345) * 0.19;
    return tp + (bt - tp) * w;
  }, // w: 0 top edge .. 1 bottom edge
};
function svCanvas(t) {
  const W = (t && t.width) || 400,
    H = (t && t.height) || 240,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.scale(W / 640, H / 384);
  return [c, g];
}
function svBarrelBand(g, w0, w1, color) {
  g.beginPath();
  g.moveTo(290, SV.barrel(290, w0));
  g.lineTo(510, SV.barrel(510, w0));
  g.lineTo(510, SV.barrel(510, w1));
  g.lineTo(290, SV.barrel(290, w1));
  g.closePath();
  g.fillStyle = color;
  g.fill();
}
function svDomeBand(g, a0, a1, color) {
  // a band up the dome: a = across the dome at each height (-1 back .. 1 front), from its base to the top
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const dy = i / 40,
      h = 86 * Math.sqrt(1 - dy * dy);
    g.lineTo(281 + a0 * h, Math.min(232, 243 - 101 * dy));
  } // (stops at the hull's deck)
  for (let i = 40; i >= 0; i--) {
    const dy = i / 40,
      h = 86 * Math.sqrt(1 - dy * dy);
    g.lineTo(281 + a1 * h, Math.min(232, 243 - 101 * dy));
  }
  g.closePath();
  g.fillStyle = color;
  g.fill();
}
function svChevrons(g, x0, y0, x1, y1, step, color, lw) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (let y = y0; y < y1; y += step * 0.75) {
    for (let x = x0 + (((y - y0) / (step * 0.75)) % 2 ? step / 2 : 0); x < x1; x += step) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + step * 0.35, y + step * 0.32);
      g.lineTo(x + step * 0.7, y);
      g.stroke();
    }
  }
  g.restore();
}
function svBarrelClip(g) {
  g.beginPath();
  g.moveTo(290, SV.barrel(290, -0.05));
  g.lineTo(510, SV.barrel(510, -0.05));
  g.lineTo(510, SV.barrel(510, 1.05));
  g.lineTo(290, SV.barrel(290, 1.05));
  g.closePath();
  g.clip();
}
function svChecks(g, cx, cy, ang, size, a, b) {
  g.save();
  g.translate(cx, cy);
  g.rotate(ang);
  g.fillStyle = a;
  g.fillRect(-500, -500, 1000, 1000);
  g.fillStyle = b;
  for (let y = -500; y < 500; y += size) {
    for (let x = -500 + ((y / size) & 1 ? size : 0); x < 500; x += size * 2) {
      g.fillRect(x, y, size, size);
    }
  }
  g.restore();
}
function svSparkles(g, n, seed, x0, y0, x1, y1) {
  for (let k = 0; k < n; k++) {
    const r = (i) => {
      const v = Math.sin((k + 1) * 12.9898 + i * 78.233 + seed) * 43758.5453;
      return v - Math.floor(v);
    };
    const x = x0 + r(1) * (x1 - x0),
      y = y0 + r(2) * (y1 - y0),
      s2 = 3 + r(3) * 6;
    g.fillStyle = "rgba(255,255,240," + (0.5 + r(4) * 0.5) + ")";
    g.beginPath();
    g.arc(x, y, 1 + r(5) * 2.2, 0, 7);
    g.fill();
    if (r(6) > 0.6) {
      g.strokeStyle = "rgba(255,255,255,.9)";
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(x - s2, y);
      g.lineTo(x + s2, y);
      g.moveTo(x, y - s2);
      g.lineTo(x, y + s2);
      g.stroke();
    }
  }
}
export const SIDE_ART = {
  "pt-chequered": (t) => {
    const [c, g] = svCanvas(t); // chequered flag: squares lined up with each part (along the hull, along the barrel), same size everywhere
    svChecks(g, 141, 225, 0.144, 24, "#f4f4f2", "#141414");
    g.save();
    svBarrelClip(g);
    svChecks(g, 333, 180, -0.245, 20, "#f4f4f2", "#141414");
    g.restore();
    g.save();
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const x = 196 + (i * 171) / 40;
      g.lineTo(x, SV.domeTop(x) - 2);
    }
    g.lineTo(367, 232);
    g.lineTo(196, 232);
    g.closePath();
    g.clip();
    svChecks(g, 281, 142, 0, 22, "#f4f4f2", "#141414");
    g.restore();
    return c;
  },
  "pt-podium": (t) => {
    const [c, g] = svCanvas(t); // podium gold: polished gold with a bright band along each part, and champagne spray
    const gr = g.createLinearGradient(0, 110, 0, 380);
    gr.addColorStop(0, "#fff3b8");
    gr.addColorStop(0.18, "#f2c142");
    gr.addColorStop(0.5, "#b77b0c");
    gr.addColorStop(0.75, "#f2c142");
    gr.addColorStop(1, "#6b4300");
    g.fillStyle = gr;
    g.fillRect(0, 0, 640, 384);
    svBarrelBand(g, 0.12, 0.3, "rgba(255,248,210,.75)");
    svBarrelBand(g, 0.72, 0.85, "rgba(107,67,0,.45)");
    svDomeBand(g, -0.55, -0.15, "rgba(255,248,210,.55)");
    g.save();
    g.translate(141, 0);
    g.transform(1, 0.145, 0, 1, 0, 0);
    g.fillStyle = "rgba(255,248,210,.5)";
    g.fillRect(0, 232, 330, 12);
    g.restore();
    svSparkles(g, 70, 307, 120, 110, 500, 370);
    return c;
  },
  "pt-stripes": (t) => {
    const [c, g] = svCanvas(t); // red, two white racing stripes: along the barrel, up the front of the dome, along the hull
    const gr = g.createLinearGradient(0, 100, 0, 380);
    gr.addColorStop(0, "#e83a3f");
    gr.addColorStop(0.5, "#c8161e");
    gr.addColorStop(1, "#8a0c12");
    g.fillStyle = gr;
    g.fillRect(0, 0, 640, 384);
    for (const [a, b] of [
      [0.18, 0.34],
      [0.46, 0.62],
    ]) {
      svDomeBand(g, a - 0.03, b + 0.03, "#2a0406");
      svDomeBand(g, a, b, "#f7f7f5");
    }
    for (const [a, b] of [
      [0.26, 0.4],
      [0.56, 0.7],
    ]) {
      svBarrelBand(g, a - 0.03, b + 0.03, "#2a0406");
      svBarrelBand(g, a, b, "#f7f7f5");
    }
    g.save();
    g.beginPath();
    g.rect(347, 0, 200, 384);
    g.clip();
    g.translate(346, 0);
    g.transform(1, 0.145, 0, 1, 0, 0); // along the side of the hull that shows past the near tread (the treads stay plain)
    for (const [y, h] of [
      [246, 10],
      [264, 10],
    ]) {
      g.fillStyle = "#2a0406";
      g.fillRect(0, y - 2, 96, h + 4);
      g.fillStyle = "#f7f7f5";
      g.fillRect(0, y, 96, h);
    }
    g.restore();
    return c;
  },
  "pt-livery": (t) => {
    const [c, g] = svCanvas(t); // blue racing livery: an orange swoosh up the front of the hull into a band along it, with yellow and white pinstripes
    const gr = g.createLinearGradient(100, 100, 520, 380);
    gr.addColorStop(0, "#2a6ae0");
    gr.addColorStop(1, "#0b2a6e");
    g.fillStyle = gr;
    g.fillRect(0, 0, 640, 384);
    const swoosh = (dx, w, color) => {
      g.beginPath();
      g.moveTo(120, 300 + dx * 0.3);
      g.lineTo(330 + dx, 300 + dx * 0.3);
      g.lineTo(400 + dx, 215);
      g.lineTo(400 + dx + w, 215);
      g.lineTo(330 + dx + w, 300 + dx * 0.3 + w * 0.9);
      g.lineTo(120, 300 + dx * 0.3 + w * 0.9);
      g.closePath();
      g.fillStyle = color;
      g.fill();
    };
    swoosh(-14, 6, "#ffffff");
    swoosh(-6, 10, "#ffd23a");
    swoosh(6, 52, "#ff7a00"); // white and yellow pinstripes, then the orange
    svBarrelBand(g, 0.5, 0.68, "#ff7a00");
    svBarrelBand(g, 0.44, 0.5, "#ffd23a");
    svDomeBand(g, 0.3, 0.55, "#ff7a00");
    svDomeBand(g, 0.22, 0.3, "#ffd23a");
    return c;
  },
  "pt-tyre": (t) => {
    const [c, g] = svCanvas(t); // black tyre rubber with chevron tread marks all along it
    g.fillStyle = "#1d1f23";
    g.fillRect(0, 0, 640, 384);
    svChevrons(g, 110, 215, 510, 380, 30, "#070708", 7);
    svChevrons(g, 110, 211, 510, 380, 30, "rgba(255,255,255,.08)", 2);
    svBarrelBand(g, 0.45, 0.55, "rgba(255,214,0,.85)");
    return c;
  },
};
const PART_PAINTS = {};
export function partPaintFor(key, part) {
  const t = MAZE_TILE[key];
  if (!t || SIDE_ART[key]) {
    return null;
  }
  const id = key + "|" + (part === "barrel" ? "turret" : part);
  return PART_PAINTS[id] || (PART_PAINTS[id] = partPaint(t, part, key));
}
// the whole picture (for anything that draws the paint without saying which part): every part's version, side by side
export function paintLayout(t, key) {
  const W = t.width || 400,
    H = t.height || 240,
    k = W / 640,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  for (const part of ["leftTread", "turret", "base", "rightTread"]) {
    const [x0, y0, x1, y1] = PARTBOX[part];
    g.save();
    g.beginPath();
    g.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k);
    g.clip();
    g.drawImage(partPaint(t, part, key), 0, 0);
    g.restore();
  }
  return c;
}
export const gxIcons = {};
export const swAsked = new Set();
// A paint's picture for its spray can label (W x H) or square icon: the paint at full size, from its liveliest part (not a blurry corner)
const CAN_KEEP = new Set(["pt-stripes"]),
  CAN_ZOOM = { "pt-wanted": 0.55, "pt-hibiscus": 0.6 }; // spray can labels: kept as drawn / zoomed out
const CAN_X = {
  "pt-stripes": 0.49,
  "pt-sponsor-red": 0.755,
  "pt-sponsor-blue": 0.755,
  "pt-sponsor-black": 0.755,
  "pt-sponsor-yellow": 0.755,
}; // where the main motif is (share of the width)
export function paintLabel(t, W = 78, H = 183, sheen = true, key) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (key && !UPRIGHT_PAINTS.has(key) && !SIDE_DESIGN[key] && !CAN_KEEP.has(key)) {
    // a can shows more of the design: the paint turned to run up the can (most of its width fits)
    const r = document.createElement("canvas");
    r.width = t.height;
    r.height = t.width;
    const rg = r.getContext("2d");
    rg.translate(t.height, 0);
    rg.rotate(Math.PI / 2);
    rg.drawImage(t, 0, 0);
    t = r;
  }
  const z = (key && CAN_ZOOM[key]) || 1;
  if (z < 1) {
    // sparse designs: zoomed out (the pattern repeated) so whole motifs fit on the can
    const n2 = Math.ceil(1 / z) + 1,
      r = document.createElement("canvas");
    r.width = t.width * n2;
    r.height = t.height * n2;
    const rg = r.getContext("2d");
    for (let i = 0; i < n2; i++) {
      for (let j = 0; j < n2; j++) {
        rg.drawImage(t, i * t.width, j * t.height);
      }
    }
    r.__vh = t.height / z;
    t = r;
  }
  const vh = t.__vh || t.height,
    k = H / vh,
    sw = W / k; // slice of the tile that fills the label at the tile's own height
  const s = document.createElement("canvas");
  s.width = 40;
  s.height = 24;
  const sg = s.getContext("2d", { willReadFrequently: true });
  sg.drawImage(t, 0, 0, 40, 24);
  const d = sg.getImageData(0, 0, 40, 24).data;
  let best = 0,
    bx = (t.width - sw) / 2;
  if (key && CAN_X[key] != null) {
    bx = CAN_X[key] * t.width - sw / 2;
    best = Infinity;
  } // centred on the design's main motif
  for (let i = 0; i <= 24; i++) {
    const x0 = ((t.width - sw) * i) / 24,
      a = Math.floor((x0 / t.width) * 40),
      b = Math.ceil(((x0 + sw) / t.width) * 40);
    let n = 0,
      v = 0;
    const m = [0, 0, 0];
    for (let y = 0; y < 24; y++) {
      for (let x = a; x < b; x++) {
        const j = (y * 40 + x) * 4;
        for (let q = 0; q < 3; q++) {
          m[q] += d[j + q];
          v += d[j + q] * d[j + q];
        }
        n++;
      }
    }
    const varc = v / n - (m[0] * m[0] + m[1] * m[1] + m[2] * m[2]) / (n * n);
    if (varc > best + 1) {
      best = varc;
      bx = x0;
    }
  }
  g.imageSmoothingQuality = "high";
  g.drawImage(t, bx, 0, sw, vh, 0, 0, W, H);
  if (!sheen) {
    return c;
  }
  // a soft sheen down the can, like fresh glossy paint
  const gr = g.createLinearGradient(0, 0, W, 0);
  gr.addColorStop(0, "rgba(0,0,0,.18)");
  gr.addColorStop(0.32, "rgba(255,255,255,.16)");
  gr.addColorStop(0.42, "rgba(255,255,255,.04)");
  gr.addColorStop(1, "rgba(0,0,0,.22)");
  if (sheen) {
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }
  return c;
}
export const gxCans = {};
// (Galaxy art: buildGalaxyArt / buildGalaxyBox below)
// Galaxy box art. Everything is drawn in the game's 640x384 tank-icon frame (accessories) or a 400x240 tile
// (pattern paints). Some items start from the game's own accessory art (recoloured), the rest are drawn here.
// buildGalaxyArt(load) -> { frames: {key: canvas}, patterns: {key: canvas}, box: canvas(560x280) }
// load(name) resolves to an <img> for 'tankIcon/accessories/turret110.png@640' style names, or null.
export async function buildGalaxyArt(load) {
  const H = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const hexc = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => a + (b - a) * t;
  const rampF = (stops) => {
    stops = stops.map(([p, c]) => [p, hexc(c)]);
    return (t) => {
      t = Math.max(0, Math.min(1, t));
      for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i][0]) {
          const [p0, c0] = stops[i - 1],
            [p1, c1] = stops[i],
            k = (t - p0) / (p1 - p0 || 1);
          return [mix(c0[0], c1[0], k), mix(c0[1], c1[1], k), mix(c0[2], c1[2], k)];
        }
      }
      return stops[stops.length - 1][1];
    };
  };
  const canvas = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
  const W = 640,
    HH = 384;
  const fromImg = (img) => {
    const c = canvas(W, HH);
    if (img) {
      c.getContext("2d").drawImage(img, 0, 0, W, HH);
    }
    return c;
  };
  const recolourL = (c, ramp, keepDark) => {
    // brightness → new colour ramp (keeps the game's shading and outlines)
    const g = c.getContext("2d", { willReadFrequently: true }),
      id = g.getImageData(0, 0, c.width, c.height),
      d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) {
        continue;
      }
      const L = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
      if (keepDark && L < 0.12) {
        continue;
      }
      const [r, gg, b] = ramp(L, (i / 4) % c.width, Math.floor(i / 4 / c.width));
      d[i] = r;
      d[i + 1] = gg;
      d[i + 2] = b;
    }
    g.putImageData(id, 0, 0);
    return c;
  };
  const glowUnder = (c, colour, blur, alpha) => {
    const out = canvas(c.width, c.height),
      o = out.getContext("2d"),
      t = canvas(c.width, c.height),
      tg = t.getContext("2d");
    tg.drawImage(c, 0, 0);
    tg.globalCompositeOperation = "source-in";
    tg.fillStyle = colour;
    tg.fillRect(0, 0, c.width, c.height);
    o.save();
    o.globalAlpha = alpha;
    o.filter = `blur(${blur}px)`;
    o.drawImage(t, 0, 0);
    o.restore();
    o.drawImage(c, 0, 0);
    return out;
  };
  const stars = (g, n, seed, x0, y0, w, h, maxR, alpha = 1) => {
    for (let k = 0; k < n; k++) {
      const x = x0 + H(k, 1, seed) * w,
        y = y0 + H(k, 2, seed) * h,
        r = 0.5 + Math.pow(H(k, 3, seed), 3) * maxR;
      g.fillStyle = `rgba(255,255,255,${(0.45 + H(k, 4, seed) * 0.55) * alpha})`;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    }
  };
  const sparkle = (g, x, y, r, col = "#ffffff") => {
    g.save();
    g.translate(x, y);
    g.fillStyle = col;
    g.shadowColor = col;
    g.shadowBlur = r * 1.2;
    g.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 - Math.PI / 2,
        rr = k % 2 ? r * 0.22 : r;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
    g.restore();
  };
  const sphere = (g, cx, cy, r, stops, light = [-0.35, -0.4]) => {
    const gr = g.createRadialGradient(cx + r * light[0], cy + r * light[1], r * 0.08, cx, cy, r);
    stops.forEach(([p, c]) => gr.addColorStop(p, c));
    g.beginPath();
    g.arc(cx, cy, r, 0, 7);
    g.fillStyle = gr;
    g.fill();
  };
  const outline = (g, path, w = 3.5) => {
    g.save();
    g.lineWidth = w;
    g.strokeStyle = "#141414";
    g.lineJoin = "round";
    path();
    g.stroke();
    g.restore();
  };
  const shine = (g, cx, cy, rx, ry, rot, a = 0.8) => {
    g.save();
    g.fillStyle = `rgba(255,255,255,${a})`;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, rot, 0, 7);
    g.fill();
    g.restore();
  };
  const noise2 = (x, y, s) => {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      xf = x - xi,
      yf = y - yi,
      sm = (t) => t * t * (3 - 2 * t);
    const a = H(xi, yi, s),
      b = H(xi + 1, yi, s),
      c = H(xi, yi + 1, s),
      d = H(xi + 1, yi + 1, s);
    return mix(mix(a, b, sm(xf)), mix(c, d, sm(xf)), sm(yf));
  };
  const fbm = (x, y, s) =>
    0.5 * noise2(x, y, s) +
    0.25 * noise2(x * 2, y * 2, s + 1) +
    0.125 * noise2(x * 4, y * 4, s + 2) +
    0.125 * noise2(x * 8, y * 8, s + 3);

  const frames = {};
  const crescent = await load("tankIcon/accessories/back152.png@640");

  // --- Ringed Planet (turret): a banded gas giant with a tilted ring, sitting on the turret dome ---
  {
    const out = canvas(W, HH),
      g = out.getContext("2d");
    const r = 50,
      cx = 282,
      cy = 96;
    const band = rampF([
      [0, "#6b2f12"],
      [0.22, "#a4552a"],
      [0.42, "#e09b5a"],
      [0.6, "#f6d6a0"],
      [0.78, "#fff0d0"],
      [1, "#c9733a"],
    ]);
    const body = canvas(W, HH),
      bgc = body.getContext("2d"),
      id = bgc.createImageData(W, HH),
      d = id.data;
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = (x - cx) / r,
          dy = (y - cy) / r,
          rr = dx * dx + dy * dy;
        if (rr > 1) {
          continue;
        }
        const z = Math.sqrt(1 - rr),
          lat = Math.asin(dy),
          lon = Math.atan2(dx, z);
        const t = 0.5 + 0.5 * Math.sin(lat * 7.5 + fbm(lon * 1.5 + 2, lat * 6, 4) * 2.4);
        const col = band(t);
        const light = 0.3 + 0.75 * Math.max(0, -dx * 0.45 - dy * 0.55 + z * 0.7);
        const i = (y * W + x) * 4;
        d[i] = Math.min(255, col[0] * light);
        d[i + 1] = Math.min(255, col[1] * light);
        d[i + 2] = Math.min(255, col[2] * light);
        d[i + 3] = 255;
      }
    }
    bgc.putImageData(id, 0, 0);
    // a storm spot
    bgc.save();
    bgc.beginPath();
    bgc.arc(cx, cy, r, 0, 7);
    bgc.clip();
    bgc.fillStyle = "rgba(180,60,30,.55)";
    bgc.beginPath();
    bgc.ellipse(cx + 14, cy + 16, 12, 6, -0.1, 0, 7);
    bgc.fill();
    bgc.restore();
    const ring = (front) => {
      g.save();
      g.translate(cx, cy + r * 0.05);
      g.rotate(-0.28);
      const rx = r * 1.9,
        ry = r * 0.5,
        a0 = front ? 0 : Math.PI,
        a1 = front ? Math.PI : 2 * Math.PI;
      for (const [w, col] of [
        [15, "#141414"],
        [11, null],
        [4, "rgba(70,40,90,.35)"],
      ]) {
        g.beginPath();
        g.ellipse(0, 0, rx, ry, 0, a0, a1);
        if (!col) {
          const gr = g.createLinearGradient(-rx, 0, rx, 0);
          gr.addColorStop(0, "#9a7ad6");
          gr.addColorStop(0.3, "#e9d9ff");
          gr.addColorStop(0.55, "#fff4dc");
          gr.addColorStop(0.8, "#bfe6ff");
          gr.addColorStop(1, "#6c9fe0");
          g.strokeStyle = gr;
        } else {
          g.strokeStyle = col;
        }
        g.lineWidth = w;
        g.stroke();
      }
      g.beginPath();
      g.ellipse(0, -2, rx, ry, 0, a0, a1);
      g.lineWidth = 2;
      g.strokeStyle = "rgba(255,255,255,.7)";
      g.stroke();
      g.restore();
    };
    ring(false);
    g.drawImage(glowUnder(body, "#ffb15a", 8, 0.6), 0, 0);
    outline(
      g,
      () => {
        g.beginPath();
        g.arc(cx, cy, r, 0, 7);
      },
      4,
    );
    ring(true);
    g.save();
    g.beginPath();
    g.arc(cx, cy, r - 2, 0, 7);
    g.clip();
    g.translate(cx, cy + r * 0.32);
    g.rotate(-0.28);
    g.fillStyle = "rgba(40,10,30,.28)";
    g.beginPath();
    g.ellipse(0, 0, r * 1.9, r * 0.12, 0, 0, 7);
    g.fill();
    g.restore();
    shine(g, cx - r * 0.38, cy - r * 0.45, r * 0.2, r * 0.11, -0.7, 0.75);
    frames["gx-planet"] = out;
    await breathe(); // (one picture per frame: no stutter)
  }

  // --- UFO (turret): saucer with a glass cockpit and lights, hovering on the turret ---
  {
    const out = canvas(W, HH),
      g = out.getContext("2d");
    const cx = 282,
      cy = 128,
      rx = 118,
      ry = 30;
    // glass dome
    g.save();
    g.beginPath();
    g.ellipse(cx, cy - 10, 58, 56, 0, Math.PI, 0);
    g.closePath();
    const dg = g.createLinearGradient(cx - 58, cy - 66, cx + 58, cy);
    dg.addColorStop(0, "rgba(170,255,240,.85)");
    dg.addColorStop(1, "rgba(40,150,200,.75)");
    g.fillStyle = dg;
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = "#141414";
    g.stroke();
    // little green alien
    g.fillStyle = "#62d44a";
    g.beginPath();
    g.ellipse(cx, cy - 30, 18, 20, 0, 0, 7);
    g.fill();
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = "#141414";
    g.beginPath();
    g.ellipse(cx - 7, cy - 32, 5, 7, -0.3, 0, 7);
    g.ellipse(cx + 7, cy - 32, 5, 7, 0.3, 0, 7);
    g.fill();
    g.restore();
    shine(g, cx - 28, cy - 46, 14, 7, -0.6, 0.7);
    // saucer
    const sg = g.createLinearGradient(0, cy - ry, 0, cy + ry);
    sg.addColorStop(0, "#f2f6fb");
    sg.addColorStop(0.45, "#aeb8c8");
    sg.addColorStop(0.55, "#7d889c");
    sg.addColorStop(1, "#3d4556");
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, 7);
    g.fillStyle = sg;
    g.fill();
    outline(
      g,
      () => {
        g.beginPath();
        g.ellipse(cx, cy, rx, ry, 0, 0, 7);
      },
      4,
    );
    g.beginPath();
    g.ellipse(cx, cy - 6, rx * 0.97, ry * 0.55, 0, Math.PI * 1.05, Math.PI * 1.95);
    g.strokeStyle = "rgba(255,255,255,.8)";
    g.lineWidth = 3;
    g.stroke();
    const cols = ["#ff4d6d", "#ffd23f", "#3ee0ff", "#7cff6b", "#c77dff"];
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.12 + k * 0.127),
        x = cx - Math.cos(a) * rx * 0.82,
        y = cy + Math.sin(a) * ry * 0.55;
      g.save();
      g.shadowColor = cols[k % 5];
      g.shadowBlur = 10;
      g.fillStyle = cols[k % 5];
      g.beginPath();
      g.arc(x, y, 6, 0, 7);
      g.fill();
      g.restore();
      g.lineWidth = 2;
      g.strokeStyle = "#141414";
      g.beginPath();
      g.arc(x, y, 6, 0, 7);
      g.stroke();
    }
    frames["gx-ufo"] = out;
    await breathe(); // (one picture per frame: no stutter)
  }

  // --- Astronaut Helmet (turret): a glass bubble over the turret with a metal collar ---
  {
    const out = canvas(W, HH),
      g = out.getContext("2d");
    const cx = 282,
      cy = 178,
      r = 102;
    g.save();
    g.beginPath();
    g.arc(cx, cy, r, Math.PI * 0.93, Math.PI * 2.07);
    g.closePath();
    const gg = g.createRadialGradient(cx - 30, cy - 40, 10, cx, cy, r);
    gg.addColorStop(0, "rgba(255,255,255,.10)");
    gg.addColorStop(0.75, "rgba(160,220,255,.16)");
    gg.addColorStop(1, "rgba(120,190,255,.45)");
    g.fillStyle = gg;
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = "rgba(20,20,20,.9)";
    g.stroke();
    g.restore();
    g.save();
    g.lineCap = "round";
    g.strokeStyle = "rgba(255,255,255,.85)";
    g.lineWidth = 9;
    g.beginPath();
    g.arc(cx, cy, r - 16, Math.PI * 1.18, Math.PI * 1.42);
    g.stroke();
    g.lineWidth = 5;
    g.beginPath();
    g.arc(cx, cy, r - 16, Math.PI * 1.48, Math.PI * 1.55);
    g.stroke();
    g.restore();
    // collar
    const cg = g.createLinearGradient(0, cy + 40, 0, cy + 66);
    cg.addColorStop(0, "#f7f9fc");
    cg.addColorStop(0.5, "#a9b3c4");
    cg.addColorStop(1, "#5d6678");
    g.beginPath();
    g.ellipse(cx, cy + 50, r * 0.98, 16, 0, 0, 7);
    g.fillStyle = cg;
    g.fill();
    outline(
      g,
      () => {
        g.beginPath();
        g.ellipse(cx, cy + 50, r * 0.98, 16, 0, 0, 7);
      },
      4,
    );
    for (const x of [-60, -20, 20, 60]) {
      g.fillStyle = "#ff9f1c";
      g.beginPath();
      g.arc(cx + x, cy + 51, 4, 0, 7);
      g.fill();
    }
    frames["gx-helmet"] = out;
    await breathe(); // (one picture per frame: no stutter)
  }

  // --- Crescent Moon (back): the Eid box's golden crescent, turned to glowing moonlight ---
  {
    const c = fromImg(crescent);
    recolourL(
      c,
      rampF([
        [0, "#10142a"],
        [0.25, "#2c3966"],
        [0.5, "#7e93c9"],
        [0.75, "#cfdcf7"],
        [1, "#ffffff"],
      ]),
      true,
    );
    const out = glowUnder(c, "#9fc3ff", 14, 0.85),
      g = out.getContext("2d");
    stars(g, 10, 31, 30, 10, 320, 230, 2, 0.9);
    sparkle(g, 300, 40, 12);
    sparkle(g, 70, 210, 9, "#cfe0ff");
    frames["gx-moon"] = out;
    await breathe(); // (one picture per frame: no stutter)
  }

  // --- Black Hole (back): a dark centre with a bright, tilted ring of light bending around it ---
  {
    const out = canvas(W, HH),
      g = out.getContext("2d");
    const cx = 140,
      cy = 118,
      r = 46;
    const disk = (front) => {
      g.save();
      g.translate(cx, cy);
      g.rotate(-0.35);
      g.beginPath();
      g.ellipse(0, 0, r * 2.5, r * 0.62, 0, front ? 0 : Math.PI, front ? Math.PI : 2 * Math.PI);
      const gr = g.createLinearGradient(-r * 2.5, 0, r * 2.5, 0);
      gr.addColorStop(0, "rgba(120,40,200,.0)");
      gr.addColorStop(0.2, "#7b2cff");
      gr.addColorStop(0.45, "#ff8a3d");
      gr.addColorStop(0.55, "#fff3c4");
      gr.addColorStop(0.75, "#ff4fa3");
      gr.addColorStop(1, "rgba(120,40,200,0)");
      g.shadowColor = "#ff9d4d";
      g.shadowBlur = 20;
      g.lineWidth = 18;
      g.strokeStyle = gr;
      g.stroke();
      g.shadowBlur = 0;
      g.lineWidth = 4;
      g.strokeStyle = "rgba(255,255,255,.7)";
      g.stroke();
      g.restore();
    };
    disk(false);
    // light bent over the top
    g.save();
    g.shadowColor = "#ffb46b";
    g.shadowBlur = 18;
    g.lineWidth = 9;
    const ag = g.createLinearGradient(cx - r, cy - r, cx + r, cy);
    ag.addColorStop(0, "#ff7ac8");
    ag.addColorStop(0.5, "#ffe9b0");
    ag.addColorStop(1, "#ff8a3d");
    g.strokeStyle = ag;
    g.beginPath();
    g.arc(cx, cy, r * 1.18, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    g.restore();
    g.beginPath();
    g.arc(cx, cy, r, 0, 7);
    const hg = g.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
    hg.addColorStop(0, "#000");
    hg.addColorStop(0.9, "#05010c");
    hg.addColorStop(1, "#3a1660");
    g.fillStyle = hg;
    g.fill();
    g.save();
    g.lineWidth = 3;
    g.strokeStyle = "#ffe2a8";
    g.shadowColor = "#ffcf7a";
    g.shadowBlur = 12;
    g.beginPath();
    g.arc(cx, cy, r + 1, 0, 7);
    g.stroke();
    g.restore();
    disk(true);
    stars(g, 26, 41, 20, 20, 260, 200, 1.8);
    frames["gx-blackhole"] = out;
    await breathe(); // (one picture per frame: no stutter)
  }

  // --- Rocket Booster (back): a jet engine on the back of the tank with a big flame ---
  {
    const out = canvas(W, HH),
      g = out.getContext("2d");
    const y = 262,
      x1 = 200,
      x0 = 110;
    // flame
    const fl = g.createLinearGradient(x0, 0, 0, 0);
    fl.addColorStop(0, "#ffffff");
    fl.addColorStop(0.2, "#fff27a");
    fl.addColorStop(0.5, "#ff8a1c");
    fl.addColorStop(0.8, "rgba(255,40,80,.6)");
    fl.addColorStop(1, "rgba(255,40,80,0)");
    g.save();
    g.shadowColor = "#ff8a1c";
    g.shadowBlur = 24;
    g.fillStyle = fl;
    g.beginPath();
    g.moveTo(x0 + 4, y - 24);
    g.quadraticCurveTo(x0 - 50, y - 30, 4, y);
    g.quadraticCurveTo(x0 - 50, y + 30, x0 + 4, y + 24);
    g.closePath();
    g.fill();
    g.restore();
    g.fillStyle = "rgba(255,255,255,.9)";
    g.beginPath();
    g.moveTo(x0, y - 10);
    g.quadraticCurveTo(x0 - 30, y, x0, y + 10);
    g.fill();
    for (let k = 0; k < 9; k++) {
      sparkle(g, 20 + H(k, 1, 7) * 80, y - 34 + H(k, 2, 7) * 68, 3 + H(k, 3, 7) * 4, k % 2 ? "#ffd166" : "#ffffff");
    }
    // body
    const bgd = g.createLinearGradient(0, y - 30, 0, y + 30);
    bgd.addColorStop(0, "#f4f6fa");
    bgd.addColorStop(0.45, "#b7bfcc");
    bgd.addColorStop(1, "#565e6e");
    const body = () => {
      g.beginPath();
      g.moveTo(x0, y - 22);
      g.lineTo(x0 + 18, y - 30);
      g.lineTo(x1, y - 30);
      g.lineTo(x1, y + 30);
      g.lineTo(x0 + 18, y + 30);
      g.lineTo(x0, y + 22);
      g.closePath();
    };
    body();
    g.fillStyle = bgd;
    g.fill();
    outline(g, body, 4);
    g.fillStyle = "#e63946";
    g.fillRect(x0 + 40, y - 30, 14, 60);
    g.strokeStyle = "#141414";
    g.lineWidth = 3;
    g.strokeRect(x0 + 40, y - 30, 14, 60);
    shine(g, x1 - 40, y - 18, 26, 5, 0, 0.7);
    frames["gx-rocket"] = out;
    await breathe(); // (one picture per frame: no stutter)
  }

  // --- Comet (barrel): a glowing comet at the barrel's mouth with a long tail ---
  {
    const out = canvas(W, HH),
      g = out.getContext("2d");
    const hx = 508,
      hy = 142;
    for (const [dx, dy, w, a, col] of [
      [0, 0, 26, 0.9, "160,230,255"],
      [-6, 10, 14, 0.6, "180,140,255"],
      [4, -10, 12, 0.55, "120,200,255"],
    ]) {
      const tg = g.createLinearGradient(hx, hy, 360, 40 + dy);
      tg.addColorStop(0, `rgba(${col},${a})`);
      tg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = tg;
      g.beginPath();
      g.moveTo(hx - 4, hy - w / 2 + dy * 0.3);
      g.quadraticCurveTo(430, 70 + dy, 352 + dx, 34 + dy);
      g.quadraticCurveTo(420, 96 + dy, hx + 2, hy + w / 2 + dy * 0.3);
      g.closePath();
      g.fill();
    }
    stars(g, 18, 51, 360, 30, 120, 90, 2);
    g.save();
    g.shadowColor = "#7fe3ff";
    g.shadowBlur = 26;
    sphere(g, hx, hy, 19, [
      [0, "#ffffff"],
      [0.45, "#d6f6ff"],
      [1, "#2fa8ff"],
    ]);
    g.restore();
    outline(
      g,
      () => {
        g.beginPath();
        g.arc(hx, hy, 19, 0, 7);
      },
      3.5,
    );
    shine(g, hx - 6, hy - 7, 6, 3.5, -0.6, 0.9);
    frames["gx-comet"] = out;
    await breathe(); // (one picture per frame: no stutter)
  }

  // --- Ray Gun (barrel): glowing energy rings along the barrel and a charged tip ---
  {
    const out = canvas(W, HH),
      g = out.getContext("2d");
    const ax = 330,
      ay = 190,
      bx = 486,
      by = 147,
      ang = Math.atan2(by - ay, bx - ax);
    for (const t of [0.45, 0.66, 0.87]) {
      const x = mix(ax, bx, t),
        y = mix(ay, by, t);
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      g.shadowColor = "#3ef0ff";
      g.shadowBlur = 14;
      g.lineWidth = 7;
      g.strokeStyle = "#4ff3ff";
      g.beginPath();
      g.ellipse(0, 0, 8, 34, 0, 0, 7);
      g.stroke();
      g.shadowBlur = 0;
      g.lineWidth = 2;
      g.strokeStyle = "#ffffff";
      g.beginPath();
      g.ellipse(0, 0, 8, 34, 0, 0, 7);
      g.stroke();
      g.restore();
    }
    g.save();
    g.shadowColor = "#3ef0ff";
    g.shadowBlur = 30;
    sphere(g, bx + 12, by - 3, 14, [
      [0, "#ffffff"],
      [0.5, "#9ffcff"],
      [1, "#00b8d9"],
    ]);
    g.restore();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + 0.3;
      g.strokeStyle = "rgba(160,255,255,.9)";
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(bx + 12 + Math.cos(a) * 18, by - 3 + Math.sin(a) * 18);
      g.lineTo(bx + 12 + Math.cos(a) * 30, by - 3 + Math.sin(a) * 30);
      g.stroke();
    }
    frames["gx-raygun"] = out;
    await breathe(); // (one picture per frame: no stutter)
  }

  // --- Mini Earth (front): a little planet Earth on the front of the tank ---
  {
    const out = canvas(W, HH),
      g = out.getContext("2d");
    const cx = 396,
      cy = 262,
      r = 36;
    const t = canvas(W, HH),
      tg = t.getContext("2d"),
      id = tg.createImageData(W, HH),
      d = id.data;
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = (x - cx) / r,
          dy = (y - cy) / r,
          rr = dx * dx + dy * dy;
        if (rr > 1) {
          continue;
        }
        const z = Math.sqrt(1 - rr),
          lon = Math.atan2(dx, z),
          lat = Math.asin(dy);
        const n = fbm(lon * 2.2 + 3, lat * 2.2 + 5, 61),
          land = n > 0.52,
          ice = Math.abs(lat) > 1.15;
        let col = ice ? [240, 248, 255] : land ? (n > 0.62 ? [150, 120, 70] : [70, 170, 70]) : [30, 110, 220];
        const cloud = fbm(lon * 4 + 9, lat * 4 + 1, 71);
        if (cloud > 0.62) {
          col = col.map((v) => mix(v, 255, (cloud - 0.62) * 2.2));
        }
        const light = 0.35 + 0.65 * Math.max(0, -dx * 0.5 - dy * 0.6 + z * 0.62);
        const i = (y * W + x) * 4;
        d[i] = col[0] * light;
        d[i + 1] = col[1] * light;
        d[i + 2] = col[2] * light;
        d[i + 3] = 255;
      }
    }
    tg.putImageData(id, 0, 0);
    g.drawImage(glowUnder(t, "#5ab8ff", 8, 0.7), 0, 0);
    outline(
      g,
      () => {
        g.beginPath();
        g.arc(cx, cy, r, 0, 7);
      },
      3.5,
    );
    shine(g, cx - 12, cy - 14, 9, 5, -0.6, 0.6);
    frames["gx-earth"] = out;
    await breathe(); // (one picture per frame: no stutter)
  }

  // --- Shooting Star (front): a golden star with a rainbow trail streaming off to the right ---
  {
    const out = canvas(W, HH),
      g = out.getContext("2d");
    const cx = 392,
      cy = 262,
      R = 34,
      r2 = 15;
    [
      ["#ff5d8f", -11],
      ["#ffd23f", 0],
      ["#5ee0ff", 11],
    ].forEach(([col, off]) => {
      const gr = g.createLinearGradient(cx, cy, 610, 196);
      gr.addColorStop(0, col);
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.strokeStyle = gr;
      g.lineWidth = 10;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(cx + 12, cy + off * 0.8);
      g.quadraticCurveTo(510, cy + off - 12, 610, 196 + off);
      g.stroke();
    });
    const starPath = () => {
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5 - 0.25,
          rr = k % 2 ? r2 : R;
        g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      g.closePath();
    };
    g.save();
    g.shadowColor = "#ffd23f";
    g.shadowBlur = 22;
    starPath();
    const sg = g.createRadialGradient(cx - 8, cy - 10, 2, cx, cy, R);
    sg.addColorStop(0, "#fffbe0");
    sg.addColorStop(0.45, "#ffd84a");
    sg.addColorStop(1, "#e59a0b");
    g.fillStyle = sg;
    g.fill();
    g.restore();
    outline(g, starPath, 3.5);
    shine(g, cx - 8, cy - 12, 7, 3.5, -0.6, 0.85);
    sparkle(g, 520, 240, 7);
    sparkle(g, 585, 206, 5, "#ffe9a6");
    sparkle(g, 470, 226, 4);
    frames["gx-shootingstar"] = out;
    await breathe(); // (one picture per frame: no stutter)
  }

  // --- pattern paints (400x240 tiles, stretched over a tank part) ---
  const patterns = {};
  const tile = (fn) => {
    const c = canvas(400, 240),
      g = c.getContext("2d");
    fn(g, 400, 240);
    return c;
  };
  const field = (g, w, h, colourAt) => {
    const id = g.createImageData(w, h),
      d = id.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const [r, gg, b] = colourAt(x, y);
        const i = (y * w + x) * 4;
        d[i] = r;
        d[i + 1] = gg;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    }
    g.putImageData(id, 0, 0);
  };
  await breathe();
  patterns["gx-nebula"] = tile((g, w, h) => {
    const ramp = rampF([
      [0, "#0b0420"],
      [0.35, "#2a0d5c"],
      [0.55, "#7a22c4"],
      [0.7, "#e0409f"],
      [0.85, "#58c8f5"],
      [1, "#f2fbff"],
    ]);
    field(g, w, h, (x, y) => ramp(Math.pow(fbm(x / 70, y / 70, 3), 1.6) * 1.55));
    stars(g, 170, 5, 0, 0, w, h, 1.8);
  });
  await breathe();
  patterns["gx-starfield"] = tile((g, w, h) => {
    const ramp = rampF([
      [0, "#03040d"],
      [0.6, "#0d1233"],
      [1, "#26306b"],
    ]);
    field(g, w, h, (x, y) => ramp(fbm(x / 120, y / 120, 9)));
    stars(g, 360, 9, 0, 0, w, h, 2.4);
    [
      ["#9ad7ff", 120, 80],
      ["#ffd27a", 280, 150],
      ["#ff8fd1", 210, 190],
      ["#ffffff", 300, 60],
      ["#ffffff", 60, 170],
    ].forEach(([c, x, y]) => sparkle(g, x, y, 7, c));
  });
  await breathe();
  patterns["gx-blackhole"] = tile((g, w, h) => {
    const cx = w / 2,
      cy = h / 2;
    field(g, w, h, (x, y) => {
      const dx = x - cx,
        dy = (y - cy) * 1.25,
        d = Math.hypot(dx, dy),
        a = Math.atan2(dy, dx);
      const sw = Math.sin(a * 3 + d * 0.06) * 0.5 + 0.5,
        ring = Math.exp(-Math.pow((d - 60) / 26, 2));
      const v = ring * (0.6 + 0.4 * sw);
      const c = rampF([
        [0, "#000000"],
        [0.3, "#3b0f6b"],
        [0.6, "#ff6a2b"],
        [0.85, "#ffd98a"],
        [1, "#ffffff"],
      ])(v);
      return d < 34 ? [0, 0, 0] : c;
    });
    stars(g, 120, 13, 0, 0, w, h, 1.6, 0.8);
  });
  await breathe();
  patterns["gx-aurora"] = tile((g, w, h) => {
    const ramp = rampF([
      [0, "#020a14"],
      [0.3, "#05243a"],
      [0.55, "#0fd39a"],
      [0.75, "#7affd3"],
      [0.9, "#b78bff"],
      [1, "#f5e9ff"],
    ]);
    field(g, w, h, (x, y) => {
      const wave = Math.sin(x / 38 + fbm(x / 90, y / 90, 17) * 4) * 26;
      const band =
        Math.exp(-Math.pow((y - 110 - wave) / 34, 2)) + 0.6 * Math.exp(-Math.pow((y - 50 - wave * 0.6) / 18, 2));
      return ramp(Math.min(1, band * (0.6 + 0.6 * fbm(x / 30, y / 60, 19))));
    });
    stars(g, 90, 21, 0, 0, w, h, 1.4, 0.8);
  });
  await breathe();
  patterns["gx-cosmicdust"] = tile((g, w, h) => {
    const ramp = rampF([
      [0, "#1c0614"],
      [0.35, "#5c1638"],
      [0.55, "#d1477a"],
      [0.72, "#ffb36b"],
      [0.88, "#ffe6b0"],
      [1, "#ffffff"],
    ]);
    field(g, w, h, (x, y) => ramp(Math.pow(fbm(x / 55 + 7, y / 55, 23), 1.4) * 1.5));
    for (let k = 0; k < 220; k++) {
      g.fillStyle = `rgba(255,${200 + H(k, 9, 3) * 55},${150 + H(k, 8, 3) * 100},${0.4 + H(k, 7, 3) * 0.6})`;
      g.beginPath();
      g.arc(H(k, 1, 27) * w, H(k, 2, 27) * h, 0.6 + H(k, 3, 27) * 1.6, 0, 7);
      g.fill();
    }
  });
  await breathe();
  patterns["gx-supernova"] = tile((g, w, h) => {
    const cx = w * 0.45,
      cy = h * 0.5;
    field(g, w, h, (x, y) => {
      const dx = x - cx,
        dy = y - cy,
        d = Math.hypot(dx, dy),
        a = Math.atan2(dy, dx);
      const rays = 0.5 + 0.5 * Math.sin(a * 14 + fbm(a, d / 60, 33) * 6);
      const v = Math.max(0, 1 - d / 230) * (0.65 + 0.35 * rays);
      return rampF([
        [0, "#12001f"],
        [0.25, "#7a0f5c"],
        [0.5, "#ff3d6e"],
        [0.7, "#ff9a3c"],
        [0.85, "#fff0a8"],
        [1, "#ffffff"],
      ])(v);
    });
    stars(g, 80, 37, 0, 0, w, h, 1.6);
  });
  await breathe();
  patterns["gx-mars"] = tile((g, w, h) => {
    const ramp = rampF([
      [0, "#3a0f06"],
      [0.35, "#7d2a12"],
      [0.6, "#b9542a"],
      [0.8, "#e08a52"],
      [1, "#f6c79a"],
    ]);
    field(g, w, h, (x, y) => ramp(fbm(x / 45, y / 45, 41) * 1.1));
    for (let k = 0; k < 14; k++) {
      const x = H(k, 1, 43) * w,
        y = H(k, 2, 43) * h,
        r = 6 + H(k, 3, 43) * 16;
      g.fillStyle = "rgba(60,15,5,.35)";
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
      g.strokeStyle = "rgba(255,210,170,.35)";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x + 1.5, y + 1.5, r, Math.PI * 0.1, Math.PI * 0.9);
      g.stroke();
    }
  });

  return { frames, patterns };
}

// Arsenal rewards (weapon mastery + Dimitri streak) and the black-hole Galaxy box.
// All accessory art is drawn in the game's 640x384 tank-icon frame.
export function drawArsenalItem(key, imgs) {
  const W = 640,
    H = 384,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.lineJoin = "round";
  g.lineCap = "round";
  const ink = (path, w = 3.5) => {
    g.save();
    g.lineWidth = w;
    g.strokeStyle = "#141414";
    path();
    g.stroke();
    g.restore();
  };
  const shine = (x, y, rx, ry, rot, a = 0.8) => {
    g.save();
    g.fillStyle = `rgba(255,255,255,${a})`;
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, 7);
    g.fill();
    g.restore();
  };
  const lin = (x0, y0, x1, y1, stops) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([p, col]) => gr.addColorStop(p, col));
    return gr;
  };
  const GOLD = [
    [0, "#fff6c2"],
    [0.35, "#ffd34d"],
    [0.7, "#c98a12"],
    [1, "#7a4a05"],
  ];
  if (key === "laser-halo") {
    // a glowing green ring floating above the turret
    const cx = 282,
      cy = 108,
      rx = 74,
      ry = 19;
    for (const [w, col, blur] of [
      [16, "rgba(60,255,120,.35)", 26],
      [9, "#3dff7a", 14],
      [3.5, "#eaffef", 0],
    ]) {
      g.save();
      g.shadowColor = "#3dff7a";
      g.shadowBlur = blur;
      g.lineWidth = w;
      g.strokeStyle = col;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, 7);
      g.stroke();
      g.restore();
    }
    for (let k = 0; k < 5; k++) {
      const a = k * 1.3 + 0.4;
      g.fillStyle = "rgba(200,255,210,.9)";
      g.beginPath();
      g.arc(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 2.5, 0, 7);
      g.fill();
    }
  } else if (key === "gold-rocket") {
    // golden jet booster on the back
    const y = 262,
      x1 = 200,
      x0 = 110;
    const fl = lin(x0, 0, 0, 0, [
      [0, "#ffffff"],
      [0.2, "#fff27a"],
      [0.5, "#ff8a1c"],
      [0.8, "rgba(255,40,80,.6)"],
      [1, "rgba(255,40,80,0)"],
    ]);
    g.save();
    g.shadowColor = "#ffb21c";
    g.shadowBlur = 26;
    g.fillStyle = fl;
    g.beginPath();
    g.moveTo(x0 + 4, y - 24);
    g.quadraticCurveTo(x0 - 54, y - 30, 2, y);
    g.quadraticCurveTo(x0 - 54, y + 30, x0 + 4, y + 24);
    g.closePath();
    g.fill();
    g.restore();
    const body = () => {
      g.beginPath();
      g.moveTo(x0, y - 22);
      g.lineTo(x0 + 18, y - 30);
      g.lineTo(x1, y - 30);
      g.lineTo(x1, y + 30);
      g.lineTo(x0 + 18, y + 30);
      g.lineTo(x0, y + 22);
      g.closePath();
    };
    body();
    g.fillStyle = lin(0, y - 30, 0, y + 30, GOLD);
    g.fill();
    ink(body, 4);
    for (const x of [x0 + 34, x0 + 60]) {
      g.fillStyle = lin(0, y - 30, 0, y + 30, [
        [0, "#ffffff"],
        [0.5, "#c9ccd4"],
        [1, "#6b6f78"],
      ]);
      g.fillRect(x, y - 30, 10, 60);
      g.lineWidth = 3;
      g.strokeStyle = "#141414";
      g.strokeRect(x, y - 30, 10, 60);
    }
    shine(x1 - 34, y - 18, 22, 5, 0, 0.8);
  } else if (key === "spike-mine") {
    // a spiked naval-style mine behind the tank, with a red light
    const cx = 118,
      cy = 112,
      r = 44;
    for (let k = 0; k < 10; k++) {
      const a = (k * Math.PI) / 5 + 0.15,
        ca = Math.cos(a),
        sa = Math.sin(a);
      const tip = [cx + ca * (r + 26), cy + sa * (r + 26)],
        b1 = [cx + Math.cos(a - 0.17) * (r - 4), cy + Math.sin(a - 0.17) * (r - 4)],
        b2 = [cx + Math.cos(a + 0.17) * (r - 4), cy + Math.sin(a + 0.17) * (r - 4)];
      const sp = () => {
        g.beginPath();
        g.moveTo(...b1);
        g.lineTo(...tip);
        g.lineTo(...b2);
        g.closePath();
      };
      sp();
      g.fillStyle = lin(b1[0], b1[1], tip[0], tip[1], [
        [0, "#5a606b"],
        [1, "#d7dbe3"],
      ]);
      g.fill();
      ink(sp, 3);
    }
    const gr = g.createRadialGradient(cx - 14, cy - 16, 4, cx, cy, r);
    gr.addColorStop(0, "#8f96a3");
    gr.addColorStop(0.6, "#3a3f49");
    gr.addColorStop(1, "#14161b");
    g.beginPath();
    g.arc(cx, cy, r, 0, 7);
    g.fillStyle = gr;
    g.fill();
    ink(() => {
      g.beginPath();
      g.arc(cx, cy, r, 0, 7);
    }, 4);
    g.strokeStyle = "rgba(255,255,255,.15)";
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(cx, cy, r - 2, 10, 0, 0, 7);
    g.stroke();
    g.save();
    g.shadowColor = "#ff2a2a";
    g.shadowBlur = 18;
    g.fillStyle = "#ff3b3b";
    g.beginPath();
    g.arc(cx, cy - 6, 9, 0, 7);
    g.fill();
    g.restore();
    ink(() => {
      g.beginPath();
      g.arc(cx, cy - 6, 9, 0, 7);
    }, 2.5);
    shine(cx - 16, cy - 20, 10, 5, -0.6, 0.6);
    shine(cx - 3, cy - 10, 3, 2, 0, 0.9);
  } else if (key === "gold-gatling") {
    // a golden rotary barrel cluster on the end of the barrel
    const mx = 484,
      my = 148,
      ang = Math.atan2(148 - 190, 486 - 330);
    g.save();
    g.translate(mx, my);
    g.rotate(ang);
    const len = 46,
      rad = 30;
    const sleeve = () => {
      g.beginPath();
      g.moveTo(-6, -rad);
      g.lineTo(len, -rad);
      g.ellipse(len, 0, 9, rad, 0, -Math.PI / 2, Math.PI / 2);
      g.lineTo(-6, rad);
      g.ellipse(-6, 0, 9, rad, 0, Math.PI / 2, Math.PI * 1.5, true);
      g.closePath();
    };
    sleeve();
    g.fillStyle = lin(0, -rad, 0, rad, GOLD);
    g.fill();
    ink(sleeve, 4);
    g.fillStyle = "rgba(122,74,5,.6)";
    for (const x of [10, 26]) {
      g.fillRect(x, -rad, 4, rad * 2);
    }
    g.beginPath();
    g.ellipse(len, 0, 9, rad, 0, 0, 7);
    g.fillStyle = "#b8860b";
    g.fill();
    ink(() => {
      g.beginPath();
      g.ellipse(len, 0, 9, rad, 0, 0, 7);
    }, 3);
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      g.beginPath();
      g.ellipse(len + Math.cos(a) * 3, Math.sin(a) * rad * 0.62, 3.2, 6.5, 0, 0, 7);
      g.fillStyle = "#1a1205";
      g.fill();
    }
    g.restore();
    shine(mx + 10, my - 24, 16, 4, ang, 0.8);
  } else if (key === "shell-belt") {
    // a bandolier of shotgun shells across the front of the tank
    const pts = [
      [318, 236],
      [352, 252],
      [388, 262],
      [424, 266],
      [458, 262],
    ];
    g.save();
    g.lineWidth = 18;
    g.strokeStyle = "#141414";
    g.beginPath();
    g.moveTo(300, 226);
    g.quadraticCurveTo(390, 280, 476, 256);
    g.stroke();
    g.lineWidth = 12;
    g.strokeStyle = lin(300, 0, 476, 0, [
      [0, "#6b3a17"],
      [0.5, "#a0612b"],
      [1, "#6b3a17"],
    ]);
    g.stroke();
    g.restore();
    pts.forEach(([x, y], k) => {
      const a = -0.15 + k * 0.08;
      g.save();
      g.translate(x, y - 14);
      g.rotate(a);
      const body = () => {
        g.beginPath();
        g.roundRect(-9, -22, 18, 34, 4);
      };
      body();
      g.fillStyle = lin(-9, 0, 9, 0, [
        [0, "#7a0d14"],
        [0.45, "#e63946"],
        [1, "#7a0d14"],
      ]);
      g.fill();
      ink(body, 3);
      const cap = () => {
        g.beginPath();
        g.roundRect(-10, 10, 20, 11, 3);
      };
      cap();
      g.fillStyle = lin(-10, 0, 10, 0, GOLD);
      g.fill();
      ink(cap, 3);
      shine(-3, -12, 2.5, 7, 0, 0.6);
      g.restore();
    });
  } else if (key === "dimitri-tache") {
    // the Rainbow box's moustache, in Dimitri's dark brown (keeps the game's shading)
    const im = imgs && imgs.tache;
    if (im) {
      g.drawImage(im, 0, 0, W, H);
      const id = g.getImageData(0, 0, W, H),
        d = id.data;
      const ramp = [
        [0, [20, 10, 4]],
        [0.35, [58, 30, 12]],
        [0.65, [120, 70, 34]],
        [0.85, [176, 118, 68]],
        [1, [236, 196, 150]],
      ];
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) {
          continue;
        }
        const L = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
        if (L < 0.12) {
          continue;
        } // keep the outline
        let k = 1;
        while (k < ramp.length - 1 && L > ramp[k][0]) {
          k++;
        }
        const [p0, c0] = ramp[k - 1],
          [p1, c1] = ramp[k],
          t = Math.max(0, Math.min(1, (L - p0) / (p1 - p0)));
        d[i] = c0[0] + (c1[0] - c0[0]) * t;
        d[i + 1] = c0[1] + (c1[1] - c0[1]) * t;
        d[i + 2] = c0[2] + (c1[2] - c0[2]) * t;
      }
      g.putImageData(id, 0, 0);
    }
  }
  return c;
}

// Galaxy box: an actual black hole instead of a box. Closed = calm swirl, open = it flares with light.
export function drawBlackHoleBox() {
  const c = document.createElement("canvas");
  c.width = 560;
  c.height = 280;
  const g = c.getContext("2d");
  const H = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const frame = (ox, open) => {
    const cx = ox + 140,
      cy = 190,
      r = open ? 48 : 44; // (sits as low as the game's own boxes)
    g.save();
    g.beginPath();
    g.rect(ox, 0, 280, 280);
    g.clip();
    // glow and light bending around it
    const halo = g.createRadialGradient(cx, cy, r, cx, cy, open ? 135 : 110);
    halo.addColorStop(0, open ? "rgba(255,200,120,.75)" : "rgba(150,80,255,.55)");
    halo.addColorStop(0.5, open ? "rgba(190,90,255,.35)" : "rgba(90,40,200,.25)");
    halo.addColorStop(1, "rgba(60,20,140,0)");
    g.fillStyle = halo;
    g.fillRect(ox, 0, 280, 280);
    for (let k = 0; k < (open ? 70 : 40); k++) {
      // stars pulled into arcs
      const a = H(k, 1, 5) * Math.PI * 2,
        d = r + 14 + H(k, 2, 5) * (open ? 110 : 90),
        len = 0.08 + H(k, 3, 5) * 0.25;
      g.strokeStyle = `rgba(255,255,255,${0.35 + H(k, 4, 5) * 0.6})`;
      g.lineWidth = 1 + H(k, 6, 5) * 1.6;
      g.beginPath();
      g.ellipse(cx, cy, d, d * 0.55, -0.35, a, a + len);
      g.stroke();
    }
    const disk = (front) => {
      g.save();
      g.translate(cx, cy);
      g.rotate(-0.35);
      const gr = g.createLinearGradient(-r * 2.6, 0, r * 2.6, 0);
      gr.addColorStop(0, "rgba(123,44,255,0)");
      gr.addColorStop(0.18, "#7b2cff");
      gr.addColorStop(0.42, "#ff8a3d");
      gr.addColorStop(0.52, "#fff3c4");
      gr.addColorStop(0.7, "#ff4fa3");
      gr.addColorStop(1, "rgba(123,44,255,0)");
      g.shadowColor = "#ff9d4d";
      g.shadowBlur = open ? 30 : 18;
      for (const [w, a] of [
        [open ? 30 : 24, 0.9],
        [8, 1],
      ]) {
        g.globalAlpha = a;
        g.lineWidth = w;
        g.strokeStyle = w === 8 ? "rgba(255,255,255,.85)" : gr;
        g.beginPath();
        g.ellipse(0, 0, r * 2.6, r * 0.6, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        g.stroke();
      }
      g.restore();
    };
    disk(false);
    g.save();
    g.shadowColor = "#ffb46b";
    g.shadowBlur = 20;
    g.lineWidth = 10;
    const ag = g.createLinearGradient(cx - r, cy - r, cx + r, cy);
    ag.addColorStop(0, "#ff7ac8");
    ag.addColorStop(0.5, "#ffe9b0");
    ag.addColorStop(1, "#ff8a3d");
    g.strokeStyle = ag;
    g.beginPath();
    g.arc(cx, cy, r * 1.2, Math.PI * 1.02, Math.PI * 1.98);
    g.stroke();
    g.restore();
    g.beginPath();
    g.arc(cx, cy, r, 0, 7);
    g.fillStyle = "#000";
    g.fill();
    g.save();
    g.lineWidth = 3;
    g.strokeStyle = "#ffe2a8";
    g.shadowColor = "#ffcf7a";
    g.shadowBlur = 14;
    g.beginPath();
    g.arc(cx, cy, r + 1, 0, 7);
    g.stroke();
    g.restore();
    disk(true);
    if (open) {
      // a burst of light from the centre
      g.save();
      g.globalCompositeOperation = "lighter";
      for (let k = 0; k < 12; k++) {
        const a = -Math.PI / 2 + (k - 5.5) * 0.17,
          l = 90 + H(k, 9, 7) * 40;
        const gr = g.createLinearGradient(cx, cy, cx + Math.cos(a) * l, cy + Math.sin(a) * l);
        gr.addColorStop(0, "rgba(255,240,200,.85)");
        gr.addColorStop(1, "rgba(200,120,255,0)");
        g.strokeStyle = gr;
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l);
        g.stroke();
      }
      const core = g.createRadialGradient(cx, cy, 0, cx, cy, r * 0.9);
      core.addColorStop(0, "rgba(255,255,255,.95)");
      core.addColorStop(0.5, "rgba(255,220,160,.5)");
      core.addColorStop(1, "rgba(255,160,100,0)");
      g.fillStyle = core;
      g.beginPath();
      g.arc(cx, cy, r * 0.9, 0, 7);
      g.fill();
      g.restore();
      for (let k = 0; k < 14; k++) {
        const a = H(k, 1, 11) * Math.PI * 2,
          d = 30 + H(k, 2, 11) * 100;
        g.fillStyle = k % 2 ? "#fff3c4" : "#d9b3ff";
        g.beginPath();
        g.arc(cx + Math.cos(a) * d, cy - Math.abs(Math.sin(a)) * d * 0.9, 1.5 + H(k, 3, 11) * 2.5, 0, 7);
        g.fill();
      }
    }
    g.restore();
  };
  frame(0, false);
  frame(280, true);
  return c;
}

// Extra pattern paints (400x240 tiles, stretched over a tank part like the game's own pattern paints).
export function buildPaintPatterns() {
  const H = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const mix = (a, b, t) => a + (b - a) * t;
  const hexc = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rampF = (stops) => {
    stops = stops.map(([p, c]) => [p, hexc(c)]);
    return (t) => {
      t = Math.max(0, Math.min(1, t));
      for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i][0]) {
          const [p0, c0] = stops[i - 1],
            [p1, c1] = stops[i],
            k = (t - p0) / (p1 - p0 || 1);
          return [mix(c0[0], c1[0], k), mix(c0[1], c1[1], k), mix(c0[2], c1[2], k)];
        }
      }
      return stops[stops.length - 1][1];
    };
  };
  const noise2 = (x, y, s) => {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      xf = x - xi,
      yf = y - yi,
      sm = (t) => t * t * (3 - 2 * t);
    return mix(
      mix(H(xi, yi, s), H(xi + 1, yi, s), sm(xf)),
      mix(H(xi, yi + 1, s), H(xi + 1, yi + 1, s), sm(xf)),
      sm(yf),
    );
  };
  const fbm = (x, y, s) =>
    0.5 * noise2(x, y, s) +
    0.25 * noise2(x * 2, y * 2, s + 1) +
    0.125 * noise2(x * 4, y * 4, s + 2) +
    0.125 * noise2(x * 8, y * 8, s + 3);
  const W = 400,
    HH = 240;
  const tile = (fn) => ({ __lazy: fn }); // each paint is drawn the first time it is used, not all at once (no stutter while the page loads)
  const tileNow = (fn) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = HH;
    const g = c.getContext("2d");
    fn(g);
    return c;
  };
  const field = (g, colourAt) => {
    const id = g.createImageData(W, HH),
      d = id.data;
    for (let y = 0; y < HH; y++) {
      for (let x = 0; x < W; x++) {
        const [r, gg, b] = colourAt(x, y);
        const i = (y * W + x) * 4;
        d[i] = r;
        d[i + 1] = gg;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    }
    g.putImageData(id, 0, 0);
  };
  const hsl = (h, s, l) => {
    const c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = l - c / 2;
    const [r, g, b] =
      h < 60
        ? [c, x, 0]
        : h < 120
          ? [x, c, 0]
          : h < 180
            ? [0, c, x]
            : h < 240
              ? [0, x, c]
              : h < 300
                ? [x, 0, c]
                : [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  };
  const P = {};
  // --- Elements ---
  P["pt-lava"] = tile((g) => {
    const r = rampF([
      [0, "#1a0400"],
      [0.35, "#3d0a02"],
      [0.5, "#a51b00"],
      [0.62, "#ff5a00"],
      [0.78, "#ffb300"],
      [1, "#fff3a0"],
    ]);
    field(g, (x, y) => {
      const n = fbm(x / 60, y / 60, 3),
        cracks = Math.abs(fbm(x / 35 + 9, y / 35, 5) - 0.5);
      return r(Math.min(1, n * 0.6 + Math.max(0, 0.09 - cracks) * 8));
    });
  });
  P["pt-ocean"] = tile((g) => {
    const r = rampF([
      [0, "#021b3a"],
      [0.4, "#04508c"],
      [0.65, "#0a8fd1"],
      [0.85, "#5fd6ff"],
      [1, "#e8fbff"],
    ]);
    field(g, (x, y) => {
      const w = Math.sin(x / 22 + fbm(x / 80, y / 80, 7) * 6) * 0.5 + 0.5;
      const caust = Math.pow(1 - Math.abs(fbm(x / 26, y / 26, 9) - 0.5) * 2, 6);
      return r(0.35 + w * 0.25 + caust * 0.5);
    });
  });
  P["pt-ice"] = tile((g) => {
    const r = rampF([
      [0, "#5a8fb8"],
      [0.4, "#9cc9ec"],
      [0.7, "#d7efff"],
      [1, "#ffffff"],
    ]);
    field(g, (x, y) => {
      const n = fbm(x / 50, y / 50, 11),
        crack = Math.abs(fbm(x / 28, y / 28, 13) - 0.5) < 0.02 ? 0.35 : 0;
      return r(n * 0.9 + 0.15 - crack);
    });
    g.globalAlpha = 0.5;
    g.strokeStyle = "#ffffff";
    g.lineWidth = 2;
    for (let k = 0; k < 12; k++) {
      g.beginPath();
      g.moveTo(H(k, 1, 4) * W, H(k, 2, 4) * HH);
      g.lineTo(H(k, 3, 4) * W, H(k, 4, 4) * HH);
      g.stroke();
    }
  });
  P["pt-toxic"] = tile((g) => {
    const r = rampF([
      [0, "#0b1a03"],
      [0.4, "#2c5b06"],
      [0.6, "#5fd40a"],
      [0.8, "#b6ff3b"],
      [1, "#f1ffc4"],
    ]);
    field(g, (x, y) => r(Math.pow(fbm(x / 45, y / 45, 15), 1.3) * 1.35));
    for (let k = 0; k < 40; k++) {
      const x = H(k, 1, 6) * W,
        y = H(k, 2, 6) * HH,
        rr = 3 + H(k, 3, 6) * 9;
      g.fillStyle = "rgba(210,255,120,.55)";
      g.beginPath();
      g.arc(x, y, rr, 0, 7);
      g.fill();
      g.fillStyle = "rgba(255,255,255,.7)";
      g.beginPath();
      g.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.25, 0, 7);
      g.fill();
    }
  });
  P["pt-thunder"] = tile((g) => {
    const r = rampF([
      [0, "#0a0620"],
      [0.5, "#2a1f66"],
      [1, "#5a50b0"],
    ]);
    field(g, (x, y) => r(fbm(x / 70, y / 70, 17)));
    g.lineCap = "round";
    for (let k = 0; k < 5; k++) {
      let x = H(k, 1, 8) * W,
        y = 0;
      g.beginPath();
      g.moveTo(x, y);
      while (y < HH) {
        x += (H(k, y, 9) - 0.5) * 50;
        y += 14 + H(k, y, 10) * 18;
        g.lineTo(x, y);
      }
      g.save();
      g.shadowColor = "#bfe6ff";
      g.shadowBlur = 14;
      g.strokeStyle = "#e8f6ff";
      g.lineWidth = 3;
      g.stroke();
      g.restore();
    }
  });
  // --- Materials ---
  P["pt-carbon"] = tile((g) => {
    for (let y = 0; y < HH; y += 8) {
      for (let x = 0; x < W; x += 8) {
        const odd = ((x + y) / 8) % 2;
        const gr = g.createLinearGradient(x, y, x + (odd ? 8 : 0), y + (odd ? 0 : 8));
        gr.addColorStop(0, "#0b0b0d");
        gr.addColorStop(0.5, "#3a3d44");
        gr.addColorStop(1, "#0b0b0d");
        g.fillStyle = gr;
        g.fillRect(x, y, 8, 8);
      }
    }
    const sh = g.createLinearGradient(0, 0, W, HH);
    sh.addColorStop(0, "rgba(255,255,255,0)");
    sh.addColorStop(0.45, "rgba(255,255,255,.18)");
    sh.addColorStop(0.55, "rgba(255,255,255,0)");
    g.fillStyle = sh;
    g.fillRect(0, 0, W, HH);
  });
  P["pt-marble"] = tile((g) => {
    const r = rampF([
      [0, "#6f6a66"],
      [0.08, "#b9b3ad"],
      [0.25, "#efece8"],
      [1, "#ffffff"],
    ]);
    field(g, (x, y) => {
      const v = Math.abs(Math.sin((x + y * 0.6) / 30 + fbm(x / 60, y / 60, 19) * 7));
      return r(v);
    });
  });
  P["pt-wood"] = tile((g) => {
    const r = rampF([
      [0, "#4a2a12"],
      [0.4, "#7a4a22"],
      [0.7, "#a86c36"],
      [1, "#d39a5c"],
    ]);
    field(g, (x, y) => {
      const ring = Math.sin((y + fbm(x / 120, y / 40, 21) * 60) / 6) * 0.5 + 0.5;
      return r(ring * 0.7 + fbm(x / 8, y / 80, 23) * 0.3);
    });
  });
  P["pt-goldfoil"] = tile((g) => {
    const r = rampF([
      [0, "#6b4300"],
      [0.35, "#b77b0c"],
      [0.6, "#f2c142"],
      [0.82, "#fff0a6"],
      [1, "#ffffff"],
    ]);
    field(g, (x, y) =>
      r(0.25 + fbm(x / 22, y / 22, 25) * 0.55 + Math.pow(Math.max(0, Math.sin((x - y) / 40)), 12) * 0.4),
    );
  });
  P["pt-chrome"] = tile((g) => {
    const r = rampF([
      [0, "#2b2f36"],
      [0.3, "#7b8390"],
      [0.48, "#f4f7fb"],
      [0.55, "#9aa3b0"],
      [0.75, "#d9dee6"],
      [1, "#ffffff"],
    ]);
    field(g, (x, y) => r((y / HH) * 0.9 + Math.sin(x / 50) * 0.05 + fbm(x / 200, y / 30, 27) * 0.1));
  });
  // --- Holo ---
  P["pt-holo"] = tile((g) =>
    field(g, (x, y) => {
      const h = ((x + y) * 0.9 + fbm(x / 80, y / 80, 31) * 220) % 360;
      return hsl(h, 0.85, 0.72);
    }),
  );
  P["pt-opal"] = tile((g) =>
    field(g, (x, y) => {
      const n = fbm(x / 40, y / 40, 33),
        h = (190 + n * 220) % 360;
      return hsl(h, 0.55, 0.8 + (fbm(x / 15, y / 15, 35) - 0.5) * 0.2);
    }),
  );
  P["pt-rainbow"] = tile((g) => {
    for (let k = 0; k < 7; k++) {
      g.fillStyle = ["#ff3b3b", "#ff9d1c", "#ffe23b", "#3bd14a", "#2fa8ff", "#5b4bff", "#b23bff"][k];
      g.fillRect(0, (k * HH) / 7, W, HH / 7 + 1);
    }
  });
  P["pt-sunset"] = tile((g) => {
    const gr = g.createLinearGradient(0, 0, 0, HH);
    gr.addColorStop(0, "#2b1055");
    gr.addColorStop(0.35, "#d53a9d");
    gr.addColorStop(0.65, "#ff8a3d");
    gr.addColorStop(1, "#ffd36b");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, HH);
    g.fillStyle = "rgba(255,240,180,.85)";
    g.beginPath();
    g.arc(W / 2, HH * 0.78, 48, 0, 7);
    g.fill();
  });
  P["pt-candy"] = tile((g) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, W, HH);
    g.save();
    g.translate(W / 2, HH / 2);
    g.rotate(-0.6);
    for (let x = -400; x < 400; x += 36) {
      g.fillStyle = "#ff2d55";
      g.fillRect(x, -400, 18, 800);
    }
    g.restore();
  });
  // --- Hacker (black and matrix green) ---
  const glyphs =
    "0123456789ABCDEF\uff71\uff72\uff73\uff74\uff75\uff76\uff77\uff78\uff79\uff7a\uff7b\uff7c\uff7d\uff7e\uff7f\uff80\uff81\uff82\uff83\uff84";
  const mono = (px) => "bold " + px + 'px Consolas, "MS Gothic", "Courier New", monospace';
  P["pt-coderain"] = tile((g) => {
    g.fillStyle = "#000400";
    g.fillRect(0, 0, W, HH);
    g.font = mono(14);
    g.textAlign = "center";
    for (let col = 0; col < W / 12; col++) {
      const x = col * 12 + 6,
        top = H(col, 1, 71) * HH,
        len = 6 + Math.floor(H(col, 2, 71) * 14);
      for (let k = 0; k < len; k++) {
        const y = (top + k * 15) % (HH + 15),
          head = k === len - 1;
        g.globalAlpha = head ? 1 : 0.15 + (0.7 * k) / len;
        g.fillStyle = head ? "#e0ffe6" : "#00ff41";
        g.shadowColor = "#00ff41";
        g.shadowBlur = head ? 8 : 3;
        g.fillText(glyphs[Math.floor(H(col, k, 72) * glyphs.length)], x, y);
      }
    }
    g.globalAlpha = 1;
    g.shadowBlur = 0;
  });
  P["pt-binary"] = tile((g) => {
    g.fillStyle = "#010a03";
    g.fillRect(0, 0, W, HH);
    g.font = mono(12);
    g.textBaseline = "top";
    for (let row = 0; row < HH / 13; row++) {
      for (let col = 0; col < W / 9; col++) {
        const v = H(col, row, 73);
        g.fillStyle = v > 0.93 ? "#b8ffc8" : "#00c832";
        g.globalAlpha = 0.35 + H(col, row, 74) * 0.55;
        g.fillText(v > 0.5 ? "1" : "0", col * 9 + 1, row * 13);
      }
    }
    g.globalAlpha = 1;
  });
  P["pt-terminal"] = tile((g) => {
    g.fillStyle = "#020803";
    g.fillRect(0, 0, W, HH);
    g.font = mono(12);
    g.textBaseline = "top";
    g.shadowColor = "#00ff41";
    g.shadowBlur = 4;
    const lines = [
      "root@tt:~# ./fire --all",
      "ACCESS GRANTED",
      "> bypass shield... [OK]",
      "0xDEADBEEF 0x7A4C",
      "ping maze.tt -c 3",
      "sudo bounce --angle 45",
      "[####------] 41%",
      "nmap -sV 10.0.0.7",
      "user: guest  uid=0(root)",
      "decrypt(payload)",
      "> tank.exe loaded",
      "chmod 777 /garage",
      "01001000 01001011",
      "while(1) shoot();",
      "trace: 3 hops OK",
      "kill -9 enemy_tank",
    ];
    for (let row = 0; row < HH / 15; row++) {
      g.fillStyle = H(row, 1, 75) > 0.8 ? "#c8ffd4" : "#00e63a";
      g.globalAlpha = 0.75;
      g.fillText(lines[(row * 7 + 3) % lines.length], 6, row * 15 + 2);
      g.fillText(lines[(row * 5 + 1) % lines.length], 206, row * 15 + 2);
    }
    g.globalAlpha = 1;
    g.shadowBlur = 0;
    g.fillStyle = "rgba(0,0,0,.28)";
    for (let y = 0; y < HH; y += 3) {
      g.fillRect(0, y, W, 1);
    }
  });
  P["pt-circuit"] = tile((g) => {
    g.fillStyle = "#010d04";
    g.fillRect(0, 0, W, HH);
    g.lineWidth = 2;
    g.lineCap = "round";
    g.strokeStyle = "#00b82e";
    g.fillStyle = "#7dff9c";
    g.shadowColor = "#00ff41";
    g.shadowBlur = 5;
    for (let k = 0; k < 60; k++) {
      let x = Math.round((H(k, 1, 76) * W) / 10) * 10,
        y = Math.round((H(k, 2, 76) * HH) / 10) * 10;
      g.beginPath();
      g.moveTo(x, y);
      for (let s2 = 0; s2 < 4; s2++) {
        const d2 = Math.floor(H(k, s2, 77) * 4),
          len = 10 + Math.floor(H(k, s2, 78) * 5) * 10;
        if (d2 === 0) {
          x += len;
        } else if (d2 === 1) {
          y += len;
        } else if (d2 === 2) {
          x += len;
          y += len;
        } else {
          y -= len;
        }
        g.lineTo(x, y);
      }
      g.stroke();
      g.beginPath();
      g.arc(x, y, 3.5, 0, 7);
      g.fill();
    }
    g.shadowBlur = 0;
  });
  P["pt-glitch"] = tile((g) => {
    g.fillStyle = "#000000";
    g.fillRect(0, 0, W, HH);
    for (let k = 0; k < 90; k++) {
      const y = H(k, 1, 79) * HH,
        h = 2 + H(k, 2, 79) * 14,
        x = H(k, 3, 79) * W,
        w = 20 + H(k, 4, 79) * 160;
      g.fillStyle = ["#00ff41", "#008f11", "#003b00", "#b8ffc8", "#0d2b12"][k % 5];
      g.globalAlpha = 0.4 + H(k, 5, 79) * 0.6;
      g.fillRect(x, y, w, h);
    }
    g.globalAlpha = 1;
    g.fillStyle = "rgba(0,0,0,.35)";
    for (let y = 0; y < HH; y += 2) {
      g.fillRect(0, y, W, 1);
    }
  });
  // --- Sakura (Japanese theme) ---
  P["pt-sakura"] = tile((g) => {
    const gr = g.createLinearGradient(0, 0, W, HH);
    gr.addColorStop(0, "#fff0f4");
    gr.addColorStop(1, "#ffc1d4");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, HH);
    for (let k = 0; k < 90; k++) {
      sakuraPetal(
        g,
        H(k, 1, 101) * W,
        H(k, 2, 101) * HH,
        7 + H(k, 3, 101) * 9,
        H(k, 4, 101) * 6.3,
        ["#ff9ab5", "#ffd1dc", "#ff7aa0", "#ffffff"][k % 4],
        "rgba(200,60,110,.25)",
      );
    }
    for (let k = 0; k < 9; k++) {
      sakuraFlower(g, H(k, 5, 102) * W, H(k, 6, 102) * HH, 16 + H(k, 7, 102) * 10, k, "#ffe4ec");
    }
  });
  P["pt-nightsakura"] = tile((g) => {
    const gr = g.createLinearGradient(0, 0, 0, HH);
    gr.addColorStop(0, "#120f2a");
    gr.addColorStop(1, "#2e2a5c");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, HH);
    for (let k = 0; k < 60; k++) {
      g.fillStyle = "rgba(255,255,255," + (0.3 + H(k, 9, 103) * 0.6) + ")";
      g.beginPath();
      g.arc(H(k, 7, 103) * W, H(k, 8, 103) * HH, 0.6 + H(k, 6, 103) * 1.2, 0, 7);
      g.fill();
    }
    g.save();
    g.shadowColor = "#ff9ab5";
    g.shadowBlur = 8;
    for (let k = 0; k < 70; k++) {
      sakuraPetal(
        g,
        H(k, 1, 104) * W,
        H(k, 2, 104) * HH,
        6 + H(k, 3, 104) * 8,
        H(k, 4, 104) * 6.3,
        ["#ff9ab5", "#ffd1dc", "#ff7aa0"][k % 3],
      );
    }
    g.restore();
    for (let k = 0; k < 6; k++) {
      sakuraFlower(g, H(k, 5, 105) * W, H(k, 6, 105) * HH, 14 + H(k, 7, 105) * 8, k, "#ffd1dc");
    }
  });
  P["pt-seigaiha"] = tile((g) => {
    g.fillStyle = "#1d2c5e";
    g.fillRect(0, 0, W, HH);
    const r = 26;
    for (let row = -1; row < HH / (r / 2) + 2; row++) {
      for (let col = -1; col < W / (r * 2) + 2; col++) {
        const x = col * r * 2 + (row % 2 ? r : 0),
          y = (row * r) / 2;
        for (let k = 4; k >= 1; k--) {
          g.beginPath();
          g.arc(x, y + r, (r * k) / 4, Math.PI, 0);
          g.closePath();
          g.fillStyle = k % 2 ? "#2a4a8a" : "#f4f1ea";
          g.fill();
        }
      }
    }
  });
  P["pt-lacquer"] = tile((g) => {
    const gr = g.createLinearGradient(0, 0, W, HH);
    gr.addColorStop(0, "#5a0408");
    gr.addColorStop(0.45, "#c0141c");
    gr.addColorStop(0.55, "#e8343a");
    gr.addColorStop(1, "#6a0608");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, HH);
    for (let k = 0; k < 120; k++) {
      g.fillStyle = "rgba(255,214,120," + (0.4 + H(k, 3, 106) * 0.6) + ")";
      g.fillRect(H(k, 1, 106) * W, H(k, 2, 106) * HH, 1 + H(k, 4, 106) * 2.5, 1 + H(k, 5, 106) * 2.5);
    }
    g.globalAlpha = 0.25;
    g.fillStyle = "#fff";
    g.beginPath();
    g.ellipse(W * 0.3, HH * 0.3, 120, 18, -0.4, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  });
  P["pt-goldleaf"] = tile((g) => {
    g.fillStyle = "#ece0c4";
    g.fillRect(0, 0, W, HH);
    for (let k = 0; k < 400; k++) {
      g.fillStyle = "rgba(160,130,90,.08)";
      g.fillRect(H(k, 1, 107) * W, H(k, 2, 107) * HH, 1, 6 + H(k, 3, 107) * 14);
    } // washi fibres
    for (let k = 0; k < 26; k++) {
      const x = H(k, 4, 108) * W,
        y = H(k, 5, 108) * HH,
        sz = 14 + H(k, 6, 108) * 26;
      g.save();
      g.translate(x, y);
      g.rotate((H(k, 7, 108) - 0.5) * 0.4);
      const gr = g.createLinearGradient(-sz, -sz, sz, sz);
      gr.addColorStop(0, "#fff3b0");
      gr.addColorStop(0.5, "#d4a52a");
      gr.addColorStop(1, "#a87a10");
      g.fillStyle = gr;
      g.globalAlpha = 0.9;
      g.fillRect(-sz / 2, -sz / 2, sz, sz);
      g.restore();
    }
  });
  // --- Racing ---
  const shine = (g, a) => {
    const sh = g.createLinearGradient(0, 0, 0, HH);
    sh.addColorStop(0, "rgba(255,255,255," + a + ")");
    sh.addColorStop(0.42, "rgba(255,255,255,0)");
    sh.addColorStop(0.6, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(0,0,0," + a + ")");
    g.fillStyle = sh;
    g.fillRect(0, 0, W, HH);
  };
  P["pt-chequered"] = tile((g) => {
    const q = 30; // straight, even squares like a real flag, with a soft sheen
    for (let y = 0; y < HH; y += q) {
      for (let x = 0; x < W; x += q) {
        g.fillStyle = ((x + y) / q) & 1 ? "#141517" : "#f4f4f2";
        g.fillRect(x, y, q, q);
      }
    }
    shine(g, 0.18);
  });
  P["pt-stripes"] = tile((g) => {
    const gr = g.createLinearGradient(0, 0, 0, HH);
    gr.addColorStop(0, "#e83a3f");
    gr.addColorStop(0.5, "#c0141c");
    gr.addColorStop(1, "#7a0a10");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, HH);
    for (const [x, w] of [
      [150, 30],
      [214, 30],
    ]) {
      g.fillStyle = "#f7f7f5";
      g.fillRect(x, 0, w, HH);
      g.fillStyle = "rgba(0,0,0,.25)";
      g.fillRect(x + w, 0, 3, HH);
    }
    g.fillStyle = "#111";
    g.fillRect(146, 0, 3, HH);
    g.fillRect(210, 0, 3, HH);
    g.fillRect(244, 0, 3, HH);
    shine(g, 0.25);
  });
  P["pt-livery"] = tile((g) => {
    const gr = g.createLinearGradient(0, 0, W, HH);
    gr.addColorStop(0, "#0b2a6e");
    gr.addColorStop(1, "#2a6ae0");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, HH);
    const band = (x0, w, c) => {
      g.beginPath();
      g.moveTo(x0, HH);
      g.lineTo(x0 + 120, 0);
      g.lineTo(x0 + 120 + w, 0);
      g.lineTo(x0 + w, HH);
      g.closePath();
      g.fillStyle = c;
      g.fill();
    };
    band(150, 70, "#ff7a00");
    band(226, 16, "#ffd23a");
    band(248, 6, "#ffffff");
    band(-60, 30, "rgba(255,255,255,.15)");
    for (let k = 0; k < 16; k++) {
      g.fillStyle = "rgba(255,255,255," + (0.04 + H(k, 1, 301) * 0.1) + ")";
      g.fillRect(0, H(k, 2, 301) * HH, W, 1 + H(k, 3, 301) * 2);
    } // speed lines
    shine(g, 0.3);
  });
  P["pt-tyre"] = tile((g) => {
    const r = rampF([
      [0, "#121315"],
      [0.5, "#24262b"],
      [1, "#3a3d44"],
    ]);
    field(g, (x, y) => r(0.35 + fbm(x / 6, y / 6, 303) * 0.35));
    g.lineCap = "round";
    for (let y = -20; y < HH + 20; y += 30) {
      for (let x = -20; x < W + 20; x += 52) {
        g.strokeStyle = "#0a0a0b";
        g.lineWidth = 7;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 20, y + 14);
        g.lineTo(x + 40, y);
        g.stroke();
        g.strokeStyle = "rgba(255,255,255,.07)";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x, y - 4);
        g.lineTo(x + 20, y + 10);
        g.lineTo(x + 40, y - 4);
        g.stroke();
      }
    }
    g.fillStyle = "rgba(255,214,0,.85)";
    g.fillRect(0, 8, W, 5);
    g.fillRect(0, HH - 13, W, 5);
  }); // the yellow sidewall line
  P["pt-podium"] = tile((g) => {
    const r = rampF([
      [0, "#6b4300"],
      [0.35, "#b77b0c"],
      [0.6, "#f2c142"],
      [0.85, "#fff3b8"],
      [1, "#ffffff"],
    ]);
    field(g, (x, y) =>
      r(0.3 + Math.sin(x / 34 + y / 50 + fbm(x / 70, y / 70, 305) * 4) * 0.22 + fbm(x / 20, y / 20, 306) * 0.3),
    );
    for (let k = 0; k < 90; k++) {
      const x = H(k, 1, 307) * W,
        y = H(k, 2, 307) * HH,
        sz = 1 + H(k, 3, 307) * 3.5;
      g.fillStyle = "rgba(255,255,240," + (0.4 + H(k, 4, 307) * 0.6) + ")";
      g.beginPath();
      g.arc(x, y, sz, 0, 7);
      g.fill();
    } // champagne spray
    for (let k = 0; k < 10; k++) {
      const x = H(k, 5, 308) * W,
        y = H(k, 6, 308) * HH,
        s2 = 5 + H(k, 7, 308) * 6;
      g.strokeStyle = "rgba(255,255,255,.9)";
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(x - s2, y);
      g.lineTo(x + s2, y);
      g.moveTo(x, y - s2);
      g.lineTo(x, y + s2);
      g.stroke();
    }
  });
  // sponsor liveries: a base colour, racing stripes and made-up sponsor decals (TankTrouble-themed names, no real brands)
  const sponsor = (base, dark, stripe, seed) =>
    tile((g) => {
      const gr = g.createLinearGradient(0, 0, 0, HH);
      gr.addColorStop(0, base);
      gr.addColorStop(1, dark);
      g.fillStyle = gr;
      g.fillRect(0, 0, W, HH);
      g.save();
      g.translate(W / 2, HH / 2);
      g.rotate(-0.35);
      g.fillStyle = stripe;
      g.fillRect(-W, -18, W * 2, 14);
      g.fillRect(-W, 2, W * 2, 5);
      g.restore();
      const decals = [
        ["MAZE MOTORSPORT", "#ffd400", "#111"],
        ["RICOCHET RACING", "#fff", "#c4161f"],
        ["TURRET TYRES", "#111", "#fff"],
        ["BULLET BRAKES", "#22c55e", "#fff"],
        ["LASER FUEL", "#fff", "#1b47b4"],
        ["GATLING GEARBOX", "#ff7a00", "#111"],
        ["SCRAPYARD SPEED", "#7dd3fc", "#0b1d3a"],
        ["TREAD PERFORMANCE", "#e11d48", "#fff"],
      ];
      // small whole decals in a staggered grid over the area the tank covers (the pattern is stretched over the whole
      // icon, and the tank only sits in its middle), so every part - turret, barrel, base, treads - shows complete ones
      // one decal for each part of the tank, where that part sits in the icon: turret, near tread, base side, far tread, barrel
      // decals printed onto the surface: each follows its part's angle (turret curve, base side), is shaded top to bottom
      // like the paint under it, and lets a little of the paint show through - then the game's own shading goes on top
      const spots = [
        [40, 52, 150, -0.05, 0.03],
        [258, 64, 88, -0.03, -0.05],
        [258, 112, 88, -0.03, -0.05],
        [258, 160, 88, -0.03, -0.05],
      ]; // turret piece; base's right side (what shows past the near tread)
      spots.forEach(([x, y, bw, rot, sk], di) => {
        const [t0, bg, fg] = decals[(di + seed) % decals.length],
          t = bw < 110 ? t0.split(" ")[0] : t0,
          h = Math.round(bw * (bw < 110 ? 0.34 : 0.24)); // small spots: the sponsor's first word
        const F = (n) => n + 'px TankTrouble, Impact, "Arial Black", sans-serif';
        let fs = Math.round(h * 0.86);
        g.font = F(fs);
        while (g.measureText(t).width > bw - 6 && fs > 7) {
          fs--;
          g.font = F(fs);
        }
        g.save();
        g.translate(x, y);
        g.rotate(rot);
        g.transform(1, sk, 0, 1, 0, 0);
        g.fillStyle = "rgba(0,0,0,.4)";
        g.beginPath();
        g.roundRect(1.5, 2, bw, h, 3);
        g.fill(); // shadow on the paint
        g.fillStyle = bg;
        g.beginPath();
        g.roundRect(0, 0, bw, h, 3);
        g.fill();
        g.strokeStyle = "rgba(0,0,0,.55)";
        g.lineWidth = 1.5;
        g.stroke();
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.lineJoin = "round";
        g.strokeStyle = fg === "#fff" || fg === "#ffffff" ? "#111" : "rgba(255,255,255,.9)";
        g.lineWidth = Math.max(2, fs * 0.16);
        g.strokeText(t, bw / 2, h / 2 + 1); // outlined letters
        g.fillStyle = fg;
        g.fillText(t, bw / 2, h / 2 + 1);
        const sh = g.createLinearGradient(0, 0, 0, h);
        sh.addColorStop(0, "rgba(255,255,255,.25)");
        sh.addColorStop(0.45, "rgba(255,255,255,0)");
        sh.addColorStop(1, "rgba(0,0,0,.22)");
        g.fillStyle = sh;
        g.beginPath();
        g.roundRect(0, 0, bw, h, 3);
        g.fill();
        g.restore();
      });
      shine(g, 0.28);
    });
  P["pt-sponsor-red"] = sponsor("#e0242c", "#8a0a10", "#fff", 0);
  P["pt-sponsor-blue"] = sponsor("#2a62d8", "#0b2a6e", "#ffd400", 3);
  P["pt-sponsor-black"] = sponsor("#2a2c32", "#0b0b0d", "#e0242c", 5);
  P["pt-sponsor-yellow"] = sponsor("#ffd84a", "#c99a00", "#111", 1);
  // --- Graffiti ---
  P["pt-brick"] = tile((g) => {
    g.fillStyle = "#c9c2b4";
    g.fillRect(0, 0, W, HH);
    const bw = 50,
      bh = 22;
    for (let row = 0; row * bh < HH + bh; row++) {
      for (let x = (-(row % 2) * bw) / 2; x < W; x += bw) {
        const y = row * bh,
          t = H(x | 0, row, 311);
        const gr = g.createLinearGradient(0, y, 0, y + bh);
        const base = [
          [150, 62, 40],
          [168, 74, 46],
          [128, 52, 36],
          [176, 88, 58],
        ][Math.floor(t * 4)];
        const c = (k) => `rgb(${(base[0] * k) | 0},${(base[1] * k) | 0},${(base[2] * k) | 0})`;
        gr.addColorStop(0, c(1.12));
        gr.addColorStop(1, c(0.82));
        g.fillStyle = gr;
        g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        for (let k = 0; k < 6; k++) {
          g.fillStyle = "rgba(0,0,0,.12)";
          g.fillRect(x + 2 + H(k, row + x, 312) * (bw - 6), y + 3 + H(k, row - x, 313) * (bh - 6), 2, 2);
        }
      }
    }
    const grime = tileNow((g2) =>
      field(g2, (x, y) => {
        const v = 190 + fbm(x / 40, y / 40, 314) * 65;
        return [v, v, v];
      }),
    );
    g.globalCompositeOperation = "multiply";
    g.drawImage(grime, 0, 0);
    g.globalCompositeOperation = "source-over";
  });
  P["pt-drips"] = tile((g) => {
    g.fillStyle = "#1c1a22";
    g.fillRect(0, 0, W, HH);
    const cols = ["#ff2d95", "#22e0ff", "#c6ff1a", "#ffd400", "#9b4dff", "#ff6a00"];
    for (let k = 0; k < 30; k++) {
      const x = 70 + H(k, 1, 321) * 250,
        top = [0, 60, 110, 150][k % 4],
        w = 7 + H(k, 2, 321) * 14,
        len = 30 + H(k, 3, 321) * 80,
        c = cols[k % cols.length];
      g.save();
      g.translate(0, top);
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(x - w, 0);
      g.lineTo(x - w * 0.4, len - w * 0.5);
      g.arc(x - w * 0.4 + w * 0.2, len - w * 0.5, w * 0.25, Math.PI, 0, true);
      g.lineTo(x + w * 0.1, 0);
      g.closePath();
      g.fill();
      const gl = g.createLinearGradient(x - w, 0, x + w * 0.1, 0);
      gl.addColorStop(0, "rgba(255,255,255,.35)");
      gl.addColorStop(0.35, "rgba(255,255,255,0)");
      gl.addColorStop(1, "rgba(0,0,0,.3)");
      g.fillStyle = gl;
      g.fill();
      g.fillStyle = "rgba(255,255,255,.55)";
      g.beginPath();
      g.arc(x - w * 0.4 + w * 0.12, len - w * 0.6, w * 0.07, 0, 7);
      g.fill();
      g.restore();
    }
    const top = g.createLinearGradient(0, 0, 0, 40);
    top.addColorStop(0, "rgba(255,255,255,.18)");
    top.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = top;
    g.fillRect(0, 0, W, 40);
  });
  P["pt-splatter"] = tile((g) => {
    g.fillStyle = "#16161c";
    g.fillRect(0, 0, W, HH);
    const cols = ["#ff2d95", "#22e0ff", "#c6ff1a", "#ffd400", "#ff6a00"];
    for (let k = 0; k < 22; k++) {
      const cx = 75 + H(k, 1, 331) * 240,
        cy = 70 + H(k, 2, 331) * 160,
        r = 5 + H(k, 3, 331) * 12,
        c = cols[k % cols.length];
      g.fillStyle = c;
      g.shadowColor = c;
      g.shadowBlur = 10;
      g.beginPath();
      g.arc(cx, cy, r, 0, 7);
      g.fill();
      for (let j = 0; j < 12; j++) {
        const a = H(j, k, 332) * 6.28,
          d = r * (1 + H(j, k, 333) * 1.6),
          rr = 1.5 + H(j, k, 334) * 5;
        g.beginPath();
        g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr, 0, 7);
        g.fill();
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(a) * d * 0.9, cy + Math.sin(a) * d * 0.9);
        g.lineWidth = rr * 0.9;
        g.strokeStyle = c;
        g.stroke();
      }
    }
    g.shadowBlur = 0;
  });
  P["pt-tags"] = tile((g) => {
    g.fillStyle = "#e4e1d8";
    g.fillRect(0, 0, W, HH);
    const cols = ["#111", "#e0102a", "#1a3cff", "#0a8a3a", "#7a1aff"];
    g.lineCap = "round";
    g.lineJoin = "round";
    for (let k = 0; k < 26; k++) {
      let x = 70 + H(k, 1, 341) * 200,
        y = 75 + H(k, 2, 341) * 150;
      g.strokeStyle = cols[k % cols.length];
      g.lineWidth = 2 + H(k, 3, 341) * 4;
      g.globalAlpha = 0.75;
      g.beginPath();
      g.moveTo(x, y);
      for (let j = 0; j < 7; j++) {
        const nx = x + 6 + H(j, k, 342) * 16,
          ny = y + (H(j, k, 343) - 0.5) * 30;
        g.quadraticCurveTo((x + nx) / 2 + (H(j, k, 344) - 0.5) * 20, (y + ny) / 2 - 14, nx, ny);
        x = nx;
        y = ny;
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    for (let k = 0; k < 3; k++) {
      g.font = "bold " + [30, 26, 24][k] + "px Impact, Arial Black, sans-serif";
      g.fillStyle = ["#ff2d95", "#ffd400", "#22e0ff"][k];
      g.strokeStyle = "#111";
      g.lineWidth = 3;
      g.save();
      g.translate([128, 196, 92][k], [118, 182, 196][k]);
      g.rotate(-0.12 + k * 0.08);
      g.strokeText(["WOW", "ZAP!", "BOOM"][k], 0, 0);
      g.fillText(["WOW", "ZAP!", "BOOM"][k], 0, 0);
      g.restore();
    }
  });
  P["pt-spraycamo"] = tile((g) => {
    const cols = ["#2f3a22", "#5a6a3c", "#8a8a5a", "#1c1f18", "#6b5a3a"];
    g.fillStyle = cols[2];
    g.fillRect(0, 0, W, HH);
    g.filter = "blur(5px)";
    for (let k = 0; k < 34; k++) {
      const x = H(k, 1, 351) * W,
        y = H(k, 2, 351) * HH,
        r = 14 + H(k, 3, 351) * 34;
      g.fillStyle = cols[k % cols.length];
      g.beginPath();
      for (let j = 0; j < 9; j++) {
        const a = (j / 9) * 6.28,
          rr = r * (0.6 + H(j, k, 352) * 0.6);
        j ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
    }
    g.filter = "none";
    for (let k = 0; k < 1400; k++) {
      g.fillStyle = cols[k % cols.length];
      g.globalAlpha = 0.5;
      g.fillRect(H(k, 4, 353) * W, H(k, 5, 353) * HH, 1.5, 1.5);
    }
    g.globalAlpha = 1;
  }); // overspray
  // ---- Deep Sea ----
  P["pt-reef"] = tile((g) => {
    const r = rampF([
      [0, "#05343f"],
      [0.5, "#0b6f78"],
      [1, "#2bb3b0"],
    ]);
    field(g, (x, y) => r(0.25 + fbm(x / 70, y / 70, 401) * 0.6 + (y / HH) * 0.25));
    const cols = ["#ff7f6a", "#ffb4a2", "#ff4f8b", "#ffd166", "#c77dff"];
    for (let k = 0; k < 26; k++) {
      const x = H(k, 1, 402) * W,
        y = HH * 0.35 + H(k, 2, 402) * HH * 0.75,
        col = cols[k % cols.length],
        s = 10 + H(k, 3, 402) * 18;
      g.strokeStyle = col;
      g.lineCap = "round";
      const br = (x0, y0, a, l, w, d) => {
        if (d > 3 || l < 3) {
          return;
        }
        const x1 = x0 + Math.cos(a) * l,
          y1 = y0 + Math.sin(a) * l;
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
        br(x1, y1, a - 0.5, l * 0.72, w * 0.7, d + 1);
        br(x1, y1, a + 0.45, l * 0.7, w * 0.7, d + 1);
      };
      if (k % 3) {
        br(x, y, -Math.PI / 2 + (H(k, 4, 402) - 0.5) * 0.6, s, 5, 0);
      } else {
        g.fillStyle = col;
        for (let j = 0; j < 9; j++) {
          g.beginPath();
          g.arc(x + (H(j, k, 403) - 0.5) * s * 1.4, y + (H(j, k, 404) - 0.5) * s, 3 + H(j, k, 405) * 4, 0, 7);
          g.fill();
        }
      }
    }
    g.fillStyle = "rgba(255,255,255,.18)";
    for (let k = 0; k < 40; k++) {
      g.beginPath();
      g.arc(H(k, 6, 406) * W, H(k, 7, 406) * HH, 1 + H(k, 8, 406) * 3, 0, 7);
      g.fill();
    }
  });
  P["pt-scales"] = tile((g) => {
    const r = 18,
      base = rampF([
        [0, "#0b3f63"],
        [0.5, "#2a8ab0"],
        [1, "#9fe3f2"],
      ]);
    g.fillStyle = "#0b3f63";
    g.fillRect(0, 0, W, HH);
    for (let row = -1; row < HH / (r * 0.7) + 1; row++) {
      for (let col = -1; col < W / r + 1; col++) {
        const x = col * r + (row % 2 ? r / 2 : 0),
          y = row * r * 0.7,
          t = 0.35 + fbm(x / 120, y / 120, 411) * 0.6;
        const gr = g.createLinearGradient(x, y - r * 0.6, x, y + r * 0.4);
        gr.addColorStop(0, `rgb(${base(t + 0.2).join(",")})`);
        gr.addColorStop(1, `rgb(${base(t - 0.25).join(",")})`);
        g.fillStyle = gr;
        g.beginPath();
        g.arc(x, y, r * 0.62, 0, Math.PI);
        g.lineTo(x - r * 0.62, y - r * 0.2);
        g.closePath();
        g.fill();
        g.strokeStyle = "rgba(220,250,255,.55)";
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(x, y, r * 0.62, 0.15, Math.PI - 0.15);
        g.stroke();
      }
    }
  });
  P["pt-kelp"] = tile((g) => {
    const gr = g.createLinearGradient(0, 0, 0, HH);
    gr.addColorStop(0, "#2a7a8a");
    gr.addColorStop(1, "#0a2a2a");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, HH);
    for (let k = 0; k < 22; k++) {
      const x0 = H(k, 1, 421) * W,
        w = 7 + H(k, 2, 421) * 9,
        ph = H(k, 3, 421) * 6,
        col = ["#2f7a2a", "#4a9a2f", "#1f5a24", "#6aaa3a"][k % 4];
      g.fillStyle = col;
      g.beginPath();
      for (let y = HH + 5; y >= -5; y -= 5) {
        g.lineTo(x0 + Math.sin(y / 26 + ph) * 9 - w / 2, y);
      }
      for (let y = -5; y <= HH + 5; y += 5) {
        g.lineTo(x0 + Math.sin(y / 26 + ph) * 9 + w / 2, y);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(200,255,150,.25)";
      g.lineWidth = 1;
      g.beginPath();
      for (let y = -5; y <= HH + 5; y += 5) {
        g.lineTo(x0 + Math.sin(y / 26 + ph) * 9, y);
      }
      g.stroke();
    }
    g.fillStyle = "rgba(255,255,220,.08)";
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      g.moveTo(40 + k * 70, 0);
      g.lineTo(80 + k * 70, 0);
      g.lineTo(20 + k * 70, HH);
      g.lineTo(-20 + k * 70, HH);
      g.fill();
    }
  });
  P["pt-jelly"] = tile((g) => {
    const gr = g.createLinearGradient(0, 0, 0, HH);
    gr.addColorStop(0, "#0b1f4a");
    gr.addColorStop(1, "#03081a");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, HH);
    const cols = ["#ff6ad5", "#7afcff", "#c49bff", "#ffb36b"];
    for (let k = 0; k < 9; k++) {
      const x = 30 + H(k, 1, 431) * (W - 60),
        y = 25 + H(k, 2, 431) * (HH - 90),
        r = 14 + H(k, 3, 431) * 14,
        col = cols[k % 4];
      g.save();
      g.shadowColor = col;
      g.shadowBlur = 16;
      g.globalAlpha = 0.85;
      g.strokeStyle = col;
      g.lineWidth = 2;
      for (let j = 0; j < 5; j++) {
        g.beginPath();
        g.moveTo(x - r * 0.6 + j * r * 0.3, y);
        for (let t = 0; t < 1; t += 0.1) {
          g.lineTo(x - r * 0.6 + j * r * 0.3 + Math.sin(t * 9 + j) * 3, y + t * r * 2.4);
        }
        g.stroke();
      }
      const bg = g.createRadialGradient(x, y - r * 0.3, 2, x, y, r);
      bg.addColorStop(0, "#ffffff");
      bg.addColorStop(0.4, col);
      bg.addColorStop(1, col + "33");
      g.fillStyle = bg;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.75, 0, Math.PI, 0);
      g.closePath();
      g.fill();
      g.restore();
    }
    g.fillStyle = "rgba(180,230,255,.5)";
    for (let k = 0; k < 50; k++) {
      g.beginPath();
      g.arc(H(k, 6, 432) * W, H(k, 7, 432) * HH, 0.6 + H(k, 8, 432) * 1.4, 0, 7);
      g.fill();
    }
  });
  P["pt-sand"] = tile((g) => {
    const r = rampF([
      [0, "#b8925a"],
      [0.5, "#e0c48a"],
      [1, "#f7e6b8"],
    ]);
    field(g, (x, y) =>
      r(
        0.5 +
          0.28 * Math.sin(y / 9 + Math.sin(x / 45) * 2.4 + fbm(x / 60, y / 60, 441) * 3) +
          (fbm(x / 6, y / 6, 442) - 0.5) * 0.25,
      ),
    );
    for (let k = 0; k < 12; k++) {
      const x = H(k, 1, 443) * W,
        y = H(k, 2, 443) * HH;
      g.fillStyle = ["#f2e8dc", "#ffb4a2", "#e8d0b0"][k % 3];
      g.save();
      g.translate(x, y);
      g.rotate(H(k, 3, 443) * 6);
      g.beginPath();
      g.moveTo(0, 6);
      for (let j = 0; j <= 8; j++) {
        const a = Math.PI + (j / 8) * Math.PI;
        g.lineTo(Math.cos(a) * 8, Math.sin(a) * 7);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(120,80,40,.4)";
      g.lineWidth = 0.8;
      for (let j = 1; j < 8; j++) {
        const a = Math.PI + (j / 8) * Math.PI;
        g.beginPath();
        g.moveTo(0, 6);
        g.lineTo(Math.cos(a) * 8, Math.sin(a) * 7);
        g.stroke();
      }
      g.restore();
    }
  });
  // ---- Sweet Shop ----
  P["pt-sprinkles"] = tile((g) => {
    g.fillStyle = "#f7b8d2";
    g.fillRect(0, 0, W, HH);
    const sh = g.createLinearGradient(0, 0, 0, HH);
    sh.addColorStop(0, "rgba(255,255,255,.35)");
    sh.addColorStop(1, "rgba(160,40,90,.2)");
    g.fillStyle = sh;
    g.fillRect(0, 0, W, HH);
    const cols = ["#ff3d7f", "#2fc6ff", "#ffe14d", "#6ee86b", "#ffffff", "#a66bff", "#ff8a3d"];
    for (let k = 0; k < 420; k++) {
      g.save();
      g.translate(H(k, 1, 451) * W, H(k, 2, 451) * HH);
      g.rotate(H(k, 3, 451) * 6.3);
      g.fillStyle = cols[k % cols.length];
      g.beginPath();
      g.roundRect(-5, -1.6, 10, 3.2, 1.6);
      g.fill();
      g.restore();
    }
  });
  P["pt-frosting"] = tile((g) => {
    const cb = g.createLinearGradient(0, 0, 0, HH);
    cb.addColorStop(0, "#7a4424");
    cb.addColorStop(1, "#4a2410");
    g.fillStyle = cb;
    g.fillRect(0, 0, W, HH);
    const fr = g.createLinearGradient(0, 0, 0, HH * 0.6);
    fr.addColorStop(0, "#ffd1e6");
    fr.addColorStop(1, "#ff8fc7");
    g.fillStyle = fr;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(W, 0);
    for (let x = W; x >= 0; x -= 16) {
      const d = HH * 0.32 + H(x, 1, 461) * HH * 0.18,
        long = H(x, 2, 461) > 0.6 ? HH * (0.15 + H(x, 3, 461) * 0.25) : 0;
      g.lineTo(x, d);
      if (long) {
        g.lineTo(x - 3, d + long);
        g.arc(x - 6, d + long, 3, 0, Math.PI);
        g.lineTo(x - 9, d);
      }
    }
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,.4)";
    for (let k = 0; k < 8; k++) {
      g.beginPath();
      g.ellipse(H(k, 5, 462) * W, 10 + H(k, 6, 462) * 30, 18, 4, 0, 0, 7);
      g.fill();
    }
    const cols = ["#fff", "#ffe14d", "#2fc6ff", "#6ee86b"];
    for (let k = 0; k < 60; k++) {
      g.save();
      g.translate(H(k, 1, 463) * W, H(k, 2, 463) * HH * 0.4);
      g.rotate(H(k, 3, 463) * 6.3);
      g.fillStyle = cols[k % 4];
      g.fillRect(-3, -1, 6, 2);
      g.restore();
    }
  });
  P["pt-peppermint"] = tile((g) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, W, HH);
    for (const [cx, cy] of [
      [100, 60],
      [300, 60],
      [0, 180],
      [200, 180],
      [400, 180],
      [100, 300],
      [300, 300],
      [0, -60],
      [200, -60],
      [400, -60],
    ]) {
      for (let k = 0; k < 8; k++) {
        g.fillStyle = k % 2 ? "#ffffff" : "#e0202f";
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, 62, (k * Math.PI) / 4, ((k + 1) * Math.PI) / 4);
        g.closePath();
        g.fill();
      }
      const sh = g.createRadialGradient(cx - 18, cy - 18, 4, cx, cy, 62);
      sh.addColorStop(0, "rgba(255,255,255,.55)");
      sh.addColorStop(1, "rgba(120,0,10,.18)");
      g.fillStyle = sh;
      g.beginPath();
      g.arc(cx, cy, 62, 0, 7);
      g.fill();
      g.strokeStyle = "rgba(160,0,20,.35)";
      g.lineWidth = 2;
      g.stroke();
    }
  });
  P["pt-gummy"] = tile((g) => {
    g.fillStyle = "#2a8a3a";
    g.fillRect(0, 0, W, HH);
    const cols = ["#ff3d5a", "#ffb52e", "#ffe94d", "#4ade5a", "#3db8ff", "#b46bff"];
    for (let k = 0; k < 46; k++) {
      const x = H(k, 1, 471) * W,
        y = H(k, 2, 471) * HH,
        r = 12 + H(k, 3, 471) * 12,
        col = cols[k % cols.length];
      g.save();
      g.globalAlpha = 0.88;
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.8, H(k, 4, 471) * 3, 0, 7);
      g.fill();
      g.globalAlpha = 1;
      g.fillStyle = "rgba(255,255,255,.55)";
      g.beginPath();
      g.ellipse(x - r * 0.35, y - r * 0.3, r * 0.3, r * 0.15, -0.5, 0, 7);
      g.fill();
      g.restore();
    }
  });
  P["pt-waffle"] = tile((g) => {
    const r = rampF([
      [0, "#8a5524"],
      [0.5, "#c8904a"],
      [1, "#e8b870"],
    ]);
    field(g, (x, y) => r(0.45 + (fbm(x / 30, y / 30, 481) - 0.5) * 0.6));
    g.save();
    g.translate(W / 2, HH / 2);
    g.rotate(Math.PI / 4);
    for (let k = -20; k <= 20; k++) {
      for (const rot of [0, 1]) {
        g.save();
        if (rot) {
          g.rotate(Math.PI / 2);
        }
        g.fillStyle = "rgba(110,60,20,.55)";
        g.fillRect(k * 26 - 3, -400, 6, 800);
        g.fillStyle = "rgba(255,220,160,.35)";
        g.fillRect(k * 26 - 5, -400, 2, 800);
        g.restore();
      }
    }
    g.restore();
  });
  // ---- Arcade ----
  P["pt-pixelcamo"] = tile((g) => {
    const q = 10,
      cols = ["#2f4a2a", "#4a6a3a", "#6a8a4a", "#2a2a1f"];
    for (let y = 0; y < HH; y += q) {
      for (let x = 0; x < W; x += q) {
        const n = fbm(x / 70, y / 70, 491);
        g.fillStyle = cols[n < 0.38 ? 3 : n < 0.5 ? 0 : n < 0.62 ? 1 : 2];
        g.fillRect(x, y, q, q);
      }
    }
  });
  P["pt-synthwave"] = tile((g) => {
    const sky = g.createLinearGradient(0, 0, 0, HH * 0.55);
    sky.addColorStop(0, "#1a0a3a");
    sky.addColorStop(1, "#ff2bd6");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, HH * 0.55);
    const sun = g.createLinearGradient(0, HH * 0.12, 0, HH * 0.55);
    sun.addColorStop(0, "#fff200");
    sun.addColorStop(1, "#ff4f8b");
    g.fillStyle = sun;
    g.beginPath();
    g.arc(W / 2, HH * 0.55, HH * 0.36, Math.PI, 0);
    g.fill();
    g.fillStyle = "#1a0a3a";
    for (let k = 0; k < 6; k++) {
      g.fillRect(0, HH * (0.36 + k * 0.035), W, 2 + k * 1.2);
    }
    g.fillStyle = "#12052a";
    g.fillRect(0, HH * 0.55, W, HH * 0.45);
    g.strokeStyle = "#00e5ff";
    g.lineWidth = 2;
    g.shadowColor = "#00e5ff";
    g.shadowBlur = 8;
    for (let k = 0; k < 8; k++) {
      const y = HH * 0.55 + Math.pow(k / 7, 1.8) * HH * 0.45;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    for (let k = -10; k <= 10; k++) {
      g.beginPath();
      g.moveTo(W / 2 + k * 12, HH * 0.55);
      g.lineTo(W / 2 + k * 90, HH);
      g.stroke();
    }
    g.shadowBlur = 0;
  });
  P["pt-scanline"] = tile((g) => {
    const r = rampF([
      [0, "#03140f"],
      [0.6, "#0b4a38"],
      [1, "#2affb0"],
    ]);
    field(g, (x, y) => {
      const v = r(0.35 + fbm(x / 90, y / 90, 501) * 0.5);
      const k = y % 4 < 2 ? 1 : 0.62;
      return v.map((c) => c * k);
    });
    const gl = g.createRadialGradient(W / 2, HH / 2, 20, W / 2, HH / 2, W * 0.6);
    gl.addColorStop(0, "rgba(120,255,200,.18)");
    gl.addColorStop(1, "rgba(0,0,0,.35)");
    g.fillStyle = gl;
    g.fillRect(0, 0, W, HH);
    g.fillStyle = "rgba(42,255,176,.85)";
    g.font = "bold 16px Consolas, monospace";
    for (let k = 0; k < 7; k++) {
      g.fillText(
        ["READY", "PLAYER 1", "INSERT COIN", "HI 99990", "GAME OVER", "LEVEL 7", "1UP"][k],
        10 + H(k, 1, 502) * (W - 120),
        22 + k * 32,
      );
    }
  });
  P["pt-neonmaze"] = tile((g) => {
    g.fillStyle = "#0a0a20";
    g.fillRect(0, 0, W, HH);
    const c = 40;
    g.lineCap = "round";
    g.lineWidth = 4;
    for (let y = 0; y <= HH; y += c) {
      for (let x = 0; x <= W; x += c) {
        const v = H(x, y, 511);
        g.strokeStyle = ["#ff2bd6", "#00e5ff", "#39ff14", "#fff200"][Math.floor(H(x, y, 512) * 4)];
        g.shadowColor = g.strokeStyle;
        g.shadowBlur = 10;
        g.beginPath();
        if (v < 0.5) {
          g.moveTo(x, y);
          g.lineTo(x + c, y);
        } else {
          g.moveTo(x, y);
          g.lineTo(x, y + c);
        }
        g.stroke();
      }
    }
    g.shadowBlur = 0;
    g.fillStyle = "#ffffff";
    for (let k = 0; k < 18; k++) {
      g.beginPath();
      g.arc(Math.floor(H(k, 1, 513) * 10) * c + c / 2, Math.floor(H(k, 2, 513) * 6) * c + c / 2, 2.5, 0, 7);
      g.fill();
    }
  });
  P["pt-pixelpals"] = tile((g) => {
    g.fillStyle = "#16123a";
    g.fillRect(0, 0, W, HH);
    const q = 4;
    const pals = [
      [".....XXX", "..XXXX..", ".XXXXXX.", "XXXXXXXX", "X.XX.XX.", ".X..X..X"],
      [".XX.XX..", "XXXXXXX.", "XXXXXXX.", ".XXXXX..", "..XXX...", "...X...."],
      ["..XXXX..", ".XX..XX.", "XX.XX.XX", "XX.XX.XX", ".XX..XX.", "..XXXX.."],
    ]; // little tanks, hearts and coins
    const cols = ["#ff2bd6", "#00e5ff", "#39ff14", "#fff200", "#ff8a3d"];
    for (let r = 0; r < 5; r++) {
      for (let k = 0; k < 7; k++) {
        const p = pals[(r + k) % 3],
          col = cols[(r * 7 + k) % 5],
          ox = 14 + k * 56 + (r % 2) * 20,
          oy = 12 + r * 46;
        g.fillStyle = col;
        p.forEach((row, yy) =>
          [...row].forEach((ch, xx) => {
            if (ch === "X") {
              g.fillRect(ox + xx * q, oy + yy * q, q, q);
            }
          }),
        );
      }
    }
    g.fillStyle = "rgba(255,255,255,.5)";
    for (let k = 0; k < 40; k++) {
      g.fillRect(H(k, 1, 521) * W, H(k, 2, 521) * HH, 2, 2);
    }
  });
  // ---- Safari ----
  P["pt-leopard"] = tile((g) => {
    const r = rampF([
      [0, "#b07a2a"],
      [1, "#e8b860"],
    ]);
    field(g, (x, y) => r(0.4 + fbm(x / 50, y / 50, 601) * 0.6));
    for (let k = 0; k < 70; k++) {
      const x = H(k, 1, 602) * W,
        y = H(k, 2, 602) * HH,
        rr = 7 + H(k, 3, 602) * 7;
      g.fillStyle = "#2a1608";
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * 6.28 + H(k, 4, 602);
        g.beginPath();
        g.ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8, rr * 0.42, rr * 0.3, a, 0, 7);
        g.fill();
      }
      g.fillStyle = "#8a5418";
      g.beginPath();
      g.ellipse(x, y, rr * 0.6, rr * 0.48, 0, 0, 7);
      g.fill();
    }
  });
  P["pt-zebra"] = tile((g) => {
    g.fillStyle = "#f4f2ea";
    g.fillRect(0, 0, W, HH);
    g.fillStyle = "#16161a";
    for (let k = 0; k < 18; k++) {
      const x0 = k * 24 - 20;
      g.beginPath();
      for (let y = 0; y <= HH; y += 6) {
        g.lineTo(x0 + Math.sin(y / 30 + k) * 16 + fbm(k, y / 40, 611) * 18, y);
      }
      for (let y = HH; y >= 0; y -= 6) {
        g.lineTo(x0 + 8 + H(k, 1, 612) * 6 + Math.sin(y / 30 + k) * 16 + fbm(k + 9, y / 40, 611) * 18, y);
      }
      g.closePath();
      g.fill();
    }
  });
  P["pt-tiger"] = tile((g) => {
    const gr = g.createLinearGradient(0, 0, 0, HH);
    gr.addColorStop(0, "#f08a24");
    gr.addColorStop(1, "#c8560c");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, HH);
    g.fillStyle = "#1a0e06";
    for (let k = 0; k < 22; k++) {
      const x = k * 19 + H(k, 1, 621) * 8,
        len = HH * (0.3 + H(k, 2, 621) * 0.4),
        top = H(k, 3, 621) > 0.5;
      g.beginPath();
      const y0 = top ? 0 : HH,
        dir = top ? 1 : -1;
      g.moveTo(x - 6, y0);
      g.quadraticCurveTo(x + 10 * Math.sin(k), y0 + dir * len * 0.6, x + 4, y0 + dir * len);
      g.quadraticCurveTo(x + 4 + 6 * Math.cos(k), y0 + dir * len * 0.5, x + 6, y0);
      g.closePath();
      g.fill();
    }
  });
  P["pt-giraffe"] = tile((g) => {
    g.fillStyle = "#f2dfb0";
    g.fillRect(0, 0, W, HH);
    const pts = [];
    for (let k = 0; k < 40; k++) {
      pts.push([H(k, 1, 631) * W, H(k, 2, 631) * HH]);
    }
    const id = g.getImageData(0, 0, W, HH),
      d = id.data;
    for (let y = 0; y < HH; y++) {
      for (let x = 0; x < W; x++) {
        let a = 1e9,
          b = 1e9;
        for (const [px, py] of pts) {
          const dd = (x - px) ** 2 + (y - py) ** 2;
          if (dd < a) {
            b = a;
            a = dd;
          } else if (dd < b) {
            b = dd;
          }
        }
        if (Math.sqrt(b) - Math.sqrt(a) > 5) {
          const i = (y * W + x) * 4,
            t = fbm(x / 20, y / 20, 632);
          d[i] = 170 + t * 40;
          d[i + 1] = 104 + t * 30;
          d[i + 2] = 40 + t * 20;
        }
      }
    }
    g.putImageData(id, 0, 0);
  });
  P["pt-jungle"] = tile((g) => {
    g.fillStyle = "#123a1a";
    g.fillRect(0, 0, W, HH);
    const cols = ["#2f7a2a", "#4aa03a", "#1f5a24", "#6ac04a", "#3a8a5a"];
    for (let k = 0; k < 60; k++) {
      const x = H(k, 1, 641) * W,
        y = H(k, 2, 641) * HH,
        L = 26 + H(k, 3, 641) * 30,
        a = H(k, 4, 641) * 6.3;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = cols[k % 5];
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(L * 0.5, -L * 0.35, L, 0);
      g.quadraticCurveTo(L * 0.5, L * 0.35, 0, 0);
      g.fill();
      g.strokeStyle = "rgba(200,255,150,.35)";
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(L, 0);
      g.stroke();
      g.restore();
    }
  });
  // ---- Steampunk ----
  const gear = (g, x, y, r, teeth, col, hole) => {
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2,
        rr = i % 2 ? r : r * 1.18;
      g.lineTo(x + Math.cos(a - 0.12) * rr, y + Math.sin(a - 0.12) * rr);
      g.lineTo(x + Math.cos(a + 0.12) * rr, y + Math.sin(a + 0.12) * rr);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(40,24,8,.6)";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = "rgba(255,240,200,.25)";
    g.beginPath();
    g.arc(x - r * 0.2, y - r * 0.2, r * 0.6, 0, 7);
    g.fill();
    g.fillStyle = hole;
    g.beginPath();
    g.arc(x, y, r * 0.3, 0, 7);
    g.fill();
  };
  P["pt-gears"] = tile((g) => {
    const r = rampF([
      [0, "#3a2410"],
      [1, "#6a4420"],
    ]);
    field(g, (x, y) => r(fbm(x / 60, y / 60, 651)));
    for (let k = 0; k < 16; k++) {
      gear(
        g,
        H(k, 1, 652) * W,
        H(k, 2, 652) * HH,
        14 + H(k, 3, 652) * 26,
        8 + (k % 5) * 2,
        ["#b8892f", "#a05a2a", "#d4b060", "#8a8f96"][k % 4],
        "#2a1608",
      );
    }
  });
  P["pt-brass"] = tile((g) => {
    const r = rampF([
      [0, "#7a5a1a"],
      [0.5, "#c89a3a"],
      [1, "#f2d27a"],
    ]);
    field(g, (x, y) => r(0.5 + (fbm(x / 80, y / 20, 661) - 0.5) * 0.7 + (y % 60) / 400));
    g.strokeStyle = "rgba(60,40,10,.7)";
    g.lineWidth = 2;
    for (let y = 0; y <= HH; y += 60) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    for (let x = 0; x <= W; x += 100) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, HH);
      g.stroke();
    }
    for (let y = 8; y < HH; y += 60) {
      for (let x = 8; x < W; x += 20) {
        for (const yy of [y, y + 44]) {
          g.fillStyle = "#5a400f";
          g.beginPath();
          g.arc(x, yy, 3.2, 0, 7);
          g.fill();
          g.fillStyle = "#ffe9a8";
          g.beginPath();
          g.arc(x - 1, yy - 1, 1.3, 0, 7);
          g.fill();
        }
      }
    }
  });
  P["pt-copper"] = tile((g) => {
    g.fillStyle = "#3a2418";
    g.fillRect(0, 0, W, HH);
    const pipe = (x0, y0, x1, y1) => {
      const vert = x0 === x1,
        w = 22;
      const gr = vert
        ? g.createLinearGradient(x0 - w / 2, 0, x0 + w / 2, 0)
        : g.createLinearGradient(0, y0 - w / 2, 0, y0 + w / 2);
      gr.addColorStop(0, "#5a2a10");
      gr.addColorStop(0.4, "#e09a5a");
      gr.addColorStop(1, "#6a3010");
      g.fillStyle = gr;
      if (vert) {
        g.fillRect(x0 - w / 2, Math.min(y0, y1), w, Math.abs(y1 - y0));
      } else {
        g.fillRect(Math.min(x0, x1), y0 - w / 2, Math.abs(x1 - x0), w);
      }
    };
    for (let k = 0; k < 5; k++) {
      pipe(30 + k * 85, 0, 30 + k * 85, HH);
    }
    for (let k = 0; k < 3; k++) {
      pipe(0, 40 + k * 80, W, 40 + k * 80);
    }
    for (let k = 0; k < 5; k++) {
      for (let j = 0; j < 3; j++) {
        const x = 30 + k * 85,
          y = 40 + j * 80;
        g.fillStyle = "#b8892f";
        g.beginPath();
        g.arc(x, y, 15, 0, 7);
        g.fill();
        g.strokeStyle = "#4a300a";
        g.lineWidth = 2;
        g.stroke();
        g.fillStyle = "#4a300a";
        for (let a = 0; a < 6; a++) {
          g.beginPath();
          g.arc(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 1.6, 0, 7);
          g.fill();
        }
      }
    }
  });
  P["pt-blueprint"] = tile((g) => {
    g.fillStyle = "#1f4a8a";
    g.fillRect(0, 0, W, HH);
    g.strokeStyle = "rgba(200,225,255,.22)";
    g.lineWidth = 1;
    for (let x = 0; x <= W; x += 20) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, HH);
      g.stroke();
    }
    for (let y = 0; y <= HH; y += 20) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    g.strokeStyle = "rgba(235,245,255,.85)";
    g.lineWidth = 2;
    g.strokeRect(40, 40, 150, 80);
    g.beginPath();
    g.arc(115, 80, 26, 0, 7);
    g.stroke();
    g.beginPath();
    g.moveTo(190, 80);
    g.lineTo(300, 60);
    g.lineTo(300, 100);
    g.closePath();
    g.stroke();
    g.beginPath();
    g.arc(300, 180, 40, 0, 7);
    g.stroke();
    for (let a = 0; a < 12; a++) {
      g.beginPath();
      g.moveTo(300 + Math.cos((a / 12) * 6.28) * 40, 180 + Math.sin((a / 12) * 6.28) * 40);
      g.lineTo(300 + Math.cos((a / 12) * 6.28) * 48, 180 + Math.sin((a / 12) * 6.28) * 48);
      g.stroke();
    }
    g.setLineDash([6, 4]);
    g.beginPath();
    g.moveTo(20, 170);
    g.lineTo(220, 170);
    g.stroke();
    g.setLineDash([]);
    g.font = "12px Consolas, monospace";
    g.fillStyle = "rgba(235,245,255,.85)";
    g.fillText("TURRET Mk.II", 50, 140);
    g.fillText("Ø 48", 260, 120);
    g.fillText("SCALE 1:20", 40, 215);
  });
  P["pt-rust"] = tile((g) => {
    const r = rampF([
      [0, "#3a1a0a"],
      [0.4, "#7a3a1a"],
      [0.7, "#b0602a"],
      [1, "#e09050"],
    ]);
    field(g, (x, y) => {
      const n = fbm(x / 40, y / 40, 671),
        m = fbm(x / 9, y / 9, 672);
      return r(n * 0.7 + m * 0.3);
    });
    g.fillStyle = "rgba(90,100,105,.6)";
    for (let k = 0; k < 10; k++) {
      g.beginPath();
      g.ellipse(
        H(k, 1, 673) * W,
        H(k, 2, 673) * HH,
        20 + H(k, 3, 673) * 30,
        12 + H(k, 4, 673) * 16,
        H(k, 5, 673) * 3,
        0,
        7,
      );
      g.fill();
    }
  });
  // ---- Kingdom ----
  P["pt-velvet"] = tile((g) => {
    const r = rampF([
      [0, "#24062e"],
      [0.5, "#4a1a5a"],
      [1, "#7a3a8a"],
    ]);
    field(g, (x, y) => r(0.3 + fbm(x / 60, y / 25, 681) * 0.7));
    g.strokeStyle = "rgba(212,175,55,.75)";
    g.lineWidth = 1.5;
    for (let y = 0; y <= HH + 40; y += 40) {
      for (let x = 0; x <= W + 40; x += 40) {
        const ox = (y / 40) % 2 ? 20 : 0;
        g.beginPath();
        g.moveTo(x + ox, y - 12);
        g.lineTo(x + ox + 8, y);
        g.lineTo(x + ox, y + 12);
        g.lineTo(x + ox - 8, y);
        g.closePath();
        g.stroke();
        g.fillStyle = "rgba(212,175,55,.9)";
        g.beginPath();
        g.arc(x + ox, y, 2.2, 0, 7);
        g.fill();
      }
    }
  });
  P["pt-chainmail"] = tile((g) => {
    g.fillStyle = "#2a2d32";
    g.fillRect(0, 0, W, HH);
    for (let y = 0; y < HH + 10; y += 8) {
      for (let x = 0; x < W + 10; x += 10) {
        const ox = (y / 8) % 2 ? 5 : 0;
        const gr = g.createLinearGradient(x + ox - 5, y - 5, x + ox + 5, y + 5);
        gr.addColorStop(0, "#e2e6ea");
        gr.addColorStop(1, "#5a5f66");
        g.strokeStyle = gr;
        g.lineWidth = 2.2;
        g.beginPath();
        g.ellipse(x + ox, y, 5, 4, 0, 0, 7);
        g.stroke();
      }
    }
  });
  P["pt-castle"] = tile((g) => {
    g.fillStyle = "#5a564c";
    g.fillRect(0, 0, W, HH);
    const bh = 30;
    for (let row = 0; row * bh < HH; row++) {
      for (let x = (row % 2) * -30; x < W; x += 60) {
        const t = H(x, row, 691),
          c0 = 120 + t * 50;
        g.fillStyle = `rgb(${c0},${c0 - 6},${c0 - 16})`;
        g.beginPath();
        g.roundRect(x + 2, row * bh + 2, 56, bh - 4, 4);
        g.fill();
        g.fillStyle = "rgba(255,255,255,.12)";
        g.fillRect(x + 4, row * bh + 4, 52, 4);
        g.fillStyle = "rgba(0,0,0,.18)";
        g.fillRect(x + 4, row * bh + bh - 8, 52, 4);
        if (H(x, row, 692) > 0.8) {
          g.fillStyle = "rgba(70,110,50,.6)";
          g.beginPath();
          g.ellipse(x + 20, row * bh + bh - 6, 10, 4, 0, 0, 7);
          g.fill();
        }
      }
    }
  });
  P["pt-heraldry"] = tile((g) => {
    const cols = [
      ["#8b0000", "#d4af37"],
      ["#1c3f94", "#e8e8e8"],
    ];
    const s = 80;
    for (let y = 0; y < HH; y += s) {
      for (let x = 0; x < W; x += s) {
        const [a, b] = cols[((x + y) / s) % 2];
        g.fillStyle = a;
        g.fillRect(x, y, s, s);
        g.fillStyle = b;
        g.beginPath();
        g.moveTo(x, y + s * 0.75);
        g.lineTo(x + s / 2, y + s * 0.35);
        g.lineTo(x + s, y + s * 0.75);
        g.lineTo(x + s, y + s * 0.95);
        g.lineTo(x + s / 2, y + s * 0.55);
        g.lineTo(x, y + s * 0.95);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(x + s / 2, y + 8);
        g.lineTo(x + s / 2 + 6, y + 20);
        g.lineTo(x + s / 2, y + 30);
        g.lineTo(x + s / 2 - 6, y + 20);
        g.closePath();
        g.fill();
      }
    }
  });
  P["pt-tapestry"] = tile((g) => {
    g.fillStyle = "#6a2a1a";
    g.fillRect(0, 0, W, HH);
    const cols = ["#d4af37", "#1c3f94", "#e8d8b0", "#2f6a3a"];
    for (let y = 0; y < HH; y += 4) {
      g.fillStyle = y % 8 ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.05)";
      g.fillRect(0, y, W, 2);
    }
    for (let band = 0; band < 4; band++) {
      const y = 20 + band * 60;
      g.fillStyle = cols[band % 4];
      for (let x = 0; x < W; x += 24) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 12, y - 10);
        g.lineTo(x + 24, y);
        g.lineTo(x + 12, y + 10);
        g.closePath();
        g.fill();
      }
      g.fillStyle = cols[(band + 2) % 4];
      g.fillRect(0, y + 16, W, 4);
      g.fillRect(0, y - 20, W, 4);
    }
  });
  // ---- Wild West ----
  P["pt-wanted"] = tile((g) => {
    g.fillStyle = "#6a4424";
    g.fillRect(0, 0, W, HH);
    for (let k = 0; k < 8; k++) {
      const x = (k % 4) * 100 + 8 + H(k, 1, 701) * 10,
        y = Math.floor(k / 4) * 120 + 6 + H(k, 2, 701) * 10;
      g.save();
      g.translate(x + 42, y + 54);
      g.rotate((H(k, 3, 701) - 0.5) * 0.2);
      g.fillStyle = "#e8d6a8";
      g.fillRect(-42, -54, 84, 108);
      g.fillStyle = "rgba(120,80,30,.25)";
      g.fillRect(-42, 44, 84, 10);
      g.fillStyle = "#3a2410";
      g.textAlign = "center";
      g.font = "bold 15px Georgia, serif";
      g.fillText("WANTED", 0, -36);
      g.strokeStyle = "#3a2410";
      g.lineWidth = 2;
      g.strokeRect(-26, -28, 52, 44);
      g.beginPath();
      g.arc(0, -14, 10, 0, 7);
      g.fill();
      g.fillRect(-14, -2, 28, 16);
      g.font = "bold 11px Georgia, serif";
      g.fillText("$" + (500 + Math.floor(H(k, 4, 701) * 9) * 500), 0, 34);
      g.fillStyle = "#8a8f96";
      g.beginPath();
      g.arc(0, -50, 2.5, 0, 7);
      g.fill();
      g.restore();
    }
  });
  P["pt-saloon"] = tile((g) => {
    for (let y = 0; y < HH; y += 30) {
      const r = rampF([
        [0, "#4a2a12"],
        [0.5, "#7a4a24"],
        [1, "#a46a38"],
      ]);
      const t = H(0, y, 711);
      g.fillStyle = `rgb(${r(0.3 + t * 0.5).join(",")})`;
      g.fillRect(0, y, W, 30);
      g.strokeStyle = "rgba(40,20,6,.35)";
      g.lineWidth = 1;
      for (let k = 0; k < 6; k++) {
        g.beginPath();
        for (let x = 0; x <= W; x += 10) {
          g.lineTo(x, y + 5 + k * 4 + Math.sin(x / 40 + y + k) * 2);
        }
        g.stroke();
      }
      g.fillStyle = "#2a1608";
      g.fillRect(0, y + 28, W, 2);
      for (let x = ((y / 30) % 2) * 60; x < W; x += 120) {
        g.fillRect(x, y, 2, 30);
        g.fillStyle = "#c8b090";
        g.beginPath();
        g.arc(x + 8, y + 15, 2, 0, 7);
        g.fill();
        g.fillStyle = "#2a1608";
      }
    }
  });
  P["pt-denim"] = tile((g) => {
    const r = rampF([
      [0, "#1f3a6a"],
      [1, "#5a7aaa"],
    ]);
    field(g, (x, y) => {
      const tw = (x + y) % 4 < 2 ? 0.08 : 0;
      return r(0.35 + fbm(x / 50, y / 50, 721) * 0.4 + tw + (fbm(x / 4, y / 30, 722) - 0.5) * 0.2);
    });
    g.strokeStyle = "#e8a040";
    g.lineWidth = 2;
    g.setLineDash([6, 4]);
    for (const y of [60, 66, 180, 186]) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    g.setLineDash([]);
    g.fillStyle = "#c8a040";
    for (const x of [80, 320]) {
      g.beginPath();
      g.arc(x, 120, 6, 0, 7);
      g.fill();
    }
  });
  P["pt-cowhide"] = tile((g) => {
    g.fillStyle = "#f4f0e6";
    g.fillRect(0, 0, W, HH);
    const id = g.getImageData(0, 0, W, HH),
      d = id.data;
    for (let y = 0; y < HH; y++) {
      for (let x = 0; x < W; x++) {
        const n = fbm(x / 70, y / 70, 731) + (fbm(x / 12, y / 12, 732) - 0.5) * 0.15;
        if (n > 0.56) {
          const i = (y * W + x) * 4,
            br = n > 0.6 ? 0 : 1;
          d[i] = br ? 90 : 40;
          d[i + 1] = br ? 60 : 28;
          d[i + 2] = br ? 40 : 20;
        }
      }
    }
    g.putImageData(id, 0, 0);
  });
  P["pt-canyon"] = tile((g) => {
    const sky = g.createLinearGradient(0, 0, 0, HH);
    sky.addColorStop(0, "#ffb35a");
    sky.addColorStop(0.5, "#ff6a3a");
    sky.addColorStop(1, "#8a2a3a");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, HH);
    g.fillStyle = "#ffe9a8";
    g.beginPath();
    g.arc(300, 110, 40, 0, 7);
    g.fill();
    for (const [y0, col, amp] of [
      [130, "#a0402a", 30],
      [170, "#7a2a1f", 26],
      [205, "#4a1a14", 20],
    ]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, HH);
      for (let x = 0; x <= W; x += 20) {
        const flat = Math.floor((x + y0) / 80) % 2;
        g.lineTo(x, y0 - (flat ? amp : amp * 0.3) - H(x, y0, 741) * 6);
      }
      g.lineTo(W, HH);
      g.closePath();
      g.fill();
    }
  });
  // ---- Tropical ----
  P["pt-hibiscus"] = tile((g) => {
    g.fillStyle = "#1a7aa8";
    g.fillRect(0, 0, W, HH);
    for (let k = 0; k < 14; k++) {
      const x = H(k, 1, 751) * W,
        y = H(k, 2, 751) * HH,
        L = 40;
      g.fillStyle = "#2f8a3a";
      g.save();
      g.translate(x + 20, y + 10);
      g.rotate(H(k, 3, 751) * 6);
      g.beginPath();
      g.ellipse(0, 0, L, 12, 0, 0, 7);
      g.fill();
      g.restore();
    }
    for (let k = 0; k < 12; k++) {
      const x = H(k, 4, 752) * W,
        y = H(k, 5, 752) * HH,
        r = 16 + H(k, 6, 752) * 8,
        col = ["#ff3d5a", "#ff8fb0", "#ffd23f", "#ffffff"][k % 4];
      g.fillStyle = col;
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * 6.283 + k;
        g.beginPath();
        g.ellipse(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.75, r * 0.5, a, 0, 7);
        g.fill();
      }
      g.fillStyle = "#c0102a";
      g.beginPath();
      g.arc(x, y, r * 0.28, 0, 7);
      g.fill();
      g.strokeStyle = "#ffe14d";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + r * 0.6, y - r * 0.6);
      g.stroke();
    }
  });
  P["pt-pineapple"] = tile((g) => {
    g.fillStyle = "#e8b830";
    g.fillRect(0, 0, W, HH);
    const s = 26;
    for (let y = -s; y < HH + s; y += s) {
      for (let x = -s; x < W + s; x += s) {
        const ox = ((Math.floor(y / s) % 2) * s) / 2;
        g.save();
        g.translate(x + ox, y);
        g.rotate(Math.PI / 4);
        const gr = g.createRadialGradient(-3, -3, 1, 0, 0, s * 0.6);
        gr.addColorStop(0, "#ffe07a");
        gr.addColorStop(1, "#b07818");
        g.fillStyle = gr;
        g.fillRect(-s * 0.33, -s * 0.33, s * 0.66, s * 0.66);
        g.strokeStyle = "#7a4a10";
        g.lineWidth = 2;
        g.strokeRect(-s * 0.33, -s * 0.33, s * 0.66, s * 0.66);
        g.fillStyle = "#5a3a0a";
        g.beginPath();
        g.arc(0, 0, 2, 0, 7);
        g.fill();
        g.restore();
      }
    }
  });
  P["pt-tiki"] = tile((g) => {
    const r = rampF([
      [0, "#4a2a12"],
      [0.5, "#8a5a2a"],
      [1, "#b8844a"],
    ]);
    field(g, (x, y) =>
      r(0.45 + Math.sin(x / 6 + fbm(x / 40, y / 80, 761) * 6) * 0.12 + (fbm(x / 60, y / 60, 762) - 0.5) * 0.4),
    );
    g.fillStyle = "rgba(40,20,6,.75)";
    for (let k = 0; k < 4; k++) {
      const x = 50 + k * 100;
      g.fillRect(x - 24, 40, 18, 10);
      g.fillRect(x + 6, 40, 18, 10);
      g.fillRect(x - 8, 60, 16, 30);
      g.fillRect(x - 26, 110, 52, 12);
      for (let j = 0; j < 5; j++) {
        g.fillRect(x - 22 + j * 10, 122, 4, 8);
      }
      g.fillRect(x - 30, 170, 60, 6);
      g.fillRect(x - 30, 190, 60, 6);
    }
  });
  P["pt-waves"] = tile((g) => {
    const gr = g.createLinearGradient(0, 0, 0, HH);
    gr.addColorStop(0, "#5fd6ff");
    gr.addColorStop(1, "#0a4a8a");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, HH);
    for (let row = 0; row < 8; row++) {
      const y = 20 + row * 30;
      g.fillStyle = ["#1a8ac0", "#0f6aa8", "#2fa8d8"][row % 3];
      g.beginPath();
      g.moveTo(0, HH);
      for (let x = 0; x <= W; x += 4) {
        g.lineTo(x, y + Math.sin(x / 25 + row) * 8);
      }
      g.lineTo(W, HH);
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(255,255,255,.85)";
      g.lineWidth = 3;
      g.beginPath();
      for (let x = 0; x <= W; x += 4) {
        g.lineTo(x, y + Math.sin(x / 25 + row) * 8);
      }
      g.stroke();
    }
  });
  P["pt-tropsunset"] = tile((g) => {
    const sky = g.createLinearGradient(0, 0, 0, HH);
    sky.addColorStop(0, "#ff4f8b");
    sky.addColorStop(0.5, "#ff9a4a");
    sky.addColorStop(1, "#ffd23f");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, HH);
    g.fillStyle = "#fff1a8";
    g.beginPath();
    g.arc(200, 150, 50, 0, 7);
    g.fill();
    g.fillStyle = "rgba(255,90,60,.6)";
    for (let k = 0; k < 5; k++) {
      g.fillRect(140, 150 + k * 10, 120, 3);
    }
    const palm = (x, h, lean) => {
      g.strokeStyle = "#3a1a1a";
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(x, HH);
      g.quadraticCurveTo(x + lean * 0.5, HH - h * 0.6, x + lean, HH - h);
      g.stroke();
      g.fillStyle = "#3a1a1a";
      for (let j = 0; j < 6; j++) {
        const a = -Math.PI / 2 + (j - 2.5) * 0.55;
        g.save();
        g.translate(x + lean, HH - h);
        g.rotate(a);
        g.beginPath();
        g.ellipse(26, 6, 30, 7, 0.3, 0, 7);
        g.fill();
        g.restore();
      }
    };
    palm(50, 170, 20);
    palm(360, 140, -24);
  });
  // ---- Mech ----
  P["pt-hazard"] = tile((g) => {
    g.fillStyle = "#ffc300";
    g.fillRect(0, 0, W, HH);
    g.fillStyle = "#1a1a1a";
    g.save();
    g.translate(W / 2, HH / 2);
    g.rotate(-Math.PI / 4);
    for (let x = -500; x < 500; x += 60) {
      g.fillRect(x, -400, 30, 800);
    }
    g.restore();
    const gr = g.createLinearGradient(0, 0, 0, HH);
    gr.addColorStop(0, "rgba(255,255,255,.18)");
    gr.addColorStop(1, "rgba(0,0,0,.18)");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, HH);
    g.fillStyle = "rgba(60,40,20,.35)";
    for (let k = 0; k < 20; k++) {
      g.beginPath();
      g.arc(H(k, 1, 771) * W, H(k, 2, 771) * HH, 2 + H(k, 3, 771) * 5, 0, 7);
      g.fill();
    }
  });
  P["pt-hexarmour"] = tile((g) => {
    g.fillStyle = "#20262c";
    g.fillRect(0, 0, W, HH);
    const r = 18,
      h = r * Math.sqrt(3);
    for (let y = -h; y < HH + h; y += h) {
      for (let x = -r * 3; x < W + r * 3; x += r * 3) {
        for (const [ox, oy] of [
          [0, 0],
          [r * 1.5, h / 2],
        ]) {
          const cx = x + ox,
            cy = y + oy,
            t = 0.4 + H(Math.round(cx), Math.round(cy), 781) * 0.4;
          g.beginPath();
          for (let j = 0; j < 6; j++) {
            const a = (j * Math.PI) / 3;
            g.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
          }
          g.closePath();
          const gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
          gr.addColorStop(0, `rgb(${110 * t + 40},${120 * t + 40},${130 * t + 44})`);
          gr.addColorStop(1, `rgb(${50 * t + 20},${56 * t + 22},${62 * t + 26})`);
          g.fillStyle = gr;
          g.fill();
          g.strokeStyle = "rgba(0,200,255,.25)";
          g.lineWidth = 1;
          g.stroke();
        }
      }
    }
  });
  P["pt-plating"] = tile((g) => {
    const r = rampF([
      [0, "#5a6570"],
      [0.5, "#8a959f"],
      [1, "#c0c8d0"],
    ]);
    field(g, (x, y) => r(0.45 + (fbm(x / 120, y / 8, 791) - 0.5) * 0.3));
    g.strokeStyle = "rgba(20,24,30,.8)";
    g.lineWidth = 2;
    for (const [x, y, w, h] of [
      [0, 0, 160, 120],
      [160, 0, 240, 70],
      [160, 70, 120, 50],
      [280, 70, 120, 110],
      [0, 120, 90, 120],
      [90, 120, 190, 60],
      [90, 180, 190, 60],
      [280, 180, 120, 60],
    ]) {
      g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = "rgba(255,255,255,.12)";
      g.fillRect(x + 3, y + 3, w - 6, 3);
      for (const [px, py] of [
        [x + 7, y + 7],
        [x + w - 7, y + 7],
        [x + 7, y + h - 7],
        [x + w - 7, y + h - 7],
      ]) {
        g.fillStyle = "#3a4048";
        g.beginPath();
        g.arc(px, py, 3, 0, 7);
        g.fill();
        g.fillStyle = "#d0d8e0";
        g.beginPath();
        g.arc(px - 1, py - 1, 1.2, 0, 7);
        g.fill();
      }
    }
  });
  P["pt-oilslick"] = tile((g) =>
    field(g, (x, y) => {
      const n = fbm(x / 60, y / 60, 801),
        m = fbm(x / 25, y / 25, 802);
      const h = (n * 600 + m * 120) % 360,
        l = 0.12 + Math.pow(Math.abs(Math.sin(n * 18)), 3) * 0.35;
      return hsl(h, 0.85, l);
    }),
  );
  P["pt-plasma"] = tile((g) => {
    g.fillStyle = "#060a1e";
    g.fillRect(0, 0, W, HH);
    field(g, (x, y) => {
      const v = Math.abs(Math.sin(x / 30 + Math.sin(y / 23) * 2 + fbm(x / 60, y / 60, 811) * 5));
      const k = Math.pow(1 - v, 6);
      return [10 + k * 120, 20 + k * 200, 60 + k * 195];
    });
    g.fillStyle = "rgba(180,240,255,.8)";
    for (let k = 0; k < 30; k++) {
      g.beginPath();
      g.arc(H(k, 1, 812) * W, H(k, 2, 812) * HH, 1 + H(k, 3, 812) * 1.6, 0, 7);
      g.fill();
    }
  });
  // --- Casino ---
  P["pt-felt"] = tile((g) => {
    field(g, (x, y) => {
      const n = fbm(x / 6, y / 6, 901) * 0.6 + fbm(x / 60, y / 60, 902) * 0.4;
      return [10 + n * 22, 80 + n * 50, 40 + n * 26];
    }); // card table baize, with a gold-printed rail line
    g.strokeStyle = "rgba(212,175,55,.55)";
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(W / 2, HH / 2, W * 0.38, HH * 0.32, 0, 0, 7);
    g.stroke();
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(W / 2, HH / 2, W * 0.36, HH * 0.29, 0, 0, 7);
    g.stroke();
    shine(g, 0.15);
  });
  P["pt-suits"] = tile((g) => {
    g.fillStyle = "#f5f0e1";
    g.fillRect(0, 0, W, HH);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "bold 34px Georgia, serif"; // playing-card suits in rows
    const S = ["\u2660", "\u2665", "\u2666", "\u2663"];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 9; c++) {
        const k = (r + c * 3) % 4;
        g.fillStyle = k === 1 || k === 2 ? "#c8102e" : "#141414";
        g.fillText(S[k], c * 50 + (r % 2) * 25, r * 44 + 18);
      }
    }
    g.strokeStyle = "rgba(20,20,20,.15)";
    g.lineWidth = 2;
    g.strokeRect(6, 6, W - 12, HH - 12);
    shine(g, 0.2);
  });
  P["pt-roulette"] = tile((g) => {
    g.fillStyle = "#3a1a0a";
    g.fillRect(0, 0, W, HH);
    const cx = W / 2,
      cy = HH / 2,
      R = 190; // a roulette wheel: red and black pockets, a green zero, gold frets
    for (let k = 0; k < 37; k++) {
      g.fillStyle = k === 0 ? "#0b7a3a" : k % 2 ? "#c8102e" : "#141414";
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, R, (k / 37) * 6.283, ((k + 1) / 37) * 6.283);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = "#d4af37";
    g.lineWidth = 2;
    for (let k = 0; k < 37; k++) {
      const t = (k / 37) * 6.283;
      g.beginPath();
      g.moveTo(cx + Math.cos(t) * 40, cy + Math.sin(t) * 40);
      g.lineTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R);
      g.stroke();
    }
    for (const r of [40, 120, 150]) {
      g.lineWidth = r === 40 ? 6 : 3;
      g.beginPath();
      g.arc(cx, cy, r, 0, 7);
      g.stroke();
    }
    g.fillStyle = "#8a5a1a";
    g.beginPath();
    g.arc(cx, cy, 37, 0, 7);
    g.fill();
    g.fillStyle = "#d4af37";
    g.beginPath();
    g.arc(cx, cy, 10, 0, 7);
    g.fill();
    shine(g, 0.25);
  });
  P["pt-chips"] = tile((g) => {
    field(g, (x, y) => {
      const n = fbm(x / 8, y / 8, 905);
      return [12 + n * 18, 70 + n * 40, 36 + n * 20];
    }); // poker chips scattered on felt
    const cols = ["#c8102e", "#141414", "#1f5fd0", "#f5f0e1", "#0b7a3a", "#d4af37"];
    for (let k = 0; k < 26; k++) {
      const x = H(k, 1, 906) * W,
        y = H(k, 2, 906) * HH,
        r = 22 + H(k, 3, 906) * 6,
        col = cols[k % cols.length];
      g.fillStyle = "rgba(0,0,0,.35)";
      g.beginPath();
      g.arc(x + 3, y + 4, r, 0, 7);
      g.fill();
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
      g.fillStyle = col === "#f5f0e1" ? "#1f5fd0" : "#ffffff";
      for (let j = 0; j < 6; j++) {
        g.save();
        g.translate(x, y);
        g.rotate(j * 1.0472 + k);
        g.fillRect(-4, -r, 8, 7);
        g.restore();
      }
      g.strokeStyle = "rgba(255,255,255,.6)";
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(x, y, r * 0.62, 0, 7);
      g.stroke();
    }
    shine(g, 0.2);
  });
  P["pt-jackpot"] = tile((g) => {
    const r = rampF([
      [0, "#1a0a20"],
      [0.5, "#3a1040"],
      [1, "#5a1a50"],
    ]);
    field(g, (x, y) => r(fbm(x / 70, y / 70, 907))); // gold coins pouring out, with sparkle
    for (let k = 0; k < 34; k++) {
      const x = H(k, 1, 908) * W,
        y = H(k, 2, 908) * HH,
        rx = 12 + H(k, 3, 908) * 6,
        ry = rx * (0.45 + H(k, 4, 908) * 0.55);
      g.fillStyle = "#8a6018";
      g.beginPath();
      g.ellipse(x + 1.5, y + 2, rx, ry, 0, 0, 7);
      g.fill();
      const gr = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
      gr.addColorStop(0, "#fff3b0");
      gr.addColorStop(0.5, "#e8b923");
      gr.addColorStop(1, "#a8761a");
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, 7);
      g.fill();
      g.strokeStyle = "rgba(138,96,24,.8)";
      g.lineWidth = 1.2;
      g.beginPath();
      g.ellipse(x, y, rx * 0.7, ry * 0.7, 0, 0, 7);
      g.stroke();
    }
    for (let k = 0; k < 14; k++) {
      const x = H(k, 5, 909) * W,
        y = H(k, 6, 909) * HH,
        s2 = 4 + H(k, 7, 909) * 6;
      g.strokeStyle = "rgba(255,250,220,.95)";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x - s2, y);
      g.lineTo(x + s2, y);
      g.moveTo(x, y - s2);
      g.lineTo(x, y + s2);
      g.stroke();
    }
  });
  {
    const PH = { W, HH, H, mix, hexc, rampF, noise2, fbm, field, hsl, shine };
    for (const k in EXT_PAINT_ART) {
      P[k] = tile((g) => EXT_PAINT_ART[k](g, PH));
    }
  }
  const Q = {},
    made = {};
  for (const k in P) {
    Object.defineProperty(Q, k, { enumerable: true, get: () => made[k] || (made[k] = tileNow(P[k].__lazy)) });
  }
  return Q;
}
