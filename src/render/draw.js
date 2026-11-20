// 地图元素绘制：地面 / 平台 / 绳索 / 传送门 / 陷阱 / 装饰 / NPC / 存档水晶
import { game } from '../game/state.js';

const T = { // 主题配色
  town: { dirt: '#8a6a4f', dirtDark: '#75563e', grass: '#7ecb8f', grassDark: '#5aa86c' },
  field: { dirt: '#84663f', dirtDark: '#6d5233', grass: '#8fd894', grassDark: '#66b273' },
  cave: { dirt: '#3d4457', dirtDark: '#313748', grass: '#5c7d8c', grassDark: '#46626f' },
};

export function drawMap(ctx, frame) {
  const map = game.map;
  const theme = T[map.theme] || T.town;

  // ---- 地面 ----
  for (const g of map.ground) {
    ctx.fillStyle = theme.dirt;
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = theme.dirtDark;
    for (let x = g.x; x < g.x + g.w; x += 46) {
      ctx.fillRect(x + 8, g.y + 34, 20, 10);
      ctx.fillRect(x + 30, g.y + 60, 14, 8);
    }
    // 顶部的草皮 / 苔藓
    ctx.fillStyle = theme.grass;
    ctx.fillRect(g.x, g.y, g.w, 10);
    ctx.fillStyle = theme.grassDark;
    for (let x = g.x; x < g.x + g.w; x += 16) {
      ctx.fillRect(x, g.y + 8, 8, 4);
    }
    if (map.theme !== 'cave') {
      // 小草
      ctx.strokeStyle = theme.grassDark;
      ctx.lineWidth = 2;
      for (let x = g.x + 10; x < g.x + g.w; x += 90) {
        ctx.beginPath();
        ctx.moveTo(x, g.y);
        ctx.quadraticCurveTo(x + 3, g.y - 8, x + 6, g.y - 3);
        ctx.stroke();
      }
    }
  }

  // ---- 单向平台 ----
  for (const p of map.platforms) {
    ctx.fillStyle = map.theme === 'cave' ? '#4a5468' : '#c9a06a';
    ctx.fillRect(p.x, p.y, p.w, 14);
    ctx.fillStyle = map.theme === 'cave' ? '#3a4356' : '#a67c4e';
    ctx.fillRect(p.x, p.y + 10, p.w, 4);
    ctx.strokeStyle = map.theme === 'cave' ? '#5d6a82' : '#8a6a45';
    ctx.lineWidth = 2;
    for (let x = p.x + 20; x < p.x + p.w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, p.y + 2);
      ctx.lineTo(x, p.y + 12);
      ctx.stroke();
    }
    // 平台上的小草 / 苔藓
    ctx.fillStyle = map.theme === 'cave' ? '#6f9b6f' : '#8fd894';
    ctx.fillRect(p.x, p.y - 3, p.w, 4);
  }

  // ---- 绳索 / 梯子 ----
  for (const l of map.ladders) {
    ctx.strokeStyle = '#a07850';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(l.x + 3, l.y);
    ctx.lineTo(l.x + 3, l.y + l.h);
    ctx.moveTo(l.x + l.w - 3, l.y);
    ctx.lineTo(l.x + l.w - 3, l.y + l.h);
    ctx.stroke();
    ctx.strokeStyle = '#8a6240';
    ctx.lineWidth = 2;
    for (let y = l.y + 8; y < l.y + l.h; y += 14) {
      ctx.beginPath();
      ctx.moveTo(l.x + 2, y);
      ctx.lineTo(l.x + l.w - 2, y);
      ctx.stroke();
    }
    // 顶部小木桩
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(l.x - 6, l.y - 6, l.w + 12, 6);
  }

  // ---- 陷阱（尖晶石） ----
  for (const hz of map.hazards) {
    for (let i = 0; i < hz.w / 12; i++) {
      const x = hz.x + i * 12;
      const hh = 14 + ((i * 7) % 8);
      ctx.fillStyle = i % 2 ? '#9adbe8' : '#c3b6ef';
      ctx.beginPath();
      ctx.moveTo(x, hz.y + hz.h);
      ctx.lineTo(x + 6, hz.y + hz.h - hh);
      ctx.lineTo(x + 12, hz.y + hz.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(x + 4, hz.y + hz.h);
      ctx.lineTo(x + 6, hz.y + hz.h - hh);
      ctx.lineTo(x + 6, hz.y + hz.h);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- 装饰 ----
  for (const d of map.decor) drawDecor(ctx, d, frame);

  // ---- 指示牌 ----
  for (const s of map.signs) {
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(s.x + 8, s.y + 20, 6, 26);
    ctx.fillStyle = '#c9a06a';
    ctx.fillRect(s.x - 8, s.y, 40, 24);
    ctx.strokeStyle = '#8a6a45';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x - 8, s.y, 40, 24);
    ctx.fillStyle = '#6d5233';
    ctx.fillRect(s.x - 2, s.y + 6, 28, 3);
    ctx.fillRect(s.x - 2, s.y + 13, 20, 3);
  }

  // ---- 存档水晶 ----
  if (map.crystal) {
    const c = map.crystal;
    const pulse = 0.6 + 0.4 * Math.sin(frame * 0.05);
    ctx.save();
    ctx.globalAlpha = 0.25 + pulse * 0.2;
    ctx.fillStyle = '#8fe0ff';
    ctx.beginPath();
    ctx.arc(c.x + 8, c.y - 14, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#a8e8ff';
    ctx.beginPath();
    ctx.moveTo(c.x + 8, c.y - 40);
    ctx.lineTo(c.x + 18, c.y - 14);
    ctx.lineTo(c.x + 8, c.y + 2);
    ctx.lineTo(c.x - 2, c.y - 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(c.x + 8, c.y - 36);
    ctx.lineTo(c.x + 13, c.y - 16);
    ctx.lineTo(c.x + 8, c.y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6d8a99';
    ctx.fillRect(c.x + 2, c.y + 2, 12, 6);
  }

  // ---- NPC ----
  for (const n of map.npcs) {
    drawNpc(ctx, n, frame);
  }

  // ---- 传送门 ----
  for (const p of map.portals) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const wob = Math.sin(frame * 0.06) * 3;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.ellipse(cx, cy, p.w * 0.75, p.h * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, p.w * 0.45 + wob, p.h * 0.5 - wob, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, p.w * 0.28 - wob * 0.5, p.h * 0.36 + wob, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 门内上升的光点
    for (let i = 0; i < 5; i++) {
      const t = ((frame * 0.02 + i * 0.2) % 1);
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(cx + Math.sin(i * 2.4 + frame * 0.05) * 12, cy + p.h * 0.4 - t * p.h * 0.8, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // 门牌
    ctx.fillStyle = 'rgba(91,74,58,0.85)';
    const label = `➜ ${p.label}`;
    ctx.font = '13px system-ui, sans-serif';
    const tw = ctx.measureText(label).width;
    ctx.fillRect(cx - tw / 2 - 6, p.y - 30, tw + 12, 20);
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, p.y - 16);
    ctx.textAlign = 'left';
  }
}

function drawDecor(ctx, d, frame) {
  switch (d.type) {
    case 'house': {
      ctx.fillStyle = d.body;
      ctx.fillRect(d.x, d.y + 30, d.w, d.h - 30);
      ctx.fillStyle = d.roof;
      ctx.beginPath();
      ctx.moveTo(d.x - 12, d.y + 34);
      ctx.lineTo(d.x + d.w / 2, d.y - 14);
      ctx.lineTo(d.x + d.w + 12, d.y + 34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7fb3d9';
      ctx.fillRect(d.x + 18, d.y + 56, 26, 22);
      ctx.fillStyle = '#8a6a45';
      ctx.fillRect(d.x + d.w - 44, d.y + 62, 24, d.h - 62);
      break;
    }
    case 'tree': {
      const sway = Math.sin(frame * 0.02 + d.x) * 3;
      ctx.fillStyle = '#8a6a45';
      ctx.fillRect(d.x + 10, d.y + 30, 14, 50);
      ctx.fillStyle = '#6fbf73';
      ctx.beginPath();
      ctx.arc(d.x + 17 + sway, d.y + 6, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8fd894';
      ctx.beginPath();
      ctx.arc(d.x + 4 + sway, d.y + 16, 20, 0, Math.PI * 2);
      ctx.arc(d.x + 30 + sway, d.y + 14, 18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bush': {
      ctx.fillStyle = '#5aa86c';
      ctx.beginPath();
      ctx.arc(d.x, d.y + 10, 14, 0, Math.PI * 2);
      ctx.arc(d.x + 16, d.y + 8, 11, 0, Math.PI * 2);
      ctx.arc(d.x - 14, d.y + 9, 10, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'flower': {
      const colors = ['#ff9f68', '#ffd166', '#f2a6d8', '#a8d8ff'];
      const c = colors[d.x % colors.length];
      ctx.strokeStyle = '#5aa86c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y + 14);
      ctx.lineTo(d.x, d.y + 2);
      ctx.stroke();
      ctx.fillStyle = c;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + 0.4;
        ctx.beginPath();
        ctx.arc(d.x + Math.cos(a) * 4, d.y - 2 + Math.sin(a) * 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(d.x, d.y - 2, 2.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lamp': {
      ctx.fillStyle = '#5b4a3a';
      ctx.fillRect(d.x, d.y + 20, 5, 50);
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(d.x + 2, d.y + 14, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(d.x + 2, d.y + 14, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'crystalRock': {
      ctx.fillStyle = '#4a5468';
      ctx.beginPath();
      ctx.arc(d.x, d.y + 6, 16, Math.PI, 0);
      ctx.fill();
      const pulse = 0.6 + 0.4 * Math.sin(frame * 0.04 + d.x);
      ctx.fillStyle = `rgba(126,232,208,${0.6 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(d.x - 4, d.y + 2);
      ctx.lineTo(d.x + 1, d.y - 18 - pulse * 4);
      ctx.lineTo(d.x + 6, d.y + 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'stalagmite': {
      ctx.fillStyle = '#394152';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y + 40);
      ctx.lineTo(d.x + 14, d.y);
      ctx.lineTo(d.x + 28, d.y + 40);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      break;
  }
}

// NPC 铃兰：粉围裙的杂货商
function drawNpc(ctx, n, frame) {
  const bob = Math.sin(frame * 0.04) * 2;
  const x = n.x, y = n.y + bob;
  // 身体
  ctx.fillStyle = '#f2a6d8';
  ctx.beginPath();
  ctx.ellipse(x, y + 22, 13, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  // 头
  ctx.fillStyle = '#ffe3c9';
  ctx.beginPath();
  ctx.arc(x, y - 4, 13, 0, Math.PI * 2);
  ctx.fill();
  // 头发
  ctx.fillStyle = '#8a5a3e';
  ctx.beginPath();
  ctx.arc(x, y - 8, 13, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 13, y - 9, 26, 5);
  // 眼睛
  ctx.fillStyle = '#4a3b2f';
  ctx.beginPath();
  ctx.arc(x - 4.5, y - 3, 2.2, 0, Math.PI * 2);
  ctx.arc(x + 4.5, y - 3, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // 腮红 + 笑
  ctx.fillStyle = 'rgba(255,150,150,0.6)';
  ctx.beginPath();
  ctx.arc(x - 8, y + 2, 2.5, 0, Math.PI * 2);
  ctx.arc(x + 8, y + 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a3b2f';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y + 2, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // 头饰叶子
  ctx.fillStyle = '#6fbf73';
  ctx.beginPath();
  ctx.ellipse(x + 10, y - 14, 6, 3, -0.5, 0, Math.PI * 2);
  ctx.fill();
}
