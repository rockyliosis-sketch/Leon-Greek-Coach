import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronDown, Headphones, Moon, Pause, Play, SkipBack, SkipForward, Sun, Volume2, RotateCcw, RotateCw } from 'lucide-react'
import { artwork, clock, lessons, progress, read, write } from '../../data/history'
import paragraphTimings from '../../data/history/timings.json'
import type { HistoryLesson, Track } from '../../data/history'
import HistoryPractice from './HistoryPractice'
import { speeds, useHistoryPlayer } from './useHistoryPlayer'
import type { PlayMode } from './useHistoryPlayer'
import './HistoryStoryHall.css'

function lessonStatus(lesson: HistoryLesson) {
  const last = read('track_' + lesson.id, 'zh' as Track)
  const saved = progress(lesson, last)
  if (saved.finished) return '已听完'
  if (saved.position > 0) return '上次听到 ' + clock(saved.position)
  const other = progress(lesson, last === 'zh' ? 'el' : 'zh')
  if (other.finished) return '已听完'
  return other.position > 0 ? '上次听到 ' + clock(other.position) : '未听'
}
function highlight(text: string, words: string[]) {
  const names = words.map(word => word.replace(/^(ο|η|το|οι|τα|Ο|Η|Το|Οι|Τα)\s+/u, '').trim()).filter(Boolean)
  if (!names.length) return text
  const escaped = names.sort((a, b) => b.length - a.length).map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp('(?<![\\p{L}])(' + escaped.join('|') + ')(?![\\p{L}])', 'giu')
  return text.split(pattern).map((part, i) => i % 2 ? <mark key={i}>{part}</mark> : part)
}
function Study({ lesson, track, word, playWord, currentParagraph }: { lesson: HistoryLesson; track: Track; word: number | null; playWord: (i: number) => void; currentParagraph: number }) {
  const [translation, setTranslation] = useState(false)
  return <section className="hh-study">
    <details key={track} open={track === 'el'}>
      <summary><span><BookOpen/> {track === 'el' ? '希腊语故事全文' : '中文故事与彩蛋'}</span><ChevronDown/></summary>
      {track === 'el' ? <div className="hh-reading">
        <button aria-pressed={translation} onClick={() => setTranslation(!translation)}>{translation ? '隐藏中文大意' : '显示中文大意'}</button>
        {lesson.elStoryParagraphs.map((p, i) => <div key={i} className="hh-paragraph" aria-current={i === currentParagraph ? 'true' : undefined}><p lang="el">{highlight(p.el, lesson.vocabReview.map(v => v.el))}</p>{translation && <p className="hh-aside">{p.zh}</p>}</div>)}
      </div> : <div className="hh-reading">{lesson.zhStoryScript.map((text, i) => <p key={i}>{text.replace(/\[\[el:(.*?)\]\]/g, ' $1 ')}</p>)}</div>}
    </details>
    <details><summary><span>本课课堂重点卡</span><ChevronDown/></summary>
      <div className="hh-reading">
        <h3>人物与关键词</h3>
        <div className="hh-vocab">{lesson.vocabReview.map((v, i) => <button key={i} aria-label={'点读 ' + v.el} aria-pressed={word === i} onClick={() => playWord(i)}>
          <span><b lang="el">{v.el}</b><Volume2 size={16}/></span><strong>{v.zh}</strong>{v.note && <small>{v.note}</small>}
        </button>)}</div>
        <h3>练习册必懂重点</h3>
        {lesson.workbookKeyPoints.map((p, i) => <article key={i}><h4>{p.titleZh}</h4><p>{p.detailZh}</p><p lang="el" className="hh-aside">{p.detailEl}</p></article>)}
        <p className="hh-caption">课本第 {lesson.textbookPages} 页 · 练习册第 {lesson.workbookPages} 页</p>
      </div>
    </details>
    <details><summary><span>白天轻练习 <small>自选</small></span><ChevronDown/></summary>
      <div className="hh-reading"><HistoryPractice lesson={lesson}/></div>
    </details>
  </section>
}

export default function HistoryStoryHall() {
  const p = useHistoryPlayer()
  const [grade, setGrade] = useState(p.lesson.grade)
  const [night, setNight] = useState(() => read('night', false))
  const { lesson, track } = p
  const units = [...new Set(lessons.filter(item => item.grade === grade).map(item => item.unitNumber))]
  const index = lessons.indexOf(lesson)
  const starts = (paragraphTimings as Record<string, number[]>)[lesson.id] || []
  const currentParagraph = starts.findLastIndex(start => p.position >= start)
  const choose = (item: HistoryLesson, language: Track, autoplay: boolean) => {
    p.select(item, language, autoplay)
  }
  return <main className={'history-hall' + (night ? ' hh-night' : '')}>
    <audio ref={p.audio} preload="metadata" onLoadedMetadata={p.onMetadata} onTimeUpdate={p.onTimeUpdate} onEnded={p.onEnded}
      onPlaying={p.onPlay} onPause={p.onPause} onError={p.onError}/>
    <div className="hh-wrap">
      <nav><Link to="/"><ArrowLeft size={18}/> 返回主页</Link>
        <button aria-pressed={night} onClick={() => { setNight(!night); write('night', !night) }}>{night ? <Sun/> : <Moon/>}{night ? '日间模式' : '睡前模式'}</button></nav>
      <header className="hh-mast"><Headphones/><h1>希腊历史故事馆</h1></header>
      <div className="hh-layout">
        <aside className="hh-library" aria-label="故事书架">
          <h2>故事书架</h2>
          <div className="hh-grades">{[3, 4].map(n => <button key={n} aria-pressed={n === grade} onClick={() => setGrade(n)}>{n === 3 ? '三年级' : '四年级'}<small>{n === 3 ? '希腊神话与史前史' : '古希腊时代'}</small></button>)}</div>
          {!units.length && <p className="hh-empty">四年级故事准备中。</p>}
          {units.map(unit => {
            const entries = lessons.filter(item => item.grade === grade && item.unitNumber === unit)
            return <details key={grade + '-' + unit} open className="hh-unit"><summary>{entries[0].unitTitleZh}<ChevronDown size={16}/></summary>
              <div className="hh-unit-el" lang="el">{entries[0].unitTitleEl}</div>
              {entries.map(item => <button key={item.id} aria-current={item === lesson ? 'true' : undefined} className="hh-episode" onClick={() => choose(item, track, true)}>
                <span className="hh-num">{String(item.lessonNumber).padStart(2, '0')}</span>
                <span><b>{item.titleZh}</b><i lang="el">{item.titleEl}</i><small>{clock(track === 'zh' ? item.durationZhSec : item.durationElSec)} · {lessonStatus(item)}</small></span>
              </button>)}
            </details>
          })}
        </aside>
        <div className="hh-main">
          <section className="hh-player" aria-label="故事播放器">
            <div className="hh-cover"><img src={artwork(lesson)} alt=""/><div><p>第 {lesson.lessonNumber} 课</p><h2>{lesson.titleZh}</h2><p lang="el">{lesson.titleEl}</p></div></div>
            <div className="hh-controls">
              <div className="hh-tracks">{(['zh', 'el'] as const).map(t => <button key={t} aria-pressed={track === t} onClick={() => { if (t !== track) choose(lesson, t, p.playing) }}>{t === 'zh' ? '中文故事版' : '希腊语磨耳朵版'}</button>)}</div>
              <div className="hh-scrub"><input type="range" aria-label="播放进度" min="0" max={p.duration || 1} step="0.1" value={Math.min(p.position, p.duration || 1)} disabled={p.wordIndex !== null} onChange={e => p.seek(Number(e.target.value))}/><div><span>{clock(p.position)}</span><span>{clock(p.duration)}</span></div></div>
              <div className="hh-transport">
                <button aria-label="上一集" title="上一集" disabled={index === 0} onClick={() => p.move(-1, true)}><SkipBack/></button>
                <button aria-label="快退15秒" title="快退15秒" disabled={p.wordIndex !== null} onClick={() => p.seek((p.audio.current?.currentTime || 0) - 15)}><RotateCcw/><small>15</small></button>
                <button className="hh-play" aria-label={p.playing ? '暂停' : '播放'} onClick={() => p.playing ? p.audio.current?.pause() : p.play()}>{p.playing ? <Pause/> : <Play/>}</button>
                <button aria-label="快进15秒" title="快进15秒" disabled={p.wordIndex !== null} onClick={() => p.seek((p.audio.current?.currentTime || 0) + 15)}><RotateCw/><small>15</small></button>
                <button aria-label="下一集" title="下一集" disabled={index === lessons.length - 1} onClick={() => p.move(1, true)}><SkipForward/></button>
              </div>
              <div className="hh-settings">
                <label>播放倍速<select value={p.rate} onChange={e => p.changeRate(Number(e.target.value))}>{speeds.map(s => <option key={s} value={s}>{s === 1 ? '1.0' : s}×</option>)}</select></label>
                <label>播放顺序<select value={p.mode} onChange={e => p.changeMode(e.target.value as PlayMode)}><option value="next">自动连播下一集</option><option value="loop">单集循环</option><option value="stop">播完停止</option></select></label>
                <label>定时关闭<select value={p.timer} onChange={e => p.changeTimer(e.target.value)}><option value="off">不定时</option><option value="episode">播完本集</option>{[10, 15, 20, 30, 45, 60].map(n => <option value={n} key={n}>{n} 分钟</option>)}</select></label>
              </div>
              {p.timer !== 'off' && <p className="hh-caption">定时剩余 {clock(p.timer === 'episode' ? (p.duration - p.position) / p.rate : p.remaining)}</p>}
              {p.error && <p role="alert">{p.error}</p>}
            </div>
          </section>
          <Study key={lesson.id} lesson={lesson} track={track} word={p.wordIndex} playWord={p.playWord} currentParagraph={currentParagraph}/>
        </div>
      </div>
    </div>
  </main>
}
