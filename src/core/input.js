// 输入抽象：键盘 + 触控虚拟按键统一成“动作”
// down(action)=按住；tapped(action)=本帧刚按下（每个固定步长消费一次）

export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
  }
  press(action) {
    if (!this.held.has(action)) {
      this.held.add(action);
      this.pressed.add(action);
    }
  }
  release(action) {
    this.held.delete(action);
  }
  down(action) {
    return this.held.has(action);
  }
  tapped(action) {
    return this.pressed.has(action);
  }
  endStep() {
    this.pressed.clear();
  }
}

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyK: 'jump',
  KeyJ: 'attack', KeyZ: 'attack',
  Digit1: 'skill1', KeyU: 'skill1',
  Digit2: 'skill2', KeyI: 'skill2',
  KeyH: 'potionSmart', Digit3: 'potionSmart',
  KeyG: 'potionMp', Digit4: 'potionMp',
  Enter: 'interact',
  Tab: 'inventory', KeyB: 'inventory',
  Escape: 'pause', KeyP: 'pause',
  KeyM: 'mute',
};

// 需要阻止默认滚动的按键
const PREVENT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab']);

export function createKeyboardInput(win = window) {
  const input = new Input();
  win.addEventListener('keydown', (e) => {
    if (e.repeat) {
      if (PREVENT.has(e.code)) e.preventDefault();
      return;
    }
    const action = KEYMAP[e.code];
    if (PREVENT.has(e.code)) e.preventDefault();
    if (action) input.press(action);
  });
  win.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) input.release(action);
  });
  win.addEventListener('blur', () => {
    input.held.clear();
    input.pressed.clear();
  });
  return input;
}
