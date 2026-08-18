import type { LabTabId } from '../components/lab/LabTabs'

const DEFAULT_STAND_ORIGIN = 'https://metaloziz.github.io'

/** GitHub Pages origin; override via `VITE_STAND_ORIGIN` for forks. */
export function getStandOrigin(): string {
  const fromEnv = (import.meta.env.VITE_STAND_ORIGIN as string | undefined)?.trim()
  return (fromEnv || DEFAULT_STAND_ORIGIN).replace(/\/$/, '')
}

/** Shareable URL for a lab tab on the deployed stand. */
export function buildLabStandUrl(topicId: string, labTab: LabTabId = 'code'): string {
  const base = import.meta.env.BASE_URL
  const params = new URLSearchParams({
    theory: '0',
    dock: 'lab',
  })
  if (labTab !== 'code') params.set('labTab', labTab)
  return `${getStandOrigin()}${base}#/topics/${topicId}?${params.toString()}`
}

/** Shareable URL for lab «Решение проблемы» on the deployed stand. */
export function buildLabProblemStandUrl(topicId: string): string {
  return buildLabStandUrl(topicId, 'problem')
}
