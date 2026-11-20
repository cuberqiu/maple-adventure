// 技能定义 / 魔力消耗 / 冷却（纯逻辑，Node 可测）
// 冷却单位为“帧”（固定 60 步/秒）

export const SKILL_DEFS = {
  galeSlash: {
    id: 'galeSlash',
    name: '翠风斩',
    mp: 12,
    cooldown: 180,
    kind: 'attack',
    desc: '斩出一道翠色风刃，向前飞出并造成大量伤害。',
  },
  dewBless: {
    id: 'dewBless',
    name: '晨露祝福',
    mp: 20,
    cooldown: 600,
    kind: 'heal',
    desc: '沐浴晨露，立即恢复 40% 最大生命。',
  },
};

export const SKILL_ORDER = ['galeSlash', 'dewBless'];

export function createSkillState() {
  const s = {};
  for (const id of SKILL_ORDER) s[id] = 0;
  return s;
}

// 检查能否施放（冷却 / 魔力）
export function canCast(def, stats, cds) {
  if (!def) return { ok: false, reason: '没有这个技能。' };
  if ((cds[def.id] || 0) > 0) return { ok: false, reason: '技能还在冷却中…' };
  if (stats.mp < def.mp) return { ok: false, reason: '魔力不足！' };
  return { ok: true };
}

// 施放：扣魔力并进入冷却
export function castSkill(def, stats, cds) {
  const check = canCast(def, stats, cds);
  if (!check.ok) return check;
  stats.mp -= def.mp;
  cds[def.id] = def.cooldown;
  return { ok: true };
}

// 每帧递减冷却
export function tickCooldowns(cds, frames = 1) {
  for (const id of SKILL_ORDER) {
    if (cds[id] > 0) cds[id] = Math.max(0, cds[id] - frames);
  }
}
