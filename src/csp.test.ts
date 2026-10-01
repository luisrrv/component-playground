import { describe, expect, it } from 'vitest'
import { openai } from './ai/openai'
import { HOST_CSP, PROVIDER_ORIGINS, SANDBOX_CSP } from './csp'

const directive = (policy: string, name: string) =>
  policy
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(name + ' '))

describe('content security policies', () => {
  it('the sandbox cannot make network requests', () => {
    expect(directive(SANDBOX_CSP, 'connect-src')).toBe("connect-src 'none'")
    expect(directive(SANDBOX_CSP, 'default-src')).toBe("default-src 'none'")
  })

  it('the host can only reach itself and the AI provider', () => {
    expect(directive(HOST_CSP, 'connect-src')).toBe(`connect-src 'self' ${PROVIDER_ORIGINS.join(' ')}`)
    expect(PROVIDER_ORIGINS).toContain(openai.origin)
  })

  it('the host never evaluates code or loads third-party scripts', () => {
    expect(directive(HOST_CSP, 'script-src')).toBe("script-src 'self'")
    expect(HOST_CSP).not.toContain('unsafe-eval')
    for (const policy of [HOST_CSP, SANDBOX_CSP]) expect(policy).not.toMatch(/(^|\s)\*(\s|;|$)/)
  })
})

/**
 * Architecture rule: the API key lives in the AI panel, and nothing that
 * talks to the sandbox may depend on the AI code. If someone later wires the
 * key into the sandbox path, this fails.
 */
describe('the API key cannot reach the sandbox', () => {
  // Source files as text, via Vite's glob import (no Node APIs needed).
  const sources = import.meta.glob<string>(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'], {
    query: '?raw',
    import: 'default',
    eager: true,
  })
  const files = Object.entries(sources)

  it('sandbox and messaging code never import the AI modules', () => {
    const messaging = files.filter(([f]) => f.startsWith('./sandbox/') || f === './host/useSandbox.ts' || f === './protocol.ts')
    expect(messaging.length).toBeGreaterThan(3)
    for (const [f, text] of messaging) expect(text, f).not.toMatch(/from ['"][./]*\/?ai\//)
  })

  it('the message protocol has no field that could carry a key', () => {
    expect(sources['./protocol.ts']).not.toMatch(/\b(key|apiKey|token|secret|authorization)\s*:/i)
  })

  it('the key is only handled in the AI modules', () => {
    const offenders = files.filter(([f, text]) => !f.startsWith('./ai/') && /setKey\(|Bearer /.test(text)).map(([f]) => f)
    expect(offenders).toEqual([])
  })
})
