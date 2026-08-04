import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type LayoutState = {
  sidebarOpen: boolean
  /** Fraction of shell width for lab dock (default half). */
  labShare: number
  /** Left dock shows lab layer instead of topics. */
  labOpen: boolean
  /** Current topic has a lab (drives Topics/Lab toggle). */
  activeHasLab: boolean
  /** Hide theory; lab full-bleed (DevTools docked while lab is open). */
  labFocus: boolean
  /** Scroll position of the topics list (nav). */
  sidebarScrollTop: number
  /** Collapsed topic groups in the sidebar (`groupId` → collapsed). */
  collapsedGroups: Record<string, boolean>
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setLabShare: (share: number) => void
  setLabOpen: (open: boolean) => void
  setActiveHasLab: (hasLab: boolean) => void
  setLabFocus: (focus: boolean) => void
  setSidebarScrollTop: (top: number) => void
  toggleCollapsedGroup: (groupId: string) => void
}

const clampLabShare = (value: number) => Math.min(0.72, Math.max(0.28, value))

export const LAB_DOCK_ID = 'lab-dock-root'

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      labShare: 0.5,
      labOpen: false,
      activeHasLab: false,
      labFocus: false,
      sidebarScrollTop: 0,
      collapsedGroups: {},
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setLabShare: (share) => set({ labShare: clampLabShare(share) }),
      setLabOpen: (open) => set({ labOpen: open }),
      setActiveHasLab: (hasLab) => set({ activeHasLab: hasLab }),
      setLabFocus: (focus) => set({ labFocus: focus }),
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
        sidebarOpen: state.sidebarOpen,
        labShare: state.labShare,
        sidebarScrollTop: state.sidebarScrollTop,
        collapsedGroups: state.collapsedGroups,
      }),
    },
  ),
)
