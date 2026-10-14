import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { formatPrice } from "../../lib/api";
import {
  completeSandboxRentalPayment,
  getRental,
  getRentalPaymentMode,
} from "../../services/rentalService";
import toast from "react-hot-toast";
import { FiShield, FiAlertTriangle } from "react-icons/fi";
import "../../components/rentals/rental.css";

const dateText = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "—";
export default function RentalCheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [b, m] = await Promise.all([getRental(id), getRentalPaymentMode()]);
      setBooking(b.data);
      setMode(m);
    } catch (err) {
      setError(err.message || "Unable to load checkout.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [id]);
  const pay = async () => {
    if (
      !window.confirm(
        "Sandbox simulation only. This does not charge a card or move money. Continue?",
      )
    )
      return;
    setBusy(true);
    try {
      const result = await completeSandboxRentalPayment(id);
      toast.success(result.message || "Sandbox payment recorded.");
      navigate(`/rentals/${id}`);
    } catch (err) {
      toast.error(err.message || "Sandbox checkout failed.");
      setError(err.message || "Sandbox checkout failed.");
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <Layout>
        <main className="wrap vr-page">
          <div className="vr-empty">Loading secure checkout…</div>
        </main>
      </Layout>
    );
  if (error && !booking)
    return (
      <Layout>
        <main className="wrap vr-page">
          <div className="vr-alert">{error}</div>
          <Link className="vr-btn vr-btn-dark" to="/rentals">
            Back to My Rentals
          </Link>
        </main>
      </Layout>
    );
  const p = booking?.pricingSnapshot || {};
  return (
    <Layout>
      <main className="wrap vr-page">
        <p className="vr-eyebrow">RENTAL CHECKOUT</p>
        <h1>Confirm rental payment</h1>
        <p className="vr-page-subtitle">
          Booking {booking?.bookingCode}. The backend rechecks owner acceptance,
          renter identity, the payment deadline and slot reservation on
          submission.
        </p>
        {mode?.mode === "sandbox" ? (
          <div className="vr-callout">
            <FiAlertTriangle
              style={{ verticalAlign: "middle", marginRight: 8 }}
            />
            <strong>Sandbox mode — not a real payment.</strong> No card, UPI,
            bank account or payment gateway is involved. The button only records
            a demo ledger state on Veloir's server.
          </div>
        ) : (
          <div className="vr-alert">
            Real payment is not configured. Do not attempt to collect or record
            real money through this screen.
          </div>
        )}
        {error && <div className="vr-alert">{error}</div>}
        <div className="vr-detail-grid">
          <section className="vr-panel">
            <h2>{booking?.bikeTitleSnapshot}</h2>
            <dl className="vr-kv">
              <dt>Booking code</dt>
              <dd>{booking?.bookingCode}</dd>
              <dt>Status</dt>
              <dd>
                <span className={`vr-status ${booking?.status}`}>
                  {booking?.status}
                </span>
              </dd>
              <dt>Pickup</dt>
              <dd>{dateText(booking?.startDate)}</dd>
              <dt>Return date (exclusive)</dt>
              <dd>{dateText(booking?.endDate)}</dd>
              <dt>Duration</dt>
              <dd>{booking?.rentalDays} day(s)</dd>
              <dt>Payment deadline</dt>
              <dd>
                {booking?.paymentDeadline
                  ? new Date(booking.paymentDeadline).toLocaleString()
                  : "—"}
              </dd>
            </dl>
          </section>
          <section className="vr-panel">
            <h2>Quote summary</h2>
            <div className="vr-breakdown">
              <div className="vr-price-line">
                <span>Rental charge</span>
                <strong>{formatPrice(p.rentalCharge || 0)}</strong>
              </div>
              <div className="vr-price-line">
                <span>Security deposit (separate)</span>
                <strong>{formatPrice(p.securityDeposit || 0)}</strong>
              </div>
              <div className="vr-price-total">
                <span>Total due</span>
                <strong>{formatPrice(p.totalDue || 0)}</strong>
              </div>
            </div>
            <p className="vr-muted">
              The quote and cancellation policy were snapshotted when the
              booking request was created. The deposit ledger is tracked
              independently from rental charges.
            </p>
            {booking?.status === "accepted" &&
            booking?.payment?.status === "pending" &&
            mode?.mode === "sandbox" ? (
              <button
                className="vr-btn vr-btn-mint"
                style={{ width: "100%" }}
                disabled={busy}
                onClick={pay}
              >
                {busy
                  ? "Recording sandbox payment…"
                  : `Simulate sandbox payment · ${formatPrice(p.totalDue || 0)}`}
              </button>
            ) : (
              <div className="vr-callout">
                This booking is not currently eligible for sandbox checkout.
                Current status: {booking?.status} / payment:{" "}
                {booking?.payment?.status}.
              </div>
            )}
            <Link
              className="vr-btn vr-btn-outline"
              style={{ width: "100%", marginTop: 10 }}
              to={`/rentals/${id}`}
            >
              Back to booking
            </Link>
          </section>
        </div>
      </main>
    </Layout>
  );
}
