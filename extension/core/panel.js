import { GX_PAINT, isPat, normHex, patId } from "../content/colours.js";
import { imgCache, loadImg } from "../content/images.js";
import { normVal, showVal, toCss } from "../content/registries.js";
import { ICON_H, ICON_W, PART_NAMES, bufA, bufB, bufO, drawTankIcon } from "../content/tank-icon.js";
import { renderAccs, thumbCache } from "./accessories.js";
import { forgetAssetMap, getAssetMap, loadAccessories, resolvePaint } from "./assets.js";
import { getCustomArt, gxPaintIcon } from "./custom-box-art.js";
import { mazeFeature } from "./maze.js";
import { lightUrl, renderPalette, renderSources } from "./palette.js";
import { randomColours } from "./random.js";
import { resolved, updateSaveLabel } from "./saved-looks.js";
import { GUI_POS } from "./storage.js";

let IS_MAC;
export let KEY_C, KEY_V;
export let panelHost;
export let root;
export let panel, nameEl, whoEl;
export const PARTS = [
  ["turret", "Turret", "turretColour"],
  ["base", "Base", "baseColour"],
  ["treads", "Treads", "treadColour"],
];

export const $ = (id) => root.getElementById(id);
export let selPart = "turret";
export const partRows = {};

// Toasts live in their own tiny element (only on the page while showing), so Alt+V feedback
// works with the panel closed.
let toastTimer,
  toastEl = null;
export function toast(msg, err, ms) {
  if (!document.body) {
    return;
  }
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.attachShadow({ mode: "open" }).innerHTML = `<style>
div{position:fixed;top:16px;right:16px;z-index:2147483001;padding:10px 14px;border-radius:8px;background:linear-gradient(#427fff,#0014ab);color:#fff;font-family:TankTrouble,Arial,sans-serif;font-size:15px;box-shadow:0 6px 18px rgba(0,0,0,.5);pointer-events:none;opacity:0;transform:translateY(-6px);transition:.15s}
div.show{opacity:1;transform:none}div.err{background:linear-gradient(red,maroon)}</style><div></div>`;
  }
  const t = toastEl.shadowRoot.querySelector("div");
  if (!toastEl.isConnected) {
    document.body.appendChild(toastEl);
  }
  t.textContent = msg;
  t.className = err ? "err" : "";
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove("show");
    toastTimer = setTimeout(() => toastEl.remove(), 200);
  }, ms || 2000);
}
export function setStatus(el, msg, kind) {
  el.textContent = msg || "";
  el.className = "status" + (kind ? " " + kind : "");
}
function selectPart(key) {
  selPart = key;
  PARTS.forEach(([k]) => {
    partRows[k].r.classList.toggle("sel", k === key);
    partRows[k].txt.hidden = k !== key;
  });
}

// Accessories in the form: slot -> id ("0" = none); a missing slot keeps the tank's real accessory
export let formAcc = {};
export function setFormAcc(acc) {
  formAcc = Object.assign({}, acc || {});
  if (typeof renderAccs === "function") {
    renderAccs();
  }
}
// Load a saved look (colours + accessories) into the form
export function setForm(src) {
  PARTS.forEach(([k]) => {
    partRows[k].mz.checked = !(src && src.maze && src.maze[k] === false);
    setPart(k, src ? src[k] : null);
  });
  setFormAcc(src && src.acc);
}
export function getForm() {
  const o = {};
  PARTS.forEach(([k]) => (o[k] = normVal(partRows[k].txt.value)));
  const mz = {};
  PARTS.forEach(([k]) => {
    if (isPat(o[k]) && !partRows[k].mz.checked) {
      mz[k] = false;
    }
  });
  o.maze = Object.keys(mz).length ? mz : null; // patterned parts switched off in the maze
  return o;
}
// The tank's real colour for a part, as "0x…" or "p:<id>"
export const realVal = (field) => {
  const d = resolved && resolved.data,
    c = d && d[field];
  if (!c) {
    return null;
  }
  return c.type === "numeric" ? normHex(c.numericValue) : "p:" + c.imageValue;
};
export function setPart(k, v) {
  const n = normVal(v);
  partRows[k].txt.value = n ? showVal(n) : "";
  partRows[k].txt.classList.remove("bad");
  paintChip(k);
}
// Chip swatch shows the colour in use (typed one, else the tank's real one); patterns show their art
export let iconMap = null; // pattern icon URLs, once the asset map has loaded
const chipAsked = new Set();
function paintChip(k) {
  const row = partRows[k],
    v = normVal(row.txt.value) || realVal(row.field);
  row.pick.value = toCss(v) || "#808080";
  row.pat.hidden = !isPat(v);
  row.mz.parentNode.hidden = !(mazeFeature() && isPat(normVal(row.txt.value))); // Pattern in-maze: only for a pattern paint
  if (isPat(v)) {
    const u = GX_PAINT[patId(v)] ? gxPaintIcon(patId(v)) : iconMap && iconMap["icon" + patId(v)];
    row.pat.style.background = u ? `url(${lightUrl(u)}) center/cover` : toCss(v);
    if (!u && GX_PAINT[patId(v)] && !chipAsked.has(patId(v))) {
      chipAsked.add(patId(v));
      getCustomArt(patId(v)).then((x) => {
        if (x) {
          try {
            paintChip(k);
          } catch {}
        }
      });
    }
  } // asked once; redrawn only when the art exists
}
export function refreshRealLabels() {
  PARTS.forEach(([k, , field]) => {
    const d = resolved && resolved.data,
      c = d && d[field];
    // The tank's real colour shows as the placeholder, i.e. what a blank part will look like
    // Empty box = keep the tank's current colour, so show that colour as the hint
    partRows[k].txt.placeholder = !c
      ? `${partRows[k].label} hex, e.g. #ff8800`
      : c.type === "numeric"
        ? `${partRows[k].label} ${k === "treads" ? "are" : "is"} #${normHex(c.numericValue).slice(2)} now`
        : `${partRows[k].label} ${k === "treads" ? "are" : "is"} a pattern now`;
    paintChip(k);
  });
}

// preview
let pvTimer = null,
  pvSeq = 0;
export function schedulePreview() {
  clearTimeout(pvTimer);
  pvTimer = setTimeout(renderPreview, 30);
  try {
    updateSaveLabel();
  } catch {}
}
async function renderPreview() {
  const seq = ++pvSeq,
    cv = $("pv"),
    msg = $("pvmsg");
  try {
    const map = await getAssetMap();
    if (!iconMap) {
      iconMap = map;
      PARTS.forEach(([k]) => paintChip(k));
      if (!$("swatches").hidden) {
        renderSources();
        renderPalette();
      }
      renderAccs();
    }
    const P = {};
    await Promise.all(
      PART_NAMES.map(async (n) => {
        P[n] = map[n] ? await loadImg(map[n]) : null;
      }),
    );
    const f = getForm(),
      d = resolved && resolved.data;
    const pick = (k, field) => f[k] || (d && d[field]) || null;
    const [tc, trc, bc] = await Promise.all([
      resolvePaint(map, pick("turret", "turretColour")),
      resolvePaint(map, pick("treads", "treadColour")),
      resolvePaint(map, pick("base", "baseColour")),
    ]);
    const accSrc = Object.assign({}, d || {});
    for (const slot in formAcc) {
      accSrc[slot + "Accessory"] = formAcc[slot];
    }
    const acc = await loadAccessories(map, accSrc);
    if (seq !== pvSeq) {
      return;
    }
    drawTankIcon(cv, tc, trc, bc, P, acc);
    msg.textContent = "";
  } catch (e) {
    if (seq === pvSeq) {
      msg.textContent = "Preview unavailable: " + ((e && e.message) || e);
    }
  }
}

export function freePreviewMemory() {
  clearTimeout(pvTimer);
  pvSeq++;
  for (const k in imgCache) {
    delete imgCache[k];
  }
  forgetAssetMap();
  iconMap = null;
  for (const k in thumbCache) {
    delete thumbCache[k];
  }
  [bufA, bufB, bufO].forEach((b) => {
    b.width = 0;
    b.height = 0;
  });
  const cv = $("pv");
  cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
}

export function startPanel() {
  // ---------- UI ----------
  // Show shortcuts the way each OS names them (Option on a Mac, Alt elsewhere)
  IS_MAC = /Mac|iPhone|iPad/.test(
    [navigator.userAgentData && navigator.userAgentData.platform, navigator.platform, navigator.userAgent].join(" "),
  );
  KEY_C = IS_MAC ? "⌥ Option+C" : "Alt+C";
  KEY_V = IS_MAC ? "⌥ Option+V" : "Alt+V";
  panelHost = document.createElement("div");
  panelHost.id = "tt-color-lab-host";
  panelHost.style.cssText = `position:fixed;left:${GUI_POS.x}px;top:${GUI_POS.y}px;z-index:2147483000;`;
  root = panelHost.attachShadow({ mode: "open" });

  root.innerHTML = `
<style>
:host{all:initial}
*{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
[hidden]{display:none !important}
button{font-family:TankTrouble,Arial,sans-serif;text-align:center;background:linear-gradient(#427fff,#0014ab);border:none;border-radius:5px;box-shadow:0 3px 4px rgba(0,0,0,.5);color:#fff;cursor:pointer;outline:none;padding:0 10px;font-size:15px;min-width:34px;line-height:30px;white-space:nowrap}
button:hover{filter:brightness(1.12)}
button:active{box-shadow:0 1px 4px rgba(0,0,0,.5);transform:translateY(2px)}
button.warning{background:linear-gradient(red,maroon)}
button.small{font-size:13px;line-height:24px;padding:0 9px;min-width:26px;letter-spacing:.2px}
button.big{width:100%;font-size:19px;line-height:36px;margin-top:10px}
button.grey,.seg button:not(.on){background:linear-gradient(#8a8a8a,#3a3a3a)}
button.link{background:none;box-shadow:none;color:#aaa;font-size:13px;padding:0;min-width:0;line-height:18px}
button.link:hover{color:#fff;filter:none}
button.link.danger:hover{color:#ff5050}
button:disabled{background:linear-gradient(#ccc,#4d4d4d);color:#f0f0f0;cursor:default;filter:none;transform:none}
.panel{display:none;width:384px;max-width:calc(100vw - 24px);max-height:calc(100vh - 20px);overflow-x:hidden;overflow-y:auto;background:rgba(0,0,0,.9);color:#fff;border:3px solid #427fff;border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.6)}
.panel.open{display:block}
.hdr{position:sticky;top:0;z-index:2;display:flex;align-items:flex-end;justify-content:space-between;padding:6px 6px 0 6px;background:linear-gradient(#427fff,#0014ab);cursor:grab;user-select:none}
.hdr .row{gap:3px;padding-bottom:6px}
.hdr .row button{padding:0 6px;min-width:24px}
.tabs{display:flex;gap:2px;min-width:0;flex:1 1 auto;overflow:hidden}.hdr .row{gap:4px;flex-shrink:0}.hdr .row .small{min-width:30px;padding-left:6px;padding-right:6px}
.tab{background:rgba(0,0,0,.28);box-shadow:none;border-radius:7px 7px 0 0;font-size:14px;line-height:30px;padding:0 5px;color:#cfd8ff}
.tab:active{transform:none}
.tab.on{background:rgba(0,0,0,.9);color:#fff}.tab:not(.on) .tlbl{display:none}
.count{font-family:Arial,sans-serif;font-weight:bold;font-size:10px;background:rgba(255,255,255,.18);border-radius:8px;padding:1px 6px;margin-left:5px;vertical-align:2px}
.help{padding:10px 14px 12px;background:rgba(66,127,255,.12);border-bottom:1px solid rgba(255,255,255,.1)}
.help h4{margin:6px 0 5px;font-family:TankTrouble,Arial,sans-serif;font-size:13px;font-weight:normal;color:#9db8ff}
.help h4:first-child{margin-top:0}
.help dl{display:grid;grid-template-columns:auto 1fr;gap:5px 10px;margin:0;align-items:center}
.help dt{justify-self:start}
.help dd{margin:0;font-size:12px;color:#ddd;line-height:1.35}
.help .hint{margin:8px 0 0;font-size:11px;color:#9aa}
.help kbd{display:inline-block;min-width:22px;text-align:center;font-family:Arial,sans-serif;font-weight:bold;font-size:11px;color:#fff;background:#2a2f3d;border:1px solid #4a5268;border-bottom-width:2px;border-radius:4px;padding:1px 6px}
.pane{padding:12px 14px 14px}
.row{display:flex;gap:7px;align-items:center}
input[type=text]{width:100%;background:#000;color:#fff;border:2px solid #808080;border-radius:7px;padding:5px 8px;font-size:13px;outline:none;transition:border .3s}
input[type=text]:focus{border-color:#427fff}
input.bad{border-color:red}
input.good{border-color:#31e000}
#name{font-family:TankTrouble,Arial,sans-serif;font-size:16px;border-width:3px;flex:1 1 auto;min-width:0;width:auto}
.namerow button{flex:0 0 auto}
.status{font-size:12px;margin-top:5px;color:#bbb}
.status:empty{display:none}
.status.ok{color:#31e000}.status.err{color:#ff5050}
.preview{position:relative;display:flex;justify-content:center;align-items:center;height:96px;margin:8px 0 6px;background:radial-gradient(ellipse at center,rgba(66,127,255,.25),transparent 70%);border-radius:10px}
.preview canvas{width:160px;height:96px}
.preview .msg{position:absolute;bottom:2px;font-size:10px;color:#999}
.chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.chip{min-width:0;display:flex;flex-direction:column;gap:6px;padding:6px 7px 7px;border-radius:9px;border:2px solid #333;background:rgba(255,255,255,.04);cursor:pointer}
.chip.sel{border-color:#427fff;background:rgba(66,127,255,.15)}
.chip input[type=color]{flex:1;min-width:0;height:24px;padding:0;border:0;border-radius:5px;background:none;cursor:pointer}
.chip .lbl{text-align:center;font-family:TankTrouble,Arial,sans-serif;font-size:14px;line-height:16px}
.chip .sw2{display:flex;gap:5px;align-items:center}
.chip .mz{display:flex;align-items:center;gap:3px;font-size:10px;line-height:12px;color:#bbb;cursor:pointer;white-space:nowrap}.chip .mz[hidden]{display:none}.chip .mz input{margin:0;width:12px;height:12px;accent-color:#427fff}
.chip .dice{flex:0 0 auto;padding:0;min-width:24px;line-height:22px;font-size:12px}
.hexrow{margin-top:10px}
.hexrow input{font-family:Consolas,monospace}
.hexrow input::placeholder{color:#777}
.tools{margin-top:10px;gap:6px;flex-wrap:wrap}
.seg{display:flex;gap:3px}
.spacer{flex:1}
.more{margin-top:10px;gap:16px}
.more .link{white-space:nowrap;flex:0 0 auto}
.hexrow input{flex:1 1 auto;min-width:0}
.hexrow button{flex:0 0 auto}
.pal{display:grid;grid-template-columns:repeat(11,1fr);gap:4px;margin-top:6px}
.sw{aspect-ratio:1;border-radius:5px;border:2px solid #444;cursor:pointer}
.sw:hover{border-color:#427fff;transform:scale(1.12)}
.empty{font-size:12px;color:#888}
.pal .empty{grid-column:1/-1}
#list{max-height:300px;overflow:auto}
#filter{margin-bottom:6px}
.acc{display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:9px;cursor:pointer;border:2px solid transparent}
.acc:hover{background:rgba(255,255,255,.07)}
.acc.cur{border-color:#427fff;background:rgba(66,127,255,.15)}
.dots{display:flex;gap:2px}.dots i{width:12px;height:12px;border-radius:3px;border:1px solid #555;display:block}
.acc .nm{flex:1;min-width:0;font-family:TankTrouble,Arial,sans-serif;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.acc .nm small{font-family:Arial,sans-serif;font-size:11px;color:#999;margin-left:5px}
.acc .nm input{font-family:TankTrouble,Arial,sans-serif;font-size:14px;padding:2px 6px}
.acc .del{opacity:0;transition:opacity .15s}
.acc:hover .del,.acc.cur .del{opacity:1}
.foot{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:11px;color:#888}
.reload{display:none;margin-top:6px;width:100%}
#power.on{background:linear-gradient(#3ddc4a,#0d7a1a)}
.paused{padding:6px 14px;background:rgba(255,80,80,.18);color:#ffb3b3;font-size:12px;border-bottom:1px solid rgba(255,255,255,.1)}
select{background:#000;color:#fff;border:2px solid #808080;border-radius:6px;font-family:TankTrouble,Arial,sans-serif;font-size:13px;padding:1px 4px;height:26px;outline:none;min-width:0}
select:focus{border-color:#427fff}
#rndSrc{flex:1 1 0;width:0}
.tools{flex-wrap:nowrap}
#party.on{background:linear-gradient(#ff6ad5,#a3008a)}
.sethead{display:flex;align-items:center;gap:10px;font-family:TankTrouble,Arial,sans-serif;font-size:20px}.setlist{display:flex;flex-direction:column;gap:2px;margin-top:4px}
.boxrow .bname{flex:1}.boxrow.off .bname{color:#8a93a8}.bprev{display:flex;gap:2px}.bdot{width:15px;height:15px;border-radius:50%;background-size:cover;background-position:center;box-shadow:0 0 0 1px rgba(255,255,255,.25)}.boxrow.off .bdot{opacity:.45}.mzsec{margin-bottom:6px}.mzsub{display:block;font-size:11px;color:#8a93a8;margin:-2px 0 5px}.mzseg{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}.mzseg>button{flex:1 1 auto}.mztiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(62px,1fr));gap:5px;margin-bottom:5px}.mztile{display:flex;flex-direction:column;align-items:center;gap:3px;background:rgba(0,0,0,.35);box-shadow:none;border:2px solid transparent;border-radius:8px;padding:5px 4px;min-width:0;font-size:11px;line-height:1.1;color:#cfd8ff;opacity:.55}.mztile:hover{opacity:.85}.mztile.on{opacity:1;border-color:#427fff;background:rgba(66,127,255,.18);color:#fff}.mztile canvas{display:block;border-radius:5px}.mztile>span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mzdots .mztile.dot{min-width:0;padding:3px;border-radius:50%}.mzdots{align-items:center}.mzpaint{display:flex;align-items:center;gap:6px}.mzpaint select{flex:1}.achhd{display:flex;align-items:center;gap:6px;margin-bottom:6px}.achhd b{flex:1}.achbar{height:6px;border-radius:3px;background:rgba(0,0,0,.4);overflow:hidden;margin-bottom:8px}.achbar i{display:block;height:100%;background:linear-gradient(90deg,#ffb703,#ffe066)}.achrow{display:flex;gap:8px;align-items:center;padding:3px 4px;border-radius:7px;background:rgba(0,0,0,.25);margin-bottom:4px}.achrow.locked{opacity:.6}.achrow img,.achrow .achq{width:40px;height:40px;flex:none}.achrow .achq{display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(255,255,255,.08);font:bold 20px sans-serif;color:#8a93a8}.achrow .achtx{flex:1;min-width:0;font-size:11px;color:#cfd8ff;line-height:1.25}.achrow .achtx b{display:block;font-size:12px;color:#fff}.achrow button{flex:none;padding:2px 6px;font-size:10px}
.setpick{cursor:default;flex-wrap:wrap}.setpick select{max-width:140px}.bulcol{width:30px;height:24px;padding:0;border:2px solid #808080;border-radius:6px;background:#000}.mappool{display:flex;flex-wrap:wrap;gap:4px 12px;padding:0 6px 6px 41px;font-size:12px;color:#ccd}.mappool label{display:flex;align-items:center;gap:3px;cursor:pointer}
.setrow{display:flex;align-items:center;gap:9px;padding:5px 6px;border-radius:7px;cursor:pointer;font-size:13px;color:#ddd}.setrow:hover{background:rgba(255,255,255,.06)}.setrow .tog{flex:0 0 26px}.setrow small{display:block;font-size:11px;color:#8a93a8}
.setbtns{gap:6px;margin-top:6px;flex-wrap:wrap}#setBtn.on{background:linear-gradient(#427fff,#0014ab)}
.sw,.acctile{position:relative}.fav::after{content:'★';position:absolute;top:-5px;right:-4px;font-size:11px;line-height:11px;color:#ffd23a;text-shadow:0 0 2px #000,0 0 2px #000;pointer-events:none}
.modal{position:fixed;inset:0;z-index:20}.mbox{position:fixed;width:260px;box-sizing:border-box;background:#0b0d13;border:3px solid #427fff;border-radius:12px;overflow:hidden;box-shadow:0 0 0 9999px rgba(0,0,0,.55),0 10px 30px rgba(0,0,0,.6)}
.mtitle{padding:6px 12px;font-family:TankTrouble,Arial,sans-serif;font-size:17px;background:linear-gradient(#427fff,#0014ab)}.mtx{padding:10px 12px 4px;font-size:13px;line-height:1.4;color:#ddd;word-wrap:break-word}.mbtn{justify-content:flex-end;gap:7px;padding:8px 12px 12px}
.rndbox{margin-top:6px;padding:6px 8px;border:2px solid #333;border-radius:9px;background:rgba(255,255,255,.04)}.rndbox>.row:first-child{gap:6px}.rndbox .minilbl{font-family:TankTrouble,Arial,sans-serif;font-size:12px;color:#ccc;white-space:nowrap}
#rndOpts.on{background:linear-gradient(#427fff,#0014ab)}
#helpBtn{border-radius:50%;width:24px;padding:0;box-shadow:0 0 0 2px #fff,0 3px 4px rgba(0,0,0,.5);background:linear-gradient(#427fff,#0014ab)}#helpBtn.grey{background:linear-gradient(#427fff,#0014ab)}
.chip .sw2{position:relative}
.chip .pat{position:absolute;left:0;top:0;bottom:0;right:29px;border-radius:5px;background-size:cover;background-position:center;pointer-events:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
.swfind{display:flex;gap:4px;margin-top:8px}.swfind input{flex:1;min-width:0}.swfind select{max-width:120px}
.swtabs{display:flex;gap:3px;overflow-x:auto;margin-top:8px;padding-bottom:4px;scrollbar-width:thin;scrollbar-color:#444 transparent}
.swtab{flex:0 0 70px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px 3px;border-radius:8px;border:2px solid transparent;cursor:pointer;user-select:none}
.swtab:hover{background:rgba(255,255,255,.06)}
.swtab.on{border-color:#427fff;background:rgba(66,127,255,.15)}
.swtab .pic{width:38px;height:38px;background-repeat:no-repeat;background-position:0 0;display:flex;align-items:center;justify-content:center;font-family:TankTrouble,Arial,sans-serif;font-size:20px;color:#888}
.swtab .pic.box{background-size:200% 100%}
.swtab .pic.round{background-size:cover;border-radius:50%}
.accslots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px}
.accslot{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 2px;border-radius:8px;border:2px solid #333;background:rgba(255,255,255,.04);cursor:pointer}
.accslot.sel{border-color:#427fff;background:rgba(66,127,255,.15)}
.accslot .th,.acctile .th{width:44px;height:30px;background-size:contain;background-position:center;background-repeat:no-repeat;display:flex;align-items:center;justify-content:center;color:#777;font-size:12px;font-family:TankTrouble,Arial,sans-serif}
.accslot span{font-family:TankTrouble,Arial,sans-serif;font-size:11px}
.accslot.custom span{color:#9db8ff}
.accrnd{margin-top:6px;gap:4px}
.sublbl{margin-top:10px;font-family:TankTrouble,Arial,sans-serif;font-size:13px;color:#9db8ff}
.tools2{margin-top:6px;gap:6px}
.tools2 .minilbl{font-family:TankTrouble,Arial,sans-serif;font-size:12px;color:#ccc;white-space:nowrap}
.tools2 .seg{flex:1;display:flex;gap:3px}
.tools2 .seg button{flex:1 1 0;padding:0 2px;min-width:0;font-size:12px}
.accslot.empty{opacity:.35}
.accgrid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;margin-top:6px;max-height:150px;overflow-y:auto}
.acctile{display:flex;align-items:center;justify-content:center;aspect-ratio:1;border-radius:6px;border:2px solid #333;background:rgba(255,255,255,.05);cursor:pointer}
.acctile:hover{border-color:#427fff}
.acctile.on{border-color:#31e000;background:rgba(49,224,0,.12)}
.acctile .th{width:90%;height:90%}
.swtab span{font-family:TankTrouble,Arial,sans-serif;font-size:10px;letter-spacing:-.1px;line-height:12px;color:#ddd;max-width:68px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sw.pt{background-size:cover;background-position:center}
.pal.cans{grid-template-columns:repeat(10,1fr);gap:5px 4px}
/* The game's own garage can: the white can shape tinted with the paint (or the pattern art), then its shading on top */
.can{position:relative;aspect-ratio:26/61;cursor:pointer;transition:transform .1s}
.can:hover{transform:scale(1.15)}
.can .body,.can .shade{position:absolute;inset:0}
.can .body{background-size:100% 100%,cover;background-position:center;background-blend-mode:multiply;-webkit-mask:var(--can) center/100% 100% no-repeat;mask:var(--can) center/100% 100% no-repeat}
.can .shade{background:var(--shade) 0 0/300% 100% no-repeat}
.savebar{margin-top:10px;gap:6px}
.savebar .big{margin-top:0;flex:1}
.savebar #addPreset{flex:0 0 auto;line-height:36px}
#save:disabled,#addPreset:disabled{opacity:.55;cursor:default;filter:saturate(.6)}
.tog{flex:0 0 26px;width:26px;height:14px;border-radius:7px;background:#555;position:relative;cursor:pointer;transition:background .15s}
.tog::after{content:'';position:absolute;top:2px;left:2px;width:10px;height:10px;border-radius:50%;background:#fff;transition:left .15s}
.tog.on{background:#31e000}.tog.on::after{left:14px}
.acc.off .dots,.acc.off .nm{opacity:.4}
.more2{padding:0 6px;min-width:0;font-size:11px;line-height:20px}
.presets{margin:0 0 4px 34px;border-left:2px solid #333;padding-left:6px}
.preset{display:flex;align-items:center;gap:7px;padding:3px 6px;border-radius:7px;cursor:pointer;font-family:TankTrouble,Arial,sans-serif;font-size:13px}
.preset:hover{background:rgba(255,255,255,.07)}
.preset .radio{width:10px;height:10px;border-radius:50%;border:2px solid #777;flex:0 0 10px}
.preset.act .radio{border-color:#427fff;background:#427fff}
.preset .pn{font-family:TankTrouble,Arial,sans-serif;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.preset .pn input{font-size:12px;padding:1px 5px}
.preset .del{opacity:0}.preset:hover .del{opacity:1}
.reload.show{display:block}
</style>
<div class="panel" id="panel">
  <div class="hdr" id="hdr">
    <div class="tabs">
      <button class="tab on" id="tabPaint" title="Paint a tank">🎨<span class="tlbl"> Paint</span></button>
      <button class="tab" id="tabSaved" title="Your saved tanks">💾<span class="tlbl"> Saved</span><span class="count" id="savedCount">0</span></button>
      <button class="tab" id="tabMaze" title="Maze: map themes, bullets and patterns in the maze">🗺<span class="tlbl"> Maze</span></button>
      <button class="tab" id="tabAch" title="Color Lab achievements: what you've earned, and how to get the rest">🏆<span class="tlbl"> Awards</span></button>
    </div>
    <span class="row">
      <button class="small on" id="power" title="Custom colours on / off">⏻</button>
      <button class="small grey" id="helpBtn" title="Help: what every button does, and the tutorial">?</button>
      <button class="small grey" id="setBtn" title="Settings: choose what shows in the panel and the garage, tutorial, backups">⚙</button>
      <button class="small warning" id="close" title="Close (${KEY_C})">✕</button>
    </span>
  </div>
  <div class="paused" id="paused" hidden>Custom colours are paused. Tanks show their real colours.</div>
  <div class="help" id="helpPaint" hidden>
    <h4>Shortcuts</h4>
    <dl>
      <dt><kbd>${KEY_C}</kbd></dt><dd>Open / close this panel (or click the extension icon)</dd>
      <dt><kbd>${KEY_V}</kbd></dt><dd>Refresh your logged-in tanks</dd>
      <dt><kbd>⚙</kbd></dt><dd>Settings (🔄 Refresh tanks is in there)</dd>
      <dt><kbd>⏻</kbd></dt><dd>Pause / resume all custom colours</dd>
    </dl>
    <p class="hint">Change these at chrome://extensions/shortcuts (or brave://extensions/shortcuts)</p>
    <h4>Painting</h4>
    <dl>
      <dt><kbd>Click</kbd></dt><dd>Select a part to recolour it</dd>
      <dt><kbd>🎲</kbd></dt><dd>Random colours from the source in the menu</dd>
      <dt><kbd>🎉</kbd></dt><dd>Party: your logged-in tanks get new colours every round</dd>
      <dt><kbd>Empty</kbd></dt><dd>An empty hex box keeps the tank's current colour</dd>
      <dt><kbd>Swatches</kbd></dt><dd>Pick a box to see its paints and accessories. Real keeps the tank's own accessory, None removes it. Unreleased = the never-sold box</dd>
      <dt><kbd>🎩</kbd></dt><dd>Light up slots (e.g. Turret + Barrel) so 🎲 Random and party mode roll accessories for them too</dd>
      <dt><kbd>+ Preset</kbd></dt><dd>Save these colours as another preset for the tank</dd>
      <dt><kbd>Right-click</kbd></dt><dd>Remove a recent swatch</dd>
      <dt><kbd>Garage</kbd></dt><dd>In the game's garage, the small Real / All button next to Done shows every box. Everything you pick in All only changes your tank for you; use Real to change your real tank</dd>
    </dl>
    <div class="row" style="gap:6px;margin-top:10px"><button class="small" id="tutBtn" title="Replay the tutorial (garage or panel)">▶ Tutorial</button><button class="small grey" id="newBtn" title="Update notes for this version">✨ Update notes</button></div>
  </div>
  <div class="help" id="helpSaved" hidden>
    <h4>Saved tanks</h4>
    <dl>
      <dt><kbd>Click</kbd></dt><dd>Open the tank in Paint</dd>
      <dt><kbd>Switch</kbd></dt><dd>Turn that tank's colours on / off</dd>
      <dt><kbd>+2</kbd></dt><dd>Show its other presets · click one to use it</dd>
      <dt><kbd>Double-click</kbd></dt><dd>Rename a tank or preset</dd>
      <dt><kbd>✕</kbd></dt><dd>Remove its custom colours</dd>
      <dt><kbd>⚙</kbd></dt><dd>Settings: hide buttons you don't use, backups (Export / Import), Wipe</dd>
    </dl>
    <div class="row" style="gap:6px;margin-top:10px"><button class="small" id="tutBtn2" title="Replay the tutorial (garage or panel)">▶ Tutorial</button><button class="small grey" id="newBtn2" title="Update notes for this version">✨ Update notes</button></div>
  </div>

  <div class="pane" id="panePaint">
    <div class="row namerow">
      <input type="text" id="name" placeholder="Tank name" autocomplete="off" spellcheck="false">
      <button id="find" title="Look up this tank (Enter)">Find</button>
      <button id="me" title="Your logged-in tank (press again for the next one)">Me</button>
    </div>
    <div class="status" id="who"></div>
    <div class="preview"><canvas id="pv" width="${ICON_W}" height="${ICON_H}"></canvas><div class="msg" id="pvmsg"></div></div>
    <div class="chips" id="parts"></div>
    <div class="row hexrow" id="hexrow">
      <button class="small grey" id="copyReal" title="Fill in this tank's real colours and accessories">Real</button>
      <button class="small grey" id="clearAll" title="Clear all colours and accessories">Clear</button>
    </div>
    <div class="row tools">
      <button class="small" id="rndAll" title="Randomise the whole tank" style="flex:1">🎲 Random</button>
      <button class="small grey" id="rndOpts" title="Random settings: where colours come from, and which item slots roll too">▾</button>
      <button class="small grey" id="party" title="Party mode: your logged-in tanks get new random colours every round">🎉</button>
      <button class="small grey" id="devToggle" hidden title="Dev options (your copy only): preview boxes and test unlocks. Off = works like the public copy">DEV</button>
    </div>
    <div id="rndBox" class="rndbox" hidden>
      <div class="row"><span class="minilbl">Colours from</span><select id="rndSrc" title="Where random colours come from"></select></div>
      <div class="row tools2" id="rndAcc" title="Which accessory slots 🎲 Random and party mode also roll (from the box in the menu above, or from all). None lit = colours only">
        <span class="minilbl">🎩 Items</span>
      </div>
    </div>
    <div class="row more">
      <button class="link" id="palToggle" title="Paints and accessories, box by box">Swatches ▸</button>
    </div>
    <div id="swatches" hidden>
      <div class="swfind"><input type="text" id="swFind" placeholder="Find a box, paint or item…" autocomplete="off"><select id="swGroup" title="Which boxes to show"><option value="all">All boxes</option><option value="cl">✦ Color Lab</option><option value="game">Game</option></select></div>
      <div class="swtabs" id="swTabs"></div>
      <div class="pal" id="pal"></div>
    <div id="accPart" hidden>
      <div class="sublbl">Accessories</div>
      <div class="accslots" id="accSlots"></div>
      <div class="row accrnd">
        <button class="small" id="accRndSlot" title="Random item for the selected slot">🎲 Slot</button>
        <button class="small" id="accRndAll" title="Random items for every slot">🎲 All</button>
        <span class="spacer"></span>
        <span class="seg" title="Where random accessories come from">
          <button class="small on" id="accFromBox" title="Only from the box you've picked">Box</button>
          <button class="small" id="accFromAny" title="From every accessory in the game">Any</button>
        </span>
      </div>
      <div class="accgrid" id="accGrid"></div>
      <div class="hint" id="trophyNote" hidden></div>
      <div class="row" id="trophyDev" hidden style="gap:4px;flex-wrap:wrap;margin-top:6px"></div>
    </div>
    </div>
    <div class="row savebar">
      <button class="big" id="save">Save</button>
      <button class="small grey" id="addPreset" title="Save these colours as an extra preset for this tank">+ Preset</button>
    </div>
    <div class="status" id="saveStatus"></div>
    <button class="reload" id="reload">Reload page to apply</button>
  </div>

  <div class="pane" id="paneMaze" hidden><div id="mazeBody"></div></div>
  <div class="pane" id="paneAch" hidden><div id="achBody"></div></div>
  <div class="pane" id="paneSet" hidden>
    <div class="sethead"><button class="small grey" id="setBack" title="Back">‹ Back</button><span>Settings</span></div>
    <div class="sublbl">Show in this panel</div>
    <div class="setlist" id="setPanel"></div>
    <div class="sublbl">Show in the garage</div>
    <div class="setlist" id="setGarage"></div>
    <div class="sublbl">Color Lab boxes</div>
    <small class="mzsub">Switch off boxes you don't use: they leave the garage and swatches and are never loaded</small>
    <div class="setlist" id="setBoxes"></div>
    <div class="sublbl">Racing box</div>
    <div class="row setbtns"><span style="font-size:13px;color:#ddd">Your race number</span><input type="text" id="raceNo" maxlength="3" placeholder="e.g. 44" style="width:70px"><button class="small" id="raceNoSet">Add</button></div>
    <div class="sublbl">Achievements</div>
    <div class="setlist" id="setAch"></div>
    <div class="sublbl">Backup</div>
    <div class="setlist" id="setBackup"></div>
    <div class="sublbl">Look sharing</div>
    <small class="mzsub">Color Lab users see each other's looks. Only your tank's player ID and its look are shared, nothing else</small>
    <div class="setlist" id="setShare"></div>
    <div class="sublbl" id="fbHdr">Feedback &amp; reports 📨</div>
    <div id="fbList" style="margin:4px 0 6px;max-height:300px;overflow-y:auto"></div>
    <div style="font:bold 14px Arial;color:#eee;text-align:center;margin:6px 0 2px">Send a message to Color Lab</div>
    <small class="mzsub" style="text-align:center;display:block">Found a bug, have an idea, or someone misusing Color Lab? List as many things as you like in one message. Lightshot or other image links work too</small>
    <div id="fbBox" style="margin:4px 0 6px"><textarea id="fbText" maxlength="1500" placeholder="Briefly describe what's going on, in at least 5 words (Ctrl+V pastes a screenshot)" style="width:100%;min-height:62px;box-sizing:border-box;background:#111;color:#eee;border:1px solid #444;border-radius:4px;padding:5px;font:12px Arial;resize:vertical"></textarea>
      <div class="row setbtns" style="gap:6px;align-items:center;flex-wrap:wrap"><button class="small grey" id="fbPic">📎 Add screenshots (up to 3)</button><input type="file" id="fbFile" accept="image/png,image/jpeg" multiple hidden><span id="fbPrev"></span><select id="fbAs" hidden style="background:#111;color:#eee;border:1px solid #444;border-radius:4px"></select><button class="small" id="fbSend">📨 Send message</button><small id="fbMsg" style="color:#aaa"></small></div>
      <small class="mzsub" id="fbAboutLbl" hidden></small>
      <small class="mzsub">Sent to the Color Lab team with your tank's name. A screenshot may show player names and chat. 15 messages a day. If you reach the limit, reply on the Color Lab forum thread</small></div>
    <div class="sublbl">Tanks in the game</div>
    <div class="row setbtns"><button class="small" id="refresh" title="Redraw your logged-in tanks now and check they're shared (Shift-click: every custom tank in the game)">🔄 Refresh my tanks</button></div>
    <div class="sublbl">Help</div>
    <div class="row setbtns"><button class="small" id="tutBtn3">▶ Tutorial</button><button class="small grey" id="newBtn3">✨ Update notes</button><button class="small grey" id="updBtn3" title="Check GitHub for a newer version of Color Lab">🔔 Check for updates</button></div>
    <div class="setlist" id="setUpd"></div>
    <div class="sublbl">Your data</div>
    <div class="row setbtns"><button class="small" id="exportBtn" title="Save all your saved tanks, looks, colours and settings to a backup file">⬇ Export backup</button><button class="small" id="importBtn" title="Load a backup file (adds its tanks and looks to what you have)">⬆ Import backup</button></div>
    <div class="row setbtns"><button class="small warning" id="wipe" title="Delete every saved tank and recent colour">Wipe all data</button></div>
    <div class="sublbl">About</div>
    <small class="mzsub" style="display:block;line-height:1.5">TankTrouble Color Lab v1.4, made and run by <b>wazzey</b>. A free, fan-made, cosmetic-only extension: not affiliated with TankTrouble. Updates, the official download and feedback: <a href="https://github.com/wazzey/tanktrouble-color-lab" target="_blank" rel="noopener noreferrer" style="color:#8fc1ff">GitHub</a> · <a href="https://github.com/wazzey/tanktrouble-color-lab/blob/main/PRIVACY.md" target="_blank" rel="noopener noreferrer" style="color:#8fc1ff">Privacy policy</a></small>
  </div>

  <div class="pane" id="paneSaved" hidden>
    <input type="text" id="filter" placeholder="Search saved tanks…" autocomplete="off" hidden>
    <div id="list"></div>
    <div class="foot"><span>Backups and Wipe are in ⚙ Settings</span></div>
  </div>
  <div class="modal" id="modal" hidden><div class="mbox" id="mbox"><div class="mtitle" id="mtitle"></div><div class="mtx" id="mtx"></div><div class="row mbtn"><button class="small grey" id="mNo">Cancel</button><button class="small" id="mYes">OK</button></div></div></div>
</div>`;
  panel = $("panel");
  nameEl = $("name");
  whoEl = $("who");

  // Keep the game from reacting to keys while typing in the panel
  ["keydown", "keyup", "keypress"].forEach((t) => panelHost.addEventListener(t, (e) => e.stopPropagation()));

  // part chips (turret / base / treads) + one shared hex box for the selected part
  PARTS.forEach(([key, label, field]) => {
    const r = document.createElement("div");
    r.className = "chip";
    r.dataset.part = key;
    r.title = `${label}: click to select`;
    r.innerHTML = `<div class="lbl">${label}</div><div class="sw2"><input type="color" value="#808080" title="Pick ${label.toLowerCase()} colour"><span class="pat" hidden></span><button class="small dice" title="Random ${label.toLowerCase()} colour">🎲</button></div><label class="mz" hidden title="Show this pattern on the ${label.toLowerCase()} in the maze too (off = its main colour)"><input type="checkbox" checked>Pattern in-maze</label>`;
    const pick = r.querySelector("input[type=color]");
    const txt = document.createElement("input");
    txt.type = "text";
    txt.placeholder = `${label} hex, e.g. #ff8800`;
    txt.spellcheck = false;
    txt.title = `${label} colour as a hex code. Leave empty to keep the tank's current colour.`;
    r.querySelector(".dice").addEventListener("click", () => {
      selectPart(key);
      const [c] = randomColours(1);
      setPart(key, c);
      schedulePreview();
    });
    r.addEventListener("mousedown", () => selectPart(key));
    pick.addEventListener("input", () => {
      txt.value = "0x" + pick.value.slice(1);
      txt.classList.remove("bad");
      paintChip(key);
      schedulePreview();
    });
    txt.addEventListener("input", () => {
      const n = normVal(txt.value);
      txt.classList.toggle("bad", !!txt.value.trim() && !n);
      paintChip(key);
      schedulePreview();
    });
    const mz = r.querySelector(".mz input");
    mz.addEventListener("click", (ev) => ev.stopPropagation());
    partRows[key] = { r, pick, txt, field, label, pat: r.querySelector(".pat"), mz };
    $("parts").appendChild(r);
    $("hexrow").insertBefore(txt, $("copyReal"));
  });
  selectPart("turret");
}
