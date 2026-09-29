import { transform } from 'sucrase'

export type CompileResult =
  | { ok: true; code: string }
  | { ok: false; error: CompileError }

export type CompileError = {
  message: string
  line?: number
  column?: number
}

/**
 * TSX -> CommonJS-style JS, in the browser.
 *
 * Sucrase strips types and rewrites JSX and imports; it does not type-check.
 * The `imports` transform turns `import x from 'y'` into `require('y')`, which
 * is what lets the runtime control exactly which modules user code can reach.
 */
export function compile(source: string): CompileResult {
  try {
    const { code } = transform(source, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'automatic',
      production: true,
    })
    return { ok: true, code }
  } catch (err) {
    const e = err as Error & { loc?: { line: number; column: number } }
    return {
      ok: false,
      error: {
        // Sucrase appends " (line:col)" to the message; keep the text clean.
        message: e.message.replace(/\s*\(\d+:\d+\)\s*$/, ''),
        line: e.loc?.line,
        column: e.loc?.column,
      },
    }
  }
}
