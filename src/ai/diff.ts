export type DiffLine = { kind: 'same' | 'add' | 'del'; text: string }

/**
 * Line diff (longest common subsequence). Component files are small, so the
 * O(n·m) table is fine and avoids a diff dependency.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n')
  const b = after.split('\n')
  const n = a.length
  const m = b.length
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ kind: 'del', text: a[i++] })
    } else {
      out.push({ kind: 'add', text: b[j++] })
    }
  }
  while (i < n) out.push({ kind: 'del', text: a[i++] })
  while (j < m) out.push({ kind: 'add', text: b[j++] })
  return out
}

/** Collapses long unchanged runs, keeping `context` lines around each change. */
export function withContext<T extends DiffLine>(lines: T[], context = 2): (T | { kind: 'skip'; count: number })[] {
  const keep = lines.map((_, idx) =>
    lines.slice(Math.max(0, idx - context), idx + context + 1).some((x) => x.kind !== 'same'),
  )
  const out: (T | { kind: 'skip'; count: number })[] = []
  let skipped = 0
  lines.forEach((l, idx) => {
    if (keep[idx]) {
      if (skipped) out.push({ kind: 'skip', count: skipped })
      skipped = 0
      out.push(l)
    } else skipped++
  })
  if (skipped) out.push({ kind: 'skip', count: skipped })
  return out
}
