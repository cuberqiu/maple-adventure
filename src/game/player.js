// 玩家更新：移动 / 跳跃 / 攀爬 / 攻击 / 技能 / 喝药 / 死亡重生
import { game, loadMap } from './state.js';
import { damagePlayer, hurtMonster, spawnDmgNum, spawnParticles, tryPickup } from './actions.js';
import {
  rectsOverlap, moveAndCollide, ladderAt, standingOnOneWay,
  GRAVITY, TERMINAL,
} from '../logic/physics.js';
import { createHitbox, rollDamage } from '../logic/combat.js';
import { castSkill, canCast, SKILL_DEFS } from '../logic/skills.js';
import { usePotion, HP_POTION, MP_POTION } from '../logic/inventory.js';
import { clamp, dec } from '../logic/util.js';
import { emit } from '../core/bus.js';

const MOVE_SPEED = 4.0;
const JUMP_V = -12;
const MP_REGEN_FRAMES = 45; // 每 45 帧回 1 点魔力

export function updatePlayer() {
  const p = game.player;
  const inp = game.input;
  const map = game.map;
  const world = game.world;

  if (p.dead) {
    // 倒地动画播完就停住，等待死亡卡的「醒过来了」按钮（不再自动复活）
    if (p.deathTimer > 0) p.deathTimer--;
    return;
  }

  // ---- 计时器 ----
  dec(p, 'invuln');
  dec(p, 'flash');
  dec(p, 'hurtTimer');
  dec(p, 'attackTimer');
  dec(p, 'attackCd');
  dec(p, 'castTimer');
  dec(p, 'dropThrough');
  dec(p, 'coyote');
  if (game.frame % MP_REGEN_FRAMES === 0 && p.stats.mp < p.stats.maxMp) p.stats.mp++;
  // 顺手拾取脚边的掉落物
  for (const d of game.drops) {
    if (!d.taken && d.age > 16 && rectsOverlap(p, d)) d.taken = tryPickup(d);
  }

  // ---- 攀爬 ----
  const up = inp.down('up');
  const down = inp.down('down');
  if (p.climbing) {
    // 攀爬中用宽松判定（顶端边缘也能抓着）
    const ladder = ladderAt(p, map.ladders, true);
    p.vx = 0;
    p.vy = ((down ? 1 : 0) - (up ? 1 : 0)) * 2.4;
    if (inp.tapped('jump')) {
      p.climbing = false;
      p.vy = -8;
      emit('sfx', 'jump');
    } else if (ladder && up && p.y + p.h <= ladder.y + 4) {
      // 爬到顶端：站上梯子顶的平台
      p.climbing = false;
      p.y = ladder.y - p.h;
      p.vy = 0;
      p.onGround = true;
    } else if (!ladder) {
      // 爬出了底端或侧面
      p.climbing = false;
    }
    p.y += p.vy;
    p.x = clamp(p.x, 2, map.width - p.w - 2);
    faceByInput(p, inp);
    tryActions(p, inp);
    return;
  }
  // 抓梯：站立处按上 / 站在梯子顶按向下
  if (up && ladderAt(p, map.ladders)) {
    const ladder = ladderAt(p, map.ladders);
    startClimb(p, ladder);
  } else if (down && p.onGround && ladderAt(p, map.ladders, true)) {
    const ladder = ladderAt(p, map.ladders, true);
    if (ladder.y + ladder.h > p.y + p.h - 4) startClimb(p, ladder);
  }

  // ---- 水平移动 ----
  if (p.hurtTimer > 0) {
    p.vx *= 0.86; // 受击滑行
  } else {
    const dir = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
    p.vx = dir * MOVE_SPEED;
    if (dir !== 0) p.facing = dir;
  }

  // ---- 跳跃 / 下穿 ----
  if (inp.tapped('jump')) {
    if (down && p.onGround && standingOnOneWay(p, world.solids)) {
      p.dropThrough = 10; // 下+跳：穿过单向平台
      p.vy = 1;
    } else if (p.onGround || p.coyote > 0) {
      p.vy = JUMP_V;
      p.onGround = false;
      p.coyote = 0;
      emit('sfx', 'jump');
    }
  }
  p.vy = Math.min(p.vy + GRAVITY, TERMINAL);

  moveAndCollide(p, world.solids, { minX: 0, maxX: map.width });
  if (p.onGround) p.coyote = 6;

  // ---- 普通攻击 ----
  if (inp.tapped('attack') && p.attackCd <= 0) {
    p.attackTimer = 18;
    p.attackCd = 26;
    p.hitSet.clear();
    emit('sfx', 'swing');
  }
  if (p.attackTimer > 0 && p.attackTimer <= 13) {
    // 挥击判定窗口（第 5~13 帧）
    const hb = createHitbox(p, 46, 46);
    for (const m of game.monsters) {
      if (m.dead || p.hitSet.has(m) || !rectsOverlap(hb, m)) continue;
      p.hitSet.add(m);
      const dmg = rollDamage(p.stats.atk, m.def.def);
      hurtMonster(m, dmg, Math.sign(m.x + m.w / 2 - (p.x + p.w / 2)) || p.facing);
    }
  }

  // ---- 技能 / 喝药 ----
  tryActions(p, inp);

  // ---- 陷阱 ----
  for (const hz of map.hazards) {
    if (rectsOverlap(p, hz)) {
      damagePlayer(hz.dmg, 0, -7);
      break;
    }
  }
}

function faceByInput(p, inp) {
  const dir = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
  if (dir !== 0) p.facing = dir;
}

function startClimb(p, ladder) {
  p.climbing = true;
  p.x = ladder.x + ladder.w / 2 - p.w / 2;
  p.vy = 0;
  p.vx = 0;
}

// 技能 / 喝药按键处理（攀爬时也可用）
function tryActions(p, inp) {
  if (inp.tapped('skill1')) castPlayerSkill(p, 'galeSlash');
  if (inp.tapped('skill2')) castPlayerSkill(p, 'dewBless');
  if (inp.tapped('potionSmart')) quickPotion(p, true);
  if (inp.tapped('potionMp')) quickPotion(p, false);
}

function castPlayerSkill(p, id) {
  const def = SKILL_DEFS[id];
  const check = canCast(def, p.stats, p.skillCds);
  if (!check.ok) {
    emit('toast', check.reason);
    return;
  }
  castSkill(def, p.stats, p.skillCds);
  p.castTimer = 12;
  if (id === 'galeSlash') {
    // 翠风斩：向前放出一道风刃
    game.projectiles.push({
      x: p.facing > 0 ? p.x + p.w : p.x - 34,
      y: p.y + 8,
      w: 34, h: 30,
      vx: 7 * p.facing,
      vy: 0,
      gravity: 0,
      owner: 'player',
      dmg: Math.max(1, Math.round(p.stats.atk * 2.2)),
      kind: 'gale',
      life: 66,
      hitSet: new Set(),
    });
    emit('sfx', 'gale');
  } else {
    // 晨露祝福：恢复 40% 最大生命
    const heal = Math.round(p.stats.maxHp * 0.4);
    p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + heal);
    spawnDmgNum(p.x + p.w / 2, p.y - 8, `+${heal}`, '#9be89b', true);
    spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 14, ['#c9f7c9', '#8fe388', '#ffffff'], { lift: 1.5, gravity: -0.01 });
    emit('sfx', 'heal');
  }
}

// 智能喝药：smart=true 优先生命药，否则魔力药
function quickPotion(p, smart) {
  let id;
  if (smart) {
    id = HP_POTION;
    if (p.stats.hp >= p.stats.maxHp && p.stats.mp < p.stats.maxMp) id = MP_POTION;
  } else {
    id = MP_POTION;
  }
  const res = usePotion(p.inv, id, p.stats);
  emit('toast', res.message);
  if (res.ok) {
    emit('sfx', 'potion');
    spawnParticles(p.x + p.w / 2, p.y + 10, 6, [id === HP_POTION ? '#ffb3b3' : '#a8d8ff'], { lift: 1 });
  }
}

// 倒下后在露水镇苏醒：保留等级与背包，只掉一小部分露珠
export function respawnPlayer() {
  const p = game.player;
  const lost = Math.min(Math.floor(p.inv.coins * 0.1), 500);
  p.inv.coins -= lost;
  p.dead = false;
  p.hp = p.stats.maxHp;
  p.mp = p.stats.maxMp;
  p.invuln = 90;
  loadMap('town', 560, 560);
  emit('toast', lost > 0 ? `你在露水镇苏醒了……遗失了 ${lost} 露珠。` : '你在露水镇苏醒了。');
  emit('respawned');
}
