import { GX_PAINT } from "./colours.js";
import { EXT_PAINT_ART } from "./registries.js";
import { TROPHIES } from "./laika-trophies.js";

// ---------- achievement paints ----------
// Every achievement (Laika trophies, Arsenal and Hall of Fame) also unlocks a paint of its own, shown in the same box
// as its item once earned. Each is a two-colour finish with its own motif, drawn like the other pattern paints.
const hexc6 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const achPaintKey = (tkey) => "pt-aw-" + String(tkey).replace(/^aw-/, "");
export const ACH_PAINTS = {
  // trophy key: [paint name, dark, light, motif]
  dimitrium: ["Gunmetal Sheen", "#2b2f36", "#8a929e", "brushed"],
  galaxy: ["Star Chart", "#0b0f2a", "#4a62d0", "stars"],
  supernova: ["Nova Burst", "#3a0a00", "#ff7a1a", "rays"],
  "dimitri-bone": ["Dimitrium Glow", "#06302a", "#2affc6", "hex"],
  "laser-emitter": ["Laser Grid", "#1a0010", "#ff2a6a", "grid"],
  "gold-launcher": ["Afterburn", "#2a1200", "#ffb020", "chevrons"],
  "mine-ball": ["Hazard Stripe", "#1c1c1c", "#ffcc00", "stripes"],
  "gatling-gold": ["Spun Gold", "#4a3000", "#ffd75a", "rings"],
  "ammo-belt": ["Brass Casing", "#3a2408", "#d8a050", "scales"],
  "aw-goldbars": ["Bullion", "#6b4a00", "#ffe27a", "bricks"],
  "aw-crystalcrown": ["Diamond Facets", "#2a6f9a", "#e8fbff", "facets"],
  "aw-bronzelaurel": ["Bronze Laurel", "#4a2a10", "#d08a4a", "laurel"],
  "aw-victoryflag": ["Victory Red", "#5a0010", "#ff3a4a", "chevrons"],
  "aw-aura-legend": ["Legendary", "#2a0a4a", "#ffcf4a", "laurel"],
  "aw-skulltally": ["Tally Marks", "#1a1a1a", "#d8d8d8", "tally"],
  "aw-warcape": ["War Paint", "#3a0000", "#c01818", "brush"],
  "aw-infernocape": ["Inferno", "#200000", "#ff5a00", "fire"],
  "aw-yinyang": ["Balance", "#111111", "#f2f2f2", "split"],
  "aw-raincloud": ["Storm Cloud", "#2a3442", "#8a98aa", "rain"],
  "aw-target": ["Bullseye", "#d01818", "#ffffff", "rings"],
  "aw-oops": ["Cracked", "#4a3a30", "#c8b8a0", "cracks"],
  "aw-beret": ["Veteran Olive", "#2a3418", "#7a8a4a", "camo"],
  "aw-scope": ["Light Speed", "#000814", "#7af0ff", "streaks"],
  "aw-radar": ["Radar Sweep", "#001a08", "#3aff6a", "radar"],
  "aw-detector": ["Minesweeper", "#6a6e74", "#c8ccd2", "grid"],
  "aw-smokebarrel": ["Gunsmoke", "#141418", "#e6e6ee", "smoke"],
  "aw-rose": ["Rose Petal", "#5a0018", "#ff7aa0", "petals"],
  "aw-riotshield": ["Riot Blue", "#0a1a3a", "#4a8aff", "hex"],
  "aw-crates": ["Crate Wood", "#4a2a10", "#c08a4a", "planks"],
  "aw-sparklecrown": ["Sparkle", "#3a0a3a", "#ffd0ff", "stars"],
  "aw-stopwatch": ["Speed Lines", "#0a0a2a", "#ffffff", "streaks"],
  "aw-aura-heartbeat": ["Heartbeat", "#2a0008", "#ff2a4a", "pulse"],
  "aw-itcounts": ["Shrapnel", "#2a0a00", "#ff6a1a", "facets"],
  "aw-boomerang": ["Outback", "#6a2a08", "#e0904a", "zigzag"],
  "aw-blanket": ["Cosy Plaid", "#5a1010", "#2a3a6a", "plaid"],
  "aw-phoenix": ["Phoenix Fire", "#3a0800", "#ffb000", "fire"],
  "aw-aura-bubble": ["Bubble", "#0a3a5a", "#bff4ff", "bubbles"],
  "aw-bankmedal": ["Royal Ricochet", "#1a0a4a", "#c8a0ff", "zigzag"],
  "aw-mirror": ["Runway", "#0a0a0a", "#ff4fd0", "stripes"],
  "aw-bracelets": ["Twin Tone", "#ff7ab0", "#7ad0ff", "split"],
  "aw-nightcap": ["Midnight", "#060a1e", "#ffe9a8", "moons"],
  "aw-calendar": ["Loyal Blue", "#0a2a6a", "#5aa0ff", "checks"],
  "aw-aura-showcase": ["Showcase", "#1e1e24", "#ffffff", "confetti"],
  "aw-palette": ["Paint Splash", "#e04a4a", "#f4f0e8", "splash"],
  "aw-suitcase": ["Passport Stamps", "#7a4a2a", "#e8dcc0", "stamps"],
  "aw-slots": ["Lucky Sevens", "#3a0010", "#ffd23a", "sevens"],
  "aw-sixbounce": ["Six Bounce", "#062a2a", "#e08a4a", "zigzag"],
  "aw-ace": ["Ace of Spades", "#f2f2f4", "#111318", "spades"],
  "aw-ironwall": ["Iron Plate", "#2a2e35", "#9aa2ae", "rivets"],
  "aw-discoball": ["Disco Tiles", "#2a0a3a", "#ff9aff", "tiles"],
};
function achPaintDraw(g, PH, dark, light, motif, seed) {
  const { W, HH, H, fbm, field, hexc, mix, shine } = PH,
    A = hexc(dark),
    B = hexc(light),
    lerp = (t) => [0, 1, 2].map((i) => mix(A[i], B[i], t));
  const rgba = (c, a) => `rgba(${c.map(Math.round).join(",")},${a})`,
    R = (k, j) => H(k, j, seed);
  const bg = {
    split: 0.5,
    splash: 0.92,
    stamps: 0.92,
    tally: 0.12,
    bubbles: 0.25,
    rings: 0.12,
    cracks: 0.85,
    stars: 0.1,
    moons: 0.04,
    spades: 0.0,
    rivets: 0.55,
  }[motif];
  field(g, (x, y) =>
    lerp(
      Math.max(
        0,
        Math.min(
          1,
          (bg ?? 0.22) +
            (fbm(x / 70, y / 70, seed) - 0.5) * 0.25 +
            (motif === "brushed" ? (H(0, y, seed) - 0.5) * 0.18 : 0),
        ),
      ),
    ),
  );
  const L = (a) => rgba(B, a),
    D = (a) => rgba(A, a),
    line = (w, s) => {
      g.lineWidth = w;
      g.strokeStyle = s;
      g.lineCap = "round";
      g.lineJoin = "round";
    };
  const star = (x, y, r, n = 5) => {
    g.beginPath();
    for (let j = 0; j < n * 2; j++) {
      const a = (j / (n * 2)) * 6.2832 - 1.5708,
        rr = j % 2 ? r * 0.45 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  };
  switch (motif) {
    case "brushed": {
      const s = g.createLinearGradient(0, 0, W, HH);
      s.addColorStop(0.3, "rgba(255,255,255,0)");
      s.addColorStop(0.5, "rgba(255,255,255,.28)");
      s.addColorStop(0.7, "rgba(255,255,255,0)");
      g.fillStyle = s;
      g.fillRect(0, 0, W, HH);
      break;
    }
    case "stars":
      for (let k = 0; k < 90; k++) {
        g.fillStyle = k % 4 ? "rgba(255,255,255," + (0.5 + R(k, 3) * 0.5) + ")" : L(1);
        const r = 1 + R(k, 4) * (k % 5 ? 2.5 : 12);
        if (r > 4) {
          star(R(k, 1) * W, R(k, 2) * HH, r);
        } else {
          g.beginPath();
          g.arc(R(k, 1) * W, R(k, 2) * HH, r, 0, 7);
          g.fill();
        }
      }
      break;
    case "rays": {
      const cx = W / 2,
        cy = HH / 2;
      for (let k = 0; k < 16; k++) {
        g.fillStyle = k % 2 ? L(0.55) : D(0.25);
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, W, (k / 16) * 6.2832, ((k + 1) / 16) * 6.2832);
        g.fill();
      }
      const c = g.createRadialGradient(cx, cy, 0, cx, cy, 90);
      c.addColorStop(0, L(0.95));
      c.addColorStop(1, L(0));
      g.fillStyle = c;
      g.fillRect(0, 0, W, HH);
      break;
    }
    case "hex": {
      const s = 22,
        h = s * Math.sqrt(3);
      line(2.5, L(0.7));
      for (let y = -1; y < HH / h + 1; y++) {
        for (let x = -1; x < W / (s * 1.5) + 1; x++) {
          const cx = x * s * 1.5,
            cy = y * h + (x % 2 ? h / 2 : 0);
          g.beginPath();
          for (let j = 0; j < 6; j++) {
            g.lineTo(cx + Math.cos(j * 1.0472) * s * 0.92, cy + Math.sin(j * 1.0472) * s * 0.92);
          }
          g.closePath();
          g.stroke();
        }
      }
      break;
    }
    case "grid": {
      g.save();
      g.shadowColor = L(1);
      g.shadowBlur = motif === "grid" && A[0] + A[1] + A[2] < 150 ? 8 : 0;
      line(2, L(0.8));
      for (let x = 0; x <= W; x += 25) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, HH);
        g.stroke();
      }
      for (let y = 0; y <= HH; y += 25) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
      g.restore();
      break;
    }
    case "chevrons":
      for (let x = -60; x < W + 60; x += 46) {
        g.fillStyle = L(0.75);
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + 18, 0);
        g.lineTo(x + 18 + 60, HH / 2);
        g.lineTo(x + 18, HH);
        g.lineTo(x, HH);
        g.lineTo(x + 60, HH / 2);
        g.fill();
      }
      break;
    case "stripes":
      for (let x = -HH; x < W + HH; x += 44) {
        g.fillStyle = L(0.95);
        g.beginPath();
        g.moveTo(x, HH);
        g.lineTo(x + 22, HH);
        g.lineTo(x + 22 + HH, 0);
        g.lineTo(x + HH, 0);
        g.fill();
      }
      break;
    case "rings": {
      const cx = W / 2,
        cy = HH / 2;
      for (let r = 260; r > 0; r -= 20) {
        g.fillStyle = (r / 20) % 2 ? L(1) : D(1);
        g.beginPath();
        g.arc(cx, cy, r, 0, 7);
        g.fill();
      }
      break;
    }
    case "scales":
      for (let y = -10; y < HH + 20; y += 18) {
        for (let x = (y / 18) % 2 ? 0 : 14; x < W + 28; x += 28) {
          const gr = g.createRadialGradient(x, y - 6, 2, x, y, 16);
          gr.addColorStop(0, L(1));
          gr.addColorStop(1, D(0.9));
          g.fillStyle = gr;
          g.beginPath();
          g.arc(x, y, 15, 0, Math.PI);
          g.fill();
        }
      }
      break;
    case "bricks":
      for (let y = 0; y < HH; y += 30) {
        for (let x = (y / 30) % 2 ? -35 : 0; x < W; x += 70) {
          const gr = g.createLinearGradient(0, y, 0, y + 30);
          gr.addColorStop(0, L(1));
          gr.addColorStop(0.5, rgba(lerp(0.6), 1));
          gr.addColorStop(1, D(1));
          g.fillStyle = gr;
          g.fillRect(x + 3, y + 3, 64, 24);
        }
      }
      break;
    case "facets":
      for (let k = 0; k < 60; k++) {
        const x = R(k, 1) * W,
          y = R(k, 2) * HH,
          r = 30 + R(k, 3) * 40;
        g.fillStyle = rgba(lerp(0.3 + R(k, 4) * 0.7), 0.7);
        g.beginPath();
        g.moveTo(x, y - r);
        g.lineTo(x + r * 0.8, y);
        g.lineTo(x, y + r * 0.6);
        g.lineTo(x - r * 0.7, y + r * 0.1);
        g.fill();
      }
      break;
    case "laurel":
      for (let y = 30; y < HH; y += 60) {
        line(3, L(0.8));
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
        for (let x = 8; x < W; x += 22) {
          for (const s of [-1, 1]) {
            g.fillStyle = L(0.85);
            g.beginPath();
            g.ellipse(x, y + s * 9, 11, 5, s * 0.6, 0, 7);
            g.fill();
          }
        }
      }
      break;
    case "tally":
      for (let k = 0; k < 24; k++) {
        const x = 15 + (k % 6) * 66,
          y = 15 + Math.floor(k / 6) * 58;
        line(4, L(0.85));
        for (let j = 0; j < 4; j++) {
          g.beginPath();
          g.moveTo(x + j * 11, y + 2 + R(k, j) * 4);
          g.lineTo(x + j * 11 + 2, y + 40);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(x - 6, y + 32);
        g.lineTo(x + 44, y + 8);
        g.stroke();
      }
      break;
    case "brush":
      for (let k = 0; k < 9; k++) {
        const y = R(k, 1) * HH,
          x = R(k, 2) * W * 0.4;
        line(10 + R(k, 3) * 14, k % 3 ? L(0.8) : "rgba(0,0,0,.55)");
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + 80, y - 30, x + 160, y + 30, x + 200 + R(k, 4) * 140, y - 10);
        g.stroke();
      }
      break;
    case "fire":
      field(g, (x, y) => {
        const t = Math.pow(Math.max(0, fbm(x / 40, y / 25 + 3, seed + 2) * 1.2 + (y / HH) * 0.7 - 0.45), 1.15);
        const c = lerp(Math.min(1, t));
        return t > 0.85 ? c.map((v) => Math.min(255, v + (t - 0.85) * 600)) : c;
      });
      break;
    case "split": {
      g.fillStyle = L(1);
      g.beginPath();
      g.moveTo(W * 0.5, 0);
      g.bezierCurveTo(W * 0.3, HH * 0.35, W * 0.7, HH * 0.65, W * 0.5, HH);
      g.lineTo(W, HH);
      g.lineTo(W, 0);
      g.fill();
      g.fillStyle = D(1);
      g.fillRect(0, 0, W * 0.5, HH);
      g.beginPath();
      g.moveTo(W * 0.5, 0);
      g.bezierCurveTo(W * 0.3, HH * 0.35, W * 0.7, HH * 0.65, W * 0.5, HH);
      g.lineTo(W * 0.5, 0);
      g.fill();
      g.fillStyle = L(1);
      g.beginPath();
      g.arc(W * 0.3, HH * 0.5, 16, 0, 7);
      g.fill();
      g.fillStyle = D(1);
      g.beginPath();
      g.arc(W * 0.7, HH * 0.5, 16, 0, 7);
      g.fill();
      break;
    }
    case "moons":
      for (let k = 0; k < 60; k++) {
        g.fillStyle = "rgba(255,255,255," + (0.4 + R(k, 3) * 0.6) + ")";
        g.beginPath();
        g.arc(R(k, 1) * W, R(k, 2) * HH, 0.8 + R(k, 4) * 1.6, 0, 7);
        g.fill();
      }
      for (let k = 0; k < 7; k++) {
        const x = 30 + (k % 4) * 110 + R(k, 6) * 30,
          y = 50 + Math.floor(k / 4) * 120 + R(k, 7) * 30,
          r = 16 + R(k, 8) * 8;
        const m = document.createElement("canvas");
        m.width = m.height = 80;
        const mg = m.getContext("2d");
        mg.fillStyle = L(1);
        mg.beginPath();
        mg.arc(40, 40, r, 0, 7);
        mg.fill();
        mg.globalCompositeOperation = "destination-out";
        mg.beginPath();
        mg.arc(40 + r * 0.45, 40 - r * 0.3, r * 0.9, 0, 7);
        mg.fill();
        g.save();
        g.shadowColor = L(1);
        g.shadowBlur = 12;
        g.drawImage(m, x - 40, y - 40);
        g.restore();
      }
      break;
    case "rain":
      line(2, L(0.75));
      for (let k = 0; k < 110; k++) {
        const x = R(k, 1) * W,
          y = R(k, 2) * HH;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 6, y + 16);
        g.stroke();
      }
      break;
    case "cracks":
      line(3, D(1));
      for (let k = 0; k < 7; k++) {
        let x = R(k, 1) * W,
          y = R(k, 2) * HH;
        g.beginPath();
        g.moveTo(x, y);
        for (let j = 0; j < 9; j++) {
          x += (R(k, j + 3) - 0.5) * 70;
          y += (R(k, j + 13) - 0.5) * 50;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      break;
    case "camo":
      for (let k = 0; k < 40; k++) {
        g.fillStyle = k % 3 === 0 ? "rgba(20,24,12,.75)" : k % 3 === 1 ? L(0.75) : rgba(lerp(0.5), 0.8);
        g.beginPath();
        g.ellipse(R(k, 1) * W, R(k, 2) * HH, 18 + R(k, 3) * 30, 10 + R(k, 4) * 18, R(k, 5) * 3, 0, 7);
        g.fill();
      }
      break;
    case "streaks":
      for (let k = 0; k < 50; k++) {
        const y = R(k, 1) * HH,
          x = R(k, 2) * W,
          l = 40 + R(k, 3) * 140,
          gr = g.createLinearGradient(x, 0, x + l, 0);
        gr.addColorStop(0, L(0));
        gr.addColorStop(1, L(0.95));
        line(1 + R(k, 4) * 3, gr);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + l, y);
        g.stroke();
      }
      break;
    case "radar": {
      const cx = W / 2,
        cy = HH / 2;
      line(1.5, L(0.6));
      for (let r = 25; r < 240; r += 30) {
        g.beginPath();
        g.arc(cx, cy, r, 0, 7);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(0, cy);
      g.lineTo(W, cy);
      g.moveTo(cx, 0);
      g.lineTo(cx, HH);
      g.stroke();
      for (let k = 0; k < 30; k++) {
        g.fillStyle = L(0.35 * (1 - k / 30));
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, 240, -0.9 - k * 0.04, -0.86 - k * 0.04);
        g.fill();
      }
      for (let k = 0; k < 6; k++) {
        g.fillStyle = L(1);
        g.beginPath();
        g.arc(R(k, 1) * W, R(k, 2) * HH, 4, 0, 7);
        g.fill();
      }
      break;
    }
    case "smoke":
      for (let k = 0; k < 26; k++) {
        const x = R(k, 1) * W,
          y = R(k, 2) * HH,
          r = 25 + R(k, 3) * 45,
          gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, L(0.45));
        gr.addColorStop(1, L(0));
        g.fillStyle = gr;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      break;
    case "petals":
      for (let k = 0; k < 40; k++) {
        g.save();
        g.translate(R(k, 1) * W, R(k, 2) * HH);
        g.rotate(R(k, 3) * 6.28);
        g.fillStyle = L(0.6 + R(k, 4) * 0.4);
        g.beginPath();
        g.ellipse(0, 0, 13, 7, 0, 0, 7);
        g.fill();
        g.fillStyle = D(0.35);
        g.fillRect(-9, -0.5, 14, 1);
        g.restore();
      }
      break;
    case "planks":
      for (let y = 0; y < HH; y += 40) {
        g.fillStyle = rgba(lerp(0.45 + R(y, 1) * 0.35), 1);
        g.fillRect(0, y + 2, W, 36);
        line(1, D(0.35));
        for (let j = 0; j < 4; j++) {
          g.beginPath();
          g.moveTo(0, y + 10 + j * 7);
          for (let x = 0; x <= W; x += 40) {
            g.lineTo(x, y + 10 + j * 7 + Math.sin(x / 60 + j + y) * 2);
          }
          g.stroke();
        }
      }
      line(8, D(0.9));
      g.strokeRect(14, 14, W - 28, HH - 28);
      g.beginPath();
      g.moveTo(14, 14);
      g.lineTo(W - 14, HH - 14);
      g.stroke();
      break;
    case "pulse":
      for (let y = 40; y < HH; y += 80) {
        g.save();
        g.shadowColor = L(1);
        g.shadowBlur = 8;
        line(3.5, L(0.95));
        g.beginPath();
        g.moveTo(0, y);
        for (let x = 0; x < W; x += 100) {
          g.lineTo(x + 40, y);
          g.lineTo(x + 50, y - 26);
          g.lineTo(x + 60, y + 22);
          g.lineTo(x + 68, y - 8);
          g.lineTo(x + 74, y);
        }
        g.lineTo(W, y);
        g.stroke();
        g.restore();
      }
      break;
    case "zigzag":
      for (let y = 10; y < HH; y += 34) {
        line(6, L(0.85));
        g.beginPath();
        for (let x = 0; x <= W; x += 24) {
          g.lineTo(x, y + ((x / 24) % 2 ? 12 : -2));
        }
        g.stroke();
      }
      break;
    case "plaid": {
      for (let x = 0; x < W; x += 60) {
        g.fillStyle = L(0.55);
        g.fillRect(x, 0, 26, HH);
      }
      for (let y = 0; y < HH; y += 60) {
        g.fillStyle = L(0.55);
        g.fillRect(0, y, W, 26);
      }
      line(2, "rgba(240,220,160,.6)");
      for (let x = 40; x < W; x += 60) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, HH);
        g.stroke();
      }
      for (let y = 40; y < HH; y += 60) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
      break;
    }
    case "bubbles":
      for (let k = 0; k < 45; k++) {
        const x = R(k, 1) * W,
          y = R(k, 2) * HH,
          r = 6 + R(k, 3) * 22;
        line(2, L(0.8));
        g.beginPath();
        g.arc(x, y, r, 0, 7);
        g.stroke();
        g.fillStyle = L(0.18);
        g.fill();
        g.fillStyle = "rgba(255,255,255,.85)";
        g.beginPath();
        g.ellipse(x - r * 0.35, y - r * 0.4, r * 0.25, r * 0.14, -0.6, 0, 7);
        g.fill();
      }
      break;
    case "checks":
      for (let y = 0; y < HH; y += 30) {
        for (let x = 0; x < W; x += 30) {
          if (((x + y) / 30) % 2) {
            g.fillStyle = L(0.85);
            g.fillRect(x, y, 30, 30);
          }
        }
      }
      break;
    case "confetti": {
      const cols = ["#ff4a5a", "#ffcf3a", "#3ad07a", "#3a9aff", "#c06aff", "#ffffff"];
      for (let k = 0; k < 110; k++) {
        g.save();
        g.translate(R(k, 1) * W, R(k, 2) * HH);
        g.rotate(R(k, 3) * 6.28);
        g.fillStyle = cols[k % 6];
        g.fillRect(-6, -2.5, 12, 5);
        g.restore();
      }
      break;
    }
    case "splash": {
      const cols = [dark, "#2a7aff", "#ffcf2a", "#2ac07a"];
      for (let k = 0; k < 9; k++) {
        const x = R(k, 1) * W,
          y = R(k, 2) * HH,
          r = 18 + R(k, 3) * 26;
        g.fillStyle = cols[k % 4];
        g.beginPath();
        g.arc(x, y, r, 0, 7);
        g.fill();
        for (let j = 0; j < 8; j++) {
          const a = R(k, j + 5) * 6.28,
            d = r + 4 + R(k, j + 15) * 22;
          g.beginPath();
          g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 + R(k, j + 25) * 5, 0, 7);
          g.fill();
        }
      }
      break;
    }
    case "stamps": {
      g.font = "bold 13px Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      const cols = [dark, "#2a5aa0", "#a02a3a", "#2a7a4a"];
      for (let k = 0; k < 12; k++) {
        g.save();
        g.translate(30 + (k % 4) * 100 + R(k, 1) * 30, 35 + Math.floor(k / 4) * 80 + R(k, 2) * 15);
        g.rotate((R(k, 3) - 0.5) * 0.8);
        g.globalAlpha = 0.75;
        line(2.5, cols[k % 4]);
        g.fillStyle = cols[k % 4];
        if (k % 2) {
          g.beginPath();
          g.arc(0, 0, 26, 0, 7);
          g.stroke();
          g.beginPath();
          g.arc(0, 0, 20, 0, 7);
          g.stroke();
        } else {
          g.strokeRect(-34, -18, 68, 36);
        }
        g.fillText(["ARRIVED", "PASS", "ENTRY", "TT"][k % 4], 0, 0);
        g.restore();
      }
      break;
    }
    case "sevens": {
      g.font = "bold 54px Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (let k = 0; k < 15; k++) {
        const x = 40 + (k % 5) * 80,
          y = 40 + Math.floor(k / 5) * 80;
        g.fillStyle = D(0.9);
        g.fillText("7", x + 3, y + 3);
        g.fillStyle = L(1);
        g.fillText("7", x, y);
      }
      g.fillStyle = L(0.9);
      for (let k = 0; k < 18; k++) {
        star(R(k, 1) * W, R(k, 2) * HH, 3 + R(k, 3) * 4, 4);
      }
      break;
    }
    case "spades": {
      g.font = "900 30px Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (let k = 0; k < 24; k++) {
        const x = 30 + (k % 6) * 68 + (((k / 6) | 0) % 2) * 34,
          y = 30 + ((k / 6) | 0) * 60;
        g.fillStyle = k % 5 === 2 ? "#c8102e" : L(1);
        g.fillText(k % 5 === 2 ? "\u2665" : "\u2660", x, y);
      }
      break;
    }
    case "rivets": {
      line(3, D(0.6));
      for (let y = 0; y < HH; y += 80) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
      for (let x = 0; x < W; x += 100) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, HH);
        g.stroke();
      }
      for (let y = 12; y < HH; y += 80) {
        for (let x = 12; x < W; x += 100) {
          for (const [dx, dy] of [
            [0, 0],
            [76, 0],
            [0, 56],
            [76, 56],
          ]) {
            const gr = g.createRadialGradient(x + dx - 2, y + dy - 2, 1, x + dx, y + dy, 7);
            gr.addColorStop(0, "#ffffff");
            gr.addColorStop(1, rgba(A, 1));
            g.fillStyle = gr;
            g.beginPath();
            g.arc(x + dx, y + dy, 6, 0, 7);
            g.fill();
          }
        }
      }
      break;
    }
    case "tiles":
      for (let y = 0; y < HH; y += 20) {
        for (let x = 0; x < W; x += 20) {
          g.fillStyle = rgba(lerp(0.2 + R(x, y) * 0.8), 1);
          g.fillRect(x + 1, y + 1, 18, 18);
          if (R(x, y + 7) > 0.88) {
            g.fillStyle = "rgba(255,255,255,.95)";
            star(x + 10, y + 10, 7, 4);
          }
        }
      }
      break;
  }
  shine(g, 0.14);
}
// Only the hard achievements give a paint (the rest give their item only)
const HARD_PAINTS = new Set([
  "dimitrium",
  "galaxy",
  "supernova",
  "aw-crystalcrown",
  "aw-goldbars",
  "aw-victoryflag",
  "aw-aura-legend",
  "aw-skulltally",
  "aw-warcape",
  "aw-infernocape",
  "aw-scope",
  "aw-smokebarrel",
  "aw-aura-bubble",
  "aw-sixbounce",
  "aw-ace",
  "aw-ironwall",
]);
for (const k of Object.keys(ACH_PAINTS)) {
  if (!HARD_PAINTS.has(k)) {
    delete ACH_PAINTS[k];
  }
}
{
  let s = 7100;
  for (const k in ACH_PAINTS) {
    const [name, dark, light, motif] = ACH_PAINTS[k],
      key = achPaintKey(k),
      seed = s++;
    const a = hexc6(dark),
      b = hexc6(light),
      avg =
        "0x" +
        a
          .map((v, i) =>
            Math.round(v * 0.6 + b[i] * 0.4)
              .toString(16)
              .padStart(2, "0"),
          )
          .join("");
    GX_PAINT[key] = { name, avg };
    EXT_PAINT_ART[key] = (g, PH) => achPaintDraw(g, PH, dark, light, motif, seed);
  }
}
export const trophyOfPaint = (key) => TROPHIES.find((t) => achPaintKey(t.key) === key);
