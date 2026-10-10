# 项目协作指南

## 项目概览

这是一个轻量的 TanStack Start 项目，技术栈包括 React、Vite、TanStack Router 和 Tailwind CSS v4。当前代码仍是 starter 形态，主要包含两个页面路由、全局布局组件和主题切换逻辑，还没有真实 dashboard 业务模块、数据层或鉴权流程。

## 常用命令

- `pnpm dev`：启动本地开发服务器，默认端口为 `3000`。
- `pnpm build`：构建生产版本。
- `pnpm preview`：预览生产构建。
- `pnpm test`：运行 Vitest 测试。
- `pnpm lint`：运行 ESLint。
- `pnpm format`：检查 Prettier 格式。
- `pnpm check`：执行 Prettier 写入格式化并运行 ESLint 自动修复。

## 目录结构

- `src/router.tsx`：创建 TanStack Router 实例，接入生成的 `routeTree`。
- `src/routeTree.gen.ts`：TanStack Router 自动生成的路由树文件，不要手动编辑。
- `src/routes/`：文件路由目录。当前包含 `/` 和 `/about` 两个页面。
- `src/routes/__root.tsx`：全局 HTML shell 和根布局，负责 `HeadContent`、`Scripts`、`Header`、`Footer`、主题初始化脚本和 TanStack Devtools。
- `src/components/`：共享组件目录。当前包含 `Header`、`Footer` 和 `ThemeToggle`。
- `src/styles.css`：Tailwind 入口、全局 CSS token、浅色/深色主题变量和基础样式。
- `public/`：静态资源目录，包含 favicon、manifest、logo 和 robots 文件。

## 路由约定

新增页面优先放在 `src/routes/` 中，遵循 TanStack Router 的文件路由模式。页面组件通过 `createFileRoute` 注册，导航优先使用 `@tanstack/react-router` 的 `Link` 组件，以保留类型安全和 SPA 导航行为。

`src/routeTree.gen.ts` 是生成文件，会被 TanStack Router 覆盖。不要直接修改它；需要调整路由时，修改 `src/routes/` 下的路由文件。

## 布局与样式约定

全局布局集中在 `src/routes/__root.tsx`。需要添加全站级元素、meta、脚本或 provider 时，优先在这里处理，并留意 SSR/hydration 行为。

样式优先沿用当前 Tailwind 工具类、`src/styles.css` 中的 CSS 变量和已有的视觉 token。主题切换逻辑位于 `src/components/ThemeToggle.tsx`，它会读写 `localStorage.theme`，并同步 `document.documentElement` 上的 `light`/`dark` class 与 `data-theme` 属性。

## 开发注意事项

- 优先沿用现有文件路由、组件组织方式、Tailwind 写法和 CSS token。
- 不要为简单 starter 过早引入复杂分层；只有出现真实业务模块时再考虑新增 `features/`、`lib/` 或数据访问层。
- 修改全局 shell、主题脚本或路由配置时，要特别留意 SSR 和 hydration 一致性。
- 生成文件、锁文件和配置文件只在必要时修改，避免无关格式化或依赖 churn。
- 当前仓库中的项目文件可能仍处于未跟踪状态，提交前应先确认 `git status --short`。
