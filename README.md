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

## How it works

_Coming with the sandbox milestone._

## Key decisions

_ADR-style notes, added as each decision is made._

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
