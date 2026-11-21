// 实体工厂 + 怪物 AI（Node 可测，不依赖 DOM）
import { MONSTER_DEFS } from '../data/monsters.js';
import { createStats } from './leveling.js';
import { createInventory } from './inventory.js';
import { createSkillState } from './skills.js';
import { moveAndCollide, GRAVITY, TERMINAL } from './physics.js';
import { clamp, randInt } from './util.js';

// ---------- 玩家 ----------
export function createPlayer(x, y) {
  return {
    x, y, w: 26, h: 38,
    vx: 0, vy: 0,
    facing: 1,
    onGround: false,
    climbing: false,
    coyote: 0,
    dropThrough: 0,
    stats: createStats(),
    inv: createInventory(),
    skillCds: createSkillState(),
    attackTimer: 0,
    attackCd: 0,
    castTimer: 0, // 施法动画帧（翠风斩 / 晨露祝福共用）
    hitSet: new Set(),
    invuln: 0,
    flash: 0,
    hurtTimer: 0,
    dead: false,
    deathTimer: 0,
    mapId: 'town',
    bossDefeated: false,
  };
}

// ---------- 怪物 ----------
export function createMonster(type, x, y) {
  const def = MONSTER_DEFS[type];
  return {
    type,
    def,
    x, y,
    w: def.w, h: def.h,
    vx: 0, vy: 0,
    facing: Math.random() < 0.5 ? -1 : 1,
    hp: def.hp,
    maxHp: def.hp,
    onGround: false,
    state: 'patrol',
    stateTimer: randInt(30, 120),
    attackKind: null,
    chargeDir: 1,
    chargeLeft: 0,
    homeX: x,
    spawnY: y,
    seed: randInt(0, 360),
    flash: 0,
    hurtTimer: 0,
    invuln: 0,
    dead: false,
    fadeTimer: 0,
    respawnTimer: 0,
  };
}

// 重置到出生点（满血、回到巡逻状态）
export function resetMonster(m) {
  m.x = m.homeX;
  m.y = m.spawnY;
  m.hp = m.maxHp;
  m.vx = 0;
  m.vy = 0;
  m.state = 'patrol';
  m.stateTimer = randInt(30, 120);
  m.attackKind = null;
  m.dead = false;
  m.fadeTimer = 0;
  m.respawnTimer = 0;
  m.flash = 0;
  m.hurtTimer = 0;
  m.invuln = 0;
}

function physicsMove(m, world) {
  m.vy = Math.min(m.vy + GRAVITY, TERMINAL);
  moveAndCollide(m, world.solids, { minX: 0, maxX: world.w });
  m.x = clamp(m.x, 2, world.w - m.w - 2);
}

/**
 * 怪物 AI 主更新。
 * 巡逻 → 发现玩家 → 追击 / 贴身碰撞伤害；Boss 额外有蓄力冲撞与抛射两种攻击模式。
 * spawnProjectile({x,y,vx,vy,gravity,w,h,owner,dmg,kind}) 由上层注入。
 */
export function updateMonster(m, player, world, frame, spawnProjectile, rng = Math.random) {
  if (m.dead) return;
  if (m.flash > 0) m.flash--;
  if (m.invuln > 0) m.invuln--;
  if (m.hurtTimer > 0) {
    // 受击硬直：只滑行 + 重力，不思考
    m.hurtTimer--;
    m.vx *= 0.85;
    if (m.def.kind !== 'fly') physicsMove(m, world);
    return;
  }

  const def = m.def;
  const pcx = player.x + player.w / 2;
  const mcx = m.x + m.w / 2;
  const dx = pcx - mcx;
  const dy = player.y + player.h / 2 - (m.y + m.h / 2);
  const dist = Math.hypot(dx, dy);
  const playerAlive = !player.dead;

  if (def.boss) {
    updateBoss(m, dx, dist, playerAlive, world, spawnProjectile, rng);
    return;
  }

  if (def.kind === 'fly') {
    // 飞行怪：直接朝玩家飘，巡逻时左右扑翼悬浮
    if (m.state === 'chase') {
      if (!playerAlive || dist > def.aggro * 1.7) m.state = 'patrol';
      else {
        const n = Math.max(1, dist);
        m.vx = (dx / n) * def.speed;
        m.vy = (dy / n) * def.speed * 0.8;
        m.facing = dx >= 0 ? 1 : -1;
      }
    } else {
      if (playerAlive && dist < def.aggro) m.state = 'chase';
      else {
        if (Math.abs(m.x - m.homeX) > 90) m.facing = m.x > m.homeX ? -1 : 1;
        m.vx = m.facing * def.speed * 0.6;
        m.vy = Math.sin((frame + m.seed) * 0.06) * 0.8;
      }
    }
    m.x = clamp(m.x + m.vx, 4, world.w - m.w - 4);
    m.y = clamp(m.y + m.vy, 50, world.h - m.h - 96);
    return;
  }

  // 地面怪
  if (m.state === 'chase') {
    if (!playerAlive || dist > def.aggro * 1.7) m.state = 'patrol';
    else {
      m.facing = dx >= 0 ? 1 : -1;
      m.vx = m.facing * def.speed;
    }
  } else {
    if (playerAlive && dist < def.aggro) m.state = 'chase';
    else {
      if (Math.abs(m.x - m.homeX) > 90) m.facing = m.x > m.homeX ? -1 : 1;
      if (--m.stateTimer <= 0) {
        m.stateTimer = 90 + Math.floor(rng() * 90);
        if (rng() < 0.3) m.facing *= -1;
      }
      m.vx = m.facing * def.speed * 0.7;
    }
  }
  physicsMove(m, world);
}

// Boss：磐苔巨像 —— 巡逻 / 蓄力冲撞 / 抛射孢子 / 休息
function updateBoss(m, dx, dist, playerAlive, world, spawnProjectile, rng) {
  const def = m.def;
  switch (m.state) {
    case 'patrol': {
      if (playerAlive && dist < def.aggro) {
        m.state = 'windup';
        m.stateTimer = 45;
        m.attackKind = Math.abs(dx) > 200 ? 'charge' : 'spit';
      } else {
        if (Math.abs(m.x - m.homeX) > 120) m.facing = m.x > m.homeX ? -1 : 1;
        m.vx = m.facing * def.speed * 0.5;
      }
      physicsMove(m, world);
      break;
    }
    case 'windup': {
      // 蓄力：原地发抖、面向玩家
      m.facing = dx >= 0 ? 1 : -1;
      m.vx = (rng() - 0.5) * 1.2;
      physicsMove(m, world);
      if (--m.stateTimer <= 0) {
        if (m.attackKind === 'charge') {
          m.state = 'charging';
          m.chargeDir = dx >= 0 ? 1 : -1;
          m.facing = m.chargeDir;
          m.chargeLeft = 55;
        } else {
          // 抛射：三连孢子弹，抛物线飞向玩家
          const dir = dx >= 0 ? 1 : -1;
          for (let i = 0; i < 3; i++) {
            spawnProjectile({
              x: m.x + m.w / 2 - 7,
              y: m.y + 18,
              vx: dir * (2.0 + i * 0.55),
              vy: -4.5 - i * 0.7,
              gravity: 0.18,
              w: 14, h: 14,
              owner: 'monster',
              dmg: def.projDmg,
              kind: 'spore',
            });
          }
          m.state = 'rest';
          m.stateTimer = 80;
        }
      }
      break;
    }
    case 'charging': {
      m.vx = m.chargeDir * 5.2;
      m.chargeLeft--;
      physicsMove(m, world);
      if (m.chargeLeft <= 0 || m.x <= 6 || m.x + m.w >= world.w - 6) {
        m.state = 'rest';
        m.stateTimer = 90;
        m.vx = 0;
      }
      break;
    }
    case 'rest': {
      m.facing = dx >= 0 ? 1 : -1;
      m.vx = 0;
      physicsMove(m, world);
      if (--m.stateTimer <= 0) m.state = 'patrol';
      break;
    }
    default:
      m.state = 'patrol';
  }
}
