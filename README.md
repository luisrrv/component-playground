# component-playground

Write a React component and watch it render inside a sandbox that assumes the code is untrusted.

> **Status:** work in progress. The sections below fill in as each piece lands.

## What it demonstrates

Letting people run their own UI code inside your app without letting that code break, hang, or reach into the host page:

- **Compile** TSX in the browser
- **Scope** imports to an allowlist
- **Validate** props against a schema before rendering
- **Isolate** rendering in a sandboxed iframe with a strict CSP
- **Recover** from render errors and infinite loops

## Writing a component

A module can export three things:

```tsx
import { z } from 'zod'
import { Card, Text } from '@kit/ui'

// optional: the props contract, checked before every render
export const propsSchema = z.object({ name: z.string().min(1) })

// optional: props to render with when the props editor is empty
export const exampleProps = { name: 'Ada' }

// required: the component
export default function Hello({ name }: z.infer<typeof propsSchema>) {
  return <Card title={`Hello, ${name}`}><Text>👋</Text></Card>
}
```

Imports are limited to `react`, `zod` and `@kit/ui` (`Card`, `Stack`, `Text`, `Button`, `Badge`).

## Failure gallery

Every safeguard has an example that trips it on purpose (pick one from the ✕ list in the editor):

| Example | Caught by | Result |
|---|---|---|
| Disallowed import | host import scan | `import error`, code never runs |
| Dynamic `require(name)` | sandbox `require` | `evaluate error` |
| Invalid props | Zod `propsSchema` | `validate error` with each issue |
| Throw during render | error boundary | `render error` |
| Throw in a click handler | `window.onerror` in the sandbox | `runtime error` |
| `while (true) {}` | loop guard | `render error` after 1s |
| Regex backtracking | watchdog | sandbox restarted after 3s |
| `fetch()` | CSP `connect-src 'none'` | request blocked |
| `window.parent.document`, cookies, storage, top navigation | opaque origin + sandbox flags | `SecurityError` |

## How it works

```
Host page (trusted)                        Sandbox iframe (untrusted)
───────────────────                        ─────────────────────────────
editor ─▶ compile TSX (Sucrase)            sandbox="allow-scripts", opaque origin
           │ syntax error → shown here     CSP: connect-src 'none', no external code
           ▼
   postMessage {render, id, code} ──────▶  evaluate module with a scoped require()
                                           render inside an error boundary
   ◀────── {rendered | error{phase}} ───── report errors (evaluate / validate / render / runtime)
```

- **Compile in the host.** It's a pure string transform, so syntax errors show even if the sandbox is down.
- **Execute in the sandbox.** Everything that runs user code happens inside the iframe.
- **Validate both directions.** Messages are checked with Zod on both sides and tagged with a render id, so a slow, stale result can't overwrite a newer one.

## Key decisions

| Decision | Why | Tradeoff |
|---|---|---|
| **Sucrase for in-browser compile** | Small and fast; strips types and rewrites JSX and imports, which is all a preview needs. | No type-checking. |
| **Imports become `require()` calls** | Sucrase's `imports` transform gives one choke point where the runtime decides which modules exist. | CommonJS-style output instead of native ES modules. |
| **Sandboxed iframe without `allow-same-origin`** | The frame gets an opaque origin: no access to the host's DOM, cookies or storage, enforced by the browser. | Its own scripts load cross-origin, so `/assets/*` is served with `Access-Control-Allow-Origin: *`. |
| **Import allowlist, checked twice** | The host scans compiled `require()` calls and rejects anything outside `react`, `zod` and `@kit/ui` before sending code; the sandbox's `require` enforces the same list, which also catches computed names like `require(someVar)`. | Only a fixed set of modules is available. Globals like `window` aren't covered by the allowlist; the iframe and CSP contain those. |
| **Props schema validated in the sandbox** | The schema is user code, so it runs where user code runs. Invalid props show as a list of issues and the component never sees bad data. | Duck-typed (`safeParse`), so any Zod-compatible schema works; there's no check that the schema matches the component's TypeScript types. |
| **Loop guard (code instrumentation)** | Every loop gets a time check (via acorn + magic-string) that throws after 1s, so infinite loops become ordinary errors in every browser. | Adds a function call per iteration; it's a usability safeguard, not a security boundary. |
| **Watchdog (heartbeat + restart)** | The host pings the sandbox every second; after 3s of silence it throws the iframe away and starts a fresh one, without resending the code that hung. | Relies on the iframe running on its own thread. Chromium isolates sandboxed frames in their own process; browsers that don't can freeze the tab while the sandbox is stuck. |
| **CSP inside the sandbox** | `connect-src 'none'` blocks `fetch`/XHR/WebSocket, so user code can't send data anywhere. | Needs `'unsafe-eval'` because user code runs via `new Function`; the CSP is added to production builds only, since the dev server needs HMR. |
| **`postMessage` with target `'*'`** | An opaque origin can't be addressed by name. Both sides instead check `event.source` and validate the payload. | Messages must never carry anything sensitive; they only carry the user's own code and render status. |

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run lint       # oxlint
npm run build      # type-check + production build to dist/
```

Requires Node 20.19+ (see `.nvmrc`).

## Stack

Vite · React · TypeScript · Vitest · Netlify

## License

MIT
