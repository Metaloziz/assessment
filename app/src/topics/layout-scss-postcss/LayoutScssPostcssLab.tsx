import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutScssPostcssLab.module.css'

const TOPIC_ID = '168-layout-scss-postcss'

type CaseId = 'nesting' | 'vars' | 'mixin' | 'autoprefixer' | 'pipeline' | 'deep'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'nesting', label: 'SCSS nesting' },
  { id: 'vars', label: '$vars' },
  { id: 'mixin', label: 'Mixin' },
  { id: 'autoprefixer', label: 'Autoprefixer' },
  { id: 'pipeline', label: 'SCSS → PostCSS' },
  { id: 'deep', label: 'Глубокий &' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  nesting: (
    <>
      Вложенность и <code>&</code> в SCSS раскрываются в плоские селекторы в CSS.
    </>
  ),
  vars: (
    <>
      <code>$accent</code> схлопывается при компиляции — в бандле уже литерал, не <code>var(--…)</code>.
    </>
  ),
  mixin: (
    <>
      <code>@include</code> подставляет тело миксина в место вызова — после Sass миксина уже нет.
    </>
  ),
  autoprefixer: (
    <>
      PostCSS + <code>autoprefixer</code> дописывает префиксы по <code>browserslist</code>, Sass этого не делает.
    </>
  ),
  pipeline: (
    <>
      Сначала Sass раскрывает SCSS, затем PostCSS обрабатывает уже обычный CSS.
    </>
  ),
  deep: (
    <>
      Шесть уровней <code>&</code> дают длинный селектор и высокую specificity — антипример.
    </>
  ),
}

const CASE_META: Record<CaseId, string> = {
  nesting: 'Sass · nesting',
  vars: 'Sass · $token → literal',
  mixin: 'Sass · @mixin',
  autoprefixer: 'PostCSS · autoprefixer',
  pipeline: 'Sass → PostCSS',
  deep: 'specificity trap',
}

type PipeStep = 'scss' | 'sass' | 'css' | 'postcss' | 'out'

const PIPE_STEPS: PipeStep[] = ['scss', 'sass', 'css', 'postcss', 'out']

const PIPE_LABEL: Record<PipeStep, string> = {
  scss: 'SCSS',
  sass: 'Sass',
  css: 'CSS',
  postcss: 'PostCSS',
  out: 'бандл',
}

const PIPE_ACTIVE: Record<CaseId, PipeStep[]> = {
  nesting: ['scss', 'sass', 'css', 'out'],
  vars: ['scss', 'sass', 'css', 'out'],
  mixin: ['scss', 'sass', 'css', 'out'],
  autoprefixer: ['css', 'postcss', 'out'],
  pipeline: ['scss', 'sass', 'css', 'postcss', 'out'],
  deep: ['scss', 'sass', 'css', 'out'],
}

const WARN_CASES: Partial<Record<CaseId, true>> = {
  deep: true,
}

const SOURCE: Record<CaseId, string> = {
  nesting: `.button {
  color: white;

  &:hover {
    filter: brightness(1.1);
  }

  &__icon { margin-inline-end: .5rem; }
}`,
  vars: `$accent: #69b1ff;

.button {
  border-color: $accent;
  color: $accent;
}`,
  mixin: `@mixin press {
  transform: translateY(1px);
}

.button:active {
  @include press;
}`,
  autoprefixer: `.card {
  user-select: none;
  backdrop-filter: blur(8px);
}`,
  pipeline: `$gap: 0.5rem;

.row {
  display: flex;
  gap: $gap;
  user-select: none;
}`,
  deep: `.page {
  .layout {
    .sidebar {
      .nav {
        .item {
          &.isActive { color: red; }
        }
      }
    }
  }
}`,
}

const OUTPUT: Record<CaseId, string> = {
  nesting: `.button { color: white; }
.button:hover { filter: brightness(1.1); }
.button__icon { margin-inline-end: .5rem; }`,
  vars: `.button {
  border-color: #69b1ff;
  color: #69b1ff;
}`,
  mixin: `.button:active {
  transform: translateY(1px);
}`,
  autoprefixer: `.card {
  -webkit-user-select: none;
  user-select: none;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}`,
  pipeline: `.row {
  display: flex;
  gap: 0.5rem;
  -webkit-user-select: none;
  user-select: none;
}`,
  deep: `.page .layout .sidebar .nav .item.isActive {
  color: red;
}`,
}

const SOURCE_LANG: Record<CaseId, string> = {
  nesting: 'SCSS',
  vars: 'SCSS',
  mixin: 'SCSS',
  autoprefixer: 'CSS',
  pipeline: 'SCSS',
  deep: 'SCSS',
}

const OUT_LANG: Record<CaseId, string> = {
  nesting: 'CSS',
  vars: 'CSS',
  mixin: 'CSS',
  autoprefixer: 'CSS + prefixes',
  pipeline: 'CSS + prefixes',
  deep: 'CSS',
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'button-scss',
    label: '_button.scss',
    note: 'Nesting, $token и mixin — удобство автора. После Sass остаётся плоский CSS.',
    executable: false,
    languageLabel: 'scss',
    code: `$accent: #69b1ff; /* ← схлопнется в литерал */

@mixin press {
  transform: translateY(1px);
}

.button {
  color: $accent;

  &:hover {
    filter: brightness(1.1); /* ← .button:hover */
  }

  &:active {
    @include press;
  }
}`,
  },
  {
    id: 'postcss-config',
    label: 'postcss.config.js',
    note: 'Autoprefixer смотрит browserslist. Sass префиксы не пишет.',
    executable: false,
    code: `module.exports = {
  plugins: [
    require('autoprefixer'), // ← PostCSS, не Sass
  ],
};

// package.json → "browserslist": [">0.5%", "not dead"]`,
  },
  {
    id: 'vite-css',
    label: 'vite.config.ts',
    note: 'Типичный порядок: SCSS (встроенно) → PostCSS из конфига.',
    executable: false,
    code: `import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    // ← *.scss компилирует Vite/Sass
    // ← postcss.config.* подхватывается сам
    devSourcemap: true,
  },
});`,
  },
]

function PipelineStrip({ caseId }: { caseId: CaseId }) {
  const active = new Set(PIPE_ACTIVE[caseId])
  return (
    <div className={styles.pipeline} aria-label="Пайплайн">
      {PIPE_STEPS.map((step, i) => {
        const on = active.has(step)
        return (
          <span key={step} style={{ display: 'contents' }}>
            {i > 0 ? <span className={styles.pipeArrow}>→</span> : null}
            <span
              className={[
                styles.pipeStep,
                on ? styles.pipeStepOn : styles.pipeStepMute,
              ].join(' ')}
            >
              {PIPE_LABEL[step]}
            </span>
          </span>
        )
      })}
    </div>
  )
}

function DemoPreview({ caseId }: { caseId: CaseId }) {
  const className = [
    styles.demoBtn,
    caseId === 'nesting' && styles.demoHover,
    (caseId === 'autoprefixer' || caseId === 'pipeline') && styles.demoPrefixed,
    caseId === 'deep' && styles.demoDeep,
  ]
    .filter(Boolean)
    .join(' ')

  const label =
    caseId === 'deep'
      ? '.page…isActive'
      : caseId === 'autoprefixer' || caseId === 'pipeline'
        ? 'user-select + prefix'
        : caseId === 'vars'
          ? '$accent → #69b1ff'
          : caseId === 'mixin'
            ? '@include press'
            : '&.hover → :hover'

  return (
    <div className={styles.live}>
      <button type="button" tabIndex={-1} className={className}>
        {label}
      </button>
    </div>
  )
}

function TransformViz({ caseId }: { caseId: CaseId }) {
  const warn = Boolean(WARN_CASES[caseId])

  return (
    <LabVizPanel title="Исходник → CSS" meta={CASE_META[caseId]}>
      <div className={styles.stage}>
        <PipelineStrip caseId={caseId} />
        <div className={styles.split}>
          <div className={[styles.panel, warn ? styles.panelWarn : styles.panelOk].join(' ')}>
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>Вход</span>
              <span className={styles.panelMeta}>{SOURCE_LANG[caseId]}</span>
            </div>
            <pre className={styles.code}>{SOURCE[caseId]}</pre>
          </div>
          <div className={[styles.panel, warn ? styles.panelWarn : styles.panelOk].join(' ')}>
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>После сборки</span>
              <span className={styles.panelMeta}>{OUT_LANG[caseId]}</span>
            </div>
            <pre className={styles.code}>{OUTPUT[caseId]}</pre>
          </div>
        </div>
        <DemoPreview caseId={caseId} />
      </div>
    </LabVizPanel>
  )
}

export function LayoutScssPostcssLab() {
  const [caseId, setCaseId] = useState<CaseId>('nesting')

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            onClick={() => setCaseId(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

      <p className={shell.pain}>
        SCSS расширяет синтаксис до CSS; PostCSS гоняет CSS плагинами. Оба шага — на сборке, браузер
        видит уже результат.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <TransformViz caseId={caseId} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="SCSS → плоский CSS; PostCSS/autoprefixer по browserslist. `$` на билде ≠ `var(--…)` в рантайме."
      snippets={SNIPPETS}
    />
  )

  return (
    <JsLabShell
      title="SCSS · PostCSS"
      lead="Переключай приём — слева исходник, справа то, что уедет в бандл."
      problem={problem}
      code={code}
    />
  )
}
