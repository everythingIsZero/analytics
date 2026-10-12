/**
 * hash-route.test.mjs — hash 路由（Taro H5 / HashRouter）门控
 *
 * 为什么：Taro H5 是 hash 路由，nuantie 阅读/报名页形如
 * `/#/pages/reader/index?shareId=…`；`location.search` 为空、pathname 恒为 `/`，
 * token 只在 hash query 里。旧 `shouldTrack` 只读 pathname + search → **漏拦**（P0 泄漏面）。
 * 本文件先写反例（改前应红），实现 hash query 扫描后转绿。
 *
 * 覆盖面目标是 nuantie 现有本地门控的 `TOKEN_RE = /[?&](shareId|share|token|ticket)=/i`
 * （见 nuantie `apps/client/src/lib/analytics-gate.ts:16`）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldTrack, DEFAULT_DENY_HASH_KEYS, resolveHashQueryKeys } from '../src/index.mjs'

test('shouldTrack：hash 路由 query 带敏感键 → 不统计（Taro/HashRouter；改前漏拦）', () => {
  assert.equal(shouldTrack('/#/pages/reader/index?shareId=1'), false)
  assert.equal(shouldTrack('/#/pages/reader/index?token=1'), false)
  assert.equal(shouldTrack('/#/pages/reader/index?ticket=1'), false)
  assert.equal(shouldTrack('/#/pages/reader/index?share=1'), false)
  assert.equal(shouldTrack('/#/pages/reader/index?t=1'), false)
  assert.equal(shouldTrack('/#/pages/reader/index?access_token=1'), false)
})

test('shouldTrack：hash query 大小写不敏感（?ShareId= / ?TOKEN= / ?Access_Token=）', () => {
  assert.equal(shouldTrack('/#/x?ShareId=1'), false)
  assert.equal(shouldTrack('/#/x?TOKEN=1'), false)
  assert.equal(shouldTrack('/#/x?Access_Token=1'), false)
})

test('shouldTrack：公开 hash 路由（无敏感键）仍统计', () => {
  assert.equal(shouldTrack('/#/pages/index/index'), true)
  assert.equal(shouldTrack('/#/pages/index/index?tab=1'), true)
})

test('shouldTrack：完整 URL 的 hash query 同样拦（裸路径与完整 URL 一致）', () => {
  assert.equal(shouldTrack('https://nuantie.hxym18.com/#/pages/reader/index?shareId=abc'), false)
  assert.equal(shouldTrack('https://nuantie.hxym18.com/#/pages/index/index?tab=1'), true)
})

test('shouldTrack：敏感键混在 hash 的多参 query 里也拦（不是只看第一个）', () => {
  assert.equal(shouldTrack('/#/pages/reader/index?v=2&shareId=1&utm=x'), false)
})

test('shouldTrack：denyHashKeys 可覆盖；传 [] 显式关闭 hash 闸', () => {
  // 覆盖：给了数组则以数组为准（默认敏感键不再生效，与 denyQueryKeys 语义一致）
  assert.equal(shouldTrack('/#/x?token=1', { denyHashKeys: ['custom'] }), true)
  assert.equal(shouldTrack('/#/x?custom=1', { denyHashKeys: ['custom'] }), false)
  // 显式 [] 关闭 hash 闸：hash 里的 token 不再拦（向后兼容逃生门）
  assert.equal(shouldTrack('/#/x?token=1', { denyHashKeys: [] }), true)
})

test('shouldTrack：hash 闸与 query 闸相互独立（denyQueryKeys:[] 不能关掉 hash 闸）', () => {
  assert.equal(shouldTrack('/#/x?shareId=1', { denyQueryKeys: [] }), false)
  assert.equal(shouldTrack('/?shareId=1', { denyQueryKeys: [] }), true, 'search 侧 shareId 不在本次默认范围')
})

test('shouldTrack：denyHashKeys 可追加（展开默认敏感键）', () => {
  const opts = { denyHashKeys: [...DEFAULT_DENY_HASH_KEYS, 'custom'] }
  assert.equal(shouldTrack('/#/x?custom=1', opts), false, '追加键须生效')
  assert.equal(shouldTrack('/#/x?token=1', opts), false, '默认敏感键仍在')
})

test('DEFAULT_DENY_HASH_KEYS：含 token/t/access_token/shareId/share/ticket，且冻结', () => {
  assert.deepEqual([...DEFAULT_DENY_HASH_KEYS].sort(), ['access_token', 'share', 'shareid', 't', 'ticket', 'token'])
  assert.ok(Object.isFrozen(DEFAULT_DENY_HASH_KEYS))
})

test('resolveHashQueryKeys：取 hash 内 query 的小写 key；无 hash / 无 query 落 []', () => {
  assert.deepEqual(resolveHashQueryKeys('/#/a/b?shareId=1&t=2'), ['shareid', 't'])
  assert.deepEqual(resolveHashQueryKeys('https://x/#/a?token=1'), ['token'])
  assert.deepEqual(resolveHashQueryKeys('/#/a/b'), [])
  assert.deepEqual(resolveHashQueryKeys('/no/hash?token=1'), [], 'search 侧 token 不算 hash key')
  assert.deepEqual(resolveHashQueryKeys('https://x/no-hash'), [])
  assert.deepEqual(resolveHashQueryKeys(''), [])
  assert.deepEqual(resolveHashQueryKeys(undefined), [])
})

test('shouldTrack：无 hash 的既有行为不回归（默认前缀 + search query）', () => {
  assert.equal(shouldTrack('/s/abc123'), false)
  assert.equal(shouldTrack('/api/ops/stats'), false)
  assert.equal(shouldTrack('/browse'), true)
  assert.equal(shouldTrack('/ledger?token=x'), false)
  assert.equal(shouldTrack('/blog?a=1'), true)
})
