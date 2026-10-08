// Client-only visual effects (particles, floating numbers, rings, banners).
// These never feed back into the simulation, so Math.random is fine here.

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  size: number;
}

export interface Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  max: number;
  color: string;
  width: number;
}

export interface Ghost {
  x: number;
  y: number;
  r: number;
  color: string;
  life: number;
  max: number;
}

export interface Banner {
  text: string;
  sub: string;
  color: string;
  life: number;
  max: number;
}

const MAX_PARTICLES = 1500;
const MAX_TEXTS = 90;

export class Effects {
  particles: Particle[] = [];
  texts: FloatText[] = [];
  rings: Ring[] = [];
  ghosts: Ghost[] = [];
  banners: Banner[] = [];
  toasts: Banner[] = [];
  shake = 0;
  hurtFlash = 0;
  time = 0;

  burst(x: number, y: number, color: string, n: number, speed = 160, size = 3, life = 0.5): void {
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.9);
      const l = life * (0.6 + Math.random() * 0.6);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: l, max: l, color, size: size * (0.6 + Math.random() * 0.8) });
    }
  }

  text(x: number, y: number, text: string, color: string, size = 14, life = 0.7): void {
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({ x: x + (Math.random() - 0.5) * 16, y, text, color, life, max: life, size });
  }

  ring(x: number, y: number, maxR: number, color: string, life = 0.4, width = 4, r = 0): void {
    this.rings.push({ x, y, r, maxR, life, max: life, color, width });
  }

  ghost(x: number, y: number, r: number, color: string): void {
    this.ghosts.push({ x, y, r, color, life: 0.3, max: 0.3 });
  }

  banner(text: string, sub = '', color = '#ffffff', life = 2.6): void {
    this.banners.push({ text, sub, color, life, max: life });
  }

  toast(text: string, sub = '', color = '#ffd166', life = 3.5): void {
    this.toasts.push({ text, sub, color, life, max: life });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  addShake(v: number): void {
    this.shake = Math.min(24, this.shake + v);
  }

  update(dt: number): void {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 40);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3);
    const drag = Math.max(0, 1 - dt * 4);
    let j = 0;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= drag;
      p.vy *= drag;
      this.particles[j++] = p;
    }
    this.particles.length = j;
    this.texts = this.texts.filter((t) => {
      t.life -= dt;
      t.y -= 40 * dt;
      return t.life > 0;
    });
    this.rings = this.rings.filter((r) => {
      r.life -= dt;
      return r.life > 0;
    });
    this.ghosts = this.ghosts.filter((g) => (g.life -= dt) > 0);
    for (const b of this.banners) b.life -= dt;
    this.banners = this.banners.filter((b) => b.life > 0);
    for (const b of this.toasts) b.life -= dt;
    this.toasts = this.toasts.filter((b) => b.life > 0);
  }
}
