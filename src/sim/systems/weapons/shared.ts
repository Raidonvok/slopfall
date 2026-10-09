// Helpers shared by several weapon behaviours.

import { damageEnemy } from '../../combat';
import type { WStats } from '../../content/weapons';
import { addZone } from '../../entities';
import { forEnemiesInCircle, nearestEnemy } from '../../spatial';
import type { Enemy, GameState, Player } from '../../types';

export const TAU = Math.PI * 2;

export function aimAngle(p: Player): number {
  if (p.ax * p.ax + p.ay * p.ay > 1) return Math.atan2(p.ay, p.ax);
  return Math.atan2(p.fy, p.fx);
}

export const findPlayer = (s: GameState, id: string) => s.players.find((p) => p.id === id);

/** Damages enemies in a circular sector. */
export function arcHit(s: GameState, p: Player, src: string, range: number, ang: number, arc: number, st: WStats): void {
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

export function countOwned<T extends { owner: string; dead: boolean }>(arr: T[], owner: string, pred: (x: T) => boolean): number {
  let n = 0;
  for (const x of arr) if (!x.dead && x.owner === owner && pred(x)) n++;
  return n;
}
