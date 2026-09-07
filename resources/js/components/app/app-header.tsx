import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
  action?: ReactNode
  children?: ReactNode
}

/** Screen header. Pushed screens pass backTo, which renders as the back button. */
export function AppHeader({
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  action,
  children,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto w-full max-w-3xl px-4 pb-3 pt-2">
        {backTo && (
          <Link
            to={backTo}
            className="-ml-2 inline-flex min-h-11 items-center gap-1 pr-3 text-[15px] font-semibold text-primary no-underline"
          >
            <ChevronLeft className="size-5" />
            {backLabel}
          </Link>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
        {children}
      </div>
    </header>
  )
}

/** Fluid content column shared by every screen. */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto grid w-full max-w-3xl gap-6 px-4 py-4', className)}>{children}</div>
  )
}
