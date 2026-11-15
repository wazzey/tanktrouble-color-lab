import { shareCall } from "./look-sharing.js";

// Crash reports: an error in Color Lab's own code, or the game stopping while Color Lab runs, goes to the Color Lab
// team with only the version, what broke and where (nothing about the player), and only while look sharing is on
const CRASH_SENT = new Set();
let CRASH_LAST = null;

export function startCrashReports() {
  window.addEventListener("error", (e) => {
    const stack = String((e.error && e.error.stack) || "") + "\n" + String(e.filename || "");
    CRASH_LAST = { msg: String(e.message || ""), stack };
    if (/content\.js/.test(stack)) {
      applyCrashReport("error", CRASH_LAST.msg, stack);
    }
  });
  const wait = setInterval(() => {
    if (!window.Phaser || !Phaser.Game) {
      return;
    }
    clearInterval(wait);
    let frames = 0,
      ran = false,
      still = 0;
    const update = Phaser.Game.prototype.update;
    Phaser.Game.prototype.update = function (...args) {
      frames++;
      return update.apply(this, args);
    };
    setInterval(() => {
      if (frames > 0) {
        ran = true;
        still = 0;
      } else if (ran && document.visibilityState === "visible") {
        still++;
        if (still === 2) {
          applyCrashReport(
            "freeze",
            CRASH_LAST ? CRASH_LAST.msg : "the game stopped with no error",
            CRASH_LAST ? CRASH_LAST.stack : "",
          );
        }
      }
      frames = 0;
    }, 5000); // (two quiet checks in a row, so waking a laptop doesn't count)
  }, 1000);
  setTimeout(() => clearInterval(wait), 60000);
}

function applyCrashReport(kind, msg, stack) {
  const where = String(stack)
    .split("\n")
    .map((line) => (/([\w.-]+\.js):(\d+)(?::(\d+))?/.exec(line) || [])[0])
    .filter(Boolean)
    .slice(0, 4)
    .join(" < ");
  const text = String(msg).slice(0, 200),
    sig = kind + "|" + text + "|" + where;
  if (CRASH_SENT.has(sig) || CRASH_SENT.size >= 3) {
    return;
  }
  CRASH_SENT.add(sig);
  shareCall({ op: "crash", kind, msg: text, where }).catch(() => {});
}
