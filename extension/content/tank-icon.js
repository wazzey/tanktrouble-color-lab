// ---------- real tank icon renderer (port of the game's own drawTankIcon) ----------
export const ICON_W = 400,
  ICON_H = 240; // the game's "medium" icon size
export const PART_NAMES = [
  "turret",
  "barrel",
  "leftTread",
  "rightTread",
  "base",
  "turretShade",
  "barrelShade",
  "leftTreadShade",
  "rightTreadShade",
  "baseShade",
];
export const bufA = document.createElement("canvas"),
  bufB = document.createElement("canvas"),
  bufO = document.createElement("canvas");
export function drawTankIcon(cv, turretC, treadC, baseC, P, acc) {
  const W = cv.width,
    H = cv.height;
  [bufA, bufB, bufO].forEach((b) => {
    b.width = W;
    b.height = H;
  });
  const out = cv.getContext("2d"),
    comp = bufA.getContext("2d"),
    tint = bufB.getContext("2d");
  out.clearRect(0, 0, W, H);
  const paint = (c) => {
    tint.globalCompositeOperation = "copy";
    if (c instanceof HTMLImageElement || c instanceof HTMLCanvasElement) {
      tint.drawImage(c, 0, 0, W, H);
    } else {
      tint.fillStyle = c;
      tint.fillRect(0, 0, W, H);
    }
    tint.globalCompositeOperation = "destination-atop";
  };
  const layer = (c, mask, shade) => {
    if (!mask) {
      return;
    }
    paint(c);
    tint.drawImage(mask, 0, 0, W, H);
    comp.drawImage(bufB, 0, 0);
    if (shade) {
      comp.drawImage(shade, 0, 0, W, H);
    }
  };
  if (acc.back) {
    comp.drawImage(acc.back, 0, 0, W, H);
  }
  layer(treadC, P.leftTread, P.leftTreadShade);
  layer(turretC, P.turret, P.turretShade);
  layer(baseC, P.base, P.baseShade);
  layer(treadC, P.rightTread, P.rightTreadShade);
  layer(turretC, P.barrel, P.barrelShade);
  if (acc.turret) {
    comp.drawImage(acc.turret, 0, 0, W, H);
  }
  if (acc.front) {
    comp.drawImage(acc.front, 0, 0, W, H);
  }
  if (acc.barrel) {
    comp.drawImage(acc.barrel, 0, 0, W, H);
  }
  const o = bufO.getContext("2d");
  o.globalCompositeOperation = "copy";
  o.fillStyle = "rgba(0,0,0,0.8)";
  o.fillRect(0, 0, W, H);
  o.globalCompositeOperation = "destination-atop";
  o.drawImage(bufA, 0, 0);
  const se = 1.5,
    pe = Math.sqrt((se * se) / 2);
  [
    [-se, 0],
    [-pe, -pe],
    [-pe, pe],
    [0, se],
    [0, -se],
    [pe, -pe],
    [pe, pe],
    [se, 0],
  ].forEach(([x, y]) => out.drawImage(bufO, x, y));
  out.drawImage(bufA, 0, 0);
}
