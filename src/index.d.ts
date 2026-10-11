/** 默认 Umami 脚本地址 */
export const DEFAULT_SCRIPT_SRC: string
/** 默认拦截前缀（带 token/私有路由） */
export const DEFAULT_DENY_PREFIXES: readonly string[]
/** 默认拦截的敏感 query key（小写比较；`token`/`t`/`access_token`） */
export const DEFAULT_DENY_QUERY_KEYS: readonly string[]

/** 私密/带 token 页的 robots 元数据（`index`/`follow` 均 false），必须 noindex */
export const NOINDEX_ROBOTS: Readonly<{ index: false; follow: false }>

export function resolvePathname(input: unknown): string

export interface ShouldTrackOptions {
  /** 给了则只有命中白名单才统计 */
  allowPrefixes?: string[]
  /** 覆盖默认拦截前缀 */
  denyPrefixes?: string[]
  /** 覆盖默认敏感 query key；传 `[]` 显式关闭该闸 */
  denyQueryKeys?: string[]
}

export function shouldTrack(input: unknown, opts?: ShouldTrackOptions): boolean

export function buildScriptTag(opts: { websiteId: string; scriptSrc?: string }): string

/**
 * 业务事件守卫（spec §6.5）。SSR 或 `window.umami.track` 未挂载时**静默 no-op**，永不抛错
 * （宿主抛错也吞掉）。`data` 省略时不传第二参。
 * @returns 是否真的送出
 */
export function trackEvent(name: string, data?: Record<string, unknown>): boolean
