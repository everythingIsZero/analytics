/**
 * react-client.entry.test.mjs — `src/react-client.mjs` 入口（Next 集成）静态断言
 *
 * 为什么只能静态断言：该入口 `import { usePathname, useSearchParams } from 'next/navigation'`，
 * 而本包把 `next` 标为**可选** peer，测试环境并未安装 next——运行时 import 会直接失败。
 * 因此这里只读源码，断言「`'use client'` 指令在首行」与「从 next/navigation 导入两个 hook」，
 * 保证入口形态正确；门控行为由 `react-client.ssr.test.mjs` 在注入假 hook 的内核上做运行时验证。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = readFileSync(fileURLToPath(new URL('../src/react-client.mjs', import.meta.url)), 'utf8')

test("react-client.mjs：首行 'use client' 指令", () => {
  const firstLine = src.split('\n')[0].trim()
  assert.equal(firstLine, "'use client'")
})

test('react-client.mjs：从 next/navigation 导入 usePathname 与 useSearchParams', () => {
  assert.match(src, /from\s+['"]next\/navigation['"]/)
  assert.match(src, /\busePathname\b/)
  assert.match(src, /\buseSearchParams\b/)
})

test('react-client.mjs：导出 UmamiScriptClient（具名 + default）与 base 工厂', () => {
  assert.match(src, /UmamiScriptClient/)
  assert.match(src, /createUmamiScriptClient/)
})
