import { ACH_PAINTS, achPaintKey } from "../content/achievement-paints.js";
import { isPat, patId } from "../content/colours.js";
import { ACH2 } from "../content/hall-of-fame.js";
import { PUBLIC_BOXES, TROPHIES, isTrophyVal, trophyByKey } from "../content/laika-trophies.js";
import { MAP_THEMES } from "../content/maps.js";
import { CUSTOM_BOXES, boxOfKey } from "./custom-box-art.js";
import { LAST_LIVE, loggedInIds, rpc } from "./game-socket.js";
import { GAME_STATE } from "./garage.js";
import { LOOKS_SEEN } from "./laika-look.js";
import { getOverride } from "./look-sharing.js";
import { mapPickNext, mapTheme } from "./map-themes.js";
import { PLAYER_COLOR_MAP, SETTINGS, STATS, saveStats } from "./storage.js";
import { unlockTrophy } from "./trophy-counting.js";

// ---------- hidden Laika trophies ----------
// Destroy Laika (the game's AI dog) many times in a row without being destroyed to earn special bones.
// They're hidden achievements: the game's own "achievement unlocked" pop-up appears but only says something
// was unlocked; open the tank's achievements to see what (with the game's reveal animation).
// Everything here is local to this extension — nothing is sent to TankTrouble.
// Dev options are on in the DEV build unless switched off (then it behaves like the public copy).
export let DEV_TROPHIES = DEV_BUILD;
export const syncDevTrophies = () => {
  DEV_TROPHIES = DEV_BUILD && !SETTINGS.devOff;
};
export const boxOpen = (id) => DEV_TROPHIES || PUBLIC_BOXES.has(id);
const trophyEarned = (key) => {
  const t = trophyByKey(key);
  if (!t) {
    return false;
  }
  for (const pid in STATS.unlocked) {
    if (STATS.unlocked[pid] && STATS.unlocked[pid][t.id]) {
      return true;
    }
  }
  return false;
};
export const trophyUsable = (key) => DEV_TROPHIES || trophyEarned(key);
export const usableTrophies = () => TROPHIES.filter((t) => trophyUsable(t.key));

// ---------- achievement paints ----------
export const achPaintsOf = (box) =>
  usableTrophies()
    .filter((t) => t.box === box && ACH_PAINTS[t.key])
    .map((t) => "p:" + achPaintKey(t.key)); // earned ones only
// per tank progress: STATS.h2[pid] = { ...counters }
const h2 = (pid) => {
  STATS.h2 = STATS.h2 || {};
  return STATS.h2[pid] || (STATS.h2[pid] = {});
};
function h2Unlock(pid, key) {
  const t = trophyByKey(key);
  if (t) {
    unlockTrophy(pid, t);
  }
}
const playingOnline = () => Date.now() - LAST_LIVE < 5000;

// --- lifetime numbers: read now and then (after rounds, at most every 2 minutes) ---
let h2StatsAt = 0;
export async function h2StatsCheck(force) {
  if (!force && Date.now() - h2StatsAt < 120000) {
    return;
  }
  h2StatsAt = Date.now();
  for (const pid of loggedInIds()) {
    try {
      const d = await rpc("getPlayerDetails", [pid]);
      if (!d || d.guest) {
        continue;
      }
      let c = null;
      try {
        c = await rpc("getCurrency", [pid]);
      } catch {}
      const s = {
        kills: +d.kills || 0,
        deaths: +d.deaths || 0,
        victories: +d.victories || 0,
        suicides: +d.suicides || 0,
        rank: +d.rank || 0,
        gold: c ? +(c.gold ?? 0) : 0,
        diamonds: c ? +(c.diamonds ?? 0) : 0,
      };
      const hp = h2(pid);
      hp.stats = s;
      // 'gain' ones count only what's added from now on: every rise since the last check (spending gold doesn't take any away)
      hp.gain = hp.gain || {};
      hp.last = hp.last || {};
      for (const k of ["gold", "diamonds", "suicides"]) {
        if (hp.last[k] != null && s[k] > hp.last[k]) {
          hp.gain[k] = (hp.gain[k] || 0) + (s[k] - hp.last[k]);
        }
        hp.last[k] = s[k];
      }
      for (const a of ACH2) {
        if (
          a.kind === "stat" &&
          !a.retired &&
          (a.test ? a.test(s) : a.gain ? (hp.gain[a.gain] || 0) >= a.need : a.of(s) >= a.need)
        ) {
          h2Unlock(pid, a.key);
        }
      }
    } catch {}
  }
  saveStats();
}

// --- rounds: the game's own round events (online games only) ---
export let roundState = null;
const h2Hooked = new WeakSet();
const lookSig = (pid) => {
  const o = getOverride(pid);
  return o ? JSON.stringify([o.turret, o.base, o.treads, o.acc || {}]) : "real";
};
function h2Watch() {
  // the game makes a new game controller per game: listen to each one
  const gc = GAME_STATE && GAME_STATE.gameController;
  if (!gc || h2Hooked.has(gc) || !gc.addRoundEventListener) {
    return;
  }
  h2Hooked.add(gc);
  try {
    gc.addRoundEventListener((ctx, gid, ev, data) => {
      try {
        h2Event(gc, ev, data);
      } catch (e) {
        if (DEV_TROPHIES) {
          console.warn("[Color Lab] achievements", ev, e);
        }
      }
    }, null);
  } catch {}
}
function h2Event(gc, ev, data) {
  const mine = new Set(loggedInIds()),
    now = Date.now();
  if (ev === "round created" || (ev === "round started" && !roundState)) {
    roundState = {
      start: now,
      players: new Set(),
      kills: {},
      crates: {},
      blocks: {},
      died: {},
      spawn: {},
      far: {},
      seen: {},
      bounces: {},
      theme: mapTheme || null,
      online: playingOnline(),
      looks: {},
    };
  }
  if (!roundState) {
    return;
  }
  if (ev === "round ended") {
    mapPickNext();
  } // Laika dresses for the next map now, between rounds
  if (ev === "round started") {
    roundState.start = now;
    roundState.online = roundState.online || playingOnline();
    roundState.theme = mapTheme || null;
  } else if (ev === "tank created" && data && data.getPlayerId) {
    const pid = String(data.getPlayerId());
    roundState.players.add(pid);
    if (mine.has(pid)) {
      roundState.spawn[pid] = [data.getX(), data.getY()];
      roundState.far[pid] = 0;
      roundState.looks[pid] = lookSig(pid);
    }
  } else if (ev === "projectile maze collision" && data && data.projectile) {
    const id = data.projectile.getId();
    roundState.bounces[id] = (roundState.bounces[id] || 0) + 1;
  } else if (ev === "projectile shield collision" && data && data.projectile && data.shieldA) {
    const owner = String(data.shieldA.getPlayerId()),
      from = String(data.projectile.getPlayerId());
    if (mine.has(owner) && from !== owner && roundState.online) {
      const n = (roundState.blocks[owner] = (roundState.blocks[owner] || 0) + 1);
      if (n >= 10) {
        h2Unlock(owner, "aw-riotshield");
      }
      const p = h2(owner);
      p.blocked = (p.blocked || 0) + 1;
      if (p.blocked >= 200) {
        h2Unlock(owner, "aw-ironwall");
      }
    }
  } else if (ev === "collectible destroyed" && data && data.getPlayerId) {
    const pid = String(data.getPlayerId());
    if (!mine.has(pid) || !roundState.online) {
      return;
    }
    const col = gc.getCollectible && gc.getCollectible(data.getCollectibleId()),
      type = col && col.getType ? col.getType() : -1;
    if (type >= 0 && type <= 8) {
      const n = (roundState.crates[pid] = (roundState.crates[pid] || 0) + 1);
      if (n >= 10) {
        h2Unlock(pid, "aw-crates");
      }
    }
  } else if (ev === "tank killed" && data && data.getVictimPlayerId) {
    h2Kill(
      gc,
      String(data.getKillerPlayerId()),
      String(data.getVictimPlayerId()),
      Number(data.getDeadlyType()),
      String(data.getDeadlyId()),
      mine,
      now,
    );
  } else if (ev === "round ended" && data && data.getPlayerIds) {
    h2RoundEnd(data.getPlayerIds().map(String), mine, now);
    roundState = null;
  }
}
function h2Kill(gc, killer, victim, type, did, mine, now) {
  if (!roundState.online) {
    return;
  }
  const proj = gc.getProjectile && gc.getProjectile(did),
    bounces = roundState.bounces[did] || 0,
    alive = proj && proj.getTimeAlive ? proj.getTimeAlive() : 0;
  if (mine.has(victim)) {
    roundState.died[victim] = now;
    if (killer === victim && type === -1 && (bounces >= 8 || (!bounces && alive >= 9))) {
      h2Unlock(victim, "aw-boomerang");
    }
    if (now - roundState.start <= 3000) {
      const p = h2(victim);
      p.fv = p.fv || [];
      const sig = roundState.looks[victim] || lookSig(victim);
      if (!p.fv.includes(sig)) {
        p.fv.push(sig);
        if (p.fv.length > 40) {
          p.fv.shift();
        }
      }
      if (p.fv.length >= 10) {
        h2Unlock(victim, "aw-mirror");
      }
    }
  }
  if (!mine.has(killer)) {
    return;
  }
  const K = roundState.kills[killer] || (roundState.kills[killer] = []);
  K.push({ t: now, type, did, victim });
  const others = K.filter((k) => k.victim !== killer);
  if (killer !== victim) {
    if (type === 0 && others.filter((k) => k.did === did).length >= 3) {
      h2Unlock(killer, "aw-scope");
    }
    if (others.filter((k) => k.type === 3).length >= 3) {
      h2Unlock(killer, "aw-radar");
    }
    if (others.filter((k) => k.type === 4).length >= 3) {
      h2Unlock(killer, "aw-detector");
    }
    if (type === 5 && others.filter((k) => k.type === 5 && now - k.t <= 3000).length >= 4) {
      h2Unlock(killer, "aw-smokebarrel");
    }
    if (type === 2 && others.filter((k) => k.type === 2 && now - k.t <= 400).length >= 3) {
      h2Unlock(killer, "aw-rose");
    }
    if (type === -1 && bounces >= 6) {
      h2Unlock(killer, "aw-sixbounce");
    }
    if (type === -1 && bounces >= 3) {
      const p = h2(killer);
      p.rico = (p.rico || 0) + 1;
      if (p.rico >= 100) {
        h2Unlock(killer, "aw-bankmedal");
      }
    }
  }
  // the same shot (or within half a second, one weapon) took out an enemy and yourself
  const self = K.find((k) => k.victim === killer),
    enemy = K.find(
      (k) =>
        k.victim !== killer && self && (k.did === self.did || Math.abs(k.t - self.t) <= 500) && k.type === self.type,
    );
  if (self && enemy && !self.kami) {
    self.kami = 1;
    const p = h2(killer);
    p.kami = (p.kami || 0) + 1;
    if (p.kami >= 10) {
      h2Unlock(killer, "aw-itcounts");
    }
  } // (counted once per shot)
  saveStats();
}
function h2RoundEnd(winners, mine, now) {
  const played = [...mine].filter((pid) => roundState.players.has(pid));
  if (!played.length) {
    return;
  }
  const d = new Date(),
    day =
      d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  for (const pid of played) {
    const p = h2(pid),
      won = winners.includes(pid),
      n = roundState.players.size,
      died = !!roundState.died[pid];
    // silly ones count in any game you play
    if (d.getHours() >= 2 && d.getHours() < 5) {
      p.night = (p.night || 0) + 1;
      if (p.night >= 25) {
        h2Unlock(pid, "aw-nightcap");
      }
    }
    p.days = (p.days || [])
      .filter((x) => x !== day)
      .concat([day])
      .slice(-30);
    let run = 1;
    for (let k = 1; k < 7; k++) {
      const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - k),
        key =
          prev.getFullYear() +
          "-" +
          String(prev.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(prev.getDate()).padStart(2, "0");
      if (p.days.includes(key)) {
        run++;
      } else {
        break;
      }
    }
    if (run >= 7) {
      h2Unlock(pid, "aw-calendar");
    }
    if (roundState.theme) {
      p.maps = Object.assign(p.maps || {}, { [roundState.theme]: 1 });
      if (Object.keys(MAP_THEMES).every((k) => p.maps[k])) {
        h2Unlock(pid, "aw-suitcase");
      }
    }
    if (SETTINGS.party) {
      p.party = (p.party || 0) + 1;
      if (p.party >= 100) {
        h2Unlock(pid, "aw-discoball");
      }
    }
    {
      const o = getOverride(pid);
      if (o) {
        const vals = [o.turret, o.base, o.treads]
          .filter(isPat)
          .map(patId)
          .concat(
            Object.values(o.acc || {})
              .map(String)
              .filter(isTrophyVal)
              .map((v) => v.slice(5)),
          );
        p.boxes = p.boxes || {};
        for (const k of vals) {
          const b = boxOfKey(k);
          if (b) {
            p.boxes[b] = 1;
          }
        }
        if (CUSTOM_BOXES.filter((b) => !b.trophies).every((b) => p.boxes[b.id])) {
          h2Unlock(pid, "aw-aura-showcase");
        }
      }
    }
    {
      const mineL = LOOKS_SEEN[pid];
      if (mineL) {
        for (const other of roundState.players) {
          if (other !== pid && LOOKS_SEEN[other] === mineL) {
            h2Unlock(pid, "aw-bracelets");
          }
        }
      }
    }
    if (!roundState.online) {
      continue;
    }
    if (won && n >= 5) {
      const vs = new Set((roundState.kills[pid] || []).filter((k) => k.victim !== pid).map((k) => k.victim));
      if (vs.size >= n - 1) {
        h2Unlock(pid, "aw-ace");
      }
    } // Ace: every other tank in the round was yours
    // round streaks
    if (won) {
      if (
        n >= 6 &&
        !died &&
        new Set((roundState.kills[pid] || []).filter((k) => k.victim !== pid).map((k) => k.victim)).size >= n - 1
      ) {
        h2Unlock(pid, "aw-sparklecrown");
      }
      if (n >= 3 && now - roundState.start <= 5000) {
        h2Unlock(pid, "aw-stopwatch");
      }
      p.clutch = n >= 4 ? (p.clutch || 0) + 1 : 0;
      if (p.clutch >= 10) {
        h2Unlock(pid, "aw-aura-heartbeat");
      }
      p.casino = roundState.theme === "casino" ? (p.casino || 0) + 1 : 0;
      if (p.casino >= 3) {
        h2Unlock(pid, "aw-slots");
      }
    } else {
      p.clutch = 0;
      p.casino = 0;
    }
    p.deadRun = died ? (p.deadRun || 0) + 1 : 0;
    p.alive = died ? 0 : (p.alive || 0) + 1;
    if (p.alive >= 50) {
      h2Unlock(pid, "aw-aura-bubble");
    }
  }
  {
    let saved = 0;
    for (const id in PLAYER_COLOR_MAP) {
      saved += (PLAYER_COLOR_MAP[id].presets || []).length;
    }
    if (saved >= 25) {
      for (const pid of played) {
        h2Unlock(pid, "aw-palette");
      }
    }
  }
  saveStats();
  h2StatsCheck();
}

export function startAchievements() {
  setTimeout(() => h2StatsCheck(true), 12000);
  setInterval(h2Watch, 1000);
  // how far your tank wanders (Wall Hugger): checked a few times a second during a round
  setInterval(() => {
    if (!roundState || !roundState.online) {
      return;
    }
    const gc = GAME_STATE && GAME_STATE.gameController;
    if (!gc || !gc.getTank) {
      return;
    }
    for (const pid in roundState.spawn) {
      const t = gc.getTank(pid);
      if (!t || !t.getX) {
        continue;
      }
      const [x0, y0] = roundState.spawn[pid],
        dd = Math.hypot(t.getX() - x0, t.getY() - y0);
      roundState.seen[pid] = (roundState.seen[pid] || 0) + 1;
      if (dd > (roundState.far[pid] || 0)) {
        roundState.far[pid] = dd;
      }
    }
  }, 250);
}
