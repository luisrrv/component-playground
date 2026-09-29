import { describe, expect, it } from 'vitest'
import { compile } from './compile'
import { evaluate } from './evaluate'

const run = (src: string, modules = {}) => {
  const r = compile(src)
  if (!r.ok) throw new Error(r.error.message)
  return evaluate(r.code, modules)
}

describe('evaluate', () => {
  it('returns the default export', () => {
    const exports = run('export default function Hello() { return null }', {})
    expect(typeof exports.default).toBe('function')
  })

  it('resolves only modules that were provided', () => {
    expect(() => run(`import fs from 'fs'\nexport default () => fs.readFileSync('x')`)).toThrow("Cannot find module 'fs'")
    const exports = run(`import { x } from 'lib'\nexport const y = x + 1`, { lib: { x: 1 } })
    expect(exports.y).toBe(2)
  })
})
