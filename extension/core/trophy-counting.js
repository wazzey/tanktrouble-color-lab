import { DIMITRI_IDS, LAIKA_IDS } from "../content/laika.js";
import { TROPHIES, trophyById } from "../content/laika-trophies.js";
import { liveSockets, loggedInIds } from "./game-socket.js";
import { GAME_STATE } from "./garage.js";
import { origFetch } from "./network.js";
import { renderPalette, renderSources } from "./palette.js";
import { toast } from "./panel.js";
import { STATS, saveStats } from "./storage.js";
import { curTab, renderAch } from "./tabs.js";
import { TROPHY_ART, getTrophyArt } from "./trophy-art.js";

// --- counting: Laika kills in a row ---
export function noteAIs(data) {
  if (!Array.isArray(data)) {
    return;
  }
  for (const a of data) {
    if (a && a.playerId != null && a.config) {
      if (/laika/i.test(String(a.config.name || ""))) {
        LAIKA_IDS.add(String(a.playerId));
      }
      if (/dimitri/i.test(String(a.config.name || ""))) {
        DIMITRI_IDS.add(String(a.playerId));
      }
    }
  }
}
// Only online games count: kills are read from the game server's own "tank killed" messages (type 3),
// which local games (played entirely in your browser) never receive.
export function onTankKilled(killer, victim, weapon) {
  const mine = new Set(loggedInIds());
  let changed = false;
  if (mine.has(victim)) {
    // destroyed: AI streaks over
    if (STATS.streak[victim]) {
      STATS.streak[victim] = 0;
      changed = true;
    }
  }
  if (mine.has(killer) && killer !== victim) {
    if (LAIKA_IDS.has(victim)) {
      const n = (STATS.streak[killer] = (STATS.streak[killer] || 0) + 1);
      if (n > (STATS.best[killer] || 0)) {
        STATS.best[killer] = n;
      }
      changed = true;
    }
    if (Number.isInteger(weapon) && weapon >= 0) {
      const w = STATS.weapons[killer] || (STATS.weapons[killer] = {});
      w[weapon] = (w[weapon] || 0) + 1;
      changed = true;
    }
    for (const t of TROPHIES) {
      if (trophyProgress(killer, t) >= t.need) {
        unlockTrophy(killer, t);
      }
    }
  }
  if (changed) {
    saveStats();
  }
}
const dimRound = {};
export function onCollectibleTaken(collectibleId, playerId) {
  const gc = GAME_STATE && GAME_STATE.gameController;
  if (!gc || !gc.getCollectible) {
    return;
  }
  const col = gc.getCollectible(collectibleId);
  if (!col || !col.getType || col.getType() !== 10) {
    return;
  }
  const mine = new Set(loggedInIds()),
    who = String(playerId);
  if (mine.has(who)) {
    const round = gc.getRoundId ? gc.getRoundId() : null;
    if (round != null && dimRound[who] === round) {
      return;
    } // one a round
    dimRound[who] = round;
    const n = (STATS.gstreak[who] = (STATS.gstreak[who] || 0) + 1);
    if (n > (STATS.gbest[who] || 0)) {
      STATS.gbest[who] = n;
    }
    for (const t of TROPHIES) {
      if (t.kind === "dimitrium" && n >= t.need) {
        unlockTrophy(who, t);
      }
    }
  } else {
    for (const id of mine) {
      STATS.gstreak[id] = 0;
    }
  } // someone else got it: streaks over
  saveStats();
}
function trophyProgress(pid, t) {
  if (t.kind === "laika") {
    return STATS.streak[pid] || 0;
  }
  if (t.kind === "dimitrium") {
    return STATS.gstreak[pid] || 0;
  }
  const w = STATS.weapons[pid] || {};
  return (t.weapons || []).reduce((n, k) => n + (w[k] || 0), 0);
}
export function unlockTrophy(pid, t, force) {
  const u = STATS.unlocked[pid] || (STATS.unlocked[pid] = {});
  if (u[t.id] && !force) {
    return;
  }
  u[t.id] = Date.now();
  if (STATS.seen[pid]) {
    delete STATS.seen[pid][t.id];
  }
  saveStats();
  getTrophyArt([t.key]);
  announceUnlock(pid, t.id);
  try {
    renderSources();
    renderPalette();
    if (curTab === "ach") {
      renderAch();
    }
  } catch {}
}
// The game's own pop-up, through the message the server would send (type 41). If there's no connection,
// it's attached to the game's next server reply instead.
export const pendingUnlocks = [];
// Several at once (e.g. the first time you log in, when your account's lifetime numbers already pass a few of them):
// one short message instead of a pile of pop-ups covering the top of the screen. One or two still get the game's pop-up.
const unlockBatch = {};
function announceUnlock(pid, achId) {
  const k = String(pid),
    b = unlockBatch[k] || (unlockBatch[k] = { ids: [], t: 0 });
  b.ids.push(String(achId));
  clearTimeout(b.t);
  b.t = setTimeout(() => {
    delete unlockBatch[k];
    if (b.ids.length <= 2) {
      b.ids.forEach((id) => announceOne(k, id));
    } else {
      toast("🏆 You unlocked " + b.ids.length + " Color Lab achievements! See them in the 🏆 tab (Alt+C)", false, 6000);
    }
  }, 1500);
}
function announceOne(pid, achId) {
  let sent = 0;
  for (const ws of [...liveSockets]) {
    const fn = ws.__ttOrigHandler;
    if (ws.readyState !== 1 || typeof fn !== "function") {
      continue;
    }
    try {
      fn.call(
        ws,
        new MessageEvent("message", {
          data: JSON.stringify({ _typeId: 41, playerId: String(pid), achievementId: String(achId) }),
        }),
      );
      sent++;
      break;
    } catch {}
  }
  if (!sent) {
    pendingUnlocks.push({ playerId: String(pid), achievementId: String(achId) });
  }
}

// --- the achievements list / pop-up / "seen" ---
export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
function achHtml(pid, t, mode) {
  // mode: 'reveal' (not seen yet), 'seen', 'teaser' (the pop-up)
  const art = TROPHY_ART && TROPHY_ART[t.key],
    mys = TROPHY_ART && TROPHY_ART.mystery;
  const tag = mode === "teaser" ? "unlock" : "overlay";
  const name = mode === "teaser" ? "Hidden Achievement" : t.name,
    text = mode === "teaser" ? "Something was unlocked! Open your tank's achievements to find out what." : t.text;
  const un = mode === "teaser" ? mys && mys.unlocked : art && art.icon,
    lo = mode === "teaser" ? mys && mys.locked : art && art.locked;
  const pic =
    mode === "seen"
      ? `<img src="${un || ""}" alt="" width="120" height="120">`
      : `<achievement-reveal data-achievement-id="${t.id}" data-player-id="${esc(pid)}"><img class="unlocked" id="unlocked-${tag}-${t.id}" src="${un || ""}" alt="" width="120" height="120"><img class="locked" id="locked-${tag}-${t.id}" src="${lo || un || ""}" alt="" width="120" height="120"></achievement-reveal>`;
  return `<div class="achievement"><div id="shine-${tag}-${t.id}" class="shine${mode === "seen" ? " shiny" : ""}"></div><div class="container"><div class="header">\n\t\t\t${esc(name)}\n\t\t</div><div>\n\t\t\t${esc(text)}\n\t\t</div><div>${pic}</div></div></div>`;
}
const achEntry = (pid, t, mode) => ({
  id: t.id,
  name: t.name,
  description: "",
  unlockedDescription: t.text,
  rewardId: 0,
  visibility: "when-unlocked",
  hideProgress: true,
  html: { achievement: achHtml(pid, t, mode) },
});
const myTrophies = (pid) => TROPHIES.filter((t) => STATS.unlocked[pid] && STATS.unlocked[pid][t.id]);
const jsonReply = (data, id) =>
  new Response(
    JSON.stringify({ jsonrpc: "2.0", id: id != null ? id : 1, result: { result: true, message: "OK", data } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
// Requests about our trophies are answered here and never reach the server; lists get our trophies added.
export function achievementCall(body, input, init) {
  let j;
  try {
    j = JSON.parse(body);
  } catch {
    return null;
  }
  const [pidRaw, achId] = j.params || [],
    pid = String(pidRaw),
    m = j.method;
  if (m === "tanktrouble.achievement.getUnlockedAchievement" && trophyById(achId)) {
    const t = trophyById(achId);
    return getTrophyArt([t.key]).then(() =>
      jsonReply(
        Object.assign(achEntry(pid, t, "teaser"), { name: "Hidden Achievement", unlockedDescription: "" }),
        j.id,
      ),
    );
  }
  if (m === "tanktrouble.achievement.markAchievementAsSeen" && trophyById(achId)) {
    (STATS.seen[pid] || (STATS.seen[pid] = {}))[String(achId)] = true;
    saveStats();
    return Promise.resolve(jsonReply(null, j.id));
  }
  const list =
    m === "tanktrouble.achievement.getAchievements"
      ? "all"
      : m === "tanktrouble.achievement.getUnseenAchievements"
        ? "unseen"
        : null;
  if (!list || !myTrophies(pid).length) {
    return null;
  }
  return Promise.all([origFetch(input, init), getTrophyArt(myTrophies(pid).map((t) => t.key))]).then(async ([res]) => {
    try {
      const json = JSON.parse(await res.clone().text());
      if (!json.result || !Array.isArray(json.result.data)) {
        return res;
      }
      for (const t of myTrophies(pid)) {
        const seen = !!(STATS.seen[pid] && STATS.seen[pid][t.id]);
        if (list === "unseen" && seen) {
          continue;
        }
        json.result.data.push(achEntry(pid, t, seen ? "seen" : "reveal"));
      }
      return jsonReply(json.result.data, json.id);
    } catch {
      return res;
    }
  });
}
// fallback for the pop-up: ride along on the game's next ordinary server reply
export async function attachPendingUnlocks(res) {
  if (!pendingUnlocks.length) {
    return res;
  }
  try {
    const json = JSON.parse(await res.clone().text());
    if (
      !json ||
      !json.result ||
      json.result.result !== true ||
      json.result.data == null ||
      typeof json.result.data !== "object"
    ) {
      return res;
    }
    json.result.data = { data: json.result.data, achievementUnlocks: pendingUnlocks.splice(0) };
    return jsonReply(json.result.data, json.id);
  } catch {
    return res;
  }
}
