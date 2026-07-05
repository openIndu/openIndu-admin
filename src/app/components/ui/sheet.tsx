import { useEffect, type ReactNode } from 'react'
import { cn } from './utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  overlay?: boolean
  autoClose?: number
  children: ReactNode
}

interface SheetContentProps {
  side?: 'top' | 'right' | 'bottom' | 'left'
  bare?: boolean
  className?: string
  children: ReactNode
}

export function Sheet({ open, onOpenChange, overlay = false, autoClose, children }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', handleKeyDown)

    // Auto-close timer
    let timer: ReturnType<typeof setTimeout> | undefined
    if (autoClose) {
      timer = setTimeout(() => onOpenChange(false), autoClose)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (timer) clearTimeout(timer)
    }
  }, [open, onOpenChange, autoClose])

  if (!open) return null

  return (
    <div className={cn('fixed inset-0 z-50', !overlay && 'pointer-events-none')}>
      {/* Overlay — only rendered when overlay=true */}
      {overlay && (
        <div
          className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
          onClick={() => onOpenChange(false)}
        />
      )}
      {children}
    </div>
  )
}

export function SheetContent({ side = 'top', bare = false, className, children }: SheetContentProps) {
  const sideClasses: Record<string, string> = {
    top: cn(
      'top-0 left-0 right-0',
      bare ? '' : 'max-h-[50vh] border-b animate-in slide-in-from-top duration-300',
    ),
    bottom: cn(
      'bottom-0 left-0 right-0 max-h-[50vh]',
      'border-t',
      'animate-in slide-in-from-bottom duration-300',
    ),
    left: cn(
      'left-0 top-0 bottom-0 w-[400px] max-w-[90vw]',
      'border-r',
      'animate-in slide-in-from-left duration-300',
    ),
    right: cn(
      'right-0 top-0 bottom-0 w-[400px] max-w-[90vw]',
      'border-l',
      'animate-in slide-in-from-right duration-300',
    ),
  }

  return (
    <div
      className={cn(
        'fixed',
        bare ? '' : 'bg-background border-border shadow-xl',
        'pointer-events-auto',
        'flex flex-col',
        sideClasses[side],
        className,
      )}
      onClick={bare ? undefined : (e) => e.stopPropagation()}
    >
      <div className={bare ? 'px-4 py-3' : 'overflow-y-auto p-6'}>
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}>
      {children}
    </div>
  )
}

export function SheetTitle({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <h3 className={cn('text-lg font-semibold text-foreground', className)}>
      {children}
    </h3>
  )
}

export function SheetDescription({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  )
}
