import { createContext } from 'react'

export type NotificationKind = 'error' | 'success' | 'info'

export interface NotificationContextValue {
  notify: (message: string, kind?: NotificationKind) => void
}

export const NotificationContext = createContext<NotificationContextValue>({
  notify: () => {},
})
