import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { readInitialViewState } from '../hooks/useTopicViewUrl'

export type PanelId = 'topics' | 'lab' | 'theory'

export const PANEL_ORDER: PanelId[] = ['topics', 'lab', 'theory']

export function panelComboKey(panelIds: PanelId[]): string | null {
  if (panelIds.length === 0) return null
  return [...panelIds].sort().join('+')
}

export function visiblePanels(open: {
  topics: boolean
  lab: boolean
  theory: boolean
}): PanelId[] {
  return PANEL_ORDER.filter((id) => open[id])
}

export function equalPanelWeights(count: number): number[] {
  if (count <= 0) return []
  const share = 1 / count
  return Array.from({ length: count }, () => share)
}

type LayoutState = {
  topicsOpen: boolean
  labOpen: boolean
  theoryOpen: boolean
  /** Normalized flex weights per open-panel combination key (e.g. `lab+topics+theory`). */
  panelSizes: Record<string, number[]>
  activeHasLab: boolean
  sidebarScrollTop: number
  collapsedGroups: Record<string, boolean>
  setTopicsOpen: (open: boolean) => void
  setLabOpen: (open: boolean) => void
  setTheoryOpen: (open: boolean) => void
  setPanelSizes: (comboKey: string, sizes: number[]) => void
  setActiveHasLab: (hasLab: boolean) => void
  setSidebarScrollTop: (top: number) => void
  toggleCollapsedGroup: (groupId: string) => void
}

const normalizeWeights = (sizes: number[]): number[] => {
  const sum = sizes.reduce((acc, n) => acc + n, 0)
  if (sum <= 0) return equalPanelWeights(sizes.length)
  return sizes.map((n) => n / sum)
}

export const LAB_DOCK_ID = 'lab-dock-root'

const initialView = readInitialViewState()

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      topicsOpen: initialView.topicsOpen,
      labOpen: initialView.labOpen,
      theoryOpen: initialView.theoryOpen,
      panelSizes: {},
      activeHasLab: false,
      sidebarScrollTop: 0,
      collapsedGroups: {},
      setTopicsOpen: (open) => set({ topicsOpen: open }),
      setLabOpen: (open) => set({ labOpen: open }),
      setTheoryOpen: (open) => set({ theoryOpen: open }),
      setPanelSizes: (comboKey, sizes) =>
        set((s) => ({
          panelSizes: {
            ...s.panelSizes,
            [comboKey]: normalizeWeights(sizes),
          },
        })),
      setActiveHasLab: (hasLab) => set({ activeHasLab: hasLab }),
      setSidebarScrollTop: (top) => set({ sidebarScrollTop: Math.max(0, Math.round(top)) }),
      toggleCollapsedGroup: (groupId) =>
        set((s) => {
          const next = { ...s.collapsedGroups }
          if (next[groupId]) {
            delete next[groupId]
          } else {
            next[groupId] = true
          }
          return { collapsedGroups: next }
        }),
    }),
    {
      name: 'assessment-layout',
      partialize: (state) => ({
        panelSizes: state.panelSizes,
        sidebarScrollTop: state.sidebarScrollTop,
        collapsedGroups: state.collapsedGroups,
      }),
    },
  ),
)
