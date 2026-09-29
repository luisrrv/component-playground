import { useCallback, useEffect, useRef, useState } from 'react'
import { compile } from '../runtime/compile'
import { disallowedImports } from '../runtime/imports'
import { notAvailableMessage } from '../allowlist'
import { SandboxMessage, type ErrorPhase } from '../protocol'

export type PreviewError = {
  phase: ErrorPhase
  message: string
  line?: number
  column?: number
}

export type PreviewStatus = 'loading' | 'ok' | 'error'

const DEBOUNCE_MS = 300

/**
 * Compiles in the host and sends the result to the sandbox iframe.
 * Only messages from that iframe are accepted, and each is validated; results
 * for an older render id are ignored so a slow render can't overwrite a newer one.
 */
export function useSandbox(source: string) {
  const frame = useRef<HTMLIFrameElement>(null)
  const ready = useRef(false)
  const latest = useRef<{ id: number; code: string } | null>(null)
  const nextId = useRef(0)
  const [status, setStatus] = useState<PreviewStatus>('loading')
  const [error, setError] = useState<PreviewError | null>(null)

  const send = useCallback(() => {
    const win = frame.current?.contentWindow
    if (!win || !ready.current || !latest.current) return
    // Opaque-origin iframe: '*' is the only target that works. The payload is
    // the user's own compiled code, so nothing sensitive leaves the host.
    win.postMessage({ type: 'render', ...latest.current }, '*')
  }, [])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      const parsed = SandboxMessage.safeParse(event.data)
      if (!parsed.success) return
      const msg = parsed.data

      if (msg.type === 'ready') {
        ready.current = true
        send()
        return
      }
      if (msg.id !== null && msg.id !== latest.current?.id) return // stale

      if (msg.type === 'rendered') {
        setStatus('ok')
        setError(null)
      } else {
        setStatus('error')
        setError({ phase: msg.phase, message: msg.message })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [send])

  useEffect(() => {
    const timer = setTimeout(() => {
      const compiled = compile(source)
      if (!compiled.ok) {
        setStatus('error')
        setError({ phase: 'compile', ...compiled.error })
        return
      }
      const blocked = disallowedImports(compiled.code)
      if (blocked.length > 0) {
        setStatus('error')
        setError({ phase: 'import', message: blocked.map(notAvailableMessage).join('\n') })
        return
      }
      latest.current = { id: ++nextId.current, code: compiled.code }
      send()
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [source, send])

  return { frame, status, error }
}
