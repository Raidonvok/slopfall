// Soul Orbs: orbs circling the player (evolution: Eternal Souls).

import type { WStats } from '../../content/weapons';
import { addProjectile } from '../../entities';
import type { GameState, Player, WeaponInst } from '../../types';
import { TAU, countOwned } from './shared';

export function updateOrbs(s: GameState, p: Player, w: WeaponInst, st: WStats, dt: number): void {
  w.t = (w.t + st.speed * dt) % TAU;
  w.r = 92 * st.area;
  const alive = countOwned(s.projectiles, p.id, (x) => x.src === 'orbs');
  const spawn = (life: number) => {
    for (let i = 0; i < st.amount; i++) {
      addProjectile(s, {
        owner: p.id, src: 'orbs', kind: w.evolved ? 'orb2' : 'orb', x: p.x, y: p.y,
        dmg: st.dmg, radius: 13 * Math.sqrt(st.area), pierce: 999, life, knock: st.knock,
        hitRate: 0.45, data: (i * TAU) / st.amount,
      });
    }
  };
  if (w.evolved) {
    if (alive !== st.amount) {
      for (const pr of s.projectiles) if (pr.owner === p.id && pr.src === 'orbs') pr.dead = true;
      spawn(1e6);
    }
  } else if (w.cd <= 0 && alive === 0) {
    spawn(st.duration);
    w.cd = st.cd + st.duration;
  }
}
