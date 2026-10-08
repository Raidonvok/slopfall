// Seeded mulberry32 RNG. The generator state lives in GameState.rng so the
// simulation stays deterministic and serializable.

interface RngHolder {
  rng: number;
}

export function rand(s: RngHolder): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randRange(s: RngHolder, a: number, b: number): number {
  return a + rand(s) * (b - a);
}

export function randInt(s: RngHolder, a: number, b: number): number {
  return Math.floor(randRange(s, a, b + 1));
}

export function pick<T>(s: RngHolder, arr: readonly T[]): T {
  return arr[Math.floor(rand(s) * arr.length)];
}

export function weightedPick<T>(s: RngHolder, items: readonly T[], weight: (item: T) => number): T {
  let total = 0;
  for (const it of items) total += weight(it);
  let r = rand(s) * total;
  for (const it of items) {
    r -= weight(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}
