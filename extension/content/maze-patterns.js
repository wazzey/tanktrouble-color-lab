import { isPat } from "./colours.js";
import { flatHex } from "./registries.js";

// ---------- Pattern in-maze ----------
export const mazeSheets = {}; // look key → patterned picture sheet (PIXI base texture)
export const MAZE_GROUPS = {
  turret: (n) => /^turret\d+$/.test(n),
  base: (n) => n === "base",
  treads: (n) => n === "tread",
};
export const MAZE_TILE = {},
  CUSTOM_ANY_LAYOUT = {}; // the maze's version of paints whose picture version is laid out part by part
// which parts of a look show their pattern in the maze: { turret: value, base: value, treads: value } (null = plain)
export function mazeParts(c) {
  const out = {};
  let any = false;
  for (const part of ["turret", "base", "treads"]) {
    const v = c && c[part];
    out[part] = isPat(v) && !(c.maze && c.maze[part] === false) ? v : null;
    if (out[part]) {
      any = true;
    }
  }
  return any ? out : null;
}
// A picture Color Lab made can lose its copy on the graphics card (the game clears ones it isn't using between rounds),
// and the card then draws the game's own plain picture in its place (a white tank): such a picture is sent to the card again
export function glFresh(game, base) {
  try {
    const r = game && game.renderer,
      gl = r && r.gl;
    if (!gl || !base || !base._glTextures) {
      return;
    }
    const t = base._glTextures[r.glContextId];
    if (t && !gl.isTexture(t)) {
      base.unloadFromGPU();
    }
  } catch {}
}
export function mazeSet(sprite, sheet) {
  // point one tank part at the patterned sheet (or back at the game's own)
  if (!sprite || !sprite.texture) {
    return;
  }
  if (sheet) {
    if (!sprite.__ttclOrigBase) {
      sprite.__ttclOrigBase = sprite.texture.baseTexture;
    }
    if (sprite.texture.baseTexture !== sheet) {
      sprite.texture.baseTexture = sheet;
    }
    if (sprite.tint !== 0xffffff) {
      sprite.__ttclTint = sprite.tint;
      sprite.tint = 0xffffff;
    } // the pattern carries the colour (the game re-tints after spawning)
  } else if (sprite.__ttclOrigBase) {
    // back to the game's own picture and colour
    sprite.texture.baseTexture = sprite.__ttclOrigBase;
    sprite.__ttclOrigBase = null;
    if (sprite.__ttclTint != null) {
      sprite.tint = sprite.__ttclTint;
      sprite.__ttclTint = null;
    }
  }
}
// Live colours in a match: each part tinted with the look's colour (a pattern's main colour when it isn't shown as a
// pattern); a tank whose look was switched off gets its real colours back (asked from the game's server once).
export const realCols = {},
  realAsked = new Set();
export const tintOf = (v) => {
  const h = flatHex(v);
  return h ? parseInt(h, 16) : null;
};
export const aimHooked = new WeakSet();
export const BULLET_MOTION = "spin"; // 'spin' (rolls, the spin reverses on every bounce) or 'face' (points along its path)
export const FACE_TRAVEL = new Set(["quad", "beach", "circus", "holo", "bee"]); // map bullets with 3+ colours (or a bee's stripes): turned to face the way they fly, so they snap round on every bounce
