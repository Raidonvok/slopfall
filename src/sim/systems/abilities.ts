import { CHARACTERS } from '../content/characters';
import { damageEnemy, waveScale } from '../combat';
import { addZone } from '../entities';
import { randRange } from '../rng';
import { forEnemiesInCircle } from '../spatial';
import type { GameState, InputCmd, Player } from '../types';
import { placeTurret } from './weapons';

/** Ability upgrades: +25% effect per level. */
export const abilityLevelMul = (p: Player) => 1 + 0.25 * (p.abilityLevel - 1);

/**
 * Damage multiplier for abilities. It follows the enemy HP curve so an
 * ability stays meaningful no matter how deep into the endless waves you are.
 */
export function abilityPower(s: GameState, p: Player): number {
  return waveScale(s.wave.n).hp * abilityLevelMul(p);
}

/** Active ability effect time (Rage / Overclock). */
export const abilityDuration = (p: Player) => 6 + (p.abilityLevel - 1);

export function abilityCooldown(p: Player): number {
  return CHARACTERS[p.charId].ability.cd * p.stats.cooldown * (1 - 0.06 * (p.abilityLevel - 1));
}

export function updateAbility(s: GameState, p: Player, cmd: InputCmd, dt: number): void {
  p.abilityCd = Math.max(0, p.abilityCd - dt);
  p.abilityT = Math.max(0, p.abilityT - dt);
  p.abilityMaxCd = abilityCooldown(p);
  if (!cmd.ability || p.abilityCd > 0) return;
  p.abilityCd = p.abilityMaxCd;
  s.events.push({ t: 'ability', pid: p.id, char: p.charId });
  switch (p.charId) {
    case 'knight': shieldBash(s, p); break;
    case 'mage': meteor(s, p); break;
    case 'ranger': dash(s, p, cmd); break;
    case 'necro': raiseDead(s, p); break;
    case 'engineer': overclock(s, p); break;
    case 'berserker': p.abilityT = abilityDuration(p); break;
  }
}

function shieldBash(s: GameState, p: Player): void {
  const r = 230 * p.stats.area * (1 + 0.1 * (p.abilityLevel - 1));
  const dmg = 30 * abilityPower(s, p);
  forEnemiesInCircle(p.x, p.y, r, (e) => {
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    damageEnemy(s, e, dmg, p, 'ability', dx / d, dy / d, 900);
  });
  p.invuln = 1.5;
  p.abilityT = 1.5;
  addZone(s, { owner: p.id, src: 'ability', kind: 'bash', x: p.x, y: p.y, r, life: 0.4 });
  s.events.push({ t: 'shake', v: 8 });
}

function meteor(s: GameState, p: Player): void {
  let ax = p.ax, ay = p.ay;
  const len = Math.hypot(ax, ay);
  if (len > 480) {
    ax = (ax / len) * 480;
    ay = (ay / len) * 480;
  }
  addZone(s, {
    owner: p.id, src: 'ability', kind: 'meteor', x: p.x + ax, y: p.y + ay,
    r: 170 * p.stats.area * (1 + 0.12 * (p.abilityLevel - 1)),
    delay: 0.7, life: 0.5, dmg: 150 * abilityPower(s, p), knock: 500,
  });
}

function dash(s: GameState, p: Player, cmd: InputCmd): void {
  let dx = cmd.mx, dy = cmd.my;
  if (dx === 0 && dy === 0) {
    dx = p.ax;
    dy = p.ay;
  }
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  const speed = 1000, time = 0.22;
  p.dashT = time;
  p.dashX = dx * speed;
  p.dashY = dy * speed;
  p.invuln = Math.max(p.invuln, time + 0.15);
  const dist = speed * time;
  const volleys = 7 + 2 * (p.abilityLevel - 1);
  const dmg = 50 * abilityPower(s, p);
  for (let i = 0; i < volleys; i++) {
    const f = i / (volleys - 1);
    addZone(s, {
      owner: p.id, src: 'ability', kind: 'rain',
      x: p.x + dx * dist * f + randRange(s, -50, 50), y: p.y + dy * dist * f + randRange(s, -50, 50),
      r: 70 * p.stats.area, delay: 0.25 + i * 0.05, life: 0.3, dmg, knock: 150,
    });
  }
}

function raiseDead(s: GameState, p: Player): void {
  const max = 8 + 2 * (p.abilityLevel - 1);
  const spots = s.corpses.filter((c) => s.time - c.t < 6 && (c.x - p.x) ** 2 + (c.y - p.y) ** 2 < 450 * 450).slice(-max);
  const min = 4 + p.abilityLevel;
  while (spots.length < min) {
    const a = (spots.length / min) * Math.PI * 2;
    spots.push({ x: p.x + Math.cos(a) * 60, y: p.y + Math.sin(a) * 60, t: s.time });
  }
  const dmg = 4.5 * abilityPower(s, p);
  for (const c of spots) {
    s.minions.push({
      id: s.nextId++, owner: p.id, x: c.x, y: c.y, px: c.x, py: c.y,
      life: 10 * p.stats.duration, cd: 0, dmg, dead: false,
    });
  }
  addZone(s, { owner: p.id, src: 'ability', kind: 'raise', x: p.x, y: p.y, r: 450, life: 0.6 });
}

function overclock(s: GameState, p: Player): void {
  p.abilityT = abilityDuration(p);
  for (let i = 0; i < p.abilityLevel; i++) placeTurret(s, p, p.abilityT);
}
