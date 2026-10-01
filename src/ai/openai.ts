import { z } from 'zod'
import { EDIT_INSTRUCTIONS, editInput } from './prompt'
import { ProviderError, type EditProposal, type EditProvider, type EditRequest } from './provider'

// Must be listed in PROVIDER_ORIGINS (src/csp.ts), or the host CSP blocks it.
const ORIGIN = 'https://api.openai.com'

/** The model's answer, validated like any other untrusted input. */
const Proposal = z.object({
  summary: z.string().max(300),
  code: z.string().min(1).max(20_000),
})

/** Only the parts of the Responses API reply we read. */
const ResponsesReply = z.object({
  status: z.string().optional(),
  output: z.array(
    z.object({
      type: z.string(),
      content: z.array(z.object({ type: z.string(), text: z.string().optional(), refusal: z.string().optional() })).optional(),
    }),
  ),
})

const ErrorReply = z.object({ error: z.object({ message: z.string(), code: z.string().nullable().optional() }) })

function toError(status: number, body: unknown): ProviderError {
  const parsed = ErrorReply.safeParse(body)
  const detail = parsed.success ? parsed.data.error.message.slice(0, 300) : `HTTP ${status}`
  const code = parsed.success ? parsed.data.error.code : null
  if (status === 401) return new ProviderError('The API key was rejected. Check that it’s correct and not revoked.', 'auth')
  // A hard spend limit also answers 429, so tell it apart from a rate limit.
  const spend = code === 'insufficient_quota' || /billing|quota|spend/i.test(code ?? '') || (status === 429 && /quota|billing|spend/i.test(detail))
  if (spend) return new ProviderError('This key hit its spend limit or ran out of credit. Check Billing and Limits in the OpenAI dashboard.', 'quota')
  if (status === 429) return new ProviderError('Rate limited by OpenAI. Wait a moment and try again.', 'rate')
  if (status === 404 || code === 'model_not_found') return new ProviderError(`This key can’t use that model: ${detail}`, 'model')
  return new ProviderError(`OpenAI returned an error: ${detail}`, 'response')
}

/** Pulls the proposal out of a Responses API reply. Exported for tests. */
export function readProposal(body: unknown): EditProposal {
  const reply = ResponsesReply.safeParse(body)
  if (!reply.success) throw new ProviderError('Unexpected response from OpenAI.', 'response')

  const parts = reply.data.output.filter((o) => o.type === 'message').flatMap((o) => o.content ?? [])
  const refusal = parts.find((p) => p.type === 'refusal' && p.refusal)
  if (refusal) throw new ProviderError(`The model declined: ${refusal.refusal!.slice(0, 300)}`, 'refused')

  const text = parts.filter((p) => p.type === 'output_text' && p.text).map((p) => p.text).join('')
  if (!text) {
    const why = reply.data.status === 'incomplete' ? ' (it ran out of output tokens)' : ''
    throw new ProviderError(`The model didn’t return an edit${why}.`, 'response')
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new ProviderError('The model’s answer wasn’t valid JSON.', 'response')
  }
  const proposal = Proposal.safeParse(json)
  if (!proposal.success) throw new ProviderError('The model’s answer didn’t match the expected shape.', 'response')
  return proposal.data
}

export const openai: EditProvider = {
  id: 'openai',
  name: 'OpenAI',
  origin: ORIGIN,
  defaultModel: 'gpt-6.1-sol',
  models: [
    { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', note: 'balanced · ~2¢ per edit' },
    { id: 'gpt-6-luna', label: 'GPT-6 Luna', note: 'fast, cheapest · ~0.1¢ per edit' },
    { id: 'gpt-6-astra', label: 'GPT-6 Astra', note: 'strongest, slower · ~10¢ per edit' },
  ],

  checkKey(key) {
    const k = key.trim()
    if (k.startsWith('sk-ant-')) return 'That looks like an Anthropic key. This demo supports OpenAI keys.'
    if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(k)) return 'That doesn’t look like an OpenAI API key (they start with "sk-").'
    return null
  },

  async requestEdit({ key, model, code, instruction, signal }: EditRequest) {
    let res: Response
    try {
      res = await fetch(`${ORIGIN}/v1/responses`, {
        method: 'POST',
        signal,
        // Never send cookies or a referrer along with the key.
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.trim()}` },
        body: JSON.stringify({
          model,
          instructions: EDIT_INSTRUCTIONS,
          input: editInput(code, instruction),
          reasoning: { effort: 'low' },
          max_output_tokens: 8000,
          // Don't keep the request on OpenAI's side for later retrieval.
          store: false,
          text: {
            format: {
              type: 'json_schema',
              name: 'component_edit',
              strict: true,
              schema: {
                type: 'object',
                properties: { summary: { type: 'string' }, code: { type: 'string' } },
                required: ['summary', 'code'],
                additionalProperties: false,
              },
            },
          },
        }),
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err
      throw new ProviderError('Couldn’t reach OpenAI. Check your connection.', 'network')
    }

    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      // handled below
    }
    if (!res.ok) throw toError(res.status, body)
    return readProposal(body)
  },
}
