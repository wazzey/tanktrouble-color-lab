import { TROPHIES } from "../content/laika-trophies.js";
import { collectBoxes } from "./accessories.js";
import { DEV_TROPHIES, h2StatsCheck } from "./achievements.js";
import { fbRefresh } from "./feedback.js";
import { loggedInIds } from "./game-socket.js";
import { renderMazeTab } from "./maze-tab.js";
import { renderPalette, renderSources } from "./palette.js";
import { $, freePreviewMemory, panel, panelHost, refreshRealLabels, schedulePreview, toast } from "./panel.js";
import { syncPower } from "./panel-actions.js";
import { syncDev, syncParty } from "./random.js";
import { renderList, updateSaveLabel } from "./saved-looks.js";
import { applyShown, keepOnScreen, renderSettings, syncHelp } from "./settings.js";
import { STATS, saveStats } from "./storage.js";
import { TROPHY_ART, getTrophyArt } from "./trophy-art.js";
import { unlockTrophy } from "./trophy-counting.js";

// ---------- open/close + dragging ----------
// The panel only exists on the page while open (toolbar icon / Alt+C). Closing removes it and frees
// the preview's artwork, so nothing sits over the game. Colour overrides keep working regardless.
export function setOpen(open) {
  panel.classList.toggle("open", open);
  if (open) {
    if (document.body && !panelHost.isConnected) {
      document.body.appendChild(panelHost);
    }
    renderSources();
    renderPalette();
    renderList();
    refreshRealLabels();
    schedulePreview();
    keepOnScreen();
    syncPower();
    syncParty();
    syncDev();
    updateSaveLabel();
    applyShown();
    loggedInIds().forEach(collectBoxes);
  } else {
    panelHost.remove();
    freePreviewMemory();
  }
}
export function showTab(t) {
  if (t === "settings") {
    setTimeout(() => {
      try {
        fbRefresh(true);
      } catch {}
    }, 300);
  } // (opening Settings marks replies as read)
  $("panePaint").hidden = t !== "paint";
  $("paneSaved").hidden = t !== "saved";
  $("paneSet").hidden = t !== "settings";
  $("paneMaze").hidden = t !== "maze";
  $("paneAch").hidden = t !== "ach";
  $("tabPaint").classList.toggle("on", t === "paint");
  $("tabSaved").classList.toggle("on", t === "saved");
  $("tabMaze").classList.toggle("on", t === "maze");
  $("tabAch").classList.toggle("on", t === "ach");
  if (t === "maze") {
    renderMazeTab();
  }
  if (t === "ach") {
    renderAch();
  }
  $("setBtn").classList.toggle("on", t === "settings");
  $("setBtn").classList.toggle("grey", t !== "settings");
  if (t === "saved") {
    renderList();
  }
  if (t === "settings") {
    renderSettings();
  }
  if (t !== "settings") {
    lastTab = t;
  }
  curTab = t;
  syncHelp();
}
export let lastTab = "paint";
// 🏆 every Color Lab achievement: earned ones with their reward, the rest locked but shown with how to get them
const achArtTried = new Set();
export function renderAch() {
  const host = $("achBody");
  if (!host) {
    return;
  }
  host.innerHTML = "";
  const ids = loggedInIds(),
    earnedBy = (t) => {
      for (const pid in STATS.unlocked) {
        if (STATS.unlocked[pid] && STATS.unlocked[pid][t.id]) {
          return pid;
        }
      }
      return null;
    };
  const all = TROPHIES.filter((t) => !(t.ach && t.ach.retired) || earnedBy(t)),
    got = all.filter(earnedBy); // (retired achievements only show for those who earned them)
  const hd = document.createElement("div");
  hd.className = "achhd";
  hd.innerHTML = '<b></b><small class="mzsub"></small>';
  hd.children[0].textContent = "Achievements: " + got.length + " of " + all.length;
  hd.children[1].textContent = "Rewards appear in the garage";
  host.appendChild(hd);
  const bar = document.createElement("div");
  bar.className = "achbar";
  bar.innerHTML = "<i></i>";
  bar.firstChild.style.width = Math.round((got.length / all.length) * 100) + "%";
  host.appendChild(bar);
  const groups = [
    ["Laika and weapons", all.filter((t) => t.kind !== "hall")],
    ["Lifetime", all.filter((t) => t.ach && t.ach.kind === "stat")],
    ["In the round", all.filter((t) => t.ach && t.ach.kind === "event")],
    ["Just for fun", all.filter((t) => t.ach && t.ach.kind === "fun")],
  ];
  const want = [];
  for (const [title, list] of groups) {
    const sec = document.createElement("div");
    sec.className = "mzsec";
    sec.innerHTML = '<div class="sublbl"></div>';
    sec.firstChild.textContent = title + " (" + list.filter(earnedBy).length + "/" + list.length + ")";
    host.appendChild(sec);
    for (const t of list) {
      const who = earnedBy(t),
        r = document.createElement("div");
      r.className = "achrow" + (who ? "" : " locked");
      const art = TROPHY_ART && TROPHY_ART[t.key];
      if (who && art && art.icon) {
        const im = document.createElement("img");
        im.src = art.icon;
        r.appendChild(im);
      } else {
        const q = document.createElement("span");
        q.className = "achq";
        q.textContent = who ? "…" : "🔒";
        r.appendChild(q);
        if (who) {
          want.push(t.key);
        }
      }
      const tx = document.createElement("span");
      tx.className = "achtx";
      tx.innerHTML = "<b></b><span></span>";
      tx.children[0].textContent = t.name;
      tx.children[1].textContent = t.text;
      r.appendChild(tx);
      if (DEV_TROPHIES) {
        const b = document.createElement("button");
        b.className = "small grey";
        b.textContent = who ? "Lock" : "Test";
        b.title = who
          ? "Lock it again (preview tools)"
          : "Unlock for your first logged-in tank and show the pop-up (preview tools)";
        b.onclick = (e) => {
          e.stopPropagation();
          const id = ids[0];
          if (!id) {
            return toast("Log in or play as a guest first", true);
          }
          if (who) {
            delete STATS.unlocked[who][t.id];
            saveStats();
          } else {
            unlockTrophy(id, t, true);
          }
          renderAch();
          try {
            renderSources();
            renderPalette();
          } catch {}
        };
        r.appendChild(b);
      }
      host.appendChild(r);
    }
  }
  if (DEV_TROPHIES) {
    const dv = document.createElement("div");
    dv.className = "mzseg";
    dv.style.marginTop = "6px";
    const mk = (label, title, fn) => {
      const b = document.createElement("button");
      b.className = "small grey";
      b.textContent = label;
      b.title = title;
      b.onclick = fn;
      dv.appendChild(b);
    };
    mk("Unlock all", "Unlock every Hall of Fame achievement for your first tank (no pop-ups)", () => {
      const id = ids[0];
      if (!id) {
        return toast("Log in first", true);
      }
      const u = STATS.unlocked[id] || (STATS.unlocked[id] = {});
      for (const t of all) {
        if (t.kind === "hall") {
          u[t.id] = Date.now();
        }
      }
      saveStats();
      renderAch();
      try {
        renderSources();
        renderPalette();
      } catch {}
    });
    mk("Lock Hall of Fame", "Lock every Hall of Fame achievement again and clear its counters", () => {
      for (const pid in STATS.unlocked) {
        for (const t of all) {
          if (t.kind === "hall") {
            delete STATS.unlocked[pid][t.id];
          }
        }
      }
      STATS.h2 = {};
      saveStats();
      renderAch();
      try {
        renderSources();
        renderPalette();
      } catch {}
    });
    mk("Check stats now", "Read your account numbers now (Gold Hoarder, Centurion, Warlord...)", () => {
      h2StatsCheck(true).then(() => {
        renderAch();
        toast("Stats checked");
      });
    });
    mk("Show stats", "Print the counters to the console", () => {
      console.log("[Color Lab] Hall of Fame", JSON.parse(JSON.stringify(STATS.h2 || {})));
      toast("Counters printed to the console (F12)");
    });
    host.appendChild(dv);
  }
  const fresh = want.filter((k) => !achArtTried.has(k)); // (each picture asked for once, so a missing one can't loop)
  if (fresh.length && !renderAch.__wait) {
    fresh.forEach((k) => achArtTried.add(k));
    renderAch.__wait = true;
    getTrophyArt(fresh)
      .catch(() => {})
      .then(() => {
        renderAch.__wait = false;
        if (curTab === "ach") {
          renderAch();
        }
      });
  }
}
export let curTab = "paint";

export function startTabs() {
  $("close").onclick = () => setOpen(false);
  $("tabPaint").onclick = () => showTab("paint");
  $("tabSaved").onclick = () => showTab("saved");
  $("tabMaze").onclick = () => showTab("maze");
  $("tabAch").onclick = () => showTab("ach");
  $("palToggle").onclick = () => {
    const p = $("swatches");
    p.hidden = !p.hidden;
    $("palToggle").textContent = p.hidden ? "Swatches ▸" : "Swatches ▾";
    if (!p.hidden) {
      renderSources();
      renderPalette();
      const on = $("swTabs").querySelector(".on");
      if (on) {
        on.scrollIntoView({ block: "nearest", inline: "center" });
      }
    }
  };
}
