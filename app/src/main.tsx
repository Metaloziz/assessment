import './sentry.client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist/wght.css'
import './styles/tokens.css'
import App from './App.tsx'
import { Sentry } from './sentry.client'
import { SentryFallback } from './SentryFallback.tsx'

createRoot(document.getElementById('root')!).render(
  <Sentry.ErrorBoundary
    fallback={({ resetError }) => <SentryFallback onRetry={resetError} />}
  >
    <StrictMode>
      <App />
    </StrictMode>
  </Sentry.ErrorBoundary>,
)
