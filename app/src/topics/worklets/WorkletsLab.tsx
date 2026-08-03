import { useState } from 'react'
import { LabTabs } from '../../components/lab/LabTabs'
import {
  AudioWorkletCodePanel,
  AudioWorkletProblemPanel,
  AudioWorkletSandboxPanel,
  useAudioWorkletLab,
} from './LiveAudioWorkletLab'
import {
  WorkletsCodePanel,
  WorkletsProblemPanel,
  WorkletsSandboxPanel,
  useWorkletsLab,
} from './LiveWorkletsLab'
import styles from './WorkletsLab.module.css'

type Variation = 'paint' | 'audio'

export function WorkletsLab() {
  const [variation, setVariation] = useState<Variation>('audio')
  const paintLab = useWorkletsLab()
  const audioLab = useAudioWorkletLab()

  const selectVariation = (next: Variation) => {
    if (next === 'paint' && audioLab.playing) {
      void audioLab.stop()
    }
    setVariation(next)
  }

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <div className={styles.variation} role="tablist" aria-label="Вариация worklet">
          <button
            type="button"
            role="tab"
            aria-selected={variation === 'audio'}
            className={`${styles.variationTab} ${variation === 'audio' ? styles.variationActive : ''}`}
            onClick={() => selectVariation('audio')}
          >
            Audio
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={variation === 'paint'}
            className={`${styles.variationTab} ${variation === 'paint' ? styles.variationActive : ''}`}
            onClick={() => selectVariation('paint')}
          >
            Paint
          </button>
        </div>

        {variation === 'audio' ? (
          <>
            <h2 className={styles.title}>Клип через AudioWorklet</h2>
            <p className={styles.lead}>
              Короткий MP3 идёт в worklet (gain) и на колонки — страница только жмёт старт.
            </p>
            <LabTabs
              problem={<AudioWorkletProblemPanel lab={audioLab} />}
              sandbox={<AudioWorkletSandboxPanel lab={audioLab} />}
              code={<AudioWorkletCodePanel />}
            />
          </>
        ) : (
          <>
            <h2 className={styles.title}>Полосатый фон без картинки</h2>
            <p className={styles.lead}>
              CSS Paint Worklet рисует фон через <code>paint(lab-stripes)</code> — сам
              подстраивается под размер.
            </p>
            <LabTabs
              problem={<WorkletsProblemPanel lab={paintLab} />}
              sandbox={<WorkletsSandboxPanel lab={paintLab} />}
              code={<WorkletsCodePanel />}
            />
          </>
        )}
      </section>
    </div>
  )
}
