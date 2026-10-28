import { GX_ACC, GX_PAINT } from "./colours.js";
import { EXT_BOXPIC, EXT_PAINT_ART } from "./registries.js";
import { TROPHIES } from "./laika-trophies.js";

// ---------- Hall of Fame achievements (lifetime stats, match moments, silly ones) ----------
// The game's own pop-up says something was unlocked, the reward appears in the
// Hall of Fame box, and the 🏆 list in the panel shows every one (unearned ones locked, with how to get them).
// None of them copy one of the game's own achievements (checked against its list: e.g. it has Lucky Shot for a 13-bounce
// kill, Pacifist for 10 wins without firing, Lord of Destruction for 10,000 kills — so ours start at 25,000 kills).
// kind: 'stat' (lifetime numbers from your account), 'event' (counted in online rounds), 'fun' (Color Lab and calendar things)
export const ACH2 = [
  // lifetime numbers (read from your account now and then)
  {
    key: "aw-goldbars",
    id: "9501",
    kind: "stat",
    name: "Gold Hoarder",
    text: "Earned 50,000 gold (counted from v1.4.2 on).",
    need: 50000,
    gain: "gold",
  },
  {
    key: "aw-crystalcrown",
    id: "9502",
    kind: "stat",
    name: "Diamond Hands",
    text: "Earned 500 Dimitriums (counted from v1.4.2 on).",
    need: 500,
    gain: "diamonds",
  },
  {
    key: "aw-bronzelaurel",
    id: "9503",
    kind: "stat",
    name: "Centurion",
    text: "Won 100 rounds.",
    need: 100,
    of: (s) => s.victories,
    retired: true,
  },
  {
    key: "aw-victoryflag",
    id: "9504",
    kind: "stat",
    name: "Thousand Victories",
    text: "Won 1,000 rounds.",
    need: 1000,
    of: (s) => s.victories,
    retired: true,
  },
  {
    key: "aw-aura-legend",
    id: "9505",
    kind: "stat",
    name: "Legend",
    text: "Won 10,000 rounds.",
    need: 10000,
    of: (s) => s.victories,
  },
  {
    key: "aw-skulltally",
    id: "9506",
    kind: "stat",
    name: "Kill Collector",
    text: "Destroyed 25,000 tanks.",
    need: 25000,
    of: (s) => s.kills,
    retired: true,
  },
  {
    key: "aw-warcape",
    id: "9507",
    kind: "stat",
    name: "Warlord",
    text: "Destroyed 50,000 tanks.",
    need: 50000,
    of: (s) => s.kills,
  },
  {
    key: "aw-infernocape",
    id: "9508",
    kind: "stat",
    name: "Annihilator",
    text: "Destroyed 100,000 tanks.",
    need: 100000,
    of: (s) => s.kills,
  },
  {
    key: "aw-yinyang",
    id: "9509",
    kind: "stat",
    name: "Even Steven",
    text: "Kills and deaths within 1% of each other (after 1,000 kills).",
    test: (s) => s.kills >= 1000 && Math.abs(s.kills - s.deaths) <= s.kills * 0.01,
  },
  {
    key: "aw-raincloud",
    id: "9510",
    kind: "stat",
    name: "Unluckiest Tank",
    text: "More deaths than kills after 5,000 deaths.",
    test: (s) => s.deaths >= 5000 && s.deaths > s.kills,
  },
  {
    key: "aw-target",
    id: "9511",
    kind: "stat",
    name: "Professional Target",
    text: "Destroyed 10,000 times.",
    need: 10000,
    of: (s) => s.deaths,
  },
  {
    key: "aw-oops",
    id: "9512",
    kind: "stat",
    name: "Own Worst Enemy",
    text: "Destroyed yourself 5,000 times (counted from v1.4.2 on).",
    need: 5000,
    gain: "suicides",
  },
  {
    key: "aw-beret",
    id: "9513",
    kind: "stat",
    name: "Veteran",
    text: "Reached rank 50.",
    need: 50,
    of: (s) => s.rank,
    retired: true,
  },
  // moments in online rounds
  { key: "aw-scope", id: "9520", kind: "event", name: "Light Speed", text: "Destroyed 3 tanks with one laser shot." },
  {
    key: "aw-radar",
    id: "9521",
    kind: "event",
    name: "Heat Seeker",
    text: "Destroyed 3 tanks with homing missiles in one round.",
  },
  {
    key: "aw-detector",
    id: "9522",
    kind: "event",
    name: "Minesweeper",
    text: "Destroyed 3 tanks with mines in one round.",
  },
  {
    key: "aw-smokebarrel",
    id: "9523",
    kind: "event",
    name: "Gatling Frenzy",
    text: "Destroyed 4 tanks within 3 seconds with the gatling gun.",
  },
  {
    key: "aw-rose",
    id: "9524",
    kind: "event",
    name: "Shotgun Wedding",
    text: "Destroyed 3 tanks with one shotgun blast.",
  },
  {
    key: "aw-riotshield",
    id: "9525",
    kind: "event",
    name: "Bodyguard",
    text: "Blocked 10 enemy shots with your shield in one round.",
  },
  { key: "aw-crates", id: "9526", kind: "event", name: "Crate Goblin", text: "Picked up 10 crates in one round." },
  {
    key: "aw-sparklecrown",
    id: "9527",
    kind: "event",
    name: "Last Tank Standing",
    text: "Destroyed all 5 (or more) other tanks in a round yourself and survived.",
  },
  {
    key: "aw-stopwatch",
    id: "9528",
    kind: "event",
    name: "Speed Run",
    text: "Won a round of 3 or more tanks within 5 seconds of it starting.",
  },
  {
    key: "aw-aura-heartbeat",
    id: "9529",
    kind: "event",
    name: "Clutch",
    text: "Won 10 rounds in a row, each against 3 or more tanks.",
  },
  {
    key: "aw-itcounts",
    id: "9530",
    kind: "event",
    name: "Kamikaze",
    text: "Took out an enemy and yourself with the same shot, 10 times.",
  },
  {
    key: "aw-boomerang",
    id: "9531",
    kind: "event",
    name: "Boomerang",
    text: "Destroyed by your own bullet after it bounced 8 times.",
  },
  {
    key: "aw-blanket",
    id: "9532",
    kind: "event",
    name: "Wall Hugger",
    text: "Won a round without ever going more than 2 tiles from where you started.",
    retired: true,
  },
  {
    key: "aw-phoenix",
    id: "9533",
    kind: "event",
    name: "Comeback Kid",
    text: "Won a round straight after being destroyed in 5 rounds in a row.",
    retired: true,
  },
  { key: "aw-aura-bubble", id: "9534", kind: "event", name: "Untouchable", text: "Survived 50 rounds in a row." },
  {
    key: "aw-bankmedal",
    id: "9535",
    kind: "event",
    name: "Ricochet Royalty",
    text: "Destroyed 100 tanks with bullets that had bounced 3 or more times.",
  },
  {
    key: "aw-sixbounce",
    id: "9536",
    kind: "event",
    name: "Six-Bounce Wonder",
    text: "Destroyed a tank with a bullet that had bounced 6 or more times.",
  },
  {
    key: "aw-ace",
    id: "9537",
    kind: "event",
    name: "Ace",
    text: "Won a round of 5 or more tanks having destroyed every other tank in it yourself.",
  },
  {
    key: "aw-ironwall",
    id: "9538",
    kind: "event",
    name: "Iron Wall",
    text: "Blocked 200 enemy shots with your shield in total.",
  },
  // silly ones
  {
    key: "aw-mirror",
    id: "9540",
    kind: "fun",
    name: "Fashion Victim",
    text: "Destroyed within 3 seconds of a round starting, in 10 different looks.",
  },
  {
    key: "aw-bracelets",
    id: "9541",
    kind: "fun",
    name: "Twinsies",
    text: "Played a round against a tank wearing exactly your colours.",
  },
  {
    key: "aw-nightcap",
    id: "9542",
    kind: "fun",
    name: "Night Owl",
    text: "Played 25 rounds between 2 and 5 in the morning.",
  },
  { key: "aw-calendar", id: "9543", kind: "fun", name: "Loyal Tank", text: "Played on 7 days in a row." },
  {
    key: "aw-aura-showcase",
    id: "9544",
    kind: "fun",
    name: "Collector",
    text: "Played rounds wearing something from every Color Lab box.",
  },
  { key: "aw-palette", id: "9545", kind: "fun", name: "Painter", text: "Saved 25 looks in Color Lab." },
  {
    key: "aw-suitcase",
    id: "9546",
    kind: "fun",
    name: "Map Tourist",
    text: "Played a round on every Color Lab map.",
  },
  { key: "aw-slots", id: "9547", kind: "fun", name: "Gambler", text: "Won 3 rounds in a row on the Casino map." },
  {
    key: "aw-discoball",
    id: "9548",
    kind: "fun",
    name: "Party Animal",
    text: "Played 100 rounds with Party mode on.",
  },
];
for (const a of ACH2) {
  const acc = GX_ACC[a.key] || {};
  TROPHIES.push({
    key: a.key,
    id: a.id,
    kind: "hall",
    need: Infinity,
    box: "hall",
    slot: acc.slot,
    item: acc.name,
    name: a.name,
    text: a.text + " Reward: the " + acc.name,
    ach: a,
  });
}
// colour versions that come with an achievement's item; Painter and Professional Target are achievements only now (no item)
{
  const EXTRA = {
    "aw-beret": [
      ["aw-beret-maroon", "turret", "Veteran (Maroon)"],
      ["aw-beret-navy", "turret", "Veteran (Navy)"],
      ["aw-beret-black", "turret", "Veteran (Black)"],
    ],
    "aw-nightcap": [
      ["aw-nightcap-pink", "turret", "Nightcap (Pink)"],
      ["aw-nightcap-green", "turret", "Nightcap (Green)"],
    ],
    "aw-blanket": [
      ["aw-blanket-blue", "turret", "Cosy Blanket (Blue)"],
      ["aw-blanket-green", "turret", "Cosy Blanket (Green)"],
    ],
  };
  for (const t of TROPHIES) {
    if (EXTRA[t.key]) {
      t.extra = EXTRA[t.key];
    }
    if (t.key === "aw-palette" || t.key === "aw-target") {
      t.noItem = true;
      t.text = t.ach ? t.ach.text : t.text;
    }
  }
}
EXT_BOXPIC.hall = {
  ramp: [
    [0, [26, 18, 6]],
    [0.35, [110, 74, 18]],
    [0.65, [200, 150, 40]],
    [0.88, [255, 222, 120]],
    [1, [255, 252, 230]],
  ],
  overlay(g, W, H, hh) {
    for (let k = 0; k < 9; k++) {
      const x = hh(k, 1, 91) * W,
        y = hh(k, 2, 91) * H,
        r = H / 16 + (hh(k, 3, 91) * H) / 14;
      g.fillStyle = k % 3 ? "rgba(255,248,210,.9)" : "rgba(120,70,10,.75)";
      g.beginPath();
      for (let j = 0; j < 10; j++) {
        const a = (j / 10) * 6.283 - 1.571,
          rr = j % 2 ? r * 0.42 : r;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
    }
  },
};
// Box pictures of their own for the boxes that used to be a recoloured game box (Elements looked just like the
// game's Halloween box, Eyewear and Arsenal like a plain crate): the TT crate in the box's colours with its motif.
const boxFaces = (W, fn) => {
  const u = W / 560;
  for (const [fx, ft] of [
    [164, 224],
    [444, 230],
  ]) {
    fn(fx * u, ft * u, u);
  }
}; // the front face of the closed and the open box
EXT_BOXPIC.elements = {
  ramp: [
    [0, [30, 8, 4]],
    [0.35, [120, 40, 14]],
    [0.65, [210, 110, 40]],
    [0.88, [255, 210, 140]],
    [1, [255, 255, 240]],
  ],
  overlay(g, W, H, hh) {
    const cols = ["rgba(255,80,0,.55)", "rgba(0,150,255,.55)", "rgba(170,230,255,.6)", "rgba(110,230,20,.55)"];
    const u0 = W / 560;
    for (const [ox, cy] of [
      [0, 200],
      [280, 214],
    ]) {
      const cx = (ox + 144) * u0,
        y0 = cy * u0;
      for (let k = 0; k < 4; k++) {
        g.fillStyle = cols[k];
        g.fillRect(
          k % 2 ? cx : ox * u0,
          Math.floor(k / 2) ? y0 : 0,
          k % 2 ? (ox + 280) * u0 - cx : cx - ox * u0,
          Math.floor(k / 2) ? H - y0 : y0,
        );
      }
    }
    boxFaces(W, (cx, cy, u) => {
      const s = 15 * u,
        at = [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ];
      at.forEach(([dx, dy], k) => {
        const x = cx + dx * s * 1.25,
          y = cy + dy * s * 1.25;
        g.save();
        g.translate(x, y);
        g.fillStyle = ["#ffb000", "#3ab0ff", "#e8faff", "#9aff3a"][k];
        g.strokeStyle = "rgba(0,0,0,.6)";
        g.lineWidth = 2 * u;
        g.beginPath();
        if (k === 0) {
          g.moveTo(0, -s);
          g.bezierCurveTo(s, -s * 0.2, s * 0.8, s, 0, s);
          g.bezierCurveTo(-s * 0.8, s, -s, -s * 0.2, 0, -s);
        } // flame
        else if (k === 1) {
          g.moveTo(0, -s);
          g.bezierCurveTo(s * 0.9, 0, s * 0.7, s, 0, s);
          g.bezierCurveTo(-s * 0.7, s, -s * 0.9, 0, 0, -s);
        } // drop
        else if (k === 2) {
          for (let j = 0; j < 6; j++) {
            g.moveTo(0, 0);
            g.lineTo(Math.cos(j * 1.047) * s, Math.sin(j * 1.047) * s);
          }
          g.lineWidth = 4 * u;
          g.strokeStyle = "#e8faff";
          g.stroke();
          g.restore();
          return;
        } // snowflake
        else {
          g.moveTo(s * 0.3, -s);
          g.lineTo(-s * 0.5, s * 0.1);
          g.lineTo(0, s * 0.1);
          g.lineTo(-s * 0.3, s);
          g.lineTo(s * 0.5, -s * 0.1);
          g.lineTo(0, -s * 0.1);
          g.closePath();
        } // bolt
        g.fill();
        g.stroke();
        g.restore();
      });
    });
  },
};
EXT_BOXPIC.materials = {
  ramp: [
    [0, [14, 14, 16]],
    [0.35, [60, 62, 68]],
    [0.65, [140, 144, 152]],
    [0.88, [215, 220, 228]],
    [1, [255, 255, 255]],
  ],
  overlay(g, W, H) {
    const u = W / 560,
      q = Math.max(3, 6 * u);
    for (const [ox, band] of [
      [0, 166],
      [280, 196],
    ]) {
      const fx = (ox + 120) * u; // carbon fibre on the side, wood grain on the front, a gold band round the middle
      for (let y = 0; y < H; y += q) {
        for (let x = ox * u; x < fx; x += q) {
          g.fillStyle = Math.round((x + y) / q) % 2 ? "rgba(0,0,0,.4)" : "rgba(255,255,255,.14)";
          g.fillRect(x, y, q, q);
        }
      }
      for (let y = 0; y < H; y += 7 * u) {
        g.fillStyle = "rgba(150,90,40,.5)";
        g.fillRect(fx, y + Math.sin(y) * 2 * u, (ox + 280) * u - fx, 2.5 * u);
      }
      const gb = g.createLinearGradient(0, band * u, 0, (band + 12) * u);
      gb.addColorStop(0, "#b8860b");
      gb.addColorStop(0.5, "#fff0a0");
      gb.addColorStop(1, "#8a6008");
      g.fillStyle = gb;
      g.fillRect(ox * u, band * u, 280 * u, 12 * u);
    }
  },
};
EXT_BOXPIC.holo = {
  ramp: [
    [0, [40, 30, 60]],
    [0.35, [140, 120, 190]],
    [0.65, [210, 200, 240]],
    [0.88, [245, 240, 255]],
    [1, [255, 255, 255]],
  ],
  overlay(g, W, H) {
    const gr = g.createLinearGradient(0, 0, W * 0.6, H);
    ["#ff6ad5", "#ffd76a", "#6affb0", "#6ad0ff", "#c06aff", "#ff6ad5"].forEach((c, k) => gr.addColorStop(k / 5, c));
    g.globalAlpha = 0.55;
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
    g.fillStyle = "rgba(255,255,255,.55)";
    for (let x = -H; x < W; x += H / 5) {
      g.beginPath();
      g.moveTo(x, H);
      g.lineTo(x + H / 30, H);
      g.lineTo(x + H / 30 + H, 0);
      g.lineTo(x + H, 0);
      g.fill();
    }
  },
};
EXT_BOXPIC.eyewear = {
  ramp: [
    [0, [4, 20, 26]],
    [0.35, [10, 70, 90]],
    [0.65, [30, 150, 170]],
    [0.88, [150, 230, 240]],
    [1, [255, 255, 255]],
  ],
  overlay(g, W, H) {
    boxFaces(W, (cx, cy, u) => {
      const s = 13 * u;
      g.fillStyle = "#101418";
      g.strokeStyle = "#101418";
      g.lineWidth = 3 * u;
      for (const d of [-1, 1]) {
        g.beginPath();
        g.roundRect(cx + d * s * 1.15 - s, cy - s * 0.6, s * 2, s * 1.4, s * 0.5);
        g.fill();
        g.fillStyle = "rgba(120,220,255,.6)";
        g.beginPath();
        g.ellipse(cx + d * s * 1.15 - s * 0.35, cy - s * 0.15, s * 0.35, s * 0.18, -0.4, 0, 7);
        g.fill();
        g.fillStyle = "#101418";
      }
      g.beginPath();
      g.moveTo(cx - s * 0.2, cy - s * 0.2);
      g.quadraticCurveTo(cx, cy - s * 0.5, cx + s * 0.2, cy - s * 0.2);
      g.stroke();
    });
  },
};
EXT_BOXPIC.arsenal = {
  ramp: [
    [0, [12, 14, 8]],
    [0.35, [48, 56, 30]],
    [0.65, [100, 112, 64]],
    [0.88, [190, 196, 150]],
    [1, [255, 255, 240]],
  ],
  overlay(g, W, H, hh) {
    for (let k = 0; k < 26; k++) {
      g.fillStyle = k % 3 ? "rgba(20,24,10,.55)" : "rgba(150,160,100,.5)";
      g.beginPath();
      g.ellipse(
        hh(k, 1, 81) * W,
        hh(k, 2, 81) * H,
        H / 14 + (hh(k, 3, 81) * H) / 12,
        H / 22 + (hh(k, 4, 81) * H) / 20,
        hh(k, 5, 81) * 3,
        0,
        7,
      );
      g.fill();
    } // camo
    boxFaces(W, (cx, cy, u) => {
      const s = 20 * u;
      g.strokeStyle = "#ffcf3a";
      g.lineWidth = 3.5 * u;
      g.beginPath();
      g.arc(cx, cy, s, 0, 7);
      g.stroke();
      g.beginPath();
      g.arc(cx, cy, s * 0.4, 0, 7);
      g.stroke();
      g.beginPath();
      g.moveTo(cx - s * 1.4, cy);
      g.lineTo(cx - s * 0.6, cy);
      g.moveTo(cx + s * 0.6, cy);
      g.lineTo(cx + s * 1.4, cy);
      g.moveTo(cx, cy - s * 1.4);
      g.lineTo(cx, cy - s * 0.6);
      g.moveTo(cx, cy + s * 0.6);
      g.lineTo(cx, cy + s * 1.4);
      g.stroke();
    });
  },
};
// Cursed Seal and Streetwear: the game's Standard box (its own shape and size), in each box's colours, with their effects on top
EXT_BOXPIC.cursed = {
  ramp: [
    [0, [6, 4, 12]],
    [0.35, [24, 14, 40]],
    [0.65, [52, 32, 84]],
    [0.88, [126, 98, 176]],
    [1, [236, 226, 255]],
  ],
  overlay(g, W, H, hh) {
    const u = W / 560;
    const strip = (x, y, w, h, a, seed) => {
      g.save();
      g.translate(x * u, y * u);
      g.rotate(a);
      g.fillStyle = "#efe2c4";
      g.strokeStyle = "rgba(60,30,10,.7)";
      g.lineWidth = 1.2 * u;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w * u, 0);
      g.lineTo(w * u, h * u);
      for (let k = 4; k >= 0; k--) {
        g.lineTo((k / 4) * w * u, (h - (k % 2 ? 4 : 0)) * u);
      }
      g.closePath();
      g.fill();
      g.stroke(); // torn end
      g.strokeStyle = "#b3121e";
      g.lineWidth = 1.6 * u;
      for (let k = 0; k < 4; k++) {
        const yy = (8 + (k * (h - 16)) / 4) * u;
        g.beginPath();
        g.moveTo(w * 0.25 * u, yy);
        g.lineTo(w * (0.5 + (hh(k, seed, 7) - 0.5) * 0.5) * u, yy + 5 * u);
        g.lineTo(w * 0.75 * u, yy + 2 * u);
        g.stroke();
      }
      g.fillStyle = "#16101e";
      g.fillRect(w * 0.42 * u, (h - 22) * u, w * 0.16 * u, 9 * u);
      g.restore();
    };
    // red cord tied round the closed box, paper seals over the lid and front
    g.strokeStyle = "#8a0c16";
    g.lineWidth = 4 * u;
    g.beginPath();
    g.moveTo(81 * u, 196 * u);
    g.lineTo(120 * u, 204 * u);
    g.lineTo(208 * u, 198 * u);
    g.moveTo(166 * u, 131 * u);
    g.lineTo(166 * u, 268 * u);
    g.stroke();
    g.strokeStyle = "#d8323e";
    g.lineWidth = 1.6 * u;
    g.stroke();
    strip(128, 136, 16, 92, 0.08, 1);
    strip(186, 150, 15, 84, -0.06, 2);
    strip(92, 150, 12, 70, 0.04, 3);
    strip(412, 176, 15, 70, 0.1, 4);
    strip(458, 170, 14, 60, -0.12, 5);
    g.globalCompositeOperation = "source-over";
    // violet smoke round the base of both boxes
    for (let k = 0; k < 16; k++) {
      const ox = k < 8 ? 145 : 425,
        x = (ox - 75 + hh(k, 1, 33) * 150) * u,
        y = (250 + hh(k, 2, 33) * 22) * u,
        r = (16 + hh(k, 3, 33) * 22) * u;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(120,70,220,.42)");
      gr.addColorStop(1, "rgba(60,20,120,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    }
    // cursed light pouring out of the open box
    g.globalCompositeOperation = "lighter";
    const gl = g.createRadialGradient(424 * u, 168 * u, 4 * u, 424 * u, 168 * u, 80 * u);
    gl.addColorStop(0, "rgba(170,140,255,.85)");
    gl.addColorStop(0.4, "rgba(90,60,230,.4)");
    gl.addColorStop(1, "rgba(40,20,140,0)");
    g.fillStyle = gl;
    g.beginPath();
    g.arc(424 * u, 168 * u, 80 * u, 0, 7);
    g.fill();
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 - 0.7 + k * 0.23,
        L = (70 + hh(k, 4, 33) * 40) * u;
      g.strokeStyle = "rgba(150,170,255," + (0.25 + hh(k, 5, 33) * 0.3) + ")";
      g.lineWidth = (2 + hh(k, 6, 33) * 3) * u;
      g.beginPath();
      g.moveTo(424 * u, 170 * u);
      g.lineTo(424 * u + Math.cos(a) * L, 170 * u + Math.sin(a) * L);
      g.stroke();
    }
    g.globalCompositeOperation = "source-over";
  },
};
EXT_BOXPIC.streetwear = {
  ramp: [
    [0, [8, 8, 10]],
    [0.35, [24, 24, 28]],
    [0.65, [48, 48, 54]],
    [0.88, [118, 118, 126]],
    [1, [232, 232, 238]],
  ],
  overlay(g, W, H, hh) {
    const u = W / 560;
    // hot pink lids
    g.fillStyle = "rgba(255,58,150,.86)";
    g.fillRect(70 * u, 120 * u, 150 * u, 45 * u);
    g.beginPath();
    g.moveTo(410 * u, 55 * u);
    g.lineTo(535 * u, 70 * u);
    g.lineTo(515 * u, 176 * u);
    g.lineTo(394 * u, 170 * u);
    g.closePath();
    g.fill();
    // neon lime stitching
    g.strokeStyle = "#c6ff1a";
    g.lineWidth = 2 * u;
    g.setLineDash([5 * u, 4 * u]);
    for (const [x0, y0, x1, y1] of [
      [84, 170, 120, 176],
      [122, 175, 206, 170],
      [84, 258, 120, 262],
      [122, 262, 206, 258],
      [364, 175, 400, 180],
      [402, 180, 486, 175],
      [364, 258, 400, 262],
      [402, 262, 486, 258],
    ]) {
      g.beginPath();
      g.moveTo(x0 * u, y0 * u);
      g.lineTo(x1 * u, y1 * u);
      g.stroke();
    }
    g.setLineDash([]);
    // stickers on the fronts
    const star = (x, y, r, col) => {
      g.beginPath();
      for (let j = 0; j < 10; j++) {
        const a = (j / 10) * 6.283 - 1.571,
          rr = j % 2 ? r * 0.45 : r;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath();
      g.fillStyle = col;
      g.fill();
      g.lineWidth = 2 * u;
      g.strokeStyle = "#fff";
      g.stroke();
    };
    const bolt = (x, y, s, col) => {
      g.beginPath();
      g.moveTo(x + 2 * s, y - 6 * s);
      g.lineTo(x - 3 * s, y + 1 * s);
      g.lineTo(x, y + 1 * s);
      g.lineTo(x - 2 * s, y + 6 * s);
      g.lineTo(x + 3 * s, y - 1 * s);
      g.lineTo(x, y - 1 * s);
      g.closePath();
      g.fillStyle = col;
      g.fill();
      g.lineWidth = 1.6 * u;
      g.strokeStyle = "#fff";
      g.stroke();
    };
    const dot = (x, y, r, col) => {
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fillStyle = col;
      g.fill();
      g.lineWidth = 2 * u;
      g.strokeStyle = "#fff";
      g.stroke();
    };
    star(98 * u, 214 * u, 9 * u, "#22e0ff");
    bolt(196 * u, 244 * u, 2.2 * u, "#ffd400");
    dot(136 * u, 248 * u, 6 * u, "#b388ff");
    star(376 * u, 214 * u, 8 * u, "#ffd400");
    bolt(472 * u, 222 * u, 2 * u, "#c6ff1a");
    dot(418 * u, 250 * u, 6 * u, "#ff7ac8");
    // a braided black cord tied round the closed box
    g.strokeStyle = "#050506";
    g.lineWidth = 6 * u;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(150 * u, 131 * u);
    g.lineTo(150 * u, 268 * u);
    g.moveTo(81 * u, 186 * u);
    g.lineTo(120 * u, 192 * u);
    g.lineTo(208 * u, 186 * u);
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,.25)";
    g.lineWidth = 1.2 * u;
    g.setLineDash([3 * u, 3 * u]);
    g.stroke();
    g.setLineDash([]);
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = "#050506";
    g.lineWidth = 5 * u;
    for (const d of [-1, 1]) {
      g.beginPath();
      g.ellipse((150 + d * 11) * u, 182 * u, 11 * u, 6 * u, d * 0.4, 0, 7);
      g.stroke();
      g.beginPath();
      g.moveTo(150 * u, 188 * u);
      g.quadraticCurveTo((150 + d * 8) * u, 205 * u, (150 + d * 14) * u, 214 * u);
      g.stroke();
    }
    // pink glow and tissue paper spilling out of the open box
    g.globalCompositeOperation = "lighter";
    const gl = g.createRadialGradient(430 * u, 172 * u, 4 * u, 430 * u, 172 * u, 70 * u);
    gl.addColorStop(0, "rgba(255,160,210,.75)");
    gl.addColorStop(1, "rgba(255,60,150,0)");
    g.fillStyle = gl;
    g.beginPath();
    g.arc(430 * u, 172 * u, 70 * u, 0, 7);
    g.fill();
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "#ff7ac0";
    g.strokeStyle = "rgba(120,10,60,.7)";
    g.lineWidth = 1.5 * u;
    for (const [x, y, w, h] of [
      [366, 170, 34, 22],
      [398, 162, 30, 26],
      [440, 166, 34, 22],
      [470, 172, 20, 16],
    ]) {
      g.beginPath();
      g.moveTo(x * u, (y + h) * u);
      g.quadraticCurveTo((x + w * 0.3) * u, y * u, (x + w * 0.5) * u, (y + 6) * u);
      g.quadraticCurveTo((x + w * 0.8) * u, (y - 4) * u, (x + w) * u, (y + h) * u);
      g.closePath();
      g.fill();
      g.stroke();
    }
  },
};
// Missing Texture (Code Rain box): the purple-and-black checkerboard a game shows when a picture fails to load, tilted, with a few glitched slices
GX_PAINT["pt-missingtex"] = { name: "Missing Texture", avg: "0x4a0870" };
EXT_PAINT_ART["pt-missingtex"] = (g, { W, HH, H }) => {
  const t = document.createElement("canvas");
  t.width = W;
  t.height = HH;
  const tg = t.getContext("2d");
  tg.fillStyle = "#000000";
  tg.fillRect(0, 0, W, HH);
  tg.save();
  tg.translate(W / 2, HH / 2);
  tg.rotate(-0.42);
  const s = 26;
  for (let y = -20; y < 20; y++) {
    for (let x = -20; x < 20; x++) {
      if ((x + y) & 1) {
        tg.fillStyle = "#9b10e8";
        tg.fillRect(x * s, y * s, s, s);
      }
    }
  }
  tg.restore();
  g.drawImage(t, 0, 0);
  for (let k = 0; k < 5; k++) {
    const y = Math.floor(H(k, 1, 4401) * HH),
      h = 3 + Math.floor(H(k, 2, 4401) * 10),
      dx = Math.round((H(k, 3, 4401) - 0.5) * 60); // torn horizontal slices
    g.drawImage(t, 0, y, W, h, dx, y, W, h);
    if (k % 3 === 0) {
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.35;
      g.fillStyle = k % 2 ? "#00ffff" : "#ff0040";
      g.fillRect(0, y, W, Math.max(2, h / 3));
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    }
  }
  g.fillStyle = "rgba(255,255,255,.06)";
  for (let y = 0; y < HH; y += 3) {
    g.fillRect(0, y, W, 1);
  }
}; // faint scanlines
