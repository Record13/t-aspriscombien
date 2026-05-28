'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { NavFn, Run } from '../_lib/types'
import { WORKOUT_TYPES } from '../_lib/constants'
import { Card, ConfirmDialog, IconButton, TopBar } from '../_components/primitives'
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Plus,
  Timer,
  Trash,
} from '../_components/icons'
import { useToast } from '../../_components/Toast'
import {
  formatChrono,
  formatRunTime,
  formatSessionDuration,
  groupRunsIntoSessions,
} from '../_lib/runs'

type Props = { nav: NavFn }

type SeanceListItem = {
  id: string
  date: string
  type: string
  exosCount: number
  seriesCount: number
  volume: number
}

type AthleticsListItem = {
  kind: 'athletics'
  id: string
  date: string
  startedAt: string
  endedAt: string
  runs: Run[]
  runIds: string[]
}

type SeanceEntry = SeanceListItem & { kind: 'seance' }

type HistoryEntry = SeanceEntry | AthleticsListItem

const fmt = (n: number) => n.toLocaleString('fr-FR')

export function HistoryScreen({ nav }: Props) {
  const [seances, setSeances] = useState<SeanceListItem[] | null>(null)
  const [runs, setRuns] = useState<Run[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<HistoryEntry | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, rRes] = await Promise.all([fetch('/api/seances'), fetch('/api/runs')])
      if (!sRes.ok) {
        const e = await sRes.json().catch(() => ({}))
        toast.error(e.error ?? `Erreur ${sRes.status}`)
      } else {
        const d = (await sRes.json()) as { seances: SeanceListItem[] }
        setSeances(d.seances)
      }
      if (rRes.ok) {
        const d = (await rRes.json()) as { runs: Run[] }
        setRuns(d.runs)
      } else {
        setRuns([])
      }
    } catch (e) {
      toast.warn(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    try {
      if (pendingDelete.kind === 'seance') {
        const res = await fetch(`/api/seances/${pendingDelete.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.error ?? `Erreur ${res.status}`)
        }
      } else {
        // Session athlé = N runs : on les supprime un par un.
        for (const runId of pendingDelete.runIds) {
          const res = await fetch(`/api/runs/${runId}`, { method: 'DELETE' })
          if (!res.ok) {
            const e = await res.json().catch(() => ({}))
            throw new Error(e.error ?? `Erreur ${res.status}`)
          }
        }
      }
      toast.ok('Séance supprimée.')
      setPendingDelete(null)
      await fetchAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur suppression')
    } finally {
      setDeleting(false)
    }
  }

  const entries = useMemo<HistoryEntry[]>(() => {
    const list: HistoryEntry[] = []
    for (const s of seances ?? []) list.push({ kind: 'seance', ...s })
    const athleticsSessions = groupRunsIntoSessions(runs ?? [])
    for (const a of athleticsSessions) {
      list.push({
        kind: 'athletics',
        id: a.id,
        date: a.date,
        startedAt: a.startedAt,
        endedAt: a.endedAt,
        runs: a.runs,
        runIds: a.runs.map((r) => r.id),
      })
    }
    list.sort((a, b) => {
      // Tri par date desc, puis startedAt desc pour athletics
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      const aTs = a.kind === 'athletics' ? a.startedAt : a.date + 'T00:00:00'
      const bTs = b.kind === 'athletics' ? b.startedAt : b.date + 'T00:00:00'
      return aTs < bTs ? 1 : -1
    })
    return list
  }, [seances, runs])

  const grouped = useMemo(() => groupByMonth(entries), [entries])
  const totalCount = entries.length
  const seancesCount = seances?.length ?? 0
  const athleticsCount = entries.filter((e) => e.kind === 'athletics').length

  return (
    <div className="app-scroll" style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <TopBar
        leading={
          <IconButton icon={<ChevronLeft size={18} />} label="retour" onClick={() => nav('idle')} />
        }
        title="Historique"
        subtitle={
          loading
            ? '…'
            : athleticsCount > 0
              ? `${seancesCount} muscu · ${athleticsCount} athlé`
              : `${totalCount} séance${totalCount > 1 ? 's' : ''}`
        }
        trailing={
          !loading && totalCount > 0 ? (
            <EditToggle editMode={editMode} onToggle={() => setEditMode((v) => !v)} />
          ) : null
        }
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

        {/* Légende : indique au premier regard les deux types — la barre verticale
            colorée gauche de chaque carte reprend exactement ces tons. */}
        {!loading && totalCount > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 4px 16px',
              fontSize: 11,
              color: 'var(--muted)',
              fontFamily: 'var(--mono)',
            }}
          >
            <LegendDot tone="muscu" label="muscu" />
            <LegendDot tone="athletics" label="athlé" />
          </div>
        )}

        {loading && (
          <div style={{ padding: 18, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Chargement…
          </div>
        )}

        {!loading && totalCount === 0 && (
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
          <MonthGroup
            key={g.key}
            group={g}
            index={gi}
            nav={nav}
            editMode={editMode}
            onRequestDelete={setPendingDelete}
          />
        ))}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Supprimer cette séance ?"
        message={
          pendingDelete?.kind === 'athletics'
            ? `Cette séance contient ${pendingDelete.runs.length} chrono${pendingDelete.runs.length > 1 ? 's' : ''}. La suppression est définitive.`
            : 'La suppression est définitive et retire tous les exercices et séries associés.'
        }
        confirmLabel="Supprimer"
        tone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null)
        }}
      />
    </div>
  )
}

function EditToggle({
  editMode,
  onToggle,
}: {
  editMode: boolean
  onToggle: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        appearance: 'none',
        height: 32,
        padding: '0 12px',
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        background: hover ? 'var(--surface-2)' : 'transparent',
        color: editMode ? 'var(--accent)' : 'var(--ink-2)',
        boxShadow: editMode
          ? '0 0 0 1px var(--accent-line) inset'
          : '0 0 0 1px var(--line) inset',
        fontFamily: 'var(--font)',
        fontSize: 12,
        fontWeight: 600,
        transition: 'all 140ms',
        flexShrink: 0,
      }}
    >
      {editMode ? 'Terminé' : 'Modifier'}
    </button>
  )
}

function LegendDot({ tone, label }: { tone: 'muscu' | 'athletics'; label: string }) {
  const color = tone === 'muscu' ? 'var(--accent)' : 'var(--warn)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        aria-hidden
        style={{
          width: 3,
          height: 14,
          borderRadius: 2,
          background: color,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  )
}

function MonthGroup({
  group,
  index,
  nav,
  editMode,
  onRequestDelete,
}: {
  group: { key: string; label: string; items: HistoryEntry[] }
  index: number
  nav: NavFn
  editMode: boolean
  onRequestDelete: (entry: HistoryEntry) => void
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
        {group.items.map((entry, i) =>
          entry.kind === 'athletics' ? (
            <AthleticsRow
              key={entry.id}
              session={entry}
              index={i}
              nav={nav}
              editMode={editMode}
              onDelete={() => onRequestDelete(entry)}
            />
          ) : (
            <SeanceRow
              key={entry.id}
              seance={entry}
              index={i}
              nav={nav}
              editMode={editMode}
              onDelete={() => onRequestDelete(entry)}
            />
          ),
        )}
      </div>
    </motion.section>
  )
}

function DeleteAction({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Supprimer"
      style={{
        appearance: 'none',
        width: 34,
        height: 34,
        borderRadius: 9,
        border: 'none',
        cursor: 'pointer',
        background: hover
          ? 'color-mix(in oklch, var(--danger) 18%, var(--surface))'
          : 'var(--surface)',
        color: 'var(--danger)',
        boxShadow: '0 0 0 1px color-mix(in oklch, var(--danger) 28%, var(--line)) inset',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 140ms',
        flexShrink: 0,
      }}
    >
      <Trash size={15} />
    </button>
  )
}

function SeanceRow({
  seance,
  index,
  nav,
  editMode,
  onDelete,
}: {
  seance: SeanceEntry
  index: number
  nav: NavFn
  editMode: boolean
  onDelete: () => void
}) {
  const reduced = useReducedMotion()
  const type = WORKOUT_TYPES.find((t) => t.id === seance.type)
  return (
    <motion.button
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : 0.04 + index * 0.03, duration: 0.28 }}
      whileTap={reduced || editMode ? undefined : { scale: 0.985 }}
      onClick={
        editMode ? undefined : () => nav('session_detail', { seanceId: seance.id })
      }
      style={{
        appearance: 'none',
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 14px 14px 17px',
        borderRadius: 12,
        border: 'none',
        background: 'var(--surface)',
        // Barre verticale gauche = code couleur du type (accent vert pour muscu)
        // → repérable au scroll sans alourdir la grille visuelle.
        boxShadow: '0 0 0 1px var(--line) inset, inset 3px 0 0 0 var(--accent)',
        cursor: editMode ? 'default' : 'pointer',
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
        {type?.emoji ?? <Dumbbell size={16} />}
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
      {editMode ? (
        <DeleteAction onClick={onDelete} />
      ) : (
        <ChevronRight size={16} color="var(--subtle)" />
      )}
    </motion.button>
  )
}

function AthleticsRow({
  session,
  index,
  nav,
  editMode,
  onDelete,
}: {
  session: AthleticsListItem
  index: number
  nav: NavFn
  editMode: boolean
  onDelete: () => void
}) {
  const reduced = useReducedMotion()
  const runCount = session.runs.length
  const distances = Array.from(new Set(session.runs.map((r) => r.distance_m))).sort(
    (a, b) => a - b,
  )
  const best = session.runs.reduce<Run | null>(
    (b, r) => (!b || r.duration_ms < b.duration_ms ? r : b),
    null,
  )
  return (
    <motion.button
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : 0.04 + index * 0.03, duration: 0.28 }}
      whileTap={reduced || editMode ? undefined : { scale: 0.985 }}
      onClick={
        editMode
          ? undefined
          : () => nav('athletics_summary', { athleticsRunIds: session.runIds })
      }
      style={{
        appearance: 'none',
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 14px 14px 17px',
        borderRadius: 12,
        border: 'none',
        // Fond très légèrement teinté + barre verticale ambre → contraste muscu/athlé
        // immédiat sans casser la cohérence de la liste (même radius, même densité).
        background: 'color-mix(in oklch, var(--warn) 5%, var(--surface))',
        boxShadow:
          '0 0 0 1px color-mix(in oklch, var(--warn) 24%, var(--line)) inset, inset 3px 0 0 0 var(--warn)',
        cursor: editMode ? 'default' : 'pointer',
        fontFamily: 'var(--font)',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'color-mix(in oklch, var(--warn) 20%, var(--surface))',
          color: 'var(--warn)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Timer size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            {formatRowDate(session.date)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            · Athlétisme · {formatRunTime(session.startedAt)}
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--subtle)',
            fontFamily: 'var(--mono)',
            marginTop: 2,
            fontVariantNumeric: 'tabular-nums',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <span>
            {runCount} chrono{runCount > 1 ? 's' : ''} · {distances.map((d) => `${d}m`).join(', ')}
          </span>
          {best && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <span style={{ color: 'var(--subtle)' }}>· top </span>
              <Flame size={9} color="var(--warn)" />
              {formatChrono(best.duration_ms)} ({best.distance_m}m)
            </span>
          )}
          <span style={{ color: 'var(--subtle)' }}>
            · {formatSessionDuration(session.startedAt, session.endedAt)}
          </span>
        </div>
      </div>
      {editMode ? (
        <DeleteAction onClick={onDelete} />
      ) : (
        <ChevronRight size={16} color="var(--subtle)" />
      )}
    </motion.button>
  )
}

function groupByMonth(entries: HistoryEntry[]) {
  const map = new Map<string, { key: string; label: string; items: HistoryEntry[] }>()
  for (const s of entries) {
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
