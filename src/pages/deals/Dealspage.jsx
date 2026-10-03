import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'

const sections = [
  { to: '/inquiries', title: 'Inquiries', text: 'Questions you sent or received about bikes.' },
  { to: '/offers', title: 'Offers', text: 'Offers and counter-offers on listings.' },
  { to: '/purchases', title: 'Purchases', text: 'Payments, status and ownership transfers.' },
]

export default function DealsPage() {
  return (
    <Layout>
      <main className="wrap bike-section" style={{ paddingTop: 160 }}>
        <div className="section-top">
          <div>
            <p className="eyebrow">Marketplace</p>
            <h2>Your Deals</h2>
          </div>
        </div>
        <div className="bike-grid">
          {sections.map((s) => (
            <Link key={s.to} to={s.to} className="empty" style={{ display: 'block', textDecoration: 'none' }}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Link>
          ))}
        </div>
      </main>
    </Layout>
  )
}