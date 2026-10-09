// Shared helpers for the simulation tests.

import type { GameState, InputCmd } from '../src/sim/types';
import { step } from '../src/sim/world';

/** Deterministic bot: circles around, always uses its ability, picks the first upgrade. */
export function botInput(s: GameState, id: string): InputCmd {
  const p = s.players.find((x) => x.id === id)!;
  const a = s.tick / 120;
  return { mx: Math.cos(a), my: Math.sin(a), ax: 200, ay: 50, ability: true, dash: s.tick % 200 === 0, choose: p.choices ? 0 : -1 };
}

export function run(s: GameState, ticks: number): void {
  for (let i = 0; i < ticks && !s.gameOver; i++) {
    const inputs: Record<string, InputCmd> = {};
    for (const p of s.players) inputs[p.id] = botInput(s, p.id);
    step(s, inputs);
  }
}

export function hash(s: GameState): string {
  const { events: _e, ...rest } = s;
  return JSON.stringify(rest);
}
