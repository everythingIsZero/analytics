/**
 * react-client.ssr.test.mjs — 客户端组件内核（运行时路径 + query 门控）
 *
 * 为什么能在 node:test 里跑：内核在 `react-client-base.mjs`，**不 import next**，
 * next 的两个 hook 由工厂注入。这里注入读可变 state 的假 hook，用 react-dom/server
 * 渲染，即可验证「按运行时路径/query 判定」与「SPA 切换后门控仍生效」，无需真实 Next 运行时。
 *
 * 关键（RF1）：运行时 query 带 token → 返回 null，不产出 script。
 * 关键（RF3）：同一组件，路径从公开切到私有/带 token 后重渲染 → 不再产出 script。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createUmamiScriptClient } from '../src/react-client-base.mjs'

/** 造一个带可变导航 state 的客户端组件；render 时可改 state 模拟 SPA 切换。 */
function makeClient(initial = { pathname: '/', search: '' }) {
  const state = { ...initial }
  const hooks = {
    usePathname: () => state.pathname,
    useSearchParams: () => new URLSearchParams(state.search),
  }
  const UmamiScriptClient = createUmamiScriptClient(hooks)
  return {
    state,
    render: (props) => renderToStaticMarkup(React.createElement(UmamiScriptClient, props)),
  }
}

test('UmamiScriptClient：公开路径 + 干净 query → 产出 script 标签', () => {
  const { render } = makeClient({ pathname: '/blog/post', search: 'utm=x=1' })
  const html = render({ websiteId: 'abc-123' })
  assert.match(html, /<script\b/)
  assert.match(html, /data-website-id="abc-123"/)
  assert.match(html, /u\.hxym18\.com\/script\.js/)
})

test('UmamiScriptClient：运行时 query 带 token/t/access_token → null，不产出脚本（RF1 核心）', () => {
  for (const search of ['token=abc', 't=abc', 'access_token=abc']) {
    const { render } = makeClient({ pathname: '/ledger', search })
    assert.equal(render({ websiteId: 'abc-123' }), '', `search="${search}" 必须被拦`)
  }
})

test('UmamiScriptClient：敏感 query 大小写不敏感（?Token= 也拦）', () => {
  const { render } = makeClient({ pathname: '/ledger', search: 'Token=abc' })
  assert.equal(render({ websiteId: 'abc-123' }), '')
})

test('UmamiScriptClient：私有前缀 /s/ → null（运行时路径判定）', () => {
  const { render } = makeClient({ pathname: '/s/tok123', search: '' })
  assert.equal(render({ websiteId: 'x' }), '')
})

test('UmamiScriptClient：SPA 切换——公开路径切到 /s/ 后重渲染不再产出脚本（RF3）', () => {
  const client = makeClient({ pathname: '/browse', search: '' })
  assert.match(client.render({ websiteId: 'x' }), /data-website-id="x"/, '初始公开页应产出脚本')
  // 模拟 SPA 客户端切换：同一组件、hook 返回值变化
  client.state.pathname = '/s/secret'
  assert.equal(client.render({ websiteId: 'x' }), '', '切到私有路径后不得再产出脚本')
})

test('UmamiScriptClient：SPA 切换——公开路径追加 token query 后重渲染不再产出脚本（RF3）', () => {
  const client = makeClient({ pathname: '/browse', search: '' })
  assert.match(client.render({ websiteId: 'x' }), /data-website-id="x"/)
  client.state.search = 'token=leak'
  assert.equal(client.render({ websiteId: 'x' }), '', '切到带 token 后不得再产出脚本')
})

test('UmamiScriptClient：websiteId 为空 → null（仍无条件调用 hook，遵守 hooks 规则）', () => {
  const { render } = makeClient({ pathname: '/', search: '' })
  assert.equal(render({ websiteId: '' }), '')
  assert.equal(render({}), '')
})

test('UmamiScriptClient：allowPrefixes / denyQueryKeys 透传生效', () => {
  const { render } = makeClient({ pathname: '/mine', search: '' })
  assert.equal(render({ websiteId: 'x', allowPrefixes: ['/blog'] }), '')
  const off = makeClient({ pathname: '/ledger', search: 'token=x' })
  assert.match(off.render({ websiteId: 'x', denyQueryKeys: [] }), /data-website-id="x"/)
})

test('UmamiScriptClient：路径 hook 返回 null/空串 → fail-closed 不产出脚本（未知路径不当公开页）', () => {
  for (const bad of [null, undefined, '']) {
    const c = createUmamiScriptClient({ usePathname: () => bad, useSearchParams: () => new URLSearchParams('') })
    assert.equal(renderToStaticMarkup(React.createElement(c, { websiteId: 'abc' })), '')
  }
})

test('包 exports 暴露 react/client/base：非 Next 站无 next 时可取到内核（否则顶层 import next 会加载失败）', async () => {
  const { readFileSync } = await import('node:fs')
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(pkg.exports['./react/client/base'].import, './src/react-client-base.mjs')
  const src = readFileSync(new URL('../src/react-client-base.mjs', import.meta.url), 'utf8')
  assert.ok(!/^import\b[^\n]*from ['"]next\//m.test(src), '内核不得 import next')
})
