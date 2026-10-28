// ---------- Heaven halo (any colour) ----------
export const HV_HALO_COLOURS = {
  "hv-halo": "#f2c142",
  "hv-halo-silver": "#d9dee8",
  "hv-halo-rose": "#ff8fb8",
  "hv-halo-sky": "#7fd3ff",
  "hv-halo-violet": "#b48cff",
};
function hvTools() {
  const H = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const mix = (a, b, t) => a + (b - a) * t;
  const hexc = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const shade = (hex, t) => {
    const c = hexc(hex),
      to = t < 0 ? 0 : 255,
      k = Math.abs(t);
    return `rgb(${c.map((v) => Math.round(mix(v, to, k))).join(",")})`;
  };
  const cv = (w = 640, h = 384) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
  const noise2 = (x, y, s) => {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      xf = x - xi,
      yf = y - yi,
      sm = (t) => t * t * (3 - 2 * t);
    return mix(
      mix(H(xi, yi, s), H(xi + 1, yi, s), sm(xf)),
      mix(H(xi, yi + 1, s), H(xi + 1, yi + 1, s), sm(xf)),
      sm(yf),
    );
  };
  const fbm = (x, y, s) =>
    0.5 * noise2(x, y, s) +
    0.25 * noise2(x * 2, y * 2, s + 1) +
    0.125 * noise2(x * 4, y * 4, s + 2) +
    0.125 * noise2(x * 8, y * 8, s + 3);
  const sparkle = (g, x, y, r, col, a = 1) => {
    g.save();
    g.globalAlpha = a;
    g.fillStyle = col;
    g.shadowColor = col;
    g.shadowBlur = r * 1.5;
    g.beginPath();
    g.moveTo(x, y - r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.quadraticCurveTo(x, y, x, y + r);
    g.quadraticCurveTo(x, y, x - r, y);
    g.quadraticCurveTo(x, y, x, y - r);
    g.fill();
    g.restore();
  };
  return { H, mix, hexc, shade, cv, fbm, sparkle };
}
export function drawHalo(hex) {
  const { cv, shade, sparkle } = hvTools();
  const c = cv(),
    g = c.getContext("2d");
  const cx = 282,
    cy = 96,
    rx = 76,
    ry = 21;
  // its shadow on the top of the turret's dome
  g.save();
  g.filter = "blur(5px)";
  g.fillStyle = "rgba(0,0,0,.34)";
  g.beginPath();
  g.ellipse(cx + 4, 161, 52, 10, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // soft glow
  g.save();
  g.shadowColor = shade(hex, 0.3);
  g.shadowBlur = 26;
  g.strokeStyle = shade(hex, 0.2);
  g.lineWidth = 12;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  const ring = (from, to, dy, w, col) => {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.lineCap = "round";
    g.beginPath();
    g.ellipse(cx, cy + dy, rx, ry, 0, from, to);
    g.stroke();
  };
  // back half (further away: darker), then front half
  ring(Math.PI, Math.PI * 2, 0, 14, shade(hex, -0.55));
  ring(Math.PI, Math.PI * 2, -2, 9, shade(hex, -0.15));
  ring(Math.PI * 1.15, Math.PI * 1.85, -4, 3, shade(hex, 0.35));
  ring(0, Math.PI, 2, 15, shade(hex, -0.45));
  ring(0, Math.PI, 0, 11, hex);
  ring(0.15, Math.PI - 0.15, -2.5, 5, shade(hex, 0.45));
  ring(0.6, 1.6, -3.5, 2.5, "rgba(255,255,255,.95)");
  sparkle(g, cx + 46, cy + 16, 11, "#ffffff");
  sparkle(g, cx - 62, cy - 12, 6, "#ffffff", 0.8);
  return c;
}
