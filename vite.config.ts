/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { HOST_CSP, SANDBOX_CSP } from './src/csp.ts'

/** Adds each page's CSP as a <meta> tag, in production builds only (see src/csp.ts). */
function csp(): Plugin {
  return {
    name: 'csp',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      const policy = ctx.filename.endsWith('sandbox.html') ? SANDBOX_CSP : HOST_CSP
      const tag = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`
      const marker = ctx.filename.endsWith('sandbox.html') ? '<!-- %SANDBOX_CSP% -->' : '<!-- %HOST_CSP% -->'
      if (!html.includes(marker)) throw new Error(`CSP marker missing in ${ctx.filename}`)
      return html.replace(marker, tag)
    },
  }
}

export default defineConfig({
  plugins: [react(), csp()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sandbox: resolve(__dirname, 'sandbox.html'),
      },
    },
  },
  // The sandbox iframe has an opaque ("null") origin, so its module scripts
  // are cross-origin requests (netlify.toml sets the same header in production).
  server: { cors: { origin: '*' } },
  preview: { cors: { origin: '*' } },
  test: {
    environment: 'node',
  },
})
