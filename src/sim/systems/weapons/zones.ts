// Area effects: slashes, novas, meteors, arrow rain, mortar blasts.

import { damageEnemy, ignite } from '../../combat';
import { forEnemiesInCircle } from '../../spatial';
import type { GameState } from '../../types';
import { findPlayer } from './shared';

export const METEOR_BURN_TIME = 4;

export function updateZones(s: GameState, dt: number): void {
  for (const z of s.zones) {
    if (z.dead) continue;
    if (z.delay > 0) {
      z.delay -= dt;
      continue;
    }
    z.life -= dt;
    if (z.life <= 0) z.dead = true;
    const owner = findPlayer(s, z.owner);
    if (!owner || z.dmg <= 0) continue;
    if (z.kind === 'nova' || z.kind === 'nova2' || z.kind === 'nova3') {
      const prog = 1 - Math.max(0, z.life) / z.maxLife;
      const cur = z.r0 + (z.r - z.r0) * prog;
      forEnemiesInCircle(z.x, z.y, cur, (e) => {
        if (z.hits[e.id]) return;
        z.hits[e.id] = 1;
        const dx = e.x - z.x, dy = e.y - z.y, d = Math.hypot(dx, dy) || 1;
        damageEnemy(s, e, z.dmg, owner, z.src, dx / d, dy / d, z.knock);
      });
    } else if (!z.fired) {
      z.fired = true;
      forEnemiesInCircle(z.x, z.y, z.r, (e) => {
        const dx = e.x - z.x, dy = e.y - z.y, d = Math.hypot(dx, dy) || 1;
        damageEnemy(s, e, z.dmg, owner, z.src, dx / d, dy / d, z.knock);
        if (z.burn > 0) ignite(e, owner.id, z.burn, METEOR_BURN_TIME);
      });
      if (z.kind === 'boom') {
        s.events.push({ t: 'explode', x: z.x, y: z.y, r: z.r, color: '#ffb347' });
      } else if (z.kind === 'meteor') {
        s.events.push({ t: 'explode', x: z.x, y: z.y, r: z.r, color: '#ff7a1a' });
        s.events.push({ t: 'shake', v: 12 });
      } else if (z.kind === 'rain') {
        s.events.push({ t: 'explode', x: z.x, y: z.y, r: z.r * 0.6, color: '#b6ff7a' });
      }
    }
  }
}
