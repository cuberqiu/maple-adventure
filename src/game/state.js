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

// 平滑镜头（R-15，参考 q-style-reskin commit 80ad761 的 camState）：
// - 横向缓动跟随，并带面向预瞄
// - 纵向只在落地 / 攀爬时更新目标；或角色在画面中的位置超出 15%–85% 时才更新
// - Y 平滑系数 0.08，X 平滑系数 0.15
// - 立定跳跃过程中画面 Y 保持不动，避免整屏跟着上下晃
// - 屏幕震动保持关闭（绘制侧不加 shake）
const CAM_LOOK = 36;
const CAM_LOOK_FOLLOW = 0.06;
const CAM_X_FOLLOW = 0.15;
const CAM_Y_FOLLOW = 0.08;
// 落地时把角色放在画面约 64% 处，使 JUMP_V=-12 的立定跳顶点仍落在 15%–85% 死区内
const CAM_REST_FRAC = 0.64;
const CAM_CATCH_FRAC = 0.5;
const CAM_DEAD_LO = 0.15;
const CAM_DEAD_HI = 0.85;
const CAM_SNAP_EPS = 0.3;

const camState = { x: null, y: null, targetY: null, mapId: null, look: 0 };

export function resetCamera() {
  camState.x = null;
  camState.y = null;
  camState.targetY = null;
  camState.mapId = null;
  camState.look = 0;
}

/**
 * 纯镜头计算，便于单测。首次或切图时立即对齐；之后按 camState 平滑。
 * @returns {{x:number,y:number}} 像素对齐后的镜头左上角
 */
export function computeCamera(player, map) {
  const maxX = Math.max(0, map.width - VIEW_W);
  const maxY = Math.max(0, map.height - VIEW_H);
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const mapKey = map.id || map.name || map;
  const facing = player.facing || 1;
  if (camState.mapId !== mapKey || camState.x === null) {
    camState.mapId = mapKey;
    camState.look = facing * CAM_LOOK;
    camState.x = clamp(cx + camState.look - VIEW_W * 0.5, 0, maxX);
    camState.y = camState.targetY = clamp(cy - VIEW_H * CAM_REST_FRAC, 0, maxY);
    return { x: Math.round(camState.x), y: Math.round(camState.y) };
  }
  camState.look += (facing * CAM_LOOK - camState.look) * CAM_LOOK_FOLLOW;
  const tx = clamp(cx + camState.look - VIEW_W * 0.5, 0, maxX);
  camState.x += (tx - camState.x) * CAM_X_FOLLOW;
  if (Math.abs(tx - camState.x) < CAM_SNAP_EPS) camState.x = tx;

  const screenY = cy - camState.y;
  if (player.onGround || player.climbing) {
    camState.targetY = clamp(cy - VIEW_H * CAM_REST_FRAC, 0, maxY);
  } else if (screenY < VIEW_H * CAM_DEAD_LO || screenY > VIEW_H * CAM_DEAD_HI) {
    camState.targetY = clamp(cy - VIEW_H * CAM_CATCH_FRAC, 0, maxY);
  }
  camState.y += (camState.targetY - camState.y) * CAM_Y_FOLLOW;
  if (Math.abs(camState.targetY - camState.y) < CAM_SNAP_EPS) camState.y = camState.targetY;
  return { x: Math.round(camState.x), y: Math.round(camState.y) };
}

export function centerCam() {
  const p = game.player;
  if (!p || !game.map) return;
  const cam = computeCamera(p, game.map);
  game.cam.x = cam.x;
  game.cam.y = cam.y;
}

function snapCamera() {
  resetCamera();
  centerCam();
}

// 是否有 UI 挡住 gameplay（对话 / 商店 / 背包 / 暂停 / 胜利结算 / 升级卡 / 选择卡）
export function uiLocked() {
  return (
    game.paused || !!game.dialogue || game.shopOpen || game.invOpen ||
    game.choiceOpen || game.victoryShown || game.levelUpOpen
  );
}
