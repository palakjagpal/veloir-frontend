// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [oauthNotice, setOauthNotice] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthToken = params.get('token')

    if (oauthToken) {
      setOauthNotice({
        isNew: params.get('isNew') === 'true',
        notice: params.get('notice'),
      })

      localStorage.setItem('veloir_token', oauthToken)
      params.delete('token')
      params.delete('isNew')
      const cleanQuery = params.toString()
      window.history.replaceState({}, '', window.location.pathname + (cleanQuery ? `?${cleanQuery}` : ''))
    }
    
    const token = localStorage.getItem('veloir_token')
    if (!token) {
      setLoading(false)
      return
    }

    api('/api/users/me')
      .then((response) => {
        setUser(response.data || response.user || response)
      })
      .catch(() => {
        localStorage.removeItem('veloir_token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    try {
      const token = localStorage.getItem('veloir_token')
      if (token) {
        // Call logout API to invalidate token on server
        await api('/api/auth/logout', {
          method: 'POST'
        })
      }
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      // Always clear local storage and state
      localStorage.removeItem('veloir_token')
      setUser(null)
    }
  }

  const value = useMemo(() => ({
    user,
    setUser,
    loading,oauthNotice, setOauthNotice,
    login: (token, userData) => {
      localStorage.setItem('veloir_token', token)
      setUser(userData)
    },
    logout
  }), [user, loading, oauthNotice])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}