import { describe, expect, it } from 'vitest'
import { contrast, DEFAULT_THEME, onColor, parseTheme, resolveTheme, THEME_PRESETS, themeToCssVars } from './theme'

describe('theme', () => {
  it('uses the defaults when nothing is set', () => {
    expect(parseTheme('')).toEqual({ ok: true, theme: DEFAULT_THEME })
    expect(resolveTheme(undefined)).toEqual({ ok: true, theme: DEFAULT_THEME })
  })

  it('merges valid overrides over the defaults', () => {
    const r = resolveTheme({ accent: '#abc', radius: 0 })
    expect(r).toEqual({ ok: true, theme: { ...DEFAULT_THEME, accent: '#abc', radius: 0 } })
  })

  it('rejects CSS smuggled into a color token', () => {
    const r = resolveTheme({ accent: 'red; background: url(https://evil.example/x.png)' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.issues[0]).toMatch(/^accent: expected a hex color/)
  })

  it('rejects unknown tokens, wrong types and out-of-range numbers', () => {
    for (const bad of [{ background: '#fff' }, { radius: '6px' }, { radius: 999 }, { space: 1 }, { fontScale: 3 }, []]) {
      expect(resolveTheme(bad).ok, JSON.stringify(bad)).toBe(false)
    }
  })

  it('rejects unreadable text on surface', () => {
    const r = resolveTheme({ text: '#c8c8c8', surface: '#ffffff' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.issues[0]).toMatch(/contrast of 1\.\d:1/)
  })

  it('reports bad JSON', () => {
    const r = parseTheme('{ accent: ')
    expect(r.ok).toBe(false)
  })

  it('ships presets that pass their own rules', () => {
    for (const p of THEME_PRESETS) expect(resolveTheme(p.theme).ok, p.id).toBe(true)
  })

  it('computes contrast and a readable label color', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(onColor('#1f2230')).toBe('#ffffff')
    expect(onColor('#f5e663')).toBe('#111111')
  })

  it('only produces --kit-* variables with plain values', () => {
    const vars = themeToCssVars(DEFAULT_THEME)
    for (const [name, value] of Object.entries(vars)) {
      expect(name).toMatch(/^--kit-[a-z-]+$/)
      expect(value).not.toMatch(/[;{}()]/)
    }
  })
})
