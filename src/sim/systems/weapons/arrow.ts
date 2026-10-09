// Piercing Arrow: fast piercing arrows (evolution: Phantom Volley).

import type { WStats } from '../../content/weapons';
import { addProjectile } from '../../entities';
import { nearestEnemy } from '../../spatial';
import type { GameState, Player, WeaponInst } from '../../types';
import { aimAngle } from './shared';

export function fireArrow(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  w.cd = st.cd;
  const t = nearestEnemy(s, p.x, p.y, 700);
  const a0 = t ? Math.atan2(t.y - p.y, t.x - p.x) : aimAngle(p);
  for (let i = 0; i < st.amount; i++) {
    const a = a0 + (i - (st.amount - 1) / 2) * 0.12;
    addProjectile(s, {
      owner: p.id, src: 'arrow', kind: w.evolved ? 'arrow2' : 'arrow', x: p.x, y: p.y,
      vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, speed: st.speed,
      dmg: st.dmg, radius: 6 * st.area, pierce: st.pierce, life: st.duration, knock: st.knock,
    });
  }
  s.events.push({ t: 'sfx', name: 'arrow' });
}
