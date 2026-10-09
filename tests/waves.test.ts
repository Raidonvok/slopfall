import { describe, expect, it } from 'vitest';
import { damageEnemy, waveScale } from '../src/sim/combat';
import { startWave } from '../src/sim/systems/waves';
import { createGame, step } from '../src/sim/world';
import { botInput } from './helpers';

describe('waves and bosses', () => {
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
});
