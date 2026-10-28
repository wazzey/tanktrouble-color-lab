import { post } from "../content/bridge-messages.js";
import { ACC_SLOTS, GX_PAINT, isPat, normHex, patId } from "../content/colours.js";
import { loadImg } from "../content/images.js";
import { TROPHIES, isTrophyVal } from "../content/laika-trophies.js";
import { flatHex, partyColours } from "../content/registries.js";
import { PART_NAMES, drawTankIcon } from "../content/tank-icon.js";
import { tutCard, tutLayer } from "../content/tutorials.js";
import { getAssetMap, loadAccessories, resolvePaint } from "./assets.js";
import { isCustomKey } from "./custom-box-art.js";
import { fbOpen } from "./feedback.js";
import { loggedInIds, lookupById, refreshSoon, refreshTanks, rpc, warmLooks } from "./game-socket.js";
import { laikaSkinFor, laikaSkinOn } from "./laika-look.js";
import { pageKeyNow, pagePal } from "./page.js";
import { toast } from "./panel.js";
import { renderSettings } from "./settings.js";
import { PLAYER_COLOR_MAP, SETTINGS, saveSettings } from "./storage.js";
import { setOpen } from "./tabs.js";
import { tutClose } from "./tutorial-run.js";
import { updateNeeded } from "./updates.js";

// ---------- Shared looks: Color Lab users see each other's looks ----------
// Your logged-in tanks' looks are kept on Color Lab's look server (just the look and the tank's player ID), and the
// looks of tanks you meet are fetched from it, so everyone with Color Lab sees each other's looks. A look you saved
// for a tank yourself always wins over the one its owner shared. All calls go through the extension (bridge.js ->
// background.js); the page never talks to the server itself.
export const SHARED = {},
  NAME_TO_ID = {}; // player ID -> { look (null: none shared), at }; tank names seen -> player ID (for profiles)
export const VIEW_REAL = new Set(); // tanks you switched to their real look on their profile (until the page is refreshed)
export const SHARE_TTL = 5 * 60 * 1000,
  SHARE_TTL_NONE = 2 * 60 * 1000, // (changes arrive live; these checks are only a backup)
  SHARE_SEEN = new Map(); // how long a fetched look is trusted; tanks seen lately (re-checked while you play)
export const shareSee = () => SETTINGS.shareSee !== false,
  shareMine = () => SETTINGS.shareMine !== false;
export function sharedLook(id) {
  if (!shareSee()) {
    return null;
  }
  const s = SHARED[id];
  return s && s.look ? s.look : null;
}
let shareRid = 0;
const shareWait = {};
export let srvManual = false; // logged out fully: Color Lab stays off the look server until someone logs in, or Connect is pressed in ⚙ Settings (this visit only)
export const flipSrvManual = () => {
  srvManual = !srvManual;
};
export const incognito = () => !DEV_BUILD && document.documentElement.dataset.ttclIncog === "1"; // an Incognito window: Color Lab works, but never goes online
export const srvOn = () => {
  try {
    if (SETTINGS.goOffline === true || incognito()) {
      return false;
    }
    /* (the player chose to go offline: nothing is sent to the server) */ if (!DEV_BUILD) {
      return true;
    }
  } catch {
    return true;
  }
  return srvManual || loggedInIds().length > 0;
}; // (DEV build only for now)
export function shareCall(msg) {
  if (msg.op !== "latest" && msg.op !== "announce" && !srvOn()) {
    return Promise.resolve(null);
  } // (the update check and announcements still work: they send nothing about you)
  return new Promise((res) => {
    const rid = ++shareRid;
    shareWait[rid] = res;
    post(Object.assign({ type: "share", rid }, msg));
    setTimeout(() => {
      if (shareWait[rid]) {
        delete shareWait[rid];
        res(null);
      }
    }, 8000);
  });
}
let watchSig = "",
  watchTimer = 0;
export function shareWatch(soon) {
  // tell the extension which tanks are around, so their look changes come straight here
  clearTimeout(watchTimer);
  watchTimer = setTimeout(
    () => {
      if (!shareSee()) {
        return;
      }
      const ids = srvOn() ? [...SHARE_SEEN.keys()].filter((id) => !loggedInIds().includes(id)).slice(-64) : []; // (logged out: the live connection closes)
      const sig = ids.join(",");
      if (sig === watchSig && !soon) {
        post({ type: "share", op: "watch", ids });
        return;
      }
      watchSig = sig;
      post({ type: "share", op: "watch", ids });
    },
    soon ? 300 : 0,
  );
}
function sharedClean(l) {
  // a look from the server, kept to what a look can hold
  if (!l || typeof l !== "object") {
    return null;
  }
  const o = { enabled: true, __shared: true };
  // A look from a newer Color Lab can hold paints or items this copy doesn't have yet: a paint shows as its main colour
  // (sent along as "fb"), an unknown item is left off, so an older copy never shows a broken picture
  const knownPaint = (v) => !isPat(v) || /^\d+$/.test(patId(v)) || !!GX_PAINT[patId(v)],
    knownItem = (v) => {
      const s = String(v);
      if (!isTrophyVal(s)) {
        return /^\d+$/.test(s);
      }
      const k = s.slice(5);
      return isCustomKey(k) || TROPHIES.some((t) => t.key === k);
    };
  for (const p of ["turret", "base", "treads"]) {
    const v = l[p];
    if (typeof v !== "string" || !(isPat(v) || normHex(v))) {
      continue;
    }
    if (knownPaint(v)) {
      o[p] = isPat(v) ? v : normHex(v);
    } else if (l.fb && normHex(l.fb[p])) {
      o[p] = normHex(l.fb[p]);
    }
  }
  if (l.acc && typeof l.acc === "object") {
    o.acc = {};
    for (const [slot] of ACC_SLOTS) {
      if (l.acc[slot] != null && knownItem(l.acc[slot])) {
        o.acc[slot] = String(l.acc[slot]);
      }
    }
  }
  if (l.maze && typeof l.maze === "object") {
    o.maze = {};
    for (const p of ["turret", "base", "treads"]) {
      if (typeof l.maze[p] === "boolean") {
        o.maze[p] = l.maze[p];
      }
    }
  } // (only the three switches)
  if (
    typeof l.bullet === "string" &&
    (l.bullet === "turret" || (isPat(l.bullet) && knownPaint(l.bullet)) || normHex(l.bullet))
  ) {
    o.bullet = l.bullet === "turret" || isPat(l.bullet) ? l.bullet : normHex(l.bullet);
  } // their chosen bullets
  return o.turret || o.base || o.treads || o.bullet || (o.acc && Object.keys(o.acc).length) ? o : null;
}
const shareQueue = new Set();
let shareBatch = null;
export function fetchShared(ids, quiet) {
  // ask the server for these tanks' looks (batched); changed looks are redrawn unless quiet
  if (!shareSee()) {
    return Promise.resolve([]);
  }
  const now = Date.now(),
    fresh = (id) => SHARED[id] && now - SHARED[id].at < (SHARED[id].look ? SHARE_TTL : SHARE_TTL_NONE); // (a tank with no shared look is asked about again sooner: its owner may have just shared one)
  const want = ids.map(String).filter((id) => /^\d{1,12}$/.test(id) && !PLAYER_COLOR_MAP[id] && !fresh(id));
  if (!want.length) {
    return Promise.resolve([]);
  }
  want.forEach((id) => shareQueue.add(id));
  if (!shareBatch) {
    shareBatch = new Promise((res) =>
      setTimeout(async () => {
        const all = [...shareQueue];
        shareQueue.clear();
        shareBatch = null;
        const t = Date.now(),
          changed = [];
        const parts = [];
        for (let i = 0; i < all.length; i += 16) {
          parts.push(all.slice(i, i + 16));
        }
        await Promise.all(
          parts.map(async (part) => {
            const r = await shareCall({ op: "get", ids: part });
            if (!r || !r.ok || !r.data || !r.data.looks) {
              for (const id of part) {
                if (!SHARED[id]) {
                  SHARED[id] = { look: null, at: t };
                }
              }
              return;
            } // server not reachable: asked again a little later
            for (const id of part) {
              const l = r.data.looks[id],
                look = l ? sharedClean(l.look) : null,
                before = JSON.stringify((SHARED[id] && SHARED[id].look) || null);
              SHARED[id] = { look, at: t };
              if (JSON.stringify(look) !== before) {
                changed.push(id);
              }
            }
          }),
        );
        res(changed);
      }, 40),
    );
  }
  return shareBatch.then((changed) => {
    if (!quiet) {
      redrawShared(changed.filter((id) => want.includes(id)));
    }
    return changed;
  });
}
export async function redrawShared(ids) {
  if (!ids.length) {
    return;
  }
  for (const id of ids) {
    try {
      await Promise.race([warmLooks(id), new Promise((r) => setTimeout(r, 1500))]);
    } catch {}
  }
  if (!refreshTanks(ids, false, true)) {
    refreshSoon(ids);
  }
} // (a look its owner changed pops in the way a real change does)
// A tank's profile (the box that opens when you click a tank) gets a Real / Color Lab switch when the tank has a Color Lab
// look (one its owner shared, or one you saved for it). Flicking it redraws the profile's tank straight away, and Real
// shows the tank's real look everywhere until you flick it back (or refresh the page).
function labLookOf(id) {
  const e = PLAYER_COLOR_MAP[id];
  return e ? (e.enabled !== false ? e : null) : sharedLook(id);
}
let profSeq = 0;
async function drawProfileTank(cv, id, real) {
  // the profile's big tank picture, in its real or its Color Lab look
  const seq = ++profSeq;
  try {
    const map = await getAssetMap(),
      d = await lookupById(id);
    if (!d || seq !== profSeq) {
      return;
    }
    const L = real ? null : labLookOf(id);
    const P = {};
    await Promise.all(
      PART_NAMES.map(async (n) => {
        P[n] = map[n] ? await loadImg(map[n]) : null;
      }),
    );
    const pick = (k, field) => (L && L[k]) || d[field] || null;
    const [tc, trc, bc] = await Promise.all([
      resolvePaint(map, pick("turret", "turretColour")),
      resolvePaint(map, pick("treads", "treadColour")),
      resolvePaint(map, pick("base", "baseColour")),
    ]);
    const accSrc = Object.assign({}, d);
    if (L && L.acc) {
      for (const slot in L.acc) {
        if (L.acc[slot] != null) {
          accSrc[slot + "Accessory"] = L.acc[slot];
        }
      }
    }
    const acc = await loadAccessories(map, accSrc);
    if (seq !== profSeq || !cv.isConnected) {
      return;
    }
    drawTankIcon(cv, tc, trc, bc, P, acc);
  } catch {}
}
// Your own look goes up a few seconds after you save it (and comes down if you switch sharing off or remove the look)
let shareUpTimer = 0;
const SHARE_SENT = {},
  SHARE_TIMES = {}; // player ID -> what was last sent
// Proving a tank is yours: the look server picks a small change to the tank's REAL look (one of the paints
// it already wears on another part, or one item taken off), it's made through the game's own garage, the server sees it on
// TankTrouble (only the owner can change a tank), and the tank is put straight back - whatever happens.
export async function proveTank(id) {
  // two steps the server watches on TankTrouble: the change, then putting it back
  const ck = () => shareCall({ op: "vcheck", pid: String(id) }).catch(() => null),
    wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let tries = 0; tries < 2; tries++) {
    const st = await shareCall({ op: "vstart", pid: String(id) }).catch(() => null);
    const c = st && st.ok && st.data;
    if (st && st.data && st.data.error === "guest") {
      guestLocal(id);
      return false;
    }
    if (!c || !c.part) {
      if (st && st.data && st.data.error === "cannot") {
        toast("Tank " + id + ": every paint the same and no items, so it can't be proven yet", true);
      }
      return false;
    }
    const set = (v) =>
      c.kind === "acc"
        ? rpc("garage.setAccessory", [String(id), c.part, String(v)])
        : rpc("garage.setColour", [String(id), c.part, String(v)]);
    let proven = false,
      back = false;
    try {
      await set(c.value); // step 1: the change
      for (let k = 0; k < 5 && !back; k++) {
        await wait(1000);
        const r = await ck();
        back = !!(r && r.ok && r.data && (r.data.step === "back" || r.data.ok));
      }
    } catch {
    } finally {
      // step 2 (and always): put the tank back
      try {
        await set(c.restore);
      } catch {
        try {
          await wait(800);
          await set(c.restore);
        } catch {
          toast("Couldn't put tank " + id + " back: check its " + c.part + " in the garage", true);
        }
      }
    }
    if (back) {
      for (let k = 0; k < 5 && !proven; k++) {
        await wait(1000);
        const r = await ck();
        proven = !!(r && r.ok && r.data && r.data.ok);
      }
    }
    if (proven) {
      SETTINGS.proven = Object.assign({}, SETTINGS.proven, { [String(id)]: Date.now() });
      saveSettings();
      delete SHARE_SENT[String(id)];
      return true;
    }
  }
  return false;
}
// A look is only shared once its tank is proven (so nobody can put a look on someone else's tank). The first time, Color Lab
// asks; after a yes it proves new tanks by itself.
let proveAsking = false;
const GUEST_LOCAL = new Set(); // guest tanks: Color Lab works on your screen only, their looks aren't shared
function guestLocal(id) {
  if (GUEST_LOCAL.has(String(id))) {
    return;
  }
  GUEST_LOCAL.add(String(id));
  toast("Guest tanks use Color Lab on your screen only. Log in to share your look with other players");
}
function needProof(ids) {
  ids = ids.filter((id) => !(SETTINGS.proven || {})[id] && !GUEST_LOCAL.has(String(id)));
  if (!ids.length || proveAsking) {
    return;
  }
  const go = async () => {
    proveAsking = true;
    let ok = 0;
    for (const id of ids) {
      toast("Proving tank " + id + " is yours…");
      if (await proveTank(id)) {
        ok++;
      }
    }
    ids = ids.filter((id) => !GUEST_LOCAL.has(String(id)));
    if (!ids.length) {
      proveAsking = false;
      return;
    } // (guests: already told they stay on your screen)
    proveAsking = false;
    toast(
      ok === ids.length
        ? ok === 1
          ? "Tank proven yours: your look is shared"
          : "Tanks proven yours: your looks are shared"
        : "Couldn't prove " +
            (ids.length - ok) +
            " tank" +
            (ids.length - ok === 1 ? "" : "s") +
            ". Try again from ⚙ Settings > Look sharing",
      ok !== ids.length,
    );
    if (ok) {
      shareMyLooks.warned = false;
      shareMyLooks(true);
    }
    try {
      renderSettings();
    } catch {}
  };
  if (SETTINGS.proveOk) {
    return go();
  }
  if (Date.now() < (SETTINGS.proveLater || 0)) {
    return;
  }
  proveAsking = true;
  const L = tutLayer();
  tutCard(
    L,
    '<h3>Prove your tank is yours 🛡</h3><p style="font-size:13px;line-height:1.5;margin:4px 0 6px">To stop people putting fake looks on other players\' tanks, your Color Lab look is only shared once you prove the tank is yours. You only do this once per tank.</p>' +
      '<p style="font-size:12px;line-height:1.5;color:#aaa;margin:0">How: Color Lab changes one thing on your <b>real</b> tank for about a second (it moves one of the paints you already wear to another part, or takes one item off), the look server sees the change on TankTrouble, and your tank is put straight back. Nothing is bought or lost.</p>',
    [
      [
        "🛡 Prove now",
        "go",
        () => {
          tutClose();
          SETTINGS.proveOk = true;
          saveSettings();
          proveAsking = false;
          go();
        },
      ],
      [
        "Not now",
        "alt",
        () => {
          tutClose();
          SETTINGS.proveLater = Date.now() + 24 * 3600 * 1000;
          saveSettings();
          proveAsking = false;
        },
      ],
    ],
    true,
  );
}
export function shareMyLooks(force) {
  clearTimeout(shareUpTimer);
  shareUpTimer = setTimeout(
    async () => {
      const proof = [];
      for (const id of loggedInIds()) {
        if (!/^\d{1,12}$/.test(String(id))) {
          continue;
        }
        const e = PLAYER_COLOR_MAP[id],
          on = shareMine() && e && e.enabled !== false,
          bul = shareMine() && SETTINGS.myBullet ? SETTINGS.myBullet : undefined; // (your bullets, from 🗺 Maze > Your bullets)
        const look =
          on || bul
            ? {
                turret: (on && e.turret) || undefined,
                base: (on && e.base) || undefined,
                treads: (on && e.treads) || undefined,
                acc: (on && e.acc) || undefined,
                maze: (on && e.maze) || undefined,
                bullet: bul,
              }
            : null;
        if (look) {
          const fb = {};
          for (const p of ["turret", "base", "treads"]) {
            if (isPat(look[p])) {
              fb[p] = flatHex(look[p]);
            }
          }
          if (Object.keys(fb).length) {
            look.fb = fb;
          }
        } // (each pattern's main colour, for copies without that paint)
        const sig = JSON.stringify(look);
        if (!force && SHARE_SENT[id] === sig) {
          continue;
        }
        if (!look && SHARE_SENT[id] === undefined && !force) {
          SHARE_SENT[id] = sig;
          continue;
        } // nothing to take down
        {
          const now = Date.now(),
            t = (SHARE_TIMES[id] = (SHARE_TIMES[id] || []).filter((x) => now - x < 60000)); // (clicking 🎲 over and over: at most 6 uploads a minute a tank; the newest look goes up when the minute is over)
          if (t.length >= 6) {
            clearTimeout(shareMyLooks.later);
            shareMyLooks.later = setTimeout(() => shareMyLooks(), 60000 - (now - t[0]) + 300);
            continue;
          }
          t.push(now);
        }
        const r = await shareCall(look ? { op: "put", pid: String(id), look } : { op: "delete", pid: String(id) });
        if (r && r.ok) {
          SHARE_SENT[id] = sig;
        } else if (r && r.status === 429) {
          setTimeout(() => shareMyLooks(), r.data && r.data.error === "too fast" ? 1200 : 60000);
          return;
        } // (saved twice within a second: the server wants a moment, so the latest look goes up just after)
        else if (r && r.status === 403 && /guest/.test(String((r.data && r.data.error) || ""))) {
          SHARE_SENT[id] = sig;
          guestLocal(id);
        } // (a guest: its look stays on your screen)
        else if (r && r.status === 403 && /prove|owned/.test(String((r.data && r.data.error) || ""))) {
          proof.push(String(id));
        } // (not proven yet, or someone else shared it first: proving it fixes both)
        else if (r && r.status === 403 && !shareMyLooks.warned) {
          shareMyLooks.warned = true;
          const err = String((r.data && r.data.error) || ""),
            many = /too many/.test(err),
            burst = /at once/.test(err);
          try {
            toast(
              /hidden/.test(err)
                ? "This tank's shared look was hidden after other players reported it"
                : /not allowed/.test(err)
                  ? "Look sharing is blocked: " +
                    (String(err).replace(/^not allowed:?\s*/, "") || "the server refused this copy")
                  : burst
                    ? "Lots of new tanks at once: the rest will be shared in a few minutes"
                    : many
                      ? "Too many new tanks shared from here today, so this one wasn't shared. It will be tomorrow"
                      : err
                        ? "Your look wasn't shared: " + err
                        : "This tank's shared look belongs to another copy of Color Lab, so yours wasn't shared",
              true,
            );
          } catch {}
          if (burst) {
            setTimeout(() => {
              shareMyLooks.warned = false;
              shareMyLooks();
            }, 11 * 60000);
            return;
          }
        } // (added a lot of tanks in a row: the rest are shared in a few minutes)
      }
      if (proof.length) {
        needProof(proof);
      }
    },
    force ? 500 : 500,
  );
}
export function getOverride(id, now) {
  if (!SETTINGS.on) {
    return null;
  }
  if (VIEW_REAL.has(String(id))) {
    return null;
  } // you switched this tank to its real look (its profile's Real button)
  if (SETTINGS.party && partyColours[id]) {
    return partyColours[id];
  }
  const e = PLAYER_COLOR_MAP[id];
  if (e) {
    return e.enabled !== false ? e : laikaSkinFor(id, now);
  } // (Laika in a Color Lab map wears its skin unless you gave her a look)
  return sharedLook(String(id)) || laikaSkinFor(id, now); // the look its owner shared (when they use Color Lab too)
}
export function hasOverrides() {
  if (!SETTINGS.on) {
    return false;
  }
  if (shareSee()) {
    return true;
  }
  if (SETTINGS.party) {
    for (const _ in partyColours) {
      return true;
    }
  }
  if (laikaSkinOn()) {
    return true;
  }
  for (const id in PLAYER_COLOR_MAP) {
    if (PLAYER_COLOR_MAP[id].enabled !== false) {
      return true;
    }
  }
  return false;
}

export function startLookSharing() {
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.__ttcl !== true || d.dir !== "toPage") {
      return;
    }
    if (d.type === "shareRes") {
      const f = shareWait[d.rid];
      if (f) {
        delete shareWait[d.rid];
        f(d.res || null);
      }
      if (d.res && d.res.status === 426) {
        setTimeout(() => updateNeeded(d.res.data && d.res.data.min), 0);
      }
    } else if (d.type === "shareLive" && shareSee()) {
      // a watched tank's owner just saved a new look: it pops in straight away
      const id = String(d.pid),
        look = sharedClean(d.look),
        before = JSON.stringify((SHARED[id] && SHARED[id].look) || null);
      SHARED[id] = { look, at: Date.now() };
      if (!PLAYER_COLOR_MAP[id] && JSON.stringify(look) !== before) {
        redrawShared([id]);
      }
    }
  });
  setInterval(() => {
    // while you play, the looks of tanks around you are checked again now and then, so a change shows up by itself
    if (!shareSee() || document.hidden) {
      return;
    }
    const now = Date.now(),
      ids = [];
    for (const [id, at] of SHARE_SEEN) {
      if (now - at > 10 * 60 * 1000) {
        SHARE_SEEN.delete(id);
      } else {
        ids.push(id);
      }
    }
    if (ids.length) {
      fetchShared(ids);
    }
    shareWatch(); // (also wakes the extension's live connection if the browser put it to sleep)
  }, 15 * 1000);
  setInterval(() => {
    const box = document.getElementById("tankinfo");
    let bar = document.getElementById("ttcl-lookswitch");
    const name =
      box && box.getClientRects().length
        ? (box.querySelector(".username stroked-text") || {}).getAttribute?.("text")
        : null;
    const id = name ? NAME_TO_ID[name] : null;
    if (!id || !SETTINGS.on || !labLookOf(id)) {
      if (bar) {
        bar.remove();
      }
      return;
    }
    if (!bar || bar.dataset.pid !== id) {
      if (bar) {
        bar.remove();
      } // a Real / Color Lab switch in the card, styled like the game's own buttons
      const OUT = "color:#fff;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000";
      bar = document.createElement("div");
      bar.id = "ttcl-lookswitch";
      bar.dataset.pid = id;
      bar.style.cssText = "margin:8px auto 2px;user-select:none;text-align:center";
      bar.innerHTML =
        '<div style="display:inline-flex;border-radius:7px;overflow:hidden;box-shadow:0 2px 0 rgba(0,0,0,.45),0 0 0 2px rgba(0,0,0,.55)">' +
        ["real", "lab"]
          .map(
            (k) =>
              '<span data-k="' +
              k +
              '" style="cursor:pointer;padding:4px 11px;font:15px TankTrouble,Arial;' +
              OUT +
              '">' +
              (k === "real" ? "Real" : "Color Lab") +
              "</span>",
          )
          .join("") +
        "</div>" +
        '<div class="ttcl-info" style="font:12px Arial;margin-top:5px;' +
        OUT +
        '"></div>';
      bar.title =
        (PLAYER_COLOR_MAP[id] ? "The look you saved for this tank" : "The Color Lab look its owner shared") +
        ", or its real look";
      bar.querySelectorAll("[data-k]").forEach(
        (el) =>
          (el.onclick = (ev) => {
            ev.stopPropagation();
            const pid = bar.dataset.pid,
              real = el.dataset.k === "real";
            if (real === VIEW_REAL.has(pid)) {
              return;
            }
            if (real) {
              VIEW_REAL.add(pid);
            } else {
              VIEW_REAL.delete(pid);
            }
            const cv = box.querySelector("canvas.icon");
            if (cv) {
              drawProfileTank(cv, pid, real);
            }
            try {
              refreshTanks([pid]);
            } catch {}
            refreshSoon([pid]);
          }),
      );
      if (!PLAYER_COLOR_MAP[id] && !loggedInIds().includes(id)) {
        // a look another player shared: report it (2 clicks) or tell Color Lab about it
        const row = document.createElement("div");
        row.style.cssText = "display:flex;justify-content:center;gap:10px;margin-top:6px";
        const ic = (t, tip, bg) => {
          const b = document.createElement("span");
          b.textContent = t;
          b.title = tip;
          b.style.cssText =
            "cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;font:15px Arial;color:#fff;background:" +
            bg +
            ";box-shadow:0 2px 0 rgba(0,0,0,.45),0 0 0 2px rgba(0,0,0,.5)";
          return b;
        };
        const rp = ic(
          "⚑",
          "Report this shared look (for example if it was put on someone else's tank)",
          "linear-gradient(#e0474f,#8f1219)",
        );
        rp.onclick = async (ev) => {
          ev.stopPropagation();
          const pid = bar.dataset.pid;
          if (rp.dataset.sure !== "1") {
            // (asks first: a report can't be taken back)
            if (row.querySelector(".ttclRq")) {
              return;
            }
            const q = document.createElement("div");
            q.className = "ttclRq";
            q.style.cssText = "flex-basis:100%;font:12px Arial;text-align:center;margin-top:4px";
            q.innerHTML =
              'Report this shared look? <button class="small" data-a="y">Report</button> <button class="small grey" data-a="n">Cancel</button>';
            q.onclick = (e2) => {
              e2.stopPropagation();
              const a2 = e2.target.closest("button");
              if (!a2) {
                return;
              }
              q.remove();
              if (a2.dataset.a === "y") {
                rp.dataset.sure = "1";
                rp.onclick(ev);
              }
            };
            row.style.flexWrap = "wrap";
            row.appendChild(q);
            return;
          }
          rp.textContent = "…";
          const r = await shareCall({ op: "report", pid }).catch(() => null);
          rp.textContent = r && r.ok ? "✓" : "✕";
          rp.title = r && r.ok ? "Reported" : "Couldn't report";
          rp.style.cursor = "default";
          rp.onclick = (e) => e.stopPropagation();
          if (r && r.ok) {
            VIEW_REAL.add(pid);
            const cv = box.querySelector("canvas.icon");
            if (cv) {
              drawProfileTank(cv, pid, true);
            }
            try {
              refreshTanks([pid]);
            } catch {}
            refreshSoon([pid]);
          }
        }; // (and you see its real look from now on)
        const tl = ic("✉", "Tell Color Lab about this tank (with a screenshot)", "linear-gradient(#427fff,#0014ab)");
        tl.onclick = (ev) => {
          ev.stopPropagation();
          try {
            setOpen(true);
            fbOpen(bar.dataset.pid);
          } catch {}
        };
        row.append(rp, tl);
        bar.appendChild(row);
      }
      (box.querySelector(".content") || box).appendChild(bar);
    }
    const real = VIEW_REAL.has(id),
      P = pageKeyNow ? pagePal(pageKeyNow) : null,
      on = P ? "linear-gradient(" + P.pBtnTop + "," + P.pBtnBot + ")" : "linear-gradient(#427fff,#0014ab)";
    for (const l of bar.querySelectorAll("[data-k]")) {
      const act = (l.dataset.k === "real") === real;
      l.style.background = act ? on : "rgba(40,40,44,.85)";
      l.style.opacity = act ? "1" : ".7";
    }
    const inf = bar.querySelector(".ttcl-info");
    if (inf) {
      let t = "";
      try {
        const c = window.__ttclWhere ? window.__ttclWhere(id) : null;
        if (c) {
          t =
            (c.on
              ? (c.away ? "🔵 Away" : c.idle ? "🟡 Idle" : "🟢 Online") +
                ((c.away || c.idle) && c.qmins != null ? " " + c.qmins + " min" : "") +
                (c.wh === "game"
                  ? " · in a game"
                  : c.wh === "queue"
                    ? " · in a queue"
                    : c.wh === "lobby"
                      ? " · in the lobby"
                      : "")
              : "⚪ Seen " + c.ago) + (c.srv ? " · " + c.srv : "");
        }
      } catch {}
      if (inf.textContent !== t) {
        inf.textContent = t;
      }
      inf.style.display = t ? "" : "none";
    } // (the author's DEV copy: where this player is)
  }, 250);
}
