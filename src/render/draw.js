// 地图元素绘制：地面条 + 实心填充、单向平台、绳索、陷阱、装饰、告示、存档水晶、NPC、传送门。
// 位图路线：地面 / 平台 / 装饰 / NPC / 传送门走贴图；绳索 / 尖晶石陷阱 / 告示 / 水晶为简单程序形状。
import { game } from '../game/state.js';
import { getImage } from '../core/assets.js';
import {
  assetTheme, DECOR_ASSET, DECOR_H, GROUND_FILL,
  GROUND_STRIP_H, GROUND_OVERHANG, PLATFORM_H, PORTAL_H, LINGLAN_H,
} from './metrics.js';
import { drawSprite, label, shadow, tileAcross } from './sprite.js';

// 主线装饰类型 → 底边（世界坐标）的向下偏移；house 用 d.h。
const BOTTOM_OFFSET = { tree: 80, flower: 14, lamp: 70, bush: 24, crystalRock: 22, stalagmite: 40 };
function decorBottom(d) {
  if (d.type === 'house') return d.y + (d.h || 140);
  return d.y + (BOTTOM_OFFSET[d.type] || 0);
}

export function drawMap(ctx, frame) {
  const map = game.map;
  const theme = map.theme;
  const aTheme = assetTheme(theme);

  // ---- 装饰（在实体后） ----
  for (const d of map.decor) drawDecor(ctx, d, theme, frame);

  // ---- 地面 ----
  for (const g of map.ground) drawGround(ctx, g, aTheme);

  // ---- 单向平台 ----
  for (const p of map.platforms) drawPlatform(ctx, p, aTheme);

  // ---- 绳索 / 梯子 ----
  for (const l of map.ladders) drawRope(ctx, l);

  // ---- 陷阱（尖晶石） ----
  for (const hz of map.hazards) drawHazard(ctx, hz);

  // ---- 告示 / 存档水晶 ----
  for (const s of map.signs) drawSign(ctx, s);
  if (map.crystal) drawCrystal(ctx, map.crystal, frame);

  // ---- NPC ----
  for (const n of map.npcs) drawNpc(ctx, n, frame);

  // ---- 传送门 ----
  for (const p of map.portals) drawPortal(ctx, p, frame);
}

// 地面：顶部条带（贴图） + 下方实心填充（带土截面/碎石，避免死色带）
function drawGround(ctx, g, aTheme) {
  const tile = getImage(`tiles/ground_${aTheme}`);
  const top = g.y - GROUND_OVERHANG;
  if (tile) {
    tileAcross(ctx, tile, g.x, top, g.w, GROUND_STRIP_H);
  } else {
    ctx.fillStyle = GROUND_FILL[aTheme] || '#7A4A28';
    ctx.fillRect(g.x, top, g.w, GROUND_STRIP_H);
  }
  const fillTop = top + GROUND_STRIP_H;
  const bottom = g.y + g.h;
  if (bottom <= fillTop) return;

  const fill = GROUND_FILL[aTheme] || '#7A4A28';
  ctx.fillStyle = fill;
  ctx.fillRect(g.x, fillTop, g.w, bottom - fillTop);

  // 贴图与底色接缝处的 2px 深色过渡
  ctx.fillStyle = 'rgba(74,46,31,0.28)';
  ctx.fillRect(g.x, fillTop - 1, g.w, 2);

  // 土截面：顶部深色渐变 + 确定性碎石，打破平涂色带
  const grad = ctx.createLinearGradient(0, fillTop, 0, fillTop + 16);
  grad.addColorStop(0, 'rgba(0,0,0,0.20)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(g.x, fillTop, g.w, 16);

  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let px = g.x; px < g.x + g.w; px += 40) {
    ctx.fillRect(px + 8, fillTop + 18 + ((px * 13) % 12), 8, 5 + ((px * 7) % 6));
    ctx.fillRect(px + 26, fillTop + 30 + ((px * 11) % 10), 6, 3);
  }
}

// 单向平台：三切片（左右帽 48px、中段重复）
function drawPlatform(ctx, p, aTheme) {
  const tile = getImage(`tiles/platform_${aTheme}`);
  if (!tile) {
    ctx.fillStyle = aTheme === 'cave' ? '#4a5468' : '#c9a06a';
    ctx.fillRect(p.x, p.y - 4, p.w, PLATFORM_H);
    return;
  }
  const y = p.y - 4;
  const scale = PLATFORM_H / tile.naturalHeight;
  const cap = 48 * scale;
  const midSrcW = tile.naturalWidth - 96;
  const midW = midSrcW * scale;

  ctx.drawImage(tile, 0, 0, 48, tile.naturalHeight, p.x, y, cap, PLATFORM_H);
  ctx.drawImage(tile, tile.naturalWidth - 48, 0, 48, tile.naturalHeight, p.x + p.w - cap, y, cap, PLATFORM_H);
  const midStart = p.x + cap;
  const midEnd = p.x + p.w - cap;
  let sx = midStart;
  while (sx < midEnd && midW > 0) {
    const drawW = Math.min(midW, midEnd - sx);
    ctx.drawImage(tile, 48, 0, midSrcW, tile.naturalHeight, sx, y, drawW, PLATFORM_H);
    sx += drawW;
  }
}

// 绳索 / 藤蔓（程序形状，4px 叶绿描边）
function drawRope(ctx, l) {
  const x = l.x + l.w / 2;
  const ink = '#4A2E1F';
  const vine = '#5BA43A';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, l.y);
  ctx.lineTo(x, l.y + l.h);
  ctx.stroke();
  ctx.strokeStyle = vine;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, l.y);
  ctx.lineTo(x, l.y + l.h);
  ctx.stroke();
  ctx.fillStyle = '#6EC24F';
  for (let y = l.y + 9; y < l.y + l.h - 2; y += 18) {
    ctx.beginPath();
    ctx.ellipse(x + 5, y, 5, 3, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 尖晶石陷阱
function drawHazard(ctx, hz) {
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

function drawDecor(ctx, d, theme, frame) {
  const key = DECOR_ASSET[d.type];
  const h = DECOR_H[key && key.split('/').pop()] || DECOR_H[d.type];
  const cx = d.x + (d.w || 0) / 2;
  const bottom = decorBottom(d);
  if (key && h) {
    if (drawSprite(ctx, key, cx, bottom, h)) return;
  }
  // 缺图时用极简形状占位（正式包不会走到这里）
  drawDecorFallback(ctx, d, bottom, h);
}

function drawDecorFallback(ctx, d, bottom, h) {
  ctx.fillStyle = 'rgba(74,46,31,0.5)';
  ctx.fillRect(d.x, bottom - h, d.w || 40, h);
}

function drawSign(ctx, s) {
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

function drawCrystal(ctx, c, frame) {
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

// NPC 铃兰（粉围裙杂货商，靠近时挥手）
function drawNpc(ctx, n, frame) {
  const cx = n.x;
  // 主线 NPC 数据只给了 (x, y)（y 是头部附近），旧代码绘制里脚底在 y+37；脚底对齐地面。
  const bottom = n.y + 37;
  shadow(ctx, cx, bottom, 35);
  const p = game.player;
  const near = p && Math.abs(p.x + p.w / 2 - cx) < 90;
  const key = near ? 'npc/linglan_wave' : 'npc/linglan';
  if (drawSprite(ctx, key, cx, bottom, LINGLAN_H, { oy: Math.sin(frame * 0.04) * 1.2 })) {
    label(ctx, cx, bottom - LINGLAN_H - 4, n.name);
  }
}

function drawPortal(ctx, p, frame) {
  const cx = p.x + p.w / 2;
  const bottom = p.y + p.h;
  const sway = Math.sin(frame * 0.06) * 0.07;
  const pulse = 1 + Math.sin(frame * 0.1) * 0.04;
  if (drawSprite(ctx, 'fx/portal', cx, bottom, PORTAL_H, { rotate: sway, sx: pulse, sy: pulse })) {
    label(ctx, cx, bottom - PORTAL_H - 4, p.label);
  }
}
