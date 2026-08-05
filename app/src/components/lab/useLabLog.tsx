import { useCallback, useState } from 'react'

export type LabLogKind = 'ok' | 'err' | 'info'

export type LabLogLine = {
  kind: LabLogKind
  text: string
}

export function useLabLog(limit = 40) {
  const [lines, setLines] = useState<LabLogLine[]>([])

  const log = useCallback(
    (kind: LabLogKind, text: string) => {
      setLines((prev) => [{ kind, text }, ...prev].slice(0, limit))
    },
    [limit],
  )

  const clear = useCallback(() => setLines([]), [])

  return { lines, log, clear }
}
