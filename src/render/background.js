// 分层视差背景：小镇/林地为天空+远山，洞窟为暗色岩壁与荧光水晶
import { VIEW_W, VIEW_H } from '../game/state.js';

// 一层起伏的山丘
function hill(ctx, camX, factor, baseY, amp, color, seed) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-50, VIEW_H + 50);
  const off = camX * factor;
  for (let x = -50; x <= VIEW_W + 50; x += 20) {
    const t = (x + off + seed * 100) * 0.006;
    ctx.lineTo(x, baseY - Math.sin(t) * amp - Math.sin(t * 2.3 + seed) * amp * 0.4);
  }
  ctx.lineTo(VIEW_W + 50, VIEW_H + 50);
  ctx.closePath();
  ctx.fill();
}

function cloud(ctx, x, y, s, alpha) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (const [dx, dy, r] of [[0, 0, 22], [18, 6, 16], [-18, 6, 15], [6, -10, 14]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBackground(ctx, map, cam, frame) {
  const theme = map.theme;
  if (theme === 'cave') {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#141b26');
    g.addColorStop(0.6, '#1e2735');
    g.addColorStop(1, '#2a3345');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // 远景石笋（视差 0.2）
    ctx.fillStyle = '#232d3e';
    drawStalactites(ctx, cam.x * 0.2, 90, 46);
    ctx.fillStyle = '#1b2432';
    drawStalactites(ctx, cam.x * 0.45 + 300, 150, 62);
    // 荧光水晶簇
    for (let i = 0; i < 7; i++) {
      const cx = ((i * 463 - cam.x * 0.5) % (VIEW_W + 200) + VIEW_W + 200) % (VIEW_W + 200) - 100;
      const cy = 110 + ((i * 197) % 300);
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.03 + i * 2.1);
      ctx.globalAlpha = 0.25 + pulse * 0.3;
      ctx.fillStyle = i % 2 ? '#7ee8d0' : '#b09ae8';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16);
      ctx.lineTo(cx + 7, cy + 6);
      ctx.lineTo(cx, cy + 14);
      ctx.lineTo(cx - 7, cy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    return;
  }

  // 天空
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  if (theme === 'town') {
    g.addColorStop(0, '#9fdcf2');
    g.addColorStop(0.7, '#d9f2e5');
    g.addColorStop(1, '#f2f7d9');
  } else {
    g.addColorStop(0, '#8fd0e8');
    g.addColorStop(0.6, '#cfeac2');
    g.addColorStop(1, '#eaf4cf');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // 太阳
  ctx.fillStyle = 'rgba(255,238,170,0.95)';
  ctx.beginPath();
  ctx.arc(830 - cam.x * 0.05, 90, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,238,170,0.25)';
  ctx.beginPath();
  ctx.arc(830 - cam.x * 0.05, 90, 54, 0, Math.PI * 2);
  ctx.fill();

  // 云（缓慢漂移 + 视差）
  const drift = frame * 0.08;
  for (let i = 0; i < 4; i++) {
    const cx = (((i * 350 + drift) - cam.x * 0.12) % (VIEW_W + 300) + VIEW_W + 300) % (VIEW_W + 300) - 150;
    cloud(ctx, cx, 60 + i * 45, 0.8 + (i % 2) * 0.4, 0.85);
  }

  // 远山两层
  hill(ctx, cam.x, 0.2, 400, 55, theme === 'town' ? '#bcdcec' : '#b5dcc4', 1);
  hill(ctx, cam.x, 0.4, 460, 70, theme === 'town' ? '#a8d4b8' : '#98cf9f', 3);
}

function drawStalactites(ctx, off, topY, hMax) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= VIEW_W + 60; x += 60) {
    const t = (x + off) * 0.011;
    const h = hMax * (0.55 + 0.45 * Math.abs(Math.sin(t)));
    ctx.lineTo(x, topY + h);
    ctx.lineTo(x + 30, topY + h * 0.4);
  }
  ctx.lineTo(VIEW_W, 0);
  ctx.closePath();
  ctx.fill();
}
