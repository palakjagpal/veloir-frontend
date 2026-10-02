// Shared placeholder used by Phase 0 routes until each page is built.
import { Link, useParams } from 'react-router-dom'
import Layout from '../../components/Layout'

export default function Dealstub({ eyebrow, title, description }) {
  const { id } = useParams()
  return (
    <Layout>
      <main className="wrap bike-section" style={{ paddingTop: 160 }}>
        <div className="section-top">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
        </div>
        <div className="empty">
          {id && <p>Reference: <code>{id}</code></p>}
          <p>{description}</p>
          <p><Link to="/deals">Back to Deals</Link></p>
        </div>
      </main>
    </Layout>
  )
}