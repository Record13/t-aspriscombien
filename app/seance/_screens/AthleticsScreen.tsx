'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { NavFn } from '../_lib/types'
import { useRuns } from '../_lib/useRuns'
import {
  DISTANCE_MAX_M,
  DISTANCE_MIN_M,
  DISTANCE_PRESETS_M,
  formatChrono,
  summarizeByDistance,
} from '../_lib/runs'
import { Button, FinishPill, IconButton, TopBar } from '../_components/primitives'
import { Check, Timer, X } from '../_components/icons'
import { useToast } from '../../_components/Toast'
import { useWakeLock } from '../_lib/useWakeLock'

type Props = {
  nav: NavFn
  // Distance pré-sélectionnée (depuis Stats Athlé → drill-down). Si null, on
  // utilise la dernière distance utilisée dans l'historique.
  initialDistance?: number | null
}

const DEFAULT_DISTANCE = 100

export function AthleticsScreen({ nav, initialDistance = null }: Props) {
  const { runs, loading, error, create } = useRuns()
  const toast = useToast()
  const initializedRef = useRef(false)
  // Default immédiat à initialDistance ou 100m pour éviter un fallback pendant
  // le chargement des runs. Sera écrasé par la distance du dernier run dès que
  // `runs` arrive si aucune distance n'a été imposée explicitement.
  const [selectedDistance, setSelectedDistance] = useState<number>(
    initialDistance ?? DEFAULT_DISTANCE,
  )
  // Chronos accumulés en mémoire pendant la séance. Aucun n'est persisté en DB
  // tant que l'utilisateur ne clique pas « Finir la séance » — on save tout en
  // batch à ce moment-là (préférence utilisateur : pas de save intermédiaire).
  const [pendingRuns, setPendingRuns] = useState<
    Array<{ distance_m: number; duration_ms: number }>
  >([])
  const [batchSaving, setBatchSaving] = useState(false)

  useEffect(() => {
    if (error) toast.warn(error)
  }, [error, toast])

  // À la première arrivée, basculer sur la dernière distance utilisée si on
  // n'a pas reçu de distance explicite. Ne se déclenche qu'une fois pour ne
  // pas écraser un changement utilisateur ultérieur via le DistancePicker.
  useEffect(() => {
    if (initializedRef.current) return
    if (loading) return
    initializedRef.current = true
    if (initialDistance != null) return
    const lastRun = runs[0]
    if (lastRun) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDistance(lastRun.distance_m)
    }
  }, [loading, initialDistance, runs])

  const summaries = useMemo(() => summarizeByDistance(runs), [runs])
  const userDistances = useMemo(() => summaries.map((s) => s.distance_m), [summaries])

  // Persiste tous les chronos en mémoire en DB de façon séquentielle, puis
  // navigue vers le récap avec les IDs nouvellement créés. Si l'un échoue, on
  // s'arrête : ce qui est déjà créé reste en DB, l'utilisateur peut retenter.
  const persistAndFinish = async (
    runsToSave: Array<{ distance_m: number; duration_ms: number }>,
  ) => {
    if (runsToSave.length === 0) return
    setBatchSaving(true)
    const createdIds: string[] = []
    try {
      for (const r of runsToSave) {
        const created = await create(r)
        createdIds.push(created.id)
      }
      nav('athletics_summary', { athleticsRunIds: createdIds })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement')
      // Retire de la file les chronos déjà persistés pour éviter les doublons
      // si l'utilisateur retente.
      setPendingRuns((rs) => rs.slice(createdIds.length))
      setBatchSaving(false)
    }
  }

  return (
    <ChronoView
      distance={selectedDistance}
      userDistances={userDistances}
      sessionRunCount={pendingRuns.length}
      batchSaving={batchSaving}
      onCancel={() => nav('idle')}
      onChangeDistance={(d) => setSelectedDistance(d)}
      onNextRun={(ms) => {
        setPendingRuns((rs) => [
          ...rs,
          { distance_m: selectedDistance, duration_ms: ms },
        ])
      }}
      onFinishWithRun={async (ms) => {
        await persistAndFinish([
          ...pendingRuns,
          { distance_m: selectedDistance, duration_ms: ms },
        ])
      }}
      onFinishExisting={
        pendingRuns.length > 0 ? () => persistAndFinish(pendingRuns) : undefined
      }
    />
  )
}

// ══════════════════════════════════════════════════════════════════
// CHRONO
// ══════════════════════════════════════════════════════════════════
type ChronoStatus = 'idle' | 'running' | 'stopped'
type PendingAction = 'next' | 'finish' | null

function ChronoView({
  distance,
  userDistances,
  sessionRunCount,
  batchSaving,
  onCancel,
  onNextRun,
  onFinishWithRun,
  onFinishExisting,
  onChangeDistance,
}: {
  distance: number
  userDistances: number[]
  // Nombre de chronos déjà mémorisés pour cette séance (afficher le pill
  // « Terminer » dans la TopBar entre deux courses).
  sessionRunCount: number
  // True pendant la persistance batch finale (désactive tous les boutons).
  batchSaving: boolean
  onCancel: () => void
  // Ajoute le chrono courant à la file en mémoire (pas de save DB).
  onNextRun: (ms: number) => void
  // Ajoute le chrono courant puis persiste toute la séance + nav summary.
  onFinishWithRun: (ms: number) => Promise<void>
  // Persiste les chronos déjà mémorisés puis nav (utilisé entre deux courses).
  onFinishExisting?: () => void
  onChangeDistance: (d: number) => void
}) {
  const [status, setStatus] = useState<ChronoStatus>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const startAtRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const [pending, setPending] = useState<PendingAction>(null)
  const [error, setError] = useState<string | null>(null)

  useWakeLock(true)

  useEffect(() => {
    if (status !== 'running') return
    const tick = () => {
      if (startAtRef.current != null) {
        setElapsedMs(performance.now() - startAtRef.current)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [status])

  const start = () => {
    startAtRef.current = performance.now() - elapsedMs
    setStatus('running')
    setError(null)
  }
  const stop = () => {
    if (startAtRef.current != null) {
      setElapsedMs(performance.now() - startAtRef.current)
    }
    setStatus('stopped')
  }
  const resetChrono = () => {
    setStatus('idle')
    setElapsedMs(0)
    startAtRef.current = null
    setError(null)
  }

  const handleNext = () => {
    if (elapsedMs <= 0 || pending || batchSaving) return
    onNextRun(Math.round(elapsedMs))
    resetChrono()
  }

  const handleFinish = async () => {
    if (elapsedMs <= 0 || pending || batchSaving) return
    setPending('finish')
    setError(null)
    try {
      await onFinishWithRun(Math.round(elapsedMs))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement')
    } finally {
      setPending(null)
    }
  }

  const busy = pending !== null || batchSaving

  const isRunning = status === 'running'

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: isRunning
          ? 'radial-gradient(120% 70% at 50% 0%, color-mix(in oklch, var(--accent) 14%, var(--bg)) 0%, var(--bg) 60%)'
          : 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 400ms ease',
      }}
    >
      <TopBar
        leading={
          <IconButton icon={<X size={16} />} label="quitter" onClick={onCancel} />
        }
        title="Chrono"
        subtitle={
          sessionRunCount > 0
            ? `${distance}m · ${sessionRunCount} chrono${sessionRunCount > 1 ? 's' : ''} dans la séance`
            : `${distance}m`
        }
        trailing={
          status === 'idle' && sessionRunCount > 0 && onFinishExisting && !batchSaving ? (
            <FinishPill tone="accent" label="Terminer" onClick={onFinishExisting} />
          ) : null
        }
      />

      {status === 'idle' && (
        <div style={{ padding: '4px 20px 0' }}>
          <DistancePicker
            value={distance}
            userDistances={userDistances}
            onChange={onChangeDistance}
            disabled={batchSaving}
          />
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 72,
            fontWeight: 600,
            letterSpacing: -3,
            lineHeight: 1,
            color:
              status === 'idle'
                ? 'var(--muted)'
                : status === 'running'
                  ? 'var(--accent)'
                  : 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
            transition: 'color 200ms',
          }}
        >
          {formatChrono(elapsedMs)}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--subtle)',
            fontFamily: 'var(--mono)',
            marginTop: 8,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          {status === 'idle' && 'prêt'}
          {status === 'running' && 'en cours'}
          {status === 'stopped' && 'arrêté'}
        </div>

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'color-mix(in oklch, var(--warn) 18%, var(--surface))',
              color: 'var(--warn)',
              fontSize: 12,
              fontWeight: 500,
              textAlign: 'center',
              maxWidth: 320,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '14px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)',
          background: 'linear-gradient(180deg, transparent, var(--bg) 30%)',
        }}
      >
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {status === 'idle' && (
            <Button onClick={start} icon={<Timer size={16} />} disabled={batchSaving}>
              Démarrer
            </Button>
          )}
          {status === 'running' && (
            <Button variant="danger" onClick={stop} icon={<X size={16} stroke={2.4} />}>
              Stop
            </Button>
          )}
          {status === 'stopped' && (
            <>
              <Button
                onClick={handleNext}
                icon={<Timer size={16} />}
                disabled={busy || elapsedMs <= 0}
              >
                Course suivante
              </Button>
              <Button
                variant="secondary"
                onClick={handleFinish}
                icon={pending === 'finish' || batchSaving ? undefined : <Check size={16} />}
                disabled={busy || elapsedMs <= 0}
              >
                {pending === 'finish' || batchSaving ? 'Enregistrement…' : 'Finir la séance'}
              </Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={resetChrono}
                  disabled={busy}
                >
                  Refaire
                </Button>
                <Button variant="secondary" size="md" onClick={onCancel} disabled={busy}>
                  Quitter
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DistancePicker({
  value,
  userDistances,
  onChange,
  disabled,
}: {
  value: number
  userDistances: number[]
  onChange: (d: number) => void
  disabled: boolean
}) {
  // Union presets + distances déjà courues (custom incluses), triées.
  // Garantit qu'une distance custom enregistrée reste cliquable au prochain ouverture.
  const distances = useMemo(() => {
    const set = new Set<number>(DISTANCE_PRESETS_M)
    for (const d of userDistances) set.add(d)
    return Array.from(set).sort((a, b) => a - b)
  }, [userDistances])

  const isInList = distances.includes(value)
  const [customMode, setCustomMode] = useState(!isInList)
  const [customText, setCustomText] = useState(!isInList ? String(value) : '')
  const [customError, setCustomError] = useState<string | null>(null)

  const commitCustom = () => {
    const n = parseInt(customText, 10)
    if (!Number.isFinite(n) || n < DISTANCE_MIN_M || n > DISTANCE_MAX_M) {
      setCustomError(`Entre ${DISTANCE_MIN_M} et ${DISTANCE_MAX_M} m`)
      return
    }
    setCustomError(null)
    onChange(n)
  }

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          marginBottom: 8,
          paddingLeft: 2,
        }}
      >
        Distance
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {distances.map((d) => {
          const active = !customMode && value === d
          const isCustom = !DISTANCE_PRESETS_M.includes(d as never)
          return (
            <button
              key={d}
              onClick={() => {
                setCustomMode(false)
                onChange(d)
              }}
              disabled={disabled}
              style={{
                appearance: 'none',
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                padding: '10px 8px',
                borderRadius: 10,
                background: active ? 'var(--accent-soft)' : 'var(--surface)',
                color: active ? 'var(--accent)' : 'var(--ink-2)',
                boxShadow: active
                  ? '0 0 0 1.5px var(--accent) inset'
                  : isCustom
                    ? '0 0 0 1px var(--accent-line) inset'
                    : '0 0 0 1px var(--line) inset',
                fontFamily: 'var(--mono)',
                fontWeight: 600,
                fontSize: 13,
                opacity: disabled ? 0.5 : 1,
                transition: 'all 140ms',
              }}
            >
              {d}m
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <button
          onClick={() => setCustomMode((v) => !v)}
          disabled={disabled}
          style={{
            appearance: 'none',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '8px 12px',
            borderRadius: 8,
            background: customMode ? 'var(--accent-soft)' : 'var(--surface-2)',
            color: customMode ? 'var(--accent)' : 'var(--muted)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font)',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          Autre…
        </button>
        {customMode && (
          <>
            <input
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value.replace(/\D/g, ''))
                setCustomError(null)
              }}
              onBlur={() => customText && commitCustom()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCustom()
              }}
              disabled={disabled}
              inputMode="numeric"
              placeholder="150"
              style={{
                width: 80,
                height: 34,
                padding: '0 10px',
                border: 'none',
                outline: 'none',
                background: 'var(--surface)',
                borderRadius: 8,
                boxShadow: '0 0 0 1px var(--line) inset',
                fontFamily: 'var(--mono)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink)',
                textAlign: 'center',
              }}
            />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--subtle)' }}>m</span>
          </>
        )}
      </div>
      {customError && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: 'var(--warn)',
            fontFamily: 'var(--mono)',
          }}
        >
          {customError}
        </div>
      )}
    </div>
  )
}
