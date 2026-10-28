import { isPat, patId } from "../content/colours.js";
import {
  LAIKA_ID,
  LAIKA_IDS,
  LAIKA_SKINS,
  dogGames,
  dogLive,
  dogSeen,
  dogSheet,
  dogSwap,
  isLaika,
} from "../content/laika.js";
import { DEV_TROPHIES } from "./achievements.js";
import { getCustomArt } from "./custom-box-art.js";
import { refreshSoon } from "./game-socket.js";
import { GAME_STATE } from "./garage.js";
import { mapGameRef, mapNext, mapTheme } from "./map-themes.js";
import { mazeGame, mazeTanks } from "./maze.js";
import { SETTINGS } from "./storage.js";

// every tank's colours as last seen (Twinsies): turret|base|treads, filled as player details pass through
export const LOOKS_SEEN = {};

// ---------- Laika's map skins ----------
// Laika's look: SETTINGS.laikaLook = 'map' (follows the Color Lab map, the default) or a theme key (always that look)
// (now = this round's map: the tank already in the maze keeps it; the next round's tank is dressed for the next map)
const laikaTheme = (now) => {
  if (SETTINGS.laikaSkin === false) {
    return null;
  }
  const L = SETTINGS.laikaLook;
  if (L && L !== "map") {
    return LAIKA_SKINS[L] ? L : null;
  }
  const m = !now && mapNext !== undefined ? mapNext : mapTheme;
  return m && LAIKA_SKINS[m] ? m : null;
};
export const laikaSkinOn = () => !!laikaTheme();
export function laikaSkinFor(id, now) {
  const th = laikaTheme(now);
  if (!th || !isLaika(id)) {
    return null;
  }
  const s = LAIKA_SKINS[th];
  return { enabled: true, turret: s.turret, base: s.base, treads: s.treads, acc: Object.assign({}, s.acc || {}) };
}
let laikaSkinWas = null;
export const redoLaikaSkin = () => {
  laikaSkinWas = undefined;
};
export function laikaSkinChanged() {
  // the map changed: Laika's tank and dog follow
  const now = laikaTheme();
  if (now === laikaSkinWas) {
    return;
  }
  laikaSkinWas = now;
  const ids = [...new Set([LAIKA_ID, ...LAIKA_IDS])];
  if (now) {
    for (const v of [LAIKA_SKINS[now].turret, LAIKA_SKINS[now].base, LAIKA_SKINS[now].treads]) {
      if (isPat(v)) {
        getCustomArt(patId(v));
      }
    }
  }
  const g = mazeGame && mazeGame.deref(),
    inGame = g && g.state && g.state.current === "Game";
  if (!inGame || (mazeTanks && mazeTanks.some((t) => isLaika(String(t.playerId))))) {
    try {
      refreshSoon(ids);
    } catch {}
  } // in a round without Laika: nothing to redraw (she's dressed when she next shows up)
  if (SETTINGS.laikaDog || dogWas) {
    laikaDog();
  }
}

// --- the dog (experimental) ---
// Every dog is built through PhaserSpine's createSkeleton, which reads the game's cache each time. The menu, the lobby
// and the game are separate Phaser games (each with its own cache), and the menu's dog is made before any timer runs,
// so: createSkeleton is wrapped (each new dog gets the wanted sheet first), and dogs already on screen are rebuilt in
// place (same animations, new parts) when the look changes.
let dogBusy = false,
  dogWas = undefined,
  dogOrigCreate = null;
const dogWant = () =>
  SETTINGS.laikaDog
    ? laikaTheme() ||
      (SETTINGS.laikaSkin !== false &&
      (!SETTINGS.laikaLook || SETTINGS.laikaLook === "map") &&
      SETTINGS.mapMode === "fixed" &&
      LAIKA_SKINS[SETTINGS.mapFixed]
        ? SETTINGS.mapFixed
        : null)
    : null;
function hookDogSpine() {
  if (dogOrigCreate || !window.PhaserSpine || !PhaserSpine.Spine || !PhaserSpine.Spine.prototype.createSkeleton) {
    return;
  }
  const P = PhaserSpine.Spine.prototype;
  dogOrigCreate = P.createSkeleton;
  P.createSkeleton = function (key) {
    if (key === "laika" && this.game) {
      try {
        dogGames.add(new WeakRef(this.game));
        dogSwap(this.game, dogWant());
        if (!dogSeen.has(this)) {
          dogSeen.add(this);
          dogLive.add(new WeakRef(this));
        }
      } catch {}
    }
    return dogOrigCreate.call(this, key);
  };
}
function dogRebuild(game) {
  // dogs already on screen in that game: new parts, same animations and pose
  for (const r of [...dogLive]) {
    const s = r.deref();
    if (!s || !s.game || s.destroyPhase || (s.game && !s.game.cache)) {
      dogLive.delete(r);
      continue;
    }
    if (s.game !== game || !s.skeleton) {
      continue;
    }
    try {
      const old = s.skeleton,
        nk = dogOrigCreate.call(s, "laika");
      nk.flipX = old.flipX;
      nk.flipY = old.flipY;
      nk.x = old.x;
      nk.y = old.y;
      if (old.skin && nk.data.findSkin) {
        const sk = nk.data.findSkin(old.skin.name);
        if (sk) {
          nk.setSkin(sk);
        }
      }
      nk.setToSetupPose();
      nk.updateWorldTransform();
      s.skeleton = nk;
    } catch (e) {
      if (DEV_TROPHIES) {
        console.warn("[Color Lab] Laika dog rebuild", e);
      }
    }
  }
}
export async function laikaDog() {
  if (dogBusy) {
    return;
  }
  dogBusy = true;
  try {
    hookDogSpine();
    const want = dogWant();
    const games = new Set();
    for (const r of [...dogGames]) {
      const g = r.deref();
      if (g && g.cache) {
        games.add(g);
      } else {
        dogGames.delete(r);
      }
    }
    for (const g of [mazeGame && mazeGame.deref(), mapGameRef && mapGameRef.deref(), GAME_STATE && GAME_STATE.game]) {
      if (g && g.cache) {
        games.add(g);
      }
    }
    if (want) {
      await dogSheet(want, [...games]);
    }
    for (const g of games) {
      if (dogSwap(g, want)) {
        dogRebuild(g);
      }
    }
    dogWas = want;
  } catch (e) {
    if (DEV_TROPHIES) {
      console.warn("[Color Lab] Laika dog", e);
    }
  } finally {
    dogBusy = false;
  }
}

export function startLaikaLook() {
  if (!window.PhaserSpine) {
    let n = 0;
    const t = setInterval(() => {
      hookDogSpine();
      if (dogOrigCreate || ++n > 600) {
        clearInterval(t);
      }
    }, 50);
  } else {
    hookDogSpine();
  }
  if (SETTINGS.laikaDog) {
    laikaDog();
  } // (starts loading the sheet early so the menu's dog is made with it)
  setInterval(() => {
    try {
      laikaSkinChanged();
    } catch {}
    if (SETTINGS.laikaDog || dogWas) {
      laikaDog();
    }
  }, 1500); // follows the map (or the look you picked)
}
