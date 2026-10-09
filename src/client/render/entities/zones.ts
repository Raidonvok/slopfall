// Player area effects: slashes, novas, meteors, arrow rain, lightning, ability rings.

import type { Zone } from '../../../sim/types';
import { Ctx, TAU, circle } from './shared';

export function drawZone(ctx: Ctx, z: Zone, t: number): void {
  const k = z.maxLife > 0 ? Math.max(0, z.life / z.maxLife) : 0;
  switch (z.kind) {
    case 'slash':
    case 'slash3': {
      const a0 = z.ang - z.arc / 2, a1 = z.ang + z.arc / 2;
      const sweep = a0 + (a1 - a0) * Math.min(1, (1 - k) * 2.2);
      ctx.strokeStyle = z.kind === 'slash3' ? `rgba(255,70,110,${0.9 * k})` : `rgba(232,241,255,${0.85 * k})`;
      ctx.lineWidth = z.r * 0.28;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r * 0.78, a0, sweep);
      ctx.stroke();
      break;
    }
    case 'slash2': {
      ctx.strokeStyle = `rgba(255,224,138,${0.9 * k})`;
      ctx.lineWidth = z.r * 0.3;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r * 0.8, z.ang + t * 20, z.ang + t * 20 + TAU * (1 - k * 0.5));
      ctx.stroke();
      break;
    }
    case 'nova':
    case 'nova2':
    case 'nova3': {
      if (z.delay > 0) return;
      const prog = 1 - k;
      const cur = z.r0 + (z.r - z.r0) * prog;
      ctx.strokeStyle = z.kind === 'nova3' ? `rgba(255,240,190,${k})` : z.kind === 'nova2' ? `rgba(255,60,30,${k})` : `rgba(255,130,60,${k})`;
      ctx.lineWidth = (z.kind === 'nova3' ? 22 : 10) + 12 * k;
      circle(ctx, z.x, z.y, cur);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,120,40,${0.12 * k})`;
      ctx.fill();
      break;
    }
    case 'meteor': {
      if (z.delay > 0) {
        const p = 1 - z.delay / 0.7;
        ctx.fillStyle = 'rgba(255,80,30,0.15)';
        circle(ctx, z.x, z.y, z.r);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,120,40,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,120,40,0.25)';
        circle(ctx, z.x, z.y, z.r * p);
        ctx.fill();
        const my = z.y - (1 - p) * 700, mx = z.x + (1 - p) * 250;
        ctx.strokeStyle = 'rgba(255,190,90,0.6)';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + 60, my - 160);
        ctx.stroke();
        ctx.fillStyle = '#ffdb8a';
        circle(ctx, mx, my, 16);
        ctx.fill();
      }
      break;
    }
    case 'rain': {
      if (z.delay > 0) {
        ctx.strokeStyle = 'rgba(182,255,122,0.5)';
        ctx.lineWidth = 2;
        circle(ctx, z.x, z.y, z.r * 0.5);
        ctx.stroke();
        const h = z.delay * 900;
        ctx.strokeStyle = '#d8ffb0';
        ctx.beginPath();
        for (let i = -1; i <= 1; i++) {
          ctx.moveTo(z.x + i * 12, z.y - h);
          ctx.lineTo(z.x + i * 12, z.y - h - 30);
        }
        ctx.stroke();
      }
      break;
    }
    case 'bolt': {
      if (z.pts.length < 4) return;
      for (const [w, c] of [[7, `rgba(255,243,107,${0.35 * k})`], [2.5, `rgba(255,255,255,${k})`]] as const) {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(z.pts[0], z.pts[1]);
        for (let i = 2; i < z.pts.length; i += 2) {
          const x0 = z.pts[i - 2], y0 = z.pts[i - 1], x1 = z.pts[i], y1 = z.pts[i + 1];
          for (let j = 1; j <= 4; j++) {
            const f = j / 4;
            const jit = j === 4 ? 0 : (Math.random() - 0.5) * 18;
            ctx.lineTo(x0 + (x1 - x0) * f + jit, y0 + (y1 - y0) * f + jit);
          }
        }
        ctx.stroke();
      }
      break;
    }
    case 'bash':
    case 'raise': {
      const col = z.kind === 'bash' ? '91,140,255' : '192,132,255';
      ctx.strokeStyle = `rgba(${col},${k})`;
      ctx.lineWidth = 8 * k + 2;
      circle(ctx, z.x, z.y, z.r * (1 - k * 0.7));
      ctx.stroke();
      break;
    }
  }
}
