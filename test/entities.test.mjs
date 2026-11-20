// 怪物 AI：巡逻 / 追击 / 受击硬直 / Boss 攻击模式 / 重生
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonster, updateMonster, resetMonster } from '../src/logic/entities.js';
import { buildWorld } from '../src/game/state.js';
import { MAPS } from '../src/data/maps.js';

const world = buildWorld(MAPS.field);
const idlePlayer = (x, y) => ({ x, y, w: 26, h: 38, dead: false });

test('地面怪巡逻并在远离时保持巡逻', () => {
  const m = createMonster('bramble', 500, 770);
  const far = idlePlayer(3000, 700);
  for (let f = 0; f < 300; f++) updateMonster(m, far, world, f, () => {}, () => 0.5);
  assert.equal(m.state, 'patrol');
  assert.ok(Math.abs(m.x - 500) < 120, '巡逻不会离家太远');
});

test('玩家靠近后进入追击并接近玩家', () => {
  const m = createMonster('bramble', 500, 770);
  const near = idlePlayer(620, 770);
  for (let f = 0; f < 120; f++) updateMonster(m, near, world, f, () => {}, () => 0.5);
  assert.equal(m.state, 'chase');
  assert.ok(Math.abs(m.x - 500) > 30, '应该朝玩家移动过');
});

test('受击硬直期间停止思考', () => {
  const m = createMonster('bramble', 500, 770);
  const near = idlePlayer(560, 770);
  m.hurtTimer = 30;
  m.facing = -1;
  for (let f = 0; f < 20; f++) updateMonster(m, near, world, f, () => {}, () => 0.5);
  assert.ok(m.hurtTimer <= 10, '硬直应递减');
});

test('飞行怪会朝玩家移动', () => {
  const m = createMonster('moth', 800, 620);
  const near = idlePlayer(900, 620);
  for (let f = 0; f < 200; f++) updateMonster(m, near, world, f, () => {}, () => 0.5);
  assert.equal(m.state, 'chase');
  assert.ok(m.x > 810, '蛾子应向右追');
});

test('Boss 远时蓄力冲撞、近时抛射孢子', () => {
  const cave = buildWorld(MAPS.cave);
  let shots = [];
  const fire = (cfg) => shots.push(cfg);

  // 玩家在远处（仇恨 560 内、横向距离 > 200）→ 冲撞
  const boss = createMonster('boss', 2350, 690);
  const farPlayer = idlePlayer(1950, 750);
  for (let f = 0; f < 400 && boss.state === 'patrol'; f++) {
    updateMonster(boss, farPlayer, cave, f, fire, () => 0.5);
  }
  assert.ok(['windup', 'charging', 'rest'].includes(boss.state), 'Boss 应进入攻击流程');
  let charged = false;
  for (let f = 0; f < 900; f++) {
    updateMonster(boss, farPlayer, cave, f, fire, () => 0.5);
    if (boss.state === 'charging') charged = true;
  }
  assert.ok(charged, 'Boss 应执行过冲撞');

  // 玩家在近处 → 抛射
  shots = [];
  const boss2 = createMonster('boss', 2350, 690);
  const nearPlayer = idlePlayer(2260, 750);
  for (let f = 0; f < 600; f++) updateMonster(boss2, nearPlayer, cave, f, fire, () => 0.5);
  assert.ok(shots.length >= 3, `近身应抛射孢子（实际 ${shots.length} 发）`);
  for (const s of shots) {
    assert.equal(s.owner, 'monster');
    assert.ok(s.dmg > 0);
    assert.ok(s.gravity > 0, '孢子走抛物线');
  }
});

test('resetMonster 恢复出生状态', () => {
  const m = createMonster('golem', 600, 754);
  m.hp = 0;
  m.dead = true;
  m.x = 900;
  resetMonster(m);
  assert.equal(m.x, 600);
  assert.equal(m.hp, m.maxHp);
  assert.equal(m.dead, false);
  assert.equal(m.state, 'patrol');
});
