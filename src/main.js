// 《翠谷奇谭》主入口：启动、游戏主循环、交互、场景与存档调度
import { game, loadMap, uiLocked, VIEW_W, VIEW_H, STEP_MS } from './game/state.js';
import { updatePlayer } from './game/player.js';
import { updateMonsters } from './game/monsters.js';
import { updateWorld } from './game/world.js';
import { spawnParticles } from './game/actions.js';
import { createKeyboardInput } from './core/input.js';
import * as audio from './core/audio.js';
import { on, emit } from './core/bus.js';
import { hasSave, loadSave, writeSave, loadMuted, writeMuted } from './core/saveStore.js';
import { createPlayer } from './logic/entities.js';
import { rectsOverlap } from './logic/physics.js';
import { drawBackground } from './render/background.js';
import { drawMap } from './render/draw.js';
import { drawPlayer, drawMonster, drawDrops, drawProjectiles } from './render/sprites.js';
import { drawParticles, drawDmgNums, drawCaveLight } from './render/effects.js';
import { showHud, updateHud } from './render/hud.js';
import * as ui from './render/ui.js';
import { setupTouch } from './render/touch.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 2);

let autosaveTimer = 0;

// ===================== 启动 =====================
function boot() {
  canvas.width = VIEW_W * DPR;
  canvas.height = VIEW_H * DPR;

  game.input = createKeyboardInput(window);
  setupTouch(game.input);

  audio.setMuted(loadMuted());

  // 首次手势解锁音频
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });

  bindBus();
  bindTitleScreen();
  bindGlobalKeys();
  bindGameButtons();

  requestAnimationFrame(loop);
}

// 逻辑层事件 → 表现层
function bindBus() {
  on('sfx', (name) => audio.play(name));
  on('toast', (msg) => ui.toast(msg));
  on('save', () => saveRun());
  on('playerDied', () => ui.showDeath());
  on('respawned', () => {
    ui.hideDeath();
    saveRun();
  });
}

function bindTitleScreen() {
  const btnContinue = document.getElementById('btn-continue');
  btnContinue.disabled = !hasSave();
  btnContinue.addEventListener('click', () => {
    if (game.scene === 'playing') return;
    const run = loadSave();
    if (!run) {
      ui.toast('没有找到存档，先开始新的冒险吧。');
      return;
    }
    startRun(run);
  });
  document.getElementById('btn-new').addEventListener('click', () => {
    if (game.scene === 'playing') return;
    if (hasSave()) {
      // 新游戏要确认覆盖
      document.getElementById('confirm-new').classList.remove('hidden');
    } else {
      startNewRun();
    }
  });
  document.getElementById('btn-confirm-new').addEventListener('click', () => {
    document.getElementById('confirm-new').classList.add('hidden');
    startNewRun();
  });
  document.getElementById('btn-cancel-new').addEventListener('click', () => {
    document.getElementById('confirm-new').classList.add('hidden');
  });
  const muteCheck = document.getElementById('mute-check');
  muteCheck.checked = audio.isMuted();
  muteCheck.addEventListener('change', () => {
    audio.setMuted(muteCheck.checked);
    writeMuted(muteCheck.checked);
  });
}

// 全局按键（UI 层面）
function bindGlobalKeys() {
  window.addEventListener('keydown', (e) => {
    if (game.scene !== 'playing') return;
    const inp = game.input;
    // 对话推进
    if (game.dialogue) {
      if (inp.tapped('interact') || inp.tapped('attack') || inp.tapped('jump')) {
        e.preventDefault();
        ui.advanceDialogue();
        // 清掉本帧按键标记，避免对话刚关闭时同一次按键又触发交互
        inp.endStep();
      }
      return;
    }
    if (inp.tapped('pause')) {
      e.preventDefault();
      if (game.paused) resumeGame();
      else pauseGame();
    }
    if (game.shopOpen && inp.tapped('interact')) {
      ui.closeShop();
      return;
    }
    if (inp.tapped('inventory') && !game.paused && !game.victoryShown) {
      ui.toggleInventory();
    }
    if (inp.tapped('mute')) {
      toggleMute();
    }
  });
}

// 游戏内按钮（HUD 暂停键 / 面板关闭 / 对话点击推进）
function bindGameButtons() {
  document.getElementById('btn-pause').addEventListener('click', () => {
    if (game.scene !== 'playing') return;
    if (game.dialogue || game.shopOpen || game.invOpen || game.victoryShown) return;
    if (game.paused) resumeGame();
    else pauseGame();
  });
  document.getElementById('shop-close').addEventListener('click', () => ui.closeShop());
  document.getElementById('inv-close').addEventListener('click', () => ui.toggleInventory(false));
  document.getElementById('dialogue').addEventListener('click', () => {
    ui.advanceDialogue();
    game.input.endStep();
  });
  // 鼠标点击技能栏也能放技能 / 喝药
  const clickSlot = (id, action) => {
    document.getElementById(id).addEventListener('click', () => {
      if (game.scene !== 'playing' || uiLocked()) return;
      game.input.press(action);
      game.input.release(action);
    });
  };
  clickSlot('slot-attack', 'attack');
  clickSlot('slot-s1', 'skill1');
  clickSlot('slot-s2', 'skill2');
  clickSlot('slot-php', 'potionSmart');
  clickSlot('slot-pmp', 'potionMp');
}

function toggleMute() {
  audio.setMuted(!audio.isMuted());
  writeMuted(audio.isMuted());
  document.getElementById('mute-check').checked = audio.isMuted();
  ui.toast(audio.isMuted() ? '音效已关闭' : '音效已开启');
}

// ===================== 场景 =====================
function startNewRun() {
  const p = createPlayer(560, 560);
  game.player = p;
  enterPlay();
  loadMap('town', 560, 560);
  saveRun();
  ui.toast('欢迎来到翠谷！先和镇上的铃兰聊聊吧。');
}

function startRun(run) {
  const p = createPlayer(run.x, run.y);
  p.stats = run.stats;
  p.inv = run.inv;
  p.bossDefeated = run.bossDefeated;
  p.hp = run.stats.hp;
  p.mp = run.stats.mp;
  game.player = p;
  enterPlay();
  loadMap(run.mapId, run.x, run.y);
  ui.toast(`欢迎回来，Lv.${p.stats.level} 的冒险者！`);
}

function enterPlay() {
  game.scene = 'playing';
  game.paused = false;
  game.dialogue = null;
  game.shopOpen = false;
  game.invOpen = false;
  game.victoryShown = false;
  document.getElementById('title-screen').classList.add('hidden');
  showHud(true);
}

function pauseGame() {
  game.paused = true;
  ui.showPause(resumeGame, quitToTitle, audio.isMuted(), toggleMute);
}

function resumeGame() {
  game.paused = false;
  ui.hidePause();
}

function quitToTitle() {
  saveRun();
  resumeGame();
  game.scene = 'title';
  game.player = null;
  showHud(false);
  document.getElementById('title-screen').classList.remove('hidden');
  document.getElementById('btn-continue').disabled = !hasSave();
  ui.toast('旅途已保存。');
}

function saveRun() {
  if (game.player) writeSave(game.player);
}

// ===================== 主循环（固定 60 步/秒） =====================
let lastTime = performance.now();
let acc = 0;

function loop(now) {
  acc += Math.min(now - lastTime, 100);
  lastTime = now;
  while (acc >= STEP_MS) {
    step();
    acc -= STEP_MS;
  }
  render();
  requestAnimationFrame(loop);
}

function step() {
  if (game.scene !== 'playing') {
    game.input?.endStep();
    return;
  }
  game.frame++;

  // Boss 击杀 → 胜利结算
  if (game.bossJustDied) {
    game.bossJustDied = false;
    ui.showVictory(() => {
      saveRun();
      ui.toast('巨像倒下了，翠谷恢复了宁静。洞穴里也许还有露珠可捡。');
    });
  }

  // 升级横幅
  if (game.pendingLevelUps > 0) {
    const p = game.player;
    game.pendingLevelUps = 0;
    ui.showLevelUp(p.stats.level);
    emit('sfx', 'levelup');
    spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 18, ['#ffe066', '#fff3c4', '#8fe388'], { lift: 2, gravity: -0.01 });
    saveRun();
  }

  if (!uiLocked()) {
    updatePlayer();
    updateMonsters();
    updateWorld();
    handleInteract();
    // 自动存档（每 30 秒）
    if (++autosaveTimer >= 1800) {
      autosaveTimer = 0;
      saveRun();
    }
  } else {
    // UI 打开时镜头仍跟随
    updateWorld();
  }
  game.input.endStep();
}

// ===================== 交互（NPC / 指示牌 / 水晶 / 传送门） =====================
function handleInteract() {
  const p = game.player;
  const map = game.map;
  let target = null;

  for (const portal of map.portals) {
    if (rectsOverlap(p, portal)) {
      target = { kind: 'portal', data: portal };
      break;
    }
  }
  if (!target) {
    for (const npc of map.npcs) {
      if (Math.abs(p.x + p.w / 2 - (npc.x)) < 64) {
        target = { kind: 'npc', data: npc };
        break;
      }
    }
  }
  if (!target) {
    for (const s of map.signs) {
      if (Math.abs(p.x + p.w / 2 - (s.x + 12)) < 56) {
        target = { kind: 'sign', data: s };
        break;
      }
    }
  }
  if (!target && map.crystal && Math.abs(p.x + p.w / 2 - (map.crystal.x + 8)) < 56) {
    target = { kind: 'crystal', data: map.crystal };
  }

  game.interactTarget = target;
  ui.interactHint(target ? hintFor(target) : null);

  if (target && game.input.tapped('interact')) {
    doInteract(target);
  }
}

function hintFor(t) {
  switch (t.kind) {
    case 'portal': return `按 Enter 前往「${t.data.label}」`;
    case 'npc': return `按 Enter 和${t.data.name}交谈`;
    case 'sign': return '按 Enter 阅读告示';
    case 'crystal': return '按 Enter 记录旅途（存档）';
    default: return '';
  }
}

function doInteract(t) {
  const p = game.player;
  switch (t.kind) {
    case 'portal': {
      emit('sfx', 'portal');
      fadeOutIn(() => {
        loadMap(t.data.to, t.data.tx, t.data.ty);
        saveRun();
      });
      break;
    }
    case 'npc': {
      const npc = t.data;
      ui.showDialogue(`${npc.name}（${npc.role}）`, npc.lines, () => {
        if (npc.shop) ui.openShop();
      });
      break;
    }
    case 'sign': {
      ui.showDialogue('告示牌', t.data.lines);
      break;
    }
    case 'crystal': {
      saveRun();
      emit('sfx', 'heal');
      spawnParticles(t.data.x + 8, t.data.y - 20, 12, ['#a8e8ff', '#ffffff'], { lift: 1.5 });
      ui.toast('✦ 旅途已记录。', 'good');
      break;
    }
    default:
      break;
  }
}

// 过场黑幕
function fadeOutIn(mid) {
  const fade = document.getElementById('fade');
  fade.classList.add('on');
  setTimeout(() => {
    mid();
    setTimeout(() => fade.classList.remove('on'), 120);
  }, 180);
}

// ===================== 渲染 =====================
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  if (!game.map || !game.player) {
    // 标题界面背景：柔和渐变
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#bfe6f2');
    g.addColorStop(1, '#e8f7d9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return;
  }

  ctx.save();
  ctx.translate(-Math.round(game.cam.x), -Math.round(game.cam.y));

  drawBackground(ctx, game.map, game.cam, game.frame);
  drawMap(ctx, game.frame);
  drawDrops(ctx, game.frame);
  for (const m of game.monsters) drawMonster(ctx, m, game.frame);
  drawPlayer(ctx, game.player, game.frame);
  drawProjectiles(ctx, game.frame);
  drawParticles(ctx);
  drawDmgNums(ctx);
  drawCaveLight(ctx);

  ctx.restore();
  updateHud();
}

boot();
