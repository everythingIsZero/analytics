import type { ReactElement } from 'react'

export interface UmamiScriptClientProps {
  websiteId: string
  scriptSrc?: string
  /** 附加属性（P-1）：键须 `data-*`，否则抛 `TypeError`；值自动转义。`data-before-send` 由包固定，不得覆盖 */
  attrs?: Record<string, string>
  allowPrefixes?: string[]
  denyPrefixes?: string[]
  denyQueryKeys?: string[]
  /** 覆盖默认敏感 hash query key（hash 路由站用；传 `[]` 关闭该闸） */
  denyHashKeys?: string[]
}

/** 与 next/navigation 同形的注入口（非 Next 站可传自己的实现） */
export interface UmamiClientHooks {
  usePathname: () => string | null | undefined
  useSearchParams: () => { toString(): string } | null | undefined
  /** 可选：hash 路由站注入（读 `location.hash`，含前导 `#`；如 React Router 的 `useLocation().hash`） */
  useHash?: () => string | null | undefined
}

export function createUmamiScriptClient(
  hooks: UmamiClientHooks,
): (props: UmamiScriptClientProps) => ReactElement | null
