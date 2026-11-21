// Keyboard input: the key set a heist needs — WASD or arrows to move, Shift to sneak, Ctrl to
// sprint, E (held) to crack the vault — held as a plain intent object world.step() consumes.

export const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sneak: ['ShiftLeft', 'ShiftRight'],
  sprint: ['ControlLeft', 'ControlRight'],
  interact: ['KeyE', 'Space'],
  restart: ['KeyR'],
  start: ['Enter', 'Space'],
};

export class Input {
  constructor() {
    this.down = new Set();
    this.intent = { up: false, down: false, left: false, right: false,
                    sneak: false, sprint: false, interact: false, restart: false };
    window.addEventListener('keydown', (e) => {
      if (KEYS.start.includes(e.code) || KEYS.interact.includes(e.code)) e.preventDefault();
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  /** Snapshot the held keys into a fresh intent object for one simulation step. */
  poll() {
    const held = (codes) => codes.some((c) => this.down.has(c));
    const i = this.intent;
    i.up = held(KEYS.up); i.down = held(KEYS.down);
    i.left = held(KEYS.left); i.right = held(KEYS.right);
    i.sneak = held(KEYS.sneak); i.sprint = held(KEYS.sprint);
    i.interact = held(KEYS.interact);
    i.restart = this.down.has('KeyR') && !this.rLatch;
    this.rLatch = this.down.has('KeyR');
    return i;
  }
}
