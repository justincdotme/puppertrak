import { useContext } from 'react'
import { NotificationContext } from './notification-context'

export function useNotification() {
  return useContext(NotificationContext)
}
