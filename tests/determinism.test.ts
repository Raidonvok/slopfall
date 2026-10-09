import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS } from '../src/sim/content/characters';
import type { GameState } from '../src/sim/types';
import { createGame } from '../src/sim/world';
import { hash, run } from './helpers';

describe('determinism (required for multiplayer)', () => {
  it('is deterministic for the same seed and inputs', () => {
    const a = createGame(1234, [{ id: 'p1', charId: 'mage' }]);
    const b = createGame(1234, [{ id: 'p1', charId: 'mage' }]);
    run(a, 3000);
    run(b, 3000);
    expect(a.tick).toBe(b.tick);
    expect(hash(a)).toBe(hash(b));
  });

  it('diverges for different seeds', () => {
    const a = createGame(1, [{ id: 'p1', charId: 'knight' }]);
    const b = createGame(2, [{ id: 'p1', charId: 'knight' }]);
    run(a, 1200);
    run(b, 1200);
    expect(hash(a)).not.toBe(hash(b));
  });

  it('survives a JSON round trip and continues identically', () => {
    const a = createGame(99, [{ id: 'p1', charId: 'ranger' }]);
    run(a, 1500);
    const b = JSON.parse(JSON.stringify(a)) as GameState;
    run(a, 1500);
    run(b, 1500);
    expect(hash(a)).toBe(hash(b));
  });

  it('runs every character and supports multiple players', () => {
    const s = createGame(7, CHARACTER_IDS.map((c, i) => ({ id: `p${i}`, charId: c })), { godMode: true });
    run(s, 4000);
    for (const p of s.players) {
      expect(p.level).toBeGreaterThan(1);
      expect(Number.isFinite(p.x) && Number.isFinite(p.hp)).toBe(true);
    }
    expect(s.kills).toBeGreaterThan(50);
  });
});
