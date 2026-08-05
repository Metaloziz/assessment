import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { Outlet } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { TopicSidebar } from './TopicSidebar'
import { LAB_DOCK_ID, useLayoutStore } from '../store/layout'
import styles from './AppShell.module.css'

gsap.registerPlugin(useGSAP)

function readSidebarWidthPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim()
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300
}

/** Shared dock width for Topics and Lab modes (fraction of shell). */
function dockWidthFromShare(shellWidth: number, share: number): number {
  const minW = Math.max(readSidebarWidthPx(), Math.round(shellWidth * 0.28))
  const maxW = Math.round(shellWidth * 0.72)
  return Math.min(maxW, Math.max(minW, Math.round(shellWidth * share)))
}

export function AppShell() {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const labOpen = useLayoutStore((s) => s.labOpen)
  const labFocus = useLayoutStore((s) => s.labFocus)
  const labShare = useLayoutStore((s) => s.labShare)
  const activeHasLab = useLayoutStore((s) => s.activeHasLab)
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen)
  const setLabOpen = useLayoutStore((s) => s.setLabOpen)
  const setLabShare = useLayoutStore((s) => s.setLabShare)

  const shellRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const topicsRef = useRef<HTMLDivElement>(null)
  const labRef = useRef<HTMLDivElement>(null)
  const hydratedRef = useRef(false)
  const draggingRef = useRef(false)

  /** Dock visible when: lab mode, or topics mode with sidebar open (and not labFocus-only). */
  const dockExpanded = labOpen || (sidebarOpen && !labFocus)

  useGSAP(
    () => {
      const dock = dockRef.current
      const topics = topicsRef.current
      const lab = labRef.current
      const shell = shellRef.current
      if (!dock || !topics || !lab || !shell) return

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const mobile = window.matchMedia('(max-width: 860px)').matches
      const duration = reduced ? 0 : 0.48
      const ease = 'power3.inOut'
      const shellW = shell.getBoundingClientRect().width || window.innerWidth
      const share = useLayoutStore.getState().labShare
      const dockW = dockWidthFromShare(shellW, share)

      if (labFocus && labOpen) {
        gsap.set(dock, {
          width: mobile ? '100%' : window.innerWidth,
          maxHeight: mobile ? '100%' : 'none',
          opacity: 1,
        })
        gsap.set(topics, { xPercent: -100, autoAlpha: 0 })
        gsap.set(lab, { xPercent: 0, autoAlpha: 1 })
        hydratedRef.current = true
        return
      }

      const targetWidth = !dockExpanded ? 0 : mobile ? window.innerWidth : dockW

      if (!hydratedRef.current) {
        hydratedRef.current = true
        if (mobile) {
          gsap.set(dock, {
            width: '100%',
            maxHeight: dockExpanded ? (labOpen ? '55vh' : '40vh') : 0,
            opacity: dockExpanded ? 1 : 0,
          })
        } else {
          gsap.set(dock, { width: targetWidth, maxHeight: 'none', opacity: 1 })
        }
        gsap.set(topics, { xPercent: labOpen ? -100 : 0, autoAlpha: labOpen ? 0 : 1 })
        gsap.set(lab, { xPercent: labOpen ? 0 : 100, autoAlpha: labOpen ? 1 : 0 })
        return
      }

      if (draggingRef.current) return

      const tl = gsap.timeline({ defaults: { duration, ease, overwrite: 'auto' } })

      if (mobile) {
        tl.to(
          dock,
          {
            width: '100%',
            maxHeight: dockExpanded ? (labOpen ? '55vh' : '40vh') : 0,
            opacity: dockExpanded ? 1 : 0,
          },
          0,
        )
      } else {
        tl.to(dock, { width: targetWidth, maxHeight: 'none', opacity: 1 }, 0)
      }

      if (labOpen) {
        tl.to(topics, { xPercent: -100, autoAlpha: 0 }, 0)
        tl.to(lab, { xPercent: 0, autoAlpha: 1 }, 0)
      } else {
        tl.to(lab, { xPercent: 100, autoAlpha: 0 }, 0)
        tl.to(topics, { xPercent: 0, autoAlpha: 1 }, 0)
      }
    },
    { scope: shellRef, dependencies: [labOpen, dockExpanded, labFocus] },
  )

  useEffect(() => {
    if (!activeHasLab && labOpen) setLabOpen(false)
  }, [activeHasLab, labOpen, setLabOpen])

  /** Keep dock width in sync for Topics and Lab (same share). */
  useEffect(() => {
    const dock = dockRef.current
    const shell = shellRef.current
    if (!dock || !shell || !dockExpanded || labFocus || draggingRef.current) return
    if (window.matchMedia('(max-width: 860px)').matches) return
    const shellW = shell.getBoundingClientRect().width || window.innerWidth
    gsap.set(dock, { width: dockWidthFromShare(shellW, labShare) })
  }, [labShare, dockExpanded, labFocus])

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const shell = shellRef.current
      const dock = dockRef.current
      if (!shell || !dock || !dockExpanded || labFocus) return

      draggingRef.current = true
      const handle = event.currentTarget
      handle.setPointerCapture(event.pointerId)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMove = (ev: PointerEvent) => {
        if (!draggingRef.current || !shellRef.current || !dockRef.current) return
        const rect = shellRef.current.getBoundingClientRect()
        if (rect.width <= 0) return
        const share = (ev.clientX - rect.left) / rect.width
        const next = Math.min(0.72, Math.max(0.28, share))
        setLabShare(next)
        gsap.set(dockRef.current, { width: dockWidthFromShare(rect.width, next) })
      }

      const onUp = (ev: PointerEvent) => {
        draggingRef.current = false
        handle.releasePointerCapture(ev.pointerId)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [dockExpanded, labFocus, setLabShare],
  )

  return (
    <div
      ref={shellRef}
      className={styles.shell}
      data-lab-focus={labFocus ? 'true' : 'false'}
      data-lab-open={labOpen ? 'true' : 'false'}
    >
      <div
        ref={dockRef}
        className={styles.leftDock}
        data-open={dockExpanded ? 'true' : 'false'}
        data-mode={labOpen ? 'lab' : 'topics'}
      >
        <div className={styles.dockToggle} role="tablist" aria-label="Панель слева">
          <button
            type="button"
            role="tab"
            aria-selected={!labOpen}
            className={`${styles.dockTab} ${!labOpen ? styles.dockTabActive : ''}`}
            onClick={() => setLabOpen(false)}
          >
            Темы
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={labOpen}
            aria-disabled={!activeHasLab}
            disabled={!activeHasLab}
            title={activeHasLab ? undefined : 'У этой темы нет лаборатории'}
            className={`${styles.dockTab} ${labOpen ? styles.dockTabActive : ''}`}
            onClick={() => {
              if (!activeHasLab) return
              setLabOpen(true)
              setSidebarOpen(true)
            }}
          >
            Лаборатория
          </button>
        </div>

        <div className={styles.dockStage}>
          <div ref={topicsRef} className={styles.topicsLayer} aria-hidden={labOpen}>
            <TopicSidebar
              onCollapse={labOpen ? undefined : () => setSidebarOpen(false)}
            />
          </div>

          <div
            ref={labRef}
            className={styles.labLayer}
            aria-hidden={!labOpen}
            aria-label="Лаборатория"
          >
            {labFocus ? (
              <div className={styles.labChrome}>
                <span className={styles.labChromeTitle}>Лаборатория</span>
                <div className={styles.labChromeActions}>
                  <span className={styles.labFocusHint}>DevTools · только лаба</span>
                </div>
              </div>
            ) : null}
            <div id={LAB_DOCK_ID} className={styles.labDockBody} />
          </div>
        </div>
      </div>

      {dockExpanded && !labFocus ? (
        <div
          className={styles.dockResizer}
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину левой панели"
          onPointerDown={onResizePointerDown}
        />
      ) : null}

      <main className={styles.main}>
        {!dockExpanded && !labFocus ? (
          <button
            type="button"
            className={styles.sidebarReveal}
            onClick={() => setSidebarOpen(true)}
            aria-label="Показать список тем"
            title="Показать список тем"
          >
            <span aria-hidden>«</span>
          </button>
        ) : null}
        <div className={styles.mainBody}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
