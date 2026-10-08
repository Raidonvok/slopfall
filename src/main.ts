import { CHARACTER_IDS } from './sim/content/characters';
import type { GameState, UpgradeOption } from './sim/types';
import { Sound } from './client/audio';
import { Input } from './client/input';
import { TouchControls } from './client/touch';
import { CHARACTERS } from './sim/content/characters';
import { Renderer } from './client/render/renderer';
import { LOCAL_ID, Session } from './client/session';
import { buildCharSelect, buildGameOver, buildLevelUp, buildPause, show, type ScreenId } from './client/ui/menus';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const sound = new Sound();
const touch = new TouchControls(
  () => setPaused(true),
  () => {
    renderer.touchMode = true;
    renderer.resize();
  },
);
input.touch = touch;
renderer.touchMode = touch.enabled;
renderer.resize();

let session: Session | null = null;
let screen: ScreenId | null = 'menu';
let shownChoices: UpgradeOption[] | null = null;
let lastChar = CHARACTER_IDS[0];

function setScreen(id: ScreenId | null): void {
  screen = id;
  show(id);
  touch.setVisible(id === null);
}

function runDemo(): void {
  session?.stop();
  const charId = CHARACTER_IDS[Math.floor(Math.random() * CHARACTER_IDS.length)];
  session = new Session(charId, renderer, null, null);
  session.start();
}

function startGame(charId: string): void {
  lastChar = charId;
  sound.unlock();
  session?.stop();
  shownChoices = null;
  if (touch.enabled && !document.fullscreenElement) {
    // more screen space on phones; ignored where unsupported (e.g. iOS Safari)
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  setScreen(null);
  session = new Session(charId, renderer, input, sound, { onFrame: syncUi, onGameOver: gameOver });
  session.start();
}

function syncUi(s: GameState): void {
  const me = s.players.find((p) => p.id === LOCAL_ID)!;
  if (touch.enabled) {
    touch.setCooldowns(
      me.abilityCd / Math.max(0.01, me.abilityMaxCd),
      me.dashCd / Math.max(0.01, me.dashMaxCd),
      CHARACTERS[me.charId].accent,
    );
  }
  if (me.choices !== shownChoices) {
    shownChoices = me.choices;
    if (me.choices) {
      buildLevelUp(me.choices, me, (i) => input.choose(i));
      setScreen('levelup');
    } else if (screen === 'levelup') {
      setScreen(null);
    }
  }
}

function gameOver(s: GameState): void {
  buildGameOver(s, s.players[0]);
  setScreen('over');
}

function setPaused(p: boolean): void {
  if (!session || !session.state || session.state.gameOver) return;
  if (p && screen !== null) return;
  session.paused = p;
  if (p) {
    buildPause(session.state.players[0]);
    setScreen('pause');
  } else if (screen === 'pause') {
    setScreen(null);
  }
}

function toMenu(): void {
  setScreen('menu');
  runDemo();
}

const inGame = () => session !== null && screen !== 'menu' && screen !== 'chars';

buildCharSelect(startGame);
document.getElementById('btn-play')!.addEventListener('click', () => {
  sound.unlock();
  setScreen('chars');
});
document.getElementById('btn-back')!.addEventListener('click', () => setScreen('menu'));
document.getElementById('btn-resume')!.addEventListener('click', () => setPaused(false));
document.getElementById('btn-quit')!.addEventListener('click', toMenu);
document.getElementById('btn-retry')!.addEventListener('click', () => startGame(lastChar));
document.getElementById('btn-change')!.addEventListener('click', () => {
  runDemo();
  setScreen('chars');
});
document.getElementById('btn-menu')!.addEventListener('click', toMenu);

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') sound.toggleMute();
  if (!inGame()) return;
  if (e.code === 'Escape') setPaused(!session!.paused);
  if (screen === 'levelup' && /^Digit[1-4]$/.test(e.code)) input.choose(Number(e.code.slice(5)) - 1);
});
window.addEventListener('blur', () => {
  if (inGame() && screen === null) setPaused(true);
});

runDemo();

// Dev-only handle for debugging from the browser console.
if (import.meta.env.DEV) (window as unknown as { __session: () => Session | null }).__session = () => session;
