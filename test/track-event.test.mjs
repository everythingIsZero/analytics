/**
 * track-event.test.mjs — 业务事件守卫（spec §6.5：`window.umami.track` 守卫）
 *
 * 为什么：站点直接写 `window.umami.track(...)` 有两处会炸——SSR 无 window；
 * Umami 脚本被门控拦下（私有页）或加载失败时 umami 未挂载。本层把「有没有宿主」收进纯函数，
 * 永不抛错，业务代码只管调用。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trackEvent } from '../src/index.mjs'

/** 临时挂一个假 window 跑完回调，保证不污染其他测试 */
function withWindow(win, fn) {
  const had = 'window' in globalThis
  const prev = globalThis.window
  globalThis.window = win
  try {
    return fn()
  } finally {
    if (had) globalThis.window = prev
    else delete globalThis.window
  }
}

test('trackEvent：SSR（无 window）静默 no-op，返回 false', () => {
  assert.equal(typeof globalThis.window, 'undefined')
  assert.equal(trackEvent('signup'), false)
})

test('trackEvent：window 存在但 umami / umami.track 缺失 → 静默 no-op，返回 false', () => {
  assert.equal(withWindow({}, () => trackEvent('signup')), false)
  assert.equal(withWindow({ umami: {} }, () => trackEvent('signup')), false)
  assert.equal(withWindow({ umami: { track: 'nope' } }, () => trackEvent('signup')), false)
})

test('trackEvent：宿主存在 → 调用并透传 (name, data)，返回 true', () => {
  const calls = []
  const w = { umami: { track: (...args) => calls.push(args) } }
  assert.equal(withWindow(w, () => trackEvent('signup', { plan: 'pro' })), true)
  assert.deepEqual(calls, [['signup', { plan: 'pro' }]])
})

test('trackEvent：data 省略时不传第二参（保持 umami 默认事件语义）', () => {
  const calls = []
  const w = { umami: { track: (...args) => calls.push(args) } }
  withWindow(w, () => trackEvent('page_view'))
  assert.equal(calls[0].length, 1)
  assert.deepEqual(calls[0], ['page_view'])
})

test('trackEvent：宿主实现抛错被吞掉，不冒泡，返回值语义不变（未送出 → false）', () => {
  const w = { umami: { track: () => { throw new Error('boom') } } }
  let result
  assert.doesNotThrow(() => { result = trackEvent('signup', { a: 1 }) })
  assert.equal(result, false)
})
