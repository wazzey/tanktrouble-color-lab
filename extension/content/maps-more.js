import { MAP_THEMES, drawGlyph, mapFloorField, mapNoise } from "./maps.js";

// ---- more maps, each with a light and a dark version (built from a palette and a few motifs) ----
export const MOTIF = {
  // floor details, kept off the tile edges so tiles join up whichever way round they're laid
  noise: () => {},
  sprinkles: (g, w, h, p, i) => {
    for (let k = 0; k < 22; k++) {
      const x = 16 + mapNoise(k, i, 11) * (w - 32),
        y = 16 + mapNoise(i, k, 12) * (h - 32);
      g.save();
      g.translate(x, y);
      g.rotate(mapNoise(k, i, 13) * 6.3);
      g.fillStyle = p.spk[k % p.spk.length];
      g.beginPath();
      g.roundRect(-5, -1.6, 10, 3.2, 1.6);
      g.fill();
      g.restore();
    }
  },
  petals: (g, w, h, p, i) => {
    for (let k = 0; k < 7; k++) {
      const x = 18 + mapNoise(k, i, 21) * (w - 36),
        y = 18 + mapNoise(i, k, 22) * (h - 36);
      g.save();
      g.translate(x, y);
      g.rotate(mapNoise(k, i, 23) * 6.3);
      g.fillStyle = p.spk[k % p.spk.length];
      g.beginPath();
      g.ellipse(0, 0, 7, 4, 0, 0, 7);
      g.fill();
      g.fillStyle = "rgba(255,255,255,.25)";
      g.beginPath();
      g.ellipse(-2, -1, 3, 1.5, 0, 0, 7);
      g.fill();
      g.restore();
    }
  },
  tufts: (g, w, h, p, i) => {
    g.strokeStyle = p.spk[0];
    g.lineWidth = 2;
    g.lineCap = "round";
    g.globalAlpha = 0.55;
    for (let k = 0; k < 5; k++) {
      const x = 18 + mapNoise(k, i, 31) * (w - 36),
        y = 18 + mapNoise(i, k, 32) * (h - 36);
      for (let b = -2; b <= 2; b++) {
        g.beginPath();
        g.moveTo(x + b * 2, y + 5);
        g.lineTo(x + b * 3.5, y - 5 - Math.abs(b));
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  },
  plates: (g, w, h, p) => {
    g.globalAlpha = 0.35;
    g.strokeStyle = p.spk[0];
    g.lineWidth = 1.5;
    g.strokeRect(0.75, 0.75, w - 1.5, h - 1.5);
    g.globalAlpha = 0.6; // faint seams, so the floor never looks like walls
    g.fillStyle = p.spk[0];
    for (const [x, y] of [
      [12, 12],
      [w - 12, 12],
      [12, h - 12],
      [w - 12, h - 12],
    ]) {
      g.beginPath();
      g.arc(x, y, 4, 0, 7);
      g.fill();
      g.fillStyle = p.spk[1];
      g.beginPath();
      g.arc(x - 1, y - 1, 1.6, 0, 7);
      g.fill();
      g.fillStyle = p.spk[0];
    }
    g.globalAlpha = 1;
  },
  flagstones: (g, w, h, p, i) => {
    const s = w / 2;
    for (let a = 0; a < 2; a++) {
      for (let b = 0; b < 2; b++) {
        const d = (mapNoise(a, b + i, 41) - 0.5) * 14;
        g.fillStyle = `rgba(${d > 0 ? "255,255,255" : "0,0,0"},${Math.abs(d) / 60})`;
        g.beginPath();
        g.roundRect(a * s + 3, b * s + 3, s - 6, s - 6, 8);
        g.fill();
      }
    }
    g.globalAlpha = 0.3;
    g.strokeStyle = p.spk[0];
    g.lineWidth = 2;
    for (let k = 0; k <= 2; k++) {
      g.beginPath();
      g.moveTo(k * s, 0);
      g.lineTo(k * s, h);
      g.stroke();
      g.beginPath();
      g.moveTo(0, k * s);
      g.lineTo(w, k * s);
      g.stroke();
    }
    g.globalAlpha = 1;
  },
  ripples: (g, w, h, p) => {
    const d = g.getImageData(0, 0, w, h),
      q = d.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = (x / w) * 6.283,
          b = (y / h) * 6.283,
          v = (Math.cos(a * 4 + Math.cos(b * 2)) + Math.cos(b * 4 + Math.cos(a * 2))) * 5,
          j = (y * w + x) * 4;
        q[j] += v;
        q[j + 1] += v;
        q[j + 2] += v * 0.6;
      }
    }
    g.putImageData(d, 0, 0);
  },
  splats: (g, w, h, p, i) => {
    for (let k = 0; k < 2; k++) {
      const x = 40 + mapNoise(k, i, 51) * (w - 80),
        y = 40 + mapNoise(i, k, 52) * (h - 80),
        r = 12 + mapNoise(k, i, 53) * 10;
      g.fillStyle = p.spk[(k + i) % p.spk.length];
      g.globalAlpha = 0.28;
      g.beginPath();
      for (let s = 0; s < 14; s++) {
        const t = (s / 14) * 6.283,
          rr = r * (0.75 + mapNoise(s, k + i, 54) * 0.5);
        g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr);
      }
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
    }
  }, // soft paint stains (no dots that could pass for bullets)
  suits: (g, w, h, p, i) => {
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "bold 22px Georgia, serif";
    g.globalAlpha = 0.18;
    g.fillStyle = p.spk[0];
    const S = ["\u2660", "\u2665", "\u2666", "\u2663"]; // faint card suits
    for (let k = 0; k < 4; k++) {
      g.fillText(S[(k + i) % 4], 50 + (k % 2) * 100, 50 + (k >> 1) * 100);
    }
    g.globalAlpha = 1;
  },
  planksFloor: (g, w, h, p) => {
    const s = w / 5;
    g.strokeStyle = p.spk[0];
    g.lineWidth = 2;
    for (let k = 0; k <= 5; k++) {
      g.beginPath();
      g.moveTo(k * s, 0);
      g.lineTo(k * s, h);
      g.stroke();
    }
  }, // (only for symmetric looks)
};
export const WALL = {
  // patterns along a wall (216 x 16, square ends like the game's)
  stripes: (g, w, h, p) => {
    g.save();
    g.beginPath();
    g.rect(0, 0, w, h);
    g.clip();
    g.fillStyle = p.c2;
    for (let x = -h; x < w + h; x += 16) {
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x + 8, h);
      g.lineTo(x + 8 + h, 0);
      g.lineTo(x + h, 0);
      g.closePath();
      g.fill();
    }
    g.restore();
  },
  blocks: (g, w, h, p) => {
    g.fillStyle = p.c2;
    for (let x = 0; x < w; x += 36) {
      g.fillRect(x, 0, 18, h);
    }
  },
  planks: (g, w, h, p) => {
    g.strokeStyle = p.c2;
    g.lineWidth = 1;
    for (const y of [5, 10]) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.fillStyle = p.c2;
    for (let x = 12; x < w; x += 40) {
      g.fillRect(x, 3, 1.5, 1.5);
      g.fillRect(x, h - 4.5, 1.5, 1.5);
    }
  },
  bricks: (g, w, h, p) => {
    g.strokeStyle = p.c2;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();
    for (let r = 0; r < 2; r++) {
      for (let x = r * 9; x < w; x += 18) {
        g.beginPath();
        g.moveTo(x, (r * h) / 2);
        g.lineTo(x, ((r + 1) * h) / 2);
        g.stroke();
      }
    }
  },
  joints: (g, w, h, p) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, p.hi);
    gr.addColorStop(0.5, p.base);
    gr.addColorStop(1, p.edge);
    g.fillStyle = gr;
    g.fillRect(1, 1, w - 2, h - 2);
    g.fillStyle = p.c2;
    for (let x = 18; x < w; x += 54) {
      g.fillRect(x, 0, 8, h);
      g.fillStyle = "rgba(255,255,255,.35)";
      g.fillRect(x + 1, 1, 2, h - 2);
      g.fillStyle = p.c2;
    }
  },
  nodes: (g, w, h, p) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, p.hi);
    gr.addColorStop(0.55, p.base);
    gr.addColorStop(1, p.edge);
    g.fillStyle = gr;
    g.fillRect(1, 1, w - 2, h - 2);
    g.fillStyle = p.c2;
    for (let x = 24; x < w; x += 36) {
      g.fillRect(x, 0, 3, h);
    }
  },
  none: () => {},
};
export function mapVariant(p) {
  // one look (light or dark) of a map, from its palette
  const rgb = (h) => {
      const n = parseInt(h.slice(1), 16);
      return [n >> 16, (n >> 8) & 255, n & 255];
    },
    base = rgb(p.floor),
    sp = rgb(p.space || p.floor);
  return {
    bullet: p.bullet,
    decorRate: p.decorRate || 0.16,
    decorAlpha: p.decorAlpha || 0.85,
    floor: (g, i, w, h) => {
      mapFloorField(g, w, h, base, (a, b, x, y) => {
        const n = (mapNoise(x, y, 7 + (i % 3)) - 0.5) * (p.noise || 10) + (Math.cos(a) + Math.cos(b)) * (p.wave || 3);
        return [n, n, n];
      });
      (MOTIF[p.motif] || MOTIF.noise)(g, w, h, p, i % 4);
    },
    space: (g, w, h) =>
      mapFloorField(g, w, h, sp, (a, b, x, y) => {
        const n = (mapNoise(x, y, 3) - 0.5) * 6;
        return [n, n, n];
      }),
    wall: (g, w, h) => {
      g.fillStyle = p.wall.edge;
      g.fillRect(0, 0, w, h);
      g.fillStyle = p.wall.base;
      g.fillRect(1, 1, w - 2, h - 2);
      (WALL[p.wall.pat] || WALL.none)(g, w, h, p.wall);
      g.fillStyle = p.wall.hi;
      g.fillRect(1, 1, w - 2, 2);
      g.fillStyle = "rgba(0,0,0,.25)";
      g.fillRect(1, h - 3, w - 2, 2);
    },
    crate: (g, glyph, k) => {
      const c = p.crate,
        shield = k === 6;
      g.fillStyle = c.edge;
      g.beginPath();
      g.roundRect(3, 3, 58, 58, 8);
      g.fill();
      const gr = g.createLinearGradient(0, 4, 0, 60);
      gr.addColorStop(0, c.body);
      gr.addColorStop(1, c.body2);
      g.fillStyle = gr;
      g.beginPath();
      g.roundRect(5, 5, 54, 54, 7);
      g.fill();
      if (c.band) {
        g.fillStyle = c.band;
        g.fillRect(5, 28, 54, 8);
        g.fillRect(28, 5, 8, 54);
      }
      g.fillStyle = shield ? "#3d8fe0" : c.plate;
      g.beginPath();
      g.roundRect(14, 14, 36, 36, 6);
      g.fill();
      g.strokeStyle = c.edge;
      g.lineWidth = 2;
      g.stroke();
      if (glyph) {
        drawGlyph(g, glyph, shield ? "#ffffff" : c.ink, c.halo || null);
      }
    },
    decor: (p.decor || []).map((f) => (g, s) => f(g, s, p)),
  };
}
// little floor decorations (drawn in a 120 x 120 square, about half of it)
export const DEC = {
  lolly: (g, s, p) => {
    g.translate(s / 2, s / 2);
    g.rotate(0.5);
    g.fillStyle = "#f4eadc";
    g.fillRect(-2, 6, 4, 26);
    g.fillStyle = p.spk[0];
    g.beginPath();
    g.arc(0, -6, 15, 0, 7);
    g.fill();
    g.strokeStyle = p.spk[1];
    g.lineWidth = 4;
    g.beginPath();
    for (let t = 0; t < 12; t += 0.2) {
      g.lineTo(Math.cos(t) * t * 1.2, -6 + Math.sin(t) * t * 1.2);
    }
    g.stroke();
  },
  wrapped: (g, s, p) => {
    g.translate(s / 2, s / 2);
    g.rotate(-0.4);
    g.fillStyle = p.spk[2] || p.spk[0];
    g.beginPath();
    g.ellipse(0, 0, 14, 10, 0, 0, 7);
    g.fill();
    for (const d of [-1, 1]) {
      g.beginPath();
      g.moveTo(d * 12, 0);
      g.lineTo(d * 26, -9);
      g.lineTo(d * 26, 9);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "rgba(255,255,255,.4)";
    g.fillRect(-6, -8, 4, 16);
  },
  cone: (g, s) => {
    g.translate(s / 2, s / 2 + 10);
    g.fillStyle = "#ff7a00";
    g.beginPath();
    g.moveTo(-14, 12);
    g.lineTo(0, -26);
    g.lineTo(14, 12);
    g.closePath();
    g.fill();
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(-8, -4);
    g.lineTo(8, -4);
    g.lineTo(10, 2);
    g.lineTo(-10, 2);
    g.closePath();
    g.fill();
    g.fillStyle = "#3a3a3a";
    g.fillRect(-20, 12, 40, 6);
  },
  tyres: (g, s) => {
    g.translate(s / 2, s / 2);
    for (const [x, y] of [
      [-12, 6],
      [12, 6],
      [0, -12],
    ]) {
      g.fillStyle = "#1b1b1d";
      g.beginPath();
      g.arc(x, y, 13, 0, 7);
      g.fill();
      g.fillStyle = "#4a4a4f";
      g.beginPath();
      g.arc(x, y, 6, 0, 7);
      g.fill();
    }
  },
  flag: (g, s) => {
    g.translate(s / 2 - 14, s / 2 - 16);
    g.fillStyle = "#ddd";
    g.fillRect(-2, 0, 3, 40);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        g.fillStyle = (r + c) % 2 ? "#111" : "#fff";
        g.fillRect(1 + c * 5, r * 5, 5, 5);
      }
    }
  },
  bloom: (g, s, p) => {
    g.translate(s / 2, s / 2);
    for (let k = 0; k < 5; k++) {
      g.save();
      g.rotate(k * 1.2566);
      g.fillStyle = p.spk[0];
      g.beginPath();
      g.ellipse(0, -10, 7, 11, 0, 0, 7);
      g.fill();
      g.restore();
    }
    g.fillStyle = "#ffd23f";
    g.beginPath();
    g.arc(0, 0, 4, 0, 7);
    g.fill();
  },
  lantern: (g, s) => {
    g.translate(s / 2, s / 2);
    g.fillStyle = "#d6332b";
    g.beginPath();
    g.ellipse(0, 0, 13, 17, 0, 0, 7);
    g.fill();
    g.fillStyle = "#2b1810";
    g.fillRect(-7, -20, 14, 4);
    g.fillRect(-7, 16, 14, 4);
    g.strokeStyle = "rgba(0,0,0,.25)";
    g.lineWidth = 1.5;
    for (const x of [-6, 0, 6]) {
      g.beginPath();
      g.moveTo(x, -16);
      g.quadraticCurveTo(x * 1.6, 0, x, 16);
      g.stroke();
    }
  },
  rock: (g, s, p) => {
    g.translate(s / 2, s / 2);
    g.fillStyle = p.spk[1] || "#8a8a8a";
    g.beginPath();
    g.moveTo(-18, 8);
    g.lineTo(-12, -10);
    g.lineTo(4, -14);
    g.lineTo(18, -2);
    g.lineTo(14, 10);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,.2)";
    g.beginPath();
    g.moveTo(-10, -8);
    g.lineTo(3, -11);
    g.lineTo(-4, -2);
    g.closePath();
    g.fill();
  },
  paws: (g, s, p) => {
    g.fillStyle = p.spk[1] || "#6b4a2a";
    g.globalAlpha = 0.55;
    for (const [x, y, r] of [
      [40, 70, 0.3],
      [62, 50, 0.2],
      [80, 30, 0.3],
    ]) {
      g.save();
      g.translate(x, y);
      g.rotate(r);
      g.beginPath();
      g.ellipse(0, 4, 5, 4, 0, 0, 7);
      g.fill();
      for (const [a, b] of [
        [-5, -3],
        [-2, -6],
        [2, -6],
        [5, -3],
      ]) {
        g.beginPath();
        g.arc(a, b, 1.6, 0, 7);
        g.fill();
      }
      g.restore();
    }
  },
  gear: (g, s, p) => {
    g.translate(s / 2, s / 2);
    g.fillStyle = p.spk[2] || "#b5893a";
    g.beginPath();
    for (let k = 0; k < 16; k++) {
      const r = k % 2 ? 14 : 19,
        t = (k * Math.PI) / 8;
      g.lineTo(Math.cos(t) * r, Math.sin(t) * r);
    }
    g.closePath();
    g.fill();
    g.fillStyle = p.spk[0];
    g.beginPath();
    g.arc(0, 0, 5, 0, 7);
    g.fill();
  },
  bolt: (g, s, p) => {
    g.translate(s / 2, s / 2);
    g.fillStyle = p.spk[1];
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const t = (k * Math.PI) / 3;
      g.lineTo(Math.cos(t) * 9, Math.sin(t) * 9);
    }
    g.closePath();
    g.fill();
    g.fillStyle = p.spk[0];
    g.beginPath();
    g.arc(0, 0, 4, 0, 7);
    g.fill();
  },
  shield: (g, s) => {
    g.translate(s / 2, s / 2);
    g.fillStyle = "#d4af37";
    g.beginPath();
    g.moveTo(-14, -16);
    g.lineTo(14, -16);
    g.lineTo(14, 2);
    g.quadraticCurveTo(14, 14, 0, 20);
    g.quadraticCurveTo(-14, 14, -14, 2);
    g.closePath();
    g.fill();
    g.fillStyle = "#8b0000";
    g.beginPath();
    g.moveTo(-10, -12);
    g.lineTo(10, -12);
    g.lineTo(10, 1);
    g.quadraticCurveTo(10, 10, 0, 15);
    g.quadraticCurveTo(-10, 10, -10, 1);
    g.closePath();
    g.fill();
    g.fillStyle = "#d4af37";
    g.fillRect(-1.5, -10, 3, 22);
    g.fillRect(-9, -2, 18, 3);
  },
  cactus: (g, s) => {
    g.translate(s / 2, s / 2 + 6);
    g.fillStyle = "#3f7d3a";
    g.beginPath();
    g.roundRect(-5, -26, 10, 36, 5);
    g.fill();
    g.beginPath();
    g.roundRect(-16, -14, 8, 14, 4);
    g.fill();
    g.fillRect(-12, -4, 8, 5);
    g.beginPath();
    g.roundRect(8, -20, 8, 14, 4);
    g.fill();
    g.fillRect(4, -10, 8, 5);
    g.fillStyle = "rgba(255,255,255,.18)";
    g.fillRect(-3, -24, 2, 30);
  },
  weed: (g, s) => {
    g.translate(s / 2, s / 2);
    g.strokeStyle = "#a8763c";
    g.lineWidth = 1.5;
    for (let k = 0; k < 14; k++) {
      const t = k * 0.9;
      g.beginPath();
      g.arc(Math.cos(t) * 4, Math.sin(t) * 4, 10 + (k % 4) * 2, t, t + 2.2);
      g.stroke();
    }
  },
  shoe: (g, s) => {
    g.translate(s / 2, s / 2);
    g.strokeStyle = "#8f8f96";
    g.lineWidth = 6;
    g.lineCap = "round";
    g.beginPath();
    g.arc(0, 0, 13, 0.5, Math.PI * 2 - 0.5);
    g.stroke();
  },
  shell: (g, s) => {
    g.translate(s / 2, s / 2 + 6);
    g.fillStyle = "#ffd7c2";
    g.strokeStyle = "#d88f73";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, 10);
    for (let k = 0; k <= 6; k++) {
      const t = Math.PI * (0.15 + (k * 0.7) / 6);
      g.lineTo(-Math.cos(t) * 20, -Math.sin(t) * 20 + 4);
    }
    g.closePath();
    g.fill();
    g.stroke();
  },
  leaf: (g, s) => {
    g.translate(s / 2, s / 2);
    g.rotate(0.6);
    g.fillStyle = "#2a9d5f";
    g.beginPath();
    g.ellipse(0, 0, 26, 9, 0, 0, 7);
    g.fill();
    g.strokeStyle = "#1d6f43";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-26, 0);
    g.lineTo(26, 0);
    g.stroke();
    for (let x = -18; x <= 18; x += 6) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 5, -7);
      g.moveTo(x, 0);
      g.lineTo(x + 5, 7);
      g.stroke();
    }
  },
  vent: (g, s, p) => {
    g.translate(s / 2, s / 2);
    g.fillStyle = p.spk[0];
    g.beginPath();
    g.roundRect(-18, -12, 36, 24, 4);
    g.fill();
    g.fillStyle = p.spk[1];
    for (let y = -8; y <= 6; y += 5) {
      g.fillRect(-14, y, 28, 2.5);
    }
  },
  dice: (g, s) => {
    g.translate(s / 2, s / 2);
    g.rotate(0.35);
    g.fillStyle = "#c8102e";
    g.beginPath();
    g.roundRect(-14, -14, 28, 28, 6);
    g.fill();
    g.fillStyle = "#fff";
    for (const [x, y] of [
      [-6, -6],
      [6, 6],
      [0, 0],
    ]) {
      g.beginPath();
      g.arc(x, y, 2.6, 0, 7);
      g.fill();
    }
  },
  card: (g, s) => {
    g.translate(s / 2, s / 2);
    g.rotate(-0.3);
    g.fillStyle = "rgba(0,0,0,.25)";
    g.fillRect(-12, -16, 26, 36);
    g.fillStyle = "#f5f0e1";
    g.fillRect(-14, -18, 26, 36);
    g.fillStyle = "#c8102e";
    g.font = "bold 18px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("\u2665", -1, 0);
  },
  chipstack: (g, s) => {
    g.translate(s / 2, s / 2 + 8);
    for (let j = 0; j < 4; j++) {
      g.fillStyle = "#111";
      g.beginPath();
      g.ellipse(0, -j * 5 + 1, 13, 5, 0, 0, 7);
      g.fill();
      g.fillStyle = ["#c8102e", "#1f5fd0", "#f5f0e1", "#141414"][j];
      g.beginPath();
      g.ellipse(0, -j * 5, 12, 4.5, 0, 0, 7);
      g.fill();
    }
  },
  can: (g, s, p) => {
    g.translate(s / 2, s / 2);
    g.rotate(1.1);
    g.fillStyle = p.spk[0];
    g.beginPath();
    g.roundRect(-7, -15, 14, 28, 4);
    g.fill();
    g.fillStyle = "#ddd";
    g.fillRect(-4, -20, 8, 5);
    g.fillStyle = "rgba(255,255,255,.3)";
    g.fillRect(-4, -12, 3, 22);
  },
};
{
  // every map as { name, def: its usual shade, light, dark }
  const std = MAP_THEMES.standard,
    ds = MAP_THEMES.deepsea,
    ar = MAP_THEMES.arcade,
    V = mapVariant;
  const SWEETS = ["#ff5c8a", "#5ad1c3", "#ffd23f", "#8a5cff", "#ffffff"];
  const sw = (floor, bullet) =>
    V({
      floor,
      motif: "sprinkles",
      spk: SWEETS,
      bullet,
      wall: { base: "#ffffff", edge: "#d94f7c", hi: "#ffffff", pat: "stripes", c2: "#ff6f9d" },
      crate: {
        edge: "#7a2a45",
        body: "#ff8fc7",
        body2: "#e0609d",
        band: "#ffffff",
        plate: "#fff1a8",
        ink: "#7a2a45",
      },
      decor: [DEC.lolly, DEC.wrapped],
    });
  const rc = (floor, bullet) =>
    V({
      floor,
      noise: 16,
      bullet,
      decorRate: 0.12,
      wall: { base: "#ffffff", edge: "#6b0d12", hi: "#ffffff", pat: "blocks", c2: "#d7141f" },
      crate: {
        edge: "#111111",
        body: "#2c2f35",
        body2: "#16181c",
        band: "#d7141f",
        plate: "#f4f4f2",
        ink: "#111214",
      },
      decor: [DEC.cone, DEC.tyres, DEC.flag],
    });
  const sk = (floor, spk, bullet) =>
    V({
      floor,
      motif: "petals",
      spk,
      bullet,
      wall: { base: "#5a2e2a", edge: "#2b1410", hi: "#ff9ec4", pat: "none" },
      crate: {
        edge: "#2b1410",
        body: "#b8323a",
        body2: "#7c1e24",
        band: "#d4af37",
        plate: "#fdeef2",
        ink: "#5a1e24",
      },
      decor: [DEC.bloom, DEC.lantern],
    });
  const sf = (floor, spk, bullet) =>
    V({
      floor,
      motif: "tufts",
      spk,
      bullet,
      wall: { base: "#8b5a2b", edge: "#4a2e14", hi: "#b07a44", pat: "planks", c2: "#5e3a1a" },
      crate: {
        edge: "#3b2310",
        body: "#c8a165",
        body2: "#9c7640",
        band: "#6b4a2a",
        plate: "#f2dfb0",
        ink: "#3b2310",
      },
      decor: [DEC.rock, DEC.paws],
    });
  const sm = (floor, spk, bullet) =>
    V({
      floor,
      motif: "plates",
      noise: 8,
      spk,
      bullet,
      decorRate: 0.12,
      wall: { base: "#b87333", edge: "#5a3215", hi: "#e8a86a", pat: "joints", c2: "#8a5a2a" },
      crate: {
        edge: "#2a1a10",
        body: "#5f6b6b",
        body2: "#3c4545",
        band: "#b5893a",
        plate: "#e8d8b0",
        ink: "#3b2a1e",
      },
      decor: [DEC.gear, DEC.bolt],
    });
  const kg = (floor, spk, bullet) =>
    V({
      floor,
      motif: "flagstones",
      noise: 8,
      spk,
      bullet,
      decorRate: 0.1,
      wall: { base: "#9a9a9a", edge: "#4a4a4a", hi: "#cfcfcf", pat: "bricks", c2: "#6a6a6a" },
      crate: {
        edge: "#2a0f3a",
        body: "#5b1f7a",
        body2: "#3a1050",
        band: "#d4af37",
        plate: "#f2e6c0",
        ink: "#3a1050",
      },
      decor: [DEC.shield],
    });
  const ww = (floor, bullet) =>
    V({
      floor,
      motif: "ripples",
      spk: ["#a8763c"],
      bullet,
      wall: { base: "#8b5a2b", edge: "#3e2410", hi: "#b07a44", pat: "planks", c2: "#5a3a1a" },
      crate: {
        edge: "#3e2410",
        body: "#a0682f",
        body2: "#6e4420",
        band: "#3e3e44",
        plate: "#f0dcb0",
        ink: "#3e2410",
      },
      decor: [DEC.cactus, DEC.weed, DEC.shoe],
    });
  const tp = (floor, bullet) =>
    V({
      floor,
      motif: "ripples",
      spk: ["#ff6f61"],
      bullet,
      wall: { base: "#9cc25a", edge: "#4f6e22", hi: "#d4ec9a", pat: "nodes", c2: "#5f7f2a" },
      crate: {
        edge: "#3b2310",
        body: "#8a5a2b",
        body2: "#5e3a1a",
        band: "#00b4d8",
        plate: "#ffe8b8",
        ink: "#3b2310",
      },
      decor: [DEC.shell, DEC.leaf, DEC.bloom],
    });
  const mc = (floor, spk, bullet) =>
    V({
      floor,
      motif: "plates",
      noise: 8,
      spk,
      bullet,
      decorRate: 0.12,
      wall: { base: "#ffc300", edge: "#1a1a1a", hi: "#ffe066", pat: "stripes", c2: "#212529" },
      crate: {
        edge: "#111111",
        body: "#6c757d",
        body2: "#495057",
        band: "#ffc300",
        plate: "#e9ecef",
        ink: "#212529",
      },
      decor: [DEC.bolt, DEC.vent],
    });
  const gf = (floor, bullet) =>
    V({
      floor,
      motif: "splats",
      spk: ["#ff2d95", "#22e0ff", "#c6ff1a", "#9b4dff"],
      bullet,
      decorRate: 0.1,
      wall: { base: "#a8452f", edge: "#4a1a10", hi: "#d0705a", pat: "bricks", c2: "#6e2a1a" },
      crate: {
        edge: "#111111",
        body: "#3a3a40",
        body2: "#232327",
        band: "#ff2d95",
        plate: "#c6ff1a",
        ink: "#111111",
      },
      decor: [DEC.can],
    });
  const cs = (floor, spk, bullet) =>
    V({
      floor,
      motif: "suits",
      noise: 7,
      spk,
      bullet,
      decorRate: 0.12,
      wall: { base: "#7a0e1a", edge: "#2a0408", hi: "#d4af37", pat: "none" },
      crate: {
        edge: "#d4af37",
        body: "#1a1a1a",
        body2: "#000000",
        band: "#c8102e",
        plate: "#f5f0e1",
        ink: "#111111",
      },
      decor: [DEC.dice, DEC.card, DEC.chipstack],
    });
  const arLight = Object.assign({}, ar, {
    bullet: ["#2a1a5e", "#ffffff"],
    decorAlpha: 0.7,
    floor: (g, i, w, h) => {
      g.fillStyle = "#ece8ff";
      g.fillRect(0, 0, w, h);
      const sq = w / 4;
      g.fillStyle = "rgba(120,80,255,.28)";
      for (let k = 1; k < 4; k++) {
        g.fillRect(k * sq - 1, 0, 2, h);
        g.fillRect(0, k * sq - 1, w, 2);
      }
      g.fillRect(0, 0, 1, h);
      g.fillRect(w - 1, 0, 1, h);
      g.fillRect(0, 0, w, 1);
      g.fillRect(0, h - 1, w, 1);
    },
    space: (g, w, h) => {
      g.fillStyle = "#dcd5ff";
      g.fillRect(0, 0, w, h);
    },
    wall: (g, w, h) => {
      g.fillStyle = "#c21fa3";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#ff2bd6";
      g.fillRect(1.5, 1.5, w - 3, h - 3);
      g.fillStyle = "#ffd0f4";
      g.fillRect(1.5, h / 2 - 2.5, w - 3, 5);
    },
    crate: (g, glyph, k) => {
      const neon = k === 6 ? "#0096c7" : "#7a3cff";
      g.fillStyle = "#2a1a5e";
      g.beginPath();
      g.roundRect(3, 3, 58, 58, 8);
      g.fill();
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.roundRect(5, 5, 54, 54, 7);
      g.fill();
      g.strokeStyle = neon;
      g.lineWidth = 3;
      g.beginPath();
      g.roundRect(7, 7, 50, 50, 6);
      g.stroke();
      if (glyph) {
        drawGlyph(g, glyph, k === 6 ? "#0096c7" : "#2a1a5e", null);
      }
    },
  });
  const dsLight = V({
    floor: "#a6dcdc",
    motif: "ripples",
    bullet: ["#0b1d3a", "#fff3a8"],
    decorRate: 0.2,
    wall: { base: "#3f7f88", edge: "#173d44", hi: "#8fc9cf", pat: "none" },
    crate: { edge: "#3b2310", body: "#b07a3c", body2: "#7a4f22", band: "#e8c25a", plate: "#f1d08a", ink: "#3b2310" },
    decor: (ds.decor || []).map((f) => (g, s) => f(g, s)),
  });
  const stdDark = V({
    floor: "#2f3238",
    space: "#24262b",
    noise: 6,
    wave: 2,
    bullet: ["#f2f2f2", "#111318"],
    decorRate: 0,
    wall: { base: "#c9ced6", edge: "#8a9099", hi: "#eef1f5", pat: "none" },
    crate: { edge: "#1a1c20", body: "#5a5f69", body2: "#3d4149", plate: "#c9ced6", ink: "#2a2d33" },
  });
  const T = MAP_THEMES;
  for (const k in T) {
    delete T[k];
  }
  Object.assign(T, {
    standard: { name: "Standard", def: "light", light: std, dark: stdDark },
    deepsea: { name: "Deep Sea", def: "dark", light: dsLight, dark: ds },
    arcade: { name: "Arcade", def: "dark", light: arLight, dark: ar },
    sweets: {
      name: "Sweet Shop",
      def: "light",
      light: sw("#ffe3ef", ["#5a2a1a", "#ffffff"]),
      dark: sw("#4a2a1e", ["#fff1a8", "#2a140c"]),
    },
    racing: {
      name: "Racing",
      def: "dark",
      light: rc("#c9cbd0", ["#111214", "#ffd400"]),
      dark: rc("#3a3c40", ["#ffd400", "#111214"]),
    },
    sakura: {
      name: "Sakura",
      def: "light",
      light: sk("#fdeef2", ["#ffb7c9", "#f590ad", "#ffd1dc"], ["#5a1e3a", "#ffffff"]),
      dark: sk("#1d1b3a", ["#ff9ec4", "#ffb7c9", "#c77dff"], ["#ffd1dc", "#1d1b3a"]),
    },
    safari: {
      name: "Safari",
      def: "light",
      light: sf("#e3c98f", ["#9a7a3a", "#7a5a2a"], ["#3b2310", "#fff3d6"]),
      dark: sf("#5a4a2e", ["#3e321c", "#2a2214"], ["#fff3d6", "#2a1a0a"]),
    },
    steampunk: {
      name: "Steampunk",
      def: "dark",
      light: sm("#e8d8b0", ["#b89a6a", "#f6ecd0", "#b5893a"], ["#3b2a1e", "#fff6dc"]),
      dark: sm("#3a2f26", ["#2a201a", "#8c6a3a", "#b5893a"], ["#e8c25a", "#2a1a10"]),
    },
    kingdom: {
      name: "Kingdom",
      def: "light",
      light: kg("#bfbdb8", ["#8f8d88"], ["#2a0f3a", "#ffffff"]),
      dark: kg("#3b3d4a", ["#25262f"], ["#f2e6c0", "#1a1020"]),
    },
    wildwest: {
      name: "Wild West",
      def: "light",
      light: ww("#e6c48f", ["#3e2410", "#fff3d6"]),
      dark: ww("#2e3a5c", ["#ffe6a8", "#141a2c"]),
    },
    tropical: {
      name: "Tropical",
      def: "light",
      light: tp("#f4e1c1", ["#0b3a4a", "#ffffff"]),
      dark: tp("#0d3b4a", ["#ffd23f", "#062630"]),
    },
    mech: {
      name: "Mech",
      def: "dark",
      light: mc("#c8ccd0", ["#9aa0a6", "#e8ebee"], ["#212529", "#ffc300"]),
      dark: mc("#2a2e33", ["#1a1d21", "#4a4f55"], ["#ffc300", "#111111"]),
    },
    casino: {
      name: "Casino",
      def: "dark",
      light: cs("#ece2cb", ["#c8b48a"], ["#2a0408", "#ffe9a8"]),
      dark: cs("#145c34", ["#0d4626"], ["#ffd23f", "#06210f"]),
    },
    graffiti: {
      name: "Graffiti",
      def: "light",
      light: gf("#cfcac2", ["#111111", "#ffffff"]),
      dark: gf("#26262a", ["#c6ff1a", "#111111"]),
    },
  });
}
// Themed crates (like the game's Halloween pumpkins and Christmas presents): a different object for each map, with the
// weapon's symbol big on a badge in the middle so you can always tell what's inside (the shield's badge stays blue)
export function objBadge(g, glyph, k, plate, ink, ring, r = 19) {
  const shield = k === 6;
  g.fillStyle = ring || "rgba(0,0,0,.55)";
  g.beginPath();
  g.arc(32, 32, r + 2.5, 0, 7);
  g.fill();
  g.fillStyle = shield ? "#3d8fe0" : plate;
  g.beginPath();
  g.arc(32, 32, r, 0, 7);
  g.fill();
  if (glyph) {
    const sc = Math.min(0.78, r / 24.5);
    g.save();
    g.translate(32, 32);
    g.scale(sc, sc);
    g.translate(-32, -32);
    /* the symbol sized to sit inside the badge */ drawGlyph(g, glyph, shield ? "#ffffff" : ink, null);
    g.restore();
  }
}
const drawStar = (g, n, R, r, cx = 32, cy = 32, rot = -Math.PI / 2) => {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const t = rot + (i * Math.PI) / n,
      q = i % 2 ? r : R;
    g.lineTo(cx + Math.cos(t) * q, cy + Math.sin(t) * q);
  }
  g.closePath();
};
export const drawSymbol = (g, glyph, k, cx, cy, size, ink) => {
  if (!glyph) {
    return;
  }
  const sc = size / 38;
  g.save();
  g.translate(cx, cy);
  g.scale(sc, sc);
  g.translate(-32, -32);
  drawGlyph(g, glyph, k === 6 ? "#ffffff" : ink, null);
  g.restore();
}; // the weapon's symbol, fitted to a spot
export const shieldPlate = (k, c) => (k === 6 ? "#3d8fe0" : c); // the shield's spot is always blue
export const OBJ_CRATES = {
  // (g, glyph, k, dark): things you'd find in each map, the weapon's symbol where it reads best
  deepsea: (g, gl, k, d) => {
    // an open clam with the weapon on its pearl
    g.fillStyle = d ? "#c98fb0" : "#e8a8c4";
    g.strokeStyle = "#7a3a5a";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(32, 30);
    for (let i = 0; i <= 8; i++) {
      const t = Math.PI * (1.05 + (i * 0.9) / 8);
      g.lineTo(32 + Math.cos(t) * 30, 30 + Math.sin(t) * 26 + (i % 2 ? 2 : 0));
    }
    g.closePath();
    g.fill();
    g.stroke();
    g.strokeStyle = "rgba(122,58,90,.5)";
    for (let i = 1; i < 8; i++) {
      const t = Math.PI * (1.05 + (i * 0.9) / 8);
      g.beginPath();
      g.moveTo(32, 30);
      g.lineTo(32 + Math.cos(t) * 27, 30 + Math.sin(t) * 23);
      g.stroke();
    }
    g.fillStyle = d ? "#b07a98" : "#d892b2";
    g.beginPath();
    g.ellipse(32, 46, 30, 14, 0, 0, Math.PI);
    g.lineTo(2, 46);
    g.closePath();
    g.fill();
    g.strokeStyle = "#7a3a5a";
    g.stroke();
    const pr = g.createRadialGradient(28, 34, 2, 32, 40, 18);
    pr.addColorStop(0, "#ffffff");
    pr.addColorStop(1, k === 6 ? "#3d8fe0" : "#e6e8f2");
    g.fillStyle = pr;
    g.beginPath();
    g.arc(32, 40, 17, 0, 7);
    g.fill();
    g.strokeStyle = "rgba(0,0,0,.25)";
    g.lineWidth = 1.5;
    g.stroke();
    drawSymbol(g, gl, k, 32, 40, 24, "#2a1a3a");
  },
  arcade: (g, gl, k, d) => {
    // an arcade cabinet: marquee, screen with the weapon, joystick and buttons
    g.fillStyle = "#0a0718";
    g.beginPath();
    g.moveTo(10, 2);
    g.lineTo(54, 2);
    g.lineTo(56, 62);
    g.lineTo(8, 62);
    g.closePath();
    g.fill();
    g.fillStyle = d ? "#3a1f7a" : "#5b2ea8";
    g.beginPath();
    g.moveTo(12, 4);
    g.lineTo(52, 4);
    g.lineTo(54, 60);
    g.lineTo(10, 60);
    g.closePath();
    g.fill();
    g.fillStyle = "#ff2bd6";
    g.fillRect(12, 4, 40, 7);
    g.fillStyle = "#ffd0f4";
    g.fillRect(14, 6, 36, 2);
    g.fillStyle = shieldPlate(k, "#06040f");
    g.fillRect(14, 14, 36, 28);
    g.strokeStyle = "#00e5ff";
    g.lineWidth = 2;
    g.strokeRect(14, 14, 36, 28);
    drawSymbol(g, gl, k, 32, 28, 24, "#fff200");
    g.fillStyle = "#1a1033";
    g.fillRect(11, 46, 42, 12);
    g.fillStyle = "#e02020";
    g.beginPath();
    g.arc(20, 50, 3.5, 0, 7);
    g.fill();
    g.fillStyle = "#333";
    g.fillRect(19, 51, 2, 5);
    g.fillStyle = "#00e5ff";
    g.beginPath();
    g.arc(36, 52, 2.6, 0, 7);
    g.fill();
    g.fillStyle = "#fff200";
    g.beginPath();
    g.arc(44, 52, 2.6, 0, 7);
    g.fill();
  },
  sweets: (g, gl, k, d) => {
    // a gumball machine: the glass globe holds the weapon
    g.fillStyle = "#c4161f";
    g.beginPath();
    g.moveTo(18, 44);
    g.lineTo(46, 44);
    g.lineTo(50, 62);
    g.lineTo(14, 62);
    g.closePath();
    g.fill();
    g.fillStyle = "#8a0a10";
    g.fillRect(26, 50, 12, 7);
    g.fillStyle = "#d9d9d9";
    g.beginPath();
    g.arc(32, 53, 3, 0, 7);
    g.fill();
    g.fillStyle = "#c4161f";
    g.fillRect(20, 2, 24, 5);
    g.fillStyle = "rgba(255,255,255,.75)";
    g.beginPath();
    g.arc(32, 25, 21, 0, 7);
    g.fill();
    g.strokeStyle = "rgba(0,0,0,.3)";
    g.lineWidth = 1.5;
    g.stroke();
    for (let i = 0; i < 14; i++) {
      const t = i * 0.45 + 0.2,
        r = 17.5;
      g.fillStyle = SWEET_COLS[i % SWEET_COLS.length];
      g.beginPath();
      g.arc(32 + Math.cos(t) * r, 25 + Math.sin(t) * r, 3, 0, 7);
      g.fill();
    }
    g.fillStyle = shieldPlate(k, d ? "#fff1a8" : "#ffffff");
    g.beginPath();
    g.arc(32, 25, 13.5, 0, 7);
    g.fill();
    drawSymbol(g, gl, k, 32, 25, 20, "#7a2a45");
    g.fillStyle = "rgba(255,255,255,.8)";
    g.beginPath();
    g.ellipse(22, 14, 4, 2, -0.7, 0, 7);
    g.fill();
  },
  racing: (g, gl, k) => {
    // a racing slick with a red-rimmed wheel
    g.fillStyle = "#141416";
    g.beginPath();
    g.arc(32, 32, 30, 0, 7);
    g.fill();
    g.strokeStyle = "#2b2b30";
    g.lineWidth = 1;
    for (let r = 25; r < 30; r += 2) {
      g.beginPath();
      g.arc(32, 32, r, 0, 7);
      g.stroke();
    }
    g.fillStyle = "#d7141f";
    g.beginPath();
    g.arc(32, 32, 23, 0, 7);
    g.fill();
    g.fillStyle = "#9a9aa2";
    g.beginPath();
    g.arc(32, 32, 20.5, 0, 7);
    g.fill();
    g.fillStyle = "#c8c8ce";
    for (let i = 0; i < 5; i++) {
      g.save();
      g.translate(32, 32);
      g.rotate(i * 1.2566);
      g.fillRect(-2, -20, 4, 6);
      g.restore();
    }
    g.fillStyle = shieldPlate(k, "#f4f4f2");
    g.beginPath();
    g.arc(32, 32, 14.5, 0, 7);
    g.fill();
    drawSymbol(g, gl, k, 32, 32, 21, "#111214");
  },
  sakura: (g, gl, k, d) => {
    // a paper lantern (chochin) with its tassel
    g.fillStyle = "#1a0e08";
    g.fillRect(21, 1, 22, 6);
    g.fillRect(21, 53, 22, 5);
    g.fillStyle = "#d4af37";
    g.fillRect(30, 58, 4, 5);
    const gr = g.createRadialGradient(32, 30, 4, 32, 30, 28);
    gr.addColorStop(0, d ? "#ffb37a" : "#f0563f");
    gr.addColorStop(1, "#a8231e");
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(32, 30, 27, 24, 0, 0, 7);
    g.fill();
    g.strokeStyle = "rgba(60,10,10,.35)";
    g.lineWidth = 1;
    for (let y = 10; y <= 50; y += 5) {
      const hw = 27 * Math.sqrt(Math.max(0, 1 - ((y - 30) / 24) ** 2));
      g.beginPath();
      g.moveTo(32 - hw, y);
      g.lineTo(32 + hw, y);
      g.stroke();
    }
    g.fillStyle = shieldPlate(k, "#fff5e6");
    g.beginPath();
    g.arc(32, 30, 14, 0, 7);
    g.fill();
    drawSymbol(g, gl, k, 32, 30, 20, "#5a1e24");
  },
  safari: (g, gl, k, d) => {
    // a hand drum: hide top, zigzag band, rope ties
    g.fillStyle = "#5a3a1a";
    g.beginPath();
    g.arc(32, 32, 30, 0, 7);
    g.fill();
    g.fillStyle = "#8b5a2b";
    g.beginPath();
    g.arc(32, 32, 27, 0, 7);
    g.fill();
    g.strokeStyle = "#f2dfb0";
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * 6.283,
        r = i % 2 ? 22 : 26;
      g.lineTo(32 + Math.cos(t) * r, 32 + Math.sin(t) * r);
    }
    g.stroke();
    g.fillStyle = "#d8b878";
    for (let i = 0; i < 8; i++) {
      const t = (i * Math.PI) / 4;
      g.beginPath();
      g.arc(32 + Math.cos(t) * 28.5, 32 + Math.sin(t) * 28.5, 2.2, 0, 7);
      g.fill();
    }
    g.fillStyle = shieldPlate(k, d ? "#e8d4a0" : "#f2e2b8");
    g.beginPath();
    g.arc(32, 32, 17, 0, 7);
    g.fill();
    g.fillStyle = "rgba(120,80,40,.15)";
    g.beginPath();
    g.arc(28, 28, 8, 0, 7);
    g.fill();
    drawSymbol(g, gl, k, 32, 32, 24, "#3b2310");
  },
  steampunk: (g, gl, k, d) => {
    // a brass pressure gauge on a gear
    g.fillStyle = "#6e4a1e";
    drawStar(g, 12, 31, 27);
    g.fill();
    g.fillStyle = "#b5893a";
    g.beginPath();
    g.arc(32, 32, 25, 0, 7);
    g.fill();
    g.fillStyle = "#e8c25a";
    g.beginPath();
    g.arc(32, 32, 22, 0, 7);
    g.fill();
    g.fillStyle = "#6e4a1e";
    for (let i = 0; i < 6; i++) {
      const t = (i * Math.PI) / 3 + 0.5;
      g.beginPath();
      g.arc(32 + Math.cos(t) * 23.5, 32 + Math.sin(t) * 23.5, 1.4, 0, 7);
      g.fill();
    }
    g.fillStyle = shieldPlate(k, "#f4ead0");
    g.beginPath();
    g.arc(32, 32, 19, 0, 7);
    g.fill();
    g.strokeStyle = "#3b2a1e";
    g.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const t = Math.PI * (0.75 + (i * 1.5) / 10);
      g.beginPath();
      g.moveTo(32 + Math.cos(t) * 16, 32 + Math.sin(t) * 16);
      g.lineTo(32 + Math.cos(t) * 18.5, 32 + Math.sin(t) * 18.5);
      g.stroke();
    }
    drawSymbol(g, gl, k, 32, 33, 22, "#3b2a1e");
  },
  kingdom: (g, gl, k, d) => {
    // a royal shield under a crown
    const S = () => {
      g.beginPath();
      g.moveTo(8, 12);
      g.lineTo(56, 12);
      g.lineTo(56, 34);
      g.quadraticCurveTo(56, 54, 32, 63);
      g.quadraticCurveTo(8, 54, 8, 34);
      g.closePath();
    };
    S();
    g.fillStyle = "#d4af37";
    g.fill();
    g.save();
    g.translate(32, 36);
    g.scale(0.86, 0.86);
    g.translate(-32, -36);
    S();
    g.fillStyle = d ? "#3a1050" : "#5b1f7a";
    g.fill();
    g.restore();
    g.fillStyle = "#d4af37";
    g.beginPath();
    g.moveTo(20, 12);
    g.lineTo(20, 4);
    g.lineTo(26, 8);
    g.lineTo(32, 1);
    g.lineTo(38, 8);
    g.lineTo(44, 4);
    g.lineTo(44, 12);
    g.closePath();
    g.fill();
    g.fillStyle = "#c4161f";
    g.beginPath();
    g.arc(32, 7, 2, 0, 7);
    g.fill();
    g.fillStyle = shieldPlate(k, "#f2e6c0");
    g.beginPath();
    g.arc(32, 35, 15, 0, 7);
    g.fill();
    drawSymbol(g, gl, k, 32, 35, 21, "#3a1050");
  },
  wildwest: (g, gl, k) => {
    // a sheriff's star
    g.fillStyle = "#c99a2e";
    drawStar(g, 5, 31, 16);
    g.fill();
    g.strokeStyle = "#7a5a14";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = "#e8c25a";
    for (let i = 0; i < 5; i++) {
      const t = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      g.beginPath();
      g.arc(32 + Math.cos(t) * 30, 32 + Math.sin(t) * 30, 3.5, 0, 7);
      g.fill();
    }
    g.fillStyle = shieldPlate(k, "#fff3d6");
    g.beginPath();
    g.arc(32, 33, 16, 0, 7);
    g.fill();
    g.strokeStyle = "#7a5a14";
    g.lineWidth = 2;
    g.stroke();
    drawSymbol(g, gl, k, 32, 33, 22, "#3e2410");
  },
  tropical: (g, gl, k) => {
    // a life ring with its rope
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? "#ffffff" : "#e63a2e";
      g.beginPath();
      g.moveTo(32, 32);
      g.arc(32, 32, 29, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = "#c8a46a";
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(32, 32, 30.5, 0, 7);
    g.stroke();
    g.strokeStyle = "#8a6a3a";
    g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const t = (i * Math.PI) / 2 + Math.PI / 8;
      g.beginPath();
      g.arc(32 + Math.cos(t) * 30, 32 + Math.sin(t) * 30, 2.5, 0, 7);
      g.stroke();
    }
    g.fillStyle = shieldPlate(k, "#bfe9f2");
    g.beginPath();
    g.arc(32, 32, 17, 0, 7);
    g.fill();
    drawSymbol(g, gl, k, 32, 32, 24, "#0b3a4a");
  },
  mech: (g, gl, k, d) => {
    // a power cell with a hazard-striped ring
    const hex = (r) => {
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const t = (i * Math.PI) / 3;
        g.lineTo(32 + Math.cos(t) * r, 32 + Math.sin(t) * r);
      }
      g.closePath();
    };
    hex(31);
    g.fillStyle = "#111";
    g.fill();
    g.save();
    hex(29);
    g.clip();
    g.fillStyle = "#ffc300";
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = "#1a1a1a";
    for (let x = -64; x < 64; x += 10) {
      g.beginPath();
      g.moveTo(x, 64);
      g.lineTo(x + 5, 64);
      g.lineTo(x + 69, 0);
      g.lineTo(x + 64, 0);
      g.closePath();
      g.fill();
    }
    g.restore();
    hex(22);
    g.fillStyle = "#2a2e33";
    g.fill();
    g.fillStyle = shieldPlate(k, d ? "#9fe8ff" : "#e9ecef");
    g.beginPath();
    g.arc(32, 32, 17, 0, 7);
    g.fill();
    drawSymbol(g, gl, k, 32, 32, 24, "#212529");
  },
  casino: (g, gl, k, d) => {
    // a poker chip
    g.fillStyle = "#0a0a0a";
    g.beginPath();
    g.arc(32, 32, 31, 0, 7);
    g.fill();
    g.fillStyle = d ? "#c8102e" : "#1a1a1a";
    g.beginPath();
    g.arc(32, 32, 29.5, 0, 7);
    g.fill();
    g.fillStyle = "#f5f0e1";
    for (let i = 0; i < 8; i++) {
      g.save();
      g.translate(32, 32);
      g.rotate((i * Math.PI) / 4);
      g.fillRect(-4, -29.5, 8, 9);
      g.restore();
    }
    g.strokeStyle = "#d4af37";
    g.lineWidth = 2;
    g.setLineDash([4, 3]);
    g.beginPath();
    g.arc(32, 32, 19.5, 0, 7);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = shieldPlate(k, "#f5f0e1");
    g.beginPath();
    g.arc(32, 32, 17, 0, 7);
    g.fill();
    drawSymbol(g, gl, k, 32, 32, 24, "#111111");
  },
  graffiti: (g, gl, k, d) => {
    // a fresh paint splat, dripping
    const col = d ? "#c6ff1a" : "#ff2d95";
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i < 22; i++) {
      const t = (i / 22) * 6.283,
        r = i % 2 ? 22 : 28 - (i % 4);
      g.lineTo(32 + Math.cos(t) * r, 30 + Math.sin(t) * r);
    }
    g.closePath();
    g.fill();
    for (const [x, l] of [
      [22, 14],
      [38, 20],
      [46, 10],
    ]) {
      g.fillRect(x - 2, 44, 4, l);
      g.beginPath();
      g.arc(x, 44 + l, 2.5, 0, 7);
      g.fill();
    }
    g.fillStyle = shieldPlate(k, "#ffffff");
    g.beginPath();
    g.arc(32, 30, 17, 0, 7);
    g.fill();
    g.strokeStyle = "#111";
    g.lineWidth = 2;
    g.stroke();
    drawSymbol(g, gl, k, 32, 30, 24, "#111111");
  },
};
const SWEET_COLS = ["#ff5c8a", "#5ad1c3", "#ffd23f", "#8a5cff", "#ff8a00", "#2dff6e"];
