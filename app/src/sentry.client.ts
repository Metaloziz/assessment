import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN
const release = import.meta.env.VITE_APP_RELEASE

if (import.meta.env.PROD && dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: release || undefined,
    tracesSampleRate: 0,
    beforeSend(event) {
      const headers = event.request?.headers
      if (headers) {
        delete headers.Authorization
        delete headers.authorization
        delete headers.Cookie
        delete headers.cookie
      }
      return event
    },
  })
}

export { Sentry }
