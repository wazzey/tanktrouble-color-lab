// TankTrouble Color Lab
// The Oct 2026 TankTrouble update bundled the game into an ES module, so Backend/Users/Caches are no
// longer reachable. Every game request goes through fetch('/ajax/') as JSON-RPC, so this extension
// rewrites the colours in player-details responses there instead. Runs in the page's MAIN world at
// document_start so the fetch patch is in place before the game loads.
// Saved tanks live in the extension's own storage (chrome.storage.local, via bridge.js). Anything saved by
// the old userscript or earlier versions in the site's localStorage is moved over once, automatically.
import "./content/bridge-messages.js";
import "./content/colours.js";
import "./content/registries.js";
import "./content/images.js";
import "./content/garage-folders.js";
import "./content/maze-patterns.js";
import "./content/maps.js";
import "./content/maps-more.js";
import "./content/page-themes.js";
import "./content/awards-meta.js";
import "./content/box-agent.js";
import "./content/awards-a.js";
import "./content/awards-b.js";
import "./content/box-ninja.js";
import "./content/maps-extra.js";
import "./content/laika-trophies.js";
import "./content/hall-of-fame.js";
import "./content/achievement-paints.js";
import "./content/laika.js";
import "./content/box-heaven.js";
import "./content/sakura-shapes.js";
import "./content/box-shadow.js";
import "./content/box-sakura.js";
import "./content/custom-boxes.js";
import "./content/tank-icon.js";
import "./content/tutorials.js";
import { startAccessories } from "./core/accessories.js";
import { startAccountSync } from "./core/account-sync.js";
import { startAchievements } from "./core/achievements.js";
import { startAnnouncements } from "./core/announcements.js";
import { startCustomBoxArt } from "./core/custom-box-art.js";
import { startDrawSwap } from "./core/draw-swap.js";
import { startFeedback } from "./core/feedback.js";
import { startGameSocket } from "./core/game-socket.js";
import { startGarage } from "./core/garage.js";
import { startGarageSearch } from "./core/garage-search.js";
import { startGear } from "./core/gear.js";
import { startLab } from "./core/lab.js";
import { startLaikaLook } from "./core/laika-look.js";
import { startLookSharing } from "./core/look-sharing.js";
import { startMaze } from "./core/maze.js";
import { startNetwork } from "./core/network.js";
import { startOnline } from "./core/online.js";
import { startPage } from "./core/page.js";
import { startPalette } from "./core/palette.js";
import { panel, startPanel } from "./core/panel.js";
import { refreshLoggedIn, startPanelActions } from "./core/panel-actions.js";
import { startPresence } from "./core/presence.js";
import { startRandom } from "./core/random.js";
import { startSavedLooks } from "./core/saved-looks.js";
import { startSettings } from "./core/settings.js";
import { startStorage } from "./core/storage.js";
import { setOpen, startTabs } from "./core/tabs.js";
import { startTeamBadges } from "./core/team-badges.js";
import { startTutorialRun } from "./core/tutorial-run.js";
import { startUpdates } from "./core/updates.js";

if (!window.__ttColorLab) {
  startStorage();
  startLookSharing();
  startNetwork();
  startGarage();
  startMaze();
  startPage();
  startGarageSearch();
  startGameSocket();
  startAchievements();
  startLaikaLook();
  startCustomBoxArt();
  startDrawSwap();
  startPanel();
  startPalette();
  startAccessories();
  startSavedLooks();
  startRandom();
  startPanelActions();
  startTabs();
  startSettings();
  startUpdates();
  startAnnouncements();
  startFeedback();
  startTeamBadges();
  startLab();
  startGear();
  startPresence();
  startTutorialRun();
  startOnline();
  startAccountSync();
  window.__ttColorLab = { toggle: () => setOpen(!panel.classList.contains("open")), refresh: () => refreshLoggedIn() };
}
