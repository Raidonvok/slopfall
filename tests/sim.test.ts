import { describe, expect, it } from 'vitest';
import { damageEnemy, hurtPlayer, waveScale } from '../src/sim/combat';
import { PERKS, RARITIES } from '../src/sim/content/perks';
import { restore, snapshot } from '../src/sim/save';
import { MAX_SLOTS, openChest, refreshStats, rollChoices } from '../src/sim/systems/leveling';
import { abilityPower } from '../src/sim/systems/abilities';
import { getChunk, isBlocked } from '../src/sim/map';
import { addEnemyProjectile, addHazard, spawnEnemy } from '../src/sim/entities';
import { startWave } from '../src/sim/systems/waves';
import { WEAPONS } from '../src/sim/content/weapons';
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

  it('spawns the new bosses in rotation and they fight', () => {
    for (const [wave, type] of [[15, 'broodmother'], [25, 'wyrm']] as const) {
      const s = createGame(17, [{ id: 'p1', charId: 'knight' }], { godMode: true });
      startWave(s, wave);
      const boss = s.enemies.find((e) => e.boss)!;
      expect(boss.type).toBe(type);
      let attacks = 0;
      for (let i = 0; i < 60 * 20; i++) {
        step(s, { p1: botInput(s, 'p1') });
        attacks += s.eprojectiles.length + s.hazards.length;
        if (boss.dead) break;
      }
      expect(attacks).toBeGreaterThan(0);
      expect(Number.isFinite(boss.x) && Number.isFinite(boss.y)).toBe(true);
      if (type === 'broodmother') expect(s.enemies.some((e) => e.type === 'egg') || s.kills > 0).toBe(true);
      if (type === 'wyrm' && !boss.dead) expect(boss.trail.length).toBeGreaterThan(4);
    }
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

  it('saves and restores a run without enemies', () => {
    const s = createGame(46, [{ id: 'p1', charId: 'ranger' }], { godMode: true });
    run(s, 2400);
    const save = JSON.parse(JSON.stringify(snapshot(s, 123)));
    expect(save.state.enemies.length).toBe(0);
    const r = restore(save)!;
    expect(r).not.toBeNull();
    expect(r.wave.n).toBe(s.wave.n);
    expect(r.mapSeed).toBe(s.mapSeed);
    expect(r.players[0].weapons).toEqual(s.players[0].weapons);
    expect(r.players[0].level).toBe(s.players[0].level);
    run(r, 600);
    expect(r.enemies.length).toBeGreaterThan(0);
    expect(restore({ ...save, v: -1 })).toBeNull();

    const b = createGame(47, [{ id: 'p1', charId: 'knight' }]);
    startWave(b, 10);
    const rb = restore(JSON.parse(JSON.stringify(snapshot(b, 0))))!;
    expect(rb.enemies.some((e) => e.boss)).toBe(true);
  });
});
