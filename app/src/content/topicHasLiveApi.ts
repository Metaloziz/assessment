/** Темы с лабой против живого `assessment-api` (не симуляция). */
const LIVE_API_TOPIC_IDS = new Set([
  '07-cors',
  '13-csrf',
  '57-cookies',
  '244-nodejs-db-async-config',
  '245-nodejs-cache-crud',
  '27-server-performance-metrics',
  '242-nodejs-modules-globals',
  '246-nodejs-worker-threads',
  '267-devtools-websocket-debug',
  '251-network-api-first',
  '250-network-http-https',
  '252-network-long-polling-ws-sse',
  '192-react-ssr',
  '272-fetch-advanced-xhr',
])

export function topicHasLiveApi(topicId: string): boolean {
  return LIVE_API_TOPIC_IDS.has(topicId)
}
