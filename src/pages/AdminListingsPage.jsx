import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiTag, FiCheckCircle, FiRefreshCw, FiXCircle } from "react-icons/fi";
import { useAdminUI } from "../admin/AdminUIProvider";
import { StatusBadge, StatusFilter } from "../admin/StatusFilter";
import { api, getImageUrl } from "../lib/api";
import "./AdminListingsPage.css";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending / Not approved" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const EMPTY_COPY = {
  all: "There are no bike listings yet.",
  pending: "There are no listings waiting for review.",
  approved: "No listings have been approved yet.",
  rejected: "No listings have been rejected.",
};

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

export default function AdminListingsPage() {
  const { confirm, toast } = useAdminUI();
  const [status, setStatus] = useState("pending");
  const [bikes, setBikes] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  // Server-side filtering: each tab queries the API, so results are never limited to one page of a client-side slice.
  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const response = await api(`/api/admin/bikes?status=${status}&page=1&limit=50`);
      if (requestId !== requestRef.current) return; // a newer tab selection superseded this response
      setBikes(Array.isArray(response?.data) ? response.data : []);
      setCounts(response?.counts || {});
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setError(err?.message || "Unable to load bike listings.");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const decide = async (bike, decision) => {
    const confirmed = await confirm(
      decision === "reject"
        ? {
            title: "Reject this listing?",
            message: `“${bike.title}” will be marked as rejected and hidden from the marketplace. It stays in the Rejected tab, and you can approve it later.`,
            confirmLabel: "Reject listing",
            tone: "danger",
          }
        : {
            title: "Approve this listing?",
            message: `“${bike.title}” will be approved. A listing can only be published once any required manual document review is complete.`,
            confirmLabel: "Approve listing",
          }
    );
    if (!confirmed) return;
    setBusyId(bike._id);
    try {
      const response = await api(`/api/admin/bikes/${bike._id}/${decision}`, {
        method: "PUT",
        body: JSON.stringify(decision === "reject" ? { reason: "Listing did not meet Veloir marketplace review requirements." } : {}),
      });
      toast.success(response?.message || `Listing ${decision === "approve" ? "approved" : "rejected"}.`);
      await load(); // refresh list and tab counts together
    } catch (err) {
      toast.error(err?.message || `Could not ${decision} listing.`);
    } finally {
      setBusyId("");
    }
  };

  const options = FILTERS.map((filter) => ({ ...filter, count: counts[filter.value] }));
  const activeLabel = FILTERS.find((filter) => filter.value === status)?.label;

  return (
    <main className="admin-listings-page">
      <div className="admin-listings-header">
        <div>
          <Link to="/admin" className="admin-back-link"><FiArrowLeft /> Dashboard</Link>
          <span className="admin-eyebrow"><FiTag /> MARKETPLACE MODERATION</span>
          <h1>Bike listings</h1>
          <p>Review submitted listings and filter by approval status.</p>
        </div>
        <button type="button" className="admin-listings-refresh" onClick={load} disabled={loading}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      <StatusFilter options={options} value={status} onChange={setStatus} label="Filter bike listings by approval status" />

      {error && <div className="admin-listings-error" role="alert">{error}<button type="button" onClick={load}>Retry</button></div>}

      {loading ? (
        <div className="admin-listings-empty" role="status">Loading listings…</div>
      ) : bikes.length === 0 ? (
        <div className="admin-listings-empty">
          <FiCheckCircle />
          <strong>No {status === "all" ? "" : `${activeLabel?.toLowerCase()} `}listings</strong>
          <span>{EMPTY_COPY[status]}</span>
        </div>
      ) : (
        <div className="admin-listings-grid">
          {bikes.map((bike) => {
            const approval = bike.approvalStatus || (bike.isApproved ? "approved" : "pending");
            const busy = busyId === bike._id;
            return (
              <article className="admin-listing-card" key={bike._id}>
                <div className="admin-listing-image">
                  {(bike.featuredImage || bike.images?.[0])
                    ? <img src={getImageUrl(bike.featuredImage || bike.images[0])} alt={bike.title} />
                    : <FiTag />}
                </div>
                <div className="admin-listing-body">
                  <StatusBadge status={approval} />
                  <h2>{bike.title}</h2>
                  <p className="admin-listing-subtitle">{[bike.brand, bike.model, bike.year].filter(Boolean).join(" · ")}</p>
                  <div className="admin-listing-meta">
                    <span>{bike.location?.city || "Location not provided"}{bike.location?.state ? `, ${bike.location.state}` : ""}</span>
                    <strong>{formatPrice(bike.price)}</strong>
                  </div>
                  <p className="admin-listing-seller">Seller: {bike.seller?.name || "Unknown"} · {bike.seller?.email || "No email"}</p>
                  {approval === "rejected" && bike.rejectionReason && (
                    <div className="admin-listing-note is-rejected">Reason: {bike.rejectionReason}</div>
                  )}
                  {approval !== "approved" && bike.manualDocumentStatus === "pending_review" && (
                    <div className="admin-listing-warning">Manual document review is pending. Complete document review before approval.</div>
                  )}
                  {approval !== "approved" && bike.manualDocumentStatus === "rejected" && (
                    <div className="admin-listing-warning">The seller's documents were rejected, so this listing cannot be approved until they are resubmitted.</div>
                  )}
                  <div className="admin-listing-actions">
                    {approval !== "rejected" && (
                      <button type="button" className="admin-listing-reject" disabled={Boolean(busyId)} onClick={() => decide(bike, "reject")}>
                        <FiXCircle /> {busy ? "Saving…" : "Reject"}
                      </button>
                    )}
                    {approval !== "approved" && (
                      <button type="button" className="admin-listing-approve" disabled={Boolean(busyId)} onClick={() => decide(bike, "approve")}>
                        <FiCheckCircle /> {busy ? "Saving…" : "Approve"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
