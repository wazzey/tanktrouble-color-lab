import { GX_ACC, GX_PAINT, PATTERN_AVG, isPat, normHex, patId } from "./colours.js";

// ---- add-on registries (filled in by the box, award and map modules; read lazily) ----
// EXT_ITEM[key] = { draw(g, K, P, A), uses: [game accessory names to load into A], aura: 'kind' (drawn by drawAura instead) }
// EXT_AURA[kind] = (ctx) => [rimColour, alpha] | null   (ctx: the locals of drawAura)
// EXT_PAINT_ART[key] = (g, PH) => void   (PH: the helpers of buildPaintPatterns; 400x240 tile)
// EXT_BOXPIC[kind] = { ramp: [[t,[r,g,b]],...], overlay(g, W, H, hh) }
export const EXT_ITEM = {},
  EXT_AURA = {},
  EXT_PAINT_ART = {},
  EXT_BOXPIC = {},
  EXT_UPRIGHT = [];
// Shadow / Cosmic / Heavenly versions of the game's own accessories (same picture, restyled). kind: 'sh' | 'gx' | 'hv'
// Names for the game's own items (the game has none; named from their pictures). Used in search, Swatches and the item list
export const GAME_NAMES = {
  turret1: "Viking Helmet",
  turret2: "Flame Crest",
  turret3: "Propeller Cap",
  turret4: "Birthday Cake 10",
  turret5: "Bandana",
  turret6: "Pirate Hat",
  turret7: "Mouse Ears",
  turret8: "Red Hood",
  turret9: "Silver Aviators",
  turret10: "Pink Bow",
  turret11: "Yellow Hazmat Hood",
  turret12: "Gold Aviators",
  turret13: "Gravestone",
  turret14: "Axe in the Head",
  turret15: "Melting Candle",
  turret16: "Jack-o'-Lantern",
  turret17: "Grinning Pumpkin",
  turret18: "Ghost",
  turret19: "Brain",
  turret20: "Santa Hat",
  turret21: "Snowman",
  turret22: "Reindeer Antlers",
  turret23: "Candle Wreath",
  turret24: "Red Ribbon",
  turret25: "Star Santa Hat",
  turret27: "Invisible Hat",
  turret33: "Green Eye Mask (Classic)",
  turret37: "Crash Test Sign",
  turret38: "Traffic Cone",
  turret39: "Hazard Bandana",
  turret40: "Beak & Goggles",
  turret42: "Black Eye Mask (Classic)",
  turret43: "Top Hat",
  turret44: "Gold Top Hat",
  turret45: "Rainbow Top Hat",
  turret46: "Rainbow Feathers",
  turret47: "Unicorn Horn",
  turret48: "Panda Hat",
  turret49: "Gold Eye Mask",
  turret50: "Laurel Wreath",
  turret51: "TTOC Top Hat",
  turret52: "Naval Mine",
  turret60: "Stars & Stripes Hat",
  turret65: "Roast Turkey",
  turret70: "Red Eye Mask",
  turret71: "Green Eye Mask",
  turret72: "Blue Eye Mask",
  turret73: "Yellow Eye Mask",
  turret74: "Black Eye Mask",
  turret75: "Ushanka",
  turret76: "White Eye Mask",
  turret77: "Army Helmet",
  turret78: "Birthday Cake 15",
  turret79: "Orange Hazmat Hood",
  turret100: "Fedora",
  turret101: "Tinfoil Hat",
  turret107: "Elf Hat",
  turret108: "Gift Box",
  turret109: "Candy Cane Scarf",
  turret110: "Christmas Bauble",
  turret111: "Snow Pile",
  turret112: "Gingerbread Man",
  turret113: "Holly Wreath",
  turret114: "Christmas Tree",
  turret116: "Blue Bobble Hat",
  turret120: "Easter Egg Shell",
  turret121: "Hatching Chick",
  turret150: "Crescent Dome Hat",
  turret160: "Aviator Helmet",
  turret161: "Steel Crest Helmet",
  turret162: "Tank Crew Helmet",
  turret163: "Spiked Helmet",
  turret164: "Walkie-Talkie",
  turret165: "Medic Cap",
  turret166: "Flight Goggles",
  barrel1: "Vented Muzzle",
  barrel2: "Finned Muzzle",
  barrel5: "Skull Muzzle",
  barrel6: "BANG! Flag",
  barrel7: "Four-Leaf Clover",
  barrel8: "TTOC 18 Sign",
  barrel9: "TTOC 19 Sign",
  barrel10: "TTOC 20 Sign",
  barrel11: "Shower Head",
  barrel12: "Flashlight",
  barrel13: "Worm",
  barrel14: "Black Skull",
  barrel15: "BOO! Flag",
  barrel16: "Black Cat",
  barrel17: "Pumpkin Bucket",
  barrel18: "Rope Loop",
  barrel19: "Broom",
  barrel20: "Star Stocking",
  barrel21: "Candy Cane",
  barrel22: "Red Balloon",
  barrel23: "Icicle",
  barrel24: "Red Ribbon",
  barrel25: "Christmas Wreath",
  barrel27: "Invisible",
  barrel28: "Invisible",
  barrel29: "Invisible",
  barrel30: "Invisible",
  barrel31: "Invisible",
  barrel32: "Invisible",
  barrel33: "Green Skull",
  barrel37: "Crash Test Sign",
  barrel38: "Sticking Plaster",
  barrel42: "Gold Silencer",
  barrel43: "Gold-Fin Muzzle",
  barrel44: "Gold-Eyed Skull",
  barrel45: "Silencer",
  barrel50: "Gatling Barrel",
  barrel60: "Stars & Stripes Pennant",
  barrel70: "Red Muzzle Cap",
  barrel71: "Green Muzzle Cap",
  barrel72: "Blue Muzzle Cap",
  barrel73: "Yellow Muzzle Cap",
  barrel79: "Orange Shower Head",
  barrel100: "Happy Speech Bubble",
  barrel101: "Megaphone",
  barrel102: "Reading Glasses",
  barrel107: "Snowflake Wand",
  barrel108: "Red Bauble",
  barrel109: "Drop Ornament",
  barrel110: "Red Star Ornament",
  barrel111: "Holly Garland",
  barrel116: "Party Blower",
  barrel120: "Tulip",
  barrel150: "Lantern",
  barrel160: "Field Radio",
  barrel161: "Rocket Tip",
  barrel162: "Bayonet",
  barrel163: "Steel Pipe Hook",
  barrel164: "Medic Bandage",
  turret167: "Tank Visor",
  barrel51: "TTOC 21 Sign",
  barrel52: "TTOC 22 Sign",
  barrel53: "TTOC 23 Sign",
  barrel54: "TTOC 24 Sign",
  barrel55: "TTOC 25 Sign",
  barrel56: "TTOC 26 Sign",
  barrel57: "TTOC 27 Sign",
  barrel58: "TTOC 28 Sign",
  barrel59: "TTOC 29 Sign",
  front1: "Smiley",
  front4: "Teeth",
  front5: "Skull & Crossbones",
  front6: "Gold Bone",
  front7: "Laika Dog Tags",
  front8: "Bow Tie",
  front9: "Black Bone",
  front10: "Gold Coins",
  front13: "RIP Sign",
  front14: "Vampire Fangs",
  front15: "Spider",
  front18: "Crossbones",
  front19: "Spider Web",
  front20: "Woven Heart",
  front21: "Gingerbread Man",
  front22: "Fairy Lights",
  front23: "Christmas Stocking",
  front24: "Icicles",
  front25: "Holly",
  front26: "Santa Beard",
  front27: "Invisible",
  front28: "Invisible",
  front29: "Invisible",
  front30: "Invisible",
  front33: "Striped Ring",
  front34: "Green K",
  front37: "Crash Test Sign",
  front38: "Chequered Strip",
  front39: "Warning Sign",
  front40: "B.T. Badge",
  front41: "Sticking Plaster",
  front43: "Black Gem",
  front45: "Pink Moustache",
  front46: "Purple Moustache",
  front50: "Gold Medal",
  front60: "Star Shield",
  front78: "Sushi Rolls",
  front90: "Candle Circle",
  front91: "Little Ghost",
  front101: "Red Mask Banner",
  front107: "Snow Drift",
  front108: "Fluffy Ring",
  front109: "Red Cap",
  front110: "Peppermint Candy",
  front111: "Snowflake Disc",
  front112: "Jingle Bells",
  front113: "Igloo",
  front116: "Confetti",
  front120: "Bunny Face",
  front150: "Star Tile",
  front160: "Radiation Sign",
  front161: "Biohazard Sign",
  front162: "Bandage Roll",
  front163: "Two Medals",
  front164: "Star Medal",
  front165: "Spike",
  back1: "Blue Flag",
  back2: "Red Flag",
  back3: "Green Flag",
  back4: "Red Cape",
  back5: "No Pets Flag",
  back6: "Pirate Flag",
  back7: "Yin-Yang Flag",
  back8: "Yellow Flag",
  back9: "Green Cape",
  back10: "Blue Cape",
  back11: "Yellow Cape",
  back12: "White Bat Wings",
  back13: "Rope",
  back14: "Lantern",
  back15: "Vampire Cape",
  back16: "Bat Wings",
  back17: "Balloons",
  back18: "Wooden Signpost",
  back19: "Hanging Pumpkin",
  back20: "Hanging Star",
  back21: "Chimney",
  back22: "Golden Bell",
  back23: "Paw Tag",
  back24: "Sack of Gifts",
  back25: "Merry Xmas Flag",
  back27: "Invisible",
  back28: "Invisible",
  back29: "Invisible",
  back30: "Invisible",
  back31: "Invisible",
  back32: "Skull Belt Badge",
  back33: "Kickstarter Badge",
  back34: "Backer Badge",
  back35: "I Backed Online Badge",
  back36: "Green K Flag",
  back37: "Roadworks Sign",
  back42: "Black & Gold Cape",
  back43: "Gold Cape",
  back45: "Rainbow Cloud",
  back50: "TTOC Flag",
  back52: "Map Pin",
  back60: "Stars & Stripes Balloons",
  back70: "Black Flag",
  back71: "White Flag",
  back72: "Black Cape",
  back73: "White Cape",
  back78: "Chopsticks",
  back107: "Snowy Pine",
  back108: "Paper Lantern",
  back116: "New Year Banner",
  back117: "2021 Sign",
  back118: "2022 Sign",
  back119: "2023 Sign",
  back120: "Snowdrops",
  back150: "Chomper Flag",
  back151: "Striped Scarf",
  back152: "Golden Crescent",
  back160: "Smoke Cloud",
  back201: "Flag: Albania",
  back202: "Flag: Algeria",
  back206: "Flag: Argentina",
  back207: "Flag: Armenia",
  back208: "Flag: Australia",
  back209: "Flag: Austria",
  back211: "Flag: Bahrain",
  back212: "Flag: Bangladesh",
  back214: "Flag: Belarus",
  back215: "Flag: Belgium",
  back217: "Flag: Benin",
  back219: "Flag: Bolivia",
  back220: "Flag: Bosnia and Herzegovina",
  back221: "Flag: Botswana",
  back222: "Flag: Brazil",
  back224: "Flag: Bulgaria",
  back225: "Flag: Burkina Faso",
  back228: "Flag: Cameroon",
  back229: "Flag: Canada",
  back231: "Flag: Central African Republic",
  back232: "Flag: Chad",
  back233: "Flag: Chile",
  back234: "Flag: China",
  back235: "Flag: Colombia",
  back237: "Flag: Costa Rica",
  back238: "Flag: Croatia",
  back239: "Flag: Cuba",
  back241: "Flag: Czechia",
  back243: "Flag: Denmark",
  back244: "Flag: Djibouti",
  back246: "Flag: Dominican Republic",
  back248: "Flag: Ecuador",
  back253: "Flag: Estonia",
  back256: "Flag: Finland",
  back257: "Flag: France",
  back258: "Flag: Gabon",
  back259: "Flag: Georgia",
  back260: "Flag: Germany",
  back261: "Flag: Ghana",
  back262: "Flag: Greece",
  back265: "Flag: Guinea",
  back266: "Flag: Guinea-Bissau",
  back270: "Flag: Hungary",
  back271: "Flag: Iceland",
  back272: "Flag: India",
  back273: "Flag: Indonesia",
  back276: "Flag: Ireland",
  back277: "Flag: Israel",
  back278: "Flag: Italy",
  back279: "Flag: Ivory Coast",
  back281: "Flag: Japan",
  back282: "Flag: Jordan",
  back286: "Flag: Kuwait",
  back288: "Flag: Laos",
  back289: "Flag: Latvia",
  back292: "Flag: Liberia",
  back295: "Flag: Lithuania",
  back296: "Flag: Luxembourg",
  back297: "Flag: North Macedonia",
  back298: "Flag: Madagascar",
  back300: "Flag: Malaysia",
  back302: "Flag: Mali",
  back303: "Flag: Malta",
  back306: "Flag: Mauritius",
  back307: "Flag: Mexico",
  back308: "Flag: Micronesia",
  back309: "Flag: Moldova",
  back310: "Flag: Monaco",
  back312: "Flag: Montenegro",
  back319: "Flag: Netherlands",
  back320: "Flag: New Zealand",
  back322: "Flag: Niger",
  back323: "Flag: Nigeria",
  back324: "Flag: North Korea",
  back325: "Flag: Norway",
  back327: "Flag: Pakistan",
  back328: "Flag: Palau",
  back332: "Flag: Peru",
  back333: "Flag: Philippines",
  back334: "Flag: Poland",
  back335: "Flag: Portugal",
  back337: "Flag: Republic of the Congo",
  back338: "Flag: Romania",
  back339: "Flag: Russia",
  back346: "Flag: São Tomé and Príncipe",
  back348: "Flag: Senegal",
  back349: "Flag: Serbia",
  back351: "Flag: Sierra Leone",
  back353: "Flag: Slovakia",
  back354: "Flag: Slovenia",
  back356: "Flag: Somalia",
  back358: "Flag: South Korea",
  back360: "Flag: Spain",
  back362: "Flag: Sudan",
  back363: "Flag: Suriname",
  back365: "Flag: Sweden",
  back366: "Flag: Switzerland",
  back370: "Flag: Thailand",
  back371: "Flag: Bahamas",
  back372: "Flag: Gambia",
  back373: "Flag: Togo",
  back377: "Flag: Turkey",
  back381: "Flag: Ukraine",
  back382: "Flag: United Arab Emirates",
  back383: "Flag: United Kingdom",
  back384: "Flag: United States",
  back388: "Flag: Venezuela",
  back389: "Flag: Vietnam",
  back390: "Flag: Yemen",
  back393: "Flag: Kosovo",
  back394: "Flag: Palestine",
  back395: "Flag: England",
  back396: "Flag: Northern Ireland",
  back397: "Flag: Scotland",
  back398: "Flag: Wales",
  back399: "Flag: Soviet Union",
  back400: "Flag: Greenland",
  back401: "Flag: Puerto Rico",
  back161: "Parachute",
  back162: "Rocket Pod",
};
export const RESTYLE_ITEMS = {
  turret5: "Bandana",
  turret74: "Black Bandana",
  turret43: "Top Hat",
  turret77: "Army Helmet",
  barrel5: "Skull Muzzle",
  barrel45: "Silencer",
  barrel42: "Gold Silencer",
  front5: "Skull & Crossbones",
  front18: "Crossbones",
  front4: "Teeth",
  front43: "Gem",
  front160: "Radiation Sign",
};
for (const k in RESTYLE_ITEMS) {
  if (GAME_NAMES[k]) {
    RESTYLE_ITEMS[k] = GAME_NAMES[k];
  }
} // one name per item everywhere
const RESTYLE_KINDS = {
  sh: ["Shadow", "shadow"],
  gx: ["Cosmic", undefined],
  hv: ["Heavenly", "heaven"],
  hk: ["Hacker", "hacker"],
  ho: ["Holo", "holo"],
  op: ["Opal Holo", "holo"],
};
for (const kind in RESTYLE_KINDS) {
  for (const item in RESTYLE_ITEMS) {
    GX_ACC[kind + "-a-" + item] = {
      slot: item.replace(/\d+$/, ""),
      name: RESTYLE_KINDS[kind][0] + " " + RESTYLE_ITEMS[item],
      box: RESTYLE_KINDS[kind][1],
    };
  }
}
GX_ACC["sk-a-turret111"] = { slot: "turret", name: "Sakura Petal Pile", box: "sakura" };
GX_ACC["sk-a-front107"] = { slot: "front", name: "Sakura Petal Drift", box: "sakura" }; // the game's snow, as cherry blossom
export function restyleAcc(img, kind, W, H) {
  W = W || img.naturalWidth || img.width;
  H = H || img.naturalHeight || img.height;
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
  const sx = W / 640;
  const hslRgb = (h, s2, l2) => {
    const c2 = (1 - Math.abs(2 * l2 - 1)) * s2,
      x2 = c2 * (1 - Math.abs(((h / 60) % 2) - 1)),
      m2 = l2 - c2 / 2;
    const [a, b2, e] =
      h < 60
        ? [c2, x2, 0]
        : h < 120
          ? [x2, c2, 0]
          : h < 180
            ? [0, c2, x2]
            : h < 240
              ? [0, x2, c2]
              : h < 300
                ? [x2, 0, c2]
                : [c2, 0, x2];
    return [(a + m2) * 255, (b2 + m2) * 255, (e + m2) * 255];
  };
  // Heavenly: stretch each item's own grey range so black items turn pearl too (not a dark blotch)
  let L0 = 0,
    L1 = 1;
  if (kind === "hv") {
    const ls = [];
    for (let i = 0; i < d.length; i += 16) {
      if (d[i + 3] >= 235) {
        ls.push((0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255);
      }
    }
    ls.sort((a, b) => a - b);
    if (ls.length > 20) {
      L1 = ls[Math.floor(ls.length * 0.97)];
      L0 = Math.min(ls[Math.floor(ls.length * 0.04)], L1 - 0.25);
    }
  }
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) {
      continue;
    }
    const r0 = d[i],
      g0 = d[i + 1],
      b0 = d[i + 2],
      l = (0.3 * r0 + 0.59 * g0 + 0.11 * b0) / 255,
      sat = (Math.max(r0, g0, b0) - Math.min(r0, g0, b0)) / 255,
      p = i / 4,
      x = p % W,
      y = Math.floor(p / W);
    let r, gg, b;
    if (d[i + 3] < 235 && sat < 0.12 && l < 0.4) {
      continue;
    } // keep the item's own soft drop shadow
    if (kind !== "hv" && l < 0.1) {
      const k = l * 10;
      if (kind === "ho" || kind === "op") {
        r = mix(30, 60, k);
        gg = mix(22, 46, k);
        b = mix(48, 80, k);
      } else if (kind === "hk") {
        r = 0;
        gg = mix(4, 22, k);
        b = mix(2, 8, k);
      } else if (kind === "sh") {
        r = mix(6, 14, k);
        gg = mix(3, 8, k);
        b = mix(16, 30, k);
      } else {
        r = mix(16, 30, k);
        gg = mix(8, 16, k);
        b = mix(40, 70, k);
      }
    } // outlines: the theme's darkest tone
    else if (kind === "ho" || kind === "op") {
      const op = kind === "op",
        sweep = (x + y * 0.7) / (90 * sx) + l * 1.4 + 0.35 * Math.sin(x / (23 * sx) - y / (31 * sx));
      const hue = op ? 190 + 130 * (0.5 + 0.5 * Math.sin(sweep * 2.2)) : (sweep * 120) % 360,
        sa = op ? 0.5 : 0.85,
        li = op ? 0.62 + l * 0.33 : 0.3 + l * 0.55;
      [r, gg, b] = hslRgb(hue, sa, Math.min(li, op ? 0.8 : 0.74));
      if (l > 0.97) {
        const k = (l - 0.97) * 33 * 0.45;
        r = mix(r, 255, k);
        gg = mix(gg, 255, k);
        b = mix(b, 255, k);
      }
      if (hash(Math.floor(x / Math.max(1, 2 * sx)), Math.floor(y / Math.max(1, 2 * sx)), 13) > 0.993) {
        r = gg = b = 255;
      }
    } else if (kind === "hk") {
      const t = Math.pow(l, 1.25),
        scan = Math.floor(y / Math.max(1, 2 * sx)) % 2 ? 0.82 : 1;
      r = mix(0, 150, Math.pow(t, 3)) * scan;
      gg = mix(6, 255, t) * scan;
      b = mix(2, 120, Math.pow(t, 2.5)) * scan;
    } else if (kind === "sh") {
      const t = Math.pow(l, 1.6) * 0.85;
      r = mix(8, 112, t);
      gg = mix(4, 74, t);
      b = mix(20, 214, t);
    } // dark violet
    else if (kind === "gx") {
      const n =
          0.5 + 0.25 * Math.sin(x / (14 * sx) + y / (25 * sx)) + 0.25 * Math.sin(x / (9 * sx) - y / (15 * sx) + 2),
        t = l * 0.75 + n * 0.25;
      r = mix(22, mix(110, 245, n), t);
      gg = mix(12, mix(60, 150, 1 - n), t);
      b = mix(60, 255, t);
      if (hash(Math.floor(x / Math.max(1, sx)), Math.floor(y / Math.max(1, sx)), 7) > 0.988) {
        r = gg = b = 255;
      }
    } else if (sat > 0.35) {
      const t = l;
      r = mix(140, 255, t);
      gg = mix(95, 225, t);
      b = mix(20, 120, t);
    } // colour -> gold
    else {
      const t = Math.max(0, Math.min(1, (l - L0) / (L1 - L0)));
      r = mix(118, 255, t);
      gg = mix(104, 248, t);
      b = mix(96, 232, t);
    } // the rest -> pearl
    d[i] = Math.min(255, r);
    d[i + 1] = Math.min(255, gg);
    d[i + 2] = Math.min(255, b);
  }
  g.putImageData(id, 0, 0);
  const o = document.createElement("canvas");
  o.width = W;
  o.height = H;
  const og = o.getContext("2d");
  og.save();
  og.shadowColor =
    kind === "ho"
      ? "rgba(255,140,230,.75)"
      : kind === "op"
        ? "rgba(170,220,255,.8)"
        : kind === "hk"
          ? "rgba(0,255,65,.8)"
          : kind === "sh"
            ? "rgba(140,80,255,.85)"
            : kind === "gx"
              ? "rgba(120,170,255,.85)"
              : "rgba(255,225,140,.9)";
  og.shadowBlur = 9 * sx;
  og.drawImage(c, 0, 0);
  og.restore();
  return o;
}
export function normVal(v) {
  if (v == null) {
    return null;
  }
  const gx = String(v)
    .trim()
    .toLowerCase()
    .match(/^p:((?:gx|pt|sh|hv|hk|ho|op)-[a-z-]+)$/);
  if (gx) {
    return GX_PAINT[gx[1]] ? "p:" + gx[1] : null;
  }
  const m = String(v)
    .trim()
    .toLowerCase()
    .match(/^(?:p:|pattern\s*#?)(\d+)$/);
  if (m) {
    return PATTERN_AVG[m[1]] ? "p:" + m[1] : null;
  }
  // Color Lab's own paints show by name in the box ("Nebula", "Code Rain"...), so read the name back too
  const byName = String(v).trim().toLowerCase(),
    pk = Object.keys(GX_PAINT).find((k) => GX_PAINT[k].name.toLowerCase() === byName);
  if (pk) {
    return "p:" + pk;
  }
  return normHex(v);
}
export const flatHex = (v) =>
  isPat(v) ? PATTERN_AVG[patId(v)] || (GX_PAINT[patId(v)] && GX_PAINT[patId(v)].avg) || "0x888888" : normHex(v); // solid stand-in
export const toCss = (v) => {
  const n = flatHex(v);
  return n ? "#" + n.slice(2) : null;
};
export const showVal = (v) =>
  isPat(v) ? (GX_PAINT[patId(v)] ? GX_PAINT[patId(v)].name : "pattern " + patId(v)) : v || "";

// Which colours apply to a tank right now: nothing when switched off, party colours when partying,
// otherwise its saved (and enabled) colours.
export const partyColours = {};
