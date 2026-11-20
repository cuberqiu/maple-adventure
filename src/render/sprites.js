// 角色 / 怪物 / Boss / 掉落物 / 弹幕 绘制（原创可爱风，纯 Canvas 程序化）
import { game } from '../game/state.js';

// 受击闪白：把颜色替换成白色
function tint(entity, color) {
  return entity.flash > 0 ? '#ffffff' : color;
}

// ---------- 玩家 ----------
export function drawPlayer(ctx, p, frame) {
  ctx.save();
  // 无敌帧闪烁
  if (p.invuln > 0 && !p.dead && Math.floor(frame / 3) % 2 === 0) ctx.globalAlpha = 0.45;

  if (p.dead) {
    // 倒地
    ctx.translate(p.x + p.w / 2, p.y + p.h - 6);
    ctx.rotate(Math.PI / 2 * Math.min(1, (140 - p.deathTimer) / 30));
    ctx.globalAlpha = Math.max(0.25, p.deathTimer / 140);
    drawPlayerBody(ctx, p, frame, { x: -p.w / 2, y: -p.h + 6 });
    ctx.restore();
    return;
  }

  const walking = p.onGround && Math.abs(p.vx) > 0.5 && !p.climbing;
  const legSwing = walking ? Math.sin(frame * 0.3) * 5 : 0;
  ctx.translate(p.x + p.w / 2, p.y);
  if (p.facing < 0) ctx.scale(-1, 1);
  drawPlayerBody(ctx, p, frame, { x: -p.w / 2, y: 0, legSwing, walking, climbing: p.climbing });

  // 攻击弧光
  if (p.attackTimer > 4 && p.attackTimer <= 14) {
    const t = (14 - p.attackTimer) / 10;
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - t * 0.7})`;
    ctx.lineWidth = 5 - t * 3;
    ctx.beginPath();
    ctx.arc(10, 16, 30 + t * 14, -1.1 + t * 1.6, 0.9 + t * 1.6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerBody(ctx, p, frame, pose) {
  const { legSwing = 0, walking = false, climbing = false } = pose;
  const bodyC = tint(p, '#7ecb8f');
  const darkC = tint(p, '#5aa86c');
  const skinC = tint(p, '#ffe3c9');

  // 腿
  ctx.fillStyle = darkC;
  if (climbing) {
    ctx.fillRect(-8, 26, 6, 10);
    ctx.fillRect(3, 22, 6, 10);
  } else if (p.onGround) {
    ctx.fillRect(-9 + legSwing, 28, 7, 11);
    ctx.fillRect(2 - legSwing, 28, 7, 11);
  } else {
    ctx.fillRect(-9, 26, 7, 9);
    ctx.fillRect(3, 29, 7, 9);
  }
  // 圆润身体
  ctx.fillStyle = bodyC;
  ctx.beginPath();
  ctx.ellipse(0, 16, 12, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // 肚皮
  ctx.fillStyle = tint(p, '#d8f0c0');
  ctx.beginPath();
  ctx.ellipse(2, 18, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // 头（大一点更可爱）
  ctx.fillStyle = skinC;
  ctx.beginPath();
  ctx.arc(0, -6, 13, 0, Math.PI * 2);
  ctx.fill();
  // 叶子发饰
  ctx.fillStyle = tint(p, '#4e9958');
  ctx.beginPath();
  ctx.ellipse(-7, -17, 7, 3.5, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // 眼睛（大眼 + 高光）
  ctx.fillStyle = '#3d3d3d';
  ctx.beginPath();
  ctx.arc(-4, -5, 3, 0, Math.PI * 2);
  ctx.arc(5, -5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-3, -6, 1.1, 0, Math.PI * 2);
  ctx.arc(6, -6, 1.1, 0, Math.PI * 2);
  ctx.fill();
  // 腮红
  ctx.fillStyle = 'rgba(255,150,150,0.55)';
  ctx.beginPath();
  ctx.arc(-8, -1, 2.4, 0, Math.PI * 2);
  ctx.arc(9, -1, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // 手臂
  ctx.fillStyle = skinC;
  if (climbing) {
    const alt = Math.sin(frame * 0.2) * 3;
    ctx.beginPath();
    ctx.arc(-12, 4 + alt, 4, 0, Math.PI * 2);
    ctx.arc(12, 10 - alt, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.attackTimer > 0) {
    ctx.beginPath();
    ctx.arc(13, 10, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(-11, 14, 4, 0, Math.PI * 2);
    ctx.arc(11, 14, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- 怪物 ----------
export function drawMonster(ctx, m, frame) {
  if (m.dead && m.fadeTimer <= 0) return;
  ctx.save();
  const alpha = m.dead ? m.fadeTimer / 40 : 1;
  ctx.globalAlpha = alpha;
  const cx = m.x + m.w / 2;
  const cy = m.y + m.h / 2;
  ctx.translate(cx, cy);
  if (m.dead) {
    ctx.rotate((1 - alpha) * 1.2);
    ctx.scale(1, alpha);
  }
  if (m.facing < 0) ctx.scale(-1, 1);

  if (m.type === 'bramble') drawBramble(ctx, m, frame);
  else if (m.type === 'moth') drawMoth(ctx, m, frame);
  else if (m.type === 'golem') drawGolem(ctx, m, frame);
  else if (m.type === 'boss') drawBoss(ctx, m, frame);
  ctx.restore();

  // 血条（受伤后显示）
  if (!m.dead && m.hp < m.maxHp) {
    const bw = m.def.boss ? 90 : 36;
    const bx = m.x + m.w / 2 - bw / 2;
    const by = m.y - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
    ctx.fillStyle = m.def.boss ? '#ff7b7b' : '#8fe388';
    ctx.fillRect(bx, by, (bw * m.hp) / m.maxHp, 4);
  }
}

// 荆刺果：圆滚滚的带刺浆果
function drawBramble(ctx, m, frame) {
  const hop = m.state === 'chase' ? Math.abs(Math.sin(frame * 0.15)) * 4 : Math.abs(Math.sin(frame * 0.05)) * 2;
  ctx.translate(0, -hop);
  const bodyC = tint(m, '#c77dba');
  // 刺
  ctx.fillStyle = tint(m, '#8e4f85');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const x = Math.cos(a) * 14, y = Math.sin(a) * 12;
    ctx.beginPath();
    ctx.moveTo(x - 3, y + 2);
    ctx.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
    ctx.lineTo(x + 3, y + 2);
    ctx.closePath();
    ctx.fill();
  }
  // 身体
  ctx.fillStyle = bodyC;
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // 顶叶
  ctx.fillStyle = tint(m, '#6fbf73');
  ctx.beginPath();
  ctx.ellipse(2, -13, 6, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // 眼睛（生气）
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-5, -2, 4.5, 0, Math.PI * 2);
  ctx.arc(5, -2, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d3d3d';
  ctx.beginPath();
  ctx.arc(-4, -1.5, 2.2, 0, Math.PI * 2);
  ctx.arc(6, -1.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3d3d3d';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-8, -7); ctx.lineTo(-2, -5);
  ctx.moveTo(8, -7); ctx.lineTo(2, -5);
  ctx.stroke();
  // 嘴
  ctx.beginPath();
  ctx.arc(0, 5, 3, 1.15 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
}

// 雾羽蛾：扑翼的淡紫蛾子
function drawMoth(ctx, m, frame) {
  const flap = Math.sin(frame * 0.35 + m.seed) * 0.6;
  // 翅膀
  ctx.fillStyle = tint(m, 'rgba(214,188,240,0.9)');
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(1, 1);
    ctx.translate(s * 6, -2);
    ctx.rotate(s * flap);
    ctx.beginPath();
    ctx.ellipse(s * 10, -4, 12, 8, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 翅膀斑点
  ctx.fillStyle = tint(m, 'rgba(255,255,255,0.75)');
  ctx.beginPath();
  ctx.arc(-14, -6, 2.5, 0, Math.PI * 2);
  ctx.arc(14, -6, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // 身体
  ctx.fillStyle = tint(m, '#9c7fc2');
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // 触角
  ctx.strokeStyle = tint(m, '#7a5fa3');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2, -9); ctx.quadraticCurveTo(-6, -16, -9, -14);
  ctx.moveTo(2, -9); ctx.quadraticCurveTo(6, -16, 9, -14);
  ctx.stroke();
  // 眼睛
  ctx.fillStyle = '#3d3d3d';
  ctx.beginPath();
  ctx.arc(-2.5, -4, 2, 0, Math.PI * 2);
  ctx.arc(2.5, -4, 2, 0, Math.PI * 2);
  ctx.fill();
}

// 苔石傀儡：憨重的石头家伙
function drawGolem(ctx, m, frame) {
  const wob = Math.sin(frame * 0.06 + m.seed) * 1.5;
  // 手臂
  ctx.fillStyle = tint(m, '#5c6678');
  ctx.beginPath();
  ctx.arc(-20, 6 + wob, 8, 0, Math.PI * 2);
  ctx.arc(20, 6 - wob, 8, 0, Math.PI * 2);
  ctx.fill();
  // 身体
  ctx.fillStyle = tint(m, '#6e7b90');
  ctx.beginPath();
  ctx.moveTo(-19, 12);
  ctx.quadraticCurveTo(-22, -16, -8, -20);
  ctx.lineTo(8, -20);
  ctx.quadraticCurveTo(22, -16, 19, 12);
  ctx.closePath();
  ctx.fill();
  // 苔藓
  ctx.fillStyle = tint(m, '#7ecb8f');
  ctx.beginPath();
  ctx.ellipse(-6, -17, 10, 4, 0.2, 0, Math.PI * 2);
  ctx.ellipse(10, -12, 6, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // 眼睛（发光）
  ctx.fillStyle = tint(m, '#ffe066');
  ctx.beginPath();
  ctx.arc(-6, -6, 4, 0, Math.PI * 2);
  ctx.arc(7, -6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d3d3d';
  ctx.beginPath();
  ctx.arc(-5, -5.5, 1.8, 0, Math.PI * 2);
  ctx.arc(8, -5.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // 嘴
  ctx.fillStyle = tint(m, '#4a5468');
  ctx.fillRect(-4, 2, 9, 3);
}

// 磐苔巨像（Boss）
function drawBoss(ctx, m, frame) {
  const windup = m.state === 'windup';
  const shake = windup ? (Math.random() - 0.5) * 4 : 0;
  const charging = m.state === 'charging';
  ctx.translate(shake, 0);

  // 冲撞拖影
  if (charging) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-m.chargeDir * 30 - m.w / 2, -m.h / 2, m.w, m.h);
  }
  // 手臂
  ctx.fillStyle = tint(m, '#4f5a6e');
  ctx.beginPath();
  ctx.arc(-38, 10, 15, 0, Math.PI * 2);
  ctx.arc(38, 10, 15, 0, Math.PI * 2);
  ctx.fill();
  // 大身体
  ctx.fillStyle = windup && Math.floor(frame / 4) % 2 === 0 ? '#ff9f9f' : tint(m, '#66738a');
  ctx.beginPath();
  ctx.moveTo(-38, 30);
  ctx.quadraticCurveTo(-46, -30, -16, -42);
  ctx.lineTo(16, -42);
  ctx.quadraticCurveTo(46, -30, 38, 30);
  ctx.closePath();
  ctx.fill();
  // 背上的荧光晶石
  const pulse = 0.6 + 0.4 * Math.sin(frame * 0.08);
  ctx.fillStyle = `rgba(126,232,208,${0.6 + pulse * 0.3})`;
  for (const [x, y, s] of [[-20, -34, 10], [0, -44, 13], [20, -34, 10]]) {
    ctx.beginPath();
    ctx.moveTo(x - s / 2, y);
    ctx.lineTo(x, y - s * 1.4);
    ctx.lineTo(x + s / 2, y);
    ctx.closePath();
    ctx.fill();
  }
  // 苔藓
  ctx.fillStyle = tint(m, '#6fbf73');
  ctx.beginPath();
  ctx.ellipse(-12, -30, 16, 6, 0.2, 0, Math.PI * 2);
  ctx.ellipse(18, -20, 10, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // 眼睛（发光怒目）
  ctx.fillStyle = windup ? '#ff5252' : '#ffe066';
  ctx.beginPath();
  ctx.arc(-12, -12, 7, 0, Math.PI * 2);
  ctx.arc(14, -12, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2d2d2d';
  ctx.beginPath();
  ctx.arc(-10, -11, 3, 0, Math.PI * 2);
  ctx.arc(16, -11, 3, 0, Math.PI * 2);
  ctx.fill();
  // 嘴
  ctx.fillStyle = '#394152';
  ctx.fillRect(-10, 4, 22, 5);
  ctx.fillStyle = '#ffe066';
  for (let i = 0; i < 4; i++) ctx.fillRect(-8 + i * 6, 4, 3, 5);
  // 蓄力警示
  if (windup) {
    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -58);
    ctx.textAlign = 'left';
  }
}

// ---------- 掉落物 ----------
export function drawDrops(ctx, frame) {
  for (const d of game.drops) {
    const bob = Math.sin(frame * 0.1 + d.x) * 2;
    const y = d.y + (d.grounded ? bob : 0);
    if (d.kind === 'coin') {
      // 露珠（货币）
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#c9f7c9';
      ctx.beginPath();
      ctx.arc(d.x + 7, d.y + 7 + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#8fe388';
      ctx.beginPath();
      ctx.moveTo(d.x + 7, d.y + 1 + bob);
      ctx.quadraticCurveTo(d.x + 13, d.y + 8 + bob, d.x + 7, d.y + 13 + bob);
      ctx.quadraticCurveTo(d.x + 1, d.y + 8 + bob, d.x + 7, d.y + 1 + bob);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.ellipse(d.x + 5, d.y + 6 + bob, 2, 3, -0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 药剂瓶
      const isHp = d.kind === 'hpPotion';
      ctx.fillStyle = '#d9e8f2';
      ctx.fillRect(d.x + 5, d.y + 2, 6, 4);
      ctx.fillStyle = isHp ? '#ff8f8f' : '#8fbfff';
      ctx.beginPath();
      ctx.moveTo(d.x + 3, d.y + 12);
      ctx.quadraticCurveTo(d.x + 3, d.y + 5, d.x + 8, d.y + 5);
      ctx.quadraticCurveTo(d.x + 13, d.y + 5, d.x + 13, d.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(d.x + 6, d.y + 10, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------- 弹幕 ----------
export function drawProjectiles(ctx, frame) {
  for (const pr of game.projectiles) {
    if (pr.kind === 'gale') {
      // 翠风斩风刃
      ctx.save();
      ctx.translate(pr.x + pr.w / 2, pr.y + pr.h / 2);
      ctx.scale(Math.sign(pr.vx), 1);
      ctx.strokeStyle = 'rgba(186,240,192,0.95)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(-8, 0, 18, -1.2, 1.2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-10, 0, 14, -1.0, 1.0);
      ctx.stroke();
      ctx.restore();
    } else {
      // Boss 孢子
      const wob = Math.sin(frame * 0.2 + pr.x * 0.1) * 2;
      ctx.fillStyle = '#c9a3e8';
      ctx.beginPath();
      ctx.arc(pr.x + 7, pr.y + 7 + wob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a5fb8';
      for (const [dx, dy] of [[-5, -3], [4, -5], [5, 4]]) {
        ctx.beginPath();
        ctx.arc(pr.x + 7 + dx, pr.y + 7 + wob + dy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(pr.x + 5, pr.y + 5 + wob, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
