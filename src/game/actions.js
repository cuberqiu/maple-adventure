// 战斗动作：伤害玩家 / 击杀怪物 / 掉落 / 飘字 / 粒子（浏览器侧，事件走 bus）
import { game } from './state.js';
import { applyDamage, rollDamage } from '../logic/combat.js';
import { gainExp } from '../logic/leveling.js';
import { addItem, HP_POTION, MP_POTION } from '../logic/inventory.js';
import { randInt } from '../logic/util.js';
import { emit } from '../core/bus.js';

// 世界坐标里的伤害跳字
export function spawnDmgNum(x, y, text, color = '#ffe066', big = false) {
  game.dmgNums.push({ x, y, text, color, life: 55, vy: -1.3, big });
}

// 彩色小粒子
export function spawnParticles(x, y, n, colors, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = opts.angle !== undefined ? opts.angle + (Math.random() - 0.5) * (opts.spread ?? Math.PI) : Math.random() * Math.PI * 2;
    const sp = (opts.speed ?? 2.2) * (0.5 + Math.random());
    game.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (opts.lift ?? 0),
      life: randInt(18, 36),
      color: colors[randInt(0, colors.length - 1)],
      size: randInt(2, 4) + (opts.size ?? 0),
      gravity: opts.gravity ?? 0.04,
    });
  }
}

/**
 * 玩家受到伤害：无敌帧、击退、红字、死亡判定。
 */
export function damagePlayer(dmg, dir = 0, pop = -4) {
  const p = game.player;
  if (!p || p.dead || p.invuln > 0) return;
  applyDamage(p, dmg, { dir, knockback: 4.5, pop, stagger: 18 });
  p.invuln = 70;
  spawnDmgNum(p.x + p.w / 2, p.y - 6, `-${dmg}`, '#ff6b6b');
  spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 6, ['#ff9b9b', '#ffd3d3']);
  emit('sfx', 'hurt');
  if (p.hp <= 0) {
    p.dead = true;
    p.deathTimer = 140;
    p.vx = 0;
    emit('sfx', 'die');
    emit('playerDied');
  }
}

/**
 * 怪物受到一次伤害（自带 6 帧无敌避免同帧被打爆）。
 * @returns 是否命中
 */
export function hurtMonster(m, dmg, dir) {
  if (m.dead || m.invuln > 0) return false;
  applyDamage(m, dmg, {
    dir,
    knockback: m.def.boss ? 0.5 : 3,
    stagger: m.def.boss ? 8 : 16,
  });
  m.invuln = 6;
  spawnDmgNum(m.x + m.w / 2, m.y - 4, `${dmg}`, '#ffe066');
  spawnParticles(m.x + m.w / 2, m.y + m.h / 2, 5, ['#fff3c4', '#ffd166']);
  emit('sfx', 'hit');
  if (m.hp <= 0) killMonster(m);
  return true;
}

// 击杀：经验、掉落、Boss 通关标记
export function killMonster(m) {
  const p = game.player;
  m.dead = true;
  m.fadeTimer = 40;
  m.respawnTimer = m.def.respawn;
  m.vx = 0;

  const levels = gainExp(p.stats, m.def.exp);
  if (levels > 0) game.pendingLevelUps += levels;

  // 露珠掉落：拆成 1~3 枚
  const total = randInt(m.def.coins[0], m.def.coins[1]);
  const pieces = m.def.boss ? 4 : randInt(1, 3);
  for (let i = 0; i < pieces; i++) {
    spawnDrop('coin', m.x + m.w / 2, m.y + m.h / 2, Math.max(1, Math.round(total / pieces)) + (i === 0 ? total % pieces : 0));
  }
  // 药剂掉落
  if (Math.random() < m.def.potionChance) {
    spawnDrop(Math.random() < 0.7 ? HP_POTION : MP_POTION, m.x + m.w / 2 - 12, m.y + m.h / 2, 1);
  }
  if (m.def.boss) {
    for (let i = 0; i < 3; i++) spawnDrop(HP_POTION, m.x + m.w / 2 - 20 + i * 20, m.y + 30, 1);
    for (let i = 0; i < 2; i++) spawnDrop(MP_POTION, m.x + m.w / 2 - 10 + i * 20, m.y + 50, 1);
    p.bossDefeated = true;
    game.bossJustDied = true;
    emit('sfx', 'victory');
  }
  spawnParticles(m.x + m.w / 2, m.y + m.h / 2, 12, ['#ffffff', '#d8f5d0', '#a8e6a3']);
  emit('sfx', 'kill');
}

// 地面掉落物（露珠 / 药剂）
export function spawnDrop(kind, x, y, amount) {
  game.drops.push({
    kind, amount,
    x, y,
    w: kind === 'coin' ? 14 : 16,
    h: kind === 'coin' ? 14 : 16,
    vx: (Math.random() - 0.5) * 2.4,
    vy: -3 - Math.random() * 2,
    age: 0,
    grounded: false,
  });
}

// 拾取：返回 true 表示已拾取（背包满时药剂留在地上）
export function tryPickup(drop) {
  const p = game.player;
  if (drop.kind === 'coin') {
    p.inv.coins += drop.amount;
    spawnDmgNum(drop.x, drop.y - 8, `+${drop.amount} 露珠`, '#8fe388');
    emit('sfx', 'coin');
    return true;
  }
  const added = addItem(p.inv, drop.kind, drop.amount);
  if (added <= 0) return false; // 背包已满，留在地上
  spawnDmgNum(drop.x, drop.y - 8, `+${added}`, '#9ad0ff');
  emit('sfx', 'pickup');
  return true;
}
