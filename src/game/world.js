// 世界更新：弹幕、掉落物、粒子、飘字、镜头
import { game, centerCam } from './state.js';
import { damagePlayer, hurtMonster } from './actions.js';
import { rectsOverlap, moveAndCollide, GRAVITY, TERMINAL } from '../logic/physics.js';
import { clamp, dec } from '../logic/util.js';
import { prefersReducedMotion } from '../core/motion.js';

export function updateWorld() {
  updateProjectiles();
  updateDrops();
  updateParticles();
  updateDmgNums();
  centerCam();
}

function updateProjectiles() {
  const p = game.player;
  for (const pr of game.projectiles) {
    pr.vy += pr.gravity;
    pr.x += pr.vx;
    pr.y += pr.vy;
    pr.life--;
    if (pr.kind === 'gale') {
      // 翠风斩：风刃拖尾
      if (game.frame % 2 === 0) {
        game.particles.push({
          x: pr.x + pr.w / 2, y: pr.y + pr.h / 2 + (Math.random() - 0.5) * 20,
          vx: -pr.vx * 0.15, vy: (Math.random() - 0.5) * 0.6,
          life: 16, color: '#baf0c0', size: 3, gravity: 0,
        });
      }
      for (const m of game.monsters) {
        if (m.dead || pr.hitSet.has(m) || !rectsOverlap(pr, m)) continue;
        pr.hitSet.add(m);
        hurtMonster(m, Math.max(1, pr.dmg - m.def.def), Math.sign(pr.vx));
      }
    } else {
      // Boss 孢子：命中玩家或砸地消散
      if (!p.dead && p.invuln <= 0 && rectsOverlap(pr, p)) {
        damagePlayer(pr.dmg, Math.sign(pr.vx) || 1, -5);
        pr.life = 0;
      }
      if (game.world.solids.some((s) => !s.oneWay && rectsOverlap(pr, s))) pr.life = 0;
      if (pr.life <= 0) {
        for (let i = 0; i < 5; i++) {
          game.particles.push({
            x: pr.x + 7, y: pr.y + 7,
            vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2,
            life: 18, color: '#c9a3e8', size: 3, gravity: 0.06,
          });
        }
      }
    }
    if (pr.x < -60 || pr.x > game.map.width + 60 || pr.y > game.map.height + 60) pr.life = 0;
  }
  game.projectiles = game.projectiles.filter((pr) => pr.life > 0);
}

function updateDrops() {
  for (const d of game.drops) {
    d.age++;
    if (d.grounded) {
      d.vx *= 0.8;
      continue;
    }
    d.vy = Math.min(d.vy + GRAVITY, TERMINAL);
    d.x += d.vx;
    d.y += d.vy;
    // 落到地面/平台上就停住
    for (const s of game.world.solids) {
      if (rectsOverlap(d, s) && d.vy >= 0 && d.y + d.h - d.vy <= s.y + 4) {
        d.y = s.y - d.h;
        d.vy = 0;
        d.vx *= 0.4;
        d.grounded = true;
        break;
      }
    }
    d.x = clamp(d.x, 4, game.map.width - d.w - 4);
  }
  game.drops = game.drops.filter((d) => !d.taken && d.age < 3600);
}

function updateParticles() {
  for (const pt of game.particles) {
    pt.vy += pt.gravity;
    pt.x += pt.vx;
    pt.y += pt.vy;
    dec(pt, 'life');
  }
  game.particles = game.particles.filter((pt) => pt.life > 0);
}

function updateDmgNums() {
  const reduced = prefersReducedMotion();
  for (const n of game.dmgNums) {
    if (!reduced) {
      n.y += n.vy;
      n.vy *= 0.96;
    }
    dec(n, 'life');
  }
  game.dmgNums = game.dmgNums.filter((n) => n.life > 0);
}
