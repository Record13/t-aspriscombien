import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#09090B',
          color: '#BEF264',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          letterSpacing: -3,
        }}
      >
        <div style={{ fontSize: 78, fontWeight: 700, lineHeight: 1 }}>tpc</div>
        <div
          style={{
            fontSize: 14,
            color: '#A1A1AA',
            marginTop: 8,
            letterSpacing: 0,
            fontWeight: 500,
          }}
        >
          tracker
        </div>
      </div>
    ),
    { ...size },
  )
}
