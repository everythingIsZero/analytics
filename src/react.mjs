/**
 * react.mjs — React / Next 适配（Server Component 友好）
 *
 * 用法（Next App Router layout）：
 *   import { UmamiScript } from '@hxym18/analytics/react'
 *   // 公开内容页：给 websiteId 与当前 pathname（服务端可读），门控在组件内
 *   <UmamiScript websiteId="..." pathname={pathname} />
 *
 * 组件在 !shouldTrack(pathname) 时返回 null —— 带 token/私有路由不再产出 script 标签。
 */
import { shouldTrack } from './core.mjs'
import { buildScriptElement } from './react-render.mjs'

/**
 * @param {{
 *   websiteId: string,
 *   pathname?: string,
 *   scriptSrc?: string,
 *   allowPrefixes?: string[],
 *   denyPrefixes?: string[],
 *   denyQueryKeys?: string[],
 *   denyHashKeys?: string[]
 * }} props
 */
export function UmamiScript(props) {
  const { websiteId, pathname, scriptSrc, allowPrefixes, denyPrefixes, denyQueryKeys, denyHashKeys } =
    props || {}
  if (!websiteId) return null
  if (!shouldTrack(pathname, { allowPrefixes, denyPrefixes, denyQueryKeys, denyHashKeys })) return null
  return buildScriptElement({ websiteId, scriptSrc })
}

export default UmamiScript
