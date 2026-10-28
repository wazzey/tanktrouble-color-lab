import { TUT_VER, tutCard, tutLayer } from "../content/tutorials.js";
import { shareCall } from "./look-sharing.js";
import { toast } from "./panel.js";
import { SETTINGS, TUTS, WAS_USER, saveSettings, tutSave } from "./storage.js";
import { esc } from "./trophy-counting.js";
import { tutChoose, tutClose, whatsNew } from "./tutorial-run.js";

let EXT_VER;
let UPDATE_STEPS;
export function tutAuto() {
  if (document.getElementById("ttcl-tut")) {
    return;
  }
  if (!TUTS) {
    if (WAS_USER && !DEV_BUILD) {
      whatsNew(0);
    } else {
      tutChoose(true);
    }
  } else if ((TUTS.ver || 0) < TUT_VER) {
    whatsNew(TUTS.ver || 0);
  } else if (EXT_VER && TUTS.extVer && TUTS.extVer !== EXT_VER) {
    toast("Color Lab updated to v" + EXT_VER + " ✨");
  }
  if (EXT_VER && (!TUTS || TUTS.extVer !== EXT_VER)) {
    setTimeout(() => tutSave({ extVer: EXT_VER }), 500);
  } // (the version this browser has now seen)
}
// ---------- New version pop-up ----------
// Now and then (and on each visit) Color Lab asks its look server for the newest release on GitHub. When it's newer than
// this copy, a card shows what's new and how to update. "Remind me tomorrow" waits a day; "Skip this version" waits for the next one.
const verNum = (v) =>
  String(v || "")
    .replace(/^v/i, "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
export const verNewer = (a, b) => {
  const x = verNum(a),
    y = verNum(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) {
      return (x[i] || 0) > (y[i] || 0);
    }
  }
  return false;
};
export function mdLite(md) {
  // a release's notes (GitHub Markdown) as simple, safe HTML
  const inl = (t) =>
    esc(t)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  let out = "",
    list = false;
  const close = () => {
    if (list) {
      out += "</ul>";
      list = false;
    }
  };
  for (const raw of String(md || "")
    .split(/\r?\n/)
    .slice(0, 40)) {
    const l = raw.trim();
    if (!l) {
      close();
      continue;
    }
    if (/^[-*] /.test(l)) {
      if (!list) {
        out += '<ul style="margin:4px 0 6px 18px;padding:0">';
        list = true;
      }
      out += "<li>" + inl(l.slice(2)) + "</li>";
      continue;
    }
    close();
    out += /^#{1,4} /.test(l)
      ? '<p style="margin:8px 0 2px"><b>' + inl(l.replace(/^#+ /, "")) + "</b></p>"
      : '<p style="margin:4px 0">' + inl(l) + "</p>";
  }
  close();
  return out;
}
let updNeededShown = false;
export function updateNeeded(min) {
  // the look server turned this version away: everything on your computer still works, but online features are off until you update
  if (updNeededShown) {
    return;
  }
  updNeededShown = true;
  if (document.getElementById("ttcl-tut")) {
    updNeededShown = false;
    setTimeout(() => updateNeeded(min), 60 * 1000);
    return;
  }
  const L = tutLayer(),
    url = "https://github.com/wazzey/tanktrouble-color-lab/releases";
  tutCard(
    L,
    '<h3>Please update Color Lab</h3><p style="font-size:13px;margin:2px 0 6px">This version is too old for the online features' +
      (min ? " (v" + esc(String(min)) + " or newer is needed)" : "") +
      ". Your looks, paints and themes still work, but <b>look sharing and messages are off</b> until you update.</p>" +
      UPDATE_STEPS,
    [
      [
        "⬇ Get the update",
        "go",
        () => {
          window.open(url, "_blank", "noopener");
          tutClose();
        },
      ],
      ["Later", "alt", tutClose],
    ],
    true,
  );
}
export async function checkUpdate(force) {
  if (!force && SETTINGS.updAuto === false) {
    return;
  } // (switched off in Settings > Help)
  const now = Date.now();
  if (!force && SETTINGS.updLast && now - SETTINGS.updLast < 6 * 3600 * 1000 && !SETTINGS.updPending) {
    return;
  }
  const r = await shareCall({ op: "latest" });
  if (!r || !r.ok || !r.data || !r.data.tag || !r.current) {
    return;
  }
  SETTINGS.updLast = now;
  const tag = r.data.tag;
  if (!verNewer(tag, r.current)) {
    delete SETTINGS.updPending;
    saveSettings();
    return;
  } // up to date
  SETTINGS.updPending = tag;
  saveSettings();
  if (SETTINGS.updSkip === tag || (SETTINGS.updLater && now < SETTINGS.updLater)) {
    return;
  }
  if (document.getElementById("ttcl-tut")) {
    setTimeout(() => checkUpdate(true), 60 * 1000);
    return;
  } // (not over a tutorial or notes: a minute later)
  const L = tutLayer(),
    url =
      (() => {
        try {
          const u = new URL(String(r.data.url || ""));
          return u.protocol === "https:" &&
            u.hostname === "github.com" &&
            /^\/wazzey\/tanktrouble-color-lab\/releases(\/|$)/.test(u.pathname)
            ? u.href
            : null;
        } catch {
          return null;
        }
      })() ||
      "https://github.com/wazzey/tanktrouble-color-lab/releases"; /* (checked after the browser tidies the address, so a /wazzey/../ trick can't lead anywhere else) */
  tutCard(
    L,
    "<h3>Color Lab " +
      esc(tag) +
      ' is out ✨</h3><p style="font-size:13px;margin:2px 0 8px;color:#aaa">You have v' +
      esc(r.current) +
      ". What's new:</p>" +
      '<div class="md" style="max-height:260px;overflow-y:auto;overflow-x:hidden;overflow-wrap:anywhere;font-size:13px;line-height:1.45;padding-right:6px">' +
      mdLite(r.data.notes) +
      "</div>" +
      '<p style="font-size:12px;color:#aaa;margin:8px 0 0">To update:</p>' +
      UPDATE_STEPS,
    [
      [
        "⬇ Get the update",
        "go",
        () => {
          window.open(url, "_blank", "noopener");
          tutClose();
        },
      ],
      [
        "Remind me tomorrow",
        "alt",
        () => {
          SETTINGS.updLater = Date.now() + 24 * 3600 * 1000;
          saveSettings();
          tutClose();
        },
      ],
      [
        "Skip this version",
        "alt",
        () => {
          SETTINGS.updSkip = tag;
          saveSettings();
          tutClose();
        },
      ],
    ],
    true,
  );
}

export function startUpdates() {
  EXT_VER = document.documentElement.dataset.ttclVer || ""; // this copy's version (set by bridge.js)
  UPDATE_STEPS =
    '<div style="font-size:12px;color:#aaa;margin:6px 0 0;line-height:1.55">' +
    [
      "Click <b>⬇ Get the update</b> and download the zip from GitHub.",
      "Unzip it and copy the new files over your old Color Lab folder (replace them). Your looks are kept.",
      "Open your browser's extensions page (<b>chrome://extensions</b>, <b>brave://extensions</b> or <b>edge://extensions</b>) and press <b>↻ reload</b> on Color Lab.",
      "Refresh TankTrouble.",
    ]
      .map((t, n) => '<div style="display:block;margin:2px 0"><b>' + (n + 1) + ".</b> " + t + "</div>")
      .join("") +
    "</div>";
}
