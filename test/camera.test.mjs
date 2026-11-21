// R-15：立定跳过程中镜头 Y 不变
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCamera, resetCamera, VIEW_H } from '../src/game/state.js';
import { GRAVITY, TERMINAL } from '../src/logic/physics.js';

const JUMP_V = -12;
const map = { id: 'town', width: 2000, height: 720 };
const tallMap = { id: 'pit', width: 2000, height: 2000 };
const groundY = 1000; // 用地图中段，避免镜头被钳在 maxY 而测不出跟随

function playerAt(y, { onGround = false, climbing = false, facing = 1 } = {}) {
  return { x: 740, y, w: 34, h: 30, facing, onGround, climbing };
}

function simulateJump() {
  resetCamera();
  let p = playerAt(groundY, { onGround: true });
  const rest = computeCamera(p, tallMap);
  const frames = [{ air: false, y: p.y, camY: rest.y, screenY: p.y + p.h / 2 - rest.y }];
  let y = groundY;
  let vy = JUMP_V;
  p = { ...p, onGround: false };
  for (let i = 0; i < 120; i++) {
    vy = Math.min(vy + GRAVITY, TERMINAL);
    y += vy;
    if (y >= groundY) {
      y = groundY;
      p = { ...p, y, onGround: true };
      const cam = computeCamera(p, tallMap);
      frames.push({ air: false, y, camY: cam.y, screenY: y + p.h / 2 - cam.y, landed: true });
      break;
    }
    p = { ...p, y, onGround: false };
    const cam = computeCamera(p, tallMap);
    frames.push({ air: true, y, camY: cam.y, screenY: y + p.h / 2 - cam.y });
  }
  return { restY: rest.y, frames };
}

test('立定跳：起跳到落地前 camera.y 保持不变', () => {
  const { restY, frames } = simulateJump();
  assert.ok(restY < 2000 - 270, 'rest camera must not be clamped to the bottom');
  const air = frames.filter((f) => f.air);
  assert.ok(air.length > 10, `jump should last many frames, got ${air.length}`);
  const changed = air.filter((f) => f.camY !== restY);
  assert.equal(
    changed.length,
    0,
    `camera.y moved while airborne: rest=${restY} log=${JSON.stringify(air.map((f) => f.camY))}`,
  );
  assert.ok(frames.at(-1).landed, 'should land');
});

test('立定跳：角色在空中始终处于画面 15%–85% 死区', () => {
  const { frames } = simulateJump();
  const air = frames.filter((f) => f.air);
  const lo = VIEW_H * 0.15;
  const hi = VIEW_H * 0.85;
  for (const f of air) {
    assert.ok(
      f.screenY >= lo && f.screenY <= hi,
      `screenY ${f.screenY.toFixed(2)} left the 15%–85% band (y=${f.y})`,
    );
  }
});

test('掉出画面下沿时镜头 Y 才会跟随（85% 保护）', () => {
  resetCamera();
  const startY = 400;
  let p = playerAt(startY, { onGround: true });
  const rest = computeCamera(p, tallMap);
  p = { ...p, onGround: false, y: startY + 500 };
  let last = rest.y;
  let moved = false;
  for (let i = 0; i < 40; i++) {
    const cam = computeCamera(p, tallMap);
    if (cam.y !== last) moved = true;
    last = cam.y;
  }
  assert.ok(moved, 'camera.y should catch up when the player falls off-screen');
  assert.ok(last > rest.y, `camera should move down, rest=${rest.y} last=${last}`);
});
