// 技能 MP 消耗与冷却
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_DEFS, createSkillState, canCast, castSkill, tickCooldowns } from '../src/logic/skills.js';
import { createStats } from '../src/logic/leveling.js';

test('两个主动技能定义齐全', () => {
  assert.equal(SKILL_DEFS.galeSlash.name, '翠风斩');
  assert.equal(SKILL_DEFS.dewBless.name, '晨露祝福');
  assert.ok(SKILL_DEFS.galeSlash.mp > 0 && SKILL_DEFS.galeSlash.cooldown > 0);
  assert.ok(SKILL_DEFS.dewBless.mp > 0 && SKILL_DEFS.dewBless.cooldown > 0);
});

test('施放技能扣除 MP 并进入冷却', () => {
  const stats = createStats();
  const cds = createSkillState();
  const res = castSkill(SKILL_DEFS.galeSlash, stats, cds);
  assert.equal(res.ok, true);
  assert.equal(stats.mp, createStats().mp - SKILL_DEFS.galeSlash.mp);
  assert.equal(cds.galeSlash, SKILL_DEFS.galeSlash.cooldown);
});

test('MP 不足时不能施放，也不扣 MP', () => {
  const stats = createStats();
  stats.mp = 5;
  const cds = createSkillState();
  const res = castSkill(SKILL_DEFS.dewBless, stats, cds); // 需要 20
  assert.equal(res.ok, false);
  assert.equal(res.reason, '魔力不足！');
  assert.equal(stats.mp, 5);
  assert.equal(cds.dewBless, 0);
});

test('冷却中不能施放', () => {
  const stats = createStats();
  const cds = createSkillState();
  castSkill(SKILL_DEFS.galeSlash, stats, cds);
  stats.mp = 100;
  const res = canCast(SKILL_DEFS.galeSlash, stats, cds);
  assert.equal(res.ok, false);
  assert.equal(res.reason, '技能还在冷却中…');
});

test('冷却随帧递减，归零后可再次施放', () => {
  const stats = createStats();
  const cds = createSkillState();
  castSkill(SKILL_DEFS.galeSlash, stats, cds);
  for (let i = 0; i < SKILL_DEFS.galeSlash.cooldown - 1; i++) tickCooldowns(cds, 1);
  assert.ok(cds.galeSlash > 0, '还差一帧');
  tickCooldowns(cds, 1);
  assert.equal(cds.galeSlash, 0);
  stats.mp = 100;
  assert.equal(canCast(SKILL_DEFS.galeSlash, stats, cds).ok, true);
});

test('冷却不会减成负数', () => {
  const cds = createSkillState();
  cds.galeSlash = 2;
  tickCooldowns(cds, 100);
  assert.equal(cds.galeSlash, 0);
});
