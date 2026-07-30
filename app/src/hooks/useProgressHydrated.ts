import { useEffect, useState } from 'react'
import { useProgressStore } from '../store/progress'

/** true после чтения отметок из localStorage (избегаем «пустого» первого кадра). */
export function useProgressHydrated() {
  const [hydrated, setHydrated] = useState(() => useProgressStore.persist.hasHydrated())

  useEffect(() => {
    setHydrated(useProgressStore.persist.hasHydrated())
    return useProgressStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  return hydrated
}
