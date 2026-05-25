'use client'

import { Dispatch, SetStateAction, useEffect, useCallback } from 'react'
import type { SessionState } from './types'
import { playRestEndAlert } from './restAlert'

export function useRestTimer(
  session: SessionState,
  setSession: Dispatch<SetStateAction<SessionState>>,
) {
  const status = session.timer.status

  useEffect(() => {
    if (status !== 'running' && status !== 'finished') return
    const id = setInterval(() => {
      setSession((s) => {
        const t = s.timer
        if (t.remainingSec > 1) {
          return {
            ...s,
            timer: { ...t, remainingSec: t.remainingSec - 1, status: 'running' },
          }
        }
        if (t.remainingSec === 1) {
          return {
            ...s,
            timer: {
              ...t,
              remainingSec: 0,
              status: 'finished',
              overtimeSec: 0,
              justFinished: true,
            },
          }
        }
        return {
          ...s,
          timer: {
            ...t,
            remainingSec: 0,
            status: 'finished',
            overtimeSec: (t.overtimeSec || 0) + 1,
            justFinished: false,
          },
        }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [status, setSession])

  useEffect(() => {
    if (!session.timer.justFinished) return
    playRestEndAlert()
    const id = setTimeout(
      () =>
        setSession((s) => ({
          ...s,
          timer: { ...s.timer, justFinished: false },
        })),
      900,
    )
    return () => clearTimeout(id)
  }, [session.timer.justFinished, setSession])

  const adjust = useCallback(
    (delta: number) => {
      setSession((s) => {
        const cur = s.timer.remainingSec + delta
        if (cur > 0) {
          return {
            ...s,
            timer: {
              ...s.timer,
              remainingSec: cur,
              status: 'running',
              overtimeSec: 0,
              justFinished: false,
            },
          }
        }
        return { ...s, timer: { ...s.timer, remainingSec: 0 } }
      })
    },
    [setSession],
  )

  return { adjust }
}
