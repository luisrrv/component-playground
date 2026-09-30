import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { compile } from '../runtime/compile'
import { evaluate } from '../runtime/evaluate'
import { EXAMPLES } from '../examples'
import * as Kit from '.'
import { readOnlyModule } from './readOnly'

const run = (src: string, modules: Record<string, unknown>) => {
  const r = compile(src)
  if (!r.ok) throw new Error(r.error.message)
  return evaluate(r.code, modules)
}

describe('kit', () => {
  it('renders slots in place', () => {
    const html = renderToString(
      <Kit.Card title="Plan" slots={{ aside: <b>popular</b>, footer: <i>actions</i> }}>
        <Kit.Button slots={{ icon: <u>+</u>, end: <s>3</s> }}>Add</Kit.Button>
      </Kit.Card>,
    )
    expect(html).toContain('kit-card-aside')
    expect(html).toContain('<b>popular</b>')
    expect(html).toContain('kit-card-footer')
    expect(html).toMatch(/kit-button-icon.*<u>\+<\/u>.*Add.*<s>3<\/s>/)
  })

  it('lets a header slot replace the title', () => {
    const html = renderToString(<Kit.Card title="Hidden" slots={{ header: <em>Custom</em> }} />)
    expect(html).toContain('<em>Custom</em>')
    expect(html).not.toContain('Hidden')
  })

  it('is read-only for user code', () => {
    const kit = readOnlyModule(Kit)
    const patch = EXAMPLES.find((x) => x.id === 'patch-kit')!.code
    expect(() => run(patch, { '@kit/ui': kit, 'react/jsx-runtime': {} })).toThrow(TypeError)
    expect(() => run(`import { Button } from '@kit/ui'\n;(Button as any).render = 1\nexport default () => null`, { '@kit/ui': kit })).toThrow(TypeError)
    expect(kit.Button).toBe(Kit.Button)
  })
})
