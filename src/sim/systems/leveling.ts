import { ABILITY_MAX_LEVEL, CHARACTERS } from '../content/characters';
import { BONUSES, BONUS_IDS, PERKS, PERK_IDS } from '../content/perks';
import { MAX_WEAPON_LEVEL, WEAPONS, WEAPON_IDS } from '../content/weapons';
import { healPlayer } from '../combat';
import { rand, weightedPick } from '../rng';
import type { GameState, Player, Stats, UpgradeOption } from '../types';

export const MAX_SLOTS = 6;

export function xpForLevel(level: number): number {
  return Math.floor(6 + level * 6 + 0.32 * level * level);
}

export function computeStats(p: Player): Stats {
  const c = CHARACTERS[p.charId];
  const s: Stats = {
    might: 1, cooldown: 1, speed: c.speed, maxHp: c.hp, regen: 0, armor: 0, magnet: 75,
    area: 1, duration: 1, amount: 0, crit: 0.05, growth: 1, lifesteal: 0,
  };
  for (const k of Object.keys(c.mods) as (keyof Stats)[]) s[k] += c.mods[k] ?? 0;
  for (const perk of p.perks) PERKS[perk.id].apply(s, perk.level);
  for (const id in p.bonus) BONUSES[id].apply(s, p.bonus[id]);
  return s;
}

export function refreshStats(p: Player): void {
  const oldMax = p.stats.maxHp;
  p.stats = computeStats(p);
  if (p.stats.maxHp > oldMax) p.hp += p.stats.maxHp - oldMax;
  p.hp = Math.min(p.hp, p.stats.maxHp);
}

export function createPlayer(id: string, charId: string, x: number, y: number): Player {
  const c = CHARACTERS[charId];
  const p: Player = {
    id, charId, x, y, px: x, py: y, fx: 1, fy: 0, ax: 1, ay: 0,
    hp: c.hp, stats: null as unknown as Stats, radius: 14,
    level: 1, xp: 0, xpNext: xpForLevel(1),
    weapons: [{ id: c.weapon, level: 1, evolved: false, cd: 0.5, t: 0, r: 0 }],
    perks: [],
    abilityLevel: 1, abilityCd: 0, abilityMaxCd: c.ability.cd, abilityT: 0,
    invuln: 0, hurtT: 0, dashT: 0, dashX: 0, dashY: 0, dashCd: 0, dashMaxCd: 0, bonus: {},
    healBudget: 0, idleT: 0, anchorX: x, anchorY: y, skyfallCd: 0, skyfallN: 0,
    pendingLevels: 0, choices: null, dead: false, kills: 0, dmgDealt: {},
  };
  p.stats = computeStats(p);
  p.hp = p.stats.maxHp;
  return p;
}

export function addXp(s: GameState, p: Player, amount: number): void {
  if (p.dead) return;
  p.xp += amount * p.stats.growth;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = xpForLevel(p.level);
    p.pendingLevels++;
    s.events.push({ t: 'levelup', pid: p.id });
  }
}

function upgradePool(p: Player): UpgradeOption[] {
  const pool: UpgradeOption[] = [];
  for (const id of WEAPON_IDS) {
    const w = p.weapons.find((x) => x.id === id);
    if (w) {
      if (w.level < MAX_WEAPON_LEVEL) pool.push({ kind: 'weapon', id, level: w.level + 1 });
    } else if (p.weapons.length < MAX_SLOTS) {
      pool.push({ kind: 'weapon', id, level: 1 });
    }
  }
  for (const id of PERK_IDS) {
    const k = p.perks.find((x) => x.id === id);
    if (k) {
      if (k.level < PERKS[id].max) pool.push({ kind: 'perk', id, level: k.level + 1 });
    } else if (p.perks.length < MAX_SLOTS) {
      pool.push({ kind: 'perk', id, level: 1 });
    }
  }
  if (p.abilityLevel < ABILITY_MAX_LEVEL) pool.push({ kind: 'ability', id: 'ability', level: p.abilityLevel + 1 });
  return pool;
}

const optionWeight = (o: UpgradeOption) => (o.kind === 'ability' ? 1.1 : o.level > 1 ? 1.4 : 1);

function bonusOption(p: Player, id: string): UpgradeOption {
  return { kind: 'bonus', id, level: (p.bonus[id] ?? 0) + 1 };
}

/**
 * Up to `count` distinct options. Once the regular pool runs dry the
 * remaining slots are filled with endless bonus shards, so a level-up is
 * never just a heal.
 */
export function rollChoices(s: GameState, p: Player, count = 3): UpgradeOption[] {
  const pool = upgradePool(p);
  const out: UpgradeOption[] = [];
  while (out.length < count && pool.length > 0) {
    const o = weightedPick(s, pool, optionWeight);
    out.push(o);
    pool.splice(pool.indexOf(o), 1);
  }
  if (out.length < count) {
    const bonus = [...BONUS_IDS];
    while (out.length < count && bonus.length > 0) {
      const id = bonus.splice(Math.floor(rand(s) * bonus.length), 1)[0];
      out.push(bonusOption(p, id));
    }
    if (p.hp < p.stats.maxHp * 0.5) out[out.length - 1] = { kind: 'heal', id: 'heal', level: 0 };
  }
  return out;
}

export function applyOption(s: GameState, p: Player, o: UpgradeOption): void {
  if (o.kind === 'weapon') {
    const w = p.weapons.find((x) => x.id === o.id);
    if (w) w.level = o.level;
    else p.weapons.push({ id: o.id, level: 1, evolved: false, cd: 0.2, t: 0, r: 0 });
  } else if (o.kind === 'perk') {
    const k = p.perks.find((x) => x.id === o.id);
    if (k) k.level = o.level;
    else p.perks.push({ id: o.id, level: 1 });
    refreshStats(p);
  } else if (o.kind === 'ability') {
    p.abilityLevel = o.level;
  } else if (o.kind === 'bonus') {
    p.bonus[o.id] = o.level;
    refreshStats(p);
  } else {
    healPlayer(s, p, p.stats.maxHp * 0.5);
  }
}

export function chooseUpgrade(s: GameState, p: Player, index: number): void {
  if (!p.choices) return;
  const o = p.choices[Math.max(0, Math.min(index, p.choices.length - 1))];
  applyOption(s, p, o);
  p.choices = null;
  s.events.push({ t: 'sfx', name: 'select' });
}

export function updateLeveling(s: GameState, p: Player): void {
  if (!p.dead && !p.choices && p.pendingLevels > 0) {
    p.pendingLevels--;
    p.choices = rollChoices(s, p);
  }
}

export function optionName(o: UpgradeOption): string {
  if (o.kind === 'weapon') return `${WEAPONS[o.id].name} ${o.level > 1 ? 'Lv ' + o.level : '(new)'}`;
  if (o.kind === 'perk') return `${PERKS[o.id].name} ${o.level > 1 ? 'Lv ' + o.level : '(new)'}`;
  if (o.kind === 'ability') return `Ability Lv ${o.level}`;
  if (o.kind === 'bonus') return BONUSES[o.id].name;
  return 'Heal';
}

/** Chest: evolve a weapon if possible, otherwise grant random upgrades. */
export function openChest(s: GameState, p: Player, big: boolean): void {
  const items: string[] = [];
  let count = big ? 3 : 1;
  for (const w of p.weapons) {
    const def = WEAPONS[w.id];
    if (!w.evolved && w.level >= MAX_WEAPON_LEVEL && p.perks.some((k) => k.id === def.evoPerk)) {
      w.evolved = true;
      items.push(`EVOLUTION: ${def.evoName}!`);
      count--;
      break;
    }
  }
  for (let i = 0; i < count; i++) {
    const pool = upgradePool(p).filter((o) => o.level > 1);
    const opts = pool.length > 0 ? pool : upgradePool(p);
    const o = opts.length > 0
      ? opts[Math.floor(rand(s) * opts.length)]
      : bonusOption(p, BONUS_IDS[Math.floor(rand(s) * BONUS_IDS.length)]);
    applyOption(s, p, o);
    items.push(optionName(o));
  }
  s.events.push({ t: 'chest', pid: p.id, items });
}
