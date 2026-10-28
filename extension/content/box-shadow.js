import { EXT_AURA } from "./registries.js";
import { breathe } from "./garage-folders.js";
import { sakuraFlower, sakuraPetal } from "./sakura-shapes.js";

// ---------- Shadow box (an original "shadow army" theme: black-violet smoke, glowing violet and blue) ----------
// buildShadowArt(A): A = { box1, back15, back42, tank: {turret, barrel, base, leftTread, rightTread}, haze }
// -> { box: 560x280 sheet, frames: {key: 640x384}, patterns: {key: 400x240} }
export async function buildShadowArt(A) {
  // (one picture per frame: no stutter)
  const H = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const mix = (a, b, t) => a + (b - a) * t;
  const cv = (w = 640, h = 384) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
  const rampAt = (stops, l) => {
    l = Math.max(0, Math.min(1, l));
    let s = 1;
    while (s < stops.length - 1 && l > stops[s][0]) {
      s++;
    }
    const [p0, c0] = stops[s - 1],
      [p1, c1] = stops[s],
      k = Math.max(0, Math.min(1, (l - p0) / (p1 - p0)));
    return [0, 1, 2].map((j) => mix(c0[j], c1[j], k));
  };
  const VOID = [
    [0, [6, 3, 14]],
    [0.35, [24, 10, 46]],
    [0.6, [58, 26, 112]],
    [0.8, [118, 70, 220]],
    [1, [214, 190, 255]],
  ];
  const GLOW = [
    [0, [40, 10, 90]],
    [0.4, [100, 44, 235]],
    [0.75, [140, 100, 255]],
    [1, [196, 176, 255]],
  ];
  const lumOf = (d, i) => (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
  const recolourImg = (img, W, Hh, fn) => {
    const c = cv(W, Hh),
      g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, Hh);
    const id = g.getImageData(0, 0, W, Hh),
      d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3]) {
        const o = fn(d, i, (i / 4) % W, Math.floor(i / 4 / W));
        d[i] = o[0];
        d[i + 1] = o[1];
        d[i + 2] = o[2];
      }
    }
    g.putImageData(id, 0, 0);
    return c;
  };
  const smoke = (g, x0, y0, x1, y1, n, seed, col) => {
    for (let k = 0; k < n; k++) {
      const x = mix(x0, x1, H(k, 1, seed)),
        y = mix(y0, y1, H(k, 2, seed)),
        r = 6 + H(k, 3, seed) * 18;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, col.replace("A", (0.25 + H(k, 4, seed) * 0.3).toFixed(2)));
      gr.addColorStop(1, col.replace("A", "0"));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    }
  };
  const out = { frames: {}, patterns: {}, box: null };
  // --- the box: the Standard box in black-violet, its badge and latches glowing, smoke at its feet, violet light when open
  await breathe();
  if (A.box1) {
    const b = recolourImg(A.box1, 560, 280, (d, i, x, y) => {
      const l = lumOf(d, i),
        badge = (x > 136 && x < 198 && y > 196 && y < 236) || (x > 416 && x < 484 && y > 196 && y < 236),
        latch = (x > 128 && x < 204 && y > 143 && y < 189) || (x > 405 && x < 473 && y > 172 && y < 187);
      return (badge && l < 0.7) || (latch && l > 0.8) ? rampAt(GLOW, 0.55 + l * 0.45) : rampAt(VOID, l * 0.85);
    });
    // glowing violet veins across the box, like cracks of light in shadow
    {
      const bg = b.getContext("2d", { willReadFrequently: true }),
        id = bg.getImageData(0, 0, 560, 280),
        d = id.data;
      const n2 = (x, y, sd) => {
        const xi = Math.floor(x),
          yi = Math.floor(y),
          xf = x - xi,
          yf = y - yi,
          sm = (t) => t * t * (3 - 2 * t);
        return mix(
          mix(H(xi, yi, sd), H(xi + 1, yi, sd), sm(xf)),
          mix(H(xi, yi + 1, sd), H(xi + 1, yi + 1, sd), sm(xf)),
          sm(yf),
        );
      };
      for (let y = 0; y < 280; y++) {
        for (let x = 0; x < 560; x++) {
          const i = (y * 560 + x) * 4;
          if (!d[i + 3]) {
            continue;
          }
          const v = Math.abs(
            0.5 * n2(x / 22, y / 22, 81) + 0.3 * n2(x / 11, y / 11, 82) + 0.2 * n2(x / 5, y / 5, 83) - 0.5,
          );
          if (v < 0.035) {
            const k = (1 - v / 0.035) * 0.85;
            d[i] = mix(d[i], 170, k);
            d[i + 1] = mix(d[i + 1], 130, k);
            d[i + 2] = mix(d[i + 2], 255, k);
          }
        }
      }
      bg.putImageData(id, 0, 0);
    }
    const s = cv(560, 280),
      g = s.getContext("2d");
    // open: violet light pouring out
    const lx = 445,
      ly = 176;
    g.save();
    g.filter = "blur(3px)";
    const gl = g.createRadialGradient(lx, ly, 4, lx, ly, 115);
    gl.addColorStop(0, "rgba(200,170,255,.95)");
    gl.addColorStop(0.45, "rgba(120,70,255,.45)");
    gl.addColorStop(1, "rgba(90,40,220,0)");
    g.fillStyle = gl;
    g.fillRect(280, 0, 280, 280);
    for (let k = -4; k <= 4; k++) {
      const a = -Math.PI / 2 - 0.25 + k * 0.17,
        rg = g.createLinearGradient(lx, ly, lx + Math.cos(a) * 165, ly + Math.sin(a) * 165);
      rg.addColorStop(0, "rgba(170,130,255,.6)");
      rg.addColorStop(1, "rgba(170,130,255,0)");
      g.fillStyle = rg;
      g.beginPath();
      g.moveTo(lx, ly);
      g.lineTo(lx + Math.cos(a - 0.045) * 165, ly + Math.sin(a - 0.045) * 165);
      g.lineTo(lx + Math.cos(a + 0.045) * 165, ly + Math.sin(a + 0.045) * 165);
      g.fill();
    }
    g.restore();
    // a faint violet glow round the box, then the box, then smoke curling over its base
    g.save();
    g.shadowColor = "rgba(130,80,255,.9)";
    g.shadowBlur = 14;
    g.drawImage(b, 0, 0);
    g.restore();
    smoke(g, 70, 238, 220, 272, 26, 3, "rgba(40,16,80,A)");
    smoke(g, 350, 238, 500, 272, 26, 4, "rgba(40,16,80,A)");
    smoke(g, 70, 246, 220, 270, 10, 5, "rgba(140,90,255,A)");
    smoke(g, 350, 246, 500, 270, 10, 6, "rgba(140,90,255,A)");
    out.box = s;
  }
  // --- Shadow Cape (back): the Halloween cape, black-violet with a glowing violet lining, trailing smoke
  await breathe();
  if (A.back15) {
    const c = recolourImg(A.back15, 640, 384, (d, i) => {
      const l = lumOf(d, i),
        red = d[i] > d[i + 1] + 50;
      return red ? rampAt(GLOW, 0.25 + l * 0.9) : rampAt(VOID, l * 0.9);
    });
    const f = cv(),
      g = f.getContext("2d");
    g.save();
    g.shadowColor = "rgba(140,90,255,.85)";
    g.shadowBlur = 10;
    g.drawImage(c, 0, 0);
    g.restore();
    out.frames["sh-cape"] = f;
  }
  // --- Shadow Aura (front): the Dimension-Hopper's haze turned to black smoke with violet light, around the tank
  await breathe();
  if (A.haze && A.tank && A.tank.base) {
    const mask = cv(),
      mg = mask.getContext("2d");
    for (const k of ["leftTread", "turret", "base", "rightTread", "barrel"]) {
      if (A.tank[k]) {
        mg.drawImage(A.tank[k], 0, 0, 640, 384);
      }
    }
    const hz = recolourImg(A.haze, 640, 384, (d, i) =>
      rampAt(
        [
          [0, [4, 2, 10]],
          [0.45, [30, 12, 64]],
          [0.75, [96, 54, 210]],
          [1, [200, 180, 255]],
        ],
        lumOf(d, i) * 1.1,
      ),
    );
    const f = cv(),
      g = f.getContext("2d");
    g.drawImage(hz, 0, 0);
    g.globalCompositeOperation = "destination-out";
    g.drawImage(mask, 0, 0);
    g.globalCompositeOperation = "source-over";
    // dark wisps on the tank itself
    const t = cv(),
      tg = t.getContext("2d");
    smoke(tg, 140, 150, 500, 370, 40, 9, "rgba(20,6,40,A)");
    tg.globalCompositeOperation = "destination-in";
    tg.drawImage(mask, 0, 0);
    g.drawImage(t, 0, 0);
    out.frames["sh-aura"] = f;
  }
  // --- Shadow Eyes (turret): two glowing eyes in the dark on the turret's face
  {
    const f = cv(),
      g = f.getContext("2d");
    const eye = (x, y, r) => {
      g.save();
      g.translate(x, y);
      g.rotate(-0.2);
      g.shadowColor = "#7fd0ff";
      g.shadowBlur = 18;
      g.fillStyle = "rgba(160,220,255,.95)";
      g.beginPath();
      g.ellipse(0, 0, r * 1.6, r * 0.7, 0, 0, 7);
      g.fill();
      g.shadowBlur = 6;
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(0, 0, r * 0.8, r * 0.35, 0, 0, 7);
      g.fill();
      g.restore();
    };
    const mist = g.createRadialGradient(300, 190, 2, 300, 190, 60);
    mist.addColorStop(0, "rgba(10,4,24,.75)");
    mist.addColorStop(1, "rgba(10,4,24,0)");
    g.fillStyle = mist;
    g.fillRect(230, 130, 140, 120);
    eye(290, 182, 9);
    eye(334, 172, 9);
    out.frames["sh-eyes"] = f;
  }
  // --- Divine Cape (for the Heaven box): the gold cape, pearl white with its gold lining kept, glowing softly
  await breathe();
  if (A.back42) {
    const c = recolourImg(A.back42, 640, 384, (d, i) => {
      const l = lumOf(d, i),
        gold = d[i] > d[i + 2] + 40;
      return gold
        ? [d[i], d[i + 1], d[i + 2]]
        : rampAt(
            [
              [0, [150, 160, 190]],
              [0.35, [205, 214, 236]],
              [0.7, [240, 244, 252]],
              [1, [255, 255, 255]],
            ],
            0.3 + l * 1.4,
          );
    });
    const f = cv(),
      g = f.getContext("2d");
    g.save();
    g.shadowColor = "rgba(255,236,170,.9)";
    g.shadowBlur = 12;
    g.drawImage(c, 0, 0);
    g.restore();
    const d = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, 640, 384).data;
    const pts = [];
    for (let y = 0; y < 384; y += 6) {
      for (let x = 0; x < 640; x += 6) {
        if (d[(y * 640 + x) * 4 + 3] > 200) {
          pts.push([x, y]);
        }
      }
    }
    for (let k = 0; k < 7 && pts.length; k++) {
      const [x, y] = pts[Math.floor(H(k, 1, 13) * pts.length)],
        r = 3 + H(k, 2, 13) * 4;
      g.save();
      g.fillStyle = "#fffbe6";
      g.shadowColor = "#ffd76a";
      g.shadowBlur = r * 2;
      g.beginPath();
      g.moveTo(x, y - r);
      g.quadraticCurveTo(x, y, x + r, y);
      g.quadraticCurveTo(x, y, x, y + r);
      g.quadraticCurveTo(x, y, x - r, y);
      g.quadraticCurveTo(x, y, x, y - r);
      g.fill();
      g.restore();
    }
    out.frames["hv-cape"] = f;
  }
  // --- paints (400x240 tiles)
  const W = 400,
    HH = 240;
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
  const tile = (fn) => {
    const c = cv(W, HH),
      g = c.getContext("2d"),
      id = g.createImageData(W, HH);
    for (let y = 0; y < HH; y++) {
      for (let x = 0; x < W; x++) {
        const o = fn(x, y),
          i = (y * W + x) * 4;
        id.data[i] = o[0];
        id.data[i + 1] = o[1];
        id.data[i + 2] = o[2];
        id.data[i + 3] = 255;
      }
    }
    g.putImageData(id, 0, 0);
    return c;
  };
  await breathe();
  out.patterns["sh-mist"] = tile((x, y) =>
    rampAt(
      [
        [0, [4, 2, 10]],
        [0.45, [22, 10, 44]],
        [0.7, [70, 34, 140]],
        [1, [170, 140, 255]],
      ],
      Math.pow(fbm(x / 60, y / 60, 61), 1.3) * 1.25,
    ),
  );
  await breathe();
  out.patterns["sh-monarch"] = tile((x, y) => {
    const v = Math.abs(fbm(x / 40, y / 40, 63) - 0.5);
    return rampAt(
      [
        [0, [235, 225, 255]],
        [0.04, [140, 90, 255]],
        [0.12, [60, 24, 130]],
        [1, [14, 6, 30]],
      ],
      v * 2.2,
    );
  });
  await breathe();
  out.patterns["sh-abyss"] = (() => {
    const c = tile((x, y) =>
      rampAt(
        [
          [0, [2, 2, 6]],
          [1, [26, 16, 52]],
        ],
        fbm(x / 90, y / 90, 65),
      ),
    );
    const g = c.getContext("2d");
    for (let k = 0; k < 9; k++) {
      const x = H(k, 1, 67) * W,
        y = H(k, 2, 67) * HH;
      g.save();
      g.shadowColor = "#7fd0ff";
      g.shadowBlur = 8;
      g.fillStyle = "rgba(170,225,255,.9)";
      for (const dx of [-6, 6]) {
        g.beginPath();
        g.ellipse(x + dx, y, 4, 1.8, -0.15, 0, 7);
        g.fill();
      }
      g.restore();
    }
    return c;
  })();
  await breathe();
  out.patterns["sh-flame"] = tile((x, y) => {
    const n = fbm(x / 35, y / 70 + fbm(x / 80, y / 80, 71) * 1.5, 69),
      t = Math.max(0, Math.min(1, n * 1.4 - (1 - y / HH) * 0.35));
    return rampAt(
      [
        [0, [6, 2, 14]],
        [0.45, [40, 12, 90]],
        [0.7, [120, 50, 255]],
        [0.88, [120, 200, 255]],
        [1, [240, 250, 255]],
      ],
      t,
    );
  });
  return out;
}
// Auras (front slot): drawn round the game's own tank shape (P = tank parts). Layers: a wide soft bloom, the aura's
// own effect (wisps, flames, rings, dust, code, prism light), a bright rim of light along the tank's edge, and a soft
// fade where it meets the tank, so it glows off the tank instead of looking cut out around it.
// kind: 'glow' | 'flames' | 'orbit' | 'stardust' | 'timeshift' | 'shadow' | 'code' | 'prism'
export function drawAura(kind, P) {
  const W = 640,
    H = 384,
    cv = () => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      return c;
    };
  const hash = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const mask = cv(),
    mg = mask.getContext("2d", { willReadFrequently: true });
  for (const k of ["leftTread", "turret", "base", "rightTread", "barrel"]) {
    if (P[k]) {
      mg.drawImage(P[k], 0, 0, W, H);
    }
  }
  const tint = (src, col) => {
    const c = cv(),
      g = c.getContext("2d");
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = col;
    g.fillRect(0, 0, W, H);
    return c;
  };
  const blurred = (src, px, times = 1, dx = 0, dy = 0) => {
    const c = cv(),
      g = c.getContext("2d");
    g.filter = "blur(" + px + "px)";
    for (let i = 0; i < times; i++) {
      g.drawImage(src, dx, dy);
    }
    return c;
  };
  // where the tank's outline is, widened: effects are kept near it
  const near = (px, times = 2, dy = 0) => blurred(mask, px, times, 0, dy);
  const keepNear = (c, n) => {
    const g = c.getContext("2d");
    g.globalCompositeOperation = "destination-in";
    g.drawImage(n, 0, 0);
    g.globalCompositeOperation = "source-over";
    return c;
  };
  const out = cv(),
    g = out.getContext("2d");
  let rimC;
  const bloom = (col, px, a, times = 2) => {
    g.save();
    g.globalAlpha = Math.min(1, a * 1.35);
    times += 1;
    g.drawImage(blurred(tint(mask, col), px, times), 0, 0);
    g.restore();
  };
  const star = (x, y, r, col, a = 1) => {
    g.save();
    g.globalAlpha = a;
    g.fillStyle = col;
    g.shadowColor = col;
    g.shadowBlur = r * 2.5;
    g.beginPath();
    g.moveTo(x, y - r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.quadraticCurveTo(x, y, x, y + r);
    g.quadraticCurveTo(x, y, x - r, y);
    g.quadraticCurveTo(x, y, x, y - r);
    g.fill();
    g.restore();
  };
  // soft tongues of light leaving the tank's edge (outline points, pushed outward)
  const edge = [];
  {
    const d = mg.getImageData(0, 0, W, H).data,
      A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[(y * W + x) * 4 + 3]);
    for (let y = 2; y < H - 2; y += 3) {
      for (let x = 2; x < W - 2; x += 3) {
        if (A(x, y) > 128 && (A(x - 4, y) < 60 || A(x + 4, y) < 60 || A(x, y - 4) < 60 || A(x, y + 4) < 60)) {
          edge.push([x, y]);
        }
      }
    }
  }
  let cx = 0,
    cy = 0;
  edge.forEach(([x, y]) => {
    cx += x;
    cy += y;
  });
  cx /= edge.length || 1;
  cy /= edge.length || 1;
  const wisps = (n, cols, len, wid, seed, up = 0.35) => {
    const c = cv(),
      wg = c.getContext("2d");
    for (let k = 0; k < n && edge.length; k++) {
      const [x, y] = edge[Math.floor(hash(k, 1, seed) * edge.length)];
      let dx = x - cx,
        dy = y - cy;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy = dy / l - up;
      const l2 = Math.hypot(dx, dy) || 1;
      dx /= l2;
      dy /= l2;
      const L = len * (0.55 + hash(k, 2, seed) * 0.8),
        w = wid * (0.6 + hash(k, 3, seed) * 0.7),
        bend = (hash(k, 4, seed) - 0.5) * L * 0.7;
      const ex = x + dx * L - dy * bend,
        ey = y + dy * L + dx * bend,
        col = cols[k % cols.length];
      const gr = wg.createLinearGradient(x, y, ex, ey);
      gr.addColorStop(0, col + "cc");
      gr.addColorStop(0.6, col + "55");
      gr.addColorStop(1, col + "00");
      wg.fillStyle = gr;
      wg.beginPath();
      wg.moveTo(x - dy * w, y + dx * w);
      wg.quadraticCurveTo(
        x + dx * L * 0.5 - dy * (bend * 0.6 + w * 0.6),
        y + dy * L * 0.5 + dx * (bend * 0.6 + w * 0.6),
        ex,
        ey,
      );
      wg.quadraticCurveTo(
        x + dx * L * 0.5 - dy * (bend * 0.6 - w * 0.6),
        y + dy * L * 0.5 + dx * (bend * 0.6 - w * 0.6),
        x + dy * w,
        y - dx * w,
      );
      wg.closePath();
      wg.fill();
    }
    g.save();
    g.filter = "blur(3px)";
    g.drawImage(c, 0, 0);
    g.restore();
  };
  const rim = (col, a) => {
    // bright light just inside the tank's edge
    const r = blurred(tint(mask, col), 2, 2),
      rg = r.getContext("2d");
    rg.globalCompositeOperation = "destination-in";
    rg.drawImage(mask, 0, 0);
    rg.globalCompositeOperation = "destination-out";
    const core = blurred(mask, 6, 1);
    for (let i = 0; i < 3; i++) {
      rg.drawImage(core, 0, 0);
    }
    g.save();
    g.globalAlpha = a;
    g.drawImage(r, 0, 0);
    g.restore();
  };
  if (kind === "glow") {
    // cosmic glow: blue-violet bloom with soft wisps and stars
    bloom("#2f6bff", 34, 0.55, 3);
    bloom("#9b4bff", 18, 0.8, 2);
    bloom("#f0c8ff", 6, 0.9, 2);
    wisps(46, ["#b98cff", "#7fb6ff", "#ffc4f2"], 46, 7, 21);
    for (let k = 0; k < 18; k++) {
      const [x, y] = edge[Math.floor(hash(k, 9, 22) * edge.length)] || [320, 200];
      star(x + (x - cx) * 0.35, y + (y - cy) * 0.35 - 10, 2 + hash(k, 3, 22) * 4, "#ffffff", 0.95);
    }
    rimC = ["#f4dcff", 0.75];
  } else if (kind === "flames") {
    // cosmic fire licking up off the tank
    bloom("#5a2cff", 26, 0.6, 3);
    bloom("#ff4fd8", 12, 0.55, 2);
    wisps(70, ["#7a4bff", "#ff5ad8", "#5ad1ff"], 70, 10, 31, 1.1);
    wisps(40, ["#ffe0ff", "#ffd1f5"], 34, 5, 32, 1.2); // hot cores
    for (let k = 0; k < 16; k++) {
      const [x, y] = edge[Math.floor(hash(k, 9, 33) * edge.length)] || [320, 200];
      star(x + (hash(k, 4, 33) - 0.5) * 30, y - 30 - hash(k, 5, 33) * 70, 1.5 + hash(k, 3, 33) * 3, "#ffe9ff", 0.9);
    }
    rimC = ["#ffd6ff", 0.7];
  } else if (kind === "orbit") {
    // tilted glowing rings with comets running round the tank
    bloom("#6a3cff", 20, 0.5, 2);
    const ring = (rx, ry, rot, col, w, a) => {
      g.save();
      g.translate(cx, cy + 10);
      g.rotate(rot);
      g.globalAlpha = a;
      g.strokeStyle = col;
      g.lineWidth = w;
      g.shadowColor = col;
      g.shadowBlur = 14;
      g.beginPath();
      g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    };
    const R = [
      [250, 74, -0.12, "#a77bff", 3.5, 0.95, 41],
      [228, 100, 0.35, "#5ad1ff", 2.5, 0.8, 42],
      [272, 54, -0.45, "#ff7ad9", 2, 0.7, 43],
    ];
    for (const [rx, ry, rot, col, w, a] of R) {
      ring(rx, ry, rot, col, w * 3, a * 0.25);
      ring(rx, ry, rot, col, w, a);
    }
    for (const [rx, ry, rot, col, , , s] of R) {
      for (let k = 0; k < 3; k++) {
        // comets with tails
        const a0 = hash(k, 1, s) * Math.PI * 2;
        for (let t = 0; t < 14; t++) {
          const a = a0 - t * 0.035,
            x = Math.cos(a) * rx,
            y = Math.sin(a) * ry;
          star(
            cx + x * Math.cos(rot) - y * Math.sin(rot),
            cy + 10 + x * Math.sin(rot) + y * Math.cos(rot),
            Math.max(0.8, 5.5 - t * 0.38),
            t ? col : "#ffffff",
            1 - t / 15,
          );
        }
      }
    }
    rimC = ["#d9c8ff", 0.6];
  } else if (kind === "stardust") {
    // a deep halo full of drifting stardust
    bloom("#2b2c9a", 40, 0.6, 3);
    bloom("#7a3cff", 24, 0.55, 2);
    bloom("#5ab4ff", 10, 0.5, 2);
    const dust = cv(),
      dg = dust.getContext("2d");
    for (let k = 0; k < 520; k++) {
      const x = 60 + hash(k, 1, 51) * 520,
        y = 40 + hash(k, 2, 51) * 330,
        r = 0.6 + Math.pow(hash(k, 3, 51), 3) * 2.6;
      dg.fillStyle = ["#ffffff", "#e2c9ff", "#a9e4ff", "#ffb8ec"][k % 4];
      dg.globalAlpha = 0.35 + hash(k, 4, 51) * 0.65;
      dg.beginPath();
      dg.arc(x, y, r, 0, 7);
      dg.fill();
    }
    dg.globalAlpha = 1;
    keepNear(dust, near(34, 3));
    g.drawImage(dust, 0, 0);
    for (let k = 0; k < 12; k++) {
      const [x, y] = edge[Math.floor(hash(k, 9, 53) * edge.length)] || [320, 200];
      star(x + (x - cx) * 0.5, y + (y - cy) * 0.5, 3 + hash(k, 3, 53) * 5, "#ffffff", 0.95);
    }
    rimC = ["#cfe6ff", 0.6];
  } else if (kind === "timeshift") {
    // a ghostly black-hole trail: void echoes of the tank with glowing event-horizon edges
    const smoke = cv(),
      sm = smoke.getContext("2d"); // cosmic smoke the echoes fade into
    for (let k = 0; k < 90; k++) {
      const t = hash(k, 1, 81),
        x = cx - 30 - t * 250,
        y = cy - 70 + hash(k, 2, 81) * 150 + t * -10,
        r = 18 + hash(k, 3, 81) * 34 * (1 - t * 0.4);
      const gr = sm.createRadialGradient(x, y, 0, x, y, r);
      const c0 = ["#1a0638", "#0a0418", "#3a0f6a", "#120a30"][k % 4];
      gr.addColorStop(0, c0 + "aa");
      gr.addColorStop(1, c0 + "00");
      sm.fillStyle = gr;
      sm.fillRect(x - r, y - r, r * 2, r * 2);
    }
    keepNear(smoke, near(40, 4));
    g.save();
    g.globalAlpha = 0.9;
    g.filter = "blur(4px)";
    g.drawImage(smoke, 0, 0);
    g.restore();
    const ghosts = [
      [-44, -6, 0.7, 1],
      [-90, -11, 0.5, 2],
      [-138, -15, 0.32, 3.5],
      [-188, -18, 0.18, 5],
    ];
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const [dx, dy, a, b] = ghosts[i];
      g.save();
      g.globalAlpha = a * 0.6;
      g.drawImage(blurred(tint(mask, "#ff9a3c"), b + 4, 2, dx + 3, dy), 0, 0);
      g.drawImage(blurred(tint(mask, "#9b5cff"), b + 6, 2, dx - 3, dy), 0, 0);
      g.restore(); // event-horizon glow
      g.save();
      g.globalAlpha = a;
      g.drawImage(blurred(tint(mask, "#06020e"), b, 1, dx, dy), 0, 0);
      g.restore(); // the void body
      const e = blurred(tint(mask, i % 2 ? "#c9a8ff" : "#ffd9a8"), 1, 1, dx, dy),
        eg = e.getContext("2d");
      eg.globalCompositeOperation = "destination-out";
      eg.drawImage(blurred(mask, 3, 2, dx, dy), 0, 0);
      g.save();
      g.globalAlpha = Math.min(1, a * 1.6);
      g.drawImage(e, 0, 0);
      g.restore();
    }
    bloom("#5a22c8", 12, 0.45, 2);
    for (let k = 0; k < 30; k++) {
      const t = hash(k, 1, 83),
        x = cx - 40 - t * 280,
        y = cy - 80 + hash(k, 2, 83) * 170; // stars being pulled along
      g.save();
      g.globalAlpha = 0.35 + 0.5 * (1 - t);
      g.strokeStyle = ["#ffffff", "#e0d0ff", "#ffe3c4"][k % 3];
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 6 + (1 - t) * 14, y - 1);
      g.stroke();
      g.restore();
      star(x, y, 1.2 + hash(k, 3, 83) * 2.5, "#ffffff", 0.9);
    }
    rimC = ["#e6d4ff", 0.7];
  } else if (kind === "shadow") {
    // Shadow box: dark violet smoke curling off the tank
    bloom("#12052a", 30, 0.8, 3);
    bloom("#5a22c8", 14, 0.6, 2);
    wisps(80, ["#1c0838", "#3a1470", "#0c0418", "#5a22c8"], 70, 11, 41, 1.0);
    wisps(34, ["#a77bff", "#6a8cff"], 34, 3.5, 42, 1.1);
    for (let k = 0; k < 14; k++) {
      const [x, y] = edge[Math.floor(hash(k, 9, 43) * edge.length)] || [320, 200];
      star(x + (x - cx) * 0.3, y + (y - cy) * 0.3 - 12, 1.5 + hash(k, 3, 43) * 3, "#c9b0ff", 0.9);
    }
    rimC = ["#b388ff", 0.75];
  } else if (kind === "sakura") {
    // Sakura: soft pink glow with petals drifting round the tank
    bloom("#ff9ab5", 26, 0.55, 3);
    bloom("#ffd1dc", 10, 0.6, 2);
    const pet = cv(),
      pg = pet.getContext("2d");
    for (let k = 0; k < 70; k++) {
      sakuraPetal(
        pg,
        70 + hash(k, 1, 95) * 500,
        50 + hash(k, 2, 95) * 320,
        4 + hash(k, 3, 95) * 6,
        hash(k, 4, 95) * 6.3,
        ["#ffd1dc", "#ff9ab5", "#fff0f5", "#ff7aa0"][k % 4],
      );
    }
    keepNear(pet, near(30, 3, -8));
    g.drawImage(pet, 0, 0);
    for (let k = 0; k < 4; k++) {
      const [x, y] = edge[Math.floor(hash(k, 9, 96) * edge.length)] || [320, 200];
      sakuraFlower(g, x + (x - cx) * 0.25, y + (y - cy) * 0.25 - 8, 8 + hash(k, 3, 96) * 4, k, "#ffe4ec");
    }
    rimC = ["#ffe4ec", 0.7];
  } else if (kind === "code") {
    // Hacker: green code streaming off the tank
    bloom("#00a028", 28, 0.6, 3);
    bloom("#00ff41", 10, 0.55, 2);
    const rain = cv(),
      rg = rain.getContext("2d"),
      glyphs = "0123456789ABCDEFｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ<>/=";
    rg.font = 'bold 16px Consolas, "MS Gothic", monospace';
    rg.textAlign = "center";
    for (let col = 0; col < 44; col++) {
      const x = 50 + col * 12.5 + hash(col, 1, 61) * 5,
        top = hash(col, 2, 61) * 200,
        len = 7 + Math.floor(hash(col, 3, 61) * 13);
      for (let k = 0; k < len; k++) {
        const y = top + k * 17,
          head = k === len - 1;
        rg.globalAlpha = head ? 1 : 0.45 + (0.55 * k) / len;
        rg.fillStyle = head ? "#eafff0" : k % 3 ? "#00e63a" : "#00b82e";
        rg.shadowColor = "#00ff41";
        rg.shadowBlur = head ? 12 : 4;
        rg.lineWidth = 3;
        rg.strokeStyle = "rgba(0,40,10,.55)";
        rg.strokeText(glyphs[Math.floor(hash(col, k, 62) * glyphs.length)], x, y);
        rg.fillText(glyphs[Math.floor(hash(col, k, 62) * glyphs.length)], x, y);
      }
    }
    rg.globalAlpha = 1;
    keepNear(rain, near(42, 4, -14));
    g.drawImage(rain, 0, 0);
    rimC = ["#b8ffc8", 0.75];
  } else if (kind === "speed") {
    // Racing: speed streaks streaming back off the tank, with sparks
    bloom("#7ad0ff", 18, 0.35, 2);
    const st = cv(),
      sg = st.getContext("2d");
    sg.lineCap = "round";
    for (let k = 0; k < 46 && edge.length; k++) {
      const [x, y] = edge[Math.floor(hash(k, 1, 71) * edge.length)];
      if (x > cx + 60) {
        continue;
      }
      const L = 70 + hash(k, 2, 71) * 150,
        w = 2 + hash(k, 3, 71) * 5,
        col = ["#ffffff", "#9fe3ff", "#4fb4ff", "#ffd23a"][k % 4];
      const gr = sg.createLinearGradient(x, y, x - L, y + L * 0.18);
      gr.addColorStop(0, col);
      gr.addColorStop(1, col + "00");
      sg.strokeStyle = gr;
      sg.lineWidth = w;
      sg.beginPath();
      sg.moveTo(x, y);
      sg.lineTo(x - L, y + L * 0.18);
      sg.stroke();
    }
    g.drawImage(st, 0, 0);
    for (let k = 0; k < 18; k++) {
      const [x, y] = edge[Math.floor(hash(k, 9, 72) * edge.length)] || [320, 200];
      if (x > cx) {
        continue;
      }
      star(
        x - 20 - hash(k, 4, 72) * 60,
        y + (hash(k, 5, 72) - 0.5) * 20,
        2 + hash(k, 3, 72) * 3,
        ["#ffffff", "#ffd23a", "#9fe3ff"][k % 3],
        0.9,
      );
    }
    rimC = ["#e0f6ff", 0.7];
  } else if (kind === "splat") {
    // Graffiti: neon paint splattered round the tank
    const sp = cv(),
      pg = sp.getContext("2d"),
      cols = ["#ff2d95", "#22e0ff", "#c6ff1a", "#ffd400", "#9b4dff"];
    for (let k = 0; k < 34 && edge.length; k++) {
      const [x0, y0] = edge[Math.floor(hash(k, 1, 81) * edge.length)];
      const x = x0 + (x0 - cx) * 0.3,
        y = y0 + (y0 - cy) * 0.3,
        r = 5 + hash(k, 2, 81) * 11,
        col = cols[k % cols.length];
      pg.fillStyle = col;
      pg.beginPath();
      pg.arc(x, y, r, 0, 7);
      pg.fill();
      for (let j = 0; j < 7; j++) {
        const a = hash(j, k, 82) * 6.28,
          d = r * (1.3 + hash(j, k, 83) * 1.4);
        pg.beginPath();
        pg.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + hash(j, k, 84) * 3, 0, 7);
        pg.fill();
      }
      if (hash(k, 5, 81) > 0.6) {
        pg.fillRect(x - r * 0.25, y, r * 0.5, r * 1.6 + hash(k, 6, 81) * 14);
        pg.beginPath();
        pg.arc(x, y + r * 1.6 + hash(k, 6, 81) * 14, r * 0.3, 0, 7);
        pg.fill();
      }
    }
    keepNear(sp, near(40, 4, 0));
    g.drawImage(sp, 0, 0);
    rimC = null; // just the paint, no glow
  } else if (kind === "bubbles") {
    // Deep Sea: bubbles rising round the tank
    for (let k = 0; k < 40 && edge.length; k++) {
      const [x0, y0] = edge[Math.floor(hash(k, 1, 131) * edge.length)];
      const x = x0 + (x0 - cx) * 0.35 + (hash(k, 2, 131) - 0.5) * 10,
        y = y0 + (y0 - cy) * 0.35 - hash(k, 3, 131) * 40,
        r = 3 + hash(k, 4, 131) * 9;
      g.strokeStyle = "rgba(200,250,255,.9)";
      g.lineWidth = Math.max(1.2, r / 4);
      g.fillStyle = "rgba(120,220,255,.18)";
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
      g.stroke();
      g.fillStyle = "rgba(255,255,255,.85)";
      g.beginPath();
      g.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, 7);
      g.fill();
    }
    rimC = null;
  } else if (kind === "sprinkles") {
    // Sweet Shop: sprinkles scattered round the tank
    const cols = ["#ff3d7f", "#2fc6ff", "#ffe14d", "#6ee86b", "#ffffff", "#a66bff", "#ff8a3d"];
    for (let k = 0; k < 70 && edge.length; k++) {
      const [x0, y0] = edge[Math.floor(hash(k, 1, 141) * edge.length)];
      const x = x0 + (x0 - cx) * (0.15 + hash(k, 2, 141) * 0.35),
        y = y0 + (y0 - cy) * (0.15 + hash(k, 3, 141) * 0.35);
      g.save();
      g.translate(x, y);
      g.rotate(hash(k, 4, 141) * 6.3);
      g.scale(1.45, 1.45);
      g.fillStyle = "#14161c";
      g.beginPath();
      g.roundRect(-6.5, -2.6, 13, 5.2, 2.6);
      g.fill();
      g.fillStyle = cols[k % cols.length];
      g.beginPath();
      g.roundRect(-5.5, -1.8, 11, 3.6, 1.8);
      g.fill();
      g.restore();
    }
    rimC = null;
  } else if (kind === "pixels") {
    // Arcade: neon pixels bursting off the tank
    const cols = ["#ff2bd6", "#00e5ff", "#fff200", "#39ff14"];
    for (let k = 0; k < 60 && edge.length; k++) {
      const [x0, y0] = edge[Math.floor(hash(k, 1, 151) * edge.length)];
      const d = 0.15 + hash(k, 2, 151) * 0.4,
        s = 4 + Math.floor(hash(k, 3, 151) * 3) * 3,
        x = Math.round((x0 + (x0 - cx) * d) / 3) * 3,
        y = Math.round((y0 + (y0 - cy) * d) / 3) * 3,
        col = cols[k % 4];
      g.save();
      g.shadowColor = col;
      g.shadowBlur = 8;
      g.fillStyle = col;
      g.fillRect(x, y, s, s);
      g.restore();
    }
    rimC = null;
  } else if (kind === "leaves") {
    // Safari: jungle leaves drifting round the tank
    const cols = ["#2f7a2a", "#4aa03a", "#6ac04a", "#1f5a24", "#8ab83a"];
    for (let k = 0; k < 34 && edge.length; k++) {
      const [x0, y0] = edge[Math.floor(hash(k, 1, 161) * edge.length)];
      const d = 0.2 + hash(k, 2, 161) * 0.35,
        x = x0 + (x0 - cx) * d,
        y = y0 + (y0 - cy) * d,
        L = 14 + hash(k, 3, 161) * 14;
      g.save();
      g.translate(x, y);
      g.rotate(hash(k, 4, 161) * 6.3);
      g.fillStyle = "#14161c";
      g.beginPath();
      g.moveTo(-1.5, 0);
      g.quadraticCurveTo(L * 0.5, -L * 0.42, L + 1.5, 0);
      g.quadraticCurveTo(L * 0.5, L * 0.42, -1.5, 0);
      g.fill();
      g.fillStyle = cols[k % 5];
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(L * 0.5, -L * 0.35, L, 0);
      g.quadraticCurveTo(L * 0.5, L * 0.35, 0, 0);
      g.fill();
      g.strokeStyle = "rgba(220,255,170,.5)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(L, 0);
      g.stroke();
      g.restore();
    }
    rimC = null;
  } else if (kind === "steam") {
    // Steampunk: puffs of steam and a few brass sparks
    for (let k = 0; k < 26 && edge.length; k++) {
      const [x0, y0] = edge[Math.floor(hash(k, 1, 171) * edge.length)];
      const x = x0 + (x0 - cx) * 0.3,
        y = y0 + (y0 - cy) * 0.3 - hash(k, 2, 171) * 20,
        r = 8 + hash(k, 3, 171) * 12;
      g.fillStyle = `rgba(235,235,240,${0.45 + hash(k, 4, 171) * 0.35})`;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.arc(x + r * 0.7, y + 2, r * 0.65, 0, 7);
      g.arc(x - r * 0.6, y + 3, r * 0.55, 0, 7);
      g.fill();
    }
    for (let k = 0; k < 18; k++) {
      const [x, y] = edge[Math.floor(hash(k, 9, 172) * edge.length)] || [320, 200];
      star(x + (x - cx) * 0.45, y + (y - cy) * 0.45, 2 + hash(k, 3, 172) * 3, "#ffcf6a", 0.9);
    }
    rimC = null;
  } else if (kind === "glint") {
    // Kingdom: a soft gold glow with royal sparkles
    bloom("#ffd76a", 18, 0.45, 2);
    for (let k = 0; k < 26; k++) {
      const [x, y] = edge[Math.floor(hash(k, 9, 181) * edge.length)] || [320, 200];
      star(
        x + (x - cx) * 0.4,
        y + (y - cy) * 0.4,
        3 + hash(k, 3, 181) * 6,
        ["#fff3c4", "#ffd76a", "#ffffff", "#e8b8ff"][k % 4],
        0.95,
      );
    }
    rimC = ["#ffe9a8", 0.5];
  } else if (kind === "dust") {
    // Wild West: a dust cloud kicked up round the treads
    for (let k = 0; k < 30 && edge.length; k++) {
      const [x0, y0] = edge[Math.floor(hash(k, 1, 191) * edge.length)];
      if (y0 < cy) {
        continue;
      }
      const x = x0 + (x0 - cx) * 0.3,
        y = y0 + (y0 - cy) * 0.25,
        r = 10 + hash(k, 3, 191) * 16;
      g.fillStyle = `rgba(${200 + hash(k, 4, 191) * 30},${170 + hash(k, 5, 191) * 20},120,${0.35 + hash(k, 6, 191) * 0.3})`;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.arc(x + r * 0.7, y + 3, r * 0.6, 0, 7);
      g.fill();
    }
    rimC = null;
  } else if (kind === "hibiscus") {
    // Tropical: hibiscus flowers round the tank
    const cols = ["#ff3d5a", "#ff8fb0", "#ffd23f", "#ffffff", "#ff8a3d"];
    for (let k = 0; k < 22 && edge.length; k++) {
      const [x0, y0] = edge[Math.floor(hash(k, 1, 201) * edge.length)];
      const d = 0.2 + hash(k, 2, 201) * 0.3,
        x = x0 + (x0 - cx) * d,
        y = y0 + (y0 - cy) * d,
        r = 7 + hash(k, 3, 201) * 6,
        col = cols[k % 5];
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * 6.283 + k;
        g.fillStyle = "#14161c";
        g.beginPath();
        g.ellipse(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.8, r * 0.55, a, 0, 7);
        g.fill();
      }
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * 6.283 + k;
        g.fillStyle = col;
        g.beginPath();
        g.ellipse(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.7, r * 0.45, a, 0, 7);
        g.fill();
      }
      g.fillStyle = "#c0102a";
      g.beginPath();
      g.arc(x, y, r * 0.25, 0, 7);
      g.fill();
    }
    rimC = null;
  } else if (kind === "electric") {
    // Mech: crackling blue electric arcs
    bloom("#3fc8ff", 14, 0.35, 2);
    g.lineCap = "round";
    for (let k = 0; k < 16 && edge.length; k++) {
      const [x0, y0] = edge[Math.floor(hash(k, 1, 211) * edge.length)];
      let x = x0,
        y = y0;
      const dx = x0 - cx,
        dy = y0 - cy,
        l = Math.hypot(dx, dy) || 1;
      g.strokeStyle = k % 3 ? "#9fe8ff" : "#ffffff";
      g.shadowColor = "#3fc8ff";
      g.shadowBlur = 10;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (dx / l) * 9 + (hash(j, k, 212) - 0.5) * 14;
        y += (dy / l) * 9 + (hash(j, k, 213) - 0.5) * 14;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.shadowBlur = 0;
    rimC = ["#9fe8ff", 0.5];
  } else if (kind === "jackpot") {
    // Casino: a gold glow, coins and card suits bursting off the tank
    bloom("#ffd23f", 18, 0.4, 2);
    for (let k = 0; k < 18 && edge.length; k++) {
      const [x0, y0] = edge[Math.floor(hash(k, 1, 221) * edge.length)];
      const d = 0.25 + hash(k, 2, 221) * 0.35,
        x = x0 + (x0 - cx) * d,
        y = y0 + (y0 - cy) * d,
        r = 6 + hash(k, 3, 221) * 4;
      if (k % 3) {
        g.fillStyle = "#8a6018";
        g.beginPath();
        g.ellipse(x + 1, y + 1.5, r, r * 0.8, 0, 0, 7);
        g.fill();
        g.fillStyle = "#ffd23f";
        g.beginPath();
        g.ellipse(x, y, r, r * 0.8, 0, 0, 7);
        g.fill();
        g.strokeStyle = "#a8761a";
        g.lineWidth = 1.2;
        g.beginPath();
        g.ellipse(x, y, r * 0.65, r * 0.5, 0, 0, 7);
        g.stroke();
      } else {
        g.font = "bold " + Math.round(r * 2.6) + "px Georgia, serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = ((k / 3) | 0) % 2 ? "#e0242c" : "#14161c";
        g.strokeStyle = "#ffffff";
        g.lineWidth = 3;
        const ch = ["\u2660", "\u2665", "\u2666", "\u2663"][((k / 3) | 0) % 4];
        g.strokeText(ch, x, y);
        g.fillText(ch, x, y);
      }
    }
    for (let k = 0; k < 12; k++) {
      const [x, y] = edge[Math.floor(hash(k, 9, 222) * edge.length)] || [320, 200];
      star(x + (x - cx) * 0.4, y + (y - cy) * 0.4, 2 + hash(k, 3, 222) * 4, "#fff3b0", 0.95);
    }
    rimC = ["#ffd23f", 0.55];
  } else if (EXT_AURA[kind]) {
    rimC =
      EXT_AURA[kind]({
        g,
        W,
        H,
        mask,
        mg,
        bloom,
        star,
        wisps,
        edge,
        cx,
        cy,
        hash,
        tint,
        blurred,
        near,
        keepNear,
        cv,
      }) || null;
  } else {
    // 'prism': light split into a rainbow around the tank, with sparkles
    for (const [dx, dy, col] of [
      [-14, 0, "#ff3fd0"],
      [14, 0, "#3fd0ff"],
      [0, -14, "#ffe83f"],
      [0, 14, "#6dff5a"],
      [-10, -10, "#a45bff"],
      [10, 10, "#ff8a3f"],
    ]) {
      g.save();
      g.globalAlpha = 1;
      g.drawImage(blurred(tint(mask, col), 12, 3, dx, dy), 0, 0);
      g.restore();
    }
    bloom("#c79bff", 30, 0.45, 3);
    wisps(60, ["#ff5ad0", "#5ac8ff", "#ffe25a", "#6dff5a", "#a45bff"], 56, 8, 91);
    for (let k = 0; k < 20; k++) {
      const [x, y] = edge[Math.floor(hash(k, 9, 92) * edge.length)] || [320, 200];
      star(
        x + (x - cx) * 0.4,
        y + (y - cy) * 0.4,
        2 + hash(k, 3, 92) * 5,
        ["#ffffff", "#ffd6f5", "#d6f5ff", "#fffad6"][k % 4],
        0.95,
      );
    }
    rimC = ["#ffffff", 0.65];
  }
  // fade it out where it covers the tank: fully clear in the middle, a soft glow over the edges
  g.globalCompositeOperation = "destination-out";
  const core = blurred(mask, 6, 1);
  for (let i = 0; i < 2; i++) {
    g.drawImage(core, 0, 0);
  }
  g.globalCompositeOperation = "source-over";
  if (rimC) {
    rim(rimC[0], rimC[1]);
  } // the light rim goes on last, over the tank's edge
  return out;
}
// Eyewear (turret slot), sized and placed like the game's own eye masks: the near lens on the top-front of the
// dome, the far lens just past it above the barrel, the strap or arm running back over the dome.
export function drawEyewear(kind, P) {
  const W = 640,
    H = 384,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const N = { x: 289, y: 156, rx: 21, ry: 19 },
    F = { x: 334, y: 153, rx: 12, ry: 14 };
  const lin = (x0, y0, x1, y1, stops) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([p, col]) => gr.addColorStop(p, col));
    return gr;
  };
  const ell = (e, grow = 0) => {
    g.beginPath();
    g.ellipse(e.x, e.y, e.rx + grow, e.ry + grow, 0, 0, Math.PI * 2);
  };
  const heart = (e, grow = 0) => {
    const k = (e.rx + grow) / 46,
      x = e.x,
      y = e.y - 6 * k;
    g.beginPath();
    g.moveTo(x, y + 50 * k);
    g.bezierCurveTo(x - 70 * k, y + 4 * k, x - 44 * k, y - 50 * k, x, y - 20 * k);
    g.bezierCurveTo(x + 44 * k, y - 50 * k, x + 70 * k, y + 4 * k, x, y + 50 * k);
    g.closePath();
  };
  const starP = (e, grow = 0) => {
    const r = e.rx * 1.2 + grow,
      ri = r * 0.48;
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5,
        rr = k % 2 ? ri : r;
      g.lineTo(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr * (e.ry / e.rx));
    }
    g.closePath();
  };
  const glare = (e, a = 0.75, shape = ell) => {
    g.save();
    shape(e);
    g.clip();
    g.globalAlpha = a;
    g.fillStyle = lin(e.x - e.rx, e.y - e.ry, e.x + e.rx, e.y + e.ry, [
      [0, "rgba(255,255,255,0)"],
      [0.28, "rgba(255,255,255,0)"],
      [0.34, "rgba(255,255,255,.95)"],
      [0.44, "rgba(255,255,255,.15)"],
      [0.52, "rgba(255,255,255,.6)"],
      [0.58, "rgba(255,255,255,0)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    g.fillRect(e.x - e.rx - 4, e.y - e.ry - 4, e.rx * 2 + 8, e.ry * 2 + 8);
    g.restore();
  };
  const back = () => {
    g.beginPath();
    g.moveTo(N.x - N.rx + 2, N.y + 1);
    g.quadraticCurveTo(242, 168, 216, 212);
  };
  const shadowOf = (draw, w) => {
    g.save();
    g.filter = "blur(2px)";
    g.translate(2, 3);
    g.globalAlpha = 0.35;
    g.strokeStyle = "#000";
    g.lineWidth = w + 2;
    g.lineCap = "round";
    draw();
    g.stroke();
    g.restore();
  };
  const farSide = () => {
    g.beginPath();
    g.moveTo(F.x + F.rx - 1, F.y - 3);
    g.quadraticCurveTo(F.x + F.rx + 8, F.y - 9, F.x + F.rx + 9, F.y - 15);
  }; // the strap going round the far side of the dome
  const arm = (col, w = 3) => {
    shadowOf(back, w);
    g.strokeStyle = col;
    g.lineWidth = w;
    g.lineCap = "round";
    back();
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,.35)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(N.x - N.rx + 2, N.y - 1);
    g.quadraticCurveTo(242, 166, 217, 209);
    g.stroke();
  };
  const bridge = (col, w = 3) => {
    g.save();
    g.globalAlpha = 0.35;
    g.strokeStyle = "#000";
    g.lineWidth = w;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(N.x + N.rx - 2, N.y - 1);
    g.quadraticCurveTo((N.x + F.x) / 2 + 3, N.y - 6, F.x - F.rx + 2, F.y - 1);
    g.stroke();
    g.restore();
    g.strokeStyle = col;
    g.lineWidth = w;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(N.x + N.rx - 3, N.y - 4);
    g.quadraticCurveTo((N.x + F.x) / 2 + 2, N.y - 10, F.x - F.rx + 1, F.y - 4);
    g.stroke();
  };
  const strap = (col, dark, w = 9) => {
    // a band wrapped round the dome: shadow, edge, stitching, a buckle at the back, and the far side
    shadowOf(back, w);
    g.save();
    g.lineCap = "butt";
    g.strokeStyle = dark;
    g.lineWidth = w;
    farSide();
    g.stroke();
    g.restore();
    g.save();
    g.lineCap = "round";
    g.strokeStyle = dark;
    g.lineWidth = w + 2;
    back();
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = w;
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,.3)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(N.x - N.rx + 2, N.y - w / 2 + 1.5);
    g.quadraticCurveTo(243, 168 - w / 2 + 1.5, 216 - w / 2 + 2, 210);
    g.stroke();
    g.strokeStyle = "rgba(0,0,0,.35)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(N.x - N.rx + 2, N.y + w / 2 - 0.5);
    g.quadraticCurveTo(243, 168 + w / 2 - 0.5, 216 + w / 2 - 1, 214);
    g.stroke();
    g.setLineDash([2, 2]);
    g.strokeStyle = "rgba(255,255,255,.45)";
    g.lineWidth = 0.8;
    back();
    g.stroke();
    g.setLineDash([]); // stitching
    g.fillStyle = "#c9c4b8";
    g.strokeStyle = "#5a5650";
    g.lineWidth = 1;
    g.beginPath();
    g.roundRect(226, 183, 9, 11, 2);
    g.fill();
    g.stroke();
    g.fillStyle = "#5a5650";
    g.fillRect(229, 186, 3, 5); // buckle
    g.restore();
  };
  const lens = (e, fill, rim, rimW, shape = ell) => {
    g.save();
    g.filter = "blur(2px)";
    g.globalAlpha = 0.4;
    g.translate(1.5, 2.5);
    shape(e, rimW / 2);
    g.fillStyle = "#000";
    g.fill();
    g.restore(); // its shadow on the dome
    shape(e, rimW / 2);
    g.fillStyle = rim;
    g.fill();
    shape(e);
    g.fillStyle = fill;
    g.fill();
    g.save();
    shape(e);
    g.clip();
    g.filter = "blur(2px)";
    g.strokeStyle = "rgba(0,0,0,.55)";
    g.lineWidth = 5;
    g.translate(0, 2);
    shape(e);
    g.stroke();
    g.restore(); // depth inside the rim
    g.save();
    shape(e, rimW / 2);
    g.clip();
    g.strokeStyle = "rgba(255,255,255,.55)";
    g.lineWidth = 1.2;
    g.translate(-0.8, -1);
    shape(e, rimW / 2 - 0.6);
    g.stroke();
    g.restore(); // rim highlight
    if (e === F) {
      g.save();
      shape(e, rimW / 2);
      g.globalAlpha = 0.18;
      g.fillStyle = "#000";
      g.fill();
      g.restore();
    } // the far one is further away
  };
  const rivets = (e, n, col, out = 2.5, r = 1) => {
    for (let k = 0; k < n; k++) {
      const a = (k * Math.PI * 2) / n;
      g.fillStyle = col;
      g.beginPath();
      g.arc(e.x + Math.cos(a) * (e.rx + out), e.y + Math.sin(a) * (e.ry + out), r, 0, 7);
      g.fill();
    }
  };
  // a soft shadow on the dome under them
  g.save();
  g.filter = "blur(3px)";
  g.fillStyle = "rgba(0,0,0,.3)";
  g.beginPath();
  g.ellipse(N.x - 2, N.y + 6, N.rx + 4, N.ry * 0.8, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  if (kind === "aviator") {
    // brass flying goggles on a leather strap, amber glass
    strap("#7a4a24", "#3e2410", 8);
    for (const e of [F, N]) {
      lens(
        e,
        lin(e.x, e.y - e.ry, e.x, e.y + e.ry, [
          [0, "#ffd27a"],
          [0.5, "#e08a1c"],
          [1, "#7a3a08"],
        ]),
        lin(e.x - e.rx, e.y - e.ry, e.x + e.rx, e.y + e.ry, [
          [0, "#fff0b0"],
          [0.4, "#c9962e"],
          [1, "#6b4a10"],
        ]),
        7,
      );
      glare(e, 0.65);
      rivets(e, 8, "#5a3c0c", 1.8, 0.9);
    }
    bridge("#8a6418", 3.5);
  } else if (kind === "ski") {
    // one wide mirrored visor, black frame and strap
    strap("#1d1f26", "#08090c", 8);
    const vis = () => {
      g.beginPath();
      g.moveTo(N.x - N.rx, N.y - 9);
      g.bezierCurveTo(N.x - 4, N.y - 21, F.x - 8, F.y - 19, F.x + F.rx + 1, F.y - 8);
      g.bezierCurveTo(F.x + F.rx + 3, F.y + 7, F.x - 2, F.y + 12, (N.x + F.x) / 2 + 2, N.y + 6);
      g.bezierCurveTo(N.x + 6, N.y + 17, N.x - N.rx - 2, N.y + 14, N.x - N.rx, N.y - 9);
      g.closePath();
    };
    g.save();
    vis();
    g.lineWidth = 5;
    g.strokeStyle = "#111318";
    g.stroke();
    g.fillStyle = lin(N.x - N.rx, N.y - 15, F.x + F.rx, F.y + 10, [
      [0, "#ffcf3a"],
      [0.3, "#ff6a3a"],
      [0.55, "#e83aa8"],
      [0.8, "#4a6aff"],
      [1, "#2ad0ff"],
    ]);
    g.fill();
    g.clip();
    g.globalAlpha = 0.6;
    g.fillStyle = lin(N.x - 6, N.y - 20, N.x + 18, N.y + 14, [
      [0, "rgba(255,255,255,0)"],
      [0.42, "rgba(255,255,255,.95)"],
      [0.5, "rgba(255,255,255,0)"],
      [0.62, "rgba(255,255,255,.5)"],
      [0.68, "rgba(255,255,255,0)"],
    ]);
    g.fillRect(N.x - 30, N.y - 30, 90, 60);
    g.restore();
  } else if (kind === "hearts") {
    // pink heart-shaped sunglasses
    arm("#ff4f9a", 3);
    for (const e of [F, N]) {
      lens(
        e,
        lin(e.x, e.y - e.ry, e.x, e.y + e.ry, [
          [0, "#ff8fc4"],
          [1, "#b8105a"],
        ]),
        "#ff3d8f",
        5,
        heart,
      );
      glare(e, 0.55, heart);
    }
    bridge("#ff3d8f", 3);
  } else if (kind === "stars") {
    // gold star-shaped party shades
    arm("#e8b52a", 3);
    for (const e of [F, N]) {
      lens(
        e,
        lin(e.x, e.y - e.ry, e.x, e.y + e.ry, [
          [0, "#6a35a0"],
          [1, "#1a0a33"],
        ]),
        lin(e.x - e.rx, e.y - e.ry, e.x + e.rx, e.y + e.ry, [
          [0, "#fff3b0"],
          [0.5, "#e8b52a"],
          [1, "#8a5a0a"],
        ]),
        5,
        starP,
      );
      glare(e, 0.5, starP);
    }
    bridge("#e8b52a", 3);
  } else if (kind === "visor" || kind === "hackvisor") {
    // a glowing band visor round the dome (cyan, or matrix green for the Hacker box)
    const col = kind === "visor" ? ["#2af0ff", "#0a7aff", "#d8fbff"] : ["#00ff41", "#008f11", "#d8ffe0"];
    const band = () => {
      g.beginPath();
      g.moveTo(214, 200);
      g.quadraticCurveTo(238, 144, N.x, N.y - 11);
      g.quadraticCurveTo(318, 140, F.x + F.rx + 3, F.y - 8);
      g.lineTo(F.x + F.rx + 2, F.y + 7);
      g.quadraticCurveTo(318, 160, N.x + 4, N.y + 10);
      g.quadraticCurveTo(246, 166, 222, 216);
      g.closePath();
    };
    g.save();
    g.shadowColor = col[0];
    g.shadowBlur = 12;
    band();
    g.fillStyle = "#0b0f18";
    g.fill();
    g.restore();
    g.save();
    band();
    g.clip();
    g.fillStyle = lin(206, 0, F.x + F.rx, 0, [
      [0, col[1]],
      [0.6, col[0]],
      [1, col[2]],
    ]);
    g.globalAlpha = 0.9;
    g.fillRect(200, 110, 160, 100);
    g.globalAlpha = 0.35;
    g.fillStyle = "#000";
    for (let y = 110; y < 210; y += 3) {
      g.fillRect(200, y, 160, 1);
    }
    g.globalAlpha = 0.9;
    g.fillStyle = "#ffffff";
    g.fillRect(200, N.y - 7, 160, 1.5);
    g.restore();
    g.save();
    band();
    g.lineWidth = 2;
    g.strokeStyle = "#2a3140";
    g.stroke();
    g.restore();
  } else if (kind === "monocle") {
    // a single gold-rimmed monocle on a chain
    const e = { x: N.x + 2, y: N.y, rx: N.rx + 1, ry: N.ry + 1 };
    g.save();
    g.strokeStyle = "#d4a52a";
    g.lineWidth = 1.4;
    g.setLineDash([2.5, 1.5]);
    g.beginPath();
    g.moveTo(e.x - 3, e.y + e.ry);
    g.bezierCurveTo(e.x - 12, e.y + 30, 240, 200, 224, 198);
    g.stroke();
    g.restore();
    lens(
      e,
      "rgba(200,230,255,.35)",
      lin(e.x - e.rx, e.y - e.ry, e.x + e.rx, e.y + e.ry, [
        [0, "#fff3b0"],
        [0.45, "#d4a52a"],
        [1, "#7a5208"],
      ]),
      5,
    );
    glare(e, 0.85);
  } else if (kind === "3d") {
    // retro 3D glasses: white card frame, red and cyan lenses
    arm("#f2f2f2", 4);
    const rect = (e, grow = 0) => {
      g.beginPath();
      g.roundRect(e.x - e.rx - grow, e.y - e.ry * 0.75 - grow, (e.rx + grow) * 2, (e.ry * 0.75 + grow) * 2, 2.5);
    };
    g.fillStyle = "#f4f4f4";
    g.strokeStyle = "#bdbdbd";
    g.lineWidth = 1;
    rect(F, 3.5);
    g.fill();
    g.stroke();
    rect(N, 3.5);
    g.fill();
    g.stroke();
    rect(F);
    g.fillStyle = "rgba(0,200,255,.9)";
    g.fill();
    rect(N);
    g.fillStyle = "rgba(255,30,40,.9)";
    g.fill();
    bridge("#f4f4f4", 4);
    glare(N, 0.5, rect);
  } else if (kind === "nightvision") {
    // military night-vision goggles: two tubes with green-glowing lenses
    strap("#3b4232", "#1c2018", 7);
    for (const e of [F, N]) {
      const t = { x: e.x + e.rx * 0.25, y: e.y, rx: e.rx * 0.8, ry: e.ry * 0.8 };
      g.fillStyle = lin(e.x - e.rx, e.y, e.x + e.rx, e.y, [
        [0, "#15181c"],
        [0.5, "#3a4048"],
        [1, "#101215"],
      ]);
      g.beginPath();
      g.ellipse(e.x - e.rx * 0.2, e.y, e.rx * 0.95, e.ry * 0.95, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(e.x - e.rx * 0.2, e.y - e.ry * 0.95, e.rx * 0.45, e.ry * 1.9);
      g.save();
      g.shadowColor = "#5aff6a";
      g.shadowBlur = 10;
      g.beginPath();
      g.ellipse(t.x, t.y, t.rx, t.ry, 0, 0, Math.PI * 2);
      const rg = g.createRadialGradient(t.x - t.rx * 0.3, t.y - t.ry * 0.3, 1, t.x, t.y, t.rx);
      rg.addColorStop(0, "#e8ffe8");
      rg.addColorStop(0.35, "#5aff6a");
      rg.addColorStop(1, "#0a5a14");
      g.fillStyle = rg;
      g.fill();
      g.restore();
      g.lineWidth = 2;
      g.strokeStyle = "#0b0d10";
      g.beginPath();
      g.ellipse(t.x, t.y, t.rx, t.ry, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = "#23272d";
    g.beginPath();
    g.roundRect((N.x + F.x) / 2 - 8, N.y - 22, 16, 9, 2);
    g.fill();
    bridge("#23272d", 5);
  } else if (kind === "sakura-black" || kind === "sakura-white") {
    // sakura glasses: black (or white) frames with a fine line of the other colour, pink lenses, blossoms
    const dark = kind === "sakura-black",
      fr = dark ? "#151316" : "#f7f4f2",
      ln = dark ? "#f7f4f2" : "#151316";
    const rr = (e, grow = 0) => {
      g.beginPath();
      g.roundRect(
        e.x - e.rx - grow,
        e.y - e.ry * 0.82 - grow,
        (e.rx + grow) * 2,
        (e.ry * 0.82 + grow) * 2,
        (e.rx + grow) * 0.55,
      );
    };
    arm(fr, 3.5);
    for (const e2 of [F, N]) {
      lens(
        e2,
        lin(e2.x, e2.y - e2.ry, e2.x, e2.y + e2.ry, [
          [0, "rgba(255,190,210,.85)"],
          [1, "rgba(232,97,140,.85)"],
        ]),
        fr,
        6,
        rr,
      );
      g.save();
      rr(e2, 1.6);
      g.strokeStyle = ln;
      g.lineWidth = 0.9;
      g.stroke();
      g.restore(); // the fine contrast line
      g.save();
      rr(e2);
      g.clip();
      sakuraPetal(g, e2.x + e2.rx * 0.35, e2.y - e2.ry * 0.25, e2.rx * 0.45, 0.6, "rgba(255,255,255,.55)");
      g.restore(); // a petal in the reflection
      glare(e2, 0.5, rr);
    }
    bridge(fr, 3.5);
    sakuraFlower(g, N.x - N.rx + 1, N.y - N.ry * 0.7, 7, 0.4, dark ? "#ffc1d4" : "#ff9ab5");
    sakuraFlower(g, F.x + F.rx - 1, F.y - F.ry * 0.7, 4.5, 1.2, dark ? "#ffd9e4" : "#ffb7c5");
  } else {
    // 'steampunk': brass goggles with smoked lenses, rivets and a little cog
    strap("#5a3a1e", "#2c1a0a", 7);
    for (const e of [F, N]) {
      lens(
        e,
        lin(e.x, e.y - e.ry, e.x, e.y + e.ry, [
          [0, "#4a5a5a"],
          [1, "#141c1c"],
        ]),
        lin(e.x - e.rx, e.y - e.ry, e.x + e.rx, e.y + e.ry, [
          [0, "#ffe6a0"],
          [0.45, "#b8862a"],
          [1, "#5a3a0a"],
        ]),
        8,
      );
      glare(e, 0.45);
      g.lineWidth = 1.2;
      g.strokeStyle = "#6b4a10";
      ell(e, 1.2);
      g.stroke();
      rivets(e, 10, "#ffe6a0", 2.7, 0.9);
    }
    bridge("#9a6a1a", 4);
    g.save();
    g.translate(N.x - N.rx - 4, N.y - 9);
    g.fillStyle = "#c99a3a";
    g.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8,
        r = k % 2 ? 4.2 : 5.8;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.fillStyle = "#5a3a0a";
    g.beginPath();
    g.arc(0, 0, 1.8, 0, 7);
    g.fill();
    g.restore();
  }
  // the barrel shows in front of them (the game's own eyewear is cut the same way)
  if (P && P.barrel) {
    g.globalCompositeOperation = "destination-out";
    g.drawImage(P.barrel, 0, 0, W, H);
    g.globalCompositeOperation = "source-over";
  }
  return c;
}
