import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ProgressState = {
  completedIds: Record<string, true>
  hydrated: boolean
  loadProgress: () => Promise<void>
  toggleCompleted: (topicId: string) => void
  isCompleted: (topicId: string) => boolean
  completedCount: () => number
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedIds: {},
      hydrated: false,

      loadProgress: async () => {
        if (get().hydrated) return
        await useProgressStore.persist.rehydrate()
        set({ hydrated: true })
      },

      toggleCompleted: (topicId) => {
        set((state) => {
          const next = { ...state.completedIds }
          if (next[topicId]) {
            delete next[topicId]
          } else {
            next[topicId] = true
          }
          return { completedIds: next }
        })
      },

      isCompleted: (topicId) => Boolean(get().completedIds[topicId]),
      completedCount: () => Object.keys(get().completedIds).length,
    }),
    {
      name: 'assessment-progress',
      partialize: (state) => ({ completedIds: state.completedIds }),
      onRehydrateStorage: () => () => {
        useProgressStore.setState({ hydrated: true })
      },
    },
  ),
)
