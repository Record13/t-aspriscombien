'use client'

import { useEffect } from 'react'

type WakeLockSentinel = {
  released: boolean
  release: () => Promise<void>
  addEventListener: (type: 'release', cb: () => void) => void
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>
  }
}

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (typeof navigator === 'undefined') return
    const nav = navigator as NavigatorWithWakeLock
    if (!nav.wakeLock) return

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      try {
        const s = await nav.wakeLock!.request('screen')
        if (cancelled) {
          s.release().catch(() => {})
          return
        }
        sentinel = s
      } catch {
        // ignore — user can dismiss permission; nothing actionable
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) {
        acquire()
      }
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (sentinel) sentinel.release().catch(() => {})
    }
  }, [active])
}
