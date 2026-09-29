import { describe, expect, it } from 'vitest'
import { compile } from './compile'
import { disallowedImports, findImports } from './imports'

const compiled = (src: string) => {
  const r = compile(src)
  if (!r.ok) throw new Error(r.error.message)
  return r.code
}

describe('imports', () => {
  it('lists every imported module', () => {
    const code = compiled(`import { useState } from 'react'\nimport { Card } from '@kit/ui'\nexport default () => <Card>{String(useState)}</Card>`)
    expect(findImports(code)).toEqual(['react/jsx-runtime', 'react', '@kit/ui'])
    expect(disallowedImports(code)).toEqual([])
  })

  it('flags anything outside the allowlist', () => {
    const code = compiled(`import _ from 'lodash'\nimport fs from 'fs'\nexport default () => <p>{_.x}{fs.y}</p>`)
    expect(disallowedImports(code)).toEqual(['lodash', 'fs'])
  })

  it('flags relative imports and re-exports too', () => {
    const code = compiled(`export { x } from './secret'\nexport default () => null`)
    expect(disallowedImports(code)).toEqual(['./secret'])
  })
})
