// 升级与经验计算
import test from 'node:test';
import assert from 'node:assert/strict';
import { expToNext, gainExp, createStats, MAX_LEVEL } from '../src/logic/leveling.js';

test('经验曲线递增且 1 级需求合理', () => {
  for (let l = 1; l < 10; l++) {
    assert.ok(expToNext(l + 1) > expToNext(l), `等级 ${l} 的需求应递增`);
  }
  assert.ok(expToNext(1) >= 8 && expToNext(1) <= 20, '1 级需求在 8~20 之间');
});

test('刚够经验时升级且血蓝回满', () => {
  const st = createStats();
  const gained = gainExp(st, expToNext(1));
  assert.equal(gained, 1);
  assert.equal(st.level, 2);
  assert.equal(st.exp, 0);
  assert.equal(st.maxHp, 118);
  assert.equal(st.maxMp, 48);
  assert.equal(st.atk, 14);
  assert.equal(st.hp, st.maxHp);
  assert.equal(st.mp, st.maxMp);
});

test('大笔经验可以连升多级', () => {
  const st = createStats();
  const gained = gainExp(st, 500);
  assert.ok(gained >= 4, `500 经验至少升 4 级（实际 ${gained}）`);
  assert.equal(st.level, 1 + gained);
  assert.ok(st.exp < expToNext(st.level), '剩余经验应小于下一级需求');
});

test('达到等级上限后不再升级', () => {
  const st = createStats();
  for (let i = 0; i < 100; i++) gainExp(st, 100000);
  assert.equal(st.level, MAX_LEVEL);
  assert.equal(gainExp(st, 999999), 0);
  assert.equal(st.exp, 0);
});

test('负数/零经验不产生变化', () => {
  const st = createStats();
  assert.equal(gainExp(st, 0), 0);
  assert.equal(gainExp(st, -50), 0);
  assert.equal(st.level, 1);
});
