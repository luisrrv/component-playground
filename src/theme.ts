import { z } from 'zod'

/**
 * Theme tokens for @kit/ui.
 *
 * The theme panel accepts a partial set of overrides as JSON. They're checked
 * against this schema in the host (to show issues next to the panel) and again
 * in the sandbox before anything is applied. Only these tokens exist, and each
 * one only accepts a narrow format (hex colors, bounded numbers), so a value
 * can never smuggle in extra CSS.
 */

const hex = z
  .string()
  .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, { message: 'expected a hex color like #2f8f6f' })

export const ThemeOverrides = z
  .object({
    accent: hex,
    surface: hex,
    text: hex,
    radius: z.number().int().min(0).max(24),
    space: z.number().int().min(2).max(8),
    fontScale: z.number().min(0.8).max(1.4),
  })
  .partial()
  .strict()

export type Theme = Required<z.infer<typeof ThemeOverrides>>

export const DEFAULT_THEME: Theme = {
  accent: '#2f8f6f',
  surface: '#ffffff',
  text: '#1a1a1a',
  radius: 6,
  space: 4,
  fontScale: 1,
}

export const THEME_PRESETS: { id: string; label: string; theme: Partial<Theme> }[] = [
  { id: 'default', label: 'default', theme: {} },
  { id: 'night', label: 'night', theme: { accent: '#7aa2f7', surface: '#1f2230', text: '#e6e8f0', radius: 10 } },
  { id: 'paper', label: 'paper', theme: { accent: '#b4532a', surface: '#fbf7ef', text: '#2b2118', radius: 0, space: 5 } },
]

/** Text on surface must stay readable: WCAG AA for body text. */
export const MIN_TEXT_CONTRAST = 4.5

// --- color helpers -----------------------------------------------------------

function rgb(color: string): [number, number, number] {
  let h = color.slice(1)
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

function luminance(color: string): number {
  const [r, g, b] = rgb(color).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Black or white, whichever reads better on the accent (button labels). */
export function onColor(background: string): string {
  return contrast(background, '#ffffff') >= contrast(background, '#111111') ? '#ffffff' : '#111111'
}

// --- resolving ------------------------------------------------------------------

export type ResolvedTheme = { ok: true; theme: Theme } | { ok: false; issues: string[] }

/**
 * Validates overrides, merges them over the defaults, then checks rules that
 * need the whole theme (contrast). Runs in the host and in the sandbox.
 */
export function resolveTheme(overrides: unknown): ResolvedTheme {
  const parsed = ThemeOverrides.safeParse(overrides ?? {})
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.slice(0, 20).map((i) => {
        const path = i.path.length ? i.path.map(String).join('.') : '(theme)'
        return `${path}: ${i.message}`
      }),
    }
  }

  const theme = { ...DEFAULT_THEME, ...parsed.data }
  const ratio = contrast(theme.text, theme.surface)
  if (ratio < MIN_TEXT_CONTRAST) {
    return {
      ok: false,
      issues: [`text on surface has a contrast of ${ratio.toFixed(1)}:1; it needs at least ${MIN_TEXT_CONTRAST}:1`],
    }
  }
  return { ok: true, theme }
}

/** Parses the theme panel's JSON (empty means "defaults") and resolves it. */
export function parseTheme(text: string): ResolvedTheme {
  if (text.trim() === '') return { ok: true, theme: DEFAULT_THEME }
  try {
    return resolveTheme(JSON.parse(text))
  } catch (err) {
    return { ok: false, issues: [`not valid JSON: ${(err as Error).message}`] }
  }
}

/**
 * The CSS custom properties the kit reads. Values are set one by one with
 * style.setProperty (never by building a CSS string), and every value comes
 * from a validated token or a color computed from one.
 */
export function themeToCssVars(theme: Theme): Record<string, string> {
  return {
    '--kit-accent': theme.accent,
    '--kit-on-accent': onColor(theme.accent),
    '--kit-surface': theme.surface,
    '--kit-text': theme.text,
    '--kit-radius': `${theme.radius}px`,
    '--kit-space': `${theme.space}px`,
    '--kit-font-scale': String(theme.fontScale),
  }
}
