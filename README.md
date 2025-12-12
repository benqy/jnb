# JNB Survivor (PixiJS + Vite + TypeScript)

体验地址: https://benqy.github.io/jnb/

## 开发

```powershell
pnpm install
pnpm dev
```

打开提示的本地地址（默认 `http://localhost:2334`）。

## 操作

- `W/A/S/D`：移动
- 升级时：按 `1/2/3` 或点击卡牌选择

## 构建

```powershell
pnpm build
pnpm preview
```

## 部署与资源路径

静态资源放在 `public/`，运行时前缀由 `src/config.ts` 的 `PROJECT_ROOT` 提供（默认取 Vite 的 `base`）。

示例：
```ts
import { PROJECT_ROOT } from './config';
await Assets.load(`${PROJECT_ROOT}images/hero.png`);
```

Fork 时只需设置自己的 `vite.config.ts` `base`，或修改 `src/config.ts`。
