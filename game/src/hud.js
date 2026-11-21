// The HUD drawn over the room: objective line and loot tally, the alarm meter that fills red
// as watchers see you, the run timer and score, sneak/sprint gear, and the vault-cracking
// progress bar while E is held. Everything a player reads without leaving the frame.

import { VIEW_W, VIEW_H } from './config.js';
import { VAULT_OPEN_SECONDS } from './config.js';

const HUD_H = 64;

export function drawHud(ctx, world) {
  ctx.save();
  // Top strip.
  ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.strokeStyle = 'rgba(90, 140, 200, 0.35)';
  ctx.beginPath();
  ctx.moveTo(0, HUD_H - 1);
  ctx.lineTo(VIEW_W, HUD_H - 1);
  ctx.stroke();

  // Objective + loot tally (left).
  ctx.fillStyle = '#9fc4e8';
  ctx.font = '15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(world.levelName, 16, 24);
  const loot = `Loot ${world.lootTaken}/${world.lootTotal}`;
  ctx.fillStyle = world.lootTaken >= world.lootTotal ? '#ffd75e' : '#e8ecf2';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(loot, 16, 48);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#7f92a8';
  ctx.fillText(
    world.lootTaken >= world.lootTotal ? 'OBJECTIVE: reach the glowing EXIT' : 'OBJECTIVE: take all loot, stay unseen',
    130, 48);

  // Alarm meter (centre): the meter that decides the heist.
  const meterW = 300;
  const meterX = (VIEW_W - meterW) / 2;
  ctx.fillStyle = '#e8ecf2';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ALARM', VIEW_W / 2, 24);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(meterX, 32, meterW, 18);
  const hot = world.alarm > 0.6;
  const grad = ctx.createLinearGradient(meterX, 0, meterX + meterW, 0);
  grad.addColorStop(0, '#4cc9f0');
  grad.addColorStop(0.6, '#f4a53c');
  grad.addColorStop(1, '#e8484d');
  ctx.fillStyle = hot ? '#e8484d' : grad;
  ctx.fillRect(meterX, 32, meterW * Math.max(world.alarm, 0.015), 18);
  ctx.strokeStyle = 'rgba(160,190,220,0.5)';
  ctx.strokeRect(meterX + 0.5, 32.5, meterW - 1, 17);
  if (hot) {
    ctx.fillStyle = `rgba(232,72,77,${0.5 + 0.4 * Math.sin(world.seconds * 18)})`;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('SPOTTED — BREAK LINE OF SIGHT', VIEW_W / 2, 62);
  }

  // Timer and score (right).
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8ecf2';
  ctx.font = 'bold 16px system-ui, sans-serif';
  const m = Math.floor(world.seconds / 60);
  const s = Math.floor(world.seconds % 60);
  ctx.fillText(`${m}:${String(s).padStart(2, '0')}`, VIEW_W - 130, 28);
  ctx.fillText(`SCORE ${world.score}`, VIEW_W - 130, 50);
  // Gear indicator.
  const gear = world.thief.sneaking ? 'SNEAK' : world.thief.sprinting ? 'SPRINT' : 'WALK';
  ctx.fillStyle = world.thief.sneaking ? '#8fd3ff' : world.thief.sprinting ? '#f4a53c' : '#7f92a8';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(gear, VIEW_W - 18, 28);
  ctx.fillStyle = '#66788e';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('R restart', VIEW_W - 18, 50);

  // Vault cracking bar.
  if (world.vaultOccupied && world.vault && !world.vault.cracked) {
    const w = 260;
    const x = (VIEW_W - w) / 2;
    const y = VIEW_H - 56;
    ctx.fillStyle = 'rgba(7,10,18,0.85)';
    ctx.fillRect(x - 12, y - 24, w + 24, 44);
    ctx.fillStyle = '#ffd75e';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRACKING VAULT — hold E', VIEW_W / 2, y - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = '#ffd75e';
    ctx.fillRect(x, y, w * Math.min(1, world.vaultProgress / VAULT_OPEN_SECONDS), 10);
  }
  ctx.restore();
}
