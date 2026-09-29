export type Example = { id: string; label: string; code: string }

export const EXAMPLES: Example[] = [
  {
    id: 'profile-card',
    label: 'Profile card',
    code: `import { useState } from 'react'

type Props = {
  name: string
  role: string
}

export default function ProfileCard({ name = 'Ada Lovelace', role = 'Engineer' }: Props) {
  const [likes, setLikes] = useState(0)

  return (
    <div style={{ border: '1px solid #454545', padding: 16, maxWidth: 280 }}>
      <strong>{name}</strong>
      <p style={{ color: '#959592', margin: '4px 0 12px' }}>{role}</p>
      <button onClick={() => setLikes(likes + 1)}>
        ♥ {likes}
      </button>
    </div>
  )
}
`,
  },
]
