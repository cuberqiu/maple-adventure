// localStorage 存档封装（仅浏览器使用；序列化逻辑在 logic/save.js，Node 可测）
import { SAVE_KEY, MUTED_KEY, serializeRun, deserializeRun } from '../logic/save.js';

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return deserializeRun(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeSave(run) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializeRun(run)));
    return true;
  } catch {
    return false;
  }
}

export function loadMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMuted(v) {
  try {
    localStorage.setItem(MUTED_KEY, v ? '1' : '0');
  } catch {
    /* 忽略 */
  }
}
