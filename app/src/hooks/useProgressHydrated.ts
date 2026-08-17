import { useProgressStore } from '../store/progress'

/** true после загрузки отметок из API (избегаем «пустого» первого кадра). */
export function useProgressHydrated() {
  return useProgressStore((s) => s.hydrated)
}
