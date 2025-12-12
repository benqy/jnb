**架构概述（概要）**

- 技术栈：PixiJS（渲染）、TypeScript、Vite、pnpm。渲染按层次组织（背景 / 实体 / 特效 / UI）。
- 目标：结构清晰，便于持续迭代武器、装备与数值。

**主循环与世界结构**

- `Game`：核心控制器，包含主舞台（`stageRoot`）、世界层（`worldBg`、`worldEntities`、`worldFx`）和 `ui` 层。负责资源加载、相机更新、生成/回收实体以及 UI 流程（升级、暂停、GameOver）。
- `update(dt)`：节拍函数，按顺序驱动生成、玩家、怪物、投射物、拾取物、粒子与碰撞解析。

**实体模型**

- Player：位置、显示容器、武器集合、装备栏、基础/派生 stat（通过 `recomputeStats()` 汇总装备与基础值）。
- Monster：轻量 AI（追踪玩家）、显示/阴影、生命条、afterimage 特效。
- Projectile：投射物抽象，支持多种形状（orb、shard 等），带生命周期、穿透计数与击中回调。
- Pickup：当前包含 XP 与 Equipment 两类，负责视觉、磁性拾取、被玩家收集时的行为（装配/拾取 XP）。

**武器系统**

- 工厂式 `weaponFactories`：每把武器返回 `Weapon` 对象，包含 `update(dt, ctx)`，ctx 提供玩家、怪物列表、spawnProjectile、fx 等。
- 投射物由工厂创建 `new Projectile({...})`，渲染样式与行为在 `Projectile` 内部统一处理。

**装备系统**

- 装备配置与生成位于 `src/game/equipment/`：
  - `EquipmentSystem` 负责读取贴图、按稀有度随机词缀并返回 `EquipmentItem`。
  - `Player` 持有固定数量的装备格，装备通过 `tryEquip` 自动插入空位，丢弃通过 UI 触发 `discardEquipment`。
- 词缀分为 `add` 与 `mult`，在 `Player.recomputeStats()` 时统一合并应用。

**UI 与输入**

- UI 组件集中在 `src/game/ui/`（HUD、LevelUpOverlay、HintToast、CornerHelp、Title/ Pause / EquipmentPanel）。
- 输入处理由 `Input` 封装，提供按键状态与移动轴。

**资源与 VFX**

- 贴图加载集中在 `Game.loadAssets()`。装备贴图按稀有度目录组织，方便扩展。
- 特效通过 `ParticleSystem` 统一管理（伤害数字、闪光、光弧、冲击波等），并与游戏事件绑定。

**可配置性与扩展点**

- 武器/装备/词缀的数值定义集中在对应模块（`weapons/`, `equipment/`），以便未来移入 JSON/YAML 数据。
- `weaponFactories` 与 `EquipmentSystem.rollEquipment()` 是主要扩展点：增加新武器或新词缀无需改动核心循环。

**构建与质量保证**

- 使用 `pnpm` + `vite`，支持快速本地开发 `pnpm dev`，与生产构建 `pnpm build`。
- 建议：为关键系统（伤害计算、装备合并、投射物碰撞）添加单元测试以降低回归风险。

**目录速览（开发者入口）**

- `src/game/Game.ts` — 游戏入口与主循环
- `src/game/world/` — Player / Monster / Projectile / Pickup / ParticleSystem
- `src/game/weapons/` — 武器工厂与武器逻辑
- `src/game/equipment/` — 装备词缀、贴图加载与生成
- `src/game/ui/` — UI 组件

参考：`docs/game-design.md`（高层玩法设计）