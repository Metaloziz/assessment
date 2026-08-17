import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './GitLfsLab.module.css'

const TOPIC_ID = '34-git-lfs'
const STEP = 0.65

type Pattern = 'track' | 'clone'
type TrackCase = 'lfs' | 'plain'
type CloneCase = 'pull' | 'skip'
type CaseId = TrackCase | CloneCase

type TrackPhase = 'idle' | 'track' | 'commit' | 'done'
type ClonePhase = 'idle' | 'clone' | 'fetch' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'track', label: 'track + push' },
  { id: 'clone', label: 'clone + pull' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  track: [
    { id: 'lfs', label: 'lfs track' },
    { id: 'plain', label: 'без LFS' },
  ],
  clone: [
    { id: 'pull', label: 'lfs pull' },
    { id: 'skip', label: 'без LFS' },
  ],
}

const POINTER_PREVIEW = `version https://git-lfs.github.com/spec/v1
oid sha256:4d7a2146…
size 480000000`

const PAIN: Record<Pattern, ReactNode> = {
  track: (
    <>
      Git LFS хранит бинарник на LFS-сервере, а в коммите оставляет лёгкий{' '}
      <code>pointer</code> — история и clone не тащат мегабайты каждой версии.
    </>
  ),
  clone: (
    <>
      После <code>git clone</code> в рабочей копии могут лежать только указатели;{' '}
      <code>git lfs pull</code> докачивает реальные объекты с LFS-хранилища.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  lfs: (
    <>
      <code>lfs track "*.mp4"</code> → в Git ~130&nbsp;B pointer, 480&nbsp;MB blob уезжает на LFS при push.
    </>
  ),
  plain: (
    <>
      Без <code>lfs track</code> весь <code>video.mp4</code> попадает в object store Git — clone и fetch
      раздуваются.
    </>
  ),
  pull: (
    <>
      <code>git lfs pull</code> после clone подтягивает blob в LFS-кэш — плеер видит настоящий файл, не
      текст pointer.
    </>
  ),
  skip: (
    <>
      Clone без LFS-клиента: на диске лежит pointer-текст — медиа не открывается, пока не установить LFS и
      не pull.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  track: 'install, track → .gitattributes, add/commit/push; ls-files и migrate для старых бинарников.',
  clone: 'clone/fetch с LFS; pull/checkout; что видит рабочая копия без LFS-клиента.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  track: [
    {
      id: 'lfs-track',
      label: '.gitattributes',
      note: 'track пишет filter=lfs; commit должен включать и .gitattributes, и сам файл.',
      executable: false,
      languageLabel: 'gitattributes',
      code: `# ═══════════════════════════════════════════
# LFS TRACK ← filter=lfs для паттерна
# ═══════════════════════════════════════════
*.mp4 filter=lfs diff=lfs merge=lfs -text
*.psd filter=lfs diff=lfs merge=lfs -text
*.zip filter=lfs diff=lfs merge=lfs -text

# git lfs track "*.mp4"  ← создаёт/дополняет этот файл
# git add .gitattributes video.mp4`,
    },
    {
      id: 'lfs-push',
      label: 'git-lfs-setup.sh',
      note: 'install — hooks локально; push отправляет blob на LFS remote отдельно от обычного push.',
      executable: false,
      languageLabel: 'sh',
      code: `git lfs install                    # ← hooks на машине разработчика
git lfs track "*.mp4"
git add .gitattributes promo.mp4
git commit -m "Add promo video"
git push origin main               # ← pointer в Git, blob на LFS

git lfs ls-files                   # ← tracked LFS-файлы в HEAD
git lfs migrate import --include="*.mp4"  # ← переписать историю (осторожно)`,
    },
  ],
  clone: [
    {
      id: 'lfs-clone',
      label: 'git-lfs-clone.sh',
      note: 'clone с LFS скачивает pointers сразу; pull — если checkout без blob или partial clone.',
      executable: false,
      languageLabel: 'sh',
      code: `# ═══════════════════════════════════════════
# CLONE + LFS ← pointers, затем blobs
# ═══════════════════════════════════════════
git lfs install
git clone git@github.com:org/assets.git
cd assets
git lfs pull                       # ← докачать LFS-объекты для текущей ветки

git lfs fetch --all                # ← все LFS refs (тяжело на больших repo)
git lfs checkout                   # ← подставить blobs в рабочую копию`,
    },
    {
      id: 'lfs-pointer',
      label: 'video.mp4 (pointer)',
      note: 'Без LFS pull файл на диске — текст указателя, не бинарник.',
      executable: false,
      languageLabel: 'text',
      code: `${POINTER_PREVIEW}

# git cat-file -p HEAD:video.mp4  ← то же в object store Git
# ffprobe video.mp4               ← ошибка: not a valid media file`,
    },
  ],
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
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
  motion?.(tl)
}

function PatternSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Pattern
  disabled?: boolean
  onChange: (id: Pattern) => void
}) {
  return (
    <div className={shell.row}>
      {PATTERNS.map((p) => (
        <LabButton
          key={p.id}
          variant="ghost"
          size="sm"
          active={value === p.id}
          disabled={disabled}
          onClick={() => onChange(p.id)}
        >
          {p.label}
        </LabButton>
      ))}
    </div>
  )
}

function TrackViz({
  phase,
  caseId,
  blobRef,
}: {
  phase: TrackPhase
  caseId: TrackCase
  blobRef: MutableRefObject<HTMLDivElement | null>
}) {
  const withLfs = caseId === 'lfs'
  const tracked = withLfs && (phase === 'track' || phase === 'commit' || phase === 'done')
  const committed = phase === 'commit' || phase === 'done'
  const onLfs = withLfs && committed

  const gitSize = withLfs ? (committed ? 0.4 : tracked ? 8 : 35) : committed ? 95 : 35
  const gitLabel = withLfs
    ? committed
      ? 'video.mp4 · pointer ~130 B'
      : tracked
        ? 'staging · filter=lfs'
        : 'video.mp4 · 480 MB (working tree)'
    : committed
      ? 'video.mp4 · blob 480 MB в Git'
      : phase === 'track'
        ? 'git add video.mp4'
        : 'video.mp4 · 480 MB'

  return (
    <LabVizPanel
      title="commit + push"
      meta={withLfs ? 'pointer в Git · blob на LFS' : 'бинарник целиком в object store'}
    >
      <div className={styles.split}>
        <div className={styles.column}>
          <span className={styles.columnTitle}>Git repo</span>
          <div
            className={[
              styles.store,
              committed ? styles.storeActive : phase !== 'idle' ? styles.storeActive : '',
              !withLfs && committed ? styles.storeWarn : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {committed ? (
              <div className={styles.commitChip}>
                commit <span className={styles.commitHash}>a1b2c3</span>
              </div>
            ) : null}
            <div
              ref={withLfs ? blobRef : undefined}
              className={[
                styles.object,
                phase !== 'idle' ? styles.objectActive : '',
                !withLfs && committed ? styles.objectWarn : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.objectName}>video.mp4</span>
              <div className={styles.objectMeta}>{gitLabel}</div>
              {withLfs && committed ? <pre className={styles.pointerCode}>{POINTER_PREVIEW}</pre> : null}
              <div className={styles.sizeBar}>
                <div
                  className={[
                    styles.sizeFill,
                    !withLfs && committed ? styles.sizeFillWarn : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ width: `${gitSize}%` }}
                />
              </div>
            </div>
            {withLfs && tracked && !committed ? (
              <div className={styles.object}>
                <span className={styles.objectName}>.gitattributes</span>
                <div className={styles.objectMeta}>.mp4 filter=lfs</div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={[styles.bridge, onLfs || (!withLfs && committed) ? styles.bridgeActive : '']
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.bridgeArrow}>{withLfs ? '→' : '✕'}</span>
          <span>{withLfs ? 'push' : 'LFS off'}</span>
        </div>

        <div className={styles.column}>
          <span className={styles.columnTitle}>LFS storage</span>
          <div
            className={[
              styles.store,
              onLfs ? styles.storeOk : withLfs ? '' : styles.storeGhost,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {onLfs ? (
              <div
                className={[styles.object, styles.objectActive].join(' ')}
              >
                <span className={styles.objectName}>video.mp4</span>
                <div className={[styles.objectMeta, styles.objectMetaOk].join(' ')}>blob · 480 MB</div>
                <div className={styles.sizeBar}>
                  <div className={[styles.sizeFill, styles.sizeFillOk].join(' ')} style={{ width: '88%' }} />
                </div>
              </div>
            ) : (
              <div className={[styles.object, styles.objectGhost].join(' ')}>
                <span className={styles.objectName}>—</span>
                <div className={styles.objectMeta}>
                  {withLfs ? 'blob появится после push' : 'не используется'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className={styles.caption}>
        {withLfs
          ? committed
            ? 'В истории Git — только pointer; hosting хранит тяжёлый blob отдельно.'
            : tracked
              ? 'После track add/commit отправит pointer в Git, blob — на LFS remote.'
              : 'Большой файл в рабочей копии — track задаёт filter перед add.'
          : committed
            ? 'Каждая версия mp4 остаётся в Git — clone/fetch копируют все ревизии.'
            : 'Без .gitattributes Git сохранит весь бинарник в object store.'}
      </p>
    </LabVizPanel>
  )
}

function CloneViz({
  phase,
  caseId,
  blobRef,
}: {
  phase: ClonePhase
  caseId: CloneCase
  blobRef: MutableRefObject<HTMLDivElement | null>
}) {
  const withPull = caseId === 'pull'
  const cloned = phase !== 'idle'
  const fetched = phase === 'fetch' || phase === 'done'
  const usable = withPull && fetched

  return (
    <LabVizPanel
      title="clone → рабочая копия"
      meta={withPull ? 'lfs pull подставляет blob' : 'pointer без LFS-клиента'}
    >
      <div className={styles.split}>
        <div className={styles.column}>
          <span className={styles.columnTitle}>origin + LFS</span>
          <div className={[styles.store, styles.storeOk].join(' ')}>
            <div className={styles.commitChip}>
              main <span className={styles.commitHash}>a1b2c3</span>
            </div>
            <div className={styles.object}>
              <span className={styles.objectName}>video.mp4</span>
              <div className={styles.objectMeta}>pointer в Git · blob 480 MB на LFS</div>
            </div>
          </div>
        </div>

        <div className={[styles.bridge, cloned ? styles.bridgeActive : ''].filter(Boolean).join(' ')}>
          <span className={styles.bridgeArrow}>→</span>
          <span>{cloned ? 'clone' : '…'}</span>
        </div>

        <div className={styles.column}>
          <span className={styles.columnTitle}>локально</span>
          <div
            className={[
              styles.store,
              cloned ? styles.storeActive : '',
              usable ? styles.storeOk : fetched && !withPull ? styles.storeWarn : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div
              ref={blobRef}
              className={[
                styles.object,
                cloned ? styles.objectActive : '',
                fetched && !withPull ? styles.objectWarn : '',
                usable ? styles.objectActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.objectName}>video.mp4</span>
              <div
                className={[
                  styles.objectMeta,
                  usable ? styles.objectMetaOk : fetched && !withPull ? styles.objectMetaWarn : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {!cloned
                  ? 'ещё не склонировано'
                  : usable
                    ? 'blob 480 MB · ffprobe ok'
                    : fetched
                      ? 'pointer-текст · медиа не открывается'
                      : 'pointer ~130 B · blob не скачан'}
              </div>
              {cloned && !usable ? <pre className={styles.pointerCode}>{POINTER_PREVIEW}</pre> : null}
              <div className={styles.sizeBar}>
                <div
                  className={[
                    styles.sizeFill,
                    usable ? styles.sizeFillOk : fetched && !withPull ? styles.sizeFillWarn : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ width: usable ? '88%' : cloned ? '6%' : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className={styles.caption}>
        {withPull
          ? fetched
            ? 'После lfs pull рабочая копия содержит настоящий бинарник из LFS-кэша.'
            : cloned
              ? 'Clone принёс pointer; git lfs pull докачает blob с remote.'
              : 'На remote pointer и blob разделены — локально нужен LFS-клиент.'
          : fetched
            ? 'Без git lfs install/pull файл выглядит как текст spec — плеер и diff ломаются.'
            : cloned
              ? 'Обычный clone скачивает только pointer из Git-объектов.'
              : 'Hosting отдаёт pointer через Git; blob — через LFS API.'}
      </p>
    </LabVizPanel>
  )
}

export function GitLfsLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('track')
  const [caseId, setCaseId] = useState<CaseId>('lfs')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [trackPhase, setTrackPhase] = useState<TrackPhase>('idle')
  const [clonePhase, setClonePhase] = useState<ClonePhase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const blobRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setTrackPhase('idle')
    setClonePhase('idle')
    setHint(null)
    if (blobRef.current) gsap.set(blobRef.current, { clearProps: 'transform,opacity,scale' })
  }

  const selectPattern = (next: Pattern) => {
    tlRef.current?.kill()
    setBusy(false)
    setPattern(next)
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

    if (pattern === 'track') {
      const withLfs = caseId === 'lfs'
      playTimeline(
        tlRef,
        [
          () => setTrackPhase(withLfs ? 'track' : 'track'),
          () => setTrackPhase('commit'),
          () => {
            setTrackPhase('done')
            if (withLfs) {
              log('ok', 'push → pointer a1b2c3 · blob на LFS')
              log('info', 'git lfs ls-files · video.mp4')
              setHint('в Git ~130 B, blob на LFS remote')
            } else {
              log('warn', 'commit → blob 480 MB в object store')
              log('err', 'clone/fetch тащат все версии mp4')
              setHint('без track история раздувается')
            }
          },
        ],
        (tl) => {
          if (!blobRef.current || !withLfs) return
          gsap.set(blobRef.current, { scale: 0.94, opacity: 0.55 })
          tl.to(blobRef.current, { scale: 1, opacity: 1 }, STEP)
        },
        () => setBusy(false),
      )
      return
    }

    const withPull = caseId === 'pull'
    playTimeline(
      tlRef,
      [
        () => setClonePhase('clone'),
        () => setClonePhase('fetch'),
        () => {
          setClonePhase('done')
          if (withPull) {
            log('ok', 'git lfs pull → blob 480 MB')
            log('info', 'ffprobe video.mp4 · ok')
            setHint('рабочая копия с настоящим бинарником')
          } else {
            log('warn', 'clone без LFS · pointer на диске')
            log('err', 'медиа не открывается')
            setHint('нужен git lfs install + pull')
          }
        },
      ],
      (tl) => {
        if (!blobRef.current) return
        gsap.set(blobRef.current, { scale: 0.94, opacity: 0.55 })
        tl.to(blobRef.current, { scale: 1, opacity: 1 }, STEP * 2)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('track')
    setCaseId('lfs')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={busy} onChange={selectPattern} />

      <div className={shell.row}>
        {CASES[pattern].map((c) => (
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

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      {pattern === 'track' ? (
        <TrackViz phase={trackPhase} caseId={caseId as TrackCase} blobRef={blobRef} />
      ) : (
        <CloneViz phase={clonePhase} caseId={caseId as CloneCase} blobRef={blobRef} />
      )}

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
      <PatternSwitch value={pattern} onChange={selectPattern} />
      <InteractiveCodePanel
        key={pattern}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[pattern]}
        snippets={CODE_SNIPPETS[pattern]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Git LFS"
      lead="Pointer в Git, blob на LFS: track/push и clone/pull без раздувания истории."
      problem={problem}
      code={code}
    />
  )
}
