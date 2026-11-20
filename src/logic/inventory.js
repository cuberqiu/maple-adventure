// 背包 / 药剂 / 商店买卖（纯逻辑，Node 可测）
// 货币名：露珠

export const HP_POTION = 'hpPotion';
export const MP_POTION = 'mpPotion';

export const ITEM_DEFS = {
  [HP_POTION]: {
    id: HP_POTION,
    name: '露水药剂',
    desc: '恢复 60 点生命',
    kind: 'hp',
    amount: 60,
    price: 25,
    maxStack: 99,
  },
  [MP_POTION]: {
    id: MP_POTION,
    name: '月尘药剂',
    desc: '恢复 30 点魔力',
    kind: 'mp',
    amount: 30,
    price: 18,
    maxStack: 99,
  },
};

export function createInventory() {
  return {
    coins: 30,
    items: { [HP_POTION]: 5, [MP_POTION]: 3 },
  };
}

export function countItem(inv, id) {
  return inv.items[id] || 0;
}

// 添加物品（不超过叠加上限），返回实际添加数
export function addItem(inv, id, n) {
  const def = ITEM_DEFS[id];
  if (!def || n <= 0) return 0;
  const cur = countItem(inv, id);
  const add = Math.min(n, def.maxStack - cur);
  if (add > 0) inv.items[id] = cur + add;
  return add;
}

// 移除物品，返回实际移除数
export function removeItem(inv, id, n) {
  const cur = countItem(inv, id);
  const rem = Math.min(cur, Math.max(0, n));
  if (rem > 0) inv.items[id] = cur - rem;
  return rem;
}

/**
 * 喝药：恢复生命或魔力并消耗一瓶。
 * @returns {ok, message}
 */
export function usePotion(inv, id, stats) {
  const def = ITEM_DEFS[id];
  const n = countItem(inv, id);
  if (!def || n <= 0) return { ok: false, message: '药剂不够了！' };
  if (def.kind === 'hp') {
    if (stats.hp >= stats.maxHp) return { ok: false, message: '生命值已经满啦。' };
    stats.hp = Math.min(stats.maxHp, stats.hp + def.amount);
  } else {
    if (stats.mp >= stats.maxMp) return { ok: false, message: '魔力值已经满啦。' };
    stats.mp = Math.min(stats.maxMp, stats.mp + def.amount);
  }
  inv.items[id] = n - 1;
  return { ok: true, message: `恢复了 ${def.amount} 点${def.kind === 'hp' ? '生命' : '魔力'}！`, healed: def.amount };
}

/**
 * 商店购买：钱不够 / 背包满都会失败并给出中文提示。
 */
export function buyItem(inv, id, qty = 1) {
  const def = ITEM_DEFS[id];
  if (!def) return { ok: false, message: '没有这种商品。' };
  qty = Math.max(1, Math.floor(qty));
  const cost = def.price * qty;
  if (inv.coins < cost) {
    return { ok: false, message: `露珠不够…还差 ${cost - inv.coins} 露珠。` };
  }
  const space = def.maxStack - countItem(inv, id);
  const buy = Math.min(qty, space);
  if (buy <= 0) return { ok: false, message: `${def.name}已经装满了（上限 ${def.maxStack}）。` };
  const paid = def.price * buy;
  inv.coins -= paid;
  inv.items[id] = countItem(inv, id) + buy;
  return { ok: true, message: `买下了 ${def.name} ×${buy}。`, paid };
}
