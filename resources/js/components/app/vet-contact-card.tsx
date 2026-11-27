import { Phone } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface VetContactCardProps {
  label: string
  name: string | null
  phone: string | null
  address: string | null
}

export function VetContactCard({ label, name, phone, address }: VetContactCardProps) {
  const tel = phone ? 'tel:' + phone.replace(/[^\d+]/g, '') : null

  return (
    <Card className="p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-semibold">{name || '—'}</p>
      {phone && tel && (
        <a
          href={tel}
          className="mt-1 inline-flex h-9 items-center gap-2 font-mono text-base no-underline"
        >
          <Phone className="size-4" />
          {phone}
        </a>
      )}
      {address && <p className="text-sm text-muted-foreground">{address}</p>}
    </Card>
  )
}
