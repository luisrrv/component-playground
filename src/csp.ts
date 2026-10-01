/**
 * Content Security Policies, added as <meta> tags to production builds only
 * (Vite's dev server needs inline scripts and a websocket for HMR).
 */

/** The only origins the host page may send requests to besides itself. */
export const PROVIDER_ORIGINS = ['https://api.openai.com'] as const

/**
 * The sandbox document: runs untrusted code.
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

/**
 * The host page: holds the API key while the AI panel is open.
 * - connect-src: only this site and the AI provider, so the key can't be sent
 *   anywhere else even if something on the page misbehaved.
 * - script-src 'self': no inline or third-party scripts, and no eval (user
 *   code never runs here; it runs in the sandbox).
 * - style-src 'unsafe-inline': the editor injects its own <style> tags.
 */
export const HOST_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  `connect-src 'self' ${PROVIDER_ORIGINS.join(' ')}`,
  "frame-src 'self'",
  "object-src 'none'",
  "worker-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ')
