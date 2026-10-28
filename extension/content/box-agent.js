import { GX_ACC, GX_PAINT } from "./colours.js";
import { EXT_AURA, EXT_BOXPIC, EXT_ITEM, EXT_PAINT_ART, EXT_UPRIGHT } from "./registries.js";
import { MAP_THEMES, mapNoise } from "./maps.js";
import { DEC, MOTIF, OBJ_CRATES, WALL, drawSymbol, mapVariant, shieldPlate } from "./maps-more.js";

// ---- Agent box: sharp suits, silk ties, shades and a briefcase (all original drawings) ----
Object.assign(GX_ACC, {
  "ag-tie-red": { slot: "front", name: "Silk Tie (Red)", box: "agent" },
  "ag-tie-black": { slot: "front", name: "Silk Tie (Black)", box: "agent" },
  "ag-tie-blue": { slot: "front", name: "Silk Tie (Navy)", box: "agent" },
  "ag-tie-silver": { slot: "front", name: "Silk Tie (Silver)", box: "agent" },
  "ag-shades": { slot: "turret", name: "Agent Shades", box: "agent" },
  "ag-earpiece": { slot: "turret", name: "Earpiece", box: "agent" },
  "ag-briefcase": { slot: "back", name: "Briefcase", box: "agent" },
  "ag-aura": { slot: "front", name: "Aura: Laser Grid", box: "agent" },
});
Object.assign(GX_PAINT, {
  "pt-blacksuit": { name: "Black Suit", avg: "0x27282c" },
  "pt-pinstripe": { name: "Charcoal Pinstripe", avg: "0x3f4148" },
  "pt-navysuit": { name: "Navy Suit", avg: "0x212945" },
  "pt-whitetux": { name: "White Dinner Jacket", avg: "0xc9c5bc" },
  "pt-tuxedo": { name: "Tuxedo", avg: "0x212225" },
});
EXT_UPRIGHT.push("pt-pinstripe", "pt-tuxedo");

// a knotted silk tie on a crisp white shirt-collar V, with the suit's lapel edges either side
const AG_TIES = {
  red: ["#e8404a", "#b3121e", "#5e0610"],
  black: ["#55555e", "#1c1c21", "#050506"],
  blue: ["#4a66b8", "#1c2f66", "#0a1430"],
  silver: ["#f4f6f9", "#aab0b9", "#5c626b"],
};
function AG_tie(g, K, col) {
  const [hi, mid, lo] = AG_TIES[col],
    ink = K.ink,
    cx = 380,
    top = 206;
  g.save();
  g.translate(cx, top);
  g.rotate(-0.06);
  g.scale(1.15, 1.15);
  g.translate(-cx, -top);
  // suit lapels (the V opening of the jacket) and the shirt inside it
  const vee = (c) => {
    c.beginPath();
    c.moveTo(cx - 40, top - 4);
    c.lineTo(cx + 40, top - 4);
    c.lineTo(cx + 6, top + 104);
    c.lineTo(cx - 6, top + 104);
    c.closePath();
  };
  const lapL = (c) => {
    c.beginPath();
    c.moveTo(cx - 40, top - 4);
    c.lineTo(cx - 54, top - 2);
    c.lineTo(cx - 34, top + 46);
    c.lineTo(cx - 12, top + 112);
    c.lineTo(cx - 6, top + 104);
    c.closePath();
  };
  const lapR = (c) => {
    c.beginPath();
    c.moveTo(cx + 40, top - 4);
    c.lineTo(cx + 54, top - 2);
    c.lineTo(cx + 34, top + 46);
    c.lineTo(cx + 12, top + 112);
    c.lineTo(cx + 6, top + 104);
    c.closePath();
  };
  const all = (c) => {
    c.beginPath();
    c.moveTo(cx - 54, top - 2);
    c.lineTo(cx + 54, top - 2);
    c.lineTo(cx + 34, top + 46);
    c.lineTo(cx + 12, top + 112);
    c.lineTo(cx - 12, top + 112);
    c.lineTo(cx - 34, top + 46);
    c.closePath();
  };
  K.shade(all, 4, 7, 0.4, 5);
  vee(g);
  g.fillStyle = K.lin(cx - 40, top, cx + 30, top + 100, [
    [0, "#ffffff"],
    [0.6, "#eef1f5"],
    [1, "#c9ced8"],
  ]);
  g.fill();
  g.save();
  vee(g);
  g.clip();
  g.strokeStyle = "rgba(150,160,180,.35)";
  g.lineWidth = 1;
  for (let y = top + 8; y < top + 104; y += 7) {
    g.beginPath();
    g.moveTo(cx - 40, y);
    g.lineTo(cx + 40, y);
    g.stroke();
  }
  g.restore(); // fine shirting
  for (const [p, a, b] of [
    [lapL, "#3a3c44", "#121318"],
    [lapR, "#2e3038", "#0c0d11"],
  ]) {
    p(g);
    g.fillStyle = K.lin(cx - 50, top, cx + 50, top + 110, [
      [0, a],
      [1, b],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
  }
  g.strokeStyle = "rgba(255,255,255,.22)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(cx - 38, top + 2);
  g.lineTo(cx - 9, top + 104);
  g.stroke();
  g.beginPath();
  g.moveTo(cx + 38, top + 2);
  g.lineTo(cx + 9, top + 104);
  g.stroke(); // lapel edge stitching light
  // the collar points
  const colL = (c) => {
    c.beginPath();
    c.moveTo(cx - 3, top + 8);
    c.lineTo(cx - 36, top - 6);
    c.lineTo(cx - 24, top + 30);
    c.closePath();
  };
  const colR = (c) => {
    c.beginPath();
    c.moveTo(cx + 3, top + 8);
    c.lineTo(cx + 36, top - 6);
    c.lineTo(cx + 24, top + 30);
    c.closePath();
  };
  // tie blade (behind the collar), widening to a pointed tip
  const blade = (c) => {
    c.beginPath();
    c.moveTo(cx - 7, top + 18);
    c.lineTo(cx + 7, top + 18);
    c.quadraticCurveTo(cx + 15, top + 70, cx + 18, top + 118);
    c.lineTo(cx, top + 136);
    c.lineTo(cx - 18, top + 118);
    c.quadraticCurveTo(cx - 15, top + 70, cx - 7, top + 18);
    c.closePath();
  };
  K.shade(blade, 3, 5, 0.35, 3);
  blade(g);
  g.fillStyle = K.lin(cx - 18, 0, cx + 18, 0, [
    [0, lo],
    [0.28, mid],
    [0.5, hi],
    [0.72, mid],
    [1, lo],
  ]);
  g.fill();
  g.save();
  blade(g);
  g.clip(); // diagonal repp stripes and a silk sheen
  g.strokeStyle = col === "silver" ? "rgba(90,96,108,.35)" : "rgba(255,255,255,.13)";
  g.lineWidth = 3;
  for (let y = top - 20; y < top + 160; y += 11) {
    g.beginPath();
    g.moveTo(cx - 30, y);
    g.lineTo(cx + 30, y + 26);
    g.stroke();
  }
  const sh = g.createLinearGradient(cx - 10, top + 30, cx + 6, top + 120);
  sh.addColorStop(0, "rgba(255,255,255,0)");
  sh.addColorStop(0.45, "rgba(255,255,255,.32)");
  sh.addColorStop(0.55, "rgba(255,255,255,0)");
  g.fillStyle = sh;
  g.fillRect(cx - 20, top, 40, 140);
  g.fillStyle = "rgba(0,0,0,.18)";
  g.fillRect(cx + 4, top + 18, 16, 120);
  g.restore();
  blade(g);
  g.strokeStyle = ink;
  g.lineWidth = 2.5;
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,.4)";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx - 14, top + 120);
  g.lineTo(cx, top + 132);
  g.lineTo(cx + 14, top + 120);
  g.stroke(); // stitched tip
  // collar over the blade's neck
  for (const p of [colL, colR]) {
    p(g);
    g.fillStyle = K.lin(cx - 30, top - 6, cx + 10, top + 30, [
      [0, "#ffffff"],
      [1, "#d6dbe4"],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2;
    g.stroke();
  }
  // the knot (a neat four-in-hand)
  const knot = (c) => {
    c.beginPath();
    c.moveTo(cx - 12, top + 4);
    c.lineTo(cx + 12, top + 4);
    c.lineTo(cx + 8, top + 24);
    c.quadraticCurveTo(cx, top + 28, cx - 8, top + 24);
    c.closePath();
  };
  K.shade(knot, 2, 3, 0.4, 2);
  knot(g);
  g.fillStyle = K.lin(cx - 12, top + 4, cx + 12, top + 26, [
    [0, hi],
    [0.55, mid],
    [1, lo],
  ]);
  g.fill();
  g.strokeStyle = ink;
  g.lineWidth = 2.5;
  g.stroke();
  g.strokeStyle = "rgba(0,0,0,.35)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(cx - 6, top + 8);
  g.quadraticCurveTo(cx + 2, top + 14, cx + 4, top + 24);
  g.stroke(); // fold
  K.gloss(knot, 0.35, 4, 5);
  g.restore();
}
for (const col of ["red", "black", "blue", "silver"]) {
  EXT_ITEM["ag-tie-" + col] = {
    draw(g, K) {
      AG_tie(g, K, col);
    },
  };
}

EXT_ITEM["ag-shades"] = {
  draw(g, K) {
    // sleek wraparound shades across the front of the dome
    const ink = K.ink;
    g.save();
    g.translate(302, 176);
    g.rotate(-0.13);
    g.scale(1.08, 1.08);
    const lens = (c, x) => {
      c.beginPath();
      c.moveTo(x - 30, -10);
      c.lineTo(x + 28, -12);
      c.quadraticCurveTo(x + 30, 6, x + 18, 13);
      c.quadraticCurveTo(x - 4, 18, x - 24, 11);
      c.quadraticCurveTo(x - 32, 4, x - 30, -10);
      c.closePath();
    };
    const frame = (c) => {
      lens(c, -32);
      lens(c, 34);
      c.rect(-6, -12, 14, 5);
    };
    K.shade(frame, 3, 6, 0.4, 3);
    g.strokeStyle = ink;
    g.lineWidth = 5;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(-62, -9);
    g.lineTo(-86, -4);
    g.stroke(); // arm back over the dome
    g.strokeStyle = "#2a2c33";
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(-62, -9);
    g.lineTo(-86, -4);
    g.stroke();
    for (const x of [-32, 34]) {
      lens(g, x);
      g.fillStyle = K.lin(x - 30, -12, x + 28, 16, [
        [0, "#3a4250"],
        [0.45, "#0d0f14"],
        [1, "#05060a"],
      ]);
      g.fill();
      g.strokeStyle = ink;
      g.lineWidth = 3.5;
      g.stroke();
      g.save();
      lens(g, x);
      g.clip();
      g.fillStyle = "rgba(160,190,255,.22)";
      g.beginPath();
      g.moveTo(x - 26, -10);
      g.lineTo(x - 8, -11);
      g.lineTo(x - 22, 12);
      g.lineTo(x - 30, 8);
      g.closePath();
      g.fill();
      g.fillStyle = "rgba(255,255,255,.55)";
      g.beginPath();
      g.moveTo(x + 2, -11);
      g.lineTo(x + 8, -11);
      g.lineTo(x - 4, 14);
      g.lineTo(x - 9, 13);
      g.closePath();
      g.fill();
      g.restore();
    }
    g.fillStyle = "#20232a";
    g.fillRect(-4, -13, 10, 6);
    g.strokeStyle = ink;
    g.lineWidth = 2;
    g.strokeRect(-4, -13, 10, 6); // bridge
    g.fillStyle = "#c9ced6";
    g.fillRect(-60, -11, 4, 3);
    g.restore();
  },
};

EXT_ITEM["ag-earpiece"] = {
  draw(g, K) {
    // an earbud on the dome's side with its clear coiled wire running down behind
    const ink = K.ink,
      bx = 238,
      by = 182;
    // the coil: a spring of clear tubing from the bud down the back of the dome
    const pts = [];
    for (let t = 0; t <= 1; t += 0.004) {
      const x = bx - 8 - t * 34,
        y = by + 6 + t * 70,
        a = t * Math.PI * 2 * 9;
      pts.push([x + Math.cos(a) * 6, y + Math.sin(a) * 2.6]);
    }
    const path = (c) => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    };
    g.save();
    g.filter = "blur(2px)";
    g.globalAlpha = 0.3;
    g.translate(3, 5);
    path(g);
    g.strokeStyle = "#000";
    g.lineWidth = 4;
    g.stroke();
    g.restore();
    path(g);
    g.strokeStyle = "rgba(40,50,60,.55)";
    g.lineWidth = 4;
    g.stroke();
    path(g);
    g.strokeStyle = "rgba(225,238,250,.75)";
    g.lineWidth = 2.2;
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,.9)";
    g.lineWidth = 1;
    for (let i = 0; i < pts.length; i += 28) {
      const [x, y] = pts[i];
      g.beginPath();
      g.moveTo(x - 2, y - 1);
      g.lineTo(x + 1, y - 2);
      g.stroke();
    }
    g.strokeStyle = "rgba(30,34,40,.85)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    g.quadraticCurveTo(200, by + 96, 186, by + 104);
    g.stroke(); // plain wire into the hull
    // the bud: clear acoustic plastic with a short stem down into the coil
    g.strokeStyle = "rgba(40,50,60,.6)";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(bx - 2, by + 8);
    g.quadraticCurveTo(bx - 6, by + 14, pts[0][0], pts[0][1]);
    g.stroke();
    g.strokeStyle = "rgba(225,238,250,.85)";
    g.lineWidth = 2.2;
    g.stroke();
    const bud = (c) => {
      c.beginPath();
      c.moveTo(bx - 9, by - 2);
      c.quadraticCurveTo(bx - 8, by - 13, bx + 1, by - 12);
      c.quadraticCurveTo(bx + 10, by - 10, bx + 9, by);
      c.quadraticCurveTo(bx + 7, by + 9, bx - 1, by + 9);
      c.quadraticCurveTo(bx - 9, by + 7, bx - 9, by - 2);
      c.closePath();
    };
    K.shade(bud, 2, 4, 0.4, 3);
    bud(g);
    g.fillStyle = K.lin(bx - 9, by - 12, bx + 9, by + 9, [
      [0, "rgba(250,252,255,.95)"],
      [0.5, "rgba(196,214,232,.9)"],
      [1, "rgba(120,140,165,.95)"],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.2;
    g.stroke();
    g.fillStyle = "rgba(255,255,255,.9)";
    g.beginPath();
    g.ellipse(bx - 3, by - 7, 3.5, 2, -0.5, 0, 7);
    g.fill();
    g.strokeStyle = "rgba(70,90,115,.55)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(bx + 1, by, 4, 0.5, 2.6);
    g.stroke();
  },
};

EXT_ITEM["ag-briefcase"] = {
  draw(g, K) {
    // a black leather briefcase standing behind the tank
    const ink = K.ink;
    g.save();
    g.translate(150, 200);
    g.rotate(-0.12);
    const body = (c) => {
      c.beginPath();
      c.roundRect(-62, -40, 124, 86, 9);
    };
    K.shade(body, 5, 8, 0.4, 5);
    // handle
    g.strokeStyle = ink;
    g.lineWidth = 11;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(-20, -40);
    g.lineTo(-18, -58);
    g.lineTo(18, -58);
    g.lineTo(20, -40);
    g.stroke();
    g.strokeStyle = "#2a2b31";
    g.lineWidth = 6;
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,.25)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-16, -60);
    g.lineTo(16, -60);
    g.stroke();
    body(g);
    g.fillStyle = ink;
    g.fill();
    g.beginPath();
    g.roundRect(-60, -38, 120, 82, 8);
    g.fillStyle = K.lin(-60, -38, 40, 50, [
      [0, "#3c3d44"],
      [0.5, "#1d1e23"],
      [1, "#0b0b0e"],
    ]);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,.08)";
    g.lineWidth = 1;
    g.setLineDash([3, 3]);
    g.beginPath();
    g.roundRect(-54, -32, 108, 70, 6);
    g.stroke();
    g.setLineDash([]); // stitching
    g.fillStyle = "#0a0a0c";
    g.fillRect(-60, -18, 120, 4);
    g.fillStyle = "rgba(255,255,255,.12)";
    g.fillRect(-60, -14, 120, 1.5); // lid seam
    for (const x of [-38, 38]) {
      // brushed metal clasps
      g.fillStyle = ink;
      g.beginPath();
      g.roundRect(x - 10, -24, 20, 18, 3);
      g.fill();
      g.fillStyle = K.lin(x - 9, -23, x + 9, -7, [
        [0, "#f4f5f8"],
        [0.5, "#a9aeb7"],
        [1, "#5d626b"],
      ]);
      g.beginPath();
      g.roundRect(x - 8.5, -22.5, 17, 15, 2.5);
      g.fill();
      g.fillStyle = "#3a3e46";
      g.fillRect(x - 4, -16, 8, 3);
    }
    g.fillStyle = K.lin(-8, 26, 8, 34, [
      [0, "#e8ebef"],
      [1, "#7a808a"],
    ]);
    g.fillRect(-10, 28, 20, 6); // name plate
    g.fillStyle = "rgba(255,255,255,.18)";
    g.beginPath();
    g.moveTo(-56, -34);
    g.lineTo(30, -34);
    g.lineTo(-40, -22);
    g.lineTo(-56, -22);
    g.closePath();
    g.fill(); // leather shine
    g.restore();
  },
};

EXT_ITEM["ag-aura"] = { aura: "lasergrid" };
EXT_AURA.lasergrid = ({ g, W, H, bloom, near, keepNear, cv, cx, cy, hash }) => {
  // red security lasers criss-crossing round the tank
  bloom("#ff1a2e", 16, 0.32, 2);
  const c = cv(),
    lg = c.getContext("2d");
  lg.lineCap = "round";
  for (let k = 0; k < 7; k++) {
    const dir = k % 2 ? 1 : -1,
      a = dir * (0.32 + hash(k, 1, 301) * 0.18),
      ox = cx - 170 + k * 56,
      oy = cy + (hash(k, 3, 301) - 0.5) * 40; // a criss-cross of long straight beams
    const dx = Math.cos(a) * 520,
      dy = Math.sin(a) * 520;
    for (const [w, col] of [
      [10, "rgba(255,30,50,.16)"],
      [4.5, "rgba(255,40,60,.5)"],
      [1.8, "rgba(255,225,230,.95)"],
    ]) {
      lg.strokeStyle = col;
      lg.lineWidth = w;
      lg.beginPath();
      lg.moveTo(ox - dx, oy - dy);
      lg.lineTo(ox + dx, oy + dy);
      lg.stroke();
    }
  }
  keepNear(c, near(70, 4));
  g.drawImage(c, 0, 0);
  g.globalAlpha = 0.6;
  g.drawImage(c, 0, 0);
  g.globalAlpha = 1;
  g.save();
  g.fillStyle = "rgba(255,60,70,.9)";
  g.shadowColor = "#ff2030";
  g.shadowBlur = 8; // emitter glints where beams leave
  for (let k = 0; k < 6; k++) {
    const x = cx - 150 + hash(k, 4, 302) * 300,
      y = cy - 40 + hash(k, 5, 302) * 110;
    g.beginPath();
    g.moveTo(x - 5, y);
    g.lineTo(x, y - 2);
    g.lineTo(x + 5, y);
    g.lineTo(x, y + 2);
    g.closePath();
    g.fill();
  }
  g.restore();
  return ["#ff5060", 0.45];
};

// ---- paints ----
const AG_wool =
  (PH, base, amp, seed, twill = 1) =>
  (x, y) => {
    const n = PH.fbm(x / 3, y / 3, seed) - 0.5,
      tw = Math.sin((x + y * twill) * 1.9) * 0.5,
      m = PH.fbm(x / 70, y / 70, seed + 9) - 0.5;
    const v = n * amp + tw * amp * 0.45 + m * amp * 0.9;
    return [base[0] + v, base[1] + v, base[2] + v * 1.05];
  };
EXT_PAINT_ART["pt-blacksuit"] = (g, PH) => {
  PH.field(g, AG_wool(PH, [24, 25, 30], 16, 1101));
  PH.shine(g, 0.12);
};
EXT_PAINT_ART["pt-navysuit"] = (g, PH) => {
  PH.field(g, AG_wool(PH, [28, 42, 76], 18, 1111));
  PH.shine(g, 0.12);
};
EXT_PAINT_ART["pt-whitetux"] = (g, PH) => {
  PH.field(g, AG_wool(PH, [236, 230, 216], 12, 1121));
  PH.shine(g, 0.1);
};
EXT_PAINT_ART["pt-pinstripe"] = (g, PH) => {
  PH.field(g, AG_wool(PH, [54, 56, 62], 14, 1131));
  for (let x = 10; x < PH.W; x += 22) {
    g.fillStyle = "rgba(225,228,236,.55)";
    for (let y = 0; y < PH.HH; y += 3) {
      const w = 1.2 + PH.H(x, y, 1132) * 0.8;
      g.fillRect(x + (PH.H(x, y, 1133) - 0.5) * 0.6, y, w, 2.2);
    }
  }
  PH.shine(g, 0.12);
};
EXT_PAINT_ART["pt-tuxedo"] = (g, PH) => {
  PH.field(g, AG_wool(PH, [18, 18, 22], 12, 1141));
  const W = PH.W,
    HH = PH.HH;
  // satin lapels: two broad glossy bands meeting in a V, with a soft sheen
  const lap = (s) => {
    g.beginPath();
    g.moveTo(W / 2 + s * 30, 0);
    g.lineTo(W / 2 + s * 120, 0);
    g.lineTo(W / 2 + s * 34, HH);
    g.lineTo(W / 2 + s * 4, HH);
    g.closePath();
  };
  for (const s of [-1, 1]) {
    lap(s);
    const gr = g.createLinearGradient(W / 2 + s * 120, 0, W / 2, HH);
    gr.addColorStop(0, "#0a0a0c");
    gr.addColorStop(0.42, "#3a3a44");
    gr.addColorStop(0.5, "#7a7a88");
    gr.addColorStop(0.58, "#2c2c34");
    gr.addColorStop(1, "#08080a");
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = "rgba(0,0,0,.6)";
    g.lineWidth = 2;
    g.stroke();
  }
  PH.shine(g, 0.14);
};

// ---- box picture: the Standard box in charcoal suiting, chalk pinstripes and a red tie down the front ----
EXT_BOXPIC.agent = {
  ramp: [
    [0, [8, 8, 11]],
    [0.35, [26, 28, 34]],
    [0.65, [58, 62, 72]],
    [0.88, [150, 156, 168]],
    [1, [255, 255, 255]],
  ],
  overlay(g, W, H, hh) {
    g.fillStyle = "rgba(230,232,240,.32)";
    for (let x = 0; x < W; x += Math.max(4, W / 24)) {
      g.fillRect(x, 0, Math.max(1, W / 220), H);
    }
    const u = W / 560; // the picture holds the closed box and the open one side by side: a necktie on each front face
    for (const [fx, ft, fl] of [
      [166, 160, 96],
      [446, 184, 78],
    ]) {
      const cx = fx * u,
        t = ft * u,
        s = u,
        L = fl;
      g.fillStyle = "#f2f2f4";
      g.beginPath();
      g.moveTo(cx - 20 * s, t - 2 * s);
      g.lineTo(cx, t + 12 * s);
      g.lineTo(cx + 20 * s, t - 2 * s);
      g.lineTo(cx + 12 * s, t + 14 * s);
      g.lineTo(cx - 12 * s, t + 14 * s);
      g.closePath();
      g.fill();
      const gr = g.createLinearGradient(cx - 13 * s, 0, cx + 13 * s, 0);
      gr.addColorStop(0, "#5e0610");
      gr.addColorStop(0.5, "#e8404a");
      gr.addColorStop(1, "#5e0610");
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(cx - 7 * s, t);
      g.lineTo(cx + 7 * s, t);
      g.lineTo(cx + 4 * s, t + 12 * s);
      g.lineTo(cx + 13 * s, t + (L - 14) * s);
      g.lineTo(cx, t + L * s);
      g.lineTo(cx - 13 * s, t + (L - 14) * s);
      g.lineTo(cx - 4 * s, t + 12 * s);
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(0,0,0,.6)";
      g.lineWidth = Math.max(1, 1.5 * s);
      g.stroke();
      g.fillStyle = "#e8404a";
      g.beginPath();
      g.moveTo(cx - 7 * s, t);
      g.lineTo(cx + 7 * s, t);
      g.lineTo(cx + 4 * s, t + 12 * s);
      g.lineTo(cx - 4 * s, t + 12 * s);
      g.closePath();
      g.fill();
      g.stroke();
    }
  },
};

// ---- map: a grand hotel — polished marble floors, walnut or brass walls; crates are briefcases ----
MOTIF.marble = (g, w, h, p, i) => {
  // soft marble veins, faded out before the tile edges (so tiles meet cleanly, and nothing reads as a wall)
  const o = document.createElement("canvas");
  o.width = w;
  o.height = h;
  const og = o.getContext("2d");
  og.lineCap = "round";
  for (let k = 0; k < 3; k++) {
    let x = 30 + mapNoise(k, i, 61) * (w - 60),
      y = 30 + mapNoise(i, k, 62) * (h - 60),
      a = mapNoise(k, i, 63) * 6.3;
    og.strokeStyle = p.spk[k % p.spk.length];
    og.lineWidth = 1 + mapNoise(k, i, 64) * 1.6;
    og.beginPath();
    og.moveTo(x, y);
    for (let s = 0; s < 22; s++) {
      a += (mapNoise(s, k + i, 65) - 0.5) * 0.9;
      x += Math.cos(a) * 7;
      y += Math.sin(a) * 7;
      og.lineTo(x, y);
    }
    og.stroke();
  }
  og.globalCompositeOperation = "destination-in";
  const gr = og.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.48);
  gr.addColorStop(0, "rgba(0,0,0,1)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  og.fillStyle = gr;
  og.fillRect(0, 0, w, h);
  g.save();
  g.globalAlpha = p.veinAlpha || 0.35;
  g.drawImage(o, 0, 0);
  g.restore();
};
WALL.panel = (g, w, h, p) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, p.hi);
  gr.addColorStop(0.45, p.base);
  gr.addColorStop(1, p.edge);
  g.fillStyle = gr;
  g.fillRect(1, 1, w - 2, h - 2);
  g.fillStyle = p.c2;
  g.fillRect(1, h / 2 - 0.75, w - 2, 1.5);
  g.fillStyle = "rgba(255,255,255,.18)";
  for (let x = 20; x < w; x += 44) {
    g.fillRect(x, 3, 14, 1);
  }
};
Object.assign(DEC, {
  agRose: (g, s) => {
    g.translate(s / 2, s / 2);
    g.rotate(-0.6);
    g.strokeStyle = "#2f6a2a";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 6);
    g.quadraticCurveTo(4, 20, 0, 34);
    g.stroke();
    g.fillStyle = "#3f8a34";
    g.beginPath();
    g.ellipse(5, 20, 7, 3.5, 0.6, 0, 7);
    g.fill();
    g.fillStyle = "#8a0a16";
    g.beginPath();
    g.ellipse(0, -2, 12, 10, 0, 0, 7);
    g.fill();
    g.strokeStyle = "#d02a3a";
    g.lineWidth = 2;
    for (const r of [8, 5]) {
      g.beginPath();
      g.arc(0, -2, r, 0.4, 5.2);
      g.stroke();
    }
  },
  agCase: (g, s) => {
    g.translate(s / 2, s / 2);
    g.rotate(0.35);
    g.fillStyle = "rgba(0,0,0,.3)";
    g.beginPath();
    g.roundRect(-20, -12, 44, 30, 4);
    g.fill();
    g.fillStyle = "#1c1d22";
    g.beginPath();
    g.roundRect(-22, -15, 44, 30, 4);
    g.fill();
    g.fillStyle = "#b8bdc6";
    g.fillRect(-14, -16, 6, 4);
    g.fillRect(8, -16, 6, 4);
    g.fillStyle = "rgba(255,255,255,.15)";
    g.fillRect(-20, -13, 40, 4);
  },
  agMartini: (g, s) => {
    g.translate(s / 2, s / 2);
    g.fillStyle = "rgba(210,235,255,.55)";
    g.strokeStyle = "rgba(80,100,120,.8)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-16, -14);
    g.lineTo(16, -14);
    g.lineTo(0, 4);
    g.closePath();
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(0, 4);
    g.lineTo(0, 20);
    g.moveTo(-9, 20);
    g.lineTo(9, 20);
    g.stroke();
  },
  agCard: (g, s) => {
    g.translate(s / 2, s / 2);
    g.rotate(-0.4);
    g.fillStyle = "#e8ebef";
    g.beginPath();
    g.roundRect(-16, -10, 32, 20, 3);
    g.fill();
    g.fillStyle = "#b3121e";
    g.fillRect(-16, -10, 32, 6);
    g.fillStyle = "#c9a24a";
    g.fillRect(-11, 0, 8, 6);
  },
});
{
  const ag = (floor, space, spk, veinAlpha, bullet, wall, crate) =>
    mapVariant({
      floor,
      space,
      motif: "marble",
      spk,
      veinAlpha,
      noise: 7,
      wave: 1.5,
      bullet,
      decorRate: 0.1,
      decorAlpha: 0.85,
      wall,
      crate,
      decor: [DEC.agRose, DEC.agCase, DEC.agMartini, DEC.agCard],
    });
  MAP_THEMES.agent = {
    name: "Agent",
    def: "dark",
    light: ag(
      "#e7e3db",
      "#d6d1c6",
      ["#9a958c", "#b8b2a8"],
      0.28,
      ["#14161c", "#ffffff"],
      { base: "#5a3a24", edge: "#2a180c", hi: "#8a5a38", pat: "panel", c2: "#c9a24a" },
      { edge: "#0b0b0e", body: "#2a2b31", body2: "#121317", band: "#c9a24a", plate: "#f2efe8", ink: "#14161c" },
    ),
    dark: ag(
      "#2b2c31",
      "#1f2024",
      ["#6a6c76", "#8a7a5a"],
      0.4,
      ["#f4f2ec", "#0c0c10"],
      { base: "#c9a24a", edge: "#4a3410", hi: "#f4dc94", pat: "panel", c2: "#8a6a24" },
      { edge: "#0b0b0e", body: "#2a2b31", body2: "#121317", band: "#b3121e", plate: "#f2efe8", ink: "#14161c" },
    ),
  };
  OBJ_CRATES.agent = (g, gl, k, d) => {
    // a black briefcase with brass clasps, the weapon on a badge in the middle
    g.strokeStyle = "#0b0b0e";
    g.lineWidth = 6;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(22, 14);
    g.lineTo(23, 6);
    g.lineTo(41, 6);
    g.lineTo(42, 14);
    g.stroke();
    g.strokeStyle = "#34353c";
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = "#0b0b0e";
    g.beginPath();
    g.roundRect(2, 13, 60, 48, 6);
    g.fill();
    const gr = g.createLinearGradient(0, 14, 0, 60);
    gr.addColorStop(0, d ? "#44464e" : "#3a3c44");
    gr.addColorStop(1, "#141519");
    g.fillStyle = gr;
    g.beginPath();
    g.roundRect(4, 15, 56, 44, 5);
    g.fill();
    g.fillStyle = "#050506";
    g.fillRect(4, 25, 56, 2.5);
    for (const x of [12, 52]) {
      g.fillStyle = "#5a4210";
      g.fillRect(x - 5, 18, 10, 9);
      g.fillStyle = "#e8c25a";
      g.fillRect(x - 4, 19, 8, 7);
    }
    g.fillStyle = shieldPlate(k, "#f2efe8");
    g.beginPath();
    g.arc(32, 42, 14.5, 0, 7);
    g.fill();
    g.strokeStyle = "#c9a24a";
    g.lineWidth = 2;
    g.stroke();
    drawSymbol(g, gl, k, 32, 42, 21, "#14161c");
  };
}
// ---- barcode decals and more suits ----
// Barcode stickers where the Beta box's crash-test markers sit (turret side, barrel, the front strip), black on white or on
// hazard yellow. Plain barcodes (no numbers that mean anything), drawn onto the tank's curve with its shading and a shadow.
Object.assign(GX_ACC, {
  "ag-bc-turret": { slot: "turret", name: "Barcode Decal (Turret)", box: "agent" },
  "ag-bc-turret-y": { slot: "turret", name: "Hazard Barcode (Turret)", box: "agent" },
  "ag-bc-barrel": { slot: "barrel", name: "Barcode Decal (Barrel)", box: "agent" },
  "ag-bc-barrel-y": { slot: "barrel", name: "Hazard Barcode (Barrel)", box: "agent" },
  "ag-bc-front": { slot: "front", name: "Barcode Decal (Front)", box: "agent" },
  "ag-bc-front-y": { slot: "front", name: "Hazard Barcode (Front)", box: "agent" },
});
// stick a label on a part: centred at (cx, cy), long side along angle ang, squashed by sq across it (the part's curve), kept on the part
function AG_stick(g, K, label, part, cx, cy, ang, len, sq, bend, printed) {
  const W = 640,
    H = 384,
    s = document.createElement("canvas");
  s.width = W;
  s.height = H;
  const sg = s.getContext("2d");
  const L = label.width,
    Hh = label.height,
    k = len / L;
  if (!bend) {
    sg.save();
    sg.translate(cx, cy);
    sg.rotate(ang);
    sg.scale(k, k * sq);
    sg.drawImage(label, -L / 2, -Hh / 2);
    sg.restore();
  } else {
    for (let x = 0; x < L; x += 2) {
      const t = x / L - 0.5,
        off = bend * (t * t * 4 - 1); // slices bend round the curve
      sg.save();
      sg.translate(cx, cy);
      sg.rotate(ang);
      sg.translate(t * len, off);
      sg.scale(k, k * sq);
      sg.drawImage(label, x, 0, 2.2, Hh, 0, -Hh / 2, 2.2, Hh);
      sg.restore();
    }
  }
  if (part) {
    sg.globalCompositeOperation = "destination-in";
    sg.drawImage(part, 0, 0, W, H);
  } // never past the part's edge
  // the part's own light: brighter towards the top-left, a soft shade at the far end
  sg.globalCompositeOperation = "source-atop";
  const gr = sg.createLinearGradient(cx - len * 0.6, cy - len * 0.5, cx + len * 0.6, cy + len * 0.5);
  gr.addColorStop(0, "rgba(255,255,255,.22)");
  gr.addColorStop(0.5, "rgba(255,255,255,0)");
  gr.addColorStop(1, "rgba(0,0,0,.28)");
  sg.fillStyle = gr;
  sg.fillRect(0, 0, W, H);
  if (!printed) {
    K.drop(s, 1.5, 2.5, 0.35, 1.5);
  }
  g.drawImage(s, 0, 0);
}
// the author's two barcode looks, the same bars, number and size wherever they go: printed straight on the paint, or on a hazard patch
const AG_BC_NUM = "47 235655 659263";
function AG_code(hazard) {
  // 320 x 168 label
  const W = 320,
    H = 168,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  let top = 10,
    bot = H - 10;
  if (hazard) {
    g.fillStyle = "#121214";
    g.beginPath();
    g.roundRect(0, 0, W, H, 10);
    g.fill();
    g.fillStyle = "#ffd21a";
    g.beginPath();
    g.roundRect(5, 5, W - 10, H - 10, 7);
    g.fill();
    g.save();
    g.beginPath();
    g.rect(5, 5, W - 10, 22);
    g.rect(5, H - 27, W - 10, 22);
    g.clip();
    g.fillStyle = "#121214";
    for (let x = -40; x < W + 40; x += 26) {
      g.beginPath();
      g.moveTo(x, 5);
      g.lineTo(x + 13, 5);
      g.lineTo(x - 9, 27);
      g.lineTo(x - 22, 27);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(x, H - 27);
      g.lineTo(x + 13, H - 27);
      g.lineTo(x - 9, H - 5);
      g.lineTo(x - 22, H - 5);
      g.closePath();
      g.fill();
    }
    g.restore();
    top = 34;
    bot = H - 34;
  }
  const px = 26,
    bw = W - 52,
    bh = (bot - top) * 0.74;
  g.fillStyle = "#121214";
  const BW = [1, 1, 2, 1, 3, 1, 2, 1, 1, 1, 2, 3, 1, 2, 1, 1, 1],
    GP = [1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 1]; // chunky enough to read when small
  const tot = BW.reduce((a, b) => a + b, 0) + GP.reduce((a, b) => a + b, 0),
    u = bw / tot;
  let xx = px;
  BW.forEach((w, k) => {
    const guard = k < 2 || k > BW.length - 3 || k === 8 || k === 9;
    g.fillRect(xx, top, w * u, guard ? bh + 8 : bh);
    xx += w * u + (GP[k] || 0) * u;
  });
  g.font = "bold " + Math.round((bot - top) * 0.2) + "px monospace";
  g.textAlign = "center";
  g.textBaseline = "bottom";
  g.fillText(AG_BC_NUM, W / 2, bot + 1);
  return c;
}
for (const y of [false, true]) {
  const sfx = y ? "-y" : "",
    stick = (g, K, part, cx, cy, ang, sq, bend) => {
      const lab = AG_code(y);
      AG_stick(g, K, lab, part, cx, cy, ang, 76, sq, bend, !y);
    };
  EXT_ITEM["ag-bc-turret" + sfx] = {
    draw(g, K, P) {
      stick(g, K, P.turret, 262, 189, -0.04, 0.95, 0);
    },
  }; // on the dome's front-left face
  EXT_ITEM["ag-bc-barrel" + sfx] = {
    draw(g, K, P) {
      stick(g, K, P.barrel, 404, 163, -0.3, 0.62, 0);
    },
  }; // round the barrel
  EXT_ITEM["ag-bc-front" + sfx] = {
    draw(g, K, P) {
      stick(g, K, P.base, 392, 262, -0.07, 0.95, 0);
    },
  }; // on the front of the body
}
// hand-made pictures for the Agent items (cut from the tank pictures, lined up on the game's tank, each with a soft shadow)
GX_ACC["ag-sniper"] = { slot: "back", name: "Sniper Rifle", box: "agent" };
const AG_PICS = {
  "ag-sniper": "ttcl-art:17bc70d44396.webp",
  "ag-tie-red": "ttcl-art:daa53382a766.webp",
  "ag-tie-black": "ttcl-art:8095b4dca5be.webp",
  "ag-tie-blue": "ttcl-art:f55ec31e253b.webp",
  "ag-tie-silver": "ttcl-art:69dca8c230fa.webp",
  "ag-shades": "ttcl-art:941235b199a1.webp",
  "ag-earpiece": "ttcl-art:8a45339cd4cc.webp",
  "ag-aura": "ttcl-art:4f9c20b9352e.avif",
  "ag-briefcase": "ttcl-art:b18608b8937e.webp",
};
for (const k in AG_PICS) {
  EXT_ITEM[k] = {
    uses: [AG_PICS[k]],
    aura: k === "ag-aura" ? "pic" : undefined,
    draw(g, K, P, A) {
      const im = A[AG_PICS[k]];
      if (!im) {
        return;
      }
      if (k === "ag-aura") {
        g.drawImage(im, 0, 0, 640, 384);
      } else {
        K.put(im, 3, 5, 0.35, 3);
      }
    },
  };
}
Object.assign(GX_PAINT, {
  "pt-linen": { name: "Linen Summer Suit", avg: "0xa3998a" },
  "pt-sharkskin": { name: "Grey Sharkskin", avg: "0x787a7d" },
  "pt-tactical": { name: "Tactical Black", avg: "0x26272b" },
  "pt-greatcoat": { name: "Winter Greatcoat", avg: "0x474e58" },
  "pt-tweed": { name: "Tweed Herringbone", avg: "0x745f4e" },
  "pt-smokingjacket": { name: "Velvet Smoking Jacket", avg: "0x9c4a5a" },
  "pt-resortshirt": { name: "Loud Resort Shirt", avg: "0x8b9372" },
  "pt-ghillie": { name: "Ghillie Camo", avg: "0x6f6943" },
  "pt-fieldsuit": { name: "Tan Field Suit", avg: "0xb8ab7d" },
}); // (more suits, from hand-made pictures)
EXT_UPRIGHT.push("pt-resortshirt");
