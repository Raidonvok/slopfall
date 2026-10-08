// On-screen controls for phones/tablets: a floating joystick on the left
// half, ability / dash buttons on the right and a pause button. Only shown
// on touch devices (coarse pointer, or after the first real touch).

const STICK_RADIUS = 56;

function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && window.matchMedia('(hover: none)').matches);
}

export class TouchControls {
  enabled = isTouchDevice();
  moveX = 0;
  moveY = 0;
  ability = false;
  dash = false;

  private root = document.createElement('div');
  private base = document.createElement('div');
  private knob = document.createElement('div');
  private abilityBtn = document.createElement('button');
  private dashBtn = document.createElement('button');
  private stickId = -1;
  private ox = 0;
  private oy = 0;
  private visible = false;

  constructor(onPause: () => void, onEnable: () => void) {
    this.root.id = 'touch';
    this.base.className = 'stick-base';
    this.knob.className = 'stick-knob';
    this.base.appendChild(this.knob);
    this.abilityBtn.className = 't-btn t-ability';
    this.abilityBtn.innerHTML = '★';
    this.dashBtn.className = 't-btn t-dash';
    this.dashBtn.innerHTML = '»';
    const pause = document.createElement('button');
    pause.className = 't-btn t-pause';
    pause.innerHTML = '❚❚';
    this.root.append(this.base, this.abilityBtn, this.dashBtn, pause);
    document.body.appendChild(this.root);

    this.hold(this.abilityBtn, (v) => (this.ability = v));
    this.hold(this.dashBtn, (v) => (this.dash = v));
    pause.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onPause();
    });

    this.root.addEventListener('pointerdown', (e) => this.stickStart(e));
    this.root.addEventListener('pointermove', (e) => this.stickMove(e));
    for (const ev of ['pointerup', 'pointercancel'] as const) this.root.addEventListener(ev, (e) => this.stickEnd(e));

    // Hybrid devices: switch to touch controls on the first real touch.
    window.addEventListener('touchstart', () => {
      if (this.enabled) return;
      this.enabled = true;
      onEnable();
      this.apply();
    }, { passive: true });
    if (this.enabled) document.body.classList.add('touch');
    this.apply();
  }

  /** Controls are only interactive while a run is on screen. */
  setVisible(v: boolean): void {
    if (v === this.visible) return;
    this.visible = v;
    if (!v) this.reset();
    this.apply();
  }

  get active(): boolean {
    return this.enabled && this.visible;
  }

  /** Cooldown fill for the buttons: 0 = ready, 1 = just used. */
  setCooldowns(ability: number, dash: number, abilityColor: string): void {
    this.abilityBtn.style.setProperty('--cd', String(ability));
    this.abilityBtn.style.setProperty('--c', abilityColor);
    this.abilityBtn.classList.toggle('ready', ability <= 0);
    this.dashBtn.style.setProperty('--cd', String(dash));
    this.dashBtn.classList.toggle('ready', dash <= 0);
  }

  private apply(): void {
    if (this.enabled) document.body.classList.add('touch');
    this.root.classList.toggle('on', this.active);
  }

  private reset(): void {
    this.stickId = -1;
    this.moveX = this.moveY = 0;
    this.ability = this.dash = false;
    this.base.classList.remove('shown');
  }

  private hold(btn: HTMLElement, set: (v: boolean) => void): void {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.setPointerCapture(e.pointerId);
      set(true);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      btn.addEventListener(ev, () => set(false));
    }
  }

  private stickStart(e: PointerEvent): void {
    // the joystick lives on the left 60% of the screen
    if (this.stickId !== -1 || e.clientX > window.innerWidth * 0.6) return;
    e.preventDefault();
    this.stickId = e.pointerId;
    this.root.setPointerCapture(e.pointerId);
    this.ox = e.clientX;
    this.oy = e.clientY;
    this.base.style.left = `${this.ox}px`;
    this.base.style.top = `${this.oy}px`;
    this.base.classList.add('shown');
    this.stickMove(e);
  }

  private stickMove(e: PointerEvent): void {
    if (e.pointerId !== this.stickId) return;
    const dx = e.clientX - this.ox, dy = e.clientY - this.oy;
    const d = Math.hypot(dx, dy);
    const clamp = d > STICK_RADIUS ? STICK_RADIUS / d : 1;
    this.knob.style.transform = `translate(${dx * clamp}px, ${dy * clamp}px)`;
    // small dead zone, then full speed quickly
    const k = d < 8 ? 0 : Math.min(1, d / (STICK_RADIUS * 0.6));
    this.moveX = d > 0 ? (dx / d) * k : 0;
    this.moveY = d > 0 ? (dy / d) * k : 0;
  }

  private stickEnd(e: PointerEvent): void {
    if (e.pointerId !== this.stickId) return;
    this.stickId = -1;
    this.moveX = this.moveY = 0;
    this.knob.style.transform = 'translate(0, 0)';
    this.base.classList.remove('shown');
  }
}
