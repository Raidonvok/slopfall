// Hero figures: small "chibi" characters with feet, body, head, gear and a
// held weapon that follows the aim. Drawn facing right and mirrored when
// aiming left. Every part gets a soft top-to-bottom shading and a dark
// outline so heroes read clearly against the night ground.

import { CHARACTERS } from '../../sim/content/characters';
import type { Player } from '../../sim/types';
import { rgba } from './sprites';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const OUTLINE = '#0a0c14';
const SKIN = '#f0c39d';

interface Pen {
  ctx: Ctx;
  r: number;
  flash: boolean;
}

/** Fills the current path with a colour + shading overlay, then outlines it. */
function paint(p: Pen, color: string, y0: number, y1: number, outline = true): void {
  const { ctx } = p;
  ctx.fillStyle = p.flash ? '#ffffff' : color;
  ctx.fill();
  if (!p.flash) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(255,255,255,0.2)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = g;
    ctx.fill();
  }
  if (outline) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = p.r * 0.11;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

function roundBody(ctx: Ctx, r: number, top: number, bottom: number, wTop: number, wBottom: number): void {
  ctx.beginPath();
  ctx.moveTo(-wTop / 2, top + r * 0.12);
  ctx.quadraticCurveTo(-wTop / 2, top, -wTop / 2 + r * 0.15, top);
  ctx.lineTo(wTop / 2 - r * 0.15, top);
  ctx.quadraticCurveTo(wTop / 2, top, wTop / 2, top + r * 0.12);
  ctx.lineTo(wBottom / 2, bottom - r * 0.1);
  ctx.quadraticCurveTo(wBottom / 2, bottom, wBottom / 2 - r * 0.15, bottom);
  ctx.lineTo(-wBottom / 2 + r * 0.15, bottom);
  ctx.quadraticCurveTo(-wBottom / 2, bottom, -wBottom / 2, bottom - r * 0.1);
  ctx.closePath();
}

function feet(p: Pen, walk: number, color: string): void {
  const { ctx, r } = p;
  const s = Math.sin(walk);
  for (const [side, ph] of [[-1, s], [1, -s]] as const) {
    ellipse(ctx, side * r * 0.3 + ph * r * 0.18, r * 0.95 - Math.max(0, ph) * r * 0.1, r * 0.26, r * 0.17);
    paint(p, color, r * 0.8, r * 1.1);
  }
}

function eyes(p: Pen, hx: number, hy: number, ly: number, color = '#141824'): void {
  const { ctx, r } = p;
  // Looking down moves the eyes down; looking up barely moves them so they
  // never slide under a hat brim. The glint shows the look direction instead.
  const ey = hy + (ly > 0 ? ly * 0.1 : ly * 0.03) * r;
  ctx.fillStyle = p.flash ? '#ffffff' : color;
  for (const dx of [0.02, 0.32]) {
    ellipse(ctx, hx + dx * r, ey, r * 0.07, r * 0.11);
    ctx.fill();
  }
  if (!p.flash) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const dx of [0.04, 0.34]) {
      ellipse(ctx, hx + dx * r, ey - r * 0.04 + Math.min(0, ly) * r * 0.035, r * 0.025, r * 0.035);
      ctx.fill();
    }
  }
}

function head(p: Pen, color = SKIN): [number, number] {
  const { ctx, r } = p;
  const hx = r * 0.04, hy = -r * 0.5;
  ellipse(ctx, hx, hy, r * 0.6, r * 0.57);
  paint(p, color, hy - r * 0.6, hy + r * 0.6);
  // cheek blush
  if (!p.flash && color === SKIN) {
    ctx.fillStyle = 'rgba(230,110,110,0.3)';
    ellipse(ctx, hx + r * 0.35, hy + r * 0.18, r * 0.1, r * 0.06);
    ctx.fill();
  }
  return [hx, hy];
}

function hand(p: Pen, x: number, y: number, color = SKIN): void {
  ellipse(p.ctx, x, y, p.r * 0.15, p.r * 0.15);
  paint(p, color, y - p.r * 0.15, y + p.r * 0.15);
}

/** Runs `fn` in a frame rotated around the weapon grip. */
function held(p: Pen, gx: number, gy: number, a: number, fn: () => void): void {
  const { ctx } = p;
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(a);
  fn();
  ctx.restore();
}

// ---------------------------------------------------------------- heroes

function knight(p: Pen, walk: number, a: number, ly: number, c: { accent: string }): void {
  const { ctx, r } = p;
  // cape
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.02);
  ctx.quadraticCurveTo(-r * 1.0, r * 0.5, -r * 0.85, r * 1.0);
  ctx.lineTo(r * 0.1, r * 0.92);
  ctx.lineTo(r * 0.2, 0);
  ctx.closePath();
  paint(p, '#2c4fae', 0, r);
  feet(p, walk, '#59647a');
  roundBody(ctx, r, -r * 0.05, r * 0.88, r * 1.05, r * 1.25);
  paint(p, '#b8c2d4', -r * 0.05, r * 0.9);
  // tabard + belt
  ctx.beginPath();
  ctx.rect(-r * 0.05, r * 0.02, r * 0.42, r * 0.8);
  paint(p, c.accent, 0, r * 0.8, false);
  ctx.fillStyle = p.flash ? '#fff' : '#ffd166';
  ctx.fillRect(-r * 0.55, r * 0.42, r * 1.1, r * 0.1);
  // shield on the off hand
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, r * 0.05);
  ctx.lineTo(-r * 0.3, r * 0.05);
  ctx.quadraticCurveTo(-r * 0.3, r * 0.75, -r * 0.62, r * 1.0);
  ctx.quadraticCurveTo(-r * 0.95, r * 0.75, -r * 0.95, r * 0.05);
  ctx.closePath();
  paint(p, '#3157c4', 0, r);
  ctx.fillStyle = p.flash ? '#fff' : '#ffd166';
  ctx.fillRect(-r * 0.66, r * 0.15, r * 0.08, r * 0.6);
  ctx.fillRect(-r * 0.85, r * 0.35, r * 0.45, r * 0.08);
  // helmet
  const [hx, hy] = head(p, '#cfd7e6');
  ctx.fillStyle = p.flash ? '#fff' : '#141824';
  ctx.beginPath();
  ctx.roundRect(hx - r * 0.05, hy - r * 0.08 + ly * r * 0.08, r * 0.62, r * 0.17, r * 0.06);
  ctx.fill();
  ctx.strokeStyle = p.flash ? '#fff' : '#8e99ad';
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.moveTo(hx + r * 0.05, hy - r * 0.55);
  ctx.lineTo(hx + r * 0.05, hy + r * 0.45);
  ctx.stroke();
  // plume
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.05, hy - r * 0.55);
  ctx.quadraticCurveTo(hx - r * 0.3, hy - r * 1.25, hx - r * 0.95, hy - r * 0.75);
  ctx.quadraticCurveTo(hx - r * 0.45, hy - r * 0.85, hx + r * 0.15, hy - r * 0.5);
  ctx.closePath();
  paint(p, c.accent, hy - r * 1.2, hy - r * 0.5);
  // sword
  held(p, r * 0.6, r * 0.35, a - 0.5, () => {
    ctx.beginPath();
    ctx.moveTo(r * 0.25, -r * 0.09);
    ctx.lineTo(r * 1.55, -r * 0.06);
    ctx.lineTo(r * 1.75, 0);
    ctx.lineTo(r * 1.55, r * 0.06);
    ctx.lineTo(r * 0.25, r * 0.09);
    ctx.closePath();
    paint(p, '#e8eef8', -r * 0.1, r * 0.1);
    ctx.beginPath();
    ctx.roundRect(r * 0.15, -r * 0.32, r * 0.13, r * 0.64, r * 0.05);
    paint(p, '#ffd166', -r * 0.3, r * 0.3);
    ctx.beginPath();
    ctx.rect(-r * 0.12, -r * 0.06, r * 0.28, r * 0.12);
    paint(p, '#6b4a2b', -r * 0.06, r * 0.06);
  });
  hand(p, r * 0.6, r * 0.35, '#9aa7bd');
}

function mage(p: Pen, walk: number, a: number, ly: number, c: { accent: string }, t: number): void {
  const { ctx, r } = p;
  feet(p, walk, '#2a1f5c');
  // robe
  roundBody(ctx, r, -r * 0.08, r * 1.0, r * 0.95, r * 1.45);
  paint(p, '#4b34c9', -r * 0.1, r);
  ctx.fillStyle = p.flash ? '#fff' : '#ffd166';
  ctx.fillRect(-r * 0.7, r * 0.84, r * 1.4, r * 0.09);
  ctx.fillRect(-r * 0.47, r * 0.3, r * 0.94, r * 0.08);
  if (!p.flash) {
    ctx.fillStyle = rgba(c.accent, 0.8);
    for (const [sx, sy] of [[-0.3, 0.6], [0.25, 0.15], [0.35, 0.65]]) {
      ellipse(ctx, sx * r, sy * r, r * 0.05, r * 0.05);
      ctx.fill();
    }
  }
  const [hx, hy] = head(p);
  eyes(p, hx, hy + r * 0.02, ly);
  // beard
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.2, hy + r * 0.2);
  ctx.quadraticCurveTo(hx + r * 0.2, hy + r * 0.33, hx + r * 0.6, hy + r * 0.2);
  ctx.quadraticCurveTo(hx + r * 0.45, hy + r * 0.88, hx + r * 0.12, hy + r * 0.98);
  ctx.quadraticCurveTo(hx - r * 0.15, hy + r * 0.65, hx - r * 0.2, hy + r * 0.2);
  ctx.closePath();
  paint(p, '#e9e8f2', hy, hy + r);
  // hat
  const sway = Math.sin(t * 3) * r * 0.08;
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.62, hy - r * 0.46);
  ctx.quadraticCurveTo(hx - r * 0.1, hy - r * 1.12, hx - r * 0.55 + sway, hy - r * 1.88);
  ctx.quadraticCurveTo(hx + r * 0.2, hy - r * 1.18, hx + r * 0.68, hy - r * 0.46);
  ctx.closePath();
  paint(p, '#3b2a8f', hy - r * 1.9, hy - r * 0.45);
  ellipse(ctx, hx, hy - r * 0.46, r * 0.95, r * 0.2);
  paint(p, '#33247d', hy - r * 0.66, hy - r * 0.26);
  ctx.fillStyle = p.flash ? '#fff' : '#ffd166';
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.5, hy - r * 0.62);
  ctx.lineTo(hx + r * 0.52, hy - r * 0.62);
  ctx.lineTo(hx + r * 0.45, hy - r * 0.74);
  ctx.lineTo(hx - r * 0.42, hy - r * 0.74);
  ctx.closePath();
  ctx.fill();
  // staff
  held(p, r * 0.62, r * 0.4, a * 0.35 - 1.3, () => {
    ctx.beginPath();
    ctx.roundRect(-r * 0.75, -r * 0.07, r * 2.1, r * 0.14, r * 0.07);
    paint(p, '#7a5230', -r * 0.07, r * 0.07);
    const pulse = 1 + Math.sin(t * 5) * 0.08;
    ellipse(ctx, r * 1.45, 0, r * 0.26 * pulse, r * 0.26 * pulse);
    paint(p, c.accent, -r * 0.26, r * 0.26);
    if (!p.flash) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ellipse(ctx, r * 1.4, -r * 0.08, r * 0.08, r * 0.08);
      ctx.fill();
    }
  });
  hand(p, r * 0.62, r * 0.4);
}

function ranger(p: Pen, walk: number, a: number, ly: number): void {
  const { ctx, r } = p;
  // quiver
  held(p, -r * 0.45, r * 0.2, -0.5, () => {
    ctx.beginPath();
    ctx.roundRect(-r * 0.17, -r * 0.75, r * 0.34, r * 1.1, r * 0.1);
    paint(p, '#7a5230', -r * 0.75, r * 0.35);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.12 + i * r * 0.12, -r * 0.75);
      ctx.lineTo(-r * 0.18 + i * r * 0.12, -r * 1.05);
      ctx.lineTo(-r * 0.04 + i * r * 0.12, -r * 0.95);
      ctx.closePath();
      paint(p, '#b6ff7a', -r, -r * 0.75, false);
    }
  });
  // cloak tail
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, 0);
  ctx.quadraticCurveTo(-r * 0.95, r * 0.6, -r * 0.7, r * 0.95);
  ctx.lineTo(r * 0.1, r * 0.8);
  ctx.closePath();
  paint(p, '#24552a', 0, r);
  feet(p, walk, '#5a3f26');
  roundBody(ctx, r, -r * 0.05, r * 0.88, r * 0.95, r * 1.15);
  paint(p, '#2e6b31', -r * 0.05, r * 0.9);
  ctx.fillStyle = p.flash ? '#fff' : '#6b4a2b';
  ctx.fillRect(-r * 0.55, r * 0.4, r * 1.1, r * 0.12);
  ctx.fillStyle = p.flash ? '#fff' : '#d9b26a';
  ctx.fillRect(r * 0.05, r * 0.38, r * 0.16, r * 0.16);
  // hood back, face, hood rim
  ellipse(ctx, -r * 0.02, -r * 0.55, r * 0.68, r * 0.64);
  paint(p, '#3b8a3f', -r * 1.2, 0);
  ellipse(ctx, r * 0.18, -r * 0.45, r * 0.42, r * 0.42);
  paint(p, SKIN, -r * 0.9, 0, false);
  eyes(p, r * 0.05, -r * 0.47, ly);
  ctx.beginPath();
  ctx.arc(-r * 0.02, -r * 0.55, r * 0.68, Math.PI * 1.02, Math.PI * 1.88);
  ctx.quadraticCurveTo(r * 0.2, -r * 0.95, -r * 0.3, -r * 0.4);
  ctx.closePath();
  paint(p, '#3b8a3f', -r * 1.2, -r * 0.4);
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.95);
  ctx.quadraticCurveTo(-r * 0.9, -r * 1.35, -r * 0.35, -r * 1.25);
  ctx.lineTo(-r * 0.3, -r * 1.0);
  ctx.closePath();
  paint(p, '#3b8a3f', -r * 1.35, -r * 0.95);
  // bow
  held(p, r * 0.7, r * 0.3, a, () => {
    ctx.strokeStyle = p.flash ? '#fff' : OUTLINE;
    ctx.lineWidth = r * 0.24;
    ctx.beginPath();
    ctx.arc(-r * 0.3, 0, r * 0.95, -1.15, 1.15);
    ctx.stroke();
    ctx.strokeStyle = p.flash ? '#fff' : '#a0703a';
    ctx.lineWidth = r * 0.13;
    ctx.stroke();
    ctx.strokeStyle = p.flash ? '#fff' : 'rgba(230,230,230,0.8)';
    ctx.lineWidth = r * 0.04;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3 + Math.cos(-1.15) * r * 0.95, Math.sin(-1.15) * r * 0.95);
    ctx.lineTo(-r * 0.3 + Math.cos(1.15) * r * 0.95, Math.sin(1.15) * r * 0.95);
    ctx.stroke();
  });
  hand(p, r * 0.62, r * 0.3);
}

function necro(p: Pen, walk: number, a: number, ly: number, c: { accent: string }, t: number): void {
  const { ctx, r } = p;
  // scythe behind the body
  held(p, r * 0.55, r * 0.4, a * 0.3 - 1.45, () => {
    ctx.beginPath();
    ctx.roundRect(-r * 0.8, -r * 0.06, r * 2.4, r * 0.12, r * 0.06);
    paint(p, '#3a2a22', -r * 0.06, r * 0.06);
    ctx.beginPath();
    ctx.moveTo(r * 1.55, -r * 0.05);
    ctx.quadraticCurveTo(r * 1.4, r * 0.9, r * 0.6, r * 1.15);
    ctx.quadraticCurveTo(r * 1.15, r * 0.7, r * 1.35, -r * 0.05);
    ctx.closePath();
    paint(p, '#cfd3dc', -r * 0.05, r * 1.1);
  });
  feet(p, walk, '#120c1c');
  // tattered robe
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.08);
  ctx.lineTo(r * 0.45, -r * 0.08);
  ctx.lineTo(r * 0.72, r * 0.85);
  for (let i = 0; i <= 6; i++) ctx.lineTo(r * 0.72 - (i * r * 1.44) / 6, r * (i % 2 ? 0.88 : 1.05));
  ctx.closePath();
  paint(p, '#241833', -r * 0.1, r * 1.05);
  ctx.strokeStyle = p.flash ? '#fff' : rgba(c.accent, 0.7);
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.moveTo(r * 0.12, 0);
  ctx.lineTo(r * 0.2, r * 0.85);
  ctx.stroke();
  // hood + skull face
  ellipse(ctx, 0, -r * 0.55, r * 0.7, r * 0.68);
  paint(p, '#1b1226', -r * 1.25, 0);
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, -r * 1.15);
  ctx.quadraticCurveTo(-r * 0.2, -r * 1.55, -r * 0.65, -r * 1.35);
  ctx.quadraticCurveTo(-r * 0.4, -r * 1.2, -r * 0.45, -r * 1.0);
  ctx.closePath();
  paint(p, '#1b1226', -r * 1.5, -r);
  ellipse(ctx, r * 0.15, -r * 0.45, r * 0.38, r * 0.4);
  paint(p, '#e8e2d0', -r * 0.85, -r * 0.05, false);
  ctx.fillStyle = p.flash ? '#fff' : '#0c0812';
  for (const dx of [0.02, 0.3]) {
    ellipse(ctx, r * dx, -r * 0.5 + ly * r * 0.06, r * 0.1, r * 0.12);
    ctx.fill();
  }
  if (!p.flash) {
    const pulse = 0.7 + Math.sin(t * 6) * 0.3;
    ctx.fillStyle = rgba(c.accent, pulse);
    for (const dx of [0.02, 0.3]) {
      ellipse(ctx, r * dx, -r * 0.5 + ly * r * 0.06, r * 0.05, r * 0.06);
      ctx.fill();
    }
    ctx.fillStyle = '#0c0812';
    ctx.fillRect(r * 0.05, -r * 0.2, r * 0.22, r * 0.05);
  }
  hand(p, r * 0.55, r * 0.4, '#d8d2bd');
  // soul wisps
  if (!p.flash) {
    for (let i = 0; i < 2; i++) {
      const wa = t * 2.2 + i * Math.PI;
      ctx.fillStyle = rgba(c.accent, 0.75);
      ellipse(ctx, Math.cos(wa) * r * 1.05, -r * 0.3 + Math.sin(wa) * r * 0.45, r * 0.11, r * 0.11);
      ctx.fill();
    }
  }
}

function engineer(p: Pen, walk: number, a: number, ly: number, t: number): void {
  const { ctx, r } = p;
  // backpack with antenna
  ctx.beginPath();
  ctx.roundRect(-r * 0.85, -r * 0.05, r * 0.5, r * 0.75, r * 0.1);
  paint(p, '#5d6573', -r * 0.05, r * 0.7);
  ctx.strokeStyle = p.flash ? '#fff' : '#2b2f38';
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.05);
  ctx.lineTo(-r * 0.85, -r * 0.7);
  ctx.stroke();
  ctx.fillStyle = p.flash ? '#fff' : Math.floor(t * 3) % 2 ? '#ff4d4d' : '#7dffcf';
  ellipse(ctx, -r * 0.85, -r * 0.72, r * 0.08, r * 0.08);
  ctx.fill();
  feet(p, walk, '#3a3a3a');
  roundBody(ctx, r, -r * 0.05, r * 0.88, r * 1.0, r * 1.15);
  paint(p, '#e8892c', -r * 0.05, r * 0.9);
  ctx.fillStyle = p.flash ? '#fff' : '#a85b17';
  ctx.fillRect(-r * 0.3, -r * 0.04, r * 0.1, r * 0.5);
  ctx.fillRect(r * 0.2, -r * 0.04, r * 0.1, r * 0.5);
  ctx.fillStyle = p.flash ? '#fff' : '#4a3a2a';
  ctx.fillRect(-r * 0.52, r * 0.45, r * 1.04, r * 0.13);
  ctx.fillStyle = p.flash ? '#fff' : '#9aa3b5';
  ctx.fillRect(-r * 0.15, r * 0.47, r * 0.1, r * 0.25);
  ctx.fillRect(r * 0.1, r * 0.47, r * 0.08, r * 0.2);
  const [hx, hy] = head(p);
  eyes(p, hx, hy + r * 0.1, ly);
  // hard hat + goggles
  ctx.beginPath();
  ctx.arc(hx, hy - r * 0.24, r * 0.62, Math.PI, TAU);
  ctx.closePath();
  paint(p, '#ffd166', hy - r * 0.87, hy - r * 0.22);
  ctx.beginPath();
  ctx.roundRect(hx - r * 0.7, hy - r * 0.32, r * 1.5, r * 0.14, r * 0.07);
  paint(p, '#f2b84b', hy - r * 0.32, hy - r * 0.18);
  for (const dx of [0.0, 0.36]) {
    ellipse(ctx, hx + dx * r, hy - r * 0.44, r * 0.15, r * 0.12);
    paint(p, '#7dffcf', hy - r * 0.57, hy - r * 0.32);
  }
  // wrench
  held(p, r * 0.62, r * 0.38, a - 0.3, () => {
    ctx.beginPath();
    ctx.roundRect(-r * 0.1, -r * 0.08, r * 1.1, r * 0.16, r * 0.06);
    paint(p, '#9aa3b5', -r * 0.08, r * 0.08);
    ctx.beginPath();
    ctx.arc(r * 1.1, 0, r * 0.25, 0.7, TAU - 0.7);
    ctx.lineTo(r * 1.1, 0);
    ctx.closePath();
    paint(p, '#b8c0d0', -r * 0.25, r * 0.25);
  });
  hand(p, r * 0.62, r * 0.38, '#3a3a3a');
}

function berserker(p: Pen, walk: number, a: number, ly: number): void {
  const { ctx, r } = p;
  // big axe behind
  held(p, r * 0.6, r * 0.35, a - 0.9, () => {
    ctx.beginPath();
    ctx.roundRect(-r * 0.3, -r * 0.08, r * 1.9, r * 0.16, r * 0.08);
    paint(p, '#6b4a2b', -r * 0.08, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(r * 1.15, -r * 0.08);
    ctx.quadraticCurveTo(r * 1.0, -r * 0.75, r * 1.65, -r * 0.85);
    ctx.quadraticCurveTo(r * 1.45, -r * 0.35, r * 1.7, r * 0.1);
    ctx.quadraticCurveTo(r * 1.45, r * 0.05, r * 1.15, r * 0.08);
    ctx.closePath();
    paint(p, '#c9d1de', -r * 0.85, r * 0.1);
  });
  feet(p, walk, '#4a3020');
  roundBody(ctx, r, -r * 0.05, r * 0.9, r * 1.2, r * 1.2);
  paint(p, '#d99a73', -r * 0.05, r * 0.9);
  // pants, belt, war paint stripes
  ctx.beginPath();
  ctx.rect(-r * 0.6, r * 0.5, r * 1.2, r * 0.38);
  paint(p, '#7a1f17', r * 0.5, r * 0.9, false);
  ctx.fillStyle = p.flash ? '#fff' : '#3a2416';
  ctx.fillRect(-r * 0.6, r * 0.44, r * 1.2, r * 0.12);
  ctx.fillStyle = p.flash ? '#fff' : '#c0392b';
  ctx.fillRect(r * 0.05, r * 0.08, r * 0.08, r * 0.3);
  ctx.fillRect(r * 0.22, r * 0.08, r * 0.08, r * 0.3);
  // fur pelt
  for (const [fx, fy] of [[-0.45, 0.0], [-0.15, -0.08], [0.2, -0.08], [0.48, 0.0]]) {
    ellipse(ctx, fx * r, fy * r, r * 0.24, r * 0.18);
    paint(p, '#8a6a4a', fy * r - r * 0.2, fy * r + r * 0.2);
  }
  const [hx, hy] = head(p);
  ctx.fillStyle = p.flash ? '#fff' : 'rgba(192,57,43,0.75)';
  ctx.fillRect(hx - r * 0.08, hy + r * 0.01, r * 0.6, r * 0.07);
  eyes(p, hx, hy + r * 0.04, ly);
  // beard with braid
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.15, hy + r * 0.26);
  ctx.quadraticCurveTo(hx + r * 0.25, hy + r * 0.4, hx + r * 0.6, hy + r * 0.22);
  ctx.quadraticCurveTo(hx + r * 0.5, hy + r * 0.68, hx + r * 0.25, hy + r * 0.7);
  ctx.quadraticCurveTo(hx - r * 0.05, hy + r * 0.62, hx - r * 0.15, hy + r * 0.26);
  ctx.closePath();
  paint(p, '#d9662b', hy + r * 0.1, hy + r * 0.75);
  ellipse(ctx, hx + r * 0.25, hy + r * 0.84, r * 0.08, r * 0.12);
  paint(p, '#d9662b', hy + r * 0.66, hy + r * 0.96);
  // horned helmet
  ctx.beginPath();
  ctx.arc(hx, hy - r * 0.24, r * 0.6, Math.PI, TAU);
  ctx.closePath();
  paint(p, '#8e99ad', hy - r * 0.86, hy - r * 0.22);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + s * r * 0.45, hy - r * 0.47);
    ctx.quadraticCurveTo(hx + s * r * 1.05, hy - r * 0.62, hx + s * r * 0.95, hy - r * 1.37);
    ctx.quadraticCurveTo(hx + s * r * 0.75, hy - r * 0.87, hx + s * r * 0.35, hy - r * 0.72);
    ctx.closePath();
    paint(p, '#efe3c8', hy - r * 1.37, hy - r * 0.47);
  }
  hand(p, r * 0.6, r * 0.35);
}

/**
 * Shared by the in-game player and the character select portraits.
 * `walk` is the walk-cycle phase (0 when idle).
 */
export function drawCharacterBody(
  ctx: Ctx, charId: string, x: number, y: number, r: number,
  ex: number, ey: number, t: number, walk = 0, flash = false,
): void {
  const c = CHARACTERS[charId];
  const p: Pen = { ctx, r, flash };
  const bob = walk ? -Math.abs(Math.sin(walk)) * r * 0.08 : Math.sin(t * 3) * r * 0.03;
  ctx.save();
  ctx.translate(x, y + bob);
  if (ex < 0) ctx.scale(-1, 1);
  const a = Math.max(-1.15, Math.min(1.15, Math.atan2(ey, Math.abs(ex))));
  const ly = Math.max(-1, Math.min(1, ey));
  switch (charId) {
    case 'knight': knight(p, walk, a, ly, c); break;
    case 'mage': mage(p, walk, a, ly, c, t); break;
    case 'ranger': ranger(p, walk, a, ly); break;
    case 'necro': necro(p, walk, a, ly, c, t); break;
    case 'engineer': engineer(p, walk, a, ly, t); break;
    case 'berserker': berserker(p, walk, a, ly); break;
  }
  ctx.restore();
}

export function drawPlayer(ctx: Ctx, pl: Player, x: number, y: number, t: number): void {
  const c = CHARACTERS[pl.charId];
  const r = pl.radius * 1.2; // drawn a bit larger than the hitbox for readability
  const aim = Math.atan2(pl.ay, pl.ax);
  const ex = Math.cos(aim), ey = Math.sin(aim);
  ctx.save();
  if (pl.invuln > 0 && pl.hurtT <= 0 && pl.dashT <= 0 && Math.floor(t * 20) % 2 === 0 && pl.abilityT <= 0) ctx.globalAlpha = 0.55;
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ellipse(ctx, x, y + r * 1.02, r * 0.95, r * 0.32);
  ctx.fill();

  const moving = Math.hypot(pl.x - pl.px, pl.y - pl.py) > 0.3;
  const walk = moving ? t * 14 : 0;
  drawCharacterBody(ctx, pl.charId, x, y, r, ex, ey, t, walk, pl.hurtT > 0.12);

  if (pl.slowT > 0) {
    // stuck in a web
    ctx.strokeStyle = 'rgba(235,235,245,0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + 0.3;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5);
    }
    ctx.stroke();
    ellipse(ctx, x, y, r * 0.9, r * 0.9);
    ctx.stroke();
  }
  if (pl.abilityT > 0) {
    if (pl.charId === 'knight') {
      ctx.strokeStyle = rgba(c.accent, 0.8);
      ctx.lineWidth = 3;
      ellipse(ctx, x, y - r * 0.2, r * 1.6 + Math.sin(t * 12) * 2, r * 1.6 + Math.sin(t * 12) * 2);
      ctx.stroke();
      ctx.fillStyle = rgba(c.accent, 0.1);
      ctx.fill();
    } else if (pl.charId === 'berserker') {
      ctx.strokeStyle = 'rgba(255,40,40,0.7)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = t * 4 + (i * TAU) / 6;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6));
        ctx.lineTo(x + Math.cos(a) * (r + 14), y + Math.sin(a) * (r + 14) - 6);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}
