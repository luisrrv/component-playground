import type { ModuleExports } from './evaluate'

/**
 * The module contract:
 *   export default      the component (required)
 *   export propsSchema  a Zod schema (optional)
 *   export exampleProps props to render with when none are provided (optional)
 *
 * The schema is user code, so this runs inside the sandbox. It's duck-typed
 * (anything with `safeParse`) rather than checked with instanceof, which
 * would break if the schema came from a different copy of Zod.
 */

type Issue = { path?: PropertyKey[]; message: string }
type Schema = { safeParse: (value: unknown) => { success: boolean; data?: unknown; error?: { issues: Issue[] } } }

export type ResolvedProps =
  | { ok: true; props: Record<string, unknown>; source: 'custom' | 'example' | 'none' }
  | { ok: false; message: string }

const isSchema = (value: unknown): value is Schema =>
  typeof value === 'object' && value !== null && typeof (value as Schema).safeParse === 'function'

export function formatIssues(issues: Issue[]): string {
  return issues
    .slice(0, 20)
    .map((i) => `${i.path && i.path.length ? i.path.map(String).join('.') : '(props)'}: ${i.message}`)
    .join('\n')
}

/**
 * Picks the props to render with and validates them.
 * `custom` is what the user typed in the props editor (undefined = use exampleProps).
 */
export function resolveProps(exports: ModuleExports, custom: unknown): ResolvedProps {
  const source = custom !== undefined ? 'custom' : exports.exampleProps !== undefined ? 'example' : 'none'
  const props = source === 'custom' ? custom : source === 'example' ? exports.exampleProps : {}

  if (exports.propsSchema !== undefined && !isSchema(exports.propsSchema)) {
    return { ok: false, message: '`propsSchema` must be a Zod schema (something with a safeParse method).' }
  }

  if (isSchema(exports.propsSchema)) {
    const result = exports.propsSchema.safeParse(props)
    if (!result.success) {
      const label = source === 'example' ? 'exampleProps' : 'props'
      return { ok: false, message: `${label} don't match propsSchema:\n${formatIssues(result.error?.issues ?? [])}` }
    }
    return { ok: true, props: (result.data ?? {}) as Record<string, unknown>, source }
  }

  if (typeof props !== 'object' || props === null || Array.isArray(props)) {
    return { ok: false, message: 'Props must be a JSON object.' }
  }
  return { ok: true, props: props as Record<string, unknown>, source }
}
