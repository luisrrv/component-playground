import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the shell', () => {
    const html = renderToString(<App />)
    expect(html).toContain('component-playground')
  })
})
