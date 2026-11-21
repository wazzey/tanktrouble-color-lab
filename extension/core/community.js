import { GX_ACC } from "../content/colours.js";
import { PUBLIC_BOXES } from "../content/laika-trophies.js";
import { EXT_BOXPIC } from "../content/registries.js";
import { loggedInIds } from "./game-socket.js";
import { garageLocal } from "./garage.js";
import { shareCall, shareMyLooks, srvOn } from "./look-sharing.js";
import { toast } from "./panel.js";
import { whenStorage } from "./storage.js";

// ---------- Community items: players' own accessories the Color Lab team approved, in the garage's Community box ----------
// They come from the server (picture and placement), so new ones appear without an update
export const COMMUNITY_PICS = {};
EXT_BOXPIC.community = {
  ramp: [
    [0, [4, 24, 24]],
    [0.35, [10, 90, 86]],
    [0.65, [32, 184, 168]],
    [0.88, [150, 236, 224]],
    [1, [255, 255, 255]],
  ],
  overlay() {},
};

export function startCommunity() {
  whenStorage().then(() => setTimeout(applyCommunityItems, 3000));
}

async function applyCommunityItems() {
  if (!srvOn()) {
    return;
  }
  const r = await shareCall({ op: "community" }).catch(() => null),
    items = (r && r.ok && r.data && r.data.items) || [];
  for (const it of items) {
    if (!/^cm-\d+$/.test(String(it.key)) || !it.pic || !it.place) {
      continue;
    }
    GX_ACC[it.key] = { slot: it.slot, name: it.name + (it.credit ? " (by " + it.credit + ")" : ""), box: "community" };
    COMMUNITY_PICS[it.key] = { pic: it.pic, place: it.place };
  }
  if (Object.keys(COMMUNITY_PICS).length) {
    PUBLIC_BOXES.add("community");
  } // (the box shows once there's something in it)
}

// an approved request's reply: the item's picture and a button to wear it (once it's in the Community box)
export function readCommunityReply(item) {
  const key = "cm-" + Number(item),
    pic = COMMUNITY_PICS[key] && String(COMMUNITY_PICS[key].pic);
  if (!item || !pic || !/^(data:image\/|https:)/.test(pic)) {
    return item
      ? '<div style="margin-top:4px;opacity:.8">It will be in the Community box within a few minutes.</div>'
      : "";
  }
  return (
    '<div style="margin-top:6px"><img src="' +
    pic.replace(/"/g, "&quot;") +
    '" alt="" style="display:block;max-width:120px;max-height:90px;margin-bottom:4px"><button class="small" data-k="wear" data-id="' +
    key +
    '">🎩 Wear it</button></div>'
  );
}

// put a Community item on your first logged-in tank's Color Lab look
export function applyCommunityWear(key) {
  const pid = loggedInIds(false)[0],
    acc = GX_ACC[key];
  if (!pid || !acc) {
    toast(pid ? "That item isn't in the Community box yet, try again in a few minutes" : "Log in to wear it", true);
    return;
  }
  garageLocal(
    pid,
    (p) => {
      p.acc = Object.assign({}, p.acc, { [acc.slot]: "ttcl:" + key });
    },
    true,
  );
  shareMyLooks(true);
  toast("🎩 Wearing " + acc.name);
}

// a picture placed on a 640 × 384 layer, the same as every accessory is drawn on a tank: its centre, size and turn
export function drawItemArt(img, place) {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 384;
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.translate(place.x, place.y);
  g.rotate((place.turn * Math.PI) / 180);
  g.scale(place.size, place.size);
  g.drawImage(img, -img.width / 2, -img.height / 2);
  return c;
}
