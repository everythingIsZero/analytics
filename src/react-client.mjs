'use client'
/**
 * react-client.mjs — Next（App Router）客户端统计组件入口
 *
 * 用法（app/layout.tsx，包一层 Suspense，useSearchParams 要求）：
 *   import { UmamiScriptClient } from '@hxym18/analytics/react/client'
 *   <Suspense><UmamiScriptClient websiteId="..." /></Suspense>
 *
 * 按**运行时**路径 + query 判定：命中私有前缀或敏感 query（token/t/access_token）即不挂统计，
 * 缓存页与 SPA 客户端切换后同样受控。非 Next 的 React 站请用
 * `@hxym18/analytics/react/client/base` 的 `createUmamiScriptClient`（本入口静态 import
 * `next/navigation`，无 next 装不上）。
 */
import { usePathname, useSearchParams } from 'next/navigation'
import { createUmamiScriptClient } from './react-client-base.mjs'

export { createUmamiScriptClient } from './react-client-base.mjs'

export const UmamiScriptClient = createUmamiScriptClient({ usePathname, useSearchParams })

export default UmamiScriptClient
