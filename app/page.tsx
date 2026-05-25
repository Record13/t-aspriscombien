import Link from 'next/link'
import { Show } from '@clerk/nextjs'

export default function Home() {
  return (
    <main
      style={{
        minHeight: 'calc(100dvh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        background:
          'radial-gradient(120% 70% at 50% 0%, color-mix(in oklch, var(--accent) 8%, var(--bg)) 0%, var(--bg) 60%)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 12px 5px 6px',
          borderRadius: 999,
          background: 'var(--surface)',
          boxShadow: '0 0 0 1px var(--line) inset',
          marginBottom: 24,
          fontSize: 11,
          color: 'var(--ink-2)',
          fontWeight: 500,
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
          }}
        >
          ✦
        </span>
        Tracker de séance · local-first
      </div>
      <h1
        style={{
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: -2.4,
          margin: '0 0 14px',
          fontFamily: 'var(--display)',
          lineHeight: 0.96,
          color: 'var(--ink)',
        }}
      >
        T&apos;asPris
        <span style={{ color: 'var(--accent)' }}>Combien</span>
        <span style={{ color: 'var(--accent)' }}>?</span>
      </h1>
      <p
        style={{
          margin: '0 0 32px',
          color: 'var(--muted)',
          fontSize: 16,
          lineHeight: 1.5,
          maxWidth: 420,
        }}
      >
        Une séance guidée, série par série. Pas de tableaux de bord — juste ce que tu portes, et
        combien de fois.
      </p>
      <Show when="signed-in">
        <Link
          href="/seance"
          style={{
            height: 56,
            padding: '0 26px',
            borderRadius: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'var(--font)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--accent-ink)',
            textDecoration: 'none',
            background: 'var(--accent)',
            boxShadow:
              '0 12px 30px -10px color-mix(in oklch, var(--accent) 50%, transparent)',
            letterSpacing: -0.2,
          }}
        >
          Commencer une séance
          <span style={{ fontSize: 18 }}>→</span>
        </Link>
      </Show>
      <Show when="signed-out">
        <Link
          href="/sign-in?redirect_url=/seance"
          style={{
            height: 56,
            padding: '0 26px',
            borderRadius: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'var(--font)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--accent-ink)',
            textDecoration: 'none',
            background: 'var(--accent)',
            boxShadow:
              '0 12px 30px -10px color-mix(in oklch, var(--accent) 50%, transparent)',
            letterSpacing: -0.2,
          }}
        >
          Se connecter pour commencer
          <span style={{ fontSize: 18 }}>→</span>
        </Link>
      </Show>
    </main>
  )
}
