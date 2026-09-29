import { type ReactNode, useEffect } from 'react'

/** Reports success only after React has actually committed the tree. */
export function Committed({ onCommit, children }: { onCommit: () => void; children: ReactNode }) {
  useEffect(onCommit, [onCommit])
  return children
}
