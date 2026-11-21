// World state and simulation step for Cobalt Vault: builds a level from its map string, owns
// every entity (thief, guards, cameras, gems, vault, exit) and advances the heist one fixed
// step at a time — movement, patrol, vision, alarm and scoring all live behind world.step().

import { COLS, ROWS, TILE, THIEF, DETECTION, NOISE_RADIUS, HUNT_SECONDS, VAULT_OPEN_SECONDS,
         GEM_VALUE, VAULT_VALUE, SCORE_GEM, SCORE_VAULT, SCORE_LEVEL_CLEAR, SCORE_ALARM_PENALTY } from './config.js';
import { LEVELS } from './levels.js';
import { guardStep } from './guards.js';
import { cameraStep } from './cameras.js';
import { thiefStep } from './player.js';
import { coneSees } from './vision.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_CAUGHT = 'caught';
export const PHASE_CLEAR = 'clear';
export const PHASE_WIN = 'win';

const STEP = 1 / 60;
export { STEP };

export class World {
  constructor() {
    this.reset();
  }

  /** Rebuild everything for `levelIndex` (wrapping after the last floor) with score carried over. */
  reset(levelIndex = 0, carriedScore = 0) {
    this.levelIndex = levelIndex;
    this.score = carriedScore;
    this.phase = PHASE_TITLE;
    this.phaseTimer = 0;
    this.seconds = 0;
    this.alarm = 0;              // shared alarm meter, 0..1
    this.alarmsTriggered = 0;    // how many times the heist was blown (score penalty)
    this.vaultProgress = 0;      // seconds of cracking done on the vault door
    this.statusLine = 'Sneak in. Take everything. Leave quietly.';
    this.buildLevel(levelIndex);
  }

  buildLevel(index) {
    const def = LEVELS[index % LEVELS.length];
    this.levelName = def.name;
    this.solids = [];   // solid[gy][gx] true where a wall or crate blocks sight and movement
    this.crateAt = [];  // crate flag, drawn differently from walls
    this.shadows = [];
    this.gems = [];
    this.vault = null;
    this.exit = null;
    this.spawn = { x: 0, y: 0 };
    for (let gy = 0; gy < ROWS; gy += 1) {
      this.solids[gy] = [];
      this.crateAt[gy] = [];
      for (let gx = 0; gx < COLS; gx += 1) {
        const ch = def.map[gy][gx];
        const wall = ch === '#';
        const crate = ch === 'c';
        this.solids[gy][gx] = wall || crate;
        this.crateAt[gy][gx] = crate;
        const cx = gx * TILE + TILE / 2;
        const cy = gy * TILE + TILE / 2;
        if (ch === 'S') this.spawn = { x: cx, y: cy };
        if (ch === 'E') this.exit = { gx, gy, x: cx, y: cy };
        if (ch === 'g') this.gems.push({ gx, gy, x: cx, y: cy, taken: false });
        if (ch === 'V') this.vault = { gx, gy, x: cx, y: cy, cracked: false };
        if (ch === 's') this.shadows.push({ gx, gy, x: gx * TILE, y: gy * TILE });
      }
    }
    this.guards = def.guards.map((g, i) => ({
      id: i,
      route: g.route.map(([gx, gy]) => ({ x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 })),
      speed: g.speed,
      waypoint: 1,
      x: g.route[0][0] * TILE + TILE / 2,
      y: g.route[0][1] * TILE + TILE / 2,
      facing: 0,          // radians the guard looks
      huntTimer: 0,       // >0 means alarmed and hunting the last seen spot
      lastSeen: null,
      fill: 0,            // this guard's personal suspicion share of the alarm
    }));
    this.cameras = def.cameras.map((c, i) => ({
      id: i,
      x: c.tile[0] * TILE + TILE / 2,
      y: c.tile[1] * TILE + TILE / 2,
      from: (c.sweepFrom * Math.PI) / 180,
      to: (c.sweepTo * Math.PI) / 180,
      seconds: c.seconds,
      t: (i * 0.37) % 1,          // de-phase the sweeps
      facing: 0,
    }));
    this.thief = {
      x: this.spawn.x, y: this.spawn.y,
      facing: -Math.PI / 2,
      sneaking: false, sprinting: false,
      noisePulse: 0,   // seconds left of the expanding sprint-noise ring
      moving: false,
    };
    this.lootTotal = this.gems.length + (this.vault ? VAULT_VALUE : 0);
    this.lootTaken = 0;
    this.vaultOccupied = false;
  }

  /** Is the pixel point p inside a shadow patch? */
  inShadow(x, y) {
    return this.shadows.some((s) => x >= s.x && x < s.x + TILE && y >= s.y && y < s.y + TILE);
  }

  /**
   * How visible the thief is right now, 0..1: full in the open, dimmed sneaking, and all but
   * gone when sneaking inside a shadow patch.
   */
  thiefVisibility() {
    const t = this.thief;
    if (t.sneaking && this.inShadow(t.x, t.y)) return DETECTION.shadowFactor;
    if (t.sneaking) return DETECTION.sneakFactor;
    if (this.inShadow(t.x, t.y)) return 0.35;
    return 1;
  }

  /** Advance the whole heist by one fixed step. `input` is the player intent from input.js. */
  step(input) {
    this.phaseTimer += STEP;
    if (this.phase !== PHASE_PLAY) {
      if (this.phase === PHASE_CAUGHT && this.phaseTimer > 2.2) this.retry();
      if (this.phase === PHASE_CLEAR && this.phaseTimer > 2.0) this.nextLevel();
      return;
    }
    this.seconds += STEP;
    thiefStep(this, input);
    for (const guard of this.guards) guardStep(this, guard, STEP);
    for (const camera of this.cameras) cameraStep(this, camera, STEP);
    this.collectLoot();
    this.updateAlarm(STEP);
    if (this.lootTaken >= this.lootTotal && this.atExit()) this.clearLevel();
  }

  /** Pick up gems the thief touches and track vault cracking while E is held beside it. */
  collectLoot() {
    const t = this.thief;
    for (const gem of this.gems) {
      if (gem.taken) continue;
      if (Math.hypot(gem.x - t.x, gem.y - t.y) < TILE * 0.6) {
        gem.taken = true;
        this.lootTaken += GEM_VALUE;
        this.score += SCORE_GEM;
        this.statusLine = 'Gem pocketed.';
      }
    }
    this.vaultOccupied = false;
    if (this.vault && !this.vault.cracked) {
      const near = Math.hypot(this.vault.x - t.x, this.vault.y - t.y) < TILE * 1.1;
      this.vaultOccupied = near;
      if (near && t.cracking) {
        this.vaultProgress += STEP;
        if (this.vaultProgress >= VAULT_OPEN_SECONDS) {
          this.vault.cracked = true;
          this.lootTaken += VAULT_VALUE;
          this.score += SCORE_VAULT;
          this.statusLine = 'Vault cracked — the prize trove is yours!';
        }
      }
    }
  }

  /** Alarm fill from every watcher that can see the thief, and the cool-down when nobody can. */
  updateAlarm(dt) {
    let seen = 0;
    const visibility = this.thiefVisibility();
    for (const guard of this.guards) guard.fill = 0;
    for (const guard of this.guards) {
      if (coneSees(this, guard, this.thief, 0.60, 250) && visibility > 0) {
        const close = Math.hypot(guard.x - this.thief.x, guard.y - this.thief.y) < DETECTION.closeRange;
        seen += DETECTION.fillPerSecond * visibility * (close ? 1 + DETECTION.closeBonus : 1);
        guard.fill = 1;
        guard.huntTimer = HUNT_SECONDS;
        guard.lastSeen = { x: this.thief.x, y: this.thief.y };
      }
    }
    for (const camera of this.cameras) {
      if (coneSees(this, camera, this.thief, 0.46, 210) && visibility > 0) {
        seen += DETECTION.fillPerSecond * 0.7 * visibility;
      }
    }
    if (seen > 0) this.alarm = Math.min(1, this.alarm + seen * dt);
    else this.alarm = Math.max(0, this.alarm - DETECTION.coolPerSecond * dt);
    if (this.alarm >= DETECTION.caughtAt) this.caught('The alarm is screaming. Security has you.');
    for (const guard of this.guards) {
      if (Math.hypot(guard.x - this.thief.x, guard.y - this.thief.y) < 26) {
        this.caught('A guard grabbed you.');
        return;
      }
    }
  }

  /** Sprint noise: emitted by player.js, here it simply wakes guards it reaches. */
  emitNoise(x, y) {
    this.noise = { x, y, radius: NOISE_RADIUS, t: 0.7 };
    for (const guard of this.guards) {
      if (Math.hypot(guard.x - x, guard.y - y) < NOISE_RADIUS) {
        guard.huntTimer = Math.max(guard.huntTimer, HUNT_SECONDS * 0.7);
        guard.lastSeen = { x, y };
      }
    }
  }

  atExit() {
    const e = this.exit;
    return e && Math.hypot(e.x - this.thief.x, e.y - this.thief.y) < TILE * 0.8;
  }

  caught(reason) {
    this.alarmsTriggered += 1;
    this.statusLine = reason;
    this.phase = PHASE_CAUGHT;
    this.phaseTimer = 0;
  }

  /** Retry the same floor, keeping the score but paying the alarm penalty once per blow. */
  retry() {
    const penalty = SCORE_ALARM_PENALTY * this.alarmsTriggered;
    const carried = Math.max(0, this.score - penalty);
    const floor = this.levelIndex;
    this.reset(floor, carried);
    this.alarmsTriggered = 0;
    this.phase = PHASE_PLAY;
    this.statusLine = 'Back in. Quieter this time.';
  }

  clearLevel() {
    this.score += SCORE_LEVEL_CLEAR;
    this.phase = PHASE_CLEAR;
    this.phaseTimer = 0;
  }

  nextLevel() {
    const next = this.levelIndex + 1;
    if (next >= LEVELS.length) {
      this.phase = PHASE_WIN;
      this.phaseTimer = 0;
    } else {
      const score = this.score;
      this.reset(next, score);
      this.phase = PHASE_PLAY;
      this.statusLine = 'Floor cleared. Keep the noise down.';
    }
  }
}
