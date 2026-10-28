import { GX_PAINT, isPat, patId } from "../content/colours.js";
import { CUSTOM_ART, SIDE_DESIGN, treadPrint } from "../content/custom-boxes.js";
import { imgCache, loadImg } from "../content/images.js";
import { isLaika } from "../content/laika.js";
import { MAP_THEMES, addRim, altOnFloor, bulletArt, mapFrame, rimFor } from "../content/maps.js";
import {
  MAZE_GROUPS,
  MAZE_TILE,
  aimHooked,
  glFresh,
  mazeParts,
  mazeSet,
  mazeSheets,
  realAsked,
  realCols,
  tintOf,
} from "../content/maze-patterns.js";
import { ASSET_MAP, getAssetMap } from "./assets.js";
import { getCustomArt } from "./custom-box-art.js";
import { lookupById } from "./game-socket.js";
import { getOverride } from "./look-sharing.js";
import { MAP_FLOOR_NOW, mapNext } from "./map-themes.js";
import { SETTINGS } from "./storage.js";

// ---------- Pattern in-maze ----------
// In a match every tank part is a picture from the game's picture sheet ("game" atlas), tinted one colour. For a
// tank whose look has pattern paints (with "Pattern in-maze" on for that part), its parts are pointed at a copy of
// that sheet where the base, the tread and all 17 turret pictures (weapons, firing) carry the pattern, with the
// game's own shading over it. The game keeps animating as normal; only the picture sheet differs. One copy per look.
export let mazeTimer = null,
  mazeGame = null,
  mazeTanks = null,
  mazeTickN = 0;
export const forgetMazeTanks = () => {
  mazeTanks = null;
};
export const mazeFeature = () => SETTINGS.mazePatterns !== false;
export function startMazePatterns(game) {
  // also keeps colours live: changes made in the panel show on tanks mid-round
  mazeGame = new WeakRef(game);
  if (!mazeTimer) {
    mazeTimer = setInterval(mazePatternTick, 200);
  }
}
export function patternSourceFor(v) {
  // a canvas/image for a pattern paint value, or null (starts loading if needed)
  if (!isPat(v)) {
    return null;
  }
  const id = patId(v);
  if (GX_PAINT[id]) {
    if (CUSTOM_ART[id]) {
      return MAZE_TILE[id] || CUSTOM_ART[id];
    }
    getCustomArt(id);
    return null;
  }
  const u = ASSET_MAP && ASSET_MAP["colours/colour" + id];
  if (!u) {
    getAssetMap();
    return null;
  }
  const c = imgCache[u];
  if (c && c.__done) {
    return c.__done;
  }
  if (!c) {
    loadImg(u).then((im) => {
      imgCache[u].__done = im;
    });
  }
  return null;
}
function mazeSheetFor(game, sprite, parts) {
  const baseTex = sprite.__ttclOrigBase || sprite.texture.baseTexture,
    key = (baseTex.uid || 0) + "|" + parts.turret + "|" + parts.base + "|" + parts.treads;
  if (mazeSheets[key]) {
    glFresh(game, mazeSheets[key]);
    return mazeSheets[key];
  }
  const srcs = {};
  for (const part in parts) {
    if (parts[part]) {
      srcs[part] = patternSourceFor(parts[part]);
      if (!srcs[part]) {
        return null;
      }
    }
  } // pattern art still loading
  const img = baseTex.source;
  if (!img || !img.width) {
    return null;
  }
  const fd = game.cache.getFrameData(sprite.key);
  if (!fd) {
    return null;
  }
  const sheet = document.createElement("canvas");
  sheet.width = img.width;
  sheet.height = img.height;
  const sg = sheet.getContext("2d");
  sg.drawImage(img, 0, 0);
  for (const f of fd.getFrames()) {
    const part = Object.keys(MAZE_GROUPS).find((p) => srcs[p] && MAZE_GROUPS[p](f.name));
    if (!part || f.rotated) {
      continue;
    }
    const src = srcs[part],
      sw = src.width || 400,
      sh = src.height || 240;
    const tc = document.createElement("canvas");
    tc.width = f.width;
    tc.height = f.height;
    const tg = tc.getContext("2d");
    // same pattern scale on every part: the base (68 wide) shows the whole pattern, smaller parts a piece of it.
    // Paints drawn for the side view (sponsor liveries) are turned so they run along the tank like on its pictures.
    const pk = patId(parts[part]);
    if (SIDE_DESIGN[pk]) {
      tg.save();
      tg.setTransform(0, -f.height / sw, f.width / sh, 0, 0, f.height); // its left (back) at the bottom, top (top of the hull) on the left
      if (part === "treads") {
        const tp = treadPrint(pk);
        if (tp) {
          tg.drawImage(tp, 0, 0, tp.width, tp.height, 0, 0, sw, sh);
        } else {
          tg.drawImage(src, 0, sh * 0.82, sw, sh * 0.18, 0, 0, sw, sh);
        }
      } else {
        tg.drawImage(src, 0, 0, sw, sh, 0, 0, sw, sh);
      }
      tg.restore();
    } else {
      tg.drawImage(
        src,
        0,
        0,
        Math.min(sw, (f.width * sw) / 68),
        Math.min(sh, (f.height * sh) / 84),
        0,
        0,
        f.width,
        f.height,
      );
    }
    tg.globalCompositeOperation = "multiply";
    tg.drawImage(img, f.x, f.y, f.width, f.height, 0, 0, f.width, f.height); // the game's shading
    tg.globalCompositeOperation = "destination-in";
    tg.drawImage(img, f.x, f.y, f.width, f.height, 0, 0, f.width, f.height);
    sg.clearRect(f.x, f.y, f.width, f.height);
    sg.drawImage(tc, f.x, f.y);
  }
  return (mazeSheets[key] = PIXI.BaseTexture.fromCanvas(sheet));
}
function mazeColours(t, id, ov) {
  const sprites = { base: [t], turret: [t.turret], treads: [t.leftTread, t.rightTread] };
  let want = null;
  if (ov && (ov.turret || ov.base || ov.treads)) {
    want = {};
    for (const p in sprites) {
      want[p] = ov[p] ? tintOf(ov[p]) : null;
    }
    t.__ttclLive = true;
  } else if (t.__ttclLive) {
    // look switched off: back to the real colours
    const r = realCols[id];
    if (!r) {
      if (!realAsked.has(id)) {
        realAsked.add(id);
        lookupById(id)
          .then((d) => {
            realCols[id] = { base: d.baseColour, turret: d.turretColour, treads: d.treadColour };
          })
          .catch(() => {})
          .finally(() => realAsked.delete(id));
      }
      return;
    }
    want = {};
    for (const p in sprites) {
      const c = r[p];
      want[p] = c ? parseInt(String(c.numericValue || c.rawValue).replace(/^#/, "0x"), 16) : null;
    }
    t.__ttclLive = false;
  }
  if (!want) {
    return;
  }
  for (const p in sprites) {
    const n = want[p];
    if (n == null || isNaN(n)) {
      continue;
    }
    for (const sp of sprites[p]) {
      if (!sp || sp.__ttclOrigBase) {
        continue;
      }
      if (Number(sp.tint) !== n) {
        sp.tint = n;
      }
    }
  } // patterned parts carry their own colour
}
function aimAdapt(o) {
  try {
    const c = o.colour;
    if (c === o.__ttclOut) {
      return;
    }
    const isStr = typeof c === "string";
    const n = isStr ? (/^0x[0-9a-f]{6}$/i.test(c) ? parseInt(c.slice(2), 16) : NaN) : c;
    if (typeof n !== "number" || Number.isNaN(n)) {
      return;
    } // (the game gives some tanks' beams their colour as text like '0x0d0208', others as a number)
    o.__ttclIn = c;
    const fl = MAP_FLOOR_NOW,
      nh = fl ? altOnFloor("#" + n.toString(16).padStart(6, "0"), fl) : null,
      nv = nh ? parseInt(nh.slice(1), 16) : n,
      out = isStr ? "0x" + nv.toString(16).padStart(6, "0") : nv;
    o.colour = out;
    o.__ttclOut = out;
  } catch {}
}
function hookAimLines(game) {
  const st = game.state.states.Game;
  if (!st) {
    return;
  }
  const groups = [];
  for (const k of Object.keys(st)) {
    try {
      const g = st[k];
      if (g && g.children && /laser|aim|beam|ray/i.test(k)) {
        groups.push([k, g]);
      }
    } catch {}
  }
  window.__ttclDbg = () =>
    JSON.stringify({
      floor: MAP_FLOOR_NOW,
      groups: groups.map(([k, g]) => [
        k,
        g.children.map((o) => ({
          ctor: o.constructor && o.constructor.name,
          colour: o.colour,
          in: o.__ttclIn,
          out: o.__ttclOut,
          hooked: aimHooked.has(o),
          vis: o.visible,
          keys: Object.keys(o).slice(0, 20).join(","),
        })),
      ]),
    });
  for (const [, grp] of groups) {
    for (const o of grp.children) {
      if (!o || typeof o.update !== "function" || !("colour" in o)) {
        continue;
      }
      const P = Object.getPrototypeOf(o);
      if (P && !P.__ttclAimP && Object.prototype.hasOwnProperty.call(P, "update")) {
        P.__ttclAimP = true;
        const pu = P.update;
        P.update = function () {
          aimAdapt(this);
          return pu.apply(this, arguments);
        };
      } // (every beam of that kind, including ones made after this check)
      if (aimHooked.has(o)) {
        continue;
      }
      aimHooked.add(o);
      aimAdapt(o);
    }
  }
}
export function mazePatternTick() {
  const game = mazeGame && mazeGame.deref();
  if (!game || !game.world || game.pendingDestroy || !game.state || game.state.current !== "Game") {
    clearInterval(mazeTimer);
    mazeTimer = null;
    mazeTanks = null;
    return;
  }
  try {
    hookAimLines(game);
  } catch {}
  if (!window.PIXI || !PIXI.BaseTexture) {
    return;
  }
  if (!mazeTanks || ++mazeTickN % 5 === 0) {
    // look for tanks once a second; in between only touch the ones found
    mazeTanks = [];
    const walk = (o, depth) => {
      if (!o || depth > 6) {
        return;
      }
      if (o.playerId != null && o.turret && o.leftTread && o.texture) {
        mazeTanks.push(o);
        return;
      }
      const ch = o.children;
      if (ch) {
        for (let i = 0; i < ch.length; i++) {
          walk(ch[i], depth + 1);
        }
      }
    };
    walk(game.world, 0);
  }
  for (const t of mazeTanks) {
    try {
      const id = String(t.playerId),
        ov = getOverride(id, true);
      if (mapNext !== undefined && isLaika(id)) {
        continue;
      } // between rounds: Laika's old tank is left alone, the next one arrives already dressed
      mazeColours(t, id, ov);
      const parts = mazeFeature() ? mazeParts(ov) : null;
      const sheet = parts ? mazeSheetFor(game, t, parts) : null;
      mazeSet(t, sheet && parts.base ? sheet : null);
      mazeSet(t.turret, sheet && parts.turret ? sheet : null);
      mazeSet(t.leftTread, sheet && parts.treads ? sheet : null);
      mazeSet(t.rightTread, sheet && parts.treads ? sheet : null);
    } catch {}
  }
}

export function startMaze() {
  // DEV check: every map (and its light/dark look) against paints close to its floor, measuring how much a mine, a laser and a bullet
  // stand out from the floor under them after Color Lab's changes. window.__ttclMapTest() -> a table; the picture is kept in __ttclMapTestImg
  window.__ttclMapTest = (opts) => {
    opts = opts || {};
    const game = mazeGame && mazeGame.deref();
    if (!game) {
      return "no game: start or join a game first";
    }
    let base;
    try {
      base = game.cache.getBaseTexture("game");
    } catch {}
    const src = base && (base.__ttclMapOrig || base.source);
    if (!src) {
      return "no sheet";
    }
    const orig = (n) => mapFrame(game, n),
      f0 = orig("floor0-0"),
      fm = orig("mine"),
      fb = orig("bullet");
    if (!f0 || !fm || !fb) {
      return "no frames";
    }
    const lum = (c) => (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255,
      hx = (c) =>
        "#" +
        c
          .map((v) =>
            Math.max(0, Math.min(255, Math.round(v)))
              .toString(16)
              .padStart(2, "0"),
          )
          .join(""),
      rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const looks = [["standard", null]];
    for (const k of Object.keys(MAP_THEMES)) {
      const T = MAP_THEMES[k];
      for (const sh of ["light", "dark"]) {
        if (T[sh] && typeof T[sh].floor === "function") {
          looks.push([k, sh]);
        }
      }
      if (!T.light && !T.dark && typeof T.floor === "function") {
        looks.push([k, ""]);
      }
    }
    const W = f0.w,
      H = f0.h,
      rows = [],
      cell = 64,
      only = opts.only ? new RegExp(opts.only, "i") : null;
    const sheetC = document.createElement("canvas");
    const PA = 9;
    sheetC.width = cell * (PA + 1) * 3;
    sheetC.height = cell * looks.length;
    const SG = sheetC.getContext("2d");
    SG.fillStyle = "#222";
    SG.fillRect(0, 0, sheetC.width, sheetC.height);
    SG.font = "9px sans-serif";
    const tint = (fr, colHex) => {
      const c = document.createElement("canvas");
      c.width = fr.w;
      c.height = fr.h;
      const g = c.getContext("2d");
      g.drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
      g.globalCompositeOperation = "multiply";
      g.fillStyle = colHex;
      g.fillRect(0, 0, fr.w, fr.h);
      g.globalCompositeOperation = "destination-in";
      g.drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
      return c;
    };
    const withRim = (c, fr, rim) => {
      if (!rim) {
        return c;
      }
      const g = c.getContext("2d");
      addRim(
        g,
        fr.w,
        fr.h,
        (c2, x, y, ww, hh) => c2.drawImage(src, fr.x, fr.y, fr.w, fr.h, x, y, ww, hh),
        rim[0],
        rim[1],
      );
      return c;
    };
    let li = 0;
    for (const [key, sh] of looks) {
      if (only && !only.test(key)) {
        li++;
        continue;
      }
      const fc = document.createElement("canvas");
      fc.width = W;
      fc.height = H;
      const fg = fc.getContext("2d", { willReadFrequently: true });
      try {
        if (key === "standard") {
          fg.drawImage(src, f0.x, f0.y, W, H, 0, 0, W, H);
        } else {
          const T = MAP_THEMES[key],
            v = sh ? T[sh] : T;
          if (v.keepStandard) {
            fg.drawImage(src, f0.x, f0.y, W, H, 0, 0, W, H);
          } else {
            v.floor(fg, 0, W, H, src, orig);
          }
        }
      } catch (e) {
        rows.push([key, sh, "floor error " + e.message]);
        li++;
        continue;
      }
      const fd = fg.getImageData(0, 0, W, H).data;
      let r = 0,
        g2 = 0,
        b = 0,
        n = 0;
      for (let i = 0; i < fd.length; i += 16) {
        r += fd[i];
        g2 += fd[i + 1];
        b += fd[i + 2];
        n++;
      }
      const floor = [r / n, g2 / n, b / n];
      const fH = hx(floor),
        fl = lum(floor),
        paints = [
          fH,
          hx(floor.map((v) => v + 25)),
          hx(floor.map((v) => v - 25)),
          "#000000",
          "#0d0208",
          "#ffffff",
          "#808080",
          hx([floor[1], floor[2], floor[0]].map((v) => Math.min(255, v * 1.1))),
          hx(floor.map((v) => 255 - v)),
        ];
      // how far the thing is from the floor under it, over the thing's own pixels (mean colour distance, 0..441)
      const score = (thing, fr, ox, oy) => {
        const tc = document.createElement("canvas");
        tc.width = fr.w;
        tc.height = fr.h;
        const tg = tc.getContext("2d", { willReadFrequently: true });
        tg.drawImage(fc, ox, oy, fr.w, fr.h, 0, 0, fr.w, fr.h);
        const fl0 = tg.getImageData(0, 0, fr.w, fr.h).data;
        tg.drawImage(thing, 0, 0);
        const d = tg.getImageData(0, 0, fr.w, fr.h).data,
          a = thing.getContext("2d").getImageData(0, 0, fr.w, fr.h).data;
        let s = 0,
          m = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (a[i + 3] > 40) {
            s += Math.hypot(d[i] - fl0[i], d[i + 1] - fl0[i + 1], d[i + 2] - fl0[i + 2]);
            m++;
          }
        }
        return m ? s / m : 0;
      };
      const lineScore = (colHex) => {
        const c = rgb(colHex);
        let s = 0,
          m = 0;
        for (let i = 0; i < fd.length; i += 4) {
          s += Math.hypot(fd[i] - c[0], fd[i + 1] - c[1], fd[i + 2] - c[2]);
          m++;
        }
        return s / m;
      }; // (a thin line: its colour against every floor pixel it could cross)
      const worst = { mine: 999, laser: 999, bullet: 999 };
      const det = [];
      SG.drawImage(fc, 0, li * cell, cell, cell);
      SG.fillStyle = fl > 0.5 ? "#000" : "#fff";
      SG.fillText((key + (sh ? " " + sh : "")).slice(0, 14), 2, li * cell + 10);
      paints.forEach((p, pi) => {
        const mineCol = altOnFloor(p, floor),
          mr = rimFor("0x" + mineCol.slice(1), floor),
          mine = withRim(tint(fm, mineCol), fm, mr && mr[1] >= 0.9 ? mr : null);
        const laserCol = altOnFloor(p, floor),
          br = rimFor(p, floor),
          bul = (() => {
            const mk = document.createElement("canvas");
            mk.width = fb.w;
            mk.height = fb.h;
            mk.getContext("2d").drawImage(src, fb.x, fb.y, fb.w, fb.h, 0, 0, fb.w, fb.h);
            const c = document.createElement("canvas");
            c.width = fb.w;
            c.height = fb.h;
            bulletArt(
              c.getContext("2d"),
              mk,
              fb.w,
              fb.h,
              p,
              lum(rgb(p)) > 0.55 ? "#111318" : "#f4f4f2",
              undefined,
              undefined,
              br,
            );
            return c;
          })();
        const ms = score(mine, fm, (W - fm.w) / 2, (H - fm.h) / 2),
          ls = lineScore(laserCol),
          bs = score(bul, fb, (W - fb.w) / 2, (H - fb.h) / 2);
        worst.mine = Math.min(worst.mine, ms);
        worst.laser = Math.min(worst.laser, ls);
        worst.bullet = Math.min(worst.bullet, bs);
        det.push([p, Math.round(ms), Math.round(ls), Math.round(bs)]);
        // picture: per paint, a floor piece with the mine, a laser stroke and a bullet (bullet drawn 3x so it can be judged)
        const x0 = cell * (1 + pi) * 3;
        SG.drawImage(fc, 0, 0, W, H, x0, li * cell, cell * 3, cell);
        SG.drawImage(mine, x0 + 4, li * cell + (cell - fm.h * 0.8) / 2, fm.w * 0.8, fm.h * 0.8);
        SG.strokeStyle = laserCol;
        SG.lineWidth = 2;
        SG.beginPath();
        SG.moveTo(x0 + cell * 0.9, li * cell + cell * 0.8);
        SG.lineTo(x0 + cell * 1.9, li * cell + cell * 0.2);
        SG.stroke();
        SG.imageSmoothingEnabled = false;
        SG.drawImage(bul, x0 + cell * 2.1, li * cell + cell / 2 - fb.h * 1.5, fb.w * 3, fb.h * 3);
        SG.imageSmoothingEnabled = true;
        SG.fillStyle = p;
        SG.fillRect(x0, li * cell + cell - 6, 10, 6);
      });
      rows.push({
        map: key + (sh ? " (" + sh + ")" : ""),
        floor: fH,
        mine: Math.round(worst.mine),
        laser: Math.round(worst.laser),
        bullet: Math.round(worst.bullet),
        det,
      });
      li++;
    }
    try {
      window.__ttclMapTestImg = sheetC.toDataURL("image/jpeg", 0.8);
    } catch {}
    window.__ttclMapTestRows = rows;
    return rows
      .map((r) =>
        r.map ? r.map + " " + r.floor + " mine " + r.mine + " laser " + r.laser + " bullet " + r.bullet : r.join(" "),
      )
      .join("\n");
  };
}
