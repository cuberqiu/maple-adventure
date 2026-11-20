// 背包增减 / 喝药 / 买卖
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInventory, addItem, removeItem, countItem, usePotion, buyItem,
  ITEM_DEFS, HP_POTION, MP_POTION,
} from '../src/logic/inventory.js';
import { createStats } from '../src/logic/leveling.js';

test('初始背包有药剂和露珠', () => {
  const inv = createInventory();
  assert.equal(inv.coins, 30);
  assert.equal(countItem(inv, HP_POTION), 5);
  assert.equal(countItem(inv, MP_POTION), 3);
});

test('添加物品受叠加上限约束', () => {
  const inv = createInventory();
  const added = addItem(inv, HP_POTION, 200);
  assert.equal(added, ITEM_DEFS[HP_POTION].maxStack - 5);
  assert.equal(countItem(inv, HP_POTION), ITEM_DEFS[HP_POTION].maxStack);
  assert.equal(addItem(inv, HP_POTION, 1), 0, '满后无法再添加');
  assert.equal(addItem(inv, '不存在', 1), 0);
});

test('移除物品不会变成负数', () => {
  const inv = createInventory();
  assert.equal(removeItem(inv, HP_POTION, 2), 2);
  assert.equal(countItem(inv, HP_POTION), 3);
  assert.equal(removeItem(inv, HP_POTION, 99), 3);
  assert.equal(countItem(inv, HP_POTION), 0);
});

test('生命药剂回血并消耗一瓶', () => {
  const inv = createInventory();
  const stats = { ...createStats(), hp: 40 };
  const res = usePotion(inv, HP_POTION, stats);
  assert.equal(res.ok, true);
  assert.equal(stats.hp, 100); // 40 + 60
  assert.equal(countItem(inv, HP_POTION), 4);
});

test('魔力药剂回蓝并消耗一瓶', () => {
  const inv = createInventory();
  const stats = { ...createStats(), mp: 10 };
  const res = usePotion(inv, MP_POTION, stats);
  assert.equal(res.ok, true);
  assert.equal(stats.mp, 40); // 10 + 30
  assert.equal(countItem(inv, MP_POTION), 2);
});

test('满血/满蓝时喝药被拒绝，不消耗', () => {
  const inv = createInventory();
  const stats = createStats(); // 满
  assert.equal(usePotion(inv, HP_POTION, stats).ok, false);
  assert.equal(usePotion(inv, MP_POTION, stats).ok, false);
  assert.equal(countItem(inv, HP_POTION), 5);
  assert.equal(countItem(inv, MP_POTION), 3);
});

test('没有药剂时喝药失败', () => {
  const inv = createInventory();
  inv.items[HP_POTION] = 0;
  const res = usePotion(inv, HP_POTION, createStats());
  assert.equal(res.ok, false);
  assert.ok(res.message.includes('不够'));
});

test('买药：钱够时扣钱加货', () => {
  const inv = createInventory();
  inv.coins = 100;
  const res = buyItem(inv, HP_POTION, 2);
  assert.equal(res.ok, true);
  assert.equal(inv.coins, 100 - ITEM_DEFS[HP_POTION].price * 2);
  assert.equal(countItem(inv, HP_POTION), 7);
});

test('买药：钱不够时失败并给出差额提示', () => {
  const inv = createInventory();
  inv.coins = 10;
  const res = buyItem(inv, HP_POTION, 1);
  assert.equal(res.ok, false);
  assert.ok(res.message.includes('露珠不够'));
  assert.equal(inv.coins, 10);
  assert.equal(countItem(inv, HP_POTION), 5);
});

test('买药：背包满时失败', () => {
  const inv = createInventory();
  inv.coins = 99999;
  inv.items[HP_POTION] = ITEM_DEFS[HP_POTION].maxStack;
  const res = buyItem(inv, HP_POTION, 1);
  assert.equal(res.ok, false);
  assert.equal(inv.coins, 99999, '不该扣钱');
});
