/**
 * core.test.mjs — 统计接入核心（node:test，零依赖纯函数）
 * 关键：带 token/私有的路径绝不挂统计（fang `/s/*` P0 泄漏的根因就是各站手写门控漏了）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_DENY_PREFIXES,
  DEFAULT_DENY_QUERY_KEYS,
  NOINDEX_ROBOTS,
  resolvePathname,
  shouldTrack,
  buildScriptTag,
} from '../src/index.mjs'

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

test('shouldTrack：query 含敏感 key（token/t/access_token）不统计；干净 query 正常', () => {
  assert.equal(shouldTrack('https://x/ledger?token=abc'), false)
  assert.equal(shouldTrack('https://x/ledger?t=abc'), false)
  assert.equal(shouldTrack('https://x/ledger?access_token=abc'), false)
  assert.equal(shouldTrack('https://x/blog?a=1&b=2'), true)
  assert.equal(shouldTrack('https://x/blog'), true)
})

test('shouldTrack：query key 大小写不敏感（?Token= / ?ACCESS_TOKEN= 也要拦）', () => {
  assert.equal(shouldTrack('https://x/ledger?Token=abc'), false)
  assert.equal(shouldTrack('https://x/ledger?ACCESS_TOKEN=abc'), false)
})

test('shouldTrack：裸路径带 query（SPA/客户端组件组串）同样按 query 判定', () => {
  // 客户端组件把 usePathname() + '?' + useSearchParams() 交给 shouldTrack，形如 '/ledger?token=x'
  assert.equal(shouldTrack('/ledger?token=x'), false)
  assert.equal(shouldTrack('/ledger?t=x'), false)
  assert.equal(shouldTrack('/ledger?a=1'), true)
})

test('shouldTrack：敏感 query 命中优先于路径放行（公开路径 + token query 也拦）', () => {
  assert.equal(shouldTrack('/blog/post?access_token=leak'), false)
})

test('shouldTrack：denyQueryKeys 传 [] 显式关闭该闸（覆盖默认）', () => {
  assert.equal(shouldTrack('/ledger?token=x', { denyQueryKeys: [] }), true)
  assert.equal(shouldTrack('/ledger?token=x', { denyQueryKeys: ['custom'] }), true)
  assert.equal(shouldTrack('/ledger?custom=x', { denyQueryKeys: ['custom'] }), false)
})

test('shouldTrack：query 判定不回归原路径前缀逻辑', () => {
  assert.equal(shouldTrack('/s/tok?utm=x=1'), false)
  assert.equal(shouldTrack('/api/me?token=x'), false)
  assert.equal(shouldTrack('/browse?token=x'), false)
  assert.equal(shouldTrack('/browse'), true)
})

test('DEFAULT_DENY_QUERY_KEYS：含 token/t/access_token', () => {
  assert.deepEqual([...DEFAULT_DENY_QUERY_KEYS], ['token', 't', 'access_token'])
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

test('buildScriptTag：属性值转义（防破标签/注入）', () => {
  const tag = buildScriptTag({ websiteId: 'a"b<c>&d', scriptSrc: 'https://x/y?a=1&b=2' })
  assert.ok(!tag.includes('a"b'), '原始引号不得出现在标签里')
  assert.match(tag, /data-website-id="a&quot;b&lt;c&gt;&amp;d"/)
  assert.match(tag, /src="https:\/\/x\/y\?a=1&amp;b=2"/)
})

test('DEFAULT_DENY_PREFIXES：包含 /s/ 与 /r/', () => {
  assert.ok(DEFAULT_DENY_PREFIXES.includes('/s/'))
  assert.ok(DEFAULT_DENY_PREFIXES.includes('/r/'))
  assert.ok(Object.isFrozen(DEFAULT_DENY_PREFIXES))
})

test('NOINDEX_ROBOTS：私密/带 token 页用（index/follow 均 false）', () => {
  assert.deepEqual(NOINDEX_ROBOTS, { index: false, follow: false })
  assert.ok(Object.isFrozen(NOINDEX_ROBOTS))
})
