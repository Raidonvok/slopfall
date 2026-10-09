// Helpers shared by boss behaviours.

import { addEnemyProjectile } from '../../entities';
import type { Enemy, GameState } from '../../types';

export const TAU = Math.PI * 2;

export function ring(s: GameState, e: Enemy, n: number, speed: number, dmg: number, offset: number, kind: string): void {
  for (let i = 0; i < n; i++) {
    const a = offset + (i * TAU) / n;
    addEnemyProjectile(s, kind, e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, dmg, 8, 6);
  }
}

export function turnToward(cur: number, want: number, rate: number): number {
  const diff = ((want - cur + Math.PI * 3) % TAU) - Math.PI;
  return cur + Math.max(-rate, Math.min(rate, diff));
}
