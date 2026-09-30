import { describe, expect, it } from 'vitest'
import { HostMessage, SandboxMessage } from './protocol'

describe('protocol', () => {
  it('accepts well-formed messages', () => {
    expect(HostMessage.safeParse({ type: 'render', id: 1, code: 'x' }).success).toBe(true)
    expect(HostMessage.safeParse({ type: 'theme', theme: { accent: '#fff' } }).success).toBe(true)
    expect(SandboxMessage.safeParse({ type: 'error', id: 1, phase: 'render', message: 'boom' }).success).toBe(true)
  })

  it('rejects anything else', () => {
    expect(SandboxMessage.safeParse({ type: 'rendered' }).success).toBe(false)
    expect(SandboxMessage.safeParse({ type: 'navigate', to: 'https://evil.example' }).success).toBe(false)
    expect(SandboxMessage.safeParse({ type: 'error', id: 1, phase: 'render', message: 'x'.repeat(5000) }).success).toBe(false)
    expect(HostMessage.safeParse('render').success).toBe(false)
  })
})
