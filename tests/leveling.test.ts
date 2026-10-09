import { describe, expect, it } from 'vitest';
import { ABILITY_MAX_LEVEL } from '../src/sim/content/characters';
import { PERKS, RARITIES } from '../src/sim/content/perks';
import { WEAPONS } from '../src/sim/content/weapons';
import { MAX_SLOTS, openChest, rollChoices } from '../src/sim/systems/leveling';
import { createGame, step } from '../src/sim/world';
import { run } from './helpers';

describe('leveling, upgrades and evolutions', () => {
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

  it('lets the player choose between evolutions they qualify for', () => {
    const s = createGame(8, [{ id: 'p1', charId: 'mage' }]);
    const p = s.players[0];
    const idle = { mx: 0, my: 0, ax: 1, ay: 0, ability: false, dash: false, choose: -1 };
    p.weapons[0].level = 8;
    openChest(s, p, false);
    expect(p.evoQueue.length).toBe(0); // no qualifying perk yet

    p.perks.push({ id: 'haste', level: 1, power: 1 }, { id: 'area', level: 1, power: 1 });
    openChest(s, p, false);
    step(s, { p1: idle });
    expect(p.choices?.map((o) => o.kind)).toEqual(['evo', 'evo']);
    expect(p.choices?.map((o) => WEAPONS.bolt.evos[o.level].id)).toEqual(['arcanestorm', 'prism']);

    step(s, { p1: { ...idle, choose: 1 } });
    expect(p.weapons[0].evolved).toBe(true);
    expect(p.weapons[0].evo).toBe('prism');
    expect(s.events.some((e) => e.t === 'evolve' && e.name === 'Prism Lance')).toBe(true);

    // simulation keeps running with the chosen evolution
    for (let i = 0; i < 600; i++) step(s, { p1: { ...idle, choose: p.choices ? 0 : -1 } });
    expect(s.projectiles.some((pr) => pr.kind === 'prism')).toBe(true);
  });

  it('runs every alternative evolution without errors', () => {
    for (const [weapon, evo] of [['sword', 'bladedancer'], ['axe', 'twinreavers'], ['nova', 'supernova'], ['turret', 'mortar']]) {
      const s = createGame(31, [{ id: 'p1', charId: 'knight' }], { godMode: true });
      const p = s.players[0];
      p.weapons = [{ id: weapon, level: 8, evolved: true, evo, cd: 0, t: 0, r: 0 }];
      run(s, 1500);
      expect(s.kills).toBeGreaterThan(10);
      expect(Number.isFinite(p.x)).toBe(true);
    }
  });

  it('perk rarity scales the effect of a level-up', () => {
    const s = createGame(40, [{ id: 'p1', charId: 'knight' }]);
    const p = s.players[0];
    const idle = { mx: 0, my: 0, ax: 1, ay: 0, ability: false, dash: false, choose: 0 };
    p.choices = [{ kind: 'perk', id: 'might', level: 1, rarity: 2 }];
    step(s, { p1: idle });
    expect(p.perks[0].power).toBeCloseTo(RARITIES[2].mul);
    expect(p.stats.might).toBeCloseTo(1 + 0.1 * RARITIES[2].mul);
    // rarity rolls stay mostly common
    const counts = [0, 0, 0];
    for (let i = 0; i < 400; i++) {
      for (const o of rollChoices(s, p)) if (o.kind === 'perk' && PERKS[o.id].rarity) counts[o.rarity]++;
    }
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
  });

  it('stops offering Time Shards at their 15 stack limit', () => {
    const s = createGame(41, [{ id: 'p1', charId: 'knight' }], { godMode: true });
    const p = s.players[0];
    for (let i = 0; i < 300; i++) {
      p.choices = rollChoices(s, p);
      step(s, { p1: { mx: 0, my: 0, ax: 1, ay: 0, ability: false, dash: false, choose: 0 } });
    }
    p.bonus.time = 15;
    for (let i = 0; i < 100; i++) expect(rollChoices(s, p).some((o) => o.kind === 'bonus' && o.id === 'time')).toBe(false);
  });
});
