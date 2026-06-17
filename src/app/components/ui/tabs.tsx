import { type ReactNode, useState } from 'react'
import { cn } from './utils'

export interface TabItem {
  value: string
  label: string
  content: ReactNode
}

export function Tabs({ items, defaultValue }: { items: TabItem[]; defaultValue?: string }) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value)
  const current = items.find((item) => item.value === active)

  return (
    <div>
      <div className="mb-4 flex gap-2 border-b">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            className={cn('border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground', active === item.value && 'border-primary text-primary')}
            onClick={() => setActive(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  )
}
