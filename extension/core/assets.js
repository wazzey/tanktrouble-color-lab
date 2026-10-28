import { GX_PAINT, isPat, patId } from "../content/colours.js";
import { loadImg } from "../content/images.js";
import { isTrophyVal } from "../content/laika-trophies.js";
import { toCss } from "../content/registries.js";
import { ICON_W } from "../content/tank-icon.js";
import { getCustomArt, isCustomKey } from "./custom-box-art.js";
import { origFetch } from "./network.js";
import { getTrophyArt } from "./trophy-art.js";

// ---------- real tank icon renderer (port of the game's own drawTankIcon) ----------
export let assetMapPromise = null,
  ASSET_MAP = null;
export const forgetAssetMap = () => {
  assetMapPromise = null;
};
export function getAssetMap() {
  if (assetMapPromise) {
    return assetMapPromise;
  }
  assetMapPromise = (async () => {
    const s = [...document.scripts].find((x) => /\/build\/js\/index-[^/]+\.js/.test(x.src));
    if (!s) {
      throw new Error("game bundle not found");
    }
    // the list only changes when the game updates (new bundle address), so it's remembered between refreshes
    try {
      const c = JSON.parse(localStorage.getItem("ttcl_assetmap") || "null");
      if (c && c.src === s.src && c.map && c.map.turret && c.map.parts && c.map.laikaAtlas !== undefined) {
        ASSET_MAP = c.map;
        return c.map;
      }
    } catch {}
    const src = await origFetch(s.src).then((r) => r.text());
    const map = {};
    const re = new RegExp('"assets/images/tankIcon/([^"@]+)\\.png@' + ICON_W + '":\\{url:"([^"]+)"', "g");
    let m;
    while ((m = re.exec(src))) {
      map[m[1]] = "/" + m[2];
    }
    for (const x of src.matchAll(/"assets\/images\/colours\/colour(\d+)Icon\.png":\{url:"([^"]+)"/g)) {
      map["icon" + x[1]] = "/" + x[2];
    }
    map.parts = {};
    for (const x of src.matchAll(
      /"assets\/images\/tankIcon\/(turret|barrel|base|leftTread|rightTread)\.png@\d+":\{url:"([^"]+)"/g,
    )) {
      map.parts["/" + x[2]] = x[1];
    } // every size of each tank part
    for (const x of src.matchAll(/"assets\/images\/boxes\/box(\d+)\.png":\{url:"([^"]+)"/g)) {
      map["box" + x[1]] = "/" + x[2];
    }
    const can = src.match(/"assets\/images\/garage\/sprayCan\.png":\{url:"([^"]+)"/);
    if (can) {
      map.sprayCan = "/" + can[1];
    }
    const shade = src.match(/"assets\/images\/garage\/sprayCanShade\.png":\{url:"([^"]+)"/);
    if (shade) {
      map.sprayCanShade = "/" + shade[1];
    }
    // the gold bone (front accessory 6) and the achievements trophy: the base art for Laika trophies
    const b640 = src.match(/"assets\/images\/tankIcon\/accessories\/front6\.png@640":\{url:"([^"]+)"/);
    if (b640) {
      map.bone640 = "/" + b640[1];
    }
    const bIcon = src.match(/"assets\/images\/accessories\/front6Icon\.png":\{url:"([^"]+)"/);
    if (bIcon) {
      map.boneIcon = "/" + bIcon[1];
    }
    const mglow = src.match(/"assets\/images\/atlases\/game\/mineGlow\.png":\{url:"([^"]+)"/);
    if (mglow) {
      map.mineGlow = "/" + mglow[1];
    }
    const gem = src.match(/"assets\/images\/tankInfo\/diamond\.png":\{url:"([^"]+)"/);
    if (gem) {
      map.dimitrium = "/" + gem[1];
    } // the game's Dimitrium crystal
    const tro = src.match(/"assets\/images\/achievements\/trophy\.png":\{url:"([^"]+)"/);
    if (tro) {
      map.trophy = "/" + tro[1];
    }
    const dogA = src.match(/"assets\/images\/spine\/laika\.atlas":\{url:"([^"]+)"/);
    map.laikaAtlas = dogA ? "/" + dogA[1] : ""; // Laika's dog (experimental repaint)
    for (const x of src.matchAll(/"assets\/images\/accessories\/([a-z]+\d+)Icon\.png":\{url:"([^"]+)"/g)) {
      map["accIcon/" + x[1]] = "/" + x[2];
    }
    for (const x of src.matchAll(/"assets\/images\/tankIcon\/accessories\/([a-z]+\d+)\.png@640":\{url:"([^"]+)"/g)) {
      map["acc640/" + x[1]] = "/" + x[2];
    }
    if (!map.turret) {
      throw new Error("tank art not found");
    }
    ASSET_MAP = map;
    try {
      localStorage.setItem("ttcl_assetmap", JSON.stringify({ src: s.src, map }));
    } catch {}
    return map;
  })();
  assetMapPromise.catch(() => {
    assetMapPromise = null;
  });
  return assetMapPromise;
}
export async function resolvePaint(map, colour) {
  // colour: "0xrrggbb" string, or a game colour object {type, numericValue, imageValue}
  if (!colour) {
    return "#8a8a8a";
  }
  if (typeof colour === "string") {
    if (isPat(colour) && GX_PAINT[patId(colour)]) {
      return (await getCustomArt(patId(colour))) || toCss(colour);
    } // Color Lab's own pattern paints
    if (isPat(colour)) {
      const u = map["colours/colour" + patId(colour)];
      return (u && (await loadImg(u))) || toCss(colour);
    }
    return toCss(colour) || "#8a8a8a";
  }
  if (colour.type === "numeric") {
    return toCss(colour.numericValue) || "#8a8a8a";
  }
  const mk = /[?&]ttcl=([\w-]+)/.exec(String(colour.imageValue || ""));
  if (mk && GX_PAINT[mk[1]]) {
    return (await getCustomArt(mk[1])) || toCss(colour.numericValue) || "#8a8a8a";
  }
  const u = map["colours/colour" + colour.imageValue];
  return (u && (await loadImg(u))) || "#8a8a8a";
}
export async function loadAccessories(map, d) {
  const acc = {};
  if (!d) {
    return acc;
  }
  const want = {
    turret: d.turretAccessory,
    barrel: d.barrelAccessory,
    front: d.frontAccessory,
    back: d.backAccessory,
  };
  await Promise.all(
    Object.entries(want).map(async ([k, v]) => {
      if (v == null || v === "0" || v === 0) {
        return;
      }
      if (isTrophyVal(String(v))) {
        const key = String(v).slice(5);
        if (isCustomKey(key)) {
          const f = await getCustomArt(key);
          if (f) {
            acc[k] = f;
          }
          return;
        }
        const a = await getTrophyArt([key]),
          t = a && a[key];
        if (t) {
          acc[k] = t.frame;
        }
        return;
      }
      const u = map["accessories/" + k + v];
      if (u) {
        acc[k] = await loadImg(u);
      }
    }),
  );
  return acc;
}
