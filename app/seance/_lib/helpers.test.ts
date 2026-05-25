import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  formatMMSS,
  greetingFor,
  daysAgo,
  formatSeanceDate,
  percentChange,
  formatSessionAsText,
  newId,
} from './helpers'
import type { SessionState } from './types'

describe('formatMMSS', () => {
  it('zero-pads seconds', () => {
    expect(formatMMSS(0)).toBe('0:00')
    expect(formatMMSS(5)).toBe('0:05')
    expect(formatMMSS(60)).toBe('1:00')
    expect(formatMMSS(75)).toBe('1:15')
    expect(formatMMSS(605)).toBe('10:05')
  })

  it('handles negative durations with a leading minus', () => {
    expect(formatMMSS(-90)).toBe('-1:30')
    expect(formatMMSS(-5)).toBe('-0:05')
  })
})

describe('percentChange', () => {
  it('returns rounded percent change', () => {
    expect(percentChange(110, 100)).toBe(10)
    expect(percentChange(80, 100)).toBe(-20)
    expect(percentChange(100, 100)).toBe(0)
    expect(percentChange(33, 30)).toBe(10)
  })

  it('returns null when previous is zero and current is positive', () => {
    expect(percentChange(50, 0)).toBeNull()
  })

  it('returns 0 when both are zero', () => {
    expect(percentChange(0, 0)).toBe(0)
  })
})

describe('greetingFor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    [8, 'matin'],
    [10, 'matin'],
    [11, 'après-midi'],
    [15, 'après-midi'],
    [17, 'soir'],
    [21, 'soir'],
  ])('returns %s greeting at %s:00', (hour, expected) => {
    vi.setSystemTime(new Date(2026, 4, 25, hour, 0, 0))
    expect(greetingFor()).toBe(expected)
  })
})

describe('daysAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 25, 12, 0, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('handles today, yesterday and short ranges', () => {
    expect(daysAgo('2026-05-25')).toBe("aujourd'hui")
    expect(daysAgo('2026-05-24')).toBe('hier')
    expect(daysAgo('2026-05-22')).toBe('il y a 3 jours')
    expect(daysAgo('2026-05-19')).toBe('il y a 6 jours')
  })

  it('handles week-scale ranges', () => {
    expect(daysAgo('2026-05-18')).toBe('il y a 1 sem.')
    expect(daysAgo('2026-05-11')).toBe('il y a 2 sem.')
  })
})

describe('formatSeanceDate', () => {
  it('returns French short format without trailing period', () => {
    const out = formatSeanceDate('2026-05-25')
    expect(out).not.toMatch(/\.$/)
    expect(out).toContain('25')
  })
})

describe('newId', () => {
  it('produces unique ids with given prefix', () => {
    const a = newId('e')
    const b = newId('e')
    expect(a).not.toBe(b)
    expect(a.startsWith('e_')).toBe(true)
    expect(b.startsWith('e_')).toBe(true)
  })
})

describe('formatSessionAsText', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 25, 18, 42, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const baseSession: SessionState = {
    type: 'push',
    restTargetSec: 90,
    currentExoIndex: 0,
    currentSerieIndex: 0,
    timer: { remainingSec: 0, status: 'idle', overtimeSec: 0, justFinished: false },
    exos: [
      {
        tempId: 'e1',
        nom: 'Développé couché',
        series: [
          { tempId: 's1', poids: 90, reps: 8, rir: 2, degressive: false },
          { tempId: 's2', poids: 92.5, reps: 8, rir: 2, degressive: false },
          { tempId: 's3', poids: 95, reps: 6, rir: 1, degressive: true },
        ],
      },
      {
        tempId: 'e2',
        nom: 'Dips lestés',
        series: [{ tempId: 's4', poids: 20, reps: 12, rir: 2, degressive: false }],
      },
    ],
  }

  it('starts with H1 containing session type', () => {
    const out = formatSessionAsText(baseSession)
    expect(out.split('\n')[0]).toMatch(/^# Séance Push — /)
  })

  it('includes rest target in both formats', () => {
    const out = formatSessionAsText(baseSession)
    expect(out).toContain('1:30 (90s)')
  })

  it('uses french locale weekday and time', () => {
    const out = formatSessionAsText(baseSession)
    expect(out).toMatch(/lundi 25 mai 2026/)
    expect(out).toMatch(/18:42/)
  })

  it('lists exercises as H2 sections', () => {
    const out = formatSessionAsText(baseSession)
    expect(out).toContain('## Développé couché')
    expect(out).toContain('## Dips lestés')
  })

  it('renders series with French decimal comma and dégressive flag', () => {
    const out = formatSessionAsText(baseSession)
    expect(out).toContain('1. 90 kg × 8 reps · RIR 2')
    expect(out).toContain('2. 92,5 kg × 8 reps · RIR 2')
    expect(out).toContain('3. 95 kg × 6 reps · RIR 1 (dégressive)')
  })

  it('computes totals correctly', () => {
    const out = formatSessionAsText(baseSession)
    // (90*8 + 92.5*8 + 95*6) + 20*12 = 720 + 740 + 570 + 240 = 2270
    // Intl uses NNBSP (U+202F) as group separator in fr-FR — match any whitespace.
    expect(out).toMatch(/2\s270 kg/)
    expect(out).toContain('2 exercices · 4 séries')
  })

  it('skips exercises with no series', () => {
    const session: SessionState = {
      ...baseSession,
      exos: [
        ...baseSession.exos,
        { tempId: 'e3', nom: 'Élévations', series: [] },
      ],
    }
    const out = formatSessionAsText(session)
    expect(out).not.toContain('## Élévations')
  })

  it('ends with a trailing newline', () => {
    const out = formatSessionAsText(baseSession)
    expect(out.endsWith('\n')).toBe(true)
  })
})
