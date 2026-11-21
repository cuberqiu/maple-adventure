// DOM 面板：对话 / 商店 / 背包 / 升级卡 / 死亡与胜利结算 / 暂停 / 提示 / 模态遮罩。
import { game } from '../game/state.js';
import { buyItem, usePotion, countItem, ITEM_DEFS, HP_POTION, MP_POTION } from '../logic/inventory.js';
import { MONSTER_DEFS } from '../data/monsters.js';
import { emit } from '../core/bus.js';

const $ = (id) => document.getElementById(id);

// ---------- 模态遮罩 ----------
// 打开面板时 40–50% 奶油墨遮罩（P1-01），并挡住技能钮点击。
export function syncScrim() {
  const on =
    game.shopOpen || game.invOpen || game.paused || !!game.dialogue ||
    game.choiceOpen || game.levelUpOpen || game.victoryShown || !!game.player?.dead;
  $('scrim').classList.toggle('show', on);
  // 模态打开时隐藏舞台内的互动提示（R-13）
  if (on) interactHint(null);
}

// ---------- 提示气泡 ----------
export function toast(msg, type = 'info', duration = 2100) {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  }, duration);
}

// ---------- 交互提示 ----------
export function interactHint(text) {
  const el = $('interact-hint');
  if (!text) {
    el.classList.add('hidden');
    return;
  }
  el.textContent = text;
  el.classList.remove('hidden');
}

// ---------- 对话 ----------
export function showDialogue(speaker, lines, opts = {}) {
  game.dialogue = { speaker, lines: [...lines], index: 0, onEnd: opts.onEnd || null };
  $('dialogue-name').textContent = speaker;
  $('dialogue').classList.toggle('no-portrait', !opts.portrait);
  $('dialogue-text').textContent = game.dialogue.lines[0] || '……';
  $('dialogue').classList.remove('hidden');
  syncScrim();
  emit('sfx', 'pickup');
}

export function advanceDialogue() {
  const d = game.dialogue;
  if (!d) return;
  d.index++;
  if (d.index < d.lines.length) {
    $('dialogue-text').textContent = d.lines[d.index];
  } else {
    closeDialogue();
  }
}

export function closeDialogue() {
  const d = game.dialogue;
  game.dialogue = null;
  $('dialogue').classList.add('hidden');
  syncScrim();
  if (d?.onEnd) d.onEnd();
}

// ---------- 对话后的选择卡（R-07：铃兰先问「看看货」再开店） ----------
export function showChoice(title, text, choices) {
  game.choiceOpen = true;
  $('choice-name').textContent = title;
  $('choice-text').textContent = text;
  const box = $('choice-actions');
  box.innerHTML = '';
  for (const c of choices) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = c.primary ? 'primary' : 'secondary';
    b.textContent = c.label;
    b.addEventListener('click', () => {
      hideChoice();
      c.onClick?.();
    });
    box.appendChild(b);
  }
  $('choice').classList.remove('hidden');
  syncScrim();
}

export function hideChoice() {
  game.choiceOpen = false;
  $('choice').classList.add('hidden');
  syncScrim();
}

// ---------- 商店 ----------
export function openShop() {
  game.shopOpen = true;
  renderShop();
  $('shop').classList.remove('hidden');
  syncScrim();
}

export function closeShop() {
  game.shopOpen = false;
  $('shop').classList.add('hidden');
  syncScrim();
}

function renderShop() {
  const p = game.player;
  $('shop-coins').textContent = p.inv.coins;
  const list = $('shop-list');
  list.innerHTML = '';
  for (const id of [HP_POTION, MP_POTION]) {
    const def = ITEM_DEFS[id];
    const li = document.createElement('li');
    const icon = document.createElement('span');
    icon.className = `item-icon ${def.kind}`;
    const info = document.createElement('div');
    info.className = 'info';
    const name = document.createElement('strong');
    name.textContent = def.name;
    const desc = document.createElement('em');
    desc.textContent = def.desc;
    info.append(name, desc);
    const price = document.createElement('span');
    price.className = 'price';
    const coin = document.createElement('span');
    coin.className = 'coin-icon';
    price.append(coin, document.createTextNode(String(def.price)));
    const buy = document.createElement('button');
    buy.type = 'button';
    buy.className = 'primary buy';
    // R-08：露珠不足或背包满时禁用按钮，并给出对应文案
    const affordable = p.inv.coins >= def.price;
    const full = countItem(p.inv, id) >= def.maxStack;
    buy.textContent = !affordable ? '露珠不足' : full ? '已装满' : '买一瓶';
    buy.disabled = !affordable || full;
    buy.addEventListener('click', () => {
      const res = buyItem(p.inv, id, 1);
      toast(res.message, res.ok ? 'good' : 'bad');
      emit('sfx', res.ok ? 'buy' : 'hurt');
      if (res.ok) emit('save');
      renderShop();
    });
    li.append(icon, info, price, buy);
    list.appendChild(li);
  }
}

// ---------- 背包 ----------
export function toggleInventory(force = null) {
  const target = force ?? !game.invOpen;
  game.invOpen = target;
  if (target) renderInventory();
  $('inv').classList.toggle('hidden', !target);
  syncScrim();
}

function renderInventory() {
  const p = game.player;
  if (!p) return;
  $('inv-coins').textContent = p.inv.coins;
  const list = $('inv-list');
  list.innerHTML = '';
  for (const id of [HP_POTION, MP_POTION]) {
    const def = ITEM_DEFS[id];
    const n = countItem(p.inv, id);
    // R-17：件数为 0 的物品行不渲染，只留空态句
    if (n <= 0) continue;
    const li = document.createElement('li');
    const icon = document.createElement('span');
    icon.className = `item-icon ${def.kind}`;
    const info = document.createElement('div');
    info.className = 'info';
    const name = document.createElement('strong');
    name.textContent = def.name;
    const desc = document.createElement('em');
    desc.textContent = `持有 ${n} / ${def.maxStack}`;
    info.append(name, desc);
    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'primary buy';
    use.textContent = '使用';
    use.disabled = n <= 0;
    use.addEventListener('click', () => {
      const res = usePotion(p.inv, id, p.stats);
      toast(res.message, res.ok ? 'good' : 'bad');
      if (res.ok) emit('sfx', 'potion');
      renderInventory();
    });
    li.append(icon, info, use);
    list.appendChild(li);
  }
  // R-08：背包 0 件时给一行空态提示
  const totalItems = countItem(p.inv, HP_POTION) + countItem(p.inv, MP_POTION);
  if (totalItems <= 0) {
    const empty = document.createElement('p');
    empty.className = 'inv-empty';
    empty.textContent = '背包空空如也，去商店补给或打怪捡一些吧。';
    list.appendChild(empty);
  }

  const tip = document.createElement('p');
  tip.className = 'inv-tip';
  tip.textContent = '技能：翠风斩（12 MP·3秒冷却）｜晨露祝福（20 MP·10秒冷却，回复 40% 生命）';
  list.appendChild(tip);
}

// ---------- 升级卡 ----------
export function showLevelUp(stats) {
  game.levelUpOpen = true;
  $('levelup-text').textContent =
    `等级 Lv.${stats.level}！生命上限 ${stats.maxHp} · 魔力上限 ${stats.maxMp} · 攻击 ${stats.atk}。状态已回满。`;
  $('levelup').classList.remove('hidden');
  syncScrim();
}

export function hideLevelUp() {
  game.levelUpOpen = false;
  $('levelup').classList.add('hidden');
  syncScrim();
}

// ---------- 死亡 / 胜利 ----------
export function showDeath(onWake) {
  $('dead').classList.remove('hidden');
  $('btn-wake').onclick = onWake;
}

export function hideDeath() {
  $('dead').classList.add('hidden');
}

export function showVictory(onContinue) {
  game.victoryShown = true;
  const boss = MONSTER_DEFS.boss;
  $('victory-text').textContent =
    `${boss.name}轰然倒下，幽苔洞窟恢复了宁静。掉落了大量露珠与药剂，经验 +${boss.exp}。`;
  $('victory').classList.remove('hidden');
  $('victory-continue').onclick = () => {
    $('victory').classList.add('hidden');
    game.victoryShown = false;
    syncScrim();
    onContinue?.();
  };
  syncScrim();
}

// ---------- 暂停 ----------
export function showPause(onResume, onQuit, muted, onToggleMute) {
  $('pause').classList.remove('hidden');
  $('btn-resume').onclick = onResume;
  $('btn-quit').onclick = onQuit;
  const muteBtn = $('btn-mute-pause');
  muteBtn.textContent = muted ? '声音：关' : '声音：开';
  muteBtn.onclick = onToggleMute;
  syncScrim();
}

export function hidePause() {
  $('pause').classList.add('hidden');
  syncScrim();
}
