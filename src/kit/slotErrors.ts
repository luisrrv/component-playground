/**
 * Where kit slot boundaries report errors. Deliberately not exported from
 * @kit/ui, so user code can't replace the reporter; only the sandbox runtime
 * sets it.
 */
type Reporter = (slot: string, error: unknown) => void

let reporter: Reporter = () => {}

export function setSlotErrorReporter(fn: Reporter) {
  reporter = fn
}

export function reportSlotError(slot: string, error: unknown) {
  reporter(slot, error)
}
