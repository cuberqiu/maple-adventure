// 等级 / 经验曲线（纯逻辑，Node 可测）
export const MAX_LEVEL = 30;

// 升到下一级所需经验：10 * level^1.35，前快后慢，10 级累计约 1000 出头
export function expToNext(level) {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round(10 * Math.pow(level, 1.35));
}

export function createStats() {
  return {
    level: 1,
    exp: 0,
    maxHp: 100,
    maxMp: 40,
    atk: 12,
    hp: 100,
    mp: 40,
  };
}

// 每级成长：+18 生命、+8 魔力、+2 攻击，升级回满
export const LEVEL_UP = { maxHp: 18, maxMp: 8, atk: 2 };

/**
 * 获得经验并处理升级（就地修改 stats）。
 * @returns 升了几级
 */
export function gainExp(stats, amount) {
  stats.exp += Math.max(0, Math.floor(amount));
  let gained = 0;
  while (stats.level < MAX_LEVEL && stats.exp >= expToNext(stats.level)) {
    stats.exp -= expToNext(stats.level);
    stats.level += 1;
    gained += 1;
    stats.maxHp += LEVEL_UP.maxHp;
    stats.maxMp += LEVEL_UP.maxMp;
    stats.atk += LEVEL_UP.atk;
    stats.hp = stats.maxHp;
    stats.mp = stats.maxMp;
  }
  if (stats.level >= MAX_LEVEL) stats.exp = 0;
  return gained;
}
