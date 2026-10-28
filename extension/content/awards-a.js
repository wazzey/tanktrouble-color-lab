import { EXT_AURA, EXT_ITEM } from "./registries.js";

// ---- Achievement rewards, set A (drawn in the 640x384 tank picture; see itemKit) ----
const AWA_cv = () => {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 384;
  return c;
};
const AWA_star = (c, x, y, r, n = 5, k = 0.45, rot = -Math.PI / 2) => {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n,
      rr = i % 2 ? r * k : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
};
// the bottom edge (hem) of a picture: its shape minus itself moved up
const AWA_hem = (img, up, col) => {
  const c = AWA_cv(),
    g = c.getContext("2d");
  g.drawImage(img, 0, 0, 640, 384);
  g.globalCompositeOperation = "destination-out";
  g.drawImage(img, 0, -up, 640, 384);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = col;
  g.fillRect(0, 0, 640, 384);
  return c;
};
const AWA_leaf = (c, x, y, len, wid, rot) => {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.5, -wid, len, 0);
  c.quadraticCurveTo(len * 0.5, wid, 0, 0);
  c.closePath();
  c.restore();
};

EXT_ITEM["aw-goldbars"] = {
  draw(g, K) {
    // a pyramid of gold bullion bars behind the tank
    const bar = (x, y) => {
      const w = 54,
        h = 17,
        d = 11,
        s = 7; // front face trapezoid, top face, right side
      const front = (c) => {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + w, y);
        c.lineTo(x + w - s, y - h);
        c.lineTo(x + s, y - h);
        c.closePath();
      };
      const top = (c) => {
        c.beginPath();
        c.moveTo(x + s, y - h);
        c.lineTo(x + w - s, y - h);
        c.lineTo(x + w - s + d, y - h - d * 0.7);
        c.lineTo(x + s + d, y - h - d * 0.7);
        c.closePath();
      };
      const side = (c) => {
        c.beginPath();
        c.moveTo(x + w, y);
        c.lineTo(x + w + d * 0.6, y - d * 0.5);
        c.lineTo(x + w - s + d, y - h - d * 0.7);
        c.lineTo(x + w - s, y - h);
        c.closePath();
      };
      side(g);
      g.fillStyle = "#9a6a10";
      g.fill();
      front(g);
      g.fillStyle = K.lin(x, y - h, x, y, [
        [0, "#ffe680"],
        [0.5, "#f0b92a"],
        [1, "#b07a12"],
      ]);
      g.fill();
      top(g);
      g.fillStyle = K.lin(x, y - h - d, x + w, y - h, [
        [0, "#fff6c0"],
        [1, "#ffd34a"],
      ]);
      g.fill();
      g.strokeStyle = K.ink;
      g.lineWidth = 2;
      g.lineJoin = "round";
      for (const p of [front, top, side]) {
        p(g);
        g.stroke();
      }
      g.fillStyle = "rgba(255,255,255,.55)";
      g.fillRect(x + s + 4, y - h + 3, w - 2 * s - 8, 2.5);
      g.strokeStyle = "rgba(120,80,10,.55)";
      g.lineWidth = 1.2;
      g.strokeRect(x + 16, y - 12, w - 32, 7);
    };
    const rows = [
      [44, 258],
      [102, 258],
      [160, 258],
      [73, 240],
      [131, 240],
      [102, 222],
    ];
    g.save();
    g.translate(130, 262);
    g.scale(1.25, 1.25);
    g.translate(-130, -262);
    g.save();
    g.filter = "blur(5px)";
    g.globalAlpha = 0.4;
    g.fillStyle = "#000";
    g.beginPath();
    g.ellipse(134, 261, 96, 9, 0, 0, 7);
    g.fill();
    g.restore();
    for (const [x, y] of rows) {
      bar(x, y);
    }
    g.restore();
    for (const [x, y, r] of [
      [118, 192, 6],
      [210, 230, 5],
      [52, 232, 4],
    ]) {
      g.save();
      g.fillStyle = "#fffbe6";
      g.shadowColor = "#ffd34a";
      g.shadowBlur = 8;
      AWA_star(g, x, y, r, 4, 0.25);
      g.fill();
      g.restore();
    }
  },
};

EXT_ITEM["aw-crystalcrown"] = {
  uses: ["dimitrium"],
  draw(g, K, P, A) {
    // a gunmetal crown set with the game's own Dimitrium crystals
    K.foot(280, 150, 50, 10);
    const band = (c) => {
      c.beginPath();
      c.moveTo(232, 154);
      c.quadraticCurveTo(280, 140, 328, 154);
      c.lineTo(326, 134);
      c.lineTo(310, 116);
      c.lineTo(296, 132);
      c.lineTo(280, 104);
      c.lineTo(264, 132);
      c.lineTo(250, 116);
      c.lineTo(234, 134);
      c.closePath();
    };
    K.shade(band, 4, 7, 0.4, 4);
    band(g);
    g.fillStyle = K.lin(232, 104, 328, 156, [
      [0, "#cfd6e2"],
      [0.45, "#6c7686"],
      [1, "#2a3038"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 3;
    g.lineJoin = "round";
    g.stroke();
    K.gloss(band, 0.3);
    g.strokeStyle = "rgba(255,255,255,.35)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(238, 146);
    g.quadraticCurveTo(280, 134, 322, 146);
    g.stroke();
    const gem = (x, y, s) => {
      if (A.dimitrium) {
        const w = 26 * s,
          h = 23 * s;
        g.save();
        g.shadowColor = "#44ff66";
        g.shadowBlur = 10;
        g.drawImage(A.dimitrium, x - w / 2, y - h / 2, w, h);
        g.restore();
      } else {
        g.fillStyle = "#2fd24a";
        g.beginPath();
        g.moveTo(x, y - 10 * s);
        g.lineTo(x + 9 * s, y);
        g.lineTo(x, y + 10 * s);
        g.lineTo(x - 9 * s, y);
        g.closePath();
        g.fill();
        g.strokeStyle = K.ink;
        g.lineWidth = 2;
        g.stroke();
      }
    };
    gem(280, 98, 1.45);
    gem(250, 112, 1.05);
    gem(310, 112, 1.05);
    gem(280, 143, 0.95);
    gem(254, 146, 0.7);
    gem(306, 146, 0.7);
    for (const [x, y, r] of [
      [292, 92, 4],
      [262, 104, 3],
      [318, 132, 3],
    ]) {
      g.save();
      g.fillStyle = "#f0fff0";
      g.shadowColor = "#7dff8a";
      g.shadowBlur = 8;
      AWA_star(g, x, y, r, 4, 0.25);
      g.fill();
      g.restore();
    }
  },
};

EXT_ITEM["aw-bronzelaurel"] = {
  uses: ["turret50"],
  draw(g, K, P, A) {
    // the game's Laurel Wreath, in bronze
    if (!A.turret50) {
      return;
    }
    const c = K.reskin(A.turret50, (d, i, h, s, l) => {
      if (s > 0.08) {
        K.setRGB(d, i, K.hsl2rgb(22, Math.min(0.75, s * 0.55 + 0.12), Math.min(0.85, l * 0.72)));
      }
    });
    K.put(c, 3, 6, 0.45, 3);
  },
};

EXT_ITEM["aw-victoryflag"] = {
  uses: ["back8"],
  draw(g, K, P, A) {
    // the game's Yellow Flag as a rich gold victory banner with a laurel and star
    if (!A.back8) {
      return;
    }
    const c = K.reskin(A.back8, (d, i, h, s, l) => {
      if (s > 0.35 && h > 30 && h < 70) {
        K.setRGB(d, i, K.hsl2rgb(43 - (1 - l) * 10, 0.95, Math.min(0.85, l * 0.92)));
      }
    });
    const cg = c.getContext("2d");
    cg.globalCompositeOperation = "source-atop";
    cg.fillStyle = "rgba(150,20,30,.92)";
    cg.fillRect(0, 84, 220, 22); // a crimson sash across it
    cg.fillStyle = "#fff4c0";
    cg.strokeStyle = "#6a3a00";
    cg.lineWidth = 2;
    AWA_star(cg, 82, 95, 14);
    cg.fill();
    cg.stroke();
    cg.fillStyle = "#5a8a2a";
    for (let k = 0; k < 4; k++) {
      AWA_leaf(cg, 64 - k * 1, 102 - k * 7, 12, 4, -2.2 + k * 0.25);
      cg.fill();
      AWA_leaf(cg, 100 + k * 1, 102 - k * 7, 12, 4, -0.9 - k * 0.25);
      cg.fill();
    }
    cg.strokeStyle = "rgba(255,255,255,.4)";
    cg.lineWidth = 2;
    cg.beginPath();
    cg.moveTo(30, 72);
    cg.quadraticCurveTo(90, 64, 150, 72);
    cg.stroke();
    K.put(c, 4, 7, 0.4, 4);
  },
};

EXT_ITEM["aw-aura-legend"] = { aura: "laurels" };
EXT_AURA.laurels = (x) => {
  // golden glow, laurel leaves drifting off the tank, glints
  const { g, bloom, star, edge, cx, cy, hash } = x;
  bloom("#ffcf40", 22, 0.5, 2);
  for (let k = 0; k < 26 && edge.length; k++) {
    const [x0, y0] = edge[Math.floor(hash(k, 1, 301) * edge.length)];
    const d = 0.2 + hash(k, 2, 301) * 0.45,
      px = x0 + (x0 - cx) * d,
      py = y0 + (y0 - cy) * d - hash(k, 5, 301) * 18;
    const len = 14 + hash(k, 3, 301) * 10,
      rot = hash(k, 4, 301) * 6.28;
    g.save();
    g.shadowColor = "#ffb400";
    g.shadowBlur = 8;
    AWA_leaf(g, px, py, len, len * 0.32, rot);
    g.fillStyle = k % 3 ? "#f5c534" : "#ffe68a";
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = "#8a5a08";
    g.lineWidth = 1.4;
    g.stroke();
    g.strokeStyle = "rgba(138,90,8,.7)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + Math.cos(rot) * len * 0.9, py + Math.sin(rot) * len * 0.9);
    g.stroke();
    g.restore();
  }
  for (let k = 0; k < 14; k++) {
    const [ex, ey] = edge[Math.floor(hash(k, 9, 302) * edge.length)] || [320, 200];
    star(ex + (ex - cx) * 0.45, ey + (ey - cy) * 0.45, 2 + hash(k, 3, 302) * 5, "#fff6cf", 0.95);
  }
  return ["#ffd86b", 0.55];
};

EXT_ITEM["aw-skulltally"] = {
  draw(g, K) {
    // a riveted plate on the front: a little skull and a tally of kills
    g.save();
    g.translate(398, 262);
    g.rotate(-0.08);
    const plate = (c) => {
      c.beginPath();
      c.roundRect(-44, -24, 88, 48, 8);
    };
    K.shade(plate, 3, 6, 0.4, 4);
    plate(g);
    g.fillStyle = K.lin(-44, -24, 44, 24, [
      [0, "#8a929e"],
      [0.5, "#4f5763"],
      [1, "#2a2f37"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 3;
    g.stroke();
    K.gloss(plate, 0.25);
    for (const [x, y] of [
      [-37, -17],
      [37, -17],
      [-37, 17],
      [37, 17],
    ]) {
      g.fillStyle = "#c7ccd4";
      g.beginPath();
      g.arc(x, y, 2.6, 0, 7);
      g.fill();
      g.strokeStyle = K.ink;
      g.lineWidth = 1;
      g.stroke();
    }
    // skull
    g.fillStyle = "#f2efe6";
    g.strokeStyle = K.ink;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(-20, -3, 11, Math.PI * 0.9, Math.PI * 2.1);
    g.lineTo(-13, 10);
    g.lineTo(-27, 10);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = K.ink;
    g.beginPath();
    g.arc(-24, -2, 3.2, 0, 7);
    g.arc(-16, -2, 3.2, 0, 7);
    g.fill();
    g.beginPath();
    g.moveTo(-20, 2);
    g.lineTo(-22, 6);
    g.lineTo(-18, 6);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 1.2;
    for (const x of [-24, -20, -16]) {
      g.beginPath();
      g.moveTo(x, 7);
      g.lineTo(x, 10);
      g.stroke();
    }
    // tally marks (4 + a strike)
    g.strokeStyle = "#f2efe6";
    g.lineWidth = 3.2;
    g.lineCap = "round";
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.moveTo(4 + k * 8, -12);
      g.lineTo(2 + k * 8, 12);
      g.stroke();
    }
    g.strokeStyle = "#e0242c";
    g.beginPath();
    g.moveTo(-1, 8);
    g.lineTo(34, -8);
    g.stroke();
    g.restore();
  },
};

EXT_ITEM["aw-warcape"] = {
  uses: ["back4"],
  draw(g, K, P, A) {
    // the game's Red Cape: dark crimson, gold trim, crossed swords
    if (!A.back4) {
      return;
    }
    const c = K.reskin(A.back4, (d, i, h, s, l) => {
      if (s > 0.25) {
        K.setRGB(d, i, K.hsl2rgb(352, 0.85, Math.min(0.5, l * 0.62)));
      }
    });
    const cg = c.getContext("2d");
    cg.globalCompositeOperation = "source-atop";
    cg.drawImage(AWA_hem(c, 7, "#e9b94a"), 0, 0);
    cg.drawImage(AWA_hem(c, 3, "#fff0a8"), 0, 1);
    // crossed swords
    cg.save();
    cg.translate(160, 204);
    cg.scale(0.72, 0.72);
    for (const s of [-1, 1]) {
      cg.save();
      cg.rotate(s * 0.7);
      cg.fillStyle = "#e8ecf2";
      cg.strokeStyle = "#3a1a10";
      cg.lineWidth = 1.6;
      cg.beginPath();
      cg.moveTo(-2.5, -24);
      cg.lineTo(0, -30);
      cg.lineTo(2.5, -24);
      cg.lineTo(2.5, 10);
      cg.lineTo(-2.5, 10);
      cg.closePath();
      cg.fill();
      cg.stroke();
      cg.fillStyle = "#e9b94a";
      cg.fillRect(-8, 10, 16, 3.5);
      cg.strokeRect(-8, 10, 16, 3.5);
      cg.fillStyle = "#5a2a10";
      cg.fillRect(-1.8, 13.5, 3.6, 8);
      cg.fillStyle = "#e9b94a";
      cg.beginPath();
      cg.arc(0, 23, 2.6, 0, 7);
      cg.fill();
      cg.restore();
    }
    cg.restore();
    K.put(c, 4, 7, 0.45, 4);
  },
};

EXT_ITEM["aw-infernocape"] = {
  uses: ["back42"],
  draw(g, K, P, A) {
    // the game's Black & Gold Cape on fire: flames lick up the hem, embers fly
    if (!A.back42) {
      return;
    }
    const c = K.reskin(A.back42, (d, i, h, s, l) => {
      if (s > 0.3 && h > 25 && h < 65) {
        K.setRGB(d, i, K.hsl2rgb(18 + l * 22, 1, Math.min(0.75, l * 0.85)));
      }
    });
    const cg = c.getContext("2d");
    // flame tongues along the hem, kept on the cape
    const hem = AWA_hem(c, 6, "#000"),
      hd = hem.getContext("2d").getImageData(0, 0, 640, 384).data,
      pts = [];
    for (let y = 2; y < 382; y += 3) {
      for (let x = 2; x < 638; x += 5) {
        if (hd[(y * 640 + x) * 4 + 3] > 100) {
          pts.push([x, y]);
        }
      }
    }
    const fl = AWA_cv(),
      fg = fl.getContext("2d");
    for (let k = 0; k < 46 && pts.length; k++) {
      const [x, y] = pts[Math.floor(K.hash(k, 1, 311) * pts.length)],
        h = 16 + K.hash(k, 2, 311) * 26,
        w = 6 + K.hash(k, 3, 311) * 6,
        lean = (K.hash(k, 4, 311) - 0.5) * 10;
      const gr = fg.createLinearGradient(x, y, x, y - h);
      gr.addColorStop(0, "#ffe36a");
      gr.addColorStop(0.45, "#ff7a1a");
      gr.addColorStop(1, "rgba(200,20,0,0)");
      fg.fillStyle = gr;
      fg.beginPath();
      fg.moveTo(x - w, y + 2);
      fg.quadraticCurveTo(x - w * 0.6, y - h * 0.5, x + lean, y - h);
      fg.quadraticCurveTo(x + w * 0.6, y - h * 0.5, x + w, y + 2);
      fg.closePath();
      fg.fill();
    }
    fg.globalCompositeOperation = "destination-in";
    fg.drawImage(c, 0, 0);
    cg.save();
    cg.globalCompositeOperation = "source-atop";
    cg.filter = "blur(1px)";
    cg.drawImage(fl, 0, 0);
    cg.restore();
    K.put(c, 4, 7, 0.45, 4);
    g.save();
    g.globalCompositeOperation = "lighter";
    g.filter = "blur(6px)";
    g.globalAlpha = 0.55;
    g.drawImage(fl, 0, 0);
    g.restore(); // heat glow
    for (let k = 0; k < 18 && pts.length; k++) {
      const [x, y] = pts[Math.floor(K.hash(k, 5, 312) * pts.length)],
        ex = x + (K.hash(k, 6, 312) - 0.5) * 30,
        ey = y - 18 - K.hash(k, 7, 312) * 50;
      g.save();
      g.fillStyle = k % 2 ? "#ffd34a" : "#ff7a1a";
      g.shadowColor = "#ff5a00";
      g.shadowBlur = 6;
      g.beginPath();
      g.arc(ex, ey, 1.4 + K.hash(k, 8, 312) * 2, 0, 7);
      g.fill();
      g.restore();
    }
  },
};

EXT_ITEM["aw-yinyang"] = {
  draw(g, K) {
    // a balance badge: yin-yang in a gold bezel
    const x = 398,
      y = 262,
      r = 25,
      disc = (c) => {
        c.beginPath();
        c.arc(x, y, r + 4, 0, 7);
      };
    K.shade(disc, 3, 6, 0.45, 4);
    disc(g);
    g.fillStyle = K.lin(x - r, y - r, x + r, y + r, [
      [0, "#fff1a8"],
      [0.5, "#d6a12a"],
      [1, "#7a5208"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 3;
    g.stroke();
    g.save();
    g.translate(x, y);
    g.rotate(-0.5);
    g.fillStyle = "#f6f4ee";
    g.beginPath();
    g.arc(0, 0, r, 0, 7);
    g.fill();
    g.fillStyle = "#16181e";
    g.beginPath();
    g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
    g.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
    g.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2);
    g.closePath();
    g.fill();
    g.fillStyle = "#16181e";
    g.beginPath();
    g.arc(0, -r / 2, r / 6.5, 0, 7);
    g.fill();
    g.fillStyle = "#f6f4ee";
    g.beginPath();
    g.arc(0, r / 2, r / 6.5, 0, 7);
    g.fill();
    g.restore();
    g.strokeStyle = K.ink;
    g.lineWidth = 1.8;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.stroke();
    const face = (c) => {
      c.beginPath();
      c.arc(x, y, r, 0, 7);
    };
    K.gloss(face, 0.28);
  },
};

EXT_ITEM["aw-raincloud"] = {
  draw(g, K) {
    // a little grey rain cloud over the dome
    const cloud = (c) => {
      c.beginPath();
      for (const [x, y, r] of [
        [250, 92, 20],
        [272, 78, 26],
        [302, 84, 22],
        [322, 98, 16],
        [236, 104, 14],
        [286, 104, 22],
        [262, 106, 18],
        [308, 108, 16],
      ]) {
        c.moveTo(x + r, y);
        c.arc(x, y, r, 0, 7);
      }
    };
    // its shadow on the dome
    K.foot(280, 150, 44, 9);
    // rain
    g.strokeStyle = "rgba(90,150,230,.9)";
    g.lineWidth = 2.6;
    g.lineCap = "round";
    for (let k = 0; k < 9; k++) {
      const x = 238 + k * 10 + K.hash(k, 1, 321) * 4,
        y = 122 + K.hash(k, 2, 321) * 12;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 3, y + 10);
      g.stroke();
    }
    for (let k = 0; k < 4; k++) {
      const x = 248 + k * 20,
        y = 142;
      g.fillStyle = "rgba(120,180,255,.95)";
      g.beginPath();
      g.moveTo(x, y - 6);
      g.quadraticCurveTo(x + 4, y, x, y + 3);
      g.quadraticCurveTo(x - 4, y, x, y - 6);
      g.fill();
      g.strokeStyle = "rgba(30,60,110,.8)";
      g.lineWidth = 1;
      g.stroke();
    }
    K.shade(cloud, 4, 8, 0.3, 5);
    g.save();
    cloud(g);
    g.strokeStyle = K.ink;
    g.lineWidth = 6;
    g.stroke();
    g.restore();
    cloud(g);
    g.fillStyle = K.lin(250, 52, 290, 126, [
      [0, "#d9dee6"],
      [0.55, "#9aa3b0"],
      [1, "#5d6673"],
    ]);
    g.fill();
    K.gloss(cloud, 0.35);
  },
};

EXT_ITEM["aw-target"] = {
  draw(g, K) {
    // an archery target on a wooden easel behind the tank
    g.lineCap = "round";
    const leg = (x0, y0, x1, y1) => {
      g.strokeStyle = K.ink;
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
      g.strokeStyle = "#a0682f";
      g.lineWidth = 5.5;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    };
    g.save();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.35;
    g.fillStyle = "#000";
    g.beginPath();
    g.ellipse(124, 262, 70, 10, 0, 0, 7);
    g.fill();
    g.restore();
    leg(88, 260, 116, 110);
    leg(160, 260, 128, 110);
    leg(126, 258, 126, 120);
    const cx = 122,
      cy = 160,
      R = 56,
      face = (c) => {
        c.beginPath();
        c.ellipse(cx, cy, R * 0.86, R, -0.12, 0, 7);
      };
    K.shade(face, 5, 8, 0.4, 5);
    face(g);
    g.fillStyle = "#e8d6a8";
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 3.5;
    g.stroke();
    const rings = ["#f4f4f2", "#1c1c22", "#2a7ad8", "#e0242c", "#ffd23f"];
    for (let k = 0; k < 5; k++) {
      const f = 0.9 - k * 0.18;
      g.beginPath();
      g.ellipse(cx, cy, R * 0.86 * f, R * f, -0.12, 0, 7);
      g.fillStyle = rings[k];
      g.fill();
      g.strokeStyle = "rgba(20,20,24,.55)";
      g.lineWidth = 1.2;
      g.stroke();
    }
    g.save();
    face(g);
    g.clip();
    g.fillStyle = K.rad(cx - 18, cy - 24, 4, R * 1.2, [
      [0, "rgba(255,255,255,.35)"],
      [0.5, "rgba(255,255,255,0)"],
      [1, "rgba(0,0,0,.25)"],
    ]);
    g.fillRect(cx - R, cy - R, R * 2, R * 2);
    g.restore();
    // an arrow in the gold
    g.save();
    g.translate(cx + 4, cy + 2);
    g.rotate(-0.5);
    g.strokeStyle = K.ink;
    g.lineWidth = 4.5;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(46, 0);
    g.stroke();
    g.strokeStyle = "#c8a26a";
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(46, 0);
    g.stroke();
    g.fillStyle = "#e0242c";
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(34, 0);
      g.lineTo(48, s * 8);
      g.lineTo(52, s * 8);
      g.lineTo(42, 0);
      g.closePath();
      g.fill();
      g.strokeStyle = K.ink;
      g.lineWidth = 1.2;
      g.stroke();
    }
    g.restore();
  },
};

EXT_ITEM["aw-oops"] = {
  uses: ["barrel6"],
  draw(g, K, P, A) {
    // the game's BANG! flag, now reading OOPS!
    if (!A.barrel6) {
      return;
    }
    const c = K.reskin(A.barrel6, (d, i, h, s, l) => {
      const p = i / 4,
        x = p % 640,
        y = (p / 640) | 0;
      if (x < 490 || y < 142) {
        return;
      }
      if ((s < 0.3 && l < 0.7) || (h > 47 && h < 80 && l < 0.47)) {
        K.setRGB(d, i, [242, 240, 30]);
      } else if (h >= 28 && h <= 47 && l < 0.44) {
        K.setRGB(d, i, [250, 190, 20]);
      }
    });
    const cg = c.getContext("2d");
    cg.globalCompositeOperation = "source-atop";
    cg.save();
    cg.translate(572, 192);
    cg.rotate(-0.42);
    cg.font = '900 30px "Arial Black", Impact, sans-serif';
    cg.textAlign = "center";
    cg.textBaseline = "middle";
    cg.lineWidth = 5;
    cg.strokeStyle = "#fff6a0";
    cg.strokeText("OOPS!", 0, 0);
    cg.fillStyle = "#26221c";
    cg.fillText("OOPS!", 0, 0);
    cg.restore();
    K.put(c, 3, 6, 0.4, 3);
  },
};

EXT_ITEM["aw-beret"] = {
  draw(g, K) {
    // a maroon veteran's beret slouched over the dome, with a pin
    K.foot(278, 148, 50, 10);
    const top = (c) => {
      c.beginPath();
      c.moveTo(232, 146);
      c.bezierCurveTo(222, 120, 248, 98, 290, 100);
      c.bezierCurveTo(336, 102, 356, 124, 338, 140);
      c.bezierCurveTo(320, 150, 290, 144, 262, 150);
      c.closePath();
    };
    const band = (c) => {
      c.beginPath();
      c.moveTo(234, 140);
      c.quadraticCurveTo(280, 130, 324, 140);
      c.lineTo(324, 152);
      c.quadraticCurveTo(280, 142, 234, 152);
      c.closePath();
    };
    K.shade(top, 4, 8, 0.4, 5);
    top(g);
    g.fillStyle = K.lin(240, 98, 330, 150, [
      [0, "#c0384a"],
      [0.5, "#7c1424"],
      [1, "#3e0810"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 3;
    g.stroke();
    K.gloss(top, 0.22);
    g.strokeStyle = "rgba(30,0,6,.35)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(290, 104);
    g.quadraticCurveTo(306, 118, 336, 132);
    g.stroke();
    band(g);
    g.fillStyle = K.lin(0, 132, 0, 152, [
      [0, "#4a3020"],
      [1, "#1e120a"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = "#2a0508";
    g.beginPath();
    g.arc(288, 101, 4, 0, 7);
    g.fill(); // the little stalk
    // the pin: gold shield with a star
    const pin = (c) => {
      c.beginPath();
      c.moveTo(250, 112);
      c.lineTo(266, 112);
      c.lineTo(266, 124);
      c.quadraticCurveTo(258, 134, 250, 124);
      c.closePath();
    };
    K.shade(pin, 2, 3, 0.4, 2);
    pin(g);
    g.fillStyle = K.lin(250, 112, 266, 130, [
      [0, "#fff1a8"],
      [1, "#b8860b"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 1.8;
    g.stroke();
    g.fillStyle = "#7c1424";
    AWA_star(g, 258, 121, 5);
    g.fill();
  },
};

EXT_ITEM["aw-scope"] = {
  draw(g, K) {
    // a laser scope on a mount on the dome, its red lens glowing
    K.foot(282, 148, 28, 7);
    // mount
    const mount = (c) => {
      c.beginPath();
      c.moveTo(266, 150);
      c.lineTo(272, 124);
      c.lineTo(296, 124);
      c.lineTo(302, 150);
      c.closePath();
    };
    K.shade(mount, 3, 5, 0.35, 3);
    mount(g);
    g.fillStyle = K.lin(266, 0, 302, 0, [
      [0, "#3a4048"],
      [0.5, "#7a8490"],
      [1, "#2a3038"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.save();
    g.translate(284, 112);
    g.rotate(-0.22);
    const tube = (c) => {
      c.beginPath();
      c.roundRect(-56, -11, 104, 22, 9);
      c.moveTo(-60, -15);
      c.roundRect(-62, -15, 18, 30, 5);
      c.roundRect(36, -15, 20, 30, 5);
    };
    K.shade(tube, 3, 7, 0.4, 4);
    tube(g);
    g.fillStyle = K.lin(0, -15, 0, 15, [
      [0, "#6c7480"],
      [0.35, "#2a2e36"],
      [1, "#101216"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = "rgba(255,255,255,.28)";
    g.fillRect(-50, -8, 84, 3);
    g.fillStyle = "#c8102e";
    g.fillRect(-10, -11, 6, 22);
    g.strokeStyle = K.ink;
    g.lineWidth = 1.2;
    g.strokeRect(-10, -11, 6, 22);
    // lens and beam
    g.save();
    g.shadowColor = "#ff2020";
    g.shadowBlur = 16;
    g.fillStyle = K.rad(56, 0, 1, 12, [
      [0, "#ffffff"],
      [0.3, "#ff6a6a"],
      [1, "#b00010"],
    ]);
    g.beginPath();
    g.ellipse(56, 0, 5, 12, 0, 0, 7);
    g.fill();
    g.restore();
    const bm = g.createLinearGradient(58, 0, 230, 0);
    bm.addColorStop(0, "rgba(255,40,40,.75)");
    bm.addColorStop(1, "rgba(255,40,40,0)");
    g.strokeStyle = bm;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(58, 0);
    g.lineTo(230, 0);
    g.stroke();
    g.restore();
  },
};

EXT_ITEM["aw-radar"] = {
  draw(g, K) {
    // a radar-lock badge: green scope screen, sweep, crosshair and a red blip
    const x = 398,
      y = 262,
      r = 24,
      bez = (c) => {
        c.beginPath();
        c.arc(x, y, r + 6, 0, 7);
      };
    K.shade(bez, 3, 6, 0.45, 4);
    bez(g);
    g.fillStyle = K.lin(x - r, y - r, x + r, y + r, [
      [0, "#c5ccd6"],
      [0.5, "#6a7480"],
      [1, "#2a3038"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 3;
    g.stroke();
    g.save();
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.clip();
    g.fillStyle = K.rad(x, y, 2, r, [
      [0, "#0f5a26"],
      [1, "#03200c"],
    ]);
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.strokeStyle = "rgba(80,255,140,.5)";
    g.lineWidth = 1;
    for (const f of [0.33, 0.66]) {
      g.beginPath();
      g.arc(x, y, r * f, 0, 7);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(x - r, y);
    g.lineTo(x + r, y);
    g.moveTo(x, y - r);
    g.lineTo(x, y + r);
    g.stroke();
    const sw = g.createConicGradient ? g.createConicGradient(-1.2, x, y) : null;
    if (sw) {
      sw.addColorStop(0, "rgba(90,255,140,.65)");
      sw.addColorStop(0.18, "rgba(90,255,140,0)");
      sw.addColorStop(1, "rgba(90,255,140,0)");
      g.fillStyle = sw;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.restore();
    g.save();
    g.fillStyle = "#ff3030";
    g.shadowColor = "#ff3030";
    g.shadowBlur = 8;
    g.beginPath();
    g.arc(x + 9, y - 8, 3.2, 0, 7);
    g.fill();
    g.restore();
    g.strokeStyle = "#ff3030";
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(x + 9, y - 8, 7, 0, 7);
    g.stroke();
    g.strokeStyle = K.ink;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.stroke();
    K.gloss((c) => {
      c.beginPath();
      c.arc(x, y, r, 0, 7);
    }, 0.22);
  },
};

EXT_ITEM["aw-detector"] = {
  draw(g, K) {
    // a metal-detector wand leaning behind the tank
    g.lineCap = "round";
    g.save();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.35;
    g.fillStyle = "#000";
    g.beginPath();
    g.ellipse(84, 266, 46, 9, 0, 0, 7);
    g.fill();
    g.restore();
    const shaft = (w, col) => {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(88, 246);
      g.lineTo(206, 96);
      g.stroke();
    };
    shaft(10, K.ink);
    shaft(6, "#9aa3ad");
    g.strokeStyle = "rgba(255,255,255,.5)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(90, 241);
    g.lineTo(204, 96);
    g.stroke();
    // coil at the bottom
    const coil = (c) => {
      c.beginPath();
      c.ellipse(80, 254, 40, 13, -0.08, 0, 7);
    };
    coil(g);
    g.fillStyle = K.lin(40, 240, 120, 268, [
      [0, "#ffd23f"],
      [1, "#c98a00"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 3;
    g.stroke();
    g.beginPath();
    g.ellipse(80, 252, 24, 7, -0.08, 0, 7);
    g.fillStyle = "#2a2a30";
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = "rgba(255,255,255,.4)";
    g.beginPath();
    g.ellipse(70, 246, 22, 3, -0.08, 0, 7);
    g.fill();
    // control box with lights
    g.save();
    g.translate(170, 142);
    g.rotate(-0.9);
    const box = (c) => {
      c.beginPath();
      c.roundRect(-16, -12, 32, 24, 5);
    };
    K.shade(box, 3, 5, 0.35, 3);
    box(g);
    g.fillStyle = K.lin(0, -12, 0, 12, [
      [0, "#3a4048"],
      [1, "#14161c"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 2.5;
    g.stroke();
    for (let k = 0; k < 3; k++) {
      g.save();
      g.fillStyle = ["#39ff14", "#ffd23f", "#ff3030"][k];
      g.shadowColor = g.fillStyle;
      g.shadowBlur = 6;
      g.beginPath();
      g.arc(-8 + k * 8, 0, 2.8, 0, 7);
      g.fill();
      g.restore();
    }
    g.restore();
    // handle and arm cuff
    g.strokeStyle = K.ink;
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(196, 108);
    g.lineTo(216, 84);
    g.stroke();
    g.strokeStyle = "#2a2a30";
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(196, 108);
    g.lineTo(216, 84);
    g.stroke();
    g.strokeStyle = K.ink;
    g.lineWidth = 4;
    g.beginPath();
    g.arc(214, 80, 10, 3.6, 6.4);
    g.stroke();
  },
};

EXT_ITEM["aw-smokebarrel"] = {
  draw(g, K, P) {
    // the barrel tip glowing hot, smoke curling off it
    if (P.barrel) {
      const c = AWA_cv(),
        cg = c.getContext("2d");
      const gr = cg.createLinearGradient(405, 172, 492, 140);
      gr.addColorStop(0, "rgba(255,60,0,0)");
      gr.addColorStop(0.45, "rgba(255,70,0,.55)");
      gr.addColorStop(0.8, "rgba(255,170,40,.85)");
      gr.addColorStop(1, "rgba(255,240,170,.95)");
      cg.fillStyle = gr;
      cg.fillRect(380, 90, 140, 130);
      cg.globalCompositeOperation = "destination-in";
      cg.drawImage(P.barrel, 0, 0, 640, 384);
      g.save();
      g.globalCompositeOperation = "source-over";
      g.filter = "blur(9px)";
      g.globalAlpha = 0.6;
      g.drawImage(c, 0, 0);
      g.restore();
      g.drawImage(c, 0, 0);
    }
    // smoke puffs rising from the muzzle
    const puffs = [
      [494, 136, 10, 0.7],
      [504, 120, 13, 0.62],
      [512, 102, 16, 0.52],
      [526, 80, 19, 0.42],
      [542, 56, 22, 0.32],
      [556, 32, 24, 0.22],
    ];
    for (const [x, y, r, a] of puffs) {
      g.save();
      g.globalAlpha = a;
      g.fillStyle = K.rad(x - r * 0.3, y - r * 0.3, 1, r, [
        [0, "#f2f2f2"],
        [0.7, "#b8bcc4"],
        [1, "rgba(140,146,156,0)"],
      ]);
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
      g.restore();
    }
  },
};

EXT_ITEM["aw-rose"] = {
  draw(g, K) {
    // a wedding rose corsage pinned on the front, with a satin bow
    const x = 396,
      y = 256;
    g.save();
    g.translate(x, y);
    g.scale(1.25, 1.25);
    g.translate(-x, -y);
    // leaves
    for (const [a, s] of [
      [2.5, 1],
      [0.7, 0.9],
      [1.6, 0.8],
    ]) {
      const lf = (c) => AWA_leaf(c, x, y + 4, 34 * s, 11 * s, a);
      K.shade(lf, 2, 4, 0.35, 3);
      lf(g);
      g.fillStyle = K.lin(x - 30, y, x + 30, y + 30, [
        [0, "#5fbf4a"],
        [1, "#1f6a1e"],
      ]);
      g.fill();
      g.strokeStyle = K.ink;
      g.lineWidth = 2;
      g.stroke();
      g.strokeStyle = "rgba(10,50,10,.6)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y + 4);
      g.lineTo(x + Math.cos(a) * 30 * s, y + 4 + Math.sin(a) * 30 * s);
      g.stroke();
    }
    // bow ribbon tails
    g.fillStyle = "#f6f2ff";
    g.strokeStyle = K.ink;
    g.lineWidth = 1.8;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(x, y + 14);
      g.lineTo(x + s * 10, y + 40);
      g.lineTo(x + s * 4, y + 36);
      g.lineTo(x + s * 2, y + 42);
      g.closePath();
      g.fill();
      g.stroke();
    }
    // the bloom
    const bloom = (c) => {
      c.beginPath();
      c.arc(x, y, 20, 0, 7);
    };
    K.shade(bloom, 3, 6, 0.45, 4);
    bloom(g);
    g.fillStyle = K.rad(x - 6, y - 6, 2, 22, [
      [0, "#ff6a7a"],
      [0.6, "#d0142c"],
      [1, "#7a0818"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.strokeStyle = "rgba(70,0,10,.75)";
    g.lineWidth = 2;
    g.lineCap = "round";
    for (let k = 0; k < 4; k++) {
      const r = 16 - k * 4;
      g.beginPath();
      g.arc(x + k * 0.8, y - k * 0.6, r, 0.3 + k * 1.3, 0.3 + k * 1.3 + 3.6);
      g.stroke();
    }
    g.fillStyle = "rgba(255,255,255,.35)";
    g.beginPath();
    g.ellipse(x - 8, y - 10, 7, 3, -0.6, 0, 7);
    g.fill();
    g.restore();
  },
};

EXT_ITEM["aw-riotshield"] = {
  draw(g, K) {
    // a clear riot shield standing behind the tank
    g.save();
    g.translate(122, 168);
    g.rotate(-0.12);
    const sh = (c) => {
      c.beginPath();
      c.moveTo(-46, -86);
      c.quadraticCurveTo(0, -98, 46, -86);
      c.lineTo(48, 70);
      c.quadraticCurveTo(0, 84, -48, 70);
      c.closePath();
    };
    K.shade(sh, 6, 9, 0.35, 5);
    sh(g);
    g.fillStyle = K.lin(-48, -90, 48, 80, [
      [0, "rgba(200,225,255,.78)"],
      [0.5, "rgba(110,150,200,.62)"],
      [1, "rgba(50,80,130,.75)"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 9;
    g.lineJoin = "round";
    g.stroke();
    g.strokeStyle = "#2c3138";
    g.lineWidth = 5;
    g.stroke();
    // view slot and band
    g.fillStyle = "rgba(20,30,50,.55)";
    g.beginPath();
    g.roundRect(-34, -64, 68, 18, 5);
    g.fill();
    g.strokeStyle = "rgba(10,14,20,.8)";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = "rgba(20,24,30,.85)";
    g.fillRect(-46, 6, 92, 14);
    g.fillStyle = "#ffd23f";
    g.font = '900 11px "Arial Black", sans-serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("SHIELD", 0, 13.5);
    // glare
    g.save();
    sh(g);
    g.clip();
    g.fillStyle = "rgba(255,255,255,.45)";
    g.beginPath();
    g.moveTo(-40, -80);
    g.lineTo(-22, -80);
    g.lineTo(-40, 50);
    g.lineTo(-46, 40);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,.25)";
    g.fillRect(-14, -84, 6, 160);
    g.restore();
    g.restore();
  },
};
// ---- Achievement rewards, set C (Six-Bounce Wonder, Ace, Iron Wall) ----
// Copper Ricochet Medal (Six-Bounce Wonder): the game's medal turned copper and teal, a 6 and a zig-zag shot on its disc
EXT_ITEM["aw-sixbounce"] = {
  uses: ["front50"],
  draw(g, K, P, A) {
    if (!A.front50) {
      return;
    }
    const med = K.reskin(A.front50, (d, i, h, s, l) => {
      if (h > 25 && h < 70 && s > 0.25) {
        K.setRGB(d, i, [Math.min(255, 90 + l * 190), Math.min(255, 40 + l * 150), Math.min(255, 20 + l * 110)]);
      } // gold -> copper
      else if (s > 0.15) {
        K.setRGB(d, i, K.hsl2rgb(178, Math.min(1, s * 1.1), l));
      }
    }); // ribbon -> teal
    const d = med.getContext("2d").getImageData(0, 0, 640, 384).data;
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
    const mg = med.getContext("2d");
    mg.fillStyle = K.rad(mx - 4, my - 4, 1, 14, [
      [0, "#ffe2c8"],
      [1, "#c87a44"],
    ]);
    mg.beginPath();
    mg.arc(mx, my, 11.5, 0, 7);
    mg.fill();
    mg.strokeStyle = "rgba(70,30,10,.7)";
    mg.lineWidth = 1.2;
    mg.stroke();
    mg.fillStyle = "#3a1a08";
    mg.font = '900 15px "Arial Black", sans-serif';
    mg.textAlign = "center";
    mg.textBaseline = "middle";
    mg.fillText("6", mx, my + 1);
    K.put(med, 3, 6, 0.4, 3);
  },
};
// Ace Banner (Ace): a small pole behind the tank flying an ace-of-spades playing card
EXT_ITEM["aw-ace"] = {
  draw(g, K) {
    g.save();
    g.translate(112, 196);
    const pole = (c) => {
      c.beginPath();
      c.roundRect(-4, -170, 8, 176, 3);
    };
    const card = (c) => {
      c.beginPath();
      c.roundRect(4, -168, 70, 96, 8);
    };
    K.shade(
      (c) => {
        pole(c);
        c.fill();
        card(c);
      },
      5,
      8,
      0.32,
      4,
    );
    pole(g);
    g.fillStyle = K.lin(-4, 0, 4, 0, [
      [0, "#8a8f98"],
      [0.5, "#e8ecf2"],
      [1, "#6a6f78"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = "#ffd23f";
    g.beginPath();
    g.arc(0, -172, 7, 0, 7);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 2.5;
    g.stroke();
    card(g);
    g.fillStyle = K.lin(4, -168, 74, -72, [
      [0, "#ffffff"],
      [1, "#e6e8ee"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 4;
    g.lineJoin = "round";
    g.stroke();
    g.fillStyle = "#111318";
    g.font = "900 18px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("A", 17, -152);
    g.save();
    g.translate(61, -88);
    g.rotate(Math.PI);
    g.fillText("A", 0, 0);
    g.restore();
    g.save();
    g.translate(39, -120);
    g.fillStyle = "#111318";
    g.beginPath();
    g.moveTo(0, -22);
    g.bezierCurveTo(14, -8, 24, 2, 12, 10);
    g.bezierCurveTo(6, 13, 2, 9, 0, 6);
    g.bezierCurveTo(-2, 9, -6, 13, -12, 10);
    g.bezierCurveTo(-24, 2, -14, -8, 0, -22);
    g.fill();
    g.beginPath();
    g.moveTo(0, 4);
    g.lineTo(6, 20);
    g.lineTo(-6, 20);
    g.closePath();
    g.fill();
    g.restore();
    g.restore();
  },
};
// Iron Wall (Iron Wall): a riveted iron tower shield standing behind the tank
EXT_ITEM["aw-ironwall"] = {
  draw(g, K) {
    g.save();
    g.translate(122, 168);
    g.rotate(-0.1);
    const sh = (c) => {
      c.beginPath();
      c.moveTo(-46, -70);
      c.quadraticCurveTo(0, -104, 46, -70);
      c.lineTo(46, 72);
      c.lineTo(-46, 72);
      c.closePath();
    };
    K.shade(sh, 6, 9, 0.38, 5);
    sh(g);
    g.fillStyle = K.lin(-46, -100, 46, 72, [
      [0, "#9aa2ae"],
      [0.45, "#5a616c"],
      [1, "#2a2e35"],
    ]);
    g.fill();
    g.save();
    sh(g);
    g.clip();
    g.fillStyle = "rgba(0,0,0,.28)";
    for (const y of [-34, 18]) {
      g.fillRect(-50, y, 100, 9);
    }
    g.fillStyle = "rgba(255,255,255,.22)";
    for (const y of [-34, 18]) {
      g.fillRect(-50, y, 100, 2);
    }
    g.fillStyle = "rgba(255,255,255,.18)";
    g.beginPath();
    g.moveTo(-38, -70);
    g.lineTo(-26, -76);
    g.lineTo(-34, 60);
    g.lineTo(-40, 60);
    g.closePath();
    g.fill();
    g.restore();
    sh(g);
    g.strokeStyle = K.ink;
    g.lineWidth = 9;
    g.lineJoin = "round";
    g.stroke();
    g.strokeStyle = "#7a828e";
    g.lineWidth = 4;
    g.stroke();
    for (const [x, y] of [
      [-36, -62],
      [36, -62],
      [-38, -8],
      [38, -8],
      [-38, 46],
      [38, 46],
      [0, -82],
      [0, 62],
    ]) {
      g.fillStyle = K.rad(x - 1.5, y - 1.5, 0.5, 5, [
        [0, "#f0f2f6"],
        [1, "#4a505a"],
      ]);
      g.beginPath();
      g.arc(x, y, 4.5, 0, 7);
      g.fill();
      g.strokeStyle = "rgba(10,12,16,.8)";
      g.lineWidth = 1.5;
      g.stroke();
    }
    // a little brick wall emblem
    g.fillStyle = "#c8502e";
    g.strokeStyle = "#2a1208";
    g.lineWidth = 1.5;
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 3 - (r % 2); k++) {
        const x = -21 + k * 15 + (r % 2) * 7.5,
          y = -6 + r * 9 - 9;
        g.fillRect(x, y, 13, 7);
        g.strokeRect(x, y, 13, 7);
      }
    }
    g.restore();
  },
};
