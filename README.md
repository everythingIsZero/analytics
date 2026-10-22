# @hxym18/analytics

统计接入 SDK：统一 Umami 脚本 + **路径门控**。带 token / 私有的路由绝不挂统计。

> 背景：Umami 原先由 fang / zitie / zbh 各写一份、直接往 layout 里塞脚本，fang 漏了 `/s/*`
> 门控，导致带 token 的分享页也上报（P0 泄漏）。本包把「哪些路径可统计」做成可复用门控，
> 消费方不再手写分支。

- **零依赖**（除可选 react peer），门控判定为纯函数，可完整单测。

## 安装

```bash
pnpm add github:everythingIsZero/analytics#v0.1.0
```

## React / Next

两种用法，按需选：

### 1. 客户端组件（推荐；按**运行时**路径 + query 判定）

```jsx
// app/layout.tsx
import { Suspense } from 'react'
import { UmamiScriptClient } from '@hxym18/analytics/react/client'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        {/* useSearchParams 要求 Suspense 边界，否则整页退出静态渲染 */}
        <Suspense fallback={null}>
          <UmamiScriptClient websiteId="<你的 umami website id>" />
        </Suspense>
      </body>
    </html>
  )
}
```

- 组件读**当前** `usePathname()` + `useSearchParams()`；命中私有前缀（`/s/` `/r/` `/api/`）或敏感 query
  （`token` / `t` / `access_token`，大小写不敏感）时返回 `null`，不产出脚本。
- **hash 路由站**（Taro H5 / React Router HashRouter；`location.search` 为空、token 在 `#` 后）另注入
  `useHash: () => location.hash`（见下「非 Next 的 React 站」），命中默认敏感 hash key
  （`token` / `t` / `access_token` / `shareId` / `share` / `ticket`）同样返回 `null`；
  **并务必同时传 `attrs={{ 'data-exclude-hash': 'true' }}`**——门控只管挂载时刻，SPA 内后续导航到带
  token 的 hash 路由仍会被 Umami 上报（见「无框架 / 静态站」）。
- 因为按运行时路径判定，**缓存页**与 **SPA 客户端切换**后同样受控：切到私有/带 token 路径即停止统计。
- **Next 下 `useSearchParams` 必须在 `<Suspense>` 边界内**（Next 要求；不包会导致该页无法静态渲染）。
- 非 Next 的 React 站（如 React Router）：`import { createUmamiScriptClient } from '@hxym18/analytics/react/client/base'`，
  注入自己的路径 hook，例如 `createUmamiScriptClient({ usePathname: () => location.pathname, useSearchParams: () => new URLSearchParams(location.search), useHash: () => location.hash })`（`next` 未安装时**必须**用这个入口：`/react/client` 静态 import `next/navigation`，无 next 会加载失败）。`useHash` 可选，仅 hash 路由站需要。
- 路径 hook 返回 `null`/空串（框架上下文未就绪）时**不产出脚本**（fail-closed：未知路径宁可不统计）。

### 2. 按页 SSR（`UmamiScript`；给已知 pathname 的服务端组件用）

```jsx
import { UmamiScript } from '@hxym18/analytics/react'

// 例如 app/blog/[slug]/page.tsx：显式给出该页 pathname
<UmamiScript websiteId="<你的 umami website id>" pathname={`/blog/${slug}`} />
```

- 用于**已知具体 pathname** 的服务端页面；命中私有前缀、敏感 query 或 hash query 时组件返回 `null`，不产出脚本。
  hash 路由站可直接传入带 hash 的完整路径（如 `pathname="/#/pages/reader/index?shareId=1"`）。
- ⚠️ 不要在根布局硬编码 `pathname="/"`：SSR 拿不到当前路由时这样写会让私有页也判定为公开页。
  需要全局挂载请用上面的**客户端组件**。
- 只统计公开内容页的站可用 `allowPrefixes` 收窄（例如 `['/blog', '/poems']`）。

## 私密 / 带 token 页必须 noindex

统计门控只保证「不上报」，不阻止**搜索引擎收录**。带 token 或私有的页面（`/s/*`、登录后页等）
必须同时声明 `noindex`，否则凭证/私密内容可能进搜索索引：

```jsx
// app/s/[token]/page.tsx
import { NOINDEX_ROBOTS } from '@hxym18/analytics'

export const metadata = { robots: NOINDEX_ROBOTS } // { index: false, follow: false }
```

无框架站：`<meta name="robots" content="noindex, nofollow">`。

> 门控（不统计）+ noindex（不收录）是两件不同的事，私密页两者都要。

## 无框架 / 静态站

```js
import { injectUmami } from '@hxym18/analytics'

// 用 createElement + appendChild 注入；脚本会真正执行，并自动安装 before-send 守卫。
injectUmami({ websiteId: '<id>' })
```

> ⚠️ **不要用 `insertAdjacentHTML` / `innerHTML` 插 `<script>`**：HTML 规范规定这种方式插入的
> script **不会执行**——标签在 DOM 里、浏览器不发请求、`window.umami` 也不会挂上。
> zbh / nuantie 线上曾因此长期 0 数据。`buildScriptTag()` 只用于 SSR 直接输出整页 HTML；
> 浏览器运行时一律用 `injectUmami()`。

**hash 路由站（Taro H5 / HashRouter）**：`injectUmami()` 默认安装 `data-before-send` 守卫：
命中敏感 hash query 的上报直接丢弃；公开页只去掉 hash 内的 query，保留 `#/route/path`，
所以路由级 PV 还在。不需要再传 `data-exclude-hash`（它会把整段 hash 删掉，所有页面都记成 `/`）。

如需保留旧写法，`attrs` 仍可传（键白名单只放行 `data-*`，其余如 `src` / `onload` / `id` 抛
`TypeError`；值自动转义，不会破标签）。

## 业务事件（自定义事件）

站点主动上报业务事件时用 `trackEvent`，不要直接写 `window.umami.track`——由本函数守卫宿主是否就绪：

```js
import { trackEvent } from '@hxym18/analytics'

// 返回 boolean：是否真的送出
if (trackEvent('signup', { plan: 'pro' })) { /* 已上报 */ }
trackEvent('export_docx') // data 省略时不传第二参
```

- **SSR 安全**：`typeof window === 'undefined'` 时静默 no-op。
- **Umami 脚本未挂载时业务事件不报错**：私有页被门控拦下 / 脚本加载失败 / 站点尚未接入脚本，`window.umami.track` 不存在即静默返回 `false`。
- **永不抛错**：宿主实现抛错也吞掉（像 share-kit 的 `send`），不影响用户动作；返回 `false`。
- ⚠️ `trackEvent` 只保证「不炸」，**不替代路径门控**：私有 / 带 token 页本就该整页不挂脚本，`trackEvent` 不是泄密挡板。

## 默认门控

- 默认拦截前缀：`/s/`（分享 token）、`/r/`、`/api/`。
- 默认拦截敏感 query key：`token` / `t` / `access_token`（小写比较，`?Token=` 同样拦）。
- 默认拦截敏感 **hash query** key：`token` / `t` / `access_token` / `shareId` / `share` / `ticket`
  （小写比较）——Taro H5 等 hash 路由把参数放在 `#` 之后（`/#/pages/reader/index?shareId=…`），
  `location.search` 为空、pathname 恒为 `/`，只扫 search 会漏拦；覆盖面与 nuantie 本地
  `TOKEN_RE = /[?&](shareId|share|token|ticket)=/i` 对齐。hash 内 query 的起点取**首个 `?` 或 `&`**，
  故 `#/x&token=1`（hash 里没有 `?`）同样拦。
- **search 与 hash 的默认敏感键为何不同**：search 侧只拦 `token` / `t` / `access_token`；hash 侧另含
  `shareId` / `share` / `ticket`。后三个是 Taro hash 路由（nuantie 阅读/报名页）的**路由参数**，
  只出现在 `#` 之后，**不放进 search 默认**——普通站 `?share=…` / `?ticket=…` 未必是凭证，扩大 search
  默认会破既有契约、误拦正常统计。站点若确有 search 侧敏感键，用
  `denyQueryKeys: [...DEFAULT_DENY_QUERY_KEYS, 'share']` 显式追加（只加不减）。
- `shouldTrack(input, { allowPrefixes, denyPrefixes, denyQueryKeys, denyHashKeys })`：`input` 可为完整 URL 或带
  `?query`/`#hash?query` 的裸路径；**先查敏感 query、再查 hash query**（任一命中即不统计），最后按前缀判定。
  `allowPrefixes` 给了则只有命中白名单才统计；`denyPrefixes` / `denyQueryKeys` / `denyHashKeys` 覆盖默认
  （`denyQueryKeys: []` / `denyHashKeys: []` 各自显式关闭对应闸；追加键用展开默认常量，如
  `denyHashKeys: [...DEFAULT_DENY_HASH_KEYS, 'custom']`）。
- **分享页 / 带 token 路由不得挂全局统计**（URL 含 token 即泄漏）——本包默认满足（含 hash 路由）。
- `resolveHashQueryKeys(input)`：取 hash 内 query 的小写 key（从首个 `?` 或 `&` 起解析；无 hash/无 query/非法 → `[]`），供需要单独取键的消费方用。

## 测试

```bash
npm test
```
