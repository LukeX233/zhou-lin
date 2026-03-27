'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/utils'
import { Plus, Trash2, Loader2, CheckCircle2, XCircle, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Poll, PollOption } from '@/lib/types'

interface PollOptionWithCount extends PollOption { vote_count: number }
interface PollFull extends Omit<Poll, 'options'> {
  options: PollOptionWithCount[]
  total_votes: number
}

export default function AdminPollPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [polls,   setPolls]   = useState<PollFull[]>([])
  const [loading, setLoading] = useState(true)

  // New poll form
  const [showForm,    setShowForm]    = useState(false)
  const [questionZh,  setQuestionZh]  = useState('')
  const [questionEn,  setQuestionEn]  = useState('')
  const [options,     setOptions]     = useState([
    { label_zh: '', label_en: '' },
    { label_zh: '', label_en: '' },
  ])
  const [closesAt, setClosesAt] = useState('')
  const [creating, setCreating] = useState(false)

  const loadPolls = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.email)) { router.push('/'); return }

    const { data } = await supabase
      .from('polls')
      .select(`*, options:poll_options_with_counts(*)`)
      .order('created_at', { ascending: false })

    const pollsFull = (data || []).map((p: Poll & { options: PollOptionWithCount[] }) => {
      const opts = (p.options as PollOptionWithCount[]) || []
      return {
        ...p,
        options: opts.sort((a, b) => a.display_order - b.display_order),
        total_votes: opts.reduce((s, o) => s + (o.vote_count || 0), 0),
      }
    })
    setPolls(pollsFull)
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { loadPolls() }, [loadPolls])

  async function togglePollActive(poll: PollFull) {
    await supabase.from('polls').update({ is_active: !poll.is_active }).eq('id', poll.id)
    toast.success(poll.is_active ? '投票已关闭' : '投票已开启')
    await loadPolls()
  }

  async function deletePoll(poll: PollFull) {
    if (!confirm('确定要删除此投票？')) return
    await supabase.from('polls').delete().eq('id', poll.id)
    toast.success('已删除')
    await loadPolls()
  }

  async function createPoll(e: React.FormEvent) {
    e.preventDefault()
    if (!questionZh.trim()) { toast.error('请填写投票问题'); return }
    const validOpts = options.filter(o => o.label_zh.trim())
    if (validOpts.length < 2) { toast.error('至少填写2个选项'); return }

    setCreating(true)
    try {
      const { data: pollData, error: pollErr } = await supabase
        .from('polls')
        .insert({
          question_zh: questionZh.trim(),
          question_en: questionEn.trim() || null,
          is_active: true,
          closes_at: closesAt || null,
        })
        .select('id')
        .single()
      if (pollErr) throw pollErr

      await supabase.from('poll_options').insert(
        validOpts.map((opt, i) => ({
          poll_id: pollData.id,
          label_zh: opt.label_zh.trim(),
          label_en: opt.label_en.trim() || null,
          display_order: i,
        }))
      )

      toast.success('投票已发布！')
      setShowForm(false)
      setQuestionZh(''); setQuestionEn(''); setClosesAt('')
      setOptions([{ label_zh: '', label_en: '' }, { label_zh: '', label_en: '' }])
      await loadPolls()
    } catch {
      toast.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return (
    <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-gold-500" />
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="bg-brown-900 py-10">
        <div className="container-wide flex items-center justify-between">
          <div>
            <p className="text-gold-400 text-sm font-medium tracking-widest uppercase mb-1">Admin</p>
            <h1 className="font-serif text-3xl text-cream-100">投票管理</h1>
          </div>
          <button onClick={() => setShowForm(v => !v)} className="btn-gold btn">
            <Plus size={16} /> 发布新投票
          </button>
        </div>
      </div>

      <div className="container-narrow py-8 space-y-6">
        {/* Create form */}
        {showForm && (
          <div className="card p-6 sm:p-8 space-y-5 border-2 border-gold-400/30">
            <h2 className="font-serif text-xl text-brown-900">新建投票</h2>
            <form onSubmit={createPoll} className="space-y-5">
              <div>
                <label className="label">投票问题（中文）<span className="text-terra-500">*</span></label>
                <input className="input" placeholder="例：下周你想吃什么？" value={questionZh}
                  onChange={e => setQuestionZh(e.target.value)} required />
              </div>
              <div>
                <label className="label">投票问题（英文）</label>
                <input className="input" placeholder="e.g. What would you like next week?" value={questionEn}
                  onChange={e => setQuestionEn(e.target.value)} />
              </div>
              <div>
                <label className="label">截止时间（可选）</label>
                <input className="input" type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="label">投票选项 <span className="text-terra-500">*</span></label>
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-brown-400 w-5 text-right">{i + 1}.</span>
                    <input className="input flex-1" placeholder={`选项${i + 1}（中文）`} value={opt.label_zh}
                      onChange={e => setOptions(o => o.map((x, j) => j === i ? { ...x, label_zh: e.target.value } : x))} />
                    <input className="input w-32" placeholder="English" value={opt.label_en}
                      onChange={e => setOptions(o => o.map((x, j) => j === i ? { ...x, label_en: e.target.value } : x))} />
                    {options.length > 2 && (
                      <button type="button" onClick={() => setOptions(o => o.filter((_, j) => j !== i))}
                        className="text-terra-400 hover:text-terra-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button"
                  onClick={() => setOptions(o => [...o, { label_zh: '', label_en: '' }])}
                  className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1">
                  <Plus size={12} /> 添加选项
                </button>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline btn flex-1">取消</button>
                <button type="submit" disabled={creating} className="btn-gold btn flex-1">
                  {creating ? <><Loader2 size={14} className="animate-spin" /> 发布中...</> : '发布投票'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Polls list */}
        {polls.length === 0 ? (
          <div className="text-center py-16 text-brown-400">
            <p className="mb-4">暂无投票</p>
            <button onClick={() => setShowForm(true)} className="btn-primary btn">发布第一个投票</button>
          </div>
        ) : polls.map(poll => (
          <div key={poll.id} className="card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className={`badge text-xs mb-2 ${poll.is_active ? 'bg-matcha-400/20 text-matcha-600' : 'bg-cream-300 text-brown-500'}`}>
                  {poll.is_active ? '🟢 进行中' : '⚫ 已结束'}
                </span>
                <h3 className="font-serif text-lg text-brown-900">{poll.question_zh}</h3>
                {poll.question_en && <p className="text-xs text-brown-400">{poll.question_en}</p>}
              </div>
              <span className="text-xs text-brown-400 shrink-0 bg-cream-100 px-2.5 py-1 rounded-full">
                {poll.total_votes} 票
              </span>
            </div>

            {/* Results */}
            <div className="space-y-2 mb-4">
              {poll.options.map(opt => {
                const pct = poll.total_votes > 0 ? Math.round((opt.vote_count / poll.total_votes) * 100) : 0
                const isTop = poll.options[0]?.id === opt.id && poll.total_votes > 0
                return (
                  <div key={opt.id} className="flex items-center gap-3">
                    <div className="flex-1 relative h-8 bg-cream-200 rounded-xl overflow-hidden">
                      <div
                        className={`h-full rounded-xl transition-all ${isTop ? 'bg-gold-400/60' : 'bg-cream-300'}`}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-3 text-xs text-brown-700 font-medium">
                        {opt.label_zh}
                      </span>
                    </div>
                    <div className="text-right w-20 text-xs text-brown-500">
                      <span className="font-bold text-brown-800">{pct}%</span>
                      <span className="text-brown-400 ml-1">({opt.vote_count}票)</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2">
              <button onClick={() => togglePollActive(poll)}
                className={`btn-sm btn flex items-center gap-1.5 border-2 transition-all
                  ${poll.is_active
                    ? 'border-terra-400/40 text-terra-600 hover:bg-terra-400/10'
                    : 'border-matcha-400/40 text-matcha-600 hover:bg-matcha-400/10'}`}>
                {poll.is_active ? <><XCircle size={12} /> 关闭投票</> : <><CheckCircle2 size={12} /> 重新开启</>}
              </button>
              <button onClick={() => deletePoll(poll)}
                className="btn-sm btn border-2 border-terra-300/40 text-terra-400 hover:bg-terra-400/10 flex items-center gap-1.5">
                <Trash2 size={12} /> 删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
