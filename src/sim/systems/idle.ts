import { addHazard } from '../entities';
import type { GameState, Player } from '../types';

// Anti-AFK: a player who stays within IDLE_RADIUS of the same spot for
// IDLE_GRACE seconds gets meteors dropped on them, each stronger than the last.
export const IDLE_RADIUS = 160;
export const IDLE_GRACE = 8;
export const IDLE_WARNING = 3; // HUD warns this many seconds before the first meteor
const SKYFALL_EVERY = 2.5;
const SKYFALL_RADIUS = 110;
const SKYFALL_WARN = 1.1;

const NECRO_HEAL_PER_SEC = 4;

export function updateIdle(s: GameState, p: Player, dt: number): void {
  if (p.charId === 'necro') p.healBudget = Math.min(NECRO_HEAL_PER_SEC, p.healBudget + NECRO_HEAL_PER_SEC * dt);

  if ((p.x - p.anchorX) ** 2 + (p.y - p.anchorY) ** 2 > IDLE_RADIUS * IDLE_RADIUS) {
    p.anchorX = p.x;
    p.anchorY = p.y;
    p.idleT = 0;
    p.skyfallCd = 0;
    p.skyfallN = 0;
    return;
  }
  p.idleT += dt;
  if (p.idleT < IDLE_GRACE) return;
  p.skyfallCd -= dt;
  if (p.skyfallCd > 0) return;
  p.skyfallCd = SKYFALL_EVERY;
  p.skyfallN++;
  // % of max HP so it matters at any point of the run; armor is added back so it can't be tanked
  const dmg = p.stats.maxHp * (0.25 + 0.1 * (p.skyfallN - 1)) + p.stats.armor;
  addHazard(s, 'skyfall', { x: p.x, y: p.y, r: SKYFALL_RADIUS, warn: SKYFALL_WARN, life: 0.3, dmg });
  s.events.push({ t: 'sfx', name: 'warn' });
}
