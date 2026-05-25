'use client'

import { useEffect, useState } from 'react'
import { useToast } from '../../_components/Toast'

export type DashboardData = {
  week: {
    volume: number
    volumePrev: number
    seances: number
    series: number
  }
  lastSeance: {
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
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/dashboard')
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
  }, [toast])

  return { data, loading, error }
}
