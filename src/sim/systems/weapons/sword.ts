// Sword Arc: melee arcs toward the aim (evolutions: Holy Blade, Blade Dancer).

import type { WStats } from '../../content/weapons';
import { addZone } from '../../entities';
import type { GameState, Player, WeaponInst } from '../../types';
import { TAU, aimAngle, arcHit } from './shared';

export function fireSword(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  w.cd = st.cd;
  const range = 95 * st.area;
  const base = aimAngle(p);
  if (w.evo === 'holyblade') {
    arcHit(s, p, 'sword', range * 1.2, base, TAU, st);
    addZone(s, { owner: p.id, src: 'sword', kind: 'slash2', x: p.x, y: p.y, r: range * 1.2, ang: base, arc: TAU, life: 0.25 });
  } else {
    const n = Math.max(1, st.amount);
    const kind = w.evo === 'bladedancer' ? 'slash3' : 'slash';
    for (let i = 0; i < n; i++) {
      const ang = base + (i * TAU) / n;
      arcHit(s, p, 'sword', range, ang, 2.1, st);
      addZone(s, { owner: p.id, src: 'sword', kind, x: p.x, y: p.y, r: range, ang, arc: 2.1, life: 0.18 });
    }
  }
  s.events.push({ t: 'sfx', name: 'swing' });
}
