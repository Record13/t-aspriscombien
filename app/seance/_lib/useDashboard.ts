'use client'

import { useEffect, useState } from 'react'
import { useToast } from '../../_components/Toast'

export type Period = '7d' | '30d' | '90d' | 'all'

export type DistributionItem = {
  type: string
  label: string
  seances: number
  volume: number
  percent: number
}

export type TopExo = {
  nom: string
  volume: number
  volumePrev: number
  trendPct: number | null
  sparkline: number[]
}

export type BlindSpot = {
  type: string
  label: string
  daysSince: number | null
}

export type RecentPR = {
  nom: string
  poids: number
  reps: number
  date: string
}

export type DashboardData = {
  // Legacy (IdleScreen)
  week: {
    volume: number
    volumePrev: number
    seances: number
    series: number
  }
  lastSeance: {
    id: string
    type: string
    date: string
    exos: { nom: string; topSet: { poids: number; reps: number } | null }[]
    seriesCount: number
  } | null
  fourWeeks: {
    volumeTotal: number
    seances: number
    series: number
    avgLoad: number
    chart: { label: string; volume: number; current: boolean }[]
  }
  prs: { nom: string; poids: number; reps: number }[]

  // New (StatsScreen)
  period: Period
  hero: {
    volume: number
    volumePrev: number | null
    seances: number
    series: number
    avgLoad: number
    sparkline12w: number[]
  }
  distribution: DistributionItem[]
  topExos: TopExo[]
  blindSpots: BlindSpot[]
  recentPrs: RecentPR[]
}

export function useDashboard(period?: Period) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const qs = period ? `?period=${encodeURIComponent(period)}` : ''
        const res = await fetch(`/api/dashboard${qs}`)
        if (cancelled) return
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          const msg = e.error || `Erreur ${res.status}`
          setError(msg)
          toast.error(`Tableau de bord : ${msg}`)
        } else {
          const d = (await res.json()) as DashboardData
          setData(d)
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Erreur réseau'
          setError(msg)
          toast.warn(`Hors ligne ? ${msg}`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [toast, period])

  return { data, loading, error }
}
