// 角色 / 怪物 / Boss / 掉落物 / 弹幕 绘制（Q 版位图路线，底部中心锚点 + 平滑缩放）。
import { game } from '../game/state.js';
import { HERO_H, MONSTER_H, MONSTER_SHADOW, SLASH_H, FOG_PUFF_H } from './metrics.js';
import { drawSprite, drawSpriteCenter, drawSpriteFlash, shadow, capsuleBar } from './sprite.js';

const RUN_FRAME_T = 0.075; // 6 帧 / 0.075s
const RUN_BOB = [0, 1.5, -1, -2.5, 0, -1];

function runIndex(frame) {
  const t = frame / 60;
  return Math.floor(t / RUN_FRAME_T) % 6;
}

// ---------- 玩家 ----------
export function drawPlayer(ctx, p, frame) {
  const cx = p.x + p.w / 2;
  const bottom = p.y + p.h;

  if (p.dead) {
    // 倒地：旋转 + 淡出
    ctx.save();
    ctx.translate(cx, bottom - 6);
    ctx.rotate((Math.PI / 2) * Math.min(1, (140 - p.deathTimer) / 30));
    ctx.globalAlpha = Math.max(0.25, p.deathTimer / 140);
    drawSprite(ctx, 'hero/hurt', 0, 6, HERO_H);
    ctx.restore();
    return;
  }

  const frameName = heroFrame(p, frame);
  const running = frameName.startsWith('run');
  const ri = running ? runIndex(frame) : 0;
  let sy = frameName === 'idle' ? 1 - Math.sin((frame / 72) * Math.PI * 2) * 0.03 : 1;
  if (running) sy = ri === 0 || ri === 4 ? 0.96 : ri === 3 ? 1.03 : 1;
  const oy = running ? RUN_BOB[ri] : 0;

  shadow(ctx, cx, bottom, running && ri === 3 ? 33 : 37);
  // 受击闪白（只保留一种反馈，P2-12：不再叠加 i-frame 闪烁）
  drawSpriteFlash(ctx, `hero/${frameName}`, cx, bottom, HERO_H, {
    flip: p.facing < 0,
    sy,
    oy,
    rotate: running ? 0.05 : 0,
  }, p.flash);
}

function heroFrame(p, frame) {
  if (p.castTimer > 0) return 'cast';
  if (p.attackTimer > 0) return 'attack';
  if (p.climbing) return 'climb';
  if (!p.onGround) return 'jump';
  if (Math.abs(p.vx) > 0.5) return `run${runIndex(frame) + 1}`;
  return 'idle';
}

// ---------- 怪物 ----------
export function drawMonster(ctx, m, frame) {
  if (m.dead && m.fadeTimer <= 0) return;
  const cx = m.x + m.w / 2;
  const bottom = m.y + m.h;

  ctx.save();
  const alpha = m.dead ? m.fadeTimer / 40 : 1;
  ctx.globalAlpha = alpha;
  if (m.dead) {
    ctx.translate(cx, bottom);
    ctx.rotate((1 - alpha) * 1.2);
    ctx.scale(1, alpha);
    ctx.translate(-cx, -bottom);
  }
  ctx.restore();

  shadow(ctx, cx, bottom, MONSTER_SHADOW[m.type] || m.w);
  const frameKey = `${m.type}/${monsterFrame(m, frame)}`;
  const flip = m.type === 'boss' ? m.facing > 0 : m.facing < 0;
  const opts = { flip };
  if (m.type === 'moth') opts.oy = Math.sin((frame / 60) * 6) * 3;
  drawSpriteFlash(ctx, frameKey, cx, bottom, MONSTER_H[m.type], opts, m.flash);

  if (!m.dead && !m.def.boss && m.hp < m.maxHp) {
    capsuleBar(ctx, cx, bottom - MONSTER_H[m.type] - 8, m.w + 14, m.hp / m.maxHp, '#F0465A');
  }
}

function monsterFrame(m, frame) {
  const t = frame / 60;
  if (m.type === 'bramble') {
    if (!m.onGround) return 'jump';
    if (m.state === 'chase') return 'roll';
    return 'idle';
  }
  if (m.type === 'moth') {
    return Math.floor(t / 0.15) % 2 ? 'fly2' : 'fly1';
  }
  if (m.type === 'golem') {
    if (Math.abs(m.vx) > 0.2) return Math.floor(t / 0.25) % 2 ? 'idle' : 'move';
    return 'idle';
  }
  return bossFrame(m);
}

function bossFrame(m) {
  if (m.state === 'windup') return 'charge';
  if (m.state === 'charging') return 'slam';
  if (m.state === 'rest' && m.attackKind === 'spit') return 'fog';
  return 'idle';
}

// ---------- 掉落物 ----------
export function drawDrops(ctx, frame) {
  const t = frame / 60;
  for (const d of game.drops) {
    const bob = d.grounded ? Math.sin(t * 4 + d.x) * 2 : 0;
    const y = d.y + bob;
    if (d.kind === 'coin') {
      // 露珠（货币）
      const sx = Math.max(0.2, Math.abs(Math.cos(t * 3 + d.x)));
      drawSpriteCenter(ctx, 'items/dew', d.x + d.w / 2, y + d.h / 2, 16, { sx });
    } else {
      const key = d.kind === 'hpPotion' ? 'items/potion_red' : 'items/potion_blue';
      drawSpriteCenter(ctx, key, d.x + d.w / 2, y + d.h / 2, 16);
    }
  }
}

// ---------- 弹幕 ----------
export function drawProjectiles(ctx, frame) {
  const t = frame / 60;
  for (const pr of game.projectiles) {
    const cx = pr.x + pr.w / 2;
    const cy = pr.y + pr.h / 2;
    if (pr.kind === 'gale') {
      // 翠风斩风刃
      const s = 0.8 + Math.min(1, pr.life / 20) * 0.3;
      drawSpriteCenter(ctx, 'fx/leaf_slash', cx, cy, SLASH_H, { flip: pr.vx < 0, sx: s, sy: s });
    } else {
      // Boss 孢子（巨像孢子特效）
      const grow = 1 + Math.sin(t * 3 + pr.x) * 0.08;
      drawSpriteCenter(ctx, 'fx/fog_puff', cx, cy, FOG_PUFF_H * grow, { alpha: 0.85 });
    }
  }
}
