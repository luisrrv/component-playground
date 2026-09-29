import { describe, expect, it } from 'vitest'
import { compile } from './compile'
import { GUARD_NAME, guardLoops, LOOP_LIMIT_MS } from './loopGuard'

const run = (src: string) => {
  const r = compile(src)
  if (!r.ok) throw new Error(r.error.message)
  const guarded = guardLoops(r.code)
  const guard = (start: number) => {
    if (performance.now() - start > LOOP_LIMIT_MS) throw new Error('loop took too long')
  }
  const exports: Record<string, unknown> = {}
  new Function('require', 'module', 'exports', GUARD_NAME, guarded)(() => ({}), { exports }, exports, guard)
  return exports
}

describe('guardLoops', () => {
  it('leaves normal loops working', () => {
    const e = run(`
      let total = 0
      for (let i = 0; i < 10; i++) total += i
      let j = 0
      while (j < 3) { j++ }
      do { j-- } while (j > 0)
      for (const x of [1, 2]) total += x
      for (const k in { a: 1 }) total += k.length
      outer: for (let a = 0; a < 3; a++) { for (let b = 0; b < 3; b++) { if (b === 1) continue outer } }
      export const result = total + j`)
    expect(e.result).toBe(45 + 3 + 1)
  })

  it('stops an infinite loop', () => {
    const t0 = performance.now()
    expect(() => run('while (true) {}\nexport const x = 1')).toThrow('loop took too long')
    expect(performance.now() - t0).toBeLessThan(LOOP_LIMIT_MS * 3)
  })

  it('handles loops without braces and nested in ifs', () => {
    expect(() => run('if (true) for (;;) ;\nexport const x = 1')).toThrow('loop took too long')
  })
})
