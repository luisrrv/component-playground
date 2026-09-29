import { z } from 'zod'

/**
 * Messages between the host page and the sandbox iframe.
 *
 * Both sides validate everything they receive: the sandbox runs untrusted
 * code, so the host treats its messages as untrusted input too.
 */

export const ErrorPhase = z.enum(['compile', 'import', 'evaluate', 'render', 'runtime'])
export type ErrorPhase = z.infer<typeof ErrorPhase>

// host -> sandbox
export const HostMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('render'), id: z.number().int(), code: z.string() }),
])
export type HostMessage = z.infer<typeof HostMessage>

// sandbox -> host
export const SandboxMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('rendered'), id: z.number().int() }),
  z.object({
    type: z.literal('error'),
    id: z.number().int().nullable(),
    phase: ErrorPhase,
    message: z.string().max(2000),
  }),
])
export type SandboxMessage = z.infer<typeof SandboxMessage>
