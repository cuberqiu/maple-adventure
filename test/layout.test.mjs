// 响应式布局算法（docs/design/design-system.md §9.2–§9.4）
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLayout, computeTouchLayout,
  TOUCH_H_MIN, TOUCH_H_MAX, STAGE_H_MIN, STAGE_H_PREFERRED, VIEW_W, VIEW_H,
  TOUCH_KEY_ROW, TOUCH_KEY_GRID, HUD_COMPACT_MAX_STAGE_W,
} from '../src/core/layout.js';

function assert16x9(l) {
  assert.ok(Math.abs(l.stageW / l.stageH - VIEW_W / VIEW_H) < 0.02, `舞台应保持 16:9（${l.stageW}x${l.stageH}）`);
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function assertButtonsFit(innerWidth, innerHeight) {
  const l = computeLayout(innerWidth, innerHeight, true);
  const tl = computeTouchLayout(innerWidth, innerHeight, l);
  assert.equal(tl.buttons.length, 11, '触控应有 11 颗键（4 方向 + 7 动作）');
  for (const b of tl.buttons) {
    assert.ok(b.x >= 0, `${b.label} 左缘不应出视口（x=${b.x}）`);
    assert.ok(b.y >= 0, `${b.label} 上缘不应出视口（y=${b.y}）`);
    assert.ok(b.x + b.w <= innerWidth, `${b.label} 右缘不应出视口（right=${b.x + b.w}，视口 ${innerWidth}）`);
    assert.ok(b.y + b.h <= innerHeight, `${b.label} 底缘不应出视口（bottom=${b.y + b.h}，视口 ${innerHeight}）`);
    assert.ok(!overlap(b, tl.stageRect), `${b.label} 不应侵入舞台`);
  }
}

test('无触控：scale 取宽高较小者，页脚预留 28', () => {
  const l = computeLayout(1000, 700, false);
  assert16x9(l);
  assert.ok(l.stageH <= 700 - 28, '舞台不占用页脚高度');
});

test('844×390 横屏（有触控）舞台高 ≥ 270，不再是邮票', () => {
  const l = computeLayout(844, 390, true);
  assert16x9(l);
  assert.ok(l.stageH >= STAGE_H_PREFERRED, `844×390 舞台高应 ≥ 270（实际 ${l.stageH}）`);
  assert.ok(l.touchH >= TOUCH_H_MIN && l.touchH <= TOUCH_H_MAX, `触控高应在 72–168（实际 ${l.touchH}）`);
});

test('568×320 一类更矮横屏（有触控）舞台高 ≥ 180', () => {
  const l = computeLayout(568, 320, true);
  assert16x9(l);
  assert.ok(l.stageH >= STAGE_H_MIN, `568×320 舞台高应 ≥ 180（实际 ${l.stageH}）`);
});

test('390×844 竖屏（有触控）受宽度限制，触控可回到 168', () => {
  const l = computeLayout(390, 844, true);
  assert16x9(l);
  assert.ok(l.stageH >= STAGE_H_MIN);
  assert.equal(l.touchH, TOUCH_H_MAX, '竖屏触控应回到舒适档 168');
});

test('禁止「先扣 168 再算 scale」：横屏触控高度优先给舞台让路', () => {
  const l = computeLayout(844, 390, true);
  // 若先扣 168，舞台高约 floor((390-20-10-168)/270*270) ≈ 192；新算法应明显更大
  assert.ok(l.stageH > 200, `舞台高应显著大于旧算法（实际 ${l.stageH}）`);
});

// ---------- 触控键布局（R-01 / R-02 / R-06 / R-10） ----------

test('844×390 有触控：单行档，11 键都在视口内且不压舞台（R-01）', () => {
  const l = computeLayout(844, 390, true);
  const tl = computeTouchLayout(844, 390, l);
  assert.equal(tl.mode, 'row', '72px 档应是单行');
  assert.equal(tl.key, TOUCH_KEY_ROW, `单行档键高应约 ${TOUCH_KEY_ROW}px`);
  assertButtonsFit(844, 390);
  assert.ok(tl.buttons.every((b) => b.h >= 40), '键高不应低于退化下限 40px');
});

test('390×844 有触控：网格档，含「晨露」在内 11 键都在视口内（R-02）', () => {
  const l = computeLayout(390, 844, true);
  const tl = computeTouchLayout(390, 844, l);
  assert.equal(tl.mode, 'grid', '168px 舒适档应是网格');
  assert.equal(tl.key, TOUCH_KEY_GRID, `网格档键高应 ${TOUCH_KEY_GRID}px`);
  assertButtonsFit(390, 844);
  assert.ok(tl.buttons.every((b) => b.w >= 46), '竖屏触控目标应尽量 ≥ 46px');
  const dew = tl.buttons.find((b) => b.label === '晨露');
  assert.ok(dew && dew.x + dew.w <= 390, '「晨露」应完整在视口内');
});

test('390×844 竖屏舞台宽 370，应启用紧凑 HUD（R-03）', () => {
  const l = computeLayout(390, 844, true);
  assert.ok(l.stageW <= HUD_COMPACT_MAX_STAGE_W, `舞台宽 ${l.stageW} 应触发紧凑 HUD（阈值 ${HUD_COMPACT_MAX_STAGE_W}）`);
});

test('667×375 有触控：单行档，触控不与舞台重叠（R-06）', () => {
  const l = computeLayout(667, 375, true);
  const tl = computeTouchLayout(667, 375, l);
  assert.equal(tl.mode, 'row');
  assertButtonsFit(667, 375);
  assert.ok(tl.stageRect.x > 0, '667 宽舞台两侧应有 letterbox');
});

test('844×390 触控条在舞台下方，两者不相交', () => {
  const l = computeLayout(844, 390, true);
  const tl = computeTouchLayout(844, 390, l);
  assert.ok(tl.touchRect.y >= tl.stageRect.y + tl.stageRect.h, '触控条应整体位于舞台之下');
  assert.ok(!overlap(tl.touchRect, tl.stageRect), '触控条不应与舞台矩形相交');
});
