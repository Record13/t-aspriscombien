'use client'

let audioCtx: AudioContext | null = null
let unlocked = false

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  const Ctx =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  try {
    audioCtx = new Ctx()
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Unlock audio on the first user gesture. iOS Safari requires a synchronous
 * touch/click before any audio can play. Call once when the session starts.
 */
export function unlockAudio() {
  if (unlocked) return
  const ctx = getAudioContext()
  if (!ctx) return
  unlocked = true
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  // Play a tiny silent ping to fully unlock the WebAudio graph.
  try {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    g.gain.value = 0
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.01)
  } catch {
    // ignore
  }
}

function beep(ctx: AudioContext, freq: number, durationSec: number, startOffset: number, volume = 0.18) {
  const t0 = ctx.currentTime + startOffset
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, t0)
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01)
  gain.gain.linearRampToValueAtTime(0, t0 + durationSec)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + durationSec + 0.02)
}

/**
 * Fire when the rest timer reaches zero: vibration + 3-tone chime.
 * Both are best-effort — silently skipped if unsupported or blocked.
 */
export function playRestEndAlert() {
  if (typeof window === 'undefined') return

  // Vibration (Android Chrome). Safari iOS ignores silently.
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([220, 90, 220, 90, 420])
    }
  } catch {
    // ignore
  }

  // Audio chime — only works if audio was unlocked by a prior gesture.
  const ctx = getAudioContext()
  if (!ctx || ctx.state === 'suspended') return
  try {
    beep(ctx, 880, 0.16, 0)
    beep(ctx, 1100, 0.16, 0.18)
    beep(ctx, 1320, 0.28, 0.36, 0.22)
  } catch {
    // ignore
  }
}
