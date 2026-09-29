// frontend/src/pages/ResetPasswordPage.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi'
import { api } from '../lib/api'
import { Logo } from '../components/Layout'
import '../password-field.css'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  
  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')
  const [tokenValid, setTokenValid] = useState(true)

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      setError('Invalid or missing reset token.')
    }
  }, [token])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    // Validate passwords
    if (form.newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    try {
      const response = await api(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: form.newPassword })
      })
      
      setSuccess(true)
      setMessage(response.message || 'Password has been reset successfully!')
      setForm({ newPassword: '', confirmPassword: '' })
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login')
      }, 2500)
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.')
      setTokenValid(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth">
      <div className="auth-panel">
        <Link to="/" className="back">← Back to Veloir</Link>
        <Logo />
        
        <motion.form 
          initial={{ opacity: 0, x: -12 }} 
          animate={{ opacity: 1, x: 0 }} 
          onSubmit={handleSubmit}
        >
          <p className="eyebrow">Reset password</p>
          <h1>Create a new<br /><em>password.</em></h1>
          <p className="form-intro">
            Choose a strong password that you don't use for other accounts.
          </p>

          {error && (
            <p className="form-error" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FiAlertCircle /> {error}
            </p>
          )}

          {success && (
            <p className="form-success" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FiCheckCircle /> {message}
            </p>
          )}

          {tokenValid && !success && (
            <>
              <label>
                New password
                <span className="password-field">
                  <input 
                    type={showNewPassword ? 'text' : 'password'} 
                    minLength="6"
                    required 
                    value={form.newPassword} 
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })} 
                    placeholder="At least 6 characters"
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    className="password-toggle" 
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </span>
              </label>

              <label>
                Confirm new password
                <span className="password-field">
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    minLength="6"
                    required 
                    value={form.confirmPassword} 
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} 
                    placeholder="Confirm new password"
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    className="password-toggle" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </span>
              </label>

              <button 
                type="submit" 
                className="btn btn-mint full" 
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset password'} 
                <FiArrowRight />
              </button>
            </>
          )}

          {!tokenValid && !success && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: '#994141', marginBottom: '20px' }}>
                The password reset link is invalid or has expired.
              </p>
              <Link to="/forgot-password" className="btn btn-mint" style={{ display: 'inline-flex' }}>
                Request new link <FiArrowRight />
              </Link>
            </div>
          )}

          {success && (
            <p className="form-foot" style={{ marginTop: '20px' }}>
              Redirecting to login...
            </p>
          )}

          <p className="form-foot" style={{ marginTop: success ? '8px' : '20px' }}>
            <Link to="/login">Back to sign in</Link>
          </p>
        </motion.form>
      </div>

      
    </main>
  )
}