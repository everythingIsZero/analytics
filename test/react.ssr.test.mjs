/**
 * react.ssr.test.mjs — UmamiScript 组件层（SSR；验证门控在组件内生效）
 * 关键：带 token 路径（/s/）必须返回 null，不产出 script 标签。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { UmamiScript } from '../src/react.mjs'

const render = (props) => renderToStaticMarkup(React.createElement(UmamiScript, props))

test('UmamiScript：公开页 → 产出 script 标签（含 website id）', () => {
  const html = render({ websiteId: 'abc-123', pathname: '/' })
  assert.match(html, /data-website-id="abc-123"/)
  assert.match(html, /u\.hxym18\.com\/script\.js/)
})

test('UmamiScript：带 token 路径 /s/ → 返回 null，不产出脚本（防泄漏）', () => {
  assert.equal(render({ websiteId: 'abc-123', pathname: '/s/tok123' }), '')
})

test('UmamiScript：/r/ 与 /api/ 同样被拦', () => {
  assert.equal(render({ websiteId: 'x', pathname: '/r/42' }), '')
  assert.equal(render({ websiteId: 'x', pathname: '/api/ops/stats' }), '')
})

test('UmamiScript：无 websiteId → 返回 null', () => {
  assert.equal(render({ pathname: '/' }), '')
})

test('UmamiScript：allowPrefixes 白名单生效（非白名单不产出）', () => {
  assert.equal(render({ websiteId: 'x', pathname: '/mine', allowPrefixes: ['/blog'] }), '')
  assert.match(render({ websiteId: 'x', pathname: '/blog/post', allowPrefixes: ['/blog'] }), /data-website-id="x"/)
})

test('UmamiScript：hash 路由 pathname 带敏感 hash query → 不产出脚本（Taro/HashRouter）', () => {
  assert.equal(render({ websiteId: 'x', pathname: '/#/pages/reader/index?shareId=1' }), '')
  assert.match(render({ websiteId: 'x', pathname: '/#/pages/index/index?tab=1' }), /data-website-id="x"/)
})

test('UmamiScript：denyHashKeys 透传（覆盖/关闭 hash 闸）', () => {
  assert.equal(render({ websiteId: 'x', pathname: '/#/x?custom=1', denyHashKeys: ['custom'] }), '')
  assert.match(
    render({ websiteId: 'x', pathname: '/#/x?token=1', denyHashKeys: [] }),
    /data-website-id="x"/,
  )
})
