import { NavLink } from 'react-router-dom'
import { Dog, History, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/nav'

const ICONS = { dogs: Dog, pantry: Package, history: History }

/** Tablet + desktop navigation. Hidden on phones, where BottomTabs takes over. */
export function SideNav() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 border-r bg-card px-3 py-5 md:flex lg:w-64">
      <div className="px-2 pb-4">
        <p className="text-lg font-bold tracking-tight">PupperTrak</p>
        <p className="font-mono text-xs text-muted-foreground">dog sitting log</p>
      </div>
      {NAV_ITEMS.map(({ to, label, key }) => {
        const Icon = ICONS[key]
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-semibold no-underline',
                isActive
                  ? 'bg-secondary text-primary'
                  : 'text-muted-foreground hover:bg-secondary/60'
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        )
      })}
    </aside>
  )
}
