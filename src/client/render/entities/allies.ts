// Turrets and raised minions.

import type { Minion, Turret } from '../../../sim/types';
import { Ctx, TAU, circle } from './shared';

export function drawTurret(ctx: Ctx, tu: Turret, t: number): void {
  const fade = tu.life < 1.5 && Math.floor(t * 8) % 2 === 0 ? 0.5 : 1;
  ctx.globalAlpha = fade;
  ctx.fillStyle = '#2b3a40';
  ctx.fillRect(tu.x - 11, tu.y - 11, 22, 22);
  ctx.strokeStyle = '#7dffcf';
  ctx.lineWidth = 2;
  ctx.strokeRect(tu.x - 11, tu.y - 11, 22, 22);
  ctx.strokeStyle = '#c8fff0';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(tu.x, tu.y);
  ctx.lineTo(tu.x + Math.cos(tu.ang) * 18, tu.y + Math.sin(tu.ang) * 18);
  ctx.stroke();
  ctx.fillStyle = '#7dffcf';
  circle(ctx, tu.x, tu.y, 5);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawMinion(ctx: Ctx, m: Minion, x: number, y: number, t: number): void {
  ctx.globalAlpha = Math.min(1, m.life) * 0.75;
  ctx.fillStyle = '#c084ff';
  ctx.beginPath();
  ctx.arc(x, y - 3, 10, Math.PI, TAU);
  for (let i = 0; i <= 3; i++) ctx.lineTo(x + 10 - (i * 20) / 3, y + 8 + Math.sin(t * 10 + i + m.id) * 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a0d40';
  circle(ctx, x - 3.5, y - 4, 2);
  ctx.fill();
  circle(ctx, x + 3.5, y - 4, 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
