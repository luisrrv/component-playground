/**
 * The only modules user code can import. Shared by the host (static check,
 * before anything runs) and the sandbox (enforced again at runtime).
 */
export const ALLOWED_MODULES = ['react', 'zod', '@kit/ui'] as const

/** Added by the compiler for JSX; allowed but not shown to users. */
export const INTERNAL_MODULES = ['react/jsx-runtime'] as const

export const isAllowed = (name: string) =>
  (ALLOWED_MODULES as readonly string[]).includes(name) ||
  (INTERNAL_MODULES as readonly string[]).includes(name)

export const notAvailableMessage = (name: string) =>
  `'${name}' is not available in this sandbox. You can import from: ${ALLOWED_MODULES.join(', ')}.`
