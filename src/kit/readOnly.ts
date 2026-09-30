/**
 * The kit as user code sees it: a frozen object of frozen components, so
 * `ui.Button = MyButton` (or patching a component) throws instead of changing
 * the kit. `__esModule` makes the compiled import helpers use this object
 * as-is rather than copying it into a writable one.
 */
export function readOnlyModule(mod: Record<string, unknown>): Readonly<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(mod)) out[name] = Object.freeze(value)
  Object.defineProperty(out, '__esModule', { value: true })
  return Object.freeze(out)
}
