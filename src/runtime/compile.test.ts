import { describe, expect, it } from 'vitest'
import { compile } from './compile'

describe('compile', () => {
  it('turns TSX with imports into require() calls', () => {
    const r = compile(`import { useState } from 'react'\nexport default function A({ n }: { n: number }) { const [c] = useState(n); return <b>{c}</b> }`)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.code).toContain(`require('react')`)
      expect(r.code).toContain('require("react/jsx-runtime")')
      expect(r.code).not.toContain(': { n: number }')
    }
  })

  it('reports syntax errors with a location', () => {
    const r = compile('const x = <div>')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.line).toBe(1)
      expect(r.error.message).not.toMatch(/\(\d+:\d+\)$/)
    }
  })
})
