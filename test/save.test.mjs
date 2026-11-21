// 存档序列化 / 反序列化
import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeRun, deserializeRun, SAVE_KEY, SAVE_VERSION } from '../src/logic/save.js';
import { createStats, gainExp } from '../src/logic/leveling.js';
import { createInventory, addItem, HP_POTION, MP_POTION } from '../src/logic/inventory.js';
import { MAPS } from '../src/data/maps.js';

function makeRun() {
  const stats = createStats();
  gainExp(stats, 500);
  stats.hp = stats.maxHp - 20;
  stats.mp = 5;
  const inv = createInventory();
  inv.coins = 321;
  addItem(inv, HP_POTION, 10);
  addItem(inv, MP_POTION, 4);
  return {
    stats, inv,
    mapId: 'cave',
    x: 1234, y: 567,
    bossDefeated: true,
  };
}

test('存档键为 v2，带游戏专属前缀', () => {
  assert.equal(SAVE_KEY, 'cuigu-qitan-save-v2');
  assert.equal(SAVE_VERSION, 2);
});

test('序列化 → 反序列化 往返一致', () => {
  const run = makeRun();
  const data = serializeRun(run);
  const restored = deserializeRun(JSON.parse(JSON.stringify(data)));

  assert.equal(restored.stats.level, run.stats.level);
  assert.equal(restored.stats.exp, run.stats.exp);
  assert.equal(restored.stats.maxHp, run.stats.maxHp);
  assert.equal(restored.stats.maxMp, run.stats.maxMp);
  assert.equal(restored.stats.atk, run.stats.atk);
  assert.equal(restored.stats.hp, run.stats.hp);
  assert.equal(restored.stats.mp, run.stats.mp);
  assert.equal(restored.inv.coins, run.inv.coins);
  assert.equal(restored.inv.items[HP_POTION], run.inv.items[HP_POTION]);
  assert.equal(restored.inv.items[MP_POTION], run.inv.items[MP_POTION]);
  assert.equal(restored.mapId, 'cave');
  assert.equal(restored.x, run.x);
  assert.equal(restored.y, run.y);
  assert.equal(restored.bossDefeated, true);
});

test('二次往返保持稳定', () => {
  const run = makeRun();
  const twice = deserializeRun(serializeRun(deserializeRun(serializeRun(run))));
  assert.deepEqual(serializeRun(twice), serializeRun(run));
});

test('损坏 / 缺失字段回退到安全默认值', () => {
  const r = deserializeRun(null);
  assert.equal(r.stats.level, 1);
  assert.equal(r.mapId, 'town');
  assert.equal(r.bossDefeated, false);

  const r2 = deserializeRun('not an object');
  assert.equal(r2.stats.level, 1);

  const r3 = deserializeRun({ level: 9999, coins: -5, mapId: '不存在的图', items: { hpPotion: 99999, fake: 3 } });
  assert.equal(r3.stats.level, 30, '等级被钳制到上限');
  assert.equal(r3.inv.coins, 0);
  assert.equal(r3.mapId, 'town');
  assert.equal(r3.inv.items.hpPotion, 99, '药剂被钳制到叠加上限');
  assert.equal(r3.inv.items.fake, undefined, '未知物品被丢弃');

  const r4 = deserializeRun({ level: 5, hp: 99999, mp: -100 });
  assert.equal(r4.stats.maxHp, 100 + 18 * 4, '属性按等级公式重建');
  assert.equal(r4.stats.hp, r4.stats.maxHp, '血量钳制到上限');
  assert.equal(r4.stats.mp, 0);
});

test('坐标被钳制在地图范围内', () => {
  const r = deserializeRun({ mapId: 'field', x: 99999, y: -50 });
  const map = MAPS.field;
  assert.ok(r.x >= 20 && r.x <= map.width - 60);
  assert.ok(r.y >= 40 && r.y <= map.height - 60);
});
