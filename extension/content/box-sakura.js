import { loadImg } from "./images.js";
import { GF_BANDANA_PICS, V1_PICS } from "./box-ninja.js";
import { sampleRamp } from "./laika.js";
import { sakuraFlower, sakuraPetal } from "./sakura-shapes.js";

// ---------- Sakura box (Japanese theme) and the masks ----------
// Sakura versions of the game's snow items: the same heaps and falling flakes, made of the author's cherry blossom petals
export const SAKURA_SPRITES = [
  "ttcl-art:aef741df31db.webp",
  "ttcl-art:bfe24712dbdf.webp",
  "ttcl-art:c1bb551ad312.webp",
  "ttcl-art:d2cafa1f22ab.webp",
  "ttcl-art:86edbd2ab749.webp",
  "ttcl-art:01ebc890ac34.webp",
  "ttcl-art:f70640f1370e.webp",
  "ttcl-art:4c06bcd810bc.webp",
  "ttcl-art:84ef5d520082.webp",
  "ttcl-art:ea6322369692.webp",
  "ttcl-art:94baba1809ae.webp",
  "ttcl-art:f197487dd0c5.webp",
  "ttcl-art:37940aa4696d.webp",
  "ttcl-art:7253de25279b.webp",
  "ttcl-art:0fa6ddfeb808.webp",
  "ttcl-art:4ce7aff16f7b.webp",
]; // 0-7 flat petals, 8-11 curled petals, 12-15 blossoms
export function sakuraAcc(img, sp, W, H) {
  W = W || img.naturalWidth || img.width;
  H = H || img.naturalHeight || img.height;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const id = g.getImageData(0, 0, W, H),
    d = id.data,
    sx = W / 640,
    al = new Uint8Array(W * H);
  for (let i = 0; i < d.length; i += 4) {
    al[i / 4] = d[i + 3];
  }
  const hash = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  // split the snow into pieces: big heaps (on the dome, turret and treads) and small loose flakes / sparkles
  const lab = new Int32Array(W * H),
    parts = [];
  let n = 0;
  for (let p0 = 0; p0 < W * H; p0++) {
    if (al[p0] < 100 || lab[p0]) {
      continue;
    }
    n++;
    const q = [p0];
    lab[p0] = n;
    let cnt = 0,
      mx = 0,
      my = 0,
      x0 = W,
      x1 = 0,
      y0 = H,
      y1 = 0;
    while (q.length) {
      const p = q.pop(),
        x = p % W,
        y = (p / W) | 0;
      cnt++;
      mx += x;
      my += y;
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
      for (const o of [1, -1, W, -W]) {
        const r = p + o;
        if (r >= 0 && r < W * H && !lab[r] && al[r] >= 100 && Math.abs((r % W) - x) <= 1) {
          lab[r] = n;
          q.push(r);
        }
      }
    }
    parts.push({ n, cnt, x: mx / cnt, y: my / cnt, w: x1 - x0, h: y1 - y0 });
  }
  const big = new Set(parts.filter((p) => p.cnt >= 260 * sx * sx).map((p) => p.n));
  // keep only the item's soft shadow (dark, see-through pixels); the snow itself is replaced
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (!d[i + 3]) {
      continue;
    }
    const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
    if (!(d[i + 3] < 235 && l < 0.4)) {
      d[i + 3] = 0;
    }
  }
  g.putImageData(id, 0, 0);
  const put = (k, x, y, s, rot, flat) => {
    const im = sp[k];
    if (!im) {
      return;
    }
    const w = s,
      h = (s * im.height) / im.width;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    if (flat) {
      g.scale(1, flat);
    }
    g.drawImage(im, -w / 2, -h / 2, w, h);
    g.restore();
  };
  const on = (x, y) => {
    x = Math.round(x);
    y = Math.round(y);
    return x >= 0 && y >= 0 && x < W && y < H && big.has(lab[y * W + x]);
  };
  // heaps: a soft rose bed in the heap's shape (pulled in from the edge), then petals piled on it, back to front
  const bed = document.createElement("canvas");
  bed.width = W;
  bed.height = H;
  const bg = bed.getContext("2d");
  const bid = bg.createImageData(W, H);
  for (let p = 0; p < W * H; p++) {
    if (big.has(lab[p])) {
      let edge = false;
      for (const o of [3, -3, 3 * W, -3 * W]) {
        const r = p + o;
        if (r < 0 || r >= W * H || !big.has(lab[r])) {
          edge = true;
        }
      }
      if (!edge) {
        bid.data[p * 4] = 214;
        bid.data[p * 4 + 1] = 120;
        bid.data[p * 4 + 2] = 150;
        bid.data[p * 4 + 3] = 255;
      }
    }
  }
  bg.putImageData(bid, 0, 0);
  g.drawImage(bed, 0, 0);
  const st = 8 * sx;
  for (let y = 0; y < H; y += st) {
    for (let x = 0; x < W; x += st) {
      const jx = x + (hash(x, y, 1) - 0.5) * st,
        jy = y + (hash(x, y, 2) - 0.5) * st;
      if (!on(jx, jy)) {
        continue;
      }
      put(
        Math.floor(hash(x, y, 3) * 8),
        jx,
        jy,
        (13 + hash(x, y, 4) * 6) * sx,
        (hash(x, y, 5) - 0.5) * 2.4,
        0.62 + hash(x, y, 6) * 0.3,
      );
    }
  }
  for (let y = 0; y < H; y += 30 * sx) {
    for (let x = 0; x < W; x += 30 * sx) {
      const jx = x + hash(x, y, 7) * 26 * sx,
        jy = y + hash(x, y, 8) * 26 * sx;
      if (on(jx, jy) && on(jx, jy + 6 * sx) && hash(x, y, 9) > 0.5) {
        put(12 + Math.floor(hash(x, y, 10) * 4), jx, jy, 15 * sx, (hash(x, y, 11) - 0.5) * 0.8);
      }
    }
  }
  // loose flakes become falling petals, the sparkles small blossoms
  parts.forEach((p, j) => {
    if (big.has(p.n)) {
      return;
    }
    const star = p.w > 14 * sx && p.h > 14 * sx;
    if (star) {
      put(12 + (j % 4), p.x, p.y, Math.max(p.w, p.h) * 0.8, hash(j, 3, 12) * 1.2);
    } else {
      put(
        j % 3 ? Math.floor(hash(j, 1, 13) * 8) : 8 + (j % 4),
        p.x,
        p.y,
        Math.max(11 * sx, Math.min(17 * sx, Math.sqrt(p.cnt) * 2.4)),
        hash(j, 2, 14) * 6.3,
      );
    }
  });
  return c;
}
// Sakura items, drawn in the 640x384 tank-icon frame. P = the game's tank parts (the barrel is cut out of masks).
export function drawSakuraItem(kind, P) {
  const W = 640,
    H = 384,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const lin = (x0, y0, x1, y1, stops) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([p, col]) => gr.addColorStop(p, col));
    return gr;
  };
  const rad = (x, y, r0, r1, stops) => {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([p, col]) => gr.addColorStop(p, col));
    return gr;
  };
  const shadow = (draw, dx = 2, dy = 4, a = 0.35, b = 3) => {
    g.save();
    g.filter = "blur(" + b + "px)";
    g.globalAlpha = a;
    g.translate(dx, dy);
    draw();
    g.fillStyle = "#000";
    g.fill();
    g.restore();
  };
  const cutBarrel = () => {
    // a hole for the barrel to come through, with a shaded edge round it
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!(P && P.barrel)) {
      return;
    }
    const ring = document.createElement("canvas");
    ring.width = W;
    ring.height = H;
    const rg = ring.getContext("2d");
    rg.filter = "blur(2px)";
    rg.drawImage(P.barrel, 0, 0, W, H);
    rg.filter = "none";
    rg.globalCompositeOperation = "source-in";
    rg.fillStyle = "rgba(20,10,10,.75)";
    rg.fillRect(0, 0, W, H);
    rg.globalCompositeOperation = "destination-in";
    rg.drawImage(c, 0, 0); // only where the mask is
    g.globalCompositeOperation = "destination-out";
    g.drawImage(P.barrel, 0, 0, W, H);
    g.globalCompositeOperation = "source-over";
    rg.globalCompositeOperation = "destination-out";
    rg.drawImage(P.barrel, 0, 0, W, H);
    g.drawImage(ring, 0, 0);
  };
  const mk = /^(kitsune|oni)(plate)?$/.exec(kind);
  if (mk) {
    return drawMaskArt(mk[1], !!mk[2], P);
  }
  if (kind === "kanzashi") {
    // a cluster of sakura on a gold hairpin, with dangling petal strands
    g.save();
    g.strokeStyle = "rgba(0,0,0,.3)";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(262, 152);
    g.lineTo(218, 176);
    g.stroke();
    g.restore();
    g.strokeStyle = lin(262, 150, 216, 174, [
      [0, "#fff0a0"],
      [1, "#a87a10"],
    ]);
    g.lineWidth = 3.5;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(262, 148);
    g.lineTo(216, 172);
    g.stroke(); // the pin
    for (let k = 0; k < 4; k++) {
      const x0 = 236 + k * 7,
        y0 = 162 - k * 2;
      g.strokeStyle = "#d4a52a";
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x0 - 2, y0 + 26 + k * 3);
      g.stroke(); // strands
      for (let j = 0; j < 3; j++) {
        sakuraPetal(g, x0 - (2 * (j + 1)) / 3, y0 + 9 + j * 8 + k, 4.5, 0.2 * j, j % 2 ? "#ffd1dc" : "#ff9ab5");
      }
    }
    g.save();
    g.filter = "blur(2px)";
    g.fillStyle = "rgba(0,0,0,.3)";
    g.beginPath();
    g.ellipse(262, 160, 24, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    sakuraFlower(g, 266, 142, 15, 0.2, "#ffc1d4");
    sakuraFlower(g, 247, 152, 11, 0.9, "#ffd9e4");
    sakuraFlower(g, 280, 155, 10, 1.6, "#ff9ab5");
    for (const [x, y, r] of [
      [256, 136, 3],
      [288, 140, 2.6],
    ]) {
      g.fillStyle = "#ff7aa0";
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    } // buds
  } else if (kind === "kabuto") {
    // a samurai helmet: dark lacquered bowl, layered neck guard, gold crescent crest
    const bowl = () => {
      g.beginPath();
      g.moveTo(190, 214);
      g.bezierCurveTo(196, 150, 238, 132, 280, 132);
      g.bezierCurveTo(330, 132, 362, 160, 372, 206);
      g.quadraticCurveTo(282, 196, 190, 214);
      g.closePath();
    };
    shadow(bowl, 2, 5, 0.4, 4);
    for (let k = 2; k >= 0; k--) {
      const y = 206 + k * 9;
      g.beginPath();
      g.moveTo(182 - k * 4, y + 4);
      g.quadraticCurveTo(222, y - 10, 268, y - 6);
      g.lineTo(266, y + 6);
      g.quadraticCurveTo(220, y + 2, 186 - k * 4, y + 16);
      g.closePath();
      g.fillStyle = lin(0, y - 6, 0, y + 14, [
        [0, "#4a3f5a"],
        [1, "#17131d"],
      ]);
      g.fill();
      g.strokeStyle = "#c99a3a";
      g.lineWidth = 1.2;
      g.stroke();
    } // neck guard plates
    bowl();
    g.fillStyle = lin(220, 130, 330, 210, [
      [0, "#5a5068"],
      [0.45, "#262030"],
      [1, "#0e0b12"],
    ]);
    g.fill();
    g.strokeStyle = "#0a080c";
    g.lineWidth = 2;
    g.stroke();
    g.save();
    bowl();
    g.clip();
    g.strokeStyle = "rgba(201,154,58,.75)";
    g.lineWidth = 1.4;
    for (let k = 0; k < 7; k++) {
      const x = 214 + k * 22;
      g.beginPath();
      g.moveTo(x, 214);
      g.quadraticCurveTo(x + 18, 160, x + 50, 128);
      g.stroke();
    } // plate ridges
    for (let k = 0; k < 7; k++) {
      g.fillStyle = "#e8c46a";
      g.beginPath();
      g.arc(230 + k * 20, 200 - Math.sin((k / 6) * Math.PI) * 8, 1.8, 0, 7);
      g.fill();
    } // rivets
    g.fillStyle = "rgba(255,255,255,.25)";
    g.beginPath();
    g.ellipse(250, 158, 30, 10, -0.4, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.fillStyle = lin(0, 196, 0, 214, [
      [0, "#d4a52a"],
      [1, "#7a5208"],
    ]);
    g.beginPath();
    g.moveTo(188, 214);
    g.quadraticCurveTo(282, 194, 374, 206);
    g.lineTo(374, 214);
    g.quadraticCurveTo(282, 202, 188, 222);
    g.closePath();
    g.fill(); // gold rim
    g.save();
    g.shadowColor = "rgba(0,0,0,.4)";
    g.shadowBlur = 4;
    g.shadowOffsetY = 2; // crest: a gold crescent with a small sakura
    g.beginPath();
    g.moveTo(312, 146);
    g.bezierCurveTo(286, 128, 270, 104, 276, 74);
    g.bezierCurveTo(284, 104, 300, 120, 318, 132);
    g.bezierCurveTo(334, 118, 350, 100, 356, 72);
    g.bezierCurveTo(364, 104, 346, 130, 322, 148);
    g.closePath();
    g.fillStyle = lin(276, 74, 356, 148, [
      [0, "#fff3b0"],
      [0.5, "#e0b03a"],
      [1, "#8a5a0a"],
    ]);
    g.fill();
    g.restore();
    g.strokeStyle = "#7a5208";
    g.lineWidth = 1;
    g.stroke();
    sakuraFlower(g, 317, 143, 9, 0.3, "#ffc1d4");
    cutBarrel();
  } else {
    // 'lantern': a red paper lantern hanging from a bamboo pole at the back of the tank
    g.save();
    g.strokeStyle = "rgba(0,0,0,.3)";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(206, 262);
    g.quadraticCurveTo(170, 160, 128, 112);
    g.stroke();
    g.restore();
    g.strokeStyle = lin(200, 260, 130, 110, [
      [0, "#6a8a2a"],
      [1, "#a8c45a"],
    ]);
    g.lineWidth = 5;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(204, 258);
    g.quadraticCurveTo(168, 158, 126, 110);
    g.stroke();
    g.strokeStyle = "#4a6a1a";
    g.lineWidth = 1.2;
    for (const t of [0.3, 0.55, 0.8]) {
      const x = 204 + (126 - 204) * t,
        y = 258 + (110 - 258) * t;
      g.beginPath();
      g.moveTo(x - 3, y + 1);
      g.lineTo(x + 3, y - 1);
      g.stroke();
    } // bamboo joints
    g.strokeStyle = "#2a1a0a";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(130, 114);
    g.lineTo(130, 126);
    g.stroke();
    const L = { x: 130, y: 160, rx: 26, ry: 32 };
    g.save();
    g.shadowColor = "rgba(255,120,60,.8)";
    g.shadowBlur = 22;
    g.beginPath();
    g.ellipse(L.x, L.y, L.rx, L.ry, 0, 0, Math.PI * 2);
    g.fillStyle = rad(L.x - 6, L.y - 8, 2, 40, [
      [0, "#ffb07a"],
      [0.4, "#e8402a"],
      [1, "#8a0a0a"],
    ]);
    g.fill();
    g.restore();
    g.save();
    g.beginPath();
    g.ellipse(L.x, L.y, L.rx, L.ry, 0, 0, Math.PI * 2);
    g.clip();
    g.strokeStyle = "rgba(90,10,10,.55)";
    g.lineWidth = 1.2;
    for (let k = -4; k <= 4; k++) {
      g.beginPath();
      g.ellipse(L.x, L.y + k * 7, L.rx, 3 + Math.abs(k) * 0.3, 0, 0, Math.PI);
      g.stroke();
    } // ribs
    sakuraFlower(g, L.x + 4, L.y + 2, 11, 0.4, "#ffd9e4", "#ffe28a");
    g.restore();
    g.fillStyle = "#1a1414";
    g.beginPath();
    g.roundRect(L.x - 13, L.y - L.ry - 5, 26, 8, 2);
    g.fill();
    g.beginPath();
    g.roundRect(L.x - 13, L.y + L.ry - 3, 26, 8, 2);
    g.fill();
    g.strokeStyle = "#e8402a";
    g.lineWidth = 1.5;
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      g.moveTo(L.x + k * 2.5, L.y + L.ry + 5);
      g.lineTo(L.x + k * 3, L.y + L.ry + 20);
      g.stroke();
    } // tassel
  }
  return c;
}
// Masks (kitsune, oni), as a full hood or a front face plate, the size and shading of the game's hazmat hood:
// the hood's outline (with its hole for the barrel) filled with the mask's colour, rounded shading like the hood's
// (dark where it turns away), a light rim round the top, shade round the barrel hole and the eyes, a shadow on the tank.
function drawMaskArt(kind, plate, P) {
  const W = 640,
    H = 384,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!(P && P.hood)) {
    return c;
  }
  const cv = () => {
    const k2 = document.createElement("canvas");
    k2.width = W;
    k2.height = H;
    return k2;
  };
  const lin = (x0, y0, x1, y1, stops) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([p, col]) => gr.addColorStop(p, col));
    return gr;
  };
  const E = [
    [285, 114, 1],
    [366, 120, 0.55],
  ]; // near / far eye: where the hood's goggles are
  const shape = cv(),
    sg = shape.getContext("2d");
  sg.drawImage(P.hood, 0, 0, W, H);
  if (plate) {
    sg.globalCompositeOperation = "destination-in";
    sg.beginPath();
    sg.moveTo(268, 40);
    sg.quadraticCurveTo(244, 140, 266, 240);
    sg.lineTo(420, 240);
    sg.lineTo(420, 40);
    sg.closePath();
    sg.fill();
  }
  const strip = (dx, dy) => {
    const k2 = cv(),
      kg = k2.getContext("2d");
    kg.drawImage(shape, 0, 0);
    kg.globalCompositeOperation = "destination-out";
    kg.drawImage(shape, dx, dy);
    return k2;
  }; // a band along one edge
  const tintC = (src, col) => {
    const k2 = cv(),
      kg = k2.getContext("2d");
    kg.drawImage(src, 0, 0);
    kg.globalCompositeOperation = "source-in";
    kg.fillStyle = col;
    kg.fillRect(0, 0, W, H);
    return k2;
  };
  const body = (top, mid, low) => {
    const hc = cv(),
      hg = hc.getContext("2d");
    hg.drawImage(shape, 0, 0);
    hg.globalCompositeOperation = "source-in";
    const gr = hg.createLinearGradient(0, 60, 0, 230);
    gr.addColorStop(0, top);
    gr.addColorStop(0.5, mid);
    gr.addColorStop(1, low);
    hg.fillStyle = gr;
    hg.fillRect(0, 0, W, H);
    hg.globalCompositeOperation = "multiply";
    const cyl = hg.createLinearGradient(plate ? 250 : 191, 0, 386, 0);
    for (const [t, v] of [
      [0, 120],
      [0.12, 175],
      [0.35, 238],
      [0.55, 255],
      [0.75, 236],
      [0.92, 196],
      [1, 160],
    ]) {
      cyl.addColorStop(t, `rgb(${v},${v},${v})`);
    }
    hg.fillStyle = cyl;
    hg.fillRect(0, 0, W, H);
    hg.globalCompositeOperation = "destination-in";
    hg.drawImage(shape, 0, 0);
    hg.globalCompositeOperation = "source-atop";
    hg.globalAlpha = 0.45;
    hg.drawImage(tintC(strip(0, 10), "#ffffff"), 0, 0);
    hg.globalAlpha = 0.5;
    hg.drawImage(tintC(strip(0, 13), "#000000"), 0, 3); // light rim round the top, a dark line under it
    hg.globalAlpha = 0.28;
    hg.filter = "blur(2px)";
    hg.drawImage(tintC(strip(0, -14), "#000000"), 0, 0);
    hg.filter = "none"; // darker towards the bottom edge
    if (P.barrel) {
      const r = cv(),
        rg = r.getContext("2d");
      rg.filter = "blur(3px)";
      rg.drawImage(P.barrel, 0, 0, W, H);
      rg.filter = "none";
      rg.globalCompositeOperation = "source-in";
      rg.fillStyle = "#000";
      rg.fillRect(0, 0, W, H);
      hg.globalAlpha = 0.55;
      hg.drawImage(r, 0, 0);
    } // shade round the barrel hole
    if (plate) {
      hg.globalAlpha = 0.6;
      hg.drawImage(tintC(strip(5, 0), "#000000"), 0, 0);
      hg.globalAlpha = 0.5;
      hg.drawImage(tintC(strip(2, 0), "#ffffff"), 0, 0);
    } // the plate's edge has thickness
    hg.globalAlpha = 0.28;
    hg.fillStyle = "#ffffff";
    hg.filter = "blur(4px)";
    hg.beginPath();
    hg.ellipse(plate ? 300 : 238, 112, 12, 40, 0.12, 0, Math.PI * 2);
    hg.fill();
    hg.filter = "none"; // shine
    hg.globalAlpha = 1;
    if (P.barrel) {
      hg.globalCompositeOperation = "destination-out";
      hg.drawImage(P.barrel, 0, 0, W, H);
    }
    return hc;
  };
  const on = (hc, draw) => {
    const hg = hc.getContext("2d");
    hg.save();
    hg.globalCompositeOperation = "source-atop";
    draw(hg);
    hg.restore();
  };
  const eyeShade = (h, w, hh) => {
    h.save();
    h.filter = "blur(5px)";
    h.fillStyle = "rgba(0,0,0,.35)";
    for (const [x, y, s] of E) {
      h.beginPath();
      h.ellipse(x, y + 4, w * s, hh * s, 0, 0, Math.PI * 2);
      h.fill();
    }
    h.restore();
  };
  const put = (hc) => {
    g.save();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.4;
    g.drawImage(hc, 3, 5);
    g.restore();
    g.drawImage(hc, 0, 0);
  };
  const strap = (col) => {
    if (!plate) {
      return;
    }
    g.save();
    g.lineCap = "round";
    g.strokeStyle = "rgba(0,0,0,.35)";
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(262, 128);
    g.quadraticCurveTo(222, 150, 206, 206);
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(260, 124);
    g.quadraticCurveTo(220, 146, 203, 202);
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,.3)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(258, 121);
    g.quadraticCurveTo(219, 143, 201, 199);
    g.stroke();
    g.restore();
  };
  const ears = plate
    ? [
        [
          [270, 82],
          [276, 26],
          [304, 66],
        ],
        [
          [318, 72],
          [346, 20],
          [360, 74],
        ],
      ]
    : [
        [
          [214, 84],
          [214, 26],
          [250, 68],
        ],
        [
          [268, 66],
          [300, 14],
          [318, 66],
        ],
      ];
  const horns = plate
    ? [
        [
          [276, 82],
          [262, 40],
          [262, 6],
        ],
        [
          [332, 74],
          [346, 34],
          [370, 8],
        ],
      ]
    : [
        [
          [220, 84],
          [204, 40],
          [206, 6],
        ],
        [
          [296, 70],
          [312, 30],
          [336, 4],
        ],
      ];
  if (kind === "kitsune") {
    // white fox spirit: tall ears, red markings, eye slits
    strap("#c0272d");
    for (const [x0, x1, x2] of ears) {
      g.beginPath();
      g.moveTo(...x0);
      g.quadraticCurveTo(x1[0] - 6, x1[1] + 24, ...x1);
      g.quadraticCurveTo(x1[0] + 14, x1[1] + 24, ...x2);
      g.closePath();
      g.fillStyle = lin(x1[0], x1[1], x0[0], x0[1], [
        [0, "#ffffff"],
        [1, "#cfc6ba"],
      ]);
      g.fill();
      g.strokeStyle = "#8a7f74";
      g.lineWidth = 1.5;
      g.stroke();
      g.beginPath();
      g.moveTo(x0[0] + 10, x0[1] - 6);
      g.lineTo(x1[0] + 2, x1[1] + 18);
      g.lineTo(x2[0] - 10, x2[1] - 4);
      g.closePath();
      g.fillStyle = "#d42a3a";
      g.fill();
    }
    const hc = body("#ffffff", "#f6f1ea", "#e0d8cc");
    on(hc, (h) => {
      eyeShade(h, 26, 14);
      h.fillStyle = "#d42a3a";
      const fx = plate ? 300 : 258;
      h.beginPath();
      h.moveTo(fx - 8, 64);
      h.quadraticCurveTo(fx + 4, 80, fx - 4, 98);
      h.quadraticCurveTo(fx + 10, 82, fx + 8, 64);
      h.closePath();
      h.fill();
      h.lineCap = "round";
      h.strokeStyle = "#d42a3a";
      h.lineWidth = 5;
      h.beginPath();
      h.moveTo(262, 96);
      h.quadraticCurveTo(286, 84, 310, 96);
      h.stroke();
      h.lineWidth = 3.5;
      h.beginPath();
      h.moveTo(352, 98);
      h.quadraticCurveTo(366, 92, 380, 100);
      h.stroke();
      h.lineWidth = 3;
      for (const [x, y] of [
        [300, 150],
        [306, 156],
        [312, 160],
      ]) {
        h.beginPath();
        h.moveTo(x, y);
        h.lineTo(x - 26, y + 4);
        h.stroke();
      }
      if (!plate) {
        h.lineWidth = 4;
        h.beginPath();
        h.moveTo(210, 140);
        h.quadraticCurveTo(222, 166, 212, 196);
        h.stroke();
      }
      h.fillStyle = "#141414";
      for (const [x, y, s] of E) {
        h.beginPath();
        h.ellipse(x, y + 4, 20 * s, 6 * s, -0.15, 0, Math.PI * 2);
        h.fill();
      }
    });
    put(hc);
  } else if (kind === "oni") {
    // red demon: horns, angry brows, gold eyes, fangs
    strap("#2a1a1a");
    for (const [p0, p1, p2] of horns) {
      g.beginPath();
      g.moveTo(...p0);
      g.quadraticCurveTo(...p1, ...p2);
      g.quadraticCurveTo(p1[0] + 14, p1[1] + 8, p0[0] + 22, p0[1] + 2);
      g.closePath();
      g.fillStyle = lin(p0[0], p0[1], p2[0], p2[1], [
        [0, "#bfae88"],
        [1, "#fff8e6"],
      ]);
      g.fill();
      g.strokeStyle = "#7a6a4a";
      g.lineWidth = 1.5;
      g.stroke();
      g.strokeStyle = "rgba(122,106,74,.5)";
      g.lineWidth = 1.2;
      for (let t = 0.2; t < 0.8; t += 0.15) {
        g.beginPath();
        g.moveTo(p0[0] + (p2[0] - p0[0]) * t - 6, p0[1] + (p2[1] - p0[1]) * t + 2);
        g.lineTo(p0[0] + (p2[0] - p0[0]) * t + 8, p0[1] + (p2[1] - p0[1]) * t + 3);
        g.stroke();
      }
    }
    const hc = body("#ff6a44", "#d42420", "#8a0c0c");
    on(hc, (h) => {
      eyeShade(h, 24, 18);
      h.fillStyle = "#2a0505";
      h.beginPath();
      h.moveTo(254, 86);
      h.lineTo(314, 104);
      h.lineTo(310, 90);
      h.closePath();
      h.fill();
      h.beginPath();
      h.moveTo(384, 94);
      h.lineTo(352, 106);
      h.lineTo(354, 94);
      h.closePath();
      h.fill();
      for (const [x, y, s] of E) {
        h.fillStyle = "#ffd23a";
        h.beginPath();
        h.ellipse(x, y + 4, 15 * s, 10 * s, 0, 0, Math.PI * 2);
        h.fill();
        h.fillStyle = "#1a0a0a";
        h.beginPath();
        h.arc(x + 2 * s, y + 4, 5 * s, 0, 7);
        h.fill();
      }
      h.fillStyle = "#2a0505";
      h.beginPath();
      h.moveTo(252, 150);
      h.quadraticCurveTo(286, 170, 318, 148);
      h.quadraticCurveTo(286, 160, 252, 150);
      h.fill();
      h.fillStyle = "#fff8e6";
      for (const [x, dd] of [
        [262, 1],
        [306, -1],
      ]) {
        h.beginPath();
        h.moveTo(x - 5, 152);
        h.lineTo(x + 5, 152);
        h.lineTo(x + dd, 170);
        h.closePath();
        h.fill();
      }
      h.strokeStyle = "rgba(60,0,0,.45)";
      h.lineWidth = 2.5;
      for (const y of [160, 178]) {
        h.beginPath();
        h.moveTo(plate ? 270 : 206, y);
        h.quadraticCurveTo(plate ? 282 : 222, y - 10, plate ? 296 : 238, y - 2);
        h.stroke();
      }
    });
    put(hc);
  }
  return c;
}
// The oni and kitsune masks cut from hand-made picture, fitted like the jester: upright, the jaw opened round the barrel,
// the barrel in front from the mouth's corner on, and a cloth hood over the rest of the dome. Layout in 1x-picture units
export const ONI_PIC = "ttcl-art:8b853091b48a.webp";
export const KIT_PIC = "ttcl-art:544959c38c10.webp";
export const SAM_PIC = "ttcl-art:a980d609ea5f.webp";
// Hats cut from hand-made pictures: sat on the dome like the game's own hats. [picture, scale, base centre x, base y] (picture px)
export const HAT_FIT = {
  "hv-crown": ["ttcl-art:d2e4ef2ff5a3.webp", 1.4, 67, 97],
  "hv-seraph": ["ttcl-art:1a28607ce41c.webp", 0.9, 126, 150],
  "hv-circlet": ["ttcl-art:cd90c8a829b5.webp", 1.3, 60, 141],
};
export function drawHatPic(img, f) {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 384;
  const g = c.getContext("2d"),
    [, s, bx, by] = f,
    x = 281 - bx * s,
    y = 192 - by * s;
  g.save();
  g.filter = "blur(3px)";
  g.globalAlpha = 0.35;
  g.drawImage(img, x + 2, y + 5, img.width * s, img.height * s);
  g.restore();
  g.imageSmoothingQuality = "high";
  g.drawImage(img, x, y, img.width * s, img.height * s);
  return c;
}
// Race helmet from hand-made picture (brand marks removed), recoloured into each colour: its red paint turned to another hue
export const HELMET_HUES = {
  red: null,
  blue: 215,
  green: 130,
  yellow: 50,
  orange: 28,
  purple: 275,
  pink: 325,
  teal: 180,
  black: "blackgold",
  white: "white",
};
export function helmetVariant(img, v) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  if (v == null) {
    return c;
  }
  const id = g.getImageData(0, 0, c.width, c.height),
    d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255,
      gg = d[i + 1] / 255,
      b = d[i + 2] / 255,
      mx = Math.max(r, gg, b),
      mn = Math.min(r, gg, b),
      l = (mx + mn) / 2,
      dl = mx - mn;
    if (d[i + 3] < 200 && (v === "white" || v === "blackgold")) {
      if (d[i + 3] < 120) {
        continue;
      }
    }
    const red = dl > 0.18 && mx === r && gg - b < 0.25 * dl + 0.05; // the helmet's red paint
    if (v === "blackgold") {
      if (red) {
        const k = 0.12 + l * 0.35;
        d[i] = d[i + 1] = d[i + 2] = k * 255;
        d[i + 2] += 6;
      } else if (dl < 0.1 && l > 0.7) {
        d[i] = 230 * l;
        d[i + 1] = 186 * l;
        d[i + 2] = 70 * l;
      }
      continue;
    }
    if (v === "white") {
      if (red) {
        const k = 0.55 + l * 0.6;
        d[i] = d[i + 1] = d[i + 2] = Math.min(255, k * 255);
      }
      continue;
    }
    if (!red) {
      continue;
    }
    const lift = v >= 35 && v <= 70 ? 0.38 : v < 35 ? 0.12 : 0,
      l0 = l;
    const L2 = Math.min(0.92, l0 + lift * (1 - l0));
    const s2 = dl / (1 - Math.abs(2 * l - 1) || 1),
      h = v,
      C = (1 - Math.abs(2 * L2 - 1)) * Math.min(1, s2),
      X = C * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = L2 - C / 2;
    const [R, G, B] =
      h < 60
        ? [C, X, 0]
        : h < 120
          ? [X, C, 0]
          : h < 180
            ? [0, C, X]
            : h < 240
              ? [0, X, C]
              : h < 300
                ? [X, 0, C]
                : [C, 0, X];
    d[i] = (R + m) * 255;
    d[i + 1] = (G + m) * 255;
    d[i + 2] = (B + m) * 255;
  }
  g.putImageData(id, 0, 0);
  return c;
}
// Race number (front slot): a racing number plate hanging from the barrel on the ball chain of the game's own
// Laika Dog Tags (front7) - the chain is kept, the tags are swapped for the plate
export function drawRaceNumber(n, P) {
  const W = 640,
    H = 384,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (P && P.chain) {
    // the chain only: everything below where the tags hang is cleared
    const ch = document.createElement("canvas");
    ch.width = W;
    ch.height = H;
    const cg = ch.getContext("2d");
    cg.drawImage(P.chain, 0, 0, W, H);
    cg.clearRect(0, 220, 381, H);
    cg.clearRect(392, 220, 9, H);
    cg.clearRect(412, 220, W, H);
    cg.clearRect(381, 229, 11, H);
    cg.clearRect(401, 229, 11, H);
    g.drawImage(ch, 0, 0);
  }
  const t = String(n),
    w = t.length > 2 ? 76 : 66,
    h = 48,
    hx = 387,
    hy = 229,
    a = -0.3;
  const plate = () => {
    g.beginPath();
    g.roundRect(-w / 2, 4, w, h, 8);
  };
  g.save();
  g.translate(hx, hy);
  g.rotate(a);
  g.save();
  g.filter = "blur(4px)";
  g.globalAlpha = 0.45;
  g.translate(5, 7);
  plate();
  g.fillStyle = "#000";
  g.fill();
  g.restore(); // its shadow on the hull
  plate();
  let gr = g.createLinearGradient(-w / 2, 0, w / 2, h);
  gr.addColorStop(0, "#f4f6f8");
  gr.addColorStop(0.5, "#a9afb8");
  gr.addColorStop(1, "#5c626b");
  g.fillStyle = gr;
  g.fill(); // metal edge
  g.beginPath();
  g.roundRect(-w / 2 + 3, 7, w - 6, h - 6, 6);
  g.fillStyle = "#121316";
  g.fill(); // black border
  g.save();
  g.beginPath();
  g.roundRect(-w / 2 + 6, 10, w - 12, h - 12, 4);
  g.clip();
  g.fillStyle = "#f7f7f4";
  g.fillRect(-w / 2, 0, w, h + 10);
  g.fillStyle = "#e0242c";
  g.fillRect(-w / 2, 10, w, 7); // red band
  g.fillStyle = "#121316";
  for (let k = 0; k < Math.ceil(w / 4); k++) {
    g.fillRect(-w / 2 + 6 + k * 4, h + 1 - (k % 2 ? 8 : 4), 4, 4);
  } // chequer strip (two rows)
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font =
    "italic 900 " + (t.length > 2 ? 24 : t.length > 1 ? 28 : 31) + 'px TankTrouble, "Arial Black", Impact, sans-serif';
  g.save();
  g.transform(1, 0, -0.18, 1, 0, 0);
  g.lineWidth = 3;
  g.strokeStyle = "#f7f7f4";
  g.strokeText(t, 2, 31);
  g.fillStyle = "#121316";
  g.fillText(t, 2, 31);
  g.restore();
  gr = g.createLinearGradient(0, 10, 0, h);
  gr.addColorStop(0, "rgba(255,255,255,.35)");
  gr.addColorStop(0.45, "rgba(255,255,255,0)");
  gr.addColorStop(1, "rgba(0,0,0,.12)");
  g.fillStyle = gr;
  g.fillRect(-w / 2, 10, w, h); // sheen
  g.restore();
  g.lineWidth = 2.5;
  g.strokeStyle = "#d9dde2";
  g.beginPath();
  g.arc(0, 2, 4, 0, 7);
  g.stroke();
  g.strokeStyle = "rgba(0,0,0,.35)";
  g.lineWidth = 1;
  g.beginPath();
  g.arc(0, 2, 5.5, 0, 7);
  g.stroke(); // ring for the chain
  g.restore();
  if (P && P.chain) {
    g.strokeStyle = "#d9dde2";
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(406, 229, 3.2, 0, 7);
    g.stroke();
  } // the second strand's ring on the plate
  return c;
}
// Items cut from hand-made pictures (Racing, Graffiti, Shadow, Code Rain): the pictures, where each sits on the tank, and recolours
export const PIC2 = {
  demon: "ttcl-art:024fa7c05806.webp",
  hacker: "ttcl-art:641053b1944b.webp",
  phantom: "ttcl-art:ba406d5604d7.webp",
  dripcrown: "ttcl-art:d62f85ee138d.webp",
  snapback: "ttcl-art:7f566bccebaa.webp",
  spoiler: "ttcl-art:d2a3d41fa89b.webp",
  flag: "ttcl-art:7bc05bea434f.webp",
  trophy: "ttcl-art:c196288daa4e.webp",
  board: "ttcl-art:4e18f37b9392.webp",
  phantomnb: "ttcl-art:b53d4790c80f.webp",
  phantomreg: "ttcl-art:69ef82b476a8.png",
  jester: "ttcl-art:27ee6b5bc053.webp",
  helmet: "ttcl-art:9e0511cbedd3.webp",
  helmetup: "ttcl-art:1ef546a399da.webp",
  phantomhood: "ttcl-art:1834f69aece5.webp",
  phantomhoodnb: "ttcl-art:a05acf97ed1d.webp",
  phantomhoodreg: "ttcl-art:55bc3a29c891.png",
};
export const PIC2_FIT = {
  demon: { s: 0.69825, ax: 0, ay: 0, px: 201.5, py: 63.4 },
  hacker: { s: 0.69825, ax: 0, ay: 0, px: 183.5, py: 76.8 },
  phantom: { s: 0.69825, ax: 0, ay: 0, px: 252.6, py: 93.2 },
  dripcrown: { s: 0.92, ax: 91.0, ay: 116.0, px: 256, py: 186, foot: [256, 180, 56, 12] },
  snapback: { s: 0.95, ax: 86.0, ay: 121.0, px: 262, py: 196, foot: [266, 188, 70, 15] },
  spoiler: { s: 1.0, ax: 101.0, ay: 134.0, px: 205, py: 236, back: true },
  flag: { s: 0.8, ax: 215.0, ay: 142.0, px: 212, py: 230, back: true },
  trophy: { s: 1.6, ax: 27.0, ay: 65.0, px: 275, py: 169, foot: [275, 167, 24, 7] },
  board: { s: 1.0, sx: 1.12, sy: 0.42, ax: 234.6, ay: 75, px: 335, py: 362, back: true },
  jester: { s: 0.69825, ax: 0, ay: 0, px: 204.0, py: 43.3 },
  helmet: { s: 0.69825, ax: 0, ay: 0, px: 174.7, py: 13.2 },
  helmetup: { s: 0.69825, ax: 0, ay: 0, px: 175.1, py: 5.6 },
  phantomhood: { s: 0.69825, ax: 0, ay: 0, px: 190.2, py: 81.9 },
};
export const PIC2_ITEMS = {
  "sh-demon": ["demon", null],
  "ph-black-hood": ["phantomhood", "black|hood|bolt"],
  "ph-black": ["phantom", "black||bolt"],
  "ph-white-hood": ["phantomhood", "white|hood|bolt"],
  "ph-white": ["phantom", "white||bolt"],
  "ph-red-hood": ["phantomhood", "red|hood|bolt"],
  "ph-red": ["phantom", "red||bolt"],
  "ph-chrome-hood": ["phantomhood", "chrome|hood|bolt"],
  "ph-chrome": ["phantom", "chrome||bolt"],
  "ph-black-hood-plain": ["phantomhood", "black|hood|"],
  "ph-black-plain": ["phantom", "black||"],
  "ph-white-hood-plain": ["phantomhood", "white|hood|"],
  "ph-white-plain": ["phantom", "white||"],
  "hk-mask-green": ["hacker", null],
  "hk-mask-red": ["hacker", 0],
  "hk-mask-blue": ["hacker", 205],
  "hk-mask-purple": ["hacker", 275],
  "hk-mask-gold": ["hacker", 48],
  "rc-spoiler-red": ["spoiler", null],
  "rc-spoiler-blue": ["spoiler", 215],
  "rc-spoiler-yellow": ["spoiler", 50],
  "rc-spoiler-green": ["spoiler", 130],
  "rc-spoiler-orange": ["spoiler", 28],
  "rc-spoiler-black": ["spoiler", "blackgold"],
  "rc-flag": ["flag", null],
  "rc-trophy-gold": ["trophy", null],
  "rc-trophy-silver": ["trophy", "silver"],
  "rc-trophy-bronze": ["trophy", "bronze"],
  "gf-crown-gold": ["dripcrown", null],
  "gf-crown-silver": ["dripcrown", "silver"],
  "gf-crown-black": ["dripcrown", "black"],
  "gf-crown-rose": ["dripcrown", "rose"],
  "gf-cap-black": ["snapback", null],
  "gf-cap-white": ["snapback", "#f2f2ee|330"],
  "gf-cap-red": ["snapback", "#b5141c|0x"],
  "gf-cap-blue": ["snapback", "#1e46b0|95"],
  "gf-cans-pink": [null, "#ff2d95|#22e0ff"],
  "gf-cans-yellow": [null, "#ffd400|#7cff1a"],
  "gf-cans-orange": [null, "#ff7a00|#9b4dff"],
  "gf-cans-red": [null, "#e0242c|#2a62d8"],
  "gf-boardback-green": ["board", null],
  "gf-boardback-pink": ["board", 325],
  "gf-boardback-cyan": ["board", 185],
  "mask-jesterplate": ["jester", null],
};
const hsl2rgb = (h, s, l) => {
  const C = (1 - Math.abs(2 * l - 1)) * s,
    X = C * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - C / 2;
  const [r, g, b] =
    h < 60
      ? [C, X, 0]
      : h < 120
        ? [X, C, 0]
        : h < 180
          ? [0, C, X]
          : h < 240
            ? [0, X, C]
            : h < 300
              ? [X, 0, C]
              : [C, 0, X];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// run fn on every pixel: fn(d, i, h, s, l, extra) where h 0..360, s/l 0..1
function recolour2(img, fn, extra) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height),
    d = id.data,
    ex = extra
      ? (() => {
          const e = document.createElement("canvas");
          e.width = c.width;
          e.height = c.height;
          const eg = e.getContext("2d", { willReadFrequently: true });
          eg.drawImage(extra, 0, 0, c.width, c.height);
          return eg.getImageData(0, 0, c.width, c.height).data;
        })()
      : null;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) {
      continue;
    }
    const r = d[i] / 255,
      gg = d[i + 1] / 255,
      b = d[i + 2] / 255,
      mx = Math.max(r, gg, b),
      mn = Math.min(r, gg, b),
      l = (mx + mn) / 2,
      dl = mx - mn;
    let h = 0;
    if (dl > 1e-4) {
      h = mx === r ? 60 * (((gg - b) / dl) % 6) : mx === gg ? 60 * ((b - r) / dl + 2) : 60 * ((r - gg) / dl + 4);
    }
    if (h < 0) {
      h += 360;
    }
    fn(d, i, h, dl < 1e-4 ? 0 : dl / (1 - Math.abs(2 * l - 1)), l, ex ? ex[i] : 0);
  }
  g.putImageData(id, 0, 0);
  return c;
}
const setRGB = (d, i, rgb) => {
  d[i] = rgb[0];
  d[i + 1] = rgb[1];
  d[i + 2] = rgb[2];
};
export function pic2Variant(pic, v, img, extra) {
  if (v == null) {
    return img;
  }
  if (pic === "spoiler") {
    return helmetVariant(img, v);
  }
  if (pic === "hacker" || pic === "board") {
    return recolour2(img, (d, i, h, s, l) => {
      if (h > 75 && h < 165 && s > 0.35) {
        setRGB(
          d,
          i,
          v === "white"
            ? [235 * l * 1.4, 235 * l * 1.4, 235 * l * 1.4].map((x) => Math.min(255, x))
            : hsl2rgb(v, s, Math.min(0.9, l * (v > 35 && v < 70 ? 1.15 : 1))),
        );
      }
    });
  }
  if (pic === "trophy") {
    return recolour2(img, (d, i, h, s, l) => {
      if (s > 0.2 && h > 20 && h < 65) {
        setRGB(
          d,
          i,
          v === "silver" ? [l * 265, l * 268, l * 275].map((x) => Math.min(255, x)) : hsl2rgb(24, s * 0.75, l * 0.85),
        );
      }
    });
  }
  if (pic === "dripcrown") {
    return recolour2(img, (d, i, h, s, l) => {
      if (!(s > 0.25 && h > 22 && h < 52)) {
        return;
      }
      setRGB(
        d,
        i,
        v === "silver"
          ? [l * 260, l * 262, l * 270].map((x) => Math.min(255, x))
          : v === "black"
            ? [l * 70, l * 70, l * 80]
            : hsl2rgb(12, s * 0.55, Math.min(0.92, l * 1.08)),
      );
    });
  }
  if (pic === "bandana") {
    return recolour2(img, (d, i, h, s, l) => {
      if (s > 0.3 && l > 0.25) {
        return;
      } // neon splats stay
      if (v === "camo") {
        const n = Math.sin(i * 0.000731) + Math.sin(i * 0.0021);
        setRGB(
          d,
          i,
          (n > 0.6 ? [70, 84, 50] : n > -0.4 ? [104, 112, 72] : [48, 44, 34]).map((x) => x * (0.5 + l * 1.6)),
        );
        return;
      }
      const [R, G, B] = hexRgb(v),
        k = v === "#f2f2ee" ? 0.62 + l * 1.1 : 0.35 + l * 2.2;
      setRGB(
        d,
        i,
        [R * k, G * k, B * k].map((x) => Math.min(255, x)),
      );
    });
  }
  if (pic === "snapback") {
    const [cap, brim] = v.split("|");
    return recolour2(img, (d, i, h, s, l) => {
      if (h > 55 && h < 95 && s > 0.45 && l > 0.3) {
        setRGB(d, i, brim === "0x" ? [l * 60, l * 60, l * 66] : hsl2rgb(+brim, s, l));
        return;
      } // the brim
      if (s < 0.3 && l < 0.35) {
        const [R, G, B] = hexRgb(cap),
          k = cap === "#f2f2ee" ? 0.62 + l * 1.1 : 0.35 + l * 2.2;
        setRGB(
          d,
          i,
          [R * k, G * k, B * k].map((x) => Math.min(255, x)),
        );
      }
    });
  }
  if (/^phantom/.test(pic)) {
    const [col, , bolt] = v.split("|");
    return recolour2(
      img,
      (d, i, h, s, l, reg) => {
        const r = Math.round(reg / 60); // 1 face, 2 bolt, 3 hood, 4 eyes
        if (r === 3 || r === 0) {
          return;
        }
        if (r === 4) {
          if (col === "white" || col === "chrome") {
            setRGB(d, i, [l * 50, l * 50, l * 56]);
          }
          return;
        }
        if (r === 2 && bolt) {
          if (col === "white") {
            setRGB(
              d,
              i,
              [l * 255, l * 205, l * 95].map((x) => Math.min(255, x)),
            );
          } else if (col === "red") {
            setRGB(d, i, [l * 70, l * 70, l * 76]);
          }
          return;
        }
        setRGB(
          d,
          i,
          col === "white"
            ? [1, 1, 1].map((x) => Math.min(255, (0.45 + l * 1.6) * 255))
            : col === "red"
              ? hsl2rgb(356, 0.85, Math.min(0.85, 0.12 + l * 1.1))
              : col === "chrome"
                ? [1, 1, 1].map(() => Math.min(255, (0.25 + l * 1.5) * 255))
                : [l * 255, l * 255, l * 255],
        );
      },
      extra,
    );
  }
  return img;
}
// spray cans built from the game's own garage can, tinted
export function drawSprayCans(can, shade, cols) {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 384;
  const g = c.getContext("2d");
  const one = (x, y, h, col, tilt) => {
    const w = (h * 26) / 61,
      t = document.createElement("canvas");
    t.width = Math.ceil(w);
    t.height = Math.ceil(h);
    const tg = t.getContext("2d");
    tg.drawImage(can, 0, 0, w, h);
    tg.globalCompositeOperation = "multiply";
    tg.fillStyle = col;
    tg.fillRect(0, 0, w, h);
    tg.globalCompositeOperation = "destination-in";
    tg.drawImage(can, 0, 0, w, h);
    tg.globalCompositeOperation = "source-over";
    if (shade) {
      tg.drawImage(shade, 0, 0, shade.width / 3, shade.height, 0, 0, w, h);
    }
    tg.globalCompositeOperation = "source-atop";
    tg.fillStyle = col;
    for (let k = 0; k < 4; k++) {
      const dx = w * (0.2 + k * 0.2),
        dl = h * (0.12 + ((k * 37) % 5) * 0.05);
      tg.fillRect(dx - 2, h * 0.2, 4, dl);
      tg.beginPath();
      tg.arc(dx, h * 0.2 + dl, 3, 0, 7);
      tg.fill();
    }
    g.save();
    g.translate(x, y);
    g.rotate(tilt);
    g.save();
    g.filter = "blur(3px)";
    g.globalAlpha = 0.35;
    g.drawImage(t, 3 - w / 2, 4 - h, w, h);
    g.restore();
    g.drawImage(t, -w / 2, -h, w, h);
    g.restore();
  };
  one(190, 244, 104, cols[0], -0.12);
  one(224, 248, 110, cols[1], -0.06);
  g.strokeStyle = "#1a1a1e";
  g.lineWidth = 9;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(162, 212);
  g.quadraticCurveTo(206, 228, 254, 214);
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,.18)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(162, 209);
  g.quadraticCurveTo(206, 225, 254, 211);
  g.stroke();
  return c;
}
// put a picture on the tank frame: anchor (ax, ay) of the picture at (px, py); lx = the game barrel shows in front from there
export function drawPic2(img, f, P, key) {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 384;
  const g = c.getContext("2d");
  const art = document.createElement("canvas");
  art.width = 640;
  art.height = 384;
  const ag = art.getContext("2d");
  ag.imageSmoothingQuality = "high";
  const sx = f.sx || f.s,
    sy = f.sy || f.s;
  if (/^gf-boardback-/.test(key)) {
    ag.save();
    ag.translate(178, 190);
    ag.rotate(-1.2);
    ag.drawImage(img, -img.width * 0.27, -img.height * 0.27, img.width * 0.54, img.height * 0.54);
    ag.restore();
  } else {
    for (const [ax, ay, px, py] of f.at || [[f.ax, f.ay, f.px, f.py]]) {
      ag.save();
      ag.translate(px, py);
      if (f.rot) {
        ag.rotate(f.rot);
      }
      ag.drawImage(img, -ax * sx, -ay * sy, img.width * sx, img.height * sy);
      ag.restore();
    }
  }
  if (f.lx != null && P.barrel) {
    const fr = document.createElement("canvas");
    fr.width = 640;
    fr.height = 384;
    const fg = fr.getContext("2d");
    fg.drawImage(P.barrel, 0, 0, 640, 384);
    fg.globalCompositeOperation = "destination-in";
    const gr = fg.createLinearGradient(f.lx - 5, 0, f.lx + 5, 0);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(1, "#000");
    fg.fillStyle = gr;
    fg.fillRect(0, 0, 640, 384);
    ag.globalCompositeOperation = "destination-out";
    ag.drawImage(fr, 0, 0);
    ag.globalCompositeOperation = "source-over";
  }
  if (f.clip && P.turret) {
    // wrapped round the dome: keep it on the dome (a little wider), and the knot sticking out at the back
    const k = document.createElement("canvas");
    k.width = 640;
    k.height = 384;
    const kg = k.getContext("2d");
    kg.filter = "blur(3px)";
    kg.drawImage(P.turret, 0, 0, 640, 384);
    kg.drawImage(P.turret, 0, 0, 640, 384);
    kg.filter = "none";
    kg.fillRect(0, 0, 232, 200);
    ag.globalCompositeOperation = "destination-in";
    ag.drawImage(k, 0, 0);
    ag.globalCompositeOperation = "source-over";
  }
  if (/^gf-board-/.test(key)) {
    ag.globalCompositeOperation = "destination-out";
    for (const k of ["base", "leftTread", "rightTread"]) {
      if (P[k]) {
        ag.drawImage(P[k], 0, 0, 640, 384);
      }
    }
    ag.globalCompositeOperation = "source-over";
  } // under the tank
  if (f.foot && P.turret) {
    // a soft contact shadow on the dome where it sits
    const sh = document.createElement("canvas");
    sh.width = 640;
    sh.height = 384;
    const sg = sh.getContext("2d");
    const [fx, fy, rx, ry] = f.foot;
    sg.filter = "blur(6px)";
    sg.fillStyle = "rgba(0,0,0,.55)";
    sg.beginPath();
    sg.ellipse(fx + 3, fy + 4, rx, ry, -0.05, 0, 7);
    sg.fill();
    sg.filter = "none";
    sg.globalCompositeOperation = "destination-in";
    sg.drawImage(P.turret, 0, 0, 640, 384);
    g.drawImage(sh, 0, 0);
  }
  g.save();
  g.filter = "blur(3px)";
  g.globalAlpha = 0.35;
  g.drawImage(art, 2, 5);
  g.restore();
  g.drawImage(art, 0, 0);
  return c;
}
export function drawMaskPic(img, o, P) {
  const W = 640,
    H = 384,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const cv = () => {
    const k = document.createElement("canvas");
    k.width = W;
    k.height = H;
    return k;
  };
  const { s, D, cx, my, lx, rx } = o,
    mx = 322,
    my0 = 182,
    k = img.width / o.base,
    IH = img.height / k;
  if (P.turret && o.cloth) {
    // optional hood (not used now): the dome's outline a little bigger, cloth with folds and a rope round the bottom
    const [c0, c1, c2, rope] = o.cloth;
    const hc = cv(),
      hg = hc.getContext("2d", { willReadFrequently: true });
    hg.filter = "blur(3px)";
    hg.drawImage(P.turret, 0, 0, W, H);
    hg.drawImage(P.turret, 0, 0, W, H);
    hg.filter = "none";
    const id = hg.getImageData(0, 0, W, H),
      d = id.data;
    for (let i = 3; i < d.length; i += 4) {
      d[i] = d[i] > 30 ? 255 : 0;
    }
    hg.putImageData(id, 0, 0);
    if (P.barrel) {
      hg.globalCompositeOperation = "destination-out";
      hg.drawImage(P.barrel, 0, 0, W, H);
    }
    hg.globalCompositeOperation = "source-in";
    const gr = hg.createLinearGradient(230, 110, 300, 230);
    gr.addColorStop(0, c0);
    gr.addColorStop(0.55, c1);
    gr.addColorStop(1, c2);
    hg.fillStyle = gr;
    hg.fillRect(0, 0, W, H);
    hg.globalCompositeOperation = "source-atop";
    hg.strokeStyle = "rgba(0,0,0,.18)";
    hg.lineWidth = 2;
    for (let x = 200; x < 380; x += 22) {
      hg.beginPath();
      hg.moveTo(x, 120);
      hg.quadraticCurveTo(x + 6, 170, x - 4, 230);
      hg.stroke();
    }
    hg.globalCompositeOperation = "source-over";
    hg.lineCap = "round";
    hg.strokeStyle = "rgba(0,0,0,.35)";
    hg.lineWidth = 8;
    hg.beginPath();
    hg.moveTo(192, 224);
    hg.quadraticCurveTo(290, 214, 372, 212);
    hg.stroke();
    hg.strokeStyle = rope;
    hg.lineWidth = 6;
    hg.beginPath();
    hg.moveTo(192, 222);
    hg.quadraticCurveTo(290, 212, 372, 210);
    hg.stroke();
    hg.strokeStyle = "rgba(0,0,0,.3)";
    hg.lineWidth = 1;
    for (let x = 196; x < 370; x += 7) {
      hg.beginPath();
      hg.moveTo(x, 226 - (x - 192) * 0.07);
      hg.lineTo(x + 4, 218 - (x - 192) * 0.07);
      hg.stroke();
    }
    g.drawImage(hc, 0, 0);
  }
  const im = document.createElement("canvas");
  im.width = img.width;
  im.height = Math.round((IH + D) * k);
  const ig = im.getContext("2d"); // the jaw opened: the mouth line stretched D taller
  ig.drawImage(img, 0, 0, img.width, my * k, 0, 0, img.width, my * k);
  ig.drawImage(img, 0, my * k, img.width, k, 0, my * k, img.width, D * k);
  ig.drawImage(img, 0, my * k, img.width, (IH - my) * k, 0, (my + D) * k, img.width, (IH - my) * k);
  ig.save();
  ig.scale(k, k);
  ig.globalCompositeOperation = "source-atop";
  ig.beginPath();
  ig.moveTo(lx, my);
  ig.quadraticCurveTo(cx, my - 3, rx, my);
  ig.lineTo(rx, my + D);
  ig.quadraticCurveTo(cx, my + D + 3, lx, my + D);
  ig.closePath();
  const mg = ig.createLinearGradient(0, my, 0, my + D);
  mg.addColorStop(0, "#1a0508");
  mg.addColorStop(0.5, "#3a0c14");
  mg.addColorStop(1, "#1a0508");
  ig.fillStyle = mg;
  ig.fill();
  ig.restore();
  const ox = mx - cx * s,
    oy = my0 - (my + D / 2) * s;
  const art = cv(),
    ag = art.getContext("2d");
  ag.imageSmoothingQuality = "high";
  if (o.under && P.turret) {
    // a shell under the picture in the dome's shape (a little bigger), so no turret shows round the edges
    const sh = cv(),
      sg = sh.getContext("2d");
    sg.filter = "blur(3px)";
    sg.drawImage(P.turret, 0, 0, W, H);
    sg.drawImage(P.turret, 0, 0, W, H);
    sg.filter = "none";
    const id = sg.getImageData(0, 0, W, H),
      d = id.data;
    for (let i = 3; i < d.length; i += 4) {
      d[i] = d[i] > 30 ? 255 : 0;
    }
    sg.putImageData(id, 0, 0);
    sg.globalCompositeOperation = "source-in";
    const gr = sg.createLinearGradient(220, 120, 300, 235);
    gr.addColorStop(0, o.under[0]);
    gr.addColorStop(1, o.under[1]);
    sg.fillStyle = gr;
    sg.fillRect(0, 0, W, H);
    ag.drawImage(sh, 0, 0);
  }
  ag.drawImage(im, ox, oy, (im.width * s) / k, (im.height * s) / k);
  if (P.barrel) {
    const xL = ox + lx * s + 4,
      front = cv(),
      fg = front.getContext("2d");
    fg.drawImage(P.barrel, 0, 0, W, H);
    fg.globalCompositeOperation = "destination-in";
    const g2 = fg.createLinearGradient(xL - 5, 0, xL + 5, 0);
    g2.addColorStop(0, "rgba(0,0,0,0)");
    g2.addColorStop(1, "#000");
    fg.fillStyle = g2;
    fg.fillRect(0, 0, W, H);
    ag.globalCompositeOperation = "destination-out";
    ag.drawImage(front, 0, 0);
    ag.globalCompositeOperation = "source-over";
    const sh = cv(),
      sg = sh.getContext("2d");
    sg.filter = "blur(4px)";
    sg.drawImage(front, 0, 0);
    sg.filter = "none";
    sg.globalCompositeOperation = "source-in";
    sg.fillStyle = "rgba(25,5,20,.85)";
    sg.fillRect(0, 0, W, H);
    sg.globalCompositeOperation = "destination-in";
    sg.drawImage(art, 0, 0);
    ag.drawImage(sh, 0, 0);
  }
  g.save();
  g.filter = "blur(4px)";
  g.globalAlpha = 0.4;
  g.drawImage(art, 3, 6);
  g.restore();
  g.drawImage(art, 0, 0);
  return c;
}
// Racing / Graffiti box pictures: the Standard box recoloured, with a chequered band or spray splats on it
export const themedReq = {};
// What's inside each themed box, so you can tell at a glance: its best-known item rising out of the open box, and a
// small sticker of it on the closed one (the item pictures are the ones the box gives you)
const BOX_EMBLEM = {
  deepsea: "ds-ring",
  sweets: "cn-cupcake",
  arcade: "ac-crown",
  safari: "sf-hat",
  steampunk: "sm-tophat",
  kingdom: "kg-banner",
  wildwest: "ww-hat",
  tropical: "tp-palm",
  mech: "mc-radar",
  casino: "cs-dice",
  graffiti: "gf-bandana-neonblack",
  streetwear: "st-sneakers",
};
// light pouring out of the open box, like the game's own boxes, in the box's colour
const BOX_GLOW = {
  deepsea: "120,240,255",
  sweets: "255,150,210",
  arcade: "255,110,240",
  safari: "255,210,120",
  steampunk: "255,180,80",
  kingdom: "255,226,120",
  wildwest: "255,206,110",
  tropical: "255,224,100",
  mech: "120,216,255",
  casino: "255,226,120",
  graffiti: "200,255,40",
  racing: "255,240,200",
  eyewear: "140,230,255",
  elements: "255,190,90",
  materials: "255,240,190",
  holo: "230,190,255",
  hall: "255,226,120",
  agent: "255,240,210",
  ninja: "200,210,255",
  arsenal: "220,240,150",
};
function boxGlow(g, W, kind) {
  const col = BOX_GLOW[kind];
  if (!col) {
    return;
  }
  const u = W / 560,
    cx = 418 * u,
    cy = 176 * u;
  g.save();
  g.globalCompositeOperation = "lighter";
  const gl = g.createRadialGradient(cx, cy, 2 * u, cx, cy, 70 * u);
  gl.addColorStop(0, "rgba(" + col + ",.75)");
  gl.addColorStop(1, "rgba(" + col + ",0)");
  g.fillStyle = gl;
  g.beginPath();
  g.arc(cx, cy, 70 * u, 0, 7);
  g.fill();
  for (let k = 0; k < 9; k++) {
    const x = (372 + k * 11) * u,
      top = (60 + ((k * 37) % 23)) * u,
      w = (5 + (k % 3) * 2) * u,
      lean = (k - 4) * 3 * u;
    const gr = g.createLinearGradient(0, cy, 0, top);
    gr.addColorStop(0, "rgba(" + col + "," + (0.55 - (k % 2) * 0.15) + ")");
    gr.addColorStop(1, "rgba(" + col + ",0)");
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(x - w / 2, cy);
    g.lineTo(x + w / 2, cy);
    g.lineTo(x + w / 2 + lean, top);
    g.lineTo(x - w / 2 + lean, top);
    g.closePath();
    g.fill();
  }
  g.restore();
}
export async function boxEmblem(g, W, kind) {
  boxGlow(g, W, kind);
  const k = BOX_EMBLEM[kind],
    url = k && (V1_PICS[k] || GF_BANDANA_PICS[k]);
  if (!url) {
    return;
  }
  const im = await loadImg(url);
  if (!im) {
    return;
  }
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 384;
  const cg = c.getContext("2d", { willReadFrequently: true });
  cg.drawImage(im, 0, 0, 640, 384);
  const d = cg.getImageData(0, 0, 640, 384).data,
    GW = 160,
    GH = 96,
    cell = new Uint8Array(GW * GH),
    lab = new Int32Array(GW * GH);
  for (let y = 0; y < 384; y++) {
    for (let x = 0; x < 640; x++) {
      if (d[(y * 640 + x) * 4 + 3] > 120) {
        cell[(y >> 2) * GW + (x >> 2)] = 1;
      }
    }
  }
  const comps = []; // the item's own pieces: stray specks round it (bits of a redrawn tank) are left out
  for (let i = 0; i < GW * GH; i++) {
    if (cell[i] && !lab[i]) {
      const n = comps.length + 1,
        st = [i];
      lab[i] = n;
      let area = 0,
        a0 = GW,
        b0 = GH,
        a1 = 0,
        b1 = 0;
      while (st.length) {
        const j = st.pop(),
          x = j % GW,
          y = (j / GW) | 0;
        area++;
        if (x < a0) {
          a0 = x;
        }
        if (x > a1) {
          a1 = x;
        }
        if (y < b0) {
          b0 = y;
        }
        if (y > b1) {
          b1 = y;
        }
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, -1],
          [1, -1],
          [-1, 1],
        ]) {
          const xx = x + dx,
            yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) {
            continue;
          }
          const cellIndex = yy * GW + xx;
          if (cell[cellIndex] && !lab[cellIndex]) {
            lab[cellIndex] = n;
            st.push(cellIndex);
          }
        }
      }
      comps.push({ area, a0, b0, a1, b1 });
    }
  }
  if (!comps.length) {
    return;
  }
  const big = Math.max(...comps.map((component) => component.area)),
    keep = comps.filter((component) => component.area >= big * 0.2);
  const x0 = Math.min(...keep.map((component) => component.a0)) * 4,
    y0 = Math.min(...keep.map((component) => component.b0)) * 4,
    x1 = Math.max(...keep.map((component) => component.a1)) * 4 + 3,
    y1 = Math.max(...keep.map((component) => component.b1)) * 4 + 3;
  const bw = x1 - x0 + 1,
    bh = y1 - y0 + 1,
    u = W / 560;
  const wh = document.createElement("canvas");
  wh.width = 640;
  wh.height = 384;
  const wg = wh.getContext("2d");
  wg.drawImage(c, 0, 0);
  wg.globalCompositeOperation = "source-in";
  wg.fillStyle = "#fff";
  wg.fillRect(0, 0, 640, 384);
  const put = (cx, bottom, mw, mh, sticker) => {
    const sc = Math.min(mw / bw, mh / bh) * u,
      w = bw * sc,
      h = bh * sc,
      x = cx * u - w / 2,
      y = bottom * u - h;
    g.save();
    g.globalCompositeOperation = "source-over";
    if (sticker) {
      const o = 2.2 * u;
      for (let a = 0; a < 8; a++) {
        g.drawImage(wh, x0, y0, bw, bh, x + Math.cos(a * 0.785) * o, y + Math.sin(a * 0.785) * o, w, h);
      }
    } else {
      g.shadowColor = "rgba(0,0,0,.45)";
      g.shadowBlur = 6 * u;
      g.shadowOffsetY = 2 * u;
    }
    g.drawImage(c, x0, y0, bw, bh, x, y, w, h);
    g.restore();
  };
  put(184, 263, 44, 38, true); // a sticker low on the closed box's front
}
// Drawing kit for add-on items (640x384 tank picture; the tank faces right, dome centre ~(279,150), back ~x 120-220,
// front plate ~x 330-420 / y 200-260, barrel tip ~x 520-600 / y 150-170). Every item gets a real shadow:
//   lin(x0,y0,x1,y1,[[p,col],..]) gradient · shade(pathFn, dx, dy, a, blur) soft shadow of a path · foot(x,y,rx,ry) contact shadow on the dome
//   drop(img, dx, dy, a, blur) soft shadow of a picture · reskin(img, fn(d,i,h,s,l)) recoloured copy of a game picture (640x384)
//   put(img) draws a picture with its drop shadow · gloss(pathFn, a) top-left highlight inside a path · ink outline colour
export function itemKit(g, P) {
  const W = 640,
    H = 384,
    ink = "#14161c";
  const lin = (x0, y0, x1, y1, st) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    st.forEach(([p, col]) => gr.addColorStop(p, col));
    return gr;
  };
  const rad = (x, y, r0, r1, st) => {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    st.forEach(([p, col]) => gr.addColorStop(p, col));
    return gr;
  };
  const shade = (path, dx = 3, dy = 6, a = 0.35, b = 4) => {
    g.save();
    g.filter = "blur(" + b + "px)";
    g.globalAlpha = a;
    g.translate(dx, dy);
    path(g);
    g.fillStyle = "#000";
    g.fill();
    g.restore();
  };
  const foot = (x, y, rx, ry) => {
    if (!P || !P.turret) {
      return;
    }
    const s = document.createElement("canvas");
    s.width = W;
    s.height = H;
    const sg = s.getContext("2d");
    sg.filter = "blur(5px)";
    sg.fillStyle = "rgba(0,0,0,.5)";
    sg.beginPath();
    sg.ellipse(x + 3, y + 4, rx, ry, 0, 0, 7);
    sg.fill();
    sg.filter = "none";
    sg.globalCompositeOperation = "destination-in";
    sg.drawImage(P.turret, 0, 0, W, H);
    g.drawImage(s, 0, 0);
  };
  const drop = (img, dx = 4, dy = 7, a = 0.4, b = 4) => {
    const s = document.createElement("canvas");
    s.width = W;
    s.height = H;
    const sg = s.getContext("2d");
    sg.drawImage(img, 0, 0, W, H);
    sg.globalCompositeOperation = "source-in";
    sg.fillStyle = "#000";
    sg.fillRect(0, 0, W, H);
    g.save();
    g.filter = "blur(" + b + "px)";
    g.globalAlpha = a;
    g.drawImage(s, dx, dy);
    g.restore();
  };
  const reskin = (img, fn) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    c.getContext("2d").drawImage(img, 0, 0, W, H);
    return recolour2(c, fn);
  };
  const put = (img, dx = 4, dy = 7, a = 0.4, b = 4) => {
    drop(img, dx, dy, a, b);
    g.drawImage(img, 0, 0, W, H);
  };
  const gloss = (path, a = 0.35, dx = 5, dy = 7) => {
    const o = document.createElement("canvas");
    o.width = W;
    o.height = H;
    const og = o.getContext("2d");
    path(og);
    og.fillStyle = "rgba(255,255,255," + a + ")";
    og.fill();
    og.globalCompositeOperation = "destination-out";
    og.translate(dx, dy);
    path(og);
    og.fillStyle = "#000";
    og.fill();
    g.drawImage(o, 0, 0);
  };
  const hash = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  return { W, H, ink, lin, rad, shade, foot, drop, reskin, put, gloss, hash, hsl2rgb, setRGB, P };
}
// Deep Sea, Sweet Shop and Arcade items, drawn in the 640x384 tank picture. P = the game's tank parts.
export function drawThemeItem(key, P) {
  const W = 640,
    H = 384,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const lin = (x0, y0, x1, y1, st) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    st.forEach(([p, col]) => gr.addColorStop(p, col));
    return gr;
  };
  const shade = (path, dx = 3, dy = 6, a = 0.35, b = 4) => {
    g.save();
    g.filter = "blur(" + b + "px)";
    g.globalAlpha = a;
    g.translate(dx, dy);
    path();
    g.fillStyle = "#000";
    g.fill();
    g.restore();
  };
  const foot = (x, y, rx, ry) => {
    if (!P.turret) {
      return;
    }
    const s = document.createElement("canvas");
    s.width = W;
    s.height = H;
    const sg = s.getContext("2d");
    sg.filter = "blur(5px)";
    sg.fillStyle = "rgba(0,0,0,.5)";
    sg.beginPath();
    sg.ellipse(x + 3, y + 4, rx, ry, 0, 0, 7);
    sg.fill();
    sg.filter = "none";
    sg.globalCompositeOperation = "destination-in";
    sg.drawImage(P.turret, 0, 0, W, H);
    g.drawImage(s, 0, 0);
  };
  const ink = "#14161c";
  if (key === "ds-fin") {
    // a shark fin standing on the dome
    const fin = () => {
      g.beginPath();
      g.moveTo(240, 150);
      g.bezierCurveTo(250, 120, 262, 86, 300, 60);
      g.bezierCurveTo(296, 92, 298, 124, 318, 148);
      g.quadraticCurveTo(280, 140, 240, 150);
      g.closePath();
    };
    foot(279, 147, 40, 9);
    shade(fin);
    fin();
    g.fillStyle = lin(250, 70, 312, 150, [
      [0, "#9aa9b8"],
      [0.5, "#5f7286"],
      [1, "#33404e"],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.save();
    fin();
    g.clip();
    g.fillStyle = "rgba(255,255,255,.25)";
    g.beginPath();
    g.moveTo(250, 146);
    g.bezierCurveTo(262, 110, 274, 88, 296, 66);
    g.lineTo(290, 74);
    g.bezierCurveTo(272, 100, 264, 124, 258, 146);
    g.fill();
    g.fillStyle = "rgba(240,248,255,.8)";
    g.beginPath();
    g.moveTo(240, 150);
    g.quadraticCurveTo(280, 136, 318, 148);
    g.lineTo(318, 152);
    g.lineTo(240, 152);
    g.fill();
    g.restore();
  } else if (key === "ds-anchor") {
    // a ship's anchor behind the tank, leaning
    g.save();
    g.translate(176, 150);
    g.rotate(-0.28);
    const draw = (col, w) => {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(0, -78);
      g.lineTo(0, 62);
      g.stroke();
      g.beginPath();
      g.moveTo(-26, -52);
      g.lineTo(26, -52);
      g.stroke();
      g.beginPath();
      g.arc(0, 18, 46, 0.25, Math.PI - 0.25);
      g.stroke();
      g.beginPath();
      g.arc(0, -92, 13, 0, 7);
      g.stroke();
    };
    g.save();
    g.translate(4, 8);
    g.filter = "blur(4px)";
    g.globalAlpha = 0.35;
    draw("#000", 13);
    g.restore();
    draw(ink, 15);
    draw(
      lin(-40, -90, 40, 70, [
        [0, "#9aa3ad"],
        [0.5, "#4d5560"],
        [1, "#2a2f36"],
      ]),
      10,
    );
    for (const s of [-1, 1]) {
      g.fillStyle = ink;
      g.beginPath();
      g.moveTo(s * 44, 34);
      g.lineTo(s * 58, 12);
      g.lineTo(s * 30, 26);
      g.closePath();
      g.fill();
      g.fillStyle = "#6a737e";
      g.beginPath();
      g.moveTo(s * 43, 31);
      g.lineTo(s * 53, 15);
      g.lineTo(s * 33, 25);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = "rgba(255,255,255,.35)";
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(-2, -70);
    g.lineTo(-2, 50);
    g.stroke();
    g.restore();
  } else if (key === "ds-ring") {
    // a red-and-white life ring hung on the back
    const cx = 166,
      cy = 196,
      R = 50,
      r = 26;
    g.save();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.35;
    g.beginPath();
    g.ellipse(cx + 4, cy + 8, R, R * 0.92, -0.2, 0, 7);
    g.ellipse(cx + 4, cy + 8, r, r * 0.92, -0.2, 0, 7, true);
    g.fillStyle = "#000";
    g.fill("evenodd");
    g.restore();
    for (let k = 0; k < 8; k++) {
      g.fillStyle = k % 2 ? "#f4f4f2" : "#e0242c";
      g.beginPath();
      g.ellipse(cx, cy, R, R * 0.92, -0.2, (k * Math.PI) / 4, ((k + 1) * Math.PI) / 4);
      g.ellipse(cx, cy, r, r * 0.92, -0.2, ((k + 1) * Math.PI) / 4, (k * Math.PI) / 4, true);
      g.closePath();
      g.fill();
    }
    const sh = g.createRadialGradient(cx - 18, cy - 20, 6, cx, cy, R);
    sh.addColorStop(0, "rgba(255,255,255,.35)");
    sh.addColorStop(0.6, "rgba(255,255,255,0)");
    sh.addColorStop(1, "rgba(0,0,0,.3)");
    g.fillStyle = sh;
    g.beginPath();
    g.ellipse(cx, cy, R, R * 0.92, -0.2, 0, 7);
    g.ellipse(cx, cy, r, r * 0.92, -0.2, 0, 7, true);
    g.fill("evenodd");
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.beginPath();
    g.ellipse(cx, cy, R, R * 0.92, -0.2, 0, 7);
    g.stroke();
    g.beginPath();
    g.ellipse(cx, cy, r, r * 0.92, -0.2, 0, 7);
    g.stroke();
    g.strokeStyle = "#e8d9a8";
    g.lineWidth = 3;
    for (const a of [0.6, 2.2, 3.8, 5.4]) {
      g.beginPath();
      g.arc(cx + Math.cos(a) * 38, cy + Math.sin(a) * 35, 14, a - 0.8, a + 0.8);
      g.stroke();
    } // rope
  } else if (key === "cn-cupcake") {
    // a cupcake hat: pleated wrapper, swirl of frosting, sprinkles and a cherry
    const cx = 279,
      by = 152;
    foot(cx, by - 2, 42, 9);
    const wrap = () => {
      g.beginPath();
      g.moveTo(cx - 40, by - 34);
      g.lineTo(cx + 40, by - 34);
      g.lineTo(cx + 31, by);
      g.quadraticCurveTo(cx, by + 6, cx - 31, by);
      g.closePath();
    };
    shade(wrap);
    wrap();
    g.fillStyle = lin(cx - 40, 0, cx + 40, 0, [
      [0, "#2fb8c8"],
      [0.5, "#7ee6ef"],
      [1, "#1f8a98"],
    ]);
    g.fill();
    g.save();
    wrap();
    g.clip();
    g.strokeStyle = "rgba(10,60,70,.45)";
    g.lineWidth = 2;
    for (let k = -5; k <= 5; k++) {
      g.beginPath();
      g.moveTo(cx + k * 8, by - 34);
      g.lineTo(cx + k * 6.4, by + 4);
      g.stroke();
    }
    g.restore();
    wrap();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    const swirl = [
      [cx, by - 44, 46, 16],
      [cx - 2, by - 60, 38, 14],
      [cx + 1, by - 74, 28, 12],
      [cx, by - 86, 16, 10],
    ];
    for (const [x, y, rx, ry] of swirl) {
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, 7);
      g.fillStyle = lin(0, y - ry, 0, y + ry, [
        [0, "#ffe3f0"],
        [0.6, "#ff9fcf"],
        [1, "#e2669f"],
      ]);
      g.fill();
      g.strokeStyle = ink;
      g.lineWidth = 2;
      g.stroke();
    }
    const cols = ["#ff3d7f", "#2fc6ff", "#ffe14d", "#6ee86b", "#ffffff", "#a66bff"];
    for (let k = 0; k < 18; k++) {
      const a = k * 2.4,
        rr = 8 + (k % 5) * 6;
      g.save();
      g.translate(cx + Math.cos(a) * rr * 1.4, by - 50 - (k % 4) * 10 + Math.sin(a) * 5);
      g.rotate(a);
      g.fillStyle = cols[k % 6];
      g.fillRect(-3.5, -1.2, 7, 2.4);
      g.restore();
    }
    g.beginPath();
    g.arc(cx + 2, by - 102, 9, 0, 7);
    g.fillStyle = lin(0, by - 110, 0, by - 94, [
      [0, "#ff6a6a"],
      [1, "#b0101a"],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = "#3a6a1a";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx + 3, by - 110);
    g.quadraticCurveTo(cx + 10, by - 124, cx + 18, by - 126);
    g.stroke();
    g.fillStyle = "rgba(255,255,255,.7)";
    g.beginPath();
    g.arc(cx - 1, by - 105, 2.5, 0, 7);
    g.fill();
  } else if (key === "cn-lolly" || key === "cn-cane") {
    // a giant swirl lollipop / a candy cane on the back
    if (key === "cn-lolly") {
      g.save();
      g.filter = "blur(4px)";
      g.globalAlpha = 0.3;
      g.fillStyle = "#000";
      g.beginPath();
      g.arc(158, 110, 44, 0, 7);
      g.fill();
      g.restore();
      g.strokeStyle = ink;
      g.lineWidth = 11;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(196, 236);
      g.lineTo(162, 128);
      g.stroke();
      g.strokeStyle = "#f4f1ea";
      g.lineWidth = 7;
      g.stroke();
      g.beginPath();
      g.arc(156, 104, 44, 0, 7);
      g.fillStyle = "#ffffff";
      g.fill();
      g.save();
      g.clip();
      const cols = ["#ff3d7f", "#ffe14d", "#2fc6ff", "#6ee86b"];
      for (let k = 0; k < 4; k++) {
        g.strokeStyle = cols[k];
        g.lineWidth = 9;
        g.beginPath();
        for (let t = 0; t < 1; t += 0.01) {
          const a = t * Math.PI * 3 + (k * Math.PI) / 2,
            rr = t * 46;
          g.lineTo(156 + Math.cos(a) * rr, 104 + Math.sin(a) * rr);
        }
        g.stroke();
      }
      const sh = g.createRadialGradient(140, 86, 4, 156, 104, 46);
      sh.addColorStop(0, "rgba(255,255,255,.6)");
      sh.addColorStop(0.5, "rgba(255,255,255,0)");
      sh.addColorStop(1, "rgba(0,0,0,.25)");
      g.fillStyle = sh;
      g.fillRect(100, 50, 120, 120);
      g.restore();
      g.strokeStyle = ink;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(156, 104, 44, 0, 7);
      g.stroke();
    } else {
      const path = () => {
        g.beginPath();
        g.moveTo(198, 236);
        g.lineTo(168, 110);
        g.arc(146, 104, 22, -0.25, Math.PI + 0.35, true);
      };
      g.save();
      g.translate(4, 7);
      g.filter = "blur(4px)";
      g.globalAlpha = 0.3;
      path();
      g.strokeStyle = "#000";
      g.lineWidth = 18;
      g.stroke();
      g.restore();
      path();
      g.lineCap = "round";
      g.strokeStyle = ink;
      g.lineWidth = 20;
      g.stroke();
      g.strokeStyle = "#ffffff";
      g.lineWidth = 15;
      g.stroke();
      g.save();
      path();
      g.strokeStyle = "#e0202f";
      g.lineWidth = 15;
      g.setLineDash([9, 9]);
      g.stroke();
      g.restore();
      path();
      g.strokeStyle = "rgba(255,255,255,.4)";
      g.lineWidth = 4;
      g.setLineDash([]);
      g.stroke();
    }
  } else if (key === "ac-crown" || key === "ac-shades") {
    // pixel-art crown on the dome / pixel shades over the dome's front
    const q = 8,
      px = (ox, oy, rows, cols) =>
        rows.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            if (cols[ch]) {
              g.fillStyle = cols[ch];
              g.fillRect(ox + x * q, oy + y * q, q, q);
            }
          }),
        );
    if (key === "ac-crown") {
      foot(279, 147, 38, 8);
      const rows = [
        "K..K..K..K..K",
        "KYK.KYK.KYK.K",
        "KYYKYYYKYYYKK",
        "KYYYYRYYYBYYK",
        "KYYYYYYYYYYYK",
        "KOOOOOOOOOOOK",
        "KKKKKKKKKKKKK",
      ];
      const cols = { K: ink, Y: "#ffd400", O: "#e09a00", R: "#ff2d55", B: "#2fc6ff" };
      g.save();
      g.filter = "blur(3px)";
      g.globalAlpha = 0.35;
      g.fillStyle = "#000";
      g.fillRect(228 + 3, 98 + 6, 13 * q, 7 * q);
      g.restore();
      px(228, 98, rows, cols);
      g.fillStyle = "rgba(255,255,255,.55)";
      g.fillRect(228 + q, 98 + 3 * q, q, q * 2);
    } else {
      const rows = [
        "KKKKKKKKKKKKKKKKK",
        "KKWWBBBKKKWWBBBKK",
        ".KWBBBBK.KWBBBBK.",
        ".KBBBBBK.KBBBBBK.",
        "..KKKKK...KKKKK..",
      ];
      g.save();
      g.translate(250, 146);
      g.rotate(-0.14);
      g.save();
      g.filter = "blur(3px)";
      g.globalAlpha = 0.35;
      g.fillStyle = "#000";
      g.fillRect(3, 6, 17 * 7, 5 * 7);
      g.restore();
      const q2 = 7;
      rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          const col = { K: ink, W: "#ffffff", B: "#1a1f3a" }[ch];
          if (col) {
            g.fillStyle = col;
            g.fillRect(x * q2, y * q2, q2, q2);
          }
        }),
      );
      g.restore();
    }
  } else if (key === "ac-joystick") {
    // an arcade joystick on the back
    const bx = 150,
      by = 186;
    g.translate(150, 200);
    g.scale(1.5, 1.5);
    g.translate(-150, -200);
    g.save();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.35;
    g.fillStyle = "#000";
    g.fillRect(bx - 36 + 4, by + 6, 76, 34);
    g.restore();
    g.fillStyle = ink;
    g.beginPath();
    g.roundRect(bx - 38, by - 2, 80, 38, 6);
    g.fill();
    g.fillStyle = lin(0, by, 0, by + 34, [
      [0, "#3a2f6a"],
      [1, "#1a1440"],
    ]);
    g.beginPath();
    g.roundRect(bx - 35, by + 1, 74, 32, 4);
    g.fill();
    g.fillStyle = "#ff2bd6";
    g.fillRect(bx - 35, by + 1, 74, 5);
    for (const [x, col] of [
      [bx + 16, "#00e5ff"],
      [bx + 30, "#fff200"],
    ]) {
      g.beginPath();
      g.ellipse(x, by + 18, 6, 4, 0, 0, 7);
      g.fillStyle = col;
      g.fill();
      g.strokeStyle = ink;
      g.lineWidth = 1.5;
      g.stroke();
    }
    g.strokeStyle = ink;
    g.lineWidth = 9;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(bx - 14, by + 14);
    g.lineTo(bx - 22, by - 34);
    g.stroke();
    g.strokeStyle = "#b8bec8";
    g.lineWidth = 5;
    g.stroke();
    g.beginPath();
    g.arc(bx - 23, by - 42, 15, 0, 7);
    g.fillStyle = (() => {
      const gr = g.createRadialGradient(bx - 28, by - 48, 2, bx - 23, by - 42, 15);
      gr.addColorStop(0, "#ff9a9a");
      gr.addColorStop(0.5, "#e0242c");
      gr.addColorStop(1, "#7a0a10");
      return gr;
    })();
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
  } else if (key === "sf-hat") {
    // a safari pith helmet on the dome
    foot(279, 148, 52, 10);
    const brim = () => {
        g.beginPath();
        g.ellipse(279, 146, 66, 16, -0.05, 0, 7);
      },
      dome = () => {
        g.beginPath();
        g.moveTo(232, 144);
        g.bezierCurveTo(232, 92, 326, 92, 326, 142);
        g.closePath();
      };
    shade(brim);
    brim();
    g.fillStyle = lin(0, 130, 0, 162, [
      [0, "#e8d6a8"],
      [1, "#a88c58"],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    dome();
    g.fillStyle = lin(240, 100, 320, 150, [
      [0, "#f2e4bc"],
      [0.6, "#cdb47c"],
      [1, "#9a804c"],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = "#5a3a1a";
    g.beginPath();
    g.moveTo(233, 134);
    g.bezierCurveTo(260, 128, 300, 128, 325, 133);
    g.lineTo(326, 142);
    g.bezierCurveTo(300, 137, 260, 137, 232, 143);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,.35)";
    g.beginPath();
    g.ellipse(262, 112, 14, 7, -0.5, 0, 7);
    g.fill();
    g.fillStyle = "#7a5a2a";
    g.beginPath();
    g.arc(279, 99, 4, 0, 7);
    g.fill();
  } else if (key === "sf-binos") {
    // binoculars hanging at the front of the dome
    g.save();
    g.translate(300, 168);
    g.rotate(-0.15);
    g.strokeStyle = "#3a2410";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-26, -8);
    g.quadraticCurveTo(-40, -40, -10, -52);
    g.stroke();
    for (const x of [-14, 14]) {
      g.save();
      g.filter = "blur(3px)";
      g.globalAlpha = 0.35;
      g.fillStyle = "#000";
      g.beginPath();
      g.roundRect(x - 11 + 3, -18 + 5, 22, 36, 6);
      g.fill();
      g.restore();
      g.fillStyle = ink;
      g.beginPath();
      g.roundRect(x - 12, -19, 24, 38, 7);
      g.fill();
      g.fillStyle = lin(x - 10, 0, x + 10, 0, [
        [0, "#4a5a3a"],
        [0.5, "#6a7a4a"],
        [1, "#2a3a1f"],
      ]);
      g.beginPath();
      g.roundRect(x - 10, -17, 20, 34, 6);
      g.fill();
      g.fillStyle = ink;
      g.beginPath();
      g.ellipse(x, 17, 10, 5, 0, 0, 7);
      g.fill();
      g.fillStyle = lin(x - 8, 14, x + 8, 20, [
        [0, "#9fd8ff"],
        [1, "#1f4a7a"],
      ]);
      g.beginPath();
      g.ellipse(x, 17, 7.5, 3.6, 0, 0, 7);
      g.fill();
    }
    g.fillStyle = "#2a2a2a";
    g.fillRect(-4, -6, 8, 10);
    g.restore();
  } else if (key === "sf-flag" || key === "kg-banner") {
    // an expedition flag / a royal banner on a pole behind the tank
    const kgd = key === "kg-banner";
    g.save();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.3;
    g.strokeStyle = "#000";
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(190, 236);
    g.lineTo(172, 50);
    g.stroke();
    g.restore();
    g.strokeStyle = ink;
    g.lineWidth = 9;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(188, 232);
    g.lineTo(170, 44);
    g.stroke();
    g.strokeStyle = kgd ? "#c8a040" : "#8a5a2a";
    g.lineWidth = 5;
    g.stroke();
    g.fillStyle = kgd ? "#d4af37" : "#c8a040";
    g.beginPath();
    g.arc(170, 40, 7, 0, 7);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2;
    g.stroke();
    const fl = () => {
      g.beginPath();
      g.moveTo(172, 52);
      if (kgd) {
        g.bezierCurveTo(200, 46, 226, 60, 250, 54);
        g.lineTo(244, 96);
        g.lineTo(254, 136);
        g.bezierCurveTo(226, 140, 204, 128, 180, 134);
      } else {
        g.bezierCurveTo(200, 44, 230, 66, 262, 56);
        g.lineTo(256, 102);
        g.bezierCurveTo(226, 112, 202, 92, 177, 102);
      }
      g.closePath();
    };
    fl();
    g.fillStyle = kgd
      ? lin(172, 52, 254, 136, [
          [0, "#5b1f7a"],
          [1, "#2a0a3a"],
        ])
      : lin(172, 52, 262, 102, [
          [0, "#2f7a3a"],
          [1, "#1a4a22"],
        ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.save();
    fl();
    g.clip();
    if (kgd) {
      g.fillStyle = "#d4af37";
      g.beginPath();
      g.moveTo(212, 70);
      g.lineTo(232, 70);
      g.lineTo(232, 98);
      g.quadraticCurveTo(222, 116, 212, 98);
      g.closePath();
      g.fill();
      g.fillStyle = "#8b0000";
      g.fillRect(219, 74, 6, 30);
      g.fillRect(212, 84, 20, 6);
      g.fillStyle = "#d4af37";
      g.fillRect(172, 126, 90, 6);
    } else {
      g.fillStyle = "#f2d27a";
      g.beginPath();
      g.arc(214, 76, 13, 0, 7);
      g.fill();
      g.fillStyle = "#1a4a22";
      g.beginPath();
      g.arc(214, 76, 7, 0, 7);
      g.fill();
      g.fillStyle = "#f2d27a";
      g.fillRect(190, 94, 60, 4);
    }
    g.fillStyle = "rgba(255,255,255,.15)";
    g.fillRect(170, 50, 100, 12);
    g.restore();
  } else if (key === "sm-tophat") {
    // a brass-banded top hat with goggles
    foot(279, 148, 46, 10);
    const brim = () => {
        g.beginPath();
        g.ellipse(279, 146, 58, 14, -0.05, 0, 7);
      },
      crown = () => {
        g.beginPath();
        g.moveTo(244, 144);
        g.lineTo(248, 66);
        g.quadraticCurveTo(279, 58, 310, 66);
        g.lineTo(314, 144);
        g.quadraticCurveTo(279, 150, 244, 144);
        g.closePath();
      };
    shade(crown);
    brim();
    g.fillStyle = lin(0, 132, 0, 160, [
      [0, "#4a3020"],
      [1, "#1f140c"],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    crown();
    g.fillStyle = lin(248, 0, 312, 0, [
      [0, "#2a1a10"],
      [0.4, "#5a3a24"],
      [1, "#1a100a"],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = lin(0, 118, 0, 136, [
      [0, "#f2d27a"],
      [1, "#8a6018"],
    ]);
    g.beginPath();
    g.moveTo(245, 118);
    g.quadraticCurveTo(279, 124, 313, 118);
    g.lineTo(314, 136);
    g.quadraticCurveTo(279, 142, 244, 136);
    g.closePath();
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 1.5;
    g.stroke();
    for (const x of [264, 296]) {
      g.fillStyle = ink;
      g.beginPath();
      g.arc(x, 112, 14, 0, 7);
      g.fill();
      g.fillStyle = "#b8892f";
      g.beginPath();
      g.arc(x, 112, 12, 0, 7);
      g.fill();
      g.fillStyle = lin(x - 8, 104, x + 8, 120, [
        [0, "#ffe9a8"],
        [1, "#c87a1a"],
      ]);
      g.beginPath();
      g.arc(x, 112, 8.5, 0, 7);
      g.fill();
      g.fillStyle = "rgba(255,255,255,.7)";
      g.beginPath();
      g.arc(x - 3, 108, 2.5, 0, 7);
      g.fill();
    }
    g.fillStyle = "#5a3a24";
    g.fillRect(276, 108, 8, 6);
  } else if (key === "sm-stack") {
    // a smokestack on the back, with puffs
    g.save();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.3;
    g.fillStyle = "#000";
    g.fillRect(150, 110, 40, 120);
    g.restore();
    g.fillStyle = ink;
    g.beginPath();
    g.moveTo(152, 230);
    g.lineTo(156, 120);
    g.lineTo(142, 96);
    g.lineTo(196, 96);
    g.lineTo(184, 120);
    g.lineTo(188, 230);
    g.closePath();
    g.fill();
    g.fillStyle = lin(156, 0, 186, 0, [
      [0, "#6a3010"],
      [0.45, "#e09a5a"],
      [1, "#5a2a10"],
    ]);
    g.beginPath();
    g.moveTo(155, 230);
    g.lineTo(159, 122);
    g.lineTo(147, 99);
    g.lineTo(191, 99);
    g.lineTo(181, 122);
    g.lineTo(185, 230);
    g.closePath();
    g.fill();
    g.fillStyle = "#b8892f";
    for (const y of [140, 190]) {
      g.fillRect(156, y, 30, 7);
    }
    g.fillStyle = "#2a1608";
    g.beginPath();
    g.ellipse(169, 99, 22, 5, 0, 0, 7);
    g.fill();
    for (const [x, y, r, a] of [
      [166, 80, 14, 0.85],
      [176, 58, 18, 0.7],
      [160, 34, 22, 0.55],
    ]) {
      g.fillStyle = `rgba(220,220,225,${a})`;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.arc(x + r * 0.7, y + 3, r * 0.7, 0, 7);
      g.arc(x - r * 0.6, y + 4, r * 0.6, 0, 7);
      g.fill();
    }
  } else if (key === "sm-gears") {
    // clockwork gears on the back
    const gr = (x, y, r, n, col, rot) => {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.fillStyle = ink;
      g.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * 6.283,
          rr = i % 2 ? r : r * 1.2;
        g.lineTo(Math.cos(a - 0.1) * (rr + 2), Math.sin(a - 0.1) * (rr + 2));
        g.lineTo(Math.cos(a + 0.1) * (rr + 2), Math.sin(a + 0.1) * (rr + 2));
      }
      g.closePath();
      g.fill();
      g.fillStyle = col;
      g.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * 6.283,
          rr = i % 2 ? r : r * 1.2;
        g.lineTo(Math.cos(a - 0.1) * rr, Math.sin(a - 0.1) * rr);
        g.lineTo(Math.cos(a + 0.1) * rr, Math.sin(a + 0.1) * rr);
      }
      g.closePath();
      g.fill();
      g.fillStyle = "rgba(255,240,200,.3)";
      g.beginPath();
      g.arc(-r * 0.2, -r * 0.2, r * 0.55, 0, 7);
      g.fill();
      g.fillStyle = ink;
      g.beginPath();
      g.arc(0, 0, r * 0.25, 0, 7);
      g.fill();
      g.restore();
    };
    g.save();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.3;
    g.fillStyle = "#000";
    g.beginPath();
    g.arc(170, 150, 50, 0, 7);
    g.fill();
    g.restore();
    gr(196, 186, 30, 10, "#a05a2a", 0.2);
    gr(160, 132, 40, 12, "#c89a3a", 0);
    gr(214, 112, 20, 8, "#8a8f96", 0.3);
  } else if (key === "kg-plume") {
    // a knight's feather plume on the dome
    foot(270, 146, 20, 6);
    g.fillStyle = ink;
    g.beginPath();
    g.roundRect(258, 132, 24, 16, 4);
    g.fill();
    g.fillStyle = lin(0, 132, 0, 148, [
      [0, "#f2d27a"],
      [1, "#8a6018"],
    ]);
    g.beginPath();
    g.roundRect(260, 134, 20, 12, 3);
    g.fill();
    const cols = ["#8b0000", "#d61f3c", "#ff5a5a"];
    for (let k = 0; k < 3; k++) {
      const a = -0.9 - k * 0.32;
      g.save();
      g.translate(270, 134);
      g.rotate(a);
      const L = 86 - k * 10;
      const p = () => {
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(L * 0.3, -16, L * 0.8, -20, L, -4);
        g.bezierCurveTo(L * 0.8, 8, L * 0.3, 10, 0, 0);
        g.closePath();
      };
      p();
      g.fillStyle = ink;
      g.lineWidth = 5;
      g.strokeStyle = ink;
      g.stroke();
      p();
      g.fillStyle = cols[k];
      g.fill();
      g.strokeStyle = "rgba(255,255,255,.45)";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(4, 0);
      g.quadraticCurveTo(L * 0.5, -6, L - 4, -4);
      g.stroke();
      g.strokeStyle = "rgba(80,0,0,.4)";
      g.lineWidth = 1;
      for (let j = 1; j < 9; j++) {
        const x = (L * j) / 10;
        g.beginPath();
        g.moveTo(x, -2);
        g.lineTo(x + 6, -12);
        g.moveTo(x, -2);
        g.lineTo(x + 6, 7);
        g.stroke();
      }
      g.restore();
    }
  } else if (key === "kg-shield") {
    // a heater shield hung on the back
    g.save();
    g.translate(168, 178);
    g.rotate(-0.18);
    const sh = () => {
      g.beginPath();
      g.moveTo(-38, -46);
      g.lineTo(38, -46);
      g.lineTo(38, 0);
      g.quadraticCurveTo(36, 36, 0, 58);
      g.quadraticCurveTo(-36, 36, -38, 0);
      g.closePath();
    };
    g.save();
    g.translate(4, 7);
    g.filter = "blur(4px)";
    g.globalAlpha = 0.35;
    sh();
    g.fillStyle = "#000";
    g.fill();
    g.restore();
    sh();
    g.fillStyle = ink;
    g.fill();
    g.save();
    g.scale(0.9, 0.9);
    sh();
    g.fillStyle = "#1c3f94";
    g.fill();
    g.clip();
    g.fillStyle = "#d4af37";
    g.beginPath();
    g.moveTo(-50, 30);
    g.lineTo(0, -10);
    g.lineTo(50, 30);
    g.lineTo(50, 46);
    g.lineTo(0, 6);
    g.lineTo(-50, 46);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(0, -38);
    g.lineTo(7, -26);
    g.lineTo(0, -14);
    g.lineTo(-7, -26);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,.18)";
    g.fillRect(-40, -46, 80, 22);
    g.restore();
    sh();
    g.strokeStyle = "#d4af37";
    g.lineWidth = 3;
    g.stroke();
    g.restore();
  } else if (key === "ww-hat") {
    // a cowboy hat on the dome
    foot(279, 148, 52, 10);
    const brim = () => {
      g.beginPath();
      g.moveTo(206, 136);
      g.quadraticCurveTo(222, 160, 279, 158);
      g.quadraticCurveTo(336, 160, 352, 132);
      g.quadraticCurveTo(340, 146, 279, 146);
      g.quadraticCurveTo(218, 146, 206, 136);
      g.closePath();
    };
    const crown = () => {
      g.beginPath();
      g.moveTo(244, 148);
      g.bezierCurveTo(240, 110, 250, 86, 266, 92);
      g.quadraticCurveTo(279, 100, 292, 92);
      g.bezierCurveTo(308, 86, 318, 110, 314, 148);
      g.quadraticCurveTo(279, 152, 244, 148);
      g.closePath();
    };
    shade(crown);
    crown();
    g.fillStyle = lin(244, 0, 314, 0, [
      [0, "#8a5a2a"],
      [0.45, "#c8904a"],
      [1, "#6a3a14"],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = "#3a2410";
    g.beginPath();
    g.moveTo(245, 134);
    g.quadraticCurveTo(279, 140, 313, 134);
    g.lineTo(314, 146);
    g.quadraticCurveTo(279, 152, 244, 146);
    g.closePath();
    g.fill();
    g.fillStyle = "#d4af37";
    g.beginPath();
    g.arc(300, 140, 4, 0, 7);
    g.fill();
    brim();
    g.fillStyle = lin(0, 132, 0, 160, [
      [0, "#b07a3a"],
      [1, "#6a3a14"],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
  } else if (key === "ww-badge") {
    // a sheriff's star on the hull side
    const cx = 390,
      cy = 268,
      R = 40;
    const star = (r) => {
      g.beginPath();
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * 6.283 - 1.571,
          rr = j % 2 ? r * 0.55 : r;
        g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92);
      }
      g.closePath();
    };
    g.save();
    g.filter = "blur(3px)";
    g.globalAlpha = 0.4;
    g.translate(3, 5);
    star(R);
    g.fillStyle = "#000";
    g.fill();
    g.restore();
    star(R + 2);
    g.fillStyle = ink;
    g.fill();
    star(R);
    g.fillStyle = lin(cx - R, cy - R, cx + R, cy + R, [
      [0, "#fff3b0"],
      [0.5, "#d4af37"],
      [1, "#8a6018"],
    ]);
    g.fill();
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * 6.283 - 1.571;
      g.fillStyle = "#fff3b0";
      g.beginPath();
      g.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.92, 3.5, 0, 7);
      g.fill();
      g.strokeStyle = ink;
      g.lineWidth = 1.2;
      g.stroke();
    }
    g.beginPath();
    g.arc(cx, cy, R * 0.42, 0, 7);
    g.strokeStyle = "#8a6018";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = "#5a3a0a";
    g.font = "bold 11px Georgia, serif";
    g.textAlign = "center";
    g.fillText("SHERIFF", cx, cy + 4);
  } else if (key === "ww-cactus") {
    // a saguaro cactus behind the tank
    const arm = (x, y, dir, h) => {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + dir * 22, y);
      g.quadraticCurveTo(x + dir * 30, y, x + dir * 30, y - 8);
      g.lineTo(x + dir * 30, y - h);
    };
    const body = () => {
      g.beginPath();
      g.moveTo(170, 236);
      g.lineTo(170, 70);
    };
    const drawAll = (col, w) => {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.lineCap = "round";
      g.lineJoin = "round";
      body();
      g.stroke();
      arm(170, 160, -1, 44);
      g.stroke();
      arm(170, 128, 1, 40);
      g.stroke();
    };
    g.save();
    g.translate(5, 6);
    g.filter = "blur(4px)";
    g.globalAlpha = 0.3;
    drawAll("#000", 30);
    g.restore();
    drawAll(ink, 32);
    drawAll("#3a8a3a", 26);
    g.save();
    g.translate(-5, 0);
    drawAll("rgba(160,230,120,.35)", 6);
    g.restore();
    g.strokeStyle = "rgba(20,60,20,.5)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(176, 228);
    g.lineTo(176, 76);
    g.stroke();
    g.fillStyle = "#ff6a9a";
    for (const [x, y] of [
      [170, 58],
      [140, 110],
      [200, 82],
    ]) {
      g.beginPath();
      g.arc(x, y, 6, 0, 7);
      g.fill();
    }
  } else if (key === "tp-straw") {
    // a straw hat with a red band and a flower
    foot(279, 148, 52, 10);
    const brim = () => {
        g.beginPath();
        g.ellipse(279, 146, 70, 17, -0.04, 0, 7);
      },
      crown = () => {
        g.beginPath();
        g.moveTo(244, 146);
        g.bezierCurveTo(242, 104, 316, 104, 314, 146);
        g.closePath();
      };
    shade(brim);
    brim();
    g.fillStyle = lin(0, 130, 0, 162, [
      [0, "#f2d88a"],
      [1, "#b89040"],
    ]);
    g.fill();
    g.save();
    brim();
    g.clip();
    g.strokeStyle = "rgba(120,80,20,.35)";
    g.lineWidth = 1;
    for (let r = 20; r < 75; r += 6) {
      g.beginPath();
      g.ellipse(279, 146, r, r * 0.24, -0.04, 0, 7);
      g.stroke();
    }
    g.restore();
    brim();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    crown();
    g.fillStyle = lin(244, 0, 314, 0, [
      [0, "#d8b860"],
      [0.5, "#f8e4a0"],
      [1, "#a88030"],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = "#e0242c";
    g.beginPath();
    g.moveTo(245, 132);
    g.quadraticCurveTo(279, 138, 313, 132);
    g.lineTo(314, 142);
    g.quadraticCurveTo(279, 148, 244, 142);
    g.closePath();
    g.fill();
    for (let j = 0; j < 5; j++) {
      const a = (j / 5) * 6.283;
      g.fillStyle = "#ff8fb0";
      g.beginPath();
      g.ellipse(300 + Math.cos(a) * 7, 136 + Math.sin(a) * 6, 7, 4.5, a, 0, 7);
      g.fill();
    }
    g.fillStyle = "#ffe14d";
    g.beginPath();
    g.arc(300, 136, 3, 0, 7);
    g.fill();
  } else if (key === "tp-palm") {
    // a little palm tree behind the tank
    g.save();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.3;
    g.strokeStyle = "#000";
    g.lineWidth = 14;
    g.beginPath();
    g.moveTo(186, 236);
    g.quadraticCurveTo(160, 150, 182, 70);
    g.stroke();
    g.restore();
    g.lineCap = "round";
    g.strokeStyle = ink;
    g.lineWidth = 18;
    g.beginPath();
    g.moveTo(182, 232);
    g.quadraticCurveTo(156, 150, 178, 66);
    g.stroke();
    g.strokeStyle = "#a0703a";
    g.lineWidth = 13;
    g.stroke();
    g.strokeStyle = "#6a4420";
    g.lineWidth = 2;
    for (let t = 0.1; t < 0.95; t += 0.1) {
      const x = (1 - t) * (1 - t) * 182 + 2 * (1 - t) * t * 156 + t * t * 178,
        y = (1 - t) * (1 - t) * 232 + 2 * (1 - t) * t * 150 + t * t * 66;
      g.beginPath();
      g.moveTo(x - 6, y);
      g.lineTo(x + 6, y - 3);
      g.stroke();
    }
    for (let j = 0; j < 7; j++) {
      const a = -Math.PI / 2 + (j - 3) * 0.55;
      g.save();
      g.translate(178, 66);
      g.rotate(a);
      const L = 62;
      const leaf = () => {
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(L * 0.5, -16, L, 10);
        g.quadraticCurveTo(L * 0.5, 4, 0, 0);
        g.closePath();
      };
      leaf();
      g.strokeStyle = ink;
      g.lineWidth = 4;
      g.stroke();
      leaf();
      g.fillStyle = j % 2 ? "#3a9a3a" : "#2f7a2a";
      g.fill();
      g.restore();
    }
    for (const [x, y] of [
      [172, 74],
      [186, 76],
      [178, 82],
    ]) {
      g.fillStyle = "#5a3a1a";
      g.beginPath();
      g.arc(x, y, 6, 0, 7);
      g.fill();
      g.strokeStyle = ink;
      g.lineWidth = 1.5;
      g.stroke();
    }
  } else if (key === "tp-surf") {
    // a surfboard propped up behind the tank
    g.save();
    g.translate(168, 150);
    g.rotate(-0.32);
    const board = () => {
      g.beginPath();
      g.moveTo(0, -96);
      g.bezierCurveTo(26, -60, 24, 70, 0, 92);
      g.bezierCurveTo(-24, 70, -26, -60, 0, -96);
      g.closePath();
    };
    g.save();
    g.translate(5, 7);
    g.filter = "blur(4px)";
    g.globalAlpha = 0.3;
    board();
    g.fillStyle = "#000";
    g.fill();
    g.restore();
    board();
    g.fillStyle = "#fff8e6";
    g.fill();
    g.save();
    board();
    g.clip();
    g.fillStyle = "#00b4d8";
    g.fillRect(-30, -30, 60, 22);
    g.fillStyle = "#ff6f61";
    g.fillRect(-30, -4, 60, 10);
    g.fillStyle = "#ffd23f";
    g.fillRect(-30, 10, 60, 6);
    g.fillStyle = "rgba(255,255,255,.4)";
    g.fillRect(-14, -96, 6, 190);
    g.restore();
    board();
    g.strokeStyle = ink;
    g.lineWidth = 3;
    g.stroke();
    g.strokeStyle = "rgba(0,0,0,.25)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, -90);
    g.lineTo(0, 86);
    g.stroke();
    g.restore();
  } else if (key === "mc-radar") {
    // a radar dish on the dome
    foot(275, 146, 22, 6);
    g.fillStyle = ink;
    g.fillRect(268, 112, 14, 36);
    g.fillStyle = lin(268, 0, 282, 0, [
      [0, "#5a6570"],
      [0.5, "#b0b8c0"],
      [1, "#3a4048"],
    ]);
    g.fillRect(270, 114, 10, 34);
    g.save();
    g.translate(275, 104);
    g.rotate(-0.5);
    g.beginPath();
    g.ellipse(0, 0, 40, 16, 0, 0, 7);
    g.fillStyle = lin(-40, -16, 40, 16, [
      [0, "#e8eef4"],
      [0.6, "#8a959f"],
      [1, "#4a5560"],
    ]);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.beginPath();
    g.ellipse(0, 0, 26, 10, 0, 0, 7);
    g.strokeStyle = "rgba(40,50,60,.5)";
    g.lineWidth = 1.5;
    g.stroke();
    g.strokeStyle = ink;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -30);
    g.stroke();
    g.fillStyle = "#ff3d3d";
    g.shadowColor = "#ff3d3d";
    g.shadowBlur = 10;
    g.beginPath();
    g.arc(0, -32, 5, 0, 7);
    g.fill();
    g.restore();
  } else if (key === "cs-visor") {
    // a dealer's green eyeshade round the dome
    foot(279, 148, 48, 9);
    const band = () => {
      g.beginPath();
      g.moveTo(236, 150);
      g.quadraticCurveTo(279, 136, 324, 150);
      g.lineTo(326, 166);
      g.quadraticCurveTo(279, 154, 234, 166);
      g.closePath();
    };
    shade(band);
    band();
    g.fillStyle = "#1a1a1a";
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = "#d4af37";
    g.beginPath();
    g.moveTo(240, 156);
    g.quadraticCurveTo(279, 145, 320, 156);
    g.lineTo(320, 159);
    g.quadraticCurveTo(279, 148, 240, 159);
    g.closePath();
    g.fill();
    const brim = () => {
      g.beginPath();
      g.moveTo(276, 146);
      g.quadraticCurveTo(340, 118, 392, 150);
      g.quadraticCurveTo(350, 172, 296, 164);
      g.closePath();
    };
    g.save();
    g.globalAlpha = 0.85;
    brim();
    g.fillStyle = lin(290, 122, 362, 150, [
      [0, "#4fd27a"],
      [1, "#0b7a3a"],
    ]);
    g.fill();
    g.restore();
    brim();
    g.strokeStyle = ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = "rgba(255,255,255,.35)";
    g.beginPath();
    g.moveTo(292, 146);
    g.quadraticCurveTo(342, 126, 380, 148);
    g.quadraticCurveTo(340, 138, 296, 152);
    g.closePath();
    g.fill();
  } else if (key === "cs-chips") {
    // stacks of poker chips behind the tank
    const cols = [
      ["#c8102e", "#ffffff"],
      ["#141414", "#ffffff"],
      ["#1f5fd0", "#ffffff"],
    ];
    [
      [128, 200, 8, 0],
      [166, 206, 12, 1],
      [204, 196, 7, 2],
    ].forEach(([x, y, n, ci]) => {
      const [col, st] = cols[ci];
      for (let j = 0; j < n; j++) {
        const yy = y - j * 8;
        g.fillStyle = ink;
        g.beginPath();
        g.ellipse(x, yy + 1, 20, 8, 0, 0, 7);
        g.fill();
        g.fillStyle = col;
        g.beginPath();
        g.ellipse(x, yy, 18.5, 7, 0, 0, 7);
        g.fill();
        g.fillRect(x - 18.5, yy - 0, 37, 4);
        g.fillStyle = st;
        for (const dx of [-12, -2, 8]) {
          g.fillRect(x + dx, yy + 1, 4, 3);
        }
      }
      const ty = y - (n - 1) * 8;
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(x, ty, 18.5, 7, 0, 0, 7);
      g.fill();
      g.strokeStyle = st;
      g.lineWidth = 1.5;
      g.beginPath();
      g.ellipse(x, ty, 11, 4, 0, 0, 7);
      g.stroke();
    });
  } else if (key === "cs-dice") {
    // a pair of big red dice behind the tank
    const die = (x, y, rot, n) => {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.save();
      g.filter = "blur(3px)";
      g.globalAlpha = 0.35;
      g.fillStyle = "#000";
      g.beginPath();
      g.roundRect(-26, -22, 56, 56, 10);
      g.fill();
      g.restore();
      g.fillStyle = ink;
      g.beginPath();
      g.roundRect(-29, -29, 58, 58, 11);
      g.fill();
      g.fillStyle = lin(-28, -28, 28, 28, [
        [0, "#ff4a5a"],
        [0.6, "#c8102e"],
        [1, "#7a0a18"],
      ]);
      g.beginPath();
      g.roundRect(-27, -27, 54, 54, 10);
      g.fill();
      const pip = (px, py) => {
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.arc(px, py, 5, 0, 7);
        g.fill();
      };
      const P5 = [
          [-14, -14],
          [14, -14],
          [0, 0],
          [-14, 14],
          [14, 14],
        ],
        P6 = [
          [-14, -15],
          [14, -15],
          [-14, 0],
          [14, 0],
          [-14, 15],
          [14, 15],
        ];
      (n === 5 ? P5 : P6).forEach(([a, b]) => pip(a, b));
      g.fillStyle = "rgba(255,255,255,.25)";
      g.beginPath();
      g.roundRect(-24, -24, 48, 10, 6);
      g.fill();
      g.restore();
    };
    die(128, 150, -0.25, 6);
    die(186, 128, 0.3, 5);
  } else if (key === "mc-jet" || key === "mc-rockets") {
    // a jet pack / rocket pods on the back
    const jet = key === "mc-jet";
    g.save();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.3;
    g.fillStyle = "#000";
    g.fillRect(136, 120, 70, 100);
    g.restore();
    for (const x of jet ? [146, 182] : [140, 166, 192]) {
      const w = jet ? 30 : 22,
        top = jet ? 110 : 120,
        h = jet ? 96 : 76;
      g.fillStyle = ink;
      g.beginPath();
      g.roundRect(x - 2, top - 2, w + 4, h + 4, jet ? 12 : 8);
      g.fill();
      g.fillStyle = lin(
        x,
        0,
        x + w,
        0,
        jet
          ? [
              [0, "#4a5560"],
              [0.45, "#c0c8d0"],
              [1, "#2a3038"],
            ]
          : [
              [0, "#2a3a1a"],
              [0.45, "#7a8a4a"],
              [1, "#1a2410"],
            ],
      );
      g.beginPath();
      g.roundRect(x, top, w, h, jet ? 10 : 6);
      g.fill();
      if (jet) {
        g.fillStyle = "#ffc300";
        g.fillRect(x, top + 30, w, 8);
        const fl = g.createLinearGradient(0, top + h, 0, top + h + 44);
        fl.addColorStop(0, "#fff3b0");
        fl.addColorStop(0.4, "#ff8a2a");
        fl.addColorStop(1, "rgba(255,60,20,0)");
        g.fillStyle = fl;
        g.beginPath();
        g.moveTo(x + 4, top + h);
        g.quadraticCurveTo(x + w / 2, top + h + 60, x + w - 4, top + h);
        g.fill();
      } else {
        g.fillStyle = "#e0242c";
        g.beginPath();
        g.moveTo(x, top);
        g.quadraticCurveTo(x + w / 2, top - 22, x + w, top);
        g.closePath();
        g.fill();
        g.strokeStyle = ink;
        g.lineWidth = 2;
        g.stroke();
        g.fillStyle = "#ffc300";
        g.fillRect(x, top + 50, w, 6);
      }
    }
  }
  return c;
}
// The angel wings in other styles. wings = the angel wings frame. kind: 'shadow' | 'cosmic'
export function restyleWings(wings, kind) {
  const W = wings.width,
    H = wings.height,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(wings, 0, 0);
  const id = g.getImageData(0, 0, W, H),
    d = id.data;
  const hash = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const mix = (a, b, t) => a + (b - a) * t;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) {
      continue;
    }
    const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255,
      gold = d[i] > d[i + 2] + 25,
      p = i / 4,
      x = p % W,
      y = Math.floor(p / W);
    let r, gg, b;
    if (kind === "holo" || kind === "opal") {
      // rainbow / pastel foil sweeping across the feathers, trim stays bright
      const op = kind === "opal",
        sw = (x + y * 0.6) / 110 + l * 1.2 + 0.3 * Math.sin(x / 31 - y / 47),
        hue = op ? 190 + 130 * (0.5 + 0.5 * Math.sin(sw * 2.2)) : (sw * 120) % 360;
      const sa = gold ? 0.35 : op ? 0.5 : 0.8,
        li = gold ? 0.8 + l * 0.18 : op ? 0.6 + l * 0.35 : 0.35 + l * 0.55;
      const c2 = (1 - Math.abs(2 * li - 1)) * sa,
        x2 = c2 * (1 - Math.abs(((hue / 60) % 2) - 1)),
        m2 = li - c2 / 2,
        q =
          hue < 60
            ? [c2, x2, 0]
            : hue < 120
              ? [x2, c2, 0]
              : hue < 180
                ? [0, c2, x2]
                : hue < 240
                  ? [0, x2, c2]
                  : hue < 300
                    ? [x2, 0, c2]
                    : [c2, 0, x2];
      r = (q[0] + m2) * 255;
      gg = (q[1] + m2) * 255;
      b = (q[2] + m2) * 255;
      if (hash(x >> 1, y >> 1, 15) > 0.994) {
        r = gg = b = 255;
      }
    } else if (kind === "shadow") {
      if (gold) {
        r = mix(90, 200, l);
        gg = mix(40, 150, l);
        b = 255;
      } // the gold trim glows violet
      else {
        const t = Math.pow(l, 2.2);
        r = mix(6, 70, t);
        gg = mix(4, 46, t);
        b = mix(14, 120, t);
      }
    } else if (gold) {
      r = mix(120, 255, l);
      gg = mix(200, 250, l);
      b = 255;
    } // the trim turns starlight blue-white
    else {
      const n = 0.5 + 0.25 * Math.sin(x / 23 + y / 41) + 0.25 * Math.sin(x / 13 - y / 19 + 1.7),
        t = l * 0.7 + n * 0.3;
      r = mix(30, mix(110, 255, n), t);
      gg = mix(14, mix(40, 140, 1 - n), t);
      b = mix(70, 255, t);
      if (hash(x, y, 9) > 0.993) {
        r = gg = b = 255;
      }
    }
    d[i] = r;
    d[i + 1] = gg;
    d[i + 2] = b;
  }
  g.putImageData(id, 0, 0);
  const o = document.createElement("canvas");
  o.width = W;
  o.height = H;
  const og = o.getContext("2d");
  og.save();
  og.shadowColor =
    kind === "shadow"
      ? "rgba(140,80,255,.9)"
      : kind === "holo"
        ? "rgba(255,150,230,.8)"
        : kind === "opal"
          ? "rgba(180,225,255,.85)"
          : "rgba(150,170,255,.9)";
  og.shadowBlur = 12;
  og.drawImage(c, 0, 0);
  og.restore();
  return o;
}
// The game's hazmat hood (turret79) in other styles: kind 'shadow' | 'cosmic'. Orange suit -> theme colours, goggles glow.
export function restyleHazmat(img, kind, W = 640, H = 384) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const id = g.getImageData(0, 0, W, H),
    d = id.data,
    mix = (a, b, t) => a + (b - a) * t;
  const hash = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) {
      continue;
    }
    const r0 = d[i],
      g0 = d[i + 1],
      b0 = d[i + 2],
      l = (0.3 * r0 + 0.59 * g0 + 0.11 * b0) / 255,
      p = i / 4,
      x = p % W,
      y = Math.floor(p / W);
    const orange = r0 > b0 + 50 && r0 > g0 + 15,
      grey = Math.max(r0, g0, b0) - Math.min(r0, g0, b0) < 30 && l > 0.45;
    let r, gg, b;
    if (orange) {
      if (kind === "shadow") {
        const t = Math.pow(l, 1.6);
        r = mix(8, 80, t);
        gg = mix(4, 46, t);
        b = mix(18, 140, t);
      } else {
        const n =
            0.5 +
            0.25 * Math.sin((x * 640) / W / 9 + (y * 640) / W / 17) +
            0.25 * Math.sin((x * 640) / W / 6 - (y * 640) / W / 11 + 2),
          t = l * 0.75 + n * 0.25;
        r = mix(26, mix(120, 240, n), t);
        gg = mix(10, 70, t);
        b = mix(60, 255, t);
        if (hash(x, y, 5) > 0.985) {
          r = gg = b = 255;
        }
      }
    } else if (grey) {
      // goggle lenses glow
      if (kind === "shadow") {
        r = mix(90, 210, l);
        gg = mix(150, 235, l);
        b = 255;
      } else {
        r = mix(120, 255, l);
        gg = mix(220, 255, l);
        b = 255;
      }
    } else {
      r = r0 * 0.7;
      gg = g0 * 0.7;
      b = Math.min(255, b0 * 0.8 + 20);
    }
    d[i] = r;
    d[i + 1] = gg;
    d[i + 2] = b;
  }
  g.putImageData(id, 0, 0);
  const o = document.createElement("canvas");
  o.width = W;
  o.height = H;
  const og = o.getContext("2d");
  og.save();
  og.shadowColor = kind === "shadow" ? "rgba(140,80,255,.85)" : "rgba(120,200,255,.85)";
  og.shadowBlur = (8 * W) / 640;
  og.drawImage(c, 0, 0);
  og.restore();
  return o;
}
export function drawArsenalItem2(key, A) {
  const W = 640,
    H = 384,
    cv = () => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      return c;
    };
  const rmp = (stops, t) =>
    sampleRamp(
      stops.map(([p, c]) => [p, c]),
      t,
    );
  const recol = (img, stops, keepDark = 0.13) => {
    const c = cv(),
      g = c.getContext("2d", { willReadFrequently: true });
    if (img) {
      g.drawImage(img, 0, 0, W, H);
    }
    const id = g.getImageData(0, 0, W, H),
      d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) {
        continue;
      }
      const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
      if (l < keepDark) {
        continue;
      }
      const c2 = rmp(stops, l);
      d[i] = c2[0];
      d[i + 1] = c2[1];
      d[i + 2] = c2[2];
    }
    g.putImageData(id, 0, 0);
    return c;
  };
  const glow = (c, col, blur, a) => {
    const o = cv(),
      g = o.getContext("2d"),
      t = cv(),
      tg = t.getContext("2d");
    tg.drawImage(c, 0, 0);
    tg.globalCompositeOperation = "source-in";
    tg.fillStyle = col;
    tg.fillRect(0, 0, W, H);
    g.save();
    g.globalAlpha = a;
    g.filter = `blur(${blur}px)`;
    g.drawImage(t, 0, 0);
    g.restore();
    g.drawImage(c, 0, 0);
    return o;
  };
  const GOLD = [
    [0, [90, 55, 5]],
    [0.35, [176, 118, 16]],
    [0.6, [240, 190, 60]],
    [0.8, [255, 232, 140]],
    [1, [255, 255, 235]],
  ];
  if (key === "gatling-gold") {
    return A.barrel50 ? recol(A.barrel50, GOLD) : null;
  } // the game's gatling barrel, in gold
  if (key === "laser-emitter") {
    return A.barrel71
      ? glow(
          recol(A.barrel71, [
            [0, [0, 60, 20]],
            [0.4, [0, 170, 60]],
            [0.7, [60, 255, 120]],
            [1, [230, 255, 235]],
          ]),
          "#3dff7a",
          14,
          0.9,
        )
      : null;
  }
  if (key === "gold-launcher") {
    return A.back162 ? recol(A.back162, GOLD) : null;
  } // the Camo box's rocket launcher, in gold
  if (key === "mine-ball") {
    // the plain Christmas bauble as a dark metal ball, moved behind the tank, with spikes and the game's mine glow
    if (!A.barrel108) {
      return null;
    }
    const tmp = cv(),
      tg = tmp.getContext("2d", { willReadFrequently: true });
    tg.drawImage(A.barrel108, 0, 0, W, H);
    const dd = tg.getImageData(0, 0, W, H).data;
    let x0 = W,
      x1 = 0,
      y1 = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (dd[(y * W + x) * 4 + 3] > 40) {
          if (x < x0) {
            x0 = x;
          }
          if (x > x1) {
            x1 = x;
          }
          if (y > y1) {
            y1 = y;
          }
        }
      }
    }
    const r0 = (x1 - x0) / 2,
      cx0 = x0 + r0,
      cy0 = y1 - r0,
      cx = 166,
      cy = 206,
      r = 34; // sitting on the back deck (it used to float above the tank)
    const ball = cv(),
      bg = ball.getContext("2d");
    bg.save();
    bg.beginPath();
    bg.arc(cx, cy, r - 1, 0, 7);
    bg.clip();
    bg.drawImage(tmp, cx0 - r0, cy0 - r0, r0 * 2, r0 * 2, cx - r, cy - r, r * 2, r * 2);
    bg.restore();
    const metal = recol(
      ball,
      [
        [0, [15, 16, 20]],
        [0.25, [40, 44, 52]],
        [0.5, [85, 92, 104]],
        [0.75, [170, 178, 190]],
        [1, [255, 255, 255]],
      ],
      0.02,
    );
    const c = cv(),
      g = c.getContext("2d");
    g.lineJoin = "round";
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + 0.2,
        tip = [cx + Math.cos(a) * (r + 24), cy + Math.sin(a) * (r + 24)],
        b1 = [cx + Math.cos(a - 0.2) * (r - 6), cy + Math.sin(a - 0.2) * (r - 6)],
        b2 = [cx + Math.cos(a + 0.2) * (r - 6), cy + Math.sin(a + 0.2) * (r - 6)];
      g.beginPath();
      g.moveTo(...b1);
      g.lineTo(...tip);
      g.lineTo(...b2);
      g.closePath();
      const gr = g.createLinearGradient(b1[0], b1[1], tip[0], tip[1]);
      gr.addColorStop(0, "#4a4f58");
      gr.addColorStop(1, "#cfd5de");
      g.fillStyle = gr;
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = "#141414";
      g.stroke();
    }
    g.drawImage(metal, 0, 0);
    g.beginPath();
    g.arc(cx, cy, r, 0, 7);
    g.lineWidth = 4.5;
    g.strokeStyle = "#141414";
    g.stroke();
    if (A.mineGlow) {
      g.save();
      g.globalCompositeOperation = "lighter";
      g.drawImage(A.mineGlow, cx - 26, cy - 30, 52, 52);
      g.restore();
    }
    g.fillStyle = "#ff3030";
    g.beginPath();
    g.arc(cx, cy - 4, 7, 0, 7);
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = "#141414";
    g.stroke();
    return c;
  }
  if (key === "ammo-belt") {
    // the game's checkered front strip as a leather belt, with shotgun shells along it
    if (!A.front38) {
      return null;
    }
    const c = cv(),
      g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(A.front38, 0, 0, W, H);
    const id = g.getImageData(0, 0, W, H),
      d = id.data,
      top = {};
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) {
        continue;
      }
      const r = d[i],
        gg = d[i + 1],
        b = d[i + 2],
        mx = Math.max(r, gg, b),
        mn = Math.min(r, gg, b),
        l = (0.3 * r + 0.59 * gg + 0.11 * b) / 255,
        sat = mx ? (mx - mn) / mx : 0;
      if (!(sat > 0.35 || (l > 0.06 && l < 0.5))) {
        continue;
      }
      const col = rmp(
        [
          [0, [50, 25, 8]],
          [0.5, [120, 68, 28]],
          [0.8, [168, 108, 54]],
          [1, [220, 170, 110]],
        ],
        sat > 0.35 ? l : l * 1.6,
      );
      d[i] = col[0];
      d[i + 1] = col[1];
      d[i + 2] = col[2];
      const x = (i / 4) % W,
        y = Math.floor(i / 4 / W);
      if (top[x] === undefined || y < top[x]) {
        top[x] = y;
      }
    }
    g.putImageData(id, 0, 0);
    const xs = Object.keys(top)
      .map(Number)
      .sort((a, b) => a - b);
    if (!xs.length) {
      return c;
    }
    const x0 = xs[0],
      x1 = xs[xs.length - 1],
      lin = (a, b, cc, dd2, st) => {
        const gr = g.createLinearGradient(a, b, cc, dd2);
        st.forEach(([p, col]) => gr.addColorStop(p, col));
        return gr;
      };
    g.lineJoin = "round";
    for (let k = 0; k < 6; k++) {
      const x = Math.round(x0 + ((k + 0.5) * (x1 - x0)) / 6);
      let tY = top[x];
      for (let dx = 1; tY === undefined && dx < 10; dx++) {
        tY = top[x + dx] ?? top[x - dx];
      }
      if (tY === undefined) {
        continue;
      }
      g.save();
      g.translate(x, tY + 6);
      g.rotate(-0.05 + k * 0.02);
      g.beginPath();
      g.roundRect(-8, -30, 16, 28, 4);
      g.fillStyle = lin(-8, 0, 8, 0, [
        [0, "#7a0d14"],
        [0.45, "#e63946"],
        [1, "#7a0d14"],
      ]);
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = "#141414";
      g.stroke();
      g.beginPath();
      g.roundRect(-9, -6, 18, 10, 3);
      g.fillStyle = lin(-9, 0, 9, 0, [
        [0, "#fff6c2"],
        [0.35, "#ffd34d"],
        [0.7, "#c98a12"],
        [1, "#7a4a05"],
      ]);
      g.fill();
      g.stroke();
      g.fillStyle = "rgba(255,255,255,.6)";
      g.beginPath();
      g.ellipse(-3, -20, 2, 6, 0, 0, 7);
      g.fill();
      g.restore();
    }
    return c;
  }
  return null;
}
export function lockedVersion(src) {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(src, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height),
    d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) * 0.45 + 40;
    d[i] = d[i + 1] = d[i + 2] = l;
  }
  g.putImageData(id, 0, 0);
  return c;
}
// the "something was unlocked" badge for the pop-up: the game's trophy with a question mark
export function mysteryBadges(trophy) {
  const mk = (locked) => {
    const c = document.createElement("canvas");
    c.width = c.height = 120;
    const g = c.getContext("2d");
    if (trophy) {
      g.drawImage(trophy, 10, 6, 100, 100);
    }
    g.font = "bold 58px TankTrouble, Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 7;
    g.strokeStyle = "#000";
    g.strokeText("?", 60, 52);
    g.fillStyle = locked ? "#bbb" : "#ffe14d";
    g.fillText("?", 60, 52);
    return (locked ? lockedVersion(c) : c).toDataURL();
  };
  return { unlocked: mk(false), locked: mk(true) };
}
