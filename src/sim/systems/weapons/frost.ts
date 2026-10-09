// Frost Ring: bursts of slowing ice shards (evolution: Absolute Zero).

import type { WStats } from '../../content/weapons';
import { addProjectile } from '../../entities';
import { rand } from '../../rng';
import type { GameState, Player, WeaponInst } from '../../types';
import { TAU } from './shared';

export function fireFrost(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  w.cd = st.cd;
  const a0 = rand(s) * TAU;
  for (let i = 0; i < st.amount; i++) {
    const a = a0 + (i * TAU) / st.amount;
    addProjectile(s, {
      owner: p.id, src: 'frost', kind: w.evolved ? 'shard2' : 'shard', x: p.x, y: p.y,
      vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, speed: st.speed, ang: a,
      dmg: st.dmg, radius: 7 * st.area, pierce: st.pierce, life: st.duration, knock: st.knock,
      slow: w.evolved ? 0.9 : 0.5,
    });
  }
  s.events.push({ t: 'sfx', name: 'frost' });
}
