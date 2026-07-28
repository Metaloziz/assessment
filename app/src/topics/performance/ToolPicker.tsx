import { useMemo, useState } from 'react'
import styles from './ToolPicker.module.css'

type Tool = 'performance' | 'network' | 'lighthouse' | 'coverage'

type Question = {
  id: string
  prompt: string
  answer: Tool
  explain: string
}

const TOOLS: Array<{ id: Tool; label: string }> = [
  { id: 'performance', label: 'Performance' },
  { id: 'network', label: 'Network' },
  { id: 'lighthouse', label: 'Lighthouse' },
  { id: 'coverage', label: 'Coverage' },
]

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    prompt: 'Кнопка отвечает через 400 мс — ищете long task на main thread.',
    answer: 'performance',
    explain: 'Performance timeline / Bottom-Up покажет скрипт, который блокирует поток.',
  },
  {
    id: 'q2',
    prompt: 'Нужен быстрый baseline score и список рекомендаций для PR.',
    answer: 'lighthouse',
    explain: 'Lighthouse даёт lab-аудит и actionable list; удобно в CI.',
  },
  {
    id: 'q3',
    prompt: 'Картинка LCP грузится 3 секунды — смотрите TTFB и размер.',
    answer: 'network',
    explain: 'Network waterfall: приоритет, кэш, CDN, сжатие.',
  },
  {
    id: 'q4',
    prompt: 'Подозреваете, что половина CSS/JS на старте не используется.',
    answer: 'coverage',
    explain: 'Coverage подсветит unused bytes — кандидат на code splitting / purge.',
  },
]

export function ToolPicker() {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<Tool | null>(null)
  const [score, setScore] = useState(0)

  const q = QUESTIONS[index]
  const done = index >= QUESTIONS.length

  const status = useMemo(() => {
    if (!picked || !q) return null
    return picked === q.answer ? 'correct' : 'wrong'
  }, [picked, q])

  const choose = (tool: Tool) => {
    if (picked || !q) return
    setPicked(tool)
    if (tool === q.answer) setScore((s) => s + 1)
  }

  const next = () => {
    setPicked(null)
    setIndex((i) => i + 1)
  }

  const reset = () => {
    setIndex(0)
    setPicked(null)
    setScore(0)
  }

  if (done) {
    return (
      <div className={styles.root}>
        <p className={styles.result}>
          Результат: <strong>{score}/{QUESTIONS.length}</strong>
        </p>
        <button type="button" className="uiBtn uiBtnGhost" onClick={reset}>
          Ещё раз
        </button>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.progress}>
        Вопрос {index + 1} / {QUESTIONS.length}
      </div>
      <p className={styles.prompt}>{q.prompt}</p>
      <div className={styles.options}>
        {TOOLS.map((t) => {
          const isAnswer = picked && t.id === q.answer
          const isWrong = picked === t.id && t.id !== q.answer
          return (
            <button
              key={t.id}
              type="button"
              className={`${styles.option} ${isAnswer ? styles.correct : ''} ${isWrong ? styles.wrong : ''}`}
              onClick={() => choose(t.id)}
              disabled={Boolean(picked)}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      {status ? (
        <div className={styles.feedback}>
          <p className={status === 'correct' ? styles.ok : styles.bad}>
            {status === 'correct' ? 'Верно' : 'Не то'}
          </p>
          <p className={styles.explain}>{q.explain}</p>
          <button type="button" className="uiBtn uiBtnPrimary" onClick={next}>
            Дальше
          </button>
        </div>
      ) : null}
    </div>
  )
}
