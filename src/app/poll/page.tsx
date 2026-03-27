'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Vote, CheckCircle2, Lock, Loader2, ChevronRight, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Poll, PollOption } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

interface PollOptionWithCount extends PollOption {
  vote_count: number
}
interface PollWithCounts extends Omit<Poll, 'options'> {
  options: PollOptionWithCount[]
  total_votes: number
  user_voted_option_id: string | null
}

export default function PollPage() {
  const supabase = createClient()
  const [user,         setUser]         = useState<User | null>(null)
  const [poll,         setPoll]         = useState<PollWithCounts | null>(null)
  const [pastPolls,    setPastPolls]    = useState<PollWithCounts[]>([])
  const [loading,      setLoading]      = useState(true)
  const [voting,       setVoting]       = useState(false)
  const [selected,     setSelected]     = useState<string | null>(null)
  const [hasVoted,     setHasVoted]     = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u)
      await loadPolls(u?.id)
      setLoading(false)
    }
    load()
  }, [supabase])

  async function loadPolls(userId?: string) {
    // Active poll
    const { data: activePoll } = await supabase
      .from('polls')
      .select(`*, options:poll_options_with_counts(*)`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activePoll) {
      const options = (activePoll.options as PollOptionWithCount[]) || []
      const total = options.reduce((s: number, o: PollOptionWithCount) => s + (o.vote_count || 0), 0)

      let userVotedOptionId: string | null = null
      if (userId) {
        const { data: vote } = await supabase
          .from('poll_votes')
          .select('option_id')
          .eq('poll_id', activePoll.id)
          .eq('user_id', userId)
          .maybeSingle()
        userVotedOptionId = vote?.option_id ?? null
      }

      const pollWithCounts: PollWithCounts = {
        ...activePoll,
        options: options.sort((a: PollOptionWithCount, b: PollOptionWithCount) => a.display_order - b.display_order),
        total_votes: total,
        user_voted_option_id: userVotedOptionId,
      }
      setPoll(pollWithCounts)
      if (userVotedOptionId) {
        setHasVoted(true)
        setSelected(userVotedOptionId)
      }
    }

    // Past polls
    const { data: past } = await supabase
      .from('polls')
      .select(`*, options:poll_options_with_counts(*)`)
      .eq('is_active', false)
      .order('created_at', { ascending: false })
      .limit(3)
    if (past) {
      setPastPolls(past.map((p: Poll & { options: PollOptionWithCount[] }) => {
        const opts = (p.options as PollOptionWithCount[]) || []
        return {
          ...p,
          options: opts,
          total_votes: opts.reduce((s: number, o: PollOptionWithCount) => s + (o.vote_count || 0), 0),
          user_voted_option_id: null,
        }
      }))
    }
  }

  async function handleVote() {
    if (!selected || !poll) return
    if (!user) { toast.error('请先登录再投票'); return }
    if (hasVoted) return

    setVoting(true)
    try {
      const { error } = await supabase.from('poll_votes').insert({
        poll_id: poll.id,
        option_id: selected,
        user_id: user.id,
      })
      if (error) throw error

      setHasVoted(true)
      toast.success('投票成功！感谢您的参与 🎉')
      await loadPolls(user.id)
    } catch {
      toast.error('投票失败，请重试')
    } finally {
      setVoting(false)
    }
  }

  if (loading) return (
    <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-gold-500" />
    </div>
  )

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="bg-brown-900 relative overflow-hidden py-14 sm:py-20">
        <div className="absolute inset-0 opacity-10">
          <Image src="/images/osmanthus-cups.jpg" alt="" fill sizes="100vw" className="object-cover" />
        </div>
        <div className="relative container-wide text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Vote size={16} className="text-gold-400" />
            <span className="text-gold-400 text-sm font-medium tracking-widest uppercase">Weekly Poll</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-cream-100 mb-3">投票点餐</h1>
          <p className="text-cream-300 opacity-70">告诉我下周你想吃什么 · Tell me what you want next week</p>
        </div>
      </div>

      <div className="container-narrow section-sm">

        {/* Active poll */}
        {poll ? (
          <div className="card p-6 sm:p-8 mb-12">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <span className="badge bg-matcha-400/20 text-matcha-600 text-xs mb-2">
                  🟢 进行中 · Active
                </span>
                <h2 className="heading-sm mt-1">{poll.question_zh}</h2>
                {poll.question_en && (
                  <p className="text-brown-400 text-sm mt-0.5">{poll.question_en}</p>
                )}
              </div>
              <span className="text-xs text-brown-400 shrink-0 bg-cream-200 px-2.5 py-1 rounded-full">
                {poll.total_votes} 票
              </span>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {poll.options.map(opt => {
                const pct = poll.total_votes > 0
                  ? Math.round((opt.vote_count / poll.total_votes) * 100)
                  : 0
                const isMyVote = selected === opt.id
                const showResults = hasVoted

                return (
                  <div key={opt.id}>
                    <button
                      type="button"
                      disabled={hasVoted || voting}
                      onClick={() => !hasVoted && setSelected(opt.id)}
                      className={cn(
                        'w-full text-left rounded-xl border-2 overflow-hidden transition-all duration-200',
                        isMyVote
                          ? 'border-brown-900 bg-brown-900'
                          : hasVoted
                            ? 'border-cream-300 cursor-default'
                            : 'border-cream-300 hover:border-brown-400 hover:bg-cream-100 cursor-pointer'
                      )}
                    >
                      <div className="relative px-4 py-3">
                        {/* Progress bar (after voting) */}
                        {showResults && (
                          <div
                            className={cn(
                              'absolute left-0 top-0 h-full transition-all duration-700 rounded-l-xl',
                              isMyVote ? 'bg-gold-400/30' : 'bg-cream-200/80'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        )}
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isMyVote && hasVoted ? (
                              <CheckCircle2 size={16} className="text-gold-400 shrink-0" />
                            ) : (
                              <div className={cn(
                                'w-4 h-4 rounded-full border-2 shrink-0',
                                isMyVote ? 'border-gold-400 bg-gold-400' : 'border-cream-400'
                              )} />
                            )}
                            <span className={cn(
                              'text-sm font-medium',
                              isMyVote ? 'text-cream-100' : 'text-brown-800'
                            )}>
                              {opt.label_zh}
                            </span>
                            {opt.label_en && (
                              <span className={cn(
                                'text-xs hidden sm:block',
                                isMyVote ? 'text-cream-300' : 'text-brown-400'
                              )}>
                                {opt.label_en}
                              </span>
                            )}
                          </div>
                          {showResults && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className={isMyVote ? 'text-gold-300' : 'text-brown-400'}>
                                {opt.vote_count} 票
                              </span>
                              <span className={cn(
                                'font-bold',
                                isMyVote ? 'text-gold-300' : 'text-brown-600'
                              )}>
                                {pct}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Actions */}
            {!user ? (
              <div className="bg-cream-200 rounded-xl p-4 text-center">
                <Lock size={16} className="text-brown-400 mx-auto mb-2" />
                <p className="text-sm text-brown-600 mb-3">请先登录才能参与投票</p>
                <Link href="/auth/login" className="btn-primary btn btn-sm">
                  登录参与投票 <ChevronRight size={14} />
                </Link>
              </div>
            ) : hasVoted ? (
              <div className="flex items-center gap-2 text-matcha-600 text-sm bg-matcha-400/10 rounded-xl p-4">
                <CheckCircle2 size={16} />
                <span>您已投票！感谢参与。Your vote has been recorded.</span>
              </div>
            ) : (
              <button
                onClick={handleVote}
                disabled={!selected || voting}
                className="btn-gold btn w-full"
              >
                {voting ? (
                  <><Loader2 size={16} className="animate-spin" /> 提交中...</>
                ) : selected ? '确认投票' : '请先选择一项'}
              </button>
            )}
          </div>
        ) : (
          <div className="card p-10 text-center mb-12">
            <MessageSquare size={36} className="text-brown-300 mx-auto mb-4" />
            <h2 className="font-serif text-xl text-brown-700 mb-2">暂无进行中的投票</h2>
            <p className="text-sm text-brown-400">No active poll right now — check back soon!</p>
          </div>
        )}

        {/* Past polls */}
        {pastPolls.length > 0 && (
          <div>
            <h2 className="heading-sm mb-6">往期投票结果</h2>
            <div className="space-y-6">
              {pastPolls.map(p => (
                <div key={p.id} className="card p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <span className="badge bg-cream-300 text-brown-500 text-xs mb-1.5">已结束</span>
                      <h3 className="font-serif text-base text-brown-800">{p.question_zh}</h3>
                    </div>
                    <span className="text-xs text-brown-400 shrink-0">{p.total_votes} 票</span>
                  </div>
                  <div className="space-y-2">
                    {p.options
                      .sort((a: PollOptionWithCount, b: PollOptionWithCount) => b.vote_count - a.vote_count)
                      .slice(0, 5)
                      .map((opt: PollOptionWithCount) => {
                        const pct = p.total_votes > 0 ? Math.round((opt.vote_count / p.total_votes) * 100) : 0
                        const isTop = p.options[0]?.id === opt.id
                        return (
                          <div key={opt.id} className="flex items-center gap-3">
                            <div className="flex-1 relative h-7 bg-cream-200 rounded-lg overflow-hidden">
                              <div
                                className={cn('h-full rounded-lg transition-all', isTop ? 'bg-gold-400/60' : 'bg-cream-300')}
                                style={{ width: `${pct}%` }}
                              />
                              <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-brown-700">
                                {opt.label_zh}
                              </span>
                            </div>
                            <span className="text-xs text-brown-500 w-10 text-right font-medium">{pct}%</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
