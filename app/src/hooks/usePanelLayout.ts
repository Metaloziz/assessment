import { useCallback, useMemo } from 'react'
import {
  equalPanelWeights,
  panelComboKey,
  type PanelId,
  useLayoutStore,
  visiblePanels,
} from '../store/layout'

export const RESIZER_WIDTH = 6
export const MIN_PANEL_WIDTH = 200

function readSidebarWidthPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim()
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300
}

function minWidthForPanel(id: PanelId): number {
  return id === 'topics' ? readSidebarWidthPx() : MIN_PANEL_WIDTH
}

export function getPanelWeights(
  panelIds: PanelId[],
  panelSizes: Record<string, number[]>,
): number[] {
  if (panelIds.length === 0) return []
  const key = panelComboKey(panelIds)
  if (!key) return equalPanelWeights(panelIds.length)
  const saved = panelSizes[key]
  if (saved && saved.length === panelIds.length) {
    const sum = saved.reduce((acc, n) => acc + n, 0)
    if (sum > 0) return saved.map((n) => n / sum)
  }
  return equalPanelWeights(panelIds.length)
}

export function computePanelWidthsPx(
  workspaceWidth: number,
  panelIds: PanelId[],
  weights: number[],
): number[] {
  if (panelIds.length === 0) return []
  if (panelIds.length === 1) {
    return [Math.max(0, workspaceWidth)]
  }

  const resizerTotal = (panelIds.length - 1) * RESIZER_WIDTH
  const available = Math.max(0, workspaceWidth - resizerTotal)
  const mins = panelIds.map(minWidthForPanel)

  let widths = weights.map((w) => w * available)

  for (let pass = 0; pass < panelIds.length * 2; pass++) {
    let changed = false
    for (let i = 0; i < panelIds.length; i++) {
      if (widths[i] < mins[i]) {
        const deficit = mins[i] - widths[i]
        widths[i] = mins[i]
        const donors = widths
          .map((w, j) => ({ w, j }))
          .filter(({ w, j }) => j !== i && w > mins[j])
        const donorTotal = donors.reduce((acc, { w, j }) => acc + (w - mins[j]), 0)
        if (donorTotal > 0) {
          for (const { j } of donors) {
            const give = (deficit * (widths[j] - mins[j])) / donorTotal
            widths[j] = Math.max(mins[j], widths[j] - give)
          }
        }
        changed = true
      }
    }
    if (!changed) break
  }

  const sum = widths.reduce((acc, n) => acc + n, 0)
  if (sum > available && sum > 0) {
    widths = widths.map((w) => (w / sum) * available)
  }

  return widths.map((w, i) => Math.max(mins[i], Math.round(w)))
}

export function weightsFromWidths(widths: number[], available: number): number[] {
  if (available <= 0) return equalPanelWeights(widths.length)
  return normalizeSum(widths.map((w) => w / available))
}

function normalizeSum(values: number[]): number[] {
  const sum = values.reduce((acc, n) => acc + n, 0)
  if (sum <= 0) return equalPanelWeights(values.length)
  return values.map((n) => n / sum)
}

/** Drag resizer between panelIds[resizerIndex] and panelIds[resizerIndex + 1]. */
export function resizeAtBoundary(
  panelIds: PanelId[],
  weights: number[],
  resizerIndex: number,
  pointerX: number,
  workspaceLeft: number,
  workspaceWidth: number,
): number[] {
  if (panelIds.length < 2 || resizerIndex < 0 || resizerIndex >= panelIds.length - 1) {
    return weights
  }

  const resizerTotal = (panelIds.length - 1) * RESIZER_WIDTH
  const available = Math.max(0, workspaceWidth - resizerTotal)
  const mins = panelIds.map(minWidthForPanel)
  const widths = weights.map((w) => w * available)

  let panelStart = workspaceLeft
  for (let i = 0; i < resizerIndex; i++) {
    panelStart += widths[i] + RESIZER_WIDTH
  }

  const pairTotal = widths[resizerIndex] + widths[resizerIndex + 1]
  let nextLeft = pointerX - panelStart
  nextLeft = Math.max(mins[resizerIndex], nextLeft)
  nextLeft = Math.min(pairTotal - mins[resizerIndex + 1], nextLeft)

  widths[resizerIndex] = nextLeft
  widths[resizerIndex + 1] = pairTotal - nextLeft

  return weightsFromWidths(widths, available)
}

export type PanelLayoutResult = {
  comboKey: string | null
  visibleIds: PanelId[]
  weights: number[]
  widthByPanel: Record<PanelId, number>
  resizerAfter: Record<PanelId, boolean>
}

export function buildPanelLayout(
  workspaceWidth: number,
  open: { topics: boolean; lab: boolean; theory: boolean },
  panelSizes: Record<string, number[]>,
): PanelLayoutResult {
  const visibleIds = visiblePanels(open)
  const comboKey = panelComboKey(visibleIds)
  const weights = getPanelWeights(visibleIds, panelSizes)
  const visibleWidths = computePanelWidthsPx(workspaceWidth, visibleIds, weights)

  const widthByPanel: Record<PanelId, number> = {
    topics: 0,
    lab: 0,
    theory: 0,
  }
  visibleIds.forEach((id, i) => {
    widthByPanel[id] = visibleWidths[i] ?? 0
  })

  const resizerAfter: Record<PanelId, boolean> = {
    topics: false,
    lab: false,
    theory: false,
  }

  if (open.topics && (open.lab || open.theory)) {
    resizerAfter.topics = true
  }
  if (open.lab && open.theory) {
    resizerAfter.lab = true
  }

  return { comboKey, visibleIds, weights, widthByPanel, resizerAfter }
}

export function usePanelLayout(
  workspaceWidth: number,
  open: { topics: boolean; lab: boolean; theory: boolean },
) {
  const panelSizes = useLayoutStore((s) => s.panelSizes)
  const setPanelSizes = useLayoutStore((s) => s.setPanelSizes)

  const layout = useMemo(
    () => buildPanelLayout(workspaceWidth, open, panelSizes),
    [workspaceWidth, open.topics, open.lab, open.theory, panelSizes],
  )

  const onResizerDrag = useCallback(
    (resizerIndex: number, pointerX: number, workspaceLeft: number) => {
      const { visibleIds, weights, comboKey } = layout
      if (!comboKey || visibleIds.length < 2) return
      const next = resizeAtBoundary(
        visibleIds,
        weights,
        resizerIndex,
        pointerX,
        workspaceLeft,
        workspaceWidth,
      )
      setPanelSizes(comboKey, next)
    },
    [layout, workspaceWidth, setPanelSizes],
  )

  const resizerIndexForPanel = useCallback(
    (panelId: PanelId): number | null => {
      const idx = layout.visibleIds.indexOf(panelId)
      if (idx < 0 || idx >= layout.visibleIds.length - 1) return null
      return idx
    },
    [layout.visibleIds],
  )

  return { layout, onResizerDrag, resizerIndexForPanel }
}
