import { EXT_AURA, EXT_ITEM } from "./registries.js";

// ---- Achievement rewards, set B (crates .. disco ball). Every item: dark outline, soft shading, real drop shadow. ----
// small helpers (prefixed AWB_)
const AWB_cv = () => {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 384;
  return c;
};
const AWB_fillOut = (g, K, path, fill, lw = 3) => {
  path(g);
  g.fillStyle = fill;
  g.fill();
  path(g);
  g.strokeStyle = K.ink;
  g.lineWidth = lw;
  g.lineJoin = "round";
  g.stroke();
};
const AWB_star4 = (g, x, y, r, col = "#fffbe6", glow = "#ffd166") => {
  g.save();
  g.translate(x, y);
  g.fillStyle = col;
  g.shadowColor = glow;
  g.shadowBlur = r * 1.4;
  g.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 - Math.PI / 2,
      rr = k % 2 ? r * 0.24 : r;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  g.restore();
};
// a picture's own soft shadow, drawn under everything already on g (for items built on a scratch canvas)
const AWB_putLayer = (g, K, layer, dx = 4, dy = 7, a = 0.4, b = 4) => {
  K.drop(layer, dx, dy, a, b);
  g.drawImage(layer, 0, 0);
};
// the barrel's shape, a little fatter (bands drawn onto it are clipped to this)
const AWB_barrelMask = (P, grow = 3) => {
  const m = AWB_cv(),
    mg = m.getContext("2d");
  if (!P.barrel) {
    return null;
  }
  for (const [dx, dy] of [
    [0, 0],
    [grow, 0],
    [-grow, 0],
    [0, grow],
    [0, -grow],
    [grow, grow],
    [-grow, -grow],
    [grow, -grow],
    [-grow, grow],
  ]) {
    mg.drawImage(P.barrel, dx, dy, 640, 384);
  }
  return m;
};

// Crate Backpack (Crate Goblin): a canvas backpack piled high with little weapon crates
EXT_ITEM["aw-crates"] = {
  draw(g, K) {
    const L = AWB_cv(),
      c = L.getContext("2d");
    // backpack body
    c.save();
    c.translate(160, 182);
    c.rotate(-0.12);
    const bag = (x) => {
      x.beginPath();
      x.roundRect(-58, -48, 104, 92, 22);
    };
    AWB_fillOut(
      c,
      K,
      bag,
      K.lin(-58, -48, 46, 44, [
        [0, "#9a7a4a"],
        [0.5, "#7a5a30"],
        [1, "#4e3818"],
      ]),
      3.5,
    );
    const flap = (x) => {
      x.beginPath();
      x.moveTo(-56, -30);
      x.quadraticCurveTo(-6, -4, 44, -30);
      x.lineTo(44, -40);
      x.quadraticCurveTo(-6, -50, -56, -40);
      x.closePath();
    };
    AWB_fillOut(c, K, flap, "#6a4a22", 2.5);
    c.strokeStyle = "rgba(255,240,200,.35)";
    c.lineWidth = 1.5;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.roundRect(-52, -42, 92, 80, 18);
    c.stroke();
    c.setLineDash([]);
    for (const sx of [-30, 18]) {
      c.fillStyle = "#3a2a14";
      c.fillRect(sx - 6, -36, 12, 76);
      c.fillStyle = "#c9a24a";
      c.fillRect(sx - 7, -6, 14, 10);
      c.strokeStyle = K.ink;
      c.lineWidth = 2;
      c.strokeRect(sx - 7, -6, 14, 10);
    }
    c.fillStyle = "rgba(255,255,255,.18)";
    c.beginPath();
    c.ellipse(-30, -10, 14, 30, 0.2, 0, 7);
    c.fill();
    c.restore();
    // crates stacked on top (wooden, metal corners, a coloured weapon badge each)
    const crate = (x, y, s, rot, col, sym) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      const d = s * 0.28;
      c.fillStyle = K.ink;
      c.beginPath();
      c.moveTo(-s / 2 - 2, -s / 2 - 2);
      c.lineTo(-s / 2 + d, -s / 2 - d - 2);
      c.lineTo(s / 2 + d + 2, -s / 2 - d - 2);
      c.lineTo(s / 2 + d + 2, s / 2 - d);
      c.lineTo(s / 2 + 2, s / 2 + 2);
      c.lineTo(-s / 2 - 2, s / 2 + 2);
      c.closePath();
      c.fill();
      c.fillStyle = "#e2b56a";
      c.beginPath();
      c.moveTo(-s / 2, -s / 2);
      c.lineTo(-s / 2 + d, -s / 2 - d);
      c.lineTo(s / 2 + d, -s / 2 - d);
      c.lineTo(s / 2, -s / 2);
      c.closePath();
      c.fill(); // top
      c.fillStyle = "#8a5a26";
      c.beginPath();
      c.moveTo(s / 2, -s / 2);
      c.lineTo(s / 2 + d, -s / 2 - d);
      c.lineTo(s / 2 + d, s / 2 - d);
      c.lineTo(s / 2, s / 2);
      c.closePath();
      c.fill(); // side
      c.fillStyle = K.lin(-s / 2, -s / 2, s / 2, s / 2, [
        [0, "#d39a52"],
        [1, "#a8702e"],
      ]);
      c.fillRect(-s / 2, -s / 2, s, s); // front
      c.strokeStyle = "rgba(70,40,10,.55)";
      c.lineWidth = 1.5;
      for (let k = 1; k < 3; k++) {
        c.beginPath();
        c.moveTo(-s / 2, -s / 2 + (k * s) / 3);
        c.lineTo(s / 2, -s / 2 + (k * s) / 3);
        c.stroke();
      }
      c.fillStyle = "#5a6068";
      for (const [px, py] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        c.fillRect((px * s) / 2 - (px > 0 ? 7 : 0), (py * s) / 2 - (py > 0 ? 7 : 0), 7, 7);
      }
      c.fillStyle = col;
      c.beginPath();
      c.arc(0, 0, s * 0.24, 0, 7);
      c.fill();
      c.strokeStyle = K.ink;
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = "#fff";
      c.strokeStyle = "#fff";
      c.lineWidth = 2.2;
      c.lineCap = "round";
      const r = s * 0.13;
      if (sym === "bolt") {
        c.beginPath();
        c.moveTo(r * 0.3, -r * 1.1);
        c.lineTo(-r * 0.6, r * 0.1);
        c.lineTo(r * 0.1, r * 0.1);
        c.lineTo(-r * 0.3, r * 1.1);
        c.lineTo(r * 0.7, -r * 0.2);
        c.lineTo(0, -r * 0.2);
        c.closePath();
        c.fill();
      } else if (sym === "dots") {
        for (const [a, b] of [
          [-0.5, -0.5],
          [0.5, -0.5],
          [0, 0.5],
        ]) {
          c.beginPath();
          c.arc(a * r * 1.4, b * r * 1.4, r * 0.38, 0, 7);
          c.fill();
        }
      } else {
        c.beginPath();
        c.moveTo(-r, 0);
        c.lineTo(r, 0);
        c.moveTo(0, -r);
        c.lineTo(0, r);
        c.stroke();
      }
      c.restore();
    };
    crate(122, 118, 40, -0.18, "#e0242c", "bolt");
    crate(172, 112, 44, 0.1, "#1f7ad8", "dots");
    crate(146, 76, 38, -0.05, "#2fae4a", "plus");
    AWB_putLayer(g, K, L);
  },
};

// Last-Tank Crown (Last Tank Standing): a gold crown on the dome with jewels and sparkles
EXT_ITEM["aw-sparklecrown"] = {
  draw(g, K) {
    const cx = 280,
      by = 160;
    K.foot(cx, by, 54, 10);
    const crown = (x) => {
      x.beginPath();
      x.moveTo(cx - 50, by);
      x.lineTo(cx - 54, by - 50);
      x.lineTo(cx - 30, by - 26);
      x.lineTo(cx - 14, by - 62);
      x.lineTo(cx, by - 30);
      x.lineTo(cx + 14, by - 62);
      x.lineTo(cx + 30, by - 26);
      x.lineTo(cx + 54, by - 50);
      x.lineTo(cx + 50, by);
      x.quadraticCurveTo(cx, by + 10, cx - 50, by);
      x.closePath();
    };
    K.shade(crown, 4, 6, 0.35, 4);
    AWB_fillOut(
      g,
      K,
      crown,
      K.lin(cx - 50, by - 60, cx + 50, by, [
        [0, "#fff3b0"],
        [0.35, "#f2c84b"],
        [0.7, "#d39a1a"],
        [1, "#8a5a0a"],
      ]),
      3.5,
    );
    K.gloss(crown, 0.4);
    // band
    const band = (x) => {
      x.beginPath();
      x.moveTo(cx - 51, by - 16);
      x.quadraticCurveTo(cx, by - 6, cx + 51, by - 16);
      x.lineTo(cx + 50, by - 2);
      x.quadraticCurveTo(cx, by + 8, cx - 50, by - 2);
      x.closePath();
    };
    AWB_fillOut(
      g,
      K,
      band,
      K.lin(0, by - 16, 0, by + 6, [
        [0, "#ffe680"],
        [1, "#b07a12"],
      ]),
      2.5,
    );
    // jewels
    const gem = (x, y, r, col) => {
      g.fillStyle = K.ink;
      g.beginPath();
      g.arc(x, y, r + 2, 0, 7);
      g.fill();
      g.fillStyle = K.rad(x - r * 0.3, y - r * 0.3, 0, r * 1.2, [
        [0, "#ffffff"],
        [0.25, col],
        [1, "#1a0a20"],
      ]);
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    };
    gem(cx, by - 8, 6, "#e0242c");
    gem(cx - 30, by - 9, 4.5, "#1f9ad8");
    gem(cx + 30, by - 9, 4.5, "#2fbe5a");
    for (const [x, y] of [
      [cx - 54, by - 50],
      [cx - 14, by - 62],
      [cx + 14, by - 62],
      [cx + 54, by - 50],
    ]) {
      g.fillStyle = K.ink;
      g.beginPath();
      g.arc(x, y, 6, 0, 7);
      g.fill();
      g.fillStyle = K.rad(x - 2, y - 2, 0, 6, [
        [0, "#ffffff"],
        [0.5, "#fff0a0"],
        [1, "#c8961a"],
      ]);
      g.beginPath();
      g.arc(x, y, 4.3, 0, 7);
      g.fill();
    }
    AWB_star4(g, cx - 66, by - 64, 11);
    AWB_star4(g, cx + 70, by - 40, 9);
    AWB_star4(g, cx + 34, by - 82, 7);
    AWB_star4(g, cx - 34, by - 80, 6);
  },
};

// Stopwatch (Speed Run): a silver stopwatch hung on a strap across the front
EXT_ITEM["aw-stopwatch"] = {
  draw(g, K) {
    const L = AWB_cv(),
      c = L.getContext("2d"),
      x = 404,
      y = 290,
      r = 27;
    c.lineCap = "round";
    for (const [w, col] of [
      [7, K.ink],
      [4.5, "#2a62d8"],
    ]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(316, 214);
      c.quadraticCurveTo(370, 250, x - 4, y - r - 10);
      c.stroke();
      c.beginPath();
      c.moveTo(430, 232);
      c.quadraticCurveTo(422, 252, x + 4, y - r - 10);
      c.stroke();
    }
    // crown button + loop
    c.fillStyle = K.ink;
    c.fillRect(x - 7, y - r - 14, 14, 13);
    c.fillStyle = K.lin(x - 6, 0, x + 6, 0, [
      [0, "#8a939f"],
      [0.5, "#eef2f6"],
      [1, "#6a737f"],
    ]);
    c.fillRect(x - 5, y - r - 12, 10, 10);
    c.save();
    c.translate(x, y);
    c.rotate(0.7);
    c.fillStyle = K.ink;
    c.fillRect(-4, -r - 9, 8, 9);
    c.fillStyle = "#c8ced6";
    c.fillRect(-2.5, -r - 7.5, 5, 7);
    c.restore();
    // case
    c.fillStyle = K.ink;
    c.beginPath();
    c.arc(x, y, r + 3, 0, 7);
    c.fill();
    c.fillStyle = K.lin(x - r, y - r, x + r, y + r, [
      [0, "#ffffff"],
      [0.4, "#c3cad3"],
      [0.75, "#7d8793"],
      [1, "#4a525c"],
    ]);
    c.beginPath();
    c.arc(x, y, r, 0, 7);
    c.fill();
    // face
    c.fillStyle = K.rad(x - 6, y - 6, 2, r, [
      [0, "#ffffff"],
      [1, "#e2e6ea"],
    ]);
    c.beginPath();
    c.arc(x, y, r - 5, 0, 7);
    c.fill();
    c.strokeStyle = "rgba(20,22,28,.6)";
    c.lineWidth = 1.5;
    c.stroke();
    c.strokeStyle = K.ink;
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6;
      c.lineWidth = k % 3 ? 1.2 : 2.4;
      c.beginPath();
      c.moveTo(x + Math.cos(a) * (r - 7), y + Math.sin(a) * (r - 7));
      c.lineTo(x + Math.cos(a) * (r - (k % 3 ? 10 : 12)), y + Math.sin(a) * (r - (k % 3 ? 10 : 12)));
      c.stroke();
    }
    c.fillStyle = "rgba(224,36,44,.25)";
    c.beginPath();
    c.moveTo(x, y);
    c.arc(x, y, r - 8, -Math.PI / 2, -Math.PI / 2 + 0.9);
    c.closePath();
    c.fill(); // the "10 seconds" wedge
    c.strokeStyle = "#e0242c";
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(-Math.PI / 2 + 0.9) * (r - 9), y + Math.sin(-Math.PI / 2 + 0.9) * (r - 9));
    c.stroke();
    c.strokeStyle = K.ink;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y - r + 12);
    c.stroke();
    c.fillStyle = K.ink;
    c.beginPath();
    c.arc(x, y, 3, 0, 7);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.55)";
    c.beginPath();
    c.ellipse(x - 9, y - 11, 9, 5, -0.6, 0, 7);
    c.fill();
    AWB_putLayer(g, K, L, 3, 6, 0.4, 3);
  },
};

// Aura: Heartbeat (Clutch): a red glow, heartbeat lines running out of the tank and little hearts
EXT_ITEM["aw-aura-heartbeat"] = { aura: "heartbeat" };
EXT_AURA.heartbeat = ({ g, bloom, edge, cx, cy, hash, W, H }) => {
  bloom("#ff2d55", 20, 0.45, 2);
  let x0 = W,
    x1 = 0,
    y0 = H,
    y1 = 0;
  for (const [x, y] of edge) {
    if (x < x0) {
      x0 = x;
    }
    if (x > x1) {
      x1 = x;
    }
    if (y < y0) {
      y0 = y;
    }
    if (y > y1) {
      y1 = y;
    }
  }
  // ECG traces leaving each side
  const trace = (sx, ex, y, dir) => {
    g.save();
    g.lineJoin = "round";
    g.lineCap = "round";
    const pts = [];
    const len = Math.abs(ex - sx);
    for (let k = 0; k <= 40; k++) {
      const t = k / 40,
        x = sx + (ex - sx) * t;
      let dy = 0;
      const p = (t * 2) % 1;
      if (p > 0.3 && p < 0.36) {
        dy = -26;
      } else if (p >= 0.36 && p < 0.42) {
        dy = 18;
      } else if (p >= 0.42 && p < 0.47) {
        dy = -8;
      }
      pts.push([x, y + dy]);
    }
    for (const [w, col, a] of [
      [9, "#ff2d55", 0.35],
      [4, "#ff4d6d", 0.9],
      [1.8, "#ffe0e6", 1],
    ]) {
      g.globalAlpha = a;
      g.strokeStyle = col;
      g.lineWidth = w;
      g.shadowColor = "#ff2d55";
      g.shadowBlur = w === 9 ? 12 : 0;
      g.beginPath();
      pts.forEach(([pointX, pointY], i) => (i ? g.lineTo(pointX, pointY) : g.moveTo(pointX, pointY)));
      g.stroke();
    }
    g.restore();
    void len;
    void dir;
  };
  trace(x0 + 30, Math.max(4, x0 - 110), cy + 10, -1);
  trace(x1 - 30, Math.min(W - 4, x1 + 110), cy - 4, 1);
  // hearts drifting up from the edge
  const heart = (x, y, s, a) => {
    g.save();
    g.globalAlpha = a;
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = "#ff3a5c";
    g.shadowColor = "#ff2d55";
    g.shadowBlur = 8;
    g.beginPath();
    g.moveTo(0, 4);
    g.bezierCurveTo(-10, -4, -6, -12, 0, -6);
    g.bezierCurveTo(6, -12, 10, -4, 0, 4);
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = "rgba(255,255,255,.6)";
    g.beginPath();
    g.arc(-3.5, -6, 1.6, 0, 7);
    g.fill();
    g.restore();
  };
  for (let k = 0; k < 14 && edge.length; k++) {
    const [x, y] = edge[Math.floor(hash(k, 1, 331) * edge.length)];
    if (y > cy + 20) {
      continue;
    }
    const d = 0.25 + hash(k, 2, 331) * 0.4;
    heart(x + (x - cx) * d, y + (y - cy) * d - 10, 0.9 + hash(k, 3, 331) * 0.9, 0.9);
  }
  return ["#ff6b81", 0.5];
};

// "It Counts" Trophy (Kamikaze): the game's achievement trophy, patched up with a plaster and an IT COUNTS ribbon
EXT_ITEM["aw-itcounts"] = {
  uses: ["trophy"],
  draw(g, K, P, A) {
    const L = AWB_cv(),
      c = L.getContext("2d"),
      w = 124,
      x = 280 - w / 2,
      y = 150 - w * 0.985 + 4;
    if (A.trophy) {
      c.drawImage(A.trophy, x, y, w, w);
    } else {
      c.fillStyle = "#e8b923";
      c.beginPath();
      c.roundRect(x + 30, y + 10, 64, 100, 10);
      c.fill();
    }
    // a sticking plaster across the cup
    c.save();
    c.translate(x + w * 0.5, y + w * 0.3);
    c.rotate(-0.55);
    const pl = (q) => {
      q.beginPath();
      q.roundRect(-30, -9, 60, 18, 8);
    };
    c.save();
    c.filter = "blur(2px)";
    c.globalAlpha = 0.35;
    c.translate(1.5, 2.5);
    pl(c);
    c.fillStyle = "#000";
    c.fill();
    c.restore();
    pl(c);
    c.fillStyle = K.lin(0, -9, 0, 9, [
      [0, "#f6d6b0"],
      [1, "#d9a878"],
    ]);
    c.fill();
    c.strokeStyle = "rgba(90,50,20,.8)";
    c.lineWidth = 1.6;
    c.stroke();
    c.fillStyle = "#f2e2cc";
    c.fillRect(-9, -8, 18, 16);
    c.fillStyle = "rgba(120,70,30,.45)";
    for (let i = -2; i <= 2; i++) {
      for (let j = -1; j <= 1; j++) {
        c.beginPath();
        c.arc(i * 10 + (Math.abs(i) > 1 ? 0 : 0), j * 5, 0.9, 0, 7);
        if (Math.abs(i) === 2) {
          c.fill();
        }
      }
    }
    c.restore();
    // ribbon banner on the plinth
    const by = y + w * 0.86,
      bx = 280;
    const rib = (q) => {
      q.beginPath();
      q.moveTo(bx - 58, by - 12);
      q.lineTo(bx + 58, by - 12);
      q.lineTo(bx + 50, by);
      q.lineTo(bx + 58, by + 12);
      q.lineTo(bx - 58, by + 12);
      q.lineTo(bx - 50, by);
      q.closePath();
    };
    c.save();
    c.filter = "blur(2px)";
    c.globalAlpha = 0.4;
    c.translate(2, 3);
    rib(c);
    c.fillStyle = "#000";
    c.fill();
    c.restore();
    rib(c);
    c.fillStyle = K.lin(0, by - 12, 0, by + 12, [
      [0, "#ff4a5a"],
      [1, "#a50f1f"],
    ]);
    c.fill();
    c.strokeStyle = K.ink;
    c.lineWidth = 2.5;
    c.stroke();
    c.font = "bold 15px Arial Black, Arial, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.lineWidth = 3;
    c.strokeStyle = "#5a0610";
    c.strokeText("IT COUNTS", bx, by + 1);
    c.fillStyle = "#ffffff";
    c.fillText("IT COUNTS", bx, by + 1);
    K.foot(280, 150, 40, 9);
    AWB_putLayer(g, K, L, 4, 7, 0.4, 4);
  },
};

// Boomerang (Boomerang): a painted wooden boomerang leaning behind the tank
EXT_ITEM["aw-boomerang"] = {
  draw(g, K) {
    g.save();
    g.translate(160, 182);
    g.rotate(-0.42);
    g.scale(1.12, 1.25);
    const b = (q) => {
      q.beginPath();
      q.moveTo(-86, 10);
      q.quadraticCurveTo(-60, -14, 0, -40);
      q.quadraticCurveTo(60, -14, 86, 10);
      q.quadraticCurveTo(90, 26, 76, 24);
      q.quadraticCurveTo(40, 4, 0, -14);
      q.quadraticCurveTo(-40, 4, -76, 24);
      q.quadraticCurveTo(-90, 26, -86, 10);
      q.closePath();
    };
    g.save();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.35;
    g.translate(6, 8);
    b(g);
    g.fillStyle = "#000";
    g.fill();
    g.restore();
    AWB_fillOut(
      g,
      K,
      b,
      K.lin(0, -40, 0, 26, [
        [0, "#e0a868"],
        [0.5, "#b8783a"],
        [1, "#7a4a1e"],
      ]),
      3.5,
    );
    g.save();
    b(g);
    g.clip();
    g.strokeStyle = "rgba(90,50,20,.35)";
    g.lineWidth = 1.4;
    for (let k = -3; k <= 3; k++) {
      g.beginPath();
      g.moveTo(-90, 6 + k * 5);
      g.quadraticCurveTo(0, -44 + k * 5, 90, 6 + k * 5);
      g.stroke();
    }
    // painted bands and dots
    g.fillStyle = "#f4ead8";
    for (const sx of [-1, 1]) {
      for (const t of [0.35, 0.75]) {
        const x = sx * 86 * t,
          y = -40 + 86 * t * 0.55;
        g.save();
        g.translate(x, y + (t > 0.5 ? 6 : -2));
        g.rotate(sx * 0.5);
        g.fillRect(-3, -14, 6, 28);
        g.restore();
      }
    }
    g.fillStyle = "#e0242c";
    for (const [x, y] of [
      [-46, -12],
      [46, -12],
      [-64, 2],
      [64, 2],
      [0, -28],
    ]) {
      g.beginPath();
      g.arc(x, y, 3.2, 0, 7);
      g.fill();
    }
    g.fillStyle = "rgba(255,255,255,.3)";
    g.beginPath();
    g.moveTo(-80, 8);
    g.quadraticCurveTo(0, -50, 80, 8);
    g.quadraticCurveTo(0, -38, -80, 8);
    g.fill();
    g.restore();
    g.restore();
  },
};

// Cosy Blanket (Wall Hugger): a knitted tartan blanket draped over the dome, with tassels
EXT_ITEM["aw-blanket"] = {
  draw(g, K, P) {
    if (!P.turret) {
      return;
    }
    const hem = (x) => 196 + Math.sin(x / 11) * 4 + (x - 280) * 0.06;
    // the dome, fattened a little, kept above a wavy hem
    const m = AWB_cv(),
      mg = m.getContext("2d");
    for (let a = 0; a < 16; a++) {
      mg.drawImage(P.turret, Math.cos((a / 16) * 6.283) * 5, Math.sin((a / 16) * 6.283) * 5 - 2, 640, 384);
    }
    mg.globalCompositeOperation = "destination-in";
    mg.beginPath();
    mg.moveTo(0, 0);
    mg.lineTo(640, 0);
    for (let x = 640; x >= 0; x -= 4) {
      mg.lineTo(x, hem(x));
    }
    mg.closePath();
    mg.fill();
    // tartan knit
    const t = AWB_cv(),
      tg = t.getContext("2d");
    tg.fillStyle = "#b8212c";
    tg.fillRect(0, 0, 640, 384);
    tg.globalAlpha = 0.55;
    tg.fillStyle = "#1e3a6e";
    for (let x = 150; x < 420; x += 34) {
      tg.fillRect(x, 0, 12, 384);
    }
    for (let y = 100; y < 230; y += 34) {
      tg.fillRect(0, y, 640, 12);
    }
    tg.globalAlpha = 0.8;
    tg.fillStyle = "#f2d36b";
    for (let x = 160; x < 420; x += 34) {
      tg.fillRect(x + 14, 0, 3, 384);
    }
    for (let y = 110; y < 230; y += 34) {
      tg.fillRect(0, y + 14, 640, 3);
    }
    tg.globalAlpha = 0.22;
    tg.strokeStyle = "#000";
    tg.lineWidth = 1;
    for (let y = 96; y < 230; y += 5) {
      for (let x = 150; x < 420; x += 6) {
        tg.beginPath();
        tg.moveTo(x, y);
        tg.lineTo(x + 3, y + 4);
        tg.lineTo(x + 6, y);
        tg.stroke();
      }
    } // knit stitches
    tg.globalAlpha = 1;
    tg.globalCompositeOperation = "source-over";
    const sh = tg.createLinearGradient(200, 120, 360, 210);
    sh.addColorStop(0, "rgba(255,255,255,.28)");
    sh.addColorStop(0.45, "rgba(255,255,255,0)");
    sh.addColorStop(1, "rgba(0,0,0,.35)");
    tg.fillStyle = sh;
    tg.fillRect(0, 0, 640, 384);
    tg.globalCompositeOperation = "destination-in";
    tg.drawImage(m, 0, 0);
    // outline: the same shape a bit bigger in ink, under it
    const o = AWB_cv(),
      og = o.getContext("2d");
    for (let a = 0; a < 12; a++) {
      og.drawImage(m, Math.cos((a / 12) * 6.283) * 2.5, Math.sin((a / 12) * 6.283) * 2.5);
    }
    og.globalCompositeOperation = "source-in";
    og.fillStyle = K.ink;
    og.fillRect(0, 0, 640, 384);
    og.globalCompositeOperation = "source-over";
    og.drawImage(t, 0, 0);
    // fold shadows
    og.globalCompositeOperation = "source-atop";
    og.strokeStyle = "rgba(0,0,0,.25)";
    og.lineWidth = 5;
    og.lineCap = "round";
    for (const x of [238, 300, 336]) {
      og.beginPath();
      og.moveTo(x, hem(x) - 2);
      og.quadraticCurveTo(x - 4, hem(x) - 22, x + 4, hem(x) - 40);
      og.stroke();
    }
    og.globalCompositeOperation = "source-over";
    // tassels along the hem
    let x0 = 640,
      x1 = 0;
    {
      const d = mg.getImageData(0, 0, 640, 384).data;
      for (let x = 0; x < 640; x += 2) {
        for (let y = 150; y < 230; y += 2) {
          if (d[(y * 640 + x) * 4 + 3] > 100) {
            if (x < x0) {
              x0 = x;
            }
            if (x > x1) {
              x1 = x;
            }
          }
        }
      }
    }
    for (let x = x0 + 8; x < x1 - 4; x += 11) {
      const y = hem(x) - 1;
      og.strokeStyle = K.ink;
      og.lineWidth = 4.5;
      og.lineCap = "round";
      og.beginPath();
      og.moveTo(x, y);
      og.lineTo(x + 1, y + 11);
      og.stroke();
      og.strokeStyle = x % 22 < 11 ? "#f2d36b" : "#e8e0d0";
      og.lineWidth = 2.6;
      og.beginPath();
      og.moveTo(x, y);
      og.lineTo(x + 1, y + 11);
      og.stroke();
    }
    AWB_putLayer(g, K, o, 3, 5, 0.4, 4);
  },
};

// Phoenix Feather (Comeback Kid): flame-coloured plumes rising from a gold clasp on the dome
EXT_ITEM["aw-phoenix"] = {
  draw(g, K) {
    const L = AWB_cv(),
      c = L.getContext("2d");
    const feather = (bx, by, tx, ty, w, bend, cols) => {
      const dx = tx - bx,
        dy = ty - by,
        l = Math.hypot(dx, dy),
        nx = -dy / l,
        ny = dx / l;
      const mx = bx + dx * 0.5 + nx * bend,
        my = by + dy * 0.5 + ny * bend;
      const path = (q) => {
        q.beginPath();
        q.moveTo(bx, by);
        q.quadraticCurveTo(mx + nx * w, my + ny * w, tx, ty);
        q.quadraticCurveTo(mx - nx * w * 0.8, my - ny * w * 0.8, bx, by);
        q.closePath();
      };
      path(c);
      c.fillStyle = K.lin(bx, by, tx, ty, cols);
      c.fill();
      c.strokeStyle = K.ink;
      c.lineWidth = 3;
      c.stroke();
      c.save();
      path(c);
      c.clip();
      c.strokeStyle = "rgba(120,20,0,.45)";
      c.lineWidth = 1.3;
      for (let k = 1; k < 9; k++) {
        const t = k / 9,
          px = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * mx + t * t * tx,
          py = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * my + t * t * ty;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + nx * w * 1.2 - (dx / l) * 10, py + ny * w * 1.2 - (dy / l) * 10);
        c.moveTo(px, py);
        c.lineTo(px - nx * w * 1.2 - (dx / l) * 10, py - ny * w * 1.2 - (dy / l) * 10);
        c.stroke();
      }
      c.strokeStyle = "rgba(255,250,220,.9)";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(mx, my, tx, ty);
      c.stroke();
      c.restore();
    };
    const F = [
      [0, "#ffe066"],
      [0.45, "#ff8a1e"],
      [0.8, "#e0241c"],
      [1, "#7a0a1a"],
    ];
    feather(268, 146, 196, 40, 22, -18, F);
    feather(274, 146, 238, 30, 24, -10, [
      [0, "#fff3b0"],
      [0.4, "#ffb21e"],
      [0.8, "#ff4a1e"],
      [1, "#a00a2a"],
    ]);
    feather(280, 146, 296, 52, 20, 14, F);
    // embers
    for (const [x, y, r] of [
      [186, 30, 3.5],
      [226, 18, 3],
      [300, 36, 2.5],
      [208, 58, 2],
    ]) {
      c.fillStyle = "#ffd166";
      c.shadowColor = "#ff6a00";
      c.shadowBlur = 8;
      c.beginPath();
      c.arc(x, y, r, 0, 7);
      c.fill();
    }
    c.shadowBlur = 0;
    // gold clasp
    c.fillStyle = K.ink;
    c.beginPath();
    c.ellipse(274, 146, 17, 10, 0, 0, 7);
    c.fill();
    c.fillStyle = K.lin(258, 138, 290, 154, [
      [0, "#fff3b0"],
      [0.5, "#e8b923"],
      [1, "#8a5a0a"],
    ]);
    c.beginPath();
    c.ellipse(274, 145, 14.5, 7.5, 0, 0, 7);
    c.fill();
    c.fillStyle = "#e0242c";
    c.beginPath();
    c.arc(274, 145, 3.5, 0, 7);
    c.fill();
    K.foot(275, 150, 26, 7);
    AWB_putLayer(g, K, L, 4, 7, 0.35, 4);
  },
};

// Aura: Bubble Shield (Untouchable): a see-through soap bubble round the tank with a rainbow rim
EXT_ITEM["aw-aura-bubble"] = { aura: "bubble" };
EXT_AURA.bubble = ({ g, edge, cx, cy, hash, W, H }) => {
  let x0 = W,
    x1 = 0,
    y0 = H,
    y1 = 0;
  for (const [x, y] of edge) {
    if (x < x0) {
      x0 = x;
    }
    if (x > x1) {
      x1 = x;
    }
    if (y < y0) {
      y0 = y;
    }
    if (y > y1) {
      y1 = y;
    }
  }
  const bx = (x0 + x1) / 2,
    by = (y0 + y1) / 2,
    rx = Math.min(W / 2 - 4, (x1 - x0) / 2 + 26),
    ry = Math.min(H / 2 - 4, (y1 - y0) / 2 + 26);
  g.save();
  g.fillStyle = (() => {
    const gr = g.createRadialGradient(bx, by, Math.min(rx, ry) * 0.5, bx, by, Math.max(rx, ry));
    gr.addColorStop(0, "rgba(180,230,255,0)");
    gr.addColorStop(0.8, "rgba(160,220,255,.12)");
    gr.addColorStop(1, "rgba(200,170,255,.35)");
    return gr;
  })();
  g.beginPath();
  g.ellipse(bx, by, rx, ry, 0, 0, 7);
  g.fill();
  // iridescent rim: arcs of different colours
  const cols = ["#ff7ad9", "#ffd36b", "#7affc0", "#6bd6ff", "#b07aff"];
  for (let k = 0; k < 20; k++) {
    const a0 = (k / 20) * 6.283,
      col = cols[k % cols.length];
    g.strokeStyle = col;
    g.globalAlpha = 0.75;
    g.lineWidth = 5;
    g.beginPath();
    g.ellipse(bx, by, rx - 2, ry - 2, 0, a0, a0 + 6.283 / 20 + 0.03);
    g.stroke();
  }
  g.globalAlpha = 0.9;
  g.strokeStyle = "rgba(255,255,255,.85)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(bx, by, rx, ry, 0, 0, 7);
  g.stroke();
  // shine
  g.globalAlpha = 0.85;
  g.strokeStyle = "#ffffff";
  g.lineCap = "round";
  g.lineWidth = 7;
  g.beginPath();
  g.ellipse(bx, by, rx - 16, ry - 16, 0, 3.55, 4.35);
  g.stroke();
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(bx, by, rx - 16, ry - 16, 0, 4.5, 4.62);
  g.stroke();
  g.fillStyle = "#fff";
  g.beginPath();
  g.ellipse(bx + rx * 0.62, by + ry * 0.55, 6, 4, -0.6, 0, 7);
  g.fill();
  g.restore();
  for (let k = 0; k < 8; k++) {
    const a = hash(k, 1, 341) * 6.283;
    AWB_star4(
      g,
      bx + Math.cos(a) * rx * 1.0,
      by + Math.sin(a) * ry * 1.0,
      3 + hash(k, 2, 341) * 4,
      "#ffffff",
      "#9fe8ff",
    );
  }
  void cx;
  void cy;
  return ["#d6f5ff", 0.45];
};

// Bank-Shot Medal (Ricochet Royalty): the game's Gold Medal turned platinum, a ricochet zig-zag on its face
EXT_ITEM["aw-bankmedal"] = {
  uses: ["front50"],
  draw(g, K, P, A) {
    if (!A.front50) {
      return;
    }
    const plat = K.reskin(A.front50, (d, i, h, s, l) => {
      if (h > 25 && h < 70 && s > 0.25) {
        K.setRGB(d, i, [Math.min(255, 70 + l * 200), Math.min(255, 76 + l * 200), Math.min(255, 90 + l * 196)]);
      } // gold -> platinum
      else if (s > 0.15) {
        K.setRGB(d, i, K.hsl2rgb(212, Math.min(1, s * 1.1), l));
      }
    }); // ribbon -> steel blue
    // find the medal disc (the round part at the bottom of the picture)
    const d = plat.getContext("2d").getImageData(0, 0, 640, 384).data;
    let mx = 0,
      my = 0,
      n = 0;
    for (let y = 270; y < 320; y++) {
      for (let x = 380; x < 440; x++) {
        if (d[(y * 640 + x) * 4 + 3] > 200) {
          mx += x;
          my += y;
          n++;
        }
      }
    }
    if (n) {
      mx /= n;
      my /= n;
    } else {
      mx = 405;
      my = 293;
    }
    const pg = plat.getContext("2d");
    pg.fillStyle = K.rad(mx - 4, my - 4, 1, 14, [
      [0, "#ffffff"],
      [1, "#aeb6c2"],
    ]);
    pg.beginPath();
    pg.arc(mx, my, 11.5, 0, 7);
    pg.fill();
    pg.strokeStyle = "rgba(40,50,70,.6)";
    pg.lineWidth = 1.2;
    pg.stroke();
    pg.strokeStyle = "#1e3a8a";
    pg.lineWidth = 2.6;
    pg.lineJoin = "round";
    pg.lineCap = "round";
    pg.beginPath();
    pg.moveTo(mx - 9, my - 5);
    pg.lineTo(mx - 3, my + 6);
    pg.lineTo(mx + 2, my - 6);
    pg.lineTo(mx + 8, my + 4);
    pg.stroke();
    pg.fillStyle = "#1e3a8a";
    pg.beginPath();
    pg.moveTo(mx + 11, my + 8);
    pg.lineTo(mx + 4, my + 6);
    pg.lineTo(mx + 10, my + 1);
    pg.closePath();
    pg.fill();
    K.put(plat, 3, 6, 0.4, 3);
  },
};

// Hand Mirror (Fashion Victim): an ornate gold hand mirror leaning behind the tank
EXT_ITEM["aw-mirror"] = {
  draw(g, K) {
    const L = AWB_cv(),
      c = L.getContext("2d");
    c.save();
    c.translate(150, 122);
    c.rotate(-0.42);
    // handle
    const hd = (q) => {
      q.beginPath();
      q.moveTo(-9, 50);
      q.lineTo(9, 50);
      q.lineTo(7, 128);
      q.quadraticCurveTo(0, 138, -7, 128);
      q.closePath();
    };
    AWB_fillOut(
      c,
      K,
      hd,
      K.lin(-9, 0, 9, 0, [
        [0, "#8a5a0a"],
        [0.45, "#ffe680"],
        [1, "#a06a10"],
      ]),
      3,
    );
    for (const y of [72, 96, 118]) {
      c.fillStyle = K.ink;
      c.beginPath();
      c.ellipse(0, y, 11, 4.5, 0, 0, 7);
      c.fill();
      c.fillStyle = "#e8b923";
      c.beginPath();
      c.ellipse(0, y - 0.5, 9.5, 3, 0, 0, 7);
      c.fill();
    }
    // scalloped frame
    const fr = (q) => {
      q.beginPath();
      const n = 22;
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * 6.283,
          r = k % 2 ? 1 : 1.07;
        q.lineTo(Math.cos(a) * 44 * r, Math.sin(a) * 56 * r);
      }
      q.closePath();
    };
    AWB_fillOut(
      c,
      K,
      fr,
      K.lin(-44, -56, 44, 56, [
        [0, "#fff3b0"],
        [0.4, "#e8b923"],
        [0.8, "#a06a10"],
        [1, "#6a4006"],
      ]),
      3.5,
    );
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * 6.283;
      c.fillStyle = "#fff6c8";
      c.beginPath();
      c.arc(Math.cos(a) * 41, Math.sin(a) * 52, 2.2, 0, 7);
      c.fill();
    }
    c.fillStyle = "#e0244c";
    c.beginPath();
    c.arc(0, -56, 5, 0, 7);
    c.fill();
    c.strokeStyle = K.ink;
    c.lineWidth = 2;
    c.stroke();
    // glass
    const gl = (q) => {
      q.beginPath();
      q.ellipse(0, 0, 33, 44, 0, 0, 7);
    };
    AWB_fillOut(
      c,
      K,
      gl,
      K.lin(-33, -44, 33, 44, [
        [0, "#e8fbff"],
        [0.5, "#9fd4ec"],
        [1, "#4a8ab0"],
      ]),
      2.5,
    );
    c.save();
    gl(c);
    c.clip();
    c.fillStyle = "rgba(255,255,255,.75)";
    c.beginPath();
    c.moveTo(-30, -6);
    c.lineTo(-6, -44);
    c.lineTo(6, -44);
    c.lineTo(-24, 8);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(-14, 20);
    c.lineTo(16, -30);
    c.lineTo(20, -24);
    c.lineTo(-8, 26);
    c.closePath();
    c.globalAlpha = 0.5;
    c.fill();
    c.restore();
    c.restore();
    AWB_star4(c, 112, 66, 7, "#ffffff", "#9fe8ff");
    AWB_putLayer(g, K, L, 5, 7, 0.38, 4);
  },
};

// Friendship Bracelets (Twinsies): woven bands looped round the barrel, one with a dangling bead
EXT_ITEM["aw-bracelets"] = {
  draw(g, K, P) {
    const bm = AWB_barrelMask(P, 3);
    if (!bm) {
      return;
    }
    const ang = -0.255; // the barrel's angle (it points up and to the right)
    const L = AWB_cv(),
      c = L.getContext("2d");
    const band = (x, y, cols, w = 13) => {
      c.save();
      c.translate(x, y);
      c.rotate(ang);
      c.fillStyle = K.ink;
      c.fillRect(-w / 2 - 2, -60, w + 4, 120);
      for (let k = -60, i = 0; k < 60; k += 6, i++) {
        c.fillStyle = cols[i % cols.length];
        c.beginPath();
        c.moveTo(-w / 2, k);
        c.lineTo(w / 2, k + 4);
        c.lineTo(w / 2, k + 9);
        c.lineTo(-w / 2, k + 5);
        c.closePath();
        c.fill();
      }
      const sh = c.createLinearGradient(0, -34, 0, 34);
      sh.addColorStop(0, "rgba(255,255,255,.35)");
      sh.addColorStop(0.35, "rgba(255,255,255,0)");
      sh.addColorStop(0.7, "rgba(0,0,0,0)");
      sh.addColorStop(1, "rgba(0,0,0,.45)");
      c.fillStyle = sh;
      c.fillRect(-w / 2, -60, w, 120);
      c.restore();
    };
    band(372, 176, ["#ff4f8b", "#ffd23f", "#37c6ff"]);
    band(404, 167, ["#7c3cff", "#ffffff", "#2fbe5a"]);
    band(436, 158, ["#ff7a00", "#e0242c", "#ffe066"]);
    c.globalCompositeOperation = "destination-in";
    c.drawImage(bm, 0, 0);
    c.globalCompositeOperation = "source-over";
    // a knotted tie with a bead hanging from the middle band
    const kx = 404 + Math.sin(-ang) * 33 + 0,
      ky = 167 + Math.cos(ang) * 30;
    c.strokeStyle = K.ink;
    c.lineWidth = 4;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(kx - 2, ky - 4);
    c.quadraticCurveTo(kx - 6, ky + 10, kx - 2, ky + 20);
    c.moveTo(kx + 2, ky - 4);
    c.quadraticCurveTo(kx + 8, ky + 8, kx + 6, ky + 16);
    c.stroke();
    c.strokeStyle = "#7c3cff";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(kx - 2, ky - 4);
    c.quadraticCurveTo(kx - 6, ky + 10, kx - 2, ky + 20);
    c.moveTo(kx + 2, ky - 4);
    c.quadraticCurveTo(kx + 8, ky + 8, kx + 6, ky + 16);
    c.stroke();
    c.fillStyle = K.ink;
    c.beginPath();
    c.arc(kx - 2, ky + 23, 6, 0, 7);
    c.fill();
    c.fillStyle = K.rad(kx - 4, ky + 21, 0, 6, [
      [0, "#ffffff"],
      [0.3, "#ffd23f"],
      [1, "#c8761a"],
    ]);
    c.beginPath();
    c.arc(kx - 2, ky + 23, 4.5, 0, 7);
    c.fill();
    AWB_putLayer(g, K, L, 2, 4, 0.4, 2.5);
  },
};

// Nightcap (Night Owl): a long striped nightcap flopping over the back, with a fluffy pompom and stars
EXT_ITEM["aw-nightcap"] = {
  draw(g, K) {
    const L = AWB_cv(),
      c = L.getContext("2d");
    c.translate(0, 9);
    K.foot(278, 160, 56, 10);
    const cap = (q) => {
      q.beginPath();
      q.moveTo(226, 152);
      q.bezierCurveTo(226, 90, 270, 70, 230, 56);
      q.bezierCurveTo(200, 46, 168, 66, 150, 92);
      q.bezierCurveTo(176, 74, 206, 70, 232, 84);
      q.bezierCurveTo(290, 100, 330, 110, 332, 150);
      q.quadraticCurveTo(280, 140, 226, 152);
      q.closePath();
    };
    cap(c);
    c.fillStyle = "#26307a";
    c.fill();
    c.save();
    cap(c);
    c.clip();
    c.strokeStyle = "#8fb0ff";
    c.lineWidth = 9;
    for (let k = -12; k < 12; k++) {
      c.beginPath();
      c.moveTo(120 + k * 26, 170);
      c.lineTo(250 + k * 26, 30);
      c.stroke();
    }
    c.fillStyle = "#ffe680";
    for (const [x, y] of [
      [300, 128],
      [258, 112],
      [212, 76],
      [176, 74],
      [312, 145],
    ]) {
      AWB_star4(c, x, y, 5, "#ffe680", "rgba(0,0,0,0)");
    }
    const sh = c.createLinearGradient(220, 60, 330, 150);
    sh.addColorStop(0, "rgba(255,255,255,.2)");
    sh.addColorStop(0.5, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(0,0,10,.4)");
    c.fillStyle = sh;
    c.fillRect(140, 40, 200, 120);
    c.restore();
    cap(c);
    c.strokeStyle = K.ink;
    c.lineWidth = 3.5;
    c.lineJoin = "round";
    c.stroke();
    // fluffy cuff
    const cuff = (q) => {
      q.beginPath();
      q.moveTo(222, 156);
      q.quadraticCurveTo(278, 138, 336, 154);
      q.lineTo(336, 138);
      q.quadraticCurveTo(278, 122, 224, 140);
      q.closePath();
    };
    AWB_fillOut(
      c,
      K,
      cuff,
      K.lin(0, 124, 0, 158, [
        [0, "#ffffff"],
        [1, "#c9cfdc"],
      ]),
      3,
    );
    c.fillStyle = "rgba(160,170,190,.6)";
    for (let x = 232; x < 330; x += 9) {
      c.beginPath();
      c.arc(x, 147 - Math.sin(((x - 222) / 114) * Math.PI) * 9, 2.2, 0, 7);
      c.fill();
    }
    // pompom
    c.fillStyle = K.ink;
    c.beginPath();
    c.arc(150, 94, 17, 0, 7);
    c.fill();
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * 6.283;
      c.fillStyle = k % 2 ? "#ffffff" : "#dfe4ee";
      c.beginPath();
      c.arc(150 + Math.cos(a) * 8, 94 + Math.sin(a) * 8, 8, 0, 7);
      c.fill();
    }
    c.fillStyle = "rgba(255,255,255,.9)";
    c.beginPath();
    c.arc(146, 89, 6, 0, 7);
    c.fill();
    AWB_putLayer(g, K, L, 4, 7, 0.38, 4);
  },
};

// Calendar Badge (Loyal Tank): a tear-off desk calendar on day 7, hung on the front
EXT_ITEM["aw-calendar"] = {
  draw(g, K) {
    const L = AWB_cv(),
      c = L.getContext("2d"),
      x = 402,
      y = 284;
    c.lineCap = "round";
    for (const [w, col] of [
      [6, K.ink],
      [3.5, "#c8a24a"],
    ]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(318, 214);
      c.quadraticCurveTo(366, 236, x - 14, y - 32);
      c.moveTo(432, 234);
      c.quadraticCurveTo(424, 250, x + 14, y - 32);
      c.stroke();
    }
    c.save();
    c.translate(x, y);
    c.rotate(0.06);
    const pg = (q) => {
      q.beginPath();
      q.roundRect(-30, -30, 60, 62, 6);
    };
    AWB_fillOut(c, K, pg, "#fbfbf7", 3);
    c.fillStyle = "rgba(0,0,0,.08)";
    c.fillRect(-27, 26, 54, 3);
    c.save();
    pg(c);
    c.clip();
    c.fillStyle = K.lin(0, -30, 0, -10, [
      [0, "#ff4a5a"],
      [1, "#c8102e"],
    ]);
    c.fillRect(-30, -30, 60, 18);
    c.restore();
    c.strokeStyle = K.ink;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-30, -12);
    c.lineTo(30, -12);
    c.stroke();
    c.fillStyle = "#fff";
    c.font = "bold 10px Arial, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("DAY", 0, -20.5);
    c.fillStyle = "#1a1d24";
    c.font = "bold 36px Arial Black, Arial, sans-serif";
    c.fillText("7", 0, 12);
    // the torn stub of yesterday's page and two rings
    c.fillStyle = "#f0efe8";
    c.beginPath();
    c.moveTo(-28, -34);
    for (let k = 0; k <= 8; k++) {
      c.lineTo(-28 + k * 7, -34 + (k % 2 ? 3 : 0));
    }
    c.lineTo(28, -30);
    c.lineTo(-28, -30);
    c.closePath();
    c.fill();
    for (const rx of [-14, 14]) {
      c.strokeStyle = K.ink;
      c.lineWidth = 4.5;
      c.beginPath();
      c.arc(rx, -32, 5, Math.PI * 0.95, Math.PI * 2.05);
      c.stroke();
      c.strokeStyle = "#c8ced6";
      c.lineWidth = 2.5;
      c.stroke();
    }
    c.fillStyle = "rgba(255,255,255,.4)";
    c.fillRect(-26, -8, 4, 36);
    c.restore();
    AWB_putLayer(g, K, L, 3, 6, 0.4, 3);
  },
};

// Aura: Showcase (Collector): a museum display — glass panes, spotlights from above, gold sparkle
EXT_ITEM["aw-aura-showcase"] = { aura: "showcase" };
EXT_AURA.showcase = ({ g, bloom, edge, hash, W, H }) => {
  let x0 = W,
    x1 = 0,
    y0 = H,
    y1 = 0;
  for (const [x, y] of edge) {
    if (x < x0) {
      x0 = x;
    }
    if (x > x1) {
      x1 = x;
    }
    if (y < y0) {
      y0 = y;
    }
    if (y > y1) {
      y1 = y;
    }
  }
  const L = Math.max(4, x0 - 22),
    R = Math.min(W - 4, x1 + 22),
    T = Math.max(4, y0 - 34),
    B = Math.min(H - 4, y1 + 12);
  g.save();
  // spotlight cones from above
  for (const [sx, tx] of [
    [L + 20, (x0 + x1) / 2 - 40],
    [R - 20, (x0 + x1) / 2 + 40],
  ]) {
    const gr = g.createLinearGradient(0, 0, 0, B);
    gr.addColorStop(0, "rgba(255,244,200,.55)");
    gr.addColorStop(1, "rgba(255,244,200,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(sx - 8, 0);
    g.lineTo(sx + 8, 0);
    g.lineTo(tx + 90, B);
    g.lineTo(tx - 90, B);
    g.closePath();
    g.fill();
  }
  bloom("#ffe9a8", 16, 0.35, 2);
  // glass case: faint panes, bright edges, diagonal reflections
  g.fillStyle = "rgba(210,240,255,.10)";
  g.fillRect(L, T, R - L, B - T);
  g.strokeStyle = "rgba(255,255,255,.85)";
  g.lineWidth = 2.5;
  g.strokeRect(L, T, R - L, B - T);
  g.strokeStyle = "rgba(200,170,90,.9)";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(L - 2, B);
  g.lineTo(R + 2, B);
  g.moveTo(L - 2, T);
  g.lineTo(R + 2, T);
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,.5)";
  g.lineCap = "round";
  for (const [ox, w] of [
    [0.12, 10],
    [0.2, 4],
    [0.78, 8],
    [0.85, 3],
  ]) {
    g.lineWidth = w;
    const xa = L + (R - L) * ox;
    g.beginPath();
    g.moveTo(xa, T + 8);
    g.lineTo(xa - 40, B - 8);
    g.stroke();
  }
  g.restore();
  for (let k = 0; k < 14; k++) {
    AWB_star4(
      g,
      L + hash(k, 1, 351) * (R - L),
      T + hash(k, 2, 351) * (B - T),
      2.5 + hash(k, 3, 351) * 5,
      "#fff6d0",
      "#ffcc33",
    );
  }
  return ["#fff2c0", 0.5];
};

// Paint Palette (Painter): a wooden palette with blobs of paint and a brush, propped behind the tank
EXT_ITEM["aw-palette"] = {
  draw(g, K) {
    const L = AWB_cv(),
      c = L.getContext("2d");
    c.save();
    c.translate(140, 165);
    c.rotate(-0.28);
    const pal = (q) => {
      q.beginPath();
      q.moveTo(-70, -10);
      q.bezierCurveTo(-74, -54, 10, -66, 52, -44);
      q.bezierCurveTo(84, -28, 80, 20, 52, 40);
      q.bezierCurveTo(26, 58, 8, 36, -10, 46);
      q.bezierCurveTo(-40, 62, -68, 30, -70, -10);
      q.closePath();
      q.moveTo(-34, 12);
      q.ellipse(-40, 12, 9, 7, 0.3, 0, 7, true);
    };
    pal(c);
    c.fillStyle = K.lin(-70, -60, 70, 50, [
      [0, "#f0c890"],
      [0.5, "#c8904a"],
      [1, "#8a5a26"],
    ]);
    c.fill("evenodd");
    c.strokeStyle = K.ink;
    c.lineWidth = 3.5;
    c.stroke();
    c.save();
    pal(c);
    c.clip("evenodd");
    c.strokeStyle = "rgba(110,60,20,.25)";
    c.lineWidth = 1.5;
    for (let k = -6; k < 6; k++) {
      c.beginPath();
      c.moveTo(-80, k * 11);
      c.bezierCurveTo(-20, k * 11 - 8, 30, k * 11 + 6, 90, k * 11);
      c.stroke();
    }
    c.restore();
    const blob = (x, y, r, col) => {
      c.fillStyle = K.ink;
      c.beginPath();
      c.ellipse(x, y + 1, r + 2, r * 0.8 + 2, 0, 0, 7);
      c.fill();
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(x, y, r, r * 0.8, 0, 0, 7);
      c.fill();
      c.fillStyle = "rgba(255,255,255,.65)";
      c.beginPath();
      c.ellipse(x - r * 0.35, y - r * 0.3, r * 0.3, r * 0.2, -0.4, 0, 7);
      c.fill();
    };
    blob(-44, -26, 10, "#e0242c");
    blob(-14, -40, 10, "#ffd23f");
    blob(20, -40, 10, "#2fbe5a");
    blob(48, -22, 10, "#2a62d8");
    blob(52, 12, 9, "#9b4dff");
    blob(24, 26, 8, "#ffffff");
    c.restore();
    // brush across it
    c.save();
    c.translate(160, 143);
    c.rotate(-1.05);
    const hd = (q) => {
      q.beginPath();
      q.moveTo(-6, 0);
      q.lineTo(6, 0);
      q.lineTo(4, 92);
      q.quadraticCurveTo(0, 98, -4, 92);
      q.closePath();
    };
    AWB_fillOut(
      c,
      K,
      hd,
      K.lin(-6, 0, 6, 0, [
        [0, "#7a0a14"],
        [0.5, "#e0242c"],
        [1, "#7a0a14"],
      ]),
      2.5,
    );
    c.fillStyle = K.ink;
    c.fillRect(-7.5, -16, 15, 18);
    c.fillStyle = K.lin(-6, 0, 6, 0, [
      [0, "#8a939f"],
      [0.5, "#eef2f6"],
      [1, "#6a737f"],
    ]);
    c.fillRect(-6, -15, 12, 16);
    const br = (q) => {
      q.beginPath();
      q.moveTo(-6, -15);
      q.quadraticCurveTo(-7, -34, 0, -44);
      q.quadraticCurveTo(7, -34, 6, -15);
      q.closePath();
    };
    AWB_fillOut(c, K, br, "#3a2a1a", 2.5);
    c.fillStyle = "#2a62d8";
    c.beginPath();
    c.moveTo(-4, -30);
    c.quadraticCurveTo(0, -46, 4, -30);
    c.quadraticCurveTo(0, -36, -4, -30);
    c.fill();
    c.restore();
    AWB_putLayer(g, K, L, 5, 7, 0.38, 4);
  },
};

// Travel Suitcase (Map Tourist): a vintage case covered in travel stickers (all made-up places)
EXT_ITEM["aw-suitcase"] = {
  draw(g, K) {
    const L = AWB_cv(),
      c = L.getContext("2d");
    c.save();
    c.translate(150, 172);
    c.rotate(-0.1);
    // handle
    c.strokeStyle = K.ink;
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(-18, -54);
    c.quadraticCurveTo(0, -78, 18, -54);
    c.stroke();
    c.strokeStyle = "#5a3416";
    c.lineWidth = 5;
    c.stroke();
    const body = (q) => {
      q.beginPath();
      q.roundRect(-74, -54, 148, 104, 12);
    };
    AWB_fillOut(
      c,
      K,
      body,
      K.lin(0, -54, 0, 50, [
        [0, "#b8743a"],
        [0.5, "#8f5424"],
        [1, "#5e3414"],
      ]),
      3.5,
    );
    c.strokeStyle = "rgba(40,20,5,.5)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-74, -38);
    c.lineTo(74, -38);
    c.stroke();
    for (const sx of [-44, 44]) {
      c.fillStyle = "#d9b680";
      c.fillRect(sx - 7, -54, 14, 104);
      c.strokeStyle = "rgba(60,30,10,.6)";
      c.lineWidth = 1.5;
      c.strokeRect(sx - 7, -54, 14, 104);
      c.fillStyle = "#e8c25a";
      c.fillRect(sx - 8, -44, 16, 10);
      c.strokeStyle = K.ink;
      c.strokeRect(sx - 8, -44, 16, 10);
    }
    for (const [px, py] of [
      [-74, -54],
      [74, -54],
      [-74, 50],
      [74, 50],
    ]) {
      c.fillStyle = K.ink;
      c.beginPath();
      c.arc(px, py, 8, 0, 7);
      c.fill();
      c.fillStyle = "#e8c25a";
      c.beginPath();
      c.arc(px, py, 6, 0, 7);
      c.fill();
    }
    // stickers
    const sticker = (x, y, rot, shape, bg, fg, txt) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.fillStyle = "rgba(0,0,0,.25)";
      c.beginPath();
      if (shape === "c") {
        c.arc(1.5, 2, 16, 0, 7);
      } else {
        c.roundRect(-27 + 1.5, -12 + 2, 54, 24, 4);
      }
      c.fill();
      c.fillStyle = bg;
      c.beginPath();
      if (shape === "c") {
        c.arc(0, 0, 16, 0, 7);
      } else {
        c.roundRect(-27, -12, 54, 24, 4);
      }
      c.fill();
      c.strokeStyle = fg;
      c.lineWidth = 1.6;
      c.beginPath();
      if (shape === "c") {
        c.arc(0, 0, 13, 0, 7);
      } else {
        c.roundRect(-24, -9, 48, 18, 3);
      }
      c.stroke();
      c.fillStyle = fg;
      c.font = "bold " + (txt.length > 7 ? 6 : 7) + "px Arial, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(txt, 0, 0.5, shape === "c" ? 24 : 46);
      c.restore();
    };
    sticker(-20, -14, -0.2, "r", "#ffd23f", "#1a3a6e", "LUNARIA");
    sticker(18, 10, 0.15, "c", "#2fae8a", "#ffffff", "KOVALO");
    sticker(-14, 26, 0.1, "r", "#e0503c", "#fff6dc", "ZEPHYR BAY");
    sticker(56, -18, 0.3, "c", "#f4ead8", "#b02a2a", "MIRA");
    c.fillStyle = "rgba(255,255,255,.18)";
    c.fillRect(-70, -50, 140, 10);
    c.restore();
    AWB_putLayer(g, K, L, 5, 7, 0.38, 4);
  },
};

// Lucky 777 Reels (Gambler): a little slot-machine reel box with chaser lights and a lever
EXT_ITEM["aw-slots"] = {
  draw(g, K) {
    const L = AWB_cv(),
      c = L.getContext("2d");
    c.save();
    c.translate(140, 166);
    c.rotate(-0.08);
    // lever (left side)
    c.strokeStyle = K.ink;
    c.lineWidth = 9;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(-84, 6);
    c.lineTo(-104, -40);
    c.stroke();
    c.strokeStyle = "#c8ced6";
    c.lineWidth = 5;
    c.stroke();
    c.fillStyle = K.ink;
    c.beginPath();
    c.arc(-106, -46, 11, 0, 7);
    c.fill();
    c.fillStyle = K.rad(-110, -50, 1, 10, [
      [0, "#ffb0b0"],
      [0.4, "#e0242c"],
      [1, "#7a0a14"],
    ]);
    c.beginPath();
    c.arc(-106, -46, 9, 0, 7);
    c.fill();
    const box = (q) => {
      q.beginPath();
      q.roundRect(-86, -46, 172, 92, 14);
    };
    AWB_fillOut(
      c,
      K,
      box,
      K.lin(0, -46, 0, 46, [
        [0, "#e0242c"],
        [0.55, "#a50f1f"],
        [1, "#5a0610"],
      ]),
      3.5,
    );
    c.strokeStyle = "#e8b923";
    c.lineWidth = 3;
    c.beginPath();
    c.roundRect(-80, -40, 160, 80, 10);
    c.stroke();
    // lights
    for (let k = 0; k < 13; k++) {
      const x = -72 + k * 12;
      for (const y of [-40, 40]) {
        c.fillStyle = k % 2 ? "#fff3b0" : "#ffd23f";
        c.shadowColor = "#ffd23f";
        c.shadowBlur = 6;
        c.beginPath();
        c.arc(x, y, 2.8, 0, 7);
        c.fill();
      }
    }
    c.shadowBlur = 0;
    // reels
    for (let k = -1; k <= 1; k++) {
      const x = k * 48;
      c.fillStyle = K.ink;
      c.beginPath();
      c.roundRect(x - 21, -29, 42, 58, 6);
      c.fill();
      c.fillStyle = K.lin(0, -27, 0, 27, [
        [0, "#9aa0a8"],
        [0.25, "#ffffff"],
        [0.75, "#ffffff"],
        [1, "#9aa0a8"],
      ]);
      c.beginPath();
      c.roundRect(x - 19, -27, 38, 54, 5);
      c.fill();
      c.font = "bold 34px Arial Black, Arial, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineWidth = 3;
      c.strokeStyle = "#5a0610";
      c.strokeText("7", x, 2);
      c.fillStyle = "#e0242c";
      c.fillText("7", x, 2);
      c.fillStyle = "rgba(255,255,255,.5)";
      c.fillRect(x - 17, -25, 5, 50);
    }
    c.fillStyle = "rgba(255,255,255,.2)";
    c.beginPath();
    c.roundRect(-82, -44, 164, 12, 8);
    c.fill();
    c.restore();
    AWB_star4(c, 46, 100, 8);
    AWB_star4(c, 226, 108, 7);
    AWB_putLayer(g, K, L, 5, 7, 0.38, 4);
  },
};

// Disco Ball (Party Animal): a mirrored disco ball on a little stand on the dome, throwing flecks of light
EXT_ITEM["aw-discoball"] = {
  draw(g, K) {
    const L = AWB_cv(),
      c = L.getContext("2d"),
      x = 280,
      y = 84,
      r = 38;
    // stand
    c.fillStyle = K.ink;
    c.beginPath();
    c.ellipse(x, 148, 20, 7, 0, 0, 7);
    c.fill();
    c.fillStyle = K.lin(x - 18, 0, x + 18, 0, [
      [0, "#5a606a"],
      [0.5, "#d8dde4"],
      [1, "#4a505a"],
    ]);
    c.beginPath();
    c.ellipse(x, 146.5, 17, 5, 0, 0, 7);
    c.fill();
    c.fillStyle = K.ink;
    c.fillRect(x - 5, y + r - 4, 10, 148 - y - r + 2);
    c.fillStyle = K.lin(x - 4, 0, x + 4, 0, [
      [0, "#6a737f"],
      [0.5, "#eef2f6"],
      [1, "#5a606a"],
    ]);
    c.fillRect(x - 3, y + r - 4, 6, 148 - y - r);
    // ball
    c.fillStyle = K.ink;
    c.beginPath();
    c.arc(x, y, r + 3, 0, 7);
    c.fill();
    c.save();
    c.beginPath();
    c.arc(x, y, r, 0, 7);
    c.clip();
    c.fillStyle = "#5a6270";
    c.fillRect(x - r, y - r, r * 2, r * 2);
    const rows = 10;
    for (let i = 0; i < rows; i++) {
      const la0 = -Math.PI / 2 + (i / rows) * Math.PI,
        la1 = la0 + Math.PI / rows,
        yy0 = y + Math.sin(la0) * r,
        yy1 = y + Math.sin(la1) * r,
        wr = Math.cos((la0 + la1) / 2) * r,
        cols = Math.max(3, Math.round(wr / 5));
      for (let j = 0; j < cols; j++) {
        const lo0 = -Math.PI / 2 + (j / cols) * Math.PI,
          lo1 = lo0 + Math.PI / cols,
          xx0 = x + Math.sin(lo0) * wr,
          xx1 = x + Math.sin(lo1) * wr;
        const light =
            0.35 + 0.65 * Math.max(0, -Math.sin(lo0 + 0.6) * 0.6 - Math.sin(la0) * 0.5) + K.hash(i, j, 361) * 0.25,
          v = Math.min(255, 70 + light * 185);
        c.fillStyle = `rgb(${v * 0.92},${v * 0.96},${v})`;
        c.fillRect(xx0 + 0.6, yy0 + 0.6, xx1 - xx0 - 1.2, yy1 - yy0 - 1.2);
        if (K.hash(i, j, 362) > 0.9) {
          c.fillStyle = ["#ff7ad9", "#6bd6ff", "#ffe066"][j % 3];
          c.globalAlpha = 0.6;
          c.fillRect(xx0 + 0.6, yy0 + 0.6, xx1 - xx0 - 1.2, yy1 - yy0 - 1.2);
          c.globalAlpha = 1;
        }
      }
    }
    const sh = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 2, x, y, r);
    sh.addColorStop(0, "rgba(255,255,255,.35)");
    sh.addColorStop(0.6, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(0,0,20,.5)");
    c.fillStyle = sh;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.restore();
    AWB_star4(c, x - 14, y - 16, 9, "#ffffff", "#ffffff");
    AWB_star4(c, x + 12, y + 8, 5, "#ffffff", "#9fe8ff");
    // light flecks thrown around
    for (let k = 0; k < 16; k++) {
      const a = K.hash(k, 1, 363) * 6.283,
        d = r + 12 + K.hash(k, 2, 363) * 42,
        fx = x + Math.cos(a) * d,
        fy = y + Math.sin(a) * d * 0.8;
      if (fy > 140) {
        continue;
      }
      c.fillStyle = ["#ff7ad9", "#6bd6ff", "#ffe066", "#ffffff"][k % 4];
      c.globalAlpha = 0.85;
      c.shadowColor = c.fillStyle;
      c.shadowBlur = 6;
      c.beginPath();
      c.ellipse(fx, fy, 3, 2, a, 0, 7);
      c.fill();
    }
    c.globalAlpha = 1;
    c.shadowBlur = 0;
    K.foot(x, 150, 24, 7);
    AWB_putLayer(g, K, L, 4, 7, 0.35, 4);
  },
};
