// Hero figures: small "chibi" characters with feet, body, head, gear and a
// held weapon that follows the aim. Drawn facing right and mirrored when
// aiming left. Each hero has its own file in this folder.

import { CHARACTERS } from '../../../sim/content/characters';
import type { Player } from '../../../sim/types';
import { rgba } from '../sprites';
import { berserker } from './berserker';
import { engineer } from './engineer';
import { knight } from './knight';
import { mage } from './mage';
import { necro } from './necro';
import { ranger } from './ranger';
import { Ctx, Pen, TAU, ellipse } from './shared';

/**
 * Shared by the in-game player and the character select portraits.
 * `walk` is the walk-cycle phase (0 when idle).
 */
export function drawCharacterBody(
  ctx: Ctx, charId: string, x: number, y: number, r: number,
  ex: number, ey: number, t: number, walk = 0, flash = false,
): void {
  const c = CHARACTERS[charId];
  const p: Pen = { ctx, r, flash };
  const bob = walk ? -Math.abs(Math.sin(walk)) * r * 0.08 : Math.sin(t * 3) * r * 0.03;
  ctx.save();
  ctx.translate(x, y + bob);
  if (ex < 0) ctx.scale(-1, 1);
  const a = Math.max(-1.15, Math.min(1.15, Math.atan2(ey, Math.abs(ex))));
  const ly = Math.max(-1, Math.min(1, ey));
  switch (charId) {
    case 'knight': knight(p, walk, a, ly, c); break;
    case 'mage': mage(p, walk, a, ly, c, t); break;
    case 'ranger': ranger(p, walk, a, ly); break;
    case 'necro': necro(p, walk, a, ly, c, t); break;
    case 'engineer': engineer(p, walk, a, ly, t); break;
    case 'berserker': berserker(p, walk, a, ly); break;
  }
  ctx.restore();
}

export function drawPlayer(ctx: Ctx, pl: Player, x: number, y: number, t: number): void {
  const c = CHARACTERS[pl.charId];
  const r = pl.radius * 1.2; // drawn a bit larger than the hitbox for readability
  const aim = Math.atan2(pl.ay, pl.ax);
  const ex = Math.cos(aim), ey = Math.sin(aim);
  ctx.save();
  if (pl.invuln > 0 && pl.hurtT <= 0 && pl.dashT <= 0 && Math.floor(t * 20) % 2 === 0 && pl.abilityT <= 0) ctx.globalAlpha = 0.55;
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ellipse(ctx, x, y + r * 1.02, r * 0.95, r * 0.32);
  ctx.fill();

  const moving = Math.hypot(pl.x - pl.px, pl.y - pl.py) > 0.3;
  const walk = moving ? t * 14 : 0;
  drawCharacterBody(ctx, pl.charId, x, y, r, ex, ey, t, walk, pl.hurtT > 0.12);

  if (pl.slowT > 0) {
    // stuck in a web
    ctx.strokeStyle = 'rgba(235,235,245,0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + 0.3;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5);
    }
    ctx.stroke();
    ellipse(ctx, x, y, r * 0.9, r * 0.9);
    ctx.stroke();
  }
  if (pl.abilityT > 0) {
    if (pl.charId === 'knight') {
      ctx.strokeStyle = rgba(c.accent, 0.8);
      ctx.lineWidth = 3;
      ellipse(ctx, x, y - r * 0.2, r * 1.6 + Math.sin(t * 12) * 2, r * 1.6 + Math.sin(t * 12) * 2);
      ctx.stroke();
      ctx.fillStyle = rgba(c.accent, 0.1);
      ctx.fill();
    } else if (pl.charId === 'berserker') {
      ctx.strokeStyle = 'rgba(255,40,40,0.7)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = t * 4 + (i * TAU) / 6;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6));
        ctx.lineTo(x + Math.cos(a) * (r + 14), y + Math.sin(a) * (r + 14) - 6);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}
