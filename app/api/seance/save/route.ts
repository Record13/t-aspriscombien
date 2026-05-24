import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer } from '../../../lib/supabase-server'
import type { SessionState } from '../../../seance/_lib/types'

export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json(
      { error: 'Token Supabase indisponible (Clerk getToken null)' },
      { status: 401 },
    )
  }

  let body: { sessionState?: SessionState }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const sessionState = body.sessionState
  if (!sessionState) {
    return NextResponse.json({ error: 'sessionState manquant' }, { status: 400 })
  }
  if (!sessionState.exos || sessionState.exos.length === 0) {
    return NextResponse.json(
      { error: 'Aucun exercice à sauvegarder' },
      { status: 400 },
    )
  }

  const supabase = createSupabaseServer(token)
  const today = new Date().toISOString().slice(0, 10)

  const { data: seance, error: seanceErr } = await supabase
    .from('seances')
    .insert({
      date: today,
      type: sessionState.type,
    })
    .select('id')
    .single()

  if (seanceErr || !seance) {
    return NextResponse.json(
      { error: seanceErr?.message ?? 'Échec création séance' },
      { status: 500 },
    )
  }

  const seanceId = seance.id as string

  for (const exo of sessionState.exos) {
    if (!exo.series || exo.series.length === 0) continue

    const { data: exoRow, error: exoErr } = await supabase
      .from('exos')
      .insert({
        seance_id: seanceId,
        nom: exo.nom,
      })
      .select('id')
      .single()

    if (exoErr || !exoRow) {
      return NextResponse.json(
        { error: exoErr?.message ?? 'Échec création exo' },
        { status: 500 },
      )
    }

    const seriesRows = exo.series.map((s) => ({
      exo_id: exoRow.id,
      reps: s.reps,
      poids: s.poids,
      recup: sessionState.restTargetSec,
      rir: s.rir,
      degressive: s.degressive,
    }))

    const { error: seriesErr } = await supabase.from('series').insert(seriesRows)
    if (seriesErr) {
      return NextResponse.json(
        { error: seriesErr.message ?? 'Échec création séries' },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ ok: true, seanceId })
}
