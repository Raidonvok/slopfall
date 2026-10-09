// Boomerang Axe: thrown axes that return (evolutions: Whirlwind, Twin Reavers).

import type { WStats } from '../../content/weapons';
import { addProjectile } from '../../entities';
import type { GameState, Player, WeaponInst } from '../../types';
import { TAU, aimAngle } from './shared';

export function fireAxe(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  w.cd = st.cd;
  const base = aimAngle(p);
  const twin = w.evo === 'twinreavers';
  for (let i = 0; i < st.amount; i++) {
    const a = twin ? base + (i * TAU) / st.amount : base + (i - (st.amount - 1) / 2) * 0.35;
    addProjectile(s, {
      owner: p.id, src: 'axe', kind: twin ? 'axe3' : w.evolved ? 'axe2' : 'axe', x: p.x, y: p.y,
      vx: Math.cos(a), vy: Math.sin(a), speed: st.speed, data: st.duration / 2,
      dmg: st.dmg, radius: 14 * st.area, pierce: 999, life: st.duration * 2 + 2, knock: st.knock, hitRate: 0.35,
    });
  }
  s.events.push({ t: 'sfx', name: 'swing' });
}
