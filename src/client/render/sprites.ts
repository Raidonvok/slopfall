// Pre-rendered radial glow sprites, so we don't need shadowBlur per entity.

const cache = new Map<string, HTMLCanvasElement>();

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function glowSprite(color: string): HTMLCanvasElement {
  let c = cache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, rgba(color, 0.85));
  grad.addColorStop(0.3, rgba(color, 0.35));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  cache.set(color, c);
  return c;
}

/** Draws an additive glow. Caller is expected to have set globalCompositeOperation = 'lighter'. */
export function glow(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, r: number, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
}
