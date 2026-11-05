import { useCallback, useEffect, useState } from "react";
import { Star, RefreshCw, StarOff, Eye, EyeOff } from "lucide-react";
import { useAdminUI } from "../admin/AdminUIProvider";
import { StatusBadge } from "../admin/StatusFilter";
import { api, getImageUrl } from "../lib/api";
import "./AdminFeaturedBikesPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

/** Why a featured bike is not actually shown on the public carousel. */
function hiddenReason(bike) {
  if (bike.isLive) return "";
  if (bike.approvalStatus === "pending") return "Not approved yet";
  if (bike.approvalStatus === "rejected") return "Listing rejected";
  return "Unavailable or not in “available” status";
}

export default function AdminFeaturedBikesPage() {
  const { confirm, toast } = useAdminUI();
  const [bikes, setBikes] = useState([]);
  const [stats, setStats] = useState({ totalFeatured: 0, maxSlots: 0, remainingSlots: 0, liveFeatured: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api("/api/admin/bikes/featured");
      setBikes(Array.isArray(response?.data) ? response.data : []);
      if (response?.stats) setStats(response.stats);
    } catch (err) {
      setError(err?.message || "Unable to load featured bikes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unfeature = async (bike) => {
    const confirmed = await confirm({
      title: "Remove from featured?",
      message: `“${bike.title}” will no longer be featured and will free up a slot. The listing itself is not affected.`,
      confirmLabel: "Remove from featured",
      tone: "danger",
    });
    if (!confirmed) return;
    setBusyId(bike._id);
    try {
      const response = await api(`/api/admin/bikes/${bike._id}/unfeature`, { method: "PUT", body: JSON.stringify({}) });
      toast.success(response?.message || "Bike removed from featured listings.");
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not update the featured status.");
    } finally {
      setBusyId("");
    }
  };

  const usage = stats.maxSlots > 0 ? Math.min(100, Math.round((stats.totalFeatured / stats.maxSlots) * 100)) : 0;
  const full = stats.maxSlots > 0 && stats.totalFeatured >= stats.maxSlots;
  const over = stats.totalFeatured > stats.maxSlots;

  return (
    <main className="adm-featured-page">
      <header className="adm-featured-header">
        <div>
          <span className="adm-featured-eyebrow"><Star size={14} /> HOMEPAGE MERCHANDISING</span>
          <h1>Featured bikes</h1>
          <p>Bikes currently marked as featured. Only approved, available bikes appear on the public site.</p>
        </div>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "adm-featured-spin" : ""} /> Refresh
        </button>
      </header>

      {error && <div className="adm-featured-error" role="alert">{error}<button type="button" onClick={load}>Retry</button></div>}

      <section className="adm-featured-stats" aria-label="Featured slot usage">
        <div className="adm-featured-stat adm-featured-stat-wide">
          <span className="adm-featured-stat-label">Slots used</span>
          <strong>{loading ? "…" : `${stats.totalFeatured} / ${stats.maxSlots}`}</strong>
          <div
            className={`adm-featured-meter ${full ? "is-full" : ""}`}
            role="progressbar"
            aria-label="Featured slots used"
            aria-valuemin={0}
            aria-valuemax={stats.maxSlots}
            aria-valuenow={stats.totalFeatured}
          >
            <span style={{ width: `${usage}%` }} />
          </div>
          {over && <span className="adm-featured-hint">Over the {stats.maxSlots}-slot limit: remove some bikes.</span>}
        </div>
        <div className="adm-featured-stat">
          <span className="adm-featured-stat-label">Slots remaining</span>
          <strong>{loading ? "…" : stats.remainingSlots}</strong>
        </div>
        <div className="adm-featured-stat">
          <span className="adm-featured-stat-label">Live on site</span>
          <strong>{loading ? "…" : stats.liveFeatured}</strong>
        </div>
      </section>

      {loading ? (
        <div className="adm-featured-empty" role="status">Loading featured bikes…</div>
      ) : bikes.length === 0 ? (
        <div className="adm-featured-empty">
          <StarOff size={26} />
          <strong>No featured bikes</strong>
          <span>No bikes are currently marked as featured.</span>
        </div>
      ) : (
        <ul className="adm-featured-grid">
          {bikes.map((bike) => {
            const image = bike.featuredImage || bike.images?.[0];
            const reason = hiddenReason(bike);
            return (
              <li className="adm-featured-card" key={bike._id}>
                <div className="adm-featured-image">
                  {image ? <img src={getImageUrl(image)} alt={bike.title} loading="lazy" /> : <Star size={32} />}
                </div>
                <div className="adm-featured-body">
                  <div className="adm-featured-badges">
                    <StatusBadge status={bike.approvalStatus} />
                    <span className={`adm-featured-live ${bike.isLive ? "is-live" : ""}`}>
                      {bike.isLive ? <Eye size={13} /> : <EyeOff size={13} />}
                      {bike.isLive ? "Live on site" : "Not shown"}
                    </span>
                  </div>
                  <h2>{bike.title}</h2>
                  <p className="adm-featured-sub">{[bike.brand, bike.model, bike.year].filter(Boolean).join(" · ")}</p>
                  <div className="adm-featured-meta">
                    <span>{bike.location?.city || "Location not provided"}</span>
                    <strong>{formatPrice(bike.price)}</strong>
                  </div>
                  <p className="adm-featured-seller">Seller: {bike.seller?.name || "Unknown"}</p>
                  {reason && <p className="adm-featured-reason">{reason}</p>}
                  <button type="button" className="adm-btn adm-btn-ghost adm-featured-remove" disabled={Boolean(busyId)} onClick={() => unfeature(bike)}>
                    <StarOff size={15} /> {busyId === bike._id ? "Removing…" : "Remove from featured"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
