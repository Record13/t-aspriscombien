'use client'

import { Dispatch, SetStateAction, useState } from 'react'
import type { Serie, SessionState, WorkoutStep } from '../_lib/types'
import { WORKOUT_TYPES } from '../_lib/constants'
import { Button, Card, IconButton, TopBar } from '../_components/primitives'
import { Check, ChevronLeft, X } from '../_components/icons'

type Props = {
  session: SessionState
  setSession: Dispatch<SetStateAction<SessionState>>
  nav: (s: WorkoutStep) => void
  resetSession: () => void
}

export function SummaryScreen({ session, setSession, nav, resetSession }: Props) {
  const totalSets = session.exos?.reduce((a, e) => a + e.series.length, 0) || 0
  const totalVolume =
    session.exos?.reduce(
      (a, e) => a + e.series.reduce((b, s) => b + s.poids * s.reps, 0),
      0,
    ) || 0
  const type = WORKOUT_TYPES.find((t) => t.id === session.type)

  const updateSerie = (exoIdx: number, serieIdx: number, patch: Partial<Serie>) => {
    setSession((s) => {
      const exos = s.exos.map((ex, ei) =>
        ei !== exoIdx
          ? ex
          : {
              ...ex,
              series: ex.series.map((sr, si) => (si !== serieIdx ? sr : { ...sr, ...patch })),
            },
      )
      return { ...s, exos }
    })
  }

  const deleteSerie = (exoIdx: number, serieIdx: number) => {
    setSession((s) => {
      const exos = s.exos.map((ex, ei) =>
        ei !== exoIdx
          ? ex
          : {
              ...ex,
              series: ex.series.filter((_, si) => si !== serieIdx),
            },
      )
      return { ...s, exos }
    })
  }

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const handleValidate = async () => {
    setSaveStatus('saving')
    setErrorMsg('')
    try {
      const res = await fetch('/api/seance/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionState: session }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || `Erreur ${res.status}`)
        setSaveStatus('error')
        return
      }
      setSaveStatus('saved')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erreur réseau')
      setSaveStatus('error')
    }
  }

  const handleNewSession = () => {
    resetSession()
    nav('idle')
  }

  return (
    <div
      className="app-scroll"
      style={{ minHeight: '100%', background: 'var(--bg)' }}
    >
      <TopBar
        leading={
          <IconButton
            icon={<ChevronLeft size={18} />}
            label="retour"
            onClick={() => nav('logging')}
          />
        }
        title="Séance terminée"
        subtitle="Vérifie et confirme"
      />
      <div style={{ padding: '4px 16px 30px', animation: 'fadeUp 360ms ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Check size={22} stroke={2.4} />
          </div>
          <div>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: -0.9,
                margin: '0 0 2px',
                fontFamily: 'var(--display)',
              }}
            >
              Beau travail<span style={{ color: 'var(--accent)' }}>.</span>
            </h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
              Séance {type?.label} · prête à enregistrer
            </p>
          </div>
        </div>

        <Card style={{ padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Exos', value: session.exos?.length || 0, suffix: '' },
              { label: 'Séries', value: totalSets, suffix: '' },
              { label: 'Volume', value: totalVolume.toLocaleString('fr-FR'), suffix: 'kg' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--muted)',
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: -0.6,
                    marginTop: 4,
                  }}
                >
                  {s.value}
                  {s.suffix && (
                    <span style={{ fontSize: 11, color: 'var(--subtle)', marginLeft: 2 }}>
                      {s.suffix}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {session.exos?.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 2px 8px',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}
            >
              À vérifier
            </span>
            <span style={{ fontSize: 11, color: 'var(--subtle)', fontFamily: 'var(--mono)' }}>
              tape pour modifier
            </span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {session.exos?.map((exo, exoIdx) => (
            <Card key={exo.tempId || exoIdx} style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: 'var(--line-2)',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: 'var(--surface)',
                    color: 'var(--ink-2)',
                    boxShadow: '0 0 0 1px var(--line) inset',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {exoIdx + 1}
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {exo.nom}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  {exo.series.length} série{exo.series.length > 1 ? 's' : ''}
                </span>
              </div>
              {exo.series.length === 0 && (
                <div
                  style={{
                    padding: '14px 16px',
                    fontSize: 12,
                    color: 'var(--subtle)',
                    fontStyle: 'italic',
                  }}
                >
                  aucune série enregistrée
                </div>
              )}
              {exo.series.map((s, si) => (
                <EditableSerieRow
                  key={s.tempId || si}
                  index={si}
                  serie={s}
                  onPatch={(patch) => updateSerie(exoIdx, si, patch)}
                  onDelete={() => deleteSerie(exoIdx, si)}
                />
              ))}
            </Card>
          ))}
        </div>

        {saveStatus === 'saved' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'color-mix(in oklch, var(--ok) 14%, white)',
                color: 'var(--ok)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontWeight: 600,
                fontSize: 14,
                animation: 'fadeUp 240ms ease both',
              }}
            >
              <Check size={16} stroke={2.4} />
              <span>Séance enregistrée</span>
            </div>
            <Button onClick={handleNewSession} icon={<Check size={16} />}>
              Nouvelle séance
            </Button>
          </div>
        ) : saveStatus === 'error' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'color-mix(in oklch, var(--warn) 12%, white)',
                color: 'var(--warn)',
                fontWeight: 500,
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              {errorMsg || 'Erreur lors de la sauvegarde'}
            </div>
            <Button onClick={handleValidate}>Réessayer</Button>
            <Button
              variant="secondary"
              onClick={() => {
                resetSession()
                nav('idle')
              }}
            >
              Annuler
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Button
              onClick={handleValidate}
              disabled={saveStatus === 'saving'}
              icon={saveStatus === 'saving' ? undefined : <Check size={16} />}
            >
              {saveStatus === 'saving' ? 'Enregistrement…' : 'Valider la séance'}
            </Button>
            <Button
              variant="secondary"
              disabled={saveStatus === 'saving'}
              onClick={() => {
                resetSession()
                nav('idle')
              }}
            >
              Annuler
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function EditableSerieRow({
  index,
  serie,
  onPatch,
  onDelete,
}: {
  index: number
  serie: Serie
  onPatch: (patch: Partial<Serie>) => void
  onDelete: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        borderTop: '1px solid var(--line-2)',
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: 'var(--surface)',
          color: 'var(--ink-2)',
          boxShadow: '0 0 0 1px var(--line) inset',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>
      <MiniNumCell
        value={serie.poids}
        decimals={1}
        onChange={(v) => onPatch({ poids: v })}
        suffix="kg"
        width="5.5ch"
      />
      <span style={{ fontFamily: 'var(--mono)', color: 'var(--subtle)', fontSize: 12 }}>×</span>
      <MiniNumCell
        value={serie.reps}
        decimals={0}
        onChange={(v) => onPatch({ reps: v })}
        width="3ch"
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--subtle)', fontWeight: 500 }}>RIR</span>
        <MiniNumCell
          value={serie.rir}
          decimals={0}
          onChange={(v) => onPatch({ rir: v })}
          width="2ch"
        />
      </div>
      <button
        onClick={() => onPatch({ degressive: !serie.degressive })}
        title="dégressive"
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          border: 'none',
          cursor: 'pointer',
          background: serie.degressive ? 'var(--accent)' : 'var(--line-2)',
          color: serie.degressive ? '#fff' : 'var(--subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 'auto',
          transition: 'all 140ms',
        }}
      >
        <DropIcon active={serie.degressive} size={12} />
      </button>
      <button
        onClick={onDelete}
        aria-label="supprimer"
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          color: 'var(--subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

function MiniNumCell({
  value,
  onChange,
  decimals = 0,
  suffix,
  width,
}: {
  value: number
  onChange: (v: number) => void
  decimals?: number
  suffix?: string
  width?: string
}) {
  const fmt = decimals ? Number(value).toFixed(decimals) : String(value)
  const [focus, setFocus] = useState(false)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 2,
        padding: '4px 6px',
        borderRadius: 6,
        background: focus ? 'var(--accent-soft)' : 'var(--line-2)',
        boxShadow: focus ? '0 0 0 1px var(--accent) inset' : 'none',
        transition: 'all 140ms',
      }}
    >
      <input
        value={fmt}
        onChange={(e) => {
          const v = e.target.value.replace(',', '.')
          if (v === '' || v === '-') return onChange(0)
          const n = parseFloat(v)
          if (!isNaN(n)) onChange(decimals ? Number(n.toFixed(decimals)) : Math.round(n))
        }}
        onFocus={(e) => {
          setFocus(true)
          e.target.select()
        }}
        onBlur={() => setFocus(false)}
        inputMode="decimal"
        style={{
          width,
          textAlign: 'center',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: 'var(--mono)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--ink)',
          padding: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      />
      {suffix && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--subtle)' }}>
          {suffix}
        </span>
      )}
    </span>
  )
}

function DropIcon({ active, size = 14 }: { active?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
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
