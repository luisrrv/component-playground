export type Example = { id: string; label: string; code: string }

export const EXAMPLES: Example[] = [
  {
    id: 'profile-card',
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
    label: '✕ Invalid props',
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
    label: '✕ Disallowed import',
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
    label: '✕ Dynamic require',
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
]
