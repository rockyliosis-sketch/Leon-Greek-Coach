import { useCallback, useEffect, useRef, useState } from 'react'
import { artwork, HISTORY_AUDIO_BASE_URL, lessons, progress, read, write } from '../../data/history'
import type { HistoryLesson, Track } from '../../data/history'

export const speeds = [0.75, 0.85, 1, 1.15, 1.25, 1.5]
export type PlayMode = 'next' | 'loop' | 'stop'
function preferredSpeed(track: Track) {
  const rate = read('speed_' + track, 1)
  return speeds.includes(rate) ? rate : 1
}
function lastSelection() {
  const last = read('last', { id: '', track: 'zh' })
  return { lesson: lessons.find(item => item.id === last.id) || lessons[0], track: last.track === 'el' ? 'el' as const : 'zh' as const }
}

export function useHistoryPlayer() {
  const audio = useRef<HTMLAudioElement>(null)
  const [selection, setSelection] = useState(lastSelection)
  const active = useRef(selection)
  const { lesson, track } = selection
  const [rate, setRate] = useState(() => preferredSpeed(track))
  const [mode, setMode] = useState<PlayMode>(() => read('mode', 'next'))
  const [timer, setTimer] = useState('off')
  const deadline = useRef(0)
  const [remaining, setRemaining] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const resume = useRef<number | null>(null)
  const lastSaved = useRef(-1)
  const finished = useRef(false)
  const word = useRef<{ index: number; resumeStory: boolean } | null>(null)
  const [wordIndex, setWordIndex] = useState<number | null>(null)
  const save = useCallback((force = false) => {
    const el = audio.current
    if (!el || word.current || resume.current !== null || el.readyState < 1 || finished.current) return
    const seconds = Math.floor(el.currentTime)
    if (!force && Math.abs(seconds - lastSaved.current) < 3) return
    const current = active.current
    write(current.lesson.id + '_' + current.track, { position: el.currentTime, finished: false })
    lastSaved.current = seconds
  }, [])
  const play = useCallback(() => {
    const el = audio.current
    if (!el) return
    if (finished.current) { el.currentTime = 0; finished.current = false }
    setError('')
    void el.play().catch((e: Error) => {
      if (e.name !== 'AbortError') setError('播放未能开始，请检查网络后再点播放。')
    })
  }, [])
  const select = useCallback((next: HistoryLesson, language: Track, autoplay: boolean) => {
    const el = audio.current
    if (!el) return
    save(true)
    const previous = active.current
    if (previous.lesson !== next) {
      // WebKit can expose ended before dispatching its ended event.
      if (el.ended && !word.current) write(previous.lesson.id + '_' + previous.track, { position: 0, finished: true })
      setTimer(value => value === 'episode' ? 'off' : value)
      if (!deadline.current) el.volume = 1
    }
    word.current = null
    setWordIndex(null)
    const saved = progress(next, language)
    resume.current = saved.finished ? 0 : saved.position
    active.current = { lesson: next, track: language }
    finished.current = saved.finished
    lastSaved.current = -1
    setSelection(active.current)
    write('last', { id: next.id, track: language })
    write('track_' + next.id, language)
    setPosition(resume.current)
    setDuration(language === 'zh' ? next.durationZhSec : next.durationElSec)
    setRate(preferredSpeed(language))
    setError('')
    setPlaying(false)
    el.src = HISTORY_AUDIO_BASE_URL + '/' + (language === 'zh' ? next.audioZh : next.audioEl)
    el.defaultPlaybackRate = preferredSpeed(language)
    el.playbackRate = el.defaultPlaybackRate
    el.load()
    // The play call stays in the gesture/ended handler, including when switching tracks.
    if (autoplay) { finished.current = false; play() }
  }, [play, save])
  useEffect(() => {
    const el = audio.current!
    select(active.current.lesson, active.current.track, false)
    const persist = () => save(true)
    window.addEventListener('pagehide', persist)
    document.addEventListener('visibilitychange', persist)
    return () => {
      persist()
      el.pause()
      window.removeEventListener('pagehide', persist)
      document.removeEventListener('visibilitychange', persist)
    }
  }, [select, save])
  const seek = useCallback((value: number) => {
    const el = audio.current
    if (!el || !Number.isFinite(el.duration)) return
    finished.current = false
    el.currentTime = Math.min(Math.max(0, value), el.duration)
    setPosition(el.currentTime)
    save(true)
  }, [save])
  const move = useCallback((step: number, autoplay: boolean) => {
    const current = active.current
    const next = lessons[lessons.indexOf(current.lesson) + step]
    if (next) select(next, current.track, autoplay)
  }, [select])
  const changeTimer = useCallback((value: string) => {
    const seconds = Number(value) * 60
    deadline.current = seconds > 0 ? Date.now() + seconds * 1000 : 0
    setRemaining(seconds > 0 ? seconds : 0)
    setTimer(value)
    if (audio.current) audio.current.volume = 1
  }, [])
  const checkTimer = useCallback(() => {
    if (!deadline.current || !audio.current) return false
    const seconds = (deadline.current - Date.now()) / 1000
    setRemaining(Math.max(0, Math.ceil(seconds)))
    if (seconds <= 0) {
      audio.current.pause()
      changeTimer('off')
      return true
    }
    audio.current.volume = Math.min(1, seconds / 3)
    return false
  }, [changeTimer])
  useEffect(() => {
    if (!deadline.current) return
    const interval = window.setInterval(checkTimer, 250)
    document.addEventListener('visibilitychange', checkTimer)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', checkTimer) }
  }, [timer, checkTimer])
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const session = navigator.mediaSession
    if (typeof MediaMetadata !== 'undefined') session.metadata = new MediaMetadata({
      title: lesson.titleZh + ' · ' + (track === 'zh' ? '中文故事' : '希腊语故事'),
      artist: '希腊历史故事馆', album: lesson.unitTitleZh, artwork: [{ src: artwork(lesson), type: 'image/png' }],
    })
    const actions: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play, pause: () => audio.current?.pause(),
      previoustrack: () => move(-1, true), nexttrack: () => move(1, true),
      seekbackward: e => seek((audio.current?.currentTime || 0) - (e.seekOffset || 15)),
      seekforward: e => seek((audio.current?.currentTime || 0) + (e.seekOffset || 15)),
      seekto: e => { if (e.seekTime !== undefined) seek(e.seekTime) },
    }
    const keys = Object.keys(actions) as MediaSessionAction[]
    for (const key of keys) {
      try { session.setActionHandler(key, actions[key]!) } catch { /* Supported actions vary by iPadOS version. */ }
    }
    return () => {
      for (const key of keys) { try { session.setActionHandler(key, null) } catch { /* Unsupported action. */ } }
      session.metadata = null
      session.playbackState = 'none'
    }
  }, [lesson, track, move, play, seek])
  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing, lesson, track])
  const onEnded = () => {
    if (!audio.current?.ended) return
    if (word.current) {
      const resumeStory = word.current.resumeStory && !checkTimer()
      select(lesson, track, resumeStory)
      return
    }
    finished.current = true
    write(lesson.id + '_' + track, { position: 0, finished: true })
    setPlaying(false)
    if (checkTimer() || timer === 'episode') { changeTimer('off'); return }
    if (mode === 'loop') play()
    else if (mode === 'next') move(1, true)
  }
  return {
    audio, lesson, track, playing, position, duration, rate, mode, timer, remaining, error,
    select, move, seek, play, changeTimer, onEnded, save, wordIndex,
    playWord(index: number) {
      const el = audio.current!
      save(true)
      word.current = { index, resumeStory: word.current?.resumeStory ?? !el.paused }
      setWordIndex(index)
      el.src = HISTORY_AUDIO_BASE_URL + '/' + lesson.id + '/word-' + (index + 1) + '.mp3'
      el.playbackRate = 1
      el.volume = 1
      void el.play().catch(() => {
        if (word.current?.index !== index) return
        select(lesson, track, false)
        setError('词卡发音暂时无法播放。')
      })
    },
    changeRate(value: number) {
      if (audio.current) audio.current.playbackRate = value
      setRate(value); write('speed_' + track, value)
    },
    changeMode(value: PlayMode) { setMode(value); write('mode', value) },
    onMetadata() {
      if (word.current) { audio.current!.playbackRate = 1; return }
      const el = audio.current!
      if (Number.isFinite(el.duration)) setDuration(el.duration)
      if (resume.current !== null) {
        if (resume.current > 0 && resume.current < el.duration) el.currentTime = resume.current
        resume.current = null
      }
      el.playbackRate = preferredSpeed(active.current.track)
      setPosition(el.currentTime)
    },
    onTimeUpdate() {
      if (word.current) { checkTimer(); return }
      if (resume.current !== null) return
      const el = audio.current!
      setPosition(el.currentTime)
      save()
      checkTimer()
      if (timer === 'episode' && Number.isFinite(el.duration)) el.volume = Math.min(1, Math.max(0, (el.duration - el.currentTime) / el.playbackRate / 3))
    },
    onPlay() { setPlaying(true); setError('') },
    onPause() { setPlaying(false); save(true) },
    onError() {
      if (word.current) {
        select(active.current.lesson, active.current.track, false)
        setError('词卡发音暂时无法播放。')
      } else {
        setPlaying(false)
        setError('这条音轨暂时无法载入，请检查网络后重试。')
      }
    },
  }
}
