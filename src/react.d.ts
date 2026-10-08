import type { ReactElement } from 'react'

export interface UmamiScriptProps {
  websiteId: string
  pathname?: string
  scriptSrc?: string
  allowPrefixes?: string[]
  denyPrefixes?: string[]
}

export function UmamiScript(props: UmamiScriptProps): ReactElement | null
export default UmamiScript
