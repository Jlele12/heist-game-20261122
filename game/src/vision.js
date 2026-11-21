// Line-of-sight and vision-cone math shared by guards and cameras: a cone is a facing, a
// half-angle and a range; seeing means the target sits inside all three and a raycast against
// the level's solids reaches it. Rays step tile by tile (DDA-ish), so crates and walls block.

import { TILE, COLS, ROWS } from './config.js';

/** Is the grid cell solid? Out-of-bounds counts as solid so rays never leave the map. */
function solidAt(world, gx, gy) {
  if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return true;
  return world.solids[gy][gx];
}

/** Does a straight ray from (x0,y0) to (x1,y1) stay clear of solids? Sampled every 6 px. */
export function lineClear(world, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    if (solidAt(world, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

/**
 * Does `watcher` (x, y, facing radians) see `target`? The cone opens `halfAngle` radians each
 * side of facing and reaches `range` px; walls and crates block the view.
 */
export function coneSees(world, watcher, target, halfAngle, range) {
  const dx = target.x - watcher.x;
  const dy = target.y - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  const angle = Math.atan2(dy, dx);
  let diff = Math.abs(angle - watcher.facing);
  while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
  if (diff > halfAngle) return false;
  return lineClear(world, watcher.x, watcher.y, target.x, target.y);
}

/**
 * The outline of a watcher's cone as [x, y] points — apex first, then the arc — for rendering.
 * Rays are cast every `rays` degrees so the cone visibly hugs cover.
 */
export function coneOutline(world, x, y, facing, halfAngle, range, rayStepDeg = 6) {
  const points = [[x, y]];
  const rays = Math.max(2, Math.ceil((halfAngle * 2 * 180) / Math.PI / rayStepDeg));
  for (let i = 0; i <= rays; i += 1) {
    const a = facing - halfAngle + (2 * halfAngle * i) / rays;
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    let reach = range;
    for (let d = 8; d <= range; d += 8) {
      const px = x + cx * d;
      const py = y + cy * d;
      if (solidAt(world, Math.floor(px / TILE), Math.floor(py / TILE))) {
        reach = d - 4;
        break;
      }
    }
    points.push([x + cx * reach, y + cy * reach]);
  }
  return points;
}
