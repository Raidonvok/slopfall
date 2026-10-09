// Necro Lord (wave 10): keeps its distance, fires skull rings and summons skeletons.

import { waveScale } from '../../combat';
import { addEnemyProjectile, spawnEnemy } from '../../entities';
import type { Enemy, GameState } from '../../types';
import { TAU, ring } from './shared';

export function necroLord(s: GameState, e: Enemy, d: number, nx: number, ny: number, sp: number, dt: number, enraged: boolean): void {
  const side = Math.sin(s.time * 0.5) > 0 ? 1 : -1;
  if (d > 330) {
    e.x += nx * sp * dt;
    e.y += ny * sp * dt;
  } else if (d < 230) {
    e.x -= nx * sp * dt;
    e.y -= ny * sp * dt;
  } else {
    e.x += -ny * side * sp * 0.6 * dt;
    e.y += nx * side * sp * 0.6 * dt;
  }
  e.t -= dt;
  e.t2 -= dt;
  e.t3 -= dt;
  if (e.t <= 0) {
    e.t = enraged ? 1.8 : 2.6;
    e.ang += 0.17;
    ring(s, e, enraged ? 24 : 18, 170, e.dmg * 0.7, e.ang, 'skull');
  }
  if (e.t2 <= 0) {
    e.t2 = 7;
    if (s.enemies.length < 550) {
      const n = enraged ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const a = (i * TAU) / n;
        spawnEnemy(s, 'skeleton', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, waveScale(s.wave.n));
      }
      s.events.push({ t: 'explode', x: e.x, y: e.y, r: 90, color: '#9b59ff' });
    }
  }
  if (enraged && e.t3 <= 0) {
    e.t3 = 1.2;
    const base = Math.atan2(ny, nx);
    for (let i = -1; i <= 1; i++) {
      const a = base + i * 0.15;
      addEnemyProjectile(s, 'skull', e.x, e.y, Math.cos(a) * 300, Math.sin(a) * 300, e.dmg * 0.7, 8, 4);
    }
  }
}
