// 粒子与伤害跳字（世界坐标）、洞窟光照、Boss 条。
import { game, VIEW_W, VIEW_H } from '../game/state.js';
import { FONT, roundRect } from './sprite.js';

export function drawParticles(ctx) {
  for (const pt of game.particles) {
    ctx.globalAlpha = Math.min(1, pt.life / 18);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawDmgNums(ctx) {
  for (const n of game.dmgNums) {
    const a = Math.min(1, n.life / 20);
    ctx.globalAlpha = a;
    ctx.font = (n.big ? 'bold 20px ' : 'bold 14px ') + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(74,46,31,0.85)';
    ctx.strokeText(n.text, n.x, n.y);
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, n.x, n.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// 洞窟里的黑暗 + 玩家周围的光圈（在平移后的世界坐标里画）
export function drawCaveLight(ctx) {
  if (game.map?.theme !== 'cave') return;
  const p = game.player;
  if (!p) return;
  const lx = p.x + p.w / 2;
  const ly = p.y + p.h / 2;
  const g = ctx.createRadialGradient(lx, ly, 40, lx, ly, 300);
  g.addColorStop(0, 'rgba(20,26,38,0)');
  g.addColorStop(1, 'rgba(10,14,22,0.72)');
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
}

// Boss 条（屏幕空间，顶部居中）：名牌「磐苔巨像」在条上方。
// compact（窄横屏，舞台宽 < 560 或高 < 320）时缩短条宽，避开右上 HUD 三钮（R-04）。
export function drawBossBar(ctx, compact = false) {
  const boss = game.monsters.find((m) => m.def.boss && m.hp > 0 && !m.dead);
  if (!boss) return;

  const w = compact ? 180 : 220;
  const h = 12;
  const x = (VIEW_W - w) / 2;
  const y = 48;
  const cx = VIEW_W / 2;
  const ratio = Math.max(0, boss.hp / boss.maxHp);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 名牌（血条上方，不压条）
  const name = boss.def.name;
  ctx.font = `bold 11px ${FONT}`;
  const nameW = ctx.measureText(name).width + 20;
  const nameY = y - 10;
  ctx.fillStyle = 'rgba(58,42,34,0.82)';
  roundRect(ctx, cx - nameW / 2, nameY - 8, nameW, 16, 8);
  ctx.fill();
  ctx.fillStyle = '#FFF6E3';
  ctx.fillText(name, cx, nameY);

  // 血条
  ctx.fillStyle = '#4A2E1F';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#F3E3C3';
  roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 3);
  ctx.fill();
  if (ratio > 0) {
    ctx.fillStyle = '#9A8CD6';
    roundRect(ctx, x + 3, y + 3, Math.max(6, (w - 6) * ratio), h - 6, 3);
    ctx.fill();
  }
  // 数字（浅色 + 3px 墨描边，避免叠在 --boss 紫上偏弱）
  ctx.font = `bold 11px ${FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(74,46,31,1)';
  ctx.strokeText(`${Math.ceil(boss.hp)}`, cx, y + h / 2 + 0.5);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${Math.ceil(boss.hp)}`, cx, y + h / 2 + 0.5);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
