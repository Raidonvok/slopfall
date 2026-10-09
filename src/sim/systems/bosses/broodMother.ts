// Brood Mother (wave 15): egg sacs, slowing webs, enraged pounce.

import { waveScale } from '../../combat';
import { addEnemyProjectile, addHazard, spawnEnemy } from '../../entities';
import type { Enemy, GameState } from '../../types';
import { TAU } from './shared';

/**
 * Brood Mother: skitters in bursts, lays egg sacs that hatch into swarms,
 * spits slowing webs and, when enraged, pounces (windup telegraphed).
 * states: 0 skitter, 1 pause, 3 pounce windup, 2 pounce
 */
export function broodMother(s: GameState, e: Enemy, nx: number, ny: number, sp: number, dt: number, enraged: boolean): void {
  e.t -= dt;
  e.t2 -= dt;
  e.sx -= dt;
  e.t3 -= dt;
  switch (e.state) {
    case 0:
      e.x += nx * sp * 1.5 * dt;
      e.y += ny * sp * 1.5 * dt;
      if (e.t3 <= 0) {
        e.state = 1;
        e.t3 = 0.55;
      }
      break;
    case 1:
      if (e.t3 <= 0) {
        if (enraged && e.sx <= 0) {
          e.state = 3;
          e.t3 = 0.45;
          e.tx = nx;
          e.ty = ny;
          e.sx = 4;
        } else {
          e.state = 0;
          e.t3 = 0.9;
        }
      }
      break;
    case 3:
      if (e.t3 <= 0) {
        e.state = 2;
        e.t3 = 0.42;
      }
      break;
    case 2:
      e.x += e.tx * 650 * dt;
      e.y += e.ty * 650 * dt;
      if (e.t3 <= 0) {
        e.state = 1;
        e.t3 = 0.6;
        addHazard(s, 'ring', { x: e.x, y: e.y, r: e.radius, w: 12, speed: 260, life: 1.1, dmg: e.dmg * 0.6 });
      }
      break;
  }
  if (e.t <= 0) {
    e.t = enraged ? 4.5 : 6.5;
    if (s.enemies.length < 550) {
      const a0 = e.ang;
      e.ang += 1.1;
      for (let i = 0; i < 3; i++) {
        const a = a0 + (i * TAU) / 3;
        spawnEnemy(s, 'egg', e.x + Math.cos(a) * 75, e.y + Math.sin(a) * 75, waveScale(s.wave.n));
      }
    }
  }
  if (e.t2 <= 0 && e.state !== 2) {
    e.t2 = enraged ? 2.2 : 3.2;
    const base = Math.atan2(ny, nx);
    for (let i = -2; i <= 2; i++) {
      const a = base + i * 0.22;
      addEnemyProjectile(s, 'web', e.x, e.y, Math.cos(a) * 250, Math.sin(a) * 250, e.dmg * 0.35, 10, 4);
    }
  }
}
