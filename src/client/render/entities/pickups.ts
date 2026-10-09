// XP gems, heals, magnets, bombs and chests.

import type { Pickup } from '../../../sim/types';
import { Ctx, circle } from './shared';

// ---------------------------------------------------------------- pickups
export function gemColor(v: number): string {
  if (v >= 50) return '#ff5df2';
  if (v >= 10) return '#ff6b5d';
  if (v >= 3) return '#5dff8f';
  return '#5dc8ff';
}

export function pickupColor(p: Pickup): string {
  switch (p.kind) {
    case 'xp': return gemColor(p.value);
    case 'heal': return '#ff4d6d';
    case 'magnet': return '#5d9bff';
    case 'bomb': return '#ffb347';
    case 'chest': return '#ffd166';
  }
}

export function drawPickup(ctx: Ctx, p: Pickup, x: number, y: number, t: number): void {
  const bob = Math.sin(t * 4 + p.id) * 2;
  const yy = y + bob;
  switch (p.kind) {
    case 'xp': {
      const s = p.value >= 50 ? 9 : p.value >= 10 ? 7 : p.value >= 3 ? 5.5 : 4.5;
      ctx.fillStyle = gemColor(p.value);
      ctx.beginPath();
      ctx.moveTo(x, yy - s * 1.3);
      ctx.lineTo(x + s, yy);
      ctx.lineTo(x, yy + s * 1.3);
      ctx.lineTo(x - s, yy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(x, yy - s * 1.3);
      ctx.lineTo(x + s * 0.4, yy - s * 0.2);
      ctx.lineTo(x - s * 0.3, yy);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'heal': {
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(x - 3.5, yy - 10, 7, 20);
      ctx.fillRect(x - 10, yy - 3.5, 20, 7);
      break;
    }
    case 'magnet': {
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, yy, 8, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = '#e0e6f0';
      ctx.beginPath();
      ctx.moveTo(x - 8, yy);
      ctx.lineTo(x - 8, yy - 7);
      ctx.moveTo(x + 8, yy);
      ctx.lineTo(x + 8, yy - 7);
      ctx.stroke();
      break;
    }
    case 'bomb': {
      ctx.fillStyle = '#222632';
      circle(ctx, x, yy, 10);
      ctx.fill();
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      circle(ctx, x + 6, yy - 11, 2 + Math.random() * 2);
      ctx.fill();
      break;
    }
    case 'chest': {
      const s = p.big ? 1.4 : 1;
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(x - 14 * s, yy - 8 * s, 28 * s, 18 * s);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(x - 14 * s, yy - 12 * s, 28 * s, 7 * s);
      ctx.fillRect(x - 3 * s, yy - 6 * s, 6 * s, 8 * s);
      ctx.strokeStyle = '#ffeaa0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 14 * s, yy - 12 * s, 28 * s, 22 * s);
      break;
    }
  }
}
