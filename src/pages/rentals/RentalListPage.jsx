import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { formatPrice, getImageUrl } from "../../lib/api";
import { getRentals } from "../../services/rentalService";
import { FiArrowRight, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";
import "../../components/rentals/rental.css";

const dateText = (value) => value ? new Date(value).toISOString().slice(0, 10) : "—";

export default function RentalListPage({ role = "renter" }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { const res = await getRentals(role, status); setItems(res.data || []); }
    catch (err) { setError(err.message || "Unable to load rentals."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* role/status are intentional reload keys */ }, [role, status]);

  return <Layout>
    <main className="wrap vr-page">
      <p className="vr-eyebrow">VELOIR RENTALS</p>
      <h1>{role === "owner" ? "Rental management" : "My rentals"}</h1>
      <p className="vr-page-subtitle">Review dates, booking status, payment/deposit ledger and next actions. Payment/refund states are sandbox-only until a real provider is integrated.</p>
      <div className="vr-toolbar">
        <div className="vr-tabs" role="group" aria-label="Filter rentals">
          {["all", "requested", "accepted", "declined", "confirmed", "active", "return_pending", "completed", "disputed", "resolved", "cancelled", "expired"].map((value) => <button key={value} className={`vr-tab ${status === value ? "active" : ""}`} onClick={() => setStatus(value)} type="button">{value === "all" ? "All" : value.replaceAll("_", " ")}</button>)}
        </div>
        <button className="vr-btn vr-btn-outline" disabled={loading} onClick={load} type="button"><FiRefreshCw /> Refresh</button>
      </div>
      {error && <div className="vr-alert">{error} <button className="vr-btn vr-btn-outline" onClick={load} type="button">Retry</button></div>}
      {loading ? <div className="vr-empty">Loading rental bookings…</div> : items.length === 0 ? <div className="vr-empty"><h3>No rental bookings found</h3><p>{role === "owner" ? "New requests for your rental listings will appear here." : "When you request a bike rental, the booking appears here."}</p><Link className="vr-btn vr-btn-dark" to="/bikes">Discover bikes</Link></div> : <div className="vr-list">
        {items.map((item) => <article className="vr-list-card" key={item._id}>
          <img src={getImageUrl(item.bikeImageSnapshot)} alt={item.bikeTitleSnapshot || "Rental bike"} />
          <div>
            <h3>{item.bikeTitleSnapshot || "Bike rental"}</h3>
            <div className="vr-list-meta">Booking {item.bookingCode}<br />{dateText(item.startDate)} → {dateText(item.endDate)} · {item.rentalDays} day(s)<br />{role === "owner" ? `Renter: ${item.renter?.name || "Veloir user"}` : `Owner: ${item.owner?.name || "Veloir user"}`}</div>
            <p style={{ margin: "9px 0 0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><span className={`vr-status ${item.status}`}>{item.status.replaceAll("_", " ")}</span><strong>{formatPrice(item.pricingSnapshot?.rentalCharge || 0)} rental</strong></p>
          </div>
          <div className="vr-list-actions"><Link className="vr-btn vr-btn-dark" to={`/rentals/${item._id}`}>View booking <FiArrowRight /></Link>{role === "renter" && item.status === "accepted" && <Link className="vr-btn vr-btn-mint" to={`/rentals/${item._id}/checkout`}>Checkout</Link>}</div>
        </article>)}
      </div>}
    </main>
  </Layout>;
}
