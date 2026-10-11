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
- 因为按运行时路径判定，**缓存页**与 **SPA 客户端切换**后同样受控：切到私有/带 token 路径即停止统计。
- **Next 下 `useSearchParams` 必须在 `<Suspense>` 边界内**（Next 要求；不包会导致该页无法静态渲染）。
- 非 Next 的 React 站（如 React Router）：`import { createUmamiScriptClient } from '@hxym18/analytics/react/client/base'`，
  注入自己的路径 hook，例如 `createUmamiScriptClient({ usePathname: () => location.pathname, useSearchParams: () => new URLSearchParams(location.search) })`（`next` 未安装时**必须**用这个入口：`/react/client` 静态 import `next/navigation`，无 next 会加载失败）。
- 路径 hook 返回 `null`/空串（框架上下文未就绪）时**不产出脚本**（fail-closed：未知路径宁可不统计）。

### 2. 按页 SSR（`UmamiScript`；给已知 pathname 的服务端组件用）

```jsx
import { UmamiScript } from '@hxym18/analytics/react'

// 例如 app/blog/[slug]/page.tsx：显式给出该页 pathname
<UmamiScript websiteId="<你的 umami website id>" pathname={`/blog/${slug}`} />
```

- 用于**已知具体 pathname** 的服务端页面；命中私有前缀或敏感 query 时组件返回 `null`，不产出脚本。
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
import { shouldTrack, buildScriptTag } from '@hxym18/analytics'

if (shouldTrack(location.pathname)) {
  document.head.insertAdjacentHTML('beforeend', buildScriptTag({ websiteId: '<id>' }))
}
```

## 默认门控

- 默认拦截前缀：`/s/`（分享 token）、`/r/`、`/api/`。
- 默认拦截敏感 query key：`token` / `t` / `access_token`（小写比较，`?Token=` 同样拦）。
- `shouldTrack(input, { allowPrefixes, denyPrefixes, denyQueryKeys })`：`input` 可为完整 URL 或带 `?query` 的裸路径；
  先查敏感 query（命中即不统计），再按前缀判定。`allowPrefixes` 给了则只有命中白名单才统计；
  `denyPrefixes` / `denyQueryKeys` 覆盖默认（`denyQueryKeys: []` 显式关闭该闸）。
- **分享页 / 带 token 路由不得挂全局统计**（URL 含 token 即泄漏）——本包默认满足。

## 测试

```bash
npm test
```
