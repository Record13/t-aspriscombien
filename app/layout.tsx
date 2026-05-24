import type { Metadata } from 'next'
import Link from 'next/link'
import { ClerkProvider, Show, UserButton } from '@clerk/nextjs'
import localFont from 'next/font/local'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

const gebuk = localFont({
  src: [
    { path: './fonts/Gebuk-Regular.ttf', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-gebuk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "T'asPrisCombien",
  description: 'Une séance guidée, série par série.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body
        className={`${outfit.variable} ${gebuk.variable} antialiased`}
      >
        <ClerkProvider>
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              padding: '12px 20px',
              height: 60,
              borderBottom: '1px solid var(--line)',
              background: 'var(--surface)',
            }}
          >
            <Show when="signed-out">
              <Link
                href="/sign-in"
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontFamily: 'var(--font)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ink-2)',
                  textDecoration: 'none',
                  boxShadow: '0 0 0 1px var(--line) inset',
                  background: 'var(--surface)',
                }}
              >
                Se connecter
              </Link>
              <Link
                href="/sign-up"
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontFamily: 'var(--font)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--accent-ink)',
                  textDecoration: 'none',
                  background: 'var(--accent)',
                }}
              >
                S&apos;inscrire
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/settings"
                aria-label="Réglages"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink-2)',
                  boxShadow: '0 0 0 1px var(--line) inset',
                  background: 'var(--surface)',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                  <path
                    d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                </svg>
              </Link>
              <UserButton />
            </Show>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
