import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer } from '../../lib/supabase-server'

type SerieRow = {
  id: string
  poids: number
  reps: number
  rir: number
  degressive: boolean
}
type ExoRow = { id: string; nom: string; series: SerieRow[] | null }
type SeanceRow = {
  id: string
  type: string
  date: string
  exos: ExoRow[] | null
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const day = x.getDay() || 7
  x.setDate(x.getDate() - day + 1)
  return x
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Token Supabase indisponible' }, { status: 401 })
  }

  const supabase = createSupabaseServer(token)

  const now = new Date()
  const thisWeekStart = startOfWeekMonday(now)
  const fourWeeksWindow = new Date(thisWeekStart)
  fourWeeksWindow.setDate(fourWeeksWindow.getDate() - 21)

  const { data: seances, error: sErr } = (await supabase
    .from('seances')
    .select('id, type, date, exos(id, nom, series(id, poids, reps, rir, degressive))')
    .gte('date', isoDate(fourWeeksWindow))
    .order('date', { ascending: false })) as unknown as {
    data: SeanceRow[] | null
    error: { message: string } | null
  }

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 })
  }

  const list = seances ?? []

  const weeklyVolumes = new Map<string, number>()
  let totalSeanceCount = 0
  let totalSeriesCount = 0
  let totalVolume = 0
  let totalPoidsSum = 0
  let totalPoidsCount = 0

  for (const s of list) {
    totalSeanceCount++
    const seanceDate = new Date(s.date + 'T00:00:00')
    const weekKey = isoDate(startOfWeekMonday(seanceDate))
    let weekVol = 0
    for (const e of s.exos ?? []) {
      for (const sr of e.series ?? []) {
        totalSeriesCount++
        weekVol += sr.poids * sr.reps
        totalPoidsSum += sr.poids
        totalPoidsCount++
      }
    }
    weeklyVolumes.set(weekKey, (weeklyVolumes.get(weekKey) ?? 0) + weekVol)
    totalVolume += weekVol
  }

  const chart: Array<{ label: string; volume: number; current: boolean }> = []
  for (let i = 3; i >= 0; i--) {
    const wk = new Date(thisWeekStart)
    wk.setDate(wk.getDate() - i * 7)
    const key = isoDate(wk)
    chart.push({
      label: i === 0 ? 'Cette sem.' : `S-${i}`,
      volume: weeklyVolumes.get(key) ?? 0,
      current: i === 0,
    })
  }

  const thisWeekVolume = weeklyVolumes.get(isoDate(thisWeekStart)) ?? 0
  const prevWeekStart = new Date(thisWeekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevWeekVolume = weeklyVolumes.get(isoDate(prevWeekStart)) ?? 0

  let weekSeances = 0
  let weekSeries = 0
  for (const s of list) {
    const seanceDate = new Date(s.date + 'T00:00:00')
    if (seanceDate >= thisWeekStart) {
      weekSeances++
      for (const e of s.exos ?? []) {
        weekSeries += e.series?.length ?? 0
      }
    }
  }

  const lastSeance = list[0]
  let lastSeanceData: {
    type: string
    date: string
    exos: { nom: string; topSet: { poids: number; reps: number } | null }[]
    seriesCount: number
  } | null = null
  if (lastSeance) {
    const exoSummaries = (lastSeance.exos ?? []).map((e) => {
      const top = (e.series ?? []).reduce<SerieRow | null>(
        (acc, s) => (acc === null || s.poids > acc.poids ? s : acc),
        null,
      )
      return {
        nom: e.nom,
        topSet: top ? { poids: top.poids, reps: top.reps } : null,
      }
    })
    const seriesCount = (lastSeance.exos ?? []).reduce(
      (n, e) => n + (e.series?.length ?? 0),
      0,
    )
    lastSeanceData = {
      type: lastSeance.type,
      date: lastSeance.date,
      exos: exoSummaries,
      seriesCount,
    }
  }

  type PRJoinRow = {
    poids: number
    reps: number
    exos: { nom: string } | null
  }
  const { data: allSeries } = (await supabase
    .from('series')
    .select('poids, reps, exos(nom)')
    .order('poids', { ascending: false })
    .limit(500)) as unknown as { data: PRJoinRow[] | null }

  const prMap = new Map<string, { poids: number; reps: number }>()
  for (const s of allSeries ?? []) {
    const nom = s.exos?.nom
    if (!nom) continue
    const cur = prMap.get(nom)
    if (!cur || cur.poids < s.poids) {
      prMap.set(nom, { poids: s.poids, reps: s.reps })
    }
  }
  const prs = Array.from(prMap.entries())
    .sort((a, b) => b[1].poids - a[1].poids)
    .slice(0, 4)
    .map(([nom, { poids, reps }]) => ({ nom, poids, reps }))

  return NextResponse.json({
    week: {
      volume: thisWeekVolume,
      volumePrev: prevWeekVolume,
      seances: weekSeances,
      series: weekSeries,
    },
    lastSeance: lastSeanceData,
    fourWeeks: {
      volumeTotal: totalVolume,
      seances: totalSeanceCount,
      series: totalSeriesCount,
      avgLoad: totalPoidsCount > 0 ? Math.round(totalPoidsSum / totalPoidsCount) : 0,
      chart,
    },
    prs,
  })
}
