import { create } from 'zustand'
import {
  clearLegacyProgress,
  fetchProgress,
  readLegacyProgressIds,
  replaceProgress,
  setTopicCompleted,
} from '../lib/progressApi'

type ProgressState = {
  completedIds: Record<string, true>
  hydrated: boolean
  syncError: string | null
  loadProgress: () => Promise<void>
  toggleCompleted: (topicId: string) => void
  isCompleted: (topicId: string) => boolean
  completedCount: () => number
}

let loadPromise: Promise<void> | null = null

function idsToRecord(ids: string[]): Record<string, true> {
  const record: Record<string, true> = {}
  for (const id of ids) {
    record[id] = true
  }
  return record
}

export const useProgressStore = create<ProgressState>()((set, get) => ({
  completedIds: {},
  hydrated: false,
  syncError: null,

  loadProgress: async () => {
    if (loadPromise) return loadPromise

    loadPromise = (async () => {
      try {
        let completedIds = await fetchProgress()
        const legacyIds = readLegacyProgressIds()

        if (completedIds.length === 0 && legacyIds.length > 0) {
          await replaceProgress(legacyIds)
          completedIds = legacyIds
        }

        clearLegacyProgress()
        set({
          completedIds: idsToRecord(completedIds),
          hydrated: true,
          syncError: null,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        set({
          hydrated: true,
          syncError: message,
        })
      } finally {
        loadPromise = null
      }
    })()

    return loadPromise
  },

  toggleCompleted: (topicId) => {
    const wasCompleted = Boolean(get().completedIds[topicId])
    const nextCompleted = !wasCompleted

    set((state) => {
      const next = { ...state.completedIds }
      if (nextCompleted) {
        next[topicId] = true
      } else {
        delete next[topicId]
      }
      return { completedIds: next, syncError: null }
    })

    void setTopicCompleted(topicId, nextCompleted).catch((err) => {
      const message = err instanceof Error ? err.message : String(err)
      set((state) => {
        const next = { ...state.completedIds }
        if (wasCompleted) {
          next[topicId] = true
        } else {
          delete next[topicId]
        }
        return { completedIds: next, syncError: message }
      })
    })
  },

  isCompleted: (topicId) => Boolean(get().completedIds[topicId]),
  completedCount: () => Object.keys(get().completedIds).length,
}))
