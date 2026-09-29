import { useState } from 'react'
import { CodeEditor } from './editor/CodeEditor'
import { EXAMPLES } from './examples'
import { useSandbox, type PreviewError, type PropsInfo } from './host/useSandbox'

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
        </nav>
      </header>

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
          <CodeEditor value={source} onChange={setSource} />
        </section>

        <section className="pane" aria-label="Preview">
          <div className="pane-head">
            <span>preview · sandboxed</span>
            <span className={status === 'error' ? 'badge badge-error' : 'badge'}>
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
