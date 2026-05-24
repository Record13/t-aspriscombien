'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    Spotify: any
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

export default function SpotifyWebPlayer() {
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ((window as any).Spotify) {
      setSdkLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      setSdkLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!sdkLoaded) return

    let player: any

    async function initPlayer() {
      setError(null)

      let accessToken: string
      try {
        const res = await fetch('/api/spotify/token')
        if (!res.ok) {
          setError('Connecte-toi à Spotify pour activer le lecteur')
          return
        }
        const data = await res.json()
        accessToken = data.access_token as string
        if (!accessToken) {
          setError('Connecte-toi à Spotify pour activer le lecteur')
          return
        }
      } catch {
        setError('Spotify indisponible')
        return
      }

      player = new window.Spotify.Player({
        name: 'Lecteur muscu web',
        getOAuthToken: (cb: (token: string) => void) => cb(accessToken),
        volume: 0.5,
      })

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id)
      })

      player.addListener('not_ready', () => {})

      player.addListener('initialization_error', () => {
        setError("Erreur d'initialisation du player")
      })

      player.addListener('authentication_error', () => {
        setError("Erreur d'authentification Spotify")
      })

      player.addListener('account_error', () => {
        setError('Compte Spotify non compatible (premium requis ?)')
      })

      await player.connect()
    }

    initPlayer()

    return () => {
      if (player) player.disconnect()
    }
  }, [sdkLoaded])

  async function handlePlayTest() {
    if (!deviceId) {
      setError('Player non prêt, attends 1–2 secondes.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/spotify/play-on-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Impossible de lancer la lecture')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 16,
        zIndex: 30,
        width: 'min(440px, calc(100% - 24px))',
        background: 'var(--surface)',
        borderRadius: 14,
        padding: '10px 12px',
        boxShadow:
          '0 0 0 1px var(--line) inset, 0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--font)',
      }}
    >
      <button
        onClick={handlePlayTest}
        disabled={loading || !deviceId}
        aria-label="Lire un morceau"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: 'none',
          cursor: loading || !deviceId ? 'not-allowed' : 'pointer',
          background: deviceId ? 'var(--accent)' : 'var(--line-2)',
          color: deviceId ? '#fff' : 'var(--subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 140ms',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {error
            ? error
            : loading
              ? 'Lecture en cours…'
              : deviceId
                ? 'Spotify · prêt'
                : 'Initialisation Spotify…'}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--subtle)',
            fontFamily: 'var(--mono)',
            marginTop: 1,
          }}
        >
          Lecteur muscu web
        </div>
      </div>
    </div>
  )
}
