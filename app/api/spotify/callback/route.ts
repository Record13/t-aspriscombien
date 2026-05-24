// app/api/spotify/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    console.error('Spotify auth error:', error)
    return NextResponse.redirect('http://127.0.0.1:3000/?spotify_error=true')
  }

  if (!code) {
    return NextResponse.redirect('http://127.0.0.1:3000/?spotify_error=missing_code')
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!

  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  const tokenData = await tokenResponse.json()

  if (!tokenResponse.ok) {
    console.error('Token exchange error:', tokenData)
    return NextResponse.redirect('http://127.0.0.1:3000/?spotify_error=token_failed')
  }

  console.log('access_token:', tokenData.access_token)
  console.log('refresh_token:', tokenData.refresh_token)

  const response = NextResponse.redirect('http://127.0.0.1:3000/seance')
  response.cookies.set('spotify_access_token', tokenData.access_token, {
    httpOnly: true,
    maxAge: tokenData.expires_in,
    path: '/',
  })
  response.cookies.set('spotify_refresh_token', tokenData.refresh_token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return response
}