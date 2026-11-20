// 三张原创地图：露水镇 / 翠叶林地 / 幽苔洞窟
// 坐标系：x 向右、y 向下。ground 为实心地面，platform 为可从下方穿过的单向平台。

export const MAPS = {
  town: {
    id: 'town',
    name: '露水镇',
    theme: 'town',
    safe: true,
    width: 2000,
    height: 720,
    ground: [{ x: 0, y: 640, w: 2000, h: 80 }],
    platforms: [
      { x: 380, y: 530, w: 180 },
      { x: 640, y: 440, w: 200 },
      { x: 1180, y: 530, w: 220 },
      { x: 1460, y: 430, w: 280 },
    ],
    ladders: [
      { x: 1560, y: 430, w: 18, h: 210 }, // 教学：爬上高台
    ],
    hazards: [],
    portals: [
      { x: 1900, y: 520, w: 60, h: 120, to: 'field', tx: 120, ty: 700, label: '翠叶林地' },
    ],
    npcs: [
      {
        id: 'lilyan',
        x: 820, y: 602,
        name: '铃兰',
        role: '杂货商',
        shop: true,
        lines: [
          '欢迎来到露水镇，远道而来的冒险者！',
          '要来点露水药剂吗？洞窟里的怪物可不好惹。',
          '听说幽苔洞窟深处盘踞着一尊磐苔巨像……多备些药剂再出发吧。',
        ],
      },
    ],
    signs: [
      {
        x: 200, y: 608,
        lines: ['【镇长留言】←→ 或 A/D 移动，K / 空格 跳跃，J / Z 攻击。'],
      },
      {
        x: 1440, y: 608,
        lines: ['面朝绳索按 ↑ 或 W 即可攀爬，按跳跃键可以松手跳下。'],
      },
      {
        x: 1820, y: 608,
        lines: ['右边的光门通往翠叶林地。靠近后按 Enter 进入。'],
      },
    ],
    crystal: { x: 560, y: 596 },
    spawns: [], // 安全区无怪物
    decor: [
      { type: 'house', x: 90, y: 500, w: 150, h: 140, roof: '#e58f8f', body: '#f6e7c8' },
      { type: 'house', x: 300, y: 520, w: 120, h: 120, roof: '#8fb7e5', body: '#f6e7c8' },
      { type: 'house', x: 1740, y: 490, w: 160, h: 150, roof: '#b591dd', body: '#f6e7c8' },
      { type: 'tree', x: 700, y: 560 },
      { type: 'tree', x: 1050, y: 570 },
      { type: 'tree', x: 1650, y: 560 },
      { type: 'flower', x: 160, y: 626 },
      { type: 'flower', x: 480, y: 626 },
      { type: 'flower', x: 950, y: 626 },
      { type: 'flower', x: 1300, y: 626 },
      { type: 'flower', x: 1980, y: 626 },
      { type: 'lamp', x: 380, y: 570 },
      { type: 'lamp', x: 1150, y: 570 },
    ],
  },

  field: {
    id: 'field',
    name: '翠叶林地',
    theme: 'field',
    width: 3200,
    height: 900,
    ground: [{ x: 0, y: 800, w: 3200, h: 100 }],
    platforms: [
      { x: 300, y: 690, w: 200 },
      { x: 520, y: 600, w: 180 },
      { x: 800, y: 690, w: 200 },
      { x: 1050, y: 600, w: 200 },
      { x: 1350, y: 690, w: 240 },
      { x: 1600, y: 590, w: 200 },
      { x: 1900, y: 690, w: 240 },
      { x: 2150, y: 590, w: 200 },
      { x: 2450, y: 680, w: 260 },
      { x: 2750, y: 570, w: 200 },
    ],
    ladders: [
      { x: 2500, y: 680, w: 18, h: 120 },
      { x: 2810, y: 570, w: 18, h: 230 },
    ],
    hazards: [],
    portals: [
      { x: 20, y: 680, w: 60, h: 120, to: 'town', tx: 1800, ty: 520, label: '露水镇' },
      { x: 3120, y: 680, w: 60, h: 120, to: 'cave', tx: 120, ty: 700, label: '幽苔洞窟' },
    ],
    npcs: [],
    signs: [
      { x: 260, y: 768, lines: ['小心荆刺果与雾羽蛾！击败它们能拾取露珠和药剂。'] },
    ],
    crystal: null,
    spawns: [
      { type: 'bramble', x: 500, y: 770 },
      { type: 'bramble', x: 1100, y: 770 },
      { type: 'bramble', x: 1600, y: 770 },
      { type: 'bramble', x: 2300, y: 770 },
      { type: 'moth', x: 800, y: 620 },
      { type: 'moth', x: 1900, y: 640 },
      { type: 'moth', x: 2600, y: 600 },
    ],
    decor: [
      { type: 'tree', x: 200, y: 720 },
      { type: 'tree', x: 900, y: 730 },
      { type: 'tree', x: 1500, y: 710 },
      { type: 'tree', x: 2250, y: 730 },
      { type: 'tree', x: 3000, y: 720 },
      { type: 'bush', x: 640, y: 776 },
      { type: 'bush', x: 1250, y: 776 },
      { type: 'bush', x: 2000, y: 776 },
      { type: 'flower', x: 420, y: 786 },
      { type: 'flower', x: 1700, y: 786 },
      { type: 'flower', x: 2700, y: 786 },
    ],
  },

  cave: {
    id: 'cave',
    name: '幽苔洞窟',
    theme: 'cave',
    width: 2800,
    height: 900,
    ground: [{ x: 0, y: 800, w: 2800, h: 100 }],
    platforms: [
      { x: 250, y: 700, w: 160 },
      { x: 500, y: 620, w: 160 },
      { x: 750, y: 700, w: 160 },
      { x: 1000, y: 620, w: 160 },
      { x: 1250, y: 700, w: 160 },
      { x: 1500, y: 600, w: 200 },
      { x: 1800, y: 690, w: 220 },
      { x: 2100, y: 610, w: 180 },
    ],
    ladders: [
      { x: 810, y: 700, w: 18, h: 100 },
      { x: 1560, y: 600, w: 18, h: 200 },
    ],
    hazards: [
      // 尖晶石陷阱：踩上受到伤害并被弹开
      { x: 900, y: 776, w: 120, h: 24, dmg: 10 },
      { x: 1650, y: 776, w: 140, h: 24, dmg: 10 },
    ],
    portals: [
      { x: 20, y: 680, w: 60, h: 120, to: 'field', tx: 3040, ty: 680, label: '翠叶林地' },
    ],
    npcs: [],
    signs: [
      { x: 180, y: 768, lines: ['洞窟幽深，地面的尖晶石会伤人，当心脚下！'] },
    ],
    crystal: null,
    spawns: [
      { type: 'golem', x: 600, y: 754 },
      { type: 'golem', x: 1350, y: 754 },
      { type: 'golem', x: 1950, y: 754 },
      { type: 'moth', x: 1100, y: 560 },
      { type: 'moth', x: 2200, y: 540 },
      { type: 'boss', x: 2350, y: 690 }, // 深处的磐苔巨像
    ],
    decor: [
      { type: 'crystalRock', x: 350, y: 770 },
      { type: 'crystalRock', x: 1150, y: 770 },
      { type: 'crystalRock', x: 2050, y: 770 },
      { type: 'stalagmite', x: 700, y: 760 },
      { type: 'stalagmite', x: 1500, y: 760 },
      { type: 'stalagmite', x: 1900, y: 760 },
    ],
  },
};

export const MAP_ORDER = ['town', 'field', 'cave'];
