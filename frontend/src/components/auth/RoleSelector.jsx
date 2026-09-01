// RoleSelector — Clean tab control above email input on the RAAHAT Login page.

import { ROLES, ROLE_META } from '../../auth/permissions'

export default function RoleSelector({ selectedRole, onSelectRole }) {
  const roles = [ROLES.COMMAND_CENTER, ROLES.FIELD_OFFICER]

  return (
    <div className="role-selector-wrap" id="role-selector">
      <label className="role-selector-label">Select System Access Mode</label>
      <div className="role-selector-tabs">
        {roles.map((rKey) => {
          const meta = ROLE_META[rKey]
          const isSelected = selectedRole === rKey
          return (
            <button
              key={rKey}
              type="button"
              className={`role-tab ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelectRole(rKey)}
              id={`role-tab-${rKey}`}
            >
              <span className="material-symbols-outlined role-tab-icon">
                {meta.icon}
              </span>
              <span className="role-tab-name">{meta.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
