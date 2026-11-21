// Cobalt Vault — entry point and game loop. Boots the canvas, scales the fixed internal view to
// the window, polls the keyboard each frame, advances the world one fixed 60 Hz step, renders,
// and handles the phase transitions the overlays promise: Enter starts the job, R retries the
// floor the moment you are caught, and Enter runs the whole vault again after the getaway.

import { VIEW_W, VIEW_H } from './config.js';
import { World, PHASE_TITLE, PHASE_CAUGHT, PHASE_WIN, PHASE_CLEAR, STEP } from './world.js';
import { render } from './render.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
const world = new World();
const input = new Input();
const sfx = new Sfx();

// Letterbox: keep the 1280x800 view whole, centred, at whatever scale fits the window.
function fit() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.transform = `translate(-50%, -50%) scale(${scale})`;
  canvas.style.left = '50%';
  canvas.style.top = '50%';
  canvas.style.position = 'fixed';
}
window.addEventListener('resize', fit);
fit();

const query = new URLSearchParams(window.location.search);
const shotName = query.get('shot');
let shotStaged = false;

function startPressed(intent) {
  return intent.interact || intent.up || intent.down || intent.left || intent.right;
}

/** Advance one frame: play steps the world, the other phases only wait for the player. */
function frame() {
  const intent = input.poll();

  if (shotName && !shotStaged) {
    // Screenshot mode: stage the named scene once, then hold the frame steady for capture.
    stageShot(shotName, world);
    shotStaged = true;
  } else if (shotName) {
    render(ctx, world);
    return;
  }

  if (world.phase === PHASE_TITLE && startPressed(intent)) {
    world.phase = 'play';
    world.phaseTimer = 0;
    sfx.tone(523, 0.2, 'triangle', 0.08);
  } else if (world.phase === PHASE_CAUGHT && intent.restart) {
    world.retry();
  } else if (world.phase === PHASE_WIN && intent.restart) {
    world.reset(0, 0);
    world.phase = 'play';
  } else {
    const lootBefore = world.lootTaken;
    const wasPhase = world.phase;
    world.step(intent);
    if (world.lootTaken > lootBefore) sfx.gem();
    if (wasPhase !== world.phase) {
      if (world.phase === PHASE_CAUGHT) sfx.alarm();
      if (world.phase === PHASE_CLEAR) sfx.clear();
    }
  }
  render(ctx, world);
}

setInterval(frame, STEP * 1000);
