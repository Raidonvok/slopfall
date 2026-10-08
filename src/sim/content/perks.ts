import type { Stats } from '../types';

export interface PerkDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  max: number;
  desc: string; // per level
  apply: (s: Stats, level: number) => void;
}

const defs: PerkDef[] = [
  { id: 'might', name: 'Might', icon: '✊', color: '#ff5d5d', max: 5, desc: '+10% damage',
    apply: (s, l) => { s.might += 0.1 * l; } },
  { id: 'haste', name: 'Haste', icon: '⌛', color: '#ffd166', max: 5, desc: '-8% weapon & ability cooldown',
    apply: (s, l) => { s.cooldown *= 1 - 0.08 * l; } },
  { id: 'swift', name: 'Swiftness', icon: '»', color: '#7ae7ff', max: 5, desc: '+8% movement speed',
    apply: (s, l) => { s.speed *= 1 + 0.08 * l; } },
  { id: 'vitality', name: 'Vitality', icon: '♥', color: '#ff6b9a', max: 5, desc: '+20 max HP',
    apply: (s, l) => { s.maxHp += 20 * l; } },
  { id: 'regen', name: 'Regeneration', icon: '✚', color: '#6bff8f', max: 5, desc: '+0.4 HP per second',
    apply: (s, l) => { s.regen += 0.4 * l; } },
  { id: 'armor', name: 'Armor', icon: '⬢', color: '#b0b8c8', max: 5, desc: '-1 damage taken per hit',
    apply: (s, l) => { s.armor += l; } },
  { id: 'magnet', name: 'Magnet', icon: '∪', color: '#5d9bff', max: 5, desc: '+30% pickup range',
    apply: (s, l) => { s.magnet *= 1 + 0.3 * l; } },
  { id: 'area', name: 'Area', icon: '◎', color: '#ff9f43', max: 5, desc: '+10% area of effect',
    apply: (s, l) => { s.area += 0.1 * l; } },
  { id: 'duration', name: 'Duration', icon: '∞', color: '#c38bff', max: 5, desc: '+12% effect duration',
    apply: (s, l) => { s.duration += 0.12 * l; } },
  { id: 'multishot', name: 'Multishot', icon: '⁂', color: '#ffe66d', max: 2, desc: '+1 projectile amount',
    apply: (s, l) => { s.amount += l; } },
  { id: 'crit', name: 'Critical', icon: '✷', color: '#ff4fd8', max: 5, desc: '+5% critical hit chance',
    apply: (s, l) => { s.crit += 0.05 * l; } },
  { id: 'growth', name: 'Growth', icon: '❖', color: '#9dff6b', max: 5, desc: '+10% experience gained',
    apply: (s, l) => { s.growth += 0.1 * l; } },
];

export const PERKS: Record<string, PerkDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const PERK_IDS = defs.map((d) => d.id);

/** Endless stackable upgrades offered once every weapon and perk is maxed. */
export interface BonusDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  apply: (s: Stats, count: number) => void;
}

const bonusDefs: BonusDef[] = [
  { id: 'power', name: 'Power Shard', icon: '◆', color: '#ff5d5d', desc: '+5% damage (stacks forever)',
    apply: (s, n) => { s.might += 0.05 * n; } },
  { id: 'life', name: 'Life Shard', icon: '♥', color: '#ff6b9a', desc: '+15 max HP (stacks forever)',
    apply: (s, n) => { s.maxHp += 15 * n; } },
  { id: 'time', name: 'Time Shard', icon: '⌛', color: '#ffd166', desc: '-3% cooldowns (stacks up to 15 times)',
    apply: (s, n) => { s.cooldown *= Math.pow(0.97, Math.min(n, 15)); } },
  { id: 'reach', name: 'Reach Shard', icon: '◎', color: '#ff9f43', desc: '+5% area (stacks forever)',
    apply: (s, n) => { s.area += 0.05 * n; } },
  { id: 'fortune', name: 'Fortune Shard', icon: '✷', color: '#ff4fd8', desc: '+3% crit chance (stacks forever)',
    apply: (s, n) => { s.crit += 0.03 * n; } },
];

export const BONUSES: Record<string, BonusDef> = Object.fromEntries(bonusDefs.map((d) => [d.id, d]));
export const BONUS_IDS = bonusDefs.map((d) => d.id);
