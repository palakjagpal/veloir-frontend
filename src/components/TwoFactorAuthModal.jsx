// frontend/src/components/TwoFactorAuthModal.jsx
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowRight, FiCheckCircle, FiX, FiShield } from 'react-icons/fi'
import { api } from '../lib/api'

export default function TwoFactorAuthModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  tempToken,
  phoneMasked,
  onResend
}) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(false)
  const [seconds, setSeconds] = useState(30)
  const refs = useRef([])

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return
    if (seconds <= 0) return
    const timer = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds, isOpen])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', ''])
      setError('')
      setVerified(false)
      setBusy(false)
      setSeconds(30)
      // Focus first input
      setTimeout(() => refs.current[0]?.focus(), 100)
    }
  }, [isOpen])

  const handleDigitChange = (value, index) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    setError('')
    
    // Auto-advance to next input
    if (value && index < 3) {
      refs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') {
      handleVerify()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length !== 4) return
    e.preventDefault()
    setDigits(pasted.split(''))
    refs.current[3]?.focus()
  }

  const handleVerify = async () => {
    const otp = digits.join('')
    if (otp.length !== 4) {
      setError('Please enter the 4-digit verification code.')
      return
    }

    setBusy(true)
    setError('')

    try {
      // Use the tempToken for authentication
      const response = await api('/api/auth/verify-2fa-login', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tempToken}`
        },
        body: JSON.stringify({ otpCode: otp })
      })

      setVerified(true)
      setTimeout(() => {
        onSuccess(response.token, response.user)
        onClose()
      }, 600)
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please try again.')
      // Clear digits on error
      setDigits(['', '', '', ''])
      refs.current[0]?.focus()
    } finally {
      setBusy(false)
    }
  }

  const handleResend = async () => {
    if (seconds > 0) return
    setBusy(true)
    setError('')
    try {
      if (onResend) {
        await onResend()
      }
      setSeconds(30)
      setDigits(['', '', '', ''])
      refs.current[0]?.focus()
    } catch (err) {
      setError(err.message || 'Failed to resend code.')
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="modal-container"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          <button className="modal-close" onClick={onClose}>
            <FiX />
          </button>

          <div className="modal-icon">
            <FiShield />
          </div>

          <h2>VERIFY</h2>
          <p className="modal-subtitle">
            We sent a 4-digit verification code to <strong>{phoneMasked || 'your phone'}</strong>
          </p>

          <div className="otp-inputs" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={el => refs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleDigitChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                aria-label={`Digit ${index + 1} of 4`}
                className={error ? 'error' : ''}
                disabled={verified || busy}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && <p className="modal-error">{error}</p>}

          {verified && (
            <p className="modal-success">
              <FiCheckCircle /> Verification successful!
            </p>
          )}

          <button 
            className="btn btn-mint full verify-btn"
            onClick={handleVerify}
            disabled={busy || verified}
          >
            {busy ? 'Verifying...' : verified ? 'Verified' : 'Verify & continue'}
            <FiArrowRight />
          </button>

          <p className="modal-footer">
            Didn't get a code?{' '}
            {seconds > 0 ? (
              <span className="resend-timer">Resend in {seconds}s</span>
            ) : (
              <button 
                type="button" 
                onClick={handleResend} 
                disabled={busy}
                className="resend-btn"
              >
                Resend code
              </button>
            )}
          </p>

          <button className="modal-back" onClick={onClose}>
            ← Use a different account
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}