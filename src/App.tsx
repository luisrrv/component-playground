export default function App() {
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
      <main className="content">
        <h1>component-playground</h1>
        <p className="dim">
          Write a React component and watch it render inside a sandbox that assumes the code is
          untrusted.
        </p>
        <p className="status">work in progress</p>
      </main>
    </div>
  )
}
