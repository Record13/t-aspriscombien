import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer } from '../../lib/supabase-server'

type SerieIn = {
  poids: number
  reps: number
  rir: number
  degressive: boolean
}
type ExoIn = {
  nom: string
  series: SerieIn[]
}
type PostBody = {
  date: string
  type: string
  restTargetSec: number
  exos: ExoIn[]
}

type SerieRow = { id: string; poids: number; reps: number }
type ExoRow = { id: string; nom: string; series: SerieRow[] | null }
type SeanceRow = {
  id: string
  type: string
  date: string
  exos: ExoRow[] | null
}

function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + 'T00:00:00').getTime())
}

export async function GET() {
  const { userId, getToken } = await auth()
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const token = await getToken()
  if (!token) return NextResponse.json({ error: 'Token Supabase indisponible' }, { status: 401 })

  const supabase = createSupabaseServer(token)
  const { data, error } = (await supabase
    .from('seances')
    .select('id, date, type, exos(id, series(id, poids, reps))')
    .order('date', { ascending: false })
    .limit(500)) as unknown as { data: SeanceRow[] | null; error: { message: string } | null }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const seances = (data ?? []).map((s) => {
    let seriesCount = 0
    let volume = 0
    for (const e of s.exos ?? []) {
      for (const sr of e.series ?? []) {
        seriesCount++
        volume += sr.poids * sr.reps
      }
    }
    return {
      id: s.id,
      date: s.date,
      type: s.type,
      exosCount: (s.exos ?? []).length,
      seriesCount,
      volume,
    }
  })

  return NextResponse.json({ seances })
}

export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth()
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const token = await getToken()
  if (!token) return NextResponse.json({ error: 'Token Supabase indisponible' }, { status: 401 })

  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  if (!body.date || !isValidISODate(body.date)) {
    return NextResponse.json({ error: 'Date invalide (YYYY-MM-DD attendu)' }, { status: 400 })
  }
  if (!body.type) {
    return NextResponse.json({ error: 'Type manquant' }, { status: 400 })
  }
  if (!body.exos || body.exos.length === 0) {
    return NextResponse.json({ error: 'Aucun exercice' }, { status: 400 })
  }

  const supabase = createSupabaseServer(token)

  const { data: seance, error: sErr } = await supabase
    .from('seances')
    .insert({ date: body.date, type: body.type })
    .select('id')
    .single()
  if (sErr || !seance) {
    return NextResponse.json({ error: sErr?.message ?? 'Échec création séance' }, { status: 500 })
  }
  const seanceId = seance.id as string

  for (const exo of body.exos) {
    if (!exo.nom?.trim() || !exo.series || exo.series.length === 0) continue
    const { data: exoRow, error: eErr } = await supabase
      .from('exos')
      .insert({ seance_id: seanceId, nom: exo.nom.trim() })
      .select('id')
      .single()
    if (eErr || !exoRow) {
      return NextResponse.json({ error: eErr?.message ?? 'Échec création exo' }, { status: 500 })
    }
    const rows = exo.series.map((s) => ({
      exo_id: exoRow.id,
      reps: s.reps,
      poids: s.poids,
      recup: body.restTargetSec,
      rir: s.rir,
      degressive: s.degressive,
    }))
    const { error: srErr } = await supabase.from('series').insert(rows)
    if (srErr) {
      return NextResponse.json({ error: srErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, seanceId })
}
