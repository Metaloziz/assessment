import { apiJson } from './apiBase'

type ProgressListResponse = {
  ok: boolean
  completedIds?: string[]
  error?: string
}

type ProgressTopicResponse = {
  ok: boolean
  topicId?: string
  completed?: boolean
  error?: string
}

export async function fetchProgress(): Promise<string[]> {
  const body = await apiJson<ProgressListResponse>('/api/progress')
  if (!body.ok || !Array.isArray(body.completedIds)) {
    throw new Error(body.error ?? 'Failed to load progress')
  }
  return body.completedIds
}

export async function setTopicCompleted(topicId: string, completed: boolean): Promise<void> {
  const body = await apiJson<ProgressTopicResponse>(`/api/progress/${encodeURIComponent(topicId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  })
  if (!body.ok) {
    throw new Error(body.error ?? 'Failed to update progress')
  }
}

export async function replaceProgress(completedIds: string[]): Promise<void> {
  const body = await apiJson<ProgressListResponse>('/api/progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completedIds }),
  })
  if (!body.ok) {
    throw new Error(body.error ?? 'Failed to replace progress')
  }
}

const LEGACY_STORAGE_KEY = 'assessment-progress'

/** Read completed topic ids from legacy zustand-persist localStorage entry. */
export function readLegacyProgressIds(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { state?: { completedIds?: Record<string, true> } }
    const completedIds = parsed.state?.completedIds
    if (!completedIds || typeof completedIds !== 'object') return []
    return Object.keys(completedIds).filter((id) => completedIds[id])
  } catch {
    return []
  }
}

export function clearLegacyProgress(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(LEGACY_STORAGE_KEY)
}
