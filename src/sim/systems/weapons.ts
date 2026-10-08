import { baseWeaponStats, WEAPONS, weaponStats, type WStats } from '../content/weapons';
import { damageEnemy, healPlayer, isOverclocked, isRaging, slowEnemy } from '../combat';
import { addProjectile, addZone } from '../entities';
import { resolveObstacles } from '../map';
import { rand } from '../rng';
import { forEnemiesInCircle, nearestEnemy } from '../spatial';
import type { Enemy, GameState, Player, Projectile, WeaponInst } from '../types';

const TAU = Math.PI * 2;

function aimAngle(p: Player): number {
  if (p.ax * p.ax + p.ay * p.ay > 1) return Math.atan2(p.ay, p.ax);
  return Math.atan2(p.fy, p.fx);
}

const findPlayer = (s: GameState, id: string) => s.players.find((p) => p.id === id);

/** Damages enemies in a circular sector. */
function arcHit(s: GameState, p: Player, src: string, range: number, ang: number, arc: number, st: WStats): void {
  forEnemiesInCircle(p.x, p.y, range, (e) => {
    const dx = e.x - p.x, dy = e.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (arc < TAU) {
      const diff = Math.abs(((Math.atan2(dy, dx) - ang + Math.PI * 3) % TAU) - Math.PI);
      if (diff > arc / 2 + e.radius / d) return;
    }
    damageEnemy(s, e, st.dmg, p, src, dx / d, dy / d, st.knock);
  });
}

export function chainLightning(
  s: GameState, owner: Player, src: string, fromX: number, fromY: number,
  first: Enemy, chains: number, range: number, dmg: number,
): void {
  const pts = [fromX, fromY];
  const hit = new Set<number>();
  let cur: Enemy | null = first;
  for (let i = 0; i <= chains && cur; i++) {
    hit.add(cur.id);
    pts.push(cur.x, cur.y);
    const cx = cur.x, cy = cur.y;
    damageEnemy(s, cur, dmg, owner, src, 0, 0, 0);
    cur = nearestEnemy(s, cx, cy, range, (e) => hit.has(e.id));
  }
  addZone(s, { owner: owner.id, src, kind: 'bolt', x: fromX, y: fromY, r: 0, pts, life: 0.22 });
}

function countOwned<T extends { owner: string; dead: boolean }>(arr: T[], owner: string, pred: (x: T) => boolean): number {
  let n = 0;
  for (const x of arr) if (!x.dead && x.owner === owner && pred(x)) n++;
  return n;
}

export function updateWeapons(s: GameState, p: Player, dt: number): void {
  const rate = isRaging(p) ? 1.5 : 1;
  for (const w of p.weapons) {
    const st = weaponStats(p, w);
    w.cd -= dt * rate;
    switch (w.id) {
      case 'sword': fireSword(s, p, w, st); break;
      case 'bolt': fireBolt(s, p, w, st); break;
      case 'arrow': fireArrow(s, p, w, st); break;
      case 'orbs': updateOrbs(s, p, w, st, dt); break;
      case 'axe': fireAxe(s, p, w, st); break;
      case 'lightning': fireLightning(s, p, w, st); break;
      case 'aura': updateAura(s, p, w, st); break;
      case 'nova': fireNova(s, p, w, st); break;
      case 'turret': deployTurret(s, p, w, st); break;
      case 'frost': fireFrost(s, p, w, st); break;
    }
  }
}

function fireSword(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  w.cd = st.cd;
  const range = 95 * st.area;
  const base = aimAngle(p);
  if (w.evo === 'holyblade') {
    arcHit(s, p, 'sword', range * 1.2, base, TAU, st);
    addZone(s, { owner: p.id, src: 'sword', kind: 'slash2', x: p.x, y: p.y, r: range * 1.2, ang: base, arc: TAU, life: 0.25 });
  } else {
    const n = Math.max(1, st.amount);
    const kind = w.evo === 'bladedancer' ? 'slash3' : 'slash';
    for (let i = 0; i < n; i++) {
      const ang = base + (i * TAU) / n;
      arcHit(s, p, 'sword', range, ang, 2.1, st);
      addZone(s, { owner: p.id, src: 'sword', kind, x: p.x, y: p.y, r: range, ang, arc: 2.1, life: 0.18 });
    }
  }
  s.events.push({ t: 'sfx', name: 'swing' });
}

function fireBolt(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  const t = nearestEnemy(s, p.x, p.y, 650);
  if (!t) return;
  w.cd = st.cd;
  const a0 = Math.atan2(t.y - p.y, t.x - p.x);
  for (let i = 0; i < st.amount; i++) {
    const a = a0 + (i - (st.amount - 1) / 2) * 0.3;
    addProjectile(s, {
      owner: p.id, src: 'bolt', kind: w.evo === 'prism' ? 'prism' : w.evolved ? 'bolt2' : 'bolt', x: p.x, y: p.y,
      vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, speed: st.speed,
      dmg: st.dmg, radius: 7 * st.area, pierce: st.pierce, life: st.duration, knock: st.knock,
      homing: w.evo === 'prism' ? 1.5 : 7,
    });
  }
  s.events.push({ t: 'sfx', name: 'bolt' });
}

function fireArrow(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  w.cd = st.cd;
  const t = nearestEnemy(s, p.x, p.y, 700);
  const a0 = t ? Math.atan2(t.y - p.y, t.x - p.x) : aimAngle(p);
  for (let i = 0; i < st.amount; i++) {
    const a = a0 + (i - (st.amount - 1) / 2) * 0.12;
    addProjectile(s, {
      owner: p.id, src: 'arrow', kind: w.evolved ? 'arrow2' : 'arrow', x: p.x, y: p.y,
      vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, speed: st.speed,
      dmg: st.dmg, radius: 6 * st.area, pierce: st.pierce, life: st.duration, knock: st.knock,
    });
  }
  s.events.push({ t: 'sfx', name: 'arrow' });
}

function updateOrbs(s: GameState, p: Player, w: WeaponInst, st: WStats, dt: number): void {
  w.t = (w.t + st.speed * dt) % TAU;
  w.r = 92 * st.area;
  const alive = countOwned(s.projectiles, p.id, (x) => x.src === 'orbs');
  const spawn = (life: number) => {
    for (let i = 0; i < st.amount; i++) {
      addProjectile(s, {
        owner: p.id, src: 'orbs', kind: w.evolved ? 'orb2' : 'orb', x: p.x, y: p.y,
        dmg: st.dmg, radius: 13 * Math.sqrt(st.area), pierce: 999, life, knock: st.knock,
        hitRate: 0.45, data: (i * TAU) / st.amount,
      });
    }
  };
  if (w.evolved) {
    if (alive !== st.amount) {
      for (const pr of s.projectiles) if (pr.owner === p.id && pr.src === 'orbs') pr.dead = true;
      spawn(1e6);
    }
  } else if (w.cd <= 0 && alive === 0) {
    spawn(st.duration);
    w.cd = st.cd + st.duration;
  }
}

function fireAxe(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  w.cd = st.cd;
  const base = aimAngle(p);
  const twin = w.evo === 'twinreavers';
  for (let i = 0; i < st.amount; i++) {
    const a = twin ? base + (i * TAU) / st.amount : base + (i - (st.amount - 1) / 2) * 0.35;
    addProjectile(s, {
      owner: p.id, src: 'axe', kind: twin ? 'axe3' : w.evolved ? 'axe2' : 'axe', x: p.x, y: p.y,
      vx: Math.cos(a), vy: Math.sin(a), speed: st.speed, data: st.duration / 2,
      dmg: st.dmg, radius: 14 * st.area, pierce: 999, life: st.duration * 2 + 2, knock: st.knock, hitRate: 0.35,
    });
  }
  s.events.push({ t: 'sfx', name: 'swing' });
}

function fireLightning(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  const candidates = s.enemies.filter((e) => !e.dead && !e.intangible && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 550 * 550);
  if (candidates.length === 0) return;
  w.cd = st.cd;
  for (let i = 0; i < st.amount; i++) {
    const e = candidates[Math.floor(rand(s) * candidates.length)];
    if (e.dead) continue;
    chainLightning(s, p, 'lightning', e.x, e.y - 500, e, st.pierce, 170 * st.area, st.dmg);
  }
  s.events.push({ t: 'sfx', name: 'zap' });
}

function updateAura(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  w.r = 85 * st.area;
  if (w.cd > 0) return;
  w.cd = st.cd;
  forEnemiesInCircle(p.x, p.y, w.r, (e) => {
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    damageEnemy(s, e, st.dmg, p, 'aura', dx / d, dy / d, st.knock);
    slowEnemy(e, w.evolved ? 0.35 : 0.15, 0.6);
  });
  if (w.evolved) healPlayer(s, p, 0.5);
}

function fireNova(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  w.cd = st.cd;
  if (w.evo === 'supernova') {
    addZone(s, {
      owner: p.id, src: 'nova', kind: 'nova3', x: p.x, y: p.y,
      r: 170 * st.area, r0: 12, life: st.duration * 1.4, dmg: st.dmg, knock: st.knock,
    });
    s.events.push({ t: 'shake', v: 6 });
  }
  for (let i = 0; w.evo !== 'supernova' && i < st.amount; i++) {
    addZone(s, {
      owner: p.id, src: 'nova', kind: w.evolved ? 'nova2' : 'nova', x: p.x, y: p.y,
      r: 170 * st.area, r0: 12, life: st.duration, delay: i * 0.3, dmg: st.dmg, knock: st.knock,
    });
  }
  s.events.push({ t: 'sfx', name: 'nova' });
}

function deployTurret(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  if (countOwned(s.turrets, p.id, () => true) >= st.amount) return;
  w.cd = st.cd;
  placeTurret(s, p, st.duration);
}

export function placeTurret(s: GameState, p: Player, life: number): void {
  const a = rand(s) * TAU;
  const pos = { x: p.x + Math.cos(a) * 30, y: p.y + Math.sin(a) * 30 };
  resolveObstacles(s.mapSeed, pos, 12);
  s.turrets.push({
    id: s.nextId++, owner: p.id, x: pos.x, y: pos.y,
    life, maxLife: life, cd: 0.3, ang: a, dead: false,
  });
  s.events.push({ t: 'sfx', name: 'deploy' });
}

function fireFrost(s: GameState, p: Player, w: WeaponInst, st: WStats): void {
  if (w.cd > 0) return;
  w.cd = st.cd;
  const a0 = rand(s) * TAU;
  for (let i = 0; i < st.amount; i++) {
    const a = a0 + (i * TAU) / st.amount;
    addProjectile(s, {
      owner: p.id, src: 'frost', kind: w.evolved ? 'shard2' : 'shard', x: p.x, y: p.y,
      vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, speed: st.speed, ang: a,
      dmg: st.dmg, radius: 7 * st.area, pierce: st.pierce, life: st.duration, knock: st.knock,
      slow: w.evolved ? 0.9 : 0.5,
    });
  }
  s.events.push({ t: 'sfx', name: 'frost' });
}

// ---------------------------------------------------------------------------

/** Mortar shell explosion: a one-shot area zone (radius stored in `data`). */
function detonate(s: GameState, pr: Projectile): void {
  addZone(s, { owner: pr.owner, src: pr.src, kind: 'boom', x: pr.x, y: pr.y, r: pr.data, life: 0.05, dmg: pr.dmg, knock: 220 });
}

function steer(pr: Projectile, tx: number, ty: number, turn: number): void {
  const cur = Math.atan2(pr.vy, pr.vx);
  const want = Math.atan2(ty - pr.y, tx - pr.x);
  let diff = ((want - cur + Math.PI * 3) % TAU) - Math.PI;
  diff = Math.max(-turn, Math.min(turn, diff));
  const a = cur + diff;
  pr.vx = Math.cos(a) * pr.speed;
  pr.vy = Math.sin(a) * pr.speed;
}

export function updateProjectiles(s: GameState, dt: number): void {
  for (const pr of s.projectiles) {
    if (pr.dead) continue;
    pr.age += dt;
    pr.life -= dt;
    if (pr.life <= 0) {
      pr.dead = true;
      if (pr.kind === 'shell') detonate(s, pr);
      continue;
    }
    const owner = findPlayer(s, pr.owner);
    if (!owner) {
      pr.dead = true;
      continue;
    }
    let dirX = 0, dirY = 0;
    if (pr.src === 'orbs') {
      const w = owner.weapons.find((x) => x.id === 'orbs');
      if (!w) {
        pr.dead = true;
        continue;
      }
      const a = w.t + pr.data;
      pr.x = owner.x + Math.cos(a) * w.r;
      pr.y = owner.y + Math.sin(a) * w.r;
    } else if (pr.src === 'axe') {
      const T = pr.data;
      pr.ang += 16 * dt;
      if (pr.age < T) {
        const f = 1 - pr.age / T;
        pr.x += pr.vx * pr.speed * f * dt;
        pr.y += pr.vy * pr.speed * f * dt;
      } else {
        const dx = owner.x - pr.x, dy = owner.y - pr.y, d = Math.hypot(dx, dy) || 1;
        const sp = pr.speed * Math.min(1.5, 0.3 + (pr.age - T) / T);
        pr.x += (dx / d) * sp * dt;
        pr.y += (dy / d) * sp * dt;
        if (d < 24) pr.dead = true;
      }
    } else {
      if (pr.homing > 0) {
        const t = nearestEnemy(s, pr.x, pr.y, 450);
        if (t) steer(pr, t.x, t.y, pr.homing * dt);
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      const sp = Math.hypot(pr.vx, pr.vy) || 1;
      dirX = pr.vx / sp;
      dirY = pr.vy / sp;
    }
    if ((pr.x - owner.x) ** 2 + (pr.y - owner.y) ** 2 > 1600 * 1600) pr.dead = true;
    if (pr.dead) continue;

    forEnemiesInCircle(pr.x, pr.y, pr.radius, (e) => {
      const nt = pr.hits[e.id];
      if (nt !== undefined && nt > s.time) return;
      if (e.intangible) return;
      let kx = dirX, ky = dirY;
      if (kx === 0 && ky === 0) {
        const dx = e.x - pr.x, dy = e.y - pr.y, d = Math.hypot(dx, dy) || 1;
        kx = dx / d;
        ky = dy / d;
      }
      damageEnemy(s, e, pr.dmg, owner, pr.src, kx, ky, pr.knock);
      if (pr.slow > 0) slowEnemy(e, pr.slow, pr.slow > 0.8 ? 2 : 1.5);
      if (pr.hitRate > 0) {
        pr.hits[e.id] = s.time + pr.hitRate;
      } else {
        pr.hits[e.id] = 1e9;
        pr.pierce--;
        if (pr.pierce < 0) {
          pr.dead = true;
          if (pr.kind === 'shell') detonate(s, pr);
          return true;
        }
      }
    });

    if (pr.hitRate > 0 && (s.tick & 63) === 0) {
      for (const k in pr.hits) if (pr.hits[k] < s.time) delete pr.hits[k];
    }
  }
}

export function updateZones(s: GameState, dt: number): void {
  for (const z of s.zones) {
    if (z.dead) continue;
    if (z.delay > 0) {
      z.delay -= dt;
      continue;
    }
    z.life -= dt;
    if (z.life <= 0) z.dead = true;
    const owner = findPlayer(s, z.owner);
    if (!owner || z.dmg <= 0) continue;
    if (z.kind === 'nova' || z.kind === 'nova2' || z.kind === 'nova3') {
      const prog = 1 - Math.max(0, z.life) / z.maxLife;
      const cur = z.r0 + (z.r - z.r0) * prog;
      forEnemiesInCircle(z.x, z.y, cur, (e) => {
        if (z.hits[e.id]) return;
        z.hits[e.id] = 1;
        const dx = e.x - z.x, dy = e.y - z.y, d = Math.hypot(dx, dy) || 1;
        damageEnemy(s, e, z.dmg, owner, z.src, dx / d, dy / d, z.knock);
      });
    } else if (!z.fired) {
      z.fired = true;
      forEnemiesInCircle(z.x, z.y, z.r, (e) => {
        const dx = e.x - z.x, dy = e.y - z.y, d = Math.hypot(dx, dy) || 1;
        damageEnemy(s, e, z.dmg, owner, z.src, dx / d, dy / d, z.knock);
      });
      if (z.kind === 'boom') {
        s.events.push({ t: 'explode', x: z.x, y: z.y, r: z.r, color: '#ffb347' });
      } else if (z.kind === 'meteor') {
        s.events.push({ t: 'explode', x: z.x, y: z.y, r: z.r, color: '#ff7a1a' });
        s.events.push({ t: 'shake', v: 12 });
      } else if (z.kind === 'rain') {
        s.events.push({ t: 'explode', x: z.x, y: z.y, r: z.r * 0.6, color: '#b6ff7a' });
      }
    }
  }
}

export function updateTurrets(s: GameState, dt: number): void {
  for (const t of s.turrets) {
    if (t.dead) continue;
    t.life -= dt;
    if (t.life <= 0) {
      t.dead = true;
      continue;
    }
    const owner = findPlayer(s, t.owner);
    if (!owner) {
      t.dead = true;
      continue;
    }
    const w = owner.weapons.find((x) => x.id === 'turret');
    const st = w ? weaponStats(owner, w) : baseWeaponStats(WEAPONS.turret, 1);
    t.cd -= dt * (isOverclocked(owner) ? 3 : 1);
    const target = nearestEnemy(s, t.x, t.y, 480);
    if (!target) continue;
    t.ang = Math.atan2(target.y - t.y, target.x - t.x);
    if (t.cd > 0) continue;
    if (w?.evo === 'tesla') {
      t.cd = 0.8;
      chainLightning(s, owner, 'turret', t.x, t.y, target, 3, 160, st.dmg);
    } else if (w?.evo === 'mortar') {
      t.cd = 1.2;
      const d = Math.hypot(target.x - t.x, target.y - t.y);
      const sp = 420;
      addProjectile(s, {
        owner: owner.id, src: 'turret', kind: 'shell', x: t.x, y: t.y,
        vx: Math.cos(t.ang) * sp, vy: Math.sin(t.ang) * sp, speed: sp,
        dmg: st.dmg, radius: 8, pierce: 0, life: Math.max(0.15, d / sp), data: 80 * st.area, knock: 0,
      });
    } else {
      t.cd = 0.5;
      addProjectile(s, {
        owner: owner.id, src: 'turret', kind: 'bullet', x: t.x, y: t.y,
        vx: Math.cos(t.ang) * st.speed, vy: Math.sin(t.ang) * st.speed, speed: st.speed,
        dmg: st.dmg, radius: 5, pierce: st.pierce, life: 1, knock: st.knock,
      });
    }
  }
}

export function updateMinions(s: GameState, dt: number): void {
  for (const m of s.minions) {
    if (m.dead) continue;
    m.life -= dt;
    m.cd -= dt;
    if (m.life <= 0) {
      m.dead = true;
      continue;
    }
    const owner = findPlayer(s, m.owner);
    if (!owner) {
      m.dead = true;
      continue;
    }
    const t = nearestEnemy(s, m.x, m.y, 600);
    let tx = owner.x, ty = owner.y;
    if (t) {
      tx = t.x;
      ty = t.y;
    }
    const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
    if (t || d > 60) {
      m.x += (dx / d) * 190 * dt;
      m.y += (dy / d) * 190 * dt;
    }
    if (t && m.cd <= 0 && d < t.radius + 14) {
      m.cd = 0.5;
      damageEnemy(s, t, m.dmg, owner, 'raise', dx / d, dy / d, 120);
    }
  }
}
