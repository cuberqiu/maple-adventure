// 轻量事件总线：逻辑层发事件（音效/提示/存档），表现层订阅。
// 这样逻辑模块不需要依赖 DOM / 音频。
const listeners = new Map();

export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
}

export function off(name, fn) {
  listeners.get(name)?.delete(fn);
}

export function emit(name, data) {
  const set = listeners.get(name);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(data);
    } catch (err) {
      console.error(`[bus] ${name} 处理出错:`, err);
    }
  }
}
