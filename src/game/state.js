// 全局游戏状态 + 地图装载（单例 game 对象）
// 逻辑舞台固定 480×270（16:9），位图以平滑缩放贴入，世界坐标与逻辑画布 1:1。
import { MAPS } from '../data/maps.js';
import { createMonster } from '../logic/entities.js';
import { clamp } from '../logic/util.js';

export const VIEW_W = 480;
export const VIEW_H = 270;
export const STEP_MS = 1000 / 60; // 固定 60 步/秒

function freshState() {
  return {
    scene: 'title', // title | playing
    paused: false,
    mapId: null,
    map: null,
    world: null, // {solids, w, h}
    player: null,
    monsters: [],
    drops: [],
    projectiles: [],
    particles: [],
    dmgNums: [],
    cam: { x: 0, y: 0 },
    frame: 0,
    greet: 0, // 开场引导计时（切图时清零，避免镇上句残留在其它地图）
    interactTarget: null,
    dialogue: null, // {speaker, lines, index, onEnd}
    shopOpen: false,
    invOpen: false,
    choiceOpen: false, // 对话后的「看看货 / 下次再说」选择卡（R-07）
    victoryShown: false,
    levelUpOpen: false,
    bossJustDied: false,
    pendingLevelUps: 0,
    input: null,
  };
}

export const game = freshState();

// 把地图数据展开成物理世界（ground 实心、platform 单向）
export function buildWorld(map) {
  const solids = [
    ...map.ground.map((g) => ({ ...g, oneWay: false })),
    ...map.platforms.map((p) => ({ x: p.x, y: p.y, w: p.w, h: 14, oneWay: true })),
  ];
  return { solids, w: map.width, h: map.height };
}

/**
 * 切换地图：重建怪物（已击败的 Boss 不再出现）、清空掉落物与弹幕，
 * 并把玩家放到 (x, y)。
 */
export function loadMap(id, x, y) {
  const map = MAPS[id];
  if (!map) throw new Error(`未知地图: ${id}`);
  const p = game.player;
  game.mapId = id;
  game.map = map;
  game.world = buildWorld(map);
  game.monsters = map.spawns
    .filter((s) => !(s.type === 'boss' && p.bossDefeated))
    .map((s) => createMonster(s.type, s.x, s.y));
  game.drops = [];
  game.projectiles = [];
  game.particles = [];
  game.dmgNums = [];
  game.interactTarget = null;
  game.greet = 0; // 切图时清掉开场引导（P1-10 / P2-09）
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
  p.climbing = false;
  p.dropThrough = 0;
  snapCamera();
}

export function centerCam() {
  const p = game.player;
  if (!p || !game.map) return;
  const targetX = p.x + p.w / 2 - VIEW_W / 2;
  const targetY = p.y + p.h / 2 - VIEW_H / 2;
  game.cam.x = clamp(targetX, 0, game.map.width - VIEW_W);
  game.cam.y = clamp(targetY, 0, game.map.height - VIEW_H);
  // 像素对齐，避免平滑缩放下亚像素抖动
  game.cam.x = Math.round(game.cam.x);
  game.cam.y = Math.round(game.cam.y);
}

function snapCamera() {
  centerCam();
}

// 是否有 UI 挡住 gameplay（对话 / 商店 / 背包 / 暂停 / 胜利结算 / 升级卡 / 选择卡）
export function uiLocked() {
  return (
    game.paused || !!game.dialogue || game.shopOpen || game.invOpen ||
    game.choiceOpen || game.victoryShown || game.levelUpOpen
  );
}
