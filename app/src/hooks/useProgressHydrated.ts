import { useProgressStore } from '../store/progress'

/** true после гидрации отметок из localStorage (избегаем «пустого» первого кадра). */
export function useProgressHydrated() {
  return useProgressStore((s) => s.hydrated)
}
