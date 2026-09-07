import { NavLink } from 'react-router-dom'
import { Dog, History, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/nav'

const ICONS = { dogs: Dog, pantry: Package, history: History }

/** Phone navigation only. SideNav takes over from md up. */
export function BottomTabs() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card px-3 pb-5 pt-2 md:hidden">
      {NAV_ITEMS.map(({ to, label, key }) => {
        const Icon = ICONS[key]
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-h-13 flex-1 flex-col items-center gap-1 pt-1 text-[13px] font-semibold no-underline',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'h-0.75 w-5 rounded-full',
                    isActive ? 'bg-primary' : 'bg-transparent'
                  )}
                />
                <Icon className="size-5" />
                {label}
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
