# 素材清单（assets/）

> 与仓库实文件一致：共 **70** 张（cookie.png 已移除，其余 71 张原图按设计系统 §0.1 改名 / 重绘）。
> `size` = 源图像素；`displayH` = 逻辑 480×270 舞台上的显示高度（底部中心锚点，除非注明 center）。

## 已重绘（18 张，对应设计系统 §0.1）

| 最终路径 | 源（交接包 redraw/） | 尺寸 | 用途 |
|---|---|---|---|
| `assets/sprites/npc/linglan.png` | `granny.png` | 100×132 | 铃兰（粉围裙杂货商） |
| `assets/sprites/npc/linglan_wave.png` | `granny_wave.png` | 100×132 | 铃兰（挥手） |
| `assets/sprites/golem/idle.png` | `ashbug_idle.png` | 84×77 | 苔石傀儡待机 |
| `assets/sprites/golem/move.png` | `ashbug_move.png` | 84×77 | 苔石傀儡移动 |
| `assets/sprites/golem/attack.png` | `ashbug_attack.png` | 84×77 | 苔石傀儡攻击 |
| `assets/sprites/bramble/idle.png` | `hopthorn_idle.png` | 94×119 | 荆刺果（紫浆果） |
| `assets/sprites/bramble/jump.png` | `hopthorn_jump.png` | 94×119 | 荆刺果腾空 |
| `assets/sprites/bramble/roll.png` | `hopthorn_roll.png` | 94×119 | 荆刺果滚动 |
| `assets/sprites/boss/idle.png` | `fogcore_idle.png` | 209×230 | 磐苔巨像待机 |
| `assets/sprites/boss/charge.png` | `fogcore_charge.png` | 209×230 | 磐苔巨像蓄力帧 |
| `assets/sprites/boss/fog.png` | `fogcore_fog.png` | 209×230 | 磐苔巨像孢子抛射 |
| `assets/sprites/boss/slam.png` | `fogcore_slam.png` | 209×230 | 磐苔巨像冲撞 |
| `assets/sprites/items/dew.png` | `coin.png` | 48×40 | 露珠（货币，绿露珠） |
| `assets/ui/btn_skill_spin.png` | `btn_skill_spin.png` | 106×112 | 翠风斩按钮 |
| `assets/ui/btn_skill_shot.png` | `btn_skill_shot.png` | 112×102 | 晨露祝福按钮 |
| `assets/sprites/fx/leaf_slash.png` | `leaf_slash.png` | 120×97 | 翠风斩风刃特效 |
| `assets/sprites/fx/seed_bullet.png` | `seed_bullet.png` | 72×31 | 保留文件名（不再用于晨露祝福） |
| `assets/sprites/fx/fog_puff.png` | `fog_puff.png` | 96×75 | 磐苔巨像孢子特效 |

> 稳定文件名约定：`linglan.png`、`linglan_wave.png`、`seed_bullet.png`、`boss/charge.png` 文件名保持不变，后续替换直接覆盖即可生效。

## 改名（未重绘，仅移动 / 改名）

| 最终路径 | 来源 | 尺寸 |
|---|---|---|
| `assets/sprites/moth/fly1.png` | `sprites/mistmoth/fly1.png` | 128×92 |
| `assets/sprites/moth/fly2.png` | `sprites/mistmoth/fly2.png` | 128×92 |

## 角色 / 怪物显示高度

| 对象 | 源图尺寸 | displayH | 帧 / 时长 |
|---|---|---|---|
| 主角 idle/attack/cast/climb/hurt/jump | 117×153 | 48 | — |
| 主角 run1–run6 | 91×155 | 48 | 6 帧 / 0.075s |
| 铃兰 linglan / linglan_wave | 100×132 | 46 | — |
| 苔石傀儡 golem | 84×77 | 30 | idle/move 0.25s 交替 |
| 荆刺果 bramble | 94×119 | 34 | idle / jump / roll |
| 雾羽蛾 moth | 128×92 | 34 | fly1/fly2 0.15s |
| 磐苔巨像 boss | 209×230 | 96 | idle / charge / fog / slam |

## 背景 / 地面 / 平台

| 对象 | 尺寸 | displayH / 说明 |
|---|---|---|
| bg/{town,wild,cave}_far.jpg | 1120×720 | 铺满视口高，视差 0.1 |
| bg/{town,wild,cave}_mid.png | 1120×720 | 底对齐地面线，视差 0.35 |
| bg/{town,wild,cave}_near.png | 1120×720 | 底对齐地面线，裁掉自带地面（NEAR_CROP 0.86），视差 0.7 |
| tiles/ground_town.png | 512×152 | 条带高 44 |
| tiles/ground_wild.png | 512×152 | 条带高 44 |
| tiles/ground_cave.png | 512×162 | 条带高 44 |
| tiles/platform_town.png | 480×55 | 单向平台，三切片，高 22 |
| tiles/platform_wild.png | 480×96 | 单向平台，三切片，高 22 |
| tiles/platform_cave.png | 480×78 | 单向平台，三切片，高 22 |

地面实心填充色：town `#7A4A28`、wild `#5E6670`、cave `#3B2A5A`（条带下方延伸，带土截面 / 碎石）。

## 装饰 displayH

house 110、tree 100、stall 70、lamppost 80、flower 34、bush 46、mushroom 56、rock 50、crystal 60、root 90、glowcap 54、stalagmite 80。

> 主线 maps.js 的装饰类型只用到：`house`/`tree`/`lamp`(→lamppost)/`flower`/`bush`/`crystalRock`(→crystal)/`stalagmite`。

## UI / 道具（DOM 引用）

icon_heart 64×60、icon_drop 64×57、icon_level_badge 64×58、btn_pause 62×64、btn_sound 63×64、icon_bag 63×64、btn_skill_spin 106×112、btn_skill_shot 112×102、btn_potion_hp 112×106、btn_potion_mp 108×112、dew 48×40（HUD 货币图）、potion_red 37×48、potion_blue 34×48、portal 96×123（displayH 84）。
