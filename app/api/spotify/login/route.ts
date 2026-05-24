import { NextResponse } from 'next/server'

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Spotify env vars not configured' },
      { status: 500 }
    )
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
scope: [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'app-remote-control',
].join(' '),
  })

  const url = `${SPOTIFY_AUTH_URL}?${params.toString()}`

  console.log('AUTH URL:', url) // pour vérifier les scopes

  return NextResponse.redirect(url)
}