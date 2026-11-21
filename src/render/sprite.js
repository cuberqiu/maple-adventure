// 位图精灵绘制辅助：底部中心锚点、显示高度、平滑缩放、接触阴影、名牌、胶囊条。
// 只迁渲染，不含任何实体 / 文案逻辑。
import { getImage } from '../core/assets.js';

// 中文界面用系统黑体回退；不引入 Baloo/Nunito（避免离线 404 字体请求，P2-04）。
export const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif';

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// 底部中心锚定 (x, y) 为脚底中心。返回是否成功绘制。
export function drawSprite(ctx, key, x, y, displayH, opts = {}) {
  const image = getImage(key);
  if (!image) return false;
  const nw = image.naturalWidth;
  const nh = image.naturalHeight;
  const scale = displayH / nh;
  const w = nw * scale;
  ctx.save();
  ctx.translate(x, y + (opts.oy || 0));
  if (opts.flip) ctx.scale(-1, 1);
  if (opts.rotate) ctx.rotate(opts.rotate);
  if (opts.sx || opts.sy) ctx.scale(opts.sx || 1, opts.sy || 1);
  if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
  ctx.drawImage(image, -w / 2, -displayH, w, displayH);
  ctx.restore();
  return true;
}

// 中心锚定 (x, y) 为图片中心。
export function drawSpriteCenter(ctx, key, x, y, displayH, opts = {}) {
  const image = getImage(key);
  if (!image) return false;
  const nw = image.naturalWidth;
  const nh = image.naturalHeight;
  const scale = displayH / nh;
  const w = nw * scale;
  ctx.save();
  ctx.translate(x, y + (opts.oy || 0));
  if (opts.flip) ctx.scale(-1, 1);
  if (opts.rotate) ctx.rotate(opts.rotate);
  if (opts.sx || opts.sy) ctx.scale(opts.sx || 1, opts.sy || 1);
  if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
  ctx.drawImage(image, -w / 2, -displayH / 2, w, displayH);
  ctx.restore();
  return true;
}

// 受击白闪的离屏缓存（source-atop 白色覆盖）。
const tintCache = new Map();
function whiteTint(key, image) {
  if (tintCache.has(key)) return tintCache.get(key);
  let off = null;
  try {
    off = document.createElement('canvas');
    off.width = image.naturalWidth;
    off.height = image.naturalHeight;
    const c = off.getContext('2d');
    c.drawImage(image, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, off.width, off.height);
  } catch {
    off = null;
  }
  tintCache.set(key, off);
  return off;
}

// 底部中心锚点 + 受击闪白叠加。
export function drawSpriteFlash(ctx, key, x, y, displayH, opts = {}, flash = 0) {
  const image = getImage(key);
  const drawn = drawSprite(ctx, key, x, y, displayH, opts);
  if (!drawn || flash <= 0 || !image) return drawn;
  const tint = whiteTint(key, image);
  if (!tint) return drawn;
  const nw = image.naturalWidth;
  const nh = image.naturalHeight;
  const scale = displayH / nh;
  const w = nw * scale;
  ctx.save();
  ctx.translate(x, y + (opts.oy || 0));
  if (opts.flip) ctx.scale(-1, 1);
  if (opts.rotate) ctx.rotate(opts.rotate);
  if (opts.sx || opts.sy) ctx.scale(opts.sx || 1, opts.sy || 1);
  ctx.globalAlpha = Math.min(0.8, flash * 0.1);
  ctx.drawImage(tint, -w / 2, -displayH, w, displayH);
  ctx.restore();
  return drawn;
}

// 接触阴影：椭圆，宽约精灵宽 0.8，高 5
export function shadow(ctx, x, y, spriteWidth) {
  ctx.fillStyle = 'rgba(58,42,34,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y, spriteWidth * 0.4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 横向平铺一张图到给定区域（裁剪到区域范围）。
export function tileAcross(ctx, image, x, y, w, h) {
  const scale = h / image.naturalHeight;
  const tw = image.naturalWidth * scale;
  if (tw <= 0) return;
  const start = Math.floor(x / tw) * tw;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let sx = start; sx < x + w; sx += tw) {
    ctx.drawImage(image, sx, y, tw, h);
  }
  ctx.restore();
}

// 名牌胶囊（NPC / 传送门）。
export function label(ctx, x, y, text) {
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const width = ctx.measureText(text).width + 10;
  ctx.fillStyle = 'rgba(74,46,31,0.82)';
  roundRect(ctx, x - width / 2, y - 15, width, 15, 7);
  ctx.fill();
  ctx.fillStyle = '#FFF6E3';
  ctx.fillText(text, x, y - 2);
}

// 胶囊小血条（怪物受击后显示）。
export function capsuleBar(ctx, cx, y, w, ratio, color) {
  const x = cx - w / 2;
  ctx.fillStyle = '#4A2E1F';
  roundRect(ctx, x, y, w, 6, 3);
  ctx.fill();
  ctx.fillStyle = '#F3E3C3';
  roundRect(ctx, x + 1.5, y + 1.5, w - 3, 3, 1.5);
  ctx.fill();
  if (ratio > 0) {
    ctx.fillStyle = color;
    roundRect(ctx, x + 1.5, y + 1.5, Math.max(3, (w - 3) * ratio), 3, 1.5);
    ctx.fill();
  }
}
