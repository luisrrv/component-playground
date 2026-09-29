import { parse, type Node } from 'acorn'
import { ancestor } from 'acorn-walk'
import MagicString from 'magic-string'

/** Name of the global the sandbox defines; see sandbox/main.tsx. */
export const GUARD_NAME = '__loopGuard'
export const LOOP_LIMIT_MS = 1000

type Loop = Node & { body: Node & { type: string } }

const LOOP_TYPES = ['WhileStatement', 'DoWhileStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement']

/**
 * Instruments every loop so it throws after running for LOOP_LIMIT_MS:
 *
 *   while (x) { body }
 *   // becomes
 *   { const __t1 = performance.now(); while (x) { __loopGuard(__t1); body } }
 *
 * The sandbox's `__loopGuard` throws once the loop has run too long, which
 * surfaces as a normal render/runtime error. This works in every browser,
 * unlike the host watchdog, which relies on the iframe running in its own
 * process. It's a usability safeguard, not a security boundary: code that
 * hangs another way (e.g. a regex) is still caught by the watchdog.
 */
export function guardLoops(code: string): string {
  const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true })
  const s = new MagicString(code)
  let n = 0

  ancestor(ast, {
    // acorn-walk calls this for every node type listed below.
    ...Object.fromEntries(
      LOOP_TYPES.map((type) => [
        type,
        (node: Node, _state: unknown, ancestors: Node[]) => {
          const loop = node as Loop
          const id = `__t${++n}`
          // A labeled loop must stay directly after its label, so wrap the label too.
          const parent = ancestors[ancestors.length - 2]
          const outer = parent?.type === 'LabeledStatement' ? parent : loop

          const check = `${GUARD_NAME}(${id});`
          if (loop.body.type === 'BlockStatement') {
            s.appendLeft(loop.body.start + 1, check)
          } else {
            s.appendLeft(loop.body.start, `{${check}`)
            s.appendRight(loop.body.end, '}')
          }
          s.prependLeft(outer.start, `{const ${id}=performance.now();`)
          s.appendRight(outer.end, '}')
        },
      ]),
    ),
  })

  return s.toString()
}
