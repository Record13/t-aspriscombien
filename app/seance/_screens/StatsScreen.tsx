'use client'

import type { SessionState, WorkoutStep } from '../_lib/types'
import { useDashboard } from '../_lib/useDashboard'
import { Card, IconButton, Pill, TopBar } from '../_components/primitives'
import { ChevronLeft, Flame, TrendUp } from '../_components/icons'

type Props = {
  session: SessionState
  nav: (s: WorkoutStep) => void
}

export function StatsScreen({ nav }: Props) {
  const { data, loading } = useDashboard()

  const fmt = (n: number) => n.toLocaleString('fr-FR')
  const totals = data?.fourWeeks
  const prs = data?.prs ?? []

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
        subtitle="4 dernières semaines"
      />
      <div style={{ padding: '4px 20px 30px', animation: 'fadeUp 360ms ease both' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 8 }}>
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
              Volume total
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 42,
                fontWeight: 600,
                letterSpacing: -1.4,
                lineHeight: 1,
              }}
            >
              {loading ? '…' : fmt(totals?.volumeTotal ?? 0)}
            </div>
          </div>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 14,
              color: 'var(--subtle)',
              paddingBottom: 6,
            }}
          >
            kg
          </span>
        </div>

        <Card style={{ padding: 16, marginTop: 18 }}>
          <BarChart data={totals?.chart ?? []} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {(totals?.chart ?? []).map((c) => (
              <span
                key={c.label}
                style={{ fontSize: 10, color: 'var(--subtle)', fontFamily: 'var(--mono)' }}
              >
                {c.label}
              </span>
            ))}
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          {[
            { label: 'Séances', value: loading ? '…' : String(totals?.seances ?? 0) },
            { label: 'Séries totales', value: loading ? '…' : String(totals?.series ?? 0) },
            {
              label: 'Charge moy.',
              value: loading ? '…' : `${totals?.avgLoad ?? 0} kg`,
            },
            {
              label: 'Volume / séance',
              value:
                loading || !totals || totals.seances === 0
                  ? '…'
                  : `${fmt(Math.round(totals.volumeTotal / totals.seances))} kg`,
            },
          ].map((s) => (
            <Card key={s.label} style={{ padding: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 500,
                  letterSpacing: 0.2,
                  textTransform: 'uppercase',
                }}
              >
                {s.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: -0.6,
                  }}
                >
                  {s.value}
                </span>
              </div>
            </Card>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Records personnels
          </div>
          {prs.length === 0 && !loading ? (
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
            <Card style={{ padding: 6 }}>
              {prs.map((pr, i) => (
                <div
                  key={pr.nom}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 12px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-2)',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'var(--accent-soft)',
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Flame size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{pr.nom}</div>
                    <div
                      style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}
                    >
                      {pr.poids} kg × {pr.reps}
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function BarChart({
  data,
}: {
  data: { label: string; volume: number; current: boolean }[]
}) {
  const max = Math.max(...data.map((d) => d.volume), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140 }}>
      {data.map((d, i) => {
        const active = d.current
        const heightPct = max > 0 ? (d.volume / max) * 100 : 0
        return (
          <div
            key={d.label}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                width: '100%',
                height: `${Math.max(heightPct, 4)}%`,
                borderRadius: 8,
                background: active ? 'var(--accent)' : 'var(--line)',
                animation: `fadeUp ${300 + i * 80}ms ease both`,
                position: 'relative',
              }}
            >
              {active && d.volume > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: -22,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 10,
                    color: 'var(--accent)',
                    fontFamily: 'var(--mono)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.volume >= 1000
                    ? `${(d.volume / 1000).toFixed(1)}k`
                    : `${d.volume}`}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
