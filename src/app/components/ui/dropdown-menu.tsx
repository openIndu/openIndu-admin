import { type ReactNode, useState } from 'react'
import { cn } from './utils'

export function DropdownMenu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block text-left">
      <button type="button" onClick={() => setOpen((value) => !value)}>{trigger}</button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function DropdownMenuItem({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className={cn('block w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent', className)} onClick={onClick}>
      {children}
    </button>
  )
}
