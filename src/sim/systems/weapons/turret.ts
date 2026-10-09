// Turret: deployable auto-firing turrets (evolutions: Tesla Array, Mortar Battery).

import { isOverclocked } from '../../combat';
import { WEAPONS, type WStats, baseWeaponStats, weaponStats } from '../../content/weapons';
import { addProjectile } from '../../entities';
import { resolveObstacles } from '../../map';
import { rand } from '../../rng';
import { nearestEnemy } from '../../spatial';
import type { GameState, Player, WeaponInst } from '../../types';
import { TAU, chainLightning, countOwned, findPlayer } from './shared';

export function deployTurret(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  if (countOwned(s.turrets, p.id, () => true) >= st.amount) return;
  w.cd = st.cd;
  placeTurret(s, p, st.duration);
}

export function placeTurret(s: GameState, p: Player, life: number): void {
  const a = rand(s) * TAU;
  const pos = { x: p.x + Math.cos(a) * 30, y: p.y + Math.sin(a) * 30 };
  resolveObstacles(s.mapSeed, pos, 12);
  s.turrets.push({
    id: s.nextId++, owner: p.id, x: pos.x, y: pos.y,
    life, maxLife: life, cd: 0.3, ang: a, dead: false,
  });
  s.events.push({ t: 'sfx', name: 'deploy' });
}

export function updateTurrets(s: GameState, dt: number): void {
  for (const t of s.turrets) {
    if (t.dead) continue;
    t.life -= dt;
    if (t.life <= 0) {
      t.dead = true;
      continue;
    }
    const owner = findPlayer(s, t.owner);
    if (!owner) {
      t.dead = true;
      continue;
    }
    const w = owner.weapons.find((x) => x.id === 'turret');
    const st = w ? weaponStats(owner, w) : baseWeaponStats(WEAPONS.turret, 1);
    t.cd -= dt * (isOverclocked(owner) ? 3 : 1);
    const target = nearestEnemy(s, t.x, t.y, 480);
    if (!target) continue;
    t.ang = Math.atan2(target.y - t.y, target.x - t.x);
    if (t.cd > 0) continue;
    if (w?.evo === 'tesla') {
      t.cd = 0.8;
      chainLightning(s, owner, 'turret', t.x, t.y, target, 3, 160, st.dmg);
    } else if (w?.evo === 'mortar') {
      t.cd = 1.2;
      const d = Math.hypot(target.x - t.x, target.y - t.y);
      const sp = 420;
      addProjectile(s, {
        owner: owner.id, src: 'turret', kind: 'shell', x: t.x, y: t.y,
        vx: Math.cos(t.ang) * sp, vy: Math.sin(t.ang) * sp, speed: sp,
        dmg: st.dmg, radius: 8, pierce: 0, life: Math.max(0.15, d / sp), data: 80 * st.area, knock: 0,
      });
    } else {
      t.cd = 0.5;
      addProjectile(s, {
        owner: owner.id, src: 'turret', kind: 'bullet', x: t.x, y: t.y,
        vx: Math.cos(t.ang) * st.speed, vy: Math.sin(t.ang) * st.speed, speed: st.speed,
        dmg: st.dmg, radius: 5, pierce: st.pierce, life: 1, knock: st.knock,
      });
    }
  }
}
