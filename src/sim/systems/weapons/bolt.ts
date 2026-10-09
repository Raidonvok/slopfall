// Magic Bolt: homing bolts (evolutions: Arcane Storm, Prism Lance).

import type { WStats } from '../../content/weapons';
import { addProjectile } from '../../entities';
import { nearestEnemy } from '../../spatial';
import type { GameState, Player, WeaponInst } from '../../types';

export function fireBolt(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  const t = nearestEnemy(s, p.x, p.y, 650);
  if (!t) return;
  w.cd = st.cd;
  const a0 = Math.atan2(t.y - p.y, t.x - p.x);
  for (let i = 0; i < st.amount; i++) {
    const a = a0 + (i - (st.amount - 1) / 2) * 0.3;
    addProjectile(s, {
      owner: p.id, src: 'bolt', kind: w.evo === 'prism' ? 'prism' : w.evolved ? 'bolt2' : 'bolt', x: p.x, y: p.y,
      vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, speed: st.speed,
      dmg: st.dmg, radius: 7 * st.area, pierce: st.pierce, life: st.duration, knock: st.knock,
      homing: w.evo === 'prism' ? 1.5 : 7,
    });
  }
  s.events.push({ t: 'sfx', name: 'bolt' });
}
