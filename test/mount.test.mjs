/**
 * mount.test.mjs — 客户端组件挂载调度（防双 tracker）
 *
 * 背景（2026-10-29 hmd 实测）：SSR 出的 `<script defer>` 先执行完，effect 又删掉并注入
 * 第二份 → 一次访问 2 次 `/api/send`，访问时长恒 0 秒。反向时序同样危险：标签已入队但
 * 尚未执行时 `window.umami` 仍是 undefined，此时删除再注入，排队脚本仍会执行。
 *
 * 判据：defer 脚本一律在 DOMContentLoaded 前执行完，所以决策必须等 DCL；已执行就保留，
 * 未执行（惰性/失败）才删掉并补注入。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { BEFORE_SEND_NAME, mountUmami } from '../src/index.mjs'

function makeDoc(readyState = 'loading') {
  const appended = []
  const listeners = []
  return {
    doc: {
      readyState,
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
      addEventListener(type, fn) {
        if (type === 'DOMContentLoaded') listeners.push(fn)
      },
      removeEventListener(type, fn) {
        if (type !== 'DOMContentLoaded') return
        const i = listeners.indexOf(fn)
        if (i >= 0) listeners.splice(i, 1)
      },
    },
    appended,
    fireDcl() {
      for (const fn of listeners.splice(0)) fn()
    },
    listeners,
  }
}

function makeSsrEl() {
  return {
    removed: false,
    parentNode: {},
    remove() {
      this.removed = true
      this.parentNode = null
    },
  }
}

function withGlobals(doc, win, fn) {
  const prevDoc = globalThis.document
  const prevWin = globalThis.window
  globalThis.document = doc
  globalThis.window = win
  try {
    return fn()
  } finally {
    if (prevDoc === undefined) delete globalThis.document
    else globalThis.document = prevDoc
    if (prevWin === undefined) delete globalThis.window
    else globalThis.window = prevWin
  }
}

test('mountUmami：SSR 标签已执行（window.umami）→ 保留标签，不注入第二份', () => {
  const { doc, appended } = makeDoc('complete')
  const ssr = makeSsrEl()
  withGlobals(doc, { umami: { track() {} } }, () => {
    mountUmami({ trackable: true, websiteId: 'site-1', ssrElement: ssr })
  })
  assert.equal(ssr.removed, false)
  assert.equal(appended.length, 0)
})

test('mountUmami：DCL 前不决策——标签已入队未执行时不得删（排队脚本仍会跑）', () => {
  const { doc, appended, fireDcl } = makeDoc('loading')
  const ssr = makeSsrEl()
  withGlobals(doc, {}, () => {
    mountUmami({ trackable: true, websiteId: 'site-1', ssrElement: ssr })
    assert.equal(ssr.removed, false, 'DCL 前不得删除 SSR 标签')
    assert.equal(appended.length, 0, 'DCL 前不得注入')
    // DCL 时标签执行成功：保留
    globalThis.window.umami = { track() {} }
    fireDcl()
    assert.equal(ssr.removed, false)
    assert.equal(appended.length, 0)
  })
})

test('mountUmami：DCL 时仍无 tracker（惰性/加载失败）→ 删惰性标签并注入一份', () => {
  const { doc, appended, fireDcl } = makeDoc('loading')
  const ssr = makeSsrEl()
  withGlobals(doc, {}, () => {
    mountUmami({ trackable: true, websiteId: 'site-1', ssrElement: ssr })
    fireDcl()
    assert.equal(ssr.removed, true)
    assert.equal(appended.length, 1)
    assert.equal(appended[0].attrs['data-website-id'], 'site-1')
    assert.equal(typeof globalThis.window[BEFORE_SEND_NAME], 'function', '必须装运行时守卫')
  })
})

test('mountUmami：页面已 complete（客户端导航）且无 tracker → 立即补注入', () => {
  const { doc, appended } = makeDoc('complete')
  const ssr = makeSsrEl()
  withGlobals(doc, {}, () => {
    mountUmami({ trackable: true, websiteId: 'site-1', ssrElement: ssr })
  })
  assert.equal(ssr.removed, true)
  assert.equal(appended.length, 1)
})

test('mountUmami：trackable=false → 不注册监听、不注入、不删标签', () => {
  const { doc, appended, listeners } = makeDoc('loading')
  const ssr = makeSsrEl()
  withGlobals(doc, {}, () => {
    mountUmami({ trackable: false, websiteId: 'site-1', ssrElement: ssr })
  })
  assert.equal(listeners.length, 0)
  assert.equal(ssr.removed, false)
  assert.equal(appended.length, 0)
})

test('mountUmami：interactive 也必须等 DCL（defer 可能只执行了一部分）', () => {
  const { doc, appended, listeners, fireDcl } = makeDoc('interactive')
  const ssr = makeSsrEl()
  withGlobals(doc, {}, () => {
    mountUmami({ trackable: true, websiteId: 'site-1', ssrElement: ssr })
    assert.equal(ssr.removed, false, 'interactive 不得立即决策')
    assert.equal(appended.length, 0)
    assert.equal(listeners.length, 1)
    fireDcl()
  })
  assert.equal(ssr.removed, true)
  assert.equal(appended.length, 1)
})

test('mountUmami：多次 render（cancel 后重新注册）→ DCL 仍只注入一份', () => {
  const { doc, appended, listeners, fireDcl } = makeDoc('loading')
  const ssr = makeSsrEl()
  withGlobals(doc, {}, () => {
    mountUmami({ trackable: true, websiteId: 'site-1', ssrElement: ssr })()
    mountUmami({ trackable: true, websiteId: 'site-1', ssrElement: ssr })
    assert.equal(listeners.length, 1, '旧帧监听必须已被 cleanup 移除')
    fireDcl()
  })
  assert.equal(appended.length, 1)
})

test('mountUmami：cancel（门控翻转/卸载）后 DCL 不得再用旧帧注入', () => {
  const { doc, appended, listeners, fireDcl } = makeDoc('loading')
  const ssr = makeSsrEl()
  withGlobals(doc, {}, () => {
    const cancel = mountUmami({ trackable: true, websiteId: 'site-1', ssrElement: ssr })
    assert.equal(listeners.length, 1)
    cancel()
    assert.equal(listeners.length, 0)
    fireDcl()
  })
  assert.equal(ssr.removed, false)
  assert.equal(appended.length, 0)
})
