import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import type { TopicDetail } from '../../content'
import { MutationVsCopyDemo } from './MutationVsCopyDemo'
import { ProsConsDeck } from './ProsConsDeck'
import { MemoryCostSketch } from './MemoryCostSketch'
import { CodePlayground } from './CodePlayground'
import styles from './ImmutabilityLab.module.css'

gsap.registerPlugin(useGSAP)

type Props = {
  topic: TopicDetail
}

export function ImmutabilityLab({ topic }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return
      gsap.from('.labSection', {
        opacity: 0,
        y: 14,
        stagger: 0.1,
        duration: 0.45,
        ease: 'power2.out',
      })
    },
    { scope: rootRef },
  )

  return (
    <div ref={rootRef} className={styles.root}>
      <section className={`labSection ${styles.section}`}>
        <h2 className={styles.title}>Mutation vs Copy</h2>
        <p className={styles.lead}>
          Нажмите действия и сравните, что происходит со ссылкой на объект.
        </p>
        <MutationVsCopyDemo />
      </section>

      <section className={`labSection ${styles.section}`}>
        <h2 className={styles.title}>Плюсы и минусы</h2>
        <p className={styles.lead}>Клик по карточке — зафиксировать мысль перед собеседованием.</p>
        <ProsConsDeck />
      </section>

      <section className={`labSection ${styles.section}`}>
        <h2 className={styles.title}>Цена в памяти</h2>
        <p className={styles.lead}>Каждый update добавляет новую версию объекта.</p>
        <MemoryCostSketch />
      </section>

      <section className={`labSection ${styles.section}`}>
        <h2 className={styles.title}>Примеры кода</h2>
        <CodePlayground blocks={topic.codeBlocks} />
      </section>
    </div>
  )
}
