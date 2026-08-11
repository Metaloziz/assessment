import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '04-bundlers-gulp-rollup'

type Scenario = 'spa' | 'lib' | 'assets'

const ANSWER: Record<Scenario, { tool: string; why: string; file: string }> = {
  spa: {
    tool: 'Vite / Webpack',
    why: 'module graph + HMR + code splitting',
    file: 'vite.config.js (или webpack)',
  },
  lib: {
    tool: 'Rollup / tsup',
    why: 'чистый ESM/CJS + tree shaking + external peers',
    file: 'rollup.config.mjs',
  },
  assets: {
    tool: 'Gulp (или скрипты)',
    why: 'файловые пайпы без JS-графа',
    file: 'gulpfile.js',
  },
}

export function ProjectBundlersLab() {
  const { lines, log, clear } = useLabLog()
  const [scenario, setScenario] = useState<Scenario>('spa')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    const a = ANSWER[scenario]
    clear()
    log('info', `сценарий: ${scenario}`)
    log('ok', `выбор: ${a.tool}`)
    log('info', a.why)
    log('ok', `см. «Код» → ${a.file}`)
    setHint(a.tool)
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Сборщик выбирают по артефакту. Здесь подберите инструмент под сценарий; примеры конфигов —
        во вкладке «Код».
      </p>
      <ol className={shell.steps}>
        <li>Выберите сценарий: SPA, npm-lib или assets.</li>
        <li>
          Откройте «Код»: <code>gulpfile.js</code>, <code>rollup.config.mjs</code>,{' '}
          <code>vite.config.js</code> — блоки помечены.
        </li>
        <li>Сверьте рекомендацию в логе с конфигом в «Код».</li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant="ghost"
          size="sm"
          active={scenario === 'spa'}
          onClick={() => setScenario('spa')}
        >
          SPA
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={scenario === 'lib'}
          onClick={() => setScenario('lib')}
        >
          npm-lib
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={scenario === 'assets'}
          onClick={() => setScenario('assets')}
        >
          assets
        </LabButton>
        <LabButton variant="primary" onClick={run}>
          Выбрать сборщик
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
          }}
        >
          Сброс
        </LabButton>
      </div>

      {hint ? (
        <p className={shell.hint}>
          Рекомендация: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Выберите сценарий.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Gulp — файловые pipes; Rollup — библиотека; Vite — SPA."
      snippets={[
        {
          id: 'gulpfile',
          label: 'gulpfile.js',
          note: 'Task runner: src → pipe → dest. Нет module graph — для стилей/ассетов.',
          executable: false,
          code: `const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const imagemin = require('gulp-imagemin');

// ═══════════════════════════════════════════
// GULP ← файловый пайплайн, не bundler
// Когда: scss, картинки, копирование без import-графа
// ═══════════════════════════════════════════

function styles() {
  return gulp
    .src('src/styles/**/*.scss') // ← вход: glob файлов
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('dist/css')); // ← выход: папка
}

function images() {
  return gulp.src('src/img/**/*').pipe(imagemin()).pipe(gulp.dest('dist/img'));
}

exports.styles = styles;
exports.images = images;
exports.default = gulp.parallel(styles, images);`,
        },
        {
          id: 'rollup',
          label: 'rollup.config.mjs',
          note: 'Библиотека: ESM+CJS, external peers, сильный tree shaking.',
          executable: false,
          code: `import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

// ═══════════════════════════════════════════
// ROLLUP ← bundler для npm-библиотеки / SDK
// Когда: UI kit, пакет с чистым ESM/CJS
// ═══════════════════════════════════════════
export default {
  input: 'src/index.ts', // ← entry библиотеки

  output: [
    { file: 'dist/index.esm.js', format: 'esm' }, // ← для import
    { file: 'dist/index.cjs.js', format: 'cjs' }, // ← для require
  ],

  // ═══════════════════════════════════════════
  // EXTERNAL ← peerDeps не бандлить (React с хоста)
  // ═══════════════════════════════════════════
  external: ['react', 'react-dom'], // ← не класть в пакет

  plugins: [resolve(), typescript()],
};`,
        },
        {
          id: 'vite',
          label: 'vite.config.js',
          note: 'Приложение: HMR, code splitting, экосистема для SPA.',
          executable: false,
          code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ═══════════════════════════════════════════
// VITE / WEBPACK ← bundler для приложения (SPA)
// Когда: админка, сайт, нужен HMR и splitting
// ═══════════════════════════════════════════
export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000, // ← DX: быстрый dev-сервер
  },

  build: {
    rollupOptions: {
      output: {
        // ← code splitting чанков приложения
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});

// Выбор (кратко):
// SPA / app     → Vite или Webpack
// npm library   → Rollup / tsup
// asset pipes   → Gulp (или npm-скрипты)`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Какой сборщик взять"
      lead="Выбор сборщика под сценарий; gulpfile, Rollup и Vite — во вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}
