import { lazy, Suspense, useMemo, useState } from 'react'
import { AiPanel, ReviewView, type Proposal } from './ai/AiPanel'
import { EXAMPLES } from './examples'
import { useSandbox, type PreviewError, type PropsInfo } from './host/useSandbox'
import { DEFAULT_THEME, parseTheme, THEME_PRESETS, type ResolvedTheme, type Theme } from './theme'

// CodeMirror is the largest dependency; load it after the shell renders.
const CodeEditor = lazy(() => import('./editor/CodeEditor').then((m) => ({ default: m.CodeEditor })))

export default function App() {
  const [source, setSource] = useState(EXAMPLES[0].code)
  const [propsText, setPropsText] = useState('')
  const [exampleId, setExampleId] = useState(EXAMPLES[0].id)
  const [themeText, setThemeText] = useState('')
  const [tab, setTab] = useState<'props' | 'theme'>('props')

  // Invalid theme JSON keeps the last valid theme applied.
  const themeResult = useMemo(() => parseTheme(themeText), [themeText])
  const [appliedTheme, setAppliedTheme] = useState<Theme>(DEFAULT_THEME)
  const changeTheme = (text: string) => {
    setThemeText(text)
    const next = parseTheme(text)
    if (next.ok) setAppliedTheme(next.theme)
  }

  const { frame, frameKey, status, error, propsInfo, reset, hasRender } = useSandbox(source, propsText, appliedTheme)
  const [aiOpen, setAiOpen] = useState(false)
  // A pending AI proposal puts the editor in review mode.
  const [proposal, setProposal] = useState<Proposal | null>(null)

  const selectExample = (id: string) => {
    const ex = EXAMPLES.find((x) => x.id === id)
    if (!ex) return
    setProposal(null)
    reset()
    setExampleId(ex.id)
    setSource(ex.code)
    setPropsText('')
    // Each example starts from the default theme, so an invalid
    // example theme doesn't keep a previous example's colors.
    setAppliedTheme(DEFAULT_THEME)
    changeTheme(ex.theme ?? '')
    if (ex.theme) setTab('theme')
  }
  const example = EXAMPLES.find((x) => x.id === exampleId)

  return (
    <div className="frame">
      <header className="titlebar">
        <span>component-playground</span>
        <nav aria-label="Links">
          <a href="https://github.com/luisrrv/component-playground" target="_blank" rel="noopener">
            source ↗
          </a>
          <a href="https://lrod.dev" target="_blank" rel="noopener">
            lrod.dev ↗
          </a>
        </nav>
      </header>

      <div className="intro">
        <h1>component-playground</h1>
        <p>
          Write a React component and it renders in a sandbox that assumes the code is untrusted: compiled in the
          browser, limited to an import allowlist, props checked against a schema, isolated in an iframe with a strict
          CSP, and recovered from crashes and infinite loops. Theme tokens, slots and AI edits go through the same
          checks. Pick a <strong>✕</strong> example to watch each safeguard catch something.
        </p>
      </div>

      <div className="workspace">
        <section className="pane" aria-label="Editor">
          <div className="pane-head">
            <span className="pane-title">
              component.tsx
              <button
                type="button"
                className={aiOpen ? 'ai-toggle on' : 'ai-toggle'}
                aria-expanded={aiOpen}
                onClick={() => {
                  setAiOpen(!aiOpen)
                  setProposal(null)
                }}
              >
                ✦ ai edit
              </button>
            </span>
            <select
              aria-label="Examples"
              value={exampleId}
              onChange={(e) => selectExample(e.target.value)}
            >
              <optgroup label="Works">
                {EXAMPLES.filter((x) => x.group === 'works').map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Fails on purpose">
                {EXAMPLES.filter((x) => x.group === 'fails').map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    ✕ {ex.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          {aiOpen && (
            <AiPanel
              source={source}
              hidden={proposal !== null}
              onProposal={setProposal}
              onLoadDemoBase={() => selectExample('profile-card')}
            />
          )}
          {proposal ? (
            <ReviewView
              proposal={proposal}
              source={source}
              onAccept={() => {
                setSource(proposal.code)
                setProposal(null)
              }}
              onReject={() => setProposal(null)}
            />
          ) : (
            <>
              {example && example.code === source && <p className="explains">{example.explains}</p>}
              <Suspense fallback={<pre className="editor editor-fallback">{source}</pre>}>
                <CodeEditor value={source} onChange={setSource} />
              </Suspense>
            </>
          )}
        </section>

        <section className="pane" aria-label="Preview">
          <div className="pane-head">
            <span>preview · sandboxed</span>
            <span className={status === 'error' ? 'badge badge-error' : 'badge'} role="status" aria-live="polite">
              {status === 'error' && error ? `${error.phase} error` : status}
            </span>
          </div>
          <iframe
            key={frameKey}
            ref={frame}
            className="preview"
            title="Component preview (sandboxed)"
            src="/sandbox.html"
            sandbox="allow-scripts"
          />
          {error && <ErrorPanel error={error} keptPrevious={hasRender} />}
          <div className="panel">
            <div className="tabs" role="tablist" aria-label="Preview inputs">
              <button type="button" role="tab" aria-selected={tab === 'props'} onClick={() => setTab('props')}>
                props
              </button>
              <button type="button" role="tab" aria-selected={tab === 'theme'} onClick={() => setTab('theme')}>
                theme{!themeResult.ok && <span className="tab-alert"> ✕</span>}
              </button>
            </div>
            {tab === 'props' ? (
              <PropsEditor value={propsText} onChange={setPropsText} info={propsInfo} />
            ) : (
              <ThemeEditor value={themeText} onChange={changeTheme} result={themeResult} />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function ErrorPanel({ error, keptPrevious }: { error: PreviewError; keptPrevious: boolean }) {
  const where = error.line ? ` at line ${error.line}${error.column ? `:${error.column}` : ''}` : ''
  return (
    <div className="error-panel" role="alert">
      <strong>
        {error.phase} error{where}
      </strong>
      <pre>{error.message}</pre>
      {error.phase === 'slot' ? (
        <p className="dim">Only the failing slot was replaced; the rest of the component rendered.</p>
      ) : (
        keptPrevious &&
        error.phase !== 'render' &&
        error.phase !== 'runtime' && <p className="dim">Showing the last version that worked.</p>
      )}
    </div>
  )
}

function PropsEditor({
  value,
  onChange,
  info,
}: {
  value: string
  onChange: (v: string) => void
  info: PropsInfo | null
}) {
  const usingExample = value.trim() === ''
  return (
    <div className="props-editor">
      <div className="props-head">
        <label htmlFor="props-json">JSON</label>
        <span className="dim">
          {usingExample ? (info?.exampleProps ? 'using exampleProps' : 'no props') : 'custom'}
        </span>
        {usingExample && info?.exampleProps && (
          <button type="button" className="link-button" onClick={() => onChange(info.exampleProps!)}>
            edit
          </button>
        )}
        {!usingExample && (
          <button type="button" className="link-button" onClick={() => onChange('')}>
            reset
          </button>
        )}
      </div>
      <textarea
        id="props-json"
        spellCheck={false}
        value={value}
        placeholder={info?.exampleProps ?? '{}'}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
      />
    </div>
  )
}

function ThemeEditor({
  value,
  onChange,
  result,
}: {
  value: string
  onChange: (v: string) => void
  result: ResolvedTheme
}) {
  const preset = THEME_PRESETS.find((p) => JSON.stringify(p.theme, null, 2) === value.trim() || (p.id === 'default' && value.trim() === ''))
  return (
    <div className="props-editor">
      <div className="props-head">
        <label htmlFor="theme-json">JSON</label>
        <span className="dim">{value.trim() === '' ? 'default theme' : result.ok ? 'custom' : 'invalid, not applied'}</span>
        <select
          aria-label="Theme presets"
          className="preset-select"
          value={preset?.id ?? ''}
          onChange={(e) => {
            const p = THEME_PRESETS.find((x) => x.id === e.target.value)
            if (p) onChange(p.id === 'default' ? '' : JSON.stringify(p.theme, null, 2))
          }}
        >
          {!preset && <option value="">preset…</option>}
          {THEME_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        id="theme-json"
        spellCheck={false}
        value={value}
        placeholder={'{ "accent": "#2f8f6f", "radius": 6 }'}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        aria-invalid={!result.ok}
        aria-describedby="theme-help"
      />
      {result.ok ? (
        <p id="theme-help" className="theme-help dim">
          tokens: accent, surface, text (hex) · radius 0–24 · space 2–8 · fontScale 0.8–1.4
        </p>
      ) : (
        <div id="theme-help" className="theme-issues" role="alert">
          <pre>{result.issues.join('\n')}</pre>
          <p className="dim">Keeping the last valid theme.</p>
        </div>
      )}
    </div>
  )
}
