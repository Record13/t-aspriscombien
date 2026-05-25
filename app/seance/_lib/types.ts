export type WorkoutStep =
  | 'idle'
  | 'config'
  | 'exercise_select'
  | 'logging'
  | 'stats'
  | 'summary'
  | 'history'
  | 'session_detail'
  | 'manual_entry'

export type NavContext = {
  seanceId?: string | null
}

export type NavFn = (step: WorkoutStep, ctx?: NavContext) => void

export type Serie = {
  tempId: string
  reps: number
  poids: number
  rir: number
  degressive: boolean
}

export type Exo = {
  tempId: string
  nom: string
  series: Serie[]
}

export type TimerStatus = 'idle' | 'running' | 'finished'

export type TimerState = {
  remainingSec: number
  status: TimerStatus
  overtimeSec: number
  justFinished: boolean
  minimised?: boolean
  // Wall-clock timestamp (ms since epoch) when the rest period ends.
  // The tick recomputes remainingSec from this — resilient to backgrounded tabs.
  targetEndAt?: number | null
}

export type SessionState = {
  type: string
  restTargetSec: number
  exos: Exo[]
  currentExoIndex: number
  currentSerieIndex: number
  timer: TimerState
}
