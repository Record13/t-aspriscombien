export const WORKOUT_TYPES = [
  { id: 'push', label: 'Push', hint: 'Pecs · Épaules · Triceps', emoji: 'P' },
  { id: 'pull', label: 'Pull', hint: 'Dos · Biceps', emoji: 'L' },
  { id: 'legs', label: 'Jambes', hint: 'Quadri · Ischios · Mollets', emoji: 'J' },
  { id: 'full', label: 'Full body', hint: 'Tout le corps', emoji: 'F' },
  { id: 'upper', label: 'Upper', hint: 'Haut du corps', emoji: 'U' },
  { id: 'core', label: 'Abdos', hint: 'Sangle abdominale', emoji: 'A' },
] as const

export type WorkoutTypeId = (typeof WORKOUT_TYPES)[number]['id']

export const REST_PRESETS = [60, 90, 120, 180] as const

export const SUGGESTIONS: Record<string, string[]> = {
  push: [
    'Développé couché',
    'Développé incliné haltères',
    'Dips lestés',
    'Élévations latérales',
    'Triceps poulie',
  ],
  pull: [
    'Tractions lestées',
    'Rowing barre',
    'Tirage poitrine',
    'Curl haltères',
    'Face pull',
  ],
  legs: [
    'Squat barre',
    'Soulevé de terre roumain',
    'Presse à cuisses',
    'Mollets debout',
    'Fentes haltères',
  ],
  full: [
    'Squat barre',
    'Développé couché',
    'Tractions',
    'Rowing barre',
    'Soulevé de terre',
  ],
  upper: [
    'Développé couché',
    'Tirage horizontal',
    'Développé militaire',
    'Curl barre',
    'Triceps poulie',
  ],
  core: [
    'Gainage',
    'Crunch lesté',
    'Relevés de jambes',
    'Roue abdo',
    'Russian twist',
  ],
}
