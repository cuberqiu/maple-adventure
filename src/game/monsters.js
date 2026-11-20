// 怪物批量更新：AI、碰撞接触伤害、重生
import { game } from './state.js';
import { damagePlayer } from './actions.js';
import { updateMonster, resetMonster } from '../logic/entities.js';
import { rectsOverlap } from '../logic/physics.js';

export function updateMonsters() {
  const p = game.player;
  for (const m of game.monsters) {
    if (m.dead) {
      if (m.fadeTimer > 0) {
        m.fadeTimer--;
      } else if (isFinite(m.respawnTimer) && --m.respawnTimer <= 0 && !m.def.boss) {
        resetMonster(m); // 小怪过段时间重生；Boss 被击败后不再出现
      }
      continue;
    }
    updateMonster(m, p, game.world, game.frame, spawnBossProjectile);
    // 贴身碰撞伤害（冲撞中伤害更高）
    if (!p.dead && p.invuln <= 0 && rectsOverlap(m, p)) {
      const dmg = m.state === 'charging' ? m.def.chargeDmg : m.def.atk;
      damagePlayer(dmg, Math.sign(p.x + p.w / 2 - (m.x + m.w / 2)) || 1);
    }
  }
}

function spawnBossProjectile(cfg) {
  game.projectiles.push({ ...cfg, life: 240, hitSet: new Set() });
}
