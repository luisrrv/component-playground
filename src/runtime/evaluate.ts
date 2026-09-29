export type ModuleMap = Record<string, unknown>

export type ModuleExports = {
  default?: unknown
  [key: string]: unknown
}

/**
 * Runs compiled module code and returns its exports.
 *
 * `require` resolves only names present in `modules`; anything else throws,
 * even if the name is computed at runtime. Runs inside the sandbox iframe.
 */
export function evaluate(
  code: string,
  modules: ModuleMap,
  notFound: (name: string) => string = (name) => `Cannot find module '${name}'`,
): ModuleExports {
  const exports: ModuleExports = {}
  const module = { exports }

  const require = (name: string): unknown => {
    if (Object.hasOwn(modules, name)) return modules[name]
    throw new Error(notFound(name))
  }

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function('require', 'module', 'exports', code)
  run(require, module, exports)

  return module.exports as ModuleExports
}
