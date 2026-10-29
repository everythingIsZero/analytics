# Changelog

本仓遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本语义按 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.5.2] - 2026-10-29

### Fixed

- **SSR 标签先执行时客户端组件会注入第二份 tracker**：挂载调度改为等 `DOMContentLoaded`（defer 脚本必在此之前执行完）再判定——`window.umami` 已挂就保留 SSR 标签，不再注入；只有标签惰性/加载失败才删掉补注入。两份 tracker 会各发一次 pageview，把每次访问压成 0 秒（浏览器实测 hmd：一次页面加载 2 次 `/api/send`；2026-10-29 前 30 天 9 次访问 15 个 pageview，全部 0 秒）。
- `injectUmami`：`window.umami` 已存在时直接返回 `null`（任何站点），并仍在返回前安装 before-send 守卫。新增可测的 `mountUmami` 调度函数。

## [0.5.1] - 2026-10-23

### Fixed

- **React 客户端组件在真实客户端渲染路径下产出的 `<script>` 不执行**（实测 home：标签在 DOM、无网络请求、`window.umami` 永远 undefined）。`createUmamiScriptClient` 现在用 effect 移除惰性标签并调用 `injectUmami` 真正注入；SSR 标记与测试行为不变。

## [0.5.0] - 2026-10-22

### Added

- **`injectUmami(opts)`**：用 `createElement('script') + appendChild` 安全注入 Umami，脚本会真正执行。默认安装 `data-before-send` 守卫。SSR / 无 id / 已存在同站脚本 → `null`。
- **`createBeforeSend(opts)` / `installBeforeSend(opts)` / `BEFORE_SEND_NAME`**：逐条上报前判定。SPA 内从公开页导航到私有/带 token 路由时，整个上报被丢弃；hash 路由的公开页去掉 hash 内 query（保留 `#/route/path`），既不让 `shareId` 泄漏，也不把所有页面记成 `/`。

### Fixed

- **README 旧示例用 `insertAdjacentHTML` 插 script —— 浏览器不会执行这种 script**（HTML 规范：innerHTML / insertAdjacentHTML 插入的 `<script>` 是惰性的）。zbh、nuantie 线上因此脚本标签存在但 `window.umami` 永远 undefined、0 数据。README 改为 `injectUmami()` 并写明原因。
- React 客户端组件补装 before-send 守卫：仅在渲染期返回 `null` 挡不住已加载脚本的 `pushState` 上报。

### Changed

- `buildScriptElement` 固定输出 `data-before-send="__hxym18UmamiBeforeSend"`，调用方传同键也不得覆盖。
- `buildScriptTag` 仅用于 SSR 整页输出；浏览器运行时用 `injectUmami`。

### Fixed

- `resolveHashQueryKeys` 从 hash 内**首个 `?` 或 `&`** 起解析（原只认 `?`）：hash 路由把参数直接接在路径后（`#/x&token=1`，hash 里没有 `?`）时不再漏拦，覆盖面与 nuantie 本地 `TOKEN_RE = /[?&](shareId|share|token|ticket)=/i` 完全对齐。

### Notes（口径决策，非行为变更）

- **search / hash 默认敏感键不对称**（有意为之）：search 侧维持 `token` / `t` / `access_token`；hash 侧另含 `shareId` / `share` / `ticket`。后三个是 Taro hash 路由（nuantie 阅读/报名页）的**路由参数**，只出现在 `#` 之后；扩大 search 默认会误拦普通站的 `?share=` / `?ticket=` 并破坏既有契约。站点确有 search 侧敏感键时用 `denyQueryKeys: [...DEFAULT_DENY_QUERY_KEYS, 'share']` 显式追加。

## [0.4.1] - 2026-10-16

### Fixed

- **`attrs` 不得覆盖标签自有属性（代码复核发现）**：`attrs: { 'data-website-id': … }` 原先在字符串路径产出**重复属性**（浏览器只认第一个 → 传了没生效），在 React 路径**静默改写** `websiteId`（统计进错站）。现与键白名单同口径抛 `TypeError`——站点 id 只走顶层 `websiteId` 选项。

## [0.4.0] - 2026-10-16

### Added

- **脚本附加属性 `attrs`（P-1）**：`buildScriptTag({ websiteId, scriptSrc, attrs })` 与 React 组件（`UmamiScript` / `createUmamiScriptClient` / `UmamiScriptClient`）都支持 `attrs`。hash 路由站（Taro H5 / HashRouter）传 `{ 'data-exclude-hash': 'true' }` 即可让 Umami 剥掉 URL 里的 hash——**原先只吃 `{websiteId, scriptSrc}`，站点只能自建标签（并绕过共享转义）**。键白名单 `/^data-[a-z0-9-]+$/i`，非 `data-*` 键抛 `TypeError`（静默忽略会变成「传了没生效」的隐蔽 bug）；值经 `escapeAttr` 转义；未给 `attrs` 时标签与既有形状**逐字相同**。校验与归集收在 `core.resolveAttrs`，字符串与 React 两条路径同一实现、不漂移。

## [0.3.0] - 2026-10-12

### Added

- **hash 路由门控**：`DEFAULT_DENY_HASH_KEYS = ['token','t','access_token','shareid','share','ticket']`；`shouldTrack(input, { denyHashKeys? })` 在 query 闸之外**新增 hash query 闸**（从 `URL.hash` 的 `?` 后取 key，大小写不敏感），命中即不统计；传 `[]` 显式关闭该闸。Taro H5 等 hash 路由（`/#/pages/reader/index?shareId=…`，`location.search` 为空、pathname 恒为 `/`）不再漏拦，覆盖面与 nuantie 本地 `TOKEN_RE = /[?&](shareId|share|token|ticket)=/i` 对齐。
- `resolveHashQueryKeys(input)`：取 hash 内 query 的小写 key（无 hash/无 query/非法 → `[]`）。
- 客户端组件内核 `createUmamiScriptClient(hooks)` 新增可选 `useHash` hook（hash 路由站注入 `() => location.hash`）；`UmamiScriptClient` / `UmamiScript` 新增 `denyHashKeys` 透传。

### Changed

- `shouldTrack` 判定顺序：敏感 query → **敏感 hash query** → 前缀（原来只有 query → 前缀）。无 hash 的既有行为不变。

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
