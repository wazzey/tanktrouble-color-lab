import { GX_PAINT } from "./colours.js";
import { loadImg } from "./images.js";
import { TROPHIES, rewardsOf } from "./laika-trophies.js";

// ---------- Laika's map skins ----------
// With a Color Lab map on, Laika (the game's AI) wears that map's look: in the maze and wherever her tank is drawn.
// Picked to stand out on that map's floor. A look you saved for Laika yourself always wins. (⚙ Maze tab: on/off)
// Experimental: her robot dog (menu and game screens) repainted to match, by repainting the dog's own picture sheet
// (every animation keeps working). Off by default.
// her own plain colours for each map: three-tone, all different, picked to suit the map (no pattern paints)
export const LAIKA_SKINS = {
  deepsea: {
    turret: "0x14c8c8",
    base: "0x0b2e4f",
    treads: "0xff7f50",
    acc: { turret: "ttcl:ds-fin" },
    dog: ["#ff7f6a", "#f1d08a", "#83c5be"],
    dogPic: "ttcl-art:adc710a75843.avif",
  },
  arcade: {
    turret: "0xff2bd6",
    base: "0x2a0f5c",
    treads: "0x00f0ff",
    acc: { turret: "ttcl:ac-crown" },
    dog: ["#b02bd6", "#fff200", "#00e5ff"],
    dogPic: "ttcl-art:9faac1ab0b5f.avif",
  },
  sweets: {
    turret: "0xff9ecf",
    base: "0x7b3f20",
    treads: "0xfff3b0",
    acc: { turret: "ttcl:cn-cupcake" },
    dog: ["#ff8fc7", "#d61f3c", "#fff1a8"],
    dogPic: "ttcl-art:6622dc254eb0.avif",
  },
  racing: {
    turret: "0xffd400",
    base: "0xd7141f",
    treads: "0x141414",
    dog: ["#d7141f", "#ffd400", "#e8e8e8"],
    dogPic: "ttcl-art:ef903b99863c.avif",
  },
  sakura: {
    turret: "0xffc1d6",
    base: "0x6b2d5c",
    treads: "0xf5f0e6",
    acc: { turret: "ttcl:sk-kanzashi" },
    dog: ["#f4a6bb", "#c0272d", "#d4af37"],
    dogPic: "ttcl-art:cc1519f2bae8.avif",
  },
  safari: {
    turret: "0xe3a857",
    base: "0x4b5320",
    treads: "0x2b1d0e",
    acc: { turret: "ttcl:sf-hat" },
    dog: ["#d2a15a", "#556b2f", "#8a6a3a"],
    dogPic: "ttcl-art:1398a04e5460.avif",
  },
  steampunk: {
    turret: "0xb87333",
    base: "0x3d2b1f",
    treads: "0xd4a84b",
    acc: { turret: "ttcl:sm-tophat" },
    dog: ["#8c4a2f", "#b5893a", "#c8a040"],
    dogPic: "ttcl-art:7470ee1a118c.avif",
  },
  kingdom: {
    turret: "0x6a3db8",
    base: "0xe0b84a",
    treads: "0x1f2a5c",
    acc: { turret: "ttcl:kg-plume" },
    dog: ["#5b1f7a", "#d4af37", "#c8c8d0"],
    dogPic: "ttcl-art:78cbe136c646.avif",
    dogHat: [282, 212, 129.0, 25.5, -102.0, 80.0, 60.1],
  },
  wildwest: {
    turret: "0xc8743a",
    base: "0xf2d3a0",
    treads: "0x3b2414",
    acc: { turret: "ttcl:ww-hat", front: "ttcl:ww-badge" },
    dog: ["#c2733a", "#3b5b8c", "#d4af37"],
    dogPic: "ttcl-art:d967660011fc.avif",
    dogHat: [314, 212, 128.0, 22.0, -96.0, 95.0, 64.1],
  },
  tropical: {
    turret: "0x00c2a8",
    base: "0xffcc33",
    treads: "0xff5e78",
    acc: { turret: "ttcl:tp-straw" },
    dog: ["#2a9d8f", "#ff6f61", "#ffd23f"],
    dogPic: "ttcl-art:6ee7213c6d3b.avif",
  },
  mech: {
    turret: "0xffb300",
    base: "0x3a4250",
    treads: "0x00d0ff",
    acc: { turret: "ttcl:mc-radar" },
    dog: ["#6c757d", "#ffc300", "#00b4ff"],
    dogPic: "ttcl-art:5c15779cd6ba.avif",
  },
  casino: {
    turret: "0xc8102e",
    base: "0x0f5132",
    treads: "0xf5c542",
    acc: { turret: "ttcl:cs-visor" },
    dog: ["#b0101f", "#d4af37", "#d4af37"],
    dogPic: "ttcl-art:d4d839465953.avif",
  },
  graffiti: {
    turret: "0xb6ff00",
    base: "0xff2d95",
    treads: "0x1b1b1b",
    dog: ["#ff2d95", "#c6ff1a", "#22e0ff"],
    dogPic: "ttcl-art:5abbc04f46bf.avif",
    dogHat: [265, 212, 128.0, 27.0, -98.0, 100.0, 80.0],
  },
  ninja: {
    turret: "0x1d2147",
    base: "0xc1121f",
    treads: "0x0d0d0d",
    acc: { turret: "ttcl:nj-hood" },
    dog: ["#2a3566", "#b3242c", "#9aa3b5"],
    dogPic: "ttcl-art:5802332f5c56.avif",
    dogHat: [247, 212, 42.5, 26.7, -90.0, 160.9, 138.0],
  },
  agent: {
    turret: "0x1a1a1a",
    base: "0xf2efe8",
    treads: "0xb3121e",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: "ttcl-art:a48e3124bc4a.avif",
    dogHat: [284, 98, 64.3, 42.3, -90.0, 142.8, 49.2],
  },
};
// the world-tour maps: Laika in her Agent look (same dog picture and shades), the tank in each place's colours
const AGENT_DOG = LAIKA_SKINS.agent;
Object.assign(LAIKA_SKINS, {
  training: {
    turret: "0xd8dde6",
    base: "0x2a2f3a",
    treads: "0xff5e5b",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  paris: {
    turret: "0x1a1a1e",
    base: "0xe8b4d8",
    treads: "0xc9a24a",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  amalfi: {
    turret: "0xf2e6c8",
    base: "0x2f6fd6",
    treads: "0xc8582a",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  marrakesh: {
    turret: "0xd8742a",
    base: "0x1f8fa8",
    treads: "0xf2d8a8",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  bangkok: {
    turret: "0x6a3a1a",
    base: "0xe0a030",
    treads: "0x1e4a3a",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  colorado: {
    turret: "0x6a5a3a",
    base: "0xa8341f",
    treads: "0x3a3a2a",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  hokkaido: {
    turret: "0xf4f6fa",
    base: "0xc8102e",
    treads: "0x3a3a44",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  hawkesbay: {
    turret: "0x2a3040",
    base: "0xf2f2e0",
    treads: "0x8a7a5a",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  miami: {
    turret: "0x14c8c8",
    base: "0xff3fa4",
    treads: "0x1a1a1e",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  colombia: {
    turret: "0x2e6b2e",
    base: "0xffd400",
    treads: "0x6a4a2a",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  mumbai: {
    turret: "0xf28c28",
    base: "0xff6fb5",
    treads: "0x2a6ab8",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  suburbia: {
    turret: "0x6a9ad8",
    base: "0xffffff",
    treads: "0x5a3a24",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  scotland: {
    turret: "0x5a5a62",
    base: "0x9b5fc0",
    treads: "0x2a2a2e",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  newyork: {
    turret: "0x1e3a2a",
    base: "0xc9a24a",
    treads: "0x2a2b31",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  maldives: {
    turret: "0xf4ead6",
    base: "0x00b3a6",
    treads: "0x8a6a44",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  dubai: {
    turret: "0xe8e4dc",
    base: "0xe0c060",
    treads: "0x5a6070",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  dartmoor: {
    turret: "0x3a2a1a",
    base: "0x6a8a3a",
    treads: "0x8a7a5a",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  berlin: {
    turret: "0x2a2a2e",
    base: "0xff2040",
    treads: "0x6a6a70",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  chongqing: {
    turret: "0x1a2030",
    base: "0x3ad0ff",
    treads: "0xff3a8a",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  mendoza: {
    turret: "0x5a1a2a",
    base: "0xd8b070",
    treads: "0x3a4a2a",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  carpathian: {
    turret: "0x3a4a3a",
    base: "0xe8f4ff",
    treads: "0x2a2a2e",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  andaman: {
    turret: "0x8a6a44",
    base: "0xff8a1a",
    treads: "0x2a5a6a",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  alps: {
    turret: "0xf4f0e8",
    base: "0x3a5ad8",
    treads: "0x6a4a2a",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  singapore: {
    turret: "0x1a3a6a",
    base: "0xffb000",
    treads: "0x3a3a3e",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
  siberia: {
    turret: "0x4a5048",
    base: "0xff7a1a",
    treads: "0x2a2c2a",
    acc: { turret: "ttcl:ag-shades", front: "ttcl:ag-tie-black" },
    dog: ["#2a2c33", "#b3121e", "#c9ccd2"],
    dogPic: AGENT_DOG.dogPic,
    dogHat: AGENT_DOG.dogHat,
  },
});
// Laika's looks for the 12 newer maps (no repaint of her dog yet: it's recoloured in the look's palette)
Object.assign(LAIKA_SKINS, {
  arctic: { turret: "0xe8f6ff", base: "0x4a90c8", treads: "0x1d3b52", dog: ["#dfeef7", "#4a90c8", "#9fb4c8"] },
  volcano: { turret: "0xff4500", base: "0x2a1a14", treads: "0xffb000", dog: ["#3a2a24", "#ff4500", "#ffb000"] },
  jungle: { turret: "0x3fa34d", base: "0x6b4423", treads: "0xf2d16b", dog: ["#4a7a3a", "#f2d16b", "#6b4423"] },
  temple: { turret: "0x1f6f6a", base: "0xd9b56a", treads: "0x3a2a12", dog: ["#c8a86a", "#1f6f6a", "#e0b84a"] },
  space: { turret: "0xf2f4ff", base: "0x2a3a8a", treads: "0xc9a6ff", dog: ["#d8dcf0", "#2a3a8a", "#c9a6ff"] },
  haunted: { turret: "0x6a4a8a", base: "0x2a2433", treads: "0x9effd2", dog: ["#6a5a7a", "#9effd2", "#2a2433"] },
  autumn: { turret: "0xd2452c", base: "0xe8901a", treads: "0x4a2e14", dog: ["#c8642a", "#f2c14e", "#4a2e14"] },
  pirate: { turret: "0x2e2e33", base: "0x8a5a2e", treads: "0xf2e2c0", dog: ["#5a4a3a", "#c8102e", "#e0b84a"] },
  lab: { turret: "0xf4f8fa", base: "0x39ff88", treads: "0x5a6a72", dog: ["#e8eef0", "#39ff88", "#5a6a72"] },
  swamp: { turret: "0x6b8e23", base: "0x4a3a22", treads: "0xc8b04a", dog: ["#5a6a3a", "#c8b04a", "#4a3a22"] },
  garden: { turret: "0xf9c74f", base: "0x2f7a3a", treads: "0xffffff", dog: ["#f2e6c8", "#2f7a3a", "#f9c74f"] },
  crystal: { turret: "0xe066ff", base: "0x2a1a50", treads: "0x8ad8ff", dog: ["#7a5aa8", "#8ad8ff", "#e066ff"] },
});
Object.assign(LAIKA_SKINS, {
  // the third set of maps
  ruins: { turret: "0x3a7a74", base: "0xe6d8b0", treads: "0x0e2a2a", dog: ["#6a9a94", "#e6d8b0", "#2a4a48"] },
  neon: { turret: "0x00f0ff", base: "0x20203a", treads: "0xff2bd6", dog: ["#3a3a5a", "#ff2bd6", "#00f0ff"] },
  candy: { turret: "0xc79bff", base: "0xffd0e6", treads: "0x7ed7ff", dog: ["#e8c8f8", "#ff7eb6", "#7ed7ff"] },
  dungeon: { turret: "0x5a5450", base: "0x7a5a32", treads: "0x1a1714", dog: ["#5a5450", "#7a5a32", "#9a948e"] },
  farm: { turret: "0xc0392b", base: "0xfff3d6", treads: "0x7a4a22", dog: ["#b8865a", "#c0392b", "#fff3d6"] },
  moon: { turret: "0xe8e8ec", base: "0xff7a1a", treads: "0x3a3a40", dog: ["#c9c6bd", "#ff7a1a", "#e8e8ec"] },
  toybox: { turret: "0x1e88ff", base: "0xffd400", treads: "0xff3b30", dog: ["#d8a070", "#ff3b30", "#1e88ff"] },
  disco: { turret: "0xc8a0ff", base: "0x1a0a2a", treads: "0xffd400", dog: ["#a080d8", "#ffd400", "#c8d2e0"] },
  beehive: { turret: "0xffc61a", base: "0x1a1406", treads: "0xfff3c8", dog: ["#e8b030", "#1a1406", "#fff3c8"] },
  circus: { turret: "0xe8202a", base: "0xffffff", treads: "0x1e88ff", dog: ["#f2e2c4", "#e8202a", "#ffd400"] },
  stadium: { turret: "0xf8f8f8", base: "0x1e4a22", treads: "0x141414", dog: ["#8a8a8a", "#ffffff", "#1e4a22"] },
  galaxy: { turret: "0x2a3aff", base: "0x0a0a3a", treads: "0xff9ef0", dog: ["#5a4ac8", "#ff9ef0", "#9fb4ff"] },
});
Object.assign(LAIKA_SKINS, {
  // the older boxes' maps (eyeGlow: the colour her glowing eye turns)
  penthouse: {
    turret: "0xf4f1ea",
    base: "0xc9a24a",
    treads: "0x2a2b31",
    dog: ["#f4f1ea", "#c9a24a", "#2a2b31"],
    eyeGlow: "#ffd27a",
  },
  safehouse: {
    turret: "0x5a5f68",
    base: "0xffa62b",
    treads: "0x2a2c30",
    dog: ["#6a6e76", "#ffa62b", "#2a2c30"],
    eyeGlow: "#ffa62b",
  },
  embassy: {
    turret: "0x8a1020",
    base: "0xf2c94c",
    treads: "0x1a1a1e",
    dog: ["#8a1020", "#f2c94c", "#1a1a1e"],
    eyeGlow: "#ffd23f",
  },
  nighttrain: {
    turret: "0x2a3550",
    base: "0x5fd3c7",
    treads: "0x3a2a1c",
    dog: ["#2a3550", "#5fd3c7", "#8a6a44"],
    eyeGlow: "#5fd3c7",
  },
  hacker: {
    turret: "0x0a0f0a",
    base: "0x39ff6a",
    treads: "0x1a2a1c",
    dog: ["#1e2a20", "#39ff6a", "#5a6a5c"],
    eyeGlow: "#39ff6a",
  },
  heaven: {
    turret: "0xffffff",
    base: "0xe0b030",
    treads: "0xa8c8ff",
    dog: ["#f2eee4", "#e0b030", "#c8d8f0"],
    eyeGlow: "#ffd84a",
  },
  shadow: {
    turret: "0x2a1450",
    base: "0x9b4dff",
    treads: "0x0a0414",
    dog: ["#2a1e3a", "#9b4dff", "#4a3a5a"],
    eyeGlow: "#b47aff",
  },
  holo: {
    turret: "0x9ef0ff",
    base: "0xff9ef0",
    treads: "0xe8e8f8",
    dog: ["#c8d0f0", "#ff9ef0", "#9ef0ff"],
    eyeGlow: "#9ef0ff",
  },
  spectral: {
    turret: "0x9ef6ff",
    base: "0x2a5a70",
    treads: "0xe8fbff",
    dog: ["#a8c8d8", "#9ef6ff", "#e8fbff"],
    eyeGlow: "#9ef6ff",
  },
  elements: {
    turret: "0xff6a3a",
    base: "0x3a9aff",
    treads: "0x5ab04a",
    dog: ["#8a7a6a", "#ff6a3a", "#3a9aff"],
    eyeGlow: "#ff9a2a",
  },
});
export const LAIKA_ID = "6148530"; // Laika's own account (the AI plays as it)
export const isLaika = (id) => id === LAIKA_ID || LAIKA_IDS.has(id);
// --- the dog (experimental) ---
// The game builds each robot dog from its picture sheet + parts list (read from the game's cache every time a dog is
// made). With the option on, the cache holds the map's repainted sheet (hand-made repaints where there are any, the
// colour repaint otherwise), with an extra strip under it for a hat (Wild West's sheriff hat, Kingdom's crown) fixed to
// the dog's head bone, so it moves with every animation. New dogs pick it up (the next screen or round).
const DOG_EXTRA = 220;
const dogCache = new Map();
function dogParts(T) {
  // the parts list from the atlas text: name -> { xy, size, rotate }
  const reg = {};
  let cur = null;
  for (const line of T.split(/\r?\n/).slice(1)) {
    if (!line.trim()) {
      continue;
    }
    if (!/^\s/.test(line)) {
      cur = line.trim();
      reg[cur] = {};
      continue;
    }
    const m = /^\s*(\w+):\s*(.*)$/.exec(line);
    if (m && cur) {
      reg[cur][m[1]] = m[2].split(",").map((x) => x.trim());
    }
  }
  return reg;
}
function dogPaint(src, reg, pal) {
  // fur in the skin's colour (shaded like the original), collar and robot leg in its other two
  const W = src.naturalWidth || src.width,
    H = src.naturalHeight || src.height,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(src, 0, 0);
  const id = g.getImageData(0, 0, W, H),
    d = id.data;
  const hx2 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)],
    mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const tone = (col) => {
    const k = hx2(col);
    return [
      [0, mixc(k, [0, 0, 0], 0.78)],
      [0.45, mixc(k, [0, 0, 0], 0.3)],
      [0.8, k],
      [1, mixc(k, [255, 255, 255], 0.55)],
    ];
  };
  const rampAt = (st, t) => {
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < st.length; i++) {
      if (t <= st[i][0]) {
        const [p0, c0] = st[i - 1],
          [p1, c1] = st[i],
          k = (t - p0) / (p1 - p0 || 1);
        return mixc(c0, c1, k);
      }
    }
    return st[st.length - 1][1];
  };
  const fur = tone(pal[0]),
    col = [
      [0, mixc(hx2(pal[1]), [0, 0, 0], 0.7)],
      [0.5, hx2(pal[1])],
      [1, mixc(hx2(pal[1]), [255, 255, 255], 0.7)],
    ],
    met = [
      [0, mixc(hx2(pal[2]), [0, 0, 0], 0.75)],
      [0.5, hx2(pal[2])],
      [1, mixc(hx2(pal[2]), [255, 255, 255], 0.75)],
    ];
  const METALS = { leftFrontLeg: 1, paw: 1, joint: 1, toe1: 1, toe2: 1, toe3: 1, piston: 1 },
    SKIP = {
      shadow: 1,
      zipper: 1,
      teeth: 1,
      tear: 1,
      wire1: 1,
      wire2: 1,
      wire3: 1,
      wire4: 1,
      chainLink: 1,
      collarChainLink: 1,
    };
  for (const name in reg) {
    const r = reg[name];
    if (!r.xy || !r.size || SKIP[name]) {
      continue;
    }
    const [x0, y0] = r.xy.map(Number),
      [w, h] = r.size.map(Number),
      rot = r.rotate && r.rotate[0] === "true";
    const RW = rot ? h : w,
      RH = rot ? w : h,
      cut = name === "leftFrontLeg" ? Math.round(RH * 0.325) : -1; // that region's top third is the furry shoulder
    for (let y = y0; y < y0 + RH && y < H; y++) {
      for (let x = x0; x < x0 + RW && x < W; x++) {
        const i = (y * W + x) * 4;
        if (!d[i + 3]) {
          continue;
        }
        const r0 = d[i] / 255,
          g0 = d[i + 1] / 255,
          b0 = d[i + 2] / 255,
          mx = Math.max(r0, g0, b0),
          mn = Math.min(r0, g0, b0),
          l = (mx + mn) / 2,
          sa = mx - mn < 1e-4 ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1) + 1e-6);
        let out = null;
        if (name === "collar") {
          if (sa > 0.2) {
            out = rampAt(col, l / 0.42);
          }
        } else if (METALS[name] && !(cut >= 0 && y - y0 < cut)) {
          if (sa < 0.25 && l > 0.2) {
            out = rampAt(met, l);
          }
        } else if (sa < 0.18 && l > 0.13 && l < 0.74 && d[i + 2] - d[i] < 8) {
          out = rampAt(fur, (l - 0.13) / 0.61);
        } // grey fur (not the bluish nose)
        if (out) {
          d[i] = out[0];
          d[i + 1] = out[1];
          d[i + 2] = out[2];
        }
      }
    }
  }
  g.putImageData(id, 0, 0);
  return c;
}
export const dogGames = new Set(),
  dogLive = new Set(),
  dogSeen = new WeakSet();
function dogEyeGlow(c, atlasText, hex) {
  // her glowing (laser) eye in the look's colour instead of red: the red/orange glow turned to that hue, keeping its brightness
  if (!hex || !atlasText) {
    return;
  }
  const r = dogParts(atlasText).leftEyeLaser;
  if (!r || !r.xy || !r.size) {
    return;
  }
  const [x0, y0] = r.xy.map(Number),
    [w, h] = r.size.map(Number),
    rot = r.rotate && r.rotate[0] === "true",
    W = rot ? h : w,
    H = rot ? w : h;
  const g = c.getContext("2d", { willReadFrequently: true }),
    id = g.getImageData(x0, y0, W, H),
    d = id.data,
    t = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) {
      continue;
    }
    const R = d[i],
      G = d[i + 1],
      B = d[i + 2],
      mx = Math.max(R, G, B),
      mn = Math.min(R, G, B);
    if (R < G + 25 || mx - mn < 40) {
      continue;
    } // only the red glow, not the metal around it
    const L = mx / 255,
      k = (mx - mn) / mx;
    for (let j = 0; j < 3; j++) {
      d[i + j] = Math.round((t[j] * k + 255 * (1 - k)) * L);
    }
  }
  g.putImageData(id, x0, y0);
}
export async function dogSheet(want, games) {
  // the author's repaint for that look (the hat in the strip underneath), made once; a look with no repaint of its own gets the dog's sheet recoloured in its palette
  if (dogCache.has(want)) {
    return dogCache.get(want);
  }
  const S = LAIKA_SKINS[want];
  if (!S) {
    return null;
  }
  if (!S.dogPic) {
    if (!S.dog) {
      return null;
    }
    for (const g of games || []) {
      const C = g.cache && g.cache._cache;
      if (!C || !C.text) {
        continue;
      }
      const tk = Object.keys(C.text).find((k) => /^atlas_.*laika$/i.test(k)),
        T = tk && C.text[tk];
      if (!T) {
        continue;
      }
      const txt = T.__ttclOrig || T.data,
        page = txt
          .split(/\r?\n/)
          .find((l) => l.trim())
          .trim(),
        I = C.image[page];
      const orig = I && (I.__ttclOrig || I.data);
      if (!orig || !(orig.naturalWidth || orig.width)) {
        continue;
      }
      const c = dogPaint(orig, dogParts(txt), S.dog);
      dogEyeGlow(c, txt, S.eyeGlow);
      dogCache.set(want, c);
      if (dogCache.size > 3) {
        dogCache.delete(dogCache.keys().next().value);
      }
      return c;
    }
    return null;
  }
  const pic = await loadImg(S.dogPic);
  if (!pic) {
    return null;
  }
  const c = document.createElement("canvas");
  c.width = pic.naturalWidth || pic.width;
  c.height = pic.naturalHeight || pic.height;
  c.getContext("2d").drawImage(pic, 0, 0);
  if (S.eyeGlow) {
    for (const g of games || []) {
      const C = g.cache && g.cache._cache,
        tk = C && C.text && Object.keys(C.text).find((k) => /^atlas_.*laika$/i.test(k));
      if (tk) {
        dogEyeGlow(c, C.text[tk].__ttclOrig || C.text[tk].data, S.eyeGlow);
        break;
      }
    }
  }
  dogCache.set(want, c);
  if (dogCache.size > 3) {
    dogCache.delete(dogCache.keys().next().value);
  }
  return c;
}
export function dogSwap(game, want) {
  // put the wanted sheet + parts list into this game's cache (or the originals back); true if it changed
  const C = game && game.cache && game.cache._cache;
  if (!C || !C.text || !C.json || !C.image) {
    return false;
  }
  const tk = Object.keys(C.text).find((k) => /^atlas_.*laika$/i.test(k)),
    jk = Object.keys(C.json).find((k) => /laika$/i.test(k));
  if (!tk || !jk) {
    return false;
  }
  const T = C.text[tk],
    J = C.json[jk];
  if (!T || !J || typeof T.data !== "string") {
    return false;
  }
  if (T.__ttclOrig == null) {
    T.__ttclOrig = T.data;
    J.__ttclOrig = JSON.stringify(J.data);
  }
  const page = T.__ttclOrig
      .split(/\r?\n/)
      .find((l) => l.trim())
      .trim(),
    I = C.image[page];
  if (!I) {
    return false;
  }
  if (!I.__ttclOrig) {
    I.__ttclOrig = I.data;
  }
  const sheet = want ? dogCache.get(want) : null;
  if (want && !sheet) {
    return false;
  } // not ready yet: laikaDog() swaps it in when it is
  if ((game.__ttclDog || null) === (want || null) && I.data === (sheet || I.__ttclOrig)) {
    return false;
  }
  if (!sheet) {
    T.data = T.__ttclOrig;
    J.data = JSON.parse(J.__ttclOrig);
    I.data = I.__ttclOrig;
    game.__ttclDog = null;
    return true;
  }
  const orig = I.__ttclOrig,
    OH = orig.naturalHeight || orig.height || sheet.height - DOG_EXTRA,
    S = LAIKA_SKINS[want];
  let text = T.__ttclOrig.replace(/size:\s*(\d+)\s*,\s*(\d+)/, (m0, w) => "size: " + w + "," + sheet.height);
  const data = JSON.parse(J.__ttclOrig);
  if (S.dogHat) {
    const [w, h, x, y, rot, aw, ah] = S.dogHat;
    text =
      text.replace(/\s*$/, "") +
      `\nttclHat\n  rotate: false\n  xy: 4, ${OH + 4}\n  size: ${w}, ${h}\n  orig: ${w}, ${h}\n  offset: 0, 0\n  index: -1\n`;
    data.slots.push({ name: "ttclHat", bone: "head", attachment: "ttclHat" });
    data.skins.default.ttclHat = { ttclHat: { x, y, rotation: rot, width: aw, height: ah } };
  }
  T.data = text;
  J.data = data;
  I.data = sheet;
  game.__ttclDog = want;
  return true;
}

// --- the art: made from the game's own gold bone, recoloured ---
export const trophyKeyReq = {};
export const isRewardKey = (key) => TROPHIES.some((t) => t.key === key || rewardsOf(t).some((r) => r[0] === key)); // (an achievement without an item still has its picture)
// simple repeatable noise so every copy of the art looks the same
export const noiseHash = (x, y, s) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const lerp = (a, b, t) => a + (b - a) * t;
export function sampleRamp(stops, t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, c0] = stops[i - 1],
        [p1, c1] = stops[i],
        k = (t - p0) / (p1 - p0 || 1);
      return [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)];
    }
  }
  return stops[stops.length - 1][1];
}
export const hexChannels = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
// Gives a recoloured bone real depth: light from the top-left along its rounded edges, shade on the bottom-right,
// a bright glint, and a soft shadow underneath (so it doesn't read as a flat sticker).
export function boneDepth(c, mask, W, H, sc) {
  const cvs = () => {
    const k = document.createElement("canvas");
    k.width = W;
    k.height = H;
    return k;
  };
  const m = cvs(),
    mg = m.getContext("2d"),
    md = mg.createImageData(W, H);
  for (let p = 0; p < W * H; p++) {
    if (mask[p]) {
      md.data[p * 4 + 3] = 255;
    }
  }
  mg.putImageData(md, 0, 0);
  const b = cvs(),
    bg = b.getContext("2d", { willReadFrequently: true });
  bg.filter = "blur(" + Math.max(1.5, 5 * sc) + "px)";
  bg.drawImage(m, 0, 0);
  const B = bg.getImageData(0, 0, W, H).data,
    o = Math.max(1, Math.round(3 * sc));
  const g = c.getContext("2d", { willReadFrequently: true }),
    id = g.getImageData(0, 0, W, H),
    d = id.data;
  const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : B[(y * W + x) * 4 + 3] / 255);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!mask[p]) {
        continue;
      }
      const light = A(x + o, y + o) - A(x - o, y - o); // > 0 on edges facing the top-left
      const inner = A(x, y); // ~0.5 at the edge, 1 deep inside
      const k = 1 + light * 0.9 - (1 - inner) * 0.35;
      const i = p * 4;
      let r = d[i] * k,
        gg = d[i + 1] * k,
        bb = d[i + 2] * k;
      if (light > 0.38) {
        const s = Math.min(1, (light - 0.38) * 3.5) * 0.75;
        r += (255 - r) * s;
        gg += (255 - gg) * s;
        bb += (255 - bb) * s;
      }
      d[i] = Math.min(255, r);
      d[i + 1] = Math.min(255, gg);
      d[i + 2] = Math.min(255, bb);
    }
  }
  g.putImageData(id, 0, 0);
  const out = cvs(),
    og = out.getContext("2d");
  og.save();
  og.filter = "blur(" + Math.max(2, 5 * sc) + "px)";
  og.globalAlpha = 0.55;
  og.drawImage(m, 4 * sc, 7 * sc);
  og.restore(); // shadow
  og.drawImage(c, 0, 0);
  return out;
}
export function paletteFrom(img) {
  // colour stops from an image's pixels, darkest to lightest
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data,
    px = [];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 200) {
      px.push([0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2], d[i], d[i + 1], d[i + 2]]);
    }
  }
  if (px.length < 20) {
    return null;
  }
  px.sort((a, b) => a[0] - b[0]);
  const stops = [];
  for (let k = 0; k <= 6; k++) {
    const q = px.slice(
      Math.floor((px.length * k) / 7.0),
      Math.max(Math.floor((px.length * k) / 7.0) + 1, Math.floor((px.length * (k + 1)) / 7.0)),
    );
    const avg = [1, 2, 3].map((j) => q.reduce((n, p) => n + p[j], 0) / q.length);
    stops.push([k / 6, avg]);
  }
  return stops;
}
export function withShadow(src) {
  // soft drop shadow under an item picture (like the game's shelf pictures)
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext("2d");
  g.shadowColor = "rgba(0,0,0,.45)";
  g.shadowBlur = Math.max(3, src.width * 0.04);
  g.shadowOffsetY = Math.max(2, src.width * 0.035);
  g.drawImage(src, 0, 0);
  return c;
}
// Arsenal rewards built from the game's own accessory pictures (recoloured / combined), so they sit and shade like
// real TankTrouble items. Returns null for keys it doesn't make.
// The Dimension-Hopper: the cosmic aura from hand-made picture of it (the haze, wisps and stars around the tank
// and the pink rings on the barrel), cut out and fitted to the game's 640x384 tank-icon frame, plus a faint
// starry shimmer on the tank itself. P = the game's tank picture { turret, barrel, base, leftTread, rightTread }.
export const HOPPER_HAZE = "ttcl-art:0de2d2a8c945.webp";
const HOPPER_RINGS = "ttcl-art:1f12a89bdc70.webp";
// items cut from hand-made pictures, already fitted to the 640x384 tank-icon frame
// the whole item, uncut, for the garage shelf and the panel (on the tank it's fitted and trimmed)
export const SHELF_PICS = {
  "gx-spikes": "ttcl-art:6ddec5e67ed3.webp",
  "gx-sensor": "ttcl-art:c16bd30b2e22.webp",
  "hv-wings": "ttcl-art:159d3c6c49f8.webp",
  "gx-celestial": "ttcl-art:fae8a700e89b.webp",
};
// pattern paints cut from hand-made pictures (400x240 tiles)
export const PICTURE_PAINTS = {
  "hv-pearl": "ttcl-art:6c10b02852b3.webp",
  "hv-clouds": "ttcl-art:35a9400e1218.webp",
  "hv-starlight": "ttcl-art:79e44b9eeb18.webp",
  "hv-aurora": "ttcl-art:8b1d609096c2.webp",
  "hv-spikes": "ttcl-art:9587a140a837.webp",
  "gx-cosmicdust": "ttcl-art:cdb06a5ffe0c.webp",
  "gx-supernova": "ttcl-art:2ed2bc635e14.webp",
  // Agent box suits: cut from hand-made pictures, lighting evened out and made seamless
  "pt-blacksuit": "ttcl-art:da99ad965618.webp",
  "pt-navysuit": "ttcl-art:de6957bd9bf4.webp",
  "pt-whitetux": "ttcl-art:b5dfdd703f6b.webp",
  "pt-tuxedo": "ttcl-art:1f391de2628e.webp",
  "pt-linen": "ttcl-art:040327e17062.webp",
  "pt-sharkskin": "ttcl-art:3bee3ece0237.webp",
  "pt-tactical": "ttcl-art:57280eb881da.webp",
  "pt-greatcoat": "ttcl-art:8854a444c8e4.webp",
  "pt-tweed": "ttcl-art:26e268ce0487.webp",
  "pt-smokingjacket": "ttcl-art:d894f7b629a1.webp",
  "pt-resortshirt": "ttcl-art:068db4392907.webp",
  "pt-ghillie": "ttcl-art:c18a46ba8c81.webp",
  "pt-fieldsuit": "ttcl-art:08120a70fcf1.webp",
  "pt-pinstripe": "ttcl-art:26983be11f46.webp",
};
// v1.0 paints (Cursed Seal and Streetwear boxes), cut from wazzey's pictures
Object.assign(PICTURE_PAINTS, {
  "pt-maliceswirl": "ttcl-art:4d7dde8fc824.webp",
  "pt-sealscript": "ttcl-art:0f312f7b38a8.webp",
  "pt-endlessvoid": "ttcl-art:8c69ae414dc9.webp",
  "pt-academy": "ttcl-art:5b50c0f00180.webp",
  "pt-crimsonfault": "ttcl-art:7f7f83be98a6.webp",
  "pt-stickerbomb": "ttcl-art:ad6f5aad5797.webp",
  "pt-tiedye": "ttcl-art:dd4e1b359ee6.webp",
  "pt-puffer": "ttcl-art:3d6502e7c655.webp",
  "pt-patchdenim": "ttcl-art:74bb35a84b4b.webp",
  "pt-reflective": "ttcl-art:02a4f6f05bac.webp",
});
Object.assign(GX_PAINT, {
  "pt-maliceswirl": { name: "Malice Swirl", avg: "0x272241" },
  "pt-sealscript": { name: "Sealing Script", avg: "0xb8a498" },
  "pt-endlessvoid": { name: "Endless Void", avg: "0x0c101c" },
  "pt-academy": { name: "Academy Uniform", avg: "0x1f2230" },
  "pt-crimsonfault": { name: "Crimson Fault", avg: "0x36201f" },
  "pt-stickerbomb": { name: "Sticker Bomb", avg: "0xa29768" },
  "pt-tiedye": { name: "Tie-Dye", avg: "0x8e70ac" },
  "pt-puffer": { name: "Puffer Jacket", avg: "0x313131" },
  "pt-patchdenim": { name: "Patched Denim", avg: "0x677787" },
  "pt-reflective": { name: "Reflective Tape", avg: "0x7e6861" },
});
export const PICTURE_ITEMS = {
  "hv-wings": "ttcl-art:a69271656de1.webp", // the author's angel wings, angled out from the back of the turret
  "gx-celestial": "ttcl-art:14a2d6893e0d.webp", // the Celestial Cannon: the author's Cloud-Splitter muzzle, fitted over the barrel
  "gx-spikes": "ttcl-art:b4d58f58d693.webp", // the Ramming Spikes: a steel plate covering the front of the hull, with spikes (based on the author's design)
  "gx-sensor": "ttcl-art:c22d6e07f4ac.webp", // the Thermal Imager Sensor, standing behind the turret
};
export async function drawHopper(P) {
  const W = 640,
    H = 384,
    cv = () => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      return c;
    };
  const [haze, rings] = await Promise.all([loadImg(HOPPER_HAZE), loadImg(HOPPER_RINGS)]);
  if (!haze || !rings) {
    return null;
  }
  const mask = cv(),
    mg = mask.getContext("2d");
  for (const k of ["leftTread", "turret", "base", "rightTread", "barrel"]) {
    if (P[k]) {
      mg.drawImage(P[k], 0, 0, W, H);
    }
  }
  const out = cv(),
    g = out.getContext("2d");
  // the aura, kept off the tank itself (this item is drawn on top of the tank)
  g.drawImage(haze, 0, 0);
  g.globalCompositeOperation = "destination-out";
  g.drawImage(mask, 0, 0);
  g.globalCompositeOperation = "source-over";
  // a faint nebula and stars on the tank
  const sh = cv(),
    sg = sh.getContext("2d");
  const neb = sg.createLinearGradient(130, 120, 500, 360);
  neb.addColorStop(0, "rgba(150,80,255,.28)");
  neb.addColorStop(0.5, "rgba(70,40,170,.2)");
  neb.addColorStop(1, "rgba(190,90,255,.26)");
  sg.fillStyle = neb;
  sg.fillRect(0, 0, W, H);
  for (let k = 0; k < 90; k++) {
    const x = 120 + noiseHash(k, 1, 7) * 390,
      y = 105 + noiseHash(k, 2, 7) * 270,
      r = 0.6 + Math.pow(noiseHash(k, 3, 7), 3) * 2;
    sg.fillStyle = "rgba(255,255,255," + (0.45 + noiseHash(k, 4, 7) * 0.5) + ")";
    sg.beginPath();
    sg.arc(x, y, r, 0, 7);
    sg.fill();
  }
  sg.globalCompositeOperation = "destination-in";
  sg.drawImage(mask, 0, 0);
  g.drawImage(sh, 0, 0);
  g.drawImage(rings, 0, 0);
  return out;
}

// --- counting: Laika kills in a row ---
export const LAIKA_IDS = new Set(),
  DIMITRI_IDS = new Set();
