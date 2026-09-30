/**
 * What the AI panel needs from a model provider. v2 ships one (OpenAI); the
 * interface keeps a second one to a single file.
 *
 * The provider only ever returns a proposal. It can't apply code: the user
 * reviews a diff, and accepted code goes through the same pipeline as
 * anything typed in the editor.
 */
export type ModelOption = { id: string; label: string; note: string }

export type EditRequest = {
  key: string
  model: string
  code: string
  instruction: string
  signal?: AbortSignal
}

export type EditProposal = { summary: string; code: string }

export type ProviderErrorKind = 'auth' | 'quota' | 'rate' | 'model' | 'network' | 'response' | 'refused'

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind
  constructor(message: string, kind: ProviderErrorKind) {
    super(message)
    this.kind = kind
  }
}

export interface EditProvider {
  id: string
  name: string
  models: ModelOption[]
  defaultModel: string
  /** API origin, also the only one the host CSP allows in connect-src. */
  origin: string
  /** Returns a message if the key is obviously not for this provider. */
  checkKey(key: string): string | null
  requestEdit(req: EditRequest): Promise<EditProposal>
}
