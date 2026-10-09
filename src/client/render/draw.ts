import { ENEMIES } from '../../sim/content/enemies';
import { wyrmSegmentRadius } from '../../sim/systems/bosses';
import { EGG_HATCH } from '../../sim/systems/enemies';
import type { Enemy, EnemyProjectile, Hazard, Minion, Pickup, Projectile, Turret, Zone } from '../../sim/types';
import { rgba } from './sprites';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

export { drawCharacterBody, drawPlayer } from './heroes';

// ---------------------------------------------------------------- enemies

export function enemyColor(e: Enemy): string {
  return ENEMIES[e.type]?.color ?? '#ffffff';
}

export function drawEnemy(ctx: Ctx, e: Enemy, x: number, y: number, t: number, dx: number, dy: number): void {
  drawEnemyBody(ctx, e, x, y, t, dx, dy);
  if (e.burnT > 0) drawFlames(ctx, x, y, e.radius, t);
}

/** Little flickering flames on a burning enemy. */
function drawFlames(ctx: Ctx, x: number, y: number, r: number, t: number): void {
  const n = r > 30 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const fx = x + (i - (n - 1) / 2) * r * 0.45;
    const h = r * (0.55 + 0.25 * Math.sin(t * 17 + i * 2.1));
    const fy = y - r * 0.55;
    ctx.fillStyle = 'rgba(255,110,30,0.85)';
    ctx.beginPath();
    ctx.moveTo(fx - r * 0.18, fy);
    ctx.quadraticCurveTo(fx - r * 0.2, fy - h * 0.6, fx, fy - h);
    ctx.quadraticCurveTo(fx + r * 0.2, fy - h * 0.6, fx + r * 0.18, fy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,120,0.9)';
    ctx.beginPath();
    ctx.ellipse(fx, fy - h * 0.3, r * 0.07, h * 0.25, 0, 0, TAU);
    ctx.fill();
  }
}

function drawEnemyBody(ctx: Ctx, e: Enemy, x: number, y: number, t: number, dx: number, dy: number): void {
  const r = e.radius;
  const col = e.flash > 0.06 ? '#ffffff' : enemyColor(e);
  if (e.boss) return drawBoss(ctx, e, x, y, t, dx, dy, col);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.85, r * 0.85, r * 0.3, 0, 0, TAU);
  ctx.fill();

  if (e.elite) {
    ctx.strokeStyle = `rgba(255,209,102,${0.6 + Math.sin(t * 6) * 0.3})`;
    ctx.lineWidth = 3;
    circle(ctx, x, y, r + 5);
    ctx.stroke();
  }
  ctx.fillStyle = col;
  switch (e.type) {
    case 'bat': {
      const flap = Math.sin(t * 22 + e.id) * 0.6;
      ctx.beginPath();
      for (const s of [-1, 1]) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + s * r * 2, y - r * (0.6 + flap));
        ctx.lineTo(x + s * r * 1.3, y + r * 0.4);
        ctx.closePath();
      }
      ctx.fill();
      circle(ctx, x, y, r * 0.7);
      ctx.fill();
      eyes(ctx, x, y - 1, r * 0.6, dx, dy, '#ff2b4a', 1.6);
      break;
    }
    case 'zombie': {
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = '#3f7a2c';
      ctx.fillRect(x - r, y + r * 0.3, r * 2, r * 0.7);
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + dx * r * 0.5 - dy * r * 0.6, y + dy * r * 0.5 + dx * r * 0.6);
      ctx.lineTo(x + dx * r * 1.6 - dy * r * 0.6, y + dy * r * 1.6 + dx * r * 0.6);
      ctx.moveTo(x + dx * r * 0.5 + dy * r * 0.6, y + dy * r * 0.5 - dx * r * 0.6);
      ctx.lineTo(x + dx * r * 1.6 + dy * r * 0.6, y + dy * r * 1.6 - dx * r * 0.6);
      ctx.stroke();
      eyes(ctx, x, y - r * 0.3, r, dx, dy, '#ff3030', 2.2);
      break;
    }
    case 'swarm': {
      const a = t * 6 + e.id;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const aa = a + (i * TAU) / 4;
        const rr = i % 2 === 0 ? r * 1.3 : r * 0.8;
        ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'archer':
    case 'skeleton': {
      circle(ctx, x, y, r);
      ctx.fill();
      ctx.fillStyle = '#1b1b22';
      circle(ctx, x - r * 0.35 + dx * 2, y - r * 0.15, r * 0.25);
      ctx.fill();
      circle(ctx, x + r * 0.35 + dx * 2, y - r * 0.15, r * 0.25);
      ctx.fill();
      ctx.fillRect(x - r * 0.4, y + r * 0.4, r * 0.8, r * 0.15);
      if (e.type === 'archer') {
        ctx.strokeStyle = '#a0784a';
        ctx.lineWidth = 2;
        const a = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.arc(x + dx * r, y + dy * r, r * 0.9, a - 1.2, a + 1.2);
        ctx.stroke();
      }
      break;
    }
    case 'slime':
    case 'slimelet': {
      const sq = Math.sin(t * 8 + e.id) * 0.12;
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.1, r * (1.1 + sq), r * (0.9 - sq), 0, Math.PI, TAU);
      ctx.lineTo(x + r * (1.1 + sq), y + r * 0.6);
      ctx.lineTo(x - r * (1.1 + sq), y + r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      circle(ctx, x - r * 0.4, y - r * 0.3, r * 0.2);
      ctx.fill();
      eyes(ctx, x, y, r, dx, dy, '#0b2a4a', r * 0.14);
      break;
    }
    case 'charger': {
      const a = e.state === 2 ? Math.atan2(e.ty, e.tx) : Math.atan2(dy, dx);
      const shake = e.state === 1 ? (Math.random() - 0.5) * 4 : 0;
      if (e.state === 1) ctx.fillStyle = Math.floor(t * 20) % 2 ? '#ffffff' : col;
      ctx.beginPath();
      ctx.moveTo(x + shake + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5);
      ctx.lineTo(x + shake + Math.cos(a + 2.4) * r, y + Math.sin(a + 2.4) * r);
      ctx.lineTo(x + shake - Math.cos(a) * r * 0.4, y - Math.sin(a) * r * 0.4);
      ctx.lineTo(x + shake + Math.cos(a - 2.4) * r, y + Math.sin(a - 2.4) * r);
      ctx.closePath();
      ctx.fill();
      if (e.state === 1) {
        ctx.strokeStyle = 'rgba(255,80,40,0.35)';
        ctx.lineWidth = r * 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + e.tx * 260, y + e.ty * 260);
        ctx.stroke();
      }
      break;
    }
    case 'exploder': {
      const fuse = e.state === 1;
      const pulse = 1 + Math.sin(t * (fuse ? 40 : 8)) * (fuse ? 0.15 : 0.06);
      ctx.fillStyle = fuse && Math.floor(t * 16) % 2 ? '#ffffff' : col;
      circle(ctx, x, y, r * pulse * (fuse ? 1.2 : 1));
      ctx.fill();
      ctx.strokeStyle = '#3a1010';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x + 4, y - r - 6, x + 2, y - r - 10);
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      circle(ctx, x + 2, y - r - 10, 2 + Math.random() * 2);
      ctx.fill();
      break;
    }
    case 'ghost': {
      ctx.globalAlpha = e.intangible ? 0.22 : 0.85;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.2, r, Math.PI, TAU);
      for (let i = 0; i <= 4; i++) {
        const xx = x + r - (i * 2 * r) / 4;
        ctx.lineTo(xx, y + r * 0.8 + Math.sin(t * 8 + i + e.id) * 3);
      }
      ctx.closePath();
      ctx.fill();
      eyes(ctx, x, y - r * 0.3, r, dx, dy, '#223', r * 0.16);
      ctx.globalAlpha = 1;
      break;
    }
    case 'egg': {
      const k = Math.min(1, e.t2 / EGG_HATCH);
      const pulse = 1 + Math.sin(t * (6 + k * 20)) * 0.06 * (0.3 + k);
      ctx.fillStyle = e.flash > 0.06 ? '#ffffff' : col;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.85 * pulse, r * 1.05 * pulse, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(160,40,80,${0.35 + k * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.4, y - r * 0.6);
      ctx.quadraticCurveTo(x, y - r * 0.1, x - r * 0.2, y + r * 0.7);
      ctx.moveTo(x + r * 0.45, y - r * 0.4);
      ctx.quadraticCurveTo(x + r * 0.1, y + r * 0.2, x + r * 0.35, y + r * 0.8);
      ctx.stroke();
      if (k > 0.6) {
        ctx.strokeStyle = '#2a1018';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.3, y - r * 0.2);
        ctx.lineTo(x, y);
        ctx.lineTo(x - r * 0.1, y + r * 0.3);
        ctx.stroke();
      }
      break;
    }
    case 'shaman': {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 + Math.PI / 6;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0c3b33';
      ctx.fillRect(x - r * 0.5, y - r * 0.25, r, r * 0.3);
      ctx.strokeStyle = '#7a5a3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + r * 1.1, y + r);
      ctx.lineTo(x + r * 1.1, y - r * 1.4);
      ctx.stroke();
      ctx.fillStyle = '#7dfff0';
      circle(ctx, x + r * 1.1, y - r * 1.5, 3 + Math.sin(t * 6) * 1);
      ctx.fill();
      break;
    }
    default:
      circle(ctx, x, y, r);
      ctx.fill();
  }
}

function eyes(ctx: Ctx, x: number, y: number, r: number, dx: number, dy: number, color: string, size: number): void {
  ctx.fillStyle = color;
  circle(ctx, x - r * 0.3 + dx * 1.5, y + dy * 1.5, size);
  ctx.fill();
  circle(ctx, x + r * 0.3 + dx * 1.5, y + dy * 1.5, size);
  ctx.fill();
}

function drawBoss(ctx: Ctx, e: Enemy, x: number, y: number, t: number, dx: number, dy: number, col: string): void {
  const r = e.radius;
  const enraged = e.hp < e.maxHp * 0.5;
  ctx.save();
  switch (e.type) {
    case 'slimeking': {
      let lift = 0, sq = Math.sin(t * 5) * 0.06;
      if (e.state === 1) sq = 0.25 * (1 - e.t2 / 0.55);
      if (e.state === 2) {
        const prog = 1 - e.t2 / 0.9;
        lift = Math.sin(prog * Math.PI) * 140;
        sq = -0.15;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.6, r * (1 - lift / 400), r * 0.35 * (1 - lift / 400), 0, 0, TAU);
      ctx.fill();
      const by = y - lift;
      ctx.fillStyle = enraged && e.flash <= 0 ? '#1f6fe0' : col;
      ctx.beginPath();
      ctx.ellipse(x, by, r * (1.15 + sq), r * (0.95 - sq), 0, Math.PI, TAU);
      ctx.lineTo(x + r * (1.15 + sq), by + r * 0.55);
      ctx.quadraticCurveTo(x, by + r * 0.8, x - r * (1.15 + sq), by + r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      circle(ctx, x - r * 0.45, by - r * 0.4, r * 0.18);
      ctx.fill();
      eyes(ctx, x, by - r * 0.1, r * 1.1, dx, dy, '#08203f', r * 0.12);
      // crown
      ctx.fillStyle = '#ffd166';
      const cy = by - r * (0.95 - sq);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, cy);
      ctx.lineTo(x - r * 0.55, cy - r * 0.5);
      ctx.lineTo(x - r * 0.25, cy - r * 0.25);
      ctx.lineTo(x, cy - r * 0.6);
      ctx.lineTo(x + r * 0.25, cy - r * 0.25);
      ctx.lineTo(x + r * 0.55, cy - r * 0.5);
      ctx.lineTo(x + r * 0.5, cy);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'necrolord': {
      const fy = y + Math.sin(t * 2) * 4;
      ctx.fillStyle = e.flash > 0.06 ? '#fff' : '#2a1840';
      ctx.beginPath();
      ctx.moveTo(x, fy - r * 1.3);
      ctx.lineTo(x + r, fy + r);
      for (let i = 0; i <= 5; i++) ctx.lineTo(x + r - (i * 2 * r) / 5, fy + r + (i % 2 ? 8 : 0));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#e8e0c8';
      circle(ctx, x, fy - r * 0.45, r * 0.42);
      ctx.fill();
      ctx.fillStyle = enraged ? '#ff3060' : '#c084ff';
      circle(ctx, x - r * 0.16 + dx * 2, fy - r * 0.5, r * 0.1);
      ctx.fill();
      circle(ctx, x + r * 0.16 + dx * 2, fy - r * 0.5, r * 0.1);
      ctx.fill();
      // orbiting skulls
      for (let i = 0; i < 3; i++) {
        const a = t * 1.5 + (i * TAU) / 3;
        ctx.fillStyle = '#d8d2bd';
        circle(ctx, x + Math.cos(a) * r * 1.6, fy + Math.sin(a) * r * 1.0, 6);
        ctx.fill();
      }
      break;
    }
    case 'golem': {
      let sx = 0;
      if (e.state === 1 || e.state === 3) sx = (Math.random() - 0.5) * 5;
      if (e.state === 1) {
        ctx.strokeStyle = 'rgba(255,60,40,0.3)';
        ctx.lineWidth = r * 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + e.tx * 520, y + e.ty * 520);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.85, r, r * 0.35, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      const pts = [[-1, -0.6], [-0.6, -1.05], [0.3, -1.1], [1, -0.55], [1.1, 0.4], [0.6, 1], [-0.5, 1], [-1.1, 0.35]];
      for (const [px, py] of pts) ctx.lineTo(x + sx + px * r, y + py * r);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = enraged ? '#ff5a1f' : '#ff9f43';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + sx - r * 0.5, y - r * 0.6);
      ctx.lineTo(x + sx - r * 0.1, y - r * 0.1);
      ctx.lineTo(x + sx - r * 0.3, y + r * 0.5);
      ctx.moveTo(x + sx + r * 0.6, y - r * 0.3);
      ctx.lineTo(x + sx + r * 0.2, y + r * 0.2);
      ctx.stroke();
      ctx.fillStyle = enraged ? '#ff5a1f' : '#ffd166';
      circle(ctx, x + sx - r * 0.3 + dx * 4, y - r * 0.45, r * 0.11);
      ctx.fill();
      circle(ctx, x + sx + r * 0.3 + dx * 4, y - r * 0.45, r * 0.11);
      ctx.fill();
      // arms
      ctx.fillStyle = '#7d6b57';
      circle(ctx, x + sx - r * 1.25, y + r * 0.2 + Math.sin(t * 3) * 3, r * 0.35);
      ctx.fill();
      circle(ctx, x + sx + r * 1.25, y + r * 0.2 - Math.sin(t * 3) * 3, r * 0.35);
      ctx.fill();
      break;
    }
    case 'broodmother': {
      const moving = e.state === 0 || e.state === 2;
      const ang = e.state === 2 || e.state === 3 ? Math.atan2(e.ty, e.tx) : Math.atan2(dy, dx);
      const fx = Math.cos(ang), fy = Math.sin(ang);
      if (e.state === 3) {
        ctx.strokeStyle = 'rgba(255,60,90,0.3)';
        ctx.lineWidth = r * 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + fx * 300, y + fy * 300);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.6, r * 1.2, r * 0.45, 0, 0, TAU);
      ctx.fill();
      // legs
      ctx.strokeStyle = '#2a0f1e';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 4; i++) {
          const la = ang + side * (0.55 + i * 0.5) + (moving ? Math.sin(t * 14 + i * 1.7 + side) * 0.18 : 0);
          const kx = x + Math.cos(la) * r * 1.15, ky = y + Math.sin(la) * r * 1.15 - r * 0.35;
          const ex = x + Math.cos(la) * r * 1.75, ey = y + Math.sin(la) * r * 1.75 + r * 0.25;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(la) * r * 0.4, y + Math.sin(la) * r * 0.4);
          ctx.lineTo(kx, ky);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }
      }
      // abdomen with hourglass
      const ax = x - fx * r * 0.75, ay = y - fy * r * 0.75;
      ctx.fillStyle = e.flash > 0.06 ? '#fff' : '#4a1830';
      ctx.beginPath();
      ctx.ellipse(ax, ay, r * 0.95, r * 0.8, ang, 0, TAU);
      ctx.fill();
      ctx.fillStyle = enraged ? '#ff3060' : '#d8344f';
      ctx.beginPath();
      ctx.moveTo(ax - fy * r * 0.25 - fx * r * 0.2, ay + fx * r * 0.25 - fy * r * 0.2);
      ctx.lineTo(ax + fy * r * 0.25 - fx * r * 0.2, ay - fx * r * 0.25 - fy * r * 0.2);
      ctx.lineTo(ax - fy * r * 0.25 + fx * r * 0.2, ay + fx * r * 0.25 + fy * r * 0.2);
      ctx.lineTo(ax + fy * r * 0.25 + fx * r * 0.2, ay - fx * r * 0.25 + fy * r * 0.2);
      ctx.closePath();
      ctx.fill();
      // head
      const hx = x + fx * r * 0.2, hy = y + fy * r * 0.2;
      ctx.fillStyle = col;
      circle(ctx, hx, hy, r * 0.6);
      ctx.fill();
      ctx.fillStyle = enraged ? '#ff2040' : '#ff6a8a';
      for (let i = 0; i < 6; i++) {
        const ea = ang + (i - 2.5) * 0.28;
        circle(ctx, hx + Math.cos(ea) * r * 0.38, hy + Math.sin(ea) * r * 0.38 - (i % 2) * 3, i % 2 ? 3 : 4.5);
        ctx.fill();
      }
      ctx.strokeStyle = '#1a0810';
      ctx.lineWidth = 4;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + fx * r * 0.5 - fy * sd * r * 0.15, hy + fy * r * 0.5 + fx * sd * r * 0.15);
        ctx.lineTo(hx + fx * r * 0.8 - fy * sd * r * 0.05, hy + fy * r * 0.8 + fx * sd * r * 0.05);
        ctx.stroke();
      }
      break;
    }
    case 'wyrm': {
      // body from the tail toward the head
      const n = e.trail.length / 2;
      for (let i = n - 1; i >= 1; i--) {
        const sx = e.trail[i * 2], sy = e.trail[i * 2 + 1];
        const sr = wyrmSegmentRadius(r, i);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + sr * 0.7, sr, sr * 0.35, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = i % 2 ? '#5fb8e8' : col;
        circle(ctx, sx, sy, sr);
        ctx.fill();
        ctx.strokeStyle = '#1d4a6a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#e8f8ff';
        circle(ctx, sx, sy - sr * 0.35, sr * 0.28);
        ctx.fill();
      }
      const ha = e.ang, hfx = Math.cos(ha), hfy = Math.sin(ha);
      if (e.state === 1) {
        ctx.strokeStyle = 'rgba(140,220,255,0.35)';
        ctx.lineWidth = r * 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + hfx * 480, y + hfy * 480);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ha);
      ctx.fillStyle = e.flash > 0.06 ? '#ffffff' : col;
      ctx.beginPath();
      ctx.ellipse(r * 0.15, 0, r * 1.15, r * 0.8, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#1d4a6a';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#e8f8ff';
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.4, sd * r * 0.5);
        ctx.lineTo(-r * 1.25, sd * r * 1.05);
        ctx.lineTo(-r * 0.15, sd * r * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = enraged ? '#ff4d8a' : '#1a3cff';
      for (const sd of [-1, 1]) {
        circle(ctx, r * 0.6, sd * r * 0.35, r * 0.14);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(200,240,255,0.7)';
      circle(ctx, r * 1.15, sd0(t) * r * 0.1, r * 0.12);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'voideye': {
      ctx.strokeStyle = '#5a1040';
      ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8 + Math.sin(t * 2 + i) * 0.2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        ctx.quadraticCurveTo(
          x + Math.cos(a + 0.3) * r * 1.6, y + Math.sin(a + 0.3) * r * 1.6,
          x + Math.cos(a) * r * 2 + Math.sin(t * 3 + i) * 6, y + Math.sin(a) * r * 2,
        );
        ctx.stroke();
      }
      ctx.fillStyle = e.flash > 0.06 ? '#ffd0e4' : '#f4ecf0';
      circle(ctx, x, y, r);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.stroke();
      const ix = x + dx * r * 0.35, iy = y + dy * r * 0.35;
      ctx.fillStyle = enraged ? '#ff1060' : col;
      circle(ctx, ix, iy, r * 0.5);
      ctx.fill();
      ctx.fillStyle = '#12020a';
      ctx.beginPath();
      ctx.ellipse(ix, iy, r * 0.12, r * 0.38, 0, 0, TAU);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- player stuff

export function projectileColor(kind: string): string {
  switch (kind) {
    case 'bolt': return '#6ee7ff';
    case 'bolt2': return '#b47cff';
    case 'arrow': return '#b6ff7a';
    case 'arrow2': return '#e6ffd0';
    case 'orb': return '#c084ff';
    case 'orb2': return '#ff7ae0';
    case 'axe': return '#ffb347';
    case 'axe2': return '#ff6a3d';
    case 'axe3': return '#ff4d8a';
    case 'prism': return '#fff6d6';
    case 'shell': return '#ffb347';
    case 'bullet': return '#7dffcf';
    case 'shard': return '#9ad8ff';
    case 'shard2': return '#e0f6ff';
    default: return '#ffffff';
  }
}

export function drawProjectile(ctx: Ctx, p: Projectile, x: number, y: number): void {
  const col = projectileColor(p.kind);
  const r = p.radius;
  switch (p.kind) {
    case 'bolt':
    case 'bolt2':
    case 'bullet': {
      const sp = Math.hypot(p.vx, p.vy) || 1;
      ctx.strokeStyle = rgba(col, 0.5);
      ctx.lineWidth = r * 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - (p.vx / sp) * r * 3, y - (p.vy / sp) * r * 3);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      circle(ctx, x, y, r * 0.6);
      ctx.fill();
      break;
    }
    case 'arrow':
    case 'arrow2': {
      const sp = Math.hypot(p.vx, p.vy) || 1;
      const ux = p.vx / sp, uy = p.vy / sp;
      ctx.strokeStyle = col;
      ctx.lineWidth = p.kind === 'arrow2' ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(x - ux * 22, y - uy * 22);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + ux * 6, y + uy * 6);
      ctx.lineTo(x - uy * 4, y + ux * 4);
      ctx.lineTo(x + uy * 4, y - ux * 4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'orb':
    case 'orb2': {
      ctx.fillStyle = col;
      circle(ctx, x, y, r);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.35);
      ctx.fill();
      break;
    }
    case 'prism': {
      const sp = Math.hypot(p.vx, p.vy) || 1;
      const ux = p.vx / sp, uy = p.vy / sp;
      ctx.lineCap = 'round';
      for (const [w, c] of [[r * 2.2, 'rgba(180,140,255,0.35)'], [r * 1.3, 'rgba(110,231,255,0.6)'], [r * 0.6, '#ffffff']] as const) {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x - ux * r * 5, y - uy * r * 5);
        ctx.lineTo(x + ux * r, y + uy * r);
        ctx.stroke();
      }
      break;
    }
    case 'shell': {
      const prog = Math.min(1, p.age / Math.max(0.01, p.maxLife));
      const lift = Math.sin(prog * Math.PI) * 60;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.4, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3a3a44';
      circle(ctx, x, y - lift, r);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    case 'axe':
    case 'axe2':
    case 'axe3': {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.ang);
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(-r * 0.15, -r, r * 0.3, r * 2);
      ctx.fillStyle = col;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, s * r * 0.9);
        ctx.quadraticCurveTo(r * 1.1, s * r * 0.9, r * 0.9, s * r * 0.1);
        ctx.lineTo(0, s * r * 0.35);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'shard':
    case 'shard2': {
      const a = Math.atan2(p.vy, p.vx);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 1.8, y + Math.sin(a) * r * 1.8);
      ctx.lineTo(x + Math.cos(a + 1.6) * r * 0.6, y + Math.sin(a + 1.6) * r * 0.6);
      ctx.lineTo(x - Math.cos(a) * r * 1.2, y - Math.sin(a) * r * 1.2);
      ctx.lineTo(x + Math.cos(a - 1.6) * r * 0.6, y + Math.sin(a - 1.6) * r * 0.6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      ctx.fillStyle = col;
      circle(ctx, x, y, r);
      ctx.fill();
  }
}

export function drawZone(ctx: Ctx, z: Zone, t: number): void {
  const k = z.maxLife > 0 ? Math.max(0, z.life / z.maxLife) : 0;
  switch (z.kind) {
    case 'slash':
    case 'slash3': {
      const a0 = z.ang - z.arc / 2, a1 = z.ang + z.arc / 2;
      const sweep = a0 + (a1 - a0) * Math.min(1, (1 - k) * 2.2);
      ctx.strokeStyle = z.kind === 'slash3' ? `rgba(255,70,110,${0.9 * k})` : `rgba(232,241,255,${0.85 * k})`;
      ctx.lineWidth = z.r * 0.28;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r * 0.78, a0, sweep);
      ctx.stroke();
      break;
    }
    case 'slash2': {
      ctx.strokeStyle = `rgba(255,224,138,${0.9 * k})`;
      ctx.lineWidth = z.r * 0.3;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r * 0.8, z.ang + t * 20, z.ang + t * 20 + TAU * (1 - k * 0.5));
      ctx.stroke();
      break;
    }
    case 'nova':
    case 'nova2':
    case 'nova3': {
      if (z.delay > 0) return;
      const prog = 1 - k;
      const cur = z.r0 + (z.r - z.r0) * prog;
      ctx.strokeStyle = z.kind === 'nova3' ? `rgba(255,240,190,${k})` : z.kind === 'nova2' ? `rgba(255,60,30,${k})` : `rgba(255,130,60,${k})`;
      ctx.lineWidth = (z.kind === 'nova3' ? 22 : 10) + 12 * k;
      circle(ctx, z.x, z.y, cur);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,120,40,${0.12 * k})`;
      ctx.fill();
      break;
    }
    case 'meteor': {
      if (z.delay > 0) {
        const p = 1 - z.delay / 0.7;
        ctx.fillStyle = 'rgba(255,80,30,0.15)';
        circle(ctx, z.x, z.y, z.r);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,120,40,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,120,40,0.25)';
        circle(ctx, z.x, z.y, z.r * p);
        ctx.fill();
        const my = z.y - (1 - p) * 700, mx = z.x + (1 - p) * 250;
        ctx.strokeStyle = 'rgba(255,190,90,0.6)';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + 60, my - 160);
        ctx.stroke();
        ctx.fillStyle = '#ffdb8a';
        circle(ctx, mx, my, 16);
        ctx.fill();
      }
      break;
    }
    case 'rain': {
      if (z.delay > 0) {
        ctx.strokeStyle = 'rgba(182,255,122,0.5)';
        ctx.lineWidth = 2;
        circle(ctx, z.x, z.y, z.r * 0.5);
        ctx.stroke();
        const h = z.delay * 900;
        ctx.strokeStyle = '#d8ffb0';
        ctx.beginPath();
        for (let i = -1; i <= 1; i++) {
          ctx.moveTo(z.x + i * 12, z.y - h);
          ctx.lineTo(z.x + i * 12, z.y - h - 30);
        }
        ctx.stroke();
      }
      break;
    }
    case 'bolt': {
      if (z.pts.length < 4) return;
      for (const [w, c] of [[7, `rgba(255,243,107,${0.35 * k})`], [2.5, `rgba(255,255,255,${k})`]] as const) {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(z.pts[0], z.pts[1]);
        for (let i = 2; i < z.pts.length; i += 2) {
          const x0 = z.pts[i - 2], y0 = z.pts[i - 1], x1 = z.pts[i], y1 = z.pts[i + 1];
          for (let j = 1; j <= 4; j++) {
            const f = j / 4;
            const jit = j === 4 ? 0 : (Math.random() - 0.5) * 18;
            ctx.lineTo(x0 + (x1 - x0) * f + jit, y0 + (y1 - y0) * f + jit);
          }
        }
        ctx.stroke();
      }
      break;
    }
    case 'bash':
    case 'raise': {
      const col = z.kind === 'bash' ? '91,140,255' : '192,132,255';
      ctx.strokeStyle = `rgba(${col},${k})`;
      ctx.lineWidth = 8 * k + 2;
      circle(ctx, z.x, z.y, z.r * (1 - k * 0.7));
      ctx.stroke();
      break;
    }
  }
}

export function drawTurret(ctx: Ctx, tu: Turret, t: number): void {
  const fade = tu.life < 1.5 && Math.floor(t * 8) % 2 === 0 ? 0.5 : 1;
  ctx.globalAlpha = fade;
  ctx.fillStyle = '#2b3a40';
  ctx.fillRect(tu.x - 11, tu.y - 11, 22, 22);
  ctx.strokeStyle = '#7dffcf';
  ctx.lineWidth = 2;
  ctx.strokeRect(tu.x - 11, tu.y - 11, 22, 22);
  ctx.strokeStyle = '#c8fff0';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(tu.x, tu.y);
  ctx.lineTo(tu.x + Math.cos(tu.ang) * 18, tu.y + Math.sin(tu.ang) * 18);
  ctx.stroke();
  ctx.fillStyle = '#7dffcf';
  circle(ctx, tu.x, tu.y, 5);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawMinion(ctx: Ctx, m: Minion, x: number, y: number, t: number): void {
  ctx.globalAlpha = Math.min(1, m.life) * 0.75;
  ctx.fillStyle = '#c084ff';
  ctx.beginPath();
  ctx.arc(x, y - 3, 10, Math.PI, TAU);
  for (let i = 0; i <= 3; i++) ctx.lineTo(x + 10 - (i * 20) / 3, y + 8 + Math.sin(t * 10 + i + m.id) * 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a0d40';
  circle(ctx, x - 3.5, y - 4, 2);
  ctx.fill();
  circle(ctx, x + 3.5, y - 4, 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- hostile

export function eprojColor(kind: string): string {
  switch (kind) {
    case 'arrow': return '#ffe9b0';
    case 'skull': return '#b26bff';
    case 'web': return '#e8e8f0';
    case 'ice': return '#9ad8ff';
    default: return '#ff2e88';
  }
}

/** Small breathing offset for the wyrm's frosty breath. */
const sd0 = (t: number) => Math.sin(t * 6);

export function drawEnemyProjectile(ctx: Ctx, b: EnemyProjectile, x: number, y: number): void {
  if (b.kind === 'web') {
    ctx.strokeStyle = 'rgba(235,235,245,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * b.r * 1.3, y + Math.sin(a) * b.r * 1.3);
    }
    ctx.stroke();
    circle(ctx, x, y, b.r * 0.55);
    ctx.stroke();
    circle(ctx, x, y, b.r);
    ctx.stroke();
    return;
  }
  if (b.kind === 'ice') {
    const a = Math.atan2(b.vy, b.vx);
    ctx.fillStyle = '#c8f0ff';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * b.r * 2, y + Math.sin(a) * b.r * 2);
    ctx.lineTo(x + Math.cos(a + 1.7) * b.r * 0.7, y + Math.sin(a + 1.7) * b.r * 0.7);
    ctx.lineTo(x - Math.cos(a) * b.r * 1.2, y - Math.sin(a) * b.r * 1.2);
    ctx.lineTo(x + Math.cos(a - 1.7) * b.r * 0.7, y + Math.sin(a - 1.7) * b.r * 0.7);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (b.kind === 'arrow') {
    const sp = Math.hypot(b.vx, b.vy) || 1;
    ctx.strokeStyle = '#ffe9b0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - (b.vx / sp) * 16, y - (b.vy / sp) * 16);
    ctx.stroke();
    ctx.fillStyle = '#ff6a6a';
    circle(ctx, x, y, 3);
    ctx.fill();
    return;
  }
  ctx.fillStyle = eprojColor(b.kind);
  circle(ctx, x, y, b.r);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  circle(ctx, x, y, b.r * 0.45);
  ctx.fill();
}

export function drawHazard(ctx: Ctx, h: Hazard, t: number): void {
  switch (h.kind) {
    case 'skyfall': {
      if (h.warn <= 0) break;
      const p = 1 - h.warn / (h.maxWarn || 1);
      ctx.fillStyle = 'rgba(255,110,30,0.14)';
      circle(ctx, h.x, h.y, h.r);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,140,40,${0.6 + Math.sin(t * 24) * 0.3})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,110,30,0.28)';
      circle(ctx, h.x, h.y, h.r * p);
      ctx.fill();
      // the falling rock
      const my = h.y - (1 - p) * 650, mx = h.x + (1 - p) * 220;
      ctx.strokeStyle = 'rgba(255,170,80,0.55)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + 55, my - 150);
      ctx.stroke();
      ctx.fillStyle = '#5a4030';
      circle(ctx, mx, my, 15);
      ctx.fill();
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
    case 'slam': {
      if (h.warn > 0) {
        const p = 1 - h.warn / (h.maxWarn || 1);
        ctx.fillStyle = 'rgba(255,40,40,0.12)';
        circle(ctx, h.x, h.y, h.r);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,60,60,${0.5 + Math.sin(t * 20) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,40,40,0.25)';
        circle(ctx, h.x, h.y, h.r * p);
        ctx.fill();
      }
      break;
    }
    case 'ring': {
      if (h.warn > 0) return;
      ctx.strokeStyle = 'rgba(255,90,60,0.85)';
      ctx.lineWidth = h.w * 2;
      circle(ctx, h.x, h.y, h.r);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,180,0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
    case 'laser': {
      const x2 = h.x + Math.cos(h.ang) * h.len, y2 = h.y + Math.sin(h.ang) * h.len;
      ctx.lineCap = 'round';
      if (h.warn > 0) {
        ctx.strokeStyle = `rgba(255,46,136,${0.25 + Math.sin(t * 25) * 0.15})`;
        ctx.lineWidth = h.w;
        ctx.setLineDash([16, 12]);
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        for (const [w, c] of [[h.w * 2.2, 'rgba(255,46,136,0.25)'], [h.w, 'rgba(255,90,170,0.85)'], [h.w * 0.35, '#ffffff']] as const) {
          ctx.strokeStyle = c;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(h.x, h.y);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
      break;
    }
  }
}

// ---------------------------------------------------------------- pickups

export function gemColor(v: number): string {
  if (v >= 50) return '#ff5df2';
  if (v >= 10) return '#ff6b5d';
  if (v >= 3) return '#5dff8f';
  return '#5dc8ff';
}

export function pickupColor(p: Pickup): string {
  switch (p.kind) {
    case 'xp': return gemColor(p.value);
    case 'heal': return '#ff4d6d';
    case 'magnet': return '#5d9bff';
    case 'bomb': return '#ffb347';
    case 'chest': return '#ffd166';
  }
}

export function drawPickup(ctx: Ctx, p: Pickup, x: number, y: number, t: number): void {
  const bob = Math.sin(t * 4 + p.id) * 2;
  const yy = y + bob;
  switch (p.kind) {
    case 'xp': {
      const s = p.value >= 50 ? 9 : p.value >= 10 ? 7 : p.value >= 3 ? 5.5 : 4.5;
      ctx.fillStyle = gemColor(p.value);
      ctx.beginPath();
      ctx.moveTo(x, yy - s * 1.3);
      ctx.lineTo(x + s, yy);
      ctx.lineTo(x, yy + s * 1.3);
      ctx.lineTo(x - s, yy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(x, yy - s * 1.3);
      ctx.lineTo(x + s * 0.4, yy - s * 0.2);
      ctx.lineTo(x - s * 0.3, yy);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'heal': {
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(x - 3.5, yy - 10, 7, 20);
      ctx.fillRect(x - 10, yy - 3.5, 20, 7);
      break;
    }
    case 'magnet': {
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, yy, 8, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = '#e0e6f0';
      ctx.beginPath();
      ctx.moveTo(x - 8, yy);
      ctx.lineTo(x - 8, yy - 7);
      ctx.moveTo(x + 8, yy);
      ctx.lineTo(x + 8, yy - 7);
      ctx.stroke();
      break;
    }
    case 'bomb': {
      ctx.fillStyle = '#222632';
      circle(ctx, x, yy, 10);
      ctx.fill();
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      circle(ctx, x + 6, yy - 11, 2 + Math.random() * 2);
      ctx.fill();
      break;
    }
    case 'chest': {
      const s = p.big ? 1.4 : 1;
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(x - 14 * s, yy - 8 * s, 28 * s, 18 * s);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(x - 14 * s, yy - 12 * s, 28 * s, 7 * s);
      ctx.fillRect(x - 3 * s, yy - 6 * s, 6 * s, 8 * s);
      ctx.strokeStyle = '#ffeaa0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 14 * s, yy - 12 * s, 28 * s, 22 * s);
      break;
    }
  }
}
