// The renderer: draws the whole heist frame — floor and shadow patches, walls and crates,
// gems and the vault, the exit glow, guards with their raycast vision cones (amber on patrol,
// red on the hunt), sweeping camera cones, the sprint noise ring, the thief, then the HUD and
// the title/caught/cleared/won overlays.

import { VIEW_W, VIEW_H, TILE, COLS, ROWS } from './config.js';
import { coneOutline } from './vision.js';
import { GUARD_HALF_ANGLE } from './guards.js';
import { CAMERA_HALF_ANGLE } from './cameras.js';
import { drawHud } from './hud.js';
import { PHASE_TITLE, PHASE_CAUGHT, PHASE_CLEAR, PHASE_WIN } from './world.js';

const FLOOR_A = '#141b28';
const FLOOR_B = '#16202f';
const WALL = '#2c3a52';
const CRATE = '#5a4632';
const SHADOW = 'rgba(4, 6, 12, 0.72)';

function drawRoom(ctx, world) {
  for (let gy = 0; gy < ROWS; gy += 1) {
    for (let gx = 0; gx < COLS; gx += 1) {
      ctx.fillStyle = (gx + gy) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(gx * TILE, gy * TILE, TILE, TILE);
      if (world.solids[gy][gx]) {
        ctx.fillStyle = world.crateAt[gy][gx] ? CRATE : WALL;
        ctx.fillRect(gx * TILE, gy * TILE, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.strokeRect(gx * TILE + 1.5, gy * TILE + 1.5, TILE - 3, TILE - 3);
        if (world.crateAt[gy][gx]) {
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.moveTo(gx * TILE + 4, gy * TILE + 4);
          ctx.lineTo(gx * TILE + TILE - 4, gy * TILE + TILE - 4);
          ctx.moveTo(gx * TILE + TILE - 4, gy * TILE + 4);
          ctx.lineTo(gx * TILE + 4, gy * TILE + TILE - 4);
          ctx.stroke();
        }
      }
    }
  }
  for (const s of world.shadows) {
    ctx.fillStyle = SHADOW;
    ctx.fillRect(s.x, s.y, TILE, TILE);
  }
}

function drawLoot(ctx, world) {
  // Exit: pulsing green doorway, lit green once every loot is carried.
  const e = world.exit;
  const ready = world.lootTaken >= world.lootTotal;
  const pulse = 0.5 + 0.5 * Math.sin(world.seconds * 5);
  ctx.fillStyle = ready ? `rgba(92, 219, 96, ${0.35 + 0.3 * pulse})` : 'rgba(92,219,96,0.15)';
  ctx.fillRect(e.gx * TILE, e.gy * TILE, TILE, TILE);
  ctx.strokeStyle = ready ? '#5cdb60' : 'rgba(92,219,96,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.gx * TILE + 2, e.gy * TILE + 2, TILE - 4, TILE - 4);
  ctx.lineWidth = 1;
  ctx.fillStyle = ready ? '#c9f5cb' : '#7fae81';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', e.x, e.y + 4);

  // Gems: small blue diamonds that sparkle.
  for (const gem of world.gems) {
    if (gem.taken) continue;
    ctx.save();
    ctx.translate(gem.x, gem.y);
    ctx.rotate(world.seconds * 1.4 + gem.gx);
    ctx.fillStyle = '#4cc9f0';
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.stroke();
    ctx.restore();
  }

  // Vault: gold door with the prize behind it.
  const v = world.vault;
  if (v) {
    ctx.fillStyle = v.cracked ? '#6b5620' : '#c9a227';
    ctx.fillRect(v.gx * TILE + 4, v.gy * TILE + 4, TILE - 8, TILE - 8);
    ctx.strokeStyle = v.cracked ? '#3a3010' : '#ffe28a';
    ctx.lineWidth = 2;
    ctx.strokeRect(v.gx * TILE + 6, v.gy * TILE + 6, TILE - 12, TILE - 12);
    ctx.lineWidth = 1;
    ctx.fillStyle = v.cracked ? '#2c2610' : '#5c4a10';
    ctx.beginPath();
    ctx.arc(v.x, v.y, 6, 0, Math.PI * 2);
    ctx.fill();
    if (!v.cracked) {
      ctx.fillStyle = '#fff2c2';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText('VAULT', v.x, v.y - TILE / 2 + 4);
    }
  }
}

function drawCones(ctx, world) {
  // Guard cones: amber when patrolling, red while hunting, red-tinted when actively seeing you.
  for (const guard of world.guards) {
    const pts = coneOutline(world, guard.x, guard.y, guard.facing, GUARD_HALF_ANGLE, 250);
    const hunting = guard.huntTimer > 0;
    const seeing = guard.fill > 0;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = seeing ? 'rgba(232, 72, 77, 0.30)'
      : hunting ? 'rgba(232, 72, 77, 0.18)' : 'rgba(244, 196, 60, 0.16)';
    ctx.fill();
    ctx.strokeStyle = seeing ? 'rgba(232,72,77,0.8)' : hunting ? 'rgba(232,72,77,0.5)' : 'rgba(244,196,60,0.45)';
    ctx.stroke();
  }
  // Camera cones: cool blue-white beams sweeping from a wall housing.
  for (const camera of world.cameras) {
    const pts = coneOutline(world, camera.x, camera.y, camera.facing, CAMERA_HALF_ANGLE, 210);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(120, 200, 255, 0.14)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,0.45)';
    ctx.stroke();
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e6f4ff';
    ctx.beginPath();
    ctx.moveTo(camera.x, camera.y);
    ctx.lineTo(camera.x + Math.cos(camera.facing) * 12, camera.y + Math.sin(camera.facing) * 12);
    ctx.stroke();
  }
}

function drawActors(ctx, world) {
  // Sprint noise ring.
  if (world.noise) {
    const n = world.noise;
    ctx.beginPath();
    ctx.arc(n.x, n.y, NOISE_DRAW_RADIUS * (1 - n.t / 0.7), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(244, 165, 60, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  // Guards: dark figures with a bright visor facing where they look.
  for (const guard of world.guards) {
    const hunting = guard.huntTimer > 0;
    ctx.fillStyle = hunting ? '#7d2f33' : '#3a4a63';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hunting ? '#e8484d' : '#8fa4c2';
    ctx.stroke();
    ctx.strokeStyle = '#f4c43c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * 14, guard.y + Math.sin(guard.facing) * 14);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  // The thief: teal, with a soft cap lamp so you always find yourself.
  const t = world.thief;
  ctx.fillStyle = 'rgba(20, 30, 45, 0.5)';
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 6, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = t.sneaking ? '#2aa79b' : '#37d4c4';
  ctx.beginPath();
  ctx.arc(t.x, t.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8fff9';
  ctx.stroke();
  ctx.strokeStyle = '#d8fff9';
  ctx.beginPath();
  ctx.moveTo(t.x, t.y);
  ctx.lineTo(t.x + Math.cos(t.facing) * 13, t.y + Math.sin(t.facing) * 13);
  ctx.stroke();
}
const NOISE_DRAW_RADIUS = 190;

function overlay(ctx, title, lines, tint) {
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2f6fb';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 40);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = '#b8c6d8';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 + 6 + i * 26));
}

export function render(ctx, world) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawRoom(ctx, world);
  drawCones(ctx, world);
  drawLoot(ctx, world);
  drawActors(ctx, world);
  drawHud(ctx, world);

  if (world.phase === PHASE_TITLE) {
    overlay(ctx, 'COBALT VAULT', [
      'A top-down heist in three floors.',
      'WASD / arrows to move · hold Shift to sneak · Ctrl to sprint (loud!) · hold E to crack the vault',
      'Read the cones: amber guards and blue cameras fill the ALARM meter while they see you.',
      'Take every gem and the vault, then leave through the EXIT. Press Enter to begin the job.',
    ], 'rgba(5, 8, 15, 0.82)');
  } else if (world.phase === PHASE_CAUGHT) {
    overlay(ctx, 'CAUGHT', [
      world.statusLine,
      `Score kept: ${world.score} — you go back in in a moment (or press R now).`,
    ], 'rgba(60, 8, 10, 0.62)');
  } else if (world.phase === PHASE_CLEAR) {
    overlay(ctx, 'FLOOR CLEARED', [
      world.levelName,
      `Loot ${world.lootTaken}/${world.lootTotal} · score ${world.score}`,
      'Descending...',
    ], 'rgba(8, 40, 16, 0.55)');
  } else if (world.phase === PHASE_WIN) {
    overlay(ctx, 'CLEAN GETAWAY', [
      `The Cobalt Vault is emptied. Final score: ${world.score}.`,
      `Time: ${Math.floor(world.seconds / 60)}m ${Math.floor(world.seconds % 60)}s. Press Enter to run it again.`,
    ], 'rgba(6, 12, 24, 0.8)');
  }
}
