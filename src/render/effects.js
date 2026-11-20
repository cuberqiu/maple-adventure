// 粒子与伤害跳字（世界坐标）+ 洞窟光照
import { game, VIEW_W, VIEW_H } from '../game/state.js';

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
    ctx.font = (n.big ? 'bold 22px' : 'bold 16px') + ' system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(60,45,30,0.85)';
    ctx.strokeText(n.text, n.x, n.y);
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, n.x, n.y);
    ctx.textAlign = 'left';
  }
  ctx.globalAlpha = 1;
}

// 洞窟里的黑暗 + 玩家周围的光圈
export function drawCaveLight(ctx) {
  if (game.map?.theme !== 'cave') return;
  const p = game.player;
  const lx = p.x + p.w / 2;
  const ly = p.y + p.h / 2;
  const g = ctx.createRadialGradient(lx, ly, 60, lx, ly, 420);
  g.addColorStop(0, 'rgba(20,26,38,0)');
  g.addColorStop(1, 'rgba(10,14,22,0.72)');
  ctx.fillStyle = g;
  ctx.fillRect(game.cam.x, game.cam.y, VIEW_W, VIEW_H);
}
