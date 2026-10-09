import { describe, expect, it } from 'vitest';
import { getChunk, isBlocked } from '../src/sim/map';
import { createGame, step } from '../src/sim/world';
import { botInput, run } from './helpers';

describe('map, movement and anti-AFK', () => {
  it('generates the same obstacles for the same seed and keeps entities out of them', () => {
    const s = createGame(77, [{ id: 'p1', charId: 'knight' }], { godMode: true });
    const a = getChunk(s.mapSeed, 3, -2).obstacles.map((o) => [o.x, o.y, o.r]);
    const b = getChunk(s.mapSeed, 3, -2).obstacles.map((o) => [o.x, o.y, o.r]);
    expect(a).toEqual(b);
    expect(isBlocked(s.mapSeed, 0, 0, 300)).toBe(false);
    let total = 0;
    for (let cx = -4; cx <= 4; cx++) for (let cy = -4; cy <= 4; cy++) total += getChunk(s.mapSeed, cx, cy).obstacles.length;
    expect(total).toBeGreaterThan(30);
    run(s, 3000);
    const p = s.players[0];
    expect(isBlocked(s.mapSeed, p.x, p.y, p.radius - 1)).toBe(false);
  });

  it('dashes on input with a cooldown', () => {
    const s = createGame(4, [{ id: 'p1', charId: 'knight' }]);
    const p = s.players[0];
    const cmd = { mx: 1, my: 0, ax: 1, ay: 0, ability: false, dash: true, choose: -1 };
    step(s, { p1: cmd });
    expect(p.dashT).toBeGreaterThan(0);
    for (let i = 0; i < 12; i++) step(s, { p1: cmd });
    expect(p.x).toBeGreaterThan(150);
    expect(p.dashCd).toBeGreaterThan(0);
  });

  it('drops meteors on a player who stands still, but not on one who moves', () => {
    const idle = createGame(12, [{ id: 'p1', charId: 'knight' }]);
    const meteors = new Set<number>();
    for (let i = 0; i < 60 * 14; i++) {
      step(idle, { p1: { mx: 0, my: 0, ax: 1, ay: 0, ability: false, dash: false, choose: idle.players[0].choices ? 0 : -1 } });
      for (const h of idle.hazards) if (h.kind === 'skyfall') meteors.add(h.id);
    }
    expect(meteors.size).toBeGreaterThanOrEqual(2);

    const mover = createGame(12, [{ id: 'p1', charId: 'knight' }]);
    for (let i = 0; i < 60 * 14; i++) {
      step(mover, { p1: { ...botInput(mover, 'p1'), mx: Math.cos(i / 40), my: Math.sin(i / 40) * 0.3 + 0.7, ability: false } });
      expect(mover.hazards.some((h) => h.kind === 'skyfall')).toBe(false);
    }
  });
});
