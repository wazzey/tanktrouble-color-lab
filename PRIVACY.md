# TankTrouble Color Lab: privacy policy

_Last updated: 28 October 2026 (version 1.4.2)_

TankTrouble Color Lab ("Color Lab") is a free, fan-made, cosmetic-only browser extension made and run by **wazzey**. It is not affiliated with TankTrouble. This page explains what it collects, why, and how to remove it.

**In short:** no tracking, no analytics, no ads, no accounts, and nothing is sold or shared with anyone. Color Lab only runs on tanktrouble.com, and apart from TankTrouble itself it only talks to its own server (`ttcl-share.wazzey.workers.dev`, run by the author on Cloudflare).

## What stays on your own computer

- Your saved looks, presets, favourites and settings.
- For tanks you give a custom look: their in-game username, player ID and any nickname you type.
- Achievement progress (kills, wins, streaks, which days you played).
- A backup of the above in tanktrouble.com's site storage, so your looks survive a reinstall, and a picture cache.

Color Lab reads TankTrouble's own game messages in the page so it can recolour tanks and count achievements. Your login passes through the game the normal way: Color Lab never reads, keeps or sends your password.

## What the Color Lab server keeps

### Look sharing (so Color Lab players see each other's looks)
- For each of your logged-in tanks with a Color Lab look: its player ID, its public TankTrouble name, the look, and when it was saved.
- A one-way hash of a random key made by your copy, so only your copy can change or remove your tank's look.
- A history of look changes (when each look was saved, and the approximate country of the connection as Cloudflare reports it), kept for 30 days so the author can deal with abuse. Only the author sees it.
- To show other tanks' looks, your copy sends the player IDs of the tanks around you. The server keeps no record of who asked for which looks.
- Before a tank's look is shared, Color Lab proves the tank is yours by changing one thing on it for about a second (it asks first, once per tank) and the server checks the tank's public details on TankTrouble.
- To limit abuse, a one-way code made from your connection is kept for one day (longer only if that connection is banned). It is never stored next to a look.

### Reports
If you report a shared look, the report records your copy's key hash and your tank's name, so the author can see who reported it. A look reported by enough players is hidden.

### Online status
Every few minutes your copy tells the server it is running: its key hash, version, which of your tanks are logged in, which TankTrouble server you're on and whether you're idle. When you close your last TankTrouble tab it says so, so you show as offline straight away. This is kept for up to 60 days after your copy was last seen (logged-in tanks for 30), then deleted.

Other players see you only if you turn on **Settings > Look sharing > Show me as online** (and your server only if you also turn on **Show which server I'm on**). **👻 Invisible** hides you from the list and the count for everyone except the author. **Go offline** stops Color Lab contacting the server at all.

### Messages
If you send a message from **Message Color Lab**, its text and any screenshots go to the author (delivered to the author's private Discord) with your tank's name. The text and replies are kept so you can see them in Color Lab; screenshots are not kept.

### Announcements and updates
Color Lab checks the server for announcements and, for copies downloaded from GitHub, for new versions. Nothing about you is sent. Copies from the Chrome Web Store are updated by the store.

Like any website, Cloudflare (which runs the server) sees your IP address when your browser connects.

## Your choices and deleting your data

- **Settings > Look sharing > Share my look** off removes your tanks' looks from the server and stops sending your tanks, server and idle status.
- **See other players' looks** off stops asking for anyone's look.
- To remove everything: switch off Share my look, remove the extension at `chrome://extensions`, then clear tanktrouble.com's site data (padlock > Site settings > Delete data).
- To ask for any data to be removed, open an issue at https://github.com/wazzey/tanktrouble-color-lab/issues or message Color Lab from the extension.

## Contact

wazzey: https://github.com/wazzey/tanktrouble-color-lab
