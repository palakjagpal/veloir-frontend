import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiDollarSign, FiEye, FiShoppingBag } from "react-icons/fi";
import Layout from "../../components/Layout";
import { getOffers } from "../../services/dealsService";
import { EmptyState, ErrorState, LoadingState, Pager, PageHeader, StatusBadge, BikeMini, Deadline } from "./DealUI";
import { effectiveExpiryStatus, money } from "./dealHelpers";

const TABS = [
  { value: "", label: "All" },
  { value: "buyer", label: "As Buyer" },
  { value: "seller", label: "As Seller" },
];
const STATUSES = ["", "pending", "accepted", "rejected", "countered", "expired", "withdrawn"];

export default function OffersPage() {
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setResult(await getOffers({ role, status, page, limit: 10 })); }
    catch (err) { setError(err.message || "Unable to load offers."); }
    finally { setLoading(false); }
  }, [role, status, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      <main className="deal-page wrap">
        <div className="deal-page-topspace" />
        <PageHeader eyebrow="Negotiation" title="Offers" description="Review prices, counter-proposals and accepted deals." />
        <div className="deal-tabs">{TABS.map((tab) => <button key={tab.value} className={role === tab.value ? "active" : ""} onClick={() => { setRole(tab.value); setPage(1); }}>{tab.label}</button>)}</div>
        <div className="deal-filters"><label>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>{STATUSES.map((s) => <option key={s} value={s}>{s ? s[0].toUpperCase()+s.slice(1) : "All statuses"}</option>)}</select></label><Link className="deal-btn deal-btn-dark" to="/purchases"><FiShoppingBag /> Purchases</Link></div>
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} retry={load} />}
        {!loading && !error && !(result?.data || []).length && <EmptyState title="No offers yet" text="Offers you send or receive will appear here." action={<Link className="deal-btn deal-btn-dark" to="/bikes">Find a bike</Link>} />}
        {!loading && !error && !!(result?.data || []).length && <div className="deal-list">{result.data.map((offer) => {
          const effective = effectiveExpiryStatus(offer.status, offer.expiresAt);
          return <article className="deal-card" key={offer._id}><div className="deal-card-main"><BikeMini bike={offer.bike} /><div className="deal-card-info"><div className="deal-card-title-row"><StatusBadge status={effective} /><Deadline expiresAt={offer.expiresAt} /></div><div className="offer-price-row"><div><span>Offered</span><strong>{money(offer.offeredPrice)}</strong></div><div><span>Listed</span><strong>{money(offer.originalPrice)}</strong></div><div><span>Difference</span><strong>{money((offer.originalPrice || 0) - (offer.offeredPrice || 0))}</strong></div></div>{offer.message && <p className="deal-message">{offer.message}</p>}</div></div><div className="deal-card-actions"><Link className="deal-icon-link" title="View offer" to={`/offers/${offer._id}`}><FiEye /></Link></div></article>})}</div>}
        {!loading && !error && result?.pagination && <Pager pagination={result.pagination} onPage={setPage} />}
      </main>
    </Layout>
  );
}
