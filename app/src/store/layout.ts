import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type LayoutState = {
  sidebarOpen: boolean
  /** Share of the split taken by the lab pane (0.25–0.7). */
  labShare: number
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setLabShare: (share: number) => void
}

const clampLabShare = (value: number) => Math.min(0.7, Math.max(0.25, value))

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      labShare: 0.4,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setLabShare: (share) => set({ labShare: clampLabShare(share) }),
    }),
    { name: 'assessment-layout' },
  ),
)
