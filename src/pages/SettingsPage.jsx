// frontend/src/pages/SettingsPage.jsx
import { useEffect, useState, useRef } from 'react'
import { FiCamera, FiCheckCircle, FiLock, FiUser, FiAlertCircle, FiPhone, FiMail, FiShield } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { api, getImageUrl } from '../lib/api'
import { uploadAvatar } from '../lib/authService'
import '../settings.css'

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [passwords, setPasswords] = useState({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpBusy, setOtpBusy] = useState(false)
  const fileInputRef = useRef(null)

  // Fetch profile on mount
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await api('/api/users/me')
      setProfile(data)
      setForm({ 
        name: data.name || '', 
        phone: data.phone || '' 
      })
      if (data.profileImage || data.avatar) {
        setAvatarPreview(getImageUrl(data.profileImage || data.avatar))
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const showMessage = (msg, type = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => {
      setMessage('')
    }, 5000)
  }

  // Update profile
  const saveProfile = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')

    try {
      const response = await api('/api/users/me', { 
        method: 'PUT', 
        body: JSON.stringify({ 
          name: form.name, 
          phone: form.phone 
        }) 
      })
      
      setProfile(prev => ({ 
        ...prev, 
        ...(response.user || form) 
      }))
      
      // Update auth context if user data changed
      if (setUser && response.user) {
        setUser(prev => ({ ...prev, ...response.user }))
      }
      
      showMessage('Profile updated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setBusy(false)
    }
  }

  // Change password
  const changePassword = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    if (passwords.newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setBusy(true)
    try {
      await api('/api/users/change-password', { 
        method: 'PUT', 
        body: JSON.stringify({ 
          oldPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
          confirmPassword: passwords.confirmPassword
        }) 
      })
      
      setPasswords({ 
        currentPassword: '', 
        newPassword: '', 
        confirmPassword: '' 
      })
      showMessage('Password updated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update password')
    } finally {
      setBusy(false)
    }
  }

  const sendPhoneOtp = async () => {
  if (!form.phone) {
    setError('Enter a phone number first (e.g. +91XXXXXXXXXX).')
    return
  }
  setOtpBusy(true)
  setError('')
  try {
    await api('/api/users/send-phone-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: form.phone })
    })
    setOtpSent(true)
    showMessage('Verification code sent to your phone.')
  } catch (err) {
    setError(err.message || 'Failed to send OTP')
  } finally {
    setOtpBusy(false)
  }
}

  const verifyPhoneOtp = async (event) => {
    event.preventDefault()
    setOtpBusy(true)
    setError('')
    try {
      const response = await api('/api/users/verify-phone-otp', {
        method: 'POST',
        body: JSON.stringify({ otp: otpCode })
      })
      setProfile(prev => ({ ...prev, isPhoneVerified: true }))
      if (setUser) setUser(prev => ({ ...prev, isPhoneVerified: true }))
      setOtpSent(false)
      setOtpCode('')
      showMessage(response.message || 'Phone verified!')
    } catch (err) {
      setError(err.message || 'Invalid or expired code')
    } finally {
      setOtpBusy(false)
    }
  }

  // Handle avatar upload
  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB.')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setError('')
    setMessage('')

    setBusy(true)
    try {
      const response = await uploadAvatar(file)
      setProfile(prev => ({ 
        ...prev, 
        profileImage: response.profileImage 
      }))
      
      // Update auth context
      if (setUser && response.profileImage) {
        setUser(prev => ({ ...prev, profileImage: response.profileImage }))
      }
      
      showMessage('Profile image updated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to upload image')
      // Revert preview on error
      setAvatarPreview(profile?.profileImage ? getImageUrl(profile.profileImage) : null)
    } finally {
      setBusy(false)
    }
  }

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <Layout>
      <main className="settings wrap">
        <div className="settings-heading">
          <h1>Account</h1>
          <p>Manage your personal details and account security.</p>
        </div>

        {/* Messages */}
        {error && (
          <p className="settings-message error">
            <FiAlertCircle /> {error}
          </p>
        )}
        {message && (
          <p className={`settings-message ${messageType === 'error' ? 'error' : ''}`}>
            <FiCheckCircle /> {message}
          </p>
        )}

        {isLoading ? (
          <div className="settings-loading">Loading profile...</div>
        ) : (
          <div className="settings-grid">
            {/* Profile Information Card */}
            <section className="settings-card">
              <div className="settings-card-heading">
                <FiUser />
                <div>
                  <h2>Personal information</h2>
                  <p>Your Veloir profile and contact details.</p>
                </div>
              </div>

              <form onSubmit={saveProfile}>
                {/* Avatar */}
                <div className="avatar-row">
                  <div className="avatar">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Profile"  referrerPolicy="no-referrer"/>
                    ) : (profile?.profileImage || profile?.avatar) ? (
                      <img src={getImageUrl(profile.profileImage || profile.avatar)} alt="Profile" />
                    ) : (
                      profile?.name?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <button 
                    type="button" 
                    className="avatar-button"
                    onClick={triggerFileInput}
                    disabled={busy}
                  >
                    <FiCamera /> Change photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                </div>
                <p className="avatar-hint">
                  JPG or PNG, up to 5MB.
                </p>

                {/* Name */}
                <label>
                  Full name
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your full name"
                  />
                </label>

                {/* Email (read-only) */}
                <label>
                  Email address
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ''}
                    className="disabled-input"
                  />
                </label>

                {/* Phone */}
                <label>
                  Phone number
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </label>

                {/* Meta info */}
                <div className="settings-meta">
                  <span>
                    <FiShield /> Role: <b>{profile?.role || 'user'}</b>
                  </span>
                  <span>
                    <FiCheckCircle /> 
                    {profile?.isPhoneVerified ? 'Phone verified' : 'Phone not verified'}
                  </span>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-mint"
                  disabled={busy || isLoading}
                >
                  {busy ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            </section>

            {/* Change Password Card */}
            <section className="settings-card">
              <div className="settings-card-heading">
                <FiLock />
                <div>
                  <h2>Change password</h2>
                  <p>Use a strong, unique password to protect your account.</p>
                </div>
              </div>

              <form onSubmit={changePassword}>
                <label>
                  Current password
                  <input
                    type="password"
                    required
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ 
                      ...passwords, 
                      currentPassword: e.target.value 
                    })}
                    placeholder="Enter current password"
                  />
                </label>

                <label>
                  New password
                  <input
                    type="password"
                    minLength="6"
                    required
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ 
                      ...passwords, 
                      newPassword: e.target.value 
                    })}
                    placeholder="At least 6 characters"
                  />
                </label>

                <label>
                  Confirm new password
                  <input
                    type="password"
                    minLength="6"
                    required
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ 
                      ...passwords, 
                      confirmPassword: e.target.value 
                    })}
                    placeholder="Confirm new password"
                  />
                </label>

                <button 
                  type="submit" 
                  className="btn btn-mint"
                  disabled={busy}
                >
                  {busy ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </section>

            {/* Phone Verification Card */}
            <section className="settings-card">
              <div className="settings-card-heading">
                <FiPhone />
                <div>
                  <h2>Phone verification</h2>
                  <p>Verify your number to enable two-factor login.</p>
                </div>
              </div>

              {profile?.isPhoneVerified ? (
                <p className="settings-meta"><FiCheckCircle /> Your phone is verified.</p>
              ) : !otpSent ? (
                <button
                  type="button"
                  className="btn btn-mint"
                  onClick={sendPhoneOtp}
                  disabled={otpBusy || !form.phone}
                >
                  {otpBusy ? 'Sending...' : 'Send verification code'}
                </button>
              ) : (
                <form onSubmit={verifyPhoneOtp}>
                  <label>
                    Enter code
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="4-digit code"
                    />
                  </label>
                  <button type="submit" className="btn btn-mint" disabled={otpBusy}>
                    {otpBusy ? 'Verifying...' : 'Verify'}
                  </button>
                </form>
              )}
            </section>

          </div>
        )}
      </main>
    </Layout>
  )
}