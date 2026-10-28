import { noteRealGarageChange } from "../content/garage-folders.js";
import { isTrophyVal } from "../content/laika-trophies.js";
import { trophyUsable } from "./achievements.js";
import { customUsable, isCustomKey } from "./custom-box-art.js";
import { trophyAccValue } from "./draw-swap.js";
import { noteRealWrite, refreshSoon, warmLooks } from "./game-socket.js";
import { garageWrite } from "./garage.js";
import { garageAllOn, hatTutorial, noteTutorials, rewriteGarage } from "./garage-boxes.js";
import { LOOKS_SEEN } from "./laika-look.js";
import {
  NAME_TO_ID,
  SHARED,
  SHARE_SEEN,
  fetchShared,
  getOverride,
  hasOverrides,
  redrawShared,
  shareMyLooks,
  shareSee,
  shareWatch,
} from "./look-sharing.js";
import { PLAYER_COLOR_MAP, mkColour, seenEarly, storageLoaded, warmedIds, whenStorage } from "./storage.js";
import { achievementCall, attachPendingUnlocks, noteAIs, pendingUnlocks } from "./trophy-counting.js";

export let origFetch;
const isAjax = (input) => {
  try {
    const u = new URL(typeof input === "string" ? input : input.url, location.href);
    return u.origin === location.origin && u.pathname === "/ajax/";
  } catch {
    return false;
  }
};
// Walk a response and recolour every player-details object we have saved colours for.
export function applyOverrides(node, depth) {
  if (!node || typeof node !== "object" || depth > 8) {
    return false;
  }
  let changed = false;
  if (Array.isArray(node)) {
    for (const x of node) {
      changed = applyOverrides(x, depth + 1) || changed;
    }
    return changed;
  }
  if (node.playerId != null && ("turretColour" in node || "baseColour" in node || "treadColour" in node)) {
    if (/^\d{1,12}$/.test(String(node.playerId))) {
      if (!SHARE_SEEN.has(String(node.playerId))) {
        try {
          shareWatch(true);
        } catch {}
      }
      SHARE_SEEN.set(String(node.playerId), Date.now());
      if (typeof node.username === "string" && node.username) {
        NAME_TO_ID[node.username] = String(node.playerId);
      }
    }
    const c = getOverride(String(node.playerId));
    try {
      const rv = (x) => (x && typeof x === "object" ? x.rawValue : x);
      const ov = c || {};
      LOOKS_SEEN[String(node.playerId)] = [
        ov.turret || rv(node.turretColour),
        ov.base || rv(node.baseColour),
        ov.treads || rv(node.treadColour),
      ].join("|");
    } catch {}
    if (c) {
      if (c.turret) {
        node.turretColour = mkColour(c.turret);
        changed = true;
      }
      if (c.base) {
        node.baseColour = mkColour(c.base);
        changed = true;
      }
      if (c.treads) {
        node.treadColour = mkColour(c.treads);
        changed = true;
      }
      if (c.acc) {
        for (const slot in c.acc) {
          if (c.acc[slot] != null && slot + "Accessory" in node) {
            if (
              slot === "turret" &&
              hatTutorial(String(node.playerId)) &&
              (String(c.acc[slot]) === "3" || String(node.turretAccessory) === "3")
            ) {
              continue;
            } // see hatTutorial
            let val = String(c.acc[slot]);
            if (isTrophyVal(val)) {
              const k = val.slice(5);
              val = c.__shared || (isCustomKey(k) ? customUsable(k) : trophyUsable(k)) ? trophyAccValue(k) : null;
              if (!val) {
                continue;
              }
            } // (a shared look shows its owner's items, unlocked by you or not)
            node[slot + "Accessory"] = val;
            changed = true;
          }
        }
      }
    }
  }
  for (const k in node) {
    if (node[k] && typeof node[k] === "object") {
      changed = applyOverrides(node[k], depth + 1) || changed;
    }
  }
  return changed;
}
// Tanks added after page load (new guests, logins) never reach g_users/g_guests, so pick them up here.
export const seenAccountIds = new Set();
function collectIds(node, depth) {
  if (!node || typeof node !== "object" || depth > 6) {
    return;
  }
  if (node.playerId != null && /^\d+$/.test(String(node.playerId))) {
    seenAccountIds.add(String(node.playerId));
  }
  for (const k in node) {
    if (/^\d+$/.test(k) && node[k] && typeof node[k] === "object" && "multiplayerToken" in node[k]) {
      seenAccountIds.add(k);
    }
    if (node[k] && typeof node[k] === "object") {
      collectIds(node[k], depth + 1);
    }
  }
}

export function startNetwork() {
  // ---------- network layer: intercept the game's JSON-RPC ----------
  origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const ajax = isAjax(input);
    const body = ajax && init && typeof init.body === "string" ? init.body : "";
    // In-game garage (only these three calls; checked by plain string search)
    if (body.includes('"tanktrouble.garage.')) {
      if (body.includes("garage.getGarageContent")) {
        return origFetch(input, init).then(rewriteGarage);
      }
      if (/"tanktrouble\.garage\.set(Colour|Accessory)"/.test(body)) {
        let bp = null;
        try {
          bp = String(JSON.parse(body).params[0]);
        } catch {}
        if (garageAllOn(bp)) {
          const fake = garageWrite(body);
          if (fake) {
            return Promise.resolve(fake);
          } // an item you don't own: saved locally, never sent
        } else {
          noteRealGarageChange(body);
        } // Real mode: always a real change, so other players must hear about it
      }
    }
    if (body.includes('"tanktrouble.achievement.')) {
      const r = achievementCall(body, input, init);
      if (r) {
        return r;
      }
    }
    // any other call that changes something real (buying, renaming...) also lets the next "player updated" through
    {
      const mm = body && /"method"\s*:\s*"tanktrouble\.([\w.]+)"/.exec(body);
      if (mm && !/(^|\.)get/i.test(mm[1])) {
        noteRealWrite();
      }
    }
    const p = origFetch(input, init);
    if (!ajax) {
      return p;
    }
    if (body.includes('"tanktrouble.getAIs"')) {
      return p.then(async (res) => {
        try {
          const j = JSON.parse(await res.clone().text());
          noteAIs(j && j.result && j.result.data);
        } catch {}
        return res;
      });
    }
    if (body.includes('"tanktrouble.getTutorialProgress"')) {
      return p.then(async (res) => {
        try {
          const j = JSON.parse(await res.clone().text());
          noteTutorials(j && j.result && j.result.data);
        } catch {}
        return res;
      });
    }
    // Cheap string checks on the request body (no parsing). Only player-details replies carry tank colours;
    // every other request — and everything before saved data has loaded — passes straight through, never waiting.
    const isAccount = /"tanktrouble\.account\.(createGuests|authenticate|signUp|signUpGuest)"/.test(body);
    const isDetails = body.includes("getPlayerDetails");
    if (!isAccount && !isDetails && pendingUnlocks.length) {
      return p.then(attachPendingUnlocks);
    }
    if (isDetails && !storageLoaded) {
      return whenStorage().then(() => (storageLoaded && hasOverrides() ? p.then(rewriteDetails) : p));
    } // the game asked before your looks arrived: wait for them (tens of ms) so it never shows the real tank first
    if (isDetails && !storageLoaded) {
      try {
        const m = /getPlayerDetails"[^[]*\[\s*"?(\d+)/.exec(body);
        if (m) {
          seenEarly.add(m[1]);
        }
      } catch {}
    } // drawn before your saved looks arrived: redrawn once they have
    if (!isAccount && !(isDetails && storageLoaded && hasOverrides())) {
      return p;
    }
    return p.then(rewriteDetails);
    async function rewriteDetails(res) {
      try {
        const text = await res.clone().text();
        const json = JSON.parse(text);
        if (isAccount) {
          // a tank just logged in. The game keeps the tank details that come with the login (it doesn't ask again),
          // so your Color Lab look goes in here too, with its paints and items ready first, or the real tank shows until a refresh
          const fresh = [];
          try {
            const before = new Set(seenAccountIds);
            collectIds(json.result && json.result.data, 0);
            for (const id of seenAccountIds) {
              if (!before.has(id) && PLAYER_COLOR_MAP[id]) {
                fresh.push(id);
              }
            }
          } catch {}
          if (!storageLoaded || !hasOverrides() || !applyOverrides(json, 0)) {
            fresh.forEach((id) => warmLooks(id));
            if (fresh.length) {
              refreshSoon(fresh);
            }
            return res;
          }
          try {
            await Promise.race([
              Promise.all(
                fresh.map((id) => {
                  warmedIds.add(id);
                  return warmLooks(id);
                }),
              ),
              new Promise((r) => setTimeout(r, 1500)),
            ]);
          } catch {}
          if (fresh.length) {
            refreshSoon(fresh);
          } // (and once more after the game has settled, in case it drew from an older copy)
          try {
            shareMyLooks();
          } catch {}
          const headers = new Headers(res.headers);
          headers.delete("content-encoding");
          headers.delete("content-length");
          return new Response(JSON.stringify(json), { status: res.status, statusText: res.statusText, headers });
        }
        if (isDetails && shareSee()) {
          try {
            const m = /getPlayerDetails"[^[]*\[\s*"?(\d+)/.exec(body),
              id = m && m[1];
            if (id && !PLAYER_COLOR_MAP[id] && !SHARED[id]) {
              let late = false; // first time this tank is seen: wait a moment for its shared look
              const f = fetchShared([id], true).then((ch) => {
                if (late && ch.includes(id)) {
                  redrawShared([id]);
                }
              });
              await Promise.race([
                f,
                new Promise((r) =>
                  setTimeout(() => {
                    late = true;
                    r();
                  }, 1200),
                ),
              ]);
            }
          } catch {}
        }
        if (!applyOverrides(json, 0)) {
          return res;
        }
        try {
          const m = /getPlayerDetails"[^[]*\[\s*"?(\d+)/.exec(body);
          if (m && !warmedIds.has(m[1])) {
            warmedIds.add(m[1]);
            await Promise.race([warmLooks(m[1]), new Promise((r) => setTimeout(r, 1500))]);
          }
        } catch {} // its Color Lab pictures ready before the game draws it (saved pictures: a few ms), so it isn't drawn without them and redrawn
        const headers = new Headers(res.headers);
        headers.delete("content-encoding");
        headers.delete("content-length");
        return new Response(JSON.stringify(json), { status: res.status, statusText: res.statusText, headers });
      } catch {
        return res;
      }
    }
  };

  // ---------- achievement reveal fix ----------
  // The game's reveal shakes the locked picture, then pops in the unlocked one. Where the locked picture has see-through
  // parts, the unlocked one could show through it during the shake. Keep it hidden while the locked one is still there.
  (function addRevealFix() {
    const st = document.createElement("style");
    st.textContent = "achievement-reveal:has(img.locked) img.unlocked{opacity:0!important}";
    const add = () => {
      const root = document.head || document.documentElement;
      if (root) {
        root.appendChild(st);
      } else {
        setTimeout(add, 50);
      }
    };
    add();
  })();
}
