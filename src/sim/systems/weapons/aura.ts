// Holy Aura: constant damage around the player (evolution: Sanctuary).

import { damageEnemy, healPlayer, slowEnemy } from '../../combat';
import type { WStats } from '../../content/weapons';
import { forEnemiesInCircle } from '../../spatial';
import type { GameState, Player, WeaponInst } from '../../types';

export function updateAura(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  w.r = 85 * st.area;
  if (w.cd > 0) return;
  w.cd = st.cd;
  forEnemiesInCircle(p.x, p.y, w.r, (e) => {
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    damageEnemy(s, e, st.dmg, p, 'aura', dx / d, dy / d, st.knock);
    slowEnemy(e, w.evolved ? 0.35 : 0.15, 0.6);
  });
  if (w.evolved) healPlayer(s, p, 0.5);
}
