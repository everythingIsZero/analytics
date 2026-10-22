/**
 * inject.test.mjs — 安全注入与运行时 before-send 守卫。
 *
 * 真实浏览器已在 2026-10-22 验证：insertAdjacentHTML 插入的 script 不执行
 * （标签在 DOM、无网络请求、window.umami undefined）；createElement + appendChild 正常执行。
 * 这里用最小假 DOM 锁住「注入方式」与「guard 行为」，防止回退到惰性插入。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BEFORE_SEND_NAME,
  createBeforeSend,
  injectUmami,
  installBeforeSend,
} from '../src/index.mjs'

function makeDoc() {
  const appended = []
  const doc = {
    head: {
      appendChild(el) {
        appended.push(el)
        el.isConnected = true
      },
    },
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        attrs: {},
        setAttribute(k, v) {
          this.attrs[k] = String(v)
        },
      }
    },
    querySelector(sel) {
      if (sel === 'script[data-website-id]') {
        return appended.find((el) => el.attrs['data-website-id']) || null
      }
      return null
    },
  }
  return { doc, appended }
}

test('createBeforeSend：私有前缀 /s/ 的上报返回 false', () => {
  const guard = createBeforeSend()
  assert.equal(guard('event', { url: 'https://fang.hxym18.com/s/token1' }), false)
})

test('createBeforeSend：敏感 hash query 返回 false', () => {
  const guard = createBeforeSend()
  assert.equal(
    guard('event', { url: 'https://nt.hxym18.com/#/pages/reader/index?shareId=abc' }),
    false,
  )
})

test('createBeforeSend：公开 hash 路由保留路由 path、去掉 hash query', () => {
  const guard = createBeforeSend()
  const out = guard('event', { url: 'https://nt.hxym18.com/#/pages/create/index?tab=1' })
  assert.equal(out.url, 'https://nt.hxym18.com/#/pages/create/index')
})

test('createBeforeSend：普通公开 URL 原样返回', () => {
  const guard = createBeforeSend()
  const payload = { url: 'https://www.hxym18.com/en?x=1', name: 'pageview' }
  assert.equal(guard('event', payload), payload)
  assert.equal(payload.url, 'https://www.hxym18.com/en?x=1')
})

test('installBeforeSend：window 存在时挂固定名函数；SSR 返回同名不抛错', () => {
  const prev = globalThis.window
  try {
    globalThis.window = {}
    const name = installBeforeSend()
    assert.equal(name, BEFORE_SEND_NAME)
    assert.equal(typeof globalThis.window[name], 'function')
  } finally {
    if (prev === undefined) delete globalThis.window
    else globalThis.window = prev
  }
  assert.equal(installBeforeSend(), BEFORE_SEND_NAME)
})

test('injectUmami：用 createElement + appendChild（不是 insertAdjacentHTML），带守卫属性', () => {
  const prevDoc = globalThis.document
  const prevWin = globalThis.window
  const { doc, appended } = makeDoc()
  try {
    globalThis.document = doc
    globalThis.window = {}
    const el = injectUmami({ websiteId: 'site-1' })
    assert.equal(el, appended[0])
    assert.equal(el.tagName, 'SCRIPT')
    assert.equal(el.attrs['data-website-id'], 'site-1')
    assert.equal(el.attrs['data-before-send'], BEFORE_SEND_NAME)
    assert.equal(el.src, 'https://u.hxym18.com/script.js')
    assert.equal(typeof globalThis.window[BEFORE_SEND_NAME], 'function')
  } finally {
    if (prevDoc === undefined) delete globalThis.document
    else globalThis.document = prevDoc
    if (prevWin === undefined) delete globalThis.window
    else globalThis.window = prevWin
  }
})

test('injectUmami：重复调用幂等，不插第二个脚本', () => {
  const prevDoc = globalThis.document
  const prevWin = globalThis.window
  const { doc, appended } = makeDoc()
  try {
    globalThis.document = doc
    globalThis.window = {}
    assert.ok(injectUmami({ websiteId: 'site-1' }))
    assert.equal(injectUmami({ websiteId: 'site-1' }), null)
    assert.equal(appended.length, 1)
  } finally {
    if (prevDoc === undefined) delete globalThis.document
    else globalThis.document = prevDoc
    if (prevWin === undefined) delete globalThis.window
    else globalThis.window = prevWin
  }
})

test('injectUmami：SSR / 空 id → null', () => {
  assert.equal(injectUmami({ websiteId: 'x' }), null)
  const prevDoc = globalThis.document
  const prevWin = globalThis.window
  const { doc } = makeDoc()
  try {
    globalThis.document = doc
    globalThis.window = {}
    assert.equal(injectUmami({ websiteId: '' }), null)
  } finally {
    if (prevDoc === undefined) delete globalThis.document
    else globalThis.document = prevDoc
    if (prevWin === undefined) delete globalThis.window
    else globalThis.window = prevWin
  }
})
