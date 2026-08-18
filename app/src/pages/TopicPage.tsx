import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import { contentSource } from '../content'
import type { TopicDetail } from '../content'
import { MarkdownSections } from '../components/MarkdownSections'
import { CodeBlock } from '../components/CodeBlock'
import { ImmutabilityLab } from '../topics/immutability/ImmutabilityLab'
import { GitResetTagLogDiffReflogLab } from '../topics/git-reset-tag-log-diff-reflog/GitResetTagLogDiffReflogLab'
import { GitAmendFixupLab } from '../topics/git-amend-fixup/GitAmendFixupLab'
import { GitGrepLab } from '../topics/git-grep/GitGrepLab'
import { GitBisectLab } from '../topics/git-bisect/GitBisectLab'
import { GitFlowGithubGitlabLab } from '../topics/git-flow-github-gitlab/GitFlowGithubGitlabLab'
import { GitHooksLab } from '../topics/git-hooks/GitHooksLab'
import { GitSwitchLab } from '../topics/git-switch/GitSwitchLab'
import { GitRestoreLab } from '../topics/git-restore/GitRestoreLab'
import { GitLfsLab } from '../topics/git-lfs/GitLfsLab'
import { DeadCodeLab } from '../topics/dead-code/DeadCodeLab'
import { LegacyCodeApproachesLab } from '../topics/legacy-code-approaches/LegacyCodeApproachesLab'
import { ApoLab } from '../topics/apo/ApoLab'
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
import { ArrowVsClassicLab } from '../topics/js-arrow-vs-classic/ArrowVsClassicLab'
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
import { LazyLoadingCriticalPathLab } from '../topics/lazy-loading-critical-path/LazyLoadingCriticalPathLab'
import { BundleCdnLab } from '../topics/bundle-cdn/BundleCdnLab'
import { ServerPerformanceMetricsLab } from '../topics/server-performance-metrics/ServerPerformanceMetricsLab'
import { ProjectHotColdLab } from '../topics/project-hot-cold/ProjectHotColdLab'
import { ProjectBundlersLab } from '../topics/project-bundlers/ProjectBundlersLab'
import { ProjectFederationLab } from '../topics/project-federation/ProjectFederationLab'
import { LoggingReduxDevtoolsLab } from '../topics/logging-redux-devtools/LoggingReduxDevtoolsLab'
import { LoggingChromeApplicationSourcesLab } from '../topics/logging-chrome-application-sources/LoggingChromeApplicationSourcesLab'
import { LoggingSentryPrometheusLab } from '../topics/logging-sentry-prometheus/LoggingSentryPrometheusLab'
import { LoggingServerDebugBrowserLab } from '../topics/logging-server-debug-browser/LoggingServerDebugBrowserLab'
import { LoggingNodesLab } from '../topics/logging-nodes/LoggingNodesLab'
import { XFrameOptionsLab } from '../topics/x-frame-options/XFrameOptionsLab'
import { CorsLab } from '../topics/cors/CorsLab'
import { NpmAuditLab } from '../topics/npm-audit/NpmAuditLab'
import { JwtSecurityLab } from '../topics/jwt-security/JwtSecurityLab'
import { CspLab } from '../topics/csp/CspLab'
import { XssLab } from '../topics/xss/XssLab'
import { SqlInjectionLab } from '../topics/sql-injection/SqlInjectionLab'
import { CsrfLab } from '../topics/csrf/CsrfLab'
import { ClientPerformanceMetricsLab } from '../topics/client-performance-metrics/ClientPerformanceMetricsLab'
import { IncrementalIterativeSpiralLab } from '../topics/software-incremental-iterative-spiral/IncrementalIterativeSpiralLab'
import { BdufLab } from '../topics/bduf/BdufLab'
import { SoftwareMvcMvpMvvmLab } from '../topics/software-mvc-mvp-mvvm/SoftwareMvcMvpMvvmLab'
import { SoftwareSolidLab } from '../topics/software-solid/SoftwareSolidLab'
import { PatternsFactoryProxyAdapterLab } from '../topics/patterns-factory-prototype-proxy-singleton-adapter/PatternsFactoryProxyAdapterLab'
import { PatternsChainStrategyDecoratorLab } from '../topics/patterns-chain-abstract-factory-strategy-decorator/PatternsChainStrategyDecoratorLab'
import { PatternsMediatorCompositeMementoLab } from '../topics/patterns-mediator-composite-memento/PatternsMediatorCompositeMementoLab'
import { PatternsDependencyInjectionLab } from '../topics/patterns-dependency-injection/PatternsDependencyInjectionLab'
import { PatternsTemplateFlyweightBridgeLab } from '../topics/patterns-template-flyweight-bridge/PatternsTemplateFlyweightBridgeLab'
import { LayoutBrowserslistLab } from '../topics/layout-browserslist/LayoutBrowserslistLab'
import { LayoutToolsByBrowsersLab } from '../topics/layout-tools-by-browsers/LayoutToolsByBrowsersLab'
import { LayoutStackingContextLab } from '../topics/layout-stacking-context/LayoutStackingContextLab'
import { LayoutCssModulesCssInJsLab } from '../topics/layout-css-modules-css-in-js/LayoutCssModulesCssInJsLab'
import { LayoutDesignSystemLab } from '../topics/layout-design-system/LayoutDesignSystemLab'
import { LayoutA11yLab } from '../topics/layout-a11y/LayoutA11yLab'
import { LayoutMicrodataLab } from '../topics/layout-microdata/LayoutMicrodataLab'
import { ReactVirtualDomLab } from '../topics/react-virtual-dom/ReactVirtualDomLab'
import { ReactOptimizationLab } from '../topics/react-optimization/ReactOptimizationLab'
import { ReactErrorBoundariesLab } from '../topics/react-error-boundaries/ReactErrorBoundariesLab'
import { ReactFragmentsLab } from '../topics/react-fragments/ReactFragmentsLab'
import { ReactPortalsLab } from '../topics/react-portals/ReactPortalsLab'
import { ReactRouterLab } from '../topics/react-router/ReactRouterLab'
import { ReactContextLab } from '../topics/react-context/ReactContextLab'
import { ReactFormManagersLab } from '../topics/react-form-managers/ReactFormManagersLab'
import { ReactSsrLab } from '../topics/react-ssr/ReactSsrLab'
import { ReactServerComponentsLab } from '../topics/react-server-components/ReactServerComponentsLab'
import { ReactCompoundComponentsLab } from '../topics/react-compound-components/ReactCompoundComponentsLab'
import { ReactRenderPropsLab } from '../topics/react-render-props/ReactRenderPropsLab'
import { ReactReconciliationLab } from '../topics/react-reconciliation/ReactReconciliationLab'
import { ReactFiberLab } from '../topics/react-fiber/ReactFiberLab'
import { ReactWebComponentsLab } from '../topics/react-web-components/ReactWebComponentsLab'
import { LayoutGridLab } from '../topics/layout-grid/LayoutGridLab'
import { LayoutFlexboxLab } from '../topics/layout-flexbox/LayoutFlexboxLab'
import { LayoutAnimationLab } from '../topics/layout-animation/LayoutAnimationLab'
import { LayoutScssPostcssLab } from '../topics/layout-scss-postcss/LayoutScssPostcssLab'
import { LayoutPostcssLab } from '../topics/layout-postcss/LayoutPostcssLab'
import { LayoutTypographyLab } from '../topics/layout-typography/LayoutTypographyLab'
import { LayoutVectorRasterLab } from '../topics/layout-vector-raster/LayoutVectorRasterLab'
import { AsyncEventLoopLab } from '../topics/async-event-loop/AsyncEventLoopLab'
import { AsyncTasksMicrotasksLab } from '../topics/async-tasks-microtasks/AsyncTasksMicrotasksLab'
import { AsyncCallbackPromisesLab } from '../topics/async-callback-promises/AsyncCallbackPromisesLab'
import { AsyncCallbackHellLab } from '../topics/async-callback-hell/AsyncCallbackHellLab'
import { AsyncAwaitLab } from '../topics/async-await/AsyncAwaitLab'
import { AsyncPromiseAfterCatchLab } from '../topics/async-promise-after-catch/AsyncPromiseAfterCatchLab'
import { AsyncGeneratorsLab } from '../topics/async-generators/AsyncGeneratorsLab'
import { AsyncInfiniteGeneratorsLab } from '../topics/async-infinite-generators/AsyncInfiniteGeneratorsLab'
import { TsBasicTypesLab } from '../topics/ts-basic-types/TsBasicTypesLab'
import { TsInterfaceTypesLab } from '../topics/ts-interface-types/TsInterfaceTypesLab'
import { TsTypeTransformsLab } from '../topics/ts-type-transforms/TsTypeTransformsLab'
import { TsTypeGuardsLab } from '../topics/ts-type-guards/TsTypeGuardsLab'
import { TsDeclarationFilesLab } from '../topics/ts-declaration-files/TsDeclarationFilesLab'
import { TsGenericsLab } from '../topics/ts-generics/TsGenericsLab'
import { TsOptionalNullishLab } from '../topics/ts-optional-nullish/TsOptionalNullishLab'
import { TsKeyofTypeofLab } from '../topics/ts-keyof-typeof/TsKeyofTypeofLab'
import { TsConditionalMappedInferLab } from '../topics/ts-conditional-mapped-infer/TsConditionalMappedInferLab'
import { TsTemplateLiteralTypesLab } from '../topics/ts-template-literal-types/TsTemplateLiteralTypesLab'
import { TsFunctionOverloadsLab } from '../topics/ts-function-overloads/TsFunctionOverloadsLab'
import { TsReferenceTypesLab } from '../topics/ts-reference-types/TsReferenceTypesLab'
import { TsTscLab } from '../topics/ts-tsc/TsTscLab'
import { TsDecoratorsLab } from '../topics/ts-decorators/TsDecoratorsLab'
import { TsMixinsLab } from '../topics/ts-mixins/TsMixinsLab'
import { NodejsModulesGlobalsLab } from '../topics/nodejs-modules-globals/NodejsModulesGlobalsLab'
import { NodejsRoutingStaticLab } from '../topics/nodejs-routing-static/NodejsRoutingStaticLab'
import { NodejsDbAsyncConfigLab } from '../topics/nodejs-db-async-config/NodejsDbAsyncConfigLab'
import { NodejsCacheCrudLab } from '../topics/nodejs-cache-crud/NodejsCacheCrudLab'
import { NodejsWorkerThreadsLab } from '../topics/nodejs-worker-threads/NodejsWorkerThreadsLab'
import { NetworkApiFirstLab } from '../topics/network-api-first/NetworkApiFirstLab'
import { NetworkHttpHttpsLab } from '../topics/network-http-https/NetworkHttpHttpsLab'
import { NetworkTcpipInternetAppLab } from '../topics/network-tcpip-internet-app/NetworkTcpipInternetAppLab'
import { NetworkTcpipTransportLinkLab } from '../topics/network-tcpip-transport-link/NetworkTcpipTransportLinkLab'
import { NetworkIpBasicsLab } from '../topics/network-ip-basics/NetworkIpBasicsLab'
import { NetworkTcpLab } from '../topics/network-tcp/NetworkTcpLab'
import { NetworkDnsBasicsLab } from '../topics/network-dns-basics/NetworkDnsBasicsLab'
import { NetworkLongPollingWsSseLab } from '../topics/network-long-polling-ws-sse/NetworkLongPollingWsSseLab'
import { LAB_DOCK_ID, useLayoutStore } from '../store/layout'
import styles from './TopicPage.module.css'

function TopicLab({ topicId }: { topicId: string; topic: TopicDetail }) {
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
  if (topicId === '26-lazy-loading-critical-path') return <LazyLoadingCriticalPathLab />
  if (topicId === '15-bundle-cdn') return <BundleCdnLab />
  if (topicId === '27-server-performance-metrics') return <ServerPerformanceMetricsLab />
  if (topicId === '03-build-hot-cold') return <ProjectHotColdLab />
  if (topicId === '04-bundlers-gulp-rollup') return <ProjectBundlersLab />
  if (topicId === '05-module-federation-babel-postcss') return <ProjectFederationLab />
  if (topicId === '144-logging-redux-devtools') return <LoggingReduxDevtoolsLab />
  if (topicId === '145-logging-chrome-application-sources')
    return <LoggingChromeApplicationSourcesLab />
  if (topicId === '146-logging-sentry-prometheus') return <LoggingSentryPrometheusLab />
  if (topicId === '147-logging-server-debug-browser') return <LoggingServerDebugBrowserLab />
  if (topicId === '06-logging-nodes') return <LoggingNodesLab />
  if (topicId === '151-x-frame-options') return <XFrameOptionsLab />
  if (topicId === '07-cors') return <CorsLab />
  if (topicId === '08-npm-audit') return <NpmAuditLab />
  if (topicId === '09-jwt-security') return <JwtSecurityLab />
  if (topicId === '10-csp') return <CspLab />
  if (topicId === '11-xss') return <XssLab />
  if (topicId === '12-sql-injection') return <SqlInjectionLab />
  if (topicId === '13-csrf') return <CsrfLab />
  if (topicId === '14-client-performance-metrics') return <ClientPerformanceMetricsLab />
  if (topicId === '159-patterns-factory-prototype-proxy-singleton-adapter')
    return <PatternsFactoryProxyAdapterLab />
  if (topicId === '160-patterns-chain-abstract-factory-strategy-decorator')
    return <PatternsChainStrategyDecoratorLab />
  if (topicId === '161-patterns-mediator-composite-memento')
    return <PatternsMediatorCompositeMementoLab />
  if (topicId === '162-patterns-dependency-injection')
    return <PatternsDependencyInjectionLab />
  if (topicId === '163-patterns-template-flyweight-bridge')
    return <PatternsTemplateFlyweightBridgeLab />
  if (topicId === '164-layout-vector-raster') return <LayoutVectorRasterLab />
  if (topicId === '165-layout-typography') return <LayoutTypographyLab />
  if (topicId === '168-layout-scss-postcss') return <LayoutScssPostcssLab />
  if (topicId === '264-layout-postcss') return <LayoutPostcssLab />
  if (topicId === '169-layout-flexbox') return <LayoutFlexboxLab />
  if (topicId === '170-layout-animation') return <LayoutAnimationLab />
  if (topicId === '172-layout-css-modules-css-in-js') return <LayoutCssModulesCssInJsLab />
  if (topicId === '173-layout-grid') return <LayoutGridLab />
  if (topicId === '171-layout-stacking-context') return <LayoutStackingContextLab />
  if (topicId === '174-layout-browserslist') return <LayoutBrowserslistLab />
  if (topicId === '175-layout-tools-by-browsers') return <LayoutToolsByBrowsersLab />
  if (topicId === '176-layout-design-system') return <LayoutDesignSystemLab />
  if (topicId === '177-layout-a11y') return <LayoutA11yLab />
  if (topicId === '178-layout-microdata') return <LayoutMicrodataLab />
  if (topicId === '185-react-virtual-dom') return <ReactVirtualDomLab />
  if (topicId === '186-react-optimization') return <ReactOptimizationLab />
  if (topicId === '187-react-fragments') return <ReactFragmentsLab />
  if (topicId === '188-react-error-boundaries') return <ReactErrorBoundariesLab />
  if (topicId === '189-react-portals') return <ReactPortalsLab />
  if (topicId === '190-react-router') return <ReactRouterLab />
  if (topicId === '191-react-context') return <ReactContextLab />
  if (topicId === '194-react-form-managers') return <ReactFormManagersLab />
  if (topicId === '192-react-ssr') return <ReactSsrLab />
  if (topicId === '199-react-server-components') return <ReactServerComponentsLab />
  if (topicId === '193-react-compound-components') return <ReactCompoundComponentsLab />
  if (topicId === '195-react-render-props') return <ReactRenderPropsLab />
  if (topicId === '196-react-reconciliation') return <ReactReconciliationLab />
  if (topicId === '197-react-fiber') return <ReactFiberLab />
  if (topicId === '198-react-web-components') return <ReactWebComponentsLab />
  if (topicId === '215-async-event-loop') return <AsyncEventLoopLab />
  if (topicId === '216-async-tasks-microtasks') return <AsyncTasksMicrotasksLab />
  if (topicId === '217-async-callback-promises') return <AsyncCallbackPromisesLab />
  if (topicId === '218-async-callback-hell') return <AsyncCallbackHellLab />
  if (topicId === '219-async-await') return <AsyncAwaitLab />
  if (topicId === '220-async-promise-after-catch') return <AsyncPromiseAfterCatchLab />
  if (topicId === '221-async-generators') return <AsyncGeneratorsLab />
  if (topicId === '222-async-infinite-generators') return <AsyncInfiniteGeneratorsLab />
  if (topicId === '225-ts-basic-types') return <TsBasicTypesLab />
  if (topicId === '226-ts-interface-types') return <TsInterfaceTypesLab />
  if (topicId === '227-ts-declaration-files') return <TsDeclarationFilesLab />
  if (topicId === '228-ts-type-guards') return <TsTypeGuardsLab />
  if (topicId === '229-ts-type-transforms') return <TsTypeTransformsLab />
  if (topicId === '230-ts-generics') return <TsGenericsLab />
  if (topicId === '231-ts-keyof-typeof') return <TsKeyofTypeofLab />
  if (topicId === '232-ts-optional-nullish') return <TsOptionalNullishLab />
  if (topicId === '233-ts-conditional-mapped-infer') return <TsConditionalMappedInferLab />
  if (topicId === '234-ts-template-literal-types') return <TsTemplateLiteralTypesLab />
  if (topicId === '235-ts-function-overloads') return <TsFunctionOverloadsLab />
  if (topicId === '236-ts-reference-types') return <TsReferenceTypesLab />
  if (topicId === '237-ts-tsc') return <TsTscLab />
  if (topicId === '238-ts-decorators') return <TsDecoratorsLab />
  if (topicId === '239-ts-mixins') return <TsMixinsLab />
  if (topicId === '242-nodejs-modules-globals') return <NodejsModulesGlobalsLab />
  if (topicId === '243-nodejs-routing-static') return <NodejsRoutingStaticLab />
  if (topicId === '244-nodejs-db-async-config') return <NodejsDbAsyncConfigLab />
  if (topicId === '245-nodejs-cache-crud') return <NodejsCacheCrudLab />
  if (topicId === '246-nodejs-worker-threads') return <NodejsWorkerThreadsLab />
  if (topicId === '250-network-http-https') return <NetworkHttpHttpsLab />
  if (topicId === '251-network-api-first') return <NetworkApiFirstLab />
  if (topicId === '252-network-long-polling-ws-sse') return <NetworkLongPollingWsSseLab />
  if (topicId === '253-network-tcpip-internet-app') return <NetworkTcpipInternetAppLab />
  if (topicId === '254-network-tcpip-transport-link') return <NetworkTcpipTransportLinkLab />
  if (topicId === '261-network-ip-basics') return <NetworkIpBasicsLab />
  if (topicId === '262-network-tcp') return <NetworkTcpLab />
  if (topicId === '263-network-dns-basics') return <NetworkDnsBasicsLab />
  if (topicId === '256-software-solid') return <SoftwareSolidLab />
  if (topicId === '257-software-mvc-mvp-mvvm') return <SoftwareMvcMvpMvvmLab />
  if (topicId === '259-software-incremental-iterative-spiral')
    return <IncrementalIterativeSpiralLab />
  if (topicId === '53-bduf') return <BdufLab />
  if (topicId === '16-git-amend-fixup-revert-cherry-pick-stash') return <GitAmendFixupLab />
  if (topicId === '17-git-reset-tag-log-diff-reflog') return <GitResetTagLogDiffReflogLab />
  if (topicId === '33-git-grep') return <GitGrepLab />
  if (topicId === '20-git-bisect') return <GitBisectLab />
  if (topicId === '18-git-flow-github-gitlab') return <GitFlowGithubGitlabLab />
  if (topicId === '19-git-hooks') return <GitHooksLab />
  if (topicId === '31-git-switch') return <GitSwitchLab />
  if (topicId === '32-git-restore') return <GitRestoreLab />
  if (topicId === '34-git-lfs') return <GitLfsLab />
  if (topicId === '52-apo') return <ApoLab />
  if (topicId === '55-legacy-code-approaches') return <LegacyCodeApproachesLab />
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
  if (topicId === '265-js-arrow-vs-classic') return <ArrowVsClassicLab />
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
  const setActiveHasLab = useLayoutStore((s) => s.setActiveHasLab)
  const setLabOpen = useLayoutStore((s) => s.setLabOpen)

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
        if (!data.hasLab) {
          setLabOpen(false)
        }
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
    }
  }, [topicId, setActiveHasLab, setLabOpen])

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
