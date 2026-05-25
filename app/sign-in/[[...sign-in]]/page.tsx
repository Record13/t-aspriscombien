import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--bg)',
      }}
    >
      <SignIn />
    </div>
  )
}
