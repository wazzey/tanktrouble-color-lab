# TankTrouble Color Lab: privacy policy

_Last updated: 28 October 2026_

TankTrouble Color Lab ("Color Lab") is a free, fan-made, cosmetic-only browser extension made and run by **wazzey** ("the author"). It is not affiliated with TankTrouble. This page lists everything it collects, who can see it, how long it's kept and how to remove it. The code that does all of this is public: the extension in [`extension/`](extension) and its server in [`server/`](server).

**In short:** no tracking, no analytics, no ads, no accounts, and nothing is sold or shared. Color Lab only runs on tanktrouble.com, and apart from TankTrouble it only talks to its own server, `ttcl-share.wazzey.workers.dev`, run by the author on Cloudflare.

## On your own computer

- Your saved looks, presets, favourites and settings.
- For tanks you give a custom look: their in-game name, player ID and any nickname you type.
- Achievement progress (kills, wins, streaks, which days you played).
- A backup of the above in tanktrouble.com's site storage, so your looks survive a reinstall, and a picture cache.

Color Lab reads TankTrouble's own game messages in the page so it can recolour tanks and count achievements. Your login passes through the game the normal way: Color Lab never reads, keeps or sends your password. Its browser permissions are `storage` (your looks) and `scripting` (so the toolbar button and Alt+C open the panel).

## On the Color Lab server

### Your copy's key

Each copy of Color Lab makes a random key. The server only ever keeps a one-way hash of it, which ties your shared looks, messages and online status to your copy without naming you.

### Look sharing

- For each of your logged-in tanks with a Color Lab look: its player ID, its public TankTrouble name, the look, and when it was saved.
- A history of look changes (the look, when, and the approximate country of the connection as Cloudflare reports it), kept for 30 days to deal with abuse.
- To show other tanks' looks, your copy sends the player IDs of the tanks around you. The server keeps no record of who asked for which looks.
- Before a tank's look is shared, Color Lab proves the tank is yours by changing one thing on it for about a second (it asks first, once per tank), and the server checks the tank's public details on TankTrouble. Proofs in progress are kept for a day.

### Limits and abuse

- A one-way code made from your connection's IP address, which changes every day. It's kept for a day for the sharing limits, and for 7 days next to your copy's key hash to spot one connection making many copies. It's never stored next to a look. A banned connection's lasting code is kept until the ban is lifted.
- If you report a shared look, the report records your copy's key hash and your tank's name, for 30 days. A look reported by enough players is hidden.
- Tanks whose look the server removes by itself (guests, and accounts TankTrouble has banned) are noted with their name and the reason for 90 days.
- Server events (errors, limits reached, bans) are kept for 30 days.

### Online status

Every few minutes, and when you log in or out or go idle, your copy tells the server it's running: its key hash and version, which of your tanks are logged in (guests included), which TankTrouble server you're on, whether you're idle (the tab is hidden, or no input for 5 minutes) or away (the tab has been in the background for a few minutes in the lobby) and for how long, and whether you're in the lobby, a queue or a game. When you close your last TankTrouble tab it says so, so you show as offline at once.

The copy's key hash, version and first and last seen are kept for up to 60 days after it was last seen, and its logged-in tanks for 30 days. For each account seen logged in, the server also keeps the copy it was last seen on, that copy's version and when it was first and last seen, for up to 60 days after it was last seen. Tank names are kept for 180 days, or for as long as the tank has a shared look, a proof, a report or a removal note.

Turning off **Settings > Look sharing > Share my look** removes your tanks' looks from the server and stops sending your tanks, server and idle status. The key hash and version are still sent, so replies to your messages reach you. **Go offline** stops Color Lab contacting the server at all, and in an **Incognito window** it never does.

### Messages

A message sent from **Message Color Lab** goes to the author's private Discord with its text, any screenshots and your logged-in tanks' names. Cloudflare's AI ([Workers AI](https://developers.cloudflare.com/workers-ai/)) reads up to the first 800 characters to tag it (bug, idea, question and so on). The text and the replies are kept so you can see them in Color Lab, until you ask for them to be removed; screenshots aren't kept.

### Announcements and updates

Color Lab checks the server for announcements and, for copies downloaded from GitHub, for new versions. Nothing about you is sent with these.

Like any website, Cloudflare (which runs the server) sees your IP address when your browser connects.

## Who sees what

**Other Color Lab players** see your look on your proven tanks. They see you in the online list only if you turn on **Settings > Look sharing > Show me as online** (your name, and whether you're online or idle and in the lobby, a queue or a game), and your TankTrouble server only if you also turn on **Show which server I'm on**. Otherwise you're counted as "hidden". Players who are away, or idle for 15 minutes or more, show as offline. **👻 Invisible** leaves you out of the list and the count.

**The author** sees everything the server keeps, on its admin page and in the author's own copy of Color Lab. That includes every online copy whatever its settings (invisible ones too), guests' names, accounts not yet allowed to share, each copy's version, server, idle and away minutes and last seen, the look history and reports, and the messages. It's used to run the server, deal with abuse and answer messages, and isn't shared with anyone.

## Your choices and deleting your data

- **Share my look** off removes your tanks' looks from the server and stops sending your tanks, server and idle status.
- **See other players' looks** off stops asking for anyone's look.
- To remove everything: switch off Share my look, remove the extension at `chrome://extensions`, then clear tanktrouble.com's site data (padlock > Site settings > Delete data).
- To ask for any data to be removed, open an issue at https://github.com/wazzey/tanktrouble-color-lab/issues or message Color Lab from the extension.

## Contact

wazzey: https://github.com/wazzey/tanktrouble-color-lab
