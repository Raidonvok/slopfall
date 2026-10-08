import type { Player, WeaponInst } from '../types';

export interface WStats {
  dmg: number;
  cd: number;
  amount: number;
  area: number;
  speed: number;
  pierce: number;
  duration: number;
  knock: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  base: WStats;
  levels: Partial<WStats>[]; // deltas for levels 2..8
  evoPerk: string;
  evoName: string;
  evoDesc: string;
  evo: Partial<WStats>;
}

export const MAX_WEAPON_LEVEL = 8;

const defs: WeaponDef[] = [
  {
    id: 'sword', name: 'Sword Arc', icon: '⚔', color: '#e8f1ff',
    desc: 'Slashes in a wide arc toward your aim.',
    base: { dmg: 20, cd: 1.2, amount: 1, area: 1, speed: 0, pierce: 999, duration: 0.2, knock: 260 },
    levels: [{ dmg: 6 }, { area: 0.15 }, { dmg: 8 }, { cd: -0.15 }, { amount: 1 }, { dmg: 10, area: 0.15 }, { dmg: 15 }],
    evoPerk: 'armor', evoName: 'Holy Blade', evoDesc: 'Spins a full circle of radiant steel.',
    evo: { dmg: 25, area: 0.4 },
  },
  {
    id: 'bolt', name: 'Magic Bolt', icon: '✦', color: '#6ee7ff',
    desc: 'Fires homing bolts at the nearest enemy.',
    base: { dmg: 11, cd: 1.0, amount: 1, area: 1, speed: 430, pierce: 0, duration: 2.2, knock: 80 },
    levels: [{ amount: 1 }, { dmg: 5 }, { cd: -0.15 }, { amount: 1 }, { dmg: 6 }, { pierce: 1 }, { amount: 1 }],
    evoPerk: 'haste', evoName: 'Arcane Storm', evoDesc: 'A relentless torrent of seeking bolts.',
    evo: { cd: -0.4, amount: 2, dmg: 8, pierce: 1 },
  },
  {
    id: 'arrow', name: 'Piercing Arrow', icon: '➶', color: '#b6ff7a',
    desc: 'Fast arrows that pierce through enemies.',
    base: { dmg: 14, cd: 0.9, amount: 1, area: 1, speed: 760, pierce: 2, duration: 1.2, knock: 60 },
    levels: [{ dmg: 5 }, { amount: 1 }, { pierce: 2 }, { cd: -0.15 }, { amount: 1 }, { dmg: 8 }, { pierce: 3 }],
    evoPerk: 'crit', evoName: 'Phantom Volley', evoDesc: 'Endless spectral arrows that never stop.',
    evo: { amount: 3, pierce: 30, dmg: 10 },
  },
  {
    id: 'orbs', name: 'Soul Orbs', icon: '◉', color: '#c084ff',
    desc: 'Orbs circle around you, hitting enemies.',
    base: { dmg: 10, cd: 4, amount: 2, area: 1, speed: 3.2, pierce: 999, duration: 3, knock: 140 },
    levels: [{ amount: 1 }, { area: 0.15, speed: 0.4 }, { dmg: 6 }, { duration: 1 }, { amount: 1 }, { dmg: 8 }, { amount: 1 }],
    evoPerk: 'duration', evoName: 'Eternal Souls', evoDesc: 'The orbs never fade.',
    evo: { dmg: 10, area: 0.2, speed: 0.8 },
  },
  {
    id: 'axe', name: 'Boomerang Axe', icon: '⟲', color: '#ffb347',
    desc: 'Throws an axe toward your aim that returns.',
    base: { dmg: 24, cd: 1.6, amount: 1, area: 1, speed: 560, pierce: 999, duration: 1.3, knock: 180 },
    levels: [{ dmg: 8 }, { amount: 1 }, { area: 0.2 }, { cd: -0.2 }, { dmg: 10 }, { amount: 1 }, { dmg: 12 }],
    evoPerk: 'might', evoName: 'Whirlwind', evoDesc: 'Huge spinning axes shred everything.',
    evo: { amount: 2, area: 0.5, dmg: 18 },
  },
  {
    id: 'lightning', name: 'Chain Lightning', icon: 'ϟ', color: '#fff36b',
    desc: 'Strikes a random enemy and chains to others.',
    base: { dmg: 15, cd: 1.8, amount: 1, area: 1, speed: 0, pierce: 2, duration: 0, knock: 0 },
    levels: [{ pierce: 1 }, { dmg: 5 }, { amount: 1 }, { cd: -0.2 }, { pierce: 1 }, { dmg: 6 }, { amount: 1 }],
    evoPerk: 'multishot', evoName: 'Thunderstorm', evoDesc: 'The sky itself rains lightning.',
    evo: { amount: 2, pierce: 2, dmg: 10 },
  },
  {
    id: 'aura', name: 'Holy Aura', icon: '☀', color: '#ffe08a',
    desc: 'Damages all enemies around you.',
    base: { dmg: 6, cd: 0.5, amount: 0, area: 1, speed: 0, pierce: 0, duration: 0, knock: 40 },
    levels: [{ area: 0.15 }, { dmg: 3 }, { area: 0.15 }, { cd: -0.08 }, { dmg: 4 }, { area: 0.2 }, { dmg: 5 }],
    evoPerk: 'vitality', evoName: 'Sanctuary', evoDesc: 'A vast holy field that also heals you.',
    evo: { area: 0.35, dmg: 8 },
  },
  {
    id: 'nova', name: 'Fire Nova', icon: '✹', color: '#ff7043',
    desc: 'Releases an expanding ring of fire.',
    base: { dmg: 22, cd: 3.0, amount: 1, area: 1, speed: 0, pierce: 999, duration: 0.6, knock: 220 },
    levels: [{ dmg: 8 }, { area: 0.2 }, { cd: -0.4 }, { amount: 1 }, { dmg: 12 }, { area: 0.25 }, { cd: -0.4 }],
    evoPerk: 'area', evoName: 'Inferno', evoDesc: 'Waves of hellfire engulf the battlefield.',
    evo: { amount: 2, dmg: 22, area: 0.4 },
  },
  {
    id: 'turret', name: 'Turret', icon: '♜', color: '#7dffcf',
    desc: 'Deploys an auto-firing turret.',
    base: { dmg: 8, cd: 5, amount: 1, area: 1, speed: 640, pierce: 0, duration: 10, knock: 40 },
    levels: [{ dmg: 4 }, { amount: 1 }, { duration: 4 }, { cd: -1 }, { dmg: 5 }, { amount: 1 }, { dmg: 6 }],
    evoPerk: 'magnet', evoName: 'Tesla Array', evoDesc: 'Turrets fire chain lightning.',
    evo: { amount: 1, dmg: 10 },
  },
  {
    id: 'frost', name: 'Frost Ring', icon: '❄', color: '#9ad8ff',
    desc: 'Bursts of ice shards that slow enemies.',
    base: { dmg: 9, cd: 2.4, amount: 6, area: 1, speed: 380, pierce: 1, duration: 0.7, knock: 40 },
    levels: [{ amount: 2 }, { dmg: 4 }, { cd: -0.3 }, { amount: 2 }, { pierce: 1 }, { dmg: 6 }, { amount: 4 }],
    evoPerk: 'swift', evoName: 'Absolute Zero', evoDesc: 'Shards freeze enemies solid.',
    evo: { amount: 8, dmg: 12, pierce: 3 },
  },
];

export const WEAPONS: Record<string, WeaponDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const WEAPON_IDS = defs.map((d) => d.id);

const STAT_KEYS: (keyof WStats)[] = ['dmg', 'cd', 'amount', 'area', 'speed', 'pierce', 'duration', 'knock'];

/** Weapon stats from its level only (no player modifiers). */
export function baseWeaponStats(def: WeaponDef, level: number, evolved: boolean): WStats {
  const s = { ...def.base };
  for (let i = 0; i < level - 1 && i < def.levels.length; i++) {
    const d = def.levels[i];
    for (const k of STAT_KEYS) s[k] += d[k] ?? 0;
  }
  if (evolved) for (const k of STAT_KEYS) s[k] += def.evo[k] ?? 0;
  return s;
}

/** Weapon stats with player modifiers applied. */
export function weaponStats(p: Player, w: WeaponInst): WStats {
  const s = baseWeaponStats(WEAPONS[w.id], w.level, w.evolved);
  s.cd = Math.max(0.05, s.cd * p.stats.cooldown);
  s.amount += p.stats.amount;
  s.area *= p.stats.area;
  s.duration *= p.stats.duration;
  return s;
}

const LABELS: Record<keyof WStats, string> = {
  dmg: 'damage', cd: 's cooldown', amount: 'amount', area: 'area', speed: 'speed',
  pierce: 'pierce', duration: 's duration', knock: 'knockback',
};

export function levelDesc(def: WeaponDef, level: number): string {
  if (level <= 1) return def.desc;
  const d = def.levels[level - 2];
  const parts: string[] = [];
  for (const k of STAT_KEYS) {
    const v = d[k];
    if (!v) continue;
    if (k === 'area') parts.push(`+${Math.round(v * 100)}% area`);
    else if (k === 'cd') parts.push(`${v}${LABELS[k]}`);
    else parts.push(`${v > 0 ? '+' : ''}${v} ${LABELS[k]}`);
  }
  return parts.join(', ');
}
