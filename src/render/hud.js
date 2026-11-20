// HUD（DOM）：血条/蓝条/经验条、等级、露珠、技能栏冷却
import { game } from '../game/state.js';
import { SKILL_DEFS } from '../logic/skills.js';
import { countItem, HP_POTION, MP_POTION } from '../logic/inventory.js';
import { expToNext } from '../logic/leveling.js';

const $ = (id) => document.getElementById(id);
let refs = null;

function initRefs() {
  refs = {
    root: $('hud'),
    level: $('hud-level'),
    hpFill: $('hp-fill'), hpText: $('hp-text'),
    mpFill: $('mp-fill'), mpText: $('mp-text'),
    expFill: $('exp-fill'), expText: $('exp-text'),
    coins: $('hud-coins'),
    mapName: $('hud-map'),
    slotAttack: $('slot-attack'),
    slotS1: $('slot-s1'), slotS2: $('slot-s2'),
    slotPhp: $('slot-php'), slotPmp: $('slot-pmp'),
    phpCount: $('php-count'), pmpCount: $('pmp-count'),
  };
}

function setBar(fill, text, cur, max, label) {
  const pct = max > 0 ? Math.round((cur / max) * 100) : 0;
  fill.style.width = pct + '%';
  text.textContent = label ?? `${cur}/${max}`;
}

// 技能槽冷却遮罩 + 数字
function slotCd(slot, remain, total) {
  const cdEl = slot.querySelector('.cd');
  const numEl = slot.querySelector('.cd-num');
  if (remain > 0) {
    slot.classList.add('cooling');
    cdEl.style.height = Math.round((remain / total) * 100) + '%';
    numEl.textContent = Math.ceil(remain / 60);
  } else {
    slot.classList.remove('cooling');
    cdEl.style.height = '0%';
    numEl.textContent = '';
  }
}

export function showHud(show) {
  if (!refs) initRefs();
  refs.root.classList.toggle('hidden', !show);
}

export function updateHud() {
  if (!refs) initRefs();
  const p = game.player;
  if (!p) return;
  const s = p.stats;

  refs.level.textContent = s.level;
  setBar(refs.hpFill, refs.hpText, s.hp, s.maxHp);
  setBar(refs.mpFill, refs.mpText, s.mp, s.maxMp);
  const need = expToNext(s.level);
  setBar(refs.expFill, refs.expText, s.exp, need, need === Infinity ? 'MAX' : `${s.exp}/${need}`);
  refs.coins.textContent = p.inv.coins;
  refs.mapName.textContent = game.map ? game.map.name : '';

  slotCd(refs.slotS1, p.skillCds.galeSlash, SKILL_DEFS.galeSlash.cooldown);
  slotCd(refs.slotS2, p.skillCds.dewBless, SKILL_DEFS.dewBless.cooldown);
  slotCd(refs.slotAttack, Math.min(p.attackCd, 26), 26);

  const php = countItem(p.inv, HP_POTION);
  const pmp = countItem(p.inv, MP_POTION);
  refs.phpCount.textContent = php > 0 ? `×${php}` : '×0';
  refs.pmpCount.textContent = pmp > 0 ? `×${pmp}` : '×0';
  refs.slotPhp.classList.toggle('empty', php <= 0);
  refs.slotPmp.classList.toggle('empty', pmp <= 0);
}
