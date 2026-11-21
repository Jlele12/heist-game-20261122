// The screenshot scenes behind ?shot=overview|hunt|vault|getaway: each one stages a real moment
// of the heist — thief, guards, cones, loot and HUD all live — by loading a floor, placing the
// thief where the story needs them, then playing the simulation forward a little so every cone
// and meter is what the game itself produces, not a drawing.

import { TILE } from './config.js';
import { PHASE_PLAY } from './world.js';

const STEP = 1 / 60;

/** Run the world forward `seconds` with no input, so patrols and sweeps stay honest. */
function run(world, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) world.step({ up: false, down: false, left: false,
    right: false, sneak: false, sprint: false, interact: false, restart: false });
}

export function stageShot(name, world) {
  if (name === 'hunt') {
    world.reset(1, 1200);
    world.phase = PHASE_PLAY;
    // The thief is mid-floor, half-exposed near a shadow edge; a guard is onto them.
    world.thief.x = 10 * TILE;
    world.thief.y = 11 * TILE;
    world.thief.sneaking = true;
    const g = world.guards[0];
    g.lastSeen = { x: world.thief.x, y: world.thief.y };
    g.huntTimer = 6;
    world.alarm = 0.55;
    run(world, 1.6);
    world.thief.sneaking = true;
    return;
  }
  if (name === 'vault') {
    world.reset(2, 3600);
    world.phase = PHASE_PLAY;
    // Deep on the vault floor: the thief stands at the vault door, E held, mid-crack.
    world.thief.x = world.vault.x - TILE;
    world.thief.y = world.vault.y;
    world.thief.facing = 0;
    world.thief.cracking = true;
    world.vaultProgress = 1.5;
    world.vaultOccupied = true;
    world.alarm = 0.18;
    run(world, 0.9);
    world.thief.cracking = true;
    world.vaultOccupied = true;
    return;
  }
  if (name === 'getaway') {
    world.reset(0, 5200);
    world.phase = PHASE_PLAY;
    // Everything is pocketed; the lit exit is a short dash away.
    world.gems.forEach((g) => { g.taken = true; });
    world.vault.cracked = true;
    world.lootTaken = world.lootTotal;
    world.thief.x = world.exit.x - TILE * 2.4;
    world.thief.y = world.exit.y - TILE * 0.6;
    world.thief.facing = 0;
    run(world, 0.8);
    return;
  }
  // Default: the overview — the thief sneaking into the lobby's shadow patch, guards patrolling.
  world.reset(0, 0);
  world.phase = PHASE_PLAY;
  world.thief.x = 2 * TILE + 8;
  world.thief.y = 6 * TILE + 20;
  world.thief.facing = 0;
  world.thief.sneaking = true;
  run(world, 2.4);
  world.thief.sneaking = true;
}
