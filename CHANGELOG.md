# Changelog

本仓遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本语义按 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.2.0] - 2026-10-11

### Added

- **query 感知门控**：`DEFAULT_DENY_QUERY_KEYS = ['token','t','access_token']`；`shouldTrack(input, { denyQueryKeys? })` **先按 query 判定**（大小写不敏感，裸路径带 `?query` 同样解析），命中即不统计；传 `[]` 显式关闭该闸。
- **客户端组件 `@hxym18/analytics/react/client`**：`UmamiScriptClient` 用 `usePathname()` + `useSearchParams()` 按**运行时**路径 + query 门控，缓存页与 SPA 客户端切换后同样受控；Next 下 `useSearchParams` 须包 `<Suspense>`。
- **框架无关内核 `@hxym18/analytics/react/client/base`**：`createUmamiScriptClient({ usePathname, useSearchParams })`，非 Next 的 React 站（React Router 等）注入自己的路径 hook；该入口不 import `next`，无 `next` 时可用。
- `NOINDEX_ROBOTS = { index: false, follow: false }`：私密 / 带 token 页的 `noindex` 载体（Next `metadata.robots` 直接用）。
- `next` 标为可选 peer（`./react/client` 入口专用）；SSR 与客户端组件共用同一 script 元素渲染实现。

- **业务事件守卫 `trackEvent(name, data?)`**（spec §6.5）：SSR 或 `window.umami.track` 未挂载时**静默 no-op**，宿主抛错被吞掉，永不抛错；返回 `boolean` 表示是否真的送出，`data` 省略时不传第二参。站点不再直接写 `window.umami.track`。

### Changed

- `UmamiScript`（SSR）保留：新增 `denyQueryKeys` 透传；README 改为「客户端组件（运行时路径）+ 按页 SSR」双用法，删除根布局硬编码 `pathname="/"` 的反例。

### Fixed

- 客户端组件在路径 hook 返回 `null`/空串时 **fail-closed**（不产出脚本）——未知路径不得当作根路径放行，与「私有路由绝不外泄」红线一致。

### Chore

- 包内**契约副本**声明（`hxym18.contracts`）：`sensitive-prefixes@1`、`analytics-policy@1`。

## [0.1.1] - 2026-10-08

### Fixed

- `buildScriptTag`：属性值（websiteId/scriptSrc）做 HTML 转义，防引号/尖括号破标签。
- 加 `typesVersions`：兼容经典 `moduleResolution: node` 的 `@hxym18/analytics/react` 子路径类型解析。

## [0.1.0] - 2026-10-08

### Added

- `shouldTrack` / `resolvePathname`：路径门控纯函数，默认拦截 `/s/` `/r/` `/api/`；支持 `allowPrefixes` 白名单与 `denyPrefixes` 覆盖。
- `buildScriptTag`：无框架/静态站内联 Umami 脚本标签。
- `@hxym18/analytics/react` 出口：`UmamiScript`（门控在组件内，命中私有路径返回 null）。
- 常量 `DEFAULT_SCRIPT_SRC` / `DEFAULT_DENY_PREFIXES`。
