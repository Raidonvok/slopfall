import type { Enemy, GameState } from './types';

// Uniform spatial hash over enemies. Derived data: rebuilt every tick and
// never part of GameState.

const CELL = 64;
const MARGIN = 56; // largest enemy radius, so center-only insertion still finds big ones

const cells = new Map<number, number[]>();
let pool: number[][] = [];
let poolIdx = 0;
let enemiesRef: Enemy[] = [];

const key = (cx: number, cy: number) => (cx + 32768) * 65536 + (cy + 32768);

export function buildGrid(s: GameState): void {
  cells.clear();
  poolIdx = 0;
  enemiesRef = s.enemies;
  for (let i = 0; i < s.enemies.length; i++) {
    const e = s.enemies[i];
    if (e.dead) continue;
    const k = key(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
    let arr = cells.get(k);
    if (!arr) {
      arr = pool[poolIdx] ?? (pool[poolIdx] = []);
      poolIdx++;
      arr.length = 0;
      cells.set(k, arr);
    }
    arr.push(i);
  }
  if (pool.length > 4096) pool = pool.slice(0, 1024);
}

/** Calls fn for every live enemy whose circle overlaps the given circle. */
export function forEnemiesInCircle(x: number, y: number, r: number, fn: (e: Enemy) => void | boolean): void {
  const ext = r + MARGIN;
  const x0 = Math.floor((x - ext) / CELL), x1 = Math.floor((x + ext) / CELL);
  const y0 = Math.floor((y - ext) / CELL), y1 = Math.floor((y + ext) / CELL);
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      const arr = cells.get(key(cx, cy));
      if (!arr) continue;
      for (const i of arr) {
        const e = enemiesRef[i];
        if (e.dead) continue;
        const dx = e.x - x, dy = e.y - y, rr = r + e.radius;
        if (dx * dx + dy * dy <= rr * rr) {
          if (fn(e) === true) return;
        }
      }
    }
  }
}

export function nearestEnemy(s: GameState, x: number, y: number, maxR: number, skip?: (e: Enemy) => boolean): Enemy | null {
  let best: Enemy | null = null;
  let bestD = maxR * maxR;
  for (const e of s.enemies) {
    if (e.dead || e.intangible) continue;
    if (skip && skip(e)) continue;
    const dx = e.x - x, dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}
