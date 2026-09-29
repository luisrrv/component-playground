import { useState } from 'react'
import { CodeEditor } from './editor/CodeEditor'
import { EXAMPLES } from './examples'
import { ErrorBoundary } from './runtime/ErrorBoundary'
import { usePreview, type PreviewError } from './runtime/usePreview'

export default function App() {
  const [source, setSource] = useState(EXAMPLES[0].code)
  const { component, error, version, reportRenderError } = usePreview(source)
  const Preview = component?.C

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
              onChange={(e) => {
                const ex = EXAMPLES.find((x) => x.id === e.target.value)
                if (ex) setSource(ex.code)
              }}
            >
              {EXAMPLES.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.label}
                </option>
              ))}
            </select>
          </div>
          <CodeEditor value={source} onChange={setSource} />
        </section>

        <section className="pane" aria-label="Preview">
          <div className="pane-head">
            <span>preview</span>
            <span className={error ? 'badge badge-error' : 'badge'}>{error ? error.phase + ' error' : 'ok'}</span>
          </div>
          <div className="preview">
            {Preview && (
              <ErrorBoundary key={version} onError={reportRenderError}>
                <Preview />
              </ErrorBoundary>
            )}
          </div>
          {error && <ErrorPanel error={error} />}
          <p className="note">Rendering runs in this page for now; the sandbox comes next.</p>
        </section>
      </div>
    </div>
  )
}

function ErrorPanel({ error }: { error: PreviewError }) {
  const where = error.line ? ` at line ${error.line}${error.column ? `:${error.column}` : ''}` : ''
  return (
    <div className="error-panel" role="alert">
      <strong>
        {error.phase} error{where}
      </strong>
      <pre>{error.message}</pre>
      {error.phase !== 'render' && <p className="dim">Showing the last version that worked.</p>}
    </div>
  )
}
