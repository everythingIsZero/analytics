import type { ReactElement } from 'react'

export interface UmamiScriptClientProps {
  websiteId: string
  scriptSrc?: string
  allowPrefixes?: string[]
  denyPrefixes?: string[]
  denyQueryKeys?: string[]
}

/** 与 next/navigation 同形的注入口（非 Next 站可传自己的实现） */
export interface UmamiClientHooks {
  usePathname: () => string | null | undefined
  useSearchParams: () => { toString(): string } | null | undefined
}

export function createUmamiScriptClient(
  hooks: UmamiClientHooks,
): (props: UmamiScriptClientProps) => ReactElement | null
