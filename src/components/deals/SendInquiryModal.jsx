import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiSend, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { createInquiry } from '../../services/marketplaceService'
import { formatPrice } from '../../lib/api'
import { CONTACT_LABELS } from '../../lib/inquiryUtils'
import '../../deals.css'

const MAX_MESSAGE = 1000

// yyyy-mm-dd in the user's local timezone (for <input type="date" min=...>)
const todayLocal = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export default function SendInquiryModal({ bike, user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    message: `Hi, I'm interested in your ${bike.title || `${bike.brand} ${bike.model}`}. Is it still available?`,
    proposedPrice: '',
    buyerPhone: user?.phone || '',
    buyerEmail: user?.email || '',
    preferredContact: 'email',
    viewingRequested: false,
    viewingDate: '',
    viewingTime: '',
    viewingLocation: '',
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  // Esc to close + lock background scroll while open
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [busy, onClose])

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const validate = () => {
    const er = {}
    if (!form.message.trim()) er.message = 'Please write a message to the seller.'
    if (form.message.length > MAX_MESSAGE) er.message = `Message cannot exceed ${MAX_MESSAGE} characters.`
    if (form.proposedPrice !== '' && (Number.isNaN(Number(form.proposedPrice)) || Number(form.proposedPrice) < 0)) {
      er.proposedPrice = 'Enter a valid price.'
    }
    if (!/^\S+@\S+\.\S+$/.test(form.buyerEmail.trim())) er.buyerEmail = 'Enter a valid email address.'
    const digits = form.buyerPhone.replace(/\D/g, '')
    if (['phone', 'both'].includes(form.preferredContact) && (digits.length < 10 || digits.length > 15)) {
      er.buyerPhone = 'A valid phone number is required for this contact preference.'
    }
    if (form.viewingRequested && !form.viewingDate) er.viewingDate = 'Pick a preferred viewing date.'
    setErrors(er)
    return Object.keys(er).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy || !validate()) return
    setBusy(true)
    setServerError('')

    // The API does not receive phone/email from the token (it only has the user id),
    // so always send the contact details explicitly.
    const payload = {
      message: form.message.trim(),
      buyerEmail: form.buyerEmail.trim(),
      buyerPhone: form.buyerPhone.trim() || undefined,
      preferredContact: form.preferredContact,
    }
    if (form.proposedPrice !== '') payload.proposedPrice = Number(form.proposedPrice)
    if (form.viewingRequested) {
      payload.viewingRequested = true
      payload.viewingDate = form.viewingDate
      payload.viewingTime = form.viewingTime || undefined
      payload.viewingLocation = form.viewingLocation.trim() || undefined
    }

    try {
      const res = await createInquiry(bike._id, payload)
      toast.success(res.message || 'Inquiry sent!')
      onSuccess?.(res.data)
    } catch (err) {
      setServerError(err.message || 'Could not send your inquiry. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const isDuplicate = /already have a pending inquiry/i.test(serverError)

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="dl-modal" role="dialog" aria-modal="true" aria-labelledby="inq-title">
        <button type="button" className="dl-modal-close" onClick={onClose} aria-label="Close" disabled={busy}>
          <FiX />
        </button>
        <h2 id="inq-title">Send an inquiry</h2>
        <p className="dl-sub">
          {bike.title || `${bike.brand} ${bike.model}`} · listed at {formatPrice(bike.price)}
        </p>

        {serverError && (
          <div className="dl-error" role="alert">
            {serverError}{' '}
            {isDuplicate && <Link to="/inquiries?role=buyer" onClick={onClose}>View your inquiries</Link>}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="dl-field">
            <label htmlFor="inq-message">Message *</label>
            <textarea
              id="inq-message"
              value={form.message}
              onChange={set('message')}
              maxLength={MAX_MESSAGE}
              disabled={busy}
            />
            <div className="dl-hint">
              <span style={{ color: '#a12626' }}>{errors.message}</span>
              <span>{form.message.length}/{MAX_MESSAGE}</span>
            </div>
          </div>

          <div className="dl-field">
            <label htmlFor="inq-price">Your offered price (₹) — optional</label>
            <input
              id="inq-price"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder={`Leave blank to use ${formatPrice(bike.price)}`}
              value={form.proposedPrice}
              onChange={set('proposedPrice')}
              disabled={busy}
            />
            {errors.proposedPrice && <span className="dl-hint" style={{ color: '#a12626' }}>{errors.proposedPrice}</span>}
          </div>

          <div className="dl-row">
            <div className="dl-field">
              <label htmlFor="inq-email">Email *</label>
              <input id="inq-email" type="email" value={form.buyerEmail} onChange={set('buyerEmail')} disabled={busy} />
              {errors.buyerEmail && <span className="dl-hint" style={{ color: '#a12626' }}>{errors.buyerEmail}</span>}
            </div>
            <div className="dl-field">
              <label htmlFor="inq-phone">Phone</label>
              <input id="inq-phone" type="tel" placeholder="+91 …" value={form.buyerPhone} onChange={set('buyerPhone')} disabled={busy} />
              {errors.buyerPhone && <span className="dl-hint" style={{ color: '#a12626' }}>{errors.buyerPhone}</span>}
            </div>
          </div>

          <div className="dl-field">
            <span className="dl-label">Preferred contact</span>
            <div className="dl-radio-group">
              {Object.entries(CONTACT_LABELS).map(([value, label]) => (
                <label key={value} className={form.preferredContact === value ? 'checked' : ''}>
                  <input
                    type="radio"
                    name="preferredContact"
                    value={value}
                    checked={form.preferredContact === value}
                    onChange={set('preferredContact')}
                    disabled={busy}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <label className="dl-check">
            <input type="checkbox" checked={form.viewingRequested} onChange={set('viewingRequested')} disabled={busy} />
            I'd like to view the bike in person
          </label>

          {form.viewingRequested && (
            <>
              <div className="dl-row">
                <div className="dl-field">
                  <label htmlFor="inq-date">Preferred date *</label>
                  <input id="inq-date" type="date" min={todayLocal()} value={form.viewingDate} onChange={set('viewingDate')} disabled={busy} />
                  {errors.viewingDate && <span className="dl-hint" style={{ color: '#a12626' }}>{errors.viewingDate}</span>}
                </div>
                <div className="dl-field">
                  <label htmlFor="inq-time">Preferred time</label>
                  <input id="inq-time" type="time" value={form.viewingTime} onChange={set('viewingTime')} disabled={busy} />
                </div>
              </div>
              <div className="dl-field">
                <label htmlFor="inq-location">Viewing location</label>
                <input
                  id="inq-location"
                  type="text"
                  placeholder={bike.location?.city ? `e.g. ${bike.location.city}` : 'Where would you like to meet?'}
                  value={form.viewingLocation}
                  onChange={set('viewingLocation')}
                  disabled={busy}
                />
              </div>
            </>
          )}

          <div className="dl-modal-foot">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn btn-mint" disabled={busy}>
              <FiSend /> {busy ? 'Sending…' : 'Send inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}