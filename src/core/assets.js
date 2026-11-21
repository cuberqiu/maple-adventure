// 图片加载器：按清单预加载 assets/ 下的全部位图。
// 正式包缺图视为错误（getImage 返回 null，渲染层跳过，但主流程会停在可重试的错误态，
// 不再长期回退到代码绘制）。
// 路径相对仓库根目录（index.html 同源）。

function buildManifest() {
  const m = {};
  const group = (prefix, dir, names, ext = 'png') => {
    for (const name of names) m[`${prefix}/${name}`] = `assets/${dir}/${name}.${ext}`;
  };

  group('hero', 'sprites/hero', ['idle', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'jump', 'attack', 'cast', 'climb', 'hurt']);
  group('golem', 'sprites/golem', ['idle', 'move', 'attack']);
  group('bramble', 'sprites/bramble', ['idle', 'jump', 'roll']);
  group('moth', 'sprites/moth', ['fly1', 'fly2']);
  group('boss', 'sprites/boss', ['idle', 'charge', 'fog', 'slam']);
  group('npc', 'sprites/npc', ['linglan', 'linglan_wave']);
  group('items', 'sprites/items', ['dew', 'potion_red', 'potion_blue']);
  // seed_bullet.png 为「预留/未使用」资源（晨露祝福走粒子），不参与预加载（R-12）。
  group('fx', 'sprites/fx', ['leaf_slash', 'fog_puff', 'portal']);

  for (const theme of ['town', 'wild', 'cave']) {
    m[`bg/${theme}_far`] = `assets/bg/${theme}_far.jpg`;
    m[`bg/${theme}_mid`] = `assets/bg/${theme}_mid.png`;
    m[`bg/${theme}_near`] = `assets/bg/${theme}_near.png`;
  }

  group('tiles', 'tiles', [
    'ground_town', 'ground_wild', 'ground_cave',
    'platform_town', 'platform_wild', 'platform_cave',
  ]);

  const decor = {
    town: ['house', 'tree', 'stall', 'lamppost'],
    wild: ['bush', 'mushroom', 'rock', 'flower'],
    cave: ['crystal', 'root', 'glowcap', 'stalagmite'],
  };
  for (const [theme, kinds] of Object.entries(decor)) {
    for (const kind of kinds) m[`decor/${theme}/${kind}`] = `assets/decor/${theme}/${kind}.png`;
  }

  group('ui', 'ui', [
    'icon_heart', 'icon_drop', 'icon_level_badge',
    'btn_pause', 'btn_sound', 'icon_bag',
    'btn_skill_spin', 'btn_skill_shot', 'btn_potion_hp', 'btn_potion_mp',
  ]);

  return m;
}

const MANIFEST = buildManifest();
const cache = new Map();      // key -> Image（加载中或已就绪）
const failed = new Set();     // key -> 加载失败

export function totalAssets() {
  return Object.keys(MANIFEST).length;
}

export function getImage(key) {
  const image = cache.get(key);
  if (!image) return null;
  if (!image.complete || image.naturalWidth === 0) return null;
  return image;
}

// 加载失败的资源 key（供错误态 / 重试使用）
export function failedAssets() {
  return [...failed];
}

/**
 * 预加载全部图片（失败键会在后续调用中重试）。
 * onProgress(0..1) 逐张回调；resolve(失败数)。
 */
export function loadAssets(onProgress) {
  return new Promise((resolve) => {
    const all = Object.keys(MANIFEST);
    const pending = all.filter((key) => !getImage(key));
    if (pending.length === 0) {
      if (onProgress) onProgress(1);
      resolve(failed.size);
      return;
    }
    let done = 0;
    const finish = () => {
      done += 1;
      if (onProgress) onProgress(done / pending.length);
      if (done >= pending.length) resolve(failed.size);
    };
    for (const key of pending) {
      const image = new Image();
      image.onload = () => {
        failed.delete(key);
        finish();
      };
      image.onerror = () => {
        failed.add(key);
        cache.delete(key);
        finish();
      };
      image.src = MANIFEST[key];
      cache.set(key, image);
    }
  });
}
