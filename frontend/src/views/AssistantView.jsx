// AssistantView — Dedicated Natural Language Operations Assistant Center (Phase 21).
// Connects to POST /ask backend engine. Uses function calling to retrieve real data
// from Digital Twin, Priority, Depletion, and Recommendation engines.
// Features: Mode indicators (Live vs Sim), contextual prompt suggestions, source transparency badges,
// structured reasoning bullets, and one-click action handoffs.

import { useState, useRef, useEffect } from 'react'
import { useTwinStore } from '../state/useTwinStore'
import { askQuestion } from '../api/assistantApi'

const LIVE_PROMPTS = [
  'Which location currently requires operational attention first and why?',
  'What critical supply shortages and depletion risks are active?',
  'What action plan is recommended for the highest-priority shortage?',
  'What infrastructure routes or bridges are currently degraded or closed?',
]

const SIM_PROMPTS = [
  'What is the cascading impact if Bridge Corridor E023 is closed?',
  'Compare closure versus risk increase for Corridor E023',
  'Which facilities become isolated if the primary bridge is severed?',
  'How does the recommended supply route change during a bridge disruption?',
]

export default function AssistantView() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const selectedEdgeId = useTwinStore((s) => s.selectedEdgeId)
  const selectedPriorityTarget = useTwinStore((s) => s.selectedPriorityTarget)
  const simResult = useTwinStore((s) => s.simResult)
  const scenarioResult = useTwinStore((s) => s.scenarioResult)
  const activeDisruption = useTwinStore((s) => s.activeDisruption)

  const isSimulationMode = simResult !== null || scenarioResult !== null || !!activeDisruption

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = async (textToSend) => {
    const question = (textToSend || input).trim()
    if (!question || isLoading) return

    setIsLoading(true)
    setError(null)

    // Append user message
    const userMsg = {
      role: 'user',
      content: question,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    try {
      const scenarioId = scenarioResult?.scenario?.simulation_id || simResult?.simulation_id || null
      const result = await askQuestion(question, scenarioId)

      // Append assistant message
      const assistantMsg = {
        role: 'assistant',
        content: result.answer,
        type: result.type,
        sources: result.sources_used || [],
        data: result.data || {},
        scenario: result.scenario || {},
        reasoning: result.reasoning || [],
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errorMsg = err.message || 'Unable to process query. Please verify backend connection.'
      setError(errorMsg)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I couldn't retrieve operational data for that query: ${errorMsg}`,
          type: 'error',
          sources: [],
          timestamp: Date.now(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setError(null)
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const prompts = isSimulationMode ? SIM_PROMPTS : LIVE_PROMPTS

  return (
    <div className="assistant-view-container" id="assistant-view">
      {/* ============================================================
          AREA A: ASSISTANT HEADER & OPERATIONAL CONTEXT (Step 3 & 8)
          ============================================================ */}
      <header className="assistant-header-strip">
        <div className="asst-header-left">
          <div className="asst-view-title-group">
            <span className="material-symbols-outlined asst-main-icon">psychology</span>
            <div>
              <h1 className="asst-page-heading">RAAHAT Operations Intelligence Assistant</h1>
              <span className="asst-page-sub">
                Natural language decision support grounded in real Digital Twin, Priority, and Route Optimization engines
              </span>
            </div>
          </div>
        </div>

        <div className="asst-header-right">
          {isSimulationMode ? (
            <div className="asst-context-badge mode-simulation" title="Assistant answering from simulation scenario context">
              <span className="mode-dot dot-sim"></span>
              <span>SIMULATION CONTEXT (NON-LIVE)</span>
            </div>
          ) : (
            <div className="asst-context-badge mode-live" title="Assistant answering from live regional twin context">
              <span className="mode-dot dot-live"></span>
              <span>LIVE OPERATIONAL CONTEXT</span>
            </div>
          )}

          {messages.length > 0 && (
            <button className="btn-clear-chat" onClick={handleClearChat} title="Clear conversation history">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete_sweep</span>
              Clear Chat
            </button>
          )}
        </div>
      </header>

      {/* ============================================================
          MAIN CHAT WORKSPACE
          ============================================================ */}
      <div className="assistant-workspace">
        <div className="chat-thread-container">
          {/* Empty State with Suggested Prompts (Step 9) */}
          {messages.length === 0 && (
            <div className="chat-empty-intro">
              <div className="cei-icon-wrap">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <h2 className="cei-title">How can RAAHAT assist your emergency response?</h2>
              <p className="cei-desc">
                Ask operational questions about regional connectivity, supply depletion, casualty triage priorities, or optimal deployment routes. All answers are generated strictly from verified backend intelligence engines.
              </p>

              <div className="suggested-prompts-grid">
                <span className="spg-heading">SUGGESTED OPERATIONAL INQUIRIES</span>
                <div className="spg-chips">
                  {prompts.map((p, idx) => (
                    <button
                      key={idx}
                      className="suggested-chip-btn"
                      onClick={() => handleSend(p)}
                    >
                      <span className="material-symbols-outlined chip-icon">chat_bubble</span>
                      <span>{p}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Message List */}
          <div className="chat-messages-list">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user'

              return (
                <div
                  key={idx}
                  className={`chat-bubble-row ${isUser ? 'row-user' : 'row-assistant'}`}
                >
                  <div className={`chat-bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
                    <div className="bubble-header">
                      <div className="bubble-author">
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                          {isUser ? 'person' : 'smart_toy'}
                        </span>
                        <strong>{isUser ? 'Operations Officer' : 'RAAHAT Intelligence Assistant'}</strong>
                      </div>
                      <span className="bubble-time">{formatTime(msg.timestamp)}</span>
                    </div>

                    <div className="bubble-text">
                      {msg.content}
                    </div>

                    {/* Structured Reasoning & Rationale (Step 10 & 11) */}
                    {!isUser && msg.reasoning?.length > 0 && (
                      <div className="bubble-reasoning-box">
                        <div className="br-header">
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--amber-500)' }}>insights</span>
                          <span>Decision Rationale &amp; Audit Trail:</span>
                        </div>
                        <ul className="br-list">
                          {msg.reasoning.map((r, rIdx) => (
                            <li key={rIdx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Source Transparency Badges (Step 11) */}
                    {!isUser && msg.sources?.length > 0 && (
                      <div className="bubble-sources-row">
                        <span className="sources-label">Data Verified Via:</span>
                        <div className="sources-tags">
                          {msg.sources.map((s, sIdx) => (
                            <span key={sIdx} className="source-tag-badge">
                              ✓ {s.replace('get_', '').replace('_', ' ').toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="chat-bubble-row row-assistant">
                <div className="chat-bubble bubble-assistant bubble-loading">
                  <span className="material-symbols-outlined spin-loading" style={{ fontSize: '18px' }}>hourglass_top</span>
                  <span>Querying backend engines &amp; synthesizing verified operational answer…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form className="chat-input-bar" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
            <input
              ref={inputRef}
              type="text"
              className="chat-text-input"
              placeholder="Ask RAAHAT (e.g., Which location needs help first? What action is recommended?)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="btn-send-query"
              disabled={!input.trim() || isLoading}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
              <span>Ask Assistant</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
