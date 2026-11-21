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
  bufO = document.createElement("canvas"),
  bufFx = document.createElement("canvas");
// a part in a see-through paint (PAINT_FX): faint, with a fine outline of its own, and for glass a glint of light
export function drawPartFx(ctx, part, fx, width, height, ring = "rgba(240,244,255,0.95)") {
  const line = Math.max(1, Math.round(width / 260)),
    fg = bufFx.getContext("2d");
  bufFx.width = width;
  bufFx.height = height;
  for (const [x, y] of [
    [-line, 0],
    [line, 0],
    [0, -line],
    [0, line],
  ]) {
    fg.drawImage(part, x, y, width, height);
  }
  fg.globalCompositeOperation = "destination-out";
  fg.drawImage(part, 0, 0, width, height); // (just the ring round the part)
  fg.globalCompositeOperation = "source-in";
  fg.fillStyle = ring;
  fg.fillRect(0, 0, width, height);
  ctx.canvas.__ttclHasFx = true; // (its dark outline then goes round the solid parts only)
  const was = ctx.globalAlpha;
  ctx.globalAlpha = was * fx.fill;
  ctx.drawImage(part, 0, 0, width, height);
  ctx.globalAlpha = was;
  ctx.drawImage(bufFx, 0, 0);
  if (fx.glint) {
    fg.globalCompositeOperation = "copy";
    const band = fg.createLinearGradient(0, 0, width, height);
    band.addColorStop(0.3, "rgba(255,255,255,0)");
    band.addColorStop(0.36, `rgba(255,255,255,${fx.glint})`);
    band.addColorStop(0.42, "rgba(255,255,255,0)");
    band.addColorStop(0.47, "rgba(255,255,255,0)");
    band.addColorStop(0.49, `rgba(255,255,255,${fx.glint * 0.6})`);
    band.addColorStop(0.51, "rgba(255,255,255,0)");
    fg.fillStyle = band;
    fg.fillRect(0, 0, width, height);
    fg.globalCompositeOperation = "destination-in";
    fg.drawImage(part, 0, 0, width, height);
    ctx.drawImage(bufFx, 0, 0);
  }
}
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
    const fx = c && c.__ttclPaintFx;
    if (fx) {
      drawPartFx(comp, bufB, mask === P.turret ? fx : Object.assign({}, fx, { glint: 0 }), W, H); // (the glint on the dome only)
    } else {
      comp.drawImage(bufB, 0, 0);
    }
    if (shade) {
      comp.globalAlpha = fx ? fx.shade : 1;
      comp.drawImage(shade, 0, 0, W, H);
      comp.globalAlpha = 1;
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
