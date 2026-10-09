// Draws the procedural map: biome ground (pre-rendered per chunk), obstacles,
// tree canopies and animated decor (torches, candles).

import { biomeAt, CHUNK, getChunk, hash, type Biome, type Decor, type Obstacle } from '../../sim/map';
import { glow } from './sprites';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

interface Palette {
  base: string;
  blot: string;
  dark: string;
  detail: string;
}

const PALETTE: Record<Biome, Palette> = {
  meadow: { base: '#15231a', blot: '#1b2d1f', dark: '#0f1913', detail: '#2f5233' },
  forest: { base: '#0e1b13', blot: '#122418', dark: '#09130d', detail: '#22412a' },
  graveyard: { base: '#1a1622', blot: '#221c2c', dark: '#110e17', detail: '#3c3449' },
  ruins: { base: '#1a1b21', blot: '#22232b', dark: '#121318', detail: '#3c3e49' },
};

const BLOB = 128;
const FIELD_STEP = 32;

const hexRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const BASE_RGB = Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, hexRgb(v.base)])) as Record<Biome, [number, number, number]>;

/** Brighter biome colours for the minimap. */
export const MINIMAP_RGB: Record<Biome, string> = {
  meadow: '#2b4a33', forest: '#1d3d28', graveyard: '#3a3046', ruins: '#3a3b45',
};
const MAX_CACHED = 48;
const MAX_NEW_PER_FRAME = 2;

const chunkKey = (cx: number, cy: number) => (cx + 32768) * 65536 + (cy + 32768);

function rngFrom(h: number): () => number {
  let s = h;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) | 0;
    return ((s ^ (s >>> 13)) >>> 0) / 4294967296;
  };
}

export class WorldRenderer {
  private ground = new Map<number, HTMLCanvasElement>();
  private seed = -1;
  private vignette: CanvasGradient | null = null;
  private vigSize = '';

  // -------------------------------------------------------------- ground

  private renderChunk(seed: number, cx: number, cy: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = CHUNK;
    const g = c.getContext('2d')!;
    const ox = cx * CHUNK, oy = cy * CHUNK;
    const chunk = getChunk(seed, cx, cy);

    // Base colour field: biome colours sampled on a world-aligned grid (the
    // samples on a chunk edge are shared with the neighbour) and bilinearly
    // upscaled, so there are no visible chunk seams and biomes blend softly.
    const n = CHUNK / FIELD_STEP + 1;
    const low = document.createElement('canvas');
    low.width = low.height = n;
    const lg = low.getContext('2d')!;
    const img = lg.createImageData(n, n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const rgb = BASE_RGB[biomeAt(seed, ox + i * FIELD_STEP, oy + j * FIELD_STEP)];
        const k = (j * n + i) * 4;
        img.data[k] = rgb[0];
        img.data[k + 1] = rgb[1];
        img.data[k + 2] = rgb[2];
        img.data[k + 3] = 255;
      }
    }
    lg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(low, -FIELD_STEP / 2, -FIELD_STEP / 2, n * FIELD_STEP, n * FIELD_STEP);

    // Soft detail blobs on a global grid, coloured by the biome at their
    // centre, so they continue seamlessly across chunk edges.
    const gx0 = Math.floor(ox / BLOB) - 1, gx1 = Math.floor((ox + CHUNK) / BLOB) + 1;
    const gy0 = Math.floor(oy / BLOB) - 1, gy1 = Math.floor((oy + CHUNK) / BLOB) + 1;
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gy = gy0; gy <= gy1; gy++) {
        const r = rngFrom(hash(seed, gx, gy, 4));
        const bx = (gx + r()) * BLOB, by = (gy + r()) * BLOB;
        const rad = 30 + r() * 50;
        const pal = PALETTE[biomeAt(seed, bx, by)];
        const col = r() < 0.5 ? pal.blot : pal.dark;
        const lx = bx - ox, ly = by - oy;
        if (lx < -rad || ly < -rad || lx > CHUNK + rad || ly > CHUNK + rad) continue;
        const grad = g.createRadialGradient(lx, ly, rad * 0.2, lx, ly, rad);
        grad.addColorStop(0, col);
        grad.addColorStop(1, col + '00');
        g.fillStyle = grad;
        g.globalAlpha = 0.6;
        g.beginPath();
        g.arc(lx, ly, rad, 0, TAU);
        g.fill();
      }
    }
    g.globalAlpha = 1;

    for (const d of chunk.decor) this.drawGroundDecor(g, d, d.x - ox, d.y - oy, PALETTE[chunk.biome]);
    return c;
  }

  private drawGroundDecor(g: Ctx, d: Decor, x: number, y: number, pal: Palette): void {
    const r = rngFrom(Math.floor(d.v * 1e9));
    switch (d.kind) {
      case 'grass': {
        g.strokeStyle = pal.detail;
        g.lineWidth = 1.5;
        g.beginPath();
        for (let i = 0; i < 4; i++) {
          const bx = x + (r() - 0.5) * d.s * 1.5;
          g.moveTo(bx, y);
          g.lineTo(bx + (r() - 0.5) * 5, y - d.s * (0.6 + r() * 0.6));
        }
        g.stroke();
        break;
      }
      case 'flowers': {
        const colors = ['#c06a8e', '#c9b45a', '#7d8fd6', '#d0d0e0'];
        for (let i = 0; i < 5; i++) {
          g.fillStyle = colors[Math.floor(r() * colors.length)];
          g.globalAlpha = 0.55;
          g.beginPath();
          g.arc(x + (r() - 0.5) * d.s * 2, y + (r() - 0.5) * d.s * 2, 1.5 + r() * 1.5, 0, TAU);
          g.fill();
        }
        g.globalAlpha = 1;
        break;
      }
      case 'mushrooms': {
        for (let i = 0; i < 3; i++) {
          const mx = x + (r() - 0.5) * 18, my = y + (r() - 0.5) * 12, s = d.s * (0.4 + r() * 0.4);
          g.fillStyle = '#d8cfc0';
          g.fillRect(mx - 1, my, 2, s * 0.6);
          g.fillStyle = r() < 0.5 ? '#9b3b3b' : '#6a5ab8';
          g.beginPath();
          g.ellipse(mx, my, s * 0.6, s * 0.35, 0, Math.PI, TAU);
          g.fill();
        }
        break;
      }
      case 'puddle': {
        g.fillStyle = 'rgba(40,60,90,0.35)';
        g.beginPath();
        g.ellipse(x, y, d.s, d.s * 0.55, d.v * 3, 0, TAU);
        g.fill();
        g.strokeStyle = 'rgba(140,170,220,0.12)';
        g.lineWidth = 2;
        g.stroke();
        break;
      }
      case 'bones': {
        g.strokeStyle = 'rgba(210,200,180,0.35)';
        g.lineWidth = 2.5;
        g.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
          const a = r() * TAU;
          g.beginPath();
          g.moveTo(x - Math.cos(a) * d.s * 0.5, y - Math.sin(a) * d.s * 0.5);
          g.lineTo(x + Math.cos(a) * d.s * 0.5, y + Math.sin(a) * d.s * 0.5);
          g.stroke();
        }
        g.fillStyle = 'rgba(210,200,180,0.3)';
        g.beginPath();
        g.arc(x + d.s * 0.6, y - d.s * 0.3, d.s * 0.25, 0, TAU);
        g.fill();
        break;
      }
      case 'tiles': {
        const t = 34;
        const n = Math.ceil(d.s / t);
        for (let i = -n; i <= n; i++) {
          for (let j = -n; j <= n; j++) {
            const tx = x + i * t, ty = y + j * t;
            const dist = Math.hypot(i * t, j * t);
            if (dist > d.s || r() < 0.18 + (dist / d.s) * 0.5) continue;
            g.fillStyle = r() < 0.5 ? 'rgba(90,92,108,0.28)' : 'rgba(70,72,88,0.3)';
            g.fillRect(tx - t / 2 + 1, ty - t / 2 + 1, t - 2, t - 2);
          }
        }
        break;
      }
      case 'pebbles': {
        g.fillStyle = 'rgba(120,124,140,0.3)';
        for (let i = 0; i < 4; i++) {
          g.beginPath();
          g.arc(x + (r() - 0.5) * 20, y + (r() - 0.5) * 14, d.s * (0.3 + r() * 0.3), 0, TAU);
          g.fill();
        }
        break;
      }
      default:
        break;
    }
  }

  drawGround(ctx: Ctx, seed: number, minX: number, minY: number, maxX: number, maxY: number): void {
    if (seed !== this.seed) {
      this.ground.clear();
      this.seed = seed;
    }
    let created = 0;
    for (let cx = Math.floor(minX / CHUNK); cx * CHUNK < maxX; cx++) {
      for (let cy = Math.floor(minY / CHUNK); cy * CHUNK < maxY; cy++) {
        const key = chunkKey(cx, cy);
        let c = this.ground.get(key);
        if (c) {
          // refresh LRU order
          this.ground.delete(key);
          this.ground.set(key, c);
        } else if (created < MAX_NEW_PER_FRAME) {
          created++;
          c = this.renderChunk(seed, cx, cy);
          this.ground.set(key, c);
          if (this.ground.size > MAX_CACHED) this.ground.delete(this.ground.keys().next().value!);
        }
        if (c) {
          ctx.drawImage(c, cx * CHUNK, cy * CHUNK, CHUNK + 0.5, CHUNK + 0.5);
        } else {
          ctx.fillStyle = PALETTE[biomeAt(seed, (cx + 0.5) * CHUNK, (cy + 0.5) * CHUNK)].base;
          ctx.fillRect(cx * CHUNK, cy * CHUNK, CHUNK, CHUNK);
        }
      }
    }
  }

  // -------------------------------------------------------------- obstacles

  private forVisible(seed: number, minX: number, minY: number, maxX: number, maxY: number, fn: (o: Obstacle) => void): void {
    for (let cx = Math.floor((minX - 80) / CHUNK); cx * CHUNK < maxX + 80; cx++) {
      for (let cy = Math.floor((minY - 80) / CHUNK); cy * CHUNK < maxY + 80; cy++) {
        for (const o of getChunk(seed, cx, cy).obstacles) {
          if (o.x + o.r * 2 < minX || o.x - o.r * 2 > maxX || o.y + o.r * 2 < minY || o.y - o.r * 2 > maxY) continue;
          fn(o);
        }
      }
    }
  }

  /** Obstacle bodies, drawn below entities. */
  drawObstacles(ctx: Ctx, seed: number, minX: number, minY: number, maxX: number, maxY: number): void {
    this.forVisible(seed, minX, minY, maxX, maxY, (o) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(o.x + o.r * 0.25, o.y + o.r * 0.45, o.r * 1.05, o.r * 0.6, 0, 0, TAU);
      ctx.fill();
      switch (o.kind) {
        case 'tree': {
          ctx.fillStyle = '#3b2a1e';
          ctx.beginPath();
          ctx.arc(o.x, o.y, o.r * 0.5, 0, TAU);
          ctx.fill();
          break;
        }
        case 'deadtree': {
          ctx.strokeStyle = '#3a3030';
          ctx.lineCap = 'round';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(o.x, o.y, o.r * 0.4, 0, TAU);
          ctx.stroke();
          const r = rngFrom(Math.floor(o.v * 1e9));
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = r() * TAU, l = o.r * (1.2 + r() * 0.9);
            ctx.moveTo(o.x, o.y);
            const mx = o.x + Math.cos(a) * l * 0.6, my = o.y + Math.sin(a) * l * 0.6;
            ctx.lineTo(mx, my);
            ctx.lineTo(mx + Math.cos(a + 0.6) * l * 0.4, my + Math.sin(a + 0.6) * l * 0.4);
            ctx.moveTo(mx, my);
            ctx.lineTo(mx + Math.cos(a - 0.5) * l * 0.35, my + Math.sin(a - 0.5) * l * 0.35);
          }
          ctx.stroke();
          break;
        }
        case 'rock': {
          const r = rngFrom(Math.floor(o.v * 1e9));
          const pts: number[] = [];
          for (let i = 0; i < 8; i++) {
            const a = (i * TAU) / 8 + r() * 0.3, rr = o.r * (0.85 + r() * 0.3);
            pts.push(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr);
          }
          ctx.fillStyle = '#454955';
          ctx.beginPath();
          for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#5a5f6d';
          ctx.beginPath();
          ctx.ellipse(o.x - o.r * 0.15, o.y - o.r * 0.25, o.r * 0.6, o.r * 0.4, -0.3, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = '#2b2e36';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
          ctx.closePath();
          ctx.stroke();
          break;
        }
        case 'pillar': {
          const broken = o.v < 0.3;
          ctx.fillStyle = '#4f4d5b';
          ctx.beginPath();
          ctx.arc(o.x, o.y, o.r, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = '#2f2e38';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = broken ? '#3d3c47' : '#6a6878';
          ctx.beginPath();
          ctx.arc(o.x - 2, o.y - 3, o.r * 0.72, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = 'rgba(30,30,40,0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(o.x - 2, o.y - 3, o.r * 0.45, 0, TAU);
          ctx.stroke();
          if (broken) {
            ctx.fillStyle = '#56545f';
            ctx.fillRect(o.x + o.r * 0.8, o.y + o.r * 0.3, 7, 5);
            ctx.fillRect(o.x - o.r * 1.2, o.y + o.r * 0.6, 5, 4);
          }
          break;
        }
        case 'wall': {
          const s = o.r * 2;
          ctx.fillStyle = '#4a4955';
          ctx.fillRect(o.x - s / 2, o.y - s / 2, s, s);
          ctx.fillStyle = '#5e5d6b';
          ctx.fillRect(o.x - s / 2, o.y - s / 2, s, s * 0.35);
          ctx.strokeStyle = '#2c2b34';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(o.x - s / 2, o.y);
          ctx.lineTo(o.x + s / 2, o.y);
          ctx.moveTo(o.x + (o.v - 0.5) * s * 0.6, o.y);
          ctx.lineTo(o.x + (o.v - 0.5) * s * 0.6, o.y + s / 2);
          ctx.stroke();
          break;
        }
        case 'tomb': {
          ctx.fillStyle = 'rgba(60,45,40,0.6)';
          ctx.beginPath();
          ctx.ellipse(o.x, o.y + 10, 14, 7, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#5b5866';
          ctx.beginPath();
          ctx.moveTo(o.x - 10, o.y + 8);
          ctx.lineTo(o.x - 10, o.y - 10);
          ctx.arc(o.x, o.y - 10, 10, Math.PI, TAU);
          ctx.lineTo(o.x + 10, o.y + 8);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#2f2d37';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.strokeStyle = '#3a3844';
          ctx.beginPath();
          ctx.moveTo(o.x, o.y - 14);
          ctx.lineTo(o.x, o.y);
          ctx.moveTo(o.x - 5, o.y - 9);
          ctx.lineTo(o.x + 5, o.y - 9);
          ctx.stroke();
          break;
        }
      }
    });
  }

  /** Tree canopies above entities; they fade when the player walks under them. */
  drawCanopies(ctx: Ctx, seed: number, minX: number, minY: number, maxX: number, maxY: number, px: number, py: number, t: number): void {
    this.forVisible(seed, minX, minY, maxX, maxY, (o) => {
      if (o.kind !== 'tree') return;
      const R = o.r * 1.7;
      const under = (px - o.x) ** 2 + (py - o.y) ** 2 < R * R;
      ctx.globalAlpha = under ? 0.35 : 0.95;
      const sway = Math.sin(t * 0.8 + o.v * 10) * 1.5;
      ctx.fillStyle = '#163222';
      ctx.beginPath();
      ctx.arc(o.x + sway, o.y - o.r * 0.3, R, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1f4430';
      ctx.beginPath();
      ctx.arc(o.x - o.r * 0.35 + sway, o.y - o.r * 0.6, R * 0.68, 0, TAU);
      ctx.arc(o.x + o.r * 0.45 + sway, o.y - o.r * 0.2, R * 0.55, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a5a3c';
      ctx.beginPath();
      ctx.arc(o.x - o.r * 0.5 + sway, o.y - o.r * 0.85, R * 0.32, 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // -------------------------------------------------------------- lights

  private forVisibleDecor(seed: number, minX: number, minY: number, maxX: number, maxY: number, fn: (d: Decor) => void): void {
    for (let cx = Math.floor(minX / CHUNK); cx * CHUNK < maxX; cx++) {
      for (let cy = Math.floor(minY / CHUNK); cy * CHUNK < maxY; cy++) {
        for (const d of getChunk(seed, cx, cy).decor) if (d.kind === 'torch' || d.kind === 'candles') fn(d);
      }
    }
  }

  /** Torch and candle bodies (normal blending). */
  drawLights(ctx: Ctx, seed: number, minX: number, minY: number, maxX: number, maxY: number, t: number): void {
    this.forVisibleDecor(seed, minX, minY, maxX, maxY, (d) => {
      const flick = Math.sin(t * 13 + d.v * 50) * 1.5 + Math.sin(t * 7.3 + d.v * 20);
      if (d.kind === 'torch') {
        ctx.fillStyle = '#3a2a1e';
        ctx.fillRect(d.x - 3, d.y - 18, 6, 22);
        ctx.fillStyle = '#5c5c66';
        ctx.fillRect(d.x - 7, d.y - 22, 14, 5);
        ctx.fillStyle = '#ffb347';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y - 28, 5 + flick * 0.3, 9 + flick, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff1c2';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y - 26, 2.5, 5, 0, 0, TAU);
        ctx.fill();
      } else {
        for (let i = 0; i < 3; i++) {
          const x = d.x + (i - 1) * 9, y = d.y + (i % 2) * 5;
          ctx.fillStyle = '#e8e0cc';
          ctx.fillRect(x - 2, y - 8, 4, 8);
          ctx.fillStyle = '#ffd166';
          ctx.beginPath();
          ctx.ellipse(x, y - 11, 2, 3.5 + flick * 0.3, 0, 0, TAU);
          ctx.fill();
        }
      }
    });
  }

  /** Additive light glows. Caller sets 'lighter' compositing. */
  drawLightGlows(ctx: Ctx, seed: number, minX: number, minY: number, maxX: number, maxY: number, t: number): void {
    this.forVisibleDecor(seed, minX, minY, maxX, maxY, (d) => {
      const flick = 0.85 + Math.sin(t * 11 + d.v * 40) * 0.08 + Math.sin(t * 5.1 + d.v * 9) * 0.07;
      if (d.kind === 'torch') glow(ctx, '#ff9a3d', d.x, d.y - 24, 130 * flick, 0.45);
      else glow(ctx, '#ffcf6b', d.x, d.y - 8, 60 * flick, 0.4);
    });
  }

  /** Night vignette in screen space. */
  drawVignette(ctx: Ctx, w: number, h: number): void {
    const key = `${w}x${h}`;
    if (!this.vignette || this.vigSize !== key) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6);
      g.addColorStop(0, 'rgba(3,4,12,0)');
      g.addColorStop(1, 'rgba(3,4,12,0.62)');
      this.vignette = g;
      this.vigSize = key;
    }
    ctx.fillStyle = this.vignette;
    ctx.fillRect(0, 0, w, h);
  }
}
