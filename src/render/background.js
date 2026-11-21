// 分层视差背景：远景铺满、中/近景底对齐地面线（Q 版位图路线）。
// 视差系数：远 0.1 / 中 0.35 / 近 0.7。
import { getImage } from '../core/assets.js';
import { VIEW_W, VIEW_H } from '../game/state.js';
import { assetTheme, NEAR_CROP } from './metrics.js';

function tileParallax(ctx, image, scrollX) {
  const scale = VIEW_H / image.naturalHeight;
  const tw = image.naturalWidth * scale;
  if (tw <= 0) return;
  const offset = ((scrollX % tw) + tw) % tw;
  for (let sx = -offset; sx < VIEW_W; sx += tw) {
    ctx.drawImage(image, sx, 0, tw, VIEW_H);
  }
}

function tileParallaxBottom(ctx, image, scrollX, groundScreenY, cropFrac = 1) {
  const scale = VIEW_H / image.naturalHeight;
  const tw = image.naturalWidth * scale;
  if (tw <= 0) return;
  const srcH = image.naturalHeight * cropFrac;
  const dh = VIEW_H * cropFrac;
  const top = groundScreenY - dh;
  const offset = ((scrollX % tw) + tw) % tw;
  for (let sx = -offset; sx < VIEW_W; sx += tw) {
    ctx.drawImage(image, 0, 0, image.naturalWidth, srcH, sx, top, tw, dh);
  }
}

// 缺图时只画天空渐变（正式包不会走到这里：加载失败会停在错误态，见 assets.js）。
function skyFallback(ctx, theme) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  if (theme === 'cave') {
    g.addColorStop(0, '#241833');
    g.addColorStop(1, '#4D3F78');
  } else if (theme === 'field') {
    g.addColorStop(0, '#48B9F0');
    g.addColorStop(1, '#D9F3FF');
  } else {
    g.addColorStop(0, '#9ED8F5');
    g.addColorStop(1, '#FFE6C4');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function drawBackground(ctx, map, cam) {
  const theme = map.theme;
  const aTheme = assetTheme(theme);
  const ground = map.ground[0];
  const groundY = ground ? ground.y : VIEW_H;

  const far = getImage(`bg/${aTheme}_far`);
  if (far) {
    tileParallax(ctx, far, cam.x * 0.1);
  } else {
    skyFallback(ctx, theme);
  }

  const mid = getImage(`bg/${aTheme}_mid`);
  if (mid) {
    if (theme === 'cave') {
      tileParallax(ctx, mid, cam.x * 0.35);
    } else {
      tileParallaxBottom(ctx, mid, cam.x * 0.35, groundY - cam.y);
    }
  }

  const near = getImage(`bg/${aTheme}_near`);
  // 近景底部自带一条地面，会在地面顶部看起来像路：只画上面的植被部分。
  if (near) tileParallaxBottom(ctx, near, cam.x * 0.7, groundY - cam.y + 8, NEAR_CROP);
}
