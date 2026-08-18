import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutPostcssLab.module.css'

const TOPIC_ID = '264-layout-postcss'

type CaseId = 'autoprefixer' | 'nesting' | 'preset' | 'order' | 'order-bad'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'autoprefixer', label: 'Autoprefixer' },
  { id: 'nesting', label: 'Nesting' },
  { id: 'preset', label: 'preset-env' },
  { id: 'order', label: 'Порядок ✓' },
  { id: 'order-bad', label: 'Порядок ✗' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  autoprefixer: (
    <>
      <code>autoprefixer</code> читает <code>browserslist</code> и дописывает вендорные префиксы к
      уже валидному CSS.
    </>
  ),
  nesting: (
    <>
      <code>postcss-nesting</code> раскрывает вложенные правила и <code>&</code> в плоские селекторы.
    </>
  ),
  preset: (
    <>
      <code>postcss-preset-env</code> даунлевелит синтаксис «на вырост» (stage) под целевые браузеры.
    </>
  ),
  order: (
    <>
      Сначала nesting / preset-env, затем autoprefixer — префиксы попадают на финальные декларации.
    </>
  ),
  'order-bad': (
    <>
      Autoprefixer до nesting — префиксы на «сыром» синтаксисе; nesting потом ломает ожидания.
    </>
  ),
}

const CASE_META: Record<CaseId, string> = {
  autoprefixer: 'browserslist → prefixes',
  nesting: 'postcss-nesting',
  preset: 'stage → plain CSS',
  order: 'nesting → autoprefixer',
  'order-bad': 'autoprefixer → nesting',
}

type PipeStep = 'css' | 'plugin' | 'plugin2' | 'out'

const PIPE_SEQUENCE: Record<CaseId, Array<{ step: PipeStep; label: string }>> = {
  autoprefixer: [
    { step: 'css', label: 'CSS' },
    { step: 'plugin', label: 'autoprefixer' },
    { step: 'out', label: 'бандл' },
  ],
  nesting: [
    { step: 'css', label: 'CSS' },
    { step: 'plugin', label: 'postcss-nesting' },
    { step: 'out', label: 'бандл' },
  ],
  preset: [
    { step: 'css', label: 'CSS' },
    { step: 'plugin', label: 'preset-env' },
    { step: 'out', label: 'бандл' },
  ],
  order: [
    { step: 'css', label: 'CSS' },
    { step: 'plugin', label: 'nesting' },
    { step: 'plugin2', label: 'autoprefixer' },
    { step: 'out', label: 'бандл' },
  ],
  'order-bad': [
    { step: 'css', label: 'CSS' },
    { step: 'plugin', label: 'autoprefixer' },
    { step: 'plugin2', label: 'nesting' },
    { step: 'out', label: 'бандл' },
  ],
}

const WARN_CASES: Partial<Record<CaseId, true>> = {
  'order-bad': true,
}

const SOURCE: Record<CaseId, string> = {
  autoprefixer: `.card {
  user-select: none;
  backdrop-filter: blur(8px);
}`,
  nesting: `.button {
  color: white;

  &:hover {
    filter: brightness(1.1);
  }
}`,
  preset: `.panel {
  color: color-mix(in srgb, var(--accent) 80%, white);
}`,
  order: `.row {
  display: flex;

  & > * {
    flex: 1;
  }
}`,
  'order-bad': `.row {
  display: flex;

  & > * {
    flex: 1;
  }
}`,
}

const OUTPUT: Record<CaseId, string> = {
  autoprefixer: `.card {
  -webkit-user-select: none;
  user-select: none;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}`,
  nesting: `.button {
  color: white;
}
.button:hover {
  filter: brightness(1.1);
}`,
  preset: `.panel {
  color: rgba(105, 177, 255, 0.92);
}`,
  order: `.row {
  display: flex;
}
.row > * {
  -webkit-box-flex: 1;
  flex: 1;
}`,
  'order-bad': `/* autoprefixer отработал до nesting —
   префиксы на вложенном синтаксисе, порядок ломает пайплайн */
.row {
  display: -webkit-box;
  display: flex;
}
/* nesting ещё не раскрыл & > * … */`,
}

const ACTIVE_PLUGINS: Record<CaseId, string[]> = {
  autoprefixer: ['autoprefixer'],
  nesting: ['postcss-nesting'],
  preset: ['postcss-preset-env'],
  order: ['postcss-nesting', 'autoprefixer'],
  'order-bad': ['autoprefixer', 'postcss-nesting'],
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'postcss-config',
    label: 'postcss.config.js',
    note: 'Порядок в массиве = порядок прогона AST. Сначала синтаксис, потом префixer.',
    executable: false,
    code: `module.exports = {
  plugins: [
    require('postcss-nesting'), // ← 1: раскрыть & до autoprefixer
    require('autoprefixer'), // ← 2: префиксы по browserslist
    ...(process.env.NODE_ENV === 'production'
      ? [require('cssnano')]
      : []),
  ],
};`,
  },
  {
    id: 'package-json',
    label: 'package.json',
    note: 'Autoprefixer без overrideBrowserslist читает общий browserslist.',
    executable: false,
    languageLabel: 'json',
    code: `{
  "browserslist": [
    "defaults",
    "not IE 11"
  ],
  "devDependencies": {
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "postcss-nesting": "^13.0.0",
    "postcss-preset-env": "^10.0.0"
  }
}`,
  },
  {
    id: 'plugin-min',
    label: 'postcss-plugin-strip-comments.js',
    note: 'Свой плагин — хуки по CSS-AST, не regex по тексту.',
    executable: false,
    code: `const plugin = {
  postcssPlugin: 'strip-comments', // ← имя плагина

  Once(root) {
    root.walkComments((c) => c.remove()); // ← обход AST
  },
};

plugin.postcss = true; // ← маркер PostCSS 8
module.exports = plugin;`,
  },
  {
    id: 'vite-css',
    label: 'vite.config.ts',
    note: 'Vite подхватывает postcss.config.* для CSS и для CSS после Sass.',
    executable: false,
    code: `import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    // ← postcss.config.js применяется автоматически
    devSourcemap: true,
  },
});`,
  },
]

function PipelineStrip({ caseId }: { caseId: CaseId }) {
  const steps = PIPE_SEQUENCE[caseId]
  const warn = Boolean(WARN_CASES[caseId])

  return (
    <div className={styles.pipeline} aria-label="Пайплайн PostCSS">
      {steps.map((item, i) => (
        <span key={`${item.step}-${item.label}`} style={{ display: 'contents' }}>
          {i > 0 ? <span className={styles.pipeArrow}>→</span> : null}
          <span
            className={[
              styles.pipeStep,
              styles.pipeStepOn,
              warn && i === steps.length - 2 ? styles.pipeStepWarn : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {item.label}
          </span>
        </span>
      ))}
    </div>
  )
}

function PluginChips({ caseId }: { caseId: CaseId }) {
  const all = ['postcss-nesting', 'postcss-preset-env', 'autoprefixer']
  const on = new Set(ACTIVE_PLUGINS[caseId])
  return (
    <div className={styles.chipRow} aria-label="Активные плагины">
      {all.map((p) => (
        <span key={p} className={[styles.chip, on.has(p) ? styles.chipOn : ''].join(' ')}>
          {p}
        </span>
      ))}
    </div>
  )
}

function TransformViz({ caseId }: { caseId: CaseId }) {
  const warn = Boolean(WARN_CASES[caseId])

  return (
    <LabVizPanel title="CSS → PostCSS → бандл" meta={CASE_META[caseId]}>
      <div className={styles.stage}>
        <PipelineStrip caseId={caseId} />
        <PluginChips caseId={caseId} />
        <div className={styles.split}>
          <div className={[styles.panel, styles.panelOk].join(' ')}>
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>Вход</span>
              <span className={styles.panelMeta}>исходный CSS</span>
            </div>
            <pre className={styles.code}>{SOURCE[caseId]}</pre>
          </div>
          <div className={[styles.panel, warn ? styles.panelWarn : styles.panelOk].join(' ')}>
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>После плагинов</span>
              <span className={styles.panelMeta}>{warn ? 'антипример' : 'в бандл'}</span>
            </div>
            <pre className={styles.code}>{OUTPUT[caseId]}</pre>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function LayoutPostcssLab() {
  const [caseId, setCaseId] = useState<CaseId>('autoprefixer')

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
        PostCSS парсит CSS в AST и гоняет плагины на сборке. Браузер видит только финальный CSS из
        бандла.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <TransformViz caseId={caseId} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Конфиг задаёт цепочку плагинов; Autoprefixer смотрит browserslist. Порядок в массиве = порядок трансформаций."
      snippets={SNIPPETS}
    />
  )

  return (
    <JsLabShell
      title="PostCSS"
      lead="Переключай плагин — слева входной CSS, справа то, что уедет после PostCSS."
      problem={problem}
      code={code}
    />
  )
}
