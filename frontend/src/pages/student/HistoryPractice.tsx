import { useState } from 'react'
import { arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { APP_VERSION } from '../../lib/autoUpdate'
import type { HistoryLesson, PracticeQuestion } from '../../data/history'

function shuffled<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function Question({ q, id, next }: { q: PracticeQuestion; id: string; next: () => void }) {
  const [hint, setHint] = useState(false)
  const [ideas, setIdeas] = useState(false)
  const [response, setResponse] = useState('')
  const [feedback, setFeedback] = useState('')
  const [report, setReport] = useState('')
  const [options] = useState(() => shuffled(q.options || []))
  const pairs = q.pairs || []
  const [rights] = useState(() => shuffled(pairs.map(p => p.right)))
  const [left, setLeft] = useState('')
  const [solved, setSolved] = useState<string[]>([])
  const correct = q.type === 'match' ? solved.length === pairs.length : !!response && response === q.answer
  function choose(answer: string) {
    setResponse(answer)
    setFeedback(answer === q.answer ? '答对了！' : '再想一想，也可以看看中文提示。')
  }
  function pair(right: string) {
    if (!left) return
    setResponse(left + ' → ' + right)
    if (pairs.some(p => p.left === left && p.right === right)) {
      setSolved([...solved, left])
      setFeedback('配对成功。')
      setLeft('')
    } else setFeedback('再想一想，哪个和它有关？')
  }
  async function sendReport() {
    setReport('正在提交')
    const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Athens' }).format(new Date())
    try {
      await updateDoc(doc(db, 'leon_greek_coach', 'shared_state'), {
        user_feedback: arrayUnion({
          id: crypto.randomUUID(), questionId: id, greek: q.questionEl, expected: q.answer || pairs.map(p => p.left + ' → ' + p.right).join('；') || '开放表达',
          userTyped: response, reason: 'other', note: '历史故事馆 · 白天轻练习', wordKey: q.questionEl, date, status: 'pending', v: APP_VERSION,
        }),
      })
      setReport('已提交给家长')
    } catch { setReport('提交失败，点此重试') }
  }
  return <div className="hh-question">
    <h3 lang="el">{q.questionEl}</h3>
    <button aria-expanded={hint} onClick={() => setHint(!hint)}>{hint ? '收起中文提示' : '💡 看中文提示'}</button>
    {hint && <p className="hh-aside">{q.questionZhHint}</p>}
    {q.type === 'match' ? <div className="hh-match">
      <div>{pairs.map(p => <button key={p.left} disabled={solved.includes(p.left)} aria-pressed={p.left === left} onClick={() => setLeft(p.left)}>{p.left}</button>)}</div>
      <div>{rights.map(right => <button key={right} disabled={!left || pairs.some(p => p.right === right && solved.includes(p.left))} onClick={() => pair(right)}>{right}</button>)}</div>
    </div> : q.type === 'prompt_card' ? <>
      <button aria-expanded={ideas} onClick={() => setIdeas(!ideas)}>{ideas ? '收起表达思路' : '看看可以怎么说'}</button>
      {ideas && q.ideas?.map(idea => <p key={idea.el} className="hh-aside"><b lang="el">{idea.el}</b><br/>{idea.zh}</p>)}
    </> : <div className="hh-options">{options.map(opt => <button key={opt} disabled={correct} aria-pressed={opt === response} onClick={() => choose(opt)}>{opt}</button>)}</div>}
    <p role="status">{feedback} {correct && q.explanationZh}</p>
    <div className="hh-question-actions">
      <button disabled={report === '正在提交' || report === '已提交给家长'} onClick={() => void sendReport()}>{report || '🚩 一键报错'}</button>
      <button onClick={next}>⏭️ 跳过此题</button>
      {(correct || q.type === 'prompt_card') && <button onClick={next}>下一题 →</button>}
    </div>
  </div>
}

export default function HistoryPractice({ lesson }: { lesson: HistoryLesson }) {
  const [index, setIndex] = useState(0)
  const question = lesson.practice[index]
  if (!question) return <div className="hh-question"><p>本课轻练习已结束。</p><button onClick={() => setIndex(0)}>再练一次</button></div>
  return <><p className="hh-caption">第 {index + 1} 题 / 共 {lesson.practice.length} 题</p>
    <Question key={index} q={question} id={lesson.id + '_q' + (index + 1)} next={() => setIndex(i => i + 1)}/></>
}
