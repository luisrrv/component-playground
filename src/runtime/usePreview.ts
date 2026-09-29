import { useEffect, useState, type ComponentType } from 'react'
import * as React from 'react'
import * as JsxRuntime from 'react/jsx-runtime'
import { compile } from './compile'
import { evaluate, type ModuleMap } from './evaluate'

export type PreviewError = {
  phase: 'compile' | 'evaluate' | 'render'
  message: string
  line?: number
  column?: number
}

// M1: in-page modules. M3 replaces this with the sandbox allowlist.
const MODULES: ModuleMap = {
  react: React,
  'react/jsx-runtime': JsxRuntime,
}

const DEBOUNCE_MS = 300

/**
 * Compiles and evaluates `source` after a short pause in typing.
 * On failure it keeps the last component that worked, so the preview
 * doesn't flash empty while you're mid-edit.
 */
export function usePreview(source: string) {
  const [component, setComponent] = useState<{ C: ComponentType } | null>(null)
  const [error, setError] = useState<PreviewError | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      const compiled = compile(source)
      if (!compiled.ok) {
        setError({ phase: 'compile', ...compiled.error })
        return
      }
      try {
        const exports = evaluate(compiled.code, MODULES)
        if (typeof exports.default !== 'function') {
          throw new Error('The module needs a default export that is a React component.')
        }
        setComponent({ C: exports.default as ComponentType })
        setError(null)
        setVersion((v) => v + 1)
      } catch (err) {
        setError({ phase: 'evaluate', message: (err as Error).message })
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [source])

  const reportRenderError = (err: Error) => setError({ phase: 'render', message: err.message })

  return { component, error, version, reportRenderError }
}
