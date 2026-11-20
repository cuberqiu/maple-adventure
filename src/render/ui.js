// DOM 面板：对话 / 商店 / 背包 / 提示 / 升级横幅 / 死亡与胜利结算 / 交互提示
import { game } from '../game/state.js';
import { buyItem, usePotion, countItem, ITEM_DEFS, HP_POTION, MP_POTION } from '../logic/inventory.js';
import { emit } from '../core/bus.js';

const $ = (id) => document.getElementById(id);

// ---------- 提示气泡 ----------
export function toast(msg, type = 'info') {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  }, 2100);
}

// ---------- 交互提示（按 Enter…）----------
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
export function showDialogue(speaker, lines, onEnd = null) {
  game.dialogue = { speaker, lines: [...lines], index: 0, onEnd };
  $('dialogue-name').textContent = speaker;
  $('dialogue-text').textContent = game.dialogue.lines[0] || '……';
  $('dialogue').classList.remove('hidden');
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
  if (d?.onEnd) d.onEnd();
}

// ---------- 商店 ----------
export function openShop() {
  game.shopOpen = true;
  renderShop();
  $('shop-panel').classList.remove('hidden');
}

export function closeShop() {
  game.shopOpen = false;
  $('shop-panel').classList.add('hidden');
}

function renderShop() {
  const p = game.player;
  $('shop-coins').textContent = p.inv.coins;
  const list = $('shop-list');
  list.innerHTML = '';
  for (const id of [HP_POTION, MP_POTION]) {
    const def = ITEM_DEFS[id];
    const row = document.createElement('div');
    row.className = 'shop-row';
    const info = document.createElement('div');
    info.innerHTML = `<b>${def.name}</b><span class="shop-desc">${def.desc}</span>`;
    const price = document.createElement('span');
    price.className = 'shop-price';
    price.textContent = `${def.price} 露珠`;
    const buy = document.createElement('button');
    buy.className = 'btn small';
    buy.textContent = '买一瓶';
    buy.onclick = () => {
      const res = buyItem(p.inv, id, 1);
      toast(res.message, res.ok ? 'good' : 'bad');
      emit('sfx', res.ok ? 'buy' : 'hurt');
      if (res.ok) emit('save');
      renderShop();
    };
    row.append(info, price, buy);
    list.appendChild(row);
  }
}

// ---------- 背包 ----------
export function toggleInventory(force = null) {
  const target = force ?? !game.invOpen;
  game.invOpen = target;
  if (target) renderInventory();
  $('inv-panel').classList.toggle('hidden', !target);
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
    const row = document.createElement('div');
    row.className = 'shop-row';
    const info = document.createElement('div');
    info.innerHTML = `<b>${def.name}</b><span class="shop-desc">${def.desc}</span>`;
    const count = document.createElement('span');
    count.className = 'shop-price';
    count.textContent = `×${n} / ${def.maxStack}`;
    const use = document.createElement('button');
    use.className = 'btn small';
    use.textContent = '使用';
    use.disabled = n <= 0;
    use.onclick = () => {
      const res = usePotion(p.inv, id, p.stats);
      toast(res.message, res.ok ? 'good' : 'bad');
      if (res.ok) emit('sfx', 'potion');
      renderInventory();
    };
    row.append(info, count, use);
    list.appendChild(row);
  }
  // 一行技能说明
  const tip = document.createElement('div');
  tip.className = 'inv-tip';
  tip.textContent = '技能：翠风斩（12 MP·3秒冷却）｜晨露祝福（20 MP·10秒冷却，回复40%生命）';
  list.appendChild(tip);
}

// ---------- 升级横幅 ----------
export function showLevelUp(level) {
  const el = $('levelup-banner');
  el.querySelector('.lv-num').textContent = level;
  el.classList.remove('hidden');
  el.classList.remove('pop');
  void el.offsetWidth; // 重置动画
  el.classList.add('pop');
  setTimeout(() => el.classList.add('hidden'), 2200);
}

// ---------- 死亡 / 胜利 ----------
export function showDeath() {
  $('death-overlay').classList.remove('hidden');
}

export function hideDeath() {
  $('death-overlay').classList.add('hidden');
}

export function showVictory(onContinue) {
  game.victoryShown = true;
  const el = $('victory-overlay');
  el.classList.remove('hidden');
  $('victory-continue').onclick = () => {
    el.classList.add('hidden');
    game.victoryShown = false;
    onContinue?.();
  };
}

// ---------- 暂停 ----------
export function showPause(onResume, onQuit, muted, onToggleMute) {
  $('pause-panel').classList.remove('hidden');
  $('btn-resume').onclick = onResume;
  $('btn-quit').onclick = onQuit;
  const muteBtn = $('btn-mute-pause');
  muteBtn.textContent = muted ? '音效：关（按 M 开）' : '音效：开（按 M 关）';
  muteBtn.onclick = onToggleMute;
}

export function hidePause() {
  $('pause-panel').classList.add('hidden');
}
