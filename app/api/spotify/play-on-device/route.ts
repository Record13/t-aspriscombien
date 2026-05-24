import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get('spotify_access_token')?.value

  if (!accessToken) {
    return NextResponse.json(
      { error: 'No Spotify access token' },
      { status: 401 }
    )
  }

  const body = await req.json().catch(() => null) as { deviceId?: string } | null
  const deviceId = body?.deviceId

  if (!deviceId) {
    return NextResponse.json(
      { error: 'Missing deviceId' },
      { status: 400 }
    )
  }

  // Track de test, tu pourras changer l’URI pour ta musique
  const trackUri = 'spotify:track:11dFghVXANMlKmJXsNCbNl'

  const res = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: [trackUri],
      }),
    }
  )

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.error('Error /me/player/play:', data)
    return NextResponse.json(
      { error: 'Failed to start playback' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true })
}