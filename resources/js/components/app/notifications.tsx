import { useCallback, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { NotificationContext } from './notification-context'
import type { NotificationKind } from './notification-context'

interface Toast {
  id: number
  message: string
  kind: NotificationKind
}

const DISMISS_AFTER_MS = 4000

const KIND_STYLES: Record<NotificationKind, string> = {
  error: 'border-destructive/40 bg-destructive text-destructive-foreground',
  success: 'border-success-border bg-success-surface text-success',
  info: 'border-border bg-card text-foreground',
}

let nextId = 0

/** Fixed toast stack for mutation feedback; each entry auto-dismisses. */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, kind: NotificationKind = 'error') => {
      const id = nextId++
      setToasts(current => [...current, { id, message, kind }])
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS)
    },
    [dismiss]
  )

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-4">
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'w-full max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-lg',
              KIND_STYLES[toast.kind]
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}
