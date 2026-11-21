// 减动效偏好（R-14 / P2-12）：尊重系统 prefers-reduced-motion。
// 用于减弱画布侧动效（飘字上浮、传送门/水晶脉冲），CSS 侧见 style.css 的媒体查询。
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
