import { isAllowed } from '../allowlist'

// Sucrase's `imports` transform turns every static import/export-from into a
// `require('name')` call with a string literal.
const REQUIRE_CALL = /\brequire\(\s*(['"])([^'"]+)\1\s*\)/g

/** Module names the compiled code asks for, in order of first appearance. */
export function findImports(code: string): string[] {
  const names = new Set<string>()
  for (const match of code.matchAll(REQUIRE_CALL)) names.add(match[2])
  return [...names]
}

/**
 * Static check in the host: reject disallowed imports before the code is sent
 * to the sandbox. Dynamic tricks (`require(someVar)`) slip past this, which is
 * why the sandbox's `require` enforces the same list at runtime.
 */
export function disallowedImports(code: string): string[] {
  return findImports(code).filter((name) => !isAllowed(name))
}
