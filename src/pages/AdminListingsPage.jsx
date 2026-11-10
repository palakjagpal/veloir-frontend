import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiArrowLeft, FiEye, FiTag, FiCheckCircle, FiRefreshCw, FiStar, FiXCircle } from "react-icons/fi";
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
  const [featured, setFeatured] = useState({ total: 0, max: 0 });
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
      if (response?.featured) setFeatured(response.featured);
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

  const toggleFeatured = async (bike) => {
    const removing = bike.isFeatured === true;
    if (removing) {
      const confirmed = await confirm({
        title: "Unfeature this bike?",
        message: `“${bike.title}” will no longer be featured and will free up a slot. The listing itself is not affected.`,
        confirmLabel: "Unfeature bike",
        tone: "danger",
      });
      if (!confirmed) return;
    }
    setBusyId(bike._id);
    try {
      const response = await api(`/api/admin/bikes/${bike._id}/${removing ? "unfeature" : "feature"}`, {
        method: "PUT",
        body: JSON.stringify({}),
      });
      toast.success(response?.message || (removing ? "Bike unfeatured." : "Bike featured."));
      await load();
    } catch (err) {
      toast.error(err?.message || `Could not ${removing ? "unfeature" : "feature"} this bike.`);
    } finally {
      setBusyId("");
    }
  };

  const slotsFull = featured.max > 0 && featured.total >= featured.max;

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

      {featured.max > 0 && (
        <p className="admin-listings-slots" role="status">
          <FiStar /> Featured slots used: <strong>{featured.total} / {featured.max}</strong>
          {slotsFull && " — remove a featured bike to add another"}
        </p>
      )}

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
            // Same rule the server enforces: only live (approved, available) listings can be featured.
            const eligible = approval === "approved" && bike.isAvailable === true && bike.status === "available";
            return (
              <article className="admin-listing-card" key={bike._id}>
                <div className="admin-listing-image">
                  {(bike.featuredImage || bike.images?.[0])
                    ? <img src={getImageUrl(bike.featuredImage || bike.images[0])} alt={bike.title} />
                    : <FiTag />}
                </div>
                <div className="admin-listing-body">
                  <div className="admin-listing-badges">
                    <StatusBadge status={approval} />
                    {bike.isFeatured && <span className="admin-listing-featured"><FiStar /> Featured</span>}
                    {(bike.pendingEdits?.fields?.length ?? 0) > 0 && (
                      <span className="admin-listing-updated"><FiAlertCircle /> Updated by seller</span>
                    )}
                  </div>
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
                    <Link to={`/admin/listings/${bike._id}`} className="admin-listing-view"><FiEye /> View details</Link>
                    {approval !== "rejected" && (
                      <button type="button" className="admin-listing-reject" disabled={Boolean(busyId)} onClick={() => decide(bike, "reject")}>
                        <FiXCircle /> {busy ? "Saving…" : "Reject"}
                      </button>
                    )}
                    {bike.isFeatured && (
                      <button type="button" className="admin-listing-feature is-featured" disabled={Boolean(busyId)} onClick={() => toggleFeatured(bike)}>
                        <FiStar /> {busy ? "Saving…" : "Unfeature Bike"}
                      </button>
                    )}
                    {!bike.isFeatured && eligible && (
                      <button
                        type="button"
                        className="admin-listing-feature"
                        disabled={Boolean(busyId) || slotsFull}
                        title={slotsFull ? `All ${featured.max} featured slots are in use` : undefined}
                        onClick={() => toggleFeatured(bike)}
                      >
                        <FiStar /> {busy ? "Saving…" : "Feature Bike"}
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
