import { useEffect, useState } from 'react'

/** Рост зазора относительно «спокойного» baseline → DevTools. */
const EXTRA = 80
/** Боковая панель DevTools: зазор по ширине почти никогда не бывает от скроллбара. */
const ABS_WIDTH = 160

function gaps() {
  return {
    w: Math.max(0, window.outerWidth - window.innerWidth),
    h: Math.max(0, window.outerHeight - window.innerHeight),
  }
}

function isDevtoolsShortcut(event: KeyboardEvent) {
  if (event.key === 'F12') return true
  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return false
  const key = event.key.toUpperCase()
  return key === 'I' || key === 'J' || key === 'C'
}

/**
 * Пристыкованные DevTools (или горячая клавиша открытия).
 * Baseline подстраивается, когда панель закрыта — без ложных срабатываний на хром браузера.
 */
export function useDevToolsDocked() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let baseline = gaps()
    /** После F12 размеры обновляются с задержкой — не гасим focus сразу. */
    let holdUntil = 0

    const measure = () => {
      const { w, h } = gaps()
      const byWidth = w > baseline.w + EXTRA || w >= ABS_WIDTH
      const byHeight = h > baseline.h + EXTRA
      const dimOpen = byWidth || byHeight
      const holding = Date.now() < holdUntil

      if (dimOpen || holding) {
        setOpen(true)
        return
      }

      setOpen(false)
      // Обновляем baseline только в «закрытом» состоянии
      baseline = { w, h }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isDevtoolsShortcut(event)) return
      holdUntil = Date.now() + 2000
      setOpen(true)
      window.setTimeout(measure, 300)
      window.setTimeout(measure, 900)
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('keydown', onKeyDown, true)
    const timer = window.setInterval(measure, 500)

    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('keydown', onKeyDown, true)
      window.clearInterval(timer)
    }
  }, [])

  return open
}
