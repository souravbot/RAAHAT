// Centralized Role-Based Access Control (RBAC) definitions for RAAHAT.

export const ROLES = {
  COMMAND_CENTER: 'command_center',
  FIELD_OFFICER: 'field_officer',
  DEMO: 'demo',
}

export const ROLE_META = {
  command_center: {
    id: 'command_center',
    label: 'Command Center',
    badgeLabel: '🛡 COMMAND CENTER',
    subLabel: 'Full System Access',
    icon: 'shield_person',
    color: '#051960',
    bg: 'rgba(5, 25, 96, 0.08)',
    border: 'rgba(5, 25, 96, 0.2)',
  },
  field_officer: {
    id: 'field_officer',
    label: 'Field Officer',
    badgeLabel: '👤 FIELD OFFICER',
    subLabel: 'Operational Access',
    icon: 'badge',
    color: '#1C7293',
    bg: 'rgba(28, 114, 147, 0.08)',
    border: 'rgba(28, 114, 147, 0.25)',
  },
  demo: {
    id: 'demo',
    label: 'Hackathon Demo Mode',
    badgeLabel: '🎯 HACKATHON DEMO MODE',
    subLabel: 'Interactive Workflow',
    icon: 'sports_score',
    color: '#E8871E',
    bg: 'rgba(232, 135, 30, 0.12)',
    border: 'rgba(232, 135, 30, 0.3)',
  },
}

export const PERMISSIONS = {
  // Common / Operational
  VIEW_MAP: 'view_map',
  VIEW_ALERTS: 'view_alerts',
  VIEW_PRIORITIES: 'view_priorities',
  VIEW_ASSIGNMENTS: 'view_assignments',
  VIEW_ROUTES: 'view_routes',
  VIEW_RESOURCES: 'view_resources',
  USE_ASSISTANT: 'use_assistant',

  // Administrative / Command Center only
  MANAGE_TWIN: 'manage_twin',
  TRIGGER_DISRUPTION: 'trigger_disruption',
  RUN_SIMULATIONS: 'run_simulations',
  COMPARE_SCENARIOS: 'compare_scenarios',
  ALLOCATE_RESOURCES: 'allocate_resources',
  RESET_DEMO: 'reset_demo',
  RUN_DEMO: 'run_demo',
}

export const ROLE_PERMISSIONS = {
  command_center: {
    full_access: true,
    [PERMISSIONS.VIEW_MAP]: true,
    [PERMISSIONS.VIEW_ALERTS]: true,
    [PERMISSIONS.VIEW_PRIORITIES]: true,
    [PERMISSIONS.VIEW_ASSIGNMENTS]: true,
    [PERMISSIONS.VIEW_ROUTES]: true,
    [PERMISSIONS.VIEW_RESOURCES]: true,
    [PERMISSIONS.USE_ASSISTANT]: true,
    [PERMISSIONS.MANAGE_TWIN]: true,
    [PERMISSIONS.TRIGGER_DISRUPTION]: true,
    [PERMISSIONS.RUN_SIMULATIONS]: true,
    [PERMISSIONS.COMPARE_SCENARIOS]: true,
    [PERMISSIONS.ALLOCATE_RESOURCES]: true,
    [PERMISSIONS.RESET_DEMO]: true,
    [PERMISSIONS.RUN_DEMO]: true,
  },
  field_officer: {
    full_access: false,
    [PERMISSIONS.VIEW_MAP]: true,
    [PERMISSIONS.VIEW_ALERTS]: true,
    [PERMISSIONS.VIEW_PRIORITIES]: true,
    [PERMISSIONS.VIEW_ASSIGNMENTS]: true,
    [PERMISSIONS.VIEW_ROUTES]: true,
    [PERMISSIONS.VIEW_RESOURCES]: true,
    [PERMISSIONS.USE_ASSISTANT]: true,
    [PERMISSIONS.MANAGE_TWIN]: false,
    [PERMISSIONS.TRIGGER_DISRUPTION]: false,
    [PERMISSIONS.RUN_SIMULATIONS]: false,
    [PERMISSIONS.COMPARE_SCENARIOS]: false,
    [PERMISSIONS.ALLOCATE_RESOURCES]: false,
    [PERMISSIONS.RESET_DEMO]: false,
    [PERMISSIONS.RUN_DEMO]: false,
  },
  demo: {
    full_access: true,
    [PERMISSIONS.VIEW_MAP]: true,
    [PERMISSIONS.VIEW_ALERTS]: true,
    [PERMISSIONS.VIEW_PRIORITIES]: true,
    [PERMISSIONS.VIEW_ASSIGNMENTS]: true,
    [PERMISSIONS.VIEW_ROUTES]: true,
    [PERMISSIONS.VIEW_RESOURCES]: true,
    [PERMISSIONS.USE_ASSISTANT]: true,
    [PERMISSIONS.MANAGE_TWIN]: true,
    [PERMISSIONS.TRIGGER_DISRUPTION]: true,
    [PERMISSIONS.RUN_SIMULATIONS]: true,
    [PERMISSIONS.COMPARE_SCENARIOS]: true,
    [PERMISSIONS.ALLOCATE_RESOURCES]: true,
    [PERMISSIONS.RESET_DEMO]: true,
    [PERMISSIONS.RUN_DEMO]: true,
  },
}

export function hasPermission(role, permission) {
  if (!role || !ROLE_PERMISSIONS[role]) return false
  return !!ROLE_PERMISSIONS[role][permission]
}
