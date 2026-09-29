/**
 * Sandbox runtime. Runs inside <iframe sandbox="allow-scripts">, so it has an
 * opaque origin: no access to the host's DOM, cookies or storage. In
 * production a CSP also blocks network requests (see vite.config.ts).
 */
import { type ComponentType } from 'react'
import * as React from 'react'
import * as JsxRuntime from 'react/jsx-runtime'
import { createRoot } from 'react-dom/client'
import * as Zod from 'zod'
import * as Kit from '../kit'
import { notAvailableMessage } from '../allowlist'
import { evaluate, type ModuleMap } from '../runtime/evaluate'
import { resolveProps } from '../runtime/contract'
import { HostMessage, type SandboxMessage } from '../protocol'
import { ErrorBoundary } from './ErrorBoundary'
import './sandbox.css'

// Must match ALLOWED_MODULES + INTERNAL_MODULES in ../allowlist.ts.
const MODULES: ModuleMap = {
  react: React,
  'react/jsx-runtime': JsxRuntime,
  zod: Zod,
  '@kit/ui': Kit,
}

const root = createRoot(document.getElementById('root')!)
let currentId: number | null = null

function post(message: SandboxMessage) {
  // The parent's origin can't be verified from an opaque origin, so target '*'.
  // Messages only carry render status, never user data from the host.
  window.parent.postMessage(message, '*')
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 2000)

function toJson(value: unknown): string | null {
  if (value === undefined) return null
  try {
    const json = JSON.stringify(value, null, 2)
    return json && json.length <= 10_000 ? json : null
  } catch {
    return null
  }
}

function render(id: number, code: string, customProps: unknown) {
  let Component: ComponentType<Record<string, unknown>>
  let exampleProps: string | null = null
  let props: Record<string, unknown>
  let propsSource: 'custom' | 'example' | 'none'

  try {
    const exports = evaluate(code, MODULES, notAvailableMessage)
    if (typeof exports.default !== 'function') {
      throw new Error('The module needs a default export that is a React component.')
    }
    Component = exports.default as ComponentType<Record<string, unknown>>
    exampleProps = toJson(exports.exampleProps)

    const resolved = resolveProps(exports, customProps)
    if (!resolved.ok) {
      // Keep the previous render on screen.
      post({ type: 'error', id, phase: 'validate', message: resolved.message.slice(0, 2000), exampleProps })
      return
    }
    props = resolved.props
    propsSource = resolved.source
  } catch (err) {
    post({ type: 'error', id, phase: 'evaluate', message: message(err) })
    return
  }

  currentId = id
  root.render(
    <ErrorBoundary key={id} onError={(err) => post({ type: 'error', id, phase: 'render', message: message(err) })}>
      <Component {...props} />
    </ErrorBoundary>,
  )
  post({ type: 'rendered', id, propsSource, exampleProps })
}

window.addEventListener('message', (event) => {
  if (event.source !== window.parent) return
  const parsed = HostMessage.safeParse(event.data)
  if (!parsed.success) return
  if (parsed.data.type === 'render') render(parsed.data.id, parsed.data.code, parsed.data.props)
  else if (parsed.data.type === 'clear') {
    currentId = null
    root.render(null)
  }
})

// Errors outside rendering, e.g. thrown from a click handler or a timer.
window.addEventListener('error', (event) => {
  post({ type: 'error', id: currentId, phase: 'runtime', message: message(event.error ?? event.message) })
})
window.addEventListener('unhandledrejection', (event) => {
  post({ type: 'error', id: currentId, phase: 'runtime', message: message(event.reason) })
})

post({ type: 'ready' })
