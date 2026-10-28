// ---- sakura petals and flowers (the Sakura box, and the Shadow box's aura and eyewear) ----
// A cherry-blossom petal: a soft teardrop with the little notch at its tip. (x, y) = centre, s = size, rot = angle.
export function sakuraPetal(g, x, y, s, rot, col, edge) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s / 10, s / 10);
  g.beginPath();
  g.moveTo(0, 10);
  g.bezierCurveTo(-9, 4, -8, -7, -2.2, -10);
  g.lineTo(0, -7.2);
  g.lineTo(2.2, -10);
  g.bezierCurveTo(8, -7, 9, 4, 0, 10);
  g.closePath();
  g.fillStyle = col;
  g.fill();
  if (edge) {
    g.strokeStyle = edge;
    g.lineWidth = 0.9;
    g.stroke();
  }
  g.globalAlpha *= 0.55;
  g.strokeStyle = "rgba(255,255,255,.8)";
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(0, 8);
  g.lineTo(0, -4);
  g.stroke();
  g.restore();
}
export function sakuraFlower(g, x, y, s, rot, col, centre = "#e8618c") {
  // five petals round a darker centre with stamens
  for (let k = 0; k < 5; k++) {
    const a = rot + (k * Math.PI * 2) / 5;
    sakuraPetal(
      g,
      x + Math.cos(a - Math.PI / 2) * s * 0.55,
      y + Math.sin(a - Math.PI / 2) * s * 0.55,
      s * 0.62,
      a,
      col,
      "rgba(200,60,110,.35)",
    );
  }
  g.save();
  g.fillStyle = centre;
  g.beginPath();
  g.arc(x, y, s * 0.18, 0, 7);
  g.fill();
  g.strokeStyle = "#c2185b";
  g.lineWidth = Math.max(0.6, s * 0.04);
  for (let k = 0; k < 7; k++) {
    const a = (k * Math.PI * 2) / 7 + rot;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * s * 0.36, y + Math.sin(a) * s * 0.36);
    g.stroke();
    g.fillStyle = "#ffe28a";
    g.beginPath();
    g.arc(x + Math.cos(a) * s * 0.38, y + Math.sin(a) * s * 0.38, Math.max(0.6, s * 0.05), 0, 7);
    g.fill();
  }
  g.restore();
}
