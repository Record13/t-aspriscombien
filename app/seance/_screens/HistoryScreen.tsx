'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { NavFn } from '../_lib/types'
import { WORKOUT_TYPES } from '../_lib/constants'
import { Card, IconButton, TopBar } from '../_components/primitives'
import { ChevronLeft, ChevronRight, Plus } from '../_components/icons'
import { useToast } from '../../_components/Toast'

type Props = { nav: NavFn }

type SeanceListItem = {
  id: string
  date: string
  type: string
  exosCount: number
  seriesCount: number
  volume: number
}

const fmt = (n: number) => n.toLocaleString('fr-FR')

export function HistoryScreen({ nav }: Props) {
  const [seances, setSeances] = useState<SeanceListItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/seances')
        if (cancelled) return
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          toast.error(e.error ?? `Erreur ${res.status}`)
        } else {
          const d = (await res.json()) as { seances: SeanceListItem[] }
          setSeances(d.seances)
        }
      } catch (e) {
        if (!cancelled) toast.warn(e instanceof Error ? e.message : 'Erreur réseau')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [toast])

  const grouped = useMemo(() => groupByMonth(seances ?? []), [seances])

  return (
    <div className="app-scroll" style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <TopBar
        leading={
          <IconButton icon={<ChevronLeft size={18} />} label="retour" onClick={() => nav('idle')} />
        }
        title="Historique"
        subtitle={loading ? '…' : `${seances?.length ?? 0} séance${(seances?.length ?? 0) > 1 ? 's' : ''}`}
      />

      <div style={{ padding: '4px 20px 30px' }}>
        <button
          onClick={() => nav('manual_entry', { seanceId: null })}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 50,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            fontWeight: 700,
            fontSize: 14,
            fontFamily: 'var(--font)',
            letterSpacing: -0.1,
            boxShadow: '0 10px 24px -10px color-mix(in oklch, var(--accent) 50%, transparent)',
            marginTop: 10,
            marginBottom: 22,
          }}
        >
          <Plus size={16} stroke={2.4} />
          Nouvelle séance manuelle
        </button>

        {loading && (
          <div style={{ padding: 18, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Chargement…
          </div>
        )}

        {!loading && (seances?.length ?? 0) === 0 && (
          <Card style={{ padding: 22 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Aucune séance enregistrée.
              <br />
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Lance ta première séance ou ajoute-en une manuellement.
              </span>
            </div>
          </Card>
        )}

        {grouped.map((g, gi) => (
          <MonthGroup key={g.key} group={g} index={gi} nav={nav} />
        ))}
      </div>
    </div>
  )
}

function MonthGroup({
  group,
  index,
  nav,
}: {
  group: { key: string; label: string; items: SeanceListItem[] }
  index: number
  nav: NavFn
}) {
  const reduced = useReducedMotion()
  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : index * 0.04, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{ marginBottom: 22 }}
    >
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
        {group.label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {group.items.map((s, i) => (
          <SeanceRow key={s.id} seance={s} index={i} nav={nav} />
        ))}
      </div>
    </motion.section>
  )
}

function SeanceRow({
  seance,
  index,
  nav,
}: {
  seance: SeanceListItem
  index: number
  nav: NavFn
}) {
  const reduced = useReducedMotion()
  const type = WORKOUT_TYPES.find((t) => t.id === seance.type)
  return (
    <motion.button
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : 0.04 + index * 0.03, duration: 0.28 }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      onClick={() => nav('session_detail', { seanceId: seance.id })}
      style={{
        appearance: 'none',
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 14px',
        borderRadius: 12,
        border: 'none',
        background: 'var(--surface)',
        boxShadow: '0 0 0 1px var(--line) inset',
        cursor: 'pointer',
        fontFamily: 'var(--font)',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 13,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {type?.emoji ?? '·'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            {formatRowDate(seance.date)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {type?.label ?? seance.type}</span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--subtle)',
            fontFamily: 'var(--mono)',
            marginTop: 2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {seance.exosCount} exo{seance.exosCount > 1 ? 's' : ''} · {seance.seriesCount} série
          {seance.seriesCount > 1 ? 's' : ''} · {fmt(seance.volume)} kg
        </div>
      </div>
      <ChevronRight size={16} color="var(--subtle)" />
    </motion.button>
  )
}

function groupByMonth(seances: SeanceListItem[]) {
  const map = new Map<string, { key: string; label: string; items: SeanceListItem[] }>()
  for (const s of seances) {
    const d = new Date(s.date + 'T00:00:00')
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
      .format(d)
      .replace(/^./, (c) => c.toUpperCase())
    const cur = map.get(key) ?? { key, label, items: [] }
    cur.items.push(s)
    map.set(key, cur)
  }
  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1))
}

function formatRowDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(d)
    .replace('.', '')
}
