// 响应式布局（纯函数，Node 可测）：舞台永远 16:9，触控在舞台外。
// 算法按 docs/design/design-system.md §9.2–§9.4 定稿，禁止「先扣 168px 再算 scale」。

export const APP_PAD = 10;          // 页面四周留白
export const STAGE_GAP = 10;        // 舞台与触控间距
export const FOOT_H = 28;           // 桌面页脚预留高度
export const TOUCH_H_MAX = 168;     // 触控区最大高度（舒适档）
export const TOUCH_H_COMFORT = 128; // 常规压缩档
export const TOUCH_H_MIN = 72;      // 先给舞台让路后的最小触控高度
export const TOUCH_H_EMERGENCY = 56; // 短边极小时的退化档
export const STAGE_H_PREFERRED = 270; // 希望达到的舞台 CSS 高度（1× 逻辑像素）
export const STAGE_H_MIN = 180;     // 舞台最小高度（2/3×）
export const STAGE_W_MIN = 320;     // 与 180 对应的 16:9 宽度

export const VIEW_W = 480;
export const VIEW_H = 270;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * 计算舞台与触控布局。
 * @param {number} innerWidth  布局视口宽
 * @param {number} innerHeight 布局视口高
 * @param {boolean} hasTouch   是否显示触控层
 * @returns {{scale:number, stageW:number, stageH:number, touchH:number, sideTouch:boolean, scroll:boolean}}
 */
export function computeLayout(innerWidth, innerHeight, hasTouch) {
  const availW = Math.max(0, innerWidth - 2 * APP_PAD);
  const availH = Math.max(0, innerHeight - 2 * APP_PAD);

  if (!hasTouch) {
    const scale = Math.min(availW / VIEW_W, (availH - FOOT_H) / VIEW_H);
    const stageW = Math.max(1, Math.floor(VIEW_W * scale));
    const stageH = Math.max(1, Math.floor(VIEW_H * scale));
    return { scale, stageW, stageH, touchH: 0, sideTouch: false, scroll: false };
  }

  // 1. 先按触控只占 TOUCH_H_MIN 给舞台让路
  const maxStageH = availH - STAGE_GAP - TOUCH_H_MIN;
  let scale = Math.min(availW / VIEW_W, Math.max(0, maxStageH) / VIEW_H);
  let stageW = Math.max(1, Math.floor(VIEW_W * scale));
  let stageH = Math.max(1, Math.floor(VIEW_H * scale));
  // 2. 剩余高度分给触控，多余归 letterbox
  const leftover = availH - stageH - STAGE_GAP;
  let touchH = clamp(leftover, TOUCH_H_MIN, TOUCH_H_MAX);
  let sideTouch = false;
  let scroll = false;

  // 3. 舞台仍低于 STAGE_H_MIN：进入退化
  if (stageH < STAGE_H_MIN) {
    // 先尝试不再为触控预留最小高度，直接按可用高度算舞台
    const fullScale = Math.min(availW / VIEW_W, availH / VIEW_H);
    const fullStageH = Math.floor(VIEW_H * fullScale);
    if (fullStageH >= STAGE_H_MIN) {
      scale = fullScale;
      stageW = Math.max(1, Math.floor(VIEW_W * scale));
      stageH = fullStageH;
      // 触控只能占用剩余高度，可能压到 EMERGENCY 档
      touchH = clamp(availH - stageH - STAGE_GAP, TOUCH_H_EMERGENCY, TOUCH_H_MAX);
      if (availH - stageH - STAGE_GAP < TOUCH_H_EMERGENCY) {
        sideTouch = true;
        touchH = 0;
      }
    } else {
      // 仍低于 STAGE_H_MIN：触控收到左右 letterbox，舞台按全高计算
      scale = Math.min(availW / VIEW_W, availH / VIEW_H);
      stageW = Math.max(1, Math.floor(VIEW_W * scale));
      stageH = Math.max(1, Math.floor(VIEW_H * scale));
      sideTouch = true;
      touchH = 0;
      if (stageH < STAGE_H_MIN || stageW < STAGE_W_MIN) {
        // 连保底都不够：保持 16:9，允许页面纵向滚动露出触控
        scroll = true;
        stageH = Math.max(STAGE_H_MIN, stageH);
        stageW = Math.max(STAGE_W_MIN, stageW);
      }
    }
  }

  return { scale, stageW, stageH, touchH, sideTouch, scroll };
}
