import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './GitFlowGithubGitlabLab.module.css'

const TOPIC_ID = '18-git-flow-github-gitlab'
const STEP = 0.65

type Model = 'gitflow' | 'github' | 'gitlab'
type GfCase = 'feature' | 'release'
type GhCase = 'pr' | 'hotfix'
type GlCase = 'promote' | 'release'
type CaseId = GfCase | GhCase | GlCase
type Phase = 0 | 1 | 2 | 3 | 4

const MODELS: Array<{ id: Model; label: string }> = [
  { id: 'gitflow', label: 'Git Flow' },
  { id: 'github', label: 'GitHub Flow' },
  { id: 'gitlab', label: 'GitLab Flow' },
]

const CASES: Record<Model, Array<{ id: CaseId; label: string }>> = {
  gitflow: [
    { id: 'feature', label: 'Feature → develop' },
    { id: 'release', label: 'Release / hotfix' },
  ],
  github: [
    { id: 'pr', label: 'PR в main' },
    { id: 'hotfix', label: 'Hotfix PR' },
  ],
  gitlab: [
    { id: 'promote', label: 'Промоут env' },
    { id: 'release', label: 'Release-ветка' },
  ],
}

const CODE_INTRO: Record<Model, string> = {
  gitflow:
    '`develop` интегрирует feature; `release/*` и `hotfix/*` ведут к `main` с тегом версии.',
  github:
    'Короткие ветки от `main`: PR + CI → merge → деплой с `main` (workflow ниже).',
  gitlab:
    '`main` + pipeline: manual job на `pre-production` / `production` или патчи в `release/*`.',
}

const CODE_SNIPPETS: Record<Model, InteractiveSnippet[]> = {
  gitflow: [
    {
      id: 'git-flow-release',
      label: 'scripts/git-flow-release.sh',
      note: 'Release-ветка от `develop`, hotfix от `main`; merge обратно в обе долгоживущие.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/usr/bin/env bash
set -euo pipefail

VERSION="\${1:?usage: release.sh 2.1.0}"

# ═══════════════════════════════════════════
# RELEASE ← ветка freeze перед main
# ═══════════════════════════════════════════
git checkout develop
git pull origin develop
git checkout -b "release/\${VERSION}"

# только багфиксы и версия — без новых фич
npm version "$VERSION" --no-git-tag-version
git commit -am "chore: bump \${VERSION}"

git checkout main
git merge --no-ff "release/\${VERSION}"   # ← main + tag
git tag -a "v\${VERSION}" -m "Release \${VERSION}"

git checkout develop
git merge --no-ff "release/\${VERSION}" # ← back-merge в develop

# HOTFIX ← срочный патч production
# git checkout main && git checkout -b hotfix/payment-timeout
# … fix … merge → main (tag) + develop`,
    },
    {
      id: 'git-flow-branches',
      label: '.git/config (flow prefixes)',
      note: 'Префиксы feature/release/hotfix — соглашение команды, не magic Git.',
      executable: false,
      languageLabel: 'ini',
      code: `[gitflow "branch"]
  master = main
  develop = develop

[gitflow "prefix"]
  feature = feature/
  release = release/
  hotfix = hotfix/
  versiontag = v

# feature/login → merge в develop
# release/2.1   → merge в main + develop
# hotfix/pay    → merge в main + develop`,
    },
  ],
  github: [
    {
      id: 'github-deploy',
      label: '.github/workflows/deploy.yml',
      note: 'Деплой с `main` после merge PR — одна production-версия.',
      executable: false,
      languageLabel: 'yaml',
      code: `name: Deploy

on:
  push:
    branches: [main]          # ← только main в prod

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install
        run: npm ci

      - name: Test
        run: npm test

      # DEPLOY ← main всегда deployable после CI
      - name: Deploy production
        run: npm run deploy:prod
        env:
          DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }}

# feature/* → Pull Request → review → merge → этот workflow`,
    },
    {
      id: 'github-pr-template',
      label: '.github/pull_request_template.md',
      note: 'Короткоживущие ветки: частый rebase/merge `main`, без недельного drift.',
      executable: false,
      languageLabel: 'md',
      code: `## Что меняется
- …

## Чеклист
- [ ] CI зелёный
- [ ] \`main\` подтянут (rebase или merge)
- [ ] feature flag для рискованного UI (если нужно)

## GitHub Flow
1. \`git switch -c feature/login main\`
2. коммиты → push → PR
3. merge → auto-deploy с \`main\``,
    },
  ],
  gitlab: [
    {
      id: 'gitlab-ci-env',
      label: '.gitlab-ci.yml',
      note: 'Environment branches: manual promote staging → pre-prod → production.',
      executable: false,
      languageLabel: 'yaml',
      code: `stages:
  - test
  - deploy

test:
  stage: test
  script:
    - npm ci
    - npm test
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy_staging:
  stage: deploy
  environment:
    name: staging
    url: https://staging.example.com
  script: npm run deploy:staging
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# PROMOTE ← ручной шаг на pre-prod / prod
deploy_preprod:
  stage: deploy
  when: manual
  environment:
    name: pre-production
  script: npm run deploy:preprod
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy_production:
  stage: deploy
  when: manual
  environment:
    name: production
  script: npm run deploy:prod
  rules:
    - if: $CI_COMMIT_BRANCH == "main"`,
    },
    {
      id: 'gitlab-release-branch',
      label: '.gitlab-ci-release.yml',
      note: 'Release-ветка: патчи cherry-pick, не вся `main`.',
      executable: false,
      languageLabel: 'yaml',
      code: `# RELEASE BRANCH ← только fix-патчи в поддерживаемую версию
deploy_release:
  stage: deploy
  script: npm run deploy:release
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^release\\/[0-9]+\\.[0-9]+$/

# main ──► release/2.1 (freeze)
# cherry-pick fix с main → release/2.1 → deploy клиентам v2.1.x
# back-merge в main по договорённости`,
    },
  ],
}

type BranchRow = { id: string; label: string; y: number; xEnd: number }
type Dot = { branch: string; x: number; from: Phase }
type MergeArc = { fromY: number; toY: number; x: number; from: Phase; label?: string }
type DeployMark = { branch: string; x: number; from: Phase; label: string }

type Scene = {
  branches: BranchRow[]
  dots: Dot[]
  merges: MergeArc[]
  deploys?: DeployMark[]
}

const SCENES: Record<Model, Record<string, Scene>> = {
  gitflow: {
    feature: {
      branches: [
        { id: 'main', label: 'main', y: 28, xEnd: 55 },
        { id: 'develop', label: 'develop', y: 58, xEnd: 82 },
        { id: 'feature', label: 'feature/login', y: 88, xEnd: 70 },
      ],
      dots: [
        { branch: 'main', x: 55, from: 0 },
        { branch: 'develop', x: 55, from: 0 },
        { branch: 'develop', x: 70, from: 2 },
        { branch: 'feature', x: 62, from: 1 },
        { branch: 'feature', x: 70, from: 1 },
      ],
      merges: [{ fromY: 88, toY: 58, x: 70, from: 2, label: 'merge' }],
    },
    release: {
      branches: [
        { id: 'main', label: 'main', y: 28, xEnd: 88 },
        { id: 'develop', label: 'develop', y: 58, xEnd: 62 },
        { id: 'release', label: 'release/2.1', y: 88, xEnd: 78 },
      ],
      dots: [
        { branch: 'main', x: 55, from: 0 },
        { branch: 'develop', x: 55, from: 0 },
        { branch: 'develop', x: 62, from: 1 },
        { branch: 'release', x: 70, from: 2 },
        { branch: 'main', x: 88, from: 3 },
      ],
      merges: [
        { fromY: 88, toY: 28, x: 78, from: 3, label: 'tag v2.1' },
        { fromY: 88, toY: 58, x: 78, from: 4, label: 'back-merge' },
      ],
      deploys: [{ branch: 'main', x: 88, from: 3, label: 'prod' }],
    },
  },
  github: {
    pr: {
      branches: [
        { id: 'main', label: 'main', y: 38, xEnd: 85 },
        { id: 'feature', label: 'feature/login', y: 78, xEnd: 72 },
      ],
      dots: [
        { branch: 'main', x: 50, from: 0 },
        { branch: 'feature', x: 58, from: 1 },
        { branch: 'feature', x: 72, from: 2 },
        { branch: 'main', x: 85, from: 3 },
      ],
      merges: [{ fromY: 78, toY: 38, x: 72, from: 3, label: 'PR merge' }],
      deploys: [{ branch: 'main', x: 85, from: 4, label: 'deploy' }],
    },
    hotfix: {
      branches: [
        { id: 'main', label: 'main', y: 38, xEnd: 88 },
        { id: 'fix', label: 'fix/payment', y: 78, xEnd: 74 },
      ],
      dots: [
        { branch: 'main', x: 52, from: 0 },
        { branch: 'fix', x: 60, from: 1 },
        { branch: 'fix', x: 74, from: 2 },
        { branch: 'main', x: 88, from: 3 },
      ],
      merges: [{ fromY: 78, toY: 38, x: 74, from: 3, label: 'fast PR' }],
      deploys: [{ branch: 'main', x: 88, from: 4, label: 'deploy' }],
    },
  },
  gitlab: {
    promote: {
      branches: [
        { id: 'main', label: 'main', y: 28, xEnd: 72 },
        { id: 'pre', label: 'pre-production', y: 58, xEnd: 82 },
        { id: 'prod', label: 'production', y: 88, xEnd: 92 },
      ],
      dots: [
        { branch: 'main', x: 55, from: 0 },
        { branch: 'main', x: 72, from: 1 },
        { branch: 'pre', x: 82, from: 2 },
        { branch: 'prod', x: 92, from: 3 },
      ],
      merges: [
        { fromY: 28, toY: 58, x: 72, from: 2, label: 'manual' },
        { fromY: 58, toY: 88, x: 82, from: 3, label: 'manual' },
      ],
      deploys: [
        { branch: 'pre', x: 82, from: 2, label: 'pre-prod' },
        { branch: 'prod', x: 92, from: 4, label: 'prod' },
      ],
    },
    release: {
      branches: [
        { id: 'main', label: 'main', y: 38, xEnd: 70 },
        { id: 'release', label: 'release/2.1', y: 78, xEnd: 86 },
      ],
      dots: [
        { branch: 'main', x: 55, from: 0 },
        { branch: 'release', x: 62, from: 1 },
        { branch: 'release', x: 74, from: 2 },
        { branch: 'release', x: 86, from: 3 },
      ],
      merges: [{ fromY: 38, toY: 78, x: 62, from: 1, label: 'fork' }],
      deploys: [{ branch: 'release', x: 86, from: 4, label: 'v2.1.x' }],
    },
  },
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  onDone: () => void,
) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
}

function branchY(scene: Scene, id: string) {
  return scene.branches.find((b) => b.id === id)?.y ?? 50
}

function mergeCurve(fromY: number, toY: number, x: number) {
  const midX = x + 6
  return `M ${x} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${x + 12} ${toY}`
}

function BranchGraph({ scene, phase }: { scene: Scene; phase: Phase }) {
  return (
    <svg className={styles.graphSvg} viewBox="0 0 100 105" role="img" aria-label="Граф веток">
      {scene.branches.map((b) => {
        const hot = scene.dots.some((d) => d.branch === b.id && d.from <= phase && d.from > 0)
        return (
          <g key={b.id}>
            <line
              x1={18}
              y1={b.y}
              x2={b.xEnd}
              y2={b.y}
              className={[styles.branchLine, hot ? styles.branchLineHot : ''].filter(Boolean).join(' ')}
            />
            <text
              x={4}
              y={b.y + 2.5}
              className={[styles.branchLabel, hot ? styles.branchLabelHot : ''].filter(Boolean).join(' ')}
            >
              {b.label}
            </text>
          </g>
        )
      })}

      {scene.merges.map((m, i) => {
        const on = phase >= m.from
        return (
          <g key={`merge-${i}`}>
            <path
              d={mergeCurve(m.fromY, m.toY, m.x)}
              className={[styles.mergePath, on ? styles.mergePathHot : ''].filter(Boolean).join(' ')}
            />
            {m.label ? (
              <text
                x={m.x + 14}
                y={(m.fromY + m.toY) / 2 + 2}
                className={[styles.mergeLabel, on ? styles.mergeLabelHot : ''].filter(Boolean).join(' ')}
              >
                {m.label}
              </text>
            ) : null}
          </g>
        )
      })}

      {scene.dots.map((d, i) => {
        const y = branchY(scene, d.branch)
        const on = phase >= d.from
        const isLast =
          on &&
          !scene.dots.some((other, j) => j > i && other.branch === d.branch && other.from <= phase)
        return (
          <circle
            key={`dot-${i}`}
            cx={d.x}
            cy={y}
            r={4.5}
            className={[
              styles.commit,
              on ? (isLast ? styles.commitHot : styles.commitOk) : styles.commitDim,
            ]
              .filter(Boolean)
              .join(' ')}
          />
        )
      })}

      {scene.deploys?.map((d, i) => {
        const y = branchY(scene, d.branch)
        const on = phase >= d.from
        return (
          <text
            key={`deploy-${i}`}
            x={d.x + 5}
            y={y - 8}
            className={[styles.deployBadge, on ? styles.deployBadgeOn : ''].filter(Boolean).join(' ')}
          >
            ▲ {d.label}
          </text>
        )
      })}
    </svg>
  )
}

const PAIN: Record<Model, ReactNode> = {
  gitflow: (
    <>
      Две долгоживущие ветки — <code>main</code> и <code>develop</code>; feature сливаются в develop,
      релиз и hotfix идут в <code>main</code> с back-merge.
    </>
  ),
  github: (
    <>
      Одна <code>main</code>, готовая к деплою: короткая ветка → PR → merge → CI деплоит с{' '}
      <code>main</code>.
    </>
  ),
  gitlab: (
    <>
      <code>main</code> остаётся trunk, а промоут на <code>pre-production</code> /{' '}
      <code>production</code> или патчи в <code>release/*</code> — через pipeline.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  feature: (
    <>
      <code>feature/login</code> merge в <code>develop</code>; <code>main</code> пока без новой версии.
    </>
  ),
  release: (
    <>
      <code>release/2.1</code> → <code>main</code> с тегом и back-merge в <code>develop</code>.
    </>
  ),
  pr: (
    <>
      PR с <code>feature/login</code> попадает в <code>main</code>, после merge — деплой.
    </>
  ),
  hotfix: (
    <>
      Срочный <code>fix/payment</code> — приоритетный PR в <code>main</code>, без release-ветки.
    </>
  ),
  promote: (
    <>
      Коммит в <code>main</code>, затем manual job на <code>pre-production</code> и{' '}
      <code>production</code>.
    </>
  ),
}

function ModelSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Model
  disabled?: boolean
  onChange: (id: Model) => void
}) {
  return (
    <div className={shell.row}>
      {MODELS.map((m) => (
        <LabButton
          key={m.id}
          variant="ghost"
          size="sm"
          active={value === m.id}
          disabled={disabled}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </LabButton>
      ))}
    </div>
  )
}

export function GitFlowGithubGitlabLab() {
  const { lines, log, clear } = useLabLog()
  const [model, setModel] = useState<Model>('gitflow')
  const [caseId, setCaseId] = useState<CaseId>('feature')
  const [phase, setPhase] = useState<Phase>(0)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const scene = SCENES[model][caseId]!

  const resetViz = () => {
    setPhase(0)
    setHint(null)
  }

  const selectModel = (next: Model) => {
    tlRef.current?.kill()
    setBusy(false)
    setModel(next)
    setCaseId(CASES[next][0]!.id)
    clear()
    resetViz()
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    const finish = (msgs: Array<{ kind: 'ok' | 'info' | 'warn'; text: string }>, hintText: string) => {
      for (const m of msgs) log(m.kind, m.text)
      setHint(hintText)
    }

    if (model === 'gitflow' && caseId === 'feature') {
      playTimeline(
        tlRef,
        [
          () => setPhase(1),
          () => setPhase(2),
          () => {
            setPhase(4)
            finish(
              [
                { kind: 'info', text: 'feature/login: 2 коммита' },
                { kind: 'ok', text: 'merge → develop; main без релиза' },
              ],
              'интеграция в develop, не в main',
            )
          },
        ],
        () => setBusy(false),
      )
      return
    }

    if (model === 'gitflow' && caseId === 'release') {
      playTimeline(
        tlRef,
        [
          () => setPhase(1),
          () => setPhase(2),
          () => setPhase(3),
          () => {
            setPhase(4)
            finish(
              [
                { kind: 'info', text: 'release/2.1 от develop' },
                { kind: 'ok', text: 'merge → main · tag v2.1.0' },
                { kind: 'info', text: 'back-merge → develop' },
              ],
              'main + develop синхронизированы после релиза',
            )
          },
        ],
        () => setBusy(false),
      )
      return
    }

    if (model === 'github' && caseId === 'pr') {
      playTimeline(
        tlRef,
        [
          () => setPhase(1),
          () => setPhase(2),
          () => setPhase(3),
          () => {
            setPhase(4)
            finish(
              [
                { kind: 'info', text: 'feature/login → PR' },
                { kind: 'ok', text: 'CI зелёный · merge в main' },
                { kind: 'ok', text: 'workflow deploy.yml на push main' },
              ],
              'main deployable сразу после merge',
            )
          },
        ],
        () => setBusy(false),
      )
      return
    }

    if (model === 'github' && caseId === 'hotfix') {
      playTimeline(
        tlRef,
        [
          () => setPhase(1),
          () => setPhase(2),
          () => setPhase(3),
          () => {
            setPhase(4)
            finish(
              [
                { kind: 'warn', text: 'fix/payment от main' },
                { kind: 'ok', text: 'приоритетный PR · merge' },
                { kind: 'ok', text: 'деплой с main без release-ветки' },
              ],
              'hotfix = короткий PR, не отдельный процесс',
            )
          },
        ],
        () => setBusy(false),
      )
      return
    }

    if (model === 'gitlab' && caseId === 'promote') {
      playTimeline(
        tlRef,
        [
          () => setPhase(1),
          () => setPhase(2),
          () => setPhase(3),
          () => {
            setPhase(4)
            finish(
              [
                { kind: 'info', text: 'push main → test + staging auto' },
                { kind: 'ok', text: 'manual: pre-production' },
                { kind: 'ok', text: 'manual: production' },
              ],
              'окружения контролирует pipeline, не лишние Git-ветки',
            )
          },
        ],
        () => setBusy(false),
      )
      return
    }

    playTimeline(
      tlRef,
      [
        () => setPhase(1),
        () => setPhase(2),
        () => setPhase(3),
        () => {
          setPhase(4)
          finish(
            [
              { kind: 'info', text: 'release/2.1 от main (freeze)' },
              { kind: 'ok', text: 'cherry-pick fix → release/2.1' },
              { kind: 'ok', text: 'deploy v2.1.x клиентам' },
            ],
            'патчи в release-ветку, не весь main',
          )
        },
      ],
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setModel('gitflow')
    setCaseId('feature')
    resetViz()
  }

  const vizTitle =
    model === 'gitflow' ? 'Git Flow' : model === 'github' ? 'GitHub Flow' : 'GitLab Flow'

  const problem = (
    <div className={shell.panel}>
      <ModelSwitch value={model} disabled={busy} onChange={selectModel} />

      <div className={shell.row}>
        {CASES[model].map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={busy}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[model]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <LabVizPanel title={vizTitle} meta={phase === 0 ? 'idle' : `шаг ${phase}`}>
        <BranchGraph scene={scene} phase={phase} />
      </LabVizPanel>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <ModelSwitch value={model} onChange={selectModel} />
      <InteractiveCodePanel
        key={model}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[model]}
        snippets={CODE_SNIPPETS[model]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Git Flow · GitHub Flow · GitLab Flow"
      lead="Три модели веток: схема merge/промоута и CI-конфиги под каждый подход."
      problem={problem}
      code={code}
    />
  )
}
