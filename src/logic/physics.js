// AABB 碰撞 / 平台着陆 / 梯子判定（纯逻辑，Node 可测）
import { clamp } from './util.js';

export const GRAVITY = 0.55;   // 每帧重力加速度
export const TERMINAL = 13;    // 最大下落速度

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * 移动并处理碰撞。
 * solids 中 oneWay=true 的只从上方着陆（可按下跳穿透，body.dropThrough>0 时忽略）。
 * bounds: {minX, maxX} 可选，用于世界边界。
 */
export function moveAndCollide(body, solids, bounds = null) {
  // ---- 水平 ----
  body.x += body.vx;
  for (const s of solids) {
    if (s.oneWay) continue;
    if (rectsOverlap(body, s)) {
      if (body.vx > 0) body.x = s.x - body.w;
      else if (body.vx < 0) body.x = s.x + s.w;
      body.vx = 0;
    }
  }
  if (bounds) body.x = clamp(body.x, bounds.minX, bounds.maxX - body.w);

  // ---- 垂直 ----
  const prevBottom = body.y + body.h;
  body.y += body.vy;
  let onGround = false;
  for (const s of solids) {
    if (!rectsOverlap(body, s)) continue;
    if (s.oneWay) {
      // 仅当下落中、且上一帧脚还在平台上方时着陆
      if (body.vy >= 0 && prevBottom <= s.y + 1 && !(body.dropThrough > 0)) {
        body.y = s.y - body.h;
        body.vy = 0;
        onGround = true;
      }
    } else if (body.vy > 0) {
      body.y = s.y - body.h;
      body.vy = 0;
      onGround = true;
    } else if (body.vy < 0) {
      body.y = s.y + s.h;
      body.vy = 0;
    }
  }
  body.onGround = onGround;
  return onGround;
}

// 脚下是否踩着单向平台（用于“下+跳”下落穿透）
export function standingOnOneWay(body, solids) {
  const feet = { x: body.x + 2, y: body.y + body.h - 3, w: body.w - 4, h: 6 };
  return solids.some((s) => s.oneWay && rectsOverlap(feet, s));
}

/**
 * 玩家所在处的梯子/绳索。
 * includeTopEdge=true 时允许站在梯子顶端平台上按“下”抓住（用于向下爬）。
 */
export function ladderAt(body, ladders, includeTopEdge = false) {
  const cx = body.x + body.w / 2;
  return (
    ladders.find((l) => {
      if (cx < l.x - 2 || cx > l.x + l.w + 2) return false;
      const top = l.y;
      const bottom = l.y + l.h;
      if (includeTopEdge) return body.y + body.h >= top - 10 && body.y <= bottom;
      return body.y + body.h > top + 6 && body.y < bottom;
    }) || null
  );
}
