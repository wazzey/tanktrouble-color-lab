import { PAGE_GAMES } from "../content/page-themes.js";
import { tutCard, tutLayer } from "../content/tutorials.js";
import { fbRefresh } from "./feedback.js";
import { loggedInIds, playingOnline } from "./game-socket.js";
import { SHARE_SEEN, fetchShared, shareCall, shareMyLooks, shareSee, shareWatch, srvOn } from "./look-sharing.js";
import { $ } from "./panel.js";
import { renderSettings } from "./settings.js";
import { SETTINGS, saveSettings, whenStorage } from "./storage.js";
import { tutClose } from "./tutorial-run.js";
import { checkUpdate } from "./updates.js";

let lastInput;
let bgSince;
export function isIdle() {
  return document.hidden || Date.now() - lastInput > 5 * 60000;
}
// where the player is: in an online game, in a queue, or in the lobby (a local game counts as the lobby)
export function ttWhere() {
  let w = "lobby";
  for (const g of [...PAGE_GAMES]) {
    try {
      if (!g || !g.state || !g.world) {
        continue;
      }
      const st = g.state.current;
      if (st === "Game" && playingOnline()) {
        return "game";
      }
      if (st === "Lobby" && w === "lobby") {
        let q = false;
        const walk = (o, d) => {
          if (q || !o || d > 9) {
            return;
          }
          if (
            typeof o.text === "string" &&
            o.visible !== false &&
            o.alive !== false &&
            /^(leave( queue)?|leave the queue|cancel( queue)?|unqueue|queued|in queue)$/i.test(o.text.trim())
          ) {
            q = true;
          }
          const ch = o.children;
          if (ch) {
            for (const c of ch) {
              walk(c, d + 1);
            }
          }
        };
        walk(g.world, 0);
        if (q) {
          w = "queue";
        }
      }
    } catch {}
  }
  return w;
}
const bgNow = () => document.hidden || !document.hasFocus();
export function isAway() {
  return !!bgSince && bgNow() && Date.now() - bgSince > 3 * 60000 && ttWhere() === "lobby";
}
export function quietFor() {
  const now = Date.now();
  if (isAway()) {
    return Math.round((now - bgSince) / 60000);
  }
  if (!isIdle()) {
    return 0;
  }
  return Math.round((now - (document.hidden && bgSince ? Math.min(bgSince, lastInput) : lastInput)) / 60000);
} // (minutes idle or away: shown to the owner)
// Moving to the Chrome Web Store: a copy installed from a zip (Load unpacked) offers it once the store page exists (the
// server only gives the address once the listing is live). Looks, presets, settings and achievements come along: the new
// copy restores them from this browser's backup. Later = tomorrow; Don't show again = never.
async function storeMove() {
  if (SETTINGS.storeMoveOff || (SETTINGS.storeLater && Date.now() < SETTINGS.storeLater)) {
    return;
  }
  const r = await shareCall({ op: "store" }).catch(() => null),
    url = r && r.ok && r.data && r.data.url;
  if (!url || r.store || !/^https:\/\/chromewebstore\.google\.com\/detail\/[\w-]+\/[a-p]{32}$/.test(url)) {
    return;
  } // (not live yet, or already the store copy)
  if (document.getElementById("ttcl-tut")) {
    setTimeout(storeMove, 60 * 1000);
    return;
  } // (not over a tutorial or notes: a minute later)
  const L = tutLayer();
  tutCard(
    L,
    '<h3>Color Lab is on the Chrome Web Store 🎉</h3><p style="font-size:13px;margin:2px 0 6px">Get it from the store and it <b>updates by itself</b>. Your saved looks, presets, settings and achievements come with you (in this browser).</p>' +
      '<ol style="font-size:13px;margin:4px 0 6px 18px;padding:0;line-height:1.5"><li><b>⬇ Export a backup</b> first, just in case (button below)</li><li>Remove this copy: <b>chrome://extensions</b> → Color Lab → <b>Remove</b></li><li>Add Color Lab from the store, then reload TankTrouble</li><li>To share your look again, prove your tanks once more (a one-second flash)</li></ol>' +
      '<p style="font-size:12px;color:#aaa;margin:4px 0 0">Keep both copies? Only one should be on at a time, or tanks get painted twice.</p>',
    [
      [
        "🛒 Open the Web Store",
        "go",
        () => {
          window.open(url, "_blank", "noopener");
          tutClose();
        },
      ],
      [
        "⬇ Export backup",
        "alt",
        () => {
          try {
            $("exportBtn").click();
          } catch {}
        },
      ],
      [
        "Later",
        "alt",
        () => {
          SETTINGS.storeLater = Date.now() + 24 * 3600 * 1000;
          saveSettings();
          tutClose();
        },
      ],
      [
        "Don't show again",
        "alt",
        () => {
          SETTINGS.storeMoveOff = true;
          saveSettings();
          tutClose();
        },
      ],
    ],
    true,
  );
}

export function startPresence() {
  // away from the game: the tab is hidden, or no mouse or key input for 5 minutes (shown as "idle" to the Color Lab owner)
  lastInput = Date.now();
  for (const ev of ["mousemove", "mousedown", "keydown", "wheel", "touchstart"]) {
    addEventListener(
      ev,
      () => {
        lastInput = Date.now();
      },
      { passive: true, capture: true },
    );
  }
  // away: in the lobby (not in a game or a queue) with the tab in the background for 3 minutes. Other players see an away copy as offline;
  // back on the tab, it's online again straight away. In a game or a queue a player never goes away (at most idle)
  bgSince = document.hidden || !document.hasFocus() ? Date.now() : 0;
  for (const ev of ["blur", "visibilitychange", "focus"]) {
    addEventListener(
      ev,
      () => {
        const bg = bgNow();
        if (bg && !bgSince) {
          bgSince = Date.now();
        } else if (!bg) {
          bgSince = 0;
        }
      },
      true,
    );
  }
  document.addEventListener("visibilitychange", () => {
    const bg = bgNow();
    if (bg && !bgSince) {
      bgSince = Date.now();
    } else if (!bg) {
      bgSince = 0;
    }
  });
  {
    let lastIds = null,
      lastIdle = null,
      srvWas = false;
    setInterval(() => {
      try {
        const ids = loggedInIds().map(String).sort().join(","),
          idle = isIdle() + "|" + isAway() + "|" + ttWhere();
        if ((lastIds !== null && ids !== lastIds) || (lastIdle !== null && idle !== lastIdle)) {
          fbRefresh(false);
        }
        if (lastIds !== null && ids !== lastIds && ids) {
          try {
            shareMyLooks();
          } catch {}
        } // (logged into another account without reloading: its look is shared, or its proof asked for, now)
        const on = srvOn();
        if (on !== srvWas) {
          srvWas = on;
          shareWatch(true);
          if (on && shareSee()) {
            fetchShared([...SHARE_SEEN.keys()]);
          }
          try {
            renderSettings();
          } catch {}
        } // logged in (connects) or fully out (disconnects)
        lastIds = ids;
        lastIdle = idle;
      } catch {}
    }, 4000);
  } // (log in or out, or go idle / come back: the server hears straight away) // (log in or out: the server hears straight away, not at the next 5-minute check)
  setTimeout(() => {
    try {
      whenStorage().then(() => fbRefresh(false));
    } catch {}
  }, 12000);
  setInterval(
    () => {
      try {
        fbRefresh(false);
      } catch {}
    },
    5 * 60 * 1000,
  ); // (replies to your messages, every few minutes)
  setTimeout(() => {
    try {
      whenStorage().then(() => storeMove());
    } catch {}
  }, 20000);
  setInterval(
    () => {
      try {
        storeMove();
      } catch {}
    },
    6 * 3600 * 1000,
  );
  setTimeout(() => {
    try {
      whenStorage().then(() => checkUpdate());
    } catch {}
  }, 8000);
  setInterval(() => {
    try {
      checkUpdate();
    } catch {}
  }, 3600 * 1000);
}
