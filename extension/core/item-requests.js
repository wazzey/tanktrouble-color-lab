import { GX_ACC } from "../content/colours.js";
import { CUSTOM_ART } from "../content/custom-boxes.js";
import { PUBLIC_BOXES } from "../content/laika-trophies.js";
import { drawTankIcon } from "../content/tank-icon.js";
import { getAssetMap } from "./assets.js";
import { drawItemArt } from "./community.js";
import { loggedInIds, lookupById } from "./game-socket.js";
import { garageRedraw } from "./garage-search.js";
import { applyTryOn, shareCall, srvOn } from "./look-sharing.js";
import { $, readPreviewLook, toast } from "./panel.js";
import { applyNow } from "./panel-actions.js";

// ---------- Request an item: a player's own accessory picture, placed on their tank and sent to be added ----------
// The picture only shows here, on their own screen, until the Color Lab team approves it. Placement is the picture's
// centre, size and turn on the 640 × 384 tank picture every accessory is drawn on
const REQ = {
  pic: "",
  img: null,
  slot: "turret",
  x: 281,
  y: 150,
  size: 1,
  turn: 0,
  look: null,
  busy: false,
  tryKey: "",
};
const REQ_SLOTS = [
  ["turret", "🎩 Hat / face", 281, 150],
  ["back", "🪽 Back", 200, 170],
  ["front", "✨ Front", 330, 265],
  ["barrel", "🔫 Barrel", 470, 150],
];

export function renderRequestTab() {
  const host = $("reqBody");
  if (!host) {
    return;
  }
  if (!host.children.length) {
    host.innerHTML = `
<b>Request an item</b>
<small class="mzsub">Try your own accessory on your tank, then send it to be added to Color Lab for everyone. Your picture only shows on your screen until it's approved.</small>
<div class="mzseg" id="reqSlots"></div>
<div class="row" style="gap:6px;margin:4px 0"><button class="small" id="reqPick">📁 Upload picture</button><button class="small grey" id="reqTemplate" title="A plain white tank (640 × 384) to draw your item on in any art app. Hide the tank before saving, and upload the picture at the same size: it lands exactly where you drew it">⬇ Tank</button><span class="status" id="reqPicMsg" style="margin:0">A PNG with a see-through background works best</span></div>
<input type="file" id="reqFile" accept="image/png,image/webp,image/gif" hidden>
<canvas id="reqEdit" width="640" height="384" style="display:block;width:100%;aspect-ratio:640/384;background:radial-gradient(ellipse at center,rgba(66,127,255,.25),transparent 70%);border:1px solid #333;border-radius:8px;cursor:grab;touch-action:none"></canvas>
<small class="mzsub" style="margin-top:3px">Drag to move · scroll to resize</small>
<div class="row" style="gap:6px"><span class="minilbl">Size</span><input type="range" id="reqSize" min="0.05" max="4" step="0.01" style="flex:1;min-width:0"><span class="minilbl">Turn</span><input type="range" id="reqTurn" min="-180" max="180" step="1" style="flex:1;min-width:0"><button class="small grey" id="reqReset" title="Back to where this slot's items sit">↺</button></div>
<div class="row" style="gap:10px;justify-content:center;margin:8px 0;align-items:flex-end">
  <div style="text-align:center"><canvas id="reqBar" width="80" height="48" style="width:80px;height:48px"></canvas><small class="mzsub">Player bar</small></div>
  <div style="text-align:center"><canvas id="reqProf" width="200" height="120" style="width:200px;height:120px"></canvas><small class="mzsub">Profile</small></div>
</div>
<div class="row" style="gap:6px;margin-bottom:6px"><button class="small" id="reqTry" style="flex:1" title="Wear it on your tank to see it in the garage and in games. Only you see it">🧪 Try it on my tank</button><button class="small grey" id="reqOff" hidden>✕ Take it off</button></div>
<input type="text" id="reqName" maxlength="28" placeholder="Item name, e.g. Pirate Hat" autocomplete="off" spellcheck="false">
<label class="mzsub" style="display:flex;gap:6px;align-items:center;margin:6px 0 2px;cursor:pointer"><input type="checkbox" id="reqCredit" checked><span id="reqCreditLbl">Credit me on the item</span></label>
<label class="mzsub" style="display:flex;gap:6px;align-items:center;margin:2px 0 6px;cursor:pointer"><input type="checkbox" id="reqOwn"><span>I made this picture myself (nothing from other games, brands or TankTrouble)</span></label>
<div class="row" style="gap:6px"><button class="small" id="reqSend" style="flex:1">📨 Send request</button><button class="small grey" id="reqMore" hidden>Ask to send more</button></div>
<div class="status" id="reqMsg"></div>`;
    const slots = $("reqSlots");
    for (const [id, label, x, y] of REQ_SLOTS) {
      const b = document.createElement("button");
      b.className = "small grey";
      b.dataset.slot = id;
      b.textContent = label;
      b.onclick = () => {
        REQ.slot = id;
        REQ.x = x;
        REQ.y = y;
        REQ.turn = 0;
        applyRequestControls();
        drawRequestPreview();
      };
      slots.appendChild(b);
    }
    $("reqPick").onclick = () => $("reqFile").click();
    $("reqTemplate").onclick = applyRequestTemplate;
    $("reqFile").onchange = (e) => {
      readRequestPicture(e.target.files && e.target.files[0]);
      e.target.value = "";
    };
    $("reqSize").oninput = (e) => {
      REQ.size = Number(e.target.value);
      drawRequestPreview();
    };
    $("reqTurn").oninput = (e) => {
      REQ.turn = Number(e.target.value);
      drawRequestPreview();
    };
    $("reqReset").onclick = () => {
      const s = REQ_SLOTS.find((x) => x[0] === REQ.slot);
      REQ.x = s[2];
      REQ.y = s[3];
      REQ.turn = 0;
      applyRequestControls();
      drawRequestPreview();
    };
    const cv = $("reqEdit");
    let drag = null;
    cv.onpointerdown = (e) => {
      if (!REQ.img) {
        return;
      }
      cv.setPointerCapture(e.pointerId);
      cv.style.cursor = "grabbing";
      drag = { x: e.clientX, y: e.clientY, ox: REQ.x, oy: REQ.y, k: 640 / cv.getBoundingClientRect().width };
    };
    cv.onpointermove = (e) => {
      if (!drag) {
        return;
      }
      REQ.x = Math.round(Math.min(640, Math.max(0, drag.ox + (e.clientX - drag.x) * drag.k)));
      REQ.y = Math.round(Math.min(384, Math.max(0, drag.oy + (e.clientY - drag.y) * drag.k)));
      drawRequestPreview();
    };
    cv.onpointerup = () => {
      drag = null;
      cv.style.cursor = "grab";
    };
    cv.onwheel = (e) => {
      if (!REQ.img) {
        return;
      }
      e.preventDefault();
      REQ.size = Math.min(4, Math.max(0.05, REQ.size * (e.deltaY < 0 ? 1.05 : 1 / 1.05)));
      applyRequestControls();
      drawRequestPreview();
    };
    $("reqTry").onclick = applyRequestTryOn;
    $("reqOff").onclick = applyRequestTakeOff;
    $("reqSend").onclick = applyRequestSend;
    $("reqMore").onclick = applyRequestMore;
  }
  const me = loggedInIds(false)[0];
  $("reqCreditLbl").textContent = "Credit me on the item";
  if (me) {
    lookupById(me)
      .then((r) => {
        const name = r && r.username;
        if (name) {
          $("reqCreditLbl").textContent = "Credit me as " + name;
        }
      })
      .catch(() => {});
  }
  applyRequestControls();
  REQ.look = null;
  drawRequestPreview();
}

// the plain white tank every item is drawn on, as a picture to draw an item over in any art app
async function applyRequestTemplate() {
  try {
    const map = await getAssetMap(),
      look = await readPreviewLook(map),
      c = document.createElement("canvas");
    c.width = 640;
    c.height = 384;
    drawTankIcon(c, "#ffffff", "#ffffff", "#ffffff", look.P, {});
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "color-lab-tank-template.png";
    a.click();
  } catch {
    toast("The tank picture isn't ready yet: try again in a moment", true);
  }
}

function applyRequestControls() {
  for (const b of $("reqSlots").children) {
    b.classList.toggle("grey", b.dataset.slot !== REQ.slot);
  }
  $("reqSize").value = String(REQ.size);
  $("reqTurn").value = String(REQ.turn);
}

function readRequestPicture(file) {
  const msg = $("reqPicMsg");
  if (!file) {
    return;
  }
  if (!/^image\/(png|webp|gif)$/.test(file.type) || file.size > 4e6) {
    msg.textContent = "Use a PNG (or WebP) under 4 MB";
    return;
  }
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 512 / Math.max(img.width, img.height)),
        c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0, c.width, c.height);
      const data = g.getImageData(0, 0, c.width, c.height).data;
      let clear = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 200) {
          clear++;
        }
      }
      REQ.pic = c.toDataURL("image/png");
      REQ.img = c;
      if (img.width >= 600 && Math.abs(img.width / img.height - 640 / 384) < 0.02) {
        REQ.x = 320;
        REQ.y = 192;
        REQ.turn = 0;
        REQ.size = 640 / c.width;
      } else {
        REQ.size = Math.round((150 / Math.max(c.width, c.height)) * 100) / 100;
      } // (drawn on the tank template: it goes exactly where it was drawn)
      msg.textContent = clear < (data.length / 4) * 0.05 ? "Tip: a see-through background looks better" : "";
      applyRequestControls();
      drawRequestPreview();
    };
    img.onerror = () => {
      msg.textContent = "That picture couldn't be opened";
    };
    img.src = String(fr.result);
  };
  fr.readAsDataURL(file);
}

async function drawRequestPreview() {
  if (REQ.busy) {
    REQ.again = true;
    return;
  }
  REQ.busy = true;
  try {
    if (!REQ.look) {
      REQ.look = await readPreviewLook(await getAssetMap());
    }
    const look = REQ.look,
      acc = Object.assign({}, look.acc);
    if (REQ.img) {
      acc[REQ.slot] = drawItemArt(REQ.img, REQ);
    }
    for (const id of ["reqEdit", "reqProf", "reqBar"]) {
      const cv = $(id);
      if (cv) {
        drawTankIcon(cv, look.tc, look.trc, look.bc, look.P, acc);
      }
    }
  } catch {}
  REQ.busy = false;
  if (REQ.again) {
    REQ.again = false;
    drawRequestPreview();
  }
}

function applyRequestTryOn() {
  const me = loggedInIds(false)[0];
  if (!REQ.img) {
    toast("Upload a picture first", true);
    return;
  }
  if (!me) {
    toast("Log in to try it on your tank", true);
    return;
  }
  if (REQ.tryKey) {
    delete GX_ACC[REQ.tryKey];
    delete CUSTOM_ART[REQ.tryKey];
  }
  REQ.tryKey = "cmtry-" + Date.now(); // (a new key each time, so no old picture is reused)
  GX_ACC[REQ.tryKey] = { slot: REQ.slot, name: "Your request", box: "request" };
  CUSTOM_ART[REQ.tryKey] = drawItemArt(REQ.img, REQ);
  PUBLIC_BOXES.add("request");
  applyTryOn(me, REQ.slot, REQ.tryKey);
  $("reqOff").hidden = false;
  applyNow([me], "On your tank, only on your screen. Moved it? Press Try it on again");
  garageRedraw();
}

function applyRequestTakeOff() {
  const me = loggedInIds(false)[0];
  if (!REQ.tryKey) {
    return;
  }
  delete GX_ACC[REQ.tryKey];
  delete CUSTOM_ART[REQ.tryKey];
  REQ.tryKey = "";
  applyTryOn(null);
  $("reqOff").hidden = true;
  if (me) {
    applyNow([me], "Taken off");
    garageRedraw();
  }
}

async function applyRequestSend() {
  const msg = $("reqMsg"),
    name = $("reqName").value.trim(),
    pid = loggedInIds(false)[0];
  msg.className = "status err";
  if (!REQ.img) {
    msg.textContent = "Upload a picture first";
  } else if (name.length < 2) {
    msg.textContent = "Give your item a name";
  } else if (!$("reqOwn").checked) {
    msg.textContent = "Tick the box to say you made the picture yourself";
  } else if (!pid) {
    msg.textContent = "Log in to TankTrouble to send a request";
  } else if (!srvOn()) {
    msg.textContent = "Requests need look sharing on (⚙ Settings > Sharing)";
  } else {
    msg.className = "status";
    msg.textContent = "Sending…";
    $("reqSend").disabled = true;
    const r = await shareCall({
      op: "itemreq",
      pid,
      name,
      slot: REQ.slot,
      credit: $("reqCredit").checked,
      pic: REQ.pic,
      place: { x: REQ.x, y: REQ.y, size: REQ.size, turn: REQ.turn },
      preview: readRequestShot(),
    }).catch(() => null);
    $("reqSend").disabled = false;
    const err = r && r.data && r.data.error;
    if (r && r.ok) {
      msg.className = "status ok";
      msg.textContent = "Sent! You'll get a reply in ⚙ Settings > Messages once it's been looked at";
      toast("Item request sent 📨");
    } else if (err === "full") {
      msg.textContent = "You have 3 requests waiting already: wait for a reply, or ask to send more";
      $("reqMore").hidden = false;
    } else if (err === "prove") {
      msg.textContent = "Share your look on this tank first (it proves the tank is yours)";
    } else {
      msg.textContent = err
        ? "Not sent: " + err
        : r && r.status === 404
          ? "Requests aren't open yet"
          : "Not sent: try again";
    }
  }
}

async function applyRequestMore() {
  const msg = $("reqMsg"),
    pid = loggedInIds(false)[0];
  if (!pid) {
    return;
  }
  const note = $("reqName").value.trim() ? "Wants to send: " + $("reqName").value.trim() : "";
  const r = await shareCall({ op: "itemmore", pid, note }).catch(() => null);
  const err = r && r.data && r.data.error;
  msg.className = r && r.ok ? "status ok" : "status err";
  msg.textContent =
    r && r.ok
      ? "Asked! You'll get a message when you can send more"
      : err === "asked"
        ? "You've already asked today"
        : "Not sent: try again";
  $("reqMore").hidden = r && r.ok;
}

// the tank with the item on it, as a picture for the Color Lab team to see the request by
function readRequestShot() {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 384;
  const g = c.getContext("2d");
  g.fillStyle = "#2a2f3d";
  g.fillRect(0, 0, 640, 384);
  g.drawImage($("reqEdit"), 0, 0);
  return c.toDataURL("image/jpeg", 0.85);
}
