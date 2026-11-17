import { GX_ACC } from "../content/colours.js";
import { PUBLIC_BOXES } from "../content/laika-trophies.js";
import { EXT_BOXPIC } from "../content/registries.js";
import { shareCall, srvOn } from "./look-sharing.js";
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
