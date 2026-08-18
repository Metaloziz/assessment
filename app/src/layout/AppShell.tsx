import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { TopicSidebar } from './TopicSidebar'
import { RESIZER_WIDTH, usePanelLayout } from '../hooks/usePanelLayout'
import { useTopicViewUrlSync } from '../hooks/useTopicViewUrl'
import { LAB_DOCK_ID, type PanelId, useLayoutStore } from '../store/layout'
import { useProgressStore } from '../store/progress'
import styles from './AppShell.module.css'

gsap.registerPlugin(useGSAP)

type PanelSlide = 'left' | 'right'

function PanelResizer({
  visible,
  resizerRef,
  onPointerDown,
}: {
  visible: boolean
  resizerRef: (el: HTMLDivElement | null) => void
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      ref={resizerRef}
      className={styles.panelResizer}
      role="separator"
      aria-orientation="vertical"
      aria-hidden={!visible}
      onPointerDown={onPointerDown}
    />
  )
}

function ShellPanel({
  panelRef,
  panelId,
  visible,
  slideFrom,
  children,
}: {
  panelRef: (el: HTMLDivElement | null) => void
  panelId: PanelId
  visible: boolean
  slideFrom: PanelSlide
  children: ReactNode
}) {
  return (
    <div
      ref={panelRef}
      className={styles.panel}
      data-panel={panelId}
      data-open={visible ? 'true' : 'false'}
      aria-hidden={!visible}
    >
      <div className={styles.panelInner} data-slide={slideFrom}>
        {children}
      </div>
    </div>
  )
}

export function AppShell() {
  const topicMatch = useMatch('/topics/:topicId')
  const onTopicPage = Boolean(topicMatch)
  const { setTopics, setDock, setTheory, viewReady } = useTopicViewUrlSync(onTopicPage)

  const topicsOpen = useLayoutStore((s) => s.topicsOpen)
  const labOpen = useLayoutStore((s) => s.labOpen)
  const theoryOpen = useLayoutStore((s) => s.theoryOpen)
  const activeHasLab = useLayoutStore((s) => s.activeHasLab)
  const setTopicsOpen = useLayoutStore((s) => s.setTopicsOpen)
  const setLabOpen = useLayoutStore((s) => s.setLabOpen)
  const setTheoryOpen = useLayoutStore((s) => s.setTheoryOpen)
  const loadProgress = useProgressStore((s) => s.loadProgress)

  useEffect(() => {
    void loadProgress()
  }, [loadProgress])

  const open = {
    topics: topicsOpen,
    lab: labOpen && activeHasLab,
    theory: theoryOpen,
  }

  const shellRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<Record<PanelId, HTMLDivElement | null>>({
    topics: null,
    lab: null,
    theory: null,
  })
  const resizerRefs = useRef<Record<PanelId, HTMLDivElement | null>>({
    topics: null,
    lab: null,
    theory: null,
  })
  const hydratedRef = useRef(false)
  const draggingRef = useRef(false)
  const prevOpenRef = useRef(open)

  const [workspaceWidth, setWorkspaceWidth] = useState(0)
  const { layout, onResizerDrag, resizerIndexForPanel } = usePanelLayout(workspaceWidth, open)

  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace) return

    const syncWidth = () => {
      setWorkspaceWidth(workspace.getBoundingClientRect().width || window.innerWidth)
    }

    syncWidth()
    const ro = new ResizeObserver(syncWidth)
    ro.observe(workspace)
    window.addEventListener('resize', syncWidth)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', syncWidth)
    }
  }, [])

  useEffect(() => {
    if (!activeHasLab && labOpen) {
      if (onTopicPage) setDock('topics')
      else setLabOpen(false)
    }
  }, [activeHasLab, labOpen, onTopicPage, setDock, setLabOpen])

  const toggleTopics = () => {
    const next = !topicsOpen
    if (onTopicPage) setTopics(next)
    else setTopicsOpen(next)
  }

  const toggleLab = () => {
    if (!activeHasLab) return
    const next = !labOpen
    if (onTopicPage) setDock(next ? 'lab' : 'topics')
    else setLabOpen(next)
  }

  const toggleTheory = () => {
    const next = !theoryOpen
    if (onTopicPage) setTheory(next)
    else setTheoryOpen(next)
  }

  const applyPanelLayout = useCallback(
    (animate: boolean) => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const duration = reduced ? 0 : 0.48
      const ease = 'power3.inOut'

      const panels: PanelId[] = ['topics', 'lab', 'theory']
      const prevOpen = prevOpenRef.current

      panels.forEach((id) => {
        const el = panelRefs.current[id]
        if (!el) return

        const targetW = open[id] ? layout.widthByPanel[id] : 0
        const inner = el.querySelector(`.${styles.panelInner}`) as HTMLElement | null
        const slideFrom = id === 'theory' ? 'right' : 'left'
        const wasOpen = prevOpen[id]
        const isOpen = open[id]

        if (id === 'theory') {
          gsap.set(el, {
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            left: 'auto',
            height: 'auto',
            overflow: 'hidden',
          })
          if (inner) {
            gsap.set(inner, { xPercent: 0, autoAlpha: isOpen ? 1 : 0 })
          }

          if (!animate || draggingRef.current) {
            gsap.set(el, {
              width: isOpen ? targetW : 0,
              xPercent: isOpen ? 0 : 100,
            })
            return
          }

          const tl = gsap.timeline({ defaults: { duration, ease, overwrite: 'auto' } })

          if (isOpen && !wasOpen) {
            gsap.set(el, { width: targetW, xPercent: 100 })
            tl.to(el, { xPercent: 0 }, 0)
          } else if (!isOpen && wasOpen) {
            const currentW = Math.round(el.getBoundingClientRect().width) || targetW
            gsap.set(el, { width: currentW, xPercent: 0 })
            tl.to(el, { xPercent: 100, width: 0 }, 0)
          } else if (isOpen) {
            tl.to(el, { width: targetW, xPercent: 0 }, 0)
          } else {
            gsap.set(el, { width: 0, xPercent: 100 })
          }
          return
        }

        if (!animate) {
          gsap.set(el, { width: targetW, overflow: 'hidden' })
          if (inner) {
            gsap.set(inner, {
              xPercent: isOpen ? 0 : slideFrom === 'left' ? -100 : 100,
              autoAlpha: isOpen ? 1 : 0,
            })
          }
          return
        }

        if (draggingRef.current) {
          gsap.set(el, { width: targetW })
          return
        }

        const tl = gsap.timeline({ defaults: { duration, ease, overwrite: 'auto' } })
        tl.to(el, { width: targetW, overflow: 'hidden' }, 0)

        if (inner) {
          if (isOpen && !wasOpen) {
            gsap.set(inner, {
              xPercent: slideFrom === 'left' ? -100 : 100,
              autoAlpha: 1,
            })
            tl.to(inner, { xPercent: 0 }, 0)
          } else if (!isOpen && wasOpen) {
            tl.to(inner, { xPercent: slideFrom === 'left' ? -100 : 100, autoAlpha: 0 }, 0)
          } else if (isOpen) {
            tl.to(inner, { xPercent: 0, autoAlpha: 1 }, 0)
          }
        }
      })

      ;(['topics', 'lab'] as PanelId[]).forEach((id) => {
        const resizer = resizerRefs.current[id]
        if (!resizer) return
        const show = layout.resizerAfter[id]
        gsap.to(resizer, {
          width: show ? RESIZER_WIDTH : 0,
          autoAlpha: show ? 1 : 0,
          duration: animate ? duration : 0,
          ease,
          overwrite: 'auto',
        })
      })

      prevOpenRef.current = open
    },
    [layout.widthByPanel, layout.resizerAfter, open],
  )

  useGSAP(
    () => {
      if (!viewReady || workspaceWidth <= 0) return
      const animate = hydratedRef.current
      applyPanelLayout(animate)
      hydratedRef.current = true
    },
    {
      scope: shellRef,
      dependencies: [
        viewReady,
        workspaceWidth,
        open.topics,
        open.lab,
        open.theory,
        layout.widthByPanel.topics,
        layout.widthByPanel.lab,
        layout.widthByPanel.theory,
        layout.resizerAfter.topics,
        layout.resizerAfter.lab,
      ],
    },
  )

  const onResizePointerDown = useCallback(
    (panelId: PanelId) => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const workspace = workspaceRef.current
      const resizerIndex = resizerIndexForPanel(panelId)
      if (!workspace || resizerIndex === null) return

      draggingRef.current = true
      const handle = event.currentTarget
      handle.setPointerCapture(event.pointerId)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const rect = workspace.getBoundingClientRect()

      const onMove = (ev: PointerEvent) => {
        if (!draggingRef.current) return
        onResizerDrag(resizerIndex, ev.clientX, rect.left)
        applyPanelLayout(false)
      }

      const onUp = (ev: PointerEvent) => {
        draggingRef.current = false
        handle.releasePointerCapture(ev.pointerId)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        applyPanelLayout(true)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [applyPanelLayout, onResizerDrag, resizerIndexForPanel],
  )

  return (
    <div ref={shellRef} className={styles.shell}>
      <header className={styles.chrome}>
        <div className={styles.dockToggle} role="toolbar" aria-label="Панели">
          <button
            type="button"
            aria-pressed={topicsOpen}
            title={topicsOpen ? 'Скрыть темы' : 'Показать темы'}
            className={`${styles.dockTab} ${topicsOpen ? styles.dockTabActive : ''}`}
            onClick={toggleTopics}
          >
            Темы
          </button>
          <button
            type="button"
            aria-pressed={labOpen && activeHasLab}
            aria-disabled={!activeHasLab}
            disabled={!activeHasLab}
            title={
              !activeHasLab
                ? 'У этой темы нет лаборатории'
                : labOpen
                  ? 'Скрыть лабораторию'
                  : 'Показать лабораторию'
            }
            className={`${styles.dockTab} ${labOpen && activeHasLab ? styles.dockTabActive : ''}`}
            onClick={toggleLab}
          >
            Лаборатория
          </button>
          <button
            type="button"
            aria-pressed={theoryOpen}
            title={theoryOpen ? 'Скрыть теорию' : 'Показать теорию'}
            className={`${styles.dockTab} ${theoryOpen ? styles.dockTabActive : ''}`}
            onClick={toggleTheory}
          >
            Теория
          </button>
        </div>
      </header>

      <div
        ref={workspaceRef}
        className={styles.workspace}
        data-ready={viewReady ? 'true' : 'false'}
      >
        <ShellPanel
          panelRef={(el) => {
            panelRefs.current.topics = el
          }}
          panelId="topics"
          visible={open.topics}
          slideFrom="left"
        >
          <TopicSidebar />
        </ShellPanel>

        <PanelResizer
          visible={layout.resizerAfter.topics}
          resizerRef={(el) => {
            resizerRefs.current.topics = el
          }}
          onPointerDown={onResizePointerDown('topics')}
        />

        <ShellPanel
          panelRef={(el) => {
            panelRefs.current.lab = el
          }}
          panelId="lab"
          visible={open.lab}
          slideFrom="left"
        >
          <div className={styles.labColumn}>
            <div id={LAB_DOCK_ID} className={styles.labDockBody} />
          </div>
        </ShellPanel>

        <PanelResizer
          visible={layout.resizerAfter.lab}
          resizerRef={(el) => {
            resizerRefs.current.lab = el
          }}
          onPointerDown={onResizePointerDown('lab')}
        />

        <ShellPanel
          panelRef={(el) => {
            panelRefs.current.theory = el
          }}
          panelId="theory"
          visible={open.theory}
          slideFrom="right"
        >
          <div className={styles.mainBody}>
            <Outlet />
          </div>
        </ShellPanel>
      </div>
    </div>
  )
}
