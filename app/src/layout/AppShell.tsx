import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { Outlet, Link, useMatch } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { TopicSidebar } from './TopicSidebar'
import { useTopicViewUrlSync } from '../hooks/useTopicViewUrl'
import { LAB_DOCK_ID, useLayoutStore } from '../store/layout'
import styles from './AppShell.module.css'

gsap.registerPlugin(useGSAP)

function readSidebarWidthPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim()
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300
}

/** Shared dock width for Topics and Lab modes (fraction of workspace). */
function dockWidthFromShare(workspaceWidth: number, share: number): number {
  const minW = Math.max(readSidebarWidthPx(), Math.round(workspaceWidth * 0.28))
  const maxW = Math.round(workspaceWidth * 0.72)
  return Math.min(maxW, Math.max(minW, Math.round(workspaceWidth * share)))
}

export function AppShell() {
  const topicMatch = useMatch('/topics/:topicId')
  const onTopicPage = Boolean(topicMatch)
  const { setDock, setTheory } = useTopicViewUrlSync(onTopicPage)

  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const labOpen = useLayoutStore((s) => s.labOpen)
  const theoryOpen = useLayoutStore((s) => s.theoryOpen)
  const labShare = useLayoutStore((s) => s.labShare)
  const activeHasLab = useLayoutStore((s) => s.activeHasLab)
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen)
  const setLabOpen = useLayoutStore((s) => s.setLabOpen)
  const setTheoryOpen = useLayoutStore((s) => s.setTheoryOpen)
  const setLabShare = useLayoutStore((s) => s.setLabShare)

  const theoryHidden = !theoryOpen

  const shellRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const topicsRef = useRef<HTMLDivElement>(null)
  const labRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const resizerRef = useRef<HTMLDivElement>(null)
  const hydratedRef = useRef(false)
  const draggingRef = useRef(false)
  const theoryHiddenRef = useRef(theoryHidden)
  /** Last theory panel width in px — keeps text layout stable across slide. */
  const theoryWidthRef = useRef(0)

  /** Dock visible when: lab mode, theory hidden (full-bleed), or topics with sidebar open. */
  const dockExpanded = labOpen || theoryHidden || (sidebarOpen && theoryOpen)
  const topicsOn = !labOpen && (sidebarOpen || theoryHidden)
  const labOn = labOpen
  const theoryOn = theoryOpen

  const toggleTopics = () => {
    if (labOpen) {
      if (onTopicPage) setDock('topics')
      else setLabOpen(false)
      setSidebarOpen(true)
      return
    }
    if (topicsOn) {
      if (theoryHidden) {
        if (onTopicPage) setTheory(true)
        else setTheoryOpen(true)
      }
      setSidebarOpen(false)
      return
    }
    setSidebarOpen(true)
  }

  const toggleLab = () => {
    if (!activeHasLab) return
    if (labOpen) {
      if (onTopicPage) setDock('topics')
      else setLabOpen(false)
      if (theoryOpen) setSidebarOpen(false)
      return
    }
    if (onTopicPage) setDock('lab')
    else setLabOpen(true)
  }

  const toggleTheory = () => {
    const next = !theoryOpen
    if (!next && !labOpen && !sidebarOpen) {
      setSidebarOpen(true)
    }
    if (onTopicPage) setTheory(next)
    else setTheoryOpen(next)
  }

  useGSAP(
    () => {
      const dock = dockRef.current
      const topics = topicsRef.current
      const lab = labRef.current
      const main = mainRef.current
      const resizer = resizerRef.current
      const workspace = workspaceRef.current
      if (!dock || !topics || !lab || !main || !workspace) return

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const mobile = window.matchMedia('(max-width: 860px)').matches
      const duration = reduced ? 0 : 0.48
      const ease = 'power3.inOut'
      const workspaceW = workspace.getBoundingClientRect().width || window.innerWidth
      const share = useLayoutStore.getState().labShare
      const dockW = dockWidthFromShare(workspaceW, share)
      const resizerW = 6

      const theoryW = Math.max(
        200,
        theoryWidthRef.current || workspaceW - dockW - resizerW,
      )

      const dockWidth = !dockExpanded
        ? 0
        : theoryHidden
          ? mobile
            ? '100%'
            : workspaceW
          : mobile
            ? '100%'
            : dockW

      const theoryOpenWidth = mobile
        ? workspaceW
        : dockExpanded && !theoryHidden
          ? Math.max(200, workspaceW - dockW - resizerW)
          : workspaceW

      const dockMaxHeight = !dockExpanded
        ? 0
        : theoryHidden
          ? mobile
            ? '100%'
            : 'none'
          : labOpen
            ? '55vh'
            : '40vh'

      const layer = labOpen
        ? {
            topics: { xPercent: -100, autoAlpha: 0 },
            lab: { xPercent: 0, autoAlpha: 1 },
          }
        : {
            topics: { xPercent: 0, autoAlpha: 1 },
            lab: { xPercent: 100, autoAlpha: 0 },
          }

      const placeTheory = (hidden: boolean, widthPx: number) => {
        gsap.set(main, {
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          left: 'auto',
          height: 'auto',
          width: mobile ? workspaceW : widthPx,
          yPercent: 0,
          xPercent: hidden ? 100 : 0,
          autoAlpha: 1,
        })
      }

      if (!hydratedRef.current) {
        hydratedRef.current = true
        if (mobile) {
          gsap.set(dock, {
            width: '100%',
            maxHeight: dockExpanded ? dockMaxHeight : 0,
            opacity: dockExpanded ? 1 : 0,
          })
        } else {
          gsap.set(dock, { width: dockWidth, maxHeight: 'none', opacity: 1 })
        }
        gsap.set(topics, layer.topics)
        gsap.set(lab, layer.lab)
        const w = theoryHidden ? theoryW : theoryOpenWidth
        theoryWidthRef.current = w
        placeTheory(theoryHidden, w)
        if (resizer) {
          gsap.set(resizer, {
            autoAlpha: dockExpanded && !theoryHidden ? 1 : 0,
            width: dockExpanded && !theoryHidden ? resizerW : 0,
          })
        }
        theoryHiddenRef.current = theoryHidden
        return
      }

      if (draggingRef.current) return

      const tl = gsap.timeline({ defaults: { duration, ease, overwrite: 'auto' } })

      if (mobile) {
        tl.to(
          dock,
          {
            width: '100%',
            maxHeight: dockExpanded ? dockMaxHeight : 0,
            opacity: dockExpanded ? 1 : 0,
          },
          0,
        )
      } else {
        tl.to(dock, { width: dockWidth, maxHeight: 'none', opacity: 1 }, 0)
      }

      tl.to(topics, layer.topics, 0)
      tl.to(lab, layer.lab, 0)

      const wasHidden = theoryHiddenRef.current
      const hiding = theoryHidden && !wasHidden
      const showing = !theoryHidden && wasHidden
      theoryHiddenRef.current = theoryHidden

      if (hiding) {
        // Keep current pixel width, only slide right — no fade, no reflow.
        const currentW = Math.round(main.getBoundingClientRect().width) || theoryW
        theoryWidthRef.current = currentW
        gsap.set(main, {
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          left: 'auto',
          width: currentW,
          height: 'auto',
          autoAlpha: 1,
          yPercent: 0,
        })
        tl.to(main, { xPercent: 100 }, 0)
      } else if (showing) {
        theoryWidthRef.current = theoryOpenWidth
        // Start off-screen, commit layout, then slide in (same motion as hide).
        gsap.set(main, {
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          left: 'auto',
          width: theoryOpenWidth,
          height: 'auto',
          xPercent: 100,
          yPercent: 0,
          autoAlpha: 1,
        })
        void main.offsetWidth
        tl.fromTo(main, { xPercent: 100 }, { xPercent: 0, ease }, 0)
      } else if (!theoryHidden) {
        // Dock/lab toggles while theory stays open — keep panel docked, update width without slide.
        theoryWidthRef.current = theoryOpenWidth
        tl.to(main, { width: theoryOpenWidth, xPercent: 0, yPercent: 0 }, 0)
      } else {
        // Stays hidden — keep off-screen to the right.
        gsap.set(main, { xPercent: 100, yPercent: 0, autoAlpha: 1 })
      }

      if (resizer) {
        tl.to(
          resizer,
          {
            autoAlpha: dockExpanded && !theoryHidden ? 1 : 0,
            width: dockExpanded && !theoryHidden ? resizerW : 0,
          },
          0,
        )
      }
    },
    { scope: shellRef, dependencies: [labOpen, dockExpanded, theoryHidden] },
  )

  useEffect(() => {
    if (!activeHasLab && labOpen) {
      if (onTopicPage) setDock('topics')
      else setLabOpen(false)
    }
  }, [activeHasLab, labOpen, onTopicPage, setDock, setLabOpen])

  /** Sync dock/theory widths after drag — do not touch xPercent (breaks slide-in). */
  useEffect(() => {
    const dock = dockRef.current
    const workspace = workspaceRef.current
    const main = mainRef.current
    if (!dock || !workspace || !main) return
    if (theoryHiddenRef.current || draggingRef.current) return
    if (window.matchMedia('(max-width: 860px)').matches) return
    const workspaceW = workspace.getBoundingClientRect().width || window.innerWidth
    if (!dockExpanded) {
      gsap.set(dock, { width: 0 })
      theoryWidthRef.current = workspaceW
      gsap.set(main, { width: workspaceW })
      return
    }
    const dockW = dockWidthFromShare(workspaceW, labShare)
    gsap.set(dock, { width: dockW })
    const openW = Math.max(200, workspaceW - dockW - 6)
    theoryWidthRef.current = openW
    gsap.set(main, { width: openW })
  }, [labShare, dockExpanded])

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const workspace = workspaceRef.current
      const dock = dockRef.current
      if (!workspace || !dock || !dockExpanded || theoryHidden) return

      draggingRef.current = true
      const handle = event.currentTarget
      handle.setPointerCapture(event.pointerId)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMove = (ev: PointerEvent) => {
        if (!draggingRef.current || !workspaceRef.current || !dockRef.current) return
        const rect = workspaceRef.current.getBoundingClientRect()
        if (rect.width <= 0) return
        const share = (ev.clientX - rect.left) / rect.width
        const next = Math.min(0.72, Math.max(0.28, share))
        setLabShare(next)
        const dockW = dockWidthFromShare(rect.width, next)
        gsap.set(dockRef.current, { width: dockW })
        if (mainRef.current) {
          const openW = Math.max(200, rect.width - dockW - 6)
          theoryWidthRef.current = openW
          gsap.set(mainRef.current, { width: openW })
        }
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
    [dockExpanded, theoryHidden, setLabShare],
  )

  return (
    <div
      ref={shellRef}
      className={styles.shell}
      data-lab-focus={theoryHidden ? 'true' : 'false'}
      data-lab-open={labOpen ? 'true' : 'false'}
    >
      <header className={styles.chrome}>
        <div className={styles.dockToggle} role="toolbar" aria-label="Панели">
          <button
            type="button"
            aria-pressed={topicsOn}
            title={topicsOn ? 'Скрыть темы' : 'Показать темы'}
            className={`${styles.dockTab} ${topicsOn ? styles.dockTabActive : ''}`}
            onClick={toggleTopics}
          >
            Темы
          </button>
          <button
            type="button"
            aria-pressed={labOn}
            aria-disabled={!activeHasLab}
            disabled={!activeHasLab}
            title={
              !activeHasLab
                ? 'У этой темы нет лаборатории'
                : labOn
                  ? 'Скрыть лабораторию'
                  : 'Показать лабораторию'
            }
            className={`${styles.dockTab} ${labOn ? styles.dockTabActive : ''}`}
            onClick={toggleLab}
          >
            Лаборатория
          </button>
          <button
            type="button"
            aria-pressed={theoryOn}
            title={theoryOn ? 'Скрыть теорию' : 'Показать теорию'}
            className={`${styles.dockTab} ${theoryOn ? styles.dockTabActive : ''}`}
            onClick={toggleTheory}
          >
            Теория
          </button>
        </div>
        <Link className={styles.apiSmokeLink} to="/dev/api-smoke" title="Проверка API и БД">
          API
        </Link>
      </header>

      <div ref={workspaceRef} className={styles.workspace}>
        <div
          ref={dockRef}
          className={styles.leftDock}
          data-open={dockExpanded ? 'true' : 'false'}
          data-mode={labOpen ? 'lab' : 'topics'}
        >
          <div className={styles.dockStage}>
            <div ref={topicsRef} className={styles.topicsLayer} aria-hidden={!topicsOn}>
              <TopicSidebar
                onCollapse={labOpen || theoryHidden ? undefined : () => setSidebarOpen(false)}
              />
            </div>

            <div
              ref={labRef}
              className={styles.labLayer}
              aria-hidden={!labOn}
              aria-label="Лаборатория"
            >
              <div className={styles.labColumn}>
                <div id={LAB_DOCK_ID} className={styles.labDockBody} />
              </div>
            </div>
          </div>
        </div>

        <div
          ref={resizerRef}
          className={styles.dockResizer}
          role="separator"
          aria-orientation="vertical"
          aria-hidden={!dockExpanded || theoryHidden}
          aria-label="Изменить ширину левой панели"
          onPointerDown={onResizePointerDown}
        />

        <main ref={mainRef} className={styles.main} aria-hidden={theoryHidden}>
          {!dockExpanded && theoryOpen ? (
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
    </div>
  )
}
