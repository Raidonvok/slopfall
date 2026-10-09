import { describe, expect, it } from 'vitest';
import { damageEnemy, hurtPlayer } from '../src/sim/combat';
import { addEnemyProjectile, addHazard, spawnEnemy } from '../src/sim/entities';
import { abilityPower } from '../src/sim/systems/abilities';
import { refreshStats } from '../src/sim/systems/leveling';
import { createGame, step } from '../src/sim/world';

describe('combat, abilities and perks', () => {
  it('scales ability damage with the wave and ability level', () => {
    const s = createGame(4, [{ id: 'p1', charId: 'mage' }]);
    const p = s.players[0];
    const early = abilityPower(s, p);
    s.wave.n = 20;
    p.abilityLevel = 5;
    expect(abilityPower(s, p)).toBeGreaterThan(early * 10);
  });

  it('webs slow the player unless they dash', () => {
    const s = createGame(19, [{ id: 'p1', charId: 'knight' }]);
    const p = s.players[0];
    addEnemyProjectile(s, 'web', p.x + 30, p.y, -200, 0, 1, 10, 2);
    for (let i = 0; i < 10; i++) step(s, { p1: { mx: 0, my: 0, ax: 1, ay: 0, ability: false, dash: false, choose: -1 } });
    expect(p.slowT).toBeGreaterThan(0);
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

  it('caps lifesteal healing per second and Rage no longer heals', () => {
    const s = createGame(42, [{ id: 'p1', charId: 'berserker' }]);
    const p = s.players[0];
    p.abilityT = 5; // raging
    p.hp = 10;
    const e = spawnEnemy(s, 'zombie', p.x + 400, p.y, { hp: 1000, dmg: 1, speed: 0 });
    damageEnemy(s, e, 500, p, 'test');
    expect(p.hp).toBe(10); // no lifesteal from Rage
    p.perks.push({ id: 'lifesteal', level: 5, power: 5 });
    refreshStats(p);
    p.hp = 10;
    p.lsBudget = p.stats.maxHp * p.stats.lifestealCap;
    for (let i = 0; i < 20; i++) damageEnemy(s, e, 500, p, 'test');
    const healed = p.hp - 10;
    expect(healed).toBeGreaterThan(0);
    expect(healed).toBeLessThanOrEqual(p.stats.maxHp * p.stats.lifestealCap + 1e-6);
  });

  it('armor reduces damage by a percentage', () => {
    const s = createGame(43, [{ id: 'p1', charId: 'mage' }]);
    const p = s.players[0];
    p.perks.push({ id: 'armor', level: 5, power: 5 });
    refreshStats(p);
    expect(p.stats.dr).toBeCloseTo(0.3);
    const hp = p.hp;
    hurtPlayer(s, p, 50);
    expect(hp - p.hp).toBeCloseTo(35);
  });

  it('ignite sets enemies on fire and burns them over time; the meteor ignites too', () => {
    const s = createGame(44, [{ id: 'p1', charId: 'mage' }]);
    const p = s.players[0];
    p.perks.push({ id: 'burn', level: 5, power: 20 });
    refreshStats(p);
    expect(p.stats.burn).toBe(1);
    const e = spawnEnemy(s, 'zombie', p.x + 600, p.y, { hp: 100, dmg: 1, speed: 0 });
    damageEnemy(s, e, 10, p, 'test');
    expect(e.burnT).toBeGreaterThan(0);
    const before = e.hp;
    for (let i = 0; i < 60; i++) step(s, { p1: { mx: 0, my: 0, ax: 1, ay: 0, ability: false, dash: false, choose: -1 } });
    expect(e.hp).toBeLessThan(before);
    expect(p.dmgDealt.burn).toBeGreaterThan(0);

    const s2 = createGame(45, [{ id: 'p1', charId: 'mage' }]);
    const p2 = s2.players[0];
    const target = spawnEnemy(s2, 'zombie', p2.x + 200, p2.y, { hp: 1000, dmg: 1, speed: 0 });
    for (let i = 0; i < 70; i++) step(s2, { p1: { mx: 0, my: 0, ax: 200, ay: 0, ability: i === 0, dash: false, choose: -1 } });
    expect(target.burnT).toBeGreaterThan(0);
  });
});
