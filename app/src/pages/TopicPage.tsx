import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import { contentSource } from '../content'
import type { TopicDetail } from '../content'
import { MarkdownSections } from '../components/MarkdownSections'
import { CodeBlock } from '../components/CodeBlock'
import { ImmutabilityLab } from '../topics/immutability/ImmutabilityLab'
import { PerformanceLab } from '../topics/performance/PerformanceLab'
import { GitSwitchLab } from '../topics/git-switch/GitSwitchLab'
import { GitRestoreLab } from '../topics/git-restore/GitRestoreLab'
import { DeadCodeLab } from '../topics/dead-code/DeadCodeLab'
import { CookiesLab } from '../topics/cookies/CookiesLab'
import { ServiceWorkersLab } from '../topics/service-workers/ServiceWorkersLab'
import { WebApisLab } from '../topics/web-apis/WebApisLab'
import { IndexedDbLab } from '../topics/indexeddb/IndexedDbLab'
import { WebWorkersLab } from '../topics/web-workers/WebWorkersLab'
import { WorkletsLab } from '../topics/worklets/WorkletsLab'
import { MesosMarathonLab } from '../topics/mesos-marathon/MesosMarathonLab'
import { ServerClustersLab } from '../topics/server-clusters/ServerClustersLab'
import { JenkinsConfigLab } from '../topics/jenkins-config/JenkinsConfigLab'
import { LexicalEnvironmentLab } from '../topics/js-lexical-environment/LexicalEnvironmentLab'
import { ScopeChainLab } from '../topics/js-scope-chain/ScopeChainLab'
import { BindCallApplyLab } from '../topics/js-bind-call-apply/BindCallApplyLab'
import { PrototypeChainLab } from '../topics/js-prototype-chain/PrototypeChainLab'
import { ArrowPrototypeLab } from '../topics/js-arrow-prototype/ArrowPrototypeLab'
import { LiveCollectionsLab } from '../topics/js-live-collections/LiveCollectionsLab'
import { EventDelegationLab } from '../topics/js-event-delegation/EventDelegationLab'
import { EventThisLab } from '../topics/js-event-this/EventThisLab'
import { ArrowSyntaxLab } from '../topics/js-arrow-syntax/ArrowSyntaxLab'
import { FactoryFunctionsLab } from '../topics/js-factory-functions/FactoryFunctionsLab'
import { PrototypalInheritanceLab } from '../topics/js-prototypal-inheritance/PrototypalInheritanceLab'
import { NullPrototypeLab } from '../topics/js-null-prototype/NullPrototypeLab'
import { MutationObserverLab } from '../topics/js-mutation-observer/MutationObserverLab'
import { SelectionRangeLab } from '../topics/js-selection-range/SelectionRangeLab'
import { IifeLab } from '../topics/js-iife/IifeLab'
import { CurryingLab } from '../topics/js-currying/CurryingLab'
import { PrivateStaticFieldsLab } from '../topics/js-private-static-fields/PrivateStaticFieldsLab'
import { DelegationPatternLab } from '../topics/js-delegation-pattern/DelegationPatternLab'
import { V8GcLab } from '../topics/js-v8-gc/V8GcLab'
import { V8PipelineLab } from '../topics/js-v8-pipeline/V8PipelineLab'
import { ClassEngineLab } from '../topics/js-class-engine/ClassEngineLab'
import { MixinsLab } from '../topics/js-mixins/MixinsLab'
import { WebComponentsLab } from '../topics/js-web-components/WebComponentsLab'
import { V8OptimizationsLab } from '../topics/js-v8-optimizations/V8OptimizationsLab'
import { ProtoVsClosurePerfLab } from '../topics/js-proto-vs-closure-perf/ProtoVsClosurePerfLab'
import { WebComponentsCssLab } from '../topics/js-webcomponents-css/WebComponentsCssLab'
import { ReduxSagaThunkLab } from '../topics/redux-saga-thunk/ReduxSagaThunkLab'
import { ReduxFeatureFirstDucksLab } from '../topics/redux-feature-first-ducks/ReduxFeatureFirstDucksLab'
import { NormalizeImmutableLibsLab } from '../topics/normalize-immutable-libs/NormalizeImmutableLibsLab'
import { AlgorithmsBigOLab } from '../topics/algorithms-big-o/AlgorithmsBigOLab'
import { AlgorithmsSortingLab } from '../topics/algorithms-sorting/AlgorithmsSortingLab'
import { AlgorithmsDpLab } from '../topics/algorithms-dp/AlgorithmsDpLab'
import { AlgorithmsPatternsLab } from '../topics/algorithms-patterns/AlgorithmsPatternsLab'
import { AlgorithmsStackHashmapLab } from '../topics/algorithms-stack-hashmap/AlgorithmsStackHashmapLab'
import { AlgorithmsGraphsListLab } from '../topics/algorithms-graphs-list/AlgorithmsGraphsListLab'
import { AlgorithmsComplexityNotationsLab } from '../topics/algorithms-complexity-notations/AlgorithmsComplexityNotationsLab'
import { ProjectLoadersPluginsSemverLab } from '../topics/project-loaders-plugins-semver/ProjectLoadersPluginsSemverLab'
import { ProjectScriptsHmrTreeshakeLab } from '../topics/project-scripts-hmr-treeshake/ProjectScriptsHmrTreeshakeLab'
import { ProjectProdDevPluginsLab } from '../topics/project-prod-dev-plugins/ProjectProdDevPluginsLab'
import { ProjectHotColdLab } from '../topics/project-hot-cold/ProjectHotColdLab'
import { ProjectBundlersLab } from '../topics/project-bundlers/ProjectBundlersLab'
import { ProjectFederationLab } from '../topics/project-federation/ProjectFederationLab'
import { useDevToolsDocked } from '../hooks/useDevToolsDocked'
import { LAB_DOCK_ID, useLayoutStore } from '../store/layout'
import styles from './TopicPage.module.css'

function TopicLab({ topicId, topic }: { topicId: string; topic: TopicDetail }) {
  if (topicId === '01-immutability-js') return <ImmutabilityLab />
  if (topicId === '02-normalize-immutable-libs') return <NormalizeImmutableLibsLab />
  if (topicId === '129-algorithms-big-o') return <AlgorithmsBigOLab />
  if (topicId === '130-algorithms-sorting') return <AlgorithmsSortingLab />
  if (topicId === '131-algorithms-dp') return <AlgorithmsDpLab />
  if (topicId === '132-algorithms-patterns') return <AlgorithmsPatternsLab />
  if (topicId === '133-algorithms-stack-hashmap') return <AlgorithmsStackHashmapLab />
  if (topicId === '134-algorithms-graphs-list') return <AlgorithmsGraphsListLab />
  if (topicId === '135-algorithms-complexity-notations')
    return <AlgorithmsComplexityNotationsLab />
  if (topicId === '138-project-loaders-plugins-semver') return <ProjectLoadersPluginsSemverLab />
  if (topicId === '139-project-scripts-hmr-treeshake') return <ProjectScriptsHmrTreeshakeLab />
  if (topicId === '140-project-prod-dev-plugins') return <ProjectProdDevPluginsLab />
  if (topicId === '03-build-hot-cold') return <ProjectHotColdLab />
  if (topicId === '04-bundlers-gulp-rollup') return <ProjectBundlersLab />
  if (topicId === '05-module-federation-babel-postcss') return <ProjectFederationLab />
  if (topicId === '24-devtools-lighthouse') return <PerformanceLab />
  if (topicId === '31-git-switch') return <GitSwitchLab />
  if (topicId === '32-git-restore') return <GitRestoreLab />
  if (topicId === '56-dead-code-tools') return <DeadCodeLab />
  if (topicId === '57-cookies') return <CookiesLab />
  if (topicId === '65-service-workers') return <ServiceWorkersLab />
  if (topicId === '66-web-workers') return <WebWorkersLab />
  if (topicId === '67-web-apis') return <WebApisLab />
  if (topicId === '68-indexeddb') return <IndexedDbLab />
  if (topicId === '69-worklets') return <WorkletsLab />
  if (topicId === '73-mesos-marathon') return <MesosMarathonLab />
  if (topicId === '74-server-clusters') return <ServerClustersLab />
  if (topicId === '75-configure-jenkins-marathon') return <JenkinsConfigLab />
  if (topicId === '93-js-lexical-environment') return <LexicalEnvironmentLab />
  if (topicId === '94-js-scope-chain') return <ScopeChainLab />
  if (topicId === '95-js-bind-call-apply') return <BindCallApplyLab />
  if (topicId === '96-js-prototype-chain') return <PrototypeChainLab />
  if (topicId === '97-js-arrow-prototype') return <ArrowPrototypeLab />
  if (topicId === '98-js-live-collections') return <LiveCollectionsLab />
  if (topicId === '99-js-event-delegation') return <EventDelegationLab />
  if (topicId === '100-js-event-this') return <EventThisLab />
  if (topicId === '101-js-arrow-syntax') return <ArrowSyntaxLab />
  if (topicId === '102-js-factory-functions') return <FactoryFunctionsLab />
  if (topicId === '103-js-prototypal-inheritance') return <PrototypalInheritanceLab />
  if (topicId === '104-js-null-prototype') return <NullPrototypeLab />
  if (topicId === '105-js-mutation-observer') return <MutationObserverLab />
  if (topicId === '106-js-selection-range') return <SelectionRangeLab />
  if (topicId === '107-js-iife') return <IifeLab />
  if (topicId === '108-js-currying') return <CurryingLab />
  if (topicId === '109-js-private-static-fields') return <PrivateStaticFieldsLab />
  if (topicId === '110-js-delegation-pattern') return <DelegationPatternLab />
  if (topicId === '111-js-v8-gc') return <V8GcLab />
  if (topicId === '112-js-v8-pipeline') return <V8PipelineLab />
  if (topicId === '113-js-class-engine') return <ClassEngineLab />
  if (topicId === '114-js-mixins') return <MixinsLab />
  if (topicId === '115-js-web-components') return <WebComponentsLab />
  if (topicId === '116-js-v8-optimizations') return <V8OptimizationsLab />
  if (topicId === '117-js-proto-vs-closure-perf') return <ProtoVsClosurePerfLab />
  if (topicId === '118-js-webcomponents-css') return <WebComponentsCssLab />
  if (topicId === '124-redux-saga-thunk') return <ReduxSagaThunkLab />
  if (topicId === '126-redux-feature-first-ducks') return <ReduxFeatureFirstDucksLab />
  return null
}

export function TopicPage() {
  const { topicId = '' } = useParams()
  const [topic, setTopic] = useState<TopicDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dockEl, setDockEl] = useState<HTMLElement | null>(null)
  const labOpen = useLayoutStore((s) => s.labOpen)
  const setActiveHasLab = useLayoutStore((s) => s.setActiveHasLab)
  const setTheoryOpen = useLayoutStore((s) => s.setTheoryOpen)
  const setLabOpen = useLayoutStore((s) => s.setLabOpen)
  const devToolsDocked = useDevToolsDocked()

  useEffect(() => {
    setDockEl(document.getElementById(LAB_DOCK_ID))
  }, [])

  useEffect(() => {
    let cancelled = false
    setTopic(null)
    setError(null)
    setActiveHasLab(false)
    void contentSource
      .getTopic(topicId)
      .then((data) => {
        if (cancelled) return
        setTopic(data)
        setActiveHasLab(data.hasLab)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки')
          setActiveHasLab(false)
        }
      })
    return () => {
      cancelled = true
      setActiveHasLab(false)
      setLabOpen(false)
      setTheoryOpen(true)
    }
  }, [topicId, setActiveHasLab, setLabOpen, setTheoryOpen])

  /** DevTools + лаба → прячем теорию (как раньше labFocus). */
  useEffect(() => {
    if (!topic?.hasLab || !labOpen || !devToolsDocked) return
    setTheoryOpen(false)
  }, [topic?.hasLab, labOpen, devToolsDocked, setTheoryOpen])

  if (error) {
    return <div className={styles.state}>{error}</div>
  }

  if (!topic) {
    return <div className={styles.state}>Загрузка…</div>
  }

  const labPortal =
    topic.hasLab && dockEl
      ? createPortal(<TopicLab topicId={topic.id} topic={topic} />, dockEl)
      : null

  const topicNum = topic.id.match(/^(\d+)/)?.[1] ?? String(topic.order)

  return (
    <>
      {labPortal}
      <article className={styles.page}>
        <span className={styles.topicNum} title={`Тема ${topicNum}`} aria-label={`Тема ${topicNum}`}>
          {topicNum}
        </span>
        <div className={styles.reading}>
          <header className={styles.header}>
            <h1 className={styles.title}>{topic.title}</h1>
            {topic.oneLiner ? <p className={styles.oneLiner}>{topic.oneLiner}</p> : null}
          </header>

          <div className={styles.stream}>
            {topic.sections.interview ? (
              <section className={styles.segment}>
                <h2 className={styles.sectionTitle}>Суть</h2>
                <MarkdownSections markdown={topic.sections.interview} />
              </section>
            ) : null}

            {topic.sections.remember ? (
              <section className={styles.segment}>
                <h2 className={styles.sectionTitle}>Самое главное запомнить</h2>
                <MarkdownSections markdown={topic.sections.remember} />
              </section>
            ) : null}

            {topic.sections.description ? (
              <section className={styles.segment}>
                <h2 className={styles.sectionTitle}>Описание</h2>
                <MarkdownSections markdown={topic.sections.description} />
              </section>
            ) : null}

            {topic.codeBlocks.length > 0 ? (
              <section className={styles.segment}>
                <h2 className={styles.sectionTitle}>Код</h2>
                <div className={styles.codeStack}>
                  {topic.codeBlocks.map((block, idx) => (
                    <CodeBlock key={idx} code={block.code} language={block.language} />
                  ))}
                </div>
              </section>
            ) : null}

            {topic.links.length > 0 ? (
              <section className={styles.segment}>
                <h2 className={styles.sectionTitle}>Ссылки</h2>
                <ul className={styles.links}>
                  {topic.links.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} target="_blank" rel="noreferrer">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </article>
    </>
  )
}
