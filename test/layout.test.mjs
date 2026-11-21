// 响应式布局算法（docs/design/design-system.md §9.2–§9.4）
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLayout, TOUCH_H_MIN, TOUCH_H_MAX, STAGE_H_MIN, STAGE_H_PREFERRED, VIEW_W, VIEW_H,
} from '../src/core/layout.js';

function assert16x9(l) {
  assert.ok(Math.abs(l.stageW / l.stageH - VIEW_W / VIEW_H) < 0.02, `舞台应保持 16:9（${l.stageW}x${l.stageH}）`);
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
