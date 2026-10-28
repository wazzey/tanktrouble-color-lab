import { ACC_SLOTS, GX_PAINT, boxLabel, isPat, patId } from "../content/colours.js";
import { CUSTOM_BOX_IDS, GARAGE_PICS, placeGarageSearch, renderBoxNav } from "../content/garage-folders.js";
import { GAME_NAMES, RESTYLE_ITEMS, normVal, showVal, toCss } from "../content/registries.js";
import { tutCard, tutLayer } from "../content/tutorials.js";
import { ASSET_MAP } from "./assets.js";
import { CUSTOM_BOXES, customTitle, gxPaintIcon } from "./custom-box-art.js";
import { liveSockets, loggedInIds, refreshTanks, rpc } from "./game-socket.js";
import { garageGame, garageLocal, onGarageTank, placeGarageBar, selPid, wantGarageBox } from "./garage.js";
import { bgAdd, garageAllOn, garageAllRaw, syncGarageBack } from "./garage-boxes.js";
import { mazeFeature } from "./maze.js";
import { lightUrl } from "./palette.js";
import { $, PARTS, iconMap, toast } from "./panel.js";
import { MAX_PRESETS } from "./panel-actions.js";
import { afterPresetChange, renderList, updateSaveLabel } from "./saved-looks.js";
import { uiConfirm } from "./settings.js";
import { PLAYER_COLOR_MAP, SETTINGS, hasLook, presetSig, saveSettings, saveToStorage, syncActive } from "./storage.js";
import { esc } from "./trophy-counting.js";
import { openHelp, tutClose } from "./tutorial-run.js";

// ---------- Garage search ----------
// A box next to Real / All that finds any item or paint in the garage by name, box or key, and puts it on the
// garage tank with one click. It can be minimised to a small button (remembered).
let GARAGE_INDEX = [];
const COLOUR_NAMES = [
  ["Black", 0x000000],
  ["Charcoal", 0x36454f],
  ["Grey", 0x808080],
  ["Silver", 0xc0c0c0],
  ["White", 0xffffff],
  ["Red", 0xe02020],
  ["Crimson", 0xa50021],
  ["Maroon", 0x700000],
  ["Pink", 0xff9ec4],
  ["Hot Pink", 0xff3fa0],
  ["Rose", 0xff6f91],
  ["Orange", 0xff8a00],
  ["Peach", 0xffc49a],
  ["Brown", 0x7b4a1e],
  ["Tan", 0xd2b48c],
  ["Gold", 0xd4a017],
  ["Yellow", 0xffe600],
  ["Cream", 0xf5ecd0],
  ["Lime", 0x9be000],
  ["Green", 0x2eaa3a],
  ["Forest Green", 0x1f5a24],
  ["Olive", 0x6b7a1e],
  ["Mint", 0x9ef0c4],
  ["Teal", 0x00898a],
  ["Cyan", 0x20d8ff],
  ["Sky Blue", 0x7cc4ff],
  ["Blue", 0x1e5aff],
  ["Navy", 0x14215a],
  ["Indigo", 0x3a2a9a],
  ["Purple", 0x7a2ad0],
  ["Violet", 0xa060ff],
  ["Lavender", 0xc8b0ff],
  ["Magenta", 0xe020e0],
];
export function colourName(hex) {
  const n = parseInt(String(hex).replace(/^0x|^#/, ""), 16);
  if (isNaN(n)) {
    return String(hex);
  }
  const r = n >> 16,
    g2 = (n >> 8) & 255,
    b = n & 255;
  let best = null,
    bd = 1e9;
  for (const [nm, c] of COLOUR_NAMES) {
    const d = (r - (c >> 16)) ** 2 * 0.3 + (g2 - ((c >> 8) & 255)) ** 2 * 0.59 + (b - (c & 255)) ** 2 * 0.11;
    if (d < bd) {
      bd = d;
      best = nm;
    }
  }
  return best;
}
// Favourites (★), shared by Find in garage and the panel's Swatches. Ids: 'p|<paint>' or 'a|<slot>|<item>'
// where <item> is the game's number or 'ttcl:<key>' for Color Lab's own items. Kept in the settings (and backups).
export const favPaintId = (v) => "p|" + (normVal(v) || String(v));
export const favItemId = (slot, id) => "a|" + slot + "|" + String(id);
export const isFav = (fid) => Array.isArray(SETTINGS.favs) && SETTINGS.favs.includes(fid);
export function toggleFav(fid) {
  const f = Array.isArray(SETTINGS.favs) ? SETTINGS.favs.slice() : [],
    i = f.indexOf(fid);
  if (i > -1) {
    f.splice(i, 1);
  } else {
    f.unshift(fid);
  }
  SETTINGS.favs = f;
  saveSettings();
  return i < 0;
}
export const favPaints = () => (SETTINGS.favs || []).filter((f) => f.startsWith("p|")).map((f) => f.slice(2));
export const favItems = (slot) =>
  (SETTINGS.favs || []).filter((f) => f.startsWith("a|" + slot + "|")).map((f) => f.slice(3 + slot.length));
export const gameItemName = (key) =>
  GAME_NAMES[key] ||
  RESTYLE_ITEMS[key] ||
  key.replace(/^([a-z]+)(\d+)$/, (m, sl, n) => sl[0].toUpperCase() + sl.slice(1) + " #" + n);
export function buildGarageIndex(g) {
  const out = [],
    seen = new Set(),
    boxName = (id) => {
      const cb = CUSTOM_BOXES.find((b) => CUSTOM_BOX_IDS[b.id] === id);
      return cb ? cb.name + " (Color Lab)" : boxLabel(id);
    };
  for (const b of g.boxes || []) {
    for (const s2 of b.sprayCans || []) {
      const c = s2.colour;
      if (!c) {
        continue;
      }
      const v = String(c.rawValue),
        k = "p|" + v;
      if (seen.has(k)) {
        continue;
      }
      seen.add(k);
      const pat = isPat(v),
        name = pat ? showVal(v).replace(/^pattern /, "Pattern ") : colourName(v) + " #" + v.replace(/^0x/, "");
      out.push({
        kind: "paint",
        value: v,
        name,
        box: boxName(b.id),
        key: pat ? v : "#" + v.replace(/^0x/, ""),
        fid: favPaintId(v),
      });
    }
    for (const a of b.accessories || []) {
      const val = String(a.value),
        m = /[?&]ttcl=([\w-]+)/.exec(val),
        k = "a|" + a.type + "|" + (m ? m[1] : val);
      if (seen.has(k)) {
        continue;
      }
      seen.add(k);
      const key = m ? m[1] : a.type + val;
      out.push({
        kind: "item",
        slot: a.type,
        value: a.value,
        name: m ? customTitle(m[1]) : gameItemName(key),
        box: boxName(b.id),
        key,
        custom: !!m,
        fid: favItemId(a.type, m ? "ttcl:" + m[1] : val),
      });
    }
  }
  GARAGE_INDEX = out;
  try {
    renderGarageSearch();
  } catch {}
}
function garageSend(r, part) {
  // one change to the garage tank, as the garage itself sends it; resolves true if it took
  const pid = selPid();
  if (!pid) {
    return Promise.resolve(false);
  }
  const method = r.kind === "paint" ? "tanktrouble.garage.setColour" : "tanktrouble.garage.setAccessory";
  const params = r.kind === "paint" ? [pid, part === "treads" ? "tread" : part, r.value] : [pid, r.slot, r.value];
  return fetch("/ajax/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ jsonrpc: "2.0", method, id: 1, params }),
  })
    .then((x) => x.json())
    .then((j) => {
      const ok = !!(j && j.result && j.result.result);
      if (ok && !garageAllOn(pid)) {
        announceReal(pid);
      }
      return ok;
    });
}
// A real change made by Color Lab (🎲 / Find in Real) skips the game's own garage code, so the game never tells the
// server "this tank changed" and other players keep seeing the old look. Send that same message (39, player updated)
// once the changes are done, exactly as the game does after a change of its own.
const announceTimers = {};
function announceReal(pid) {
  clearTimeout(announceTimers[pid]);
  announceTimers[pid] = setTimeout(() => {
    delete announceTimers[pid];
    const msg = JSON.stringify({
      _typeId: 39,
      playerId: String(pid),
      iconChanged: true,
      usernameChanged: false,
      contentChanged: false,
    });
    for (const ws of [...liveSockets]) {
      try {
        if (ws.readyState === 1) {
          ws.send(msg);
        }
      } catch {}
    }
  }, 400);
}
function garageRedraw() {
  const id = selPid();
  if (id) {
    refreshTanks([id], true);
  }
  setTimeout(() => {
    try {
      const gm = garageGame && garageGame.deref();
      if (gm && gm.state && gm.isBooted !== false) {
        gm.state.start("Load");
      }
    } catch {}
  }, 30); // the garage redraws with it
}
function garageApply(r, part) {
  // put a found item / paint on the garage tank, the same way the garage itself does
  if (!selPid()) {
    return;
  }
  garageSend(r, part)
    .then((ok) => {
      if (!ok) {
        return toast("Couldn't put that on (do you own it? Try the All view)", true);
      }
      garageRedraw();
      toast((r.kind === "paint" ? r.name + " on the " + part : r.name) + " ✓");
    })
    .catch(() => toast("Couldn't reach the game", true));
}
// 🎲 in the garage: a random paint on the turret, base and treads, plus a random item for each slot lit under 🎩 in the
// panel. It picks from what the garage is showing: Real = only what you own (saved for real), All = everything
let garageRolling = false;
// The garage 🎲 opens its options: which parts get paint, which item slots roll, which boxes it picks from,
// and whether every part gets the same paint. 🎲 Roll uses them. Remembered (SETTINGS.gRnd).
const GRND_PARTS = [
  ["turret", "Turret"],
  ["base", "Base"],
  ["treads", "Treads"],
];
function gRnd() {
  const g = Object.assign(
    {
      parts: ["turret", "base", "treads"],
      slots: Array.isArray(SETTINGS.rndAcc) ? SETTINGS.rndAcc.slice() : [],
      boxes: null,
      same: false,
    },
    SETTINGS.gRnd || {},
  );
  SETTINGS.gRnd = g;
  return g;
}
async function garageRandom() {
  if (!selPid() || garageRolling) {
    return;
  }
  if (!GARAGE_INDEX.length) {
    return toast("The garage is still loading", true);
  }
  const g = gRnd(),
    pick = (a) => a[Math.floor(Math.random() * a.length)];
  const inBox = (r) => !g.boxes || g.boxes.includes(r.box);
  const paints = GARAGE_INDEX.filter((r) => r.kind === "paint" && inBox(r));
  const jobs = [];
  if (paints.length && g.parts.length) {
    const one = pick(paints);
    for (const part of g.parts) {
      jobs.push([g.same ? one : pick(paints), part]);
    }
  }
  for (const sl of g.slots) {
    const items = GARAGE_INDEX.filter((r) => r.kind === "item" && r.slot === sl && inBox(r));
    if (items.length) {
      jobs.push([pick(items)]);
    }
  }
  if (!jobs.length) {
    return toast("Nothing to pick from: turn on some parts, slots or boxes", true);
  }
  if (!garageAllOn(selPid())) {
    garageRolling = true;
    let go;
    try {
      go = await realRollRisk(selPid(), g);
    } finally {
      garageRolling = false;
    }
    if (!go) {
      return;
    }
  } // (Real: warn first if something it replaces can't be put back)
  garageRolling = true;
  let ok = 0;
  try {
    for (const [r, part] of jobs) {
      if (await garageSend(r, part).catch(() => false)) {
        ok++;
      }
    }
  } finally {
    garageRolling = false;
  }
  garageRedraw();
  toast(ok ? "🎲 New look" : "Couldn't change the tank", !ok);
}
// Before 🎲 changes a REAL tank: anything the tank wears now that isn't in your garage (old matte paints, retired or
// borrowed items) can't be put back once it's replaced. If 🎲 would replace any of those, it asks three times first.
async function realRollRisk(pid, g) {
  let d;
  try {
    d = await rpc("getPlayerDetails", [String(pid)]);
  } catch {
    return true;
  } // (couldn't check: the game itself would let you)
  if (!d) {
    return true;
  }
  const owned = new Set(
    GARAGE_INDEX.map((r) =>
      r.kind === "paint" ? "p|" + String(r.value).toLowerCase() : "a|" + r.slot + "|" + String(r.value),
    ),
  );
  const lost = [];
  for (const part of g.parts) {
    const c = d[part === "treads" ? "treadColour" : part + "Colour"];
    const v = c && c.rawValue != null ? String(c.rawValue) : null;
    if (v && !owned.has("p|" + v.toLowerCase())) {
      lost.push(
        "<b>" +
          part[0].toUpperCase() +
          part.slice(1) +
          "</b>: " +
          esc(
            isPat(v) || c.type === "image"
              ? showVal(v) || "a picture paint"
              : colourName(v) + " #" + v.replace(/^0x/, ""),
          ),
      );
    }
  }
  for (const sl of g.slots) {
    const v = String(d[sl + "Accessory"] ?? "0");
    if (v !== "0" && !owned.has("a|" + sl + "|" + v)) {
      lost.push("<b>" + sl[0].toUpperCase() + sl.slice(1) + " item</b>: " + esc(gameItemName(sl + v)));
    }
  }
  if (!lost.length) {
    return true;
  }
  const ask = (title, body, yes, no) =>
    new Promise((res) => {
      tutClose();
      const L = tutLayer();
      const c = tutCard(
        L,
        '<h3 style="background:linear-gradient(#ff5a4a,#a30f0f)">⚠️ ' + title + "</h3>" + body,
        [
          [
            no,
            "go",
            () => {
              tutClose();
              res(false);
            },
          ],
          [
            yes,
            "alt",
            () => {
              tutClose();
              res(true);
            },
          ],
        ],
        true,
      );
      c.style.borderColor = "#e0281a";
    });
  const list =
    '<ul style="margin:6px 0 6px 18px;padding:0;font-size:13px;line-height:1.5">' +
    lost.map((x) => '<li style="display:list-item">' + x + "</li>").join("") +
    "</ul>";
  if (
    !(await ask(
      "Risk: you could lose these for good",
      "<p style=\"font-size:13px;margin:2px 0\">This tank is wearing things that <b>aren't in your garage</b>. If 🎲 replaces them, you <b>can't put them back</b>, and some can't be got any more:</p>" +
        list +
        '<p style="font-size:13px;margin:4px 0">Are you sure you want to roll?</p>',
      "Yes, roll anyway",
      "Cancel",
    ))
  ) {
    return false;
  }
  if (
    !(await ask(
      "Are you really sure?",
      "<p style=\"font-size:13px;margin:2px 0\">Once they're gone, Color Lab and TankTrouble <b>can't give them back</b>. Matte paints, for example, aren't sold any more, and a similar colour (like Onyx instead of Matte Black) isn't the same paint.</p>" +
        list,
      "I'm really sure",
      "Keep my tank",
    ))
  ) {
    return false;
  }
  return ask(
    "Okay, so you want to get rid of them",
    '<p style="font-size:13px;margin:2px 0">Fine. 🎲 will replace these for good:</p>' + list,
    "Roll and replace them",
    "No, stop",
  );
}
function garageRndPanel(btn) {
  let p = document.getElementById("ttcl-grnd");
  if (p) {
    p.remove();
    return;
  }
  p = document.createElement("div");
  p.id = "ttcl-grnd";
  p.style.cssText =
    "position:fixed;z-index:2147482500;width:270px;font:12px Arial,sans-serif;color:#eee;background:rgba(0,0,0,.92);border:3px solid #427fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6);overflow:hidden";
  document.body.appendChild(p);
  const draw = () => {
    const g = gRnd(),
      boxes = [...new Set(GARAGE_INDEX.map((r) => r.box))];
    const chip = (on, label, fn, title) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      if (title) {
        b.title = title;
      }
      b.style.cssText =
        "font:13px TankTrouble,Arial,sans-serif;border:0;border-radius:5px;padding:2px 8px;margin:2px;cursor:pointer;color:#fff;box-shadow:0 2px 3px rgba(0,0,0,.5);background:" +
        (on ? "linear-gradient(#427fff,#0014ab)" : "linear-gradient(#5a5a5a,#2a2a2a)") +
        (on ? "" : ";opacity:.75");
      b.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        fn();
        saveSettings();
        draw();
      };
      return b;
    };
    const sec = (t) => {
      const d = document.createElement("div");
      d.style.cssText = "font:13px TankTrouble,Arial,sans-serif;color:#9db8ff;margin:8px 10px 2px";
      d.textContent = t;
      p.appendChild(d);
      const w = document.createElement("div");
      w.style.cssText = "padding:0 8px";
      p.appendChild(w);
      return w;
    };
    const tog = (arr, v) => {
      const i = arr.indexOf(v);
      if (i > -1) {
        arr.splice(i, 1);
      } else {
        arr.push(v);
      }
    };
    p.innerHTML =
      '<div style="display:flex;align-items:center;padding:6px 10px;background:linear-gradient(#427fff,#0014ab);font:17px TankTrouble,Arial,sans-serif"><span style="flex:1">🎲 Random look</span><span class="x" style="cursor:pointer;padding:0 4px" title="Close">✕</span></div>';
    p.querySelector(".x").onclick = () => p.remove();
    const w1 = sec("Paint these parts");
    GRND_PARTS.forEach(([k, l]) => w1.appendChild(chip(g.parts.includes(k), l, () => tog(g.parts, k))));
    w1.appendChild(
      chip(
        g.same,
        "Same paint on all",
        () => {
          g.same = !g.same;
        },
        "Every part gets the same paint",
      ),
    );
    const w2 = sec("Roll items for");
    ACC_SLOTS.forEach(([k, l]) => w2.appendChild(chip(g.slots.includes(k), l, () => tog(g.slots, k))));
    const w3 = sec("From these boxes");
    w3.style.cssText += ";max-height:130px;overflow:auto";
    w3.appendChild(
      chip(!g.boxes, "All boxes", () => {
        g.boxes = g.boxes ? null : [];
      }),
    );
    boxes.forEach((b) =>
      w3.appendChild(
        chip(
          !g.boxes || g.boxes.includes(b),
          b.replace(" (Color Lab)", " ✦"),
          () => {
            if (!g.boxes) {
              g.boxes = boxes.filter((x) => x !== b);
            } else {
              tog(g.boxes, b);
              if (g.boxes.length === boxes.length) {
                g.boxes = null;
              }
            }
          },
          b,
        ),
      ),
    );
    const note = document.createElement("div");
    note.style.cssText = "margin:8px 10px 0;font-size:11px;color:#8a93a8";
    note.textContent =
      (garageAllRaw(selPid())
        ? "All view: picks from everything, seen only by you and other Color Lab users. "
        : "Real view: picks from what you own, saved to your account. ") + "✦ = Color Lab box.";
    p.appendChild(note);
    const go = document.createElement("div");
    go.style.cssText = "padding:8px 10px 10px";
    const rb = chip(true, "🎲 Roll", () => garageRandom());
    rb.style.cssText +=
      ";width:100%;font-size:17px;padding:5px;margin:0;background:linear-gradient(#3ddc4a,#0d7a1a);opacity:1";
    go.appendChild(rb);
    p.appendChild(go);
    const r = btn.getBoundingClientRect();
    p.style.left = Math.max(8, Math.min(innerWidth - 284, r.left + r.width / 2 - 135)) + "px";
    p.style.top = Math.max(8, r.top - p.offsetHeight - 8) + "px";
  };
  draw();
}
function iconFor(r) {
  if (r.kind === "paint") {
    if (!isPat(r.value)) {
      return { col: "#" + r.value.replace(/^0x/, "") };
    }
    const id = patId(r.value);
    return { url: GX_PAINT[id] ? gxPaintIcon(id) : iconMap && iconMap["icon" + id] };
  }
  if (r.custom) {
    return { url: GARAGE_PICS["i:" + r.key] };
  }
  return { url: (ASSET_MAP && (ASSET_MAP["accIcon/" + r.key] || ASSET_MAP["accessories/" + r.key])) || null };
}
// TankTrouble-style buttons for the garage panels (the game's own blue, the TankTrouble font)
function ttChip(b, on, color) {
  b.style.cssText +=
    ";font:13px TankTrouble,Arial,sans-serif;border:0;border-radius:5px;padding:1px 8px;cursor:pointer;color:#fff;box-shadow:0 2px 3px rgba(0,0,0,.5);background:" +
    (color || (on ? "linear-gradient(#427fff,#0014ab)" : "linear-gradient(#5a5a5a,#2a2a2a)")) +
    ";opacity:" +
    (on ? 1 : 0.8);
}
const isColorLabBox = (b) => / \(Color Lab\)$/.test(b);
export function renderGarageSearch() {
  const form = document.querySelector(".garage form");
  let p = document.getElementById("ttcl-gsearch");
  if (!form || !GARAGE_INDEX.length || !garageOpen() || (SETTINGS.hide && SETTINGS.hide.gsearch)) {
    if (p) {
      p.remove();
    }
    return;
  }
  if (!p) {
    p = document.createElement("div");
    p.id = "ttcl-gsearch";
    p.style.cssText =
      "position:fixed;left:12px;bottom:12px;z-index:2147482000;width:300px;font:12px Arial,sans-serif;color:#eee;background:rgba(0,0,0,.92);border:3px solid #427fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6);overflow:hidden";
    p.innerHTML =
      '<div class="h" style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:linear-gradient(#427fff,#0014ab);cursor:pointer;user-select:none"><span style="flex:1;font:17px TankTrouble,Arial,sans-serif">🔍 Find in garage</span><span class="n" style="opacity:.85"></span><button type="button" class="sw" title="Real = only what you have unlocked. All = everything, including the Color Lab boxes (same as the Real / All button by Done)"></button><span class="m" title="Minimise / open" style="font:bold 15px Arial;padding:0 4px">–</span></div>' +
      '<div class="b" style="padding:7px"><input class="q" placeholder="Search: name, box or colour (halo, sakura, #ff0000)" style="width:100%;box-sizing:border-box;padding:5px 8px;border-radius:7px;border:2px solid #808080;background:#000;color:#fff;outline:none;font:13px Arial">' +
      '<div class="f" style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 4px"></div><select class="bx" title="Only show one box (or a group of boxes)" style="width:100%;margin-bottom:5px;background:#000;color:#fff;border:2px solid #808080;border-radius:6px;font:13px TankTrouble,Arial,sans-serif;height:26px;outline:none"></select><div class="r" style="max-height:270px;overflow:auto"></div></div>';
    document.body.appendChild(p);
    const f = p.querySelector(".f");
    for (const [v, t, ti] of [
      ["all", "All", "Everything (flags are under Flags)"],
      ["item", "Items", "Accessories only (not flags)"],
      ["paint", "Paints", "Paints only"],
      ["fav", "★", "Your favourites"],
      ["flags", "🏳 Flags", "The Flags box (flags for the back)"],
      ["looks", "💾 Looks", "This tank's saved looks (presets): switch looks with one click"],
    ]) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = t;
      b.title = ti;
      b.dataset.v = v;
      b.onclick = (e) => {
        e.preventDefault();
        p.dataset.f = v;
        renderGarageSearch();
      };
      f.appendChild(b);
    }
    p.querySelector(".h").onclick = () => {
      SETTINGS.gsearchMin = !SETTINGS.gsearchMin;
      saveSettings();
      renderGarageSearch();
    };
    p.querySelector(".sw").onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleGarageAll(document.querySelector(".garage form button.ttcl-garage") || document.createElement("button"));
    }; // the garage reloads, and the list with it
    const q = p.querySelector(".q");
    q.addEventListener("input", () => renderGarageSearch());
    q.addEventListener("keydown", (e) => e.stopPropagation()); // typing doesn't move the garage
    q.onfocus = () => {
      q.style.borderColor = "#427fff";
    };
    q.onblur = () => {
      q.style.borderColor = "#808080";
    };
    p.querySelector(".bx").onchange = (e) => {
      p.dataset.box = e.target.value;
      renderGarageSearch();
    };
    p.dataset.f = "all";
    p.dataset.box = "";
  }
  placeGarageSearch(p);
  const min = !!SETTINGS.gsearchMin;
  p.querySelector(".b").style.display = min ? "none" : "";
  p.querySelector(".m").textContent = min ? "+" : "–";
  p.style.width = min ? "auto" : "300px";
  p.querySelectorAll(".f button").forEach((b) => {
    b.style.cssText = "";
    ttChip(b, b.dataset.v === p.dataset.f);
  });
  p.querySelector(".n").textContent = GARAGE_INDEX.length + " things";
  const sw = p.querySelector(".sw");
  sw.textContent = garageAllRaw(selPid()) ? "All" : "Real";
  sw.style.cssText = "";
  ttChip(sw, SETTINGS.on, "linear-gradient(#5a5a5a,#2a2a2a)");
  sw.style.boxShadow = "0 0 0 1px #fff";
  if (min) {
    return;
  }
  const looks = p.dataset.f === "looks";
  p.querySelector(".q").style.display = p.querySelector(".bx").style.display = looks ? "none" : "";
  if (looks) {
    return renderGarageLooks(p);
  }
  // box picker: every box in this garage, grouped
  const boxes = [...new Set(GARAGE_INDEX.map((r) => r.box))],
    sel = p.querySelector(".bx"),
    bsig = boxes.join("|");
  if (sel._sig !== bsig) {
    sel._sig = bsig;
    sel.innerHTML = "";
    const opt = (v, t) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      sel.appendChild(o);
    };
    opt("", "Every box");
    opt("@lab", "✦ Color Lab boxes");
    opt("@game", "Game boxes");
    boxes.filter(isColorLabBox).forEach((b) => opt(b, "✦ " + b.replace(" (Color Lab)", "")));
    boxes.filter((b) => !isColorLabBox(b)).forEach((b) => opt(b, b));
    if (![...sel.options].some((o) => o.value === p.dataset.box)) {
      p.dataset.box = "";
    }
  }
  sel.value = p.dataset.box || "";
  const words = p.querySelector(".q").value.trim().toLowerCase().split(/\s+/).filter(Boolean),
    kind = p.dataset.f,
    bsel = p.dataset.box || "";
  const isFlag = (r) => r.box === "Flags";
  const boxOk = (r) =>
    !bsel || (bsel === "@lab" ? isColorLabBox(r.box) : bsel === "@game" ? !isColorLabBox(r.box) : r.box === bsel);
  const kindOk = (r) =>
    kind === "fav"
      ? isFav(r.fid)
      : kind === "flags"
        ? isFlag(r)
        : (kind === "all" || r.kind === kind) && (!isFlag(r) || words.length > 0 || bsel === "Flags");
  const found = GARAGE_INDEX.filter(
    (r) =>
      kindOk(r) &&
      boxOk(r) &&
      words.every((w) => (r.name + " " + r.box + " " + r.key + " " + (r.slot || "paint")).toLowerCase().includes(w)),
  );
  // grouped by box, with favourites first in their own group
  const hits = [],
    favs = kind !== "fav" ? found.filter((r) => isFav(r.fid)) : [],
    rest = kind !== "fav" ? found.filter((r) => !isFav(r.fid)) : found;
  if (favs.length) {
    hits.push({ hdr: "★ Favourites", n: favs.length });
    hits.push(...favs);
  }
  let last = null;
  const counts = {};
  rest.forEach((r) => {
    counts[r.box] = (counts[r.box] || 0) + 1;
  });
  for (const r of rest) {
    if (r.box !== last) {
      last = r.box;
      hits.push({ hdr: isColorLabBox(r.box) ? "✦ " + r.box.replace(" (Color Lab)", "") : r.box, n: counts[r.box] });
    }
    hits.push(r);
  }
  // the whole list scrolls; only the rows in view (plus a few either side) are built, rows that scroll away are dropped
  const list = p.querySelector(".r"),
    qk = kind + "|" + bsel + "|" + words.join(" ") + "|" + hits.length,
    keep = p._qk === qk ? list.scrollTop : 0;
  p._qk = qk;
  p._hits = hits;
  list.innerHTML = "";
  p._tops = [];
  let y = 0;
  for (const h of hits) {
    p._tops.push(y);
    y += h.hdr ? GS_HDR : GS_ROW;
  }
  if (!found.length) {
    list.innerHTML =
      '<div style="opacity:.6;padding:6px">' +
      (kind === "fav" && !words.length ? "No favourites yet: click ☆ on any row to add it" : "Nothing matches") +
      "</div>";
    return;
  }
  const sp = document.createElement("div");
  sp.className = "sp";
  sp.style.cssText = "position:relative;height:" + y + "px";
  list.appendChild(sp);
  list.scrollTop = keep;
  if (!list._gs) {
    list._gs = true;
    list.addEventListener("scroll", () => drawGarageRows(p), { passive: true });
  }
  drawGarageRows(p);
}
// 💾 Looks: the open tank's presets (the same ones as the panel's Saved tab). Click one to wear it; the garage then
// edits that look. + New look copies what the tank wears now into a new preset, so the old one stays as it was.
function renderGarageLooks(p) {
  const redraw = p._redraw || renderGarageSearch;
  const list = p.querySelector(".r");
  list.innerHTML = "";
  p._qk = null;
  p._hits = [];
  const id = selPid(),
    e = id && PLAYER_COLOR_MAP[id],
    note = (t) => {
      const d = document.createElement("div");
      d.style.cssText = "opacity:.7;padding:2px 2px 6px;font-size:11px";
      d.textContent = t;
      list.appendChild(d);
    };
  if (!id) {
    return note("Open a tank first");
  }
  if (!garageAllOn(id)) {
    note("Looks are your Color Lab looks: switch to All to see them on the garage tank.");
  }
  const changed = (msg) => {
    saveToStorage();
    try {
      afterPresetChange(id, e);
    } catch {}
    garageRedraw();
    if (msg) {
      toast(msg);
    }
    redraw();
  };
  (e ? e.presets : []).forEach((pr, i) => {
    const on = i === e.active,
      row = document.createElement("div");
    row.style.cssText =
      "display:flex;align-items:center;gap:6px;padding:4px;margin-bottom:3px;border-radius:6px;cursor:pointer;box-sizing:border-box;border:2px solid " +
      (on ? "#427fff" : "transparent") +
      ";background:" +
      (on ? "rgba(66,127,255,.18)" : "rgba(255,255,255,.04)");
    row.onmouseenter = () => {
      if (!on) {
        row.style.background = "rgba(66,127,255,.12)";
      }
    };
    row.onmouseleave = () => {
      if (!on) {
        row.style.background = "rgba(255,255,255,.04)";
      }
    };
    const dots = document.createElement("div");
    dots.style.cssText = "flex:none;display:flex;gap:2px";
    for (const k of ["turret", "base", "treads"]) {
      const d = document.createElement("i");
      const v = pr[k],
        pat = v && isPat(v) ? patId(v) : null,
        url = pat ? (GX_PAINT[pat] ? gxPaintIcon(pat) : iconMap && iconMap["icon" + pat]) : null;
      d.style.cssText =
        "width:14px;height:14px;border-radius:50%;border:1px solid #555;background:" +
        (url
          ? "#222 center/cover url(" + lightUrl(url) + ")"
          : toCss(v) || "repeating-linear-gradient(45deg,#333 0 3px,#222 3px 6px)");
      d.title = k[0].toUpperCase() + k.slice(1) + (v ? "" : ": the game's own");
      dots.appendChild(d);
    }
    const items = Object.values(pr.acc || {}).filter((v) => v && v !== "0").length;
    const tx = document.createElement("div");
    tx.style.cssText = "flex:1;min-width:0;line-height:14px";
    tx.innerHTML =
      '<div style="font:14px TankTrouble,Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div><div style="font-size:10px;opacity:.65"></div>';
    tx.children[0].textContent = (on ? "✓ " : "") + pr.name;
    tx.children[0].title = "Click to wear · double-click to rename";
    tx.children[1].textContent = pr.fresh
      ? "copy: change something in the garage to keep it"
      : (hasLook(pr) ? (items ? items + " item" + (items > 1 ? "s" : "") : "no items") : "the game's own look") +
        (on ? " · wearing now" : "");
    row.append(dots, tx);
    row.onclick = (ev) => {
      if (ev.detail > 1 || on) {
        return;
      }
      clearTimeout(row._t);
      row._t = setTimeout(() => {
        // a "+ New look" copy that was never changed goes again when you switch away (no duplicate looks)
        const cur = e.presets[e.active];
        if (cur && cur.fresh && e.presets.some((q) => q !== cur && presetSig(q) === presetSig(cur))) {
          e.presets.splice(e.active, 1);
        }
        e.active = Math.max(0, e.presets.indexOf(pr));
        syncActive(e);
        changed("Wearing " + pr.name);
      }, 230);
    };
    tx.children[0].ondblclick = (ev) => {
      ev.stopPropagation();
      clearTimeout(row._t);
      const nm = tx.children[0],
        inp = document.createElement("input");
      inp.value = pr.name;
      inp.maxLength = 30;
      inp.style.cssText =
        "width:100%;box-sizing:border-box;background:#000;color:#fff;border:1px solid #427fff;border-radius:4px;font:13px Arial";
      nm.textContent = "";
      nm.appendChild(inp);
      inp.focus();
      inp.select();
      let done = false;
      const fin = (keep) => {
        if (done) {
          return;
        }
        done = true;
        if (keep && inp.value.trim()) {
          pr.name = inp.value.trim();
          saveToStorage();
          try {
            renderList();
            updateSaveLabel();
          } catch {}
        }
        redraw();
      };
      inp.onkeydown = (k) => {
        k.stopPropagation();
        if (k.key === "Enter") {
          fin(true);
        } else if (k.key === "Escape") {
          fin(false);
        }
      };
      inp.onblur = () => fin(true);
      inp.onclick = (k) => k.stopPropagation();
    };
    if (e.presets.length > 1) {
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "✕";
      del.title = "Delete this look";
      del.style.cssText =
        "flex:none;background:none;border:0;color:#f66;font:bold 13px Arial;cursor:pointer;padding:0 4px";
      del.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        uiConfirm("Delete look", 'Delete the look "' + pr.name + '"?', "Delete", true).then((ok) => {
          if (!ok) {
            return;
          }
          e.presets.splice(i, 1);
          if (e.active >= e.presets.length || e.active === i) {
            e.active = 0;
          } else if (e.active > i) {
            e.active--;
          }
          syncActive(e);
          changed();
        });
      };
      row.appendChild(del);
    }
    list.appendChild(row);
  });
  const add = document.createElement("button");
  add.type = "button";
  add.textContent = "+ New look";
  add.title = "Copies what this tank wears now into a new look and switches to it, so the one before stays as it was";
  ttChip(add, true);
  add.style.cssText += ";width:100%;margin-top:4px;font-size:15px;padding:4px";
  const curP = e && e.presets[e.active],
    cant =
      curP && curP.fresh
        ? "Change something on this copy first"
        : !e || !hasLook(curP)
          ? "This tank wears the game's own look: change something first"
          : "";
  if (cant) {
    add.disabled = true;
    add.style.opacity = ".5";
    add.style.cursor = "default";
    add.title = cant;
  }
  add.onclick = (ev) => {
    ev.preventDefault();
    if (cant) {
      return;
    }
    let x = e;
    if (!x) {
      garageLocal(id, () => {}, true);
      x = PLAYER_COLOR_MAP[id];
      if (!x) {
        return;
      }
    }
    if (x.presets.length >= MAX_PRESETS) {
      return toast("Up to " + MAX_PRESETS + " looks per tank: delete one first", true);
    }
    const cur = x.presets[x.active],
      copy = JSON.parse(JSON.stringify(cur));
    let n = x.presets.length + 1;
    while (x.presets.some((q) => q.name === "Look " + n)) {
      n++;
    }
    copy.name = "Look " + n;
    copy.fresh = true;
    x.presets.push(copy);
    x.active = x.presets.length - 1;
    syncActive(x);
    saveToStorage();
    try {
      afterPresetChange(id, x);
    } catch {}
    toast("New look: " + copy.name + " (change it in the garage)");
    redraw();
  };
  list.appendChild(add);
  if (!e || !hasLook(e.presets[e.active])) {
    note(
      "No saved looks yet: change something on this tank in the garage (All view), then + New look makes a second one to switch between.",
    );
  } else if (e.presets.length < 2) {
    note("Make a second look with + New look, then switch between them here.");
  }
}
function garageLooksPanel(btn) {
  let p = document.getElementById("ttcl-glooks");
  if (p) {
    p.remove();
    return;
  }
  p = document.createElement("div");
  p.id = "ttcl-glooks";
  p.style.cssText =
    "position:fixed;z-index:2147482500;width:280px;font:12px Arial,sans-serif;color:#eee;background:rgba(0,0,0,.92);border:3px solid #427fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6);overflow:hidden";
  p.innerHTML =
    '<div style="display:flex;align-items:center;padding:5px 8px;background:linear-gradient(#427fff,#0014ab)"><span style="flex:1;font:17px TankTrouble,Arial,sans-serif">💾 Looks</span><span class="x" title="Close" style="cursor:pointer;font:bold 15px Arial;padding:0 4px">✕</span></div><div class="r" style="padding:7px;max-height:320px;overflow:auto"></div>';
  document.body.appendChild(p);
  p.querySelector(".x").onclick = () => p.remove();
  p._redraw = () => {
    renderGarageLooks(p);
    const r = btn.getBoundingClientRect();
    p.style.left = Math.max(8, Math.min(innerWidth - 294, r.left + r.width / 2 - 140)) + "px";
    p.style.top = Math.max(8, r.top - p.offsetHeight - 8) + "px";
  };
  p._redraw();
}
let gsPicT = 0;
export function gsPicSoon() {
  if (gsPicT) {
    return;
  }
  gsPicT = setTimeout(() => {
    gsPicT = 0;
    const p = document.getElementById("ttcl-gsearch"),
      sp = p && p.querySelector(".r .sp");
    if (!sp) {
      return;
    }
    let n = 0;
    for (const el of [...sp.children]) {
      if (el._noPic && el._r && GARAGE_PICS["i:" + el._r.key]) {
        el.remove();
        n++;
      }
    }
    if (n) {
      drawGarageRows(p);
    }
  }, 300);
} // (rows whose pictures just got drawn)
const GS_HDR = 24;
const GS_ROW = 36;
function garageRow(r) {
  const row = document.createElement("div");
  row.style.cssText =
    "position:absolute;left:0;right:0;height:" +
    (GS_ROW - 2) +
    "px;display:flex;align-items:center;gap:6px;padding:0 4px;border-radius:6px;cursor:pointer;box-sizing:border-box";
  row.onmouseenter = () => {
    row.style.background = "rgba(66,127,255,.25)";
  };
  row.onmouseleave = () => {
    row.style.background = "";
  };
  const ic = document.createElement("div"),
    i2 = iconFor(r);
  ic.style.cssText =
    "flex:none;width:30px;height:30px;border-radius:" +
    (r.kind === "paint" ? "50%" : "5px") +
    ";background:#2a2d38 center/contain no-repeat;border:1px solid #444";
  if (i2.col) {
    ic.style.background = i2.col;
  } else if (i2.url) {
    ic.style.backgroundImage = "url(" + lightUrl(i2.url) + ")";
  } else if (r.custom) {
    row._noPic = true;
    try {
      bgAdd(r.key, true);
    } catch {}
  } // (not drawn yet: next in line)
  const tx = document.createElement("div");
  tx.style.cssText = "flex:1;min-width:0;line-height:14px";
  tx.innerHTML =
    '<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div><div style="font-size:10px;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>';
  tx.children[0].textContent = r.name;
  tx.children[1].textContent =
    (r.kind === "paint" ? "Paint" : r.slot[0].toUpperCase() + r.slot.slice(1)) + " · " + r.box + " · " + r.key;
  const st = document.createElement("button");
  st.type = "button";
  st.className = "small";
  st.style.cssText =
    "padding:0 4px;min-width:0;background:none;box-shadow:none;border:0;font-size:16px;color:" +
    (isFav(r.fid) ? "#ffd23a" : "#888");
  st.textContent = isFav(r.fid) ? "★" : "☆";
  st.title = "Favourite (also shows in the panel's Swatches → ★)";
  st.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const on = toggleFav(r.fid);
    st.textContent = on ? "★" : "☆";
    st.style.color = on ? "#ffd23a" : "#888";
    const p = document.getElementById("ttcl-gsearch");
    if (p && p.dataset.f === "fav") {
      renderGarageSearch();
    }
  };
  row.append(st, ic, tx);
  if (r.kind === "paint") {
    for (const [pt, lb] of [
      ["turret", "T"],
      ["base", "B"],
      ["treads", "Tr"],
    ]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "small";
      b.textContent = lb;
      b.title = "Paint the " + pt;
      ttChip(b, true);
      b.style.padding = "1px 6px";
      b.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        garageApply(r, pt);
      };
      row.appendChild(b);
    }
  } else {
    row.onclick = () => garageApply(r);
  }
  return row;
}
function drawGarageRows(p) {
  const list = p.querySelector(".r"),
    sp = list.querySelector(".sp"),
    hits = p._hits || [],
    tops = p._tops || [];
  if (!sp) {
    return;
  }
  const top = list.scrollTop,
    bottom = top + (list.clientHeight || 270);
  let lo = 0,
    hi = tops.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (tops[m] <= top) {
      lo = m;
    } else {
      hi = m - 1;
    }
  } // first row in view
  const from = Math.max(0, lo - 6);
  let to = lo;
  while (to < hits.length && tops[to] < bottom) {
    to++;
  }
  to = Math.min(hits.length, to + 6);
  for (const el of [...sp.children]) {
    const i = +el.dataset.i;
    if (i < from || i >= to || hits[i] !== el._r) {
      el.remove();
    }
  } // out of view: dropped
  const have = new Set([...sp.children].map((el) => +el.dataset.i));
  for (let i = from; i < to; i++) {
    if (!have.has(i)) {
      const h = hits[i];
      let row;
      if (h.hdr) {
        row = document.createElement("div");
        row.style.cssText =
          "position:absolute;left:0;right:0;height:" +
          (GS_HDR - 2) +
          "px;display:flex;align-items:flex-end;gap:6px;padding:0 4px 2px;box-sizing:border-box;border-bottom:1px solid #2c3550;font:14px TankTrouble,Arial,sans-serif;color:#9db8ff";
        row.innerHTML = '<span style="flex:1"></span><span style="font:11px Arial;color:#8a93a8"></span>';
        row.children[0].textContent = h.hdr;
        row.children[1].textContent = h.n;
      } else {
        row = garageRow(h);
      }
      row.dataset.i = i;
      row._r = h;
      row.style.top = tops[i] + "px";
      sp.appendChild(row);
    }
  }
}
const garageOpen = () => {
  const f = document.querySelector(".garage form");
  return !!(f && f.isConnected && f.getClientRects().length);
}; // the garage is on screen
export function renderGarageMaze() {
  const form = document.querySelector(".garage form");
  if (!form) {
    return;
  }
  let box = form.querySelector("span.ttcl-mz");
  const gid = selPid(),
    e = gid && PLAYER_COLOR_MAP[gid],
    p = e && e.presets && e.presets[e.active];
  // Turret / Base / Treads always shown (greyed out when that part has no pattern paint) so they never jump about
  const show =
    mazeFeature() &&
    garageAllOn(gid) &&
    !(SETTINGS.hide && SETTINGS.hide.gmz) &&
    !!(p && PARTS.some(([k]) => isPat(p[k]))); // only when the tank has a pattern paint (keeps the bar on one line)
  if (!show) {
    if (box) {
      box.remove();
    }
    return;
  }
  if (!box) {
    box = document.createElement("span");
    box.className = "ttcl-mz";
    box.style.cssText =
      "display:inline-flex;align-items:center;gap:4px;margin-right:6px;vertical-align:middle;font:11px Arial,sans-serif;color:#dfe6f5";
    const b = form.querySelector("button.ttcl-garage");
    if (b && b.parentNode) {
      b.parentNode.insertBefore(box, b);
    } else {
      form.appendChild(box);
    }
  }
  box.innerHTML = '<span title="Show these patterns in the maze too">In maze:</span>';
  for (const [k, label] of PARTS) {
    const has = !!(p && isPat(p[k])),
      on = has && !(p.maze && p.maze[k] === false),
      btn = document.createElement("button");
    btn.type = "button";
    btn.tabIndex = -1;
    btn.className = "small";
    btn.textContent = label;
    btn.disabled = !has;
    btn.style.cssText =
      "padding:1px 5px;min-width:0;" +
      (has ? "opacity:" + (on ? 1 : 0.45) : "opacity:.3;filter:grayscale(1);cursor:default");
    btn.title = has
      ? label + ": pattern " + (on ? "shown" : "not shown") + " in the maze. Click to switch."
      : label + ": no pattern paint on this part";
    if (has) {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const m = Object.assign({}, p.maze || {});
        if (on) {
          m[k] = false;
        } else {
          delete m[k];
        }
        p.maze = Object.keys(m).length ? m : null;
        syncActive(e);
        saveToStorage();
        try {
          renderList();
        } catch {}
        renderGarageMaze();
        toast(label + " pattern " + (on ? "off" : "on") + " in the maze");
      });
    }
    box.appendChild(btn);
  }
}
export function addGarageButton() {
  const form = document.querySelector(".garage form");
  if (!form) {
    return;
  }
  let b = form.querySelector("button.ttcl-garage");
  if (!b) {
    const done = form.querySelector("button[type=submit]");
    b = document.createElement("button");
    b.type = "button";
    b.tabIndex = -1;
    b.className = "small ttcl-garage";
    b.style.cssText = "margin-right:6px;vertical-align:middle;";
    b.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      toggleGarageAll(b);
    });
    if (done && done.parentNode) {
      done.parentNode.insertBefore(b, done);
    } else {
      form.appendChild(b);
    }
  }
  if (!form.querySelector("button.ttcl-gdice")) {
    // 🎲 random look and ? help, just before Real / All
    const mk = (cls, txt, title, fn) => {
      const x = document.createElement("button");
      x.type = "button";
      x.tabIndex = -1;
      x.className = "small " + cls;
      x.textContent = txt;
      x.title = title;
      x.style.cssText = "margin-right:6px;vertical-align:middle;";
      if (cls === "ttcl-ghelp") {
        x.style.cssText += "border-radius:50%;min-width:26px;box-shadow:0 0 0 2px #fff;";
      }
      x.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        fn(x);
      });
      b.parentNode.insertBefore(x, b);
      return x;
    };
    mk("ttcl-gpower", "⏻", "", () => {
      $("power").onclick();
      syncGarageButton(b);
      garageRedraw();
    });
    mk("ttcl-ghelp", "?", "Help: what these buttons do, and the tutorial (Color Lab)", () => openHelp("garage"));
    mk(
      "ttcl-gdice",
      "🎲",
      "Random look: rolls straight away, with your ⚙ options. Real = from what you own, All = from everything (Color Lab)",
      () => garageRandom(),
    );
    const cog = mk(
      "ttcl-gdiceopt",
      "⚙",
      "Random look options: which parts, item slots and boxes 🎲 uses (Color Lab)",
      (x) => garageRndPanel(x),
    );
    cog.style.marginLeft = "-4px";
    cog.style.minWidth = "24px";
    mk(
      "ttcl-glooksb",
      "💾 Looks",
      "Your saved looks for this tank: switch with one click, or make a new one (Color Lab)",
      (x) => garageLooksPanel(x),
    );
  }
  syncGarageButton(b);
  renderGarageMaze();
  renderGarageSearch();
  try {
    syncGarageBack();
  } catch {}
  const hd = SETTINGS.hide || {};
  const gd = form.querySelector(".ttcl-gdice"),
    gp = form.querySelector(".ttcl-gpower"),
    go = form.querySelector(".ttcl-gdiceopt");
  if (gd) {
    gd.style.display = hd.gdice ? "none" : "";
  }
  if (go) {
    go.style.display = hd.gdice ? "none" : "";
  }
  if (gp) {
    gp.style.display = hd.gpower ? "none" : "";
  }
}
export function syncGarageButton(b) {
  const all = garageAllRaw(selPid());
  b.textContent = all ? "All" : "Real";
  b.title = all
    ? "Showing every box (Color Lab). Everything you pick here only changes your tank for you - nothing is sent to TankTrouble. Click for your real garage."
    : "Showing your real garage. Click to show every box, paint and accessory (Color Lab: seen only by you and other Color Lab users).";
  b.style.opacity = SETTINGS.on ? "" : ".5";
  const pw = document.querySelector(".garage form button.ttcl-gpower");
  if (pw) {
    pw.style.background = SETTINGS.on ? "linear-gradient(#3ddc4a,#0d7a1a)" : "linear-gradient(#8a8a8a,#3a3a3a)";
    pw.style.color = "#fff";
    pw.title = SETTINGS.on
      ? "Custom colours are ON. Click to pause them all (you see real tanks) (Color Lab)"
      : "Custom colours are PAUSED. Click to turn them back on (Color Lab)";
  }
  const sw = document.querySelector("#ttcl-gsearch .sw");
  if (sw) {
    sw.textContent = all ? "All" : "Real";
  }
}
function toggleGarageAll(b) {
  // Real / All for the tank open in the garage only
  const id = selPid();
  if (!id) {
    return toast("Open a tank in the garage first", true);
  }
  const all = !garageAllRaw(id);
  SETTINGS.garageAllFor = Object.assign({}, SETTINGS.garageAllFor, { [id]: all });
  SETTINGS.garageAll = all; // (new tanks start like the last one you switched)
  for (const x of loggedInIds()) {
    if (x !== id && !Object.prototype.hasOwnProperty.call(SETTINGS.garageAllFor, x)) {
      SETTINGS.garageAllFor[x] = !all;
    }
  } // the others stay as they were
  syncGarageButton(b);
  renderGarageMaze();
  if (all && !SETTINGS.on) {
    toast("Custom colours are paused — turn them on in Color Lab", true);
  }
  // Real = this tank shows its real look: its Color Lab look is switched off (kept, not deleted)
  // and switched back on when you go back to All.
  const off = new Set(SETTINGS.garageOff || []);
  if (!all) {
    if (PLAYER_COLOR_MAP[id] && PLAYER_COLOR_MAP[id].enabled !== false) {
      PLAYER_COLOR_MAP[id].enabled = false;
      off.add(id);
    }
  } else {
    if (off.has(id) && PLAYER_COLOR_MAP[id]) {
      PLAYER_COLOR_MAP[id].enabled = true;
    }
    off.delete(id);
  }
  SETTINGS.garageOff = [...off];
  saveSettings();
  saveToStorage();
  try {
    renderList();
  } catch {}
  refreshTanks([id], true); // redraw it, and the game drops its cached garage contents for it
  wantGarageBox(id);
  setTimeout(() => {
    try {
      const g = garageGame && garageGame.deref();
      if (g && g.state && g.isBooted !== false) {
        g.state.start("Load");
      }
    } catch {}
  }, 30);
  toast((all ? "All" : "Real") + " for this tank only");
}

export function startGarageSearch() {
  setInterval(() => {
    const p = document.getElementById("ttcl-grnd");
    if (p && !garageOpen()) {
      p.remove();
    }
  }, 500);
  setInterval(() => {
    const p = document.getElementById("ttcl-glooks");
    if (p && !garageOpen()) {
      p.remove();
    }
  }, 500);
  setInterval(() => {
    const p = document.getElementById("ttcl-gsearch");
    if (p && !garageOpen()) {
      p.remove();
    }
    if (garageOpen()) {
      onGarageTank();
      placeGarageBar();
      placeGarageSearch(p);
    }
    try {
      renderBoxNav();
      syncGarageBack();
    } catch {}
  }, 500); // gone as soon as the garage closes
}
