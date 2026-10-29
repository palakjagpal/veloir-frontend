import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiBike, FiCheckCircle, FiClock, FiRefreshCw, FiXCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import { getImageUrl } from "../lib/api";
import "./AdminListingsPage.css";

export default function AdminListingsPage() {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await api("/api/admin/bikes/pending?page=1&limit=50"); setBikes(Array.isArray(response?.data) ? response.data : []); }
    catch (err) { setError(err?.message || "Unable to load pending bike listings."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const decide = async (bike, decision) => {
    if (decision === "reject" && !window.confirm(`Reject and remove the listing “${bike.title}”? This action removes the listing from the database.`)) return;
    if (decision === "approve" && !window.confirm(`Approve “${bike.title}”? The listing can only be published when required manual document review is complete.`)) return;
    setBusyId(bike._id);
    try {
      const response = await api(`/api/admin/bikes/${bike._id}/${decision}`, { method: "PUT", body: JSON.stringify(decision === "reject" ? { reason: "Listing did not meet Veloir marketplace review requirements." } : {}) });
      toast.success(response?.message || `Listing ${decision === "approve" ? "approved" : "rejected"}.`);
      setBikes((current) => current.filter((item) => item._id !== bike._id));
    } catch (err) { toast.error(err?.message || `Could not ${decision} listing.`); }
    finally { setBusyId(""); }
  };
  return <Layout><main className="admin-listings-page">
    <div className="admin-listings-header"><div><Link to="/admin" className="admin-back-link"><FiArrowLeft /> Dashboard</Link><span className="admin-eyebrow"><FiBike /> MARKETPLACE MODERATION</span><h1>Pending bike listings</h1><p>Review submitted listings before they appear in the public marketplace.</p></div><button className="admin-listings-refresh" onClick={load} disabled={loading}><FiRefreshCw /> Refresh</button></div>
    {error && <div className="admin-listings-error">{error}<button onClick={load}>Retry</button></div>}
    <div className="admin-listings-summary"><FiClock /><strong>{loading ? "…" : bikes.length}</strong><span>pending listings on this page</span></div>
    {loading ? <div className="admin-listings-empty">Loading pending listings…</div> : bikes.length === 0 ? <div className="admin-listings-empty"><FiCheckCircle /><strong>You're all caught up</strong><span>There are no pending bike listings to review.</span></div> : <div className="admin-listings-grid">{bikes.map((bike) => <article className="admin-listing-card" key={bike._id}>
      <div className="admin-listing-image">{(bike.featuredImage || bike.images?.[0]) ? <img src={getImageUrl(bike.featuredImage || bike.images[0])} alt={bike.title} /> : <FiBike />}</div>
      <div className="admin-listing-body"><div className="admin-listing-status">PENDING REVIEW</div><h2>{bike.title}</h2><p className="admin-listing-subtitle">{[bike.brand, bike.model, bike.year].filter(Boolean).join(" · ")}</p><div className="admin-listing-meta"><span>{bike.location?.city || "Location not provided"}{bike.location?.state ? `, ${bike.location.state}` : ""}</span><strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(bike.price || 0)}</strong></div><p className="admin-listing-seller">Seller: {bike.seller?.name || "Unknown"} · {bike.seller?.email || "No email"}</p>{bike.manualDocumentStatus === "pending_review" && <div className="admin-listing-warning">Manual document review is pending. Complete document review before approval.</div>}<div className="admin-listing-actions"><button className="admin-listing-reject" disabled={Boolean(busyId)} onClick={() => decide(bike, "reject")}><FiXCircle /> {busyId === bike._id ? "Saving…" : "Reject"}</button><button className="admin-listing-approve" disabled={Boolean(busyId)} onClick={() => decide(bike, "approve")}><FiCheckCircle /> {busyId === bike._id ? "Saving…" : "Approve"}</button></div></div>
    </article>)}</div>}
  </main></Layout>;
}
