import { z } from 'zod'

/**
 * Messages between the host page and the sandbox iframe.
 *
 * Both sides validate everything they receive: the sandbox runs untrusted
 * code, so the host treats its messages as untrusted input too.
 */

export const ErrorPhase = z.enum(['compile', 'import', 'evaluate', 'props', 'validate', 'render', 'runtime', 'slot', 'timeout'])
export type ErrorPhase = z.infer<typeof ErrorPhase>

// host -> sandbox
export const HostMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('render'),
    id: z.number().int(),
    code: z.string(),
    // Parsed JSON from the props editor; absent means "use exampleProps".
    props: z.unknown().optional(),
  }),
  // Clear the preview, e.g. when switching examples, so "last version that
  // worked" never shows a different component.
  z.object({ type: z.literal('clear') }),
  // Theme overrides from the theme panel. Checked again in the sandbox
  // (resolveTheme) before any value reaches the page.
  z.object({ type: z.literal('theme'), theme: z.unknown() }),
  // Watchdog heartbeat; a sandbox stuck in a loop can't answer.
  z.object({ type: z.literal('ping'), n: z.number().int() }),
])
export type HostMessage = z.infer<typeof HostMessage>

// sandbox -> host
export const SandboxMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('pong'), n: z.number().int() }),
  z.object({
    type: z.literal('rendered'),
    id: z.number().int(),
    propsSource: z.enum(['custom', 'example', 'none']),
    // exampleProps as JSON, so the host can offer them in the props editor.
    exampleProps: z.string().max(10_000).nullable(),
    // Slots that failed during this render; the rest of the component rendered.
    slotErrors: z.array(z.string().max(500)).max(10).optional(),
  }),
  z.object({
    type: z.literal('error'),
    id: z.number().int().nullable(),
    phase: ErrorPhase,
    message: z.string().max(2000),
    // Sent with validation errors so the host can still offer exampleProps for editing.
    exampleProps: z.string().max(10_000).nullable().optional(),
  }),
])
export type SandboxMessage = z.infer<typeof SandboxMessage>
