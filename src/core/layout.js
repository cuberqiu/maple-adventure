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

// 触控键布局常量（与 style.css §触控 一致）
export const TOUCH_GAP = 4;          // 键与键间距
export const TOUCH_MID_GAP = 8;      // 左右两组之间的最小间距
export const TOUCH_KEY_GRID = 48;    // 网格（舒适）档键尺寸
export const TOUCH_KEY_ROW = 44;     // 单行（72px 压缩）档键尺寸
export const TOUCH_KEY_MIN = 40;     // 极窄屏退化下限
export const TOUCH_COMFORT_H = 152;  // 网格档所需最小触控高（3×48 + 2×4）
export const TOUCH_BAR_W = 960;      // 触控条最大宽度
export const HUD_COMPACT_MAX_STAGE_W = 460; // 舞台宽 ≤ 此值启用紧凑 HUD（R-03）
export const BOSS_COMPACT_MAX_STAGE_W = 560; // 舞台宽 < 此值缩短 Boss 条（R-04）
export const BOSS_COMPACT_MAX_STAGE_H = 320;

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

// 触控键的视口坐标（供 Node 单测断言「不被裁切、不压舞台」；与 style.css 布局一一对应）。
// 返回 { mode, key, dpad, actions, touchRect, stageRect, buttons }。
//   mode: 'row'（单行）| 'grid'（3×3 十字 + 3 列动作）| 'side'（左右 letterbox）| 'none'
export function computeTouchLayout(innerWidth, innerHeight, layout) {
  const touchH = layout.touchH;
  const availW = Math.max(0, innerWidth - 2 * APP_PAD);
  const availH = Math.max(0, innerHeight - 2 * APP_PAD);
  const touchW = Math.min(TOUCH_BAR_W, availW);
  const touchX = Math.round((innerWidth - touchW) / 2);

  // #app 纵向居中：stage + 间距 + 触控
  const contentH = layout.stageH + STAGE_GAP + touchH;
  const contentTop = APP_PAD + Math.max(0, Math.floor((availH - contentH) / 2));

  const stageRect = {
    x: Math.round((innerWidth - layout.stageW) / 2),
    y: contentTop,
    w: layout.stageW,
    h: layout.stageH,
  };
  const touchRect = {
    x: touchX,
    y: contentTop + layout.stageH + STAGE_GAP,
    w: touchW,
    h: touchH,
  };

  const rects = (label, x, y, w, h) => ({ label, x, y, w, h });

  // 键宽需求：4 方向 + 7 动作，单行
  const rowNeedW = (k) => (4 * k + 3 * TOUCH_GAP) + TOUCH_MID_GAP + (7 * k + 6 * TOUCH_GAP);
  const gridNeedW = (k) => (3 * k + 2 * TOUCH_GAP) + TOUCH_MID_GAP + (3 * k + 2 * TOUCH_GAP);

  let mode;
  let key;
  let dpad;
  let actions;

  if (layout.sideTouch) {
    // 侧边 letterbox 档：极矮横屏才触发，目标分辨率不涉及；给出合法空布局。
    mode = 'side';
    key = TOUCH_KEY_MIN;
    dpad = { cols: 4, rows: 1 };
    actions = { cols: 7, rows: 1 };
    return { mode, key, dpad, actions, touchRect, stageRect, buttons: [] };
  }

  if (touchH >= TOUCH_COMFORT_H && gridNeedW(TOUCH_KEY_GRID) <= touchW) {
    mode = 'grid';
    key = TOUCH_KEY_GRID;
    // 极窄但仍够高时，把键收到能并排放下
    let k = key;
    while (k > TOUCH_KEY_MIN && gridNeedW(k) > touchW) k -= 2;
    key = k;
    dpad = { cols: 3, rows: 3 };
    actions = { cols: 3, rows: 3 };
  } else {
    mode = 'row';
    key = TOUCH_KEY_ROW;
    let k = key;
    while (k > TOUCH_KEY_MIN && rowNeedW(k) > touchW) k -= 2;
    key = k;
    dpad = { cols: 4, rows: 1 };
    actions = { cols: 7, rows: 1 };
  }

  const dpadW = dpad.cols * key + (dpad.cols - 1) * TOUCH_GAP;
  const dpadH = dpad.rows * key + (dpad.rows - 1) * TOUCH_GAP;
  const actW = actions.cols * key + (actions.cols - 1) * TOUCH_GAP;
  const actH = actions.rows * key + (actions.rows - 1) * TOUCH_GAP;

  const dpadX = touchRect.x; // 左组
  const actX = touchRect.x + touchRect.w - actW; // 右组
  const dpadY = touchRect.y + Math.floor((touchRect.h - dpadH) / 2);
  const actY = touchRect.y + Math.floor((touchRect.h - actH) / 2);

  // 方向键顺序（单行读作 ◀ ▲ ▼ ▶；网格为 3×3 十字）
  const dpadCells = mode === 'row'
    ? { up: [2, 1], left: [1, 1], right: [4, 1], down: [3, 1] }
    : { up: [2, 1], left: [1, 2], right: [3, 2], down: [2, 3] };
  const actLabels = ['血药', '蓝药', '翠风', '晨露', '互动', '跳', '攻击'];
  const actCells = mode === 'row'
    ? { 血药: [1, 1], 蓝药: [2, 1], 翠风: [3, 1], 晨露: [4, 1], 互动: [5, 1], 跳: [6, 1], 攻击: [7, 1] }
    : { 血药: [1, 1], 蓝药: [2, 1], 翠风: [3, 1], 晨露: [1, 2], 互动: [2, 2], 跳: [3, 2], 攻击: [1, 3] };

  const buttons = [];
  for (const [label, [col, row]] of Object.entries(dpadCells)) {
    buttons.push(rects(
      label,
      dpadX + (col - 1) * (key + TOUCH_GAP),
      dpadY + (row - 1) * (key + TOUCH_GAP),
      key, key,
    ));
  }
  for (const label of actLabels) {
    const [col, row] = actCells[label];
    buttons.push(rects(
      label,
      actX + (col - 1) * (key + TOUCH_GAP),
      actY + (row - 1) * (key + TOUCH_GAP),
      key, key,
    ));
  }

  return { mode, key, dpad, actions, touchRect, stageRect, buttons };
}
