/**
 * core.test.mjs — 统计接入核心（node:test，零依赖纯函数）
 * 关键：带 token/私有的路径绝不挂统计（fang `/s/*` P0 泄漏的根因就是各站手写门控漏了）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DENY_PREFIXES, resolvePathname, shouldTrack, buildScriptTag } from '../src/index.mjs'

test('shouldTrack：默认拦截带 token/私有前缀（/s/ /r/ /api/）', () => {
  assert.equal(shouldTrack('/s/abc123'), false)
  assert.equal(shouldTrack('/r/42'), false)
  assert.equal(shouldTrack('/api/ops/stats'), false)
})

test('shouldTrack：公开路径放行；query/hash 不影响判定', () => {
  assert.equal(shouldTrack('/'), true)
  assert.equal(shouldTrack('/browse'), true)
  assert.equal(shouldTrack('/s/abc?utm=x=1'), false)
  assert.equal(shouldTrack('/?q=1'), true)
})

test('shouldTrack：空/未给 pathname 落根路径判定', () => {
  assert.equal(shouldTrack(''), true)
  assert.equal(shouldTrack(undefined), true)
})

test('shouldTrack：allowPrefixes 白名单生效（非白名单一律不统计）', () => {
  const opts = { allowPrefixes: ['/blog', '/poems'] }
  assert.equal(shouldTrack('/blog/post', opts), true)
  assert.equal(shouldTrack('/poems/1', opts), true)
  assert.equal(shouldTrack('/mine', opts), false)
})

test('shouldTrack：denyPrefixes 可覆盖默认（收窄或加严）', () => {
  assert.equal(shouldTrack('/s/x', { denyPrefixes: ['/only-this'] }), true)
  assert.equal(shouldTrack('/only-this/x', { denyPrefixes: ['/only-this'] }), false)
})

test('resolvePathname：从完整 URL 或裸路径取 pathname，去 query/hash', () => {
  assert.equal(resolvePathname('https://ka.hxym18.com/s/tok?x=1#h'), '/s/tok')
  assert.equal(resolvePathname('/mine?a=1'), '/mine')
  assert.equal(resolvePathname('/'), '/')
  assert.equal(resolvePathname(''), '/')
})

test('buildScriptTag：产出 umami script 标签，属性完整', () => {
  const tag = buildScriptTag({ websiteId: 'abc-123' })
  assert.match(tag, /<script\b/)
  assert.match(tag, /defer/)
  assert.match(tag, /data-website-id="abc-123"/)
  assert.match(tag, /src="https:\/\/u\.hxym18\.com\/script\.js"/)
})

test('buildScriptTag：可覆盖 scriptSrc', () => {
  const tag = buildScriptTag({ websiteId: 'x', scriptSrc: 'https://cdn.example/s.js' })
  assert.match(tag, /src="https:\/\/cdn\.example\/s\.js"/)
})

test('DEFAULT_DENY_PREFIXES：包含 /s/ 与 /r/', () => {
  assert.ok(DEFAULT_DENY_PREFIXES.includes('/s/'))
  assert.ok(DEFAULT_DENY_PREFIXES.includes('/r/'))
  assert.ok(Object.isFrozen(DEFAULT_DENY_PREFIXES))
})
