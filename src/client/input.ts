import type { InputCmd } from '../sim/types';
import type { TouchControls } from './touch';

const UP = ['KeyW', 'ArrowUp', 'KeyZ'];
const DOWN = ['KeyS', 'ArrowDown'];
const LEFT = ['KeyA', 'ArrowLeft', 'KeyQ'];
const RIGHT = ['KeyD', 'ArrowRight'];

/** Collects keyboard/mouse state and turns it into simulation input commands. */
export class Input {
  private keys = new Set<string>();
  private mouseX = window.innerWidth / 2 + 100;
  private mouseY = window.innerHeight / 2;
  private rmb = false;
  private pendingChoose = -1;
  touch: TouchControls | null = null;

  /** True while the on-screen touch controls drive the player (aim is automatic). */
  get usingTouch(): boolean {
    return !!this.touch?.active;
  }

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.rmb = false;
    });
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) this.rmb = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.rmb = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  choose(i: number): void {
    this.pendingChoose = i;
  }

  private any(codes: string[]): boolean {
    return codes.some((c) => this.keys.has(c));
  }

  /** `px, py` are the player's on-screen position, `scale` the world-to-screen scale. */
  sample(px: number, py: number, scale: number): InputCmd {
    let mx = (this.any(RIGHT) ? 1 : 0) - (this.any(LEFT) ? 1 : 0);
    let my = (this.any(DOWN) ? 1 : 0) - (this.any(UP) ? 1 : 0);
    const t = this.usingTouch ? this.touch : null;
    if (t && (t.moveX !== 0 || t.moveY !== 0)) {
      mx = t.moveX;
      my = t.moveY;
    }
    const cmd: InputCmd = {
      mx, my,
      ax: (this.mouseX - px) / scale,
      ay: (this.mouseY - py) / scale,
      ability: this.keys.has('Space') || this.rmb || !!t?.ability,
      dash: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || !!t?.dash,
      choose: this.pendingChoose,
    };
    this.pendingChoose = -1;
    return cmd;
  }
}
