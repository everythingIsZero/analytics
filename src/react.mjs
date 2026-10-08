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
import { createElement } from 'react'
import { DEFAULT_SCRIPT_SRC, shouldTrack } from './core.mjs'

/**
 * @param {{
 *   websiteId: string,
 *   pathname?: string,
 *   scriptSrc?: string,
 *   allowPrefixes?: string[],
 *   denyPrefixes?: string[]
 * }} props
 */
export function UmamiScript(props) {
  const { websiteId, pathname, scriptSrc, allowPrefixes, denyPrefixes } = props || {}
  if (!websiteId) return null
  if (!shouldTrack(pathname, { allowPrefixes, denyPrefixes })) return null
  return createElement('script', {
    defer: true,
    src: scriptSrc || DEFAULT_SCRIPT_SRC,
    'data-website-id': websiteId,
  })
}

export default UmamiScript
