import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type LayoutState = {
  sidebarOpen: boolean
  /** Share of the split taken by the lab pane (0.25–0.7). */
  labShare: number
  /** Hide sidebar + theory; only lab (when DevTools docked on a lab topic). */
  labFocus: boolean
  /** Scroll position of the topics list (nav). */
  sidebarScrollTop: number
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setLabShare: (share: number) => void
  setLabFocus: (focus: boolean) => void
  setSidebarScrollTop: (top: number) => void
}

const clampLabShare = (value: number) => Math.min(0.7, Math.max(0.25, value))

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      labShare: 0.4,
      labFocus: false,
      sidebarScrollTop: 0,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setLabShare: (share) => set({ labShare: clampLabShare(share) }),
      setLabFocus: (focus) => set({ labFocus: focus }),
      setSidebarScrollTop: (top) => set({ sidebarScrollTop: Math.max(0, Math.round(top)) }),
    }),
    {
      name: 'assessment-layout',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        labShare: state.labShare,
        sidebarScrollTop: state.sidebarScrollTop,
      }),
    },
  ),
)
