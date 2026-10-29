import { post } from "../content/bridge-messages.js";
import { TUT_LABEL, TUT_VER, V1_OVERVIEW, WHATS_NEW, tutCard, tutLayer } from "../content/tutorials.js";
import { renderGarageSearch } from "./garage-search.js";
import { $, KEY_C, panel, toast } from "./panel.js";
import { SETTINGS, TUTS, saveSettings, tutSave } from "./storage.js";
import { setOpen, showTab } from "./tabs.js";

let TUT_STEPS;
let notesAfter = false; // a new user's first tutorial ends with the update notes
export function tutClose() {
  clearInterval(tutTimer);
  const L = document.getElementById("ttcl-tut");
  if (L) {
    L.remove();
  }
  if (notesAfter) {
    notesAfter = false;
    setTimeout(() => whatsNew(0), 250);
  }
}
let tutTimer = 0;
// Asked once, before anything goes to Color Lab's server. The card and the answer belong to the extension's own world
// (bridge.js), so the page can't answer it for the player; this side only waits for the answer
export function consentChoose(then) {
  const done = (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.__ttcl !== true || d.dir !== "toPage" || d.type !== "consent") {
      return;
    }
    window.removeEventListener("message", done);
    SETTINGS.consent = d.value;
    SETTINGS.goOffline = d.value !== "share";
    saveSettings();
    if (then) {
      then();
    }
  };
  window.addEventListener("message", done);
  post({ type: "consentAsk" });
}
export function tutChoose(first) {
  if (first) {
    tutSave({ ver: TUT_VER });
    notesAfter = true;
  }
  const L = tutLayer();
  tutCard(
    L,
    "<h3>" +
      (first ? "Welcome to Color Lab 👋" : "Tutorial") +
      "</h3><p>Custom tank colours, paints, items and map themes that only <b>you</b> see. How would you like to learn it?</p>",
    [
      [
        "🏠 <b>The in-game garage</b><br><small>Real / All, search, random looks, right inside the game's garage</small>",
        "big",
        () => tutRun("garage"),
      ],
      [
        "🎨 <b>The colour panel</b><br><small>Opens with <kbd>" +
          KEY_C +
          "</kbd> or the extension icon: paint any tank, save looks</small>",
        "big",
        () => tutRun("panel"),
      ],
      [
        first ? "Skip, I'll explore" : "Close",
        "alt",
        () => {
          tutClose();
          if (first) {
            toast("You can replay the tutorial any time from a ? button");
          }
        },
      ],
    ],
    true,
  );
}
export function whatsNew(since) {
  tutSave({ ver: TUT_VER });
  const fresh = since === 0,
    items = fresh ? V1_OVERVIEW : WHATS_NEW.filter((w) => w[0] > since);
  if (!items.length) {
    return;
  }
  const L = tutLayer();
  tutCard(
    L,
    "<h3>" +
      (fresh ? "What's in Color Lab · " : "Update notes · ") +
      TUT_LABEL +
      " ✨</h3><ul>" +
      items.map((w) => "<li><span>" + w[1] + "</span><span>" + w[2] + "</span></li>").join("") +
      '</ul><p style="font-size:12px;color:#aaa">The ? buttons in the garage and the panel explain every button and replay the tutorial.</p>',
    [["Take the tutorial", "alt", () => tutChoose(false)]]
      .concat(
        items.some((w) => w[0] === 4)
          ? [
              [
                "Show me the 🗺 Maze tab",
                "alt",
                () => {
                  tutClose();
                  try {
                    setOpen(true);
                    showTab("maze");
                  } catch {}
                },
              ],
            ]
          : [],
      )
      .concat([["Got it", "go", tutClose]]),
    true,
  );
}
const gq = (sel) => document.querySelector(".garage form " + sel);
function tutRun(path, i = 0) {
  const steps = TUT_STEPS[path];
  clearInterval(tutTimer);
  if (i >= steps.length) {
    return tutEnd(path);
  }
  if (path === "garage" && i === 0 && panel.classList.contains("open")) {
    setOpen(false);
  } // the garage tour doesn't need the panel (the panel tour opens it)
  const st = steps[i];
  try {
    st.before && st.before();
  } catch {}
  const L = tutLayer(),
    spot = document.createElement("div");
  spot.className = "spot";
  L.appendChild(spot);
  const c = tutCard(
    L,
    "<h3>" + st.t + '</h3><span class="n">' + (i + 1) + " / " + steps.length + "</span><p>" + st.x + "</p>",
    [
      [
        "Skip tour",
        "alt",
        () => {
          tutClose();
          tutSave({ seen: Object.assign({}, (TUTS || {}).seen, { [path]: true }) });
        },
      ],
      ...(i ? [["‹ Back", "alt", () => tutRun(path, i - 1)]] : []),
      ...(st.wait ? [] : [[i === steps.length - 1 ? "Finish ›" : "Next ›", "go", () => tutRun(path, i + 1)]]),
    ],
  );
  const place = () => {
    if (st.wait && st.wait()) {
      return tutRun(path, i + 1);
    }
    const el = st.el(),
      r0 = el && el.getBoundingClientRect && el.getBoundingClientRect();
    const r =
      r0 && r0.width
        ? (() => {
            const top = Math.max(4, r0.top),
              bottom = Math.min(innerHeight - 4, r0.bottom);
            return {
              left: r0.left,
              right: r0.right,
              width: r0.width,
              top,
              bottom,
              height: Math.max(0, bottom - top),
            };
          })()
        : r0; // (a long pane: only the part on screen is outlined)
    if (!r || !r.width) {
      spot.style.display = "none";
      c.style.left = Math.max(12, (innerWidth - c.offsetWidth) / 2) + "px";
      if (st.wait) {
        c.style.top = "12px";
        return;
      } // waiting for the player to do something: nothing covers the game
      if (!L.querySelector(".dim")) {
        L.insertBefore(Object.assign(document.createElement("div"), { className: "dim" }), spot);
      }
      c.style.top = Math.max(12, (innerHeight - c.offsetHeight) / 2) + "px";
      return;
    }
    const d = L.querySelector(".dim");
    if (d) {
      d.remove();
    }
    spot.style.display = "";
    Object.assign(spot.style, {
      left: r.left - 6 + "px",
      top: r.top - 6 + "px",
      width: r.width + 6 + "px",
      height: r.height + 6 + "px",
    });
    const ch = c.offsetHeight,
      cw = c.offsetWidth;
    let top = r.bottom + 14,
      left = r.left + r.width / 2 - cw / 2;
    if (top + ch > innerHeight - 8) {
      top = r.top - ch - 14;
    }
    if (top < 8) {
      top = Math.max(8, Math.min(innerHeight - ch - 8, r.top));
      left = r.right + 14 + cw < innerWidth ? r.right + 14 : r.left - cw - 14;
    }
    c.style.left = Math.max(8, Math.min(innerWidth - cw - 8, left)) + "px";
    c.style.top = top + "px";
  };
  place();
  tutTimer = setInterval(place, 300);
}
function tutEnd(path) {
  const seen = Object.assign({}, (TUTS || {}).seen, { [path]: true });
  tutSave({ seen });
  const other = path === "panel" ? "garage" : "panel",
    L = tutLayer();
  tutCard(
    L,
    "<h3>Done! 🎉</h3><p>That's the " +
      (path === "panel" ? "colour panel" : "garage") +
      ". " +
      (seen[other]
        ? "You've seen both now."
        : "Want to learn the " +
          (other === "panel" ? "colour panel (<kbd>" + KEY_C + "</kbd>)" : "in-game garage") +
          " too?") +
      '</p><p style="font-size:12px;color:#aaa">The ? buttons replay this any time.</p>',
    seen[other]
      ? [["Finish", "go", tutClose]]
      : [
          ["Finish", "alt", tutClose],
          ["Show me the " + (other === "panel" ? "panel" : "garage") + " ›", "go", () => tutRun(other)],
        ],
    true,
  );
}
// ? in the garage: what each button does, plus the tutorial
export function openHelp(where) {
  const L = tutLayer();
  const rows =
    where === "garage"
      ? [
          ["⏻", "Custom colours on (green) or paused (grey): paused shows everyone's real tanks"],
          [
            "Real / All",
            "Real = your normal garage (saved to your account). All = every box and item plus the Color Lab boxes; everything you pick there only changes your tank for you",
          ],
          ["🎲", "Random look: choose parts, item slots and boxes, then Roll"],
          [
            "Pattern in-maze",
            "Shows up when a part has a pattern paint: choose if that pattern also shows in the maze",
          ],
          [
            "🔍 Find in garage",
            "Bottom-left: search or scroll everything. Click an item to put it on; T / B / Tr paint the turret, base or treads",
          ],
          ["<kbd>" + KEY_C + "</kbd>", "Opens the colour panel for painting any tank and saving looks"],
        ]
      : [];
  tutCard(
    L,
    "<h3>Help</h3><ul>" +
      rows.map(([a, b]) => '<li><b style="flex:0 0 100px">' + a + "</b><span>" + b + "</span></li>").join("") +
      "</ul>",
    [
      ["✨ Update notes", "alt", () => whatsNew(0)],
      ["▶ Tutorial", "go", () => tutChoose(false)],
      ["Close", "alt", tutClose],
    ],
    true,
  );
}

export function startTutorialRun() {
  TUT_STEPS = {
    panel: [
      {
        before: () => {
          setOpen(true);
          showTab("paint");
        },
        el: () => panel,
        t: "The colour panel",
        x:
          "Open or close it with <kbd>" +
          KEY_C +
          "</kbd> or the extension icon. Drag it by the top bar. If your tank ever shows its old look, <kbd>Alt+V</kbd> refreshes it.",
      },
      {
        el: () => $("name").parentNode,
        t: "Pick a tank",
        x: "Type any player's name and press <b>Find</b>, or press <b>Me</b> for your own tank (press again for your next one).",
      },
      {
        el: () => $("parts"),
        t: "Paint the parts",
        x: "Click <b>Turret</b>, <b>Base</b> or <b>Treads</b>, then pick a colour or paint. 🎲 on a part gives it a random one. Pattern paints get a <b>Pattern in-maze</b> tick: on = the pattern shows in the maze too.",
      },
      {
        el: () => $("hexrow"),
        t: "Exact colours",
        x: "Type a hex code like <b>#ff0000</b>. <b>Real</b> fills in the tank's real look, <b>Clear</b> empties everything.",
      },
      {
        el: () => $("rndAll").parentNode,
        t: "Random and party",
        x: "<b>🎲 Random</b> makes a whole new look. <b>🎉</b> gives your tanks new colours every round. <b>▾</b> opens the random settings.",
      },
      {
        before: () => {
          if (!SETTINGS.rndOpen) {
            $("rndOpts").click();
          }
        },
        el: () => $("rndBox"),
        t: "Random options",
        x: "<b>Colours from</b>: any colour, your saved ones, patterns, or one box. <b>🎩 Items</b>: light up slots and 🎲 Random, party mode and the garage 🎲 also roll items for them.",
      },
      {
        before: () => {
          if ($("swatches").hidden) {
            $("palToggle").click();
          }
        },
        el: () => $("swatches"),
        t: "Swatches",
        x: "Every box's paints and accessories, including the Color Lab boxes. Click one to use it. <b>Right-click</b> any paint or item to ★ favourite it: they all go in the <b>★ Favourites</b> tile.",
      },
      {
        before: () => {
          if (!$("swatches").hidden) {
            $("palToggle").click();
          }
        },
        el: () => $("save").parentNode,
        t: "Save it",
        x: "<b>Save</b> keeps this look for that tank. <b>+ Preset</b> saves another look you can switch between.",
      },
      {
        before: () => showTab("saved"),
        el: () => $("paneSaved"),
        t: "Saved tanks",
        x: "All your saved tanks: switch them on or off, pick a preset (up to 10 per tank), double-click to rename.",
      },
      {
        before: () => showTab("maze"),
        el: () => $("paneMaze"),
        t: "Maps 🗺",
        x: "Pick a <b>map theme</b> for the maze (75 of them, each light or dark), or <b>Random</b> for a new one every round. Themed bullets, crates and Laika's outfit match the map. Only you see your map.",
      },
      {
        before: () => {
          showTab("maze");
          const el = $("mzPage");
          if (el) {
            el.scrollIntoView({ block: "start" });
          }
        },
        el: () => $("mzPage") || $("paneMaze"),
        t: "Page theme 🎨",
        x: "Theme the <b>TankTrouble page itself</b> in a map's colours: background, header, side boxes, the game's buttons and the lobby pictures. <b>Match map</b> follows the map you play on, <b>One theme</b> keeps one, and <b>📅 Daily</b> gives a new one every day. With <b>Use it for the maze too</b>, the maze and Laika get it as well.",
      },
      {
        before: () => showTab("ach"),
        el: () => $("paneAch"),
        t: "Achievements 🏆",
        x: "Color Lab's own achievements. Earn them in online rounds to unlock extra items (and, for the hardest, a paint) in the <b>Achievements</b> box. Each one says how to get it.",
      },
      {
        before: () => showTab("settings"),
        el: () => $("paneSet"),
        t: "Settings ⚙",
        x: "Hide anything you don't use (in the panel and the garage), turn maze patterns on or off, replay this tutorial, and make or load a <b>backup</b>.",
      },
      {
        before: () => {
          showTab("settings");
          const el = $("setShare");
          if (el) {
            el.scrollIntoView({ block: "center" });
          }
        },
        el: () => $("setShare") || $("paneSet"),
        t: "Look sharing 🔗",
        x: "Other Color Lab users see your look (and <b>your bullets</b> from the 🗺 Maze tab), and you see theirs. A new look pops in for them straight away. <b>Click any tank</b> with a Color Lab look and its profile has a <b>Real / Color Lab</b> switch. Turn either part off here.",
      },
      {
        before: () => {
          showTab("settings");
          const el = $("setShare");
          if (el) {
            el.scrollIntoView({ block: "center" });
          }
        },
        el: () => $("setShare") || $("paneSet"),
        t: "Who can see you 🟢",
        x: "Turn on <b>Show me as online</b> to appear by name in the Color Lab box (and <b>Show which server I'm on</b> for your server). Off, you only count as hidden. Nothing about you is sent while Color Lab is <b>offline</b> (the switch in the game's top-right settings box).",
      },
      {
        before: () => setOpen(false),
        el: () => document.getElementById("ttclOnline"),
        t: "Who's online",
        x: "On the lobby's left: how many Color Lab players are online, and the ones who chose to be shown (green = online, yellow = idle). Click a name to see their tank.",
      },
      {
        el: () => document.getElementById("ttclLabSnippet"),
        t: "Message Color Lab 💬",
        x: "Found a bug or have an idea? Click here to write to the Color Lab team. You can add screenshots and read the replies right there.",
      },
      {
        before: () => {
          try {
            const b = document.getElementById("settings");
            if (!b || getComputedStyle(b).display === "none") {
              document.querySelector("#header .settings").click();
            }
          } catch {}
        },
        el: () => document.getElementById("ttclGear") || document.getElementById("settings"),
        t: "Color Lab in the game's settings ⚙",
        x: "A quick Color Lab section in the game's top-right settings box: <b>On / Off</b>, <b>Sharing</b>, <b>Online / Offline</b>, plus your page theme, map, Laika and bullets from pictures, the version, update notes and <b>Check for updates</b>.",
      },
      {
        before: () => {
          setOpen(true);
          showTab("paint");
        },
        el: () => $("power").parentNode,
        t: "Top buttons",
        x: "<b>⏻</b> pauses all custom colours, so you see everyone's real tanks, including your own (players without Color Lab always see your real look) · <b>?</b> help and shortcuts · <b>⚙</b> settings · <b>✕</b> close.",
      },
    ],
    garage: [
      {
        el: () => null,
        wait: () => !!gq("button.ttcl-garage"),
        t: "Open the garage",
        x: "Open one of your tanks' garage in the game (click your tank under the game). The tour carries on by itself when it opens.",
      },
      {
        el: () => null,
        t: "Folders 📁",
        x: "In <b>All</b>, the shelf starts with two folders: <b>Original</b> (the game's own boxes) and <b>Custom</b> (Color Lab's boxes, sorted by genre). Click a folder to open it and <b>← Back</b> to go up.",
      },
      {
        el: () => gq("button.ttcl-garage"),
        t: "Real / All",
        x: "<b>Real</b> = your normal garage: changes are saved to your account. <b>All</b> = every box, paint and item, plus the Color Lab boxes. Everything you pick in All only changes your tank for you; nothing is sent to TankTrouble. Real / All, 🎲 and Find only change the tank that's open (the highlighted tank at the bottom).",
      },
      {
        el: () => gq(".ttcl-gdice"),
        t: "Random look 🎲",
        x: "<b>🎲</b> rolls a new look straight away. <b>⚙</b> next to it sets what it rolls: which parts get paint (or the same paint on all), which item slots roll, and which boxes to pick from. In Real it only uses what you own.",
      },
      {
        el: () => gq(".ttcl-gpower"),
        t: "On / off ⏻",
        x: "Green = custom colours on. Grey = paused: you see everyone's real tanks. Same as ⏻ in the panel.",
      },
      { el: () => gq(".ttcl-ghelp"), t: "Help ?", x: "What every button does, and this tutorial again." },
      {
        before: () => {
          if (SETTINGS.gsearchMin) {
            SETTINGS.gsearchMin = false;
            saveSettings();
            renderGarageSearch();
          }
        },
        el: () => document.getElementById("ttcl-gsearch"),
        t: "Find in garage",
        x: "Search by name, box or key, or just scroll. Click an item to put it on; paints have <b>T</b> / <b>B</b> / <b>Tr</b> for turret, base and treads. Click the title bar to minimise it.",
      },
      {
        el: () => gq(".ttcl-mz"),
        t: "Pattern in-maze",
        x: "When your tank has a pattern paint (in All), buttons appear here to choose if each part's pattern also shows in the maze.",
      },
    ],
  };
}
