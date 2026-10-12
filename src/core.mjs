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
 * 默认拦截的敏感 query key：URL 带这些参数即视为私密/凭证链接，一律不统计。
 * 比较时统一小写（`?Token=` 与 `?token=` 等价）。
 * - `token`：通用分享/访问 token
 * - `t`：短链 token
 * - `access_token`：OAuth/SSO 回跳携带
 */
export const DEFAULT_DENY_QUERY_KEYS = Object.freeze(['token', 't', 'access_token'])

/**
 * 默认拦截的敏感 **hash query** key：hash 路由（Taro H5 / HashRouter）把路由与参数放在
 * `#` 之后，`location.search` 为空、pathname 恒为 `/`（Taro 阅读页形如
 * `/#/pages/reader/index?shareId=…`）——只扫 `?search` 会漏拦，token 仍会上报。
 *
 * 覆盖面与 nuantie 现有本地门控 `TOKEN_RE = /[?&](shareId|share|token|ticket)=/i` 对齐
 * （`shareId`/`share`/`token`/`ticket`），并补齐 search 侧已有的敏感键（`t`/`access_token`）。
 * 比较时统一小写（`?ShareId=` 与 `?shareid=` 等价）。
 */
export const DEFAULT_DENY_HASH_KEYS = Object.freeze([
  'token',
  't',
  'access_token',
  'shareid',
  'share',
  'ticket',
])

/**
 * 私密/带 token 页的 robots 元数据：**必须 noindex**，避免凭证页被搜索引擎收录。
 * 与门控互补——门控管「不上报统计」，此常量管「不被索引」，二者都要。
 * Next 用法：`export const metadata = { robots: NOINDEX_ROBOTS }`。
 */
export const NOINDEX_ROBOTS = Object.freeze({ index: false, follow: false })

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
 * 解析 query key 集合：接受完整 URL 或裸路径（含 `?query`），返回小写 key 数组；非法/无 query 落 `[]`。
 * @param {unknown} input
 * @returns {string[]}
 */
export function resolveQueryKeys(input) {
  const s = typeof input === 'string' ? input : ''
  if (!s) return []
  try {
    const u = new URL(s, 'http://localhost')
    return [...u.searchParams.keys()].map((k) => k.toLowerCase())
  } catch {
    return []
  }
}

/**
 * 解析 hash 内 query 的 key 集合：接受完整 URL 或裸路径（含 `#...?query`），
 * 返回小写 key 数组；无 hash / hash 内无 query / 非法 → `[]`。
 *
 * 为什么单独一个：hash 路由的参数**不在** `URL.searchParams` 里（Taro H5 `location.search` 为空），
 * 必须从 `URL.hash`（形如 `#/pages/reader/index?shareId=1`）里再取一次 `?` 后的 query。
 * @param {unknown} input
 * @returns {string[]}
 */
export function resolveHashQueryKeys(input) {
  const s = typeof input === 'string' ? input : ''
  if (!s) return []
  let hash = ''
  try {
    hash = new URL(s, 'http://localhost').hash
  } catch {
    return []
  }
  if (!hash) return []
  const qi = hash.indexOf('?')
  if (qi === -1) return []
  try {
    return [...new URLSearchParams(hash.slice(qi + 1)).keys()].map((k) => k.toLowerCase())
  } catch {
    return []
  }
}

/**
 * 是否应挂统计。
 * @param {unknown} input 当前路径（或完整 URL；裸路径可带 `?query`）
 * @param {{ allowPrefixes?: string[], denyPrefixes?: string[], denyQueryKeys?: string[], denyHashKeys?: string[] }} [opts]
 *   allowPrefixes 给了则**只有**命中白名单才统计（登录墙/工具站收窄到公开内容页用）；
 *   denyPrefixes 覆盖默认拦截前缀（默认见 DEFAULT_DENY_PREFIXES）；
 *   denyQueryKeys 覆盖默认敏感 query key（默认见 DEFAULT_DENY_QUERY_KEYS；传 `[]` 显式关闭该闸）；
 *   denyHashKeys 覆盖默认敏感 **hash query** key（默认见 DEFAULT_DENY_HASH_KEYS；传 `[]` 显式关闭该闸）。
 * @returns {boolean}
 */
export function shouldTrack(input, opts) {
  const o = opts || {}
  // 先查 query：带敏感 token 的 URL 一律不统计（含公开路径），避免凭证随上报泄漏。
  const denyKeys = Array.isArray(o.denyQueryKeys)
    ? o.denyQueryKeys.map((k) => String(k).toLowerCase())
    : DEFAULT_DENY_QUERY_KEYS
  if (denyKeys.length) {
    const keys = resolveQueryKeys(input)
    if (keys.some((k) => denyKeys.includes(k))) return false
  }
  // 再查 hash query：hash 路由（Taro H5）的 token 在 `#` 之后，独立于 search 的那道闸。
  const denyHash = Array.isArray(o.denyHashKeys)
    ? o.denyHashKeys.map((k) => String(k).toLowerCase())
    : DEFAULT_DENY_HASH_KEYS
  if (denyHash.length) {
    const hkeys = resolveHashQueryKeys(input)
    if (hkeys.some((k) => denyHash.includes(k))) return false
  }
  const path = resolvePathname(input)
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

/**
 * 业务事件守卫（spec §6.5）：站点直接写 `window.umami.track(...)` 有两处会炸——
 * ① SSR 无 `window`；② Umami 脚本被门控拦下（私有页）或加载失败时 `umami` 未挂载。
 * 本函数把「宿主在不在」收进一处，业务代码只管调用：
 * - `typeof window === 'undefined'` → 静默 no-op（SSR 安全）；
 * - `window.umami.track` 非函数 → 静默 no-op（脚本未挂载不报错）；
 * - 存在 → 透传 `(name, data)`（`data` 省略时不传第二参，保持 Umami 默认事件语义）；
 * - **永不抛错**：宿主实现抛错也吞掉（像 share-kit 的 `send`），不冒泡到用户动作。
 * @param {string} name 事件名
 * @param {Record<string, unknown>} [data] 事件属性（可选）
 * @returns {boolean} 是否真的送出（宿主缺失或抛错 → false）
 */
export function trackEvent(name, data) {
  if (typeof window === 'undefined') return false
  const umami = window.umami
  if (!umami || typeof umami.track !== 'function') return false
  try {
    if (data === undefined) umami.track(name)
    else umami.track(name, data)
    return true
  } catch {
    // fire-and-forget：统计失败不影响用户动作
    return false
  }
}
