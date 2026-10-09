// Raised minions (Necromancer ability).

import { damageEnemy } from '../../combat';
import { nearestEnemy } from '../../spatial';
import type { GameState } from '../../types';
import { findPlayer } from './shared';

export function updateMinions(s: GameState, dt: number): void {
  for (const m of s.minions) {
    if (m.dead) continue;
    m.life -= dt;
    m.cd -= dt;
    if (m.life <= 0) {
      m.dead = true;
      continue;
    }
    const owner = findPlayer(s, m.owner);
    if (!owner) {
      m.dead = true;
      continue;
    }
    const t = nearestEnemy(s, m.x, m.y, 600);
    let tx = owner.x, ty = owner.y;
    if (t) {
      tx = t.x;
      ty = t.y;
    }
    const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
    if (t || d > 60) {
      m.x += (dx / d) * 190 * dt;
      m.y += (dy / d) * 190 * dt;
    }
    if (t && m.cd <= 0 && d < t.radius + 14) {
      m.cd = 0.5;
      damageEnemy(s, t, m.dmg, owner, 'raise', dx / d, dy / d, 120);
    }
  }
}
