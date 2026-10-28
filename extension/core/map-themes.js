import { GX_PAINT, isPat, normHex, patId } from "../content/colours.js";
import {
  BULLET_COLOR,
  BULLET_STYLE,
  MAP_THEMES,
  SHIELD_COLOR,
  addRim,
  altOnFloor,
  bulletArt,
  bulletAsked,
  bulletOnFloor,
  bulletReal,
  bulletTex,
  crateGlyph,
  gameSeasonNow,
  mapBag,
  mapFrame,
  mapNoise,
  mapSheets,
  mapThemeList,
  mineRim,
  mineTex,
  missileTex,
  rimFor,
  tintNum,
  wallSym,
} from "../content/maps.js";
import { OBJ_CRATES } from "../content/maps-more.js";
import { BULLET_MOTION, FACE_TRAVEL, glFresh, mazeParts } from "../content/maze-patterns.js";
import { flatHex, toCss } from "../content/registries.js";
import { loggedInIds, lookupById } from "./game-socket.js";
import { laikaSkinChanged } from "./laika-look.js";
import { SHARED, VIEW_REAL, getOverride, shareSee } from "./look-sharing.js";
import { forgetMazeTanks, mazeFeature, mazeGame, mazePatternTick, patternSourceFor } from "./maze.js";
import { mapT, pageForMaze } from "./page.js";
import { SETTINGS } from "./storage.js";

// Aim lines and laser beams are drawn in the tank's turret colour: on a Color Lab map whose floor is close to that colour
// (Laika's black turret on Code Rain) they'd vanish, so there they're drawn lighter / darker, like the map's bullets
export let MAP_FLOOR_NOW = null,
  MAP_SHOT_STYLE = null;

// ---------- Map themes and bullet skins ----------
export let mapTheme = null,
  mapCycle = 0,
  mapGameRef = null,
  mapNext; // mapNext: the next round's map, picked as the last one ends (undefined: not picked yet)
function pickMapTheme() {
  // the theme for a new round, from the settings
  {
    const gs = gameSeasonNow();
    if (gs && SETTINGS.keepSeason && SETTINGS.keepSeason[gs]) {
      return null;
    }
  } // you'd rather have the game's own Halloween / Christmas maze
  {
    const pk = pageForMaze();
    if (pk) {
      return pk;
    }
  } // a fixed or daily page theme the maze follows too
  const mode = SETTINGS.mapMode || "game";
  if (mode === "game") {
    return null;
  }
  if (mode === "fixed") {
    return MAP_THEMES[SETTINGS.mapFixed] ? SETTINGS.mapFixed : null;
  }
  const pool = (Array.isArray(SETTINGS.mapPool) && SETTINGS.mapPool.length ? SETTINGS.mapPool : mapThemeList()).filter(
    (k) => MAP_THEMES[k],
  );
  if (!pool.length) {
    return null;
  }
  if (mode === "cycle") {
    return pool[mapCycle++ % pool.length];
  }
  // random: every map in the pool comes up once before any repeats (a shuffled deck), never the same map twice in a row
  const key = pool.join(",");
  if (mapBag.key !== key) {
    mapBag.key = key;
    mapBag.left = [];
  }
  if (!mapBag.left.length) {
    const d = pool.slice();
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    const gap = Math.min(5, Math.floor(d.length / 3)),
      recent = new Set(mapBag.recent.slice(-gap)); // a map seen in the last few rounds isn't dealt again straight after a reshuffle
    for (let t = 0; t < gap && d.length > gap * 2; t++) {
      const i = d.slice(0, gap).findIndex((k) => recent.has(k));
      if (i < 0) {
        break;
      }
      d.push(d.splice(i, 1)[0]);
    }
    mapBag.left = d;
  }
  const k = mapBag.left.shift();
  mapBag.last = k;
  mapBag.recent.push(k);
  if (mapBag.recent.length > 8) {
    mapBag.recent.shift();
  }
  return k;
}
export function mapPickNext() {
  // choose the next round's map early, so Laika's tank is dressed for it before the round starts
  const mode = SETTINGS.mapMode || "game";
  if (mode === "game" || mode === "fixed") {
    mapNext = undefined;
    return;
  }
  if (mapNext === undefined) {
    mapNext = pickMapTheme();
  }
  try {
    laikaSkinChanged();
  } catch {}
}
let STD_FLOOR = null;
function stdFloorAvg(game, base) {
  try {
    if (STD_FLOOR) {
      return STD_FLOOR;
    }
    const fr = mapFrame(game, "floor0-0"),
      src = base && (base.__ttclMapOrig || base.source);
    if (!fr || !src) {
      return null;
    }
    const c = document.createElement("canvas");
    c.width = fr.w;
    c.height = fr.h;
    const cg = c.getContext("2d", { willReadFrequently: true });
    cg.drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    const d = cg.getImageData(0, 0, fr.w, fr.h).data;
    let r = 0,
      g2 = 0,
      b = 0,
      n = 0;
    for (let i = 0; i < d.length; i += 16) {
      if (d[i + 3] < 200) {
        continue;
      }
      r += d[i];
      g2 += d[i + 1];
      b += d[i + 2];
      n++;
    }
    return n ? (STD_FLOOR = [r / n, g2 / n, b / n]) : null;
  } catch {
    return null;
  }
} // (the game's own floor: mines, aim lines and bullets are kept visible on it too)
function buildMapSheet(game, base, key) {
  const T = mapT(key),
    src = base.__ttclMapOrig || base.source;
  if (!T || !src || !src.width) {
    return null;
  }
  const shots = !!T.bullet && bulletMode() !== "normal",
    id =
      (base.uid || 0) +
      "|" +
      key +
      "|" +
      T.shade +
      "|" +
      shots +
      "|" +
      (SETTINGS.bulletPatterns !== false) +
      "|" +
      (SETTINGS.crateStyle !== "box" ? "o" : "b");
  if (mapSheets[id]) {
    return mapSheets[id];
  }
  const sheet = document.createElement("canvas");
  sheet.width = src.width;
  sheet.height = src.height;
  const sg = sheet.getContext("2d");
  sg.drawImage(src, 0, 0);
  const fd = game.cache.getFrameData("game");
  if (!fd) {
    return null;
  }
  const piece = (fr, draw) => {
    const c = document.createElement("canvas");
    c.width = fr.w;
    c.height = fr.h;
    const g = c.getContext("2d");
    draw(g, fr.w, fr.h);
    sg.clearRect(fr.x, fr.y, fr.w, fr.h);
    sg.drawImage(c, fr.x, fr.y);
  };
  const orig = (name) => mapFrame(game, name);
  let fav = null;
  const floorAvg = () => {
    if (fav) {
      return fav;
    }
    try {
      const f0 = orig("floor0-0") || { w: 100, h: 100 },
        c = document.createElement("canvas");
      c.width = f0.w;
      c.height = f0.h;
      const cg = c.getContext("2d", { willReadFrequently: true });
      T.floor(cg, 0, f0.w, f0.h, src, orig);
      const d = cg.getImageData(0, 0, f0.w, f0.h).data;
      let r = 0,
        g2 = 0,
        b = 0,
        n = 0;
      for (let i = 0; i < d.length; i += 16) {
        r += d[i];
        g2 += d[i + 1];
        b += d[i + 2];
        n++;
      }
      fav = [r / n, g2 / n, b / n];
    } catch {
      fav = [200, 200, 200];
    }
    return fav;
  }; // the floor's average colour
  const glyphs = [];
  for (let n = 0; n < 7; n++) {
    const f = orig("crate0-" + n);
    glyphs.push(f ? crateGlyph(src, f, n) : null);
  }
  for (const f of fd.getFrames()) {
    const n = f.name,
      fr = { x: f.x, y: f.y, w: f.width, h: f.height };
    if (f.rotated) {
      continue;
    }
    let m;
    if ((m = /^floor(\d+)-(\d+)$/.exec(n))) {
      if (m[1] === "0" && T.keepStandard) {
        continue;
      }
      piece(fr, (g, w, h) => T.floor(g, +m[2], w, h, src, orig));
    } else if (/^space\d+-\d+$/.test(n)) {
      piece(fr, (g, w, h) => (T.space ? T.space(g, w, h, src, orig) : null));
    } else if (/^(border|wallDecoration)\d+-\d+$/.test(n)) {
      piece(fr, () => {});
    } else if ((m = /^wall(\d+)-\d+$/.exec(n))) {
      if (m[1] === "0" && T.keepStandard) {
        continue;
      }
      piece(fr, (g, w, h) => {
        g.save();
        g.translate((w - 216) / 2, (h - 16) / 2);
        g.drawImage(wallSym(T, src, orig), 0, 0);
        g.restore();
      });
    } else if ((m = /^crate(\d+)-(\d)$/.exec(n))) {
      const k = +m[2],
        obj = SETTINGS.crateStyle !== "box" && OBJ_CRATES[key];
      if (obj) {
        piece(fr, (g) => obj(g, glyphs[k], k, T.shade === "dark"));
      } else {
        if (m[1] === "0" && T.keepStandard) {
          continue;
        }
        piece(fr, (g) => T.crate(g, glyphs[k], k, src, orig));
      }
    } else if (/^shield(Bolt\d|Spark)?$/.test(n) && SHIELD_COLOR[key]) {
      piece(fr, (g, w, h) => {
        // the shield bubble, its sparks and crackles in the map's own colour (same shape and size)
        g.drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, w, h);
        g.globalCompositeOperation = "color";
        g.fillStyle = SHIELD_COLOR[key];
        g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = "destination-in";
        g.drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, w, h);
        g.globalCompositeOperation = "source-over";
      });
    } else if (/^(bullet|doubleBarrel|shotgun|gatlingGun)$/.test(n) && shots) {
      const mk = document.createElement("canvas");
      mk.width = fr.w;
      mk.height = fr.h;
      mk.getContext("2d").drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
      piece(fr, (g, w, h) =>
        bulletArt(
          g,
          mk,
          w,
          h,
          bulletOnFloor(BULLET_COLOR[key] || T.bullet[0], floorAvg()),
          T.bullet[1],
          BULLET_STYLE[key],
          BULLET_STYLE[key] && key !== "graffiti" ? floorAvg() : null,
        ),
      );
    } else if (n === "mineShrapnel") {
      // a mine's shrapnel: the map's bullet colour (plain light shrapnel on a dark floor with plain bullets), so it shows on every map
      const fl = floorAvg(),
        dk = (0.3 * fl[0] + 0.59 * fl[1] + 0.11 * fl[2]) / 255 < 0.45,
        col = shots ? bulletOnFloor(BULLET_COLOR[key] || T.bullet[0], fl) : dk ? "#eef0f4" : null;
      if (!col) {
        continue;
      }
      const mk = document.createElement("canvas");
      mk.width = fr.w;
      mk.height = fr.h;
      mk.getContext("2d").drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
      piece(fr, (g, w, h) => bulletArt(g, mk, w, h, col, null, null, null));
    } else if (/^(bullet|doubleBarrel|shotgun|gatlingGun)$/.test(n) && !shots && bulletMode() === "normal") {
      const fl = floorAvg(),
        lum = (0.3 * fl[0] + 0.59 * fl[1] + 0.11 * fl[2]) / 255;
      if (lum >= 0.45) {
        continue;
      } // themed bullets off: plain bullets, but on a dark floor light ones (the game's black would vanish)
      const mk = document.createElement("canvas");
      mk.width = fr.w;
      mk.height = fr.h;
      mk.getContext("2d").drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
      piece(fr, (g, w, h) => bulletArt(g, mk, w, h, "#eef0f4", null, null, null));
    }
  }
  try {
    sheet.__floor = floorAvg();
  } catch {}
  sheet.__style = shots ? BULLET_STYLE[key] || null : null;
  return (mapSheets[id] = sheet);
}
export function applyMapTheme(game, key) {
  let base;
  try {
    base = game.cache.getBaseTexture("game");
  } catch {}
  if (!base) {
    return;
  }
  if (!key) {
    MAP_FLOOR_NOW = null;
    MAP_SHOT_STYLE = null;
    if (base.__ttclMapOrig) {
      base.source = base.__ttclMapOrig;
      base.__ttclMapOrig = null;
      if (base.dirty) {
        base.dirty();
      }
    }
    mapTheme = null;
    MAP_FLOOR_NOW = stdFloorAvg(game, base);
    try {
      laikaSkinChanged();
    } catch {}
    return;
  }
  if (!base.__ttclMapOrig) {
    base.__ttclMapOrig = base.source;
  }
  const sheet = buildMapSheet(game, base, key);
  if (!sheet) {
    return;
  }
  base.source = sheet;
  if (base.dirty) {
    base.dirty();
  }
  mapTheme = key;
  MAP_FLOOR_NOW = sheet.__floor || null;
  MAP_SHOT_STYLE = sheet.__style || null;
  try {
    laikaSkinChanged();
  } catch {}
}
export function mapApplyNow(shadeOnly) {
  // a map chosen mid-round shows straight away (one map; the others start with the next round)
  const game = (mapGameRef && mapGameRef.deref()) || (mazeGame && mazeGame.deref());
  if (!game || !game.state || game.state.current !== "Game") {
    return;
  }
  const mode = SETTINGS.mapMode || "game";
  mapGameRef = new WeakRef(game);
  if (!shadeOnly) {
    mapNext = undefined;
  }
  if (shadeOnly) {
    if (mapTheme) {
      applyMapTheme(game, mapTheme);
    }
    return;
  } // light / dark switched: the same map, repainted
  if (mode === "game") {
    applyMapTheme(game, null);
  } else if (mode === "fixed") {
    applyMapTheme(game, MAP_THEMES[SETTINGS.mapFixed] ? SETTINGS.mapFixed : null);
  } else if (!mapTheme) {
    applyMapTheme(game, pickMapTheme());
  }
}
function mapDecorKey(game, key, i) {
  // a theme's floor decorations as their own small pictures
  const T = mapT(key),
    k = "ttclDecor-" + key + "-" + T.shade + "-" + i;
  if (game.cache.checkImageKey(k)) {
    return k;
  }
  const c = document.createElement("canvas");
  c.width = c.height = 120;
  T.decor[i](c.getContext("2d"), 120);
  try {
    game.cache.addImage(k, null, c);
  } catch {
    return null;
  }
  return k;
}
function onMazeCreate(group, frame, x, y, first) {
  // called as the game lays out the maze
  const game = group.game;
  if (!game || !game.state || game.state.current !== "Game") {
    return;
  }
  if (first) {
    mapGameRef = new WeakRef(game);
    mapRoundShade = {};
    const k = mapNext !== undefined ? mapNext : pickMapTheme();
    mapNext = undefined;
    applyMapTheme(game, k);
  } // a new maze
  if (!mapTheme || !/^floor/.test(frame)) {
    return;
  }
  const T = mapT(mapTheme);
  if (!T || !T.decor || !T.decor.length) {
    return;
  }
  if (mapNoise(x, y, (mapCycle + 3) * 7.1 + (Date.now() % 997)) > (T.decorRate || 0.16)) {
    return;
  }
  const k = mapDecorKey(game, mapTheme, Math.floor(mapNoise(y, x, 5.3) * T.decor.length));
  if (!k) {
    return;
  }
  const off = 40,
    d = group.create(x + (mapNoise(x, y, 1.7) - 0.5) * off, y + (mapNoise(x, y, 2.9) - 0.5) * off, k);
  if (d) {
    d.anchor.setTo(0.5, 0.5);
    d.rotation = mapNoise(x, y, 4.1) * Math.PI * 2;
    d.alpha = T.decorAlpha || 0.9;
  }
}
export const bulletMode = () => SETTINGS.bulletMode || (SETTINGS.bulletSkin ? "turret" : "map"); // everyone's bullets: 'normal' (the game's), 'map' (the map theme's) or 'turret'
function ownerTurret(id) {
  const ov = getOverride(id);
  if (ov && ov.turret) {
    return ov.turret;
  }
  const r = bulletReal[id];
  if (r) {
    return r;
  }
  if (!bulletAsked.has(id)) {
    bulletAsked.add(id);
    lookupById(id)
      .then((d) => {
        const c = d && d.turretColour;
        if (c) {
          bulletReal[id] = c.type === "image" ? "p:" + c.imageValue : normHex(c.numericValue || c.rawValue);
        }
      })
      .catch(() => bulletAsked.delete(id));
  }
  return null;
}
function bulletSkin(sprite, id, frame) {
  if (!/^(bullet|doubleBarrel|shotgun|gatlingGun)$/.test(frame)) {
    return;
  }
  const p = sprite.gameController && sprite.gameController.getProjectile && sprite.gameController.getProjectile(id);
  const owner = p && p.getPlayerId ? String(p.getPlayerId()) : null;
  if (!owner) {
    return;
  }
  const mine = loggedInIds().includes(owner) && SETTINGS.myBullet; // your own bullet skin, on any map, drawn over the rest
  let v = null;
  const sb =
    !mine &&
    shareSee() &&
    SETTINGS.on &&
    !VIEW_REAL.has(owner) &&
    SHARED[owner] &&
    SHARED[owner].look &&
    SHARED[owner].look.bullet; // the bullets its owner chose (they use Color Lab too)
  if (mine) {
    v = SETTINGS.myBullet === "turret" ? ownerTurret(owner) : SETTINGS.myBullet;
    try {
      sprite.bringToTop();
    } catch {}
  } else if (sb) {
    v = sb === "turret" ? ownerTurret(owner) : sb;
  } else if (bulletMode() === "turret") {
    v = ownerTurret(owner);
  } else if (bulletMode() === "map" && mapTheme === "graffiti" && SETTINGS.bulletPatterns !== false) {
    v = "spray:" + Math.floor(Math.random() * 8);
  } // Graffiti: every shot sprayed in its own mix of colours
  if (!v) {
    return;
  }
  const game = sprite.game,
    fr = game && mapFrame(game, frame);
  if (!fr) {
    return;
  }
  const rim = rimFor(v, MAP_FLOOR_NOW),
    key = v + "|" + frame + "|" + fr.w + "|" + (rim ? rim[0] + rim[1] : "");
  let tex = bulletTex[key];
  if (!tex) {
    let base;
    try {
      base = game.cache.getBaseTexture("game");
    } catch {}
    const src = base && (base.__ttclMapOrig || base.source);
    if (!src) {
      return;
    }
    const mk = document.createElement("canvas");
    mk.width = fr.w;
    mk.height = fr.h;
    mk.getContext("2d").drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    let fill = toCss(v) || "#888",
      tile = null;
    if (isPat(v)) {
      tile = patternSourceFor(v);
      if (tile && GX_PAINT[patId(v)]) {
        const t = document.createElement("canvas");
        t.width = fr.w;
        t.height = fr.h;
        const tw = tile.width || 400,
          th = tile.height || 240;
        t.getContext("2d").drawImage(tile, tw * 0.35, th * 0.3, tw * 0.3, th * 0.4, 0, 0, fr.w, fr.h);
        fill = t;
      } else {
        tile = null;
      }
    }
    const n = parseInt((flatHex(v) || "0x888888").slice(2), 16),
      lum = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
    const c = document.createElement("canvas");
    c.width = fr.w;
    c.height = fr.h;
    bulletArt(
      c.getContext("2d"),
      mk,
      fr.w,
      fr.h,
      fill,
      lum > 0.55 ? "#111318" : "#f4f4f2",
      String(v).startsWith("spray:") ? v : undefined,
      undefined,
      rim,
    );
    tex = PIXI.Texture.fromCanvas(c);
    if (!isPat(v) || tile) {
      bulletTex[key] = tex;
    } // (a pattern still loading isn't kept)
  }
  glFresh(game, tex.baseTexture);
  const w0 = sprite.width,
    h0 = sprite.height; // the game's own bullet size on screen: kept exactly, whatever the skin's picture size
  sprite.__ttclBulletOrig = sprite.__ttclBulletOrig || sprite.texture;
  sprite.__ttclScale = sprite.__ttclScale || [sprite.scale.x, sprite.scale.y];
  PIXI.Sprite.prototype.setTexture.call(sprite, tex);
  sprite.width = w0;
  sprite.height = h0;
  sprite.__ttclBullet = true;
}
function patchProjectiles(obj) {
  // the game's bullet picture class (found the first time one is added to the game)
  const P = obj && Object.getPrototypeOf(obj);
  if (!P || P.__ttclShots || typeof P.spawn !== "function") {
    return;
  }
  const s = P.spawn.toString();
  if (!/frameName\s*=\s*\w+\s*,\s*this\.reset\(/.test(s) || !/projectileId/.test(s) || /targetId/.test(s)) {
    return;
  } // (not homing missiles: they turn to face where they fly)
  P.__ttclShots = true;
  const orig = P.spawn;
  P.spawn = function (x, y, id, frame) {
    if (this.__ttclBullet && this.__ttclBulletOrig) {
      PIXI.Sprite.prototype.setTexture.call(this, this.__ttclBulletOrig);
      if (this.__ttclScale) {
        this.scale.set(this.__ttclScale[0], this.__ttclScale[1]);
      }
      this.__ttclBullet = false;
    }
    const r = orig.apply(this, arguments);
    try {
      bulletSkin(this, id, frame);
    } catch {}
    this.rotation = 0;
    this.__ttclLast = null;
    this.__ttclAng = null;
    this.__ttclSpin = 1;
    return r;
  };
  const origUp = P.update;
  if (typeof origUp === "function") {
    P.update = function () {
      const r = origUp.apply(this, arguments);
      try {
        if (MAP_SHOT_STYLE && FACE_TRAVEL.has(MAP_SHOT_STYLE) && !this.__ttclBullet && this.exists) {
          const L = this.__ttclLast,
            x = this.x,
            y = this.y;
          if (L) {
            const dx = x - L[0],
              dy = y - L[1],
              d2 = dx * dx + dy * dy;
            if (d2 > 0.04) {
              const ang = Math.atan2(dy, dx);
              if (BULLET_MOTION === "face") {
                this.rotation = ang;
              } else {
                const A = this.__ttclAng;
                if (A != null && Math.abs(Math.atan2(Math.sin(ang - A), Math.cos(ang - A))) > 0.3) {
                  this.__ttclSpin = -(this.__ttclSpin || 1);
                } // a bounce: the spin kicks back the other way
                this.__ttclAng = ang;
              }
            }
          }
          if (BULLET_MOTION !== "face") {
            const dt = Math.min(0.1, ((this.game && this.game.time && this.game.time.elapsedMS) || 16) / 1000);
            this.rotation += (this.__ttclSpin || 1) * 2 * 2 * Math.PI * dt;
          } // spinning: 2 turns a second
          if (L) {
            L[0] = x;
            L[1] = y;
          } else {
            this.__ttclLast = [x, y];
          }
        } else if (this.rotation) {
          this.rotation = 0;
        }
      } catch {} // (the same little array reused: no garbage every frame)
      return r;
    };
  }
}
function mineSkin(sprite) {
  const id = sprite.playerId != null ? String(sprite.playerId) : null,
    ov = id && getOverride(id),
    parts = ov && mazeFeature() ? mazeParts(ov) : null,
    v = parts && parts.turret;
  if (!v) {
    return;
  }
  const src = patternSourceFor(v);
  if (!src) {
    return;
  } // (the pattern is still loading: this mine stays plain)
  const game = sprite.game,
    fr = game && mapFrame(game, "mine");
  if (!fr) {
    return;
  }
  const rimM = rimFor(v, MAP_FLOOR_NOW),
    mk0 = v + "|" + (rimM ? rimM[0] + rimM[1] : "");
  let tex = mineTex[mk0];
  if (!tex) {
    let base;
    try {
      base = game.cache.getBaseTexture("game");
    } catch {}
    const img = base && (base.__ttclMapOrig || base.source);
    if (!img) {
      return;
    }
    const c = document.createElement("canvas");
    c.width = fr.w;
    c.height = fr.h;
    const g = c.getContext("2d"),
      sw = src.width || 400,
      sh = src.height || 240;
    g.drawImage(src, sw * 0.3, sh * 0.25, sw * 0.4, sh * 0.5, 0, 0, fr.w, fr.h); // a piece of the pattern at about the turret's scale
    g.globalCompositeOperation = "multiply";
    g.drawImage(img, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h); // the game's shading
    g.globalCompositeOperation = "destination-in";
    g.drawImage(img, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h); // its exact shape
    if (rimM) {
      try {
        addRim(
          g,
          fr.w,
          fr.h,
          (c2, x, y, ww, hh) => c2.drawImage(img, fr.x, fr.y, fr.w, fr.h, x, y, ww, hh),
          rimM[0],
          rimM[1],
        );
      } catch {}
    }
    tex = mineTex[mk0] = PIXI.Texture.fromCanvas(c);
  }
  glFresh(game, tex.baseTexture);
  const w0 = sprite.width,
    h0 = sprite.height;
  sprite.__ttclMineOrig = sprite.__ttclMineOrig || sprite.texture;
  sprite.__ttclScale = sprite.__ttclScale || [sprite.scale.x, sprite.scale.y];
  PIXI.Sprite.prototype.setTexture.call(sprite, tex);
  sprite.width = w0;
  sprite.height = h0;
  sprite.__ttclMine = true;
  sprite.tint = 0xffffff;
}
function missileSkin(sprite) {
  const id = sprite.playerId != null ? String(sprite.playerId) : null,
    ov = id && getOverride(id),
    parts = ov && mazeFeature() ? mazeParts(ov) : null,
    v = parts && parts.turret;
  if (!v) {
    return;
  }
  const src = patternSourceFor(v);
  if (!src) {
    return;
  } // (the pattern is still loading: this missile stays plain)
  const game = sprite.game,
    fr = game && mapFrame(game, sprite.frameName || "homingMissile");
  if (!fr) {
    return;
  }
  const key = v + "|" + fr.w + "x" + fr.h;
  let tex = missileTex[key];
  if (!tex) {
    let base;
    try {
      base = game.cache.getBaseTexture("game");
    } catch {}
    const img = base && (base.__ttclMapOrig || base.source);
    if (!img) {
      return;
    }
    const c = document.createElement("canvas");
    c.width = fr.w;
    c.height = fr.h;
    const g = c.getContext("2d"),
      sw = src.width || 400,
      sh = src.height || 240;
    g.drawImage(src, sw * 0.35, sh * 0.2, sw * 0.3, sh * 0.6, 0, 0, fr.w, fr.h); // a piece of the pattern at about the turret's scale
    g.globalCompositeOperation = "multiply";
    g.drawImage(img, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h); // the game's shading
    g.globalCompositeOperation = "destination-in";
    g.drawImage(img, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h); // its exact shape
    tex = missileTex[key] = PIXI.Texture.fromCanvas(c);
  }
  glFresh(game, tex.baseTexture);
  sprite.__ttclMslOrig = sprite.__ttclMslOrig || sprite.texture;
  PIXI.Sprite.prototype.setTexture.call(sprite, tex);
  sprite.__ttclMsl = true;
  sprite.tint = 0xffffff;
}
function patchMissiles(obj) {
  const P = obj && Object.getPrototypeOf(obj);
  if (
    !P ||
    P.__ttclMissiles ||
    typeof P.spawn !== "function" ||
    typeof P.updateTarget !== "function" ||
    !/targetId/.test(P.spawn.toString())
  ) {
    return;
  }
  P.__ttclMissiles = true;
  const orig = P.spawn;
  P.spawn = function (...a) {
    if (this.__ttclMsl && this.__ttclMslOrig) {
      PIXI.Sprite.prototype.setTexture.call(this, this.__ttclMslOrig);
      this.__ttclMsl = false;
    } // (a reused missile starts as the game's own)
    const r = orig.apply(this, a);
    try {
      missileSkin(this);
      for (const ms of [0, 40, 150, 400]) {
        setTimeout(() => {
          try {
            if (this.__ttclMsl) {
              this.tint = 0xffffff;
            } else {
              missileSkin(this);
              if (!this.__ttclMsl) {
                missileShow(this);
              }
            }
          } catch {}
        }, ms);
      }
    } catch {} // (the game tints it once the owner's details arrive)
    return r;
  };
  if (typeof P.update === "function") {
    const ou = P.update;
    P.update = function (...a) {
      const r = ou.apply(this, a);
      try {
        if (this.visible && !this.__ttclMsl) {
          missileShow(this);
        }
      } catch {}
      return r;
    };
  }
}
function patchMines(obj) {
  const P = obj && Object.getPrototypeOf(obj);
  if (!P || P.__ttclMines || typeof P.spawn !== "function" || !/trapId/.test(P.spawn.toString())) {
    return;
  }
  P.__ttclMines = true;
  const orig = P.spawn;
  P.spawn = function (...a) {
    if (this.__ttclMine && this.__ttclMineOrig) {
      PIXI.Sprite.prototype.setTexture.call(this, this.__ttclMineOrig);
      if (this.__ttclScale) {
        this.scale.set(this.__ttclScale[0], this.__ttclScale[1]);
      }
      this.__ttclMine = false;
    }
    const r = orig.apply(this, a);
    try {
      mineSkin(this);
      for (const ms of [0, 40, 150, 400]) {
        setTimeout(() => {
          try {
            if (this.__ttclMine) {
              this.tint = 0xffffff;
            } else {
              mineSkin(this);
              if (!this.__ttclMine) {
                mineShow(this);
              }
            }
          } catch {}
        }, ms);
      }
    } catch {} // (the game tints it once the owner's details arrive)
    return r;
  };
  if (typeof P.update === "function") {
    const ou = P.update;
    P.update = function (...a) {
      const r = ou.apply(this, a);
      try {
        if (this.visible && !this.__ttclMine) {
          mineShow(this);
        }
      } catch {}
      return r;
    };
  } // (if the game sets its colour again, it's shifted again)
}
function missileShow(m) {
  // a plain homing missile in its owner's turret colour, shifted like a mine's so a black or white turret's missile can be seen
  const fl = MAP_FLOOR_NOW,
    c = tintNum(m.tint);
  if (!fl || c == null || c === m.__ttclTintOut) {
    return;
  }
  const nh = altOnFloor("#" + c.toString(16).padStart(6, "0"), fl),
    nv = parseInt(nh.slice(1), 16);
  m.tint = nv;
  m.__ttclTintOut = nv;
}
function mineShow(m) {
  // a plain mine in its owner's turret colour, made lighter on a dark map (or darker on a light one) so a black or white turret's mine can still be seen
  const fl = MAP_FLOOR_NOW,
    c = tintNum(m.tint);
  if (!fl || c == null || c === m.__ttclTintOut) {
    return;
  } // (the game sometimes gives the colour as text, '0x0d0208')
  const nh = altOnFloor("#" + c.toString(16).padStart(6, "0"), fl),
    nv = parseInt(nh.slice(1), 16);
  m.tint = nv;
  m.__ttclTintOut = nv;
  try {
    mineRim(m, rimFor("0x" + nh.slice(1), fl));
  } catch {}
}
function patchTanks(obj) {
  // a tank put in the maze gets its pattern paints straight away (not on the next check)
  const P = obj && Object.getPrototypeOf(obj);
  if (!P || P.__ttclTanks || typeof P.spawn !== "function") {
    return;
  }
  P.__ttclTanks = true;
  const orig = P.spawn;
  P.spawn = function (...a) {
    const r = orig.apply(this, a);
    try {
      forgetMazeTanks();
      mazePatternTick();
      for (const ms of [0, 40, 120]) {
        setTimeout(() => {
          forgetMazeTanks();
          mazePatternTick();
        }, ms);
      }
    } catch {}
    return r;
  }; // (again just after: the game tints the tank once its details arrive)
}
export function hookMapGroups() {
  if (!window.Phaser || !Phaser.Group || Phaser.Group.prototype.__ttclMaps) {
    return;
  }
  Phaser.Group.prototype.__ttclMaps = true;
  const oCreate = Phaser.Group.prototype.create;
  Phaser.Group.prototype.create = function (x, y, key, frame, ...rest) {
    const first = this.length === 0; // (checked before the game's tile goes in: an empty floor group = a new maze)
    const r = oCreate.call(this, x, y, key, frame, ...rest);
    if (key === "game" && typeof frame === "string" && /^(border|floor)\d/.test(frame)) {
      try {
        onMazeCreate(this, frame, x, y, first);
      } catch {}
    }
    return r;
  };
  const oAdd = Phaser.Group.prototype.add;
  Phaser.Group.prototype.add = function (child, ...rest) {
    try {
      if (child && child.gameController && child.key === "game") {
        patchProjectiles(child);
      }
      if (child && child.turret && child.leftTread) {
        patchTanks(child);
      }
      if (child && child.key === "game" && child.glow) {
        patchMines(child);
      }
      if (child && child.key === "game" && child.gameController && typeof child.updateTarget === "function") {
        patchMissiles(child);
      }
    } catch {}
    return oAdd.call(this, child, ...rest);
  };
}

// ---- more maps, each with a light and a dark version (built from a palette and a few motifs) ----
let mapRoundShade = {}; // 🎲 Mix: each round's map comes up light or dark at random (kept for the whole round)
export const mapShade = (key) => {
  const T = MAP_THEMES[key];
  if (!T) {
    return "light";
  }
  const s = SETTINGS.mapShade;
  if (s === "mix") {
    return mapRoundShade[key] || (mapRoundShade[key] = Math.random() < 0.5 ? "light" : "dark");
  }
  return s === "light" || s === "dark" ? s : T.def;
};
