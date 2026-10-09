// Small drawing helpers shared by the entity renderers.

export type Ctx = CanvasRenderingContext2D;

export const TAU = Math.PI * 2;

export function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

export function eyes(ctx: Ctx, x: number, y: number, r: number, dx: number, dy: number, color: string, size: number): void {
  ctx.fillStyle = color;
  circle(ctx, x - r * 0.3 + dx * 1.5, y + dy * 1.5, size);
  ctx.fill();
  circle(ctx, x + r * 0.3 + dx * 1.5, y + dy * 1.5, size);
  ctx.fill();
}
