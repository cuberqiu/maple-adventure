// 位图显示高度 / 填充色 / 装饰映射（与 assets/ 实文件一致，见 docs/design/asset-manifest.md）

export const HERO_H = 48;
export const MONSTER_H = { golem: 30, bramble: 34, moth: 34, boss: 96 };
export const MONSTER_SHADOW = { golem: 33, bramble: 27, moth: 30, boss: 87 };
export const LINGLAN_H = 46;
export const SLASH_H = 52;
export const FOG_PUFF_H = 40;
export const PORTAL_H = 84;
export const GROUND_STRIP_H = 44;   // 地面条带高
export const GROUND_OVERHANG = 5;   // 条带从地面顶缘上探
export const NEAR_CROP = 0.86;      // 近景裁掉自带地面
export const PLATFORM_H = 22;       // 单向平台显示高度

// 地面实心填充色（条带下方延伸）
export const GROUND_FILL = { town: '#7A4A28', wild: '#6B4A28', cave: '#3B2A5A' };

// 主线地图 theme 用 'field'，位图主题 id 用 'wild'
export function assetTheme(theme) {
  return theme === 'field' ? 'wild' : theme;
}

// 主线装饰类型 → 位图 key（与 assets/decor/** 一致）
export const DECOR_ASSET = {
  house: 'decor/town/house',
  tree: 'decor/town/tree',
  lamp: 'decor/town/lamppost',
  flower: 'decor/wild/flower',
  bush: 'decor/wild/bush',
  crystalRock: 'decor/cave/crystal',
  stalagmite: 'decor/cave/stalagmite',
};

export const DECOR_H = {
  house: 110, tree: 100, stall: 70, lamppost: 80, flower: 34, bush: 46,
  mushroom: 56, rock: 50, crystal: 60, root: 90, glowcap: 54, stalagmite: 80,
};
