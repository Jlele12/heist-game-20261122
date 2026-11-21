// Security cameras: wall-mounted, they sweep their cone steadily between two angles and feed
// the shared alarm whenever the thief is caught in the beam. Cameras never hunt — they only
// watch — so the counter-play is timing the sweep.

export const CAMERA_HALF_ANGLE = 0.46; // radians each side

export function cameraStep(world, camera, dt) {
  // t rides 0..1 and ping-pongs, easing the sweep so the beam visibly slows at each end.
  const period = camera.seconds;
  camera.t = (camera.t + dt / period) % 2;
  const p = camera.t < 1 ? camera.t : 2 - camera.t;
  const eased = p * p * (3 - 2 * p); // smoothstep
  camera.facing = camera.from + (camera.to - camera.from) * eased;
}
