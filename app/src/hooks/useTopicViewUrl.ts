import { useCallback, useLayoutEffect, useRef, useState } from 'react'
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

/** Topics visible only when `topics=1`; absent param → hidden (old links). */
export function readTopicsFromSearch(params: URLSearchParams): boolean {
  return params.get('topics') === '1'
}

export function isEmptySearch(params: URLSearchParams): boolean {
  return [...params.keys()].length === 0
}

/** Read query params from hash route (`#/topics/id?…`). */
export function readHashSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams()
  const hash = window.location.hash
  const qIndex = hash.indexOf('?')
  return new URLSearchParams(qIndex >= 0 ? hash.slice(qIndex + 1) : '')
}

export type ViewPanelState = {
  topicsOpen: boolean
  labOpen: boolean
  theoryOpen: boolean
}

/** Derive panel flags from URL (pure, no activeHasLab gate). */
export function readViewStateFromSearch(params: URLSearchParams): ViewPanelState {
  if (isEmptySearch(params)) {
    return { topicsOpen: true, labOpen: false, theoryOpen: true }
  }
  return {
    topicsOpen: readTopicsFromSearch(params),
    labOpen: readDockFromSearch(params) === 'lab',
    theoryOpen: readTheoryFromSearch(params),
  }
}

export function readInitialViewState(): ViewPanelState {
  return readViewStateFromSearch(readHashSearchParams())
}

function writeViewParams(
  prev: URLSearchParams,
  patch: {
    dock?: DockMode
    theory?: boolean
    topics?: boolean
    labTab?: LabTabId | null
  },
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
  if (patch.topics !== undefined) {
    if (patch.topics) next.set('topics', '1')
    else next.delete('topics')
  }
  if (patch.labTab !== undefined) {
    if (!patch.labTab || patch.labTab === 'code') next.delete('labTab')
    else next.set('labTab', patch.labTab)
  }
  return next
}

/**
 * Keep layout store in sync with shareable URL on topic pages.
 * Mount once (AppShell). Params: `?topics=1&dock=lab&theory=0&labTab=problem`
 */
export function useTopicViewUrlSync(enabled: boolean) {
  const [params, setSearchParams] = useSearchParams()
  const topicsOpen = useLayoutStore((s) => s.topicsOpen)
  const labOpen = useLayoutStore((s) => s.labOpen)
  const theoryOpen = useLayoutStore((s) => s.theoryOpen)
  const activeHasLab = useLayoutStore((s) => s.activeHasLab)
  const setTopicsOpen = useLayoutStore((s) => s.setTopicsOpen)
  const setLabOpen = useLayoutStore((s) => s.setLabOpen)
  const setTheoryOpen = useLayoutStore((s) => s.setTheoryOpen)
  const applyingUrl = useRef(false)
  const seededDefault = useRef(false)
  const [viewReady, setViewReady] = useState(!enabled)

  const patchParams = useCallback(
    (patch: {
      dock?: DockMode
      theory?: boolean
      topics?: boolean
      labTab?: LabTabId | null
    }) => {
      setSearchParams((prev) => writeViewParams(prev, patch), { replace: true })
    },
    [setSearchParams],
  )

  useLayoutEffect(() => {
    if (!enabled) {
      setViewReady(true)
      return
    }

    applyingUrl.current = true

    if (isEmptySearch(params) && !seededDefault.current) {
      seededDefault.current = true
      setTopicsOpen(true)
      setTheoryOpen(true)
      setLabOpen(false)
      patchParams({ topics: true, theory: true, dock: 'topics' })
    } else {
      const view = readViewStateFromSearch(params)
      setTopicsOpen(view.topicsOpen)
      setLabOpen(view.labOpen)
      setTheoryOpen(view.theoryOpen)
    }

    setViewReady(true)

    queueMicrotask(() => {
      applyingUrl.current = false
    })
  }, [enabled, params, setTopicsOpen, setLabOpen, setTheoryOpen, patchParams])

  useLayoutEffect(() => {
    if (!enabled || applyingUrl.current) return
    if (isEmptySearch(params) && !seededDefault.current) return

    const dock: DockMode = labOpen ? 'lab' : 'topics'
    const urlDock = readDockFromSearch(params)
    const urlTheory = readTheoryFromSearch(params)
    const urlTopics = readTopicsFromSearch(params)

    if (dock === urlDock && theoryOpen === urlTheory && topicsOpen === urlTopics) return
    patchParams({ dock, theory: theoryOpen, topics: topicsOpen })
  }, [enabled, labOpen, theoryOpen, topicsOpen, params, patchParams])

  const setTopics = useCallback(
    (open: boolean) => {
      applyingUrl.current = true
      setTopicsOpen(open)
      patchParams({ topics: open })
      queueMicrotask(() => {
        applyingUrl.current = false
      })
    },
    [setTopicsOpen, patchParams],
  )

  const setDock = useCallback(
    (dock: DockMode) => {
      if (dock === 'lab' && !activeHasLab) return
      applyingUrl.current = true
      setLabOpen(dock === 'lab')
      patchParams({ dock })
      queueMicrotask(() => {
        applyingUrl.current = false
      })
    },
    [activeHasLab, setLabOpen, patchParams],
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

  return { setTopics, setDock, setTheory, viewReady }
}

/** Lab inner tabs ↔ `labTab` query param. */
export function useLabTabUrl(enabled: boolean, fallback: LabTabId = 'code') {
  const [params, setSearchParams] = useSearchParams()
  const fromUrl = parseLabTabParam(params.get('labTab'))
  const active = enabled ? (fromUrl ?? fallback) : fallback

  const setLabTab = useCallback(
    (tab: LabTabId) => {
      if (!enabled) return
      setSearchParams((prev) => writeViewParams(prev, { labTab: tab }), { replace: true })
    },
    [enabled, setSearchParams],
  )

  return { labTab: active, setLabTab, fromUrl }
}
