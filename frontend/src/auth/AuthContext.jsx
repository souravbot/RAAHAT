// AuthContext — Centralized authentication and role provider for RAAHAT.

import { createContext, useContext, useState, useEffect } from 'react'
import { ROLES, ROLE_META, hasPermission as checkPermission } from './permissions'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => {
    return localStorage.getItem('raahat_role') || ROLES.COMMAND_CENTER
  })

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('raahat_auth') === 'true'
  })

  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('raahat_email') || 'operator@raahat.gov.in'
  })

  useEffect(() => {
    localStorage.setItem('raahat_role', role)
  }, [role])

  useEffect(() => {
    localStorage.setItem('raahat_auth', isAuthenticated ? 'true' : 'false')
  }, [isAuthenticated])

  useEffect(() => {
    localStorage.setItem('raahat_email', userEmail)
  }, [userEmail])

  const login = (selectedRole, email = 'operator@raahat.gov.in') => {
    setRole(selectedRole)
    setUserEmail(email)
    setIsAuthenticated(true)
  }

  const logout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('raahat_auth')
  }

  const switchRole = (newRole) => {
    setRole(newRole)
    if (!isAuthenticated) {
      setIsAuthenticated(true)
    }
  }

  const hasPermission = (permissionKey) => {
    return checkPermission(role, permissionKey)
  }

  const roleMeta = ROLE_META[role] || ROLE_META.command_center

  return (
    <AuthContext.Provider
      value={{
        role,
        roleMeta,
        isAuthenticated,
        userEmail,
        login,
        logout,
        switchRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
