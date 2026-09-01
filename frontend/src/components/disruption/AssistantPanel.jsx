// AssistantPanel — Natural Language Interface for RAAHAT (Phase 10).
//
// A conversational chat interface that lets users ask questions in natural language
// and receives structured answers from the RAHAAT backend intelligence engines.

import { useState, useRef, useEffect } from 'react'
import { useTwinStore } from '../../state/useTwinStore'
import { askQuestion, getAssistantInfo } from '../../api/assistantApi'

// Suggested prompts for empty state
const SUGGESTED_PROMPTS = [
    "Which area needs attention first?",
    "Show me current supply shortages",
    "What is the impact of closing edge E001?",
    "Recommend the best response for H001 medicine shortage",
    "What happens if edge E005 is closed?",
    "Compare closure vs risk increase for E001"
]

// Type icons for different answer types
const TYPE_META = {
    action_recommendation: { icon: '📋', label: 'Action Plan' },
    scenario_analysis: { icon: '🔮', label: 'Scenario' },
    situational_awareness: { icon: '📊', label: 'Status' },
    impact_analysis: { icon: '⚠️', label: 'Impact' },
    twin_status: { icon: '🌐', label: 'Twin' },
    general: { icon: '🤖', label: 'Assistant' }
}

export default function AssistantPanel() {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(true)
    const [error, setError] = useState(null)
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)

    const clearScenarioResult = useTwinStore((s) => s.clearScenarioResult)

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleSend = async (e) => {
        e.preventDefault()
        const question = input.trim()
        if (!question || isLoading) return

        setIsLoading(true)
        setError(null)
        setShowSuggestions(false)

        // Add user message
        const userMsg = { role: 'user', content: question, timestamp: Date.now() }
        setMessages(prev => [...prev, userMsg])
        setInput('')

        try {
            const result = await askQuestion(question)
            
            // Add assistant message
            const assistantMsg = {
                role: 'assistant',
                content: result.answer,
                type: result.type,
                sources: result.sources_used,
                data: result.data,
                scenario: result.scenario,
                reasoning: result.reasoning,
                timestamp: Date.now()
            }
            setMessages(prev => [...prev, assistantMsg])
            
            // If scenario returned, store in twin store
            if (result.scenario?.is_simulated && result.scenario?.scenario_id) {
                // The scenario panel will pick up from the store
            }
            
        } catch (err) {
            const errorMsg = err.message || 'Failed to get answer. Please try again.'
            setError(errorMsg)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `I encountered an error: ${errorMsg}`,
                type: 'error',
                timestamp: Date.now()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSuggestionClick = (prompt) => {
        setInput(prompt)
        if (inputRef.current) {
            inputRef.current.value = prompt
            inputRef.current.focus()
        }
    }

    const handleClearError = () => setError(null)

    const formatTime = (ts) => {
        const d = new Date(ts)
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const renderMessage = (msg, index) => {
        const isUser = msg.role === 'user'
        const meta = TYPE_META[msg.type] || TYPE_META.general

        if (msg.role === 'error') {
            return (
                <div key={index} className="assistant-message error-message">
                    <div className="error-content">{msg.content}</div>
                </div>
            )
        }

        return (
            <div key={index} className={`assistant-message ${isUser ? 'user' : ''}`}>
                <div className="message-header">
                    <span className="message-role">
                        {isUser ? 'You' : `${meta.icon} RAHAAT`}
                    </span>
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="message-content">
                    <div className="message-text">{msg.content}</div>
                    
                    {!isUser && msg.reasoning && msg.reasoning.length > 0 && (
                        <div className="message-reasoning">
                            <strong>Reasoning:</strong>
                            <ul>
                                {msg.reasoning.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                        </div>
                    )}

                    {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="message-sources">
                            <span className="sources-label">Sources:</span>
                            <span className="sources-list">
                                {msg.sources.map((s, i) => (
                                    <span key={i} className="source-badge">{s}</span>
                                ))}
                            </span>
                        </div>
                    )}

                    {!isUser && msg.scenario?.is_simulated && (
                        <div className="simulation-badge">
                            🔮 Simulation: {msg.scenario.scenario_id || 'active'}
                        </div>
                    )}

                    {/* Actionable data cards */}
                    {!isUser && msg.data && Object.keys(msg.data).length > 0 && (
                        <div className="message-data-cards">
                            {Object.entries(msg.data).map(([tool, result]) => {
                                if (!result || !result.success) return null
                                const data = result.data
                                
                                if (tool === 'recommend_action' && data?.success) {
                                    return (
                                        <div key={tool} className="action-card">
                                            <strong>Action Plan</strong>
                                            <div>Warehouse: {data.selected_warehouse?.id} ({data.selected_warehouse?.name})</div>
                                            <div>Vehicle: {data.selected_vehicle?.id} ({data.selected_vehicle?.type})</div>
                                            <div>Route: {data.selected_route?.total_distance} km, {data.selected_route?.weighted_cost} min</div>
                                            <div>Resource: {data.request?.resource} — {data.request?.required_quantity} units</div>
                                        </div>
                                    )
                                }
                                if (tool === 'get_priority' && data?.priorities?.length) {
                                    return (
                                        <div key={tool} className="priority-card">
                                            <strong>Top Priority</strong>
                                            {data.priorities.slice(0, 3).map((p, i) => (
                                                <div key={i} className="priority-item">
                                                    #{p.rank} {p.facility.id} — {p.resource.type} (Score: {p.priority_score})
                                                </div>
                                            ))}
                                        </div>
                                    )
                                }
                                if (tool === 'get_impact' && data?.impact_score !== undefined) {
                                    return (
                                        <div key={tool} className="impact-card">
                                            <strong>Impact Analysis</strong>
                                            <div>Score: {data.impact_score}/100 — Level: {data.impact_level}</div>
                                            <div>Affected: {data.regional_metrics?.affected_villages_count} villages, {data.regional_metrics?.affected_population} people</div>
                                        </div>
                                    )
                                }
                                return null
                            })}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="assistant-panel control-panel">
            <div className="assistant-header">
                <span className="control-title">🤖 RAHAAT Assistant</span>
                <span className="live-badge">LIVE</span>
            </div>

            {error && (
                <div className="control-error" onClick={handleClearError}>
                    {error}
                </div>
            )}

            <div className="messages-container" ref={messagesEndRef}>
                {messages.length === 0 && showSuggestions && (
                    <div className="suggestions-panel">
                        <div className="suggestions-title">Suggested questions:</div>
                        <div className="suggestions-grid">
                            {SUGGESTED_PROMPTS.map((prompt, i) => (
                                <button
                                    key={i}
                                    className="suggestion-chip"
                                    onClick={() => handleSuggestionClick(prompt)}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map(renderMessage)}
            </div>

            <form onSubmit={handleSend} className="assistant-input-form">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={messages.length === 0 ? "Ask RAHAAT..." : "Ask a follow-up..."}
                    className="assistant-input"
                    disabled={isLoading}
                    aria-label="Ask RAHAAT"
                />
                <button
                    type="submit"
                    className="assistant-send-btn"
                    disabled={isLoading || !input.trim()}
                >
                    {isLoading ? 'Thinking…' : 'Send'}
                </button>
            </form>
        </div>
    )
}