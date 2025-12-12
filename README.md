# JNB — AI Survivor

本项目是一次实验性尝试：测试由 AI 全面设计与实现的游戏能达到什么程度。

快速上手

```powershell
pnpm install
pnpm dev
```

打开本地地址（默认 http://localhost:2334）。

如何游玩
- WASD：移动
- 升级弹出时：按 `1`/`2`/`3` 选择
- `Esc`：暂停（可重开）

构建

```powershell
pnpm build
pnpm preview
```

资源与目录
- 运行时静态资源位于 `public/`。
- 贴图（英雄、怪物、装备）位于 `public/images`，装备素材在 `public/images/equipment` 按稀有度分目录。

文档
- 游戏设计（概要）: `docs/game-design.md`
- 架构说明（概要）: `docs/architecture.md`

目的说明
- 我们的唯一目标是评估 AI 在完整游戏设计与实现中的能力和产出；本仓库用于该实验性评估，不代表任何商业产品承诺。

贡献
- 若要贡献，请参考 `docs/architecture.md` 中的模块说明提交改进建议或 PR。

