import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
  type: 'error' | 'success' | 'info'
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const event = e as CustomEvent<{ message: string; type?: ToastItem['type'] }>
      const toast: ToastItem = {
        id: Date.now(),
        message: event.detail.message,
        type: event.detail.type ?? 'info',
      }
      setToasts((prev) => [...prev, toast])
      setTimeout(() => removeToast(toast.id), 4000)
    }
    window.addEventListener('show-toast', handler)
    return () => window.removeEventListener('show-toast', handler)
  }, [removeToast])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            t.type === 'error'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : t.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-border bg-background text-foreground'
          }`}
          style={{ animation: 'toastSlideIn 0.25s ease' }}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="ml-1 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
