import type { Stats } from '../types';

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  color: string;
  accent: string;
  hp: number;
  speed: number;
  weapon: string;
  passive: string;
  mods: Partial<Stats>; // additive deltas on top of base stats
  ability: { name: string; desc: string; cd: number; upgrade: string };
}

const defs: CharacterDef[] = [
  {
    id: 'knight', name: 'Knight', title: 'The Unbroken', color: '#d9e2f2', accent: '#5b8cff',
    hp: 140, speed: 150, weapon: 'sword', passive: '+2 armor', mods: { armor: 2 },
    ability: { name: 'Shield Bash', desc: 'Blasts nearby enemies away and grants 1.5s invulnerability.', cd: 12, upgrade: '+25% damage, +10% radius, -6% cooldown' },
  },
  {
    id: 'mage', name: 'Mage', title: 'Arcane Scholar', color: '#7c5cff', accent: '#6ee7ff',
    hp: 90, speed: 160, weapon: 'bolt', passive: '-15% cooldowns', mods: { cooldown: -0.15 },
    ability: { name: 'Meteor', desc: 'Calls a meteor down at your cursor, dealing massive area damage and setting enemies on fire.', cd: 10, upgrade: '+25% damage, +12% radius, -6% cooldown' },
  },
  {
    id: 'ranger', name: 'Ranger', title: 'Wind Strider', color: '#4caf50', accent: '#b6ff7a',
    hp: 100, speed: 185, weapon: 'arrow', passive: '+10% crit chance', mods: { crit: 0.1 },
    ability: { name: 'Arrow Rain Dash', desc: 'Dash forward invulnerable, raining arrows along your path.', cd: 6, upgrade: '+25% damage, +2 arrow volleys, -6% cooldown' },
  },
  {
    id: 'necro', name: 'Necromancer', title: 'Lord of Bones', color: '#3d2b56', accent: '#c084ff',
    hp: 100, speed: 155, weapon: 'orbs', passive: 'Heal 1 HP per kill (max 4 HP/s)', mods: {},
    ability: { name: 'Raise Dead', desc: 'Raises fallen enemies as ghostly minions for 10s.', cd: 15, upgrade: '+2 minions, +25% minion damage, -6% cooldown' },
  },
  {
    id: 'engineer', name: 'Engineer', title: 'Gearwright', color: '#f2a03d', accent: '#7dffcf',
    hp: 110, speed: 150, weapon: 'turret', passive: '+15% area', mods: { area: 0.15 },
    ability: { name: 'Overclock', desc: 'Turrets fire 3x faster for 6s and deploys a bonus turret.', cd: 14, upgrade: '+1s duration, +1 bonus turret, -6% cooldown' },
  },
  {
    id: 'berserker', name: 'Berserker', title: 'Blood Reaver', color: '#c0392b', accent: '#ffb347',
    hp: 130, speed: 160, weapon: 'axe', passive: 'Up to +50% damage at low HP', mods: {},
    ability: { name: 'Rage', desc: '6s: +50% attack speed, +30% damage. Take +25% damage.', cd: 15, upgrade: '+1s duration, +10% rage damage, -6% cooldown' },
  },
];

export const CHARACTERS: Record<string, CharacterDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const ABILITY_MAX_LEVEL = 5;
export const CHARACTER_IDS = defs.map((d) => d.id);
