import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ProgressState = {
  completedIds: Record<string, true>
  toggleCompleted: (topicId: string) => void
  isCompleted: (topicId: string) => boolean
  completedCount: () => number
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedIds: {},
      toggleCompleted: (topicId) =>
        set((state) => {
          const next = { ...state.completedIds }
          if (next[topicId]) {
            delete next[topicId]
          } else {
            next[topicId] = true
          }
          return { completedIds: next }
        }),
      isCompleted: (topicId) => Boolean(get().completedIds[topicId]),
      completedCount: () => Object.keys(get().completedIds).length,
    }),
    { name: 'assessment-progress' },
  ),
)
