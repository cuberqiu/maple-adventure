// 通用小工具
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function randInt(min, max, rng = Math.random) {
  return min + Math.floor(rng() * (max - min + 1));
}

// 递减一个计时器字段，最低到 0
export function dec(obj, key, n = 1) {
  if (obj[key] > 0) obj[key] = Math.max(0, obj[key] - n);
  return obj[key];
}
