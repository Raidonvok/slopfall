// Run snapshots for "continue where you left off". A snapshot keeps what
// defines the run (map seed, heroes and their build, wave, time, kills) and
// drops transient things (enemies, projectiles, effects); a restored run
// simply spawns fresh enemies for the saved wave.

import { CHARACTERS } from './content/characters';
import { startWave } from './systems/waves';
import type { GameState } from './types';

/** Bump when GameState changes shape so old saves are ignored instead of breaking. */
export const SAVE_VERSION = 2;

export interface RunSave {
  v: number;
  savedAt: number; // wall clock ms, for display only
  state: GameState;
}

export function snapshot(s: GameState, savedAt: number): RunSave {
  const state: GameState = {
    ...s,
    enemies: [],
    projectiles: [],
    eprojectiles: [],
    zones: [],
    hazards: [],
    turrets: [],
    minions: [],
    pickups: s.pickups.filter((p) => p.kind === 'chest' && !p.dead),
    corpses: [],
    events: [],
  };
  return { v: SAVE_VERSION, savedAt, state: JSON.parse(JSON.stringify(state)) as GameState };
}

/** Returns a playable state from a snapshot, or null if it is unusable. */
export function restore(save: unknown): GameState | null {
  const sv = save as RunSave | null;
  if (!sv || sv.v !== SAVE_VERSION || !sv.state || !Array.isArray(sv.state.players)) return null;
  const s = JSON.parse(JSON.stringify(sv.state)) as GameState;
  if (s.gameOver || s.players.length === 0 || s.players.some((p) => !CHARACTERS[p.charId] || p.dead)) return null;
  for (const p of s.players) {
    p.px = p.x;
    p.py = p.y;
    p.anchorX = p.x;
    p.anchorY = p.y;
    p.idleT = 0;
    p.dashT = 0;
    p.slowT = 0;
    p.invuln = 2; // a moment to get your bearings
  }
  s.events = [];
  if (s.wave.bossWave) {
    // the boss was not saved: start the boss wave again
    startWave(s, s.wave.n);
  }
  s.wave.spawnAcc = 6;
  return s;
}
