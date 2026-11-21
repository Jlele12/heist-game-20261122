// Tuning constants for Cobalt Vault: one place for the sizes, speeds and detection numbers every
// other module reads, so the feel of the heist is balanced here and nowhere else.

/** Internal render size in pixels; the canvas letterboxes this into the window. */
export const VIEW_W = 1280;
export const VIEW_H = 800;

/** Tile grid: every level is this many tiles of TILE pixels. */
export const COLS = 32;
export const ROWS = 20;
export const TILE = 40;

/** The thief, in pixels. */
export const THIEF = {
  radius: 11,
  walkSpeed: 150,   // px/s standing
  sneakSpeed: 78,   // px/s sneaking — slow but silent and hard to spot
  sprintSpeed: 210, // px/s sprinting — loud, and sprint noise wakes nearby guards
};

/**
 * Detection numbers. A guard or camera whose cone holds the thief adds `fillPerSecond` to the
 * shared alarm each second (more the closer the cone's apex is, times the visibility factor);
 * out of sight the alarm cools at `coolPerSecond`. At 1 the heist is blown.
 */
export const DETECTION = {
  fillPerSecond: 0.45,
  closeBonus: 0.35,     // extra fill when the watcher is under 90 px away
  closeRange: 90,
  coolPerSecond: 0.22,
  shadowFactor: 0.12,   // how visible a sneaking thief inside a shadow patch is
  sneakFactor: 0.45,    // how visible a sneaking thief in the open is
  caughtAt: 1.0,
};

/** Sprinting emits a noise ring of this radius that wakes guards it reaches. */
export const NOISE_RADIUS = 190;

/** How long a guard stays alarmed and hunting after losing the thief, in seconds. */
export const HUNT_SECONDS = 5.5;

/** Loot: each gem is one piece of loot; the vault door holds the prize trove. */
export const GEM_VALUE = 1;
export const VAULT_VALUE = 3;
export const VAULT_OPEN_SECONDS = 2.4; // time standing at the vault to crack it

/** Score. */
export const SCORE_GEM = 500;
export const SCORE_VAULT = 2000;
export const SCORE_LEVEL_CLEAR = 1500;
export const SCORE_ALARM_PENALTY = 400; // per alarm trigger, once each
export const PAR_SECONDS = 90;          // finish faster than this for the time bonus
