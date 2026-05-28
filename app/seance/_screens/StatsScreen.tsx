'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, animate, useReducedMotion } from 'motion/react'
import type { NavFn, Run, SessionState } from '../_lib/types'
import {
  useDashboard,
  type DashboardData,
  type DistributionItem,
  type TopExo,
  type BlindSpot,
  type RecentPR,
  type Period,
} from '../_lib/useDashboard'
import { Card, IconButton, Pill, TopBar } from '../_components/primitives'
import { ChevronLeft, ChevronRight, Dumbbell, Flame, Timer } from '../_components/icons'
import { BodyHeatmap } from '../_components/BodyHeatmap'
import { HorizontalCardScroll } from '../_components/HorizontalCardScroll'
import { useHeatmap } from '../_lib/useHeatmap'
import { useRuns } from '../_lib/useRuns'
import { formatChrono, formatRunDate, groupRunsIntoSessions } from '../_lib/runs'

type Props = {
  session: SessionState
  nav: NavFn
}

type Scope = 'global' | 'muscu' | 'athle'

const PERIODS: { id: Period; label: string }[] = [
  { id: '7d', label: '7j' },
  { id: '30d', label: '30j' },
  { id: '90d', label: '90j' },
  { id: 'all', label: 'Tout' },
]

const SCOPES: { id: Scope; label: string; accent: string }[] = [
  { id: 'global', label: 'Global', accent: 'var(--ink)' },
  { id: 'muscu', label: 'Muscu', accent: 'var(--accent)' },
  { id: 'athle', label: 'Athlé', accent: 'var(--warn)' },
]

const TYPE_COLOR: Record<string, string> = {
  push: 'var(--accent)',
  pull: '#67E8F9',
  legs: '#FBBF24',
  full: '#A78BFA',
  upper: '#F472B6',
  core: 'var(--ink-2)',
}

const fmt = (n: number) => n.toLocaleString('fr-FR')

// Filtre les runs côté client par période — l'API runs ne supporte pas le filtre
// de période, donc on l'applique ici pour rester cohérent avec le dashboard muscu.
function filterRunsByPeriod(runs: Run[], period: Period): Run[] {
  if (period === 'all') return runs
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - days + 1)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return runs.filter((r) => r.date >= cutoffStr)
}

export function StatsScreen({ nav }: Props) {
  const [scope, setScope] = useState<Scope>('global')
  const [period, setPeriod] = useState<Period>('7d')
  const { data, loading } = useDashboard(period)
  const { data: heatmap, loading: heatmapLoading } = useHeatmap(period)
  const { runs, loading: runsLoading } = useRuns()
  const reduced = useReducedMotion()

  const periodRuns = useMemo(() => filterRunsByPeriod(runs, period), [runs, period])

  const subtitle = useMemo(() => {
    if (loading || runsLoading) return '…'
    const periodLabel = period === 'all' ? 'tout' : PERIODS.find((p) => p.id === period)?.label
    if (scope === 'muscu') {
      const n = data?.hero.seances ?? 0
      return `${n} séance${n > 1 ? 's' : ''} · ${periodLabel}`
    }
    if (scope === 'athle') {
      const n = periodRuns.length
      return `${n} chrono${n > 1 ? 's' : ''} · ${periodLabel}`
    }
    const muscu = data?.hero.seances ?? 0
    const athle = groupRunsIntoSessions(periodRuns).length
    return `${muscu + athle} séance${muscu + athle > 1 ? 's' : ''} · ${periodLabel}`
  }, [scope, period, data, periodRuns, loading, runsLoading])

  return (
    <div className="app-scroll" style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <TopBar
        leading={
          <IconButton
            icon={<ChevronLeft size={18} />}
            label="retour"
            onClick={() => nav('idle')}
          />
        }
        title="Statistiques"
        subtitle={subtitle}
      />

      <div style={{ padding: '4px 20px 30px' }}>
        <ScopeTabs value={scope} onChange={setScope} />
        <PeriodSwitch value={period} onChange={setPeriod} />

        <AnimatePresence mode="wait">
          <motion.div
            key={scope + period}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {scope === 'global' && (
              <GlobalView
                data={data}
                runs={periodRuns}
                loading={loading || runsLoading}
                onSwitch={setScope}
                period={period}
              />
            )}
            {scope === 'muscu' && (
              <MuscuView
                data={data}
                loading={loading}
                heatmap={heatmap}
                heatmapLoading={heatmapLoading}
                period={period}
              />
            )}
            {scope === 'athle' && (
              <AthleView
                periodRuns={periodRuns}
                allRuns={runs}
                loading={runsLoading}
                period={period}
                onStart={() => nav('athletics')}
                onOpenSession={(runIds) =>
                  nav('athletics_summary', { athleticsRunIds: runIds })
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ───────────────────────── Scope tabs ─────────────────────────
function ScopeTabs({ value, onChange }: { value: Scope; onChange: (s: Scope) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Catégorie de statistiques"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 4,
        padding: 4,
        background: 'var(--surface)',
        borderRadius: 12,
        boxShadow: '0 0 0 1px var(--line) inset',
        marginTop: 6,
      }}
    >
      {SCOPES.map((s) => {
        const active = value === s.id
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s.id)}
            style={{
              position: 'relative',
              height: 38,
              border: 'none',
              borderRadius: 8,
              background: 'transparent',
              color: active ? s.accent : 'var(--muted)',
              fontWeight: 600,
              fontSize: 13,
              fontFamily: 'var(--font)',
              letterSpacing: -0.1,
              cursor: 'pointer',
            }}
          >
            {active && (
              <motion.span
                layoutId="scope-pill"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  boxShadow: `0 0 0 1px color-mix(in oklch, ${s.accent} 40%, var(--line)) inset`,
                  zIndex: 0,
                }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ───────────────────────── Period switch ─────────────────────────
function PeriodSwitch({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Période"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 4,
        padding: 4,
        background: 'var(--surface)',
        borderRadius: 12,
        boxShadow: '0 0 0 1px var(--line) inset',
        marginTop: 8,
      }}
    >
      {PERIODS.map((p) => {
        const active = value === p.id
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p.id)}
            style={{
              position: 'relative',
              height: 34,
              border: 'none',
              borderRadius: 8,
              background: 'transparent',
              color: active ? 'var(--ink)' : 'var(--muted)',
              fontWeight: 600,
              fontSize: 12,
              fontFamily: 'var(--font)',
              letterSpacing: -0.1,
              cursor: 'pointer',
            }}
          >
            {active && (
              <motion.span
                layoutId="period-pill"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  boxShadow: '0 0 0 1px var(--line) inset',
                  zIndex: 0,
                }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>{p.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL VIEW
// ═══════════════════════════════════════════════════════════════════
function GlobalView({
  data,
  runs,
  loading,
  onSwitch,
  period,
}: {
  data: DashboardData | null
  runs: Run[]
  loading: boolean
  onSwitch: (s: Scope) => void
  period: Period
}) {
  const muscuSeances = data?.hero.seances ?? 0
  const muscuVolume = data?.hero.volume ?? 0
  const muscuSeries = data?.hero.series ?? 0
  const athleSessions = useMemo(() => groupRunsIntoSessions(runs), [runs])
  const athleCount = athleSessions.length
  const chronoCount = runs.length
  const totalSeances = muscuSeances + athleCount

  // Meilleure perf athlé sur la période (vitesse m/s la plus haute parmi les bests par distance).
  const bestAthle = useMemo(() => {
    const byDist = new Map<number, Run>()
    for (const r of runs) {
      const cur = byDist.get(r.distance_m)
      if (!cur || r.duration_ms < cur.duration_ms) byDist.set(r.distance_m, r)
    }
    let best: Run | null = null
    let bestSpeed = 0
    for (const r of byDist.values()) {
      const speed = r.distance_m / (r.duration_ms / 1000)
      if (speed > bestSpeed) {
        bestSpeed = speed
        best = r
      }
    }
    return best
  }, [runs])

  return (
    <div style={{ marginTop: 16 }}>
      {/* Hero combiné */}
      <div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            fontWeight: 500,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}
        >
          Activité {period === 'all' ? 'cumulée' : `· ${PERIODS.find((p) => p.id === period)?.label}`}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: -1.6,
              lineHeight: 1,
              color: 'var(--ink)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {loading ? '…' : <CountUp value={totalSeances} />}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--subtle)' }}>
            séance{totalSeances > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Carte par catégorie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        <ScopeCard
          tone="muscu"
          icon={<Dumbbell size={16} />}
          label="Muscu"
          primary={loading ? '…' : `${fmt(muscuVolume)} kg`}
          secondary={`${muscuSeances} séance${muscuSeances > 1 ? 's' : ''} · ${muscuSeries} série${muscuSeries > 1 ? 's' : ''}`}
          onClick={() => onSwitch('muscu')}
        />
        <ScopeCard
          tone="athle"
          icon={<Timer size={16} />}
          label="Athlé"
          primary={loading ? '…' : bestAthle ? formatChrono(bestAthle.duration_ms) : '—'}
          secondary={
            bestAthle
              ? `${chronoCount} chrono${chronoCount > 1 ? 's' : ''} · top ${bestAthle.distance_m}m`
              : `${chronoCount} chrono${chronoCount > 1 ? 's' : ''}`
          }
          onClick={() => onSwitch('athle')}
        />
      </div>

      {/* Sparkline volume 12 sem. — vue d'ensemble */}
      <Section index={1}>
        <SectionTitle>Évolution muscu · 12 semaines</SectionTitle>
        <Card style={{ padding: '14px 14px 10px' }}>
          <Sparkline12w points={data?.hero.sparkline12w ?? []} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
              fontSize: 10,
              color: 'var(--subtle)',
              fontFamily: 'var(--mono)',
            }}
          >
            <span>12 sem</span>
            <span>maintenant</span>
          </div>
        </Card>
      </Section>

      {/* Comparatif rapide */}
      <Section index={2}>
        <SectionTitle>Répartition de la période</SectionTitle>
        <Card style={{ padding: 16 }}>
          <RatioBar muscuCount={muscuSeances} athleCount={athleCount} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 12,
              fontSize: 11,
              color: 'var(--muted)',
              fontFamily: 'var(--mono)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Dot color="var(--accent)" />
              Muscu · {muscuSeances}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Dot color="var(--warn)" />
              Athlé · {athleCount}
            </span>
          </div>
        </Card>
      </Section>
    </div>
  )
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: color,
        display: 'inline-block',
      }}
    />
  )
}

function RatioBar({ muscuCount, athleCount }: { muscuCount: number; athleCount: number }) {
  const total = muscuCount + athleCount
  if (total === 0) {
    return (
      <div
        style={{
          height: 12,
          borderRadius: 6,
          background: 'var(--line)',
          fontSize: 11,
          color: 'var(--subtle)',
          fontFamily: 'var(--mono)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Pas d&apos;activité sur cette période.
      </div>
    )
  }
  const muscuPct = Math.round((muscuCount / total) * 100)
  const athlePct = 100 - muscuPct
  return (
    <div
      style={{
        height: 12,
        borderRadius: 6,
        background: 'var(--line)',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${muscuPct}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: 'var(--accent)', height: '100%' }}
      />
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${athlePct}%` }}
        transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: 'var(--warn)', height: '100%' }}
      />
    </div>
  )
}

function ScopeCard({
  tone,
  icon,
  label,
  primary,
  secondary,
  onClick,
}: {
  tone: 'muscu' | 'athle'
  icon: React.ReactNode
  label: string
  primary: string
  secondary: string
  onClick: () => void
}) {
  const color = tone === 'muscu' ? 'var(--accent)' : 'var(--warn)'
  const bg = tone === 'muscu' ? 'var(--accent-soft)' : 'color-mix(in oklch, var(--warn) 12%, var(--surface))'
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{
        appearance: 'none',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        padding: 14,
        borderRadius: 14,
        background: 'var(--surface)',
        boxShadow: `0 0 0 1px var(--line) inset, inset 3px 0 0 0 ${color}`,
        fontFamily: 'var(--font)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 96,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color,
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <ChevronRight size={14} color="var(--subtle)" />
      </div>
      <div>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: -0.6,
            color: 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {primary}
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
          {secondary}
        </div>
      </div>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MUSCU VIEW (ancien contenu, sans SprintsBlock)
// ═══════════════════════════════════════════════════════════════════
function MuscuView({
  data,
  loading,
  heatmap,
  heatmapLoading,
  period,
}: {
  data: DashboardData | null
  loading: boolean
  heatmap: ReturnType<typeof useHeatmap>['data']
  heatmapLoading: boolean
  period: Period
}) {
  return (
    <>
      <Section index={0}>
        <Hero data={data} loading={loading} period={period} />
      </Section>

      <Section index={1}>
        <SectionTitle>Répartition</SectionTitle>
        <HorizontalCardScroll
          slides={[
            {
              id: 'heatmap',
              label: 'Vue corporelle',
              content: (
                <BodyHeatmap data={heatmap} loading={heatmapLoading} period={period} />
              ),
            },
            {
              id: 'donut',
              label: 'Par type de séance',
              content: (
                <DistributionCard items={data?.distribution ?? []} loading={loading} />
              ),
            },
          ]}
        />
      </Section>

      <Section index={2}>
        <TopExosBlock items={data?.topExos ?? []} loading={loading} />
      </Section>

      <Section index={3}>
        <BlindSpotsBlock items={data?.blindSpots ?? []} loading={loading} />
      </Section>

      <Section index={4}>
        <RecentPrsBlock items={data?.recentPrs ?? []} loading={loading} />
      </Section>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ATHLÉ VIEW
// ═══════════════════════════════════════════════════════════════════
function AthleView({
  periodRuns,
  allRuns,
  loading,
  period,
  onStart,
  onOpenSession,
}: {
  periodRuns: Run[]
  // allRuns sert au calcul des PR « tous temps » même si la période est restreinte.
  allRuns: Run[]
  loading: boolean
  period: Period
  onStart: () => void
  onOpenSession: (runIds: string[]) => void
}) {
  const sessions = useMemo(() => groupRunsIntoSessions(periodRuns), [periodRuns])

  // PRs par distance — toujours basés sur l'historique complet, pas la période,
  // car un PR est un record absolu, indépendant de la fenêtre temporelle.
  const prByDistance = useMemo(() => {
    const map = new Map<number, Run>()
    for (const r of allRuns) {
      const cur = map.get(r.distance_m)
      if (!cur || r.duration_ms < cur.duration_ms) map.set(r.distance_m, r)
    }
    return Array.from(map.values()).sort((a, b) => a.distance_m - b.distance_m)
  }, [allRuns])

  const bestOverall = useMemo(() => {
    let best: Run | null = null
    let bestSpeed = 0
    for (const r of prByDistance) {
      const speed = r.distance_m / (r.duration_ms / 1000)
      if (speed > bestSpeed) {
        bestSpeed = speed
        best = r
      }
    }
    return best
  }, [prByDistance])

  // PRs battus pendant la période ? On les marque pour mettre un Flame.
  const prsBeatenInPeriod = useMemo(() => {
    const set = new Set<string>()
    if (period === 'all') return set
    // Pour chaque distance, regarde si le PR (le plus rapide de l'historique)
    // tombe dans la fenêtre période → c'est un PR battu récemment.
    for (const pr of prByDistance) {
      if (periodRuns.some((r) => r.id === pr.id)) set.add(pr.id)
    }
    return set
  }, [prByDistance, periodRuns, period])

  const periodLabel = period === 'all' ? 'tout' : PERIODS.find((p) => p.id === period)?.label
  const chronoCount = periodRuns.length

  if (loading) {
    return (
      <div style={{ marginTop: 24 }}>
        <EmptyLine label="Chargement…" />
      </div>
    )
  }

  if (allRuns.length === 0) {
    return (
      <div style={{ marginTop: 22 }}>
        <Card style={{ padding: 22 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'color-mix(in oklch, var(--warn) 16%, var(--surface))',
                color: 'var(--warn)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Timer size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                Aucun chrono pour l&apos;instant
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  marginTop: 4,
                  lineHeight: 1.5,
                  maxWidth: 280,
                }}
              >
                Lance une séance athlétisme depuis l&apos;accueil pour enregistrer ton premier
                chrono.
              </div>
            </div>
            <button
              type="button"
              onClick={onStart}
              style={{
                marginTop: 4,
                appearance: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '10px 16px',
                borderRadius: 999,
                background: 'var(--warn)',
                color: 'var(--bg)',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'var(--font)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Timer size={14} />
              Démarrer une séance athlé
            </button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* Hero athlé : meilleure performance + volume */}
      <Section index={0}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            fontWeight: 500,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}
        >
          Meilleure perf · {periodLabel}
        </div>
        {bestOverall ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 44,
                fontWeight: 600,
                letterSpacing: -1.6,
                lineHeight: 1,
                color: 'var(--warn)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatChrono(bestOverall.duration_ms)}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--warn)' }}>
              {bestOverall.distance_m}m
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Pas de chrono sur cette période.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
          <MicroStat label="Chronos" value={String(chronoCount)} />
          <MicroStat label="Séances" value={String(sessions.length)} />
          <MicroStat label="Distances" value={String(new Set(periodRuns.map((r) => r.distance_m)).size)} />
        </div>
      </Section>

      {/* PRs par distance */}
      <Section index={1}>
        <SectionTitle>Records par distance</SectionTitle>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {prByDistance.length === 0 ? (
            <EmptyLine label="Pas encore de chrono." />
          ) : (
            prByDistance.map((pr, i) => {
              const beatenInPeriod = prsBeatenInPeriod.has(pr.id)
              return (
                <motion.div
                  key={pr.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04, duration: 0.3 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-2)',
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 30,
                      borderRadius: 8,
                      background: beatenInPeriod
                        ? 'color-mix(in oklch, var(--warn) 20%, var(--surface))'
                        : 'var(--surface-2)',
                      color: beatenInPeriod ? 'var(--warn)' : 'var(--ink-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--mono)',
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {pr.distance_m}m
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'var(--ink)',
                        letterSpacing: -0.4,
                        fontVariantNumeric: 'tabular-nums',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {formatChrono(pr.duration_ms)}
                      {beatenInPeriod && (
                        <Pill tone="warn" icon={<Flame size={9} />}>
                          NEW
                        </Pill>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--subtle)',
                        fontFamily: 'var(--mono)',
                        marginTop: 2,
                      }}
                    >
                      {(pr.distance_m / (pr.duration_ms / 1000)).toFixed(2)} m/s ·{' '}
                      {formatRunDate(pr.date)}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </Card>
      </Section>

      {/* Récentes séances athlé */}
      <Section index={2}>
        <SectionTitle>Séances récentes</SectionTitle>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {sessions.length === 0 ? (
            <EmptyLine label="Aucune séance athlé sur cette période." />
          ) : (
            sessions.slice(0, 6).map((s, i) => {
              const best = s.runs.reduce<Run | null>(
                (b, r) => (!b || r.duration_ms < b.duration_ms ? r : b),
                null,
              )
              const distances = Array.from(new Set(s.runs.map((r) => r.distance_m))).sort(
                (a, b) => a - b,
              )
              return (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04, duration: 0.3 }}
                  onClick={() => onOpenSession(s.runs.map((r) => r.id))}
                  style={{
                    appearance: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-2)',
                    fontFamily: 'var(--font)',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: 'color-mix(in oklch, var(--warn) 14%, var(--surface))',
                      color: 'var(--warn)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Timer size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      {formatRunDate(s.date)}
                      <span style={{ color: 'var(--subtle)', fontWeight: 500, marginLeft: 6 }}>
                        · {s.runs.length} chrono{s.runs.length > 1 ? 's' : ''}
                      </span>
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
                      {distances.map((d) => `${d}m`).join(' · ')}
                      {best && ` · top ${formatChrono(best.duration_ms)} (${best.distance_m}m)`}
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--subtle)" />
                </motion.button>
              )
            })
          )}
        </Card>
      </Section>
    </div>
  )
}

// ───────────────────────── Section wrapper ─────────────────────────
function Section({ index, children }: { index: number; children: React.ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: reduced ? 0 : 0.05 + index * 0.06,
        duration: 0.36,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{ marginTop: index === 0 ? 16 : 22 }}
    >
      {children}
    </motion.section>
  )
}

// ───────────────────────── Hero ─────────────────────────
function Hero({
  data,
  loading,
  period,
}: {
  data: DashboardData | null
  loading: boolean
  period: Period
}) {
  const volume = data?.hero.volume ?? 0
  const prev = data?.hero.volumePrev
  const trend = useMemo(() => {
    if (prev == null || prev === 0) return null
    return Math.round(((volume - prev) / prev) * 100)
  }, [volume, prev])

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          fontWeight: 500,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        Volume {period === 'all' ? 'cumulé' : `· ${PERIODS.find((p) => p.id === period)?.label}`}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: -1.6,
            lineHeight: 1,
            color: 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {loading ? '…' : <CountUp value={volume} />}
        </span>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 14,
            color: 'var(--subtle)',
          }}
        >
          kg
        </span>
      </div>
      {trend !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          style={{
            marginTop: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: trend >= 0 ? 'var(--accent)' : 'var(--danger, #F87171)',
            fontFamily: 'var(--mono)',
            fontWeight: 600,
          }}
        >
          <span>{trend >= 0 ? '↑' : '↓'}</span>
          <span>
            {trend >= 0 ? '+' : ''}
            {trend}%
          </span>
          <span style={{ color: 'var(--subtle)', fontWeight: 500 }}>vs période -1</span>
        </motion.div>
      )}
      <Card style={{ padding: '14px 14px 8px', marginTop: 14 }}>
        <Sparkline12w points={data?.hero.sparkline12w ?? []} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontSize: 10,
            color: 'var(--subtle)',
            fontFamily: 'var(--mono)',
          }}
        >
          <span>12 sem</span>
          <span>maintenant</span>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
        <MicroStat label="Séances" value={loading ? '…' : String(data?.hero.seances ?? 0)} />
        <MicroStat label="Séries" value={loading ? '…' : String(data?.hero.series ?? 0)} />
        <MicroStat
          label="Charge moy."
          value={loading ? '…' : `${data?.hero.avgLoad ?? 0} kg`}
        />
      </div>
    </div>
  )
}

function MicroStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--surface)',
        borderRadius: 10,
        boxShadow: '0 0 0 1px var(--line) inset',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'var(--muted)',
          fontWeight: 500,
          letterSpacing: 0.2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: -0.4,
          marginTop: 2,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  useEffect(() => {
    if (reduced) {
      // Reduced-motion path : pas d'animation, on saute direct à la valeur cible.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [value, reduced])
  return <>{fmt(Math.round(display))}</>
}

function Sparkline12w({ points }: { points: number[] }) {
  const reduced = useReducedMotion()
  if (points.length < 2 || points.every((p) => p === 0)) {
    return (
      <div
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: 'var(--subtle)',
          fontFamily: 'var(--mono)',
        }}
      >
        Pas encore assez de données.
      </div>
    )
  }
  const max = Math.max(...points, 1)
  const W = 320
  const H = 48
  const step = W / (points.length - 1)
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${H - (p / max) * (H - 6) - 3}`)
    .join(' ')
  const fillD = `${d} L ${W} ${H} L 0 ${H} Z`
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="spark12-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={fillD}
        fill="url(#spark12-fill)"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

// ───────────────────────── Distribution donut ─────────────────────────
function DistributionCard({
  items,
  loading,
}: {
  items: DistributionItem[]
  loading: boolean
}) {
  return (
    <Card style={{ padding: 16 }}>
      {loading ? (
        <EmptyLine label="…" />
      ) : items.length === 0 ? (
        <EmptyLine label="Pas de séance sur cette période." />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Donut items={items} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((d, i) => (
              <motion.div
                key={d.type}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + i * 0.05, duration: 0.32 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: TYPE_COLOR[d.type] ?? 'var(--muted)',
                    flexShrink: 0,
                  }}
                  aria-hidden
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                    {d.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--subtle)',
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    {d.seances} séance{d.seances > 1 ? 's' : ''}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink-2)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {d.percent}%
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function Donut({ items }: { items: DistributionItem[] }) {
  const reduced = useReducedMotion()
  const R = 38
  const STROKE = 14
  const C = 2 * Math.PI * R
  const total = items.reduce((a, b) => a + b.volume, 0) || 1
  // Précalcul des offsets cumulés via reduce immuable —
  // ESLint react-hooks/immutability interdit la mutation d'une variable locale pendant le render.
  const segments = items.map((d) => ({ d, segLen: (d.volume / total) * C }))
  const offsets = segments.reduce<number[]>((acc, s, i) => {
    const prevSum = i === 0 ? 0 : acc[i - 1] + segments[i - 1].segLen
    acc.push(-prevSum)
    return acc
  }, [])
  return (
    <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
      <svg width={100} height={100} viewBox="0 0 100 100" aria-hidden>
        <circle
          cx={50}
          cy={50}
          r={R}
          fill="none"
          stroke="var(--line)"
          strokeWidth={STROKE}
        />
        {segments.map(({ d, segLen }, i) => {
          const offset = offsets[i]
          return (
            <motion.circle
              key={d.type}
              cx={50}
              cy={50}
              r={R}
              fill="none"
              stroke={TYPE_COLOR[d.type] ?? 'var(--muted)'}
              strokeWidth={STROKE}
              strokeDasharray={`${segLen} ${C}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              transform="rotate(-90 50 50)"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
            />
          )
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {items.reduce((a, b) => a + b.seances, 0)}
        </div>
        <div style={{ fontSize: 9, color: 'var(--subtle)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          séances
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── Top exos ─────────────────────────
function TopExosBlock({ items, loading }: { items: TopExo[]; loading: boolean }) {
  return (
    <div>
      <SectionTitle>Exos vedettes</SectionTitle>
      <Card style={{ padding: 0 }}>
        {loading ? (
          <EmptyLine label="…" />
        ) : items.length === 0 ? (
          <EmptyLine label="Aucun exercice sur cette période." />
        ) : (
          items.map((exo, i) => (
            <motion.div
              key={exo.nom}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.05, duration: 0.32 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line-2)',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: 'var(--surface-2)',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={exo.nom}
                >
                  {exo.nom}
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
                  {fmt(exo.volume)} kg
                  {exo.trendPct !== null && (
                    <>
                      {' · '}
                      <span
                        style={{
                          color:
                            exo.trendPct > 0
                              ? 'var(--accent)'
                              : exo.trendPct < 0
                                ? 'var(--danger, #F87171)'
                                : 'var(--subtle)',
                          fontWeight: 600,
                        }}
                      >
                        {exo.trendPct > 0 ? '↑' : exo.trendPct < 0 ? '↓' : '='}
                        {exo.trendPct > 0 ? '+' : ''}
                        {exo.trendPct}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              <MiniSpark points={exo.sparkline} />
            </motion.div>
          ))
        )}
      </Card>
    </div>
  )
}

function MiniSpark({ points }: { points: number[] }) {
  const reduced = useReducedMotion()
  if (points.length < 2 || points.every((p) => p === 0)) {
    return <div style={{ width: 64, height: 22, opacity: 0.25, background: 'var(--line)', borderRadius: 3 }} aria-hidden />
  }
  const max = Math.max(...points, 1)
  const W = 64
  const H = 22
  const step = W / (points.length - 1)
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${H - (p / max) * (H - 4) - 2}`)
    .join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden style={{ flexShrink: 0 }}>
      <motion.path
        d={d}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

// ───────────────────────── Blind spots ─────────────────────────
function BlindSpotsBlock({
  items,
  loading,
}: {
  items: BlindSpot[]
  loading: boolean
}) {
  const filtered = useMemo(() => {
    return items
      .map((b) => ({ ...b, _key: b.daysSince == null ? 1e9 : b.daysSince }))
      .filter((b) => b.daysSince == null || b.daysSince >= 7)
      .sort((a, b) => b._key - a._key)
  }, [items])

  return (
    <div>
      <SectionTitle>Angles morts</SectionTitle>
      <Card style={{ padding: 0 }}>
        {loading ? (
          <EmptyLine label="…" />
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: '14px 14px',
              fontSize: 12,
              color: 'var(--muted)',
              fontFamily: 'var(--mono)',
            }}
          >
            Rien à signaler. Tout a été vu récemment.
          </div>
        ) : (
          filtered.map((b, i) => (
            <motion.div
              key={b.type}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.32 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line-2)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background:
                    b.daysSince == null || b.daysSince >= 21
                      ? '#F87171'
                      : b.daysSince >= 14
                        ? '#FBBF24'
                        : 'var(--muted)',
                  flexShrink: 0,
                }}
                aria-hidden
              />
              <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                {b.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  color: 'var(--muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {b.daysSince == null ? 'jamais' : `${b.daysSince} j`}
              </div>
            </motion.div>
          ))
        )}
      </Card>
    </div>
  )
}

// ───────────────────────── Recent PRs ─────────────────────────
function RecentPrsBlock({ items, loading }: { items: RecentPR[]; loading: boolean }) {
  return (
    <div>
      <SectionTitle>Records récents</SectionTitle>
      {loading ? (
        <Card style={{ padding: 14 }}>
          <EmptyLine label="…" />
        </Card>
      ) : items.length === 0 ? (
        <Card style={{ padding: 18 }}>
          <div
            style={{
              fontSize: 13,
              color: 'var(--muted)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Aucun record encore. Enregistre quelques séances pour voir tes PRs.
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {items.map((pr, i) => (
            <motion.div
              key={pr.nom}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.32 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line-2)',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Flame size={13} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={pr.nom}
                >
                  {pr.nom}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    fontFamily: 'var(--mono)',
                    marginTop: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {pr.poids} kg × {pr.reps}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--subtle)',
                  fontFamily: 'var(--mono)',
                  flexShrink: 0,
                }}
              >
                {formatShortDate(pr.date)}
              </div>
            </motion.div>
          ))}
        </Card>
      )}
    </div>
  )
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(d).replace('.', '')
}

// ───────────────────────── Shared bits ─────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  )
}

function EmptyLine({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '18px 14px',
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--muted)',
        fontFamily: 'var(--mono)',
      }}
    >
      {label}
    </div>
  )
}
