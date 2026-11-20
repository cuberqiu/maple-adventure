// 手机触控：左下虚拟方向键 + 右下动作按钮（半透明，不遮战斗区域）
// 仅在支持触摸的设备上显示。

export function setupTouch(input) {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return;

  const root = document.getElementById('touch');
  root.classList.remove('hidden');

  // 左下方向键：左右 + 上下（攀爬用）
  const dpad = document.createElement('div');
  dpad.className = 'dpad';
  const padBtn = (label, action, cls = '') => {
    const b = document.createElement('button');
    b.className = `tbtn pad ${cls}`;
    b.textContent = label;
    b.setAttribute('aria-label', action);
    bind(b, action);
    return b;
  };
  dpad.append(
    padBtn('▲', 'up', 'up'),
    padBtn('◀', 'left', 'left'),
    padBtn('▶', 'right', 'right'),
    padBtn('▼', 'down', 'down'),
  );
  root.appendChild(dpad);

  // 右下动作按钮
  const acts = document.createElement('div');
  acts.className = 'actions';
  const actBtn = (label, action, cls = '') => {
    const b = document.createElement('button');
    b.className = `tbtn act ${cls}`;
    b.textContent = label;
    b.setAttribute('aria-label', action);
    bind(b, action);
    return b;
  };
  acts.append(
    actBtn('话', 'interact', 'small'),
    actBtn('药', 'potionSmart', 'small'),
    actBtn('技2', 'skill2'),
    actBtn('技1', 'skill1'),
    actBtn('击', 'attack', 'big'),
    actBtn('跳', 'jump', 'big'),
  );
  root.appendChild(acts);

  function bind(el, action) {
    const down = (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      input.press(action);
      el.classList.add('active');
    };
    const up = (e) => {
      e.preventDefault();
      input.release(action);
      el.classList.remove('active');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    // 阻止长按菜单 / 双击缩放
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.style.touchAction = 'none';
    el.style.userSelect = 'none';
  }
}
