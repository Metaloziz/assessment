import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { LabTabId } from '../components/lab/LabTabs'
import { useLayoutStore } from '../store/layout'

export type DockMode = 'topics' | 'lab'

const LAB_TABS: LabTabId[] = ['code', 'problem', 'sandbox']

export function parseLabTabParam(raw: string | null): LabTabId | null {
  if (!raw) return null
  return LAB_TABS.includes(raw as LabTabId) ? (raw as LabTabId) : null
}

export function readDockFromSearch(params: URLSearchParams): DockMode {
  return params.get('dock') === 'lab' ? 'lab' : 'topics'
}

export function readTheoryFromSearch(params: URLSearchParams): boolean {
  return params.get('theory') !== '0'
}

function writeViewParams(
  prev: URLSearchParams,
  patch: { dock?: DockMode; theory?: boolean; labTab?: LabTabId | null },
) {
  const next = new URLSearchParams(prev)
  if (patch.dock !== undefined) {
    if (patch.dock === 'lab') next.set('dock', 'lab')
    else next.delete('dock')
  }
  if (patch.theory !== undefined) {
    if (patch.theory) next.delete('theory')
    else next.set('theory', '0')
  }
  if (patch.labTab !== undefined) {
    if (!patch.labTab || patch.labTab === 'code') next.delete('labTab')
    else next.set('labTab', patch.labTab)
  }
  return next
}

/**
 * Keep layout store in sync with shareable URL on topic pages.
 * Mount once (AppShell). Params: `?dock=lab&theory=0&labTab=problem`
 */
export function useTopicViewUrlSync(enabled: boolean) {
  const [params, setSearchParams] = useSearchParams()
  const labOpen = useLayoutStore((s) => s.labOpen)
  const theoryOpen = useLayoutStore((s) => s.theoryOpen)
  const activeHasLab = useLayoutStore((s) => s.activeHasLab)
  const setLabOpen = useLayoutStore((s) => s.setLabOpen)
  const setTheoryOpen = useLayoutStore((s) => s.setTheoryOpen)
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen)
  const applyingUrl = useRef(false)

  const patchParams = useCallback(
    (patch: { dock?: DockMode; theory?: boolean; labTab?: LabTabId | null }) => {
      setSearchParams((prev) => writeViewParams(prev, patch), { replace: true })
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (!enabled) return
    applyingUrl.current = true
    const dock = readDockFromSearch(params)
    const theory = readTheoryFromSearch(params)
    const wantLab = dock === 'lab' && activeHasLab

    setLabOpen(wantLab)
    setTheoryOpen(theory)
    if (wantLab) setSidebarOpen(true)

    queueMicrotask(() => {
      applyingUrl.current = false
    })
  }, [enabled, params, activeHasLab, setLabOpen, setTheoryOpen, setSidebarOpen])

  useEffect(() => {
    if (!enabled || applyingUrl.current) return
    const dock: DockMode = labOpen ? 'lab' : 'topics'
    const urlDock = readDockFromSearch(params)
    const urlTheory = readTheoryFromSearch(params)
    if (dock === urlDock && theoryOpen === urlTheory) return
    patchParams({ dock, theory: theoryOpen })
  }, [enabled, labOpen, theoryOpen, params, patchParams])

  const setDock = useCallback(
    (dock: DockMode) => {
      if (dock === 'lab' && !activeHasLab) return
      applyingUrl.current = true
      setLabOpen(dock === 'lab')
      if (dock === 'lab') setSidebarOpen(true)
      patchParams({ dock })
      queueMicrotask(() => {
        applyingUrl.current = false
      })
    },
    [activeHasLab, setLabOpen, setSidebarOpen, patchParams],
  )

  const setTheory = useCallback(
    (open: boolean) => {
      applyingUrl.current = true
      setTheoryOpen(open)
      patchParams({ theory: open })
      queueMicrotask(() => {
        applyingUrl.current = false
      })
    },
    [setTheoryOpen, patchParams],
  )

  return { setDock, setTheory }
}

/** Lab inner tabs ↔ `labTab` query param. */
export function useLabTabUrl(enabled: boolean, fallback: LabTabId = 'code') {
  const [params, setSearchParams] = useSearchParams()
  const fromUrl = parseLabTabParam(params.get('labTab'))
  const active = enabled ? fromUrl ?? fallback : fallback

  const setLabTab = useCallback(
    (tab: LabTabId) => {
      if (!enabled) return
      setSearchParams((prev) => writeViewParams(prev, { labTab: tab }), { replace: true })
    },
    [enabled, setSearchParams],
  )

  return { labTab: active, setLabTab, fromUrl }
}
