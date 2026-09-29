// frontend/src/pages/ForgotPasswordPage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { api } from '../lib/api'
import { Logo } from '../components/Layout'
import '../password-field.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    setMessage('')

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.')
      setLoading(false)
      return
    }

    try {
      const response = await api('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      })
      
      setSuccess(true)
      setMessage(response.message || 'Password reset link has been sent to your email.')
      setEmail('')
    } catch (err) {
      setError(err.message || 'Failed to send reset link. Please try again.')
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
          <p className="eyebrow">Need help?</p>
          <h1>Reset your<br /><em>password.</em></h1>
          <p className="form-intro">
            Enter the email address associated with your account and we'll send you a link to reset your password.
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

          <label>
            Email address
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@example.com"
              disabled={loading}
            />
          </label>

          <button 
            type="submit" 
            className="btn btn-mint full" 
            disabled={loading || success}
          >
            {loading ? 'Sending...' : success ? 'Sent!' : 'Send reset link'} 
            <FiArrowRight />
          </button>

          <p className="form-foot">
            Remember your password? <Link to="/login">Sign in</Link>
          </p>
        </motion.form>
      </div>

      
    </main>
  )
}