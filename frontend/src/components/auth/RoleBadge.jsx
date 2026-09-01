// RoleBadge — Displays a role indicator badge across RAAHAT headers and dashboards.

import { ROLE_META } from '../../auth/permissions'

export default function RoleBadge({ role = 'command_center', showSubLabel = true, className = '' }) {
  const meta = ROLE_META[role] || ROLE_META.command_center

  return (
    <div
      className={`role-badge ${className}`}
      style={{
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.color,
      }}
      title={`${meta.label} — ${meta.subLabel}`}
    >
      <span className="role-badge-text">{meta.badgeLabel}</span>
      {showSubLabel && <span className="role-badge-sub">{meta.subLabel}</span>}
    </div>
  )
}
