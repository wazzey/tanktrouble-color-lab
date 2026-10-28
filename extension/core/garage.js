import { ACC_SLOTS } from "../content/colours.js";
import {
  GARAGE_PICS,
  bgPending,
  fixGarageArrows,
  garageContent,
  garageFake,
  garageReal,
  garageWheel,
  isFolderBox,
  standInPic,
} from "../content/garage-folders.js";
import { PAGE_GAMES } from "../content/page-themes.js";
import { normVal } from "../content/registries.js";
import { ASSET_MAP } from "./assets.js";
import { isCustomKey } from "./custom-box-art.js";
import { loggedInIds, lookupById, refreshTanks, removedIds } from "./game-socket.js";
import {
  BOX15_IMG,
  bgAdd,
  bgBox,
  folderTarget,
  garageAllOn,
  garageFrameFor,
  garageMode,
  garagePicFor,
  openBoxFolder,
  ownedRaw,
} from "./garage-boxes.js";
import {
  addGarageButton,
  buildGarageIndex,
  renderGarageMaze,
  renderGarageSearch,
  syncGarageButton,
} from "./garage-search.js";
import { hookMapGroups, mapPickNext } from "./map-themes.js";
import { startMazePatterns } from "./maze.js";
import { renderList } from "./saved-looks.js";
import { PLAYER_COLOR_MAP, normEntry, saveToStorage, syncActive } from "./storage.js";

export function garageWrite(body) {
  const r = garageWriteInner(body);
  try {
    const id = String((JSON.parse(body).params || [])[0]);
    (r ? garageFake : garageReal).add(id);
    garagePid = id;
  } catch {}
  setTimeout(renderGarageMaze, 0);
  return r;
}
function garageWriteInner(body) {
  let j;
  try {
    j = JSON.parse(body);
  } catch {
    return null;
  }
  const [pidRaw, part, val] = j.params || [];
  const id = String(pidRaw);
  if (!ownedRaw[id]) {
    return null;
  } // haven't seen this tank's real garage: don't guess
  if (j.method === "tanktrouble.garage.setColour") {
    const key = part === "tread" ? "treads" : part;
    if (!["turret", "base", "treads"].includes(key)) {
      return null;
    }
    const v = normVal(val);
    if (!v) {
      return null;
    }
    garageLocal(
      id,
      (p) => {
        p[key] = v;
      },
      true,
    );
  } else {
    if (!ACC_SLOTS.some(([s]) => s === part)) {
      return null;
    }
    // In All everything stays local, even things you own (Real is for changing your real tank)
    if (String(val) === "0") {
      // taking an accessory off
      garageLocal(
        id,
        (p) => {
          p.acc = Object.assign({}, p.acc, { [part]: "0" });
        },
        true,
      );
    } else {
      const mk = /[?&]ttcl=([\w-]+)/.exec(String(val)); // one of Color Lab's own items
      const store = mk ? "ttcl:" + mk[1] : String(val);
      garageLocal(
        id,
        (p) => {
          p.acc = Object.assign({}, p.acc, { [part]: store });
        },
        true,
      );
    }
  }
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", result: { result: true, message: "OK" }, id: j.id != null ? j.id : 1 }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
// Edit the tank's active look from the garage. create = make a saved tank if there isn't one yet.
export function garageLocal(id, fn, create) {
  let e = PLAYER_COLOR_MAP[id];
  if (!e) {
    if (!create) {
      return;
    }
    e = PLAYER_COLOR_MAP[id] = normEntry({});
    lookupById(id)
      .then((d) => {
        if (d && d.username && !e.playerName) {
          e.playerName = d.username;
          if (!e.nickname) {
            e.nickname = d.username;
          }
          saveToStorage();
          try {
            renderList();
          } catch {}
        }
      })
      .catch(() => {});
  }
  if (create) {
    e.enabled = true;
  }
  fn(e.presets[e.active]);
  delete e.presets[e.active].fresh;
  syncActive(e); // (changed: it's its own look now)
  saveToStorage();
  removedIds.delete(id);
  try {
    renderList();
  } catch {}
  setTimeout(() => refreshTanks([id]), 60); // redraw it everywhere (the game won't hear about a change it never sent)
}

// The garage is its own little Phaser game. Watching its loader tells us when it opens (to add the
// Real/All button) and lets us hand it the retired box's art.
export let phaserHooked = false,
  garageGame = null;
export function hookPhaser() {
  if (phaserHooked || !window.Phaser || !Phaser.Loader || !Phaser.Loader.prototype.spritesheet) {
    return;
  }
  phaserHooked = true;
  try {
    hookMapGroups();
  } catch {}
  // the main game: watch its game controller for kills (Laika trophies)
  const origStart = Phaser.StateManager && Phaser.StateManager.prototype.start;
  if (origStart) {
    Phaser.StateManager.prototype.start = function (key, ...rest) {
      const r = origStart.call(this, key, ...rest);
      try {
        if (this.game) {
          PAGE_GAMES.add(this.game);
        }
      } catch {} // (page themes recolour its buttons and lobby pictures)
      // The garage is opening: if the game's saved copy of a tank's garage was made in the other mode
      // (e.g. fetched by the game before your settings loaded), make it fetch a fresh one.
      if (key === "Game") {
        GAME_STATE = this.states && this.states.Game;
        if (this.game) {
          startMazePatterns(this.game);
        }
        try {
          mapPickNext();
        } catch {}
      }
      if (
        key === "Load" &&
        this.game &&
        this.game.parent &&
        this.game.parent.closest &&
        this.game.parent.closest(".garage")
      ) {
        const stale = loggedInIds().filter((id) => !!garageMode[id] !== garageAllOn(id));
        if (stale.length) {
          refreshTanks(stale, true);
        }
      }
      if (
        key === "Main" &&
        this.game &&
        this.game.parent &&
        this.game.parent.closest &&
        this.game.parent.closest(".garage")
      ) {
        const st = this.states && this.states.Main;
        watchGarageMain(st);
        keepGarageTank(st);
      }
      return r;
    };
  }
  const orig = Phaser.Loader.prototype.spritesheet;
  Phaser.Loader.prototype.spritesheet = function (key, url, ...rest) {
    if (typeof key === "string" && /^box\d+$/.test(key)) {
      garageGame = this.game ? new WeakRef(this.game) : null; // weak: a closed garage can still be freed
      setTimeout(addGarageButton, 0);
      if (key === "box15" && BOX15_IMG) {
        url = BOX15_IMG;
      }
      if (GARAGE_PICS[key]) {
        url = GARAGE_PICS[key];
      } else if (+key.slice(3) >= 9001 && ASSET_MAP && ASSET_MAP.box1) {
        url = ASSET_MAP.box1;
      } // a Color Lab box still being drawn: the plain box for now
    }
    return orig.call(this, key, url, ...rest);
  };
  const origImage = Phaser.Loader.prototype.image;
  Phaser.Loader.prototype.image = function (key, url, ...rest) {
    if (typeof url === "string" && url.includes("ttcl=")) {
      const m = /[?&]ttcl=([\w-]+)/.exec(url);
      if (m) {
        garagePicFor(m[1]);
        const big = /^\/?assets\/images\/tankIcon\//.test(url),
          w = +((/\.png@(\d+)/.exec(url) || [])[1] || 640);
        const pic = big ? garageFrameFor(m[1], w) : GARAGE_PICS["i:" + m[1]];
        if (pic) {
          url = pic;
        } else if (isCustomKey(m[1])) {
          url = standInPic(m[1], big, w);
          (bgPending[m[1]] = bgPending[m[1]] || []).push({ lk: key, big, w });
          bgAdd(m[1], big);
        } // not drawn yet: a plain stand-in (never the game's own, e.g. the Halloween paint), swapped once drawn
      }
    }
    return origImage.call(this, key, url, ...rest);
  };
}
// Scroll arrows on a box with more items than fit in one row: after a box opens, make sure they're showing.
// (With fast garage timings the game can hide them right after showing them, e.g. on the first box.)
// Which tank the garage has open: the game's own selection (the tank icons along the top). Every garage
// option (Real / All, 🎲, Find, Pattern in-maze) works on that tank only.
let garageMainRef = null,
  garageSel = null,
  garageWant = null;
export const wantGarageBox = (id) => {
  garageWant = id;
};
export function selPid() {
  try {
    const st = garageMainRef && garageMainRef.deref();
    if (st && st.selectedPlayerId != null && st.game && st.game.isBooted !== false) {
      return String(st.selectedPlayerId);
    }
  } catch {}
  return garagePid;
}
export function onGarageTank() {
  // the open tank changed: its own search list, buttons and name
  const id = selPid();
  if (!id || id === garageSel) {
    return;
  }
  garageSel = id;
  garageWant = id;
  if (garageContent[id]) {
    buildGarageIndex(garageContent[id]);
  }
  const b = document.querySelector(".garage form button.ttcl-garage");
  if (b) {
    syncGarageButton(b);
  }
  renderGarageMaze();
  const rp = document.getElementById("ttcl-grnd");
  if (rp) {
    rp.remove();
  }
  const gs = document.getElementById("ttcl-gsearch");
  if (gs && gs.dataset.f === "looks") {
    renderGarageSearch();
  } // (that tank's own looks)
  const gl = document.getElementById("ttcl-glooks");
  if (gl && gl._redraw) {
    gl._redraw();
  }
}
function keepGarageTank(st) {
  // the garage restarting (after Real / All) opens the first tank again: go back to the one you had open
  if (!st) {
    return;
  }
  garageMainRef = new WeakRef(st);
  garageSel = null;
  let n = 0;
  const t = setInterval(() => {
    n++;
    try {
      if (st.selectedPlayerId != null) {
        clearInterval(t);
        if (
          garageWant &&
          String(st.selectedPlayerId) !== garageWant &&
          st.tankIconSprites &&
          st.tankIconSprites[garageWant] &&
          typeof st._setTankIconSelection === "function"
        ) {
          st._setTankIconSelection(st.tankIconSprites[garageWant], st);
        }
        onGarageTank();
      }
    } catch {
      clearInterval(t);
    }
    if (n > 60) {
      clearInterval(t);
    }
  }, 50);
}
export function placeGarageBar() {
  try {
    const form = document.querySelector(".garage form");
    if (!form) {
      return;
    }
    const done = form.querySelector("button[type=submit]"),
      st = garageMainRef && garageMainRef.deref(),
      gm = st && st.game;
    const cv = (gm && gm.canvas) || document.querySelector(".garage canvas");
    if (!done || !cv || !cv.isConnected) {
      return;
    }
    const bar = form.contains(cv) ? done.parentNode : form;
    if (!bar || bar.contains(cv)) {
      return;
    }
    const r = cv.getBoundingClientRect();
    if (r.height < 200) {
      return;
    }
    const prev = parseFloat(bar.dataset.ttclLift || "0"),
      top0 = done.getBoundingClientRect().top - prev; // where the row sits without our lift
    const want = r.top + r.height * 0.725 + 5;
    const lift = Math.max(-r.height * 0.4, Math.min(0, Math.round(want - top0)));
    if (Math.abs(lift - prev) < 1) {
      return;
    }
    bar.dataset.ttclLift = String(lift);
    bar.style.transform = lift ? "translateY(" + lift + "px)" : "";
    if (!bar.style.position) {
      bar.style.position = "relative";
    }
    bar.style.zIndex = "2";
  } catch {}
}
function watchGarageMain(st) {
  if (!st || st.__ttclWatched || typeof st._setBoxSelection !== "function") {
    return;
  }
  st.__ttclWatched = true;
  garageWheel(st);
  if (typeof st._setTankIconSelection === "function") {
    const ot = st._setTankIconSelection;
    st._setTankIconSelection = function (e, t) {
      const r = ot.call(this, e, t);
      setTimeout(onGarageTank, 0);
      return r;
    };
  }
  const orig = st._setBoxSelection;
  st._setBoxSelection = function (e, t) {
    const S0 = t || this;
    if (e && e.getId && isFolderBox(e.getId())) {
      // a folder box: open the folder (the game's own first-box auto-open skips past it)
      if (S0.openBoxEvent && S0.currentBoxSprites && e === S0.currentBoxSprites[0]) {
        const next = S0.currentBoxSprites.find((x) => x && x.getId && !isFolderBox(x.getId()));
        try {
          S0.game.time.events.remove(S0.openBoxEvent);
        } catch {}
        S0.openBoxEvent = null;
        return next ? st._setBoxSelection.call(this, next, t) : undefined;
      }
      const to = folderTarget(e.getId());
      if (to) {
        openBoxFolder(to);
      }
      return;
    }
    const r = orig.call(this, e, t),
      S = t || this;
    try {
      if (e && e.getId) {
        bgBox(e.getId());
      }
    } catch {}
    [400, 900, 1600].forEach((ms) => setTimeout(() => fixGarageArrows(S), ms));
    return r;
  };
}
// Garage: "Pattern in-maze" switches for the garage tank's patterned parts, next to Real / All
let garagePid = null;
export const noteGaragePid = (id) => {
  garagePid = id;
};
// Dimitriums (the game's diamond currency, collectible type 10) picked up in online games: a server
// "collectible destroyed" message (type 8) names who took it; the game still knows what it was at that moment.
export let GAME_STATE = null;

export function startGarage() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => hookPhaser());
  } else {
    setTimeout(() => hookPhaser(), 0);
  }
}
