import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import InquiryStatusBadge from '../../components/deals/InquiryStatusBadge'
import { useAuth } from '../../context/AuthContext'
import { formatPrice, getImageUrl } from '../../lib/api'
import {
  INQUIRY_STATUSES,
  STATUS_LABELS,
  formatDate,
  getEffectiveStatus,
  getUserId,
} from '../../lib/inquiryUtils'
import { getMyInquiries } from '../../services/marketplaceService'
import '../../deals.css'

const PAGE_SIZE = 10
const TABS = [
  { key: '', label: 'All' },
  { key: 'buyer', label: 'As buyer' },
  { key: 'seller', label: 'As seller' },
]

export default function InquiriesPage() {
  const { user } = useAuth()
  const userId = getUserId(user)
  const [params, setParams] = useSearchParams()

  const role = ['buyer', 'seller'].includes(params.get('role')) ? params.get('role') : ''
  const status = INQUIRY_STATUSES.includes(params.get('status')) ? params.get('status') : ''
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1)

  const [items, setItems] = useState(null)
  const [pagination, setPagination] = useState(null)
  const [error, setError] = useState('')

  const update = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    // any filter change goes back to page 1
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  const load = useCallback(async () => {
    setItems(null)
    setError('')
    try {
      const res = await getMyInquiries({ role, status, page, limit: PAGE_SIZE })
      setItems(res.data || [])
      setPagination(res.pagination || null)
    } catch (err) {
      setError(err.message || 'Failed to load inquiries')
      setItems([])
    }
  }, [role, status, page])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = pagination?.totalPages || 1

  return (
    <Layout>
      <main className="wrap dl-page">
        <div className="section-top">
          <div>
            <p className="eyebrow">Deals</p>
            <h2>Inquiries</h2>
          </div>
        </div>

        <div className="dl-toolbar">
          <div className="dl-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key || 'all'}
                role="tab"
                aria-selected={role === t.key}
                className={`dl-tab ${role === t.key ? 'active' : ''}`}
                onClick={() => update({ role: t.key })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            className="dl-select"
            aria-label="Filter by status"
            value={status}
            onChange={(e) => update({ status: e.target.value })}
          >
            <option value="">All statuses</option>
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="empty">
            {error}
            <button onClick={load}>Try again</button>
          </div>
        )}

        {items === null ? (
          <div className="dl-list">
            {[0, 1, 2].map((i) => <div key={i} className="dl-skeleton" />)}
          </div>
        ) : items.length ? (
          <div className="dl-list">
            {items.map((inq) => {
              const isBuyer = String(inq.buyer?._id) === userId
              const other = isBuyer ? inq.seller : inq.buyer
              const bike = inq.bike || {}
              return (
                <Link key={inq._id} to={`/inquiries/${inq._id}`} className="dl-card">
                  <img src={getImageUrl(bike.featuredImage || bike.images?.[0])} alt={bike.title || 'Bike'} />
                  <div>
                    <h3>{bike.title || `${bike.brand || ''} ${bike.model || ''}`.trim() || 'Bike'}</h3>
                    <div className="dl-meta">
                      <span className="dl-badge dl-role">{isBuyer ? 'You asked' : 'Received'}</span>
                      <span>{isBuyer ? 'Seller' : 'Buyer'}: {other?.name || '—'}</span>
                      <span>Sent {formatDate(inq.createdAt)}</span>
                    </div>
                    <p className="dl-excerpt">{inq.message}</p>
                  </div>
                  <div className="dl-card-side">
                    <InquiryStatusBadge status={getEffectiveStatus(inq)} />
                    <span className="dl-price">{formatPrice(inq.proposedPrice || bike.price)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          !error && (
            <div className="empty">
              {role || status
                ? 'No inquiries match these filters.'
                : 'No inquiries yet. Open a bike listing and tap “Send Inquiry” to get started.'}
              <Link to="/bikes" style={{ display: 'block', marginTop: 12, fontWeight: 700 }}>Browse bikes</Link>
            </div>
          )
        )}

        {totalPages > 1 && (
          <nav className="dl-pagination" aria-label="Pagination">
            <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .map((n, idx, arr) => (
                <span key={n} style={{ display: 'contents' }}>
                  {idx > 0 && n - arr[idx - 1] > 1 && <span>…</span>}
                  <button
                    className={n === page ? 'active' : ''}
                    aria-current={n === page ? 'page' : undefined}
                    onClick={() => update({ page: String(n) })}
                  >
                    {n}
                  </button>
                </span>
              ))}
            <button disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>›</button>
          </nav>
        )}
      </main>
    </Layout>
  )
}