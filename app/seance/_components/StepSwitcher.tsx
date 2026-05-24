'use client'

import { ReactNode } from 'react'
import type { WorkoutStep } from '../_lib/types'

export function StepSwitcher({ step, children }: { step: WorkoutStep; children: ReactNode }) {
  return (
    <div
      key={step}
      style={{
        width: '100%',
        animation: 'screenIn 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      {children}
    </div>
  )
}
