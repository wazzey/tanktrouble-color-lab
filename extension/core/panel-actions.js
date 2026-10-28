import { post } from "../content/bridge-messages.js";
import { normVal, partyColours } from "../content/registries.js";
import { loggedInIds, refreshTanks, removedIds } from "./game-socket.js";
import { syncGarageButton } from "./garage-search.js";
import { shareMyLooks } from "./look-sharing.js";
import { renderPalette } from "./palette.js";
import { $, PARTS, formAcc, getForm, panel, panelHost, partRows, setStatus, toast } from "./panel.js";
import { clearForm, expanded, renderList, resolveName, updateSaveLabel } from "./saved-looks.js";
import { uiConfirm } from "./settings.js";
import {
  COLOR_HISTORY,
  PLAYER_COLOR_MAP,
  SETTINGS,
  hasLook,
  normEntry,
  presetSig,
  saveSettings,
  saveToStorage,
  syncActive,
  trimHistory,
  wipeSavedLooks,
} from "./storage.js";
import { setOpen } from "./tabs.js";

export const MAX_PRESETS = 10;
export async function saveForm(saveAsNew) {
  const btn = $("save"),
    st = $("saveStatus");
  const bad = PARTS.find(([k]) => partRows[k].txt.value.trim() && !normVal(partRows[k].txt.value));
  if (bad) {
    return setStatus(st, `✗ ${bad[1]} isn't a valid hex or pattern`, "err");
  }
  btn.disabled = true;
  btn.textContent = "Saving…";
  setStatus(st, "");
  const p = await resolveName();
  btn.disabled = false;
  updateSaveLabel();
  if (!p) {
    return setStatus(st, "✗ Couldn't find that tank", "err");
  }
  const f = getForm();
  const acc = Object.keys(formAcc).length ? Object.assign({}, formAcc) : null;
  if (!f.turret && !f.base && !f.treads && !acc) {
    return setStatus(st, "✗ Pick a colour or accessory first", "err");
  }
  const e =
    PLAYER_COLOR_MAP[p.playerId] ||
    (PLAYER_COLOR_MAP[p.playerId] = normEntry({ nickname: p.username, playerName: p.username }));
  e.playerName = p.username;
  const cols = { turret: f.turret, base: f.base, treads: f.treads, acc, maze: f.maze };
  const dup = e.presets.find((q) => hasLook(q) && presetSig(q) === presetSig(cols));
  if (dup && (saveAsNew || dup === e.presets[e.active])) {
    updateSaveLabel();
    return setStatus(
      st,
      dup === e.presets[e.active] && !saveAsNew
        ? "✓ Already saved: change something to save again"
        : `✗ Already saved as "${dup.name}"`,
      dup === e.presets[e.active] && !saveAsNew ? "" : "err",
    );
  }
  if (saveAsNew && hasLook(e.presets[e.active]) && e.presets.length >= MAX_PRESETS) {
    return setStatus(st, `✗ Up to ${MAX_PRESETS} presets per tank: delete one first (Saved tab)`, "err");
  }
  if (saveAsNew && hasLook(e.presets[e.active])) {
    e.presets.push(Object.assign({ name: "Preset " + (e.presets.length + 1) }, cols));
    e.active = e.presets.length - 1;
    expanded.add(p.playerId);
  } else {
    Object.assign(e.presets[e.active], cols);
  }
  e.enabled = true;
  syncActive(e);
  updateSaveLabel();
  [f.turret, f.base, f.treads].forEach((c) => {
    if (c) {
      const i = COLOR_HISTORY.indexOf(c);
      if (i > -1) {
        COLOR_HISTORY.splice(i, 1);
      }
      COLOR_HISTORY.unshift(c);
    }
  });
  trimHistory();
  saveToStorage();
  renderPalette();
  renderList();
  removedIds.delete(p.playerId);
  setStatus(st, "");
  applyNow([p.playerId], (saveAsNew ? "New preset for " : "Applied to ") + p.username);
}

// Push changes into the running game; fall back to offering a reload if no game connection exists yet.
export function applyNow(ids, okMsg) {
  if (refreshTanks(ids) > 0) {
    $("reload").classList.remove("show");
    toast(okMsg);
    return true;
  }
  $("reload").classList.add("show");
  toast("Not connected to the game yet — reload to apply", true);
  return false;
}
function refreshAll() {
  const ids = [...new Set([...Object.keys(PLAYER_COLOR_MAP), ...removedIds, ...Object.keys(partyColours)])];
  if (!ids.length) {
    return toast("No custom tanks to refresh", true);
  }
  if (applyNow(ids, `Refreshed ${ids.length} tank${ids.length > 1 ? "s" : ""}`)) {
    removedIds.clear();
  }
}
// Alt+V: refresh only the logged-in tanks (accounts + guests) that have custom colours saved,
// or whose custom colours were just removed (so they go back to their real colours).
export function refreshLoggedIn() {
  const loggedIn = loggedInIds();
  if (!loggedIn.length) {
    return toast("No logged-in tanks on this page", true);
  }
  const ids = loggedIn.filter((id) => PLAYER_COLOR_MAP[id] || removedIds.has(id) || partyColours[id]);
  if (!ids.length) {
    return toast("None of your logged-in tanks have custom colours", true);
  }
  const names = ids.map(
    (id) => (PLAYER_COLOR_MAP[id] && (PLAYER_COLOR_MAP[id].nickname || PLAYER_COLOR_MAP[id].playerName)) || id,
  );
  if (applyNow(ids, "Refreshed " + (names.length <= 2 ? names.join(" & ") : names.length + " tanks"))) {
    ids.forEach((id) => removedIds.delete(id));
  }
}
export function syncPower() {
  $("power").classList.toggle("on", SETTINGS.on);
  $("power").classList.toggle("grey", !SETTINGS.on);
  $("paused").hidden = SETTINGS.on;
  const gb = document.querySelector(".garage form button.ttcl-garage");
  if (gb) {
    syncGarageButton(gb);
  }
}

// Backup file: Export saves everything the extension keeps; Import adds a file's tanks and looks to what's here
let exportWait = null,
  importWait = null;

export function startPanelActions() {
  $("addPreset").onclick = () => saveForm(true);
  $("reload").onclick = () => location.reload();
  $("refresh").onclick = (e) => {
    if (e && e.shiftKey) {
      return refreshAll();
    }
    refreshLoggedIn();
    try {
      shareMyLooks();
    } catch {}
  }; // (your logged-in tanks, and checks they're shared; Shift-click redraws every custom tank)
  $("power").onclick = () => {
    SETTINGS.on = !SETTINGS.on;
    saveSettings();
    syncPower();
    const ids = [...new Set([...Object.keys(PLAYER_COLOR_MAP), ...Object.keys(partyColours)])];
    if (ids.length) {
      applyNow(ids, SETTINGS.on ? "Custom colours on" : "Custom colours paused");
    } else {
      toast(SETTINGS.on ? "Custom colours on" : "Custom colours paused");
    }
  };
  // Shortcuts check the physical key (e.code), not the typed letter: on a Mac, Option+V types "√" and Option+C "ç".
  // Alt/Option+C here is a fallback for when the browser hasn't assigned the extension's own Alt+C shortcut
  // (when it has, the browser takes the key first and this never sees it).
  document.addEventListener(
    "keydown",
    (e) => {
      if (!(e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.code === "KeyV" || e.code === "KeyC"))) {
        return;
      }
      const a = document.activeElement,
        tag = ((a && a.tagName) || "").toLowerCase();
      if (a && a !== panelHost && (a.isContentEditable || tag === "input" || tag === "textarea")) {
        return;
      } // typing in game chat
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "KeyV") {
        refreshLoggedIn();
      } else {
        setOpen(!panel.classList.contains("open"));
      }
    },
    true,
  );
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.__ttcl !== true || d.dir !== "toPage") {
      return;
    }
    if (d.type === "exported" && exportWait) {
      exportWait(d.data);
      exportWait = null;
    } else if (d.type === "imported" && importWait) {
      importWait(d.ok);
      importWait = null;
    }
  });
  $("exportBtn").onclick = () => {
    exportWait = (data) => {
      const blob = new Blob(
        [JSON.stringify({ app: "TankTrouble Color Lab", version: 1, saved: new Date().toISOString(), data }, null, 1)],
        { type: "application/json" },
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "color-lab-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast("Backup saved to your downloads");
    };
    post({ type: "export" });
  };
  $("importBtn").onclick = () => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json,application/json";
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) {
        return;
      }
      f.text()
        .then((t) => {
          const j = JSON.parse(t);
          const data = j && j.app === "TankTrouble Color Lab" ? j.data : null;
          if (!data || typeof data !== "object") {
            throw new Error("not a Color Lab backup");
          }
          const n = Object.keys(data.tt_custom_colors || {}).length;
          uiConfirm(
            "Import backup",
            "Add " +
              n +
              " saved tank" +
              (n === 1 ? "" : "s") +
              " and the settings from this backup? The page reloads after.",
            "Import",
          ).then((go) => {
            if (!go) {
              return;
            }
            importWait = (ok) => {
              if (ok) {
                toast("Backup loaded, reloading…");
                setTimeout(() => location.reload(), 700);
              } else {
                toast("Couldn't load that backup", true);
              }
            };
            post({ type: "import", items: data });
          });
        })
        .catch(() => toast("That isn't a Color Lab backup file", true));
    };
    inp.click();
  };
  $("wipe").onclick = () =>
    uiConfirm(
      "Wipe all data",
      "Delete ALL saved tanks, presets and recent colours? This can't be undone (Export a backup first if you might want them).",
      "Wipe all",
      true,
    ).then((ok) => {
      if (!ok) {
        return;
      }
      const ids = Object.keys(PLAYER_COLOR_MAP);
      wipeSavedLooks();
      saveToStorage();
      clearForm();
      renderPalette();
      renderList();
      if (ids.length) {
        applyNow(ids, "All data wiped");
      } else {
        toast("All data wiped");
      }
    });
}
