import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer } from '../../lib/supabase-server'

type SerieRow = {
  poids: number
  reps: number
}
type ExoRow = {
  nom: string
  series: SerieRow[] | null
  seances: { date: string; type: string } | null
}

export type ExoSuggestion = {
  nom: string
  count: number
  lastDate: string | null
  lastPoids: number | null
  lastReps: number | null
  topPoids: number | null
  // Types de séance où cet exo a été pratiqué (push, pull, legs…).
  types: string[]
}

export async function GET() {
  const { userId, getToken } = await auth()
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const token = await getToken()
  if (!token) return NextResponse.json({ error: 'Token Supabase indisponible' }, { status: 401 })

  const supabase = createSupabaseServer(token)
  const { data, error } = (await supabase
    .from('exos')
    .select('nom, series(poids, reps), seances!inner(date, type)')
    .order('id', { ascending: false })
    .limit(2000)) as unknown as {
    data: ExoRow[] | null
    error: { message: string } | null
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggrégation par nom d'exo (case-insensitive sur le trim).
  const map = new Map<string, ExoSuggestion>()
  for (const row of data ?? []) {
    if (!row.nom) continue
    const key = row.nom.trim()
    if (!key) continue
    const cur =
      map.get(key) ??
      ({
        nom: key,
        count: 0,
        lastDate: null,
        lastPoids: null,
        lastReps: null,
        topPoids: null,
        types: [],
      } as ExoSuggestion)
    cur.count += 1
    const seanceDate = row.seances?.date ?? null
    const seanceType = row.seances?.type ?? null
    if (seanceDate && (!cur.lastDate || seanceDate > cur.lastDate)) {
      cur.lastDate = seanceDate
      // Récupérer la dernière charge non nulle pour cette séance
      const topOfSeance = (row.series ?? []).reduce<SerieRow | null>(
        (acc, s) => (!acc || (s.poids ?? 0) > (acc.poids ?? 0) ? s : acc),
        null,
      )
      if (topOfSeance) {
        cur.lastPoids = topOfSeance.poids
        cur.lastReps = topOfSeance.reps
      }
    }
    for (const s of row.series ?? []) {
      if (cur.topPoids == null || s.poids > cur.topPoids) cur.topPoids = s.poids
    }
    if (seanceType && !cur.types.includes(seanceType)) cur.types.push(seanceType)
    map.set(key, cur)
  }

  const exos = Array.from(map.values()).sort((a, b) => {
    // Récents d'abord, puis par fréquence.
    if (a.lastDate && b.lastDate && a.lastDate !== b.lastDate) {
      return a.lastDate < b.lastDate ? 1 : -1
    }
    if (a.lastDate && !b.lastDate) return -1
    if (!a.lastDate && b.lastDate) return 1
    return b.count - a.count
  })

  return NextResponse.json({ exos })
}
