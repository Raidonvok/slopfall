// Regular enemies (one case per enemy type) and burning flames.

import { ENEMIES } from '../../../sim/content/enemies';
import { EGG_HATCH } from '../../../sim/systems/enemies';
import type { Enemy } from '../../../sim/types';
import { drawBoss } from './bosses';
import { Ctx, TAU, circle, eyes } from './shared';

// ---------------------------------------------------------------- enemies
export function enemyColor(e: Enemy): string {
  return ENEMIES[e.type]?.color ?? '#ffffff';
}

export function drawEnemy(ctx: Ctx, e: Enemy, x: number, y: number, t: number, dx: number, dy: number): void {
  drawEnemyBody(ctx, e, x, y, t, dx, dy);
  if (e.burnT > 0) drawFlames(ctx, x, y, e.radius, t);
}

/** Little flickering flames on a burning enemy. */
export function drawFlames(ctx: Ctx, x: number, y: number, r: number, t: number): void {
  const n = r > 30 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const fx = x + (i - (n - 1) / 2) * r * 0.45;
    const h = r * (0.55 + 0.25 * Math.sin(t * 17 + i * 2.1));
    const fy = y - r * 0.55;
    ctx.fillStyle = 'rgba(255,110,30,0.85)';
    ctx.beginPath();
    ctx.moveTo(fx - r * 0.18, fy);
    ctx.quadraticCurveTo(fx - r * 0.2, fy - h * 0.6, fx, fy - h);
    ctx.quadraticCurveTo(fx + r * 0.2, fy - h * 0.6, fx + r * 0.18, fy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,120,0.9)';
    ctx.beginPath();
    ctx.ellipse(fx, fy - h * 0.3, r * 0.07, h * 0.25, 0, 0, TAU);
    ctx.fill();
  }
}

export function drawEnemyBody(ctx: Ctx, e: Enemy, x: number, y: number, t: number, dx: number, dy: number): void {
  const r = e.radius;
  const col = e.flash > 0.06 ? '#ffffff' : enemyColor(e);
  if (e.boss) return drawBoss(ctx, e, x, y, t, dx, dy, col);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.85, r * 0.85, r * 0.3, 0, 0, TAU);
  ctx.fill();

  if (e.elite) {
    ctx.strokeStyle = `rgba(255,209,102,${0.6 + Math.sin(t * 6) * 0.3})`;
    ctx.lineWidth = 3;
    circle(ctx, x, y, r + 5);
    ctx.stroke();
  }
  ctx.fillStyle = col;
  switch (e.type) {
    case 'bat': {
      const flap = Math.sin(t * 22 + e.id) * 0.6;
      ctx.beginPath();
      for (const s of [-1, 1]) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + s * r * 2, y - r * (0.6 + flap));
        ctx.lineTo(x + s * r * 1.3, y + r * 0.4);
        ctx.closePath();
      }
      ctx.fill();
      circle(ctx, x, y, r * 0.7);
      ctx.fill();
      eyes(ctx, x, y - 1, r * 0.6, dx, dy, '#ff2b4a', 1.6);
      break;
    }
    case 'zombie': {
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = '#3f7a2c';
      ctx.fillRect(x - r, y + r * 0.3, r * 2, r * 0.7);
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + dx * r * 0.5 - dy * r * 0.6, y + dy * r * 0.5 + dx * r * 0.6);
      ctx.lineTo(x + dx * r * 1.6 - dy * r * 0.6, y + dy * r * 1.6 + dx * r * 0.6);
      ctx.moveTo(x + dx * r * 0.5 + dy * r * 0.6, y + dy * r * 0.5 - dx * r * 0.6);
      ctx.lineTo(x + dx * r * 1.6 + dy * r * 0.6, y + dy * r * 1.6 - dx * r * 0.6);
      ctx.stroke();
      eyes(ctx, x, y - r * 0.3, r, dx, dy, '#ff3030', 2.2);
      break;
    }
    case 'swarm': {
      const a = t * 6 + e.id;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const aa = a + (i * TAU) / 4;
        const rr = i % 2 === 0 ? r * 1.3 : r * 0.8;
        ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'archer':
    case 'skeleton': {
      circle(ctx, x, y, r);
      ctx.fill();
      ctx.fillStyle = '#1b1b22';
      circle(ctx, x - r * 0.35 + dx * 2, y - r * 0.15, r * 0.25);
      ctx.fill();
      circle(ctx, x + r * 0.35 + dx * 2, y - r * 0.15, r * 0.25);
      ctx.fill();
      ctx.fillRect(x - r * 0.4, y + r * 0.4, r * 0.8, r * 0.15);
      if (e.type === 'archer') {
        ctx.strokeStyle = '#a0784a';
        ctx.lineWidth = 2;
        const a = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.arc(x + dx * r, y + dy * r, r * 0.9, a - 1.2, a + 1.2);
        ctx.stroke();
      }
      break;
    }
    case 'slime':
    case 'slimelet': {
      const sq = Math.sin(t * 8 + e.id) * 0.12;
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.1, r * (1.1 + sq), r * (0.9 - sq), 0, Math.PI, TAU);
      ctx.lineTo(x + r * (1.1 + sq), y + r * 0.6);
      ctx.lineTo(x - r * (1.1 + sq), y + r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      circle(ctx, x - r * 0.4, y - r * 0.3, r * 0.2);
      ctx.fill();
      eyes(ctx, x, y, r, dx, dy, '#0b2a4a', r * 0.14);
      break;
    }
    case 'charger': {
      const a = e.state === 2 ? Math.atan2(e.ty, e.tx) : Math.atan2(dy, dx);
      const shake = e.state === 1 ? (Math.random() - 0.5) * 4 : 0;
      if (e.state === 1) ctx.fillStyle = Math.floor(t * 20) % 2 ? '#ffffff' : col;
      ctx.beginPath();
      ctx.moveTo(x + shake + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5);
      ctx.lineTo(x + shake + Math.cos(a + 2.4) * r, y + Math.sin(a + 2.4) * r);
      ctx.lineTo(x + shake - Math.cos(a) * r * 0.4, y - Math.sin(a) * r * 0.4);
      ctx.lineTo(x + shake + Math.cos(a - 2.4) * r, y + Math.sin(a - 2.4) * r);
      ctx.closePath();
      ctx.fill();
      if (e.state === 1) {
        ctx.strokeStyle = 'rgba(255,80,40,0.35)';
        ctx.lineWidth = r * 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + e.tx * 260, y + e.ty * 260);
        ctx.stroke();
      }
      break;
    }
    case 'exploder': {
      const fuse = e.state === 1;
      const pulse = 1 + Math.sin(t * (fuse ? 40 : 8)) * (fuse ? 0.15 : 0.06);
      ctx.fillStyle = fuse && Math.floor(t * 16) % 2 ? '#ffffff' : col;
      circle(ctx, x, y, r * pulse * (fuse ? 1.2 : 1));
      ctx.fill();
      ctx.strokeStyle = '#3a1010';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x + 4, y - r - 6, x + 2, y - r - 10);
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      circle(ctx, x + 2, y - r - 10, 2 + Math.random() * 2);
      ctx.fill();
      break;
    }
    case 'ghost': {
      ctx.globalAlpha = e.intangible ? 0.22 : 0.85;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.2, r, Math.PI, TAU);
      for (let i = 0; i <= 4; i++) {
        const xx = x + r - (i * 2 * r) / 4;
        ctx.lineTo(xx, y + r * 0.8 + Math.sin(t * 8 + i + e.id) * 3);
      }
      ctx.closePath();
      ctx.fill();
      eyes(ctx, x, y - r * 0.3, r, dx, dy, '#223', r * 0.16);
      ctx.globalAlpha = 1;
      break;
    }
    case 'egg': {
      const k = Math.min(1, e.t2 / EGG_HATCH);
      const pulse = 1 + Math.sin(t * (6 + k * 20)) * 0.06 * (0.3 + k);
      ctx.fillStyle = e.flash > 0.06 ? '#ffffff' : col;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.85 * pulse, r * 1.05 * pulse, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(160,40,80,${0.35 + k * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.4, y - r * 0.6);
      ctx.quadraticCurveTo(x, y - r * 0.1, x - r * 0.2, y + r * 0.7);
      ctx.moveTo(x + r * 0.45, y - r * 0.4);
      ctx.quadraticCurveTo(x + r * 0.1, y + r * 0.2, x + r * 0.35, y + r * 0.8);
      ctx.stroke();
      if (k > 0.6) {
        ctx.strokeStyle = '#2a1018';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.3, y - r * 0.2);
        ctx.lineTo(x, y);
        ctx.lineTo(x - r * 0.1, y + r * 0.3);
        ctx.stroke();
      }
      break;
    }
    case 'shaman': {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 + Math.PI / 6;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0c3b33';
      ctx.fillRect(x - r * 0.5, y - r * 0.25, r, r * 0.3);
      ctx.strokeStyle = '#7a5a3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + r * 1.1, y + r);
      ctx.lineTo(x + r * 1.1, y - r * 1.4);
      ctx.stroke();
      ctx.fillStyle = '#7dfff0';
      circle(ctx, x + r * 1.1, y - r * 1.5, 3 + Math.sin(t * 6) * 1);
      ctx.fill();
      break;
    }
    default:
      circle(ctx, x, y, r);
      ctx.fill();
  }
}
