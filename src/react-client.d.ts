import type { ReactElement } from 'react'
import type { UmamiClientHooks, UmamiScriptClientProps } from './react-client-base.mjs'

export type { UmamiClientHooks, UmamiScriptClientProps } from './react-client-base.mjs'

/** 框架无关内核：注入路径/查询 hook（非 Next 站用，如 React Router 的 useLocation） */
export function createUmamiScriptClient(
  hooks: UmamiClientHooks,
): (props: UmamiScriptClientProps) => ReactElement | null

/** Next 客户端组件：按运行时路径 + query 门控 */
export const UmamiScriptClient: (props: UmamiScriptClientProps) => ReactElement | null
export default UmamiScriptClient
