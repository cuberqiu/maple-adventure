// 地图 / 传送门数据完整性
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, MAP_ORDER } from '../src/data/maps.js';
import { MONSTER_DEFS } from '../src/data/monsters.js';
import { rectsOverlap } from '../src/logic/physics.js';
import { VIEW_W, VIEW_H, buildWorld } from '../src/game/state.js';

test('三张地图齐全', () => {
  assert.deepEqual(MAP_ORDER, ['town', 'field', 'cave']);
  for (const id of MAP_ORDER) assert.ok(MAPS[id], `缺少地图 ${id}`);
});

test('每张地图尺寸合理且有地面', () => {
  for (const id of MAP_ORDER) {
    const m = MAPS[id];
    assert.ok(m.width >= VIEW_W, `${id} 宽度不足`);
    assert.ok(m.height >= VIEW_H, `${id} 高度不足`);
    assert.ok(m.ground.length > 0, `${id} 没有地面`);
    // 地面要铺满地图宽度（不允许掉出世界）
    const groundSpan = m.ground.reduce((acc, g) => acc + g.w, 0);
    assert.ok(groundSpan >= m.width, `${id} 地面没有铺满`);
  }
});

test('传送门目标有效且落点在目标地图内', () => {
  for (const id of MAP_ORDER) {
    for (const p of MAPS[id].portals) {
      const target = MAPS[p.to];
      assert.ok(target, `${id} 的传送门指向不存在的地图 ${p.to}`);
      assert.ok(p.tx >= 20 && p.tx <= target.width - 80, `${id}→${p.to} 落点 x 越界`);
      assert.ok(p.ty >= 40 && p.ty <= target.height - 80, `${id}→${p.to} 落点 y 越界`);
      // 落点附近不能卡进实心地面里
      const probe = { x: p.tx, y: p.ty, w: 26, h: 38 };
      for (const g of target.ground) {
        assert.ok(!rectsOverlap(probe, g), `${id}→${p.to} 落点嵌在地面里`);
      }
    }
  }
});

test('三张地图互相连通（镇→林地→洞窟 可来回）', () => {
  const townExits = MAPS.town.portals.map((p) => p.to);
  assert.ok(townExits.includes('field'));
  const fieldExits = MAPS.field.portals.map((p) => p.to);
  assert.ok(fieldExits.includes('town') && fieldExits.includes('cave'));
  const caveExits = MAPS.cave.portals.map((p) => p.to);
  assert.ok(caveExits.includes('field'));
});

test('小镇是安全区：有商店 NPC、无怪物、有存档水晶与教学绳索', () => {
  const t = MAPS.town;
  assert.equal(t.spawns.length, 0);
  assert.equal(t.npcs.length, 1);
  assert.ok(t.npcs[0].shop, '镇上 NPC 应该开店');
  assert.ok(t.crystal, '镇上应有存档水晶');
  assert.ok(t.ladders.length >= 1, '镇上应有教学绳索');
  assert.ok(t.signs.length >= 2, '镇上应有教学告示');
});

test('野外：至少两根绳索 + 两种怪物', () => {
  const f = MAPS.field;
  assert.ok(f.ladders.length >= 2);
  const types = new Set(f.spawns.map((s) => s.type));
  assert.ok(types.size >= 2);
  assert.ok(types.has('bramble'));
  assert.ok(types.has('moth'));
});

test('洞窟：有第三种怪物 + Boss + 陷阱', () => {
  const c = MAPS.cave;
  assert.ok(c.spawns.some((s) => s.type === 'golem'));
  assert.ok(c.spawns.some((s) => s.type === 'boss'));
  assert.ok(c.hazards.length >= 1, '洞窟应有陷阱');
});

test('每根绳索顶端都有平台可站，底端接地面', () => {
  for (const id of MAP_ORDER) {
    const m = MAPS[id];
    for (const l of m.ladders) {
      const topHasPlat = m.platforms.some(
        (p) => Math.abs(p.y - l.y) <= 2 && l.x + l.w / 2 >= p.x && l.x + l.w / 2 <= p.x + p.w
      );
      assert.ok(topHasPlat, `${id} 的绳索 (x=${l.x}) 顶端没有平台`);
      const bottomOnGround = m.ground.some(
        (g) => Math.abs(g.y - (l.y + l.h)) <= 2
      );
      assert.ok(bottomOnGround, `${id} 的绳索 (x=${l.x}) 底端不接地`);
    }
  }
});

test('怪物出生点不嵌在地形里，怪物定义齐全', () => {
  for (const id of ['field', 'cave']) {
    const m = MAPS[id];
    const world = buildWorld(m);
    for (const s of m.spawns) {
      const def = MONSTER_DEFS[s.type];
      assert.ok(def, `未知怪物类型 ${s.type}`);
      assert.ok(s.x >= 20 && s.x + def.w <= m.width - 20, `${id} 的 ${s.type} 出生 x 越界`);
      assert.ok(s.y >= 40 && s.y + def.h <= m.height, `${id} 的 ${s.type} 出生 y 越界`);
      const body = { x: s.x, y: s.y, w: def.w, h: def.h };
      for (const solid of world.solids) {
        if (!solid.oneWay) {
          assert.ok(!rectsOverlap(body, solid), `${id} 的 ${s.type} 出生点嵌在实心里`);
        }
      }
    }
  }
});

test('每个平台都可达（跳跃 ≤110px 高 / ≤110px 横向间隙，或经绳索）', () => {
  // 玩家跳跃高度约 12^2/(2*0.55) ≈ 130px，全弧水平距离约 170px，留安全余量
  for (const id of MAP_ORDER) {
    const m = MAPS[id];
    const groundY = Math.min(...m.ground.map((g) => g.y));
    const plats = m.platforms.map((p) => ({ x1: p.x, x2: p.x + p.w, y: p.y, ok: false }));

    const gapX = (a, b) => Math.max(0, Math.max(a.x1 - b.x2, b.x1 - a.x2));

    let changed = true;
    while (changed) {
      changed = false;
      for (const p of plats) {
        if (p.ok) continue;
        // 1) 从地面直接跳上去
        if (groundY - p.y <= 110) p.ok = true;
        // 2) 绳索顶端接在这个平台上（绳索底端接地）
        else if (
          m.ladders.some(
            (l) => Math.abs(l.y - p.y) <= 2 && l.x + l.w / 2 >= p.x1 && l.x + l.w / 2 <= p.x2
              && Math.abs(l.y + l.h - groundY) <= 2
          )
        ) p.ok = true;
        // 3) 从另一个已达平台跳上去
        else if (plats.some((q) => q.ok && q.y > p.y && q.y - p.y <= 110 && gapX(q, p) <= 110)) p.ok = true;
        if (p.ok) changed = true;
      }
    }
    for (const p of plats) {
      assert.ok(p.ok, `${id} 的平台 (x=${p.x1}, y=${p.y}) 跳不上去`);
    }
  }
});
