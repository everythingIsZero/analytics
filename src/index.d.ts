/** 默认 Umami 脚本地址 */
export const DEFAULT_SCRIPT_SRC: string
/** 默认拦截前缀（带 token/私有路由） */
export const DEFAULT_DENY_PREFIXES: readonly string[]

export function resolvePathname(input: unknown): string

export interface ShouldTrackOptions {
  /** 给了则只有命中白名单才统计 */
  allowPrefixes?: string[]
  /** 覆盖默认拦截前缀 */
  denyPrefixes?: string[]
}

export function shouldTrack(pathname: unknown, opts?: ShouldTrackOptions): boolean

export function buildScriptTag(opts: { websiteId: string; scriptSrc?: string }): string
