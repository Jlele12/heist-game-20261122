// Guard behaviour: walk the patrol route waypoint to waypoint, turn the cone smoothly toward
// the direction of travel, and when suspicious (noise or a sighting) break off and hunt the
// last seen spot before resuming the patrol at the nearest waypoint.

import { TILE, HUNT_SECONDS } from './config.js';

const GUARD_HALF_ANGLE = 0.60; // radians each side — the cone the player must read
export { GUARD_HALF_ANGLE };


/** Shortest-path-free resume: continue from the route point nearest the guard. */
function nearestWaypoint(guard) {
  let best = 0;
  let bestDist = Infinity;
  guard.route.forEach((p, i) => {
    const d = Math.hypot(p.x - guard.x, p.y - guard.y);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

/** Turn `facing` toward `target` by at most `maxTurn` radians (shortest way around). */
function turnToward(guard, target, maxTurn) {
  const want = Math.atan2(target.y - guard.y, target.x - guard.x);
  let diff = want - guard.facing;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  guard.facing += Math.max(-maxTurn, Math.min(maxTurn, diff));
}

export function guardStep(world, guard, dt) {
  // Hunting: move to the last seen spot while the hunt timer runs, scanning as you go.
  if (guard.huntTimer > 0) {
    guard.huntTimer -= dt;
    const target = guard.lastSeen ?? guard.route[guard.waypoint];
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    turnToward(guard, target, 3.2 * dt);
    if (dist > 4) {
      const speed = guard.speed * 1.5;
      guard.x += (dx / dist) * speed * dt;
      guard.y += (dy / dist) * speed * dt;
    }
    if (dist <= 6 || guard.huntTimer <= 0) {
      guard.huntTimer = 0;
      guard.waypoint = nearestWaypoint(guard);
    }
    return;
  }

  // Patrol: head for the current waypoint, then take the next one around the loop.
  const target = guard.route[guard.waypoint];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  turnToward(guard, target, 2.6 * dt);
  if (dist > 1) {
    const step = Math.min(guard.speed * dt, dist);
    guard.x += (dx / dist) * step;
    guard.y += (dy / dist) * step;
  } else {
    guard.waypoint = (guard.waypoint + 1) % guard.route.length;
  }
}
