// 手机触控：左下 3×3 十字方向键 + 右下动作按钮（血药 / 蓝药 / 翠风 / 晨露 / 互动 / 跳 / 攻击）。
// 触控判定以 pointer:coarse 为主（P2-08），不因宽度 ≤900 就出虚拟键。
// 可见性由 CSS 控制（body.touch.playing 才显示，标题 / 帮助 / 确认时隐藏，P0-05）。

export function detectTouch() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
  return 'ontouchstart' in window && navigator.maxTouchPoints > 0;
}

export function setupTouch(input) {
  if (!detectTouch()) return;

  const root = document.getElementById('touch');
  root.classList.remove('hidden');

  // 左下方向键：3×3 十字（中间为空）
  const dpad = document.createElement('div');
  dpad.className = 'pad';
  const padBtn = (label, action, cls) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tbtn ${cls}`;
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
    b.type = 'button';
    b.className = `tbtn act ${cls}`;
    b.textContent = label;
    b.setAttribute('aria-label', label);
    bind(b, action);
    return b;
  };
  acts.append(
    actBtn('血药', 'potionSmart'),
    actBtn('蓝药', 'potionMp'),
    actBtn('翠风', 'skill1'),
    actBtn('晨露', 'skill2'),
    actBtn('互动', 'interact'),
    actBtn('跳', 'jump', 'big'),
    actBtn('攻击', 'attack', 'big'),
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
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.style.touchAction = 'none';
    el.style.userSelect = 'none';
  }
}
