export type WorkoutStep =
  | 'idle'
  | 'config'
  | 'exercise_select'
  | 'logging'
  | 'stats'
  | 'summary'

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
}

export type SessionState = {
  type: string
  restTargetSec: number
  exos: Exo[]
  currentExoIndex: number
  currentSerieIndex: number
  timer: TimerState
}
