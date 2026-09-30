import { useEffect, useMemo, useRef, useState } from 'react'
import { loadPipeline } from '../host/pipeline'
import { DEMO_BASE, DEMO_RESPONSES } from './demo'
import { diffLines, withContext } from './diff'
import { openai } from './openai'
import { ProviderError, type EditProposal } from './provider'

const provider = openai

export type Proposal = EditProposal & { base: string; demo: boolean }

type PanelProps = {
  source: string
  /** Hands a proposal to the app, which switches the editor to review mode. */
  onProposal: (p: Proposal) => void
  /** Hide the inputs while a proposal is being reviewed (state is kept). */
  hidden: boolean
  onLoadDemoBase: () => void
}

/**
 * The AI edit panel. The API key lives only in this component's state: it
 * isn't stored, isn't lifted to the app, and never goes near the sandbox.
 * What leaves this panel is a proposal, which the user reviews as a diff.
 */
export function AiPanel({ source, onProposal, hidden, onLoadDemoBase }: PanelProps) {
  const [key, setKey] = useState('')
  const [model, setModel] = useState(provider.defaultModel)
  const [instruction, setInstruction] = useState('')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const loading = startedAt !== null

  useEffect(() => () => abort.current?.abort(), [])

  const keyProblem = key.trim() ? provider.checkKey(key) : null
  const canAsk = Boolean(key.trim()) && !keyProblem && Boolean(instruction.trim()) && !loading
  const modelLabel = provider.models.find((m) => m.id === model)?.label ?? model

  const ask = async () => {
    if (!canAsk) return
    const ctrl = new AbortController()
    abort.current = ctrl
    setStartedAt(Date.now())
    setError(null)
    try {
      const p = await provider.requestEdit({ key, model, code: source, instruction: instruction.trim(), signal: ctrl.signal })
      onProposal({ ...p, base: source, demo: false })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError(err instanceof ProviderError ? err.message : 'Something went wrong with the request.')
    } finally {
      if (abort.current === ctrl) setStartedAt(null)
    }
  }

  const tryDemo = (id: string) => {
    const demo = DEMO_RESPONSES.find((d) => d.id === id)
    if (!demo) return
    setError(null)
    setInstruction(demo.instruction)
    onProposal({ ...demo.proposal(), base: source, demo: true })
  }

  if (hidden) return null

  return (
    <div className="ai-panel">
      <div className="ai-row">
        <label className="ai-field">
          <span>OpenAI key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-…  (kept in memory only)"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            aria-invalid={Boolean(keyProblem)}
          />
        </label>
        <label className="ai-field ai-model">
          <span>model</span>
          <select value={model} onChange={(e) => setModel(e.target.value)} disabled={loading}>
            {provider.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.note}
              </option>
            ))}
          </select>
        </label>
        {key && (
          <button type="button" className="link-button ai-forget" onClick={() => setKey('')}>
            forget key
          </button>
        )}
      </div>
      {keyProblem ? (
        <p className="ai-note ai-bad">{keyProblem}</p>
      ) : (
        <p className="ai-note ai-key-note">
          <span aria-hidden>🔒</span> Your key stays in this tab’s memory. It isn’t saved anywhere, is sent only to
          api.openai.com, and never reaches the preview sandbox. Closing this panel or reloading the page forgets it. Tip:
          use a restricted key with a spend limit.
        </p>
      )}

      <div className="ai-row ai-ask-row">
        <input
          className="ai-instruction"
          type="text"
          placeholder="Describe a change, e.g. “add a subtitle prop”"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void ask()}
          maxLength={500}
          disabled={loading}
        />
        {loading ? (
          <>
            <button type="button" className="ai-button ai-primary" disabled aria-live="polite">
              <span className="ai-spinner" aria-hidden /> generating… <Elapsed since={startedAt} />
            </button>
            <button type="button" className="link-button ai-cancel" onClick={() => abort.current?.abort()}>
              cancel
            </button>
          </>
        ) : (
          <button type="button" className="ai-button ai-primary" disabled={!canAsk} onClick={() => void ask()}>
            ask
          </button>
        )}
      </div>

      {loading && (
        <div className="ai-progress" role="progressbar" aria-label={`${modelLabel} is writing the edit`}>
          <span />
        </div>
      )}
      {loading && <p className="ai-note dim">{modelLabel} is writing the edit. Stronger models can take 10–30s.</p>}
      {error && (
        <p className="ai-note ai-bad" role="alert">
          {error}
        </p>
      )}

      {!loading && (
        <p className="ai-note dim">
          No key? Try a demo response:{' '}
          {source === DEMO_BASE ? (
            DEMO_RESPONSES.map((d) => (
              <button key={d.id} type="button" className="link-button inline" onClick={() => tryDemo(d.id)}>
                {d.id === 'bad-network' ? '✕ ' : ''}“{d.instruction}”
              </button>
            ))
          ) : (
            <button type="button" className="link-button inline" onClick={onLoadDemoBase}>
              load the Profile card example first
            </button>
          )}
        </p>
      )}
    </div>
  )
}

function Elapsed({ since }: { since: number | null }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])
  return <span className="ai-elapsed">{since ? Math.max(0, Math.floor((now - since) / 1000)) : 0}s</span>
}

type Preflight = { ok: true } | { ok: false; phase: string; message: string }

type ReviewProps = {
  proposal: Proposal
  source: string
  onAccept: () => void
  onReject: () => void
}

/**
 * Review mode: replaces the editor while a proposal is pending, so the
 * proposed code is never mistaken for the real code. Nothing runs here; the
 * proposal is only compiled and import-scanned.
 */
export function ReviewView({ proposal, source, onAccept, onReject }: ReviewProps) {
  const [preflight, setPreflight] = useState<Preflight | null>(null)

  useEffect(() => {
    let live = true
    void loadPipeline().then(({ prepare }) => {
      if (!live) return
      const r = prepare(proposal.code)
      setPreflight(r.ok ? { ok: true } : { ok: false, phase: r.phase, message: r.error.message })
    })
    return () => {
      live = false
    }
  }, [proposal])

  const { rows, added, removed } = useMemo(() => {
    const lines = diffLines(proposal.base, proposal.code)
    let n = 0
    const numbered = lines.map((l) => ({ ...l, n: l.kind === 'del' ? null : ++n }))
    return {
      rows: withContext(numbered, 3),
      added: lines.filter((l) => l.kind === 'add').length,
      removed: lines.filter((l) => l.kind === 'del').length,
    }
  }, [proposal])

  const changed = added + removed > 0
  const stale = proposal.base !== source
  const blocked = preflight !== null && !preflight.ok

  return (
    <div className="review">
      <div className="review-head">
        <div className="review-title">
          <span className="review-label">reviewing ai proposal</span>
          {proposal.demo && <span className="ai-tag">demo response</span>}
          <span className="review-counts">
            <span className="c-add">+{added}</span> <span className="c-del">−{removed}</span>
          </span>
        </div>
        <p className="review-summary">{proposal.summary}</p>
        <p className={blocked ? 'ai-note ai-bad' : 'ai-note review-ok'}>
          {preflight === null
            ? 'Checking…'
            : preflight.ok
              ? '✓ compiles · imports allowed. Runtime safeguards still apply after you accept.'
              : `✕ would be blocked (${preflight.phase}): ${preflight.message}`}
        </p>
        {stale && <p className="ai-note ai-bad">The code changed since this was proposed. Accepting replaces your newer edits.</p>}
        <div className="review-actions">
          <button type="button" className="ai-button ai-primary" onClick={onAccept} disabled={!changed}>
            {blocked ? 'accept anyway' : 'accept'}
          </button>
          <button type="button" className="ai-button" onClick={onReject}>
            reject
          </button>
          <span className="ai-note dim">Nothing runs until you accept.</span>
        </div>
      </div>

      <div className="review-diff" role="region" aria-label="Proposed changes">
        {!changed && <p className="ai-note dim review-empty">No changes.</p>}
        {changed &&
          rows.map((r, i) =>
            r.kind === 'skip' ? (
              <div key={i} className="d-row d-skip">
                <span className="d-num" />
                <span className="d-sign" />
                <span className="d-text">
                  ⋯ {r.count} unchanged line{r.count === 1 ? '' : 's'}
                </span>
              </div>
            ) : (
              <div key={i} className={`d-row d-${r.kind}`}>
                <span className="d-num">{r.n ?? ''}</span>
                <span className="d-sign">{r.kind === 'add' ? '+' : r.kind === 'del' ? '−' : ''}</span>
                <span className="d-text">{r.text || ' '}</span>
              </div>
            ),
          )}
      </div>
    </div>
  )
}
