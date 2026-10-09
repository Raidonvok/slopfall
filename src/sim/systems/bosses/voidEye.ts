// Void Eye (wave 30): spiral bullet patterns and sweeping lasers.

import { addEnemyProjectile, addHazard } from '../../entities';
import type { Enemy, GameState } from '../../types';
import { TAU, ring } from './shared';

export function voidEye(s: GameState, e: Enemy, d: number, nx: number, ny: number, sp: number, dt: number, enraged: boolean): void {
  if (e.state !== 1) {
    const radial = d > 360 ? 1 : d < 280 ? -1 : 0;
    e.x += (nx * radial - ny * 0.6) * sp * dt;
    e.y += (ny * radial + nx * 0.6) * sp * dt;
  }
  e.t -= dt;
  e.ang += (enraged ? 2.1 : 1.6) * dt;
  if (e.state === 0) {
    e.t2 -= dt;
    if (e.t2 <= 0) {
      e.t2 = enraged ? 0.08 : 0.11;
      const streams = enraged ? 4 : 3;
      for (let k = 0; k < streams; k++) {
        const a = e.ang + (k * TAU) / streams;
        addEnemyProjectile(s, 'void', e.x, e.y, Math.cos(a) * 190, Math.sin(a) * 190, e.dmg * 0.6, 7, 6);
      }
    }
    if (e.t <= 0) {
      e.state = 1;
      e.t = 4.2;
      const toT = Math.atan2(ny, nx);
      const dir = e.id % 2 === 0 ? 1 : -1;
      const n = enraged ? 2 : 1;
      for (let i = 0; i < n; i++) {
        addHazard(s, 'laser', {
          x: e.x, y: e.y, src: e.id, ang: toT - dir * 1.2 + i * Math.PI, angVel: dir * 0.9,
          len: 1100, w: 24, warn: 1.0, life: 3.2, dmg: e.dmg,
        });
      }
    }
  } else if (e.state === 1) {
    if (e.t <= 0) {
      e.state = 2;
      e.t = 1.4;
      ring(s, e, 20, 220, e.dmg * 0.6, e.ang, 'void');
    }
  } else if (e.t <= 0) {
    e.state = 0;
    e.t = 4;
  }
}
