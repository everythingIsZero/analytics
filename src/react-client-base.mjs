/**
 * react-client-base.mjs — 客户端统计组件的**框架无关内核**（不 import next）
 *
 * 为什么单独成文件：包入口 `react-client.mjs` 必须 `import ... from 'next/navigation'`，
 * 而 `next` 在本包是**可选** peer（非 Next 的 React 站也能用内核，注入自己的 hook）。
 * 把 next 相关 import 隔离在入口，内核即可被 node:test 直接加载、用注入的假 hook 验证
 * 运行时门控（RF1/RF3），无需真实 Next 运行时。
 */
import { useEffect } from 'react'
import { installBeforeSend, shouldTrack } from './core.mjs'
import { buildScriptElement } from './react-render.mjs'

/**
 * 用注入的路径/查询 hook 造一个「运行时门控」的 Umami 客户端组件。
 *
 * 组件每次渲染都读**当前** pathname + search（缓存页与 SPA 切换后同样受控（RF3））。
 * 敏感 query（默认 token/t/access_token）命中即返回 null（RF1）；
 * hash 路由站另可注入 `useHash`（读 `location.hash`，形如 `#/pages/reader/index?shareId=1`），
 * 命中默认敏感 hash key 同样返回 null（Taro/HashRouter，RF2）。
 * pathname 取不到（hook 返回 null/''）时 **fail-closed**：返回 null，不产出脚本。
 *
 * @param {{
 *   usePathname: () => string | null | undefined,
 *   useSearchParams: () => { toString(): string } | null | undefined,
 *   useHash?: () => string | null | undefined,
 * }} hooks 与 next/navigation 同形的两个 hook（React Router 站可传自己的实现）；
 *   `useHash` 可选，仅 hash 路由站需要（值应为 `location.hash`，含前导 `#`）
 * @returns {(props: {
 *   websiteId?: string,
 *   scriptSrc?: string,
 *   attrs?: Record<string, string>,
 *   allowPrefixes?: string[],
 *   denyPrefixes?: string[],
 *   denyQueryKeys?: string[],
 *   denyHashKeys?: string[],
 * }) => import('react').ReactElement | null}
 */
export function createUmamiScriptClient(hooks) {
  const usePathname = hooks && hooks.usePathname
  const useSearchParams = hooks && hooks.useSearchParams
  const useHash = hooks && hooks.useHash
  return function UmamiScriptClient(props) {
    // hooks 必须无条件调用（React hooks 规则），故先取路径/查询/hash，再判空与门控。
    const pathname = usePathname && usePathname()
    const searchParams = useSearchParams && useSearchParams()
    const hash = useHash ? useHash() : ''
    const query = searchParams ? String(searchParams.toString()) : ''
    const hashStr = typeof hash === 'string' ? hash : ''
    const { websiteId, scriptSrc, attrs, allowPrefixes, denyPrefixes, denyQueryKeys, denyHashKeys } =
      props || {}
    // 路径取不到（hook 返回 null/''，如框架上下文未就绪）→ **fail-closed**：不产出脚本。
    // 与红线一致（私有页绝不外泄）：未知路径宁可不统计，不可当作根路径放行。
    const hasPath = typeof pathname === 'string' && pathname.length > 0
    const input = hasPath ? `${pathname}${query ? `?${query}` : ''}${hashStr}` : ''
    const trackable =
      hasPath && !!websiteId && shouldTrack(input, { allowPrefixes, denyPrefixes, denyQueryKeys, denyHashKeys })
    // 运行时守卫：脚本一旦加载，SPA 后续 pushState 仍会上报；只有 before-send 能逐条拦住。
    // 客户端 effect 在首次导航前安装；SSR 不执行（初始页已由上面的 shouldTrack 判定）。
    // 必须在任何 return 之前调用——路径从有效变空时 hook 数量不能变。
    useEffect(() => {
      if (trackable) installBeforeSend({ allowPrefixes, denyPrefixes, denyQueryKeys, denyHashKeys })
    })
    if (!trackable) return null
    return buildScriptElement({ websiteId, scriptSrc, attrs })
  }
}
