'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
  actions?: string[]
}

const QUICK_PROMPTS = [
  'What projects do I have?',
  'What invoices are outstanding?',
  'Create a new project',
  'Log a subcontractor payment',
]

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your construction finance assistant. Tell me what you'd like to log — for example:\n\n• \"Invoiced Smith £45,000 for 30% deposit\"\n• \"Paid ABC Plumbing £3,000 for January works on Smith job\"\n• \"Smith client paid the deposit today\"\n• \"What's outstanding?\"\n\nI'll record everything for you.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const history = messages
      .filter((m: Message) => m.role === 'user' || m.role === 'assistant')
      .map((m: Message) => ({ role: m.role, content: m.content }))

    setMessages((prev: Message[]) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/finance/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history }),
      })
      const data = await res.json()
      setMessages((prev: Message[]) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || 'Something went wrong.',
          actions: data.actions || [],
        },
      ])
    } catch {
      setMessages((prev: Message[]) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-[#ECECE8] flex-shrink-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div>
          <h1 className="font-semibold text-[#0B0B0C]">Finance Assistant</h1>
          <p className="text-xs text-[#8C8C88]">Describe a transaction in plain English — I'll log it</p>
        </div>
        <div className="ml-auto">
          <Link
            href="/finance/projects"
            className="text-sm text-[#8C8C88] hover:text-[#0B0B0C] transition-colors"
          >
            ← Back to projects
          </Link>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="px-6 py-3 bg-white border-b border-[#ECECE8] flex gap-2 flex-wrap flex-shrink-0">
        {QUICK_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => send(p)}
            disabled={loading}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#ECECE8] text-[#8C8C88] hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-all disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
              {msg.role === 'assistant' && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div
                className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'text-white rounded-br-sm'
                    : 'bg-white border border-[#ECECE8] text-[#0B0B0C] rounded-bl-sm'
                }`}
                style={msg.role === 'user' ? { background: 'linear-gradient(135deg,#f59e0b,#ef4444)' } : {}}
              >
                {msg.content}
              </div>
              {/* Action chips */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.actions.map((action, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {action}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#ECECE8] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#ECECE8] animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 bg-white border-t border-[#ECECE8] flex-shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="e.g. Invoiced Johnson £12,000 monthly progress, or paid Dave Electrics £2,500 today…"
            rows={2}
            className="flex-1 px-4 py-3 rounded-xl border border-[#ECECE8] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            disabled={loading}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl text-white flex-shrink-0 disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(120deg,#f59e0b,#ef4444)' }}
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-xs text-[#8C8C88] mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
