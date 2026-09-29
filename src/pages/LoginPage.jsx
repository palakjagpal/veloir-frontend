// frontend/src/pages/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi'
import { API_BASE_URL, api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/Layout'
import TwoFactorAuthModal from '../components/TwoFactorAuthModal'
import '../password-field.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // 2FA states
  const [show2FA, setShow2FA] = useState(false)
  const [tempToken, setTempToken] = useState(null)
  const [phoneMasked, setPhoneMasked] = useState('')
  const [preAuthData, setPreAuthData] = useState(null)

  const handleLogin = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const response = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form)
      })

      if (response.isMfaRequired) {
        setTempToken(response.preAuthToken)
        setPhoneMasked(response.phoneMasked || 'your phone')
        setPreAuthData(response)
        setShow2FA(true)
        setBusy(false)
        return
      }

      login(response.token, response.user)
      navigate('/')
    } catch (err) {
      if (err.requiresPhoneVerification) {
        setError('Please verify your phone number before logging in.')
        if (err.phoneVerificationToken) {
          login(err.phoneVerificationToken, err.user)
        }
        navigate('/settings', { state: { openPhoneVerification: true, prefillEmail: form.email } })
        return
      }
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handle2FASuccess = (token, user) => {
    login(token, user)
    navigate('/')
  }

  const handleResendCode = async () => {
    if (!preAuthData) return
    const response = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(form)
    })
    if (response.isMfaRequired) {
      setTempToken(response.preAuthToken)
      setPhoneMasked(response.phoneMasked || 'your phone')
    }
    return response
  }

  return (
    <main className="auth">
      <div className="auth-panel">
        <Link to="/" className="back">← Back to Veloir</Link>
        <Logo />

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleLogin}
        >
          <p className="eyebrow">Welcome back</p>
          <h1>Let's get you<br />back <em>on the road.</em></h1>
          <p className="form-intro">
            Sign in to find, save and negotiate your next ride.
          </p>

          <label>
            Email address
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="btn btn-mint full" disabled={busy}>
            {busy ? 'Signing you in…' : 'Continue'} <FiArrowRight />
          </button>

          <button
            type="button"
            className="google"
            onClick={() => location.assign(`${API_BASE_URL}/api/auth/google?intent=login`)}
          >
            Continue with Google
          </button>
    
          <p className="form-foot">
            New to Veloir? <Link to="/register">Create an account</Link>
          </p>

          <p className="form-foot" style={{ marginTop: '8px' }}>
            <Link to="/forgot-password" style={{ fontWeight: 'normal' }}>
              Forgot password?
            </Link>
          </p>
        </motion.form>
      </div>

      <TwoFactorAuthModal
        isOpen={show2FA}
        onClose={() => {
          setShow2FA(false)
          setTempToken(null)
          setPhoneMasked('')
        }}
        onSuccess={handle2FASuccess}
        tempToken={tempToken}
        phoneMasked={phoneMasked}
        onResend={handleResendCode}
      />
    </main>
  )
}