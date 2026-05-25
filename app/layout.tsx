import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { ClerkProvider, Show, UserButton } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { ServiceWorkerRegister } from './_components/ServiceWorkerRegister'
import { ToastProvider } from './_components/Toast'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: "T'asPrisCombien",
  description: 'Une séance guidée, série par série.',
  applicationName: "T'asPrisCombien",
  appleWebApp: {
    capable: true,
    title: "T'asPrisCombien",
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#09090B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <ServiceWorkerRegister />
        <ToastProvider>
        <ClerkProvider
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: '#BEF264',
              colorBackground: '#09090B',
              colorInputBackground: '#18181B',
              colorText: '#FAFAFA',
              colorTextSecondary: '#A1A1AA',
              colorInputText: '#FAFAFA',
              borderRadius: '12px',
              fontFamily: 'var(--font-inter)',
            },
            elements: {
              card: { background: '#18181B', border: '1px solid #27272A' },
            },
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              padding: '12px 20px',
              height: 60,
              borderBottom: '1px solid var(--line)',
              background: 'var(--bg)',
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
                  fontWeight: 700,
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
        </ToastProvider>
      </body>
    </html>
  )
}
