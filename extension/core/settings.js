import { GX_PAINT, isPat, patId } from "../content/colours.js";
import { CUSTOM_ART, paintLabel } from "../content/custom-boxes.js";
import { MAZE_TILE } from "../content/maze-patterns.js";
import { toCss } from "../content/registries.js";
import { populateBackup, readSupportId } from "./account-sync.js";
import { adminOpen } from "./admin-panel.js";
import { CUSTOM_BOXES, boxAvailable, boxEnabled, getCustomArt } from "./custom-box-art.js";
import { fbRefresh } from "./feedback.js";
import { loggedInIds, refreshSoon, refreshTanks } from "./game-socket.js";
import { selPid } from "./garage.js";
import { renderGarageMaze, renderGarageSearch } from "./garage-search.js";
import {
  SHARED,
  SHARE_SEEN,
  fetchShared,
  flipSrvManual,
  proveTank,
  shareCall,
  shareMine,
  shareMyLooks,
  shareSee,
  shareWatch,
  srvManual,
} from "./look-sharing.js";
import { SET_ITEMS, isShown } from "./maze-tab.js";
import { onlineFetch } from "./online.js";
import { renderPalette, renderSources } from "./palette.js";
import { $, panel, panelHost, toast } from "./panel.js";
import { renderList } from "./saved-looks.js";
import { GUI_POS, SETTINGS, savePos, saveSettings } from "./storage.js";
import { curTab, lastTab, setOpen, showTab } from "./tabs.js";
import { registerRaceNumber } from "./trophy-art.js";
import { tutChoose, whatsNew } from "./tutorial-run.js";
import { checkUpdate, verNewer } from "./updates.js";

// ? shows the tips for whichever tab is open
let helpOpen = false;
export function syncHelp() {
  $("helpPaint").hidden = !(helpOpen && curTab === "paint");
  $("helpSaved").hidden = !(helpOpen && curTab === "saved");
  $("helpBtn").classList.toggle("grey", !helpOpen);
}
const boxDots = {},
  boxDotWait = [],
  boxDotTried = new Set();
export function renderSettings() {
  const row = (host, on, title, sub, fn) => {
    const r = document.createElement("div");
    r.className = "setrow";
    r.innerHTML = '<span class="tog' + (on ? " on" : "") + '"></span><span><span></span><small></small></span>';
    r.children[1].children[0].textContent = title;
    r.children[1].children[1].textContent = sub;
    r.onclick = fn;
    host.appendChild(r);
  };
  for (const id in SET_ITEMS) {
    const host = $(id);
    host.innerHTML = "";
    for (const [k, t, sub] of SET_ITEMS[id]) {
      row(host, isShown(k), t, sub, () => {
        SETTINGS.hide = Object.assign({}, SETTINGS.hide, { [k]: isShown(k) });
        saveSettings();
        applyShown();
        renderSettings();
      });
    }
  }
  {
    const sh = $("setShare");
    sh.innerHTML = "";
    if (DEV_BUILD && (srvManual || !loggedInIds().length)) {
      row(
        sh,
        srvManual,
        "Connect while logged out",
        "Logged out, Color Lab doesn't contact its server. Logging in connects it, or switch this on for this visit",
        () => {
          flipSrvManual();
          renderSettings();
          shareWatch(true);
          if (srvManual) {
            if (shareSee()) {
              fetchShared([...SHARE_SEEN.keys()]);
            }
            fbRefresh(false);
          }
          toast(srvManual ? "Connected" : "Disconnected until you log in");
        },
      );
    }
    row(
      sh,
      shareMine(),
      "Share my look",
      "Other Color Lab users see your logged-in tanks in your Color Lab look",
      () => {
        SETTINGS.shareMine = !shareMine();
        saveSettings();
        renderSettings();
        shareMyLooks(true);
        toast(shareMine() ? "Sharing your look" : "Your look is no longer shared");
      },
    );
    row(
      sh,
      SETTINGS.invisible === true,
      "👻 Invisible",
      "Other Color Lab players don't see you at all: not in the list and not in the online count (the Color Lab team can still see you're connected)",
      () => {
        SETTINGS.invisible = !(SETTINGS.invisible === true);
        saveSettings();
        renderSettings();
        fbRefresh(false);
        setTimeout(() => {
          try {
            onlineFetch();
          } catch {}
        }, 2500);
      },
    );
    if (SETTINGS.invisible !== true) {
      row(
        sh,
        SETTINGS.showOnline === true,
        "Show me as online",
        "Other Color Lab players see your name in the Color Lab box, online or idle. Off: you only count as hidden",
        () => {
          SETTINGS.showOnline = !(SETTINGS.showOnline === true);
          saveSettings();
          renderSettings();
          fbRefresh(false);
          setTimeout(() => {
            try {
              onlineFetch();
            } catch {}
          }, 2500);
        },
      );
    }
    if (SETTINGS.showOnline === true && SETTINGS.invisible !== true) {
      row(
        sh,
        SETTINGS.showServer === true,
        "Show which server I'm on",
        "Adds your TankTrouble server (for example London) next to your name",
        () => {
          SETTINGS.showServer = !(SETTINGS.showServer === true);
          saveSettings();
          renderSettings();
          fbRefresh(false);
          setTimeout(() => {
            try {
              onlineFetch();
            } catch {}
          }, 2500);
        },
      );
    }
    row(
      sh,
      shareSee(),
      "See other players' looks",
      "Tanks of other Color Lab users show their Color Lab look. Their profile has a Real / Color Lab switch",
      () => {
        SETTINGS.shareSee = !shareSee();
        saveSettings();
        renderSettings();
        const ids = Object.keys(SHARED);
        if (shareSee()) {
          fetchShared([...SHARE_SEEN.keys()]);
        } else {
          refreshSoon(ids);
        }
      },
    );
  }
  {
    const sh = $("setShare"); // prove your logged-in tanks are yours (and, in the DEV build, the look server's admin page)
    const r1 = document.createElement("div");
    r1.className = "row setbtns";
    r1.style.cssText = "gap:6px;flex-wrap:wrap;margin-top:4px";
    const pv = document.createElement("button");
    pv.className = "small";
    pv.textContent = "🛡 Prove my tanks are mine";
    pv.title =
      "For a second, moves one of your real paints (or takes one item off) so the look server can see on TankTrouble that the tank is yours, then puts it straight back. Only proven tanks are shared";
    pv.onclick = async () => {
      pv.disabled = true;
      const ids = loggedInIds().filter((id) => /^\d+$/.test(id));
      let ok = 0;
      for (const id of ids) {
        pv.textContent = "Proving " + id + "…";
        if (await proveTank(id)) {
          ok++;
        }
      }
      pv.disabled = false;
      pv.textContent = "🛡 Prove my tanks are mine";
      toast(ok + " of " + ids.length + " tank" + (ids.length === 1 ? "" : "s") + " proven");
      renderSettings();
      shareMyLooks.warned = false;
      shareMyLooks(true);
    };
    r1.append(pv);
    const sid = document.createElement("button");
    sid.className = "small grey";
    sid.textContent = "📋 Copy my support ID";
    sid.title =
      "A short code for this copy of Color Lab. If you need help, paste it in your message so the Color Lab team can find your copy. It can't be used to get into anything";
    sid.onclick = async () => {
      const id = await readSupportId();
      if (!id) {
        toast("Couldn't get it, try again", true);
        return;
      }
      try {
        await navigator.clipboard.writeText(id);
        toast("Copied your support ID: " + id);
      } catch {
        toast("Your support ID: " + id);
      }
    };
    r1.append(sid);
    const pp = document.createElement("button");
    pp.className = "small grey";
    pp.textContent = "🔒 Privacy policy";
    pp.title = "What Color Lab sends, why, and how long it's kept";
    pp.onclick = () =>
      window.open("https://github.com/wazzey/tanktrouble-color-lab/blob/main/PRIVACY.md", "_blank", "noopener");
    r1.append(pp);
    if (DEV_BUILD) {
      const ad = document.createElement("button");
      ad.className = "small grey";
      ad.textContent = "🔧 Admin";
      ad.onclick = () => adminOpen();
      r1.append(ad);
    }
    sh.appendChild(r1);
    const pr = loggedInIds().filter((id) => (SETTINGS.proven || {})[id]);
    const sm = document.createElement("small");
    sm.className = "mzsub";
    sm.style.display = "block";
    sm.textContent = pr.length
      ? "🛡 Proven: " +
        pr.length +
        " of your " +
        loggedInIds().length +
        " tank" +
        (loggedInIds().length === 1 ? "" : "s")
      : "Only proven tanks are shared";
    sh.appendChild(sm);
  }
  populateBackup($("setBackup"), row);
  {
    const sa = $("setAch");
    sa.innerHTML = "";
    row(
      sa,
      SETTINGS.achPopups !== false,
      "Achievement pop-ups",
      "Shows a pop-up when you unlock an achievement. Off: it still unlocks and shows as new in the 🏆 tab",
      () => {
        SETTINGS.achPopups = SETTINGS.achPopups === false;
        saveSettings();
        renderSettings();
      },
    );
  }
  {
    const su = $("setUpd");
    su.innerHTML = "";
    row(
      su,
      SETTINGS.updAuto !== false,
      "Tell me about new versions",
      "Checks now and then (through Color Lab's look server) and shows what's new when there's an update",
      () => {
        SETTINGS.updAuto = SETTINGS.updAuto === false;
        saveSettings();
        renderSettings();
      },
    );
  }
  {
    const ub = $("updBtn3");
    if (ub && !ub.disabled) {
      ub.textContent = SETTINGS.updPending ? "🔔 Update available: " + SETTINGS.updPending : "🔔 Check for updates";
      ub.className = "small" + (SETTINGS.updPending ? "" : " grey");
    }
  } // (a waiting update stays easy to find)
  $("raceNo").value = SETTINGS.raceNo || "";
  const sb = $("setBoxes");
  sb.innerHTML = "";
  boxDotWait.length = 0;
  for (const b of CUSTOM_BOXES.filter(boxAvailable)) {
    const on = boxEnabled(b.id),
      r = document.createElement("div");
    r.className = "setrow boxrow" + (on ? "" : " off");
    r.innerHTML =
      '<span class="tog' + (on ? " on" : "") + '"></span><span class="bname"></span><span class="bprev"></span>';
    r.children[1].textContent = b.name;
    for (const v of (b.paints || []).slice(0, 7)) {
      const d = document.createElement("i");
      d.className = "bdot";
      if (isPat(v) && GX_PAINT[patId(v)]) {
        const k = patId(v),
          t = MAZE_TILE[k] || CUSTOM_ART[k]; // a small piece of the pattern itself
        if (t) {
          if (!boxDots[k]) {
            boxDots[k] = paintLabel(t, 30, 30, false).toDataURL();
          }
          d.style.backgroundImage = "url(" + boxDots[k] + ")";
        } else {
          d.style.background = toCss(v);
          if (!boxDotTried.has(k)) {
            boxDotTried.add(k);
            boxDotWait.push(getCustomArt(k));
          }
        }
      } else {
        d.style.background = toCss(v) || "#888";
      }
      r.children[2].appendChild(d);
    }
    r.title = (on ? "On" : "Off") + " - click to switch " + (on ? "off" : "on");
    r.onclick = () => {
      SETTINGS.boxOff = Object.assign({}, SETTINGS.boxOff, { [b.id]: on });
      if (!SETTINGS.boxOff[b.id]) {
        delete SETTINGS.boxOff[b.id];
      }
      saveSettings();
      renderSettings();
      try {
        renderSources();
        renderPalette();
        const gp = selPid();
        if (gp && document.querySelector(".garage")) {
          refreshTanks([gp], true);
        }
      } catch {}
      /* (an open garage reloads, so Find in garage has the box too) */ toast(
        b.name + (on ? " off" : " on") + " (the garage shows it next time it opens)",
      );
    };
    sb.appendChild(r);
  }
  if (boxDotWait.length && !renderSettings.__again) {
    renderSettings.__again = true;
    Promise.all(boxDotWait.splice(0))
      .catch(() => {})
      .then(() => {
        renderSettings.__again = false;
        if (curTab === "settings") {
          renderSettings();
        }
      });
  } // the pattern previews, once they're drawn
}
export function applyShown() {
  const vis = (el, on) => {
    if (el) {
      el.style.display = on ? "" : "none";
    }
  };
  vis($("rndAll"), isShown("rnd"));
  vis($("rndOpts"), isShown("rnd"));
  if (!isShown("rnd")) {
    $("rndBox").hidden = true;
  } else {
    $("rndBox").hidden = !SETTINGS.rndOpen;
  }
  vis($("party"), isShown("party"));
  const tools = $("rndAll").parentNode;
  vis(
    tools,
    [...tools.children].some((c) => c.style.display !== "none" && !c.hidden),
  );
  $("hexrow")
    .querySelectorAll("input")
    .forEach((i) => vis(i, isShown("hex")));
  vis($("palToggle").parentNode, isShown("swatches"));
  if (!isShown("swatches")) {
    $("swatches").hidden = true;
  }
  // garage
  vis(document.querySelector(".garage form .ttcl-gdice"), isShown("gdice"));
  vis(document.querySelector(".garage form .ttcl-gpower"), isShown("gpower"));
  try {
    renderGarageSearch();
    renderGarageMaze();
  } catch {}
}
// Asks inside the panel (instead of the browser's own pop-up). Resolves true for OK.
export function uiConfirm(title, text, okText, danger) {
  return new Promise((res) => {
    if (!panel.classList.contains("open")) {
      setOpen(true);
    }
    $("mtitle").textContent = title;
    $("mtx").textContent = text;
    $("mYes").textContent = okText || "OK";
    $("mYes").className = "small" + (danger ? " warning" : "");
    const m = $("modal"),
      box = $("mbox");
    m.hidden = false;
    const r = panel.getBoundingClientRect();
    box.style.left = Math.round(r.left + (r.width - 260) / 2) + "px";
    box.style.top = Math.round(r.top + Math.min(r.height / 2 - 60, 160)) + "px";
    const done = (v) => {
      m.hidden = true;
      document.removeEventListener("keydown", key, true);
      res(v);
    };
    const key = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        done(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        done(true);
      }
    };
    document.addEventListener("keydown", key, true);
    $("mYes").onclick = () => done(true);
    $("mNo").onclick = () => done(false);
    m.onclick = (e) => {
      if (e.target === m) {
        done(false);
      }
    };
    $("mYes").focus();
  });
}
const syncRndBox = () => {
  $("rndBox").hidden = !SETTINGS.rndOpen || !isShown("rnd");
  $("rndOpts").classList.toggle("on", !!SETTINGS.rndOpen);
  $("rndOpts").classList.toggle("grey", !SETTINGS.rndOpen);
};

export function keepOnScreen() {
  // Keep the whole panel on screen (it's 326px wide incl. border), not just a corner of it
  const w = (panel.offsetWidth || 326) + 8;
  GUI_POS.x = Math.max(0, Math.min(GUI_POS.x, window.innerWidth - w));
  GUI_POS.y = Math.max(0, Math.min(GUI_POS.y, window.innerHeight - 120));
  if (window.innerHeight - GUI_POS.y < 380) {
    GUI_POS.y = Math.max(0, window.innerHeight - 380);
  } // room for a usable panel below its top
  panelHost.style.left = GUI_POS.x + "px";
  panelHost.style.top = GUI_POS.y + "px";
  panel.style.maxHeight = Math.max(200, window.innerHeight - GUI_POS.y - 10) + "px"; // its bottom never goes off the screen (it scrolls inside instead)
}

let drag = null;
function startDrag(e) {
  if (e.button !== 0 || (e.target.closest && e.target.closest("button"))) {
    return;
  }
  drag = { sx: e.clientX, sy: e.clientY, ox: GUI_POS.x, oy: GUI_POS.y };
  e.preventDefault();
}

export function startSettings() {
  $("raceNo").addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      $("raceNoSet").click();
    }
  });
  $("raceNoSet").onclick = () => {
    const v = $("raceNo").value.trim();
    if (!/^\d{1,3}$/.test(v)) {
      return toast("Type a number from 0 to 999", true);
    }
    SETTINGS.raceNo = String(+v);
    saveSettings();
    registerRaceNumber();
    try {
      renderSources();
      renderPalette();
    } catch {}
    toast("Race Number " + SETTINGS.raceNo + " added to the Racing box");
  };
  $("setBtn").onclick = () => showTab(curTab === "settings" ? lastTab : "settings");
  $("setBack").onclick = () => showTab(lastTab);
  $("tutBtn3").onclick = () => tutChoose(false);
  $("newBtn3").onclick = () => whatsNew(0);
  $("updBtn3").onclick = async () => {
    delete SETTINGS.updSkip;
    delete SETTINGS.updLater;
    const b = $("updBtn3");
    b.disabled = true;
    b.textContent = "Checking…";
    const r = await shareCall({ op: "latest" }).catch(() => null);
    b.disabled = false;
    b.textContent = "🔔 Check for updates";
    if (r && r.store) {
      return toast("The Chrome Web Store keeps Color Lab up to date for you (v" + r.current + ")");
    }
    if (!r || !r.ok || !r.data || !r.data.tag) {
      return toast("Couldn't reach the update check. Try again later", true);
    }
    if (!verNewer(r.data.tag, r.current)) {
      return toast("You have the newest version (v" + r.current + ")");
    }
    setOpen(false);
    checkUpdate(true);
  };
  $("helpBtn").onclick = () => {
    helpOpen = !helpOpen;
    syncHelp();
  };
  $("rndOpts").onclick = () => {
    SETTINGS.rndOpen = !SETTINGS.rndOpen;
    saveSettings();
    syncRndBox();
  };
  syncRndBox();
  for (const n of ["", "2"]) {
    $("tutBtn" + n).onclick = () => {
      helpOpen = false;
      syncHelp();
      tutChoose(false);
    };
    $("newBtn" + n).onclick = () => {
      helpOpen = false;
      syncHelp();
      whatsNew(0);
    };
  }
  $("filter").addEventListener("input", renderList);
  $("hdr").addEventListener("mousedown", startDrag);
  window.addEventListener("mousemove", (e) => {
    if (!drag) {
      return;
    }
    const dx = e.clientX - drag.sx,
      dy = e.clientY - drag.sy;
    GUI_POS.x = drag.ox + dx;
    GUI_POS.y = drag.oy + dy;
    keepOnScreen(); // stops at the screen edges while dragging
  });
  window.addEventListener("mouseup", () => {
    if (!drag) {
      return;
    }
    drag = null;
    keepOnScreen();
    savePos();
  });
  window.addEventListener("resize", () => {
    if (panelHost.isConnected) {
      keepOnScreen();
    }
  });
}
