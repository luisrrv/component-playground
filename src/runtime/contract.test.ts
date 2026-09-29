import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { resolveProps } from './contract'

const schema = z.object({ name: z.string().min(1), rating: z.number().int().max(5) })

describe('resolveProps', () => {
  it('uses exampleProps when no custom props are given', () => {
    const r = resolveProps({ propsSchema: schema, exampleProps: { name: 'Ada', rating: 5 } }, undefined)
    expect(r).toEqual({ ok: true, props: { name: 'Ada', rating: 5 }, source: 'example' })
  })

  it('prefers custom props and validates them', () => {
    const r = resolveProps({ propsSchema: schema, exampleProps: { name: 'Ada', rating: 5 } }, { name: '', rating: 7 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.message).toContain("props don't match propsSchema")
      expect(r.message).toContain('name:')
      expect(r.message).toContain('rating:')
    }
  })

  it('flags invalid exampleProps', () => {
    const r = resolveProps({ propsSchema: schema, exampleProps: { name: 'Ada', rating: 9 } }, undefined)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/^exampleProps/)
  })

  it('works without a schema', () => {
    expect(resolveProps({}, undefined)).toEqual({ ok: true, props: {}, source: 'none' })
    expect(resolveProps({}, [1, 2]).ok).toBe(false)
  })

  it('rejects a propsSchema that is not a schema', () => {
    expect(resolveProps({ propsSchema: { type: 'object' } }, undefined).ok).toBe(false)
  })
})
