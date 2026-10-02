import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiCheck, FiShoppingCart, FiTrash2, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Layout from '../../components/Layout'
import InquiryStatusBadge from '../../components/deals/InquiryStatusBadge'
import { useAuth } from '../../context/AuthContext'
import { formatPrice, getImageUrl } from '../../lib/api'
import {
  CONTACT_LABELS,
  daysLeft,
  formatDate,
  formatDateTime,
  getEffectiveStatus,
  getUserId,
} from '../../lib/inquiryUtils'
import {
  acceptInquiry,
  convertInquiryToPurchase,
  deleteInquiry,
  getInquiry,
  rejectInquiry,
} from '../../services/marketplaceService'
import { notifyInquiriesChanged } from '../../hooks/usePendingInquiryCount'
import '../../deals.css'

export default function InquiryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = getUserId(user)

  const [inquiry, setInquiry] = useState(null)
  const [error, setError] = useState('')
  const [panel, setPanel] = useState(null) // 'accept' | 'reject' | 'convert' | 'delete'
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await getInquiry(id)
      setInquiry(res.data)
    } catch (err) {
      setError(err.message || 'Failed to load inquiry')
    }
  }, [id])

  useEffect(() => {
    setInquiry(null)
    setPanel(null)
    load()
  }, [load])

  const openPanel = (name) => {
    setPanel((p) => (p === name ? null : name))
    setNote('')
  }

  // Runs an action, toasts the result, and handles failures uniformly
  const run = async (fn, { success, after }) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fn()
      toast.success(success || res?.message || 'Done')
      notifyInquiriesChanged()
      await after(res)
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
      // state may have changed server-side (e.g. bike sold) - resync
      load()
    } finally {
      setBusy(false)
    }
  }

  const handleAccept = () =>
    run(() => acceptInquiry(id, note.trim()), {
      success: 'Inquiry accepted',
      after: async () => { setPanel(null); await load() },
    })

  const handleReject = () =>
    run(() => rejectInquiry(id, note.trim()), {
      success: 'Inquiry rejected',
      after: async () => { setPanel(null); await load() },
    })

  const handleConvert = () =>
    run(() => convertInquiryToPurchase(id), {
      success: 'Purchase created',
      after: async (res) => {
        const purchaseId = res?.data?.purchase?._id
        if (purchaseId) navigate(`/purchases/${purchaseId}`)
        else { setPanel(null); await load() }
      },
    })

  const handleDelete = () =>
    run(() => deleteInquiry(id), {
      success: 'Inquiry deleted',
      after: async () => navigate('/inquiries', { replace: true }),
    })

  const back = (
    <Link to="/inquiries" className="dl-back"><FiArrowLeft /> All inquiries</Link>
  )

  if (error) {
    return (
      <Layout>
        <main className="wrap dl-page">
          {back}
          <div className="empty">
            {error}
            <button onClick={load}>Try again</button>
          </div>
        </main>
      </Layout>
    )
  }

  if (!inquiry) {
    return (
      <Layout>
        <main className="wrap dl-page">
          {back}
          <div className="dl-skeleton" style={{ height: 260 }} />
        </main>
      </Layout>
    )
  }

  const bike = inquiry.bike || {}
  const status = getEffectiveStatus(inquiry)
  const isBuyer = String(inquiry.buyer?._id) === userId
  const isSeller = String(inquiry.seller?._id) === userId
  const other = isBuyer ? inquiry.seller : inquiry.buyer
  const remaining = ['pending', 'accepted'].includes(status) ? daysLeft(inquiry.expiresAt) : null

  const canRespond = isSeller && status === 'pending'
  const canConvert = isBuyer && status === 'accepted'
  const canDelete = (isBuyer || isSeller) && ['pending', 'expired'].includes(status)
  const showOtherContact = isSeller || ['accepted', 'converted'].includes(status)

  return (
    <Layout>
      <main className="wrap dl-page">
        {back}

        <div className="dl-head">
          <div>
            <p className="eyebrow">{isSeller ? 'Inquiry received' : 'Inquiry sent'}</p>
            <h2>{bike.title || `${bike.brand || ''} ${bike.model || ''}`.trim() || 'Inquiry'}</h2>
          </div>
          <InquiryStatusBadge status={status} />
        </div>

        <div className="dl-detail">
          <div>
            <section className="dl-panel">
              <h3>Bike</h3>
              <Link to={`/bikes/${bike._id}`} className="dl-bike">
                <img src={getImageUrl(bike.featuredImage || bike.images?.[0])} alt={bike.title || 'Bike'} />
                <div>
                  <strong>{bike.title || `${bike.brand} ${bike.model}`}</strong>
                  <div className="dl-meta" style={{ marginTop: 6 }}>
                    {bike.year && <span>{bike.year}</span>}
                    {bike.condition && <span>{bike.condition}</span>}
                    {bike.location?.city && <span>{bike.location.city}</span>}
                  </div>
                  <div className="dl-price" style={{ marginTop: 8 }}>Listed at {formatPrice(bike.price)}</div>
                </div>
              </Link>
            </section>

            <section className="dl-panel">
              <h3>{isBuyer ? 'Your message' : `Message from ${inquiry.buyer?.name || 'buyer'}`}</h3>
              <p className="dl-message">{inquiry.message}</p>
            </section>

            {inquiry.responseMessage && (
              <section className="dl-panel">
                <h3>{status === 'rejected' ? 'Reason for rejection' : 'Seller response'}</h3>
                <p className="dl-message">{inquiry.responseMessage}</p>
                {inquiry.respondedAt && (
                  <p className="dl-note" style={{ marginTop: 8 }}>{formatDateTime(inquiry.respondedAt)}</p>
                )}
              </section>
            )}

            <section className="dl-panel">
              <h3>Details</h3>
              <dl className="dl-kv">
                <dt>Offered price</dt>
                <dd>
                  {formatPrice(inquiry.proposedPrice || bike.price)}
                  {bike.price && inquiry.proposedPrice && inquiry.proposedPrice !== bike.price && (
                    <span className="dl-note"> ({inquiry.proposedPrice < bike.price ? '−' : '+'}{formatPrice(Math.abs(bike.price - inquiry.proposedPrice))} vs listing)</span>
                  )}
                </dd>
                <dt>Preferred contact</dt>
                <dd>{CONTACT_LABELS[inquiry.preferredContact] || '—'}</dd>
                {inquiry.viewingRequested && (
                  <>
                    <dt>Viewing</dt>
                    <dd>
                      {formatDate(inquiry.viewingDate)}
                      {inquiry.viewingTime ? ` at ${inquiry.viewingTime}` : ''}
                      {inquiry.viewingLocation ? ` · ${inquiry.viewingLocation}` : ''}
                    </dd>
                  </>
                )}
                <dt>Sent</dt>
                <dd>{formatDateTime(inquiry.createdAt)}</dd>
                {remaining !== null && (
                  <>
                    <dt>{status === 'accepted' ? 'Convert by' : 'Expires'}</dt>
                    <dd>{formatDate(inquiry.expiresAt)} ({remaining} day{remaining === 1 ? '' : 's'} left)</dd>
                  </>
                )}
              </dl>
            </section>
          </div>

          <aside>
            <section className="dl-panel">
              <h3>{isBuyer ? 'Seller' : 'Buyer'}</h3>
              <dl className="dl-kv">
                <dt>Name</dt>
                <dd>{other?.name || '—'}</dd>
                {showOtherContact && (
                  <>
                    <dt>Email</dt>
                    <dd>{(isSeller ? inquiry.buyerEmail : null) || other?.email || '—'}</dd>
                    <dt>Phone</dt>
                    <dd>{(isSeller ? inquiry.buyerPhone : null) || other?.phone || '—'}</dd>
                  </>
                )}
              </dl>
              {!showOtherContact && (
                <p className="dl-note" style={{ marginTop: 10 }}>Contact details are shared once the seller accepts.</p>
              )}
            </section>

            {(canRespond || canConvert || canDelete) && (
              <section className="dl-panel">
                <h3>Actions</h3>
                <div className="dl-actions">
                  {canRespond && (
                    <>
                      <button className="btn btn-mint" disabled={busy} onClick={() => openPanel('accept')}>
                        <FiCheck /> Accept inquiry
                      </button>
                      {panel === 'accept' && (
                        <div className="dl-confirm">
                          <textarea
                            placeholder="Optional message to the buyer"
                            maxLength={500}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            disabled={busy}
                          />
                          <button className="btn btn-mint" disabled={busy} onClick={handleAccept}>
                            {busy ? 'Accepting…' : 'Confirm accept'}
                          </button>
                        </div>
                      )}
                      <button className="btn btn-danger-outline" disabled={busy} onClick={() => openPanel('reject')}>
                        <FiX /> Reject inquiry
                      </button>
                      {panel === 'reject' && (
                        <div className="dl-confirm">
                          <textarea
                            placeholder="Reason for rejection (optional)"
                            maxLength={500}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            disabled={busy}
                          />
                          <button className="btn btn-danger" disabled={busy} onClick={handleReject}>
                            {busy ? 'Rejecting…' : 'Confirm reject'}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {canConvert && (
                    <>
                      <button className="btn btn-mint" disabled={busy} onClick={() => openPanel('convert')}>
                        <FiShoppingCart /> Convert to purchase
                      </button>
                      {panel === 'convert' && (
                        <div className="dl-confirm">
                          <p className="dl-note">
                            This creates a purchase at {formatPrice(inquiry.proposedPrice || bike.price)} and reserves the bike for you.
                          </p>
                          <button className="btn btn-mint" disabled={busy} onClick={handleConvert}>
                            {busy ? 'Creating purchase…' : 'Confirm & continue'}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {canDelete && (
                    <>
                      <button className="btn btn-danger-outline" disabled={busy} onClick={() => openPanel('delete')}>
                        <FiTrash2 /> Delete inquiry
                      </button>
                      {panel === 'delete' && (
                        <div className="dl-confirm">
                          <p className="dl-note">This permanently removes the inquiry for both parties.</p>
                          <button className="btn btn-danger" disabled={busy} onClick={handleDelete}>
                            {busy ? 'Deleting…' : 'Yes, delete'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            {status === 'converted' && (
              <p className="dl-note">This inquiry became a purchase. Find it under <Link to="/purchases" style={{ fontWeight: 700 }}>Purchases</Link>.</p>
            )}
          </aside>
        </div>
      </main>
    </Layout>
  )
}