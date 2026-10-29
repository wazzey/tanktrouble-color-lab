// ---------- tutorial, What's new and help ----------
// New installs get the tutorial (garage or panel, then the other one if they want). People who already had Color Lab
// only get "What's new" for the things added since the version they last saw. Progress is saved (tt_tutorial), and
// the backup copy keeps it through a reinstall. The ? buttons in the panel and the garage replay any of it.
export const TUT_VER = 15,
  TUT_LABEL = "v1.4.5";
export const WHATS_NEW = [
  // [version, emoji, text] - version 1: the first v2.6 notes, version 2: added since
  [
    1,
    "🚜",
    "<b>Garage</b>: 🎲 random look, ⏻ on / off and ? help next to Real / All · <b>All</b> never saves to your account (use <b>Real</b> for real changes)",
  ],
  [1, "🔍", "<b>Find in garage</b> scrolls through everything, grouped by box; ☆ stars favourites"],
  [1, "📦", "<b>New boxes</b>: Heaven, Racing, Graffiti, Sakura and Eyewear"],
  [1, "🎭", "<b>Masks</b>: Jester, Demon and Phantom (Shadow), Hacker (Code Rain), Oni, Kitsune and Samurai (Sakura)"],
  [1, "🧩", "<b>Pattern in-maze</b>: pattern paints can show in the maze too"],
  [
    1,
    "⚙",
    "<b>Settings</b>: hide buttons you don't use, your race number, backups (⬇ Export / ⬆ Import), and the ? help with this tutorial",
  ],
  [
    2,
    "📦",
    "<b>10 more boxes</b>: Deep Sea, Sweet Shop, Arcade, Safari, Steampunk, Kingdom, Wild West, Tropical, Mech and Casino - new paints, hats, back items and auras",
  ],
  [
    2,
    "🚜",
    "<b>Garage</b>: buttons change only the tank that's open · 🎲 rolls straight away (⚙ sets what) · scroll boxes and items with the <b>mouse wheel</b> · Real changes now show for other players straight away",
  ],
  [
    2,
    "⚡",
    "<b>Faster</b>: the garage opens straight away and pictures load from your browser, so no more stutter or Halloween paint while loading",
  ],
  [
    2,
    "🎨",
    "<b>Paints</b> now look right on tank pictures, with their own side views, and spray cans show more of each design",
  ],
  [
    2,
    "🏁",
    "<b>Cartoon masks and helmets</b>, race helmets with the visor up, race numbers on a chain, and Sakura Petal Pile / Drift",
  ],
  [2, "🔎", "<b>Swatches</b> has a search box and an All / Color Lab / Game menu, like Find in garage"],
  [
    2,
    "🗺",
    "<b>Map themes</b> (new 🗺 Maze tab): 14 maps (Deep Sea, Arcade, Sweet Shop, Racing, Sakura, Safari, Steampunk, Kingdom, Wild West, Tropical, Mech, Casino, Graffiti and Standard), each in ☀ light or 🌙 dark, with crate boxes or 🎁 themed crates (the weapon always shown) - one map, random each round or take turns (only on your screen)",
  ],
  [
    2,
    "🪶",
    "<b>Lighter</b>: switch off Color Lab boxes you don't use (⚙ Settings), boxes only load when you open them, and pictures are files read from your PC",
  ],
  [
    2,
    "🔫",
    "<b>Bullet skins</b>: every tank's bullets in its turret colours, your own bullet skin on any map, and mines in their owner's turret pattern",
  ],
  [
    3,
    "🏆",
    "<b>38 hidden achievements</b> (new 🏆 tab): lifetime ones up to 100,000 kills, moments in a round (3 kills with one laser, Boomerang, Bodyguard...) and silly ones (Night Owl, Twinsies, Map Tourist). Each unlocks its own item in the <b>Hall of Fame</b> box; ones you haven't earned stay ???",
  ],
  [
    3,
    "🥷",
    "<b>Shinobi box</b>: ninja hood, straw kasa, crossed katanas, war fan, clan banner, shuriken plate, smoke-bomb aura and 5 old-Japan paints",
  ],
  [
    3,
    "🕴",
    "<b>Agent box</b>: silk ties in 4 colours, barcode decals (turret, barrel, front - plain or hazard yellow), agent shades, earpiece, briefcase, sniper rifle, laser-grid aura and 14 suit paints",
  ],
  [3, "🗺", "<b>2 more maps</b>: Shinobi and Agent (light and dark), with their own themed crates"],
  [
    3,
    "🐕",
    "<b>Laika dresses for the map</b>: on a Color Lab map she wears its paints and hat (🗺 Maze tab), and 🧪 her robot dog can be repainted too (experimental) - hand-painted for all 15 themes (sheriff hat, crown, cap, headband and shades included). Pick one look for her or let her follow the map",
  ],
  [
    4,
    "🗺",
    "<b>75 maps</b> (🗺 Maze tab): 61 new ones, from Arctic, Volcano and Jungle to Code Rain, Heaven and Galaxy, plus 29 spy-themed trips round the world (Paris, Marrakesh, Bangkok, Hokkaido, Dubai, Berlin, the Alps and more). <b>Random</b> shuffles them so you don't see the same map twice in a row, and 🎲 <b>Mix</b> picks light or dark each round",
  ],
  [
    4,
    "🔫",
    "<b>Every map has its own bullets</b> (casino chips, gold, beach balls...) and the multi-coloured ones spin, flipping on every bounce. Switch <b>Themed bullets</b> off for plain ones that stay easy to see on dark maps",
  ],
  [
    4,
    "🐕",
    "<b>Laika has her own colours on every map</b> and changes between rounds, so you never see her switch. Her glowing eye matches the map too (green on Code Rain)",
  ],
  [
    4,
    "🎁",
    "<b>Themed crates</b> on every map, aim lines and lasers that stay visible on dark floors, and floor decorations that can't be mistaken for bullets",
  ],
  [
    4,
    "📦",
    "<b>Garage folders</b>: Original (the game's boxes) and Custom, sorted by genre (Achievements, Fantasy, Sci-Fi & Tech, Street & Style, Fun & Games, Nature) with a ← Back button. Every box has its own picture",
  ],
  [
    4,
    "🕶",
    "<b>Redrawn items</b>: the whole Eyewear box, the Graffiti bandanas and the Safari hat and binoculars now sit properly on the tank, plus 2 new square Sakura glasses. Items that didn't fit (spiked mine, katanas, spectral ghost) are refitted and the Racing exhaust is redrawn",
  ],
  [
    4,
    "🏆",
    "<b>The hardest achievements now give a paint too</b>, and there are 3 new hard ones: Six-Bounce Wonder, Ace and Iron Wall",
  ],
  [
    5,
    "📦",
    "<b>2 new boxes</b>: <b>Cursed Seal</b> (talismans, prayer beads, a sealed blade, a watching eye, a violet flame aura and 5 dark paints) and <b>Streetwear</b> (headphones, beanies, hanging sneakers, a gold chain, a boombox, a hoodie hood and 5 street paints)",
  ],
  [
    5,
    "🖌",
    "<b>Over 60 items redrawn</b> to sit properly on the tank: the Achievements and Galaxy rewards and the items in Deep Sea, Sweet Shop, Arcade, Safari, Steampunk, Kingdom, Wild West, Tropical, Mech, Casino, Shadow and Code Rain",
  ],
  [
    5,
    "🎨",
    "<b>Colour versions</b> of hats, banners, visors, surfboards and more, plus 15 beanies and 10 pairs of sneakers",
  ],
  [
    5,
    "🔧",
    "Your look now shows straight after logging in, and earning several achievements at once shows one message instead of a pile of pop-ups",
  ],
  [
    6,
    "🔧",
    "<b>Fixed</b>: a patterned tank could turn plain white in the maze after a few rounds (mines, missiles and bullet skins too)",
  ],
  [6, "🚀", "<b>Fixed</b>: homing missiles turn to face where they fly again, and yours now carry your turret pattern"],
  [
    7,
    "🔗",
    "<b>Look sharing</b>: Color Lab users now see each other's looks, in the lobby, the garage and the maze. When someone saves a new look it pops in straight away",
  ],
  [
    7,
    "🔫",
    "Your bullets (🗺 Maze > <b>Your bullets</b>) are shared too, so Color Lab users see the bullets you picked",
  ],
  [
    7,
    "👤",
    "Click a tank with a Color Lab look: its profile has a <b>Real / Color Lab</b> switch, so you can see its real look too",
  ],
  [
    7,
    "🎨",
    "<b>Page themes</b> (🗺 Maze tab): the TankTrouble page, buttons and lobby in a map's colours. Match the map, keep one, or get a new one every day, plus 🎃 Halloween, 🎄 Christmas and 🐣 Easter",
  ],
  [7, "🔔", "Color Lab now tells you when a new version is out, with what's new and how to update"],
  [
    7,
    "⚙",
    "Only your tank's player ID and look are shared. <b>Share my look</b> and <b>See other players' looks</b> can be switched off in ⚙ Settings > Look sharing",
  ],
  [
    8,
    "🎨",
    "<b>Page themes</b> now cover every page: the header tabs, forum, news and shop, with the game's buttons, popups and the add-tank ➕ in the same colours. Every theme's writing is checked so it stays easy to read",
  ],
  [
    8,
    "🌙",
    "Forum <b>Dark</b> keeps the page theme and only darkens the threads and replies, and what you type in the forum is readable in every mode",
  ],
  [8, "💣", "Mine shrapnel, and mines from black or white turrets, now show up on dark maps"],
  [
    8,
    "🛡",
    "<b>Look sharing</b> is protected: a copy of Color Lab can only share a few new tanks a day, so nobody can paint other players' tanks",
  ],
  [
    9,
    "🛡",
    "<b>Prove your tank is yours</b>: looks are only shared for tanks their owner has proven, so nobody can put a fake look on someone else. Color Lab asks once; it takes about a second per tank",
  ],
  [
    10,
    "📨",
    "<b>Feedback &amp; reports</b> (⚙ Settings): send the Color Lab team a message, with a screenshot if you like. Replies show up right there, and you get a heads-up when one arrives. A tank's profile has ✉ Tell us too",
  ],
  [
    9,
    "⚑",
    "<b>Report</b>: a look someone shared can be reported from the tank's profile, next to the Real / Color Lab switch",
  ],
  [
    11,
    "🟢",
    "<b>Who's online</b>: a Color Lab box in the lobby shows how many Color Lab players are online. Names are opt-in: turn on <b>Show me as online</b> (and <b>Show which server I'm on</b>) in ⚙ Settings > Look sharing. Everyone else only counts as hidden",
  ],
  [
    11,
    "💬",
    "<b>Message Color Lab</b>: a box on the right, laid out like the game's message laboratory. Write to the Color Lab team, add up to 3 screenshots and read the replies",
  ],
  [
    11,
    "⚙",
    "<b>Color Lab in the game's settings box</b> (top right): on / off, sharing, going offline, your page theme, map, Laika and bullets picked from pictures, plus the version, update notes and a check for updates",
  ],
  [
    11,
    "🔌",
    "<b>Go offline</b>: one switch stops Color Lab contacting its server at all, so nothing is shared and the online list is off, until you switch it back on",
  ],
  [
    11,
    "🔄",
    "<b>Refresh my tanks</b> (⚙ Settings) now redraws just the tanks logged in on this browser and checks they're shared. Shift-click for every custom tank",
  ],
  [11, "🔧", "Look sharing: a tank is proven once, and the reason now shows if sharing is blocked"],
  [
    11,
    "👁",
    "<b>Easier to see on every map</b>: mines, homing missiles, lasers and aim lines whose colour is too close to the floor (like a black turret on a dark map) get a colour that stands out, and bullets get an edge where they would blend in. Picking a bullet colour that's hard to see shows a warning",
  ],
  [
    11,
    "⚡",
    "Faster page loading, bigger arrows on sections you can open and close, labels on the map options and tab names in the panel",
  ],
  [
    13,
    "💾",
    "<b>Looks</b>: the 💾 Looks button in the garage switches between your saved looks in one click, and <b>+ New look</b> starts another",
  ],
  [
    13,
    "✅",
    "<b>Saving</b> is clearer: Save shows <b>✓ Saved</b> until you change something, and the same look can't be saved twice as a preset",
  ],
  [13, "🌙", "<b>Dark</b> page theme for the site, forum, news and shop"],
  [13, "🏆", "<b>Achievements</b> aren't secret any more: every name and goal shows, and some goals are fairer"],
  [
    13,
    "🟢",
    "<b>Online list</b>: shows who's idle and whether they're in the lobby, a queue or a game. Away or idle for 15+ minutes counts as offline",
  ],
  [13, "🕶", "<b>Incognito windows</b>: Color Lab still works there, but stays offline"],
  [13, "🔧", "<b>Fixed</b>: the Streetwear sneakers, boombox and hood are easy to see in the garage"],
  [12, "📢", "<b>Announcements</b>: news from the Color Lab team now pops up the moment it's sent"],
  [
    12,
    "🔧",
    "The update pop-up's notes are easier to read, and its download button only ever leads to Color Lab's own GitHub page",
  ],
  [12, "🔧", "<b>Fixed</b>: spaces can be typed in the Message Color Lab box again"],
  [
    14,
    "🏆",
    "<b>Achievement pop-ups</b> can be switched off in ⚙ Settings > Achievements. Achievements still unlock and show as new in the 🏆 tab",
  ],
  [
    14,
    "🟢",
    "<b>Online list</b>: a local game against Laika now shows as the lobby, and an account playing on two copies shows once",
  ],
  [14, "🏅", "<b>Fairer Hall of Fame</b>: only online rounds count, as intended"],
  [
    14,
    "🔓",
    "<b>Open source</b>: Color Lab and its server are on GitHub for anyone to read, with a clearer privacy policy",
  ],
  [
    15,
    "☁",
    "<b>Backup</b>: your saved looks and achievements are kept for your account, so they come back on any computer you log in on. ⚙ Settings > Backup",
  ],
  [
    15,
    "🔑",
    "<b>Your account's own key</b>: Color Lab now uses one key for each account, made on your computer from your account's details. If the account has messaged the TankTrouble laboratory, a new browser picks up your looks and messages by itself, with no proving",
  ],
  [
    15,
    "📨",
    "<b>Messages</b> follow the account you send them as, on any computer. With two accounts logged in, pick which one sends",
  ],
  [
    15,
    "👮",
    "<b>Staff tags</b>: TankTrouble moderators and developers have a GM or DEV tag next to their name in the Color Lab box, and 👮 lists any in games on your server",
  ],
  [
    15,
    "🟢",
    "<b>Color Lab box</b>: see how long someone has been idle, and when players who show themselves were last on in the past week",
  ],
  [15, "📋", "<b>Copy my support ID</b> in ⚙ Settings > Look sharing helps the Color Lab team find your copy"],
];
// What a brand-new user sees (instead of every older version's notes): what Color Lab has, in short
export const V1_OVERVIEW = [
  [
    0,
    "🎨",
    "<b>Colour panel</b> (<kbd>Alt+C</kbd>): paint any tank's turret, base and treads with any colour or pattern paint, try on any item, and save looks with presets",
  ],
  [
    0,
    "🏠",
    "<b>Garage</b>: <b>All</b> shows every paint and item plus Color Lab's boxes in folders; <b>Real</b> is your normal garage. Your Color Lab look never changes your real one: only Color Lab users see it",
  ],
  [
    0,
    "🎨",
    "<b>Page themes</b> (🗺 Maze tab): the TankTrouble page, its buttons and the lobby in a map's colours, or a new theme every day",
  ],
  [
    0,
    "🔗",
    "<b>Look sharing</b>: other Color Lab users see your look, and you see theirs, live. Click a tank for its <b>Real / Color Lab</b> switch. Turn it off in ⚙ Settings",
  ],
  [
    0,
    "📦",
    "<b>Over 25 Color Lab boxes</b> of paints and items, including the new <b>Cursed Seal</b> and <b>Streetwear</b> boxes",
  ],
  [0, "🗺", "<b>75 map themes</b> (🗺 tab) with matching bullets and crates, and Laika dressed for the map"],
  [
    0,
    "🟢",
    "<b>Who's online</b>: see how many Color Lab players are online. Names are opt-in (⚙ Settings > Look sharing)",
  ],
  [0, "💬", "<b>Message Color Lab</b>: write to the team from a box on the right of the lobby"],
  [0, "🏆", "<b>Hidden achievements</b> (🏆 tab) that unlock extra items and paints"],
  [0, "💾", "<b>Backups</b>: Settings > Export keeps a copy of all your looks"],
];
const TUT_CSS = `#ttcl-tut{position:fixed;inset:0;z-index:2147483600;pointer-events:none;font:13px/1.45 Arial,sans-serif;color:#fff}
#ttcl-tut .spot{position:fixed;border:3px solid #427fff;border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,.55),0 0 0 2px #fff,0 0 22px #427fff;transition:all .25s;pointer-events:none}
#ttcl-tut .dim{position:fixed;inset:0;background:rgba(0,0,0,.55);pointer-events:auto}
#ttcl-tut .card{position:fixed;width:320px;max-width:calc(100vw - 24px);box-sizing:border-box;background:rgba(0,0,0,.92);border:3px solid #427fff;border-radius:12px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.6);pointer-events:auto;transition:top .25s,left .25s}
#ttcl-tut .card{max-height:calc(100vh - 24px);overflow-y:auto!important;overscroll-behavior:contain}
#ttcl-tut .card>*:not(h3){margin-left:14px;margin-right:14px}
#ttcl-tut h3{margin:0 0 10px;padding:7px 14px 6px;font:normal 20px TankTrouble,Arial,sans-serif;color:#fff;background:linear-gradient(#427fff,#0014ab);text-shadow:0 2px 0 rgba(0,0,0,.35)}
#ttcl-tut p{margin-top:0;margin-bottom:8px}#ttcl-tut ul{margin-top:0;margin-bottom:8px;padding:0;list-style:none}#ttcl-tut li{display:flex;gap:8px;margin:5px 0}#ttcl-tut .md li{display:list-item;margin:3px 0}#ttcl-tut .md b{display:inline}
#ttcl-tut b{color:#9db8ff}
#ttcl-tut kbd{display:inline-block;font:bold 11px Arial;color:#fff;background:#2a2f3d;border:1px solid #4a5268;border-bottom-width:2px;border-radius:4px;padding:0 5px}
#ttcl-tut .btns{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;margin-top:8px;margin-bottom:12px}
#ttcl-tut button{font:15px TankTrouble,Arial,sans-serif;line-height:28px;border:none;border-radius:5px;padding:0 12px;cursor:pointer;color:#fff;background:linear-gradient(#427fff,#0014ab);box-shadow:0 3px 4px rgba(0,0,0,.5)}
#ttcl-tut button:hover{filter:brightness(1.12)}#ttcl-tut button:active{box-shadow:0 1px 4px rgba(0,0,0,.5);transform:translateY(2px)}
#ttcl-tut button.alt{background:linear-gradient(#8a8a8a,#3a3a3a)}#ttcl-tut button.go{background:linear-gradient(#3ddc4a,#0d7a1a)}
#ttcl-tut button.big{flex:1 1 100%;padding:7px 12px;font-size:17px;line-height:20px;text-align:left}
#ttcl-tut button.big small{font:12px Arial,sans-serif;color:#dfe6ff}
#ttcl-tut .n{position:absolute;right:12px;top:10px;margin:0!important;font:13px TankTrouble,Arial,sans-serif;color:#dfe6ff}`;
export function tutLayer() {
  let L = document.getElementById("ttcl-tut");
  if (L) {
    L.remove();
  }
  L = document.createElement("div");
  L.id = "ttcl-tut";
  L.innerHTML = "<style>" + TUT_CSS + "</style>";
  document.body.appendChild(L);
  L.addEventListener("keydown", (e) => e.stopPropagation(), true);
  return L;
}
export function tutCard(L, html, buttons, dim) {
  // a card in the middle of the screen
  if (dim) {
    const d = document.createElement("div");
    d.className = "dim";
    L.appendChild(d);
  }
  const c = document.createElement("div");
  c.className = "card";
  c.innerHTML = html;
  L.appendChild(c);
  const bs = document.createElement("div");
  bs.className = "btns";
  c.appendChild(bs);
  for (const [txt, cls, fn] of buttons) {
    const b = document.createElement("button");
    b.className = cls || "";
    b.innerHTML = txt;
    b.onclick = () => fn();
    bs.appendChild(b);
  }
  c.style.left = Math.max(12, (innerWidth - c.offsetWidth) / 2) + "px";
  c.style.top = Math.max(12, (innerHeight - c.offsetHeight) / 2) + "px";
  return c;
}
