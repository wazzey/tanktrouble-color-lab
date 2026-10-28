import { GX_PAINT, isPat, patId } from "../content/colours.js";
import { breathe, garageFake, garageReal } from "../content/garage-folders.js";
import { getCustomArt, isCustomKey } from "./custom-box-art.js";
import { hasOverrides, sharedLook } from "./look-sharing.js";
import { applyOverrides, origFetch, seenAccountIds } from "./network.js";
import { partyRoll } from "./random.js";
import { PLAYER_COLOR_MAP, SETTINGS } from "./storage.js";
import { onCollectibleTaken, onTankKilled } from "./trophy-counting.js";

let origSend;
let onmsgDesc;

// Returns a fake "OK" reply for items you don't own (after saving them locally), or null to let the call through.
let realWriteSeen = false; // a real change was sent to the game since the last "player updated"
export const noteRealWrite = () => {
  realWriteSeen = true;
};

// ---------- multiplayer socket layer ----------
// Your own tanks' details arrive over the game's WebSocket when they authenticate (JSON text messages),
// so recolour those too. We also keep the game's message handler so we can feed it a
// "playerUpdated" message (type 39) — that makes the game drop its cached copy of a tank and redraw it.
export const liveSockets = new Set();
export let LOBBY_GAMES = null;
// the tank's real look (colours + accessories) as the game's server has it, taken when the garage opens
export const garageSnap = {};
export const garageSig = (d) =>
  d
    ? JSON.stringify(
        Object.keys(d)
          .filter((k) => /Colour$|Accessory$/.test(k))
          .sort()
          .map((k) => [k, d[k] && typeof d[k] === "object" ? d[k].rawValue : d[k]]),
      )
    : null;
// Tell the game these tanks changed, so it refetches (through our fetch hook) and redraws them. Returns how many were sent.
// Redraw tanks when a picture they wear is ready. Until the game's connection is up there's nothing to send it
// through, so it's kept and sent as soon as it is (else e.g. the bottom bar keeps the stand-in picture).
// Requests are gathered and sent together (at most every ~0.4 s): while pictures are being loaded after a refresh, each
// one finishing used to make the game re-fetch and redraw every tank, many times over - that was the stutter.
const refreshLater = new Set();
let refreshTimer = 0,
  refreshTries = 0;
export function refreshSoon(ids) {
  ids.forEach((id) => refreshLater.add(String(id)));
  if (refreshTimer) {
    return;
  }
  refreshTries = 0;
  const flush = () => {
    refreshTimer = 0;
    if (!refreshLater.size) {
      return;
    }
    const young = [...liveSockets].some((ws) => ws.readyState === 1 && Date.now() - (ws.__ttclAt || 0) < 1500); // the game is still connecting: let it finish first
    if (young && refreshTries++ < 60) {
      refreshTimer = setTimeout(flush, 400);
      return;
    }
    if (refreshTanks([...refreshLater]) || ++refreshTries > 60) {
      refreshLater.clear();
      return;
    }
    refreshTimer = setTimeout(flush, 500);
  }; // the game's connection isn't up yet: try again shortly
  refreshTimer = setTimeout(flush, 400);
}
export async function warmLooks(only) {
  // load (or draw) the Color Lab paints and items your logged-in tanks (or one tank) wear; other tanks' are loaded when they're shown
  const keys = new Set(),
    mine = new Set(loggedInIds());
  if (only == null && !mine.size) {
    if ((warmLooks.tries = (warmLooks.tries || 0) + 1) < 10) {
      setTimeout(() => warmLooks(), 1500);
    }
    return;
  } // (your tanks aren't known yet)
  const addKeys = (e) => {
    for (const p of ["turret", "base", "treads"]) {
      const v = e[p];
      if (isPat(v) && GX_PAINT[patId(v)]) {
        keys.add(patId(v));
      }
    }
    for (const v of Object.values(e.acc || {})) {
      const m = /^ttcl:([\w-]+)$/.exec(String(v));
      if (m) {
        keys.add(m[1]);
      }
    }
  };
  for (const id in PLAYER_COLOR_MAP) {
    const e = PLAYER_COLOR_MAP[id];
    if (!e || e.enabled === false || (only != null ? id !== String(only) : !mine.has(id))) {
      continue;
    }
    addKeys(e);
  }
  if (only != null && !PLAYER_COLOR_MAP[String(only)]) {
    const sl = sharedLook(String(only));
    if (sl) {
      addKeys(sl);
    }
  } // a look its owner shared
  for (const k of keys) {
    try {
      if (isCustomKey(k)) {
        await getCustomArt(k);
      }
    } catch {}
    await breathe();
  }
}
// The game answers "this tank changed" by shrinking its picture away and popping the new one in. Color Lab's own redraws
// swap the picture in place instead (no shrink / pop), so a look that changes or finishes loading doesn't flicker.
let quietRedraw = false,
  quietHooked = false;
function hookQuietTweens() {
  if (quietHooked || !window.Phaser || !Phaser.GameObjectFactory || !Phaser.GameObjectFactory.prototype.tween) {
    return;
  }
  quietHooked = true;
  const orig = Phaser.GameObjectFactory.prototype.tween;
  Phaser.GameObjectFactory.prototype.tween = function (obj) {
    const tw = orig.call(this, obj);
    if (quietRedraw && obj && typeof obj.x === "number" && typeof obj.y === "number" && tw && tw.to) {
      const to = tw.to,
        sx = obj.x,
        sy = obj.y;
      tw.to = function (props, dur, ease, ...r) {
        if (props && props.x === 0 && props.y === 0) {
          props = { x: sx, y: sy };
        }
        return to.call(this, props, 1, Phaser.Easing.Linear.None, ...r);
      };
    }
    return tw;
  };
}
export function refreshTanks(ids, content, native) {
  // native: the game's own shrink-and-pop, like a real look change
  let sent = 0;
  hookQuietTweens();
  ids = [...new Set(ids.map(String))];
  for (const ws of [...liveSockets]) {
    if (ws.readyState > 1) {
      liveSockets.delete(ws);
      continue;
    }
    const fn = ws.__ttOrigHandler;
    if (ws.readyState !== 1 || typeof fn !== "function") {
      continue;
    }
    for (const id of ids) {
      try {
        quietRedraw = !native;
        try {
          fn.call(
            ws,
            new MessageEvent("message", {
              data: JSON.stringify({
                _typeId: 39,
                playerId: String(id),
                iconChanged: true,
                usernameChanged: false,
                contentChanged: !!content,
              }),
            }),
          );
        } finally {
          quietRedraw = false;
        }
        sent++;
      } catch {}
    }
  }
  return sent;
}
export const removedIds = new Set(); // tanks whose override was removed, so a refresh puts their real colours back

// Our own RPC calls use the unpatched fetch, so we always see a tank's REAL colours.
export async function rpc(method, params) {
  const r = await origFetch("/ajax/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ jsonrpc: "2.0", method: "tanktrouble." + method, id: 1, params }),
  });
  const j = await r.json();
  if (j.error) {
    throw new Error(j.error.message || "Server error");
  }
  if (!j.result || !j.result.result) {
    throw new Error((j.result && j.result.message) || "Player not found");
  }
  return j.result.data;
}
export const lookupByName = (name) => rpc("getPlayerDetailsByUsername", [name]);
export const lookupById = (id) => rpc("getPlayerDetails", [String(id)]);

// g_users (accounts) and g_guests (guest tanks) are objects keyed by playerId; empty ones may be [].
export function loggedInIds() {
  const out = new Set();
  for (const src of [window.g_users, window.g_guests]) {
    try {
      if (!src || typeof src !== "object") {
        continue;
      }
      if (Array.isArray(src)) {
        src.forEach((u) => {
          const id = u && typeof u === "object" ? (u.playerId ?? u.id) : u;
          if (id != null && id !== "") {
            out.add(String(id));
          }
        });
      } else {
        Object.keys(src).forEach((id) => {
          if (/^\d+$/.test(id)) {
            out.add(id);
          }
        });
      }
    } catch {}
  }
  seenAccountIds.forEach((id) => out.add(id));
  return [...out];
}
export let LAST_LIVE = 0; // last time the game server sent something about a game being played
export const playingOnline = () => Date.now() - LAST_LIVE < 5000;

export function startGameSocket() {
  // When you change a tank in the garage the game tells the game server (message 39, "player updated"), which
  // makes everyone else's game redraw your tank with its change animation. If every change was a Color Lab one
  // (only you see it), or nothing changed at all, that announcement is dropped, so other players see nothing happen.
  origSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    if (typeof data === "string" && data.startsWith('{"_typeId":39')) {
      try {
        const m = JSON.parse(data),
          id = String(m.playerId);
        // only let it through when a real (server-side) garage change was made; opening/closing the garage,
        // or changing only Color Lab things, stays invisible to everyone else
        const realChange = garageReal.has(id) || realWriteSeen,
          onlyLocal = garageFake.has(id) && !realChange;
        garageFake.delete(id);
        garageReal.delete(id);
        realWriteSeen = false;
        const snap = garageSnap[id];
        if (!snap) {
          if (onlyLocal) {
            return;
          }
          return origSend.call(this, data);
        } // garage not seen: old rule
        // Ask the game's server what the tank really looks like now: if anything real changed (however it was
        // changed), everyone must hear about it; if not, the announcement is dropped.
        const ws = this;
        (async () => {
          let send = true;
          try {
            const before = await snap,
              now = garageSig(await lookupById(id));
            if (before != null && now != null) {
              send = now !== before;
              garageSnap[id] = Promise.resolve(now);
            }
          } catch {}
          if (send && ws.readyState === 1) {
            origSend.call(ws, data);
          }
        })();
        return;
      } catch {}
    }
    return origSend.call(this, data);
  };
  onmsgDesc = Object.getOwnPropertyDescriptor(WebSocket.prototype, "onmessage");
  if (onmsgDesc && onmsgDesc.set) {
    Object.defineProperty(WebSocket.prototype, "onmessage", {
      configurable: true,
      enumerable: onmsgDesc.enumerable,
      get() {
        return this.__ttOrigHandler !== undefined ? this.__ttOrigHandler : onmsgDesc.get.call(this);
      },
      set(fn) {
        this.__ttOrigHandler = fn;
        if (typeof fn !== "function") {
          liveSockets.delete(this);
          onmsgDesc.set.call(this, fn);
          return;
        }
        liveSockets.add(this);
        if (!this.__ttclAt) {
          this.__ttclAt = Date.now();
        }
        onmsgDesc.set.call(this, function (ev) {
          // An online game's own traffic. The lobby's player counter (28), game list (57) and player updates (39) also
          // arrive during local games, so they don't count.
          if (typeof ev.data !== "string" || /^\{"_typeId":(?:3|4|8|9|10|15|16|22|26|29)[,}]/.test(ev.data)) {
            LAST_LIVE = Date.now();
          }
          // DEV: the lobby's list of this server's games (type 57): only the player IDs are kept, for the staff check
          if (DEV_BUILD && typeof ev.data === "string" && ev.data.length < 2000000) {
            const at = ev.data.indexOf('"_typeId":57');
            if (at >= 0 && at < 30 && /^"_typeId":57[,}\s]/.test(ev.data.slice(at))) {
              try {
                const m = JSON.parse(ev.data);
                if (m && m.result === true && Array.isArray(m.resultData)) {
                  LOBBY_GAMES = {
                    at: Date.now(),
                    ids: [
                      ...new Set(
                        m.resultData
                          .flatMap((g) =>
                            (g && Array.isArray(g.playerStates) ? g.playerStates : []).map((p) =>
                              p && p.playerId != null ? String(p.playerId) : null,
                            ),
                          )
                          .filter(Boolean),
                      ),
                    ],
                  };
                }
              } catch {}
            }
          }
          // Party mode: new colours as soon as a round ends (type 29), so they're ready before the next maze
          if (SETTINGS.party && SETTINGS.on && typeof ev.data === "string" && ev.data.startsWith('{"_typeId":29')) {
            setTimeout(partyRoll, 0);
          }
          // Laika trophies: a tank was destroyed in an online game
          if (typeof ev.data === "string" && /^\{"_typeId":3[,}]/.test(ev.data)) {
            try {
              const k = JSON.parse(ev.data);
              if (k.victimPlayerId != null) {
                onTankKilled(String(k.killerPlayerId), String(k.victimPlayerId), Number(k.deadlyType));
              }
            } catch {}
          }
          // Dimitrium pickups (read before the game removes the collectible)
          if (typeof ev.data === "string" && /^\{"_typeId":8[,}]/.test(ev.data)) {
            try {
              const k = JSON.parse(ev.data);
              if (k.collectibleId != null && k.playerId != null) {
                onCollectibleTaken(k.collectibleId, k.playerId);
              }
            } catch {}
          }
          // Binary game traffic and any text message without tank colours skip straight through, unread.
          if (typeof ev.data === "string" && hasOverrides() && ev.data.includes('Colour"')) {
            try {
              const j = JSON.parse(ev.data);
              if (applyOverrides(j, 0)) {
                ev = new MessageEvent("message", {
                  data: JSON.stringify(j),
                  origin: ev.origin,
                  lastEventId: ev.lastEventId,
                });
              }
            } catch {}
          }
          return fn.call(this, ev);
        });
      },
    });
  }
}
