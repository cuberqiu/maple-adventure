// 《翠谷奇谭》主入口：启动、主循环、交互、场景与存档调度。
// 480×270 位图舞台，平滑缩放；触控层是 #stage 的兄弟节点，在舞台外。
import { game, loadMap, uiLocked, VIEW_W, VIEW_H, STEP_MS } from './game/state.js';
import { updatePlayer, respawnPlayer } from './game/player.js';
import { updateMonsters } from './game/monsters.js';
import { updateWorld } from './game/world.js';
import { spawnParticles } from './game/actions.js';
import { createKeyboardInput } from './core/input.js';
import * as audio from './core/audio.js';
import { on, emit } from './core/bus.js';
import { hasSave, loadSave, writeSave, loadMuted, writeMuted } from './core/saveStore.js';
import { loadAssets } from './core/assets.js';
import {
  computeLayout, computeTouchLayout,
  HUD_COMPACT_MAX_STAGE_W, BOSS_COMPACT_MAX_STAGE_W, BOSS_COMPACT_MAX_STAGE_H,
} from './core/layout.js';
import { createPlayer } from './logic/entities.js';
import { rectsOverlap } from './logic/physics.js';
import { drawBackground } from './render/background.js';
import { drawMap } from './render/draw.js';
import { drawPlayer, drawMonster, drawDrops, drawProjectiles } from './render/sprites.js';
import { drawParticles, drawDmgNums, drawCaveLight, drawBossBar, livingBoss, BOSS_BAR_H, BOSS_BAR_Y, BOSS_BAR_Y_COMPACT } from './render/effects.js';
import { showHud, updateHud } from './render/hud.js';
import * as ui from './render/ui.js';
import { setupTouch, detectTouch } from './render/touch.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let backing = 2;
let autosaveTimer = 0;
let assetsReady = false;
let curStageH = 270;
let curTouchH = 0;
let bossCompact = false;

const $ = (id) => document.getElementById(id);

// 铃兰战后对白（bossDefeated 后切换到这一段，见 P1-03）
const POST_BOSS_LINES = [
  '巨像倒下了，幽苔洞窟终于恢复了宁静。',
  '你为露水镇做了一件大事。这些药剂你拿着，路上还要当心那些小怪。',
];

function isTouchMode() {
  return document.body.classList.contains('touch');
}

// ===================== 启动 =====================
function boot() {
  resize();

  game.input = createKeyboardInput(window);
  setupTouch(game.input);

  audio.setMuted(loadMuted());
  syncMuteUI();
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });

  bindBus();
  bindTitleScreen();
  bindGlobalKeys();
  bindGameButtons();

  startLoading();
  requestAnimationFrame(loop);
}

function bindBus() {
  on('sfx', (name) => audio.play(name));
  on('toast', (msg) => ui.toast(msg));
  on('save', () => saveRun());
  on('playerDied', () => ui.showDeath(() => respawnPlayer()));
  on('respawned', () => {
    ui.hideDeath();
    saveRun();
  });
}

// ===================== 素材加载 =====================
function startLoading() {
  assetsReady = false;
  $('loading').classList.remove('hidden');
  $('load-error').classList.add('hidden');
  $('btn-continue').disabled = true;
  $('btn-new').disabled = true;
  loadAssets((ratio) => {
    $('load-fill').style.width = `${Math.round(ratio * 100)}%`;
    $('load-text').textContent = `${Math.round(ratio * 100)}%`;
  }).then((failedCount) => {
    $('loading').classList.add('hidden');
    if (failedCount > 0) {
      // 缺图可重试的错误态（P2-14），正式包不回退到代码绘制
      $('load-error').classList.remove('hidden');
      return;
    }
    $('load-error').classList.add('hidden');
    assetsReady = true;
    refreshTitle();
  });
}

// ===================== 标题画面 =====================
function refreshTitle() {
  const has = hasSave();
  // 无 v2 存档时隐藏「继续旅程」（P1-13）
  $('btn-continue').classList.toggle('hidden', !has);
  $('btn-continue').disabled = !assetsReady;
  $('btn-new').disabled = !assetsReady;
}

function bindTitleScreen() {
  $('btn-continue').addEventListener('click', () => {
    if (game.scene === 'playing') return;
    const run = loadSave();
    if (!run) {
      ui.toast('没有找到存档，先开始新的冒险吧。');
      return;
    }
    startRun(run);
  });
  $('btn-new').addEventListener('click', () => {
    if (game.scene === 'playing') return;
    if (hasSave()) {
      $('confirm-new').classList.remove('hidden');
      ui.syncScrim();
    } else {
      startNewRun();
    }
  });
  $('btn-confirm-new').addEventListener('click', () => {
    $('confirm-new').classList.add('hidden');
    ui.syncScrim();
    startNewRun();
  });
  $('btn-cancel-new').addEventListener('click', () => {
    $('confirm-new').classList.add('hidden');
    ui.syncScrim();
  });
  $('btn-retry').addEventListener('click', () => startLoading());
}

// 全局按键（UI 层面）
function bindGlobalKeys() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') {
      toggleMute();
      return;
    }
    if (game.scene !== 'playing') return;
    const inp = game.input;
    if (game.dialogue) {
      if (inp.tapped('interact') || inp.tapped('attack') || inp.tapped('jump')) {
        e.preventDefault();
        ui.advanceDialogue();
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
  });
}

// 游戏内按钮
function bindGameButtons() {
  $('btn-pause').addEventListener('click', () => {
    if (game.scene !== 'playing') return;
    if (game.dialogue || game.shopOpen || game.invOpen || game.victoryShown) return;
    if (game.paused) resumeGame();
    else pauseGame();
  });
  $('btn-bag').addEventListener('click', () => {
    if (game.scene !== 'playing' || game.dialogue || game.shopOpen || game.paused) return;
    ui.toggleInventory();
  });
  $('btn-mute').addEventListener('click', () => toggleMute());
  $('shop-close').addEventListener('click', () => ui.closeShop());
  $('inv-close').addEventListener('click', () => ui.toggleInventory(false));
  $('dialogue').addEventListener('click', () => {
    if (game.dialogue) {
      ui.advanceDialogue();
      game.input.endStep();
    }
  });
  $('levelup-close').addEventListener('click', () => ui.hideLevelUp());

  // 鼠标点击技能栏也能放技能 / 喝药
  const clickSlot = (id, action) => {
    $(id).addEventListener('click', () => {
      if (game.scene !== 'playing' || uiLocked()) return;
      game.input.press(action);
      game.input.release(action);
    });
  };
  clickSlot('slot-s1', 'skill1');
  clickSlot('slot-s2', 'skill2');
  clickSlot('slot-php', 'potionSmart');
  clickSlot('slot-pmp', 'potionMp');
}

function toggleMute() {
  audio.setMuted(!audio.isMuted());
  writeMuted(audio.isMuted());
  syncMuteUI();
  ui.toast(audio.isMuted() ? '声音已关闭' : '声音已开启');
}

function syncMuteUI() {
  const muted = audio.isMuted();
  const btn = $('btn-mute');
  btn.classList.toggle('muted', muted);
  btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  btn.setAttribute('aria-label', muted ? '声音关' : '声音开');
  $('btn-mute-pause').textContent = muted ? '声音：关' : '声音：开';
}

// ===================== 场景 =====================
function startNewRun() {
  const p = createPlayer(560, 560);
  game.player = p;
  enterPlay();
  loadMap('town', 560, 560);
  game.greet = 480; // 开场引导约 8 秒，只在露水镇
  saveRun();
  ui.toast('欢迎来到翠谷！先和镇上的铃兰聊聊吧。', 'info', 1200);
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
  ui.toast(`欢迎回来，Lv.${p.stats.level} 的冒险者！`, 'info', 1200);
}

function enterPlay() {
  game.scene = 'playing';
  game.paused = false;
  game.dialogue = null;
  game.shopOpen = false;
  game.invOpen = false;
  game.victoryShown = false;
  game.levelUpOpen = false;
  $('title-card').classList.add('hidden');
  showHud(true);
  applyTouchState();
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
  game.paused = false;
  ui.hidePause();
  game.scene = 'title';
  game.player = null;
  showHud(false);
  $('title-card').classList.remove('hidden');
  refreshTitle();
  applyTouchState();
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

  if (game.greet > 0) game.greet--;

  // Boss 击杀 → 胜利结算卡
  if (game.bossJustDied) {
    game.bossJustDied = false;
    ui.showVictory(() => {
      saveRun();
      ui.toast('巨像倒下了，翠谷恢复了宁静。洞穴里也许还有露珠可捡。');
    });
  }

  // 升级卡（P1-04）
  if (game.pendingLevelUps > 0) {
    const p = game.player;
    game.pendingLevelUps = 0;
    ui.showLevelUp(p.stats);
    emit('sfx', 'levelup');
    spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 18, ['#ffe066', '#fff3c4', '#8fe388'], { lift: 2, gravity: -0.01 });
    saveRun();
  }

  if (!uiLocked()) {
    updatePlayer();
    updateMonsters();
    updateWorld();
    handleInteract();
    if (++autosaveTimer >= 1800) {
      autosaveTimer = 0;
      saveRun();
    }
  } else {
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
      if (Math.abs(p.x + p.w / 2 - npc.x) < 64) {
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

  // 开场引导（只在露水镇，切图已清空 greet）
  if (game.greet > 0 && !target) {
    ui.interactHint(isTouchMode()
      ? '往右走，光门通往翠叶林地（点「互动」进入）'
      : '往右走，光门通往翠叶林地（按 Enter 进入）');
    return;
  }
  ui.interactHint(target ? hintFor(target) : null);

  if (target && game.input.tapped('interact')) {
    doInteract(target);
  }
}

function hintFor(t) {
  const touch = isTouchMode();
  switch (t.kind) {
    case 'portal': return touch ? `点「互动」前往「${t.data.label}」` : `按 Enter 前往「${t.data.label}」`;
    case 'npc': return touch ? `点「互动」和${t.data.name}交谈` : `按 Enter 和${t.data.name}交谈`;
    case 'sign': return touch ? '点「互动」阅读告示' : '按 Enter 阅读告示';
    case 'crystal': return touch ? '点「互动」记录旅途（存档）' : '按 Enter 记录旅途（存档）';
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
      const lines = npc.shop && p.bossDefeated ? POST_BOSS_LINES : npc.lines;
      ui.showDialogue(npc.name, lines, {
        portrait: true,
        onEnd: () => {
          if (npc.shop) {
            // R-07：对白结束后先问「看看货」，不直接开店
            ui.showChoice('铃兰', '要来点补给吗？', [
              { label: '看看货', primary: true, onClick: () => ui.openShop() },
              { label: '下次再说', onClick: () => {} },
            ]);
          }
        },
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

function fadeOutIn(mid) {
  const fade = $('fade');
  fade.classList.add('on');
  setTimeout(() => {
    mid();
    setTimeout(() => fade.classList.remove('on'), 120);
  }, 180);
}

// ===================== 渲染 =====================
function render() {
  ctx.setTransform(backing, 0, 0, backing, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  if (!game.map || !game.player) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#9ED8F5');
    g.addColorStop(1, '#EAF6E0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return;
  }

  // 视差背景（屏幕空间）
  drawBackground(ctx, game.map, game.cam);

  // 世界（平移后）
  ctx.save();
  // R-15: shake stays off (no camera shake offset)
  ctx.translate(-Math.round(game.cam.x), -Math.round(game.cam.y));
  drawMap(ctx, game.frame);
  drawDrops(ctx, game.frame);
  for (const m of game.monsters) drawMonster(ctx, m, game.frame);
  drawPlayer(ctx, game.player, game.frame);
  drawProjectiles(ctx, game.frame);
  drawParticles(ctx);
  drawDmgNums(ctx);
  drawCaveLight(ctx);
  ctx.restore();

  // Boss 条（屏幕空间，顶部居中）
  drawBossBar(ctx, bossCompact);
  // R-16：有 Boss 条时把 toast 放到条下方，避免挡住名牌和数字
  syncBossToasts(bossCompact);

  updateHud();
  ui.syncScrim();
}


function syncBossToasts(compact) {
  const box = $('toasts');
  if (!box) return;
  const hasBoss = !!livingBoss();
  document.body.classList.toggle('boss-bar', hasBoss);
  if (!hasBoss) {
    box.style.top = '';
    return;
  }
  const scale = curStageH / VIEW_H;
  const barBottom = (compact ? BOSS_BAR_Y_COMPACT : BOSS_BAR_Y) + BOSS_BAR_H;
  box.style.top = `${Math.round(barBottom * scale + 8)}px`;
}

// ===================== 响应式（设计系统 §9） =====================
function resize() {
  const hasTouch = detectTouch();
  document.body.classList.toggle('touch', hasTouch);
  const layout = computeLayout(window.innerWidth, window.innerHeight, hasTouch);
  curTouchH = layout.touchH;
  curStageH = layout.stageH;

  const stage = $('stage');
  stage.style.width = `${layout.stageW}px`;
  stage.style.height = `${layout.stageH}px`;

  const dpr = window.devicePixelRatio || 1;
  backing = Math.max(2, Math.min(4, Math.ceil(dpr)));
  canvas.width = Math.round(VIEW_W * backing);
  canvas.height = Math.round(VIEW_H * backing);

  // 触控键布局：单行 / 网格（R-01/R-02/R-06/R-10）
  const touch = computeTouchLayout(window.innerWidth, window.innerHeight, layout);
  document.documentElement.style.setProperty('--tkey', `${touch.key}px`);
  document.body.classList.toggle('touch-row', hasTouch && touch.mode === 'row');
  document.body.classList.toggle('touch-grid', hasTouch && touch.mode === 'grid');
  // 窄舞台启用紧凑 HUD（R-03）
  document.body.classList.toggle('hud-compact', layout.stageW <= HUD_COMPACT_MAX_STAGE_W);
  // 窄横屏缩短 Boss 条，避开右上三钮（R-04）
  bossCompact = layout.stageW < BOSS_COMPACT_MAX_STAGE_W || layout.stageH < BOSS_COMPACT_MAX_STAGE_H;
  document.body.classList.toggle('side-touch', layout.sideTouch);
  document.body.classList.toggle('stage-scroll', layout.scroll);
  applyTouchState();
}

function applyTouchState() {
  const hasTouch = detectTouch();
  const visible = hasTouch && game.scene === 'playing';
  document.body.classList.toggle('playing', game.scene === 'playing');
  const touchEl = $('touch');
  touchEl.style.height = visible ? `${curTouchH}px` : '0px';
  document.documentElement.style.setProperty('--touch-h', visible ? `${curTouchH}px` : '0px');
}

window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  if (game.scene === 'playing') saveRun();
});

boot();
