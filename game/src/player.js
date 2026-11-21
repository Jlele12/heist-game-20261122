// The thief: keyboard-driven movement with three gears — sneak, walk, sprint — circle-vs-grid
// collision against walls and crates, and the sprint noise ring that wakes nearby guards.

import { TILE, THIEF, NOISE_RADIUS } from './config.js';

const NOISE_COOLDOWN = 1.4; // seconds between sprint noise pings

/** Move a circle of `radius` along one axis, stopping at any solid tile it would overlap. */
function moveAxis(world, thief, dx, dy, radius) {
  let x = thief.x + dx;
  let y = thief.y + dy;
  const gx0 = Math.floor((x - radius) / TILE);
  const gx1 = Math.floor((x + radius) / TILE);
  const gy0 = Math.floor((y - radius) / TILE);
  const gy1 = Math.floor((y + radius) / TILE);
  for (let gy = gy0; gy <= gy1; gy += 1) {
    for (let gx = gx0; gx <= gx1; gx += 1) {
      const solid = gx < 0 || gy < 0 || !world.solids[gy] || world.solids[gy][gx];
      if (!solid) continue;
      // Push the circle out of this tile along the axis just moved.
      if (dx > 0) x = Math.min(x, gx * TILE - radius);
      if (dx < 0) x = Math.max(x, (gx + 1) * TILE + radius);
      if (dy > 0) y = Math.min(y, gy * TILE - radius);
      if (dy < 0) y = Math.max(y, (gy + 1) * TILE + radius);
    }
  }
  thief.x = x;
  thief.y = y;
}

export function thiefStep(world, input) {
  const t = world.thief;
  t.sneaking = input.sneak && !input.sprint;
  t.sprinting = input.sprint && !t.sneaking;
  const speed = t.sneaking ? THIEF.sneakSpeed : t.sprinting ? THIEF.sprintSpeed : THIEF.walkSpeed;
  let ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let ay = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(ax, ay);
  t.moving = len > 0;
  if (len > 0) {
    ax /= len; ay /= len;
    t.facing = Math.atan2(ay, ax);
    moveAxis(world, t, ax * speed / 60, 0, THIEF.radius);
    moveAxis(world, t, 0, ay * speed / 60, THIEF.radius);
  }
  t.cracking = input.interact;

  // Sprinting is loud: ping a noise ring on a cooldown so guards read the rhythm of your steps.
  t.noiseCooldown = Math.max(0, (t.noiseCooldown ?? 0) - 1 / 60);
  if (t.sprinting && t.moving && t.noiseCooldown <= 0) {
    world.emitNoise(t.x, t.y);
    t.noiseCooldown = NOISE_COOLDOWN;
  }
  if (world.noise) {
    world.noise.t -= 1 / 60;
    if (world.noise.t <= 0 || Math.hypot(world.noise.x - t.x, world.noise.y - t.y) > NOISE_RADIUS * 2) {
      world.noise = null;
    }
  }
}
