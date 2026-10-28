import { ACC_SLOTS, GX_PAINT, isPat, patId } from "../content/colours.js";
import { showVal, toCss } from "../content/registries.js";
import { collectBoxes, renderAccs } from "./accessories.js";
import { gxPaintIcon } from "./custom-box-art.js";
import { loggedInIds, lookupById, lookupByName, refreshTanks, removedIds } from "./game-socket.js";
import { lightUrl } from "./palette.js";
import {
  $,
  PARTS,
  formAcc,
  getForm,
  iconMap,
  nameEl,
  partRows,
  realVal,
  refreshRealLabels,
  schedulePreview,
  setForm,
  setFormAcc,
  setPart,
  setStatus,
  whoEl,
} from "./panel.js";
import { applyNow } from "./panel-actions.js";
import { uiConfirm } from "./settings.js";
import { PLAYER_COLOR_MAP, hasLook, presetSig, saveToStorage, syncActive } from "./storage.js";
import { showTab } from "./tabs.js";

export let resolved = null; // {playerId, username, data} — data is the tank's REAL details from the server

export function renderList() {
  const list = $("list");
  list.innerHTML = "";
  const all = Object.keys(PLAYER_COLOR_MAP);
  $("savedCount").textContent = all.length;
  $("filter").hidden = all.length <= 6; // search only once the list gets long
  if (!all.length) {
    list.innerHTML = '<div class="empty">No tanks saved yet.</div>';
    return;
  }
  const q = $("filter").hidden ? "" : $("filter").value.trim().toLowerCase();
  const ids = q
    ? all.filter((id) =>
        `${PLAYER_COLOR_MAP[id].nickname || ""} ${PLAYER_COLOR_MAP[id].playerName || ""}`.toLowerCase().includes(q),
      )
    : all;
  if (!ids.length) {
    list.innerHTML = '<div class="empty">No matches.</div>';
    return;
  }
  ids.forEach((id) => {
    const d = PLAYER_COLOR_MAP[id];
    const a = document.createElement("div");
    a.className = "acc" + (resolved && resolved.playerId === id ? " cur" : "") + (d.enabled === false ? " off" : "");
    const tog = document.createElement("span");
    tog.className = "tog" + (d.enabled !== false ? " on" : "");
    tog.title = "Colours on / off for this tank";
    tog.onclick = (e) => {
      e.stopPropagation();
      d.enabled = d.enabled === false;
      saveToStorage();
      renderList();
      applyNow([id], (d.nickname || d.playerName) + (d.enabled ? " on" : " off"));
    };
    const dots = document.createElement("div");
    dots.className = "dots";
    ["turret", "base", "treads"].forEach((k) => {
      const i = document.createElement("i"),
        v = d[k],
        pu = isPat(v) && (GX_PAINT[patId(v)] ? gxPaintIcon(patId(v)) : iconMap && iconMap["icon" + patId(v)]);
      i.style.background = pu ? `url(${lightUrl(pu)}) center/cover` : toCss(v) || "transparent";
      i.title = k + (isPat(v) ? ": " + showVal(v) : "");
      dots.appendChild(i);
    });
    const nm = document.createElement("div");
    nm.className = "nm";
    nm.textContent = d.nickname || d.playerName || id;
    if (d.playerName && d.nickname && d.nickname !== d.playerName) {
      const sm = document.createElement("small");
      sm.textContent = d.playerName;
      nm.appendChild(sm);
    }
    const del = document.createElement("button");
    del.className = "small warning del";
    del.title = "Remove";
    del.textContent = "✕";
    del.onclick = (e) => {
      e.stopPropagation();
      uiConfirm(
        "Remove tank",
        `Remove the custom look for "${d.nickname || d.playerName || id}"? Its presets go too.`,
        "Remove",
        true,
      ).then((ok) => {
        if (!ok) {
          return;
        }
        delete PLAYER_COLOR_MAP[id];
        saveToStorage();
        removedIds.add(id);
        if (resolved && resolved.playerId === id) {
          clearForm();
        }
        renderList();
        applyNow([id], "Removed");
      });
    };
    nm.title = "Click to paint · double-click to rename";
    nm.ondblclick = (e) => {
      e.stopPropagation();
      clearTimeout(a._open);
      const inp = document.createElement("input");
      inp.type = "text";
      inp.value = d.nickname || d.playerName || "";
      nm.textContent = "";
      nm.appendChild(inp);
      inp.focus();
      inp.select();
      let done = false;
      const finish = (keep) => {
        if (done) {
          return;
        }
        done = true;
        if (keep) {
          d.nickname = inp.value.trim() || d.playerName;
          saveToStorage();
        }
        renderList();
      };
      inp.onkeydown = (ev) => {
        if (ev.key === "Enter") {
          finish(true);
        } else if (ev.key === "Escape") {
          finish(false);
        }
      };
      inp.onblur = () => finish(true);
      inp.onclick = (ev) => ev.stopPropagation();
    };
    const extra = d.presets.length - 1;
    const more = document.createElement("button");
    more.className = "small grey more2";
    more.hidden = extra < 1;
    more.textContent = (expanded.has(id) ? "−" : "+") + extra;
    more.title = "Other presets for this tank";
    more.onclick = (e) => {
      e.stopPropagation();
      expanded.has(id) ? expanded.delete(id) : expanded.add(id);
      renderList();
    };
    a.append(tog, dots, nm, more, del);
    // single click opens it in Paint (after a beat, so a double-click can rename instead)
    a.onclick = (e) => {
      if (e.detail > 1) {
        return;
      }
      clearTimeout(a._open);
      a._open = setTimeout(() => {
        openSaved(id);
        showTab("paint");
      }, 230);
    };
    list.appendChild(a);
    if (extra > 0 && expanded.has(id)) {
      list.appendChild(renderPresets(id, d));
    }
  });
}
export const expanded = new Set();
function renderPresets(id, d) {
  const box = document.createElement("div");
  box.className = "presets";
  d.presets.forEach((p, i) => {
    const r = document.createElement("div");
    r.className = "preset" + (i === d.active ? " act" : "");
    const radio = document.createElement("span");
    radio.className = "radio";
    const dots = document.createElement("div");
    dots.className = "dots";
    ["turret", "base", "treads"].forEach((k) => {
      const x = document.createElement("i");
      x.style.background = toCss(p[k]) || "transparent";
      dots.appendChild(x);
    });
    const pn = document.createElement("span");
    pn.className = "pn";
    pn.textContent = p.name;
    pn.title = "Click to use · double-click to rename";
    const del = document.createElement("button");
    del.className = "small warning del";
    del.textContent = "✕";
    del.title = "Delete this preset";
    del.onclick = (e) => {
      e.stopPropagation();
      uiConfirm("Delete preset", `Delete the preset "${p.name}"?`, "Delete", true).then((ok) => {
        if (!ok) {
          return;
        }
        d.presets.splice(i, 1);
        if (d.active >= d.presets.length || d.active === i) {
          d.active = 0;
        } else if (d.active > i) {
          d.active--;
        }
        syncActive(d);
        saveToStorage();
        afterPresetChange(id, d);
      });
    };
    r.onclick = (e) => {
      if (e.detail > 1) {
        return;
      }
      clearTimeout(r._t);
      r._t = setTimeout(() => {
        d.active = i;
        syncActive(d);
        saveToStorage();
        afterPresetChange(id, d, `Using ${p.name}`);
      }, 230);
    };
    pn.ondblclick = (e) => {
      e.stopPropagation();
      clearTimeout(r._t);
      const inp = document.createElement("input");
      inp.type = "text";
      inp.value = p.name;
      pn.textContent = "";
      pn.appendChild(inp);
      inp.focus();
      inp.select();
      let done = false;
      const finish = (keep) => {
        if (done) {
          return;
        }
        done = true;
        if (keep && inp.value.trim()) {
          p.name = inp.value.trim();
          saveToStorage();
        }
        renderList();
      };
      inp.onkeydown = (ev) => {
        if (ev.key === "Enter") {
          finish(true);
        } else if (ev.key === "Escape") {
          finish(false);
        }
      };
      inp.onblur = () => finish(true);
      inp.onclick = (ev) => ev.stopPropagation();
    };
    r.append(radio, dots, pn);
    if (d.presets.length > 1) {
      r.appendChild(del);
    }
    box.appendChild(r);
  });
  return box;
}
export function afterPresetChange(id, d, msg) {
  renderList();
  updateSaveLabel();
  if (resolved && resolved.playerId === id) {
    setForm(d);
    schedulePreview();
  }
  if (msg) {
    applyNow([id], msg);
  } else {
    refreshTanks([id]);
  }
}
// Save button names the preset it writes to, once a tank has more than one
// Save is greyed out ("✓ Saved") while the form matches the look already saved and on the tank; + Preset is greyed
// out while the form matches any saved preset, so the same look can't be saved twice. Change anything and both come back.
function formLook() {
  const f = getForm();
  return {
    turret: f.turret,
    base: f.base,
    treads: f.treads,
    acc: Object.keys(formAcc).length ? formAcc : null,
    maze: f.maze,
  };
}
export function updateSaveLabel() {
  const d = resolved && PLAYER_COLOR_MAP[resolved.playerId],
    s = $("save"),
    a = $("addPreset");
  if (!s || s.textContent === "Saving…") {
    return;
  }
  const f = formLook(),
    sig = presetSig(f),
    cur = d && d.presets[d.active],
    named = d && d.presets.length > 1 ? " · " + cur.name : "";
  const same = !!(cur && hasLook(cur) && presetSig(cur) === sig),
    dup = d && d.presets.find((p) => hasLook(p) && presetSig(p) === sig);
  s.textContent = (same ? "✓ Saved" : "Save") + named;
  s.disabled = same;
  s.title = same
    ? "This look is saved and on the tank. Change something to save again."
    : "Save this look" + (named ? ' over the preset "' + cur.name + '"' : "") + " and put it on the tank";
  if (a) {
    a.disabled = !!dup || !hasLook(f);
    a.title = dup
      ? 'Already saved as "' + dup.name + '". Change something to save it as a new preset.'
      : !hasLook(f)
        ? "Pick a colour or item first"
        : "Save this look as an extra preset for this tank (the one you have stays as it is)";
  }
}

async function setResolved(data) {
  resolved = { playerId: String(data.playerId), username: String(data.username), data };
  nameEl.value = resolved.username;
  nameEl.classList.add("good");
  nameEl.classList.remove("bad");
  setStatus(whoEl, ""); // the green outline says it's found
  refreshRealLabels();
  renderList();
  schedulePreview();
  updateSaveLabel();
  renderAccs();
  collectBoxes(resolved.playerId);
}

async function openSaved(id) {
  const d = PLAYER_COLOR_MAP[id];
  if (!d) {
    return;
  }
  setForm(d);
  resolved = { playerId: id, username: d.playerName || id, data: null };
  nameEl.value = resolved.username;
  setStatus(whoEl, "Loading tank…");
  renderList();
  schedulePreview();
  try {
    await setResolved(await lookupById(id));
  } catch {
    setStatus(whoEl, "✓ " + resolved.username, "ok");
  }
}

export function clearForm() {
  resolved = null;
  nameEl.value = "";
  nameEl.classList.remove("good", "bad");
  setForm(null);
  refreshRealLabels();
  setStatus(whoEl, "");
  schedulePreview();
  updateSaveLabel();
}

export async function resolveName() {
  const n = nameEl.value.trim();
  if (!n) {
    setStatus(whoEl, "Type a tank name first", "err");
    return null;
  }
  if (resolved && resolved.data && resolved.username.toLowerCase() === n.toLowerCase()) {
    return resolved;
  }
  setStatus(whoEl, "Looking up…");
  try {
    const data = await lookupByName(n);
    await setResolved(data);
    const saved = PLAYER_COLOR_MAP[resolved.playerId];
    if (saved && !PARTS.some(([k]) => partRows[k].txt.value.trim())) {
      setForm(saved);
      schedulePreview();
    }
    return resolved;
  } catch (e) {
    resolved = null;
    nameEl.classList.add("bad");
    nameEl.classList.remove("good");
    refreshRealLabels();
    schedulePreview();
    setStatus(whoEl, "✗ " + (e && e.message ? e.message : "Not found"), "err");
    return null;
  }
}

export function startSavedLooks() {
  nameEl.addEventListener("input", () => {
    nameEl.classList.remove("good", "bad");
    if (resolved && resolved.username.toLowerCase() !== nameEl.value.trim().toLowerCase()) {
      resolved = null;
      setStatus(whoEl, "");
      refreshRealLabels();
      renderList();
      schedulePreview();
      updateSaveLabel();
    }
  });
  nameEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      resolveName();
    }
  });
  $("find").onclick = resolveName;

  $("me").onclick = async () => {
    const ids = loggedInIds();
    if (!ids.length) {
      return setStatus(whoEl, "✗ No tanks on this page yet — add a tank or guest first, or type the name", "err");
    }
    const cur = resolved ? ids.indexOf(resolved.playerId) : -1;
    const id = ids[(cur + 1) % ids.length]; // press again to cycle through multiple logged-in tanks
    setStatus(whoEl, "Finding your tank…");
    try {
      await setResolved(await lookupById(id));
      const saved = PLAYER_COLOR_MAP[id];
      setForm(saved || null);
      if (ids.length > 1) {
        setStatus(
          whoEl,
          `✓ ${resolved.username}  (${ids.indexOf(id) + 1}/${ids.length} — press Me again for the next tank)`,
          "ok",
        );
      }
      schedulePreview();
    } catch (e) {
      setStatus(whoEl, "✗ " + ((e && e.message) || "Lookup failed"), "err");
    }
  };

  $("copyReal").onclick = () => {
    if (!resolved || !resolved.data) {
      return setStatus(whoEl, "Find a tank first", "err");
    }
    PARTS.forEach(([k, , field]) => setPart(k, realVal(field)));
    const real = {};
    ACC_SLOTS.forEach(([slot]) => {
      const v = resolved.data[slot + "Accessory"];
      if (v != null) {
        real[slot] = String(v);
      }
    });
    setFormAcc(real);
    schedulePreview();
  };
  $("clearAll").onclick = () => {
    setForm(null);
    schedulePreview();
  };
}
