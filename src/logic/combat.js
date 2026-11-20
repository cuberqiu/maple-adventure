// 伤害计算与受击（纯逻辑，Node 可测）
import { clamp } from './util.js';

/**
 * 掷出一次伤害：atk ±10% 浮动，减去防御，至少 1。
 * rng 可注入以便测试。
 */
export function rollDamage(atk, def = 0, rng = Math.random) {
  const variance = 0.9 + rng() * 0.2;
  return Math.max(1, Math.round(atk * variance) - def);
}

// 在攻击者面前生成一个矩形判定框
export function createHitbox(attacker, reach, h) {
  const y = attacker.y + attacker.h / 2 - h / 2;
  return attacker.facing >= 0
    ? { x: attacker.x + attacker.w, y, w: reach, h }
    : { x: attacker.x - reach, y, w: reach, h };
}

/**
 * 对目标施加伤害：扣血、闪白、硬直、击退。
 * @returns 实际造成的伤害
 */
export function applyDamage(target, dmg, opts = {}) {
  const max = target.maxHp ?? Infinity;
  target.hp = clamp(target.hp - dmg, 0, max);
  target.flash = 8;
  target.hurtTimer = opts.stagger ?? 16;
  if (opts.dir) {
    target.vx = opts.dir * (opts.knockback ?? 3);
    if (opts.pop) target.vy = opts.pop;
  }
  return dmg;
}
