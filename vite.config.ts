/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Strict CSP for the sandbox document, added only to production builds
 * (Vite's dev server needs inline scripts and a websocket for HMR).
 *
 * - script-src 'unsafe-eval': user code runs through `new Function`.
 * - connect-src 'none': no fetch/XHR/WebSocket, so user code can't phone home.
 * - no frame/object/form/base: nothing to embed, submit or redirect.
 */
export const SANDBOX_CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  'img-src data: blob:',
  "font-src 'none'",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ')

function sandboxCsp(): Plugin {
  return {
    name: 'sandbox-csp',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      if (!ctx.filename.endsWith('sandbox.html')) return html
      return html.replace(
        '<!-- %SANDBOX_CSP% -->',
        `<meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}" />`,
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), sandboxCsp()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sandbox: resolve(__dirname, 'sandbox.html'),
      },
    },
  },
  server: {
    // The sandbox iframe has an opaque ("null") origin, so its module scripts
    // are cross-origin requests to the dev server.
    cors: { origin: '*' },
  },
  test: {
    environment: 'node',
  },
})
