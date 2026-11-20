// AABB 碰撞与平台着陆
import test from 'node:test';
import assert from 'node:assert/strict';
import { rectsOverlap, moveAndCollide, standingOnOneWay, ladderAt } from '../src/logic/physics.js';

const GROUND = { x: 0, y: 300, w: 1000, h: 100, oneWay: false };
const PLAT = { x: 200, y: 200, w: 120, h: 14, oneWay: true };

test('AABB 相交判定', () => {
  assert.ok(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }));
  assert.ok(!rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }), '恰好相接不算相交');
  assert.ok(!rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 20, w: 10, h: 10 }));
});

test('下落时着陆在地面并归零速度', () => {
  const body = { x: 100, y: 100, w: 26, h: 38, vx: 0, vy: 0 };
  let onGround = false;
  for (let i = 0; i < 200 && !onGround; i++) {
    body.vy = Math.min(body.vy + 0.55, 13);
    onGround = moveAndCollide(body, [GROUND]);
  }
  assert.ok(onGround, '应在若干帧后落地');
  assert.equal(body.y + body.h, GROUND.y);
  assert.equal(body.vy, 0);
});

test('从上方落到单向平台可以站稳', () => {
  const body = { x: 240, y: 100, w: 26, h: 38, vx: 0, vy: 0 };
  let onGround = false;
  for (let i = 0; i < 200 && !onGround; i++) {
    body.vy = Math.min(body.vy + 0.55, 13);
    onGround = moveAndCollide(body, [PLAT]);
  }
  assert.ok(onGround, '应落到单向平台上');
  assert.equal(body.y + body.h, PLAT.y);
});

test('从下方跳穿单向平台不被挡住', () => {
  const body = { x: 240, y: 205, w: 26, h: 38, vx: 0, vy: -6 }; // 在平台下方上升
  const onGround = moveAndCollide(body, [PLAT]);
  assert.ok(!onGround);
  assert.ok(body.y < 205, '继续上升');
});

test('横向撞上实心墙被挡住', () => {
  const WALL = { x: 300, y: 0, w: 40, h: 400, oneWay: false };
  const body = { x: 280, y: 100, w: 26, h: 38, vx: 5, vy: 0 };
  moveAndCollide(body, [WALL]);
  assert.equal(body.x + body.w, WALL.x);
  assert.equal(body.vx, 0);
});

test('dropThrough 时穿过单向平台', () => {
  const body = { x: 240, y: 162, w: 26, h: 38, vx: 0, vy: 2, dropThrough: 10 };
  // 脚在平台上方（y+h=200），开启穿透后继续下落
  const onGround = moveAndCollide(body, [PLAT]);
  assert.ok(!onGround);
  assert.ok(body.y > 162, '继续下落');
});

test('standingOnOneWay 检测脚下平台', () => {
  const on = { x: 240, y: 200 - 38, w: 26, h: 38 };
  assert.ok(standingOnOneWay(on, [PLAT]));
  const off = { x: 400, y: 200 - 38, w: 26, h: 38 };
  assert.ok(!standingOnOneWay(off, [PLAT]));
});

test('ladderAt 找到玩家所在的绳索', () => {
  const ladders = [{ x: 500, y: 400, w: 18, h: 200 }];
  const on = { x: 495, y: 480, w: 26, h: 38 };
  assert.ok(ladderAt(on, ladders));
  const off = { x: 700, y: 480, w: 26, h: 38 };
  assert.equal(ladderAt(off, ladders), null);
  // 站在梯子顶端平台上：默认模式抓不到（避免反复吸附），宽松模式可以（向下爬）
  const topEdge = { x: 495, y: 400 - 38, w: 26, h: 38 };
  assert.equal(ladderAt(topEdge, ladders), null);
  assert.ok(ladderAt(topEdge, ladders, true));
});
