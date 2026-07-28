import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { CodeBlock } from '../../components/CodeBlock'
import styles from './CodePlayground.module.css'

gsap.registerPlugin(useGSAP)

type Props = {
  blocks: Array<{ language: string; code: string }>
}

export function CodePlayground({ blocks }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

  const { contextSafe } = useGSAP({ scope: rootRef })

  const reveal = contextSafe(() => {
    setRevealed(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    gsap.from('.codeReveal', {
      opacity: 0,
      y: 12,
      stagger: 0.08,
      duration: 0.35,
      ease: 'power2.out',
    })
  })

  if (!blocks.length) {
    return <p className={styles.empty}>Нет примеров кода.</p>
  }

  return (
    <div ref={rootRef} className={styles.root}>
      {!revealed ? (
        <button type="button" className={`uiBtn uiBtnPrimary ${styles.reveal}`} onClick={reveal}>
          Reveal code examples
        </button>
      ) : (
        blocks.map((block, idx) => (
          <div key={idx} className={`codeReveal ${styles.item}`}>
            <CodeBlock code={block.code} language={block.language} />
          </div>
        ))
      )}
    </div>
  )
}
