/**
 * react-client-base.mjs — 客户端统计组件的**框架无关内核**（不 import next）
 *
 * 为什么单独成文件：包入口 `react-client.mjs` 必须 `import ... from 'next/navigation'`，
 * 而 `next` 在本包是**可选** peer（非 Next 的 React 站也能用内核，注入自己的 hook）。
 * 把 next 相关 import 隔离在入口，内核即可被 node:test 直接加载、用注入的假 hook 验证
 * 运行时门控（RF1/RF3），无需真实 Next 运行时。
 */
import { shouldTrack } from './core.mjs'
import { buildScriptElement } from './react-render.mjs'

/**
 * 用注入的路径/查询 hook 造一个「运行时门控」的 Umami 客户端组件。
 *
 * 组件每次渲染都读**当前** pathname + search：缓存页与 SPA 切换后同样受控（RF3）。
 * 敏感 query（默认 token/t/access_token）命中即返回 null（RF1）。
 *
 * @param {{
 *   usePathname: () => string | null | undefined,
 *   useSearchParams: () => { toString(): string } | null | undefined,
 * }} hooks 与 next/navigation 同形的两个 hook（React Router 站可传自己的实现）
 * @returns {(props: {
 *   websiteId?: string,
 *   scriptSrc?: string,
 *   allowPrefixes?: string[],
 *   denyPrefixes?: string[],
 *   denyQueryKeys?: string[],
 * }) => import('react').ReactElement | null}
 */
export function createUmamiScriptClient(hooks) {
  const usePathname = hooks && hooks.usePathname
  const useSearchParams = hooks && hooks.useSearchParams
  return function UmamiScriptClient(props) {
    // hooks 必须无条件调用（React hooks 规则），故先取路径/查询，再判空与门控。
    const pathname = (usePathname && usePathname()) || '/'
    const searchParams = useSearchParams && useSearchParams()
    const query = searchParams ? String(searchParams.toString()) : ''
    const { websiteId, scriptSrc, allowPrefixes, denyPrefixes, denyQueryKeys } = props || {}
    if (!websiteId) return null
    const input = query ? `${pathname}?${query}` : pathname
    if (!shouldTrack(input, { allowPrefixes, denyPrefixes, denyQueryKeys })) return null
    return buildScriptElement({ websiteId, scriptSrc })
  }
}
