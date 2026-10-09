// Drawing primitives for the hero figures: shaded, outlined shapes, feet,
// eyes, head, hands and a helper to draw held weapons.

export type Ctx = CanvasRenderingContext2D;

export const TAU = Math.PI * 2;

export const OUTLINE = '#0a0c14';

export const SKIN = '#f0c39d';

export interface Pen {
  ctx: Ctx;
  r: number;
  flash: boolean;
}

/** Fills the current path with a colour + shading overlay, then outlines it. */
export function paint(p: Pen, color: string, y0: number, y1: number, outline = true): void {
  const { ctx } = p;
  ctx.fillStyle = p.flash ? '#ffffff' : color;
  ctx.fill();
  if (!p.flash) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(255,255,255,0.2)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = g;
    ctx.fill();
  }
  if (outline) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = p.r * 0.11;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

export function roundBody(ctx: Ctx, r: number, top: number, bottom: number, wTop: number, wBottom: number): void {
  ctx.beginPath();
  ctx.moveTo(-wTop / 2, top + r * 0.12);
  ctx.quadraticCurveTo(-wTop / 2, top, -wTop / 2 + r * 0.15, top);
  ctx.lineTo(wTop / 2 - r * 0.15, top);
  ctx.quadraticCurveTo(wTop / 2, top, wTop / 2, top + r * 0.12);
  ctx.lineTo(wBottom / 2, bottom - r * 0.1);
  ctx.quadraticCurveTo(wBottom / 2, bottom, wBottom / 2 - r * 0.15, bottom);
  ctx.lineTo(-wBottom / 2 + r * 0.15, bottom);
  ctx.quadraticCurveTo(-wBottom / 2, bottom, -wBottom / 2, bottom - r * 0.1);
  ctx.closePath();
}

export function feet(p: Pen, walk: number, color: string): void {
  const { ctx, r } = p;
  const s = Math.sin(walk);
  for (const [side, ph] of [[-1, s], [1, -s]] as const) {
    ellipse(ctx, side * r * 0.3 + ph * r * 0.18, r * 0.95 - Math.max(0, ph) * r * 0.1, r * 0.26, r * 0.17);
    paint(p, color, r * 0.8, r * 1.1);
  }
}

export function eyes(p: Pen, hx: number, hy: number, ly: number, color = '#141824'): void {
  const { ctx, r } = p;
  // Looking down moves the eyes down; looking up barely moves them so they
  // never slide under a hat brim. The glint shows the look direction instead.
  const ey = hy + (ly > 0 ? ly * 0.1 : ly * 0.03) * r;
  ctx.fillStyle = p.flash ? '#ffffff' : color;
  for (const dx of [0.02, 0.32]) {
    ellipse(ctx, hx + dx * r, ey, r * 0.07, r * 0.11);
    ctx.fill();
  }
  if (!p.flash) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const dx of [0.04, 0.34]) {
      ellipse(ctx, hx + dx * r, ey - r * 0.04 + Math.min(0, ly) * r * 0.035, r * 0.025, r * 0.035);
      ctx.fill();
    }
  }
}

export function head(p: Pen, color = SKIN): [number, number] {
  const { ctx, r } = p;
  const hx = r * 0.04, hy = -r * 0.5;
  ellipse(ctx, hx, hy, r * 0.6, r * 0.57);
  paint(p, color, hy - r * 0.6, hy + r * 0.6);
  // cheek blush
  if (!p.flash && color === SKIN) {
    ctx.fillStyle = 'rgba(230,110,110,0.3)';
    ellipse(ctx, hx + r * 0.35, hy + r * 0.18, r * 0.1, r * 0.06);
    ctx.fill();
  }
  return [hx, hy];
}

export function hand(p: Pen, x: number, y: number, color = SKIN): void {
  ellipse(p.ctx, x, y, p.r * 0.15, p.r * 0.15);
  paint(p, color, y - p.r * 0.15, y + p.r * 0.15);
}

/** Runs `fn` in a frame rotated around the weapon grip. */
export function held(p: Pen, gx: number, gy: number, a: number, fn: () => void): void {
  const { ctx } = p;
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(a);
  fn();
  ctx.restore();
}
