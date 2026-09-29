export type Example = { id: string; label: string; code: string }

export const EXAMPLES: Example[] = [
  {
    id: 'profile-card',
    label: 'Profile card',
    code: `import { useState } from 'react'
import { Badge, Button, Card, Stack, Text } from '@kit/ui'

type Props = {
  name: string
  role: string
}

export default function ProfileCard({ name = 'Ada Lovelace', role = 'Engineer' }: Props) {
  const [following, setFollowing] = useState(false)

  return (
    <Card title={name}>
      <Stack gap={12}>
        <Text tone="muted">{role}</Text>
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
