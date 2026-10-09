// Chain Lightning: strikes and chains between enemies (evolution: Thunderstorm).

import type { WStats } from '../../content/weapons';
import { rand } from '../../rng';
import type { GameState, Player, WeaponInst } from '../../types';
import { chainLightning } from './shared';

export function fireLightning(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  const candidates = s.enemies.filter((e) => !e.dead && !e.intangible && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 550 * 550);
  if (candidates.length === 0) return;
  w.cd = st.cd;
  for (let i = 0; i < st.amount; i++) {
    const e = candidates[Math.floor(rand(s) * candidates.length)];
    if (e.dead) continue;
    chainLightning(s, p, 'lightning', e.x, e.y - 500, e, st.pierce, 170 * st.area, st.dmg);
  }
  s.events.push({ t: 'sfx', name: 'zap' });
}
