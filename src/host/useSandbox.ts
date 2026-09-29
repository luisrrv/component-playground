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
export type PropsInfo = {
  source: 'custom' | 'example' | 'none'
  exampleProps: string | null
}

function parseProps(text: string): { ok: true; value: unknown } | { ok: false; message: string } {
  if (text.trim() === '') return { ok: true, value: undefined }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (err) {
    return { ok: false, message: `Props aren't valid JSON: ${(err as Error).message}` }
  }
}

export function useSandbox(source: string, propsText: string) {
  const frame = useRef<HTMLIFrameElement>(null)
  const ready = useRef(false)
  const latest = useRef<{ id: number; code: string; props: unknown } | null>(null)
  const nextId = useRef(0)
  const [status, setStatus] = useState<PreviewStatus>('loading')
  const [error, setError] = useState<PreviewError | null>(null)
  const [propsInfo, setPropsInfo] = useState<PropsInfo | null>(null)
  const [hasRender, setHasRender] = useState(false)

  const send = useCallback(() => {
    const win = frame.current?.contentWindow
    if (!win || !ready.current || !latest.current) return
    // Opaque-origin iframe: '*' is the only target that works. The payload is
    // the user's own compiled code, so nothing sensitive leaves the host.
    const { id, code, props } = latest.current
    win.postMessage(props === undefined ? { type: 'render', id, code } : { type: 'render', id, code, props }, '*')
  }, [])

  /** Empty the preview (used when switching examples). */
  const reset = useCallback(() => {
    latest.current = null
    setPropsInfo(null)
    setHasRender(false)
    setError(null)
    setStatus('loading')
    frame.current?.contentWindow?.postMessage({ type: 'clear' }, '*')
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
        setHasRender(true)
        setPropsInfo({ source: msg.propsSource, exampleProps: msg.exampleProps })
      } else {
        setStatus('error')
        setError({ phase: msg.phase, message: msg.message })
        if (msg.exampleProps !== undefined) setPropsInfo({ source: 'example', exampleProps: msg.exampleProps })
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
      const props = parseProps(propsText)
      if (!props.ok) {
        setStatus('error')
        setError({ phase: 'props', message: props.message })
        return
      }
      latest.current = { id: ++nextId.current, code: compiled.code, props: props.value }
      send()
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [source, propsText, send])

  return { frame, status, error, propsInfo, reset, hasRender }
}
