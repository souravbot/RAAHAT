// IconSidebar — thin icon-only navigation rail with Material Symbols.
// Each item shows a tooltip on hover. Active state highlighted with accent.

import { useState } from 'react'

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
  { id: 'map', icon: 'map', label: 'Map' },
  { id: 'disruptions', icon: 'bolt', label: 'Disruption Control' },
  { id: 'impact', icon: 'query_stats', label: 'Impact Analysis' },
  { id: 'queue', icon: 'priority_high', label: 'Priority Queue' },
  { id: 'action-plan', icon: 'assignment_turned_in', label: 'Action Plan' },
  { id: 'compare', icon: 'compare_arrows', label: 'Scenario Comparison' },
  { id: 'assistant', icon: 'psychology', label: 'AI Assistant' },
  { id: 'workflow', icon: 'account_tree', label: 'Response Workflow' },
]

export default function IconSidebar({ activeView = 'dashboard', onNavigate }) {
  const [hoveredId, setHoveredId] = useState(null)

  return (
    <nav className="icon-sidebar" id="icon-sidebar">
      <div className="icon-sidebar-top">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`icon-sidebar-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => onNavigate?.(item.id)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={item.label}
            >
              <span className="material-symbols-outlined icon-sidebar-icon">
                {item.icon}
              </span>
              <span className="icon-sidebar-label">{item.label}</span>
              {hoveredId === item.id && (
                <span className="icon-sidebar-tooltip">{item.label}</span>
              )}
            </button>
          )
        })}
      </div>
      <div className="icon-sidebar-bottom">
        <button
          className="icon-sidebar-btn"
          title="Settings"
          onMouseEnter={() => setHoveredId('settings')}
          onMouseLeave={() => setHoveredId(null)}
        >
          <span className="material-symbols-outlined icon-sidebar-icon">
            settings
          </span>
          <span className="icon-sidebar-label">Settings</span>
          {hoveredId === 'settings' && (
            <span className="icon-sidebar-tooltip">Settings</span>
          )}
        </button>
      </div>
    </nav>
  )
}
