// Procedural, deterministic world layout. The map is a pure function of
// (mapSeed, chunk coordinates), so it is never stored in GameState and every
// client/server derives exactly the same obstacles.

export const CHUNK = 512;
const REGION = CHUNK * 3;
const SPAWN_CLEAR = 380;
const MIN_GAP = 40; // free space between obstacles, wider than the player

export type Biome = 'meadow' | 'forest' | 'graveyard' | 'ruins';
const BIOMES: Biome[] = ['meadow', 'forest', 'graveyard', 'ruins'];

export type ObstacleKind = 'tree' | 'rock' | 'pillar' | 'tomb' | 'deadtree' | 'wall';
export type DecorKind = 'flowers' | 'grass' | 'mushrooms' | 'puddle' | 'bones' | 'candles' | 'torch' | 'tiles' | 'pebbles';

export interface Obstacle {
  x: number;
  y: number;
  r: number;
  kind: ObstacleKind;
  v: number; // variant, 0..1
}

export interface Decor {
  x: number;
  y: number;
  kind: DecorKind;
  v: number;
  s: number; // size
}

export interface Chunk {
  cx: number;
  cy: number;
  biome: Biome;
  obstacles: Obstacle[];
  decor: Decor[];
}

export function hash(seed: number, a: number, b: number, c = 0): number {
  let h = (seed ^ Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1) ^ Math.imul(c, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

function makeRng(h: number): () => number {
  let s = h | 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise in [-1, 1]. */
function valueNoise(seed: number, x: number, y: number, salt: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const v = (ix: number, iy: number) => hash(seed, ix, iy, salt) / 2147483648 - 1;
  const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const WARP = 260;

/**
 * Biome at a world point: Voronoi regions with jittered centers, sampled
 * through a noise warp so the borders are wavy instead of straight lines.
 */
export function biomeAt(seed: number, x: number, y: number): Biome {
  x += (valueNoise(seed, x / 420, y / 420, 21) + valueNoise(seed, x / 160, y / 160, 22) * 0.35) * WARP;
  y += (valueNoise(seed, x / 420, y / 420, 23) + valueNoise(seed, x / 160, y / 160, 24) * 0.35) * WARP;
  const gx = Math.floor(x / REGION), gy = Math.floor(y / REGION);
  let best = Infinity, bx = 0, by = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const cx = gx + dx, cy = gy + dy;
      const h = hash(seed, cx, cy, 11);
      const px = (cx + 0.15 + ((h & 0xffff) / 65536) * 0.7) * REGION;
      const py = (cy + 0.15 + ((h >>> 16) / 65536) * 0.7) * REGION;
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < best) {
        best = d;
        bx = cx;
        by = cy;
      }
    }
  }
  if (bx === 0 && by === 0) return 'meadow';
  return BIOMES[hash(seed, bx, by, 7) % BIOMES.length];
}

function generate(seed: number, cx: number, cy: number): Chunk {
  const rnd = makeRng(hash(seed, cx, cy, 1));
  const range = (a: number, b: number) => a + rnd() * (b - a);
  const int = (a: number, b: number) => Math.floor(range(a, b + 1));
  const ox = cx * CHUNK, oy = cy * CHUNK;
  const biome = biomeAt(seed, ox + CHUNK / 2, oy + CHUNK / 2);
  const obstacles: Obstacle[] = [];
  const groups: number[] = [];
  const decor: Decor[] = [];
  let group = 0;

  // Obstacles stay away from chunk edges so neighbouring chunks never block each other.
  const fits = (x: number, y: number, r: number, g: number) => {
    const m = r + MIN_GAP / 2;
    if (x < ox + m || x > ox + CHUNK - m || y < oy + m || y > oy + CHUNK - m) return false;
    if (x * x + y * y < (SPAWN_CLEAR + r) ** 2) return false;
    for (let i = 0; i < obstacles.length; i++) {
      if (groups[i] === g) continue;
      const o = obstacles[i];
      if ((o.x - x) ** 2 + (o.y - y) ** 2 < (o.r + r + MIN_GAP) ** 2) return false;
    }
    return true;
  };
  const add = (x: number, y: number, r: number, kind: ObstacleKind, g = ++group) => {
    if (!fits(x, y, r, g)) return false;
    obstacles.push({ x, y, r, kind, v: rnd() });
    groups.push(g);
    return true;
  };
  const scatter = (n: number, kind: ObstacleKind, r0: number, r1: number) => {
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 6; tries++) {
        if (add(ox + rnd() * CHUNK, oy + rnd() * CHUNK, range(r0, r1), kind)) break;
      }
    }
  };
  const deco = (n: number, kind: DecorKind, s0: number, s1: number) => {
    for (let i = 0; i < n; i++) {
      // keep decor fully inside its chunk so the pre-rendered ground never clips it
      const fx = rnd(), fy = rnd(), v = rnd(), sz = range(s0, s1), m = sz + 4;
      decor.push({ x: ox + m + fx * (CHUNK - 2 * m), y: oy + m + fy * (CHUNK - 2 * m), kind, v, s: sz });
    }
  };

  switch (biome) {
    case 'meadow':
      scatter(int(1, 3), 'rock', 16, 30);
      if (rnd() < 0.5) scatter(1, 'tree', 20, 26);
      deco(int(5, 10), 'flowers', 10, 22);
      deco(int(10, 18), 'grass', 6, 12);
      if (rnd() < 0.35) deco(1, 'puddle', 40, 70);
      break;
    case 'forest':
      scatter(int(5, 8), 'tree', 18, 28);
      scatter(int(0, 2), 'rock', 14, 22);
      deco(int(3, 7), 'mushrooms', 6, 10);
      deco(int(12, 20), 'grass', 6, 12);
      break;
    case 'graveyard': {
      // rows of tombstones
      const rows = int(1, 3);
      for (let r = 0; r < rows; r++) {
        const x0 = ox + range(60, CHUNK - 290), y0 = oy + range(60, CHUNK - 60);
        const n = int(3, 5), g = ++group;
        for (let i = 0; i < n; i++) add(x0 + i * 58, y0 + range(-4, 4), 12, 'tomb', g);
      }
      scatter(int(0, 2), 'deadtree', 15, 18);
      deco(int(1, 2), 'candles', 8, 12);
      deco(int(3, 6), 'bones', 8, 14);
      if (rnd() < 0.5) deco(1, 'torch', 10, 10);
      break;
    }
    case 'ruins': {
      const pattern = rnd();
      const ccx = ox + CHUNK / 2 + range(-60, 60), ccy = oy + CHUNK / 2 + range(-60, 60);
      if (pattern < 0.4) {
        // ring of pillars around a courtyard
        const n = int(6, 8), R = range(120, 160), g = ++group;
        for (let i = 0; i < n; i++) {
          const a = (i * Math.PI * 2) / n;
          add(ccx + Math.cos(a) * R, ccy + Math.sin(a) * R, 16, 'pillar', g);
        }
        decor.push({ x: ccx, y: ccy, kind: 'torch', v: rnd(), s: 12 });
        decor.push({ x: ccx, y: ccy, kind: 'tiles', v: rnd(), s: R + 30 });
      } else if (pattern < 0.8) {
        // broken L-shaped wall with a gap
        const g = ++group;
        const len = int(6, 9), gapAt = int(2, len - 2);
        const dir = rnd() < 0.5 ? 1 : -1;
        for (let i = 0; i < len; i++) {
          if (i === gapAt) continue;
          add(ccx - 110 + i * 24, ccy - 90, 14, 'wall', g);
        }
        for (let i = 1; i < 6; i++) add(ccx - 110 + (dir > 0 ? 0 : (len - 1) * 24), ccy - 90 + i * 24, 14, 'wall', g);
        decor.push({ x: ccx, y: ccy - 20, kind: 'tiles', v: rnd(), s: 140 });
        if (rnd() < 0.7) decor.push({ x: ccx + range(-60, 60), y: ccy + range(0, 60), kind: 'torch', v: rnd(), s: 12 });
      } else {
        scatter(int(3, 6), 'pillar', 14, 18);
        deco(1, 'tiles', 90, 140);
      }
      scatter(int(0, 2), 'rock', 12, 18);
      deco(int(4, 8), 'pebbles', 4, 8);
      break;
    }
  }
  return { cx, cy, biome, obstacles, decor };
}

const cache = new Map<number, Chunk>();
let cacheSeed = 0;

export function getChunk(seed: number, cx: number, cy: number): Chunk {
  if (seed !== cacheSeed) {
    cache.clear();
    cacheSeed = seed;
  }
  const key = (cx + 32768) * 65536 + (cy + 32768);
  let c = cache.get(key);
  if (!c) {
    if (cache.size > 4000) cache.clear();
    c = generate(seed, cx, cy);
    cache.set(key, c);
  }
  return c;
}

export function forObstaclesNear(seed: number, x: number, y: number, r: number, fn: (o: Obstacle) => void): void {
  const x0 = Math.floor((x - r) / CHUNK), x1 = Math.floor((x + r) / CHUNK);
  const y0 = Math.floor((y - r) / CHUNK), y1 = Math.floor((y + r) / CHUNK);
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      for (const o of getChunk(seed, cx, cy).obstacles) {
        const rr = o.r + r;
        if ((o.x - x) ** 2 + (o.y - y) ** 2 < rr * rr) fn(o);
      }
    }
  }
}

/**
 * Pushes a circle out of any obstacle it overlaps. Returns the summed push
 * normal (0,0 when free) so movers can slide around obstacles.
 */
export function resolveObstacles(seed: number, e: { x: number; y: number }, r: number): { nx: number; ny: number } {
  let nx = 0, ny = 0;
  forObstaclesNear(seed, e.x, e.y, r, (o) => {
    let dx = e.x - o.x, dy = e.y - o.y;
    let d = Math.hypot(dx, dy);
    if (d < 0.001) {
      dx = 1;
      dy = 0;
      d = 1;
    }
    const push = o.r + r - d;
    if (push <= 0) return;
    e.x += (dx / d) * push;
    e.y += (dy / d) * push;
    nx += dx / d;
    ny += dy / d;
  });
  return { nx, ny };
}

export function isBlocked(seed: number, x: number, y: number, r: number): boolean {
  let hit = false;
  forObstaclesNear(seed, x, y, r, () => {
    hit = true;
  });
  return hit;
}
