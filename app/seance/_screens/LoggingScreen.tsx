'use client'

import { CSSProperties, Dispatch, SetStateAction, useEffect, useState } from 'react'
import type { Exo, Serie, SessionState, TimerState, WorkoutStep } from '../_lib/types'
import { WORKOUT_TYPES } from '../_lib/constants'
import { formatMMSS, newId } from '../_lib/helpers'
import { useRestTimer } from '../_lib/useRestTimer'
import {
  Button,
  Card,
  FinishPill,
  IconButton,
  NumericInput,
} from '../_components/primitives'
import {
  Check,
  ChevronRight,
  Dumbbell,
  Plus,
  Spark,
  X,
} from '../_components/icons'

type Props = {
  session: SessionState
  setSession: Dispatch<SetStateAction<SessionState>>
  nav: (s: WorkoutStep) => void
}

export function LoggingScreen({ session, setSession, nav }: Props) {
  const curExIdx = session.currentExoIndex ?? 0
  const curExo = session.exos?.[curExIdx] || { tempId: '', nom: '—', series: [] as Serie[] }
  const type = WORKOUT_TYPES.find((t) => t.id === session.type)
  const totalExercises = Math.max(4, session.exos?.length || 1)

  const lastSerie = curExo.series[curExo.series.length - 1]
  const [weight, setWeight] = useState<number>(lastSerie?.poids ?? 80)
  const [reps, setReps] = useState<number>(lastSerie?.reps ?? 8)
  const [rir, setRir] = useState<number>(lastSerie?.rir ?? 2)
  const [degressive, setDegressive] = useState<boolean>(false)

  const exKey = curExo.tempId || curExo.nom
  useEffect(() => {
    const ls = curExo.series[curExo.series.length - 1]
    setWeight(ls?.poids ?? 80)
    setReps(ls?.reps ?? 8)
    setRir(ls?.rir ?? 2)
    setDegressive(false)
  }, [exKey, curExo.series.length])

  const { adjust: adjustTimer } = useRestTimer(session, setSession)
  const status = session.timer.status

  const enregistrer = () => {
    const newSerie: Serie = {
      tempId: newId('s'),
      reps,
      poids: weight,
      rir,
      degressive,
    }
    setSession((s) => {
      const exos = [...s.exos]
      exos[curExIdx] = {
        ...exos[curExIdx],
        series: [...exos[curExIdx].series, newSerie],
      }
      return {
        ...s,
        exos,
        currentSerieIndex: exos[curExIdx].series.length,
        timer: {
          remainingSec: s.restTargetSec,
          status: 'running',
          overtimeSec: 0,
          justFinished: false,
        },
      }
    })
  }

  const nouvelleSerie = () =>
    setSession((s) => ({
      ...s,
      timer: { remainingSec: 0, status: 'idle', overtimeSec: 0, justFinished: false },
    }))

  const exerciceSuivant = () => {
    setSession((s) => ({
      ...s,
      timer: { remainingSec: 0, status: 'idle', overtimeSec: 0, justFinished: false },
    }))
    nav('exercise_select')
  }

  const finish = () => {
    setSession((s) => ({
      ...s,
      timer: { remainingSec: 0, status: 'idle', overtimeSec: 0, justFinished: false },
    }))
    nav('summary')
  }

  if (status === 'running' || status === 'finished') {
    return (
      <RestScreen
        timer={session.timer}
        target={session.restTargetSec}
        typeLabel={type?.label}
        curExo={curExo}
        curExIdx={curExIdx}
        totalExercises={totalExercises}
        onAdd={adjustTimer}
        onNouvelleSerie={nouvelleSerie}
        onExerciceSuivant={exerciceSuivant}
        onClose={() => nav('idle')}
        onFinish={finish}
      />
    )
  }

  const setNumber = curExo.series.length + 1
  const exerciseNumber = curExIdx + 1

  return (
    <div
      className="app-scroll"
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
    >
      <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton icon={<X size={16} />} label="quitter" onClick={() => nav('idle')} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Séance {type?.label}</span>
            <span style={{ color: 'var(--subtle)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              Exercice {exerciseNumber}/{totalExercises}
            </span>
            <span style={{ color: 'var(--subtle)' }}>·</span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--accent)',
                fontFamily: 'var(--mono)',
                fontWeight: 600,
              }}
            >
              Série {setNumber}
            </span>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: -0.4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {curExo.nom}
          </div>
        </div>
        <FinishPill onClick={finish} />
      </div>

      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 5 }}>
        {Array.from({ length: Math.max(4, curExo.series.length + 1) }).map((_, i) => {
          const done = i < curExo.series.length
          const current = i === curExo.series.length
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: done
                  ? 'var(--accent)'
                  : current
                    ? 'var(--accent-line)'
                    : 'var(--line)',
                transition: 'background 220ms',
              }}
            />
          )
        })}
      </div>

      <div
        style={{
          flex: 1,
          padding: '4px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <SeriesContext
          setNumber={setNumber}
          curExo={curExo}
          curExIdx={curExIdx}
          exos={session.exos}
          lastSerie={lastSerie}
        />

        <Card
          style={{ padding: 16, animation: 'fadeUp 320ms ease both' }}
        >
          <NumericInput
            size="hero"
            value={weight}
            onChange={setWeight}
            label="Charge"
            suffix="kg"
            hint={lastSerie ? `préc. ${lastSerie.poids} kg` : null}
            step={2.5}
            decimals={1}
            max={500}
            icon={<Dumbbell size={12} color="var(--muted)" />}
          />
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <NumericInput
              value={reps}
              onChange={setReps}
              label="Reps"
              step={1}
              max={50}
              hint={lastSerie ? `×${lastSerie.reps}` : null}
            />
            <NumericInput
              value={rir}
              onChange={setRir}
              label="RIR"
              step={1}
              max={10}
              hint={lastSerie ? `${lastSerie.rir}` : null}
            />
            <button
              onClick={() => setDegressive(!degressive)}
              aria-pressed={degressive}
              style={{
                flex: 1,
                minWidth: 0,
                appearance: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                background: 'transparent',
                padding: 0,
                gap: 6,
                textAlign: 'left',
                alignItems: 'stretch',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  fontWeight: 500,
                  letterSpacing: -0.1,
                }}
              >
                Dégressive
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  height: 56,
                  padding: '0 8px',
                  borderRadius: 14,
                  background: degressive ? 'var(--accent)' : '#FFFFFF',
                  color: degressive ? '#fff' : 'var(--ink-2)',
                  boxShadow: degressive
                    ? '0 4px 14px -6px color-mix(in oklch, var(--accent) 55%, transparent)'
                    : '0 0 0 1px var(--line) inset',
                  transition: 'all 200ms',
                }}
              >
                <DropIcon active={degressive} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{degressive ? 'oui' : 'non'}</span>
              </div>
            </button>
          </div>
        </Card>

        {curExo.series.length > 0 && (
          <div style={{ animation: 'fadeUp 320ms ease both' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 4px 8px',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 600,
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                }}
              >
                Séries
              </span>
              <span style={{ fontSize: 11, color: 'var(--subtle)', fontFamily: 'var(--mono)' }}>
                {curExo.series.length} × · vol.{' '}
                {curExo.series
                  .reduce((a, s) => a + s.poids * s.reps, 0)
                  .toLocaleString('fr-FR')}{' '}
                kg
              </span>
            </div>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 56px 36px 24px',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 14px',
                  background: 'var(--line-2)',
                  fontSize: 10,
                  color: 'var(--muted)',
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                <span>#</span>
                <span>Charge × reps</span>
                <span style={{ textAlign: 'right' }}>Volume</span>
                <span style={{ textAlign: 'center' }}>RIR</span>
                <span />
              </div>
              {curExo.series.map((s, i) => (
                <div
                  key={s.tempId || i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr 56px 36px 24px',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-2)',
                    fontFamily: 'var(--mono)',
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: 'var(--line-2)',
                      color: 'var(--ink-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 4,
                    }}
                  >
                    {s.poids}
                    <span style={{ color: 'var(--subtle)', fontWeight: 400, fontSize: 11 }}>kg</span>
                    <span style={{ color: 'var(--subtle)', fontWeight: 400 }}>×</span>
                    {s.reps}
                    {s.degressive && <DropIcon active size={12} style={{ marginLeft: 4 }} />}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--muted)',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {(s.poids * s.reps).toLocaleString('fr-FR')}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-2)',
                      textAlign: 'center',
                      fontWeight: 600,
                    }}
                  >
                    {s.rir}
                  </span>
                  <Check size={13} color="var(--ok)" />
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      <div
        style={{
          padding: '12px 16px 18px',
          background: 'linear-gradient(180deg, transparent, var(--bg) 22%)',
          display: 'flex',
          gap: 8,
        }}
      >
        <Button onClick={enregistrer} icon={<Check size={16} />} style={{ flex: 2 }}>
          Enregistrer
        </Button>
        <Button
          variant="secondary"
          onClick={exerciceSuivant}
          trailingIcon={<ChevronRight size={14} />}
          style={{ flex: 1 }}
        >
          Exo suivant
        </Button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// REST SCREEN
// ══════════════════════════════════════════════════════════════════
function RestScreen({
  timer,
  target,
  typeLabel,
  curExo,
  curExIdx,
  totalExercises,
  onAdd,
  onNouvelleSerie,
  onExerciceSuivant,
  onClose,
  onFinish,
}: {
  timer: TimerState
  target: number
  typeLabel?: string
  curExo: Exo | { tempId: string; nom: string; series: Serie[] }
  curExIdx: number
  totalExercises: number
  onAdd: (delta: number) => void
  onNouvelleSerie: () => void
  onExerciceSuivant: () => void
  onClose: () => void
  onFinish: () => void
}) {
  const done = timer.status === 'finished'
  const remaining = timer.remainingSec
  const overtime = timer.overtimeSec || 0
  const pct = done ? 0 : 1 - remaining / target

  const RING_W = 220
  const STROKE = 9
  const R = (RING_W - STROKE) / 2
  const C = 2 * Math.PI * R
  const dashOffset = C * pct

  const justLogged = curExo.series[curExo.series.length - 1]
  const setNumberJustDone = curExo.series.length
  const exerciseNumber = curExIdx + 1

  let headline: [string, string]
  if (setNumberJustDone <= 1) headline = ['Belle ouverture.', 'Profite du repos.']
  else if (setNumberJustDone === 2) headline = ['Deux de faites.', 'On garde le rythme.']
  else if (setNumberJustDone === 3) headline = ['Encore une bonne.', 'Tiens la cadence.']
  else headline = ['Tu pousses fort.', 'Souffle, ressers.']
  if (done) headline = ['Prêt.', 'Quand tu veux.']

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100%',
        width: '100%',
        background: done
          ? 'radial-gradient(120% 100% at 50% 0%, color-mix(in oklch, var(--accent) 16%, white) 0%, var(--bg) 75%)'
          : 'radial-gradient(120% 70% at 50% 0%, color-mix(in oklch, var(--accent) 7%, white) 0%, var(--bg) 60%)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeUp 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        transition: 'background 600ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 4px' }}>
        <IconButton icon={<X size={16} />} label="quitter" onClick={onClose} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 10,
              color: 'var(--muted)',
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }}
          >
            Repos en cours
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--subtle)',
              marginTop: 1,
              fontFamily: 'var(--mono)',
            }}
          >
            Séance {typeLabel} · Exo {exerciseNumber}/{totalExercises} · Série {setNumberJustDone}{' '}
            enregistrée
          </div>
        </div>
        <FinishPill onClick={onFinish} />
      </div>

      <div
        style={{
          padding: '14px 24px 0',
          textAlign: 'center',
          animation: 'fadeUp 380ms 80ms cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: -1.2,
            lineHeight: 1.05,
            color: 'var(--ink)',
            textWrap: 'balance',
            fontFamily: 'var(--display)',
          }}
        >
          {headline[0]}
          <br />
          <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{headline[1]}</span>
        </h1>
      </div>

      {justLogged && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '14px 16px 0',
            animation: 'fadeUp 400ms 160ms both',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px 6px 8px',
              borderRadius: 999,
              background: 'var(--surface)',
              boxShadow: '0 0 0 1px var(--line) inset',
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                background: 'var(--ok)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={11} stroke={3} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>
              {curExo.nom} ·{' '}
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)', fontWeight: 600 }}>
                {justLogged.poids}kg × {justLogged.reps}
              </span>
              <span style={{ color: 'var(--subtle)' }}> · RIR {justLogged.rir}</span>
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '24px 20px',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: RING_W,
            height: RING_W,
            animation: timer.justFinished ? 'ringPulse 700ms ease-out' : 'none',
          }}
        >
          <svg
            width={RING_W}
            height={RING_W}
            style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
          >
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="color-mix(in oklch, var(--accent) 70%, black)" />
              </linearGradient>
            </defs>
            <circle
              cx={RING_W / 2}
              cy={RING_W / 2}
              r={R}
              stroke="var(--line)"
              strokeWidth={STROKE}
              fill="none"
            />
            <circle
              cx={RING_W / 2}
              cy={RING_W / 2}
              r={R}
              stroke={done ? 'var(--accent)' : 'url(#ringGrad)'}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={C}
              strokeDashoffset={done ? 0 : C - dashOffset}
              style={{
                transition: 'stroke-dashoffset 1000ms linear, stroke 400ms',
                animation: done ? 'ringIdle 2.4s ease-in-out infinite' : 'none',
              }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 60,
                fontWeight: 600,
                letterSpacing: -2.5,
                lineHeight: 1,
                color: done ? 'var(--accent)' : 'var(--ink)',
                transition: 'color 300ms',
                fontVariantNumeric: 'tabular-nums',
                animation: timer.justFinished ? 'pulse 600ms ease' : 'none',
              }}
            >
              {done ? `+${formatMMSS(overtime)}` : formatMMSS(remaining)}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--subtle)',
                marginTop: 6,
                fontFamily: 'var(--mono)',
              }}
            >
              {done ? 'temps écoulé' : `cible ${formatMMSS(target)}`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
          <button onClick={() => onAdd(-15)} style={{ ...timerChipStyle, color: 'var(--muted)' }}>
            −15s
          </button>
          <button onClick={() => onAdd(10)} style={timerChipStyle}>
            +10s
          </button>
          <button onClick={() => onAdd(30)} style={timerChipStyle}>
            +30s
          </button>
        </div>
      </div>

      <div
        style={{
          padding: '12px 16px 96px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: 'linear-gradient(180deg, transparent, var(--bg) 30%)',
        }}
      >
        <Button onClick={onNouvelleSerie} icon={<Plus size={16} />}>
          Nouvelle série
        </Button>
        <Button
          onClick={onExerciceSuivant}
          variant="secondary"
          trailingIcon={<ChevronRight size={14} />}
        >
          Exercice suivant
        </Button>
      </div>
    </div>
  )
}

const timerChipStyle: CSSProperties = {
  height: 38,
  padding: '0 16px',
  borderRadius: 999,
  border: 'none',
  background: 'var(--surface)',
  boxShadow: '0 0 0 1px var(--line) inset, 0 1px 2px rgba(0,0,0,0.03)',
  fontFamily: 'var(--mono)',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--ink-2)',
  cursor: 'pointer',
  transition: 'all 140ms',
}

// ══════════════════════════════════════════════════════════════════
// SERIES CONTEXT
// ══════════════════════════════════════════════════════════════════
function SeriesContext({
  setNumber,
  curExo,
  curExIdx,
  exos,
  lastSerie,
}: {
  setNumber: number
  curExo: Exo | { tempId: string; nom: string; series: Serie[] }
  curExIdx: number
  exos: Exo[]
  lastSerie?: Serie
}) {
  const hasPrev = !!lastSerie
  const prevExo = !hasPrev && curExIdx > 0 ? exos?.[curExIdx - 1] : null

  let tone: 'continuing' | 'transition' | 'first'
  let eyebrow: string
  let body: React.ReactNode

  if (hasPrev && lastSerie) {
    tone = 'continuing'
    eyebrow = `Série ${setNumber}`
    body = (
      <span style={{ fontFamily: 'var(--mono)' }}>
        Précédent ·{' '}
        <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>
          {lastSerie.poids} kg × {lastSerie.reps}
        </strong>
        <span style={{ color: 'var(--subtle)' }}> · RIR {lastSerie.rir}</span>
      </span>
    )
  } else if (prevExo) {
    const prevLast = prevExo.series[prevExo.series.length - 1]
    tone = 'transition'
    eyebrow = `Première série · ${curExo.nom}`
    body = (
      <span>
        Après <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{prevExo.nom}</strong>
        {prevLast && (
          <span style={{ color: 'var(--subtle)', fontFamily: 'var(--mono)' }}>
            {' '}
            · {prevExo.series.length} série{prevExo.series.length > 1 ? 's' : ''} ·{' '}
            {prevLast.poids}kg×{prevLast.reps}
          </span>
        )}
      </span>
    )
  } else {
    tone = 'first'
    eyebrow = 'Première série'
    body = (
      <span>
        Pas de référence —{' '}
        <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>échauffe-toi</strong>, prends ton
        temps.
      </span>
    )
  }

  const bg =
    tone === 'first'
      ? 'var(--accent-soft)'
      : tone === 'transition'
        ? 'color-mix(in oklch, var(--accent) 7%, white)'
        : 'var(--surface)'
  const ring = tone === 'continuing' ? 'var(--line)' : 'var(--accent-line)'
  const iconBg = tone === 'continuing' ? 'var(--line-2)' : 'var(--accent)'
  const iconColor = tone === 'continuing' ? 'var(--ink-2)' : '#fff'

  return (
    <div
      style={{
        padding: '14px 14px',
        borderRadius: 14,
        background: bg,
        boxShadow: `0 0 0 1px ${ring} inset`,
        animation: 'fadeUp 280ms ease both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: iconBg,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--mono)',
            fontWeight: 600,
            fontSize: 15,
            flexShrink: 0,
          }}
        >
          {tone === 'continuing' ? setNumber : <Spark size={15} color="#fff" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              color: tone === 'continuing' ? 'var(--muted)' : 'var(--accent)',
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              marginBottom: 2,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--ink-2)',
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {body}
          </div>
        </div>
      </div>
    </div>
  )
}

function DropIcon({
  active = false,
  size = 14,
  style = {},
}: {
  active?: boolean
  size?: number
  style?: CSSProperties
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} aria-hidden>
      <path
        d="M5 5l14 14M12 19h7v-7"
        stroke={active ? '#fff' : 'currentColor'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
