import { BULLET_COLOR, BULLET_DRAW, BULLET_STYLE, MAP_THEMES, SHIELD_COLOR, mapNoise } from "./maps.js";
import { DEC, MOTIF, mapVariant } from "./maps-more.js";

// ---------- 12 more maps (so a full run of maps goes by before any comes back) ----------
// Each in a light and a dark look, with the game's own weapon crates restyled (themed crates can be added later).
MOTIF.snow = (g, w, h, p, i) => {
  for (let k = 0; k < 26; k++) {
    const x = 14 + mapNoise(k, i, 71) * (w - 28),
      y = 14 + mapNoise(i, k, 72) * (h - 28),
      r = 1 + mapNoise(k, k + i, 73) * 2.2;
    g.globalAlpha = 0.5 + mapNoise(k, i, 74) * 0.4;
    g.fillStyle = p.spk[k % p.spk.length];
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;
};
MOTIF.cracks = (g, w, h, p, i) => {
  g.lineCap = "round";
  for (let k = 0; k < 2; k++) {
    let x = 30 + mapNoise(k, i, 81) * (w - 60),
      y = 30 + mapNoise(i, k, 82) * (h - 60),
      a = mapNoise(k, i, 83) * 6.3;
    const pts = [[x, y]];
    for (let j = 0; j < 5; j++) {
      a += (mapNoise(j, k + i, 84) - 0.5) * 1.4;
      x = Math.max(18, Math.min(w - 18, x + Math.cos(a) * 14));
      y = Math.max(18, Math.min(h - 18, y + Math.sin(a) * 14));
      pts.push([x, y]);
    }
    for (const [lw, col, al] of [
      [5, p.spk[0], 0.18],
      [2, p.spk[1], 0.6],
    ]) {
      g.globalAlpha = al;
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      pts.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.stroke();
    }
  }
  g.globalAlpha = 1;
};
MOTIF.stars = (g, w, h, p, i) => {
  for (let k = 0; k < 30; k++) {
    const x = 12 + mapNoise(k, i, 91) * (w - 24),
      y = 12 + mapNoise(i, k, 92) * (h - 24),
      r = 0.6 + mapNoise(k, i, 93) * 1.4;
    g.globalAlpha = 0.35 + mapNoise(i, k, 94) * 0.6;
    g.fillStyle = p.spk[k % p.spk.length];
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;
};
MOTIF.crystals = (g, w, h, p, i) => {
  for (let k = 0; k < 6; k++) {
    const x = 24 + mapNoise(k, i, 101) * (w - 48),
      y = 24 + mapNoise(i, k, 102) * (h - 48),
      s = 4 + mapNoise(k, i, 103) * 5;
    g.save();
    g.translate(x, y);
    g.rotate(mapNoise(k, i, 104) * 3);
    g.globalAlpha = 0.5;
    g.fillStyle = p.spk[k % p.spk.length];
    g.beginPath();
    g.moveTo(0, -s * 1.6);
    g.lineTo(s * 0.7, 0);
    g.lineTo(0, s * 1.6);
    g.lineTo(-s * 0.7, 0);
    g.closePath();
    g.fill();
    g.globalAlpha = 0.6;
    g.fillStyle = "#ffffff";
    g.fillRect(-s * 0.12, -s, s * 0.24, s * 0.9);
    g.restore();
  }
  g.globalAlpha = 1;
};
DEC.snowflake = (g, s, p) => {
  g.translate(s / 2, s / 2);
  g.strokeStyle = p.spk[0];
  g.lineWidth = 3;
  g.lineCap = "round";
  for (let k = 0; k < 6; k++) {
    g.rotate(Math.PI / 3);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -20);
    g.moveTo(0, -12);
    g.lineTo(-6, -17);
    g.moveTo(0, -12);
    g.lineTo(6, -17);
    g.stroke();
  }
};
DEC.cobweb = (g, s) => {
  g.translate(s / 2, s / 2);
  g.strokeStyle = "rgba(235,235,245,.7)";
  g.lineWidth = 1.2;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
    g.stroke();
  }
  for (const r of [8, 15, 22]) {
    g.beginPath();
    for (let k = 0; k <= 8; k++) {
      const a = (k * Math.PI) / 4;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.stroke();
  }
  g.fillStyle = "#1a1420";
  g.beginPath();
  g.arc(4, 6, 3.5, 0, 7);
  g.fill();
};
DEC.gem = (g, s, p) => {
  g.translate(s / 2, s / 2);
  g.fillStyle = "rgba(0,0,0,.25)";
  g.beginPath();
  g.moveTo(3, -16);
  g.lineTo(15, 2);
  g.lineTo(3, 20);
  g.lineTo(-9, 2);
  g.closePath();
  g.fill();
  g.fillStyle = p.spk[0];
  g.beginPath();
  g.moveTo(0, -18);
  g.lineTo(12, 0);
  g.lineTo(0, 18);
  g.lineTo(-12, 0);
  g.closePath();
  g.fill();
  g.fillStyle = "rgba(255,255,255,.45)";
  g.beginPath();
  g.moveTo(0, -18);
  g.lineTo(-12, 0);
  g.lineTo(0, 0);
  g.closePath();
  g.fill();
};
DEC.ember = (g, s, p) => {
  g.translate(s / 2, s / 2);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 22);
  gr.addColorStop(0, p.spk[1]);
  gr.addColorStop(0.4, p.spk[0]);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(0, 0, 22, 0, 7);
  g.fill();
  g.fillStyle = "#2a201c";
  g.beginPath();
  g.ellipse(2, 2, 10, 7, 0.4, 0, 7);
  g.fill();
};
DEC.anchor = (g, s) => {
  g.translate(s / 2, s / 2);
  g.rotate(0.5);
  g.strokeStyle = "#3a3a40";
  g.lineWidth = 4;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(0, -18);
  g.lineTo(0, 16);
  g.moveTo(-9, -10);
  g.lineTo(9, -10);
  g.stroke();
  g.beginPath();
  g.arc(0, 4, 13, 0.2, Math.PI - 0.2);
  g.stroke();
  g.beginPath();
  g.arc(0, -22, 4, 0, 7);
  g.stroke();
};
{
  const V = mapVariant,
    mk = (o) => V(Object.assign({ noise: 8, decorRate: 0.12 }, o));
  const M = (name, def, common, light, dark) => ({
    name,
    def,
    light: mk(Object.assign({}, common, light)),
    dark: mk(Object.assign({}, common, dark)),
  });
  Object.assign(MAP_THEMES, {
    arctic: M(
      "Arctic",
      "light",
      {
        motif: "snow",
        decor: [DEC.snowflake, DEC.rock],
        crate: {
          edge: "#1d3b52",
          body: "#5aa0c8",
          body2: "#2f6f96",
          band: "#ffffff",
          plate: "#eaf6ff",
          ink: "#1d3b52",
        },
      },
      {
        floor: "#e6f2f9",
        spk: ["#ffffff", "#b8dcef"],
        bullet: ["#2a5a80", "#ffffff"],
        wall: { base: "#8ccbe8", edge: "#2a5a7a", hi: "#e8f6ff", pat: "none" },
      },
      {
        floor: "#1b2a3a",
        spk: ["#dff2ff", "#7fb8e0"],
        bullet: ["#dff2ff", "#0d1824"],
        wall: { base: "#9fd0ea", edge: "#16324a", hi: "#e8f6ff", pat: "none" },
      },
    ),
    volcano: M(
      "Volcano",
      "dark",
      {
        motif: "cracks",
        decor: [DEC.ember, DEC.rock],
        crate: {
          edge: "#140f0d",
          body: "#4a3a34",
          body2: "#2a201c",
          band: "#ff5a00",
          plate: "#ffd2a0",
          ink: "#2a120a",
        },
      },
      {
        floor: "#6e625c",
        spk: ["#ff6a00", "#ffb000"],
        bullet: ["#2a120a", "#ffd2a0"],
        wall: { base: "#4a403b", edge: "#1a1412", hi: "#8a7a70", pat: "blocks", c2: "#3a312d" },
      },
      {
        floor: "#201816",
        spk: ["#ff4a00", "#ffc400"],
        bullet: ["#ffb000", "#140f0d"],
        wall: { base: "#3a3330", edge: "#0e0a09", hi: "#ff7a2a", pat: "blocks", c2: "#2a2420" },
      },
    ),
    jungle: M(
      "Jungle",
      "light",
      {
        motif: "tufts",
        decor: [DEC.leaf, DEC.bloom],
        crate: {
          edge: "#2a1a0c",
          body: "#7a5a34",
          body2: "#4e3a1e",
          band: "#3fa34d",
          plate: "#f2e6c0",
          ink: "#2a1a0c",
        },
      },
      {
        floor: "#86b46e",
        spk: ["#3a6b2a", "#2e5a20"],
        bullet: ["#1d3a12", "#f2e6c0"],
        wall: { base: "#5a3e24", edge: "#2a1a0c", hi: "#8fbf5a", pat: "nodes", c2: "#3a6b2a" },
      },
      {
        floor: "#1f3a24",
        spk: ["#4f8a3a", "#2e5a20"],
        bullet: ["#c8f07a", "#10200c"],
        wall: { base: "#4a3220", edge: "#160e06", hi: "#6fa04a", pat: "nodes", c2: "#2e5a20" },
      },
    ),
    temple: M(
      "Desert Temple",
      "light",
      {
        motif: "flagstones",
        decor: [DEC.rock, DEC.paws],
        crate: {
          edge: "#3a2a12",
          body: "#1f6f6a",
          body2: "#124a46",
          band: "#e0b84a",
          plate: "#f2e2b8",
          ink: "#3a2a12",
        },
      },
      {
        floor: "#dcc79c",
        spk: ["#a8905e"],
        bullet: ["#3a2a12", "#fff3d6"],
        wall: { base: "#b08a4a", edge: "#5a4020", hi: "#dcc08a", pat: "bricks", c2: "#8a6a34" },
      },
      {
        floor: "#3a2e22",
        spk: ["#22190f"],
        bullet: ["#f2e2b8", "#1a120a"],
        wall: { base: "#a88a54", edge: "#3a2a12", hi: "#d8be86", pat: "bricks", c2: "#7a6034" },
      },
    ),
    space: M(
      "Space Station",
      "dark",
      {
        decor: [DEC.bolt, DEC.vent],
        crate: {
          edge: "#111522",
          body: "#3a4560",
          body2: "#232a3c",
          band: "#c9a6ff",
          plate: "#e8ebff",
          ink: "#111522",
        },
      },
      {
        floor: "#c8ccd8",
        motif: "plates",
        spk: ["#9aa0b0", "#e8ebf2"],
        bullet: ["#1a2040", "#ffffff"],
        wall: { base: "#8a93a8", edge: "#2a3040", hi: "#dfe6ff", pat: "joints", c2: "#4a5268" },
      },
      {
        floor: "#0b0f2a",
        motif: "stars",
        spk: ["#ffffff", "#9fb4ff", "#ffd6f6"],
        bullet: ["#ffffff", "#0b0f2a"],
        wall: { base: "#6a7390", edge: "#1a1f30", hi: "#c9d2f5", pat: "joints", c2: "#3a4258" },
      },
    ),
    haunted: M(
      "Haunted Manor",
      "dark",
      {
        motif: "planksFloor",
        decor: [DEC.cobweb, DEC.rock],
        crate: {
          edge: "#140f14",
          body: "#4a3a52",
          body2: "#2a2030",
          band: "#9effd2",
          plate: "#e6e0ee",
          ink: "#140f14",
        },
      },
      {
        floor: "#b3aabd",
        spk: ["#8a8098"],
        bullet: ["#2a2433", "#ffffff"],
        wall: { base: "#5a4a5c", edge: "#1e161e", hi: "#8a7a8e", pat: "planks", c2: "#3a2e3a" },
      },
      {
        floor: "#2a2433",
        spk: ["#1c1724"],
        bullet: ["#9effd2", "#140f14"],
        wall: { base: "#7a6a80", edge: "#1a141c", hi: "#a898b0", pat: "planks", c2: "#5a4c60" },
      },
    ),
    autumn: M(
      "Autumn Woods",
      "light",
      {
        motif: "momiji",
        decor: [DEC.leaf, DEC.rock],
        crate: {
          edge: "#2e1a0a",
          body: "#c8642a",
          body2: "#8a3e16",
          band: "#f2c14e",
          plate: "#fbe8c8",
          ink: "#2e1a0a",
        },
      },
      {
        floor: "#dcc08f",
        spk: ["#d2452c", "#e8913a", "#c8a040", "#8a6a3a"],
        bullet: ["#2e1a0a", "#fbe8c8"],
        wall: { base: "#6b4423", edge: "#2e1a0a", hi: "#a8743e", pat: "planks", c2: "#4a2e14" },
      },
      {
        floor: "#3a2a1e",
        spk: ["#c8402c", "#d98a3a", "#a8843a", "#2a1e14"],
        bullet: ["#f2c14e", "#1e140a"],
        wall: { base: "#5a3a1e", edge: "#1e1208", hi: "#8a6034", pat: "planks", c2: "#3a2410" },
      },
    ),
    pirate: M(
      "Pirate Ship",
      "light",
      {
        motif: "planksFloor",
        decor: [DEC.anchor, DEC.shell],
        crate: {
          edge: "#2e1c0c",
          body: "#8a5a2e",
          body2: "#5a3a1a",
          band: "#2e2e33",
          plate: "#f2e2c0",
          ink: "#2e1c0c",
        },
      },
      {
        floor: "#c49a6c",
        spk: ["#8a6238"],
        bullet: ["#1e140a", "#f2e2c0"],
        wall: { base: "#7a5230", edge: "#2e1c0c", hi: "#b08458", pat: "joints", c2: "#3a2412" },
      },
      {
        floor: "#3a2c20",
        spk: ["#251b12"],
        bullet: ["#f2e2c0", "#1a1008"],
        wall: { base: "#6a4628", edge: "#1e1208", hi: "#9a7048", pat: "joints", c2: "#2e1c0c" },
      },
    ),
    lab: M(
      "Lab",
      "light",
      {
        motif: "plates",
        decor: [DEC.vent, DEC.bolt],
        crate: {
          edge: "#1a2a22",
          body: "#e8eef0",
          body2: "#b8c4c8",
          band: "#39ff88",
          plate: "#ffffff",
          ink: "#1a2a22",
        },
      },
      {
        floor: "#eef2f4",
        spk: ["#c8d2d8", "#ffffff"],
        bullet: ["#1a2a22", "#ffffff"],
        wall: { base: "#dfe6ea", edge: "#5a6a72", hi: "#ffffff", pat: "stripes", c2: "#39d97a" },
      },
      {
        floor: "#1a2226",
        spk: ["#2a363c", "#39ff88"],
        bullet: ["#39ff88", "#0a1410"],
        wall: { base: "#5a6a72", edge: "#141a1e", hi: "#9aaab2", pat: "stripes", c2: "#39ff88" },
      },
    ),
    swamp: M(
      "Swamp",
      "dark",
      {
        motif: "ripples",
        decor: [DEC.weed, DEC.leaf],
        crate: {
          edge: "#1e160c",
          body: "#5a6a3a",
          body2: "#3a4622",
          band: "#c8b04a",
          plate: "#e8e0b8",
          ink: "#1e160c",
        },
      },
      {
        floor: "#8a9666",
        spk: ["#5a6a3a"],
        bullet: ["#1e160c", "#e8e0b8"],
        wall: { base: "#4a3a22", edge: "#1e160c", hi: "#7a9a4a", pat: "nodes", c2: "#3a4a22" },
      },
      {
        floor: "#2a3220",
        spk: ["#4a5a2a"],
        bullet: ["#c8b04a", "#141a0c"],
        wall: { base: "#6a5434", edge: "#1a140a", hi: "#9aba6a", pat: "nodes", c2: "#4a5a2a" },
      },
    ),
    garden: M(
      "Royal Garden",
      "light",
      {
        motif: "flagstones",
        decor: [DEC.bloom, DEC.rock],
        crate: {
          edge: "#3a2a1a",
          body: "#f2f2f2",
          body2: "#c8c8c8",
          band: "#f9c74f",
          plate: "#ffffff",
          ink: "#2a2a2a",
        },
      },
      {
        floor: "#d9d3bf",
        spk: ["#a8a088"],
        bullet: ["#1a3a12", "#ffffff"],
        wall: { base: "#2f7a3a", edge: "#174a1e", hi: "#6fbf5a", pat: "none" },
      },
      {
        floor: "#3a3a40",
        spk: ["#26262c"],
        bullet: ["#f9c74f", "#0e1a10"],
        wall: { base: "#245e2e", edge: "#0e2a12", hi: "#4f9a4a", pat: "none" },
      },
    ),
    crystal: M(
      "Crystal Cave",
      "dark",
      {
        motif: "crystals",
        decor: [DEC.gem, DEC.rock],
        crate: {
          edge: "#1a1030",
          body: "#5a3a8a",
          body2: "#3a2260",
          band: "#8ad8ff",
          plate: "#f0e8ff",
          ink: "#1a1030",
        },
      },
      {
        floor: "#cdbfe3",
        spk: ["#a066e0", "#6ab8e8"],
        bullet: ["#2a1a50", "#ffffff"],
        wall: { base: "#7a6aa0", edge: "#2a1e48", hi: "#c8b8f0", pat: "none" },
      },
      {
        floor: "#1a1430",
        spk: ["#e066ff", "#8ad8ff"],
        bullet: ["#e066ff", "#0e0a1c"],
        wall: { base: "#4a3a6a", edge: "#120a24", hi: "#b08aff", pat: "none" },
      },
    ),
  });
  Object.assign(BULLET_COLOR, {
    arctic: "#7fd0ff",
    volcano: "#ff3300",
    jungle: "#1f9e4a",
    temple: "#00897b",
    space: "#c9a6ff",
    haunted: "#9effd2",
    autumn: "#e8901a",
    pirate: "#3d2b1f",
    lab: "#39ff88",
    swamp: "#6b8e23",
    garden: "#f9c74f",
    crystal: "#e066ff",
  });
}
// ---------- and 12 more, each with shots that look like nothing else (patterned, so no two maps' bullets match) ----------
MOTIF.hex = (g, w, h, p) => {
  g.strokeStyle = p.spk[0];
  g.globalAlpha = 0.35;
  g.lineWidth = 2;
  const r = 18,
    dx = r * 1.5,
    dy = r * Math.sqrt(3);
  for (let cx = 0; cx <= w + dx; cx += dx) {
    for (let cy = (((cx / dx) % 2) * dy) / 2; cy <= h + dy; cy += dy) {
      g.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k * Math.PI) / 3;
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      g.stroke();
    }
  }
  g.globalAlpha = 1;
};
{
  const V = mapVariant,
    mk = (o) => V(Object.assign({ noise: 8, decorRate: 0.12 }, o));
  const M = (name, def, common, light, dark) => ({
    name,
    def,
    light: mk(Object.assign({}, common, light)),
    dark: mk(Object.assign({}, common, dark)),
  });
  const cr = (edge, body, body2, band, plate, ink) => ({ edge, body, body2, band, plate, ink });
  Object.assign(MAP_THEMES, {
    ruins: M(
      "Sunken Ruins",
      "dark",
      {
        motif: "flagstones",
        decor: [DEC.shell, DEC.rock],
        crate: cr("#0e2a2a", "#3a7a74", "#245250", "#e6d8b0", "#f2ecd8", "#0e2a2a"),
      },
      {
        floor: "#9fc9c2",
        spk: ["#7aa8a0"],
        bullet: ["#0e2a2a", "#fff"],
        wall: { base: "#c8bfa0", edge: "#4a5a50", hi: "#ece4c8", pat: "bricks", c2: "#9a9478" },
      },
      {
        floor: "#123a40",
        spk: ["#0c2a30"],
        bullet: ["#fff", "#000"],
        wall: { base: "#8a9a88", edge: "#0c1e20", hi: "#b8c8b0", pat: "bricks", c2: "#5a6a5a" },
      },
    ),
    neon: M(
      "Neon City",
      "dark",
      {
        motif: "plates",
        decor: [DEC.vent, DEC.bolt],
        crate: cr("#0a0a14", "#20203a", "#12121f", "#ff2bd6", "#00f0ff", "#0a0a14"),
      },
      {
        floor: "#d8d8e8",
        spk: ["#a0a0c8", "#ffffff"],
        bullet: ["#000", "#fff"],
        wall: { base: "#3a3a5a", edge: "#12121f", hi: "#ff2bd6", pat: "none" },
      },
      {
        floor: "#0e0e1c",
        spk: ["#2a2a4a", "#00f0ff"],
        bullet: ["#fff", "#000"],
        wall: { base: "#ff2bd6", edge: "#1a0a2a", hi: "#ffb0f0", pat: "none" },
      },
    ),
    candy: M(
      "Candy Clouds",
      "light",
      {
        motif: "sprinkles",
        spk: ["#ff7eb6", "#7ed7ff", "#fff27e", "#c79bff"],
        decor: [DEC.lolly, DEC.wrapped],
        crate: cr("#a03a6a", "#ffd0e6", "#ffa8d0", "#7ed7ff", "#ffffff", "#a03a6a"),
      },
      {
        floor: "#f6eefe",
        bullet: ["#000", "#fff"],
        wall: { base: "#ffb8dc", edge: "#c0508a", hi: "#ffe4f2", pat: "none" },
      },
      {
        floor: "#3a2a5a",
        bullet: ["#fff", "#000"],
        wall: { base: "#e8d0ff", edge: "#6a3a9a", hi: "#ffffff", pat: "none" },
      },
    ),
    dungeon: M(
      "Dungeon",
      "dark",
      {
        motif: "flagstones",
        decor: [DEC.cobweb, DEC.rock],
        crate: cr("#120e0a", "#5a4632", "#3a2c1e", "#7a7a80", "#d8ccb0", "#120e0a"),
      },
      {
        floor: "#a8a29a",
        spk: ["#86807a"],
        bullet: ["#000", "#fff"],
        wall: { base: "#6a6460", edge: "#22201e", hi: "#9a948e", pat: "bricks", c2: "#4a4644" },
      },
      {
        floor: "#26221e",
        spk: ["#1a1714"],
        bullet: ["#fff", "#000"],
        wall: { base: "#8a847e", edge: "#121010", hi: "#b8b2ac", pat: "bricks", c2: "#5a5652" },
      },
    ),
    farm: M(
      "Farm",
      "light",
      {
        motif: "tufts",
        decor: [DEC.bloom, DEC.leaf],
        crate: cr("#3a1a0a", "#c0392b", "#8a2418", "#ffffff", "#fff3d6", "#3a1a0a"),
      },
      {
        floor: "#c8b878",
        spk: ["#9a8a4a", "#7a6a3a"],
        bullet: ["#000", "#fff"],
        wall: { base: "#a06a3a", edge: "#4a2a12", hi: "#d09a6a", pat: "planks", c2: "#7a4a22" },
      },
      {
        floor: "#3a3420",
        spk: ["#5a5030", "#2a2414"],
        bullet: ["#fff", "#000"],
        wall: { base: "#8a5a30", edge: "#2a1808", hi: "#b8885a", pat: "planks", c2: "#5a3a1a" },
      },
    ),
    moon: M(
      "Moon Base",
      "dark",
      {
        motif: "snow",
        decor: [DEC.rock, DEC.bolt],
        crate: cr("#1a1c22", "#e8e8ec", "#b8bac2", "#ff7a1a", "#ffffff", "#1a1c22"),
      },
      {
        floor: "#cfccc4",
        spk: ["#a8a59c", "#b8b5ac"],
        bullet: ["#000", "#fff"],
        wall: { base: "#e8e8ec", edge: "#5a5c64", hi: "#ffffff", pat: "joints", c2: "#ff7a1a" },
      },
      {
        floor: "#3a3a40",
        spk: ["#2a2a30", "#4a4a52"],
        bullet: ["#fff", "#000"],
        wall: { base: "#b8bac2", edge: "#1a1c22", hi: "#e8e8ec", pat: "joints", c2: "#ff7a1a" },
      },
    ),
    toybox: M(
      "Toy Box",
      "light",
      {
        motif: "sprinkles",
        spk: ["#ff3b30", "#1e88ff", "#ffd400", "#2ecc71"],
        decor: [DEC.wrapped, DEC.bolt],
        crate: cr("#1a2a5a", "#1e88ff", "#1260b8", "#ffd400", "#ffffff", "#1a2a5a"),
      },
      {
        floor: "#fdf6e8",
        bullet: ["#000", "#fff"],
        wall: { base: "#ff3b30", edge: "#8a1a14", hi: "#ff8a80", pat: "blocks", c2: "#ffd400" },
      },
      {
        floor: "#2a3a5a",
        bullet: ["#fff", "#000"],
        wall: { base: "#ff3b30", edge: "#4a0a08", hi: "#ff8a80", pat: "blocks", c2: "#ffd400" },
      },
    ),
    disco: M(
      "Disco",
      "dark",
      {
        motif: "plates",
        decor: [DEC.gem, DEC.card],
        crate: cr("#1a0a2a", "#c8a0ff", "#8a5ad8", "#ffd400", "#ffffff", "#1a0a2a"),
      },
      {
        floor: "#e8d8f8",
        spk: ["#c8a8e8", "#ffffff"],
        bullet: ["#000", "#fff"],
        wall: { base: "#ffd400", edge: "#7a5a00", hi: "#fff3a0", pat: "none" },
      },
      {
        floor: "#1a0a2a",
        spk: ["#ff2bd6", "#00f0ff"],
        bullet: ["#fff", "#000"],
        wall: { base: "#c8a0ff", edge: "#2a0a4a", hi: "#ffffff", pat: "none" },
      },
    ),
    beehive: M(
      "Beehive",
      "light",
      {
        motif: "hex",
        decor: [DEC.bloom, DEC.leaf],
        crate: cr("#3a2400", "#ffb300", "#c88400", "#1a1406", "#fff3c8", "#3a2400"),
      },
      {
        floor: "#ffe8a0",
        spk: ["#c89a20"],
        bullet: ["#000", "#fff"],
        wall: { base: "#e8a010", edge: "#6a4400", hi: "#ffd86a", pat: "none" },
      },
      {
        floor: "#3a2a0a",
        spk: ["#c89a20"],
        bullet: ["#fff", "#000"],
        wall: { base: "#c88400", edge: "#2a1a00", hi: "#ffc84a", pat: "none" },
      },
    ),
    circus: M(
      "Circus",
      "light",
      {
        motif: "sprinkles",
        spk: ["#e8202a", "#ffd400", "#1e88ff", "#ffffff"],
        decor: [DEC.flag, DEC.wrapped],
        crate: cr("#5a0a0e", "#e8202a", "#a01018", "#ffd400", "#ffffff", "#5a0a0e"),
      },
      {
        floor: "#f2e2c4",
        bullet: ["#000", "#fff"],
        wall: { base: "#ffffff", edge: "#8a1018", hi: "#ffffff", pat: "stripes", c2: "#e8202a" },
      },
      {
        floor: "#3a1a2a",
        bullet: ["#fff", "#000"],
        wall: { base: "#ffffff", edge: "#4a0a10", hi: "#ffffff", pat: "stripes", c2: "#e8202a" },
      },
    ),
    stadium: M(
      "Stadium",
      "light",
      {
        motif: "tufts",
        decor: [DEC.flag, DEC.cone],
        crate: cr("#0a1a0a", "#ffffff", "#c8c8c8", "#1a1a1a", "#ffffff", "#0a1a0a"),
      },
      {
        floor: "#5fae4a",
        spk: ["#4a9a3a", "#7ac860"],
        bullet: ["#000", "#fff"],
        wall: { base: "#f4f4f4", edge: "#3a6a2a", hi: "#ffffff", pat: "none" },
      },
      {
        floor: "#1e4a22",
        spk: ["#2a6a2a", "#16381a"],
        bullet: ["#fff", "#000"],
        wall: { base: "#e8e8e8", edge: "#0a200c", hi: "#ffffff", pat: "none" },
      },
    ),
    galaxy: M(
      "Galaxy",
      "dark",
      {
        motif: "stars",
        decor: [DEC.gem, DEC.snowflake],
        crate: cr("#0a0a2a", "#3a2a8a", "#22185a", "#ff9ef0", "#e8e0ff", "#0a0a2a"),
      },
      {
        floor: "#d8d4f4",
        spk: ["#7a6ad8", "#b04aff"],
        bullet: ["#000", "#fff"],
        wall: { base: "#5a4ac8", edge: "#1a1050", hi: "#a89aff", pat: "none" },
      },
      {
        floor: "#0a0a2a",
        spk: ["#ffffff", "#ff9ef0", "#9fb4ff"],
        bullet: ["#fff", "#000"],
        wall: { base: "#3a2a8a", edge: "#0a0624", hi: "#b04aff", pat: "none" },
      },
    ),
  });
  Object.assign(SHIELD_COLOR, {
    ruins: "#7fe0d0",
    neon: "#00f0ff",
    candy: "#ff7eb6",
    dungeon: "#c8b080",
    farm: "#ff6a3a",
    moon: "#ff9a3a",
    toybox: "#1e88ff",
    disco: "#ffd400",
    beehive: "#ffc61a",
    circus: "#e8202a",
    stadium: "#ffffff",
    galaxy: "#b04aff",
  });
}
// hand-made themed crates: one picture per map (cut from the sheets into one atlas, 128px each), the weapon's or the
// shield's badge drawn on top. They replace the drawn themed crates; the atlas loads once, the first time a crate is needed.
export const CRATE_ATLAS = "ttcl-art:b6fa27811846.avif",
  CRATE_KEYS = [
    "deepsea",
    "arcade",
    "sweets",
    "racing",
    "sakura",
    "safari",
    "steampunk",
    "kingdom",
    "wildwest",
    "tropical",
    "mech",
    "casino",
    "graffiti",
    "ninja",
    "agent",
    "arctic",
    "volcano",
    "jungle",
    "temple",
    "space",
    "haunted",
    "autumn",
    "pirate",
    "lab",
    "swamp",
    "garden",
    "crystal",
    "ruins",
    "neon",
    "candy",
    "dungeon",
    "farm",
    "moon",
    "toybox",
    "disco",
    "beehive",
    "circus",
    "stadium",
    "galaxy",
  ];
// ---------- maps for the older Color Lab boxes: Code Rain (Hacker), Heaven, Shadow, Holo, Spectral, Elements ----------
MOTIF.coderain = (g, w, h, p, i) => {
  g.font = "bold 13px monospace";
  g.textAlign = "center";
  for (let c = 0; c < 9; c++) {
    const x = 12 + (c * (w - 24)) / 8,
      len = 4 + Math.floor(mapNoise(c, i, 111) * 7),
      y0 = 10 + mapNoise(i, c, 112) * (h - 20 - len * 14);
    for (let k = 0; k < len; k++) {
      g.globalAlpha = ((k + 1) / len) * 0.55;
      g.fillStyle = k === len - 1 ? p.spk[1] : p.spk[0];
      g.fillText(String.fromCharCode(0x30a0 + Math.floor(mapNoise(c * 7 + k, i, 113) * 90)), x, y0 + k * 14);
    }
  }
  g.globalAlpha = 1;
};
MOTIF.clouds = (g, w, h, p, i) => {
  for (let k = 0; k < 4; k++) {
    const x = 30 + mapNoise(k, i, 121) * (w - 60),
      y = 30 + mapNoise(i, k, 122) * (h - 60);
    g.globalAlpha = 0.35;
    g.fillStyle = p.spk[0];
    for (let j = 0; j < 4; j++) {
      g.beginPath();
      g.arc(x + (j - 1.5) * 9, y + (j % 2) * 4, 10 + (j % 3) * 3, 0, 7);
      g.fill();
    }
  }
  g.globalAlpha = 1;
};
MOTIF.veins = (g, w, h, p, i) => {
  g.lineCap = "round";
  for (let k = 0; k < 3; k++) {
    let x = 20 + mapNoise(k, i, 131) * (w - 40),
      y = 20 + mapNoise(i, k, 132) * (h - 40),
      a = mapNoise(k, i, 133) * 6.3;
    g.beginPath();
    g.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      a += (mapNoise(j, k + i, 134) - 0.5) * 1.2;
      x = Math.max(14, Math.min(w - 14, x + Math.cos(a) * 12));
      y = Math.max(14, Math.min(h - 14, y + Math.sin(a) * 12));
      g.lineTo(x, y);
    }
    g.strokeStyle = p.spk[0];
    g.globalAlpha = 0.25;
    g.lineWidth = 6;
    g.stroke();
    g.strokeStyle = p.spk[1];
    g.globalAlpha = 0.7;
    g.lineWidth = 1.6;
    g.stroke();
  }
  g.globalAlpha = 1;
};
MOTIF.holo = (g, w, h, p, i) => {
  const gr = g.createLinearGradient(0, 0, w, h);
  ["#ff9ef0", "#9ef0ff", "#f0ff9e", "#b89eff"].forEach((c, k) => gr.addColorStop(k / 3, c));
  g.globalAlpha = 0.22;
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.25;
  g.strokeStyle = "#ffffff";
  g.lineWidth = 1;
  for (let k = 1; k < 4; k++) {
    g.beginPath();
    g.moveTo((k * w) / 4, 6);
    g.lineTo((k * w) / 4, h - 6);
    g.moveTo(6, (k * h) / 4);
    g.lineTo(w - 6, (k * h) / 4);
    g.stroke();
  }
  g.globalAlpha = 1;
};
MOTIF.wisps = (g, w, h, p, i) => {
  for (let k = 0; k < 3; k++) {
    const x = 30 + mapNoise(k, i, 141) * (w - 60),
      y = 30 + mapNoise(i, k, 142) * (h - 60),
      r = 14 + mapNoise(k, i, 143) * 12;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, p.spk[1]);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = 0.45;
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;
};
MOTIF.quarters = (g, w, h, p, i) => {
  const C = p.spk;
  g.globalAlpha = 0.16;
  for (let q = 0; q < 4; q++) {
    g.fillStyle = C[(q + i) % 4];
    g.fillRect(((q % 2) * w) / 2 + 4, (Math.floor(q / 2) * h) / 2 + 4, w / 2 - 8, h / 2 - 8);
  }
  g.globalAlpha = 1;
};
DEC.terminal = (g, s, p) => {
  g.translate(s / 2, s / 2);
  g.fillStyle = "rgba(0,0,0,.35)";
  g.fillRect(-15, -11, 32, 24);
  g.fillStyle = "#0a140c";
  g.strokeStyle = p.spk[1];
  g.lineWidth = 2;
  g.fillRect(-17, -13, 32, 24);
  g.strokeRect(-17, -13, 32, 24);
  g.fillStyle = p.spk[1];
  for (let k = 0; k < 3; k++) {
    g.fillRect(-13, -8 + k * 6, 10 + ((k * 7) % 14), 2.5);
  }
};
DEC.feather = (g, s) => {
  g.translate(s / 2, s / 2);
  g.rotate(-0.6);
  g.fillStyle = "#ffffff";
  g.strokeStyle = "#c8b46a";
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(0, 0, 7, 22, 0, 0, 7);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(0, -20);
  g.lineTo(0, 24);
  g.stroke();
};
DEC.prism = (g, s) => {
  g.translate(s / 2, s / 2);
  const gr = g.createLinearGradient(-16, -16, 16, 16);
  gr.addColorStop(0, "#ff9ef0");
  gr.addColorStop(0.5, "#9ef0ff");
  gr.addColorStop(1, "#f0ff9e");
  g.fillStyle = gr;
  g.globalAlpha = 0.8;
  g.beginPath();
  g.moveTo(0, -18);
  g.lineTo(16, 12);
  g.lineTo(-16, 12);
  g.closePath();
  g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = "#ffffff";
  g.lineWidth = 1.5;
  g.stroke();
};
DEC.orb = (g, s, p) => {
  g.translate(s / 2, s / 2);
  g.globalAlpha = 0.8;
  g.fillStyle = p.spk[1];
  g.beginPath();
  for (let j = 0; j < 8; j++) {
    const a = (j / 8) * 6.283,
      r = j % 2 ? 3 : 17;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  g.globalAlpha = 1;
}; // a four-point sparkle (a round glow looked like a bullet)
Object.assign(BULLET_DRAW, {
  binary: (g, w, h) => {
    g.fillStyle = "#0a1a0c";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#39ff6a";
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        if ((x * 5 + y * 3) % 4) {
          g.fillRect(w * (0.2 + x * 0.22), h * (0.2 + y * 0.22), w * 0.14, h * 0.14);
        }
      }
    }
  },
  halo: (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.4, h * 0.38, 0, w / 2, h / 2, w * 0.6);
    gr.addColorStop(0, "#ffffff");
    gr.addColorStop(1, "#f2e6c0");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#e0b030";
    g.lineWidth = Math.max(1, w * 0.12);
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.33, 0, 7);
    g.stroke();
  },
  void: (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
    gr.addColorStop(0, "#000000");
    gr.addColorStop(0.6, "#2a0a4a");
    gr.addColorStop(1, "#9b4dff");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  },
  holo: (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    ["#ff9ef0", "#9ef0ff", "#f0ff9e", "#b89eff"].forEach((c, k) => gr.addColorStop(k / 3, c));
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  },
  wisp: (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
    gr.addColorStop(0, "#ffffff");
    gr.addColorStop(0.5, "#9ef6ff");
    gr.addColorStop(1, "#3a8ad8");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  },
  quad: (g, w, h) => {
    const C = ["#ff4a1a", "#1a8aff", "#3aa83a", "#e8e8f0"];
    for (let q = 0; q < 4; q++) {
      g.fillStyle = C[q];
      g.fillRect(((q % 2) * w) / 2, (Math.floor(q / 2) * h) / 2, w / 2 + 0.5, h / 2 + 0.5);
    }
  },
});
{
  const V = mapVariant,
    mk = (o) => V(Object.assign({ noise: 6, decorRate: 0.1 }, o));
  const M = (name, def, common, light, dark) => ({
    name,
    def,
    light: mk(Object.assign({}, common, light)),
    dark: mk(Object.assign({}, common, dark)),
  });
  const cr = (edge, body, body2, band, plate, ink) => ({ edge, body, body2, band, plate, ink });
  Object.assign(MAP_THEMES, {
    hacker: M(
      "Code Rain",
      "dark",
      {
        motif: "coderain",
        decor: [DEC.terminal, DEC.bolt],
        crate: cr("#020a04", "#0a1a0c", "#050d06", "#39ff6a", "#c8ffd8", "#020a04"),
      },
      {
        floor: "#dff2e4",
        spk: ["#2a9a4a", "#0a6a2a"],
        bullet: ["#000", "#fff"],
        wall: { base: "#2a9a4a", edge: "#0a3a18", hi: "#8af0a8", pat: "none" },
      },
      {
        floor: "#040a06",
        spk: ["#1a7a3a", "#9bffb4"],
        bullet: ["#fff", "#000"],
        wall: { base: "#0a2a12", edge: "#39ff6a", hi: "#9bffb4", pat: "none" },
      },
    ),
    heaven: M(
      "Heaven",
      "light",
      {
        motif: "clouds",
        decor: [DEC.feather, DEC.orb],
        crate: cr("#8a6a20", "#ffffff", "#e8e2d0", "#e0b030", "#fff8e0", "#8a6a20"),
      },
      {
        floor: "#eaf4ff",
        spk: ["#ffffff", "#fff3c0"],
        bullet: ["#000", "#fff"],
        wall: { base: "#f2d47a", edge: "#9a7a20", hi: "#fff6d0", pat: "none" },
      },
      {
        floor: "#2a3050",
        spk: ["#4a5478", "#fff3c0"],
        bullet: ["#fff", "#000"],
        wall: { base: "#e0b030", edge: "#6a4a10", hi: "#ffe89a", pat: "none" },
      },
    ),
    shadow: M(
      "Shadow Realm",
      "dark",
      {
        motif: "veins",
        decor: [DEC.orb, DEC.rock],
        crate: cr("#0a0414", "#2a1450", "#160a30", "#9b4dff", "#e0d0ff", "#0a0414"),
      },
      {
        floor: "#cfc6e0",
        spk: ["#9b4dff", "#5a2aa0"],
        bullet: ["#000", "#fff"],
        wall: { base: "#5a3a8a", edge: "#1a0a30", hi: "#a88ad8", pat: "none" },
      },
      {
        floor: "#0e0818",
        spk: ["#4a1a8a", "#b47aff"],
        bullet: ["#fff", "#000"],
        wall: { base: "#2a1450", edge: "#06020c", hi: "#9b4dff", pat: "none" },
      },
    ),
    holo: M(
      "Hologram",
      "light",
      {
        motif: "holo",
        decor: [DEC.prism, DEC.gem],
        crate: cr("#3a3a5a", "#e8e8f8", "#c8c8e0", "#9ef0ff", "#ffffff", "#3a3a5a"),
      },
      {
        floor: "#f2f2fa",
        spk: ["#c8c8e0"],
        bullet: ["#000", "#fff"],
        wall: { base: "#b8b8d8", edge: "#4a4a6a", hi: "#ffffff", pat: "none" },
      },
      {
        floor: "#1e1e30",
        spk: ["#2e2e44"],
        bullet: ["#fff", "#000"],
        wall: { base: "#8a8ab8", edge: "#14141f", hi: "#ffffff", pat: "none" },
      },
    ),
    spectral: M(
      "Spectral",
      "dark",
      {
        motif: "wisps",
        decor: [DEC.orb, DEC.cobweb],
        crate: cr("#0a1a2a", "#3a6a8a", "#22465e", "#9ef6ff", "#e8fbff", "#0a1a2a"),
      },
      {
        floor: "#d6eef4",
        spk: ["#9ac8d8", "#5ac8e8"],
        bullet: ["#000", "#fff"],
        wall: { base: "#6aa8c0", edge: "#1a4a5a", hi: "#c8f0ff", pat: "none" },
      },
      {
        floor: "#0c1a24",
        spk: ["#1a3a4a", "#9ef6ff"],
        bullet: ["#fff", "#000"],
        wall: { base: "#2a5a70", edge: "#06121a", hi: "#9ef6ff", pat: "none" },
      },
    ),
    elements: M(
      "Elements",
      "light",
      {
        motif: "quarters",
        spk: ["#ff6a3a", "#3a9aff", "#5ab04a", "#c8c8d8"],
        decor: [DEC.ember, DEC.leaf, DEC.shell],
        crate: cr("#1a1a1a", "#5a5a64", "#3a3a42", "#ff6a3a", "#f2f2f2", "#1a1a1a"),
      },
      {
        floor: "#e6e2d8",
        bullet: ["#000", "#fff"],
        wall: { base: "#7a7a84", edge: "#2a2a30", hi: "#c8c8d0", pat: "blocks", c2: "#5a5a64" },
      },
      {
        floor: "#26262c",
        bullet: ["#fff", "#000"],
        wall: { base: "#6a6a74", edge: "#121216", hi: "#a8a8b0", pat: "blocks", c2: "#4a4a52" },
      },
    ),
  });
  Object.assign(BULLET_STYLE, {
    hacker: "binary",
    heaven: "halo",
    shadow: "void",
    holo: "holo",
    spectral: "wisp",
    elements: "quad",
  });
  Object.assign(SHIELD_COLOR, {
    hacker: "#39ff6a",
    heaven: "#ffe07a",
    shadow: "#9b4dff",
    holo: "#9ef0ff",
    spectral: "#9ef6ff",
    elements: "#ff6a3a",
  });
}
// ---------- More Agent-style maps (undercover missions): Penthouse, Safehouse, Embassy Gala, Night Train ----------
{
  const v = (o) => mapVariant(Object.assign({ noise: 7, wave: 1.5, decorRate: 0.1, decorAlpha: 0.85 }, o));
  const cr = (edge, body, body2, band, plate, ink) => ({ edge, body, body2, band, plate, ink });
  Object.assign(MAP_THEMES, {
    penthouse: {
      name: "Penthouse",
      def: "light", // white marble and gold up top; at night, dark glass and city lights
      light: v({
        floor: "#f2efe9",
        space: "#e2ded6",
        motif: "marble",
        spk: ["#c9a24a", "#d8c79a"],
        veinAlpha: 0.32,
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.agMartini, DEC.agRose],
        wall: { base: "#c9a24a", edge: "#5a4210", hi: "#f4dc94", pat: "panel", c2: "#8a6a24" },
        crate: cr("#3a2a08", "#f2efe8", "#d8d2c4", "#c9a24a", "#ffffff", "#3a2a08"),
      }),
      dark: v({
        floor: "#151a26",
        space: "#0e121b",
        motif: "stars",
        spk: ["#ffd27a", "#8ab4ff"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.agMartini, DEC.agCard],
        wall: { base: "#c9a24a", edge: "#3a2a08", hi: "#f4dc94", pat: "panel", c2: "#8a6a24" },
        crate: cr("#0b0b0e", "#2a2f3c", "#151822", "#c9a24a", "#f2efe8", "#14161c"),
      }),
    },
    safehouse: {
      name: "Safehouse",
      def: "dark", // bare concrete, brick walls, hazard tape and spare briefcases
      light: v({
        floor: "#c9c6bf",
        space: "#b4b0a8",
        motif: "cracks",
        spk: ["#8a8680", "#a29e96"],
        noise: 12,
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.agCase, DEC.vent],
        wall: { base: "#9a4a30", edge: "#3a1a10", hi: "#c8775a", pat: "bricks", c2: "#5a2a1a" },
        crate: cr("#1a1a1a", "#5a5f68", "#3a3e46", "#ffa62b", "#f2efe8", "#1a1a1a"),
      }),
      dark: v({
        floor: "#3a3c40",
        space: "#2a2c30",
        motif: "cracks",
        spk: ["#26282c", "#55585e"],
        noise: 12,
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.agCase, DEC.vent],
        wall: { base: "#ffa62b", edge: "#2a1a00", hi: "#ffd08a", pat: "stripes", c2: "#1a1a1a" },
        crate: cr("#0b0b0e", "#3a3e46", "#202328", "#ffa62b", "#f2efe8", "#14161c"),
      }),
    },
    embassy: {
      name: "Embassy Gala",
      def: "dark", // a crimson ballroom carpet, gold trim, roses and drinks
      light: v({
        floor: "#f1e6d6",
        space: "#e2d4be",
        motif: "flagstones",
        spk: ["#d8c6a8"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.agRose, DEC.agMartini],
        wall: { base: "#8a1020", edge: "#3a0610", hi: "#c8404e", pat: "panel", c2: "#c9a24a" },
        crate: cr("#3a0610", "#8a1020", "#5a0814", "#c9a24a", "#f2efe8", "#3a0610"),
      }),
      dark: v({
        floor: "#5a0e18",
        space: "#3a0810",
        motif: "marble",
        spk: ["#c9a24a", "#8a2a34"],
        veinAlpha: 0.3,
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.agRose, DEC.agCard],
        wall: { base: "#c9a24a", edge: "#3a2a08", hi: "#f4dc94", pat: "panel", c2: "#8a6a24" },
        crate: cr("#1a0408", "#2a0810", "#14040a", "#c9a24a", "#f2efe8", "#1a0408"),
      }),
    },
    nighttrain: {
      name: "Night Train",
      def: "dark", // a sleeper carriage: wooden floor, brass fittings, lamps
      light: v({
        floor: "#b08a5e",
        space: "#8a6a44",
        motif: "planksFloor",
        spk: ["#8a6a44"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.agCase, DEC.lantern],
        wall: { base: "#2a3550", edge: "#0e1424", hi: "#4a5a80", pat: "joints", c2: "#c9a24a" },
        crate: cr("#2a1a0c", "#6a4a2a", "#4a321c", "#c9a24a", "#f2efe8", "#2a1a0c"),
      }),
      dark: v({
        floor: "#3a2a1c",
        space: "#2a1e14",
        motif: "planksFloor",
        spk: ["#22180e"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.agCase, DEC.lantern],
        wall: { base: "#5fd3c7", edge: "#0e2a28", hi: "#a8f0e8", pat: "joints", c2: "#2a3550" },
        crate: cr("#120c06", "#3a2a1c", "#22180e", "#5fd3c7", "#f2efe8", "#120c06"),
      }),
    },
  });
  Object.assign(BULLET_COLOR, {
    penthouse: "#f2d08a",
    safehouse: "#ffa62b",
    embassy: "#b0102a",
    nighttrain: "#5fd3c7",
  });
  Object.assign(SHIELD_COLOR, {
    penthouse: "#f4dc94",
    safehouse: "#ffa62b",
    embassy: "#ff5a6a",
    nighttrain: "#5fd3c7",
  });
}
// floor details for the world-tour maps
MOTIF.parquet = (g, w, h, p) => {
  g.strokeStyle = p.spk[0];
  g.globalAlpha = 0.45;
  g.lineWidth = 1.2;
  const s = w / 8; // herringbone wood blocks
  for (const [st, a, dy] of [
    [p.spk[0], 0.45, 0],
    ["#ffffff", 0.12, 1.5],
  ]) {
    g.strokeStyle = st;
    g.globalAlpha = a;
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s * 2) {
        g.beginPath();
        g.moveTo(x, y + s + dy);
        g.lineTo(x + s, y + dy);
        g.lineTo(x + s * 2, y + s + dy);
        g.stroke();
      }
    }
  }
  g.globalAlpha = 1;
}; // (a faint light edge too, so it shows on dark wood)
MOTIF.zellige = (g, w, h, p, i) => {
  const s = w / 5;
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const cx = (x + 0.5) * s,
        cy = (y + 0.5) * s,
        r = s * 0.32;
      g.fillStyle = p.spk[(x + y + i) % p.spk.length];
      g.globalAlpha = 0.35; // small eight-point tile stars
      g.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * 6.283,
          rr = k % 2 ? r * 0.55 : r;
        g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
    }
  }
  g.globalAlpha = 1;
};
MOTIF.rows = (g, w, h, p) => {
  g.fillStyle = p.spk[0];
  g.globalAlpha = 0.4;
  for (let y = 6; y < h - 6; y += 14) {
    g.fillRect(4, y, w - 8, 5);
  }
  g.globalAlpha = 1;
}; // mown lawn / vineyard rows
MOTIF.rain = (g, w, h, p, i) => {
  g.lineCap = "round";
  for (let k = 0; k < 22; k++) {
    const x = 8 + mapNoise(k, i, 151) * (w - 20),
      y = 8 + mapNoise(i, k, 152) * (h - 24);
    g.strokeStyle = p.spk[k % p.spk.length];
    g.globalAlpha = 0.25 + mapNoise(k, i, 153) * 0.35;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - 4, y + 12);
    g.stroke();
  }
  g.globalAlpha = 1;
}; // rain on wet pavement
DEC.grape = (g, s) => {
  g.translate(s / 2, s / 2);
  g.fillStyle = "#4a7a2a";
  g.beginPath();
  g.ellipse(6, -16, 9, 5, 0.4, 0, 7);
  g.fill();
  g.fillStyle = "#5a1a3a";
  for (const [x, y] of [
    [-6, -6],
    [2, -6],
    [10, -6],
    [-2, 2],
    [6, 2],
    [2, 10],
  ]) {
    g.beginPath();
    g.arc(x, y, 5, 0, 7);
    g.fill();
  }
  g.fillStyle = "rgba(255,255,255,.35)";
  for (const [x, y] of [
    [-7, -8],
    [1, -8],
    [9, -8],
  ]) {
    g.beginPath();
    g.arc(x, y, 1.6, 0, 7);
    g.fill();
  }
};
const WORLD_TOUR_MAPS = [];
// ---------- Undercover world-tour maps (real-world places: training ground, Paris, Italian coast, Marrakesh ... Siberia) ----------
{
  const v = (o) => mapVariant(Object.assign({ noise: 8, wave: 1.5, decorRate: 0.1, decorAlpha: 0.85 }, o));
  const cr = (edge, body, body2, band, plate, ink) => ({ edge, body, body2, band, plate, ink });
  Object.assign(MAP_THEMES, {
    training: {
      name: "Training Ground",
      def: "light",
      light: v({
        floor: "#dde2ea",
        space: "#c8cfd9",
        motif: "plates",
        spk: ["#aab3c2"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.agCase, DEC.cone],
        wall: { base: "#7d8696", edge: "#2a2f3a", hi: "#b8c0cc", pat: "blocks", c2: "#ff5e5b" },
        crate: cr("#2a2f3a", "#d8dde6", "#b8c0cc", "#ff5e5b", "#ffffff", "#2a2f3a"),
      }),
      dark: v({
        floor: "#2a2f3a",
        space: "#1e222b",
        motif: "plates",
        spk: ["#3a4150"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.agCase, DEC.cone],
        wall: { base: "#d8dde6", edge: "#1a1d24", hi: "#ffffff", pat: "blocks", c2: "#ff5e5b" },
        crate: cr("#0e1016", "#3a4150", "#22262f", "#ff5e5b", "#f2efe8", "#0e1016"),
      }),
    },
    paris: {
      name: "Paris Rooftops",
      def: "dark",
      light: v({
        floor: "#e8d2b0",
        space: "#d6bc94",
        motif: "parquet",
        spk: ["#b8955e", "#cfae7a"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.agRose, DEC.agMartini],
        wall: { base: "#f4efe6", edge: "#8a6a3a", hi: "#ffffff", pat: "panel", c2: "#c9a24a" },
        crate: cr("#3a2a08", "#f4efe6", "#ddd2bf", "#c9a24a", "#ffffff", "#3a2a08"),
      }),
      dark: v({
        floor: "#3a2a1e",
        space: "#2a1e14",
        motif: "parquet",
        spk: ["#4a3626", "#2a1c12"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.agRose, DEC.agMartini],
        wall: { base: "#c9a24a", edge: "#3a2a08", hi: "#f4dc94", pat: "panel", c2: "#e8b4d8" },
        crate: cr("#120c08", "#2a1e14", "#1a120c", "#e8b4d8", "#f2efe8", "#120c08"),
      }),
    },
    amalfi: {
      name: "Amalfi Coast",
      def: "light",
      light: v({
        floor: "#e9c9a0",
        space: "#d8b080",
        motif: "flagstones",
        spk: ["#d0a070"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.bloom, DEC.shell],
        wall: { base: "#c8582a", edge: "#5a200c", hi: "#e8885a", pat: "none" },
        crate: cr("#5a200c", "#f2e6c8", "#e0c89a", "#2f6fd6", "#ffffff", "#5a200c"),
      }),
      dark: v({
        floor: "#1e3a5a",
        space: "#14283e",
        motif: "flagstones",
        spk: ["#2a4a6a"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.bloom, DEC.shell],
        wall: { base: "#e9c9a0", edge: "#4a3010", hi: "#fff0d0", pat: "none" },
        crate: cr("#0a1828", "#2f6fd6", "#1e4a8a", "#f2e6c8", "#ffffff", "#0a1828"),
      }),
    },
    marrakesh: {
      name: "Marrakesh Souk",
      def: "light",
      light: v({
        floor: "#e6c9a0",
        space: "#d4ae7e",
        motif: "zellige",
        spk: ["#1f8fa8", "#d8742a"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.njstone, DEC.lantern],
        wall: { base: "#c8743a", edge: "#5a2a10", hi: "#e8a06a", pat: "bricks", c2: "#8a4a20" },
        crate: cr("#5a2a10", "#d8742a", "#a8501a", "#1f8fa8", "#f2e6c8", "#5a2a10"),
      }),
      dark: v({
        floor: "#3a2416",
        space: "#2a180e",
        motif: "zellige",
        spk: ["#1f8fa8", "#c8743a"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.njstone, DEC.lantern],
        wall: { base: "#1f8fa8", edge: "#0a2a34", hi: "#6ad0e0", pat: "bricks", c2: "#0e4a5a" },
        crate: cr("#0a2a34", "#1f8fa8", "#145a6a", "#d8742a", "#f2e6c8", "#0a2a34"),
      }),
    },
    bangkok: {
      name: "Bangkok Night Market",
      def: "dark",
      light: v({
        floor: "#d8b07a",
        space: "#c4955a",
        motif: "parquet",
        spk: ["#a87a42", "#c09058"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.leaf, DEC.lantern],
        wall: { base: "#1e4a3a", edge: "#0a2018", hi: "#3a7a62", pat: "panel", c2: "#e0a030" },
        crate: cr("#4a2a10", "#8a5a2a", "#6a4220", "#e0a030", "#f2e6c8", "#4a2a10"),
      }),
      dark: v({
        floor: "#2a1a10",
        space: "#1e120a",
        motif: "parquet",
        spk: ["#3a2416", "#22150c"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.leaf, DEC.lantern],
        wall: { base: "#e0a030", edge: "#4a3010", hi: "#ffd88a", pat: "panel", c2: "#1e4a3a" },
        crate: cr("#0e0804", "#3a2416", "#22150c", "#e0a030", "#f2e6c8", "#0e0804"),
      }),
    },
    colorado: {
      name: "Colorado Canyon",
      def: "light",
      light: v({
        floor: "#b8a47a",
        space: "#a8926a",
        motif: "tufts",
        spk: ["#8a7a4a", "#a09060"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.rock, DEC.weed],
        wall: { base: "#8a5a2a", edge: "#3a2410", hi: "#b8844a", pat: "planks", c2: "#5a3a1a" },
        crate: cr("#3a2410", "#a8341f", "#7a2414", "#e8d8b0", "#f2e6c8", "#3a2410"),
      }),
      dark: v({
        floor: "#3a3222",
        space: "#2a2418",
        motif: "tufts",
        spk: ["#4a4230", "#22201a"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.rock, DEC.weed],
        wall: { base: "#a8341f", edge: "#3a0e06", hi: "#d8603a", pat: "planks", c2: "#6a1e0e" },
        crate: cr("#120c06", "#4a4230", "#2a2418", "#a8341f", "#f2e6c8", "#120c06"),
      }),
    },
    hokkaido: {
      name: "Hokkaido Hot Springs",
      def: "light",
      light: v({
        floor: "#eef2f6",
        space: "#dde4ec",
        motif: "snow",
        spk: ["#ffffff", "#c8d4e0"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.snowflake, DEC.bloom],
        wall: { base: "#8a5a3a", edge: "#3a2010", hi: "#c08a62", pat: "joints", c2: "#f4f6fa" },
        crate: cr("#3a2010", "#f4f6fa", "#dde4ec", "#c8102e", "#ffffff", "#3a2010"),
      }),
      dark: v({
        floor: "#1e2430",
        space: "#141922",
        motif: "snow",
        spk: ["#e8eef6", "#9fb4cc"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.snowflake, DEC.bloom],
        wall: { base: "#e8eef6", edge: "#3a4a5a", hi: "#ffffff", pat: "joints", c2: "#c8102e" },
        crate: cr("#0a0e14", "#2a3240", "#1a2028", "#c8102e", "#f2efe8", "#0a0e14"),
      }),
    },
    hawkesbay: {
      name: "New Zealand Shore",
      def: "dark",
      light: v({
        floor: "#e8d8b4",
        space: "#d8c49a",
        motif: "ripples",
        spk: ["#c8b080"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.shell, DEC.rock],
        wall: { base: "#f2f2ec", edge: "#3a3a3a", hi: "#ffffff", pat: "panel", c2: "#8a9aaa" },
        crate: cr("#3a3a3a", "#e8d8b4", "#c8b080", "#2a3040", "#ffffff", "#3a3a3a"),
      }),
      dark: v({
        floor: "#1a2234",
        space: "#121826",
        motif: "ripples",
        spk: ["#2a3550", "#5a6a8a"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.shell, DEC.rock],
        wall: { base: "#c8d4e0", edge: "#2a3550", hi: "#ffffff", pat: "panel", c2: "#5a6a8a" },
        crate: cr("#0a0e18", "#2a3550", "#1a2234", "#f2f2e0", "#ffffff", "#0a0e18"),
      }),
    },
    miami: {
      name: "Miami Beach",
      def: "light",
      light: v({
        floor: "#5a5e66",
        space: "#4a4e56",
        motif: "stripes",
        spk: ["#6a6e76"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.tyres, DEC.flag],
        wall: { base: "#ff3fa4", edge: "#5a0a34", hi: "#ff9ad0", pat: "stripes", c2: "#14c8c8" },
        crate: cr("#1a1a1e", "#ff3fa4", "#c8207a", "#14c8c8", "#ffffff", "#1a1a1e"),
      }),
      dark: v({
        floor: "#1a1c22",
        space: "#121418",
        motif: "stripes",
        spk: ["#2a2c34"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.tyres, DEC.flag],
        wall: { base: "#14c8c8", edge: "#044848", hi: "#7af0f0", pat: "stripes", c2: "#ff3fa4" },
        crate: cr("#060608", "#14c8c8", "#0a8a8a", "#ff3fa4", "#ffffff", "#060608"),
      }),
    },
    colombia: {
      name: "Rainforest Village",
      def: "light",
      light: v({
        floor: "#8a6a42",
        space: "#7a5a36",
        motif: "splats",
        spk: ["#5a4224", "#a08050"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.leaf, DEC.weed],
        wall: { base: "#8a9098", edge: "#3a3e44", hi: "#b8bec6", pat: "joints", c2: "#c8582a" },
        crate: cr("#3a2414", "#8a6a42", "#6a4e2e", "#ffd400", "#f2e6c8", "#3a2414"),
      }),
      dark: v({
        floor: "#2a2214",
        space: "#1e180e",
        motif: "splats",
        spk: ["#3a2e1a", "#4a6a2a"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.leaf, DEC.weed],
        wall: { base: "#5a8a3a", edge: "#1a2a10", hi: "#8ac06a", pat: "joints", c2: "#3a2414" },
        crate: cr("#0e0a04", "#3a2e1a", "#22180c", "#ffd400", "#f2e6c8", "#0e0a04"),
      }),
    },
    mumbai: {
      name: "Mumbai Market",
      def: "light",
      light: v({
        floor: "#d8b88a",
        space: "#c8a474",
        motif: "sprinkles",
        spk: ["#ff6fb5", "#f28c28", "#2a6ab8", "#3ac07a"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.wrapped, DEC.bloom],
        wall: { base: "#f28c28", edge: "#5a2a08", hi: "#ffc078", pat: "bricks", c2: "#c86a10" },
        crate: cr("#5a2a08", "#f28c28", "#c86a10", "#ff6fb5", "#f2e6c8", "#5a2a08"),
      }),
      dark: v({
        floor: "#3a2a1e",
        space: "#2a1e14",
        motif: "sprinkles",
        spk: ["#ff6fb5", "#f28c28", "#2a6ab8"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.wrapped, DEC.bloom],
        wall: { base: "#ff6fb5", edge: "#5a0a34", hi: "#ffc0e0", pat: "bricks", c2: "#c83a8a" },
        crate: cr("#0e0804", "#2a6ab8", "#1a4a8a", "#ff6fb5", "#f2e6c8", "#0e0804"),
      }),
    },
    suburbia: {
      name: "Suburbia",
      def: "light",
      light: v({
        floor: "#7ab85a",
        space: "#6aa84a",
        motif: "rows",
        spk: ["#8ac86a"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.bloom, DEC.paws],
        wall: { base: "#ffffff", edge: "#7a7a7a", hi: "#ffffff", pat: "planks", c2: "#d8d8d8" },
        crate: cr("#5a3a24", "#ffffff", "#e0e0e0", "#6a9ad8", "#ffffff", "#5a3a24"),
      }),
      dark: v({
        floor: "#22381a",
        space: "#1a2a12",
        motif: "rows",
        spk: ["#2a4420"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.bloom, DEC.paws],
        wall: { base: "#e8e8e8", edge: "#3a3a3a", hi: "#ffffff", pat: "planks", c2: "#b8b8b8" },
        crate: cr("#0a1206", "#3a5a8a", "#2a4068", "#ffffff", "#f2efe8", "#0a1206"),
      }),
    },
    scotland: {
      name: "Highland Castle",
      def: "dark",
      light: v({
        floor: "#a8a8a4",
        space: "#949490",
        motif: "flagstones",
        spk: ["#8a8a86"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.weed, DEC.lantern],
        wall: { base: "#6a6a70", edge: "#2a2a2e", hi: "#9a9aa0", pat: "blocks", c2: "#5a5a62" },
        crate: cr("#2a2a2e", "#8a8a90", "#6a6a70", "#9b5fc0", "#f2efe8", "#2a2a2e"),
      }),
      dark: v({
        floor: "#2e2e34",
        space: "#222228",
        motif: "flagstones",
        spk: ["#3a3a42"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.weed, DEC.lantern],
        wall: { base: "#6a6a70", edge: "#141418", hi: "#9a9aa0", pat: "blocks", c2: "#9b5fc0" },
        crate: cr("#0a0a0e", "#3a3a42", "#22222a", "#9b5fc0", "#f2efe8", "#0a0a0e"),
      }),
    },
    newyork: {
      name: "New York Skyline",
      def: "dark",
      light: v({
        floor: "#ece8e0",
        space: "#dcd6ca",
        motif: "marble",
        spk: ["#b8b0a0", "#d0c8b8"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.agCase, DEC.gem],
        wall: { base: "#1e3a2a", edge: "#0a1a10", hi: "#3a6a4a", pat: "panel", c2: "#c9a24a" },
        crate: cr("#0a1a10", "#1e3a2a", "#14281c", "#c9a24a", "#f2efe8", "#0a1a10"),
      }),
      dark: v({
        floor: "#22262c",
        space: "#181b20",
        motif: "marble",
        spk: ["#3a404a", "#5a6070"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.agCase, DEC.gem],
        wall: { base: "#c9a24a", edge: "#3a2a08", hi: "#f4dc94", pat: "panel", c2: "#1e3a2a" },
        crate: cr("#0a0a0e", "#3a3e46", "#22262c", "#c9a24a", "#f2efe8", "#0a0a0e"),
      }),
    },
    maldives: {
      name: "Maldives Lagoon",
      def: "light",
      light: v({
        floor: "#7ad8e0",
        space: "#5ac8d4",
        motif: "ripples",
        spk: ["#c8f4f8", "#4ab8c8"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.shell, DEC.leaf],
        wall: { base: "#c8a070", edge: "#5a3a1a", hi: "#e8c898", pat: "planks", c2: "#8a6a44" },
        crate: cr("#5a3a1a", "#f4ead6", "#e0d0b0", "#00b3a6", "#ffffff", "#5a3a1a"),
      }),
      dark: v({
        floor: "#0e3a4a",
        space: "#0a2a36",
        motif: "ripples",
        spk: ["#2a7a8a", "#1a5a6a"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.shell, DEC.leaf],
        wall: { base: "#c8a070", edge: "#3a2410", hi: "#e8c898", pat: "planks", c2: "#5a3a1a" },
        crate: cr("#04141a", "#2a7a8a", "#1a5a6a", "#f4ead6", "#ffffff", "#04141a"),
      }),
    },
    dubai: {
      name: "Dubai Desert",
      def: "light",
      light: v({
        floor: "#e8dcc4",
        space: "#d8c8a8",
        motif: "clouds",
        spk: ["#ffffff"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.gem, DEC.prism],
        wall: { base: "#8ab4d0", edge: "#2a4a6a", hi: "#d0e8f8", pat: "panel", c2: "#e0c060" },
        crate: cr("#4a3a10", "#e8e4dc", "#d0c8b8", "#e0c060", "#ffffff", "#4a3a10"),
      }),
      dark: v({
        floor: "#2a2a34",
        space: "#1e1e26",
        motif: "clouds",
        spk: ["#4a4a5a"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.gem, DEC.prism],
        wall: { base: "#e0c060", edge: "#4a3a10", hi: "#fff0b0", pat: "panel", c2: "#8ab4d0" },
        crate: cr("#0a0a10", "#4a4a5a", "#2a2a34", "#e0c060", "#f2efe8", "#0a0a10"),
      }),
    },
    dartmoor: {
      name: "English Moors",
      def: "dark",
      light: v({
        floor: "#9aa078",
        space: "#8a9068",
        motif: "tufts",
        spk: ["#7a8058", "#a8a888"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.weed, DEC.agRose],
        wall: { base: "#7a5a3a", edge: "#2a1a0a", hi: "#a8845a", pat: "panel", c2: "#4a3420" },
        crate: cr("#2a1a0a", "#7a5a3a", "#5a4028", "#6a8a3a", "#f2e6c8", "#2a1a0a"),
      }),
      dark: v({
        floor: "#2a2418",
        space: "#1e1a10",
        motif: "tufts",
        spk: ["#3a3424", "#4a4230"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.weed, DEC.agRose],
        wall: { base: "#5a4028", edge: "#1a1006", hi: "#8a6a48", pat: "panel", c2: "#6a8a3a" },
        crate: cr("#0a0804", "#4a3a26", "#2a2016", "#6a8a3a", "#f2e6c8", "#0a0804"),
      }),
    },
    berlin: {
      name: "Berlin Streets",
      def: "dark",
      light: v({
        floor: "#a8a8a8",
        space: "#989898",
        motif: "cracks",
        spk: ["#7a7a7a", "#8a8a8a"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.bolt, DEC.can],
        wall: { base: "#4a4a4e", edge: "#1a1a1c", hi: "#7a7a7e", pat: "blocks", c2: "#ff2040" },
        crate: cr("#1a1a1c", "#6a6a70", "#4a4a4e", "#ff2040", "#f2efe8", "#1a1a1c"),
      }),
      dark: v({
        floor: "#18181c",
        space: "#101014",
        motif: "cracks",
        spk: ["#2a2a30", "#ff2040"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.bolt, DEC.can],
        wall: { base: "#3a3a40", edge: "#08080a", hi: "#6a6a70", pat: "blocks", c2: "#ff2040" },
        crate: cr("#040406", "#2a2a30", "#18181c", "#ff2040", "#f2efe8", "#040406"),
      }),
    },
    chongqing: {
      name: "Neon City Rain",
      def: "dark",
      light: v({
        floor: "#8a929c",
        space: "#7a828c",
        motif: "rain",
        spk: ["#c8d0d8"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.lantern, DEC.terminal],
        wall: { base: "#5a626c", edge: "#1a2028", hi: "#8a929c", pat: "joints", c2: "#3ad0ff" },
        crate: cr("#1a2028", "#5a626c", "#3a424c", "#3ad0ff", "#f2efe8", "#1a2028"),
      }),
      dark: v({
        floor: "#141a24",
        space: "#0e121a",
        motif: "rain",
        spk: ["#3ad0ff", "#ff3a8a"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.lantern, DEC.terminal],
        wall: { base: "#2a3240", edge: "#06080c", hi: "#4a5a70", pat: "joints", c2: "#ff3a8a" },
        crate: cr("#04060a", "#2a3240", "#1a2028", "#3ad0ff", "#f2efe8", "#04060a"),
      }),
    },
    mendoza: {
      name: "Vineyard Hills",
      def: "light",
      light: v({
        floor: "#c8a878",
        space: "#b8966a",
        motif: "rows",
        spk: ["#6a8a3a"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.grape, DEC.leaf],
        wall: { base: "#d8b888", edge: "#5a3a1a", hi: "#f0d8a8", pat: "bricks", c2: "#a07a4a" },
        crate: cr("#5a3a1a", "#d8b888", "#b8966a", "#7a1a3a", "#f2e6c8", "#5a3a1a"),
      }),
      dark: v({
        floor: "#3a2418",
        space: "#2a1a10",
        motif: "rows",
        spk: ["#3a5a2a"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.grape, DEC.leaf],
        wall: { base: "#7a1a3a", edge: "#2a0614", hi: "#b84a6a", pat: "bricks", c2: "#4a0e22" },
        crate: cr("#0e0604", "#5a1a2a", "#3a0e1a", "#d8b070", "#f2e6c8", "#0e0604"),
      }),
    },
    carpathian: {
      name: "Carpathian Mountains",
      def: "dark",
      light: v({
        floor: "#e4ecf2",
        space: "#d2dce6",
        motif: "snow",
        spk: ["#ffffff", "#b8c8d6"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.snowflake, DEC.rock],
        wall: { base: "#5a4a3a", edge: "#1a120a", hi: "#8a7a6a", pat: "joints", c2: "#3a4a3a" },
        crate: cr("#1a120a", "#5a4a3a", "#3a2e22", "#e8f4ff", "#f2efe8", "#1a120a"),
      }),
      dark: v({
        floor: "#1e2622",
        space: "#141a18",
        motif: "snow",
        spk: ["#d8e4ee", "#7a8a96"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.snowflake, DEC.rock],
        wall: { base: "#3a4a3a", edge: "#0a120a", hi: "#6a7a6a", pat: "joints", c2: "#e8f4ff" },
        crate: cr("#06080a", "#3a4a3a", "#22301e", "#e8f4ff", "#f2efe8", "#06080a"),
      }),
    },
    andaman: {
      name: "Tropical Cove",
      def: "light",
      light: v({
        floor: "#d8c49a",
        space: "#c8b080",
        motif: "splats",
        spk: ["#a8905a", "#3a8a5a"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.shell, DEC.anchor],
        wall: { base: "#6a4a2a", edge: "#2a1a0a", hi: "#9a7a52", pat: "planks", c2: "#3a2a14" },
        crate: cr("#2a1a0a", "#8a6a44", "#6a4e2e", "#ff8a1a", "#f2e6c8", "#2a1a0a"),
      }),
      dark: v({
        floor: "#2a2418",
        space: "#1e1a10",
        motif: "splats",
        spk: ["#3a8a5a", "#1a4a5a"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.shell, DEC.anchor],
        wall: { base: "#6a4a2a", edge: "#1a0e04", hi: "#9a7a52", pat: "planks", c2: "#ff8a1a" },
        crate: cr("#0a0804", "#3a2e1a", "#22180c", "#ff8a1a", "#f2e6c8", "#0a0804"),
      }),
    },
    alps: {
      name: "Alpine Lodge",
      def: "light",
      light: v({
        floor: "#f2f4f8",
        space: "#e2e8f0",
        motif: "snow",
        spk: ["#ffffff", "#c8d4e4"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.snowflake, DEC.bloom],
        wall: { base: "#8a5a32", edge: "#3a2010", hi: "#b8844a", pat: "planks", c2: "#f4f0e8" },
        crate: cr("#3a2010", "#f4f0e8", "#e0d8c8", "#3a5ad8", "#ffffff", "#3a2010"),
      }),
      dark: v({
        floor: "#1e2a3a",
        space: "#141e2a",
        motif: "snow",
        spk: ["#e8eef6", "#8aa0c0"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.snowflake, DEC.bloom],
        wall: { base: "#8a5a32", edge: "#1a0e04", hi: "#b8844a", pat: "planks", c2: "#3a5ad8" },
        crate: cr("#06080e", "#3a4a6a", "#22304a", "#f4f0e8", "#ffffff", "#06080e"),
      }),
    },
    singapore: {
      name: "Singapore Harbour",
      def: "dark",
      light: v({
        floor: "#a0a4aa",
        space: "#8e9298",
        motif: "rain",
        spk: ["#c8ccd2"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.anchor, DEC.tyres],
        wall: { base: "#c83a2a", edge: "#4a0e08", hi: "#f07a5a", pat: "joints", c2: "#1a3a6a" },
        crate: cr("#3a3a3e", "#c83a2a", "#8a2414", "#ffb000", "#f2efe8", "#3a3a3e"),
      }),
      dark: v({
        floor: "#1a1e26",
        space: "#12151b",
        motif: "rain",
        spk: ["#ffb000", "#5a7aa8"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.anchor, DEC.tyres],
        wall: { base: "#1a3a6a", edge: "#060e1c", hi: "#4a6aa0", pat: "joints", c2: "#ffb000" },
        crate: cr("#04060a", "#1a3a6a", "#0e2244", "#ffb000", "#f2efe8", "#04060a"),
      }),
    },
    siberia: {
      name: "Frozen Outpost",
      def: "dark",
      light: v({
        floor: "#d0d4d6",
        space: "#c0c4c6",
        motif: "cracks",
        spk: ["#9aa0a4", "#ffffff"],
        bullet: ["#14161c", "#ffffff"],
        decor: [DEC.snowflake, DEC.vent],
        wall: { base: "#7a8078", edge: "#2a2e28", hi: "#a8aea6", pat: "blocks", c2: "#ff7a1a" },
        crate: cr("#2a2e28", "#7a8078", "#5a6058", "#ff7a1a", "#f2efe8", "#2a2e28"),
      }),
      dark: v({
        floor: "#262a2a",
        space: "#1a1e1e",
        motif: "cracks",
        spk: ["#3a4040", "#c8d4d8"],
        bullet: ["#f4f2ec", "#0c0c10"],
        decor: [DEC.snowflake, DEC.vent],
        wall: { base: "#5a6058", edge: "#0e100e", hi: "#8a9088", pat: "blocks", c2: "#ff7a1a" },
        crate: cr("#060808", "#3a4040", "#22262a", "#ff7a1a", "#f2efe8", "#060808"),
      }),
    },
  });
  Object.assign(BULLET_COLOR, {
    training: "#e04848",
    paris: "#e8b4d8",
    amalfi: "#2f6fd6",
    marrakesh: "#1f8fa8",
    bangkok: "#d4a84a",
    colorado: "#c04a2a",
    hokkaido: "#ff5a7a",
    hawkesbay: "#f2f2e0",
    miami: "#ff3fa4",
    colombia: "#d0b000",
    mumbai: "#e03a90",
    suburbia: "#ffffff",
    scotland: "#9b5fc0",
    newyork: "#3ac080",
    maldives: "#00b3a6",
    dubai: "#b89838",
    dartmoor: "#8aa04a",
    berlin: "#ff2040",
    chongqing: "#3ad0ff",
    mendoza: "#7a1a3a",
    carpathian: "#e8f4ff",
    andaman: "#e86a10",
    alps: "#3a5ad8",
    singapore: "#ffb000",
    siberia: "#ff7a1a",
  });
  Object.assign(SHIELD_COLOR, {
    training: "#ff5e5b",
    paris: "#ffd6ec",
    amalfi: "#3fa0ff",
    marrakesh: "#2fc0d8",
    bangkok: "#ffc850",
    colorado: "#ff6a3a",
    hokkaido: "#ff8aa0",
    hawkesbay: "#bfe8ff",
    miami: "#ff7ac8",
    colombia: "#ffe066",
    mumbai: "#ffa0d0",
    suburbia: "#bfe0ff",
    scotland: "#c890ff",
    newyork: "#5fe0a0",
    maldives: "#4af0e0",
    dubai: "#ffe8a0",
    dartmoor: "#a0c870",
    berlin: "#ff4060",
    chongqing: "#7ae4ff",
    mendoza: "#c8406a",
    carpathian: "#a0d0ff",
    andaman: "#ffb060",
    alps: "#8aa8ff",
    singapore: "#ffd060",
    siberia: "#ff9a4a",
  });
  WORLD_TOUR_MAPS.push(
    "training",
    "paris",
    "amalfi",
    "marrakesh",
    "bangkok",
    "colorado",
    "hokkaido",
    "hawkesbay",
    "miami",
    "colombia",
    "mumbai",
    "suburbia",
    "scotland",
    "newyork",
    "maldives",
    "dubai",
    "dartmoor",
    "berlin",
    "chongqing",
    "mendoza",
    "carpathian",
    "andaman",
    "alps",
    "singapore",
    "siberia",
  );
}
