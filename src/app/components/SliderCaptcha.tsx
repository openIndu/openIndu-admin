import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronsRight, Loader2, RefreshCw, X } from 'lucide-react'
import { authApi, type SliderChallenge } from '@/api'

// Mirrors the backend renderer geometry (app/services/auth_service.py):
// SLIDER_WIDTH for the background, SLIDER_PIECE + SLIDER_KNOB for the sprite box.
const PUZZLE_W = 320
const PUZZLE_H = 160
const PIECE_BOX = 54

interface SliderCaptchaProps {
  open: boolean
  onClose: () => void
  /** Called once with the one-time ticket after the puzzle is passed. */
  onPass: (ticket: string) => void
}

type Status = 'loading' | 'ready' | 'verifying' | 'success' | 'fail'

/**
 * On-demand slider-puzzle dialog: pops up when the user taps the send-code
 * button, and only a passed puzzle (one-time ticket) lets the SMS go out.
 * A wrong drop consumes the challenge and reloads a fresh one.
 */
export function SliderCaptcha({ open, onClose, onPass }: SliderCaptchaProps) {
  const [challenge, setChallenge] = useState<SliderChallenge | null>(null)
  const [dragX, setDragX] = useState(0)
  const [status, setStatus] = useState<Status>('loading')
  const dragRef = useRef<{ startX: number; baseX: number } | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setChallenge(null)
    setDragX(0)
    try {
      setChallenge(await authApi.getSliderCaptcha())
      setStatus('ready')
    } catch {
      setStatus('fail')
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const verify = useCallback(
    async (x: number) => {
      if (!challenge) return
      setStatus('verifying')
      try {
        const { ticket } = await authApi.verifySlider(challenge.challenge_id, x)
        setStatus('success')
        window.setTimeout(() => onPass(ticket), 350)
      } catch {
        setStatus('fail')
        window.setTimeout(() => void load(), 900)
      }
    },
    [challenge, load, onPass],
  )

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (status !== 'ready') return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, baseX: dragX }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || status !== 'ready') return
    const max = PUZZLE_W - PIECE_BOX
    const next = Math.min(max, Math.max(0, dragRef.current.baseX + (event.clientX - dragRef.current.startX)))
    setDragX(next)
  }

  function onPointerUp() {
    if (!dragRef.current || status !== 'ready') return
    dragRef.current = null
    // A tiny nudge is treated as an accident and does not burn the challenge.
    if (dragX >= 4) void verify(dragX)
  }

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const hint =
    status === 'success' ? '验证通过' : status === 'fail' ? '未对齐，已换新图，请重试' : '按住滑块，拖动拼图完成验证'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="安全验证"
    >
      <div
        className="w-[352px] max-w-full rounded-lg bg-white p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-800">安全验证</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void load()}
              aria-label="换一张"
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-md border border-gray-200 bg-gray-100" style={{ width: PUZZLE_W, height: PUZZLE_H, maxWidth: '100%' }}>
          {challenge ? (
            <>
              <img
                src={challenge.background}
                alt=""
                draggable={false}
                className="select-none"
                style={{ width: PUZZLE_W, height: PUZZLE_H }}
              />
              <img
                src={challenge.piece}
                alt=""
                draggable={false}
                className="absolute select-none"
                style={{ top: challenge.piece_y, left: dragX, width: PIECE_BOX, height: PIECE_BOX }}
              />
              {status === 'verifying' && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                  <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              {status === 'fail' ? '加载失败，请点击刷新' : '加载中...'}
            </div>
          )}
        </div>
        <div className="relative mt-3 select-none rounded-md bg-gray-100" style={{ width: PUZZLE_W, height: 40, maxWidth: '100%' }}>
          <div
            className={`absolute inset-y-0 left-0 rounded-md ${status === 'success' ? 'bg-emerald-100' : status === 'fail' ? 'bg-red-100' : 'bg-sky-100'}`}
            style={{ width: dragX + PIECE_BOX }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs">
            <span className={status === 'success' ? 'text-emerald-700' : status === 'fail' ? 'text-red-600' : 'text-gray-500'}>{hint}</span>
          </div>
          <div
            role="slider"
            aria-valuemin={0}
            aria-valuemax={PUZZLE_W - PIECE_BOX}
            aria-valuenow={Math.round(dragX)}
            aria-label="安全验证"
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`absolute inset-y-0 flex cursor-grab items-center justify-center rounded-md border shadow-sm active:cursor-grabbing ${
              status === 'success'
                ? 'border-emerald-300 bg-emerald-500 text-white'
                : status === 'fail'
                  ? 'border-red-300 bg-red-500 text-white'
                  : 'border-gray-200 bg-white text-gray-500'
            }`}
            style={{ left: dragX, width: PIECE_BOX }}
          >
            {status === 'success' ? <Check className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
          </div>
        </div>
      </div>
    </div>
  )
}
