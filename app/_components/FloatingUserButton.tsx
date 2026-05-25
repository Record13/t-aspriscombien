'use client'

import { Show, UserButton } from '@clerk/nextjs'

export function FloatingUserButton() {
  return (
    <Show when="signed-in">
      <div
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
          zIndex: 50,
          lineHeight: 0,
        }}
      >
        <UserButton
          appearance={{
            elements: {
              userButtonTrigger: {
                padding: 0,
                borderRadius: 999,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              },
              avatarBox: {
                width: 32,
                height: 32,
                boxShadow:
                  '0 0 0 1px color-mix(in oklch, var(--line) 70%, transparent), 0 2px 10px rgba(0,0,0,0.25)',
              },
            },
          }}
        >
          <UserButton.MenuItems>
            <UserButton.Link
              label="Réglages"
              labelIcon={<SettingsIcon />}
              href="/settings"
            />
          </UserButton.MenuItems>
        </UserButton>
      </div>
    </Show>
  )
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}
