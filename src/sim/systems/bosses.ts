import { waveScale } from '../combat';
import { addEnemyProjectile, addHazard, spawnEnemy } from '../entities';
import type { Enemy, GameState, Player } from '../types';

const TAU = Math.PI * 2;

export function initBoss(e: Enemy): void {
  e.state = 0;
  switch (e.type) {
    case 'slimeking': e.t = 3; break;
    case 'necrolord': e.t = 2; e.t2 = 3; e.t3 = 1; break;
    case 'golem': e.t = 3; e.t2 = 6; break;
    case 'voideye': e.t = 4; e.t2 = 0; break;
  }
}

function ring(s: GameState, e: Enemy, n: number, speed: number, dmg: number, offset: number, kind: string): void {
  for (let i = 0; i < n; i++) {
    const a = offset + (i * TAU) / n;
    addEnemyProjectile(s, kind, e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, dmg, 8, 6);
  }
}

export function updateBoss(
  s: GameState, e: Enemy, target: Player, d: number, nx: number, ny: number, sp: number, dt: number,
): void {
  const enraged = e.hp < e.maxHp * 0.5;
  switch (e.type) {
    case 'slimeking': return slimeKing(s, e, target, nx, ny, sp, dt, enraged);
    case 'necrolord': return necroLord(s, e, d, nx, ny, sp, dt, enraged);
    case 'golem': return golem(s, e, nx, ny, sp, dt, enraged);
    case 'voideye': return voidEye(s, e, d, nx, ny, sp, dt, enraged);
  }
}

function slimeKing(s: GameState, e: Enemy, target: Player, nx: number, ny: number, sp: number, dt: number, enraged: boolean): void {
  if (e.state === 0) {
    e.x += nx * sp * dt;
    e.y += ny * sp * dt;
    e.t -= dt;
    if (e.t <= 0) {
      e.state = 1;
      e.t2 = 0.55;
      e.tx = target.x;
      e.ty = target.y;
      addHazard(s, 'slam', { x: e.tx, y: e.ty, r: e.radius + 80, warn: 0.55 + 0.9, life: 0.3, dmg: e.dmg * 1.2 });
    }
  } else if (e.state === 1) {
    e.t2 -= dt;
    if (e.t2 <= 0) {
      e.state = 2;
      e.t2 = 0.9;
      e.sx = e.x;
      e.sy = e.y;
      e.intangible = true;
    }
  } else {
    e.t2 -= dt;
    const prog = Math.min(1, 1 - e.t2 / 0.9);
    e.x = e.sx + (e.tx - e.sx) * prog;
    e.y = e.sy + (e.ty - e.sy) * prog;
    if (e.t2 <= 0) {
      e.intangible = false;
      e.state = 0;
      e.t = enraged ? 2.2 : 3.4;
      addHazard(s, 'ring', { x: e.x, y: e.y, r: e.radius, w: 14, speed: 320, life: 1.6, dmg: e.dmg * 0.8 });
      if (enraged) addHazard(s, 'ring', { x: e.x, y: e.y, r: e.radius, w: 14, speed: 200, life: 2.2, dmg: e.dmg * 0.8 });
    }
  }
}

function necroLord(s: GameState, e: Enemy, d: number, nx: number, ny: number, sp: number, dt: number, enraged: boolean): void {
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

function golem(s: GameState, e: Enemy, nx: number, ny: number, sp: number, dt: number, enraged: boolean): void {
  const speedMul = enraged ? 1.4 : 1;
  switch (e.state) {
    case 0:
      e.x += nx * sp * speedMul * dt;
      e.y += ny * sp * speedMul * dt;
      e.t -= dt;
      e.t2 -= dt;
      if (e.t <= 0) {
        e.state = 1;
        e.t3 = 0.8;
        e.tx = nx;
        e.ty = ny;
      } else if (e.t2 <= 0) {
        e.state = 3;
        e.t3 = 1.2;
        addHazard(s, 'slam', { x: e.x, y: e.y, r: 220, warn: 1.0, life: 0.3, dmg: e.dmg * 1.3 });
      }
      break;
    case 1: // charge windup
      e.t3 -= dt;
      if (e.t3 <= 0) {
        e.state = 2;
        e.t3 = 0.75;
      }
      break;
    case 2: // charging
      e.x += e.tx * 680 * dt;
      e.y += e.ty * 680 * dt;
      e.t3 -= dt;
      if (e.t3 <= 0) {
        e.state = 0;
        e.t = enraged ? 3 : 4.5;
      }
      break;
    case 3: // slam
      e.t3 -= dt;
      if (e.t3 <= 0) {
        e.state = 0;
        e.t2 = enraged ? 5 : 7;
        addHazard(s, 'ring', { x: e.x, y: e.y, r: 40, w: 16, speed: 380, life: 1.4, dmg: e.dmg * 0.7 });
      }
      break;
  }
}

function voidEye(s: GameState, e: Enemy, d: number, nx: number, ny: number, sp: number, dt: number, enraged: boolean): void {
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
