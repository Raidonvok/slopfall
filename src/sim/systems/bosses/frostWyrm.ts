// Frost Wyrm (wave 25): serpent body, ice breath, dives and icicles.

import { hurtPlayer } from '../../combat';
import { addEnemyProjectile, addHazard } from '../../entities';
import { rand } from '../../rng';
import type { Enemy, GameState, Player } from '../../types';
import { TAU, turnToward } from './shared';

export const WYRM_SEGMENTS = 14;

export const WYRM_GAP = 22;

/**
 * Frost Wyrm: a serpent that weaves around the player. Its body segments
 * (stored in `trail`) hurt on contact. Breathes ice cones, telegraphs and
 * performs a dive that ends in a frost nova, and drops icicles when enraged.
 * states: 0 weave, 1 dive windup, 2 dive (timer in sx)
 */
export function wyrm(s: GameState, e: Enemy, target: Player, d: number, nx: number, ny: number, sp: number, dt: number, enraged: boolean): void {
  e.t -= dt;
  e.t2 -= dt;
  e.t3 -= dt;
  let speed = sp;
  if (e.state === 0) {
    const side = e.id % 2 ? 1 : -1;
    const radial = d > 330 ? 0.9 : d < 220 ? -0.7 : 0;
    const want = Math.atan2(nx * side + ny * radial, -ny * side + nx * radial) + Math.sin(s.time * 3) * 0.6;
    e.ang = turnToward(e.ang, want, 2.6 * dt);
    if (e.t2 <= 0) {
      e.state = 1;
      e.sx = 0.75;
    }
    if (e.t <= 0) {
      e.t = enraged ? 2.4 : 3.4;
      const n = enraged ? 13 : 9;
      const base = Math.atan2(ny, nx);
      for (let i = 0; i < n; i++) {
        const a = base - 0.55 + (1.1 * i) / (n - 1);
        addEnemyProjectile(s, 'ice', e.x, e.y, Math.cos(a) * 290, Math.sin(a) * 290, e.dmg * 0.55, 7, 3);
      }
    }
  } else if (e.state === 1) {
    speed = sp * 0.3;
    e.ang = turnToward(e.ang, Math.atan2(ny, nx), 6 * dt);
    e.sx -= dt;
    if (e.sx <= 0) {
      e.state = 2;
      e.sx = 1.1;
    }
  } else {
    speed = sp * 3.4;
    e.sx -= dt;
    if (e.sx <= 0) {
      e.state = 0;
      e.t2 = enraged ? 6 : 8.5;
      addHazard(s, 'ring', { x: e.x, y: e.y, r: e.radius, w: 14, speed: 300, life: 1.5, dmg: e.dmg * 0.7 });
    }
  }
  e.x += Math.cos(e.ang) * speed * dt;
  e.y += Math.sin(e.ang) * speed * dt;

  if (enraged && e.t3 <= 0) {
    e.t3 = 3;
    for (let i = 0; i < 4; i++) {
      const a = rand(s) * TAU, r = rand(s) * 180;
      addHazard(s, 'slam', { x: target.x + Math.cos(a) * r, y: target.y + Math.sin(a) * r, r: 70, warn: 1.0, life: 0.3, dmg: e.dmg * 0.9 });
    }
  }

  // body: drop a segment every WYRM_GAP units travelled
  if (e.trail.length < 2 || Math.hypot(e.x - e.trail[0], e.y - e.trail[1]) >= WYRM_GAP) {
    e.trail.unshift(e.x, e.y);
    if (e.trail.length > WYRM_SEGMENTS * 2) e.trail.length = WYRM_SEGMENTS * 2;
  }
  for (const p of s.players) {
    if (p.dead) continue;
    for (let i = 2; i < e.trail.length; i += 2) {
      const r = wyrmSegmentRadius(e.radius, i / 2) + p.radius * 0.7;
      if ((p.x - e.trail[i]) ** 2 + (p.y - e.trail[i + 1]) ** 2 < r * r) {
        hurtPlayer(s, p, e.dmg * 0.6);
        break;
      }
    }
  }
}

export function wyrmSegmentRadius(head: number, index: number): number {
  return head * Math.max(0.35, 0.85 - index * 0.035);
}
