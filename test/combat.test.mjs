// 伤害 / 受击 / 死亡判定
import test from 'node:test';
import assert from 'node:assert/strict';
import { rollDamage, createHitbox, applyDamage } from '../src/logic/combat.js';

test('伤害在 ±10% 浮动内且至少为 1', () => {
  for (const r of [0, 0.25, 0.5, 0.75, 1]) {
    const d = rollDamage(20, 0, () => r);
    assert.ok(d >= 18 && d <= 22, `浮动伤害 ${d} 超出范围`);
  }
  assert.equal(rollDamage(20, 0, () => 0), 18);
  assert.equal(rollDamage(20, 0, () => 1), 22);
});

test('防御减伤，但保底 1 点', () => {
  assert.equal(rollDamage(10, 5, () => 0.5), 5); // 10 - 5
  assert.equal(rollDamage(3, 99, () => 0.5), 1); // 保底
});

test('攻击判定框在面朝方向', () => {
  const right = { x: 100, y: 50, w: 26, h: 38, facing: 1 };
  const left = { x: 100, y: 50, w: 26, h: 38, facing: -1 };
  const hbR = createHitbox(right, 46, 46);
  const hbL = createHitbox(left, 46, 46);
  assert.equal(hbR.x, 126); // x + w
  assert.equal(hbL.x + hbL.w, 100); // x - reach
  assert.equal(hbR.h, 46);
});

test('applyDamage 扣血、闪白、硬直、击退、死亡归零', () => {
  const m = { hp: 30, maxHp: 30, vx: 0, flash: 0, hurtTimer: 0 };
  applyDamage(m, 12, { dir: 1, knockback: 4 });
  assert.equal(m.hp, 18);
  assert.ok(m.flash > 0);
  assert.ok(m.hurtTimer > 0);
  assert.equal(m.vx, 4);
  applyDamage(m, 999);
  assert.equal(m.hp, 0, '血量不应为负');
});
