/**
 * core.mjs — 统计接入核心（零依赖纯函数）
 *
 * 为什么：Umami 原先由 fang/zitie/zbh 各写一份接入，其中 fang 的根布局漏了 `/s/*` 门控，
 * 导致带 token 的分享页也挂上统计（P0 泄漏）。本层把「哪些路径可统计」做成**可复用的门控**，
 * 消费方不再手写分支。默认拦截带 token/私有的路径，允许站点用白名单收窄到「公开内容页」。
 */

/** 默认 Umami 脚本地址（统一域名；与 analytics-seo.md 一致） */
export const DEFAULT_SCRIPT_SRC = 'https://u.hxym18.com/script.js'

/**
 * 默认拦截前缀：带 token 或私有的路由，一律不挂统计。
 * - `/s/` 分享 token（fang P0 泄漏源）
 * - `/r/` nuantie 分享
 * - `/api/` 服务端接口（不应被页面脚本覆盖）
 */
export const DEFAULT_DENY_PREFIXES = Object.freeze(['/s/', '/r/', '/api/'])

/**
 * 取 pathname：接受完整 URL 或裸路径，去 query/hash；非法/空落 `/`。
 * @param {unknown} input
 * @returns {string}
 */
export function resolvePathname(input) {
  const s = typeof input === 'string' ? input : ''
  if (!s) return '/'
  try {
    const u = new URL(s, 'http://localhost')
    return u.pathname || '/'
  } catch {
    return '/'
  }
}

/**
 * 是否应挂统计。
 * @param {unknown} pathname 当前路径（或完整 URL）
 * @param {{ allowPrefixes?: string[], denyPrefixes?: string[] }} [opts]
 *   allowPrefixes 给了则**只有**命中白名单才统计（登录墙/工具站收窄到公开内容页用）；
 *   denyPrefixes 覆盖默认拦截前缀（默认见 DEFAULT_DENY_PREFIXES）。
 * @returns {boolean}
 */
export function shouldTrack(pathname, opts) {
  const o = opts || {}
  const path = resolvePathname(pathname)
  if (Array.isArray(o.allowPrefixes)) {
    if (!o.allowPrefixes.some((p) => typeof p === 'string' && path.startsWith(p))) return false
  }
  const deny = Array.isArray(o.denyPrefixes) ? o.denyPrefixes : DEFAULT_DENY_PREFIXES
  if (deny.some((p) => typeof p === 'string' && path.startsWith(p))) return false
  return true
}

/** HTML 属性值转义（防破标签/注入） */
function escapeAttr(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 产出 Umami `<script>` 标签（纯字符串，供无框架/静态站内联；React 站用 `@hxym18/analytics/react`）。
 * @param {{ websiteId: string, scriptSrc?: string }} opts
 * @returns {string}
 */
export function buildScriptTag(opts) {
  const o = opts || {}
  const src = escapeAttr(o.scriptSrc || DEFAULT_SCRIPT_SRC)
  const id = escapeAttr(o.websiteId || '')
  return `<script defer src="${src}" data-website-id="${id}"></script>`
}
