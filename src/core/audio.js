// Web Audio 合成音效：全部用振荡器/噪声现场生成，无外部音频文件。
// 音量整体很低（master 0.12），默认不刺耳；M 键或界面开关可静音。
let ctx = null;
let master = null;
let muted = false;

export function setMuted(v) {
  muted = !!v;
  if (master) master.gain.value = muted ? 0 : 0.12;
}

export function isMuted() {
  return muted;
}

// 浏览器要求首次用户手势后才能出声
export function unlock() {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.12;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone({ freq, to = null, dur = 0.1, type = 'sine', vol = 0.3, delay = 0 }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noise(dur = 0.08, vol = 0.25, delay = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(gain);
  gain.connect(master);
  src.start(t0);
}

const SFX = {
  jump: () => tone({ freq: 300, to: 540, dur: 0.12, type: 'square', vol: 0.16 }),
  swing: () => { noise(0.05, 0.14); tone({ freq: 220, to: 130, dur: 0.07, type: 'sawtooth', vol: 0.1 }); },
  hit: () => { tone({ freq: 170, to: 90, dur: 0.09, type: 'square', vol: 0.2 }); noise(0.05, 0.16); },
  hurt: () => tone({ freq: 150, to: 70, dur: 0.2, type: 'sawtooth', vol: 0.2 }),
  kill: () => { tone({ freq: 400, to: 120, dur: 0.22, type: 'triangle', vol: 0.22 }); noise(0.12, 0.12); },
  coin: () => { tone({ freq: 900, dur: 0.06, type: 'sine', vol: 0.18 }); tone({ freq: 1250, dur: 0.09, type: 'sine', vol: 0.16, delay: 0.05 }); },
  pickup: () => tone({ freq: 640, to: 980, dur: 0.1, type: 'sine', vol: 0.2 }),
  potion: () => tone({ freq: 520, to: 880, dur: 0.14, type: 'sine', vol: 0.2 }),
  gale: () => { noise(0.16, 0.18); tone({ freq: 700, to: 300, dur: 0.18, type: 'sine', vol: 0.16 }); },
  heal: () => { tone({ freq: 660, dur: 0.1, type: 'sine', vol: 0.18 }); tone({ freq: 880, dur: 0.14, type: 'sine', vol: 0.18, delay: 0.09 }); },
  levelup: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.14, type: 'triangle', vol: 0.2, delay: i * 0.09 }));
  },
  buy: () => { tone({ freq: 600, dur: 0.07, type: 'sine', vol: 0.18 }); tone({ freq: 800, dur: 0.1, type: 'sine', vol: 0.18, delay: 0.07 }); },
  portal: () => tone({ freq: 380, to: 820, dur: 0.25, type: 'sine', vol: 0.18 }),
  die: () => tone({ freq: 220, to: 50, dur: 0.5, type: 'sawtooth', vol: 0.2 }),
  victory: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'triangle', vol: 0.2, delay: i * 0.12 }));
  },
  roar: () => tone({ freq: 90, to: 45, dur: 0.5, type: 'sawtooth', vol: 0.24 }),
};

export function play(name) {
  if (muted || !ctx) return;
  (SFX[name] || (() => {}))();
}
