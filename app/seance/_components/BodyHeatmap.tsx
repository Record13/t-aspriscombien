'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Card, Segmented } from './primitives'
import type { HeatmapData, HeatmapGroup, MuscleGroupKey } from '../_lib/useHeatmap'
import {
  BODY_VIEWBOX,
  FACE_GROUPS,
  BACK_GROUPS,
  FACE_OUTLINE_PATHS,
  BACK_OUTLINE_PATHS,
} from './body-svg/paths'

type View = 'face' | 'back'
const VIEW_STORAGE_KEY = 'tpc.heatmap.view'

const PERIOD_LABEL: Record<string, string> = {
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
  all: 'depuis le début',
}

// MuscleGroupKey → ids MuscleWiki (vue face)
const FACE_MAPPING: Partial<Record<MuscleGroupKey, readonly string[]>> = {
  chest: ['chest'],
  shoulders: ['front-shoulders'],
  traps: ['traps'],
  biceps: ['biceps'],
  forearms: ['forearms'],
  core: ['abdominals', 'obliques'],
  quads: ['quads'],
  calves: ['calves'],
}

// MuscleGroupKey → ids MuscleWiki (vue dos)
const BACK_MAPPING: Partial<Record<MuscleGroupKey, readonly string[]>> = {
  shoulders: ['rear-shoulders'],
  traps: ['traps', 'traps-middle'],
  triceps: ['triceps'],
  forearms: ['forearms'],
  back: ['lats', 'lowerback'],
  glutes: ['glutes'],
  hamstrings: ['hamstrings'],
  calves: ['calves'],
}

const MUSCLE_LABEL: Record<MuscleGroupKey, string> = {
  chest: 'Pectoraux',
  shoulders: 'Épaules',
  back: 'Dos',
  biceps: 'Biceps',
  forearms: 'Avant-bras',
  triceps: 'Triceps',
  quads: 'Quadriceps',
  glutes: 'Fessiers',
  hamstrings: 'Ischio-jambiers',
  calves: 'Mollets',
  traps: 'Trapèzes',
  core: 'Core',
}

// ─── Palette d'intensité : cyan froid → lime chaud ───────────────────
function intensityColor(score: number): string {
  if (score <= 0) return 'var(--surface-2)'
  if (score <= 0.25) return '#164E63'
  if (score <= 0.5) return '#22D3EE'
  if (score <= 0.75) return 'color-mix(in oklch, var(--accent) 60%, var(--bg))'
  return 'var(--accent)'
}

function intensityGlow(score: number): string | undefined {
  if (score > 0.75) {
    return 'drop-shadow(0 0 6px color-mix(in oklch, var(--accent) 55%, transparent))'
  }
  return undefined
}

function intensityLabel(score: number): string {
  if (score <= 0) return 'non travaillé'
  if (score <= 0.25) return 'léger'
  if (score <= 0.5) return 'modéré'
  if (score <= 0.75) return 'solide'
  return 'très chargé'
}

const fmt = (n: number) => n.toLocaleString('fr-FR')

// ─── Composant principal ─────────────────────────────────────────────
export function BodyHeatmap({
  data,
  loading,
  period,
}: {
  data: HeatmapData | null
  loading: boolean
  period: string
}) {
  const reduced = useReducedMotion()
  const [view, setView] = useState<View>('face')
  const [activeGroup, setActiveGroup] = useState<MuscleGroupKey | null>(null)

  // Restaure le dernier choix face/dos. localStorage n'est accessible qu'après hydration ;
  // mêmes pattern et trade-off que app/seance/_lib/prefs.ts:49.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === 'face' || saved === 'back') setView(saved)
  }, [])

  const handleViewChange = (v: View) => {
    setView(v)
    setActiveGroup(null)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, v)
    }
  }

  const { scoreMap, groupMap } = useMemo(() => {
    const sm: Partial<Record<MuscleGroupKey, number>> = {}
    const gm: Partial<Record<MuscleGroupKey, HeatmapGroup>> = {}
    if (data && data.maxVolume > 0) {
      for (const g of data.groups) {
        sm[g.groupKey] = g.volume / data.maxVolume
        gm[g.groupKey] = g
      }
    } else if (data) {
      for (const g of data.groups) {
        sm[g.groupKey] = 0
        gm[g.groupKey] = g
      }
    }
    return { scoreMap: sm, groupMap: gm }
  }, [data])

  const activeData = activeGroup ? groupMap[activeGroup] : null

  return (
    <Card style={{ padding: 16 }}>
      <Header period={period} />

      <div style={{ marginTop: 14 }}>
        <Segmented<View>
          options={[
            { value: 'face', label: 'Face' },
            { value: 'back', label: 'Dos' },
          ]}
          value={view}
          onChange={handleViewChange}
        />
      </div>

      <div
        style={{
          position: 'relative',
          marginTop: 14,
          display: 'flex',
          justifyContent: 'center',
          minHeight: 380,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={reduced ? false : { opacity: 0, x: view === 'face' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: view === 'face' ? 10 : -10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <BodyView
              view={view}
              loading={loading}
              scoreMap={scoreMap}
              activeGroup={activeGroup}
              onSelect={setActiveGroup}
              reduced={reduced ?? false}
            />
          </motion.div>
        </AnimatePresence>

        {/* Popover muscle */}
        <AnimatePresence>
          {activeData && (
            <MusclePopover
              data={activeData}
              score={scoreMap[activeData.groupKey] ?? 0}
              onClose={() => setActiveGroup(null)}
            />
          )}
        </AnimatePresence>
      </div>

      <Legend />

      {/* Description accessible pour les lecteurs d'écran */}
      <p
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {summarize(data, view)}
      </p>
    </Card>
  )
}

// ─── Header (titre + période) ────────────────────────────────────────
function Header({ period }: { period: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        Heatmap corporelle
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--subtle)',
          fontFamily: 'var(--mono)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {PERIOD_LABEL[period] ?? period}
      </div>
    </div>
  )
}

// ─── SVG corps ───────────────────────────────────────────────────────
function BodyView({
  view,
  loading,
  scoreMap,
  activeGroup,
  onSelect,
  reduced,
}: {
  view: View
  loading: boolean
  scoreMap: Partial<Record<MuscleGroupKey, number>>
  activeGroup: MuscleGroupKey | null
  onSelect: (g: MuscleGroupKey | null) => void
  reduced: boolean
}) {
  const mapping = view === 'face' ? FACE_MAPPING : BACK_MAPPING
  const groups = view === 'face' ? FACE_GROUPS : BACK_GROUPS
  const outline = view === 'face' ? FACE_OUTLINE_PATHS : BACK_OUTLINE_PATHS

  return (
    <svg
      viewBox={BODY_VIEWBOX}
      width="100%"
      style={{ display: 'block', maxHeight: 440, maxWidth: 260 }}
      role="img"
      aria-label={view === 'face' ? 'Vue face du corps' : 'Vue dos du corps'}
    >
      {/* Contours anatomiques (lignes de définition musculaire) */}
      <g aria-hidden="true" pointerEvents="none">
        {outline.map((d, i) => (
          <path
            key={`outline-${view}-${i}`}
            d={d}
            fill="none"
            stroke="var(--line)"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.55}
          />
        ))}
      </g>

      {/* Groupes musculaires interactifs */}
      {(Object.entries(mapping) as Array<[MuscleGroupKey, readonly string[]]>).map(
        ([ourKey, mwIds], i) => {
          const score = loading ? 0 : scoreMap[ourKey] ?? 0
          const isActive = activeGroup === ourKey
          const paths = mwIds.flatMap((id) => groups[id] ?? [])
          if (paths.length === 0) return null
          return (
            <MuscleGroupZone
              key={`${view}-${ourKey}`}
              ourKey={ourKey}
              paths={paths}
              score={score}
              loading={loading}
              isActive={isActive}
              index={i}
              reduced={reduced}
              onSelect={() => onSelect(isActive ? null : ourKey)}
            />
          )
        },
      )}
    </svg>
  )
}

// ─── Groupe musculaire interactif ────────────────────────────────────
function MuscleGroupZone({
  ourKey,
  paths,
  score,
  loading,
  isActive,
  index,
  reduced,
  onSelect,
}: {
  ourKey: MuscleGroupKey
  paths: string[]
  score: number
  loading: boolean
  isActive: boolean
  index: number
  reduced: boolean
  onSelect: () => void
}) {
  const fill = intensityColor(score)
  const filter = intensityGlow(score)

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${MUSCLE_LABEL[ourKey]}, intensité ${intensityLabel(score)}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      style={{ cursor: 'pointer', outline: 'none' }}
    >
      {paths.map((d, i) => (
        <motion.path
          key={`${ourKey}-${i}`}
          d={d}
          initial={reduced || loading ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: reduced ? 0 : 0.04 + index * 0.03,
            duration: 0.32,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            fill,
            filter,
            transition: 'fill 280ms cubic-bezier(0.22, 1, 0.36, 1), filter 280ms',
          }}
          stroke={isActive ? 'var(--ink)' : 'transparent'}
          strokeWidth={isActive ? 2.5 : 0}
        />
      ))}
    </g>
  )
}

// ─── Popover muscle (au tap) ─────────────────────────────────────────
function MusclePopover({
  data,
  score,
  onClose,
}: {
  data: HeatmapGroup
  score: number
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  // Fermeture au clic extérieur
  useEffect(() => {
    const handler = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const t = window.setTimeout(() => {
      window.addEventListener('mousedown', handler)
      window.addEventListener('touchstart', handler)
    }, 50)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('touchstart', handler)
    }
  }, [onClose])

  // Fermeture à Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label={data.label}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        background: 'var(--surface-2)',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: '0 0 0 1px var(--line) inset, 0 10px 28px -10px rgba(0,0,0,0.6)',
        zIndex: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{data.label}</div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '0 7px',
            height: 18,
            borderRadius: 999,
            background: intensityColor(score),
            color: score > 0.5 ? 'var(--accent-ink)' : 'var(--ink)',
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'lowercase',
            letterSpacing: 0.2,
          }}
        >
          {intensityLabel(score)}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 14,
          marginTop: 8,
          fontSize: 11,
          color: 'var(--muted)',
          fontFamily: 'var(--mono)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>
          <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{fmt(data.volume)}</span>
          <span style={{ marginLeft: 3 }}>kg</span>
        </span>
        <span>
          <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{data.series}</span>
          <span style={{ marginLeft: 3 }}>{data.series > 1 ? 'séries' : 'série'}</span>
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--subtle)' }}>
          {data.lastSessionDaysAgo == null
            ? 'jamais'
            : data.lastSessionDaysAgo === 0
              ? 'aujourd’hui'
              : `il y a ${data.lastSessionDaysAgo} j`}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Légende ─────────────────────────────────────────────────────────
function Legend() {
  const stops = [0, 0.2, 0.4, 0.65, 1]
  return (
    <div
      style={{
        marginTop: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
      aria-hidden
    >
      <span style={{ fontSize: 10, color: 'var(--subtle)', fontFamily: 'var(--mono)' }}>peu</span>
      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {stops.map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 10,
              borderRadius: 3,
              background: intensityColor(s),
              filter: intensityGlow(s),
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 10, color: 'var(--subtle)', fontFamily: 'var(--mono)' }}>max</span>
    </div>
  )
}

// ─── Résumé textuel pour lecteurs d'écran ────────────────────────────
function summarize(data: HeatmapData | null, view: View): string {
  if (!data) return 'Heatmap : chargement.'
  const trained = data.groups.filter((g) => g.volume > 0).length
  const total = data.groups.length
  const top = [...data.groups].sort((a, b) => b.volume - a.volume).slice(0, 3)
  const topText = top
    .filter((g) => g.volume > 0)
    .map((g) => g.label)
    .join(', ')
  const viewLabel = view === 'face' ? 'face' : 'dos'
  if (trained === 0)
    return `Heatmap vue ${viewLabel} : aucun groupe musculaire travaillé sur la période.`
  return `Heatmap vue ${viewLabel} : ${trained} groupes sur ${total} travaillés. Plus chargés : ${topText}.`
}
