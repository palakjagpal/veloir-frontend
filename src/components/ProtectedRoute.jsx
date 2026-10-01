// frontend/src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from './Layout'

/**
 * Guards a route behind authentication and, optionally, a role.
 *
 *   <ProtectedRoute>                          any signed-in user
 *   <ProtectedRoute roles={['seller']}>       sellers only
 *   <ProtectedRoute roles={['seller','admin']} redirectTo="/">   redirect instead of "Access denied"
 *
 * Roles come from /api/users/me: "user" | "seller" | "admin" | "repair_shop_owner".
 */
export default function ProtectedRoute({ children, roles, redirectTo }) {
  const { user, loading, hydrating } = useAuth()
  const location = useLocation()

  // Wait for the initial session check, and for the role to arrive after a fresh login
  if (loading || (roles?.length && hydrating)) {
    return <div className="loading-screen">Loading...</div>
  }

  if (!user) {
    // Remember where they were headed so emailed deep links survive the login step
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const allowed = !roles?.length || roles.includes(user.role)
  if (!allowed) {
    if (redirectTo) return <Navigate to={redirectTo} replace />
    return (
      <Layout>
        <main className="wrap" style={{ padding: '160px 0 80px', textAlign: 'center' }}>
          <h2>Access denied</h2>
          <p>Your account doesn&apos;t have permission to view this page.</p>
        </main>
      </Layout>
    )
  }

  return children
}