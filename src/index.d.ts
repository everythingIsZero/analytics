/** 默认 Umami 脚本地址 */
export const DEFAULT_SCRIPT_SRC: string
/** 默认拦截前缀（带 token/私有路由） */
export const DEFAULT_DENY_PREFIXES: readonly string[]
/** 默认拦截的敏感 query key（小写比较；`token`/`t`/`access_token`） */
export const DEFAULT_DENY_QUERY_KEYS: readonly string[]
/**
 * 默认拦截的敏感 **hash query** key（hash 路由，如 Taro H5 `/#/pages/reader/index?shareId=…`）。
 * 小写比较；与 nuantie `TOKEN_RE = /[?&](shareId|share|token|ticket)=/i` 覆盖面对齐。
 */
export const DEFAULT_DENY_HASH_KEYS: readonly string[]

/** 私密/带 token 页的 robots 元数据（`index`/`follow` 均 false），必须 noindex */
export const NOINDEX_ROBOTS: Readonly<{ index: false; follow: false }>

export function resolvePathname(input: unknown): string

/** Umami `data-before-send` 守卫的全局函数名 */
export const BEFORE_SEND_NAME: string

/** 造 `data-before-send` 守卫：私有/带 token URL 返回 false；hash 公开页去掉 hash query */
export function createBeforeSend(opts?: ShouldTrackOptions): (
  type: string,
  payload: Record<string, unknown>,
) => Record<string, unknown> | false

/** 把守卫装到 window，返回 data-before-send 用的函数名（SSR 不装） */
export function installBeforeSend(opts?: ShouldTrackOptions): string

/**
 * 安全注入 Umami 脚本（createElement + appendChild，脚本会真正执行）。
 * 默认安装 data-before-send 守卫。SSR / 无 id / 已存在同站脚本 → null。
 */
export function injectUmami(opts: {
  websiteId: string
  scriptSrc?: string
  attrs?: Record<string, string>
} & ShouldTrackOptions): HTMLScriptElement | null

/**
 * 客户端组件挂载调度：等 defer 执行窗口结束（DOMContentLoaded）后判定。
 * `window.umami` 已挂 = SSR 标签执行成功 → 保留，不再注入；否则删惰性标签并注入一份。
 */
export function mountUmami(
  opts: {
    trackable: boolean
    websiteId: string
    scriptSrc?: string
    attrs?: Record<string, string>
    /** SSR 渲染出的 `<script>` 元素（惰性时才删除） */
    ssrElement?: { remove?: () => void; parentNode?: unknown } | null
  } & ShouldTrackOptions,
): () => void

/** 取 hash 内 query 的小写 key（无 hash/无 query/非法 → `[]`） */
export function resolveHashQueryKeys(input: unknown): string[]

export interface ShouldTrackOptions {
  /** 给了则只有命中白名单才统计 */
  allowPrefixes?: string[]
  /** 覆盖默认拦截前缀 */
  denyPrefixes?: string[]
  /** 覆盖默认敏感 query key；传 `[]` 显式关闭该闸 */
  denyQueryKeys?: string[]
  /** 覆盖默认敏感 **hash query** key；传 `[]` 显式关闭该闸 */
  denyHashKeys?: string[]
}

export function shouldTrack(input: unknown, opts?: ShouldTrackOptions): boolean

/**
 * 产出 Umami `<script>` 标签（纯字符串，供无框架/静态站内联）。
 * `attrs` 供附加属性（P-1）：键须 `data-*`，否则抛 `TypeError`；值自动转义。
 */
export function buildScriptTag(opts: {
  websiteId: string
  scriptSrc?: string
  attrs?: Record<string, string>
}): string

/**
 * 业务事件守卫（spec §6.5）。SSR 或 `window.umami.track` 未挂载时**静默 no-op**，永不抛错
 * （宿主抛错也吞掉）。`data` 省略时不传第二参。
 * @returns 是否真的送出
 */
export function trackEvent(name: string, data?: Record<string, unknown>): boolean
