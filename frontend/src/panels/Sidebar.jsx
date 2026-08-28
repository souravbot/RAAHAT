// Sidebar — lists all nodes, supports type filter + name/ID search, and
// focuses the map on a selected node.

import { useMemo, useState } from 'react'
import { useTwinStore } from '../state/useTwinStore'
import { NODE_META } from '../map/icons'

export default function Sidebar() {
  const nodes = useTwinStore((s) => s.nodes)
  const summary = useTwinStore((s) => s.summary)
  const selectedNodeId = useTwinStore((s) => s.selectedNodeId)
  const focusNode = useTwinStore((s) => s.focusNode)

  const [filter, setFilter] = useState('ALL')
  const [query, setQuery] = useState('')

  const typeOptions = useMemo(
    () => Object.entries(NODE_META).sort((a, b) => a[1].label.localeCompare(b[1].label)),
    [],
  )

  const filtered = useMemo(() => {
    let list = nodes
    if (filter !== 'ALL') {
      list = list.filter((n) => n.type === filter)
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (n) =>
          n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => a.id.localeCompare(b.id))
  }, [nodes, filter, query])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Regional Network</div>
        <div className="sidebar-count">
          {filtered.length} of {nodes.length} nodes
        </div>
      </div>

      <div className="sidebar-controls">
        <input
          className="search-input"
          type="text"
          placeholder="Search name or ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="ALL">All types</option>
          {typeOptions.map(([type, meta]) => (
            <option key={type} value={type}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      <ul className="node-list">
        {filtered.map((node) => {
          const meta = NODE_META[node.type]
          const isSel = selectedNodeId === node.id
          return (
            <li key={node.id}>
              <button
                className={`node-list-item ${isSel ? 'is-active' : ''}`}
                onClick={() => focusNode(node.id)}
              >
                <span
                  className="node-dot"
                  style={{ background: meta?.color || '#94a3b8' }}
                />
                <span className="node-list-main">
                  <span className="node-list-name">{node.name}</span>
                  <span className="node-list-meta">
                    {node.id} · {meta?.label || node.type}
                  </span>
                </span>
                <span
                  className={`mini-status status-${(node.state?.status || '').toLowerCase()}`}
                />
              </button>
            </li>
          )
        })}
        {filtered.length === 0 && (
          <li className="node-list-empty">No nodes match your filter.</li>
        )}
      </ul>
    </aside>
  )
}
