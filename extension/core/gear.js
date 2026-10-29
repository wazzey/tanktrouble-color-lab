import { isPat } from "../content/colours.js";
import { LAIKA_SKINS } from "../content/laika.js";
import { MAP_THEMES, mapThemeList } from "../content/maps.js";
import { PAGE_SPECIAL, pageThemeName, pageThemeOk } from "../content/page-themes.js";
import { fbRefresh } from "./feedback.js";
import { colourName } from "./garage-search.js";
import { laikaDog, laikaSkinChanged, redoLaikaSkin } from "./laika-look.js";
import { shareCall, shareMine, shareMyLooks, shareWatch } from "./look-sharing.js";
import { mapApplyNow } from "./map-themes.js";
import { BULLET_COLS, bulletIcon, bulletWarn, mapThumb, renderMazeTab } from "./maze-tab.js";
import { onlineFetch } from "./online.js";
import { pageKeyNow, pagePal } from "./page.js";
import { $, toast } from "./panel.js";
import { renderSettings } from "./settings.js";
import { SETTINGS, saveSettings } from "./storage.js";
import { setOpen } from "./tabs.js";
import { consentChoose, whatsNew } from "./tutorial-run.js";
import { checkUpdate, verNewer } from "./updates.js";

let gearG;

// The game's top-right settings box (Server / Quality) in the page theme, with a small Color Lab section
function gearTheme() {
  const P = pageKeyNow ? pagePal(pageKeyNow) : null;
  let st = document.getElementById("ttclGearCss");
  if (!st) {
    st = document.createElement("style");
    st.id = "ttclGearCss";
    document.head.appendChild(st);
  }
  const c = P
    ? `#settings .content{max-height:calc(100vh - 120px);overflow-y:auto;background:linear-gradient(${P.panel},${P.panel2})!important;color:${P.ink}!important;border:1px solid ${P.accent}88}#settings .spaced{color:${P.ink}!important}#settings .tab{background:${P.panel2}!important}
#settings .ui-selectmenu-button{background:rgba(0,0,0,.35)!important;color:${P.ink}!important;border:1px solid ${P.accent}88!important}#settings .ui-selectmenu-button .ui-icon{filter:invert(1)}
.ui-selectmenu-menu .ui-menu{background:${P.panel2}!important;color:${P.ink}!important;border:1px solid ${P.accent}88!important}.ui-selectmenu-menu .ui-menu .ui-menu-item-wrapper{color:${P.ink}!important;background:none!important;border:0!important}
.ui-selectmenu-menu .ui-menu .ui-state-active,.ui-selectmenu-menu .ui-menu .ui-state-focus{background:linear-gradient(${P.pBtnTop},${P.pBtnBot})!important;color:#fff!important}
#settings .content{box-sizing:border-box;overflow-x:hidden}#ttclGear .ttgx:hover{background:rgba(127,127,127,.18)}#ttclGear .h:hover{opacity:.85}#ttclGear{margin-top:8px;padding-top:6px;max-width:100%;border-top:1px solid ${P.accent}77}#ttclGear .h{font:bold 13px Arial;color:${P.head};margin-bottom:5px;cursor:pointer;user-select:none}#ttclGear label.ttg{display:flex;align-items:center;gap:6px;margin:3px 0;font:12px Arial;color:${P.ink}}#ttclGear label.ttg span{flex:0 0 72px;white-space:pre}#ttclGear select{flex:1;min-width:0;font:12px Arial;padding:3px 4px;border-radius:5px;background:rgba(0,0,0,.4);color:${P.ink};border:1px solid ${P.accent}88}#ttclGear select option{background:${P.panel2};color:${P.ink}}`
    : `#settings .content{max-height:calc(100vh - 120px);overflow-y:auto}#settings .content{box-sizing:border-box;overflow-x:hidden}#ttclGear .ttgx:hover{background:rgba(127,127,127,.18)}#ttclGear .h:hover{opacity:.85}#ttclGear{margin-top:8px;padding-top:6px;max-width:100%;border-top:1px solid #9998}#ttclGear .h{font:bold 13px Arial;color:#444;margin-bottom:5px;cursor:pointer;user-select:none}#ttclGear label.ttg{display:flex;align-items:center;gap:6px;margin:3px 0;font:12px Arial;color:#222}#ttclGear label.ttg span{flex:0 0 72px;white-space:pre}#ttclGear select{flex:1;min-width:0;font:12px Arial;padding:3px 4px;border-radius:5px}`;
  if (st.textContent !== c) {
    st.textContent = c;
  }
}
let gearVer = null; // this copy's version, from the version check (it sends nothing about you)
const gearOpen = () => {
  try {
    return localStorage.getItem("ttclGearOpen") !== "0";
  } catch {
    return true;
  }
};
function gearQuick() {
  const box = document.querySelector("#settings .content");
  if (!box) {
    return;
  }
  let g = document.getElementById("ttclGear");
  if (g && g.parentNode !== box) {
    g.remove();
    g = null;
  }
  const open = gearOpen(),
    sig = [
      SETTINGS.on,
      open,
      SETTINGS.pageMode || "off",
      SETTINGS.pageFixed,
      SETTINGS.mapMode || "game",
      SETTINGS.mapFixed,
      SETTINGS.laikaSkin,
      SETTINGS.laikaLook,
      !!SETTINGS.laikaDog,
      SETTINGS.myBullet,
      shareMine(),
      SETTINGS.goOffline === true,
      SETTINGS.invisible === true,
      gearVer,
      SETTINGS.updPending || "",
      Object.keys(gearG)
        .filter((k) => gearG[k])
        .join(","),
    ].join("|");
  if (g && g.dataset.sig === sig) {
    return;
  }
  if (!g) {
    g = document.createElement("div");
    g.id = "ttclGear";
    box.appendChild(g);
  }
  g.dataset.sig = sig;
  g.textContent = "";
  const hd = document.createElement("div");
  hd.className = "h";
  hd.textContent = "Color Lab ";
  {
    const ar = document.createElement("span");
    ar.style.cssText =
      "display:inline-block;width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:9px solid currentColor;transition:transform .15s;transform:rotate(" +
      (open ? 90 : 0) +
      "deg)" +
      ";margin-left:4px;vertical-align:0";
    hd.appendChild(ar);
  }
  hd.title = "Show or hide the Color Lab controls";
  hd.onclick = (e) => {
    e.stopPropagation();
    try {
      localStorage.setItem("ttclGearOpen", open ? "0" : "1");
    } catch {}
    gearQuick();
  };
  g.appendChild(hd);
  if (!open) {
    return;
  }
  const row = document.createElement("div");
  row.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px";
  g.appendChild(row);
  const mk = (t, on, tip, fn) => {
    const b = document.createElement("button");
    b.className = "small" + (on ? "" : " grey");
    b.textContent = t;
    b.title = tip;
    b.onclick = (e) => {
      e.stopPropagation();
      fn();
      gearQuick();
    };
    row.appendChild(b);
  };
  mk(SETTINGS.on ? "⏻ On" : "⏻ Off", SETTINGS.on, "Custom colours on / off", () => {
    $("power").onclick();
  });
  mk(
    shareMine() ? "📡 Sharing" : "📡 Not sharing",
    shareMine(),
    "Share my look with other Color Lab players: on / off",
    () => {
      SETTINGS.shareMine = !shareMine();
      saveSettings();
      try {
        renderSettings();
      } catch {}
      try {
        fbRefresh(false);
      } catch {}
    },
  );
  mk(
    SETTINGS.goOffline === true ? "🔌 Offline" : "🟢 Online",
    SETTINGS.goOffline !== true,
    "Go offline: Color Lab stops contacting its server completely (no sharing, no online list, nothing sent) until you switch it back on",
    () => {
      if (SETTINGS.goOffline === true && SETTINGS.consent !== "share") {
        consentChoose();
        return;
      } // (chose to keep it local: what the server gets is shown again before connecting)
      if (SETTINGS.goOffline !== true) {
        try {
          shareCall({ op: "fblist", off: true, show: false }).catch(() => {});
        } catch {}
      }
      /* (tells the server once that it went offline on purpose, so the owner can tell it from a closed tab) */ SETTINGS.goOffline =
        !(SETTINGS.goOffline === true);
      saveSettings();
      try {
        renderSettings();
      } catch {}
      try {
        shareWatch(true);
      } catch {}
      if (SETTINGS.goOffline !== true) {
        setTimeout(() => {
          try {
            fbRefresh(false);
            onlineFetch();
          } catch {}
        }, 500);
      }
    },
  );
  mk(
    SETTINGS.invisible === true ? "👻 Invisible" : "👁 Visible",
    SETTINGS.invisible !== true,
    'Invisible: other Color Lab players don\'t see you online at all (not listed, not counted). Visible: you show up if "Show me as online" is on',
    () => {
      SETTINGS.invisible = !(SETTINGS.invisible === true);
      saveSettings();
      try {
        renderSettings();
      } catch {}
      try {
        fbRefresh(false);
      } catch {}
      setTimeout(() => {
        try {
          onlineFetch();
        } catch {}
      }, 2500);
    },
  );
  mk("🎨 Open", true, "Open the Color Lab panel", () => setOpen(true));
  if (gearVer === null) {
    gearVer = "";
    shareCall({ op: "latest" })
      .then((r) => {
        if (r && r.current) {
          gearVer = String(r.current);
          gearQuick();
        }
      })
      .catch(() => {});
  }
  {
    const r3 = document.createElement("div");
    r3.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:0 0 6px";
    g.appendChild(r3);
    const vl = document.createElement("span");
    vl.style.cssText = "font:12px Arial;opacity:.85";
    vl.textContent = "v" + (gearVer || "…");
    vl.title = "The version of Color Lab you are running";
    r3.appendChild(vl);
    const nb = document.createElement("button");
    nb.className = "small grey";
    nb.textContent = "✨ Update notes";
    nb.title = "What's new in this version";
    nb.onclick = (e) => {
      e.stopPropagation();
      try {
        whatsNew(0);
      } catch {}
    };
    r3.appendChild(nb);
    const ub = document.createElement("button");
    ub.className = "small" + (SETTINGS.updPending ? "" : " grey");
    ub.textContent = SETTINGS.updPending ? "🔔 Update available: " + SETTINGS.updPending : "🔔 Check for updates";
    ub.title = "Check GitHub for a newer version of Color Lab";
    ub.onclick = async (e) => {
      e.stopPropagation();
      delete SETTINGS.updSkip;
      delete SETTINGS.updLater;
      ub.disabled = true;
      ub.textContent = "Checking…";
      const r = await shareCall({ op: "latest" }).catch(() => null);
      ub.disabled = false;
      ub.textContent = SETTINGS.updPending ? "🔔 Update available: " + SETTINGS.updPending : "🔔 Check for updates";
      if (r && r.store) {
        gearVer = String(r.current);
        gearQuick();
        return toast("The Chrome Web Store keeps Color Lab up to date for you (v" + r.current + ")");
      }
      if (!r || !r.ok || !r.data || !r.data.tag) {
        gearQuick();
        return toast("Couldn't reach the update check. Try again later", true);
      }
      if (r.current) {
        gearVer = String(r.current);
      }
      if (!verNewer(r.data.tag, r.current)) {
        delete SETTINGS.updPending;
        saveSettings();
        gearQuick();
        return toast("You have the newest version (v" + r.current + ")");
      }
      gearQuick();
      checkUpdate(true);
    };
    r3.appendChild(ub);
  }
  const sel = (label, opts, cur, fn) => {
    const w = document.createElement("label");
    w.className = "ttg";
    const t = document.createElement("span");
    t.textContent = label;
    const s = document.createElement("select");
    for (const [v, tx] of opts) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = tx;
      s.appendChild(o);
    }
    s.value = cur;
    s.onclick = (e) => e.stopPropagation();
    s.onchange = () => {
      try {
        fn(s.value);
      } catch {}
      gearQuick();
    };
    w.append(t, s);
    g.appendChild(w);
  };
  const grid = (key, title, items, cur, fn, cap) => {
    const op = !!gearG[key],
      hd2 = document.createElement("div");
    hd2.className = "ttgx";
    hd2.style.cssText =
      "font:12px Arial;margin:3px 0 2px;padding:3px 4px;border-radius:5px;cursor:pointer;user-select:none;display:flex;gap:6px;align-items:center";
    hd2.title = op ? "Hide the pictures" : "Show the pictures";
    const a0 = document.createElement("span");
    a0.style.cssText = "flex:0 0 14px;display:flex;justify-content:center";
    {
      const tr = document.createElement("span");
      tr.style.cssText =
        "display:inline-block;width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:9px solid currentColor;transition:transform .15s;transform:rotate(" +
        (op ? 90 : 0) +
        "deg)";
      a0.appendChild(tr);
    }
    hd2.appendChild(a0);
    const a1 = document.createElement("span");
    a1.style.cssText = "font-weight:bold";
    a1.textContent = title;
    const a2 = document.createElement("span");
    a2.style.cssText = "opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    a2.textContent = cap || "";
    hd2.append(a1, a2);
    hd2.onclick = (e) => {
      e.stopPropagation();
      gearG[key] = !gearG[key];
      try {
        localStorage.setItem("ttclGearGrids", JSON.stringify(gearG));
      } catch {}
      gearQuick();
    };
    g.appendChild(hd2);
    if (!op) {
      return;
    }
    const gd = document.createElement("div");
    gd.style.cssText =
      "display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:4px;max-height:132px;overflow-y:auto;margin:3px 0 5px;padding:2px";
    let selEl = null;
    for (const [k, el, name] of items) {
      const on = k === cur,
        t = document.createElement("div");
      t.title = name;
      t.style.cssText =
        "min-height:34px;border-radius:5px;cursor:pointer;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden;font:10px Arial;text-align:center;line-height:1.1;padding:1px;background:rgba(0,0,0,.25);color:inherit;border:2px solid " +
        (on ? "#ffb000" : "rgba(127,127,127,.35)") +
        (on ? ";box-shadow:0 0 6px #ffb000" : "");
      if (on) {
        selEl = t;
      }
      t.appendChild(el);
      t.onclick = (e) => {
        e.stopPropagation();
        fn(k);
        gearQuick();
      };
      gd.appendChild(t);
    }
    g.appendChild(gd);
    if (selEl) {
      setTimeout(() => {
        try {
          gd.scrollTop = Math.max(0, selEl.offsetTop - gd.offsetTop - 40);
        } catch {}
      }, 0);
    }
  };
  const txt = (t) => {
    const e = document.createElement("span");
    e.textContent = t;
    return e;
  };
  const thumb = (k) => {
    const c = mapThumb(k);
    c.style.cssText = "width:34px;height:34px;display:block";
    return c;
  };
  // the page (the game's own pages)
  const pm = SETTINGS.pageMode || "off";
  sel(
    "🖼 Page",
    [
      ["off", "Normal"],
      ["map", "Match map"],
      ["fixed", "One theme"],
      ["daily", "Daily"],
    ],
    pm,
    (v) => {
      SETTINGS.pageMode = v;
      if (v === "fixed" && !pageThemeOk(SETTINGS.pageFixed)) {
        SETTINGS.pageFixed = pageKeyNow || "volcano";
      }
      saveSettings();
      try {
        renderMazeTab();
      } catch {}
    },
  );
  if (pm === "fixed") {
    const pk = pageThemeOk(SETTINGS.pageFixed) ? SETTINGS.pageFixed : pageKeyNow || "volcano";
    grid(
      "page",
      "🖼 Theme",
      [...Object.keys(PAGE_SPECIAL), ...mapThemeList().filter((k) => k !== "standard")].filter(pageThemeOk).map((k) => {
        let P = null;
        try {
          P = pagePal(k);
        } catch {}
        const e = document.createElement("div");
        e.style.cssText =
          "width:100%;height:28px;border-radius:3px;" +
          (P
            ? "background:linear-gradient(" +
              P.header +
              " 0 7px,transparent 7px),linear-gradient(90deg," +
              P.bgTop +
              " 0 45%," +
              P.panel +
              " 45% 100%);box-shadow:inset 0 -5px 0 " +
              P.accent
            : "background:#666");
        return [k, e, pageThemeName(k)];
      }),
      pk,
      (v) => {
        SETTINGS.pageFixed = v;
        saveSettings();
        try {
          renderMazeTab();
        } catch {}
      },
      pageThemeName(pk),
    );
  }
  // the maze
  const mm = SETTINGS.mapMode || "game";
  sel(
    "🗺 Map",
    [
      ["game", "Game's own"],
      ["fixed", "One map"],
      ["random", "🎲 Random"],
      ["cycle", "🔁 Take turns"],
    ],
    mm,
    (v) => {
      SETTINGS.mapMode = v;
      if (v === "fixed" && !MAP_THEMES[SETTINGS.mapFixed]) {
        SETTINGS.mapFixed = mapThemeList().find((k) => k !== "standard") || "standard";
      }
      saveSettings();
      try {
        mapApplyNow();
      } catch {}
      try {
        renderMazeTab();
      } catch {}
    },
  );
  if (mm === "fixed") {
    const mk2 = MAP_THEMES[SETTINGS.mapFixed] ? SETTINGS.mapFixed : mapThemeList()[0];
    grid(
      "map",
      "🗺 Maze",
      mapThemeList().map((k) => [k, thumb(k), MAP_THEMES[k].name]),
      mk2,
      (v) => {
        SETTINGS.mapFixed = v;
        saveSettings();
        try {
          mapApplyNow();
        } catch {}
        try {
          renderMazeTab();
        } catch {}
      },
      MAP_THEMES[mk2].name,
    );
  }
  // Laika (the game's AI dog)
  const lcur =
    SETTINGS.laikaSkin === false
      ? "off"
      : SETTINGS.laikaLook && LAIKA_SKINS[SETTINGS.laikaLook]
        ? SETTINGS.laikaLook
        : "map";
  {
    const lpick = (v) => {
      if (v === "off") {
        SETTINGS.laikaSkin = false;
      } else {
        SETTINGS.laikaSkin = true;
        SETTINGS.laikaLook = v;
      }
      saveSettings();
      redoLaikaSkin();
      try {
        laikaSkinChanged();
      } catch {}
      try {
        renderMazeTab();
      } catch {}
    };
    grid(
      "laika",
      "🐕 Laika",
      [
        ["off", txt("🚫 Off"), "Laika doesn't dress up"],
        ["map", txt("🗺 Map"), "Laika follows the map"],
        ...Object.keys(LAIKA_SKINS).map((k) => [k, thumb(k), "Always " + (MAP_THEMES[k] ? MAP_THEMES[k].name : k)]),
      ],
      lcur,
      lpick,
      lcur === "off"
        ? "doesn't dress up"
        : lcur === "map"
          ? "follows the map"
          : "always " + (MAP_THEMES[lcur] ? MAP_THEMES[lcur].name : lcur),
    );
  }
  {
    const r2 = document.createElement("div");
    r2.style.cssText = "display:flex;gap:5px;margin:2px 0 4px";
    g.appendChild(r2);
    const b = document.createElement("button");
    b.className = "small" + (SETTINGS.laikaDog ? "" : " grey");
    b.textContent = SETTINGS.laikaDog ? "🧪 Laika's dog: on" : "🧪 Laika's dog: off";
    b.title = "Repaint Laika's robot dog in the same theme (experimental)";
    b.onclick = (e) => {
      e.stopPropagation();
      SETTINGS.laikaDog = !SETTINGS.laikaDog;
      saveSettings();
      try {
        laikaDog();
      } catch {}
      try {
        renderMazeTab();
      } catch {}
      gearQuick();
    };
    r2.appendChild(b);
  }
  // your own bullets
  const my = SETTINGS.myBullet || "",
    bo = [["", "Same as everyone's"], ["turret", "My turret paint"], ...BULLET_COLS.map((v) => [v, colourName(v)])];
  if (my && !bo.some((o) => o[0] === my)) {
    bo.push([my, isPat(my) ? "A Color Lab paint" : colourName(my)]);
  }
  {
    grid(
      "bullets",
      "💥 Your bullets",
      bo.map(([v, tx]) => [
        v,
        v && v !== "turret" && !isPat(v)
          ? (() => {
              const c = bulletIcon(v, 20);
              c.style.cssText = "display:block;margin:auto";
              return c;
            })()
          : txt(v === "turret" ? "Turret" : v ? "🎨" : "Same"),
        tx,
      ]),
      my,
      (v) => {
        SETTINGS.myBullet = v || null;
        saveSettings();
        try {
          renderMazeTab();
        } catch {}
        try {
          shareMyLooks();
        } catch {}
      },
      (bo.find((o) => o[0] === my) || bo[0])[1],
    );
    {
      const wt = bulletWarn(my || null);
      if (wt) {
        const w = document.createElement("div");
        w.style.cssText = "font:11px Arial;opacity:.85;margin:0 0 4px;line-height:1.25";
        w.textContent = wt;
        g.appendChild(w);
      }
    }
  }
}
let gearKey = "";
function gearPlace(force) {
  // the game places this box once when it opens it; ours is wider, so it gets a fixed width and sits under the gear, right-aligned. Only re-placed when it opens or the window size changes (never by its own width: that made it creep)
  const b = document.getElementById("settings"),
    gi = document.querySelector("#header .settings");
  if (!b || !gi || getComputedStyle(b).display === "none") {
    gearKey = "";
    return;
  }
  const key = innerWidth + "x" + innerHeight;
  if (!force && gearKey === key && b.dataset.ttclW) {
    return;
  }
  const gr = gi.getBoundingClientRect();
  if (!gr.width) {
    return;
  }
  const w = Math.min(340, innerWidth - 8);
  b.style.width = w + "px";
  b.style.boxSizing = "border-box";
  b.dataset.ttclW = "1";
  b.style.left =
    Math.max(
      4,
      Math.min(Math.round(gr.right + pageXOffset - w + 6), document.documentElement.clientWidth + pageXOffset - w - 10),
    ) + "px";
  gearKey = key;
}
const gearShown = () => {
  const b = document.getElementById("settings");
  return !!b && getComputedStyle(b).display !== "none";
};

export function startGear() {
  gearG = (() => {
    try {
      return JSON.parse(localStorage.getItem("ttclGearGrids") || "{}") || {};
    } catch {
      return {};
    }
  })(); // which picture lists are open (all start closed)
  setInterval(() => {
    try {
      gearTheme();
      if (gearShown()) {
        gearQuick();
      }
      gearPlace();
    } catch {}
  }, 1500); // (built only while the box is open: building it hidden froze the page for ~0.4 s after every refresh)
  {
    let gw = 0;
    const warm = () => {
      try {
        if (gearShown()) {
          return;
        }
        const ks = mapThemeList(); // (the pictures it shows are drawn a few at a time when the page is idle, so opening it is quick too)
        const idle = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 200));
        idle((dl) => {
          try {
            while (gw < ks.length && dl.timeRemaining() > 4) {
              mapThumb(ks[gw++]);
            }
          } catch {
            gw = ks.length;
          }
          if (gw < ks.length) {
            warm();
          }
        });
      } catch {}
    };
    setTimeout(warm, 6000);
  }
  document.addEventListener(
    "click",
    () => {
      setTimeout(() => {
        try {
          if (gearShown()) {
            gearTheme();
            gearQuick();
            gearPlace();
          }
        } catch {}
      }, 0);
    },
    true,
  ); // (opening the box: filled straight away, not on the next check)
  document.addEventListener(
    "click",
    () => {
      gearKey = "";
      for (const t of [60, 400]) {
        setTimeout(() => {
          try {
            gearQuick();
            gearPlace();
          } catch {}
        }, t);
      }
    },
    true,
  );
  addEventListener("resize", () => {
    try {
      gearKey = "";
      gearPlace(true);
    } catch {}
  });
}
