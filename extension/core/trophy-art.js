import {
  KIT_PIC,
  ONI_PIC,
  SAKURA_SPRITES,
  SAM_PIC,
  boxEmblem,
  drawArsenalItem2,
  lockedVersion,
  mysteryBadges,
  themedReq,
} from "../content/box-sakura.js";
import { buildShadowArt } from "../content/box-shadow.js";
import { GX_ACC } from "../content/colours.js";
import { drawArsenalItem, recolour } from "../content/custom-boxes.js";
import { loadImg } from "../content/images.js";
import {
  HOPPER_HAZE,
  boneDepth,
  hexChannels,
  isRewardKey,
  lerp,
  noiseHash,
  paletteFrom,
  sampleRamp,
  trophyKeyReq,
  withShadow,
} from "../content/laika.js";
import { BONE_KEYS } from "../content/laika-trophies.js";
import { EXT_BOXPIC } from "../content/registries.js";
import { sakuraFlower, sakuraPetal } from "../content/sakura-shapes.js";
import { ASSET_MAP, getAssetMap } from "./assets.js";
import { garageArtReady, getCustomArt } from "./custom-box-art.js";
import { swapAsked } from "./draw-swap.js";
import { refreshSoon } from "./game-socket.js";
import { PLAYER_COLOR_MAP, SETTINGS } from "./storage.js";

// --- the art: made from the game's own gold bone, recoloured ---
// Only the rewards actually needed are drawn (a reward on a tank, in a box you open, or in an achievements list),
// one at a time, so refreshing the page doesn't stall while every reward is painted.
export let TROPHY_ART = null,
  trophyBaseReq = null,
  BONE_CARRIER = null,
  TROPHY_SRC = null;
export const noteBoneCarrier = () => {
  if (!BONE_CARRIER && ASSET_MAP) {
    BONE_CARRIER = ASSET_MAP["accessories/front6"] || null;
  }
};
function trophyBase() {
  // the game pictures the rewards are made from (loaded once)
  if (TROPHY_SRC) {
    return Promise.resolve(TROPHY_SRC);
  }
  if (trophyBaseReq) {
    return trophyBaseReq;
  }
  trophyBaseReq = getAssetMap()
    .then(async (map) => {
      if (map["accessories/front6"]) {
        BONE_CARRIER = map["accessories/front6"];
      }
      const [frame, icon, trophy] = await Promise.all([
        loadImg(map.bone640 || map["accessories/front6"]),
        loadImg(map.boneIcon),
        loadImg(map.trophy),
      ]);
      if (!frame || !icon) {
        return null;
      }
      const tacheUrl = map["acc640/front45"] || map["accessories/front45"];
      const [tache, gem] = await Promise.all([
        tacheUrl ? loadImg(tacheUrl) : null,
        map.dimitrium ? loadImg(map.dimitrium) : null,
      ]);
      if (gem) {
        DIMITRIUM_RAMP = paletteFrom(gem);
      } // the Dimitrium crystal's own colours
      // the game pictures the new Arsenal rewards are built from
      const gameArt = {};
      await Promise.all(
        ["barrel50", "barrel71", "back162", "barrel108", "front38"].map(async (k) => {
          const u2 = map["acc640/" + k] || map["accessories/" + k];
          gameArt[k] = u2 ? await loadImg(u2) : null;
        }),
      );
      gameArt.mineGlow = map.mineGlow ? await loadImg(map.mineGlow) : null;
      TROPHY_ART = TROPHY_ART || {};
      TROPHY_ART.mystery = mysteryBadges(trophy);
      return (TROPHY_SRC = { frame, icon, tache, gameArt });
    })
    .catch(() => null)
    .finally(() => {
      trophyBaseReq = null;
    });
  return trophyBaseReq;
}
export function trophyKeyArt(key) {
  // draws one reward (after a short pause so the page keeps running)
  if (TROPHY_ART && TROPHY_ART[key]) {
    return Promise.resolve(TROPHY_ART[key]);
  }
  if (!isRewardKey(key)) {
    return Promise.resolve(null);
  }
  if (trophyKeyReq[key]) {
    return trophyKeyReq[key];
  }
  trophyKeyReq[key] = trophyBase()
    .then(async (src) => {
      if (!src) {
        return null;
      }
      await new Promise((r) => setTimeout(r, 0));
      if (TROPHY_ART[key]) {
        return TROPHY_ART[key];
      }
      let f, ic;
      if (BONE_KEYS.has(key)) {
        f = paintBone(src.frame, key, 640, 384);
        ic = paintBone(src.icon, key, 120, 120);
      } else if (GX_ACC[key]) {
        f = await getCustomArt(key);
        if (!f) {
          return null;
        }
        ic = badgeFrom(f);
      } // Hall of Fame rewards: drawn like any Color Lab item
      else {
        f = drawArsenalItem2(key, src.gameArt) || drawArsenalItem(key, { tache: src.tache });
        ic = badgeFrom(f);
      }
      TROPHY_ART[key] = {
        frame: f,
        icon: withShadow(ic).toDataURL(),
        locked: lockedVersion(ic).toDataURL(),
        thumb: cropCanvas(f).toDataURL(),
      };
      setTimeout(() => garageArtReady(key), 0);
      // tanks wearing it that were drawn before it was ready get redrawn
      if (swapAsked.has(key)) {
        swapAsked.delete(key);
        const ids = Object.keys(PLAYER_COLOR_MAP).filter((id) => {
          const e = PLAYER_COLOR_MAP[id];
          return e.acc && Object.values(e.acc).some((v) => String(v) === "ttcl:" + key);
        });
        if (ids.length) {
          refreshSoon(ids);
        }
      }
      return TROPHY_ART[key];
    })
    .catch(() => null)
    .finally(() => {
      delete trophyKeyReq[key];
    });
  return trophyKeyReq[key];
}
// getTrophyArt(): the shared pictures (and the gold bone address); getTrophyArt([keys]): those rewards too
export function getTrophyArt(keys) {
  return trophyBase().then(async (src) => {
    if (!src) {
      return null;
    }
    for (const k of keys || []) {
      await trophyKeyArt(k);
    }
    return TROPHY_ART;
  });
}
function paintBone(img, key, W, H) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (W === H) {
    const k = 0.84;
    g.drawImage(img, (W * (1 - k)) / 2, (H * (1 - k)) / 2, W * k, H * k);
  } // badge: leave room for the glow
  else {
    g.drawImage(img, 0, 0, W, H);
  }
  const id = g.getImageData(0, 0, W, H),
    d = id.data;
  // the bone itself vs its grey drop shadow / black outline (left as they are)
  const isBone = (i) => {
    const mx = Math.max(d[i], d[i + 1], d[i + 2]),
      mn = Math.min(d[i], d[i + 1], d[i + 2]);
    return d[i + 3] > 8 && mx > 40 && (mx - mn) / mx > 0.3;
  };
  // bone's bounds and brightness range
  let x0 = W,
    y0 = H,
    x1 = 0,
    y1 = 0,
    lmax = 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (isBone(i)) {
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
        lmax = Math.max(lmax, 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]);
      }
    }
  }
  const bw = Math.max(1, x1 - x0),
    bh = Math.max(1, y1 - y0),
    sc = (bw / 126) * (W === H ? 0.6 : 1); // 126 px = bone width at 640
  const metal = [
    [0, hexChannels("#050608")],
    [0.35, hexChannels("#1b1f29")],
    [0.6, hexChannels("#3d4555")],
    [0.82, hexChannels("#8d97ab")],
    [0.94, hexChannels("#dfe6f2")],
    [1, hexChannels("#ffffff")],
  ];
  const sheen = [
    [0, hexChannels("#ff2d55")],
    [0.5, hexChannels("#8a2cff")],
    [1, hexChannels("#00c8ff")],
  ];
  const neb = [
    [0, hexChannels("#05020f")],
    [0.3, hexChannels("#220a4d")],
    [0.52, hexChannels("#6a1fb0")],
    [0.72, hexChannels("#d43c9c")],
    [0.88, hexChannels("#53c8f5")],
    [1, hexChannels("#e9fbff")],
  ];
  const nova = [
    [0, hexChannels("#ffffff")],
    [0.25, hexChannels("#fff4b8")],
    [0.5, hexChannels("#ffb703")],
    [0.75, hexChannels("#fb5607")],
    [1, hexChannels("#d4006a")],
  ];
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2,
    boneMask = new Uint8Array(W * H);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * W + x) * 4;
      if (!isBone(i)) {
        continue;
      }
      boneMask[y * W + x] = 1;
      const L = Math.min(1, (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / lmax);
      const u = (x - x0) / bw,
        v = (y - y0) / bh;
      let r, gg, b;
      if (key === "dimitrium") {
        // dark brushed metal with a red-violet-blue sheen across it
        const brush = (noiseHash(0, Math.floor(y / Math.max(1, sc)), 7) - 0.5) * 0.04;
        [r, gg, b] = sampleRamp(metal, L * 1.05 + brush);
        const s = sampleRamp(sheen, u * 0.8 + v * 0.2),
          w = Math.sin(Math.PI * Math.min(1, L * 1.1)) * 0.22;
        r = lerp(r, s[0], w);
        gg = lerp(gg, s[1], w);
        b = lerp(b, s[2], w);
      } else if (key === "dimitri-bone") {
        // Dimitrium: the colours of the game's own Dimitrium crystal, mapped dark-to-light onto the bone
        [r, gg, b] = sampleRamp(
          DIMITRIUM_RAMP || [
            [0, hexChannels("#03200a")],
            [0.35, hexChannels("#0b7a1c")],
            [0.6, hexChannels("#1fd23c")],
            [0.8, hexChannels("#7dff8a")],
            [1, hexChannels("#eaffea")],
          ],
          L,
        );
        // crystal facets: a few sharp light/dark bands
        const facet =
          Math.sin((u * 3.2 + v * 1.4) * Math.PI) > 0.55
            ? 1.12
            : Math.sin((u * 2.1 - v * 2.6) * Math.PI) > 0.7
              ? 0.86
              : 1;
        r = Math.min(255, r * facet);
        gg = Math.min(255, gg * facet);
        b = Math.min(255, b * facet);
      } else if (key === "galaxy") {
        // a nebula inside the bone, shaded like the original, with stars
        const n =
          0.5 +
          0.22 * Math.sin(u * 9.1 + v * 3.3) +
          0.18 * Math.sin(u * 3.7 - v * 7.9 + 1.3) +
          0.12 * Math.sin((u + v) * 15.7 + 2.1);
        [r, gg, b] = sampleRamp(neb, n * (0.35 + 0.85 * L));
        const st = noiseHash(Math.floor(x / Math.max(1, sc)), Math.floor(y / Math.max(1, sc)), 3);
        if (L > 0.25 && st > 0.985) {
          const k = (st - 0.985) / 0.015;
          r = lerp(r, 255, k);
          gg = lerp(gg, 255, k);
          b = lerp(b, 255, k);
        }
      } else {
        // white-hot core fading out to orange and magenta at the edges
        const dist = Math.min(1, Math.hypot((x - cx) / (bw / 2), (y - cy) / (bh / 2)) * 0.85);
        [r, gg, b] = sampleRamp(nova, dist * 0.8 + (1 - L) * 0.45);
        const glint = Math.pow(L, 6) * 0.6;
        r = lerp(r, 255, glint);
        gg = lerp(gg, 255, glint);
        b = lerp(b, 255, glint);
      }
      d[i] = r;
      d[i + 1] = gg;
      d[i + 2] = b;
    }
  }
  g.putImageData(id, 0, 0);
  if (key === "dimitri-bone") {
    return boneDepth(c, boneMask, W, H, sc);
  }
  if (key === "galaxy" || key === "supernova") {
    // glow around the bone
    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const o = out.getContext("2d");
    const glow = (col, blur, alpha) => {
      const t = document.createElement("canvas");
      t.width = W;
      t.height = H;
      const tg = t.getContext("2d");
      tg.drawImage(c, 0, 0);
      tg.globalCompositeOperation = "source-in";
      tg.fillStyle = col;
      tg.fillRect(0, 0, W, H);
      o.save();
      o.globalAlpha = alpha;
      o.filter = `blur(${blur}px)`;
      o.drawImage(t, 0, 0);
      o.restore();
    };
    if (key === "galaxy") {
      glow("#9b5cff", 6 * sc, 0.8);
    } else {
      glow("#ff2d7a", 12 * sc, 0.75);
      glow("#ffb703", 6 * sc, 0.9);
    }
    o.drawImage(c, 0, 0);
    if (key === "supernova") {
      // little four-point sparkles around it
      const sp = (sx, sy, r) => {
        o.save();
        o.translate(sx, sy);
        o.fillStyle = "#fffbe6";
        o.shadowColor = "#ffd166";
        o.shadowBlur = r;
        o.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4,
            rr = k % 2 ? r * 0.25 : r;
          o.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        o.closePath();
        o.fill();
        o.restore();
      };
      sp(x0 - 4 * sc, y0 + 6 * sc, 7 * sc);
      sp(x1 + 2 * sc, y0 - 2 * sc, 5 * sc);
      sp(x1 - 10 * sc, y1 + 5 * sc, 6 * sc);
      sp(cx - 20 * sc, y1 + 4 * sc, 4 * sc);
    }
    return out;
  }
  return c;
}
let DIMITRIUM_RAMP = null;

// ---------- Sakura box (Japanese theme) and the masks ----------
let sakuraSpriteImgs = null;
export const sakuraSprites = () => sakuraSpriteImgs || (sakuraSpriteImgs = Promise.all(SAKURA_SPRITES.map(loadImg)));
// your own race number (Settings): an extra item in the Racing box
export function registerRaceNumber() {
  const n = SETTINGS.raceNo;
  if (n == null || n === "" || GX_ACC["rc-num-" + n]) {
    return;
  }
  GX_ACC["rc-num-" + n] = { slot: "front", name: "Race Number " + n, box: "racing" };
}
export const MASK_FIT = {
  "sk-oniplate": { pic: ONI_PIC, base: 108, s: 2.0, D: 16, cx: 71, my: 103, lx: 52, rx: 92 },
  "sk-kabuto": { pic: SAM_PIC, base: 130, s: 1.47, D: 22, cx: 90, my: 131, lx: 78, rx: 102 },
  "sk-kitsuneplate": { pic: KIT_PIC, base: 100, s: 1.55, D: 22, cx: 62, my: 120, lx: 42, rx: 84 },
};
export function themedBoxPic(kind) {
  if (themedReq[kind]) {
    return themedReq[kind];
  }
  return (themedReq[kind] = getAssetMap()
    .then((map) => (map["box1"] ? loadImg(map["box1"]) : null))
    .then(async (img) => {
      if (!img) {
        return null;
      }
      const ramp =
        kind === "racing"
          ? [
              [0, [20, 4, 6]],
              [0.35, [150, 10, 18]],
              [0.65, [225, 30, 38]],
              [0.88, [255, 170, 160]],
              [1, [255, 255, 255]],
            ]
          : kind === "deepsea"
            ? [
                [0, [2, 14, 30]],
                [0.35, [6, 60, 90]],
                [0.65, [20, 130, 150]],
                [0.88, [120, 220, 220]],
                [1, [240, 255, 255]],
              ]
            : kind === "sweets"
              ? [
                  [0, [70, 20, 40]],
                  [0.35, [200, 70, 130]],
                  [0.65, [255, 150, 200]],
                  [0.88, [255, 220, 236]],
                  [1, [255, 255, 255]],
                ]
              : kind === "arcade"
                ? [
                    [0, [10, 4, 26]],
                    [0.35, [60, 14, 110]],
                    [0.65, [150, 30, 200]],
                    [0.88, [255, 120, 240]],
                    [1, [255, 255, 255]],
                  ]
                : kind === "safari"
                  ? [
                      [0, [40, 26, 10]],
                      [0.35, [130, 90, 40]],
                      [0.65, [205, 160, 90]],
                      [0.88, [240, 214, 160]],
                      [1, [255, 250, 235]],
                    ]
                  : kind === "steampunk"
                    ? [
                        [0, [30, 18, 8]],
                        [0.35, [110, 64, 24]],
                        [0.65, [190, 130, 50]],
                        [0.88, [240, 200, 120]],
                        [1, [255, 245, 220]],
                      ]
                    : kind === "kingdom"
                      ? [
                          [0, [24, 6, 34]],
                          [0.35, [80, 24, 110]],
                          [0.65, [140, 60, 170]],
                          [0.88, [220, 180, 90]],
                          [1, [255, 245, 200]],
                        ]
                      : kind === "wildwest"
                        ? [
                            [0, [40, 18, 6]],
                            [0.35, [120, 66, 30]],
                            [0.65, [190, 120, 60]],
                            [0.88, [230, 196, 140]],
                            [1, [255, 245, 225]],
                          ]
                        : kind === "tropical"
                          ? [
                              [0, [4, 40, 40]],
                              [0.35, [10, 120, 110]],
                              [0.65, [40, 190, 170]],
                              [0.88, [255, 210, 120]],
                              [1, [255, 250, 230]],
                            ]
                          : kind === "mech"
                            ? [
                                [0, [14, 16, 20]],
                                [0.35, [60, 66, 74]],
                                [0.65, [120, 130, 140]],
                                [0.88, [200, 206, 214]],
                                [1, [255, 255, 255]],
                              ]
                            : kind === "casino"
                              ? [
                                  [0, [6, 30, 16]],
                                  [0.35, [12, 90, 50]],
                                  [0.65, [30, 140, 80]],
                                  [0.88, [220, 180, 70]],
                                  [1, [255, 245, 200]],
                                ]
                              : EXT_BOXPIC[kind]
                                ? EXT_BOXPIC[kind].ramp
                                : [
                                    [0, [16, 14, 24]],
                                    [0.35, [40, 36, 60]],
                                    [0.65, [70, 64, 96]],
                                    [0.88, [150, 140, 180]],
                                    [1, [255, 255, 255]],
                                  ];
      const c = recolour(img, (d, i) => {
        const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
        let k = 1;
        while (k < ramp.length - 1 && l > ramp[k][0]) {
          k++;
        }
        const [p0, c0] = ramp[k - 1],
          [p1, c1] = ramp[k],
          t = Math.max(0, Math.min(1, (l - p0) / (p1 - p0)));
        d[i] = c0[0] + (c1[0] - c0[0]) * t;
        d[i + 1] = c0[1] + (c1[1] - c0[1]) * t;
        d[i + 2] = c0[2] + (c1[2] - c0[2]) * t;
      });
      const g = c.getContext("2d"),
        W = c.width,
        H = c.height;
      g.globalCompositeOperation = "source-atop";
      const hh = (x, y, s) => {
        let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
        h = ((h ^ (h >>> 13)) * 1274126177) | 0;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
      };
      if (kind === "deepsea") {
        for (let k = 0; k < 26; k++) {
          const x = hh(k, 1, 71) * W,
            y = hh(k, 2, 71) * H,
            r = 2 + (hh(k, 3, 71) * H) / 22;
          g.strokeStyle = "rgba(220,255,255,.85)";
          g.lineWidth = Math.max(1, r / 4);
          g.beginPath();
          g.arc(x, y, r, 0, 7);
          g.stroke();
          g.fillStyle = "rgba(255,255,255,.7)";
          g.beginPath();
          g.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, 7);
          g.fill();
        }
      } // bubbles
      else if (kind === "sweets") {
        const cols = ["#ff4fa0", "#37d6ff", "#ffe14d", "#7cff6b", "#ffffff", "#b46bff"];
        for (let k = 0; k < 70; k++) {
          g.save();
          g.translate(hh(k, 1, 72) * W, hh(k, 2, 72) * H);
          g.rotate(hh(k, 3, 72) * 6.3);
          g.fillStyle = cols[k % cols.length];
          g.beginPath();
          g.roundRect(-H / 50, -H / 160, H / 25, H / 80, H / 160);
          g.fill();
          g.restore();
        }
      } // sprinkles
      else if (kind === "arcade") {
        const q = Math.max(3, H / 40),
          cols = ["#ff2bd6", "#00e5ff", "#fff200", "#39ff14"];
        for (let k = 0; k < 60; k++) {
          g.fillStyle = cols[k % 4];
          g.globalAlpha = 0.9;
          g.fillRect(Math.floor((hh(k, 1, 73) * W) / q) * q, Math.floor((hh(k, 2, 73) * H) / q) * q, q, q);
        }
        g.globalAlpha = 1;
      } // pixels
      else if (kind === "safari") {
        for (let k = 0; k < 30; k++) {
          g.fillStyle = "rgba(40,24,8,.75)";
          g.beginPath();
          const x = hh(k, 1, 74) * W,
            y = hh(k, 2, 74) * H,
            r = H / 40 + (hh(k, 3, 74) * H) / 30;
          g.ellipse(x, y, r, r * 0.75, hh(k, 4, 74) * 3, 0, 7);
          g.fill();
          g.fillStyle = "rgba(200,140,60,.8)";
          g.beginPath();
          g.ellipse(x, y, r * 0.5, r * 0.35, 0, 0, 7);
          g.fill();
        }
      } // leopard spots
      else if (kind === "steampunk") {
        g.strokeStyle = "rgba(60,34,10,.8)";
        g.lineWidth = Math.max(2, H / 70);
        for (let k = 0; k < 5; k++) {
          const x = hh(k, 1, 75) * W,
            y = hh(k, 2, 75) * H,
            r = H / 12 + (hh(k, 3, 75) * H) / 10;
          g.beginPath();
          g.arc(x, y, r, 0, 7);
          g.stroke();
          for (let j = 0; j < 10; j++) {
            const a = (j / 10) * 6.28;
            g.beginPath();
            g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
            g.lineTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25);
            g.stroke();
          }
        }
      } // gears
      else if (kind === "kingdom") {
        g.fillStyle = "rgba(255,215,90,.85)";
        for (let k = 0; k < 18; k++) {
          const x = hh(k, 1, 76) * W,
            y = hh(k, 2, 76) * H,
            r = H / 50 + (hh(k, 3, 76) * H) / 40;
          g.beginPath();
          g.moveTo(x, y - r * 2);
          g.lineTo(x + r, y);
          g.lineTo(x, y + r * 2);
          g.lineTo(x - r, y);
          g.closePath();
          g.fill();
        }
      } // gold diamonds
      else if (kind === "wildwest") {
        g.fillStyle = "rgba(255,215,90,.9)";
        for (let k = 0; k < 8; k++) {
          const x = hh(k, 1, 77) * W,
            y = hh(k, 2, 77) * H,
            r = H / 16;
          g.beginPath();
          for (let j = 0; j < 10; j++) {
            const a = (j / 10) * 6.283 - 1.571,
              rr = j % 2 ? r * 0.45 : r;
            g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
          }
          g.closePath();
          g.fill();
        }
      } // sheriff stars
      else if (kind === "tropical") {
        const cols = ["#ff4f6a", "#ff8fb0", "#ffd23f"];
        for (let k = 0; k < 10; k++) {
          const x = hh(k, 1, 78) * W,
            y = hh(k, 2, 78) * H,
            r = H / 22;
          g.fillStyle = cols[k % 3];
          for (let j = 0; j < 5; j++) {
            const a = (j / 5) * 6.283;
            g.beginPath();
            g.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, r, r * 0.6, a, 0, 7);
            g.fill();
          }
          g.fillStyle = "#ffe14d";
          g.beginPath();
          g.arc(x, y, r * 0.35, 0, 7);
          g.fill();
        }
      } // hibiscus
      else if (kind === "mech") {
        const q = H / 14;
        for (let x = -H; x < W + H; x += q * 2) {
          g.fillStyle = "rgba(255,195,0,.85)";
          g.beginPath();
          g.moveTo(x, H * 0.42);
          g.lineTo(x + q, H * 0.42);
          g.lineTo(x + q * 1.6, H * 0.56);
          g.lineTo(x + q * 0.6, H * 0.56);
          g.closePath();
          g.fill();
        }
      } // hazard band
      else if (kind === "casino") {
        g.textAlign = "center";
        g.textBaseline = "middle";
        const S = ["\u2660", "\u2665", "\u2666", "\u2663"];
        for (let k = 0; k < 14; k++) {
          g.font = "bold " + Math.round(H / 7 + (hh(k, 3, 79) * H) / 10) + "px Georgia, serif";
          g.fillStyle = k % 4 === 1 || k % 4 === 2 ? "rgba(200,16,46,.9)" : "rgba(10,10,10,.85)";
          g.fillText(S[k % 4], hh(k, 1, 79) * W, hh(k, 2, 79) * H);
        }
      } else if (EXT_BOXPIC[kind]) {
        EXT_BOXPIC[kind].overlay(g, W, H, hh);
      } else if (kind === "racing") {
        const q = H / 14;
        for (let r = 0; r < 2; r++) {
          for (let x = 0; x < W; x += q) {
            g.fillStyle = (((x / q) | 0) + r) % 2 ? "rgba(17,18,20,.9)" : "rgba(244,244,242,.9)";
            g.fillRect(x, H * 0.44 + r * q, q, q);
          }
        }
      } else {
        const cols = ["#ff2d95", "#22e0ff", "#c6ff1a", "#ffd400"];
        for (let k = 0; k < 12; k++) {
          g.fillStyle = cols[k % 4];
          g.globalAlpha = 0.85;
          const x = hh(k, 1, 61) * W,
            y = hh(k, 2, 61) * H,
            r = 3 + (hh(k, 3, 61) * H) / 9;
          g.beginPath();
          g.arc(x, y, r, 0, 7);
          g.fill();
          for (let j = 0; j < 6; j++) {
            const a = hh(j, k, 62) * 6.3,
              d = r * (1.2 + hh(j, k, 63));
            g.beginPath();
            g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.18, 0, 7);
            g.fill();
          }
        }
        g.globalAlpha = 1;
      }
      try {
        await boxEmblem(g, W, kind);
      } catch {}
      return c.toDataURL();
    })
    .catch(() => null));
}
// Sakura box picture: the Standard box in blossom pinks with petals across it
let sakuraBoxReq = null;
export function sakuraBoxPic() {
  if (sakuraBoxReq) {
    return sakuraBoxReq;
  }
  sakuraBoxReq = getAssetMap()
    .then((map) => (map["box1"] ? loadImg(map["box1"]) : null))
    .then((img) => {
      if (!img) {
        return null;
      }
      const ramp = [
        [0, [74, 16, 48]],
        [0.35, [184, 50, 104]],
        [0.65, [255, 154, 181]],
        [0.88, [255, 214, 226]],
        [1, [255, 255, 255]],
      ];
      const c = recolour(img, (d, i) => {
        const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
        let k = 1;
        while (k < ramp.length - 1 && l > ramp[k][0]) {
          k++;
        }
        const [p0, c0] = ramp[k - 1],
          [p1, c1] = ramp[k],
          t = Math.max(0, Math.min(1, (l - p0) / (p1 - p0)));
        d[i] = c0[0] + (c1[0] - c0[0]) * t;
        d[i + 1] = c0[1] + (c1[1] - c0[1]) * t;
        d[i + 2] = c0[2] + (c1[2] - c0[2]) * t;
      });
      const g = c.getContext("2d");
      g.globalCompositeOperation = "source-atop";
      const hh = (x, y, s) => {
        let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
        h = ((h ^ (h >>> 13)) * 1274126177) | 0;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
      };
      for (let k = 0; k < 40; k++) {
        sakuraPetal(
          g,
          hh(k, 1, 91) * c.width,
          hh(k, 2, 91) * c.height,
          5 + hh(k, 3, 91) * 5,
          hh(k, 4, 91) * 6.3,
          k % 3 ? "rgba(255,240,245,.85)" : "rgba(255,170,200,.9)",
        );
      }
      for (let k = 0; k < 6; k++) {
        sakuraFlower(g, hh(k, 5, 92) * c.width, hh(k, 6, 92) * c.height, 9 + hh(k, 7, 92) * 5, k, "#fff0f5");
      }
      return c.toDataURL();
    })
    .catch(() => null);
  return sakuraBoxReq;
}
let shadowArtReq = null;
export function shadowArt() {
  // the Shadow box's art, made once from the game's own pictures
  if (!shadowArtReq) {
    shadowArtReq = getAssetMap()
      .then(async (map) => {
        const L = (u) => (u ? loadImg(u) : Promise.resolve(null)),
          acc = (k) => map["acc640/" + k] || map["accessories/" + k];
        const [box1, back15, back42, haze] = await Promise.all([
          L(map.box1),
          L(acc("back15")),
          L(acc("back42")),
          L(HOPPER_HAZE),
        ]);
        const tank = {};
        await Promise.all(
          ["turret", "barrel", "base", "leftTread", "rightTread"].map(async (k) => {
            tank[k] = await L(map[k]);
          }),
        );
        return buildShadowArt({ box1, back15, back42, tank, haze });
      })
      .catch(() => {
        shadowArtReq = null;
        return null;
      });
  }
  return shadowArtReq;
}
function badgeFrom(frame) {
  // a 120x120 achievement picture from an item drawn in a tank-icon frame
  const crop = cropCanvas(frame),
    c = document.createElement("canvas");
  c.width = c.height = 120;
  const k = Math.min(104 / crop.width, 104 / crop.height),
    w = crop.width * k,
    h = crop.height * k;
  c.getContext("2d").drawImage(crop, (120 - w) / 2, (120 - h) / 2, w, h);
  return c;
}
// pixels of any canvas or image, read through one shared scratch canvas made for reading (no browser warnings)
let scratchRead = null;
export function readPixels(src) {
  const w = src.width,
    h = src.height;
  if (!scratchRead) {
    scratchRead = document.createElement("canvas");
  }
  if (scratchRead.width !== w || scratchRead.height !== h) {
    scratchRead.width = w;
    scratchRead.height = h;
  }
  const g = scratchRead.getContext("2d", { willReadFrequently: true });
  g.clearRect(0, 0, w, h);
  g.drawImage(src, 0, 0);
  return g.getImageData(0, 0, w, h).data;
}
export function cropCanvas(src) {
  const d = readPixels(src);
  let x0 = src.width,
    y0 = src.height,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (d[(y * src.width + x) * 4 + 3] > 20) {
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
    }
  }
  const o = document.createElement("canvas");
  if (x1 < 0) {
    o.width = o.height = 1;
    return o;
  }
  o.width = x1 - x0 + 1;
  o.height = y1 - y0 + 1;
  o.getContext("2d").drawImage(src, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}
