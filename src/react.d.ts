import type { ReactElement } from 'react'

export interface UmamiScriptProps {
  websiteId: string
  pathname?: string
  scriptSrc?: string
  /** 附加属性（P-1）：键须 `data-*`，否则抛 `TypeError`；值自动转义。hash 路由站传 `{ 'data-exclude-hash': 'true' }` */
  attrs?: Record<string, string>
  allowPrefixes?: string[]
  denyPrefixes?: string[]
  denyQueryKeys?: string[]
  /** 覆盖默认敏感 hash query key（hash 路由站用；传 `[]` 关闭该闸） */
  denyHashKeys?: string[]
}

export function UmamiScript(props: UmamiScriptProps): ReactElement | null
export default UmamiScript
