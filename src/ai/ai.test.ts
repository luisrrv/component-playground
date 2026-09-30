import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepare } from '../runtime/pipeline'
import { DEMO_RESPONSES } from './demo'
import { diffLines, withContext } from './diff'
import { openai, readProposal } from './openai'
import { ProviderError } from './provider'

const KEY = 'sk-test_' + 'a'.repeat(32)
const reply = (text: string) => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] })
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

describe('diff', () => {
  it('marks added and removed lines', () => {
    const d = diffLines('a\nb\nc', 'a\nB\nc\nd')
    expect(d.map((l) => l.kind)).toEqual(['same', 'del', 'add', 'same', 'add'])
  })

  it('collapses long unchanged runs', () => {
    const before = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')
    const after = before.replace('line 10', 'changed')
    const kinds = withContext(diffLines(before, after), 1).map((l) => l.kind)
    expect(kinds).toEqual(['skip', 'same', 'del', 'add', 'same', 'skip'])
  })
})

describe('openai provider', () => {
  it('checks the key format', () => {
    expect(openai.checkKey(KEY)).toBeNull()
    expect(openai.checkKey('sk-ant-api03-' + 'x'.repeat(30))).toMatch(/Anthropic/)
    expect(openai.checkKey('hello')).toMatch(/doesn’t look like/)
  })

  it('sends the key only as a bearer header, to the API origin, without storing the request', async () => {
    const fetchMock = vi.fn(async () => json(200, reply(JSON.stringify({ summary: 'ok', code: 'export default () => null' }))))
    vi.stubGlobal('fetch', fetchMock)
    const p = await openai.requestEdit({ key: KEY, model: 'gpt-6.1-sol', code: 'x', instruction: 'y' })
    expect(p).toEqual({ summary: 'ok', code: 'export default () => null' })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(new URL(url).origin).toBe(openai.origin)
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`)
    expect(init.credentials).toBe('omit')
    expect(String(init.body)).not.toContain(KEY)
    expect(JSON.parse(String(init.body)).store).toBe(false)
  })

  it('turns API errors into readable messages', async () => {
    const cases: [number, unknown, string][] = [
      [401, { error: { message: 'bad key', code: 'invalid_api_key' } }, 'auth'],
      [429, { error: { message: 'no money', code: 'insufficient_quota' } }, 'quota'],
      [429, { error: { message: 'Monthly spend limit reached', code: 'billing_hard_limit_reached' } }, 'quota'],
      [429, { error: { message: 'slow down', code: 'rate_limit_exceeded' } }, 'rate'],
      [404, { error: { message: 'nope', code: 'model_not_found' } }, 'model'],
      [500, 'not json', 'response'],
    ]
    for (const [status, body, kind] of cases) {
      vi.stubGlobal('fetch', async () => json(status, body))
      await expect(openai.requestEdit({ key: KEY, model: 'm', code: 'x', instruction: 'y' })).rejects.toMatchObject({ kind })
    }
  })

  it('treats the model output as untrusted', () => {
    expect(() => readProposal({ nope: true })).toThrow(ProviderError)
    expect(() => readProposal(reply('not json'))).toThrow(/valid JSON/)
    expect(() => readProposal(reply(JSON.stringify({ code: '' , summary: 'x' })))).toThrow(/expected shape/)
    expect(() => readProposal(reply(JSON.stringify({ summary: 'x'.repeat(1000), code: 'y' })))).toThrow(/expected shape/)
    expect(() =>
      readProposal({ output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }),
    ).toThrow(/declined/)
    expect(() => readProposal({ status: 'incomplete', output: [] })).toThrow(/output tokens/)
  })
})

describe('demo responses', () => {
  it('the reasonable edit passes the static checks', () => {
    const good = DEMO_RESPONSES.find((d) => d.id === 'location')!.proposal()
    expect(prepare(good.code).ok).toBe(true)
  })

  it('the bad edit is blocked before it could run', () => {
    const bad = DEMO_RESPONSES.find((d) => d.id === 'bad-network')!.proposal()
    const r = prepare(bad.code)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.phase).toBe('import')
      expect(r.error.message).toContain("'axios' is not available")
    }
  })
})
