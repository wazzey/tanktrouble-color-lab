import { GX_ACC, GX_PAINT } from "./colours.js";
import { EXT_AURA, EXT_BOXPIC, EXT_ITEM, EXT_PAINT_ART, EXT_UPRIGHT } from "./registries.js";
import { MAP_THEMES, mapNoise } from "./maps.js";
import { DEC, MOTIF, OBJ_CRATES, WALL, mapVariant, objBadge } from "./maps-more.js";

// Shinobi box (old-era Japan, ninja): items, paints, box picture, map and crate. Original designs (the crest is invented).
Object.assign(GX_ACC, {
  "nj-hood": { slot: "turret", name: "Shinobi Hood", box: "ninja" },
  "nj-kasa": { slot: "turret", name: "Straw Kasa", box: "ninja" },
  "nj-katana": { slot: "back", name: "Crossed Katanas", box: "ninja" },
  "nj-banner": { slot: "back", name: "Clan Banner", box: "ninja" },
  "nj-shuriken": { slot: "front", name: "Shuriken Plate", box: "ninja" },
  "nj-fan": { slot: "barrel", name: "War Fan", box: "ninja" },
  "nj-aura": { slot: "front", name: "Aura: Smoke Bomb", box: "ninja" },
});
Object.assign(GX_PAINT, {
  "pt-indigo": { name: "Indigo Shibori", avg: "0x24386a" },
  "pt-tidescale": { name: "Tide Scales", avg: "0x1d4a5e" },
  "pt-sumie": { name: "Ink Wash", avg: "0xb8b2a2" },
  "pt-asanoha": { name: "Asanoha", avg: "0x6e1a26" },
  "pt-shinobi": { name: "Shinobi Black", avg: "0x1e1f25" },
});
EXT_UPRIGHT.push("pt-sumie");
// the invented clan crest: a ring holding a crescent moon over a single wave
function NJ_crest(g, cx, cy, r, col) {
  g.save();
  g.strokeStyle = col;
  g.fillStyle = col;
  g.lineWidth = r * 0.14;
  g.beginPath();
  g.arc(cx, cy, r, 0, 7);
  g.stroke();
  g.beginPath();
  g.arc(cx - r * 0.12, cy - r * 0.18, r * 0.5, 0, 7);
  g.arc(cx + r * 0.08, cy - r * 0.3, r * 0.42, 0, 7, true);
  g.fill("evenodd");
  g.lineWidth = r * 0.12;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx - r * 0.62, cy + r * 0.42);
  g.quadraticCurveTo(cx - r * 0.3, cy + r * 0.1, cx, cy + r * 0.38);
  g.quadraticCurveTo(cx + r * 0.3, cy + r * 0.66, cx + r * 0.62, cy + r * 0.3);
  g.stroke();
  g.restore();
}
function NJ_shuriken(g, cx, cy, R, rot, fillA, fillB, ink) {
  // a four-point throwing star with a hole in the middle
  const path = (c) => {
    c.beginPath();
    for (let j = 0; j < 8; j++) {
      const a = rot + (j * Math.PI) / 4,
        rr = j % 2 ? R * 0.3 : R;
      c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    c.closePath();
    c.moveTo(cx + R * 0.13, cy);
    c.arc(cx, cy, R * 0.13, 0, 7, true);
  };
  path(g);
  const gr = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  gr.addColorStop(0, fillA);
  gr.addColorStop(1, fillB);
  g.fillStyle = gr;
  g.fill("evenodd");
  g.strokeStyle = ink;
  g.lineWidth = Math.max(1.5, R * 0.06);
  g.stroke();
  g.save();
  g.strokeStyle = "rgba(255,255,255,.55)";
  g.lineWidth = Math.max(1, R * 0.04);
  for (let j = 0; j < 4; j++) {
    const a = rot + (j * Math.PI) / 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * R * 0.22, cy + Math.sin(a) * R * 0.22);
    g.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9);
    g.stroke();
  }
  g.restore();
  return path;
}
EXT_ITEM["nj-hood"] = {
  draw(g, K, P) {
    // dark cloth wrapped over the dome, an eye slit, a knot at the back with two tails
    if (!P.turret) {
      return;
    }
    const W = 640,
      H = 384;
    const tails = (c) => {
      c.beginPath();
      c.moveTo(214, 170);
      c.bezierCurveTo(186, 160, 160, 146, 122, 150);
      c.bezierCurveTo(134, 160, 150, 166, 170, 176);
      c.bezierCurveTo(150, 182, 132, 196, 116, 214);
      c.bezierCurveTo(146, 206, 176, 196, 212, 186);
      c.closePath();
    };
    K.shade(tails, 4, 7, 0.35, 4);
    tails(g);
    g.fillStyle = K.lin(120, 150, 214, 200, [
      [0, "#2c2f3c"],
      [1, "#14151c"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.save();
    tails(g);
    g.clip();
    g.strokeStyle = "rgba(255,255,255,.12)";
    g.lineWidth = 2;
    for (const [a, b, c2, d] of [
      [200, 172, 160, 156],
      [196, 184, 150, 198],
    ]) {
      g.beginPath();
      g.moveTo(a, b);
      g.quadraticCurveTo((a + c2) / 2, (b + d) / 2 - 6, c2, d);
      g.stroke();
    }
    g.restore();
    // the cloth: the dome's own shape, a touch bigger, down to a wavy hem
    const cloth = document.createElement("canvas");
    cloth.width = W;
    cloth.height = H;
    const cg = cloth.getContext("2d");
    cg.save();
    cg.translate(281, 205);
    cg.scale(1.045, 1.04);
    cg.translate(-281, -205);
    cg.drawImage(P.turret, 0, 0, W, H);
    cg.restore();
    cg.globalCompositeOperation = "destination-in";
    cg.beginPath();
    cg.moveTo(0, 0);
    cg.lineTo(W, 0);
    cg.lineTo(W, 204);
    for (let x = W; x >= 0; x -= 8) {
      cg.lineTo(x, 206 + Math.sin(x / 14) * 3);
    }
    cg.closePath();
    cg.fill();
    cg.globalCompositeOperation = "source-in";
    const gr = cg.createLinearGradient(200, 140, 360, 210);
    gr.addColorStop(0, "#3a3e4e");
    gr.addColorStop(0.45, "#23252f");
    gr.addColorStop(1, "#101117");
    cg.fillStyle = gr;
    cg.fillRect(0, 0, W, H);
    cg.globalCompositeOperation = "source-atop";
    cg.strokeStyle = "rgba(0,0,0,.35)";
    cg.lineWidth = 3;
    for (const [y, s] of [
      [156, 1],
      [194, -1],
    ]) {
      cg.beginPath();
      cg.moveTo(200, y + 10);
      cg.quadraticCurveTo(281, y - 6 * s, 366, y + 4);
      cg.stroke();
    } // wraps
    cg.strokeStyle = "rgba(255,255,255,.1)";
    cg.lineWidth = 2;
    for (const y of [152, 182]) {
      cg.beginPath();
      cg.moveTo(204, y + 8);
      cg.quadraticCurveTo(281, y - 8, 362, y + 2);
      cg.stroke();
    }
    cg.globalCompositeOperation = "destination-out";
    const slit = (c) => {
      c.beginPath();
      c.moveTo(294, 170);
      c.quadraticCurveTo(330, 161, 364, 167);
      c.lineTo(366, 182);
      c.quadraticCurveTo(330, 177, 296, 185);
      c.closePath();
    };
    slit(cg);
    cg.fill();
    // shadow under the cloth, then the cloth, then what shows through the slit
    const sh = document.createElement("canvas");
    sh.width = W;
    sh.height = H;
    const sg = sh.getContext("2d");
    sg.filter = "blur(4px)";
    sg.drawImage(cloth, 2, 5);
    sg.filter = "none";
    sg.globalCompositeOperation = "source-in";
    sg.fillStyle = "rgba(0,0,0,.55)";
    sg.fillRect(0, 0, W, H);
    sg.globalCompositeOperation = "destination-in";
    sg.drawImage(P.turret, 0, 0, W, H);
    g.drawImage(sh, 0, 0);
    slit(g);
    g.fillStyle = "#07080c";
    g.fill();
    g.save();
    slit(g);
    g.clip();
    g.fillStyle = "#f4f6ff";
    for (const x of [316, 346]) {
      g.beginPath();
      g.ellipse(x, 175, 8, 4, -0.1, 0, 7);
      g.fill();
    }
    g.fillStyle = "#2a5fd0";
    for (const x of [319, 349]) {
      g.beginPath();
      g.arc(x, 175, 2.6, 0, 7);
      g.fill();
    }
    g.restore();
    g.drawImage(cloth, 0, 0);
    // outline of the cloth and the slit
    const ol = document.createElement("canvas");
    ol.width = W;
    ol.height = H;
    const og = ol.getContext("2d");
    for (const [dx, dy] of [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ]) {
      og.drawImage(cloth, dx, dy);
    }
    og.globalCompositeOperation = "destination-out";
    og.drawImage(cloth, 0, 0);
    og.globalCompositeOperation = "source-in";
    og.fillStyle = K.ink;
    og.fillRect(0, 0, W, H);
    g.drawImage(ol, 0, 0);
    g.save();
    g.globalAlpha = 0.3;
    g.fillStyle = "#fff";
    g.beginPath();
    g.ellipse(250, 160, 26, 8, -0.45, 0, 7);
    g.fill();
    g.restore(); // sheen
    // the knot
    const knot = (c) => {
      c.beginPath();
      c.ellipse(212, 176, 13, 10, -0.3, 0, 7);
    };
    knot(g);
    g.fillStyle = K.lin(200, 166, 224, 188, [
      [0, "#3c4052"],
      [1, "#15161d"],
    ]);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 2.5;
    g.stroke();
    K.gloss(knot, 0.25, 3, 4);
  },
};
EXT_ITEM["nj-kasa"] = {
  draw(g, K) {
    // a wide conical straw hat with a red chin cord
    const cx = 281,
      by = 150,
      R = 104;
    K.foot(cx, 156, 74, 12);
    const cord = (side) => {
      g.strokeStyle = K.ink;
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(cx + side * 40, by + 2);
      g.quadraticCurveTo(cx + side * 46, by + 40, cx + side * 30, by + 58);
      g.stroke();
      g.strokeStyle = "#b3242c";
      g.lineWidth = 3;
      g.stroke();
    };
    cord(-1);
    cord(1);
    const hat = (c) => {
      c.beginPath();
      c.moveTo(cx - R, by + 4);
      c.quadraticCurveTo(cx - R * 0.45, by - 22, cx, by - 62);
      c.quadraticCurveTo(cx + R * 0.45, by - 22, cx + R, by + 4);
      c.quadraticCurveTo(cx, by + 22, cx - R, by + 4);
      c.closePath();
    };
    K.shade(hat, 4, 9, 0.35, 5);
    hat(g);
    g.fillStyle = K.lin(cx - R, by - 60, cx + R, by + 20, [
      [0, "#f2d58a"],
      [0.45, "#d9b25c"],
      [1, "#8f6a2a"],
    ]);
    g.fill();
    g.save();
    hat(g);
    g.clip();
    g.strokeStyle = "rgba(110,78,28,.55)";
    g.lineWidth = 1.4;
    for (let j = -10; j <= 10; j++) {
      g.beginPath();
      g.moveTo(cx, by - 62);
      g.lineTo(cx + j * 11, by + 16);
      g.stroke();
    } // straw ribs
    g.strokeStyle = "rgba(255,240,190,.35)";
    g.lineWidth = 2;
    for (let k = 1; k <= 5; k++) {
      const t = k / 6;
      g.beginPath();
      g.ellipse(cx, by - 62 + t * 70, R * t, R * t * 0.17, 0, Math.PI * 0.05, Math.PI * 0.95);
      g.stroke();
    } // weave rings
    g.fillStyle = "rgba(80,50,15,.35)";
    g.beginPath();
    g.moveTo(cx, by - 62);
    g.quadraticCurveTo(cx + R * 0.45, by - 22, cx + R, by + 4);
    g.quadraticCurveTo(cx + R * 0.5, by + 12, cx + 10, by + 14);
    g.closePath();
    g.fill(); // the side away from the light
    g.restore();
    hat(g);
    g.strokeStyle = K.ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = "#5a3a14";
    g.beginPath();
    g.ellipse(cx, by - 60, 6, 3.5, 0, 0, 7);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 1.5;
    g.stroke(); // the knot at the top
    g.save();
    g.globalAlpha = 0.35;
    g.fillStyle = "#fffbe6";
    g.beginPath();
    g.moveTo(cx - 8, by - 54);
    g.quadraticCurveTo(cx - 40, by - 20, cx - 78, by - 2);
    g.quadraticCurveTo(cx - 40, by - 10, cx - 4, by - 40);
    g.closePath();
    g.fill();
    g.restore();
  },
};
EXT_ITEM["nj-katana"] = {
  draw(g, K) {
    // two sheathed swords crossed behind the tank
    const sword = (x, y, rot, sageo) => {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      const saya = (c) => {
        c.beginPath();
        c.moveTo(-6, 0);
        c.lineTo(6, 0);
        c.lineTo(7, 150);
        c.quadraticCurveTo(0, 160, -7, 150);
        c.closePath();
      };
      const tsuka = (c) => {
        c.beginPath();
        c.roundRect(-6.5, -66, 13, 60, 5);
      };
      g.save();
      g.translate(5, 8);
      g.filter = "blur(4px)";
      g.globalAlpha = 0.35;
      saya(g);
      g.fillStyle = "#000";
      g.fill();
      tsuka(g);
      g.fill();
      g.restore();
      saya(g);
      g.fillStyle = K.lin(-7, 0, 7, 0, [
        [0, "#2a1416"],
        [0.35, "#5a1c22"],
        [0.55, "#2c0c10"],
        [1, "#120607"],
      ]);
      g.fill();
      g.strokeStyle = K.ink;
      g.lineWidth = 2.5;
      g.stroke();
      g.fillStyle = "rgba(255,255,255,.35)";
      g.fillRect(-3.5, 4, 2, 140); // lacquer shine
      g.fillStyle = "#d4af37";
      g.beginPath();
      g.moveTo(-7, 144);
      g.lineTo(7, 144);
      g.quadraticCurveTo(0, 162, -7, 150);
      g.closePath();
      g.fill();
      g.strokeStyle = K.ink;
      g.lineWidth = 1.5;
      g.stroke(); // kojiri cap
      g.strokeStyle = K.ink;
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(-7, 22);
      g.quadraticCurveTo(-18, 40, -10, 62);
      g.stroke();
      g.strokeStyle = sageo;
      g.lineWidth = 3.5;
      g.stroke(); // cord
      g.fillStyle = sageo;
      g.fillRect(-7, 18, 14, 7);
      g.strokeStyle = K.ink;
      g.lineWidth = 1.5;
      g.strokeRect(-7, 18, 14, 7);
      g.fillStyle = K.lin(-14, -6, 14, 2, [
        [0, "#fff3b0"],
        [0.5, "#c99a2e"],
        [1, "#6e4a10"],
      ]);
      g.beginPath();
      g.ellipse(0, -3, 14, 5, 0, 0, 7);
      g.fill();
      g.strokeStyle = K.ink;
      g.lineWidth = 2;
      g.stroke(); // tsuba
      tsuka(g);
      g.fillStyle = "#f2ece0";
      g.fill();
      g.strokeStyle = K.ink;
      g.lineWidth = 2.5;
      g.stroke();
      g.save();
      tsuka(g);
      g.clip();
      g.fillStyle = "#16171d";
      for (let k = 0; k < 6; k++) {
        const yy = -60 + k * 9.5;
        g.beginPath();
        g.moveTo(-7, yy);
        g.lineTo(0, yy + 4.5);
        g.lineTo(7, yy);
        g.lineTo(7, yy + 3);
        g.lineTo(0, yy + 7.5);
        g.lineTo(-7, yy + 3);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(-7, yy + 9.5);
        g.lineTo(0, yy + 5);
        g.lineTo(7, yy + 9.5);
        g.lineTo(7, yy + 6.5);
        g.lineTo(0, yy + 2);
        g.lineTo(-7, yy + 6.5);
        g.closePath();
        g.fill();
      }
      g.restore();
      g.fillStyle = "#c99a2e";
      g.beginPath();
      g.roundRect(-7, -70, 14, 7, 3);
      g.fill();
      g.strokeStyle = K.ink;
      g.lineWidth = 1.5;
      g.stroke(); // kashira
      g.restore();
    };
    sword(206, 104, 0.62, "#2a5fd0");
    sword(150, 96, -0.55, "#c8242c");
  },
};
EXT_ITEM["nj-banner"] = {
  draw(g, K) {
    // a tall sashimono banner on a pole behind the tank, with an invented crest
    g.save();
    g.filter = "blur(4px)";
    g.globalAlpha = 0.3;
    g.strokeStyle = "#000";
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(192, 238);
    g.lineTo(178, 28);
    g.stroke();
    g.fillStyle = "#000";
    g.fillRect(186, 44, 58, 134);
    g.restore();
    g.strokeStyle = K.ink;
    g.lineWidth = 9;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(188, 234);
    g.lineTo(175, 22);
    g.stroke();
    g.strokeStyle = "#2b1a10";
    g.lineWidth = 5;
    g.stroke();
    g.strokeStyle = K.ink;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(176, 36);
    g.lineTo(240, 36);
    g.stroke();
    g.strokeStyle = "#2b1a10";
    g.lineWidth = 3;
    g.stroke(); // cross pole
    const fl = (c) => {
      c.beginPath();
      c.moveTo(178, 38);
      c.lineTo(238, 38);
      c.bezierCurveTo(242, 80, 234, 130, 240, 172);
      c.lineTo(186, 176);
      c.bezierCurveTo(182, 130, 186, 84, 178, 38);
      c.closePath();
    };
    fl(g);
    g.fillStyle = K.lin(178, 38, 240, 176, [
      [0, "#f4efe2"],
      [1, "#d8d0bc"],
    ]);
    g.fill();
    g.save();
    fl(g);
    g.clip();
    g.fillStyle = "#a3141c";
    g.fillRect(170, 36, 80, 18);
    g.fillRect(170, 156, 80, 24);
    NJ_crest(g, 210, 104, 22, "#16171d");
    g.fillStyle = "rgba(0,0,0,.12)";
    g.beginPath();
    g.moveTo(222, 38);
    g.bezierCurveTo(230, 90, 222, 130, 228, 176);
    g.lineTo(240, 176);
    g.bezierCurveTo(234, 130, 242, 80, 238, 38);
    g.closePath();
    g.fill();
    g.restore();
    fl(g);
    g.strokeStyle = K.ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = "#c99a2e";
    g.beginPath();
    g.arc(175, 20, 6, 0, 7);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 2;
    g.stroke();
  },
};
EXT_ITEM["nj-shuriken"] = {
  draw(g, K) {
    // a round lacquered plate on the hull with a steel throwing star
    const cx = 392,
      cy = 270,
      R = 36;
    const plate = (c) => {
      c.beginPath();
      c.ellipse(cx, cy, R, R * 0.94, 0, 0, 7);
    };
    K.shade(plate, 3, 5, 0.4, 3);
    plate(g);
    g.fillStyle = K.ink;
    g.fill();
    g.beginPath();
    g.ellipse(cx, cy, R - 2.5, (R - 2.5) * 0.94, 0, 0, 7);
    g.fillStyle = K.rad(cx - 10, cy - 12, 4, R, [
      [0, "#d0353c"],
      [0.7, "#8e1219"],
      [1, "#4a070b"],
    ]);
    g.fill();
    g.strokeStyle = "#d4af37";
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(cx, cy, R - 7, (R - 7) * 0.94, 0, 0, 7);
    g.stroke();
    g.save();
    g.filter = "blur(2px)";
    g.globalAlpha = 0.45;
    NJ_shuriken(g, cx + 2, cy + 3, R * 0.72, 0.4, "#000", "#000", "rgba(0,0,0,0)");
    g.restore();
    NJ_shuriken(g, cx, cy, R * 0.72, 0.4, "#e9eef5", "#6c7682", K.ink);
    K.gloss(plate, 0.18, 4, 6);
  },
};
EXT_ITEM["nj-fan"] = {
  draw(g, K) {
    // an iron war fan, opened out and tilted, hanging from the barrel on a red cord
    const px = 452,
      py = 222,
      R = 52,
      rot = -0.35,
      a0 = Math.PI * 1.08 + rot,
      a1 = Math.PI * 1.92 + rot;
    g.strokeStyle = K.ink;
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(440, 162);
    g.quadraticCurveTo(470, 196, px, py);
    g.stroke();
    g.strokeStyle = "#c8242c";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = "#c8242c";
    g.beginPath();
    g.ellipse(440, 162, 5, 3, 0, 0, 7);
    g.fill();
    g.strokeStyle = "#c8242c";
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(px, py);
    g.quadraticCurveTo(px + 6, py + 14, px + 2, py + 24);
    g.stroke();
    g.fillStyle = "#d4af37";
    g.beginPath();
    g.ellipse(px + 2, py + 27, 3, 5, 0, 0, 7);
    g.fill(); // tassel
    const leaf = (c) => {
      c.beginPath();
      c.moveTo(px, py);
      c.arc(px, py, R, a0, a1);
      c.closePath();
    };
    K.shade(leaf, 4, 7, 0.35, 4);
    leaf(g);
    g.fillStyle = K.rad(px, py, 8, R, [
      [0, "#2a1012"],
      [0.32, "#7a1218"],
      [1, "#c8242c"],
    ]);
    g.fill();
    g.save();
    leaf(g);
    g.clip();
    for (let j = 0; j < 12; j++) {
      const a = a0 + ((a1 - a0) * j) / 12;
      g.fillStyle = j % 2 ? "rgba(0,0,0,.16)" : "rgba(255,255,255,.07)";
      g.beginPath();
      g.moveTo(px, py);
      g.arc(px, py, R, a, a + (a1 - a0) / 12);
      g.closePath();
      g.fill();
    } // pleats
    const am = (a0 + a1) / 2;
    g.fillStyle = "#f4efe2";
    g.beginPath();
    g.arc(px + Math.cos(am) * R * 0.66, py + Math.sin(am) * R * 0.66, R * 0.17, 0, 7);
    g.fill(); // a white moon
    g.strokeStyle = "#d4af37";
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(px, py, R - 4, a0, a1);
    g.stroke();
    g.restore();
    g.strokeStyle = "#16171d";
    g.lineWidth = 3.5;
    for (const a of [a0, a1]) {
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(a) * (R + 2), py + Math.sin(a) * (R + 2));
      g.stroke();
    } // iron guard ribs
    leaf(g);
    g.strokeStyle = K.ink;
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = "#d4af37";
    g.beginPath();
    g.arc(px, py, 5, 0, 7);
    g.fill();
    g.strokeStyle = K.ink;
    g.lineWidth = 1.5;
    g.stroke();
  },
};
EXT_ITEM["nj-aura"] = { aura: "smokebomb" };
// hand-made pictures for the Shinobi items: cut from the pictures of each item fitted on the tank (lined up on the game's tank exactly)
const NJ_PICS = {
  "nj-hood": "ttcl-art:0b8556c666f2.webp",
  "nj-kasa": "ttcl-art:8a603e79154d.webp",
  "nj-katana": "ttcl-art:87889e110877.webp",
  "nj-banner": "ttcl-art:2b0034391bd2.webp",
  "nj-shuriken": "ttcl-art:390f66e6580c.webp",
  "nj-fan": "ttcl-art:2a1223acc641.webp",
  "nj-aura": "ttcl-art:bd26d429eaaf.webp",
};
// hand-made pictures of items on the tank (graffiti bandanas, safari hat and binoculars, all the eyewear), fitted to the game tank like the Shinobi items
export const GF_BANDANA_PICS = {
  "rc-exhaust": "ttcl-art:6bc745eecc07.webp",
  "gf-bandana-neonblack": "ttcl-art:ffd8afba9d67.webp",
  "gf-bandana-neonwhite": "ttcl-art:5e5d82f7300e.webp",
  "gf-bandana-red": "ttcl-art:6fe7efe9fcf0.webp",
  "gf-bandana-blue": "ttcl-art:6cfc421ad159.webp",
  "gf-bandana-camo": "ttcl-art:6d2a29913404.webp",
  "gf-bandana-pink": "ttcl-art:53e26e680ea3.webp",
  "sf-binos": "ttcl-art:240e9292c811.webp",
  "sf-hat": "ttcl-art:1faff5d7ce59.webp",
  "ew-aviator": "ttcl-art:ca79cbb5ffba.webp",
  "ew-ski": "ttcl-art:afb9bbeb57cf.webp",
  "ew-steampunk": "ttcl-art:560b8a773672.webp",
  "ew-nightvision": "ttcl-art:88d858c96961.webp",
  "ew-hearts": "ttcl-art:a2a35a5dc37c.webp",
  "ew-visor": "ttcl-art:abaabb3164ae.webp",
  "ew-stars": "ttcl-art:28f63c27f467.webp",
  "ew-3d": "ttcl-art:0eb04ca7554e.webp",
  "ew-monocle": "ttcl-art:8825bcd71f85.webp",
  "ew-sakura-black": "ttcl-art:a6450a355fef.webp",
  "ew-sakura-black-sq": "ttcl-art:d94ef4d31d2e.webp",
  "ew-sakura-white": "ttcl-art:14ceb58bf105.webp",
  "ew-sakura-white-sq": "ttcl-art:86ce4ef9968b.webp",
};
for (const k in GF_BANDANA_PICS) {
  EXT_ITEM[k] = {
    uses: [GF_BANDANA_PICS[k]],
    draw(g, K, P, A) {
      const im = A[GF_BANDANA_PICS[k]];
      if (im) {
        g.drawImage(im, 0, 0, 640, 384);
      }
    },
  };
}
// v1.0: items cut from wazzey's pictures of each item on the tank (lined up on the game's tank, like the ones above):
// the redrawn Achievements, Galaxy and themed-box items, the Cursed Seal and Streetwear boxes, and the colour versions
Object.assign(GX_ACC, {
  "ds-anchor-front": { slot: "front", name: "Anchor & Rope", box: "deepsea" },
  "cs-visor-fancy": { slot: "turret", name: "High Roller Visor", box: "casino" },
  "cu-talismans": { slot: "turret", name: "Sealing Talismans", box: "cursed" },
  "cu-beads": { slot: "front", name: "Prayer Beads", box: "cursed" },
  "cu-blade": { slot: "barrel", name: "Bound Blade", box: "cursed" },
  "cu-eye": { slot: "back", name: "Watcher Eye", box: "cursed" },
  "cu-aura": { slot: "front", name: "Aura: Cursed Flame", box: "cursed" },
  "st-headphones": { slot: "turret", name: "Headphones (Pink)", box: "streetwear" },
  "st-chain": { slot: "front", name: "Gold Rope Chain", box: "streetwear" },
  "st-boombox": { slot: "back", name: "Boombox", box: "streetwear" },
  "st-hood": { slot: "back", name: "Hoodie Hood", box: "streetwear" },
  "st-beanie": { slot: "turret", name: "Beanie (Mustard)", box: "streetwear" },
  "st-beanie-rainbow": { slot: "turret", name: "Rainbow Beanie", box: "streetwear" },
  "st-beanie-stripes": { slot: "turret", name: "Striped Beanie (Red, Gold & Green)", box: "streetwear" },
  "st-sneakers": { slot: "barrel", name: "Hanging Sneakers (Pink & Lime)", box: "streetwear" },
  "st-sneakers-lowtop": { slot: "barrel", name: "Hanging Low-Tops", box: "streetwear" },
  "st-sneakers-chunky": { slot: "barrel", name: "Hanging Chunky Trainers", box: "streetwear" },
  "st-sneakers-court": { slot: "barrel", name: "Hanging Court High-Tops", box: "streetwear" },
  "st-sneakers-gold": { slot: "barrel", name: "Hanging Gold Sneakers", box: "streetwear" },
  "st-headphones-lime": { slot: "turret", name: "Headphones (Lime)", box: "streetwear" },
  "st-headphones-white": { slot: "turret", name: "Headphones (White)", box: "streetwear" },
  "st-headphones-cyan": { slot: "turret", name: "Headphones (Cyan)", box: "streetwear" },
  "st-beanie-red": { slot: "turret", name: "Beanie (Red)", box: "streetwear" },
  "st-beanie-black": { slot: "turret", name: "Beanie (Black)", box: "streetwear" },
  "st-beanie-grey": { slot: "turret", name: "Beanie (Grey)", box: "streetwear" },
  "st-beanie-navy": { slot: "turret", name: "Beanie (Navy)", box: "streetwear" },
  "st-beanie-pink": { slot: "turret", name: "Beanie (Pink)", box: "streetwear" },
  "st-beanie-black-red": { slot: "turret", name: "Beanie (Black & Red)", box: "streetwear" },
  "st-beanie-navy-white": { slot: "turret", name: "Beanie (Navy & White)", box: "streetwear" },
  "st-beanie-pink-lime": { slot: "turret", name: "Beanie (Pink & Lime)", box: "streetwear" },
  "st-beanie-stripes-sunset": { slot: "turret", name: "Striped Beanie (Sunset)", box: "streetwear" },
  "st-beanie-stripes-mono": { slot: "turret", name: "Striped Beanie (Mono)", box: "streetwear" },
  "st-beanie-stripes-ocean": { slot: "turret", name: "Striped Beanie (Ocean)", box: "streetwear" },
  "st-beanie-stripes-candy": { slot: "turret", name: "Striped Beanie (Candy)", box: "streetwear" },
  "st-sneakers-red-black": { slot: "barrel", name: "Hanging Sneakers (Red & Black)", box: "streetwear" },
  "st-sneakers-blue-orange": { slot: "barrel", name: "Hanging Sneakers (Blue & Orange)", box: "streetwear" },
  "st-sneakers-purple-yellow": { slot: "barrel", name: "Hanging Sneakers (Purple & Yellow)", box: "streetwear" },
  "st-sneakers-black-white": { slot: "barrel", name: "Hanging Sneakers (Black & White)", box: "streetwear" },
  "st-sneakers-teal-coral": { slot: "barrel", name: "Hanging Sneakers (Teal & Coral)", box: "streetwear" },
  "aw-beret-maroon": { slot: "turret", name: "Veteran (Maroon)", box: "hall" },
  "aw-beret-navy": { slot: "turret", name: "Veteran (Navy)", box: "hall" },
  "aw-beret-black": { slot: "turret", name: "Veteran (Black)", box: "hall" },
  "ww-hat-black": { slot: "turret", name: "Cowboy Hat (Black)", box: "wildwest" },
  "ww-hat-white": { slot: "turret", name: "Cowboy Hat (White)", box: "wildwest" },
  "sm-tophat-black": { slot: "turret", name: "Goggle Top Hat (Black)", box: "steampunk" },
  "sm-tophat-plum": { slot: "turret", name: "Goggle Top Hat (Plum)", box: "steampunk" },
  "tp-straw-blue": { slot: "turret", name: "Straw Hat (Blue)", box: "tropical" },
  "tp-straw-pink": { slot: "turret", name: "Straw Hat (Pink)", box: "tropical" },
  "aw-nightcap-pink": { slot: "turret", name: "Nightcap (Pink)", box: "hall" },
  "aw-nightcap-green": { slot: "turret", name: "Nightcap (Green)", box: "hall" },
  "cn-cupcake-mint": { slot: "turret", name: "Cupcake Hat (Mint)", box: "sweets" },
  "cn-cupcake-chocolate": { slot: "turret", name: "Cupcake Hat (Chocolate)", box: "sweets" },
  "kg-plume-blue": { slot: "turret", name: "Knight Plume (Blue)", box: "kingdom" },
  "kg-plume-white": { slot: "turret", name: "Knight Plume (White)", box: "kingdom" },
  "kg-plume-gold": { slot: "turret", name: "Knight Plume (Gold)", box: "kingdom" },
  "kg-banner-red": { slot: "back", name: "Royal Banner (Red)", box: "kingdom" },
  "kg-banner-blue": { slot: "back", name: "Royal Banner (Blue)", box: "kingdom" },
  "kg-banner-green": { slot: "back", name: "Royal Banner (Green)", box: "kingdom" },
  "cs-visor-red": { slot: "turret", name: "Dealer Visor (Red)", box: "casino" },
  "cs-visor-blue": { slot: "turret", name: "Dealer Visor (Blue)", box: "casino" },
  "tp-surf-pink-purple": { slot: "back", name: "Surfboard (Pink & Purple)", box: "tropical" },
  "tp-surf-yellow-blue": { slot: "back", name: "Surfboard (Yellow & Blue)", box: "tropical" },
  "aw-blanket-blue": { slot: "turret", name: "Cosy Blanket (Blue)", box: "hall" },
  "aw-blanket-green": { slot: "turret", name: "Cosy Blanket (Green)", box: "hall" },
  "ds-ring-orange": { slot: "back", name: "Life Ring (Orange)", box: "deepsea" },
  "ds-ring-blue": { slot: "back", name: "Life Ring (Blue)", box: "deepsea" },
});
export const V1_PICS = {
  "aw-sparklecrown": "ttcl-art:9c2e14fe6735.webp",
  "aw-goldbars": "ttcl-art:f0213e6d22a1.webp",
  "aw-ace": "ttcl-art:bb0a13e4719f.webp",
  "aw-beret": "ttcl-art:0c4da16549fe.webp",
  "aw-skulltally": "ttcl-art:4140395661f9.webp",
  "aw-yinyang": "ttcl-art:1eaef61b3d39.webp",
  "aw-raincloud": "ttcl-art:453c6aa01aa7.webp",
  "aw-scope": "ttcl-art:3e1fba7ce133.webp",
  "aw-radar": "ttcl-art:e727daee2867.webp",
  "aw-smokebarrel": "ttcl-art:4b8c3bc9ba5b.webp",
  "aw-rose": "ttcl-art:4202f3ca752a.webp",
  "aw-riotshield": "ttcl-art:013b38b48bdd.webp",
  "aw-crates": "ttcl-art:cdbc3653c1c6.webp",
  "aw-stopwatch": "ttcl-art:d4b33d12c0b7.webp",
  "aw-boomerang": "ttcl-art:5565e71d818f.webp",
  "aw-blanket": "ttcl-art:23d7ffc031db.webp",
  "aw-nightcap": "ttcl-art:fff4bc1200ca.webp",
  "aw-phoenix": "ttcl-art:f2a631c82420.webp",
  "aw-mirror": "ttcl-art:b6b157c988ca.webp",
  "aw-bracelets": "ttcl-art:a974f0030c87.webp",
  "aw-suitcase": "ttcl-art:b98ac8984f3f.webp",
  "aw-slots": "ttcl-art:32f5ee5d0a11.webp",
  "aw-discoball": "ttcl-art:8623bce8cd68.webp",
  "aw-detector": "ttcl-art:c34aad0f33dc.webp",
  "aw-calendar": "ttcl-art:0da0c8b05ffb.webp",
  "gx-planet": "ttcl-art:32f5114612df.webp",
  "gx-ufo": "ttcl-art:c613504928c0.webp",
  "gx-helmet": "ttcl-art:d662cc3ecb87.webp",
  "gx-moon": "ttcl-art:9658c1aab28f.webp",
  "gx-blackhole": "ttcl-art:bce26653b8d6.webp",
  "gx-rocket": "ttcl-art:c760492793b9.webp",
  "gx-comet": "ttcl-art:167a696921aa.webp",
  "gx-raygun": "ttcl-art:5d20eb998376.webp",
  "gx-earth": "ttcl-art:bdf50c96168d.webp",
  "gx-shootingstar": "ttcl-art:3ab7c2cfb4fe.webp",
  "sh-eyes": "ttcl-art:d563ed306dfa.webp",
  "hk-visor": "ttcl-art:da7baec8dead.webp",
  "ds-fin": "ttcl-art:14d6830ee049.webp",
  "ds-anchor": "ttcl-art:f83f6a8f14bd.webp",
  "ds-ring": "ttcl-art:7baadbe1ae00.webp",
  "cn-cupcake": "ttcl-art:52b952fe76d3.webp",
  "cn-lolly": "ttcl-art:5d94e05e7348.webp",
  "cn-cane": "ttcl-art:c2baa9401148.webp",
  "ac-crown": "ttcl-art:49bc27f67566.webp",
  "ac-shades": "ttcl-art:6eb86a033ee4.webp",
  "sf-flag": "ttcl-art:fef36a5fb07b.webp",
  "sm-tophat": "ttcl-art:52e014022087.webp",
  "sm-stack": "ttcl-art:034c2a48a2ce.webp",
  "sm-gears": "ttcl-art:9d1fb2fd7cc4.webp",
  "kg-plume": "ttcl-art:6f531f3ab4b9.webp",
  "kg-banner": "ttcl-art:07ebeaa913cd.webp",
  "kg-shield": "ttcl-art:a6943adcf88b.webp",
  "ww-hat": "ttcl-art:21525ca23dfc.webp",
  "ww-badge": "ttcl-art:9b7c881c9e4e.webp",
  "ww-cactus": "ttcl-art:3f2ebfd1746a.webp",
  "tp-straw": "ttcl-art:f92e75c47030.webp",
  "tp-palm": "ttcl-art:df339e55418f.webp",
  "tp-surf": "ttcl-art:43f5d628818f.webp",
  "mc-radar": "ttcl-art:92bf703d99f7.webp",
  "cs-visor": "ttcl-art:aba486af413c.webp",
  "cs-chips": "ttcl-art:18b8d06ffe41.webp",
  "cs-dice": "ttcl-art:1547d1152b19.webp",
  "ds-anchor-front": "ttcl-art:e58fad04a73a.webp",
  "cs-visor-fancy": "ttcl-art:aad13f290926.webp",
  "cu-talismans": "ttcl-art:4982943887b4.webp",
  "cu-beads": "ttcl-art:60b91381730c.webp",
  "cu-blade": "ttcl-art:173b404424b8.webp",
  "cu-eye": "ttcl-art:adcd17f51c46.webp",
  "cu-aura": "ttcl-art:b33bd3de051f.webp",
  "st-headphones": "ttcl-art:35a83f7ff987.webp",
  "st-chain": "ttcl-art:61101c3da2d3.webp",
  "st-boombox": "ttcl-art:8444cdb3d8f9.webp",
  "st-hood": "ttcl-art:500fb0df72df.webp",
  "st-beanie": "ttcl-art:6f42b2d046f7.webp",
  "st-beanie-rainbow": "ttcl-art:ab497269ad14.webp",
  "st-beanie-stripes": "ttcl-art:5ea402a70a0d.webp",
  "st-sneakers": "ttcl-art:ae99abe29c27.webp",
  "st-sneakers-lowtop": "ttcl-art:bedddac42093.webp",
  "st-sneakers-chunky": "ttcl-art:3a5c4317a94f.webp",
  "st-sneakers-court": "ttcl-art:f7fafa3fbad0.webp",
  "st-sneakers-gold": "ttcl-art:d979b3532eb2.webp",
  "st-headphones-lime": "ttcl-art:4c885b5f7ba2.webp",
  "st-headphones-white": "ttcl-art:e0486f5341b7.webp",
  "st-headphones-cyan": "ttcl-art:406e83d9a131.webp",
  "st-beanie-red": "ttcl-art:d60b276824fa.webp",
  "st-beanie-black": "ttcl-art:828e16893984.webp",
  "st-beanie-grey": "ttcl-art:b8b567123a77.webp",
  "st-beanie-navy": "ttcl-art:5eb84aa0ec0e.webp",
  "st-beanie-pink": "ttcl-art:9d17fa60e6d6.webp",
  "st-beanie-black-red": "ttcl-art:c2b3ebcbe441.webp",
  "st-beanie-navy-white": "ttcl-art:5635206d0237.webp",
  "st-beanie-pink-lime": "ttcl-art:5c9a75f3fa17.webp",
  "st-beanie-stripes-sunset": "ttcl-art:b9e8cc23056b.webp",
  "st-beanie-stripes-mono": "ttcl-art:e15eb8566c0d.webp",
  "st-beanie-stripes-ocean": "ttcl-art:8a5b22ecc85f.webp",
  "st-beanie-stripes-candy": "ttcl-art:6efe0bc97c0f.webp",
  "st-sneakers-red-black": "ttcl-art:1ab44263f873.webp",
  "st-sneakers-blue-orange": "ttcl-art:59a12077083b.webp",
  "st-sneakers-purple-yellow": "ttcl-art:acc0cc2028e2.webp",
  "st-sneakers-black-white": "ttcl-art:4e6916abd58b.webp",
  "st-sneakers-teal-coral": "ttcl-art:6e7cf266b3dc.webp",
  "aw-beret-maroon": "ttcl-art:6a8a6db89353.webp",
  "aw-beret-navy": "ttcl-art:7d84fdd48e56.webp",
  "aw-beret-black": "ttcl-art:2537af9f0621.webp",
  "ww-hat-black": "ttcl-art:a65dc36cbb1c.webp",
  "ww-hat-white": "ttcl-art:ca56debd385b.webp",
  "sm-tophat-black": "ttcl-art:99cfc4844d2f.webp",
  "sm-tophat-plum": "ttcl-art:a178067d6e69.webp",
  "tp-straw-blue": "ttcl-art:4d39d497fa37.webp",
  "tp-straw-pink": "ttcl-art:e32a5c9e66f2.webp",
  "aw-nightcap-pink": "ttcl-art:6d70fc68628f.webp",
  "aw-nightcap-green": "ttcl-art:76d238572758.webp",
  "cn-cupcake-mint": "ttcl-art:94b6ce5abff5.webp",
  "cn-cupcake-chocolate": "ttcl-art:a74ad6cbf90f.webp",
  "kg-plume-blue": "ttcl-art:8056bfec8f61.webp",
  "kg-plume-white": "ttcl-art:088775bef3b6.webp",
  "kg-plume-gold": "ttcl-art:e7dcbdce0cd8.webp",
  "kg-banner-red": "ttcl-art:78ef385e8d2a.webp",
  "kg-banner-blue": "ttcl-art:4c7bb3865384.webp",
  "kg-banner-green": "ttcl-art:658899470673.webp",
  "cs-visor-red": "ttcl-art:4d7778245657.webp",
  "cs-visor-blue": "ttcl-art:1b1e14d0e0da.webp",
  "tp-surf-pink-purple": "ttcl-art:569c03a0ac1f.webp",
  "tp-surf-yellow-blue": "ttcl-art:c8aed48f95a1.webp",
  "aw-blanket-blue": "ttcl-art:7e695ca27cbe.webp",
  "aw-blanket-green": "ttcl-art:11bb71f2710b.webp",
  "ds-ring-orange": "ttcl-art:82634db7c356.webp",
  "ds-ring-blue": "ttcl-art:e57376e103ba.webp",
};
const V1_AURA = new Set(["cu-aura"]);
for (const k in V1_PICS) {
  EXT_ITEM[k] = {
    uses: [V1_PICS[k]],
    aura: V1_AURA.has(k) ? "pic" : undefined,
    draw(g, K, P, A) {
      const im = A[V1_PICS[k]];
      if (im) {
        g.drawImage(im, 0, 0, 640, 384);
      }
    },
  };
}
for (const k in NJ_PICS) {
  EXT_ITEM[k] = {
    uses: [NJ_PICS[k]],
    aura: k === "nj-aura" ? "pic" : undefined,
    draw(g, K, P, A) {
      const im = A[NJ_PICS[k]];
      if (!im) {
        return;
      }
      if (k === "nj-katana") {
        g.drawImage(im, -30, -50, 672, 403);
      } else {
        g.drawImage(im, 0, 0, 640, 384);
      }
    },
  };
} // (fitted on the tank in the author's pictures, their own shadows included; the katanas raised so they show over the turret)
EXT_AURA.smokebomb = ({ g, edge, cx, cy, hash, bloom, star }) => {
  // grey smoke puffs bursting off the tank, ink swirls and a few plum petals
  bloom("#8a8fa0", 20, 0.18, 2);
  for (let k = 0; k < 30 && edge.length; k++) {
    const [x0, y0] = edge[Math.floor(hash(k, 1, 931) * edge.length)];
    const d = 0.2 + hash(k, 2, 931) * 0.3,
      x = x0 + (x0 - cx) * d,
      y = y0 + (y0 - cy) * d - hash(k, 5, 931) * 10,
      r = 9 + hash(k, 3, 931) * 13,
      v = 190 + hash(k, 4, 931) * 50;
    g.fillStyle = `rgba(${v},${v},${v + 6},${0.5 + hash(k, 6, 931) * 0.3})`;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.arc(x + r * 0.7, y + 3, r * 0.6, 0, 7);
    g.arc(x - r * 0.65, y + 4, r * 0.5, 0, 7);
    g.fill();
    g.fillStyle = "rgba(255,255,255,.25)";
    g.beginPath();
    g.arc(x - r * 0.25, y - r * 0.3, r * 0.4, 0, 7);
    g.fill();
  }
  g.lineCap = "round";
  for (let k = 0; k < 7 && edge.length; k++) {
    const [x0, y0] = edge[Math.floor(hash(k, 7, 932) * edge.length)];
    const x = x0 + (x0 - cx) * 0.45,
      y = y0 + (y0 - cy) * 0.45,
      r = 8 + hash(k, 8, 932) * 8;
    g.strokeStyle = "rgba(20,22,30,.6)";
    g.lineWidth = 2.5;
    g.beginPath();
    for (let t = 0; t < 9; t += 0.3) {
      g.lineTo(x + (Math.cos(t + k) * r * t) / 9, y + (Math.sin(t + k) * r * t) / 9);
    }
    g.stroke();
  }
  for (let k = 0; k < 10 && edge.length; k++) {
    const [x0, y0] = edge[Math.floor(hash(k, 9, 933) * edge.length)];
    const x = x0 + (x0 - cx) * (0.4 + hash(k, 3, 933) * 0.3),
      y = y0 + (y0 - cy) * (0.4 + hash(k, 4, 933) * 0.3);
    g.save();
    g.translate(x, y);
    g.rotate(hash(k, 5, 933) * 6.3);
    g.fillStyle = k % 2 ? "#ffb7c9" : "#e8607e";
    g.beginPath();
    g.ellipse(0, 0, 6, 3.5, 0, 0, 7);
    g.fill();
    g.fillStyle = "rgba(255,255,255,.4)";
    g.beginPath();
    g.ellipse(-1.5, -1, 2.5, 1.2, 0, 0, 7);
    g.fill();
    g.restore();
  }
  for (let k = 0; k < 6; k++) {
    const [x, y] = edge[Math.floor(hash(k, 9, 934) * edge.length)] || [320, 200];
    star(x + (x - cx) * 0.35, y + (y - cy) * 0.35, 2 + hash(k, 3, 934) * 3, "#ffe6b0", 0.8);
  }
  return null;
};
// --- paints (400 x 240 tiles) ---
EXT_PAINT_ART["pt-indigo"] = (g, { W, HH, fbm, field, mix }) => {
  // shibori: indigo cloth with white tie-dye rings and soft fold lines
  const deep = [18, 30, 74],
    mid = [38, 64, 128],
    pale = [222, 230, 244],
    S = 66;
  field(g, (x, y) => {
    const wx = x + (fbm(x / 40, y / 40, 941) - 0.5) * 16,
      wy = y + (fbm(x / 40, y / 40, 942) - 0.5) * 16;
    const row = Math.round(wy / S),
      ox = ((row % 2) * S) / 2,
      col = Math.round((wx - ox) / S),
      d = Math.hypot(wx - (col * S + ox), wy - row * S);
    const ring = Math.exp(-(((d - 21) / 3.6) ** 2)) * 0.9 + Math.exp(-(((d - 9) / 2.6) ** 2)) * 0.7 + (d < 3 ? 0.8 : 0),
      spokes =
        d > 10 && d < 20
          ? Math.pow(Math.abs(Math.cos(Math.atan2(wy - row * S, wx - (col * S + ox)) * 4)), 30) * 0.5
          : 0;
    const fold = Math.exp(-(((wy % (S / 2)) - S / 4) ** 2) / 2) * 0.12,
      n = fbm(x / 9, y / 9, 943) * 0.35;
    const t = Math.min(1, (ring + spokes + fold) * (0.75 + n)),
      b = mix(0, 1, fbm(x / 70, y / 70, 944));
    return [
      mix(mix(deep[0], mid[0], b), pale[0], t),
      mix(mix(deep[1], mid[1], b), pale[1], t),
      mix(mix(deep[2], mid[2], b), pale[2], t),
    ];
  });
};
EXT_PAINT_ART["pt-tidescale"] = (g, { W, HH, shine }) => {
  // overlapping wave scales in teal and cream, a few in gold
  g.fillStyle = "#123a4c";
  g.fillRect(0, 0, W, HH);
  const R = 30;
  for (let row = -1; row < HH / (R / 2) + 2; row++) {
    for (let c = -1; c < W / (R * 2) + 2; c++) {
      const cx = c * R * 2 + (row % 2 ? R : 0),
        cy = (row * R) / 2,
        gold = (row * 7 + c * 3) % 11 === 0;
      for (let k = 0; k < 4; k++) {
        const r = R * (1 - k * 0.23);
        g.fillStyle = k % 2 ? (gold ? "#b8860b" : "#1d4a5e") : gold ? "#e8c25a" : "#f1ead6";
        g.beginPath();
        g.arc(cx, cy, r, Math.PI, 0);
        g.closePath();
        g.fill();
      }
      g.fillStyle = gold ? "#7a5a10" : "#123a4c";
      g.beginPath();
      g.arc(cx, cy, R * 0.2, Math.PI, 0);
      g.closePath();
      g.fill();
    }
  }
  shine(g, 0.16);
};
EXT_PAINT_ART["pt-sumie"] = (g, { W, HH, fbm, field }) => {
  // ink wash: misty mountains on rice paper, a red sun, a few birds
  field(g, (x, y) => {
    const n = fbm(x / 30, y / 30, 951) * 10;
    return [236 - n, 230 - n, 214 - n];
  });
  g.fillStyle = "#c8242c";
  g.globalAlpha = 0.85;
  g.beginPath();
  g.arc(300, 62, 26, 0, 7);
  g.fill();
  g.globalAlpha = 1;
  const ridge = (base, amp, seed, col, a) => {
    g.fillStyle = col;
    g.globalAlpha = a;
    g.beginPath();
    g.moveTo(0, HH);
    for (let x = 0; x <= W; x += 4) {
      g.lineTo(x, base - Math.abs(Math.sin(x / 60 + seed)) * amp - fbm(x / 40, seed, 952) * amp * 0.6);
    }
    g.lineTo(W, HH);
    g.closePath();
    g.fill();
    const mist = g.createLinearGradient(0, base - amp * 0.4, 0, base + 40);
    mist.addColorStop(0, "rgba(236,230,214,0)");
    mist.addColorStop(1, "rgba(236,230,214,.95)");
    g.globalAlpha = 1;
    g.fillStyle = mist;
    g.fillRect(0, base - amp * 0.4, W, 60);
  };
  ridge(130, 70, 1, "#8a8a88", 0.55);
  ridge(175, 60, 3.3, "#55565a", 0.7);
  ridge(225, 46, 5.1, "#26272c", 0.9);
  g.strokeStyle = "#26272c";
  g.lineWidth = 2;
  g.lineCap = "round";
  for (const [x, y, s] of [
    [120, 54, 7],
    [138, 66, 5],
    [156, 50, 6],
  ]) {
    g.beginPath();
    g.moveTo(x - s, y - 2);
    g.quadraticCurveTo(x - s / 2, y - s / 2, x, y);
    g.quadraticCurveTo(x + s / 2, y - s / 2, x + s, y - 2);
    g.stroke();
  }
  g.strokeStyle = "#26272c";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(40, HH);
  g.quadraticCurveTo(46, 190, 70, 168);
  g.stroke();
  g.lineWidth = 1.6;
  for (let k = 0; k < 6; k++) {
    const yy = 200 - k * 6;
    g.beginPath();
    g.moveTo(50 + k * 3, yy);
    g.lineTo(80 + k * 4, yy - 10);
    g.stroke();
  } // a pine branch
};
EXT_PAINT_ART["pt-asanoha"] = (g, { W, HH, shine, fbm, field }) => {
  // hemp-leaf stars: gold lines on crimson
  field(g, (x, y) => {
    const n = (fbm(x / 50, y / 50, 961) - 0.5) * 30;
    return [112 + n, 24 + n * 0.3, 38 + n * 0.4];
  });
  const s = 40,
    h = (s * Math.sqrt(3)) / 2;
  g.strokeStyle = "rgba(240,206,120,.9)";
  g.lineWidth = 1.3;
  for (let r = -1; r < HH / h + 2; r++) {
    for (let c = -1; c < W / s + 2; c++) {
      const x0 = c * s + (r % 2 ? s / 2 : 0),
        y0 = r * h;
      for (const tri of [
        [
          [x0, y0],
          [x0 + s, y0],
          [x0 + s / 2, y0 + h],
        ],
        [
          [x0 + s, y0],
          [x0 + s / 2, y0 + h],
          [x0 + s * 1.5, y0 + h],
        ],
      ]) {
        const mx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3,
          my = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        g.beginPath();
        g.moveTo(tri[0][0], tri[0][1]);
        g.lineTo(tri[1][0], tri[1][1]);
        g.lineTo(tri[2][0], tri[2][1]);
        g.closePath();
        g.stroke();
        for (const p of tri) {
          g.beginPath();
          g.moveTo(p[0], p[1]);
          g.lineTo(mx, my);
          g.stroke();
        }
      }
    }
  }
  shine(g, 0.18);
};
EXT_PAINT_ART["pt-shinobi"] = (g, { W, HH, fbm, field }) => {
  // charcoal cloth with a fine twill weave
  field(g, (x, y) => {
    const tw = ((x + y) % 6 < 3 ? 1 : -1) * 3.5,
      wf = y % 4 < 2 ? 1.5 : -1.5,
      n = (fbm(x / 35, y / 35, 971) - 0.5) * 16;
    const v = 40 + tw * 1.4 + wf + n;
    return [v - 2, v - 1, v + 5];
  });
  const gr = g.createLinearGradient(0, 0, W, HH);
  gr.addColorStop(0, "rgba(255,255,255,.07)");
  gr.addColorStop(0.5, "rgba(255,255,255,0)");
  gr.addColorStop(1, "rgba(0,0,0,.15)");
  g.fillStyle = gr;
  g.fillRect(0, 0, W, HH);
};
// --- the box picture: the Standard box in night indigo with steel throwing stars and a red cord ---
EXT_BOXPIC.ninja = {
  ramp: [
    [0, [8, 10, 22]],
    [0.35, [24, 32, 66]],
    [0.65, [52, 66, 118]],
    [0.88, [150, 168, 210]],
    [1, [250, 248, 255]],
  ],
  overlay(g, W, H, hh) {
    g.fillStyle = "rgba(190,30,40,.9)";
    g.fillRect(0, H * 0.46, W, H * 0.07);
    g.fillStyle = "rgba(255,255,255,.3)";
    g.fillRect(0, H * 0.46, W, H * 0.012);
    for (let k = 0; k < 12; k++) {
      const x = (0.15 + hh(k, 1, 991) * 0.7) * W,
        y = (0.2 + hh(k, 2, 991) * 0.7) * H,
        r = H / 16 + (hh(k, 3, 991) * H) / 16;
      NJ_shuriken(g, x, y, r, hh(k, 4, 991) * 3, "rgba(230,236,245,.95)", "rgba(110,120,135,.95)", "rgba(10,12,20,.9)");
    }
  },
};
// --- the map: a castle courtyard (dark: night, with pale plaster walls; light: raked sand, with charred-timber walls) ---
MOTIF.momiji = (g, w, h, p, i) => {
  // a few maple leaves blown across (pointed shapes, nothing like a bullet)
  for (let k = 0; k < 3; k++) {
    const x = 30 + mapNoise(k, i, 61) * (w - 60),
      y = 30 + mapNoise(i, k, 62) * (h - 60);
    g.save();
    g.translate(x, y);
    g.rotate(mapNoise(k, i, 63) * 6.3);
    g.scale(1.6, 1.6);
    g.globalAlpha = 0.55;
    g.fillStyle = p.spk[k % 2];
    g.beginPath();
    for (let j = 0; j < 14; j++) {
      const a = -Math.PI / 2 + (j * Math.PI * 2) / 14,
        r = j % 2 ? 4 : [10, 8, 6, 5, 6, 8, 10][Math.min(6, j >> 1)];
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(0,0,0,.25)";
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(0, 2);
    g.lineTo(0, 11);
    g.stroke();
    g.restore();
  }
  g.globalAlpha = 0.16;
  g.strokeStyle = p.spk[p.spk.length - 1];
  g.lineWidth = 2;
  g.lineCap = "round";
  const k = i % 4,
    x = 40 + mapNoise(k, i, 64) * (w - 80),
    y = 40 + mapNoise(i, k, 65) * (h - 80); // one faint swirl of raked sand / wind
  g.beginPath();
  for (let t = 0; t < 10; t += 0.25) {
    g.lineTo(x + Math.cos(t) * t * 2.4, y + Math.sin(t) * t * 2.4);
  }
  g.stroke();
  g.globalAlpha = 1;
};
WALL.beams = (g, w, h, p) => {
  g.fillStyle = p.c2;
  for (let x = 22; x < w; x += 54) {
    g.fillRect(x, 0, 6, h);
  }
  g.fillStyle = "rgba(255,255,255,.18)";
  for (let x = 22; x < w; x += 54) {
    g.fillRect(x + 1, 1, 1.5, h - 2);
  }
};
DEC.njfan = (g, s, p) => {
  g.translate(s / 2, s / 2 + 8);
  g.rotate(-0.3);
  g.fillStyle = "rgba(0,0,0,.25)";
  g.beginPath();
  g.moveTo(2, 3);
  g.arc(2, 3, 22, Math.PI * 1.15, Math.PI * 1.85);
  g.closePath();
  g.fill();
  g.fillStyle = p.spk[0];
  g.beginPath();
  g.moveTo(0, 0);
  g.arc(0, 0, 22, Math.PI * 1.15, Math.PI * 1.85);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(0,0,0,.35)";
  g.lineWidth = 1;
  for (let j = 1; j < 6; j++) {
    const a = Math.PI * (1.15 + (j * 0.7) / 6);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
    g.stroke();
  }
  g.fillStyle = "#1a1a22";
  g.fillRect(-1.5, -2, 3, 6);
};
DEC.njbamboo = (g, s) => {
  g.translate(s / 2, s / 2);
  g.rotate(0.8);
  g.fillStyle = "rgba(0,0,0,.25)";
  g.fillRect(-4, -26, 10, 56);
  g.fillStyle = "#7fa04a";
  g.fillRect(-6, -28, 10, 56);
  g.fillStyle = "#5a7a30";
  for (const y of [-12, 6, 22]) {
    g.fillRect(-6, y, 10, 2.5);
  }
  g.fillStyle = "rgba(255,255,255,.3)";
  g.fillRect(-4, -26, 2, 52);
  g.fillStyle = "#6a9a3a";
  g.beginPath();
  g.ellipse(10, -8, 12, 3.5, 0.6, 0, 7);
  g.fill();
};
DEC.njstone = (g, s, p) => {
  g.translate(s / 2, s / 2);
  g.fillStyle = "rgba(0,0,0,.22)";
  g.beginPath();
  g.ellipse(3, 4, 22, 14, 0.2, 0, 7);
  g.fill();
  g.fillStyle = p.spk[1] || "#8a8a8a";
  g.beginPath();
  g.ellipse(0, 0, 21, 13, 0.2, 0, 7);
  g.fill();
  g.fillStyle = "rgba(255,255,255,.18)";
  g.beginPath();
  g.ellipse(-5, -4, 10, 5, 0.2, 0, 7);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,.18)";
  g.lineWidth = 1.5;
  for (const r of [28, 34]) {
    g.beginPath();
    g.ellipse(0, 0, r, r * 0.62, 0.2, 0, 7);
    g.stroke();
  }
}; // a garden stone with raked rings round it
{
  const nj = (floor, spk, bullet, wall, crate) =>
    mapVariant({
      floor,
      motif: "momiji",
      noise: 8,
      spk,
      bullet,
      decorRate: 0.12,
      wall,
      crate,
      decor: [DEC.njfan, DEC.njbamboo, DEC.njstone],
    });
  MAP_THEMES.ninja = {
    name: "Shinobi",
    def: "dark",
    light: nj(
      "#e3dccb",
      ["#d2452c", "#e8913a", "#9a9384", "#8a8270"],
      ["#1a1a28", "#fff6e0"],
      { base: "#34323a", edge: "#0f0f14", hi: "#5c5a64", pat: "beams", c2: "#1e1d23" },
      { edge: "#1a0a0c", body: "#2a2a32", body2: "#121218", band: "#b3242c", plate: "#f4efe2", ink: "#16171d" },
    ),
    dark: nj(
      "#262a3c",
      ["#c8402c", "#d98a3a", "#6a7090", "#3a4058"],
      ["#fff0c8", "#141626"],
      { base: "#ddd6c4", edge: "#1a1a22", hi: "#f6f2e8", pat: "beams", c2: "#2b2a30" },
      { edge: "#120708", body: "#8e1219", body2: "#4a070b", band: "#d4af37", plate: "#f4efe2", ink: "#16171d" },
    ),
  };
}
OBJ_CRATES.ninja = (g, gl, k, d) => {
  // a lacquered box tied with a cord, the weapon on its round lid badge
  g.fillStyle = "rgba(0,0,0,.35)";
  g.beginPath();
  g.roundRect(5, 7, 57, 55, 7);
  g.fill();
  g.fillStyle = "#0a0506";
  g.beginPath();
  g.roundRect(3, 3, 58, 58, 7);
  g.fill();
  const gr = g.createLinearGradient(0, 4, 64, 60);
  gr.addColorStop(0, d ? "#c8242c" : "#3a3a44");
  gr.addColorStop(1, d ? "#5a0a10" : "#101016");
  g.fillStyle = gr;
  g.beginPath();
  g.roundRect(5, 5, 54, 54, 6);
  g.fill();
  g.strokeStyle = d ? "#16171d" : "#b3242c";
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(9, 9, 46, 46, 4);
  g.stroke();
  g.fillStyle = "#d4af37";
  for (const [x, y] of [
    [5, 5],
    [47, 5],
    [5, 47],
    [47, 47],
  ]) {
    g.beginPath();
    g.moveTo(x + (x < 30 ? 0 : 12), y + (y < 30 ? 0 : 12));
    g.lineTo(x + 6, y + (y < 30 ? 0 : 12));
    g.lineTo(x + (x < 30 ? 0 : 12), y + 6);
    g.closePath();
    g.fill();
  }
  g.fillStyle = "#e8c25a";
  g.fillRect(29, 3, 6, 58);
  g.fillRect(3, 29, 58, 6);
  g.fillStyle = "rgba(0,0,0,.25)";
  g.fillRect(29, 3, 1.5, 58);
  g.fillRect(3, 29, 58, 1.5); // the cord
  g.fillStyle = "rgba(255,255,255,.22)";
  g.beginPath();
  g.roundRect(8, 7, 20, 5, 2);
  g.fill();
  objBadge(g, gl, k, "#f4efe2", "#16171d", d ? "rgba(212,175,55,.95)" : "rgba(179,36,44,.95)", 18);
};
