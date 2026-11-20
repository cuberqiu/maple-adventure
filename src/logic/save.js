// 存档序列化 / 反序列化（纯逻辑，Node 可测）
import { MAPS } from '../data/maps.js';
import { createStats, MAX_LEVEL } from './leveling.js';
import { createInventory, ITEM_DEFS } from './inventory.js';
import { clamp } from './util.js';

export const SAVE_KEY = 'cuigu-qitan-save-v1';
export const MUTED_KEY = 'cuigu-qitan-muted';
export const SAVE_VERSION = 1;

function clampInt(v, lo, hi, fallback = lo) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

/**
 * 把冒险数据（player 形状：stats/inv/mapId/x/y/bossDefeated）压成可存的普通对象。
 */
export function serializeRun(run) {
  return {
    version: SAVE_VERSION,
    level: run.stats.level,
    exp: run.stats.exp,
    hp: run.stats.hp,
    mp: run.stats.mp,
    coins: run.inv.coins,
    items: Object.fromEntries(Object.entries(run.inv.items).filter(([, n]) => n > 0)),
    mapId: run.mapId,
    x: Math.round(run.x),
    y: Math.round(run.y),
    bossDefeated: !!run.bossDefeated,
  };
}

/**
 * 从存档对象还原冒险数据；缺失 / 越界 / 被篡改的字段一律回退到合理默认值。
 * 属性按等级公式重建，不信任存档里的数值。
 */
export function deserializeRun(data) {
  const out = {
    stats: createStats(),
    inv: createInventory(),
    mapId: 'town',
    x: 560,
    y: 560,
    bossDefeated: false,
  };
  if (!data || typeof data !== 'object') return out;

  const level = clampInt(data.level, 1, MAX_LEVEL, 1);
  const stats = out.stats;
  stats.level = level;
  stats.maxHp = 100 + 18 * (level - 1);
  stats.maxMp = 40 + 8 * (level - 1);
  stats.atk = 12 + 2 * (level - 1);
  stats.exp = clampInt(data.exp, 0, 999999, 0);
  stats.hp = clamp(Math.floor(Number(data.hp) || 1), 1, stats.maxHp);
  stats.mp = clamp(Math.floor(Number(data.mp) || 0), 0, stats.maxMp);

  out.inv.coins = clampInt(data.coins, 0, 999999, 0);
  if (data.items && typeof data.items === 'object') {
    for (const [id, n] of Object.entries(data.items)) {
      if (!ITEM_DEFS[id]) continue;
      out.inv.items[id] = clampInt(n, 0, ITEM_DEFS[id].maxStack, 0);
    }
  }

  if (data.mapId && MAPS[data.mapId]) out.mapId = data.mapId;
  const map = MAPS[out.mapId];
  out.x = clamp(Math.floor(Number(data.x) || 560), 20, map.width - 60);
  out.y = clamp(Math.floor(Number(data.y) || 560), 40, map.height - 60);

  out.bossDefeated = !!data.bossDefeated;
  return out;
}
