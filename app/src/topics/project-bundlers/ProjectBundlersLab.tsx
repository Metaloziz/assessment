import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import {
  InteractiveCodePanel,
  type InteractiveSnippet,
} from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel } from '../../components/lab/LabViz'
import styles from './ProjectBundlersLab.module.css'

const TOPIC_ID = '04-bundlers-gulp-rollup'

type Scenario = 'spa' | 'lib' | 'assets'

const SCENARIOS: Array<{ id: Scenario; label: string }> = [
  { id: 'spa', label: 'Приложение' },
  { id: 'lib', label: 'Библиотека' },
  { id: 'assets', label: 'Ассеты' },
]

const ANSWER: Record<Scenario, { tool: string; why: string; hint: string }> = {
  spa: {
    tool: 'Vite (или Webpack)',
    why: 'esbuild в dev + Rollup в prod; HMR и code splitting',
    hint: 'граф модулей есть, потребитель — браузер → Vite на новом SPA',
  },
  lib: {
    tool: 'Rollup / tsup',
    why: 'ESM/CJS + tree shaking + external peers',
    hint: 'граф есть, но артефакт — npm-пакет, peerDeps снаружи',
  },
  assets: {
    tool: 'Gulp / скрипты',
    why: 'файлы по pipe, без графа import',
    hint: 'нет графа модулей — достаточно src → pipe → dest',
  },
}

const CASE_BRIEF: Record<Scenario, ReactNode> = {
  spa: (
    <>
      Новая админка на React: быстрый HMR через Vite, prod через Rollup — не Gulp и не конфиг
      npm-библиотеки.
    </>
  ),
  lib: (
    <>
      UI kit в npm: нужны <code>index.esm.js</code> и <code>index.cjs.js</code>, React в{' '}
      <code>external</code>.
    </>
  ),
  assets: (
    <>
      SCSS и картинки в <code>dist/</code> без единого JS entry — task runner, не bundler
      приложения.
    </>
  ),
}

const CODE_INTRO: Record<Scenario, string> = {
  spa: '`vite.config.js`: plugins + `server` (HMR) + `build.rollupOptions` (prod).',
  lib: '`rollup.config.mjs`: ESM/CJS, `external` для peerDeps.',
  assets: '`gulpfile.js`: `src → pipe → dest`, без графа `import`.',
}

const SNIPPETS: Record<Scenario, InteractiveSnippet[]> = {
  assets: [
    {
      id: 'gulpfile',
      label: 'gulpfile.js',
      note: 'Task runner: glob файлов, transform, папка на выходе.',
      executable: false,
      code: `const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));

// ← GULP: файловый pipe, не bundler приложения
function styles() {
  return gulp
    .src('src/styles/**/*.scss') // ← glob входа
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('dist/css')); // ← папка dist
}

function images() {
  return gulp
    .src('src/img/**/*')
    .pipe(gulp.dest('dist/img'));
}

exports.styles = styles;
exports.default = gulp.parallel(styles, images);`,
    },
  ],
  lib: [
    {
      id: 'rollup',
      label: 'rollup.config.mjs',
      note: 'Библиотека: два формата, peers не в бандле.',
      executable: false,
      code: `import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts', // ← entry библиотеки

  output: [
    { file: 'dist/index.esm.js', format: 'esm' },
    { file: 'dist/index.cjs.js', format: 'cjs' },
  ],

  external: ['react', 'react-dom'], // ← peerDeps с хоста

  plugins: [resolve(), typescript()],
};`,
    },
  ],
  spa: [
    {
      id: 'vite',
      label: 'vite.config.js',
      note: 'Vite: esbuild в dev, Rollup в build; entry — index.html.',
      executable: false,
      code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ← VITE: app-bundler для SPA (не Gulp, не library-Rollup)
export default defineConfig({
  plugins: [react()], // ← React / Vue / …

  server: {
    port: 3000, // ← dev: нативный ESM + HMR (esbuild)
  },

  build: {
    // ← prod: сборка через Rollup
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'], // ← code splitting
        },
      },
    },
  },
});`,
    },
  ],
}

function nodeState(on: boolean, ran: boolean): 'idle' | 'active' | 'ok' {
  if (!ran) return 'idle'
  return on ? 'ok' : 'idle'
}

function ChoiceTree({ scenario, ran }: { scenario: Scenario; ran: boolean }) {
  const needsGraph = scenario !== 'assets'
  const isLib = scenario === 'lib'
  const isSpa = scenario === 'spa'
  const isAssets = scenario === 'assets'

  const graphYes = ran && needsGraph
  const graphNo = ran && isAssets
  const libYes = ran && isLib
  const libNo = ran && isSpa

  const meta = !ran
    ? 'ожидание'
    : ANSWER[scenario].tool

  return (
    <LabVizPanel title="Дерево выбора" meta={meta}>
      <div className={styles.tree}>
        <LabNode
          label="Артефакт"
          sub="что лежит в dist"
          state={ran ? 'active' : 'idle'}
        />

        <span className={styles.arrow} aria-hidden>
          ↓
        </span>

        <LabNode
          label="Нужен граф import?"
          sub="entry и цепочка модулей"
          state={ran ? 'active' : 'idle'}
        />

        <div className={styles.fork} aria-hidden>
          <span
            className={`${styles.forkArm}${graphNo ? ` ${styles.forkArmActive}` : ` ${styles.forkArmIdle}`}`}
          >
            нет ↙
          </span>
          <span className={styles.arrow}>?</span>
          <span
            className={`${styles.forkArm}${graphYes ? ` ${styles.forkArmActive}` : ` ${styles.forkArmIdle}`}`}
          >
            ↘ да
          </span>
        </div>

        <div className={styles.row}>
          <LabNode
            label="Gulp / скрипты"
            sub="scss, img, copy"
            state={nodeState(isAssets, ran)}
            className={ran && !isAssets ? styles.dim : undefined}
          />
          <LabNode
            label="Пакет для npm?"
            sub="ESM + CJS"
            state={nodeState(needsGraph, ran)}
            className={ran && isAssets ? styles.dim : undefined}
          />
        </div>

        {ran && needsGraph ? (
          <>
            <div className={styles.fork} aria-hidden>
              <span
                className={`${styles.forkArm}${libYes ? ` ${styles.forkArmActive}` : ` ${styles.forkArmIdle}`}`}
              >
                да ↙
              </span>
              <span className={styles.arrow}>?</span>
              <span
                className={`${styles.forkArm}${libNo ? ` ${styles.forkArmActive}` : ` ${styles.forkArmIdle}`}`}
              >
                ↘ приложение
              </span>
            </div>

            <div className={styles.row}>
              <LabNode
                label="Rollup / tsup"
                sub="external peers"
                state={nodeState(isLib, ran)}
                className={ran && isSpa ? styles.dim : undefined}
              />
              <LabNode
                label="Vite"
                sub="или Webpack · HMR"
                state={nodeState(isSpa, ran)}
                className={ran && isLib ? styles.dim : undefined}
              />
            </div>
          </>
        ) : null}
      </div>
    </LabVizPanel>
  )
}

function ScenarioSwitch({
  value,
  onChange,
}: {
  value: Scenario
  onChange: (id: Scenario) => void
}) {
  return (
    <div className={shell.row}>
      {SCENARIOS.map((s) => (
        <LabButton
          key={s.id}
          variant="ghost"
          size="sm"
          active={value === s.id}
          onClick={() => onChange(s.id)}
        >
          {s.label}
        </LabButton>
      ))}
    </div>
  )
}

export function ProjectBundlersLab() {
  const { lines, log, clear } = useLabLog()
  const [scenario, setScenario] = useState<Scenario>('spa')
  const [ran, setRan] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  const reset = () => {
    clear()
    setRan(false)
    setHint(null)
  }

  const pickScenario = (next: Scenario) => {
    setScenario(next)
    reset()
  }

  const run = () => {
    const a = ANSWER[scenario]
    clear()
    setRan(true)
    log('info', `сценарий: ${SCENARIOS.find((s) => s.id === scenario)?.label ?? scenario}`)
    log('ok', `выбор: ${a.tool}`)
    log('info', a.why)
    setHint(a.hint)
  }

  const problem = (
    <div className={shell.panel}>
      <ScenarioSwitch value={scenario} onChange={pickScenario} />

      <div className={shell.row}>
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        Инструмент подбирают по тому, что должно оказаться в <code>dist</code>, а не по привычке
        команды или «модному» стеку.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[scenario]}</p>

      <ChoiceTree scenario={scenario} ran={ran} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}

      {ran ? <LabLogView lines={lines} /> : null}
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <ScenarioSwitch value={scenario} onChange={pickScenario} />
      <InteractiveCodePanel
        key={scenario}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[scenario]}
        snippets={SNIPPETS[scenario]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Какой сборщик взять"
      lead="Три типа артефакта — три ветки дерева; конфиг выбранного сценария на вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}
