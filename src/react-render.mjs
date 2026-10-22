/**
 * react-render.mjs — Umami `<script>` React 元素的**单一渲染实现**
 *
 * 为什么抽出：SSR 组件（react.mjs）与客户端组件内核（react-client-base.mjs）必须产出**同形**标签；
 * 两处各写一份容易漂移。此模块只依赖 react，不依赖框架运行时的路径 hook。
 */
import { createElement } from 'react'
import { BEFORE_SEND_NAME, DEFAULT_SCRIPT_SRC, resolveAttrs } from './core.mjs'

/**
 * 造 Umami `<script defer src=... data-website-id=... data-before-send=...>` React 元素。
 * `attrs` 供附加属性（P-1，如 hash 路由站的 `{ 'data-exclude-hash': 'true' }`）；
 * 键白名单与报错口径与 `buildScriptTag` 同一实现（`core.resolveAttrs`），两处不漂移。
 *
 * `data-before-send` 固定指向共享守卫（`installBeforeSend` 安装）；调用方不得覆盖，
 * 否则 SPA 切到私有路由后仍会上报。
 * @param {{ websiteId: string, scriptSrc?: string, attrs?: Record<string, string> }} opts
 */
export function buildScriptElement(opts) {
  const o = opts || {}
  return createElement('script', {
    defer: true,
    src: o.scriptSrc || DEFAULT_SCRIPT_SRC,
    'data-website-id': o.websiteId,
    ...resolveAttrs(o.attrs, 'buildScriptElement'),
    'data-before-send': BEFORE_SEND_NAME,
  })
}
