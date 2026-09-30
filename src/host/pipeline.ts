/** The compile pipeline, loaded lazily (Sucrase + acorn are most of the host bundle). */
let pipeline: Promise<typeof import('../runtime/pipeline')> | null = null
export const loadPipeline = () => (pipeline ??= import('../runtime/pipeline'))
