import firstUnit from './g3_unit1.json'

export type Track = 'zh' | 'el'
export interface PracticeQuestion {
  type: string
  questionEl: string
  questionZhHint: string
  options?: string[]
  answer?: string
  pairs?: { left: string; right: string }[]
  ideas?: { el: string; zh: string }[]
  explanationZh?: string
}
export interface HistoryLesson {
  id: string
  grade: number
  unitNumber: number
  unitTitleZh: string
  unitTitleEl: string
  lessonNumber: number
  titleZh: string
  titleEl: string
  textbookPages: string
  workbookPages: string
  audioZh: string
  audioEl: string
  durationZhSec: number
  durationElSec: number
  zhStoryScript: string[]
  elStoryParagraphs: { el: string; zh: string }[]
  vocabReview: { zh: string; el: string; note?: string }[]
  workbookKeyPoints: { titleZh: string; detailZh: string; detailEl: string }[]
  practice: PracticeQuestion[]
}

export const lessons: HistoryLesson[] = firstUnit
export const HISTORY_AUDIO_BASE_URL = (import.meta.env.VITE_HISTORY_AUDIO_BASE_URL || '/audio/history').replace(/\/+$/, '')
export const artwork = (lesson: HistoryLesson) =>
  ({ g3_u1_l1: '/zeus.png', g3_u1_l2: '/poseidon.png', g3_u1_l3: '/athena.png', g3_u1_l4: '/greek_gods.png' }[lesson.id] || '/greek_gods.png')

export function clock(seconds: number) {
  const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  return String(Math.floor(whole / 60)).padStart(2, '0') + ':' + String(whole % 60).padStart(2, '0')
}

export function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem('leon_history_' + key) || 'null') ?? fallback }
  catch { return fallback }
}
export function write(key: string, value: unknown) {
  try { localStorage.setItem('leon_history_' + key, JSON.stringify(value)) } catch { /* Storage may be unavailable in private browsing. */ }
}
export function progress(lesson: HistoryLesson, track: Track) {
  return read(lesson.id + '_' + track, { position: 0, finished: false })
}
