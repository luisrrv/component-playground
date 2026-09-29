export type ModuleMap = Record<string, unknown>

export type ModuleExports = {
  default?: unknown
  [key: string]: unknown
}

/**
 * Runs compiled module code and returns its exports.
 *
 * `require` resolves only names present in `modules`. In M1 this runs in the
 * host page; from M2 it runs inside the sandbox iframe instead.
 */
export function evaluate(code: string, modules: ModuleMap): ModuleExports {
  const exports: ModuleExports = {}
  const module = { exports }

  const require = (name: string): unknown => {
    if (Object.hasOwn(modules, name)) return modules[name]
    throw new Error(`Cannot find module '${name}'`)
  }

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function('require', 'module', 'exports', code)
  run(require, module, exports)

  return module.exports as ModuleExports
}
