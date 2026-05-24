import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div
      style={{
        minHeight: 'calc(100dvh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--bg)',
      }}
    >
      <SignUp />
    </div>
  )
}
