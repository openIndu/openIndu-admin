import { type ReactNode, useState, useEffect, useRef, useCallback } from 'react'
import { cn } from './utils'

export function DropdownMenu({ trigger, children, align = 'right' }: {
  trigger: ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, close])

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)}>{trigger}</button>
      {open ? (
        <div className={`absolute z-20 mt-2 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md ${align === 'left' ? 'left-0' : 'right-0'}`}>
          {typeof children === 'function' ? children(close) : children}
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
