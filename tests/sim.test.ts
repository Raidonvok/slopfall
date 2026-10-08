import { describe, expect, it } from 'vitest';
import { damageEnemy, waveScale } from '../src/sim/combat';
import { MAX_SLOTS, openChest, rollChoices } from '../src/sim/systems/leveling';
import { abilityPower } from '../src/sim/systems/abilities';
import { getChunk, isBlocked } from '../src/sim/map';
import { addHazard, spawnEnemy } from '../src/sim/entities';
import { ABILITY_MAX_LEVEL, CHARACTER_IDS } from '../src/sim/content/characters';
import type { GameState, InputCmd } from '../src/sim/types';
import { createGame, step } from '../src/sim/world';

/** Deterministic bot: circles around, always uses its ability, picks the first upgrade. */
function botInput(s: GameState, id: string): InputCmd {
  const p = s.players.find((x) => x.id === id)!;
  const a = s.tick / 120;
  return { mx: Math.cos(a), my: Math.sin(a), ax: 200, ay: 50, ability: true, dash: s.tick % 200 === 0, choose: p.choices ? 0 : -1 };
}

function run(s: GameState, ticks: number): void {
  for (let i = 0; i < ticks && !s.gameOver; i++) {
    const inputs: Record<string, InputCmd> = {};
    for (const p of s.players) inputs[p.id] = botInput(s, p.id);
    step(s, inputs);
  }
}

function hash(s: GameState): string {
  const { events: _e, ...rest } = s;
  return JSON.stringify(rest);
}

describe('simulation', () => {
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

  it('progresses through waves and spawns bosses every 5th wave', () => {
    const s = createGame(5, [{ id: 'p1', charId: 'berserker' }], { godMode: true, waveDuration: 5 });
    const bosses = new Map<number, string[]>();
    for (let i = 0; i < 60 * 600 && s.wave.n < 13; i++) {
      step(s, { p1: botInput(s, 'p1') });
      for (const ev of s.events) if (ev.t === 'boss') bosses.set(s.wave.n, [...(bosses.get(s.wave.n) ?? []), ev.name]);
      // Speed the test up: bosses lose health quickly
      for (const e of s.enemies) if (e.boss && s.tick % 60 === 0) damageEnemy(s, e, e.maxHp * 0.1, null, 'test');
    }
    expect(s.wave.n).toBeGreaterThanOrEqual(13);
    expect(bosses.get(5)).toEqual(['Slime King']);
    expect(bosses.get(10)).toEqual(['Necro Lord']);
  });

  it('scales enemies up with the wave number', () => {
    expect(waveScale(10).hp).toBeGreaterThan(waveScale(1).hp);
    expect(waveScale(50).dmg).toBeGreaterThan(waveScale(10).dmg);
    expect(waveScale(1).hp).toBe(1);
  });

  it('offers valid, distinct level-up choices', () => {
    const s = createGame(3, [{ id: 'p1', charId: 'engineer' }]);
    const p = s.players[0];
    for (let i = 0; i < 50; i++) {
      const c = rollChoices(s, p);
      expect(c.length).toBe(3);
      expect(new Set(c.map((o) => o.kind + o.id)).size).toBe(3);
    }
  });

  it('caps slots and offers endless bonus shards once everything is maxed', () => {
    const s = createGame(11, [{ id: 'p1', charId: 'knight' }], { godMode: true });
    const p = s.players[0];
    for (let i = 0; i < 300; i++) {
      p.choices = rollChoices(s, p);
      step(s, { p1: { mx: 0, my: 0, ax: 1, ay: 0, ability: false, dash: false, choose: 0 } });
    }
    expect(p.weapons.length).toBeLessThanOrEqual(MAX_SLOTS);
    expect(p.perks.length).toBeLessThanOrEqual(MAX_SLOTS);
    expect(p.abilityLevel).toBe(ABILITY_MAX_LEVEL);
    const c = rollChoices(s, p);
    expect(c.length).toBe(3);
    expect(c.every((o) => o.kind === 'bonus')).toBe(true);
    expect(Object.values(p.bonus).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it('drops few chests: at most one champion and one boss chest per 5 waves', () => {
    const s = createGame(21, [{ id: 'p1', charId: 'mage' }], { godMode: true, waveDuration: 6 });
    let chests = 0;
    for (let i = 0; i < 60 * 400 && s.wave.n <= 10; i++) {
      step(s, { p1: botInput(s, 'p1') });
      for (const ev of s.events) if (ev.t === 'chest') chests++;
      for (const e of s.enemies) if ((e.boss || e.elite) && s.tick % 30 === 0) damageEnemy(s, e, e.maxHp * 0.2, null, 'test');
      for (const pk of s.pickups) if (pk.kind === 'chest') { pk.x = s.players[0].x; pk.y = s.players[0].y; }
    }
    expect(s.wave.n).toBeGreaterThan(10);
    expect(chests).toBeGreaterThanOrEqual(2);
    expect(chests).toBeLessThanOrEqual(4);
  });

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

  it('scales ability damage with the wave and ability level', () => {
    const s = createGame(4, [{ id: 'p1', charId: 'mage' }]);
    const p = s.players[0];
    const early = abilityPower(s, p);
    s.wave.n = 20;
    p.abilityLevel = 5;
    expect(abilityPower(s, p)).toBeGreaterThan(early * 10);
  });

  it('evolves a max level weapon from a chest when its perk is owned', () => {
    const s = createGame(8, [{ id: 'p1', charId: 'mage' }]);
    const p = s.players[0];
    p.weapons[0].level = 8;
    openChest(s, p, false);
    expect(p.weapons[0].evolved).toBe(false);
    p.perks.push({ id: 'haste', level: 1 });
    openChest(s, p, false);
    expect(p.weapons[0].evolved).toBe(true);
    const chest = s.events.filter((e) => e.t === 'chest').pop();
    expect(chest && chest.t === 'chest' && chest.items[0]).toContain('Arcane Storm');
  });

  it('shockwave rings hurt when standing still but can be dashed through', () => {
    const run = (dash: boolean) => {
      const s = createGame(9, [{ id: 'p1', charId: 'knight' }]);
      const p = s.players[0];
      addHazard(s, 'ring', { x: 220, y: 0, r: 10, w: 14, speed: 320, life: 2, dmg: 40 });
      const hp = p.hp;
      for (let i = 0; i < 90; i++) {
        // start the dash just before the ring reaches the player
        const near = Math.abs(Math.hypot(p.x - 220, p.y) - s.hazards[0]?.r) < 70;
        step(s, { p1: { mx: dash ? 1 : 0, my: 0, ax: 1, ay: 0, ability: false, dash: dash && near, choose: -1 } });
      }
      return hp - p.hp;
    };
    expect(run(false)).toBeGreaterThan(0);
    expect(run(true)).toBe(0);
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

  it('caps the necromancer kill heal per second', () => {
    const s = createGame(13, [{ id: 'p1', charId: 'necro' }]);
    const p = s.players[0];
    step(s, { p1: { mx: 0, my: 0, ax: 1, ay: 0, ability: false, dash: false, choose: -1 } });
    p.healBudget = 4;
    p.hp = 10;
    for (let i = 0; i < 30; i++) {
      const e = spawnEnemy(s, 'bat', p.x + 300, p.y, { hp: 1, dmg: 1, speed: 1 });
      damageEnemy(s, e, 999, p, 'test');
    }
    expect(p.hp).toBe(14);
  });
});
