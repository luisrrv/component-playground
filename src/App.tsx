import { lazy, Suspense, useState } from 'react'
import { EXAMPLES } from './examples'
import { useSandbox, type PreviewError, type PropsInfo } from './host/useSandbox'

// CodeMirror is the largest dependency; load it after the shell renders.
const CodeEditor = lazy(() => import('./editor/CodeEditor').then((m) => ({ default: m.CodeEditor })))

export default function App() {
  const [source, setSource] = useState(EXAMPLES[0].code)
  const [propsText, setPropsText] = useState('')
  const [exampleId, setExampleId] = useState(EXAMPLES[0].id)
  const { frame, frameKey, status, error, propsInfo, reset, hasRender } = useSandbox(source, propsText)
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
          CSP, and recovered from crashes and infinite loops. Pick a <strong>✕</strong> example to watch each safeguard
          catch something.
        </p>
      </div>

      <div className="workspace">
        <section className="pane" aria-label="Editor">
          <div className="pane-head">
            <span>component.tsx</span>
            <select
              aria-label="Examples"
              value={exampleId}
              onChange={(e) => {
                const ex = EXAMPLES.find((x) => x.id === e.target.value)
                if (ex) {
                  reset()
                  setExampleId(ex.id)
                  setSource(ex.code)
                  setPropsText('')
                }
              }}
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
          {example && example.code === source && <p className="explains">{example.explains}</p>}
          <Suspense fallback={<pre className="editor editor-fallback">{source}</pre>}>
            <CodeEditor value={source} onChange={setSource} />
          </Suspense>
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
          <PropsEditor value={propsText} onChange={setPropsText} info={propsInfo} />
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
      {keptPrevious && error.phase !== 'render' && error.phase !== 'runtime' && (
        <p className="dim">Showing the last version that worked.</p>
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
        <label htmlFor="props-json">props (JSON)</label>
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
