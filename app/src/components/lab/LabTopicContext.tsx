import { createContext, useContext, type ReactNode } from 'react'

type LabTopicContextValue = {
  hasApi: boolean
}

const LabTopicContext = createContext<LabTopicContextValue>({ hasApi: false })

export function LabTopicProvider({
  hasApi,
  children,
}: {
  hasApi: boolean
  children: ReactNode
}) {
  return <LabTopicContext.Provider value={{ hasApi }}>{children}</LabTopicContext.Provider>
}

export function useLabTopic() {
  return useContext(LabTopicContext)
}
