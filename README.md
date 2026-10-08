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

```jsx
// app/layout.tsx（公开内容页）
import { UmamiScript } from '@hxym18/analytics/react'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <UmamiScript websiteId="<你的 umami website id>" pathname="/" />
      </body>
    </html>
  )
}
```

- `pathname` 传当前路径（服务端/客户端均可）；命中私有/ token 前缀时组件返回 `null`，不产出脚本。
- 只统计公开内容页的站可用 `allowPrefixes` 收窄（例如 `['/blog', '/poems']`）。

## 无框架 / 静态站

```js
import { shouldTrack, buildScriptTag } from '@hxym18/analytics'

if (shouldTrack(location.pathname)) {
  document.head.insertAdjacentHTML('beforeend', buildScriptTag({ websiteId: '<id>' }))
}
```

## 默认门控

- 默认拦截前缀：`/s/`（分享 token）、`/r/`、`/api/`。
- `shouldTrack(pathname, { allowPrefixes, denyPrefixes })`：`allowPrefixes` 给了则只有命中白名单才统计；`denyPrefixes` 覆盖默认拦截。
- **分享页 / 带 token 路由不得挂全局统计**（URL 含 token 即泄漏）——本包默认满足。

## 测试

```bash
npm test
```
