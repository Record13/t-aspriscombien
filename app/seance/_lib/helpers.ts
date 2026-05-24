export function formatMMSS(s: number): string {
  const sign = s < 0 ? '-' : ''
  const a = Math.abs(s)
  const m = Math.floor(a / 60)
  const r = a % 60
  return `${sign}${m}:${String(r).padStart(2, '0')}`
}

export function greetingFor(): 'matin' | 'après-midi' | 'soir' {
  const h = new Date().getHours()
  if (h < 11) return 'matin'
  if (h < 17) return 'après-midi'
  return 'soir'
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function daysAgo(isoDateStr: string): string {
  const d = new Date(isoDateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diff <= 0) return "aujourd'hui"
  if (diff === 1) return 'hier'
  if (diff < 7) return `il y a ${diff} jours`
  const weeks = Math.floor(diff / 7)
  if (weeks === 1) return 'il y a 1 sem.'
  return `il y a ${weeks} sem.`
}

export function formatSeanceDate(isoDateStr: string): string {
  const d = new Date(isoDateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(d)
    .replace('.', '')
}

export function percentChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? null : 0
  return Math.round(((curr - prev) / prev) * 100)
}
