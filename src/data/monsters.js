// 原创怪物图鉴（数值 + AI 参数）
// kind: 'ground' 地面行走 / 'fly' 飞行
export const MONSTER_DEFS = {
  bramble: {
    id: 'bramble',
    name: '荆刺果',
    kind: 'ground',
    w: 34, h: 30,
    hp: 32, atk: 6, def: 0,
    exp: 15, speed: 0.9, aggro: 280,
    coins: [2, 5], potionChance: 0.12,
    respawn: 900, // 15 秒后重生
  },
  moth: {
    id: 'moth',
    name: '雾羽蛾',
    kind: 'fly',
    w: 36, h: 28,
    hp: 24, atk: 5, def: 0,
    exp: 18, speed: 1.5, aggro: 340,
    coins: [3, 6], potionChance: 0.1,
    respawn: 900,
  },
  golem: {
    id: 'golem',
    name: '苔石傀儡',
    kind: 'ground',
    w: 44, h: 46,
    hp: 95, atk: 12, def: 2,
    exp: 28, speed: 0.55, aggro: 300,
    coins: [6, 10], potionChance: 0.2,
    respawn: 900,
  },
  boss: {
    id: 'boss',
    name: '磐苔巨像',
    kind: 'ground',
    boss: true,
    w: 96, h: 110,
    hp: 520, atk: 14, def: 3,
    exp: 400, speed: 0.7, aggro: 560,
    coins: [120, 160], potionChance: 1,
    respawn: Infinity, // 被击败后不再重生
    projDmg: 12,   // 抛射孢子伤害
    chargeDmg: 22, // 冲撞伤害
  },
};
