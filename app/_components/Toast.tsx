'use client'

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

type ToastTone = 'info' | 'ok' | 'warn' | 'error'

type Toast = {
  id: number
  message: string
  tone: ToastTone
  durationMs: number
}

type ToastAPI = {
  show: (message: string, opts?: { tone?: ToastTone; durationMs?: number }) => void
  info: (message: string, opts?: { durationMs?: number }) => void
  ok: (message: string, opts?: { durationMs?: number }) => void
  warn: (message: string, opts?: { durationMs?: number }) => void
  error: (message: string, opts?: { durationMs?: number }) => void
}

const ToastContext = createContext<ToastAPI | null>(null)

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>')
  }
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id))
    const handle = timers.current.get(id)
    if (handle) {
      clearTimeout(handle)
      timers.current.delete(id)
    }
  }, [])

  const show = useCallback<ToastAPI['show']>((message, opts = {}) => {
    const id = nextId.current++
    const toast: Toast = {
      id,
      message,
      tone: opts.tone ?? 'info',
      durationMs: opts.durationMs ?? 3500,
    }
    setToasts((all) => [...all, toast])
    const handle = setTimeout(() => dismiss(id), toast.durationMs)
    timers.current.set(id, handle)
  }, [dismiss])

  useEffect(() => {
    const ref = timers.current
    return () => {
      ref.forEach((h) => clearTimeout(h))
      ref.clear()
    }
  }, [])

  const api = useMemo<ToastAPI>(
    () => ({
      show,
      info: (m, o) => show(m, { ...o, tone: 'info' }),
      ok: (m, o) => show(m, { ...o, tone: 'ok' }),
      warn: (m, o) => show(m, { ...o, tone: 'warn' }),
      error: (m, o) => show(m, { ...o, tone: 'error' }),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: number) => void
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const tones: Record<ToastTone, { bg: string; fg: string; ring: string }> = {
    info: {
      bg: 'var(--surface)',
      fg: 'var(--ink)',
      ring: 'var(--line)',
    },
    ok: {
      bg: 'color-mix(in oklch, var(--ok) 22%, var(--surface))',
      fg: 'var(--ok)',
      ring: 'color-mix(in oklch, var(--ok) 40%, var(--line))',
    },
    warn: {
      bg: 'color-mix(in oklch, var(--warn) 20%, var(--surface))',
      fg: 'var(--warn)',
      ring: 'color-mix(in oklch, var(--warn) 38%, var(--line))',
    },
    error: {
      bg: 'color-mix(in oklch, var(--danger) 20%, var(--surface))',
      fg: 'var(--danger)',
      ring: 'color-mix(in oklch, var(--danger) 38%, var(--line))',
    },
  }
  const s = tones[toast.tone]
  return (
    <div
      role="status"
      style={{
        pointerEvents: 'auto',
        background: s.bg,
        color: s.fg,
        boxShadow: `0 0 0 1px ${s.ring} inset, 0 10px 30px -10px rgba(0,0,0,0.6)`,
        borderRadius: 14,
        padding: '10px 14px',
        maxWidth: 440,
        width: '100%',
        fontSize: 13.5,
        fontWeight: 500,
        lineHeight: 1.35,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        animation: 'fadeUp 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onDismiss}
        aria-label="masquer la notification"
        style={{
          appearance: 'none',
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          opacity: 0.65,
          cursor: 'pointer',
          padding: 4,
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}
