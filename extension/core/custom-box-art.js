import { trophyOfPaint } from "../content/achievement-paints.js";
import { HV_HALO_COLOURS, drawHalo } from "../content/box-heaven.js";
import {
  HAT_FIT,
  HELMET_HUES,
  PIC2,
  PIC2_FIT,
  PIC2_ITEMS,
  drawHatPic,
  drawMaskPic,
  drawPic2,
  drawRaceNumber,
  drawSakuraItem,
  drawSprayCans,
  drawThemeItem,
  helmetVariant,
  itemKit,
  pic2Variant,
  restyleHazmat,
  restyleWings,
  sakuraAcc,
} from "../content/box-sakura.js";
import { drawAura, drawEyewear } from "../content/box-shadow.js";
import { ACC_BOXES, GX_ACC, GX_PAINT } from "../content/colours.js";
import {
  CUSTOM_ART,
  CUSTOM_ICONS,
  HEAVEN_BOX_PIC,
  SIDE_ART,
  UNUSED_ITEMS,
  buildGalaxyArt,
  buildPaintPatterns,
  customReq,
  drawBlackHoleBox,
  gxCans,
  gxIcons,
  paintLabel,
  paintLayout,
  recolour,
  savedReq,
  spectralPixel,
  swAsked,
} from "../content/custom-boxes.js";
import { ART_BLOBS, GARAGE_PICS } from "../content/garage-folders.js";
import { loadImg } from "../content/images.js";
import { PICTURE_ITEMS, PICTURE_PAINTS, SHELF_PICS, drawHopper } from "../content/laika.js";
import { rewardsOf, trophyByKey } from "../content/laika-trophies.js";
import { CUSTOM_ANY_LAYOUT, MAZE_TILE } from "../content/maze-patterns.js";
import { EXT_ITEM, GAME_NAMES, restyleAcc } from "../content/registries.js";
import { achPaintsOf, boxOpen, trophyUsable, usableTrophies } from "./achievements.js";
import { ASSET_MAP, getAssetMap } from "./assets.js";
import { drawnArt, origDrawImage, queuedPic, swapAsked } from "./draw-swap.js";
import { refreshSoon } from "./game-socket.js";
import { garageGame } from "./garage.js";
import {
  PIC_CACHE,
  TANK_PARTS,
  artCacheSave,
  artOf,
  artRestore,
  lazyArt,
  loadTankParts,
  picBlobGet,
  picCacheLoad,
  picCacheSave,
  wornIcon,
} from "./garage-boxes.js";
import { renderPalette } from "./palette.js";
import { PLAYER_COLOR_MAP, SETTINGS } from "./storage.js";
import { MASK_FIT, cropCanvas, sakuraBoxPic, sakuraSprites, shadowArt, themedBoxPic } from "./trophy-art.js";

export let CUSTOM_BOXES;
export const boxEnabled = (id) => !(SETTINGS.boxOff && SETTINGS.boxOff[id]); // a Color Lab box switched off in ⚙ Settings: not shown, not loaded
export const boxAvailable = (b) =>
  b.trophies ? boxOpen(b.id) || usableTrophies().some((t) => t.box === b.trophies) : boxOpen(b.id);
export const boxShown = (b) => boxAvailable(b) && boxEnabled(b.id);
const customBoxByPrefix = (key) => CUSTOM_BOXES.find((b) => b.prefix && key.startsWith(b.prefix));
export const isCustomKey = (key) => !!customBoxByPrefix(String(key)) || !!GX_ACC[key] || !!GX_PAINT[key];
export const boxOfKey = (key) => {
  const b = customBoxByPrefix(String(key));
  if (b) {
    return b.id;
  }
  if (GX_ACC[key]) {
    return GX_ACC[key].box || "galaxy";
  }
  const pb = CUSTOM_BOXES.find((x) => (x.paints || []).includes("p:" + key));
  return pb ? pb.id : null;
};
export const customUsable = (key) =>
  String(key).startsWith("pt-aw-")
    ? !!(trophyOfPaint(key) && trophyUsable(trophyOfPaint(key).key))
    : isCustomKey(key) && (boxOfKey(key) === "hall" ? trophyUsable(key) : boxOpen(boxOfKey(key)));
export const customItems = (box, slot) =>
  customItems0(box, slot).filter((it) => !UNUSED_ITEMS.has(String(it).slice(5)));
const customItems0 = (box, slot) =>
  box.trophies
    ? usableTrophies()
        .filter((t) => t.box === box.trophies)
        .flatMap((t) =>
          rewardsOf(t)
            .filter((r) => r[1] === slot)
            .map((r) => "ttcl:" + r[0]),
        )
        .concat(
          box.trophies === "galaxy" && boxOpen("galaxy")
            ? Object.keys(GX_ACC)
                .filter((k) => GX_ACC[k].slot === slot && !GX_ACC[k].box)
                .map((k) => "ttcl:" + k)
            : [],
        )
    : box.items
      ? Object.keys(GX_ACC)
          .filter((k) => GX_ACC[k].box === box.items && GX_ACC[k].slot === slot)
          .map((k) => "ttcl:" + k)
      : ((ACC_BOXES[box.from] && ACC_BOXES[box.from][slot]) || []).map((n) => "ttcl:" + box.prefix + slot + n);
export function customTitle(key) {
  if (GX_ACC[key]) {
    return GX_ACC[key].name;
  }
  const b = customBoxByPrefix(key);
  if (!b) {
    const t = trophyByKey(key);
    return t ? (t.alt === key ? t.altItem : t.item) : key;
  }
  const rest = key.slice(b.prefix.length);
  return b.name + " " + (GAME_NAMES[rest] || rest.replace(/^([a-z]+)(\d+)$/, "$1 #$2"));
}
let PAINT_ART = null;
export function getCustomArt(key) {
  if (CUSTOM_ART[key]) {
    return Promise.resolve(CUSTOM_ART[key]);
  }
  if (customReq[key]) {
    return customReq[key];
  }
  if (savedReq[key]) {
    return savedReq[key];
  }
  return (savedReq[key] = getAssetMap()
    .then(() => (PIC_CACHE ? null : picBlobGet(key)))
    .then(() => (ART_BLOBS[key] instanceof Blob ? artRestore(key) : false))
    .catch(() => false)
    .then((ok) => {
      if (ok && CUSTOM_ART[key]) {
        return CUSTOM_ART[key];
      }
      return Promise.resolve(drawCustomArt(key)).then((c) => {
        if (c) {
          if (PIC_CACHE) {
            artCacheSave(key);
          } else {
            setTimeout(
              () =>
                picCacheLoad()
                  .then(() => artCacheSave(key))
                  .catch(() => {}),
              4000,
            );
          }
        }
        return c || null;
      }); // (saved for next time once the game has finished starting)
    })
    .finally(() => {
      delete savedReq[key];
    }));
}
function drawCustomArt(key) {
  if (CUSTOM_ART[key]) {
    return Promise.resolve(CUSTOM_ART[key]);
  }
  if (customReq[key]) {
    return customReq[key];
  }
  if (PICTURE_PAINTS[key]) {
    customReq[key] = loadImg(PICTURE_PAINTS[key])
      .then((img) => {
        if (!img) {
          return null;
        }
        const c = document.createElement("canvas");
        c.width = 400;
        c.height = 240;
        c.getContext("2d").drawImage(img, 0, 0, 400, 240);
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (key.startsWith("pt-") && GX_PAINT[key]) {
    // (the game's TankTrouble font is loaded first: the sponsor decals use it)
    const fontReady = PAINT_ART
      ? Promise.resolve()
      : Promise.race([
          document.fonts && document.fonts.load
            ? document.fonts.load("bold 20px TankTrouble").catch(() => {})
            : Promise.resolve(),
          new Promise((r) => setTimeout(r, 1500)),
        ]);
    return (customReq[key] = fontReady
      .then(() => {
        if (!PAINT_ART) {
          try {
            PAINT_ART = buildPaintPatterns();
          } catch {
            PAINT_ART = {};
          }
        }
        if (PAINT_ART[key]) {
          CUSTOM_ART[key] = PAINT_ART[key];
          afterCustomArt(key);
        }
        return CUSTOM_ART[key] || null;
      })
      .finally(() => {
        delete customReq[key];
      }));
  }
  if (/^sk-a-[a-z]+\d+$/.test(key)) {
    // the game's snow items as heaps of sakura petals
    const item = key.slice(5);
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const u = map["acc640/" + item] || map["accessories/" + item];
        const [img, ic, sp] = await Promise.all([
          u ? loadImg(u) : null,
          map["accIcon/" + item] ? loadImg(map["accIcon/" + item]) : null,
          sakuraSprites(),
        ]);
        if (!img) {
          return null;
        }
        if (ic) {
          CUSTOM_ICONS[key] = sakuraAcc(ic, sp);
        }
        const c = sakuraAcc(img, sp, 640, 384);
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (/^(sh|gx|hv|hk|ho|op)-a-[a-z]+\d+$/.test(key)) {
    // a game accessory in Shadow / Cosmic / Heavenly / Hacker / Holo style
    const kind = key.slice(0, 2),
      item = key.slice(5);
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const u = map["acc640/" + item] || map["accessories/" + item];
        const [img, ic] = await Promise.all([
          u ? loadImg(u) : null,
          map["accIcon/" + item] ? loadImg(map["accIcon/" + item]) : null,
        ]);
        if (!img) {
          return null;
        }
        if (ic) {
          CUSTOM_ICONS[key] = restyleAcc(ic, kind);
        } // its shelf picture, restyled the same way
        const c = restyleAcc(img, kind, 640, 384);
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (HAT_FIT[key]) {
    customReq[key] = loadImg(HAT_FIT[key][0])
      .then((img) => {
        if (!img) {
          return null;
        }
        const c = drawHatPic(img, HAT_FIT[key]);
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (PIC2_ITEMS[key]) {
    // pictures from hand-made sheets (and the spray cans from the game's own can)
    const [pic, v] = PIC2_ITEMS[key];
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const ld = (k) => (map[k] ? loadImg(map[k]) : null);
        const [barrel, base, leftTread, rightTread, turret] = await Promise.all([
          ld("barrel"),
          ld("base"),
          ld("leftTread"),
          ld("rightTread"),
          ld("turret"),
        ]);
        let c;
        if (!pic) {
          const [can, shade] = await Promise.all([
            map.sprayCan ? loadImg(map.sprayCan) : null,
            map.sprayCanShade ? loadImg(map.sprayCanShade) : null,
          ]);
          if (!can) {
            return null;
          }
          c = drawSprayCans(can, shade, v.split("|"));
        } else {
          const ph = /^phantom/.test(pic),
            [img, extra] = await Promise.all([loadImg(PIC2[pic]), ph ? loadImg(PIC2[pic + "reg"]) : null]);
          if (!img) {
            return null;
          }
          const base0 = ph && v && v.split("|")[2] === "" ? await loadImg(PIC2[pic + "nb"]) : img;
          c = drawPic2(
            pic2Variant(pic, v, base0, extra),
            PIC2_FIT[pic],
            { barrel, base, leftTread, rightTread, turret },
            key,
          );
        }
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (/^rc-num-\d{1,3}$/.test(key)) {
    // hangs on the game's dog-tag chain
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const ld = (k) => (map[k] ? loadImg(map[k]) : null);
        const chain = (await ld("acc640/front7")) || (await ld("accessories/front7")); // the Laika Dog Tags' ball chain
        const c = drawRaceNumber(key.slice(7), { chain });
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (/^rc-helmet(up)?-/.test(key)) {
    // a race helmet (visor down, or up): on the dome, the barrel out of the chin under the visor
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const up = key.startsWith("rc-helmetup-"),
          [img, barrel, turret] = await Promise.all([
            loadImg(PIC2[up ? "helmetup" : "helmet"]),
            map.barrel ? loadImg(map.barrel) : null,
            map.turret ? loadImg(map.turret) : null,
          ]);
        if (!img) {
          return null;
        }
        const c = drawPic2(
          helmetVariant(img, HELMET_HUES[key.slice(up ? 12 : 10)]),
          PIC2_FIT[up ? "helmetup" : "helmet"],
          { barrel, turret },
          key,
        );
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (MASK_FIT[key]) {
    // the oni / kitsune cut from hand-made picture
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const [img, barrel, turret] = await Promise.all([
          loadImg(MASK_FIT[key].pic),
          map.barrel ? loadImg(map.barrel) : null,
          map.turret ? loadImg(map.turret) : null,
        ]);
        if (!img) {
          return null;
        }
        const c = drawMaskPic(img, MASK_FIT[key], { barrel, turret });
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (EXT_ITEM[key]) {
    // add-on items (achievement rewards, Shinobi, Agent): drawn by their own function, auras round the tank
    const X = EXT_ITEM[key];
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const ld = (k) => (map[k] ? loadImg(map[k]) : null),
          P = {},
          A = {};
        await Promise.all(
          ["turret", "barrel", "base", "leftTread", "rightTread"].map(async (k) => {
            P[k] = await ld(k);
          }),
        );
        await Promise.all(
          (X.uses || []).map(async (u) => {
            const v = u.startsWith("ttcl-art:")
              ? u
              : u === "trophy"
                ? map.trophy
                : u === "dimitrium"
                  ? map.dimitrium
                  : map["acc640/" + u] || map["accessories/" + u];
            A[u] = v ? await loadImg(v) : null;
          }),
        );
        if ((X.uses || []).some((u) => u.startsWith("ttcl-art:") && !A[u])) {
          return null;
        } // its picture didn't load: not drawn (or saved) empty, tried again next time
        let c;
        if (X.aura && !X.draw) {
          if (!P.base) {
            return null;
          }
          c = drawAura(X.aura, P);
        } else {
          c = document.createElement("canvas");
          c.width = 640;
          c.height = 384;
          const cg = c.getContext("2d", { willReadFrequently: true });
          X.draw(cg, itemKit(cg, P), P, A);
        } // (its shading reads the picture back while drawing)
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch((e) => {
        console.warn("[Color Lab] item", key, e);
        return null;
      })
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (
    /^(ds-(fin|anchor|ring)|cn-(cupcake|lolly|cane)|ac-(crown|shades|joystick)|sf-(hat|binos|flag)|sm-(tophat|stack|gears)|kg-(plume|banner|shield)|ww-(hat|badge|cactus)|tp-(straw|palm|surf)|mc-(radar|jet|rockets)|cs-(visor|chips|dice))$/.test(
      key,
    )
  ) {
    // Deep Sea, Sweet Shop, Arcade, Safari, Steampunk and Kingdom items
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const ld = (k) => (map[k] ? loadImg(map[k]) : null);
        const [turret, barrel] = await Promise.all([ld("turret"), ld("barrel")]);
        const c = drawThemeItem(key, { turret, barrel });
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (/^sk-(kitsune|oni|kabuto|kanzashi|lantern|kitsuneplate|oniplate)$/.test(key)) {
    // Sakura items and the masks
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const hu = map["acc640/turret79"] || map["accessories/turret79"],
          P = { barrel: map.barrel ? await loadImg(map.barrel) : null, hood: hu ? await loadImg(hu) : null };
        const c = drawSakuraItem(key.startsWith("mask-") ? key.slice(5) : key.slice(3), P);
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (/^ew-/.test(key) || key === "hk-visor") {
    // eyewear, cut round the game's own barrel
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const P = { barrel: map.barrel ? await loadImg(map.barrel) : null };
        const c = drawEyewear(key === "hk-visor" ? "hackvisor" : key.slice(3), P);
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (
    /^gx-aura-/.test(key) ||
    key === "hk-aura" ||
    key === "ho-aura" ||
    key === "sh-aura" ||
    key === "sk-aura" ||
    key === "rc-aura" ||
    key === "gf-aura" ||
    key === "ds-aura" ||
    key === "cn-aura" ||
    key === "ac-aura" ||
    key === "sf-aura" ||
    key === "sm-aura" ||
    key === "kg-aura" ||
    key === "ww-aura" ||
    key === "tp-aura" ||
    key === "mc-aura" ||
    key === "cs-aura"
  ) {
    // auras drawn round the game's own tank shape
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const P = {};
        await Promise.all(
          ["turret", "barrel", "base", "leftTread", "rightTread"].map(async (k) => {
            P[k] = map[k] ? await loadImg(map[k]) : null;
          }),
        );
        if (!P.base) {
          return null;
        }
        const c = drawAura(
          key === "rc-aura"
            ? "speed"
            : key === "gf-aura"
              ? "splat"
              : key === "ds-aura"
                ? "bubbles"
                : key === "cn-aura"
                  ? "sprinkles"
                  : key === "ac-aura"
                    ? "pixels"
                    : key === "sf-aura"
                      ? "leaves"
                      : key === "sm-aura"
                        ? "steam"
                        : key === "kg-aura"
                          ? "glint"
                          : key === "ww-aura"
                            ? "dust"
                            : key === "tp-aura"
                              ? "hibiscus"
                              : key === "mc-aura"
                                ? "electric"
                                : key === "cs-aura"
                                  ? "jackpot"
                                  : key === "hk-aura"
                                    ? "code"
                                    : key === "ho-aura"
                                      ? "prism"
                                      : key === "sh-aura"
                                        ? "shadow"
                                        : key === "sk-aura"
                                          ? "sakura"
                                          : key.slice(8),
          P,
        );
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (/^(gx|sh|ho|op)-wings$/.test(key)) {
    // the angel wings, restyled
    const kind = { sh: "shadow", gx: "cosmic", ho: "holo", op: "opal" }[key.slice(0, 2)];
    customReq[key] = Promise.all([loadImg(PICTURE_ITEMS["hv-wings"]), loadImg(SHELF_PICS["hv-wings"])])
      .then(([w, full]) => {
        if (!w) {
          return null;
        }
        const f = document.createElement("canvas");
        f.width = 640;
        f.height = 384;
        f.getContext("2d").drawImage(w, 0, 0, 640, 384);
        const c = restyleWings(f, kind);
        if (full) {
          const fc = document.createElement("canvas");
          fc.width = full.width;
          fc.height = full.height;
          fc.getContext("2d").drawImage(full, 0, 0);
          const r = restyleWings(fc, kind);
          const ic = document.createElement("canvas");
          ic.width = ic.height = 120;
          const k = Math.min(112 / r.width, 112 / r.height);
          ic.getContext("2d").drawImage(
            r,
            (120 - r.width * k) / 2,
            (120 - r.height * k) / 2,
            r.width * k,
            r.height * k,
          );
          CUSTOM_ICONS[key] = ic;
        }
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (key === "gx-hazmat" || key === "sh-hazmat") {
    // the game's hazmat hood, restyled
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const u = map["acc640/turret79"] || map["accessories/turret79"];
        const [img, ic] = await Promise.all([
          u ? loadImg(u) : null,
          map["accIcon/turret79"] ? loadImg(map["accIcon/turret79"]) : null,
        ]);
        if (!img) {
          return null;
        }
        if (ic) {
          CUSTOM_ICONS[key] = restyleHazmat(
            ic,
            key === "sh-hazmat" ? "shadow" : "cosmic",
            ic.naturalWidth || ic.width,
            ic.naturalHeight || ic.height,
          );
        }
        const c = restyleHazmat(img, key === "sh-hazmat" ? "shadow" : "cosmic");
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (key.startsWith("sh-") || key === "hv-cape") {
    // Shadow box art (and the Divine Cape, made the same way)
    customReq[key] = shadowArt()
      .then((a) => {
        const c = a && (a.frames[key] || a.patterns[key]);
        if (c) {
          CUSTOM_ART[key] = c;
          afterCustomArt(key);
        }
        return c || null;
      })
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (HV_HALO_COLOURS[key]) {
    const c = drawHalo(HV_HALO_COLOURS[key]);
    CUSTOM_ART[key] = c;
    afterCustomArt(key);
    return Promise.resolve(c);
  }
  if (PICTURE_ITEMS[key]) {
    customReq[key] = Promise.all([loadImg(PICTURE_ITEMS[key]), SHELF_PICS[key] ? loadImg(SHELF_PICS[key]) : null])
      .then(([img, full]) => {
        if (!img) {
          return null;
        }
        if (full) {
          // shelf picture: the whole item, centred in the game's 120x120 icon
          const ic = document.createElement("canvas");
          ic.width = ic.height = 120;
          const k = Math.min(112 / full.width, 112 / full.height);
          ic.getContext("2d").drawImage(
            full,
            (120 - full.width * k) / 2,
            (120 - full.height * k) / 2,
            full.width * k,
            full.height * k,
          );
          CUSTOM_ICONS[key] = ic;
        }
        const c = document.createElement("canvas");
        c.width = 640;
        c.height = 384;
        c.getContext("2d").drawImage(img, 0, 0, 640, 384);
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (key === "gx-hopper") {
    // drawn around the game's own tank picture
    customReq[key] = getAssetMap()
      .then(async (map) => {
        const P = {};
        await Promise.all(
          ["turret", "barrel", "base", "leftTread", "rightTread"].map(async (k) => {
            P[k] = map[k] ? await loadImg(map[k]) : null;
          }),
        );
        if (!P.base || !P.turret) {
          return null;
        }
        const c = await drawHopper(P);
        if (!c) {
          return null;
        }
        // shelf picture: a dark tank wearing it
        const t = document.createElement("canvas");
        t.width = 640;
        t.height = 384;
        const tg = t.getContext("2d");
        for (const k of ["leftTread", "turret", "base", "rightTread", "barrel"]) {
          tg.drawImage(P[k], 0, 0, 640, 384);
        }
        tg.globalCompositeOperation = "source-atop";
        tg.fillStyle = "rgba(40,52,120,.88)";
        tg.fillRect(0, 0, 640, 384);
        tg.globalCompositeOperation = "source-over";
        tg.drawImage(c, 0, 0);
        const crop = cropCanvas(t),
          ic = document.createElement("canvas");
        ic.width = ic.height = 120;
        const k = Math.min(116 / crop.width, 116 / crop.height);
        ic.getContext("2d").drawImage(
          crop,
          (120 - crop.width * k) / 2,
          (120 - crop.height * k) / 2,
          crop.width * k,
          crop.height * k,
        );
        CUSTOM_ICONS[key] = ic;
        CUSTOM_ART[key] = c;
        afterCustomArt(key);
        return c;
      })
      .catch(() => null)
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  if (GX_ACC[key] || GX_PAINT[key]) {
    customReq[key] = galaxyArt()
      .then((a) => {
        const c = a && (a.frames[key] || a.patterns[key === "gx-voidpaint" ? "gx-blackhole" : key]);
        if (c) {
          CUSTOM_ART[key] = c;
          afterCustomArt(key);
        }
        return c || null;
      })
      .finally(() => {
        delete customReq[key];
      });
    return customReq[key];
  }
  const box = customBoxByPrefix(key);
  if (!box) {
    return Promise.resolve(null);
  }
  customReq[key] = getAssetMap()
    .then(async (map) => {
      const item = key.slice(box.prefix.length);
      const u = map["acc640/" + item] || map["accessories/" + item];
      if (!u) {
        return null;
      }
      const [img, ic] = await Promise.all([
        loadImg(u),
        map["accIcon/" + item] ? loadImg(map["accIcon/" + item]) : null,
      ]);
      if (!img) {
        return null;
      }
      if (ic) {
        CUSTOM_ICONS[key] = recolour(ic, spectralPixel);
      } // the game's own shelf picture, recoloured
      if (item === "turret18") {
        // the ghost was nearly invisible once recoloured: a glowing spectral blue instead, a little more solid
        const ghost = recolour(img, (d, i) => {
          const l = (d[i] + d[i + 1] + d[i + 2]) / 765;
          d[i] = 60 + l * 150;
          d[i + 1] = 190 + l * 65;
          d[i + 2] = 230 + l * 25;
          d[i + 3] = Math.min(255, d[i + 3] * 1.8);
        });
        const gc = document.createElement("canvas");
        gc.width = ghost.width;
        gc.height = ghost.height;
        const gg = gc.getContext("2d");
        gg.shadowColor = "#7af0ff";
        gg.shadowBlur = 16;
        gg.drawImage(ghost, 0, 0);
        gg.shadowBlur = 0;
        gg.drawImage(ghost, 0, 0);
        CUSTOM_ART[key] = gc;
      } else {
        CUSTOM_ART[key] = recolour(img, spectralPixel);
      }
      setTimeout(() => garageArtReady(key), 0);
      // tanks already drawn without it get redrawn now the art exists (none, usually: nothing drew it yet)
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
      return CUSTOM_ART[key];
    })
    .catch(() => null)
    .finally(() => {
      delete customReq[key];
    });
  return customReq[key];
}
export function garageArtReady(key) {
  // an item or paint finished drawing while the garage is open: the garage tank that wears it is redrawn,
  // and its welding-spark points (sampled when the garage loaded, from a picture that was still empty) are taken again
  try {
    const gm = garageGame && garageGame.deref(),
      st = gm && gm.state && gm.state.states;
    if (!st) {
      return;
    }
    const mark = "ttcl=" + key + "&";
    const M = st.Main,
      icons = new Set(
        [].concat(
          Object.values((M && M.tankIconSprites) || {}),
          Object.values((M && M.currentTankIconSprites) || {}),
          M && M.selectedTankIcon ? [M.selectedTankIcon] : [],
        ),
      );
    for (const ti of icons) {
      if (!ti || typeof ti._updateIcon !== "function") {
        continue;
      }
      let wears = false;
      try {
        wears =
          JSON.stringify(ti.accessories || {}).includes(mark) ||
          Object.values(ti).some((v) =>
            typeof v === "string"
              ? v.includes(mark)
              : v && typeof v === "object" && !v.game && JSON.stringify(v).includes(mark),
          );
      } catch {}
      if (wears) {
        try {
          ti._updateIcon();
        } catch {}
      }
    }
    const T = (st.Load && st.Load.accessoryToWelderPoints) || (M && M.accessoryToWelderPoints);
    const f = artOf(key);
    if (!T || !f) {
      return;
    }
    for (const k in T) {
      if (!k.includes(mark) || (T[k] && T[k].length)) {
        continue;
      }
      const W = 320,
        H = Math.round((W * f.height) / f.width),
        c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d", { willReadFrequently: true });
      origDrawImage.call(g, f, 0, 0, W, H);
      const d = g.getImageData(0, 0, W, H).data,
        pts = T[k] || (T[k] = []);
      for (let x = 5; x < W; x += 10) {
        for (let y = 5; y < H; y += 10) {
          const sx = Math.min(W - 1, Math.max(0, Math.round(x + (Math.random() * 2 - 1) * 5))),
            sy = Math.min(H - 1, Math.max(0, Math.round(y + (Math.random() * 2 - 1) * 5)));
          if (d[(sy * W + sx) * 4 + 3] > 0) {
            pts.push({ x: sx / W - 0.5, y: sy / H - 0.5 });
          }
        }
      }
    } // (the game's own sampling: 10px cells, jittered)
  } catch {}
}
export function afterCustomArt(key) {
  if (GX_PAINT[key] && CUSTOM_ART[key] && !MAZE_TILE[key]) {
    MAZE_TILE[key] = CUSTOM_ART[key];
    CUSTOM_ANY_LAYOUT[key] = CUSTOM_ART[key] = paintLayout(CUSTOM_ART[key], key);
  }
  if (GX_PAINT[key] && typeof SIDE_ART[key] === "function" && CUSTOM_ART[key] && !CUSTOM_ART[key].__side) {
    try {
      const c = SIDE_ART[key](MAZE_TILE[key]);
      c.__side = true;
      CUSTOM_ANY_LAYOUT[key] = CUSTOM_ART[key] = c;
    } catch {}
  } // its own side view, drawn now (before anything shows it)
  else if (GX_PAINT[key] && SIDE_ART[key] && CUSTOM_ART[key] && !CUSTOM_ART[key].__side) {
    loadImg(SIDE_ART[key]).then((im) => {
      if (!im) {
        return;
      } // its own side-view picture, used as the game uses its own
      const t = MAZE_TILE[key],
        c = document.createElement("canvas");
      c.width = (t && t.width) || 640;
      c.height = (t && t.height) || 384;
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      c.__side = true;
      CUSTOM_ANY_LAYOUT[key] = CUSTOM_ART[key] = c;
      if (!drawnArt.has(key)) {
        return;
      } // only tanks already drawn with it are redrawn
      const ids = Object.keys(PLAYER_COLOR_MAP).filter((id) => {
        const e = PLAYER_COLOR_MAP[id];
        return e && [e.turret, e.base, e.treads].includes("p:" + key);
      });
      if (ids.length) {
        refreshSoon(ids);
      }
    });
  }
  if (GX_ACC[key] && !CUSTOM_ICONS[key] && !GARAGE_PICS["i:" + key]) {
    if (TANK_PARTS) {
      const w = wornIcon(key, CUSTOM_ART[key]);
      if (w) {
        CUSTOM_ICONS[key] = w;
      }
    } else {
      loadTankParts().then(() => {
        if (!CUSTOM_ICONS[key] && CUSTOM_ART[key]) {
          const w = wornIcon(key, CUSTOM_ART[key]);
          if (w) {
            CUSTOM_ICONS[key] = w;
            delete GARAGE_PICS["i:" + key];
          }
        }
      });
    }
  }
  garageArtReady(key);
  if (!swapAsked.has(key)) {
    return;
  } // nothing was drawn without it yet: no redraw needed
  swapAsked.delete(key);
  const ids = Object.keys(PLAYER_COLOR_MAP).filter((id) => {
    const e = PLAYER_COLOR_MAP[id];
    return (
      [e.turret, e.base, e.treads].includes("p:" + key) ||
      (e.acc && Object.values(e.acc).some((v) => String(v) === "ttcl:" + key))
    );
  });
  if (ids.length) {
    refreshSoon(ids);
  }
}
export function gxCanIcon(key) {
  // the paint's spray can label (saved like the garage pictures)
  if (!gxCans[key] && GARAGE_PICS["can:" + key]) {
    gxCans[key] = GARAGE_PICS["can:" + key];
  }
  if (!gxCans[key]) {
    const f = MAZE_TILE[key];
    if (!f) {
      return gxPaintIcon(key);
    }
    gxCans[key] = GARAGE_PICS["can:" + key] = paintLabel(f, 78, 183, true, key).toDataURL();
    picCacheSave();
  }
  return gxCans[key];
}
export function gxPaintIcon(key) {
  // round swatch picture for the paint menu (null until the art is made; saved like the garage pictures)
  if (!gxIcons[key] && GARAGE_PICS["sw:" + key]) {
    gxIcons[key] = GARAGE_PICS["sw:" + key];
  }
  if (!gxIcons[key]) {
    const f = MAZE_TILE[key] || CUSTOM_ART[key];
    if (!f) {
      if (!swAsked.has(key)) {
        swAsked.add(key);
        getAssetMap()
          .then(picCacheLoad)
          .then(() => (GARAGE_PICS["sw:" + key] ? 1 : queuedPic(() => getCustomArt(key))))
          .then((x) => {
            swAsked.delete(key);
            if (x) {
              try {
                renderPalette();
              } catch {}
            }
          })
          .catch(() => swAsked.delete(key));
      }
      return null;
    }
    const c = paintLabel(f, 60, 60, false);
    gxIcons[key] = GARAGE_PICS["sw:" + key] = c.toDataURL();
    picCacheSave();
  }
  return gxIcons[key];
}
export let galaxyArtReq = null,
  GALAXY_BOX = null;
export function galaxyArt() {
  if (!galaxyArtReq) {
    galaxyArtReq = getAssetMap()
      .then(async (map) => {
        const load = (name) => {
          const m = /^tankIcon\/accessories\/([a-z]+\d+)\.png@640$/.exec(name);
          const u = m && (map["acc640/" + m[1]] || map["accessories/" + m[1]]);
          return u ? loadImg(u) : Promise.resolve(null);
        };
        const art = await buildGalaxyArt(load);
        GALAXY_BOX = drawBlackHoleBox().toDataURL(); // the Galaxy 'box' is an actual black hole
        return art;
      })
      .catch(() => {
        galaxyArtReq = null;
        return null;
      });
  }
  return galaxyArtReq;
}
// Black Hacker box: the game's Hacker box turned black, its digits matrix green
let hackerBoxReq = null;
function hackerBoxPic() {
  if (hackerBoxReq) {
    return hackerBoxReq;
  }
  hackerBoxReq = getAssetMap()
    .then((map) => (map["box5"] ? loadImg(map["box5"]) : null))
    .then((img) => {
      if (!img) {
        return null;
      }
      // purple faces -> black, the box's own 0/1 digits -> glowing matrix green
      const ss = (lo, hi, x) => {
        x = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
        return x * x * (3 - 2 * x);
      };
      const c = recolour(img, (d, i) => {
        const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255,
          dark = Math.min(1, l / 0.25),
          glow = ss(0.27, 0.48, l);
        d[i] = 4 + 10 * dark + 120 * Math.pow(glow, 3);
        d[i + 1] = 6 + 22 * dark + 227 * glow;
        d[i + 2] = 4 + 10 * dark + 90 * Math.pow(glow, 2.5);
      });
      return c.toDataURL();
    })
    .catch(() => null);
  return hackerBoxReq;
}

export function customAccValue(key) {
  const box = customBoxByPrefix(key);
  // the picture the game loads before ours is drawn over it: one of the same slot (or a pattern paint)
  const carrier = GX_ACC[key]
    ? "accessories/" + GX_ACC[key].slot + "1"
    : GX_PAINT[key]
      ? "colours/colour13"
      : "accessories/" + key.slice(box.prefix.length);
  const u = ASSET_MAP && ASSET_MAP[carrier];
  if (!u) {
    getAssetMap();
    return null;
  }
  if (!CUSTOM_ART[key] && !lazyArt) {
    getCustomArt(key);
  } // (filling the garage from saved pictures: drawn only when actually used)
  return "/../../../../.." + u + "?ttcl=" + key + "&"; // the original item's picture, swapped when drawn
}

export function startCustomBoxArt() {
  // --- custom boxes ---
  CUSTOM_BOXES = [
    {
      id: "spectral",
      name: "Spectral",
      from: 3,
      prefix: "sp-",
      paints: ["0x39ff14", "0x00ffc8", "0x00b3ff", "0xff00e6", "0xb026ff", "0x5a00b5", "0x1a0033", "0xe6d6ff"],
    },
    // the Laika trophy bones live here; the box appears once you've earned one
    {
      id: "galaxy",
      name: "Galaxy",
      picFrom: 2,
      get paints() {
        return boxOpen("galaxy")
          ? Object.keys(GX_PAINT)
              .filter((k) => k.startsWith("gx-"))
              .map((k) => "p:" + k)
              .concat(achPaintsOf("galaxy"))
          : achPaintsOf("galaxy");
      },
      trophies: "galaxy",
    },
    // weapon mastery and Dimitri rewards; appears once you've earned one
    {
      id: "arsenal",
      name: "Arsenal",
      picFrom: 1,
      picFn: () => themedBoxPic("arsenal"),
      get paints() {
        return achPaintsOf("arsenal");
      },
      trophies: "arsenal",
    },
    // paint-only boxes (preview)
    {
      id: "elements",
      name: "Elements",
      picFrom: 3,
      pix: "fire",
      picFn: () => themedBoxPic("elements"),
      paints: [
        "p:pt-lava",
        "p:pt-ocean",
        "p:pt-ice",
        "p:pt-toxic",
        "p:pt-thunder",
        "0xff4500",
        "0x00a2ff",
        "0x9be7ff",
        "0x7cff00",
        "0x3a2fa0",
      ],
    },
    {
      id: "materials",
      name: "Materials",
      picFrom: 9,
      pix: "chrome",
      picFn: () => themedBoxPic("materials"),
      paints: [
        "p:pt-carbon",
        "p:pt-marble",
        "p:pt-wood",
        "p:pt-goldfoil",
        "p:pt-chrome",
        "0x1b1d22",
        "0xf3efe8",
        "0x8a5628",
        "0xd4a017",
        "0xc0c6d0",
      ],
    },
    // Heaven: the author's Celestial Heart box (its own picture) and its items
    {
      id: "heaven",
      name: "Heaven",
      pic: HEAVEN_BOX_PIC,
      items: "heaven",
      paints: [
        "p:hv-pearl",
        "p:hv-clouds",
        "p:hv-starlight",
        "p:hv-aurora",
        "p:hv-spikes",
        "0xf4f6ff",
        "0xe8d9a8",
        "0xa9d8ff",
        "0xffe58a",
        "0xc7b6ff",
      ],
    },
    // Shadow: an original shadow-army theme (black-violet smoke, glowing violet and blue)
    {
      id: "shadow",
      name: "Shadow",
      picFn: () => shadowArt().then((a) => (a && a.box ? a.box.toDataURL() : null)),
      items: "shadow",
      paints: [
        "p:sh-mist",
        "p:sh-monarch",
        "p:sh-abyss",
        "p:sh-flame",
        "0x0b0614",
        "0x2a0f4a",
        "0x6a2cff",
        "0x3fa9ff",
        "0xb388ff",
      ],
    },
    // Hacker: a black version of the game's Hacker box, with matrix-green code
    {
      id: "hacker",
      name: "Code Rain",
      picFn: hackerBoxPic,
      items: "hacker",
      paints: [
        "p:pt-coderain",
        "p:pt-binary",
        "p:pt-terminal",
        "p:pt-circuit",
        "p:pt-glitch",
        "p:pt-missingtex",
        "0x000000",
        "0x00ff41",
        "0x008f11",
        "0x003b00",
        "0x0d0208",
      ],
    },
    // Sakura: a Japanese theme (blossoms, masks, helmet, lantern)
    {
      id: "sakura",
      name: "Sakura",
      picFn: sakuraBoxPic,
      items: "sakura",
      paints: [
        "p:pt-sakura",
        "p:pt-nightsakura",
        "p:pt-seigaiha",
        "p:pt-lacquer",
        "p:pt-goldleaf",
        "0xffb7c5",
        "0xe8618c",
        "0x2b2a5c",
        "0xc0272d",
        "0xf4ecd8",
      ],
    },
    // Eyewear: goggles and glasses for the turret
    {
      id: "eyewear",
      name: "Eyewear",
      picFrom: 1,
      pix: "chrome",
      picFn: () => themedBoxPic("eyewear"),
      items: "eyewear",
      paints: [],
    },
    // Racing and Graffiti: paints for now (their items come from hand-made pictures later)
    {
      id: "racing",
      name: "Racing",
      picFn: () => themedBoxPic("racing"),
      items: "racing",
      paints: [
        "p:pt-chequered",
        "p:pt-stripes",
        "p:pt-livery",
        "p:pt-tyre",
        "p:pt-podium",
        "p:pt-sponsor-red",
        "p:pt-sponsor-blue",
        "p:pt-sponsor-black",
        "p:pt-sponsor-yellow",
        "0xd7141f",
        "0xffd400",
        "0x0b47c8",
        "0x111214",
        "0xf4f4f2",
      ],
    },
    {
      id: "graffiti",
      name: "Graffiti",
      picFn: () => themedBoxPic("graffiti"),
      items: "graffiti",
      paints: [
        "p:pt-brick",
        "p:pt-drips",
        "p:pt-splatter",
        "p:pt-tags",
        "p:pt-spraycamo",
        "0xff2d95",
        "0x22e0ff",
        "0xc6ff1a",
        "0xffd400",
        "0x9b4dff",
      ],
    },
    // Deep Sea, Sweet Shop, Arcade: paint boxes with a few items each
    {
      id: "deepsea",
      name: "Deep Sea",
      picFn: () => themedBoxPic("deepsea"),
      items: "deepsea",
      paints: [
        "p:pt-reef",
        "p:pt-scales",
        "p:pt-kelp",
        "p:pt-jelly",
        "p:pt-sand",
        "0x006d77",
        "0x83c5be",
        "0xff7f6a",
        "0x0b1d3a",
        "0xf1d08a",
      ],
    },
    {
      id: "sweets",
      name: "Sweet Shop",
      picFn: () => themedBoxPic("sweets"),
      items: "sweets",
      paints: [
        "p:pt-sprinkles",
        "p:pt-frosting",
        "p:pt-peppermint",
        "p:pt-gummy",
        "p:pt-waffle",
        "0xff8fc7",
        "0x8ee8d8",
        "0xfff1a8",
        "0x6b3a1f",
        "0xd61f3c",
      ],
    },
    {
      id: "arcade",
      name: "Arcade",
      picFn: () => themedBoxPic("arcade"),
      items: "arcade",
      paints: [
        "p:pt-pixelcamo",
        "p:pt-synthwave",
        "p:pt-scanline",
        "p:pt-neonmaze",
        "p:pt-pixelpals",
        "0xff2bd6",
        "0x00e5ff",
        "0xfff200",
        "0x2dff6e",
        "0x14102a",
      ],
    },
    {
      id: "safari",
      name: "Safari",
      picFn: () => themedBoxPic("safari"),
      items: "safari",
      paints: [
        "p:pt-leopard",
        "p:pt-zebra",
        "p:pt-tiger",
        "p:pt-giraffe",
        "p:pt-jungle",
        "0xc3b091",
        "0x556b2f",
        "0xd2a15a",
        "0x1f6b3a",
        "0xf28c28",
      ],
    },
    {
      id: "steampunk",
      name: "Steampunk",
      picFn: () => themedBoxPic("steampunk"),
      items: "steampunk",
      paints: [
        "p:pt-gears",
        "p:pt-brass",
        "p:pt-copper",
        "p:pt-blueprint",
        "p:pt-rust",
        "0xb5893a",
        "0x8c4a2f",
        "0x3b2a1e",
        "0x5f6b6b",
        "0xe8d8b0",
      ],
    },
    {
      id: "kingdom",
      name: "Kingdom",
      picFn: () => themedBoxPic("kingdom"),
      items: "kingdom",
      paints: [
        "p:pt-velvet",
        "p:pt-chainmail",
        "p:pt-castle",
        "p:pt-heraldry",
        "p:pt-tapestry",
        "0x5b1f7a",
        "0xd4af37",
        "0x8b0000",
        "0x1c3f94",
        "0xa9a9a9",
      ],
    },
    {
      id: "wildwest",
      name: "Wild West",
      picFn: () => themedBoxPic("wildwest"),
      items: "wildwest",
      paints: [
        "p:pt-wanted",
        "p:pt-saloon",
        "p:pt-denim",
        "p:pt-cowhide",
        "p:pt-canyon",
        "0xc2733a",
        "0x8b5a2b",
        "0xe3c58f",
        "0x3b5b8c",
        "0x5a2e1a",
      ],
    },
    {
      id: "tropical",
      name: "Tropical",
      picFn: () => themedBoxPic("tropical"),
      items: "tropical",
      paints: [
        "p:pt-hibiscus",
        "p:pt-pineapple",
        "p:pt-tiki",
        "p:pt-waves",
        "p:pt-tropsunset",
        "0x00b4d8",
        "0xff6f61",
        "0xffd23f",
        "0x2a9d8f",
        "0xf4e1c1",
      ],
    },
    {
      id: "mech",
      name: "Mech",
      picFn: () => themedBoxPic("mech"),
      items: "mech",
      paints: [
        "p:pt-hazard",
        "p:pt-hexarmour",
        "p:pt-plating",
        "p:pt-oilslick",
        "p:pt-plasma",
        "0x6c757d",
        "0xffc300",
        "0x00b4ff",
        "0x212529",
        "0xff4500",
      ],
    },
    {
      id: "casino",
      name: "Casino",
      picFn: () => themedBoxPic("casino"),
      items: "casino",
      paints: [
        "p:pt-felt",
        "p:pt-suits",
        "p:pt-roulette",
        "p:pt-chips",
        "p:pt-jackpot",
        "0x0b6623",
        "0xc8102e",
        "0x111111",
        "0xd4af37",
        "0xf5f0e1",
      ],
    },
    {
      id: "ninja",
      name: "Shinobi",
      picFn: () => themedBoxPic("ninja"),
      items: "ninja",
      paints: [
        "p:pt-indigo",
        "p:pt-tidescale",
        "p:pt-sumie",
        "p:pt-asanoha",
        "p:pt-shinobi",
        "0x1e2a5a",
        "0xb3242c",
        "0x16171d",
        "0xf4efe2",
        "0xd4af37",
      ],
    },
    {
      id: "agent",
      name: "Agent",
      picFn: () => themedBoxPic("agent"),
      items: "agent",
      paints: [
        "p:pt-blacksuit",
        "p:pt-pinstripe",
        "p:pt-navysuit",
        "p:pt-whitetux",
        "p:pt-tuxedo",
        "p:pt-linen",
        "p:pt-sharkskin",
        "p:pt-tactical",
        "p:pt-greatcoat",
        "p:pt-tweed",
        "p:pt-smokingjacket",
        "p:pt-resortshirt",
        "p:pt-ghillie",
        "p:pt-fieldsuit",
        "0x111111",
        "0xb3121e",
        "0x1c2f66",
        "0xf2efe8",
        "0x8a8f98",
      ],
    },
    // Cursed Seal: an original dark-sorcery theme (talismans, prayer beads, a sealed blade, a watching eye, violet flame)
    {
      id: "cursed",
      name: "Cursed Seal",
      picFn: () => themedBoxPic("cursed"),
      items: "cursed",
      paints: [
        "p:pt-maliceswirl",
        "p:pt-sealscript",
        "p:pt-endlessvoid",
        "p:pt-academy",
        "p:pt-crimsonfault",
        "0x1a0b2e",
        "0x6a2cff",
        "0xb3121e",
        "0xf2e6c8",
        "0x0c101c",
      ],
    },
    // Streetwear: headphones, beanies, sneakers, chains, a boombox and a hoodie hood
    {
      id: "streetwear",
      name: "Streetwear",
      picFn: () => themedBoxPic("streetwear"),
      items: "streetwear",
      paints: [
        "p:pt-stickerbomb",
        "p:pt-tiedye",
        "p:pt-puffer",
        "p:pt-patchdenim",
        "p:pt-reflective",
        "0xff2d95",
        "0xc6ff1a",
        "0x111111",
        "0xf4f4f2",
        "0x3a6ea5",
      ],
    },
    // achievement rewards (Achievements tab in the panel lists them all, unearned ones locked, with how to get them); the box appears once one is earned
    {
      id: "hall",
      name: "Achievements",
      picFn: () => themedBoxPic("hall"),
      get paints() {
        return achPaintsOf("hall");
      },
      trophies: "hall",
    },
    {
      id: "holo",
      name: "Holo",
      picFrom: 10,
      pix: "holo",
      picFn: () => themedBoxPic("holo"),
      items: "holo",
      paints: [
        "p:pt-holo",
        "p:pt-opal",
        "p:pt-rainbow",
        "p:pt-sunset",
        "p:pt-candy",
        "0xff9ad5",
        "0xa0e7ff",
        "0xc7a6ff",
        "0xfff59a",
        "0xff6b6b",
      ],
    },
  ];
}
