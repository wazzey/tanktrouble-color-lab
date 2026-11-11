import { GX_PAINT, isPat, patId } from "../content/colours.js";
import { getCustomArt } from "./custom-box-art.js";
import { annShow } from "./announcements.js";
import { loggedInIds, lookupById } from "./game-socket.js";
import { redrawShared, shareCall, shareSee } from "./look-sharing.js";
import { mazeTanks } from "./maze.js";
import { onlineFetch, readOnlineNames } from "./online.js";
import { $, toast } from "./panel.js";
import { uiConfirm } from "./settings.js";
import { SETTINGS, saveSettings } from "./storage.js";

// ---------- Teams: up to 4 proven tanks that wear their team's colour when they play together ----------
// The server keeps each team's colour, backup colour, paint and look by number, so this list's order never changes.
export const TEAM_COLOURS = [
  ["Red", "#d7263d"],
  ["Blue", "#1e5aff"],
  ["Green", "#1f9e3a"],
  ["Yellow", "#ffd400"],
  ["Purple", "#7b2fd6"],
  ["Orange", "#ff7a00"],
  ["Cyan", "#17c3e6"],
  ["Pink", "#ff4fa8"],
  ["White", "#f2f2f2"],
  ["Black", "#1b1b1f"],
  ["Brown", "#7b4a1e"],
  ["Lime", "#9be000"],
];
const TEAMS = {}; // player ID -> { at, team } (team: null when the tank isn't in one)
const MINE = {}; // your tank's player ID -> what the server said about its team
let teamsBatch = null;

// how far each of the five shades is from the team colour, by the number members pick (2 is always the team colour
// itself, and white only gets darker and black only lighter)
const readShadeSteps = (colour) => {
  const hex = TEAM_COLOURS[colour][1],
    light = [1, 3, 5].reduce((sum, at) => sum + parseInt(hex.slice(at, at + 2), 16), 0) / 765;
  if (light > 0.9) {
    return [-4, -3, 0, -2, -1];
  }
  return light < 0.15 ? [1, 2, 0, 3, 4] : [-2, -1, 0, 1, 2];
};

// one of the five shades of a team colour, as a paint value
export function readShade(colour, shade) {
  const hex = TEAM_COLOURS[colour][1],
    rgb = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)),
    step = readShadeSteps(colour)[shade] * 0.13,
    to = step < 0 ? 0 : 255;
  return (
    "0x" +
    rgb
      .map((channel) =>
        Math.round(channel + (to - channel) * Math.abs(step))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

// which teams are these tanks in (asked once a minute per tank, a few at a time)
export function fetchTeams(ids) {
  if (!shareSee() || SETTINGS.teamLooks === false) {
    return;
  }
  const now = Date.now(),
    want = ids.map(String).filter((id) => /^\d{1,12}$/.test(id) && !(TEAMS[id] && now - TEAMS[id].at < 60000));
  if (!want.length || teamsBatch) {
    return;
  }
  for (const id of want) {
    TEAMS[id] = { at: now, team: TEAMS[id] ? TEAMS[id].team : null };
  }
  teamsBatch = (async () => {
    for (let i = 0; i < want.length; i += 16) {
      const part = want.slice(i, i + 16),
        res = await shareCall({ op: "teams", ids: part });
      if (res && res.ok && res.data && res.data.teams) {
        for (const id of part) {
          const team = res.data.teams[id] || null;
          TEAMS[id] = { at: now, team };
          if (team && team.p) {
            getCustomArt(patId(team.p));
          }
        }
      }
    }
    teamsBatch = null;
  })();
}

// the colours each team in this game shows in: the older team keeps its own, a team that would look like one already
// taken gets its backup colour, and failing that the first colour nobody has
function readGameColours(here) {
  const ids = [...new Set(here.map((id) => TEAMS[id] && TEAMS[id].team && TEAMS[id].team.t).filter(Boolean))].sort(
    (first, second) => first - second,
  );
  const usedColours = [],
    usedPaints = [],
    out = {};
  for (const teamId of ids) {
    const team = here.map((id) => TEAMS[id].team).find((entry) => entry && entry.t === teamId);
    if (team.p && !usedPaints.includes(team.p)) {
      usedPaints.push(team.p);
      out[teamId] = { paint: team.p };
      continue;
    }
    let colour = team.c;
    if (usedColours.includes(colour)) {
      colour = team.b;
      if (usedColours.includes(colour)) {
        colour = TEAM_COLOURS.findIndex((entry, i) => !usedColours.includes(i));
      }
    }
    usedColours.push(colour);
    // (a swapped colour is worn plain, as members picked their shades of the team's own colour)
    out[teamId] = { colour, swapped: colour !== team.c };
  }
  return out;
}

// a tank's team look in this game, or null: only while at least one of its teammates is in the same game
const TEAM_SHOWN = new Set(); // tanks drawn in a team's look this game
// the game is over, or a team was paused, left or changed: those tanks are drawn again in their own look, as the
// lobby and the profiles otherwise keep the pictures made in the game until the page is refreshed
export function applyTeamsGone(ids) {
  const gone = (ids || [...TEAM_SHOWN]).map(String).filter((id) => TEAM_SHOWN.has(id));
  if (!gone.length) {
    return;
  }
  for (const id of gone) {
    TEAM_SHOWN.delete(id);
  }
  redrawShared(gone);
}
export function teamLookFor(id) {
  const mine = TEAMS[id] && TEAMS[id].team;
  if (!mine || !mazeTanks || SETTINGS.teamLooks === false) {
    return null;
  }
  const here = mazeTanks.map((tank) => String(tank.playerId));
  if (!here.some((other) => other !== id && TEAMS[other] && TEAMS[other].team && TEAMS[other].team.t === mine.t)) {
    return null;
  }
  const shown = readGameColours(here)[mine.t];
  const part = (shade) => (shown.paint ? shown.paint : readShade(shown.colour, shown.swapped ? 2 : shade));
  TEAM_SHOWN.add(id);
  return mine.m === "turret"
    ? { turret: part(mine.s[0]) }
    : { turret: part(mine.s[0]), base: part(mine.s[1]), treads: part(mine.s[2]) };
}

// ---------- the 🏳 Teams section of the Saved tab ----------
const readTankId = () => {
  const ids = loggedInIds(false);
  return ids.includes(SETTINGS.teamPid) ? SETTINGS.teamPid : ids[0] || null;
};
async function applyTeamAct(pid, team) {
  const res = await shareCall({ op: "team", pid, team });
  if (!res || !res.data) {
    toast("Couldn't reach Color Lab's server. Try again in a moment", true);
    return false;
  }
  if (!res.ok) {
    toast(res.data.error || "That didn't work", true);
  } else {
    MINE[pid] = { at: Date.now(), data: res.data };
    TEAMS[pid] = { at: 0, team: null }; // (asked again, so your own tank shows its new team look)
  }
  renderTeams();
  return res.ok === true;
}

// a team changed (its look, members or shades): asked again at once, so every screen shows it within a second.
// A team's owner invited one of your tanks: a box in the corner with Join and No thanks
export function startTeams() {
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.__ttcl !== true || d.dir !== "toPage") {
      return;
    }
    if (d.type === "teamNews" && Array.isArray(d.ids)) {
      for (const id of d.ids) {
        delete TEAMS[String(id)];
        if (MINE[String(id)]) {
          MINE[String(id)].at = 0;
        }
      }
      applyTeamsGone(d.ids);
      if ($("paneSaved") && !$("paneSaved").hidden) {
        renderTeams();
      }
      return;
    }
    if (d.type !== "teamInvite") {
      return;
    }
    const invite = d.invite;
    if (!invite || !Number.isInteger(invite.team) || !loggedInIds(false).includes(String(invite.pid))) {
      return;
    }
    const pid = String(invite.pid);
    annShow({
      id: "inv:" + invite.team + ":" + pid + ":" + invite.at,
      kind: "invite",
      title: String(invite.from).slice(0, 24) + " invited you to " + String(invite.name).slice(0, 24),
      body: "Teammates wear the team's colour when they play together. You can leave at any time.",
      onJoin: () => applyTeamAct(pid, { act: "accept", team: invite.team }),
      onNo: () => applyTeamAct(pid, { act: "decline", team: invite.team }),
    });
  });
}

export function renderTeams() {
  const box = $("teams");
  if (!box) {
    return;
  }
  box.innerHTML = '<div class="sublbl">🏳 Teams</div>';
  const note = (text) => {
    const small = document.createElement("small");
    small.className = "mzsub";
    small.style.display = "block";
    small.textContent = text;
    box.appendChild(small);
  };
  note("Up to 4 tanks wear your team's colour when you play together. Other Color Lab players see it too.");
  const pid = readTankId();
  if (!pid) {
    note("Log in to make or join a team.");
    return;
  }
  if (!shareSee()) {
    note("Teams need look sharing: choose Share (🔌 in the game's ⚙ box) and turn on See other players' looks.");
    return;
  }
  const ids = loggedInIds(false);
  if (ids.length > 1) {
    const pick = document.createElement("select");
    pick.className = "teamtank";
    for (const id of ids) {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = "Tank " + id;
      lookupById(id)
        .then((details) => {
          if (details && details.username) {
            opt.textContent = details.username;
          }
        })
        .catch(() => {});
      pick.appendChild(opt);
    }
    pick.value = pid;
    pick.onchange = () => {
      SETTINGS.teamPid = pick.value;
      saveSettings();
      renderTeams();
    };
    box.appendChild(pick);
  }
  const known = MINE[pid];
  if (!known || Date.now() - known.at > 30000) {
    MINE[pid] = { at: Date.now(), data: known ? known.data : null };
    shareCall({ op: "team", pid, team: { act: "mine" } }).then((res) => {
      MINE[pid] = { at: Date.now(), data: res && res.ok ? res.data : null, error: res && res.data && res.data.error };
      renderTeams();
    });
    if (!known) {
      note("Loading…");
      return;
    }
  }
  if (known.error || !known.data) {
    note(
      known.error === "prove this tank is yours first"
        ? "Prove this tank is yours first: ⚙ Settings > Look sharing > Prove my tanks are mine."
        : "Couldn't reach Color Lab's server. Try again in a moment.",
    );
    return;
  }
  const data = known.data;
  if (data.team) {
    populateTeam(box, pid, data);
  } else {
    populateInvites(box, pid, data.invites || []);
    populateTeamForm(box, pid, data, null);
    populateJoin(box, pid);
  }
  const row = document.createElement("div");
  row.className = "setrow";
  row.innerHTML =
    '<span class="tog' +
    (SETTINGS.teamLooks !== false ? " on" : "") +
    '"></span><span><span>Show team looks in games</span><small>Off = every tank keeps its own look</small></span>';
  row.onclick = () => {
    SETTINGS.teamLooks = SETTINGS.teamLooks === false;
    saveSettings();
    renderTeams();
  };
  box.appendChild(row);
}

function readSwatch(colour, on, used, title) {
  const dot = document.createElement("button");
  dot.className = "small teamdot" + (on ? " on" : "") + (used ? " used" : "");
  dot.style.background = TEAM_COLOURS[colour][1];
  dot.title = title;
  return dot;
}

function populateTeam(box, pid, data) {
  const team = data.team,
    own = team.owner === pid,
    me = team.members.find((member) => member.pid === pid);
  const head = document.createElement("div");
  head.className = "teamhead";
  head.appendChild(readSwatch(team.colour, true, false, TEAM_COLOURS[team.colour][0]));
  const name = document.createElement("b");
  name.textContent = team.name;
  head.appendChild(name);
  const code = document.createElement("button");
  code.className = "small grey";
  code.textContent = "Code " + team.code + " · Copy";
  code.title = "Teammates join with this code in their own 🏳 Teams";
  code.onclick = () => {
    navigator.clipboard
      .writeText(team.code)
      .then(() => toast("Team code copied"))
      .catch(() => toast("Code: " + team.code));
  };
  head.appendChild(code);
  box.appendChild(head);
  const list = document.createElement("div");
  list.className = "teamlist";
  for (const member of team.members) {
    const line = document.createElement("div");
    line.className = "teammate";
    const who = document.createElement("span");
    who.textContent = (member.name || "Tank " + member.pid) + (member.pid === team.owner ? " (owner)" : "");
    line.appendChild(who);
    if (own && member.pid !== pid) {
      const out = document.createElement("button");
      out.className = "small grey";
      out.textContent = "✕";
      out.title = "Take " + (member.name || "this tank") + " out of the team";
      out.onclick = () => applyTeamAct(pid, { act: "remove", target: member.pid });
      line.appendChild(out);
    }
    list.appendChild(line);
  }
  box.appendChild(list);
  if (own && team.members.length < 4) {
    const row = document.createElement("div");
    row.className = "row teaminvite";
    const who = document.createElement("input");
    who.type = "text";
    who.maxLength = 24;
    who.placeholder = "Player's name";
    who.setAttribute("list", "ttclInviteNames");
    const names = document.createElement("datalist");
    names.id = "ttclInviteNames";
    const populateNames = () => {
      const inTeam = new Set(team.members.map((member) => String(member.name || "")));
      names.replaceChildren(
        ...readOnlineNames()
          .filter((player) => !inTeam.has(player))
          .map((player) => Object.assign(document.createElement("option"), { value: player })),
      );
    };
    populateNames();
    who.onfocus = () => onlineFetch().then(populateNames); // (who's on Color Lab right now, offered as you type or click)
    const send = document.createElement("button");
    send.className = "small";
    send.textContent = "📨 Invite";
    send.title = "Invite a player who is on Color Lab right now (up to 100 invites a day)";
    send.onclick = async () => {
      const player = who.value.trim();
      if (player && (await applyTeamAct(pid, { act: "invite", who: player }))) {
        toast("Invite sent to " + player + ". It reaches them if they're on Color Lab right now");
      }
    };
    row.append(who, names, send);
    box.appendChild(row);
  }
  if (team.paused) {
    const small = document.createElement("small");
    small.className = "mzsub";
    small.style.display = "block";
    small.textContent = own
      ? "⏸ Paused: nobody wears the team look until you resume it."
      : "⏸ Paused by the owner: nobody wears the team look for now.";
    box.appendChild(small);
  }
  if (team.paint) {
    const small = document.createElement("small");
    small.className = "mzsub";
    small.style.display = "block";
    small.textContent =
      "This team wears " +
      ((GX_PAINT[patId(team.paint)] || {}).name || "a paint") +
      (team.mode === "turret" ? " on the turret." : ".");
    box.appendChild(small);
  } else if (me) {
    const parts =
      team.mode === "turret"
        ? [["Turret", 0]]
        : [
            ["Turret", 0],
            ["Base", 1],
            ["Treads", 2],
          ];
    for (const [label, at] of parts) {
      const line = document.createElement("div");
      line.className = "teamshades";
      const tag = document.createElement("span");
      tag.textContent = label;
      line.appendChild(tag);
      const steps = readShadeSteps(team.colour);
      for (const i of [0, 1, 2, 3, 4].sort((first, second) => steps[first] - steps[second])) {
        const dot = document.createElement("button");
        dot.className = "small teamdot" + (me.shades[at] === i ? " on" : "");
        dot.style.background = "#" + readShade(team.colour, i).slice(2);
        dot.title = steps[i] ? (steps[i] < 0 ? "Darker" : "Lighter") + " (" + Math.abs(steps[i]) + ")" : "Team colour";
        dot.onclick = () => {
          const shades = me.shades.slice();
          shades[at] = i;
          applyTeamAct(pid, { act: "shades", shades });
        };
        line.appendChild(dot);
      }
      box.appendChild(line);
    }
  }
  const row = document.createElement("div");
  row.className = "row setbtns";
  if (own) {
    const edit = document.createElement("button");
    edit.className = "small grey";
    edit.textContent = "✏ Change team look";
    edit.onclick = () => {
      box.querySelectorAll(".teamform").forEach((form) => form.remove());
      populateTeamForm(box, pid, data, team);
    };
    row.appendChild(edit);
    const pause = document.createElement("button");
    pause.className = "small grey";
    pause.textContent = team.paused ? "▶ Resume team" : "⏸ Pause team";
    pause.title = team.paused
      ? "Teammates wear the team look again"
      : "Keep the team, its code and its members, but nobody wears the team look until you resume it";
    pause.onclick = () => applyTeamAct(pid, { act: "pause", paused: !team.paused });
    row.appendChild(pause);
  }
  const quit = document.createElement("button");
  quit.className = "small warning";
  quit.textContent = own ? "🗑 Delete team" : "Leave team";
  quit.onclick = async () => {
    const ok = await uiConfirm(
      own ? "Delete " + team.name + "?" : "Leave " + team.name + "?",
      own
        ? "Everyone in it leaves too, and its code stops working."
        : "Your tank goes back to its own look. You can join again with the code.",
      own ? "Delete" : "Leave",
      true,
    );
    if (ok) {
      applyTeamAct(pid, { act: own ? "delete" : "leave" });
    }
  };
  row.appendChild(quit);
  box.appendChild(row);
}

// making a team, or its owner changing its look (team = the team being changed)
function populateTeamForm(box, pid, data, team) {
  const form = document.createElement("div");
  form.className = "teamform";
  const pick = {
    name: team ? team.name : "",
    colour: team ? team.colour : null,
    backup: team ? team.backup : null,
    paint: team ? team.paint || "" : "",
    mode: team ? team.mode : "full",
  };
  const name = document.createElement("input");
  name.type = "text";
  name.maxLength = 24;
  name.placeholder = "Team name";
  name.value = pick.name;
  const grids = document.createElement("div");
  const populateGrids = () => {
    grids.innerHTML = "";
    for (const [label, key, tip] of [
      ["Team colour", "colour", "Your team's colour. A dot means another team already uses it"],
      ["Backup colour", "backup", "Worn instead if a team in the same game looks like yours"],
    ]) {
      const tag = document.createElement("small");
      tag.className = "mzsub";
      tag.style.display = "block";
      tag.textContent = label;
      tag.title = tip;
      grids.appendChild(tag);
      const line = document.createElement("div");
      line.className = "teamcolours";
      TEAM_COLOURS.forEach(([colourName], i) => {
        const others = (data.used[i] || 0) - (team && team.colour === i ? 1 : 0),
          dot = readSwatch(
            i,
            pick[key] === i,
            key === "colour" && others > 0,
            colourName +
              (key === "colour" && others > 0
                ? " (used by " + others + " other team" + (others > 1 ? "s" : "") + ")"
                : ""),
          );
        dot.disabled = key === "backup" && pick.colour === i;
        dot.onclick = () => {
          pick[key] = i;
          if (key === "colour" && pick.backup === i) {
            pick.backup = null;
          }
          populateGrids();
        };
        line.appendChild(dot);
      });
      grids.appendChild(line);
    }
  };
  populateGrids();
  const paint = document.createElement("select");
  for (const [value, text] of [
    ["", "No paint: shades of the team colour"],
    ...Object.keys(GX_PAINT)
      .filter((key) => key.startsWith("pt-"))
      .sort((first, second) => GX_PAINT[first].name.localeCompare(GX_PAINT[second].name))
      .map((key) => ["p:" + key, GX_PAINT[key].name]),
  ]) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = text;
    paint.appendChild(opt);
  }
  paint.value = pick.paint;
  paint.title = "A Color Lab paint every member wears instead of the colour";
  const mode = document.createElement("select");
  for (const [value, text] of [
    ["full", "On the whole tank"],
    ["turret", "On the turret only"],
  ]) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = text;
    mode.appendChild(opt);
  }
  mode.value = pick.mode;
  const row = document.createElement("div");
  row.className = "row setbtns";
  const save = document.createElement("button");
  save.className = "small";
  save.textContent = team ? "Save team look" : "🏳 Make team";
  save.onclick = () => {
    if (!name.value.trim() || pick.colour === null || pick.backup === null) {
      toast("Give the team a name, a colour and a backup colour", true);
      return;
    }
    applyTeamAct(pid, {
      act: team ? "edit" : "create",
      name: name.value.trim(),
      colour: pick.colour,
      backup: pick.backup,
      paint: paint.value || undefined,
      mode: mode.value,
    });
  };
  row.appendChild(save);
  const title = document.createElement("small");
  title.className = "mzsub";
  title.style.display = "block";
  title.textContent = team ? "Change the team's look" : "Make a team";
  form.append(title, name, grids, paint, mode, row);
  box.appendChild(form);
  if (isPat(pick.paint)) {
    getCustomArt(patId(pick.paint));
  }
}

function populateInvites(box, pid, invites) {
  for (const invite of invites) {
    const row = document.createElement("div");
    row.className = "teammate";
    const text = document.createElement("span");
    text.textContent = "📨 " + invite.from + " invited you to " + invite.name;
    const join = document.createElement("button");
    join.className = "small";
    join.textContent = "Join";
    join.onclick = () => applyTeamAct(pid, { act: "accept", team: invite.team });
    const no = document.createElement("button");
    no.className = "small grey";
    no.textContent = "No thanks";
    no.onclick = () => applyTeamAct(pid, { act: "decline", team: invite.team });
    row.append(text, join, no);
    box.appendChild(row);
  }
}

function populateJoin(box, pid) {
  const title = document.createElement("small");
  title.className = "mzsub teamjoin";
  title.style.display = "block";
  title.textContent = "Or join a team with its code";
  const row = document.createElement("div");
  row.className = "row";
  const code = document.createElement("input");
  code.type = "text";
  code.maxLength = 8;
  code.placeholder = "Team code, e.g. K7Q4MX";
  const join = document.createElement("button");
  join.className = "small";
  join.textContent = "Join";
  join.onclick = () => applyTeamAct(pid, { act: "join", code: code.value });
  row.append(code, join);
  box.append(title, row);
}
