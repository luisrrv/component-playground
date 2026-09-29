/**
 * Everything the host does to user code before sending it to the sandbox.
 * Loaded lazily (Sucrase + acorn are most of the host bundle), so the page
 * shell renders before the compiler arrives.
 */
import { notAvailableMessage } from '../allowlist'
import { compile, type CompileError } from './compile'
import { disallowedImports } from './imports'
import { guardLoops } from './loopGuard'

export type PipelineResult =
  | { ok: true; code: string }
  | { ok: false; phase: 'compile'; error: CompileError }
  | { ok: false; phase: 'import'; error: { message: string } }

export function prepare(source: string): PipelineResult {
  const compiled = compile(source)
  if (!compiled.ok) return { ok: false, phase: 'compile', error: compiled.error }

  const blocked = disallowedImports(compiled.code)
  if (blocked.length > 0) {
    return { ok: false, phase: 'import', error: { message: blocked.map(notAvailableMessage).join('\n') } }
  }

  let code = compiled.code
  try {
    code = guardLoops(code)
  } catch {
    // Instrumentation failed; the watchdog still covers hangs.
  }
  return { ok: true, code }
}
