import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { formatPrice, getImageUrl } from "../../lib/api";
import { getUserId } from "../../lib/inquiryUtils";
import {
  cancelRental,
  createRentalDispute,
  decideRental,
  getRental,
  reportRentalDamage,
  submitPickupEvidence,
  submitReturnEvidence,
  uploadRentalEvidence,
  releaseSandboxRentalDeposit,
} from "../../services/rentalService";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiShield,
} from "react-icons/fi";
import toast from "react-hot-toast";
import "../../components/rentals/rental.css";

const dateText = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "—";
const evidenceExists = (evidence) => !!evidence?.submittedAt;

function EvidenceForm({ bookingId, label, onSubmit, busy }) {
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [photoUrlsText, setPhotoUrlsText] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  return (
    <form
      className="vr-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
          const typedUrls = photoUrlsText
            .split(/\n+/)
            .map((s) => s.trim())
            .filter(Boolean);
          const uploaded = files.length
            ? await uploadRentalEvidence(bookingId, files)
            : { data: { urls: [] } };
          const photoUrls = [
            ...typedUrls,
            ...(uploaded.data?.urls || []),
          ].slice(0, 5);
          await onSubmit({ condition, notes, odometerKm, photoUrls });
        } catch (err) {
          toast.error(err.message || "Could not upload evidence.");
        } finally {
          setUploading(false);
        }
      }}
    >
      <label className="vr-form-label">
        Condition
        <textarea
          className="vr-control"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          maxLength={2000}
          placeholder="Describe scratches, visible damage, fuel/battery state…"
        />
      </label>
      <label className="vr-form-label">
        Notes
        <textarea
          className="vr-control"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={3000}
          placeholder="Anything both parties should record"
        />
      </label>
      <label className="vr-form-label">
        Odometer (km)
        <input
          className="vr-control"
          type="number"
          min="0"
          value={odometerKm}
          onChange={(e) => setOdometerKm(e.target.value)}
          placeholder="Optional"
        />
      </label>
      <label className="vr-form-label">
        Upload evidence photos (up to 5, 5 MB each)
        <input
          className="vr-control"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={(e) =>
            setFiles(Array.from(e.target.files || []).slice(0, 5))
          }
        />
      </label>
      <label className="vr-form-label">
        Or evidence photo URLs (HTTPS, one per line)
        <textarea
          className="vr-control"
          value={photoUrlsText}
          onChange={(e) => setPhotoUrlsText(e.target.value)}
          placeholder="Optional secure image URLs"
        />
      </label>
      <button
        className="vr-btn vr-btn-dark"
        disabled={busy || uploading}
        type="submit"
      >
        {busy || uploading ? "Saving evidence…" : label}
      </button>
    </form>
  );
}

export default function RentalDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [disputeType, setDisputeType] = useState("other");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeUrlsText, setDisputeUrlsText] = useState("");
  const [disputeFiles, setDisputeFiles] = useState([]);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getRental(id);
      setBooking(res.data);
    } catch (err) {
      setError(err.message || "Unable to load booking.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [id]);

  const isOwner = useMemo(
    () =>
      !!booking &&
      String(getUserId(user)) === String(booking.owner?._id || booking.owner),
    [booking, user],
  );
  const isRenter = useMemo(
    () =>
      !!booking &&
      String(getUserId(user)) === String(booking.renter?._id || booking.renter),
    [booking, user],
  );
  const mySide = isOwner ? "owner" : "renter";
  const perform = async (key, action) => {
    setBusyAction(key);
    setError("");
    try {
      const result = await action();
      toast.success(result.message || "Rental updated.");
      await load();
    } catch (err) {
      setError(err.message || "Rental action failed.");
      toast.error(err.message || "Rental action failed.");
    } finally {
      setBusyAction("");
    }
  };
  const onEvidence = (type, payload) =>
    perform(type, () =>
      type === "pickup"
        ? submitPickupEvidence(id, payload)
        : submitReturnEvidence(id, payload),
    );
  const confirmAndCancel = () => {
    const reason = window.prompt(
      "Reason for cancelling this rental request:",
      "Plans changed",
    );
    if (reason === null) return;
    if (
      !window.confirm(
        "Cancel this booking? The server will apply the snapshotted cancellation policy.",
      )
    )
      return;
    perform("cancel", () => cancelRental(id, reason));
  };
  const requestDecision = (decision) => {
    let message = "";
    if (decision === "decline") {
      const entered = window.prompt(
        "Optional reason for declining:",
        "Dates are not suitable",
      );
      if (entered === null) return;
      message = entered;
    }
    if (
      !window.confirm(
        `${decision === "accept" ? "Accept" : "Decline"} this rental request?`,
      )
    )
      return;
    perform(decision, () => decideRental(id, decision, message));
  };

  if (loading)
    return (
      <Layout>
        <main className="wrap vr-page">
          <div className="vr-empty">Loading rental booking…</div>
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
  if (!booking) return null;
  const p = booking.pricingSnapshot || {};
  const ownPickup = booking.pickupEvidence?.[mySide];
  const ownReturn = booking.returnEvidence?.[mySide];
  const canCancel = ["requested", "accepted", "confirmed"].includes(
    booking.status,
  );
  const canPickup =
    ["confirmed", "active"].includes(booking.status) &&
    !evidenceExists(ownPickup);
  const canReturn =
    ["active", "return_pending", "disputed"].includes(booking.status) &&
    !evidenceExists(ownReturn);
  const canOpenDispute =
    ["active", "return_pending", "completed", "disputed"].includes(
      booking.status,
    ) && !["open", "under_review"].includes(booking.dispute?.status);
  const canDamageReport =
    isOwner &&
    ["active", "return_pending", "completed"].includes(booking.status) &&
    !["open", "under_review"].includes(booking.dispute?.status);

  return (
    <Layout>
      <main className="wrap vr-page">
        <Link
          to={isOwner ? "/rental-management" : "/rentals"}
          className="vr-list-meta"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <FiArrowLeft /> Back to {isOwner ? "Rental Management" : "My Rentals"}
        </Link>
        <p className="vr-eyebrow">BOOKING {booking.bookingCode}</p>
        <h1>{booking.bikeTitleSnapshot}</h1>
        <p className="vr-page-subtitle">
          Rental dates are calendar-day based. Pickup date is included; the
          selected return date is exclusive for pricing.
        </p>
        {error && (
          <div className="vr-alert" role="alert">
            {error}
          </div>
        )}
        {booking.payment?.mode === "sandbox" && (
          <div className="vr-callout">
            <FiShield style={{ verticalAlign: "middle", marginRight: 8 }} />
            <strong>Sandbox ledger:</strong> payment/refund/deposit states shown
            here are simulated. No money moves.
          </div>
        )}
        <div className="vr-detail-grid">
          <div>
            <section className="vr-panel">
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  marginBottom: 17,
                }}
              >
                <img
                  src={getImageUrl(booking.bikeImageSnapshot)}
                  alt={booking.bikeTitleSnapshot}
                  style={{
                    width: 100,
                    height: 80,
                    objectFit: "cover",
                    borderRadius: 10,
                  }}
                />
                <div>
                  <span className={`vr-status ${booking.status}`}>
                    {booking.status.replaceAll("_", " ")}
                  </span>
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "#64777a",
                      fontSize: 13,
                    }}
                  >
                    {isOwner
                      ? `Renter: ${booking.renter?.name || "Veloir user"}`
                      : `Owner: ${booking.owner?.name || "Veloir user"}`}
                  </p>
                </div>
              </div>
              <dl className="vr-kv">
                <dt>Pickup date</dt>
                <dd>{dateText(booking.startDate)}</dd>
                <dt>Return date (exclusive)</dt>
                <dd>{dateText(booking.endDate)}</dd>
                <dt>Rental duration</dt>
                <dd>{booking.rentalDays} day(s)</dd>
                <dt>Created</dt>
                <dd>{new Date(booking.createdAt).toLocaleString()}</dd>
                <dt>Request expiry</dt>
                <dd>
                  {booking.requestExpiresAt
                    ? new Date(booking.requestExpiresAt).toLocaleString()
                    : "—"}
                </dd>
                <dt>Payment deadline</dt>
                <dd>
                  {booking.paymentDeadline
                    ? new Date(booking.paymentDeadline).toLocaleString()
                    : "—"}
                </dd>
                <dt>Payment status</dt>
                <dd>
                  {booking.payment?.status || "not due"} (
                  {booking.payment?.mode || "unconfigured"})
                </dd>
                <dt>Deposit status</dt>
                <dd>{booking.deposit?.status || "not collected"}</dd>
                <dt>Late return</dt>
                <dd>
                  {booking.lateDays || 0} day(s) ·{" "}
                  {formatPrice(booking.lateFee || 0)} estimated fee
                </dd>
              </dl>
            </section>
            <section className="vr-panel">
              <h2>Quote & policy snapshot</h2>
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
                  <span>Total quote</span>
                  <strong>{formatPrice(p.totalDue || 0)}</strong>
                </div>
              </div>
              <h3>Cancellation</h3>
              <p className="vr-muted">{p.policySnapshot?.cancellation}</p>
              <h3>Late return</h3>
              <p className="vr-muted">{p.policySnapshot?.lateReturn}</p>
              <h3>Pickup / return evidence</h3>
              <p className="vr-muted">{p.policySnapshot?.pickupReturn}</p>
              <h3>Damage</h3>
              <p className="vr-muted">{p.policySnapshot?.damage}</p>
            </section>
            <section className="vr-panel">
              <h2>Audit history</h2>
              {booking.audit?.length ? (
                <ol className="vr-audit">
                  {[...booking.audit].reverse().map((item, i) => (
                    <li key={`${item.action}-${item.at}-${i}`}>
                      <strong>{item.action.replaceAll("_", " ")}</strong>
                      <br />
                      <span>
                        {item.at ? new Date(item.at).toLocaleString() : ""}
                      </span>
                      {item.note && <div>{item.note}</div>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="vr-muted">No history available.</p>
              )}
            </section>
          </div>
          <aside>
            <section className="vr-panel">
              <h2>Available actions</h2>
              <div className="vr-action-stack">
                {isOwner && booking.status === "requested" && (
                  <>
                    <button
                      className="vr-btn vr-btn-mint"
                      disabled={!!busyAction}
                      onClick={() => requestDecision("accept")}
                    >
                      {busyAction === "accept"
                        ? "Accepting…"
                        : "Accept request"}
                    </button>
                    <button
                      className="vr-btn vr-btn-outline"
                      disabled={!!busyAction}
                      onClick={() => requestDecision("decline")}
                    >
                      {busyAction === "decline"
                        ? "Declining…"
                        : "Decline request"}
                    </button>
                  </>
                )}
                {isRenter &&
                  booking.status === "accepted" &&
                  booking.payment?.status === "pending" && (
                    <Link
                      className="vr-btn vr-btn-mint"
                      to={`/rentals/${id}/checkout`}
                    >
                      Continue to checkout
                    </Link>
                  )}
                {canCancel && (
                  <button
                    className="vr-btn vr-btn-outline"
                    disabled={!!busyAction}
                    onClick={confirmAndCancel}
                  >
                    Cancel booking
                  </button>
                )}
                {isOwner &&
                  booking.status === "completed" &&
                  booking.deposit?.status === "release_pending" && (
                    <button
                      className="vr-btn vr-btn-mint"
                      disabled={!!busyAction}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Record return of the security deposit in SANDBOX? This will not move any money.",
                          )
                        )
                          perform("deposit", () =>
                            releaseSandboxRentalDeposit(id),
                          );
                      }}
                    >
                      {busyAction === "deposit"
                        ? "Recording deposit release…"
                        : "Release security deposit (sandbox)"}
                    </button>
                  )}
                {canPickup && (
                  <div className="vr-form">
                    <h3>
                      <FiCalendar style={{ verticalAlign: "middle" }} /> Pickup
                      evidence ({mySide})
                    </h3>
                    <p className="vr-muted">
                      Both renter and owner must record their side before the
                      rental becomes active.
                    </p>
                    <EvidenceForm
                      bookingId={id}
                      label="Save pickup evidence"
                      busy={busyAction === "pickup"}
                      onSubmit={(data) => onEvidence("pickup", data)}
                    />
                  </div>
                )}
                {canReturn && (
                  <div className="vr-form">
                    <h3>Return evidence ({mySide})</h3>
                    <p className="vr-muted">
                      Both participants should record return condition. Late
                      fees are calculated by the server from calendar dates.
                    </p>
                    <EvidenceForm
                      bookingId={id}
                      label="Save return evidence"
                      busy={busyAction === "return"}
                      onSubmit={(data) => onEvidence("return", data)}
                    />
                  </div>
                )}
                {canOpenDispute && (
                  <form
                    className="vr-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const typedUrls = disputeUrlsText
                        .split(/\n+/)
                        .map((s) => s.trim())
                        .filter(Boolean);
                      (async () => {
                        try {
                          const uploaded = disputeFiles.length
                            ? await uploadRentalEvidence(id, disputeFiles)
                            : { data: { urls: [] } };
                          const evidenceUrls = [
                            ...typedUrls,
                            ...(uploaded.data?.urls || []),
                          ].slice(0, 10);
                          await perform("dispute", () =>
                            createRentalDispute(id, {
                              type: disputeType,
                              description: disputeDescription,
                              evidenceUrls,
                            }),
                          );
                        } catch (err) {
                          setError(err.message || "Evidence upload failed.");
                          toast.error(err.message || "Evidence upload failed.");
                        }
                      })();
                    }}
                  >
                    <h3>Open a dispute</h3>
                    <label className="vr-form-label">
                      Dispute type
                      <select
                        className="vr-control"
                        value={disputeType}
                        onChange={(e) => setDisputeType(e.target.value)}
                      >
                        <option value="other">Other issue</option>
                        <option value="late_return">
                          Late return / late fee
                        </option>
                      </select>
                    </label>
                    <label className="vr-form-label">
                      What happened?
                      <textarea
                        className="vr-control"
                        minLength={10}
                        maxLength={5000}
                        required
                        value={disputeDescription}
                        onChange={(e) => setDisputeDescription(e.target.value)}
                        placeholder="Describe late return, damage, deposit or another concern"
                      />
                    </label>
                    <label className="vr-form-label">
                      Upload evidence photos (up to 5, 5 MB each)
                      <input
                        className="vr-control"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        multiple
                        onChange={(e) =>
                          setDisputeFiles(
                            Array.from(e.target.files || []).slice(0, 5),
                          )
                        }
                      />
                    </label>
                    <label className="vr-form-label">
                      Evidence URLs (HTTPS, one per line)
                      <textarea
                        className="vr-control"
                        value={disputeUrlsText}
                        onChange={(e) => setDisputeUrlsText(e.target.value)}
                        placeholder="Optional secure image URLs"
                      />
                    </label>
                    <button
                      className="vr-btn vr-btn-dark"
                      disabled={!!busyAction}
                      type="submit"
                    >
                      Submit dispute
                    </button>
                  </form>
                )}
                {canDamageReport && (
                  <form
                    className="vr-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const typedUrls = disputeUrlsText
                        .split(/\n+/)
                        .map((s) => s.trim())
                        .filter(Boolean);
                      (async () => {
                        try {
                          const uploaded = disputeFiles.length
                            ? await uploadRentalEvidence(id, disputeFiles)
                            : { data: { urls: [] } };
                          const evidenceUrls = [
                            ...typedUrls,
                            ...(uploaded.data?.urls || []),
                          ].slice(0, 10);
                          await perform("damage", () =>
                            reportRentalDamage(id, {
                              description: disputeDescription,
                              evidenceUrls,
                            }),
                          );
                        } catch (err) {
                          setError(err.message || "Evidence upload failed.");
                          toast.error(err.message || "Evidence upload failed.");
                        }
                      })();
                    }}
                  >
                    <h3>Owner damage report</h3>
                    <p className="vr-muted">
                      Use this for return-condition damage claims. An
                      administrator must resolve the deposit deduction.
                    </p>
                    <label className="vr-form-label">
                      Damage description
                      <textarea
                        className="vr-control"
                        required
                        minLength={10}
                        maxLength={5000}
                        value={disputeDescription}
                        onChange={(e) => setDisputeDescription(e.target.value)}
                        placeholder="Describe evidence and observed damage"
                      />
                    </label>
                    <label className="vr-form-label">
                      Upload damage evidence photos
                      <input
                        className="vr-control"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        multiple
                        onChange={(e) =>
                          setDisputeFiles(
                            Array.from(e.target.files || []).slice(0, 5),
                          )
                        }
                      />
                    </label>
                    <label className="vr-form-label">
                      Evidence URLs
                      <textarea
                        className="vr-control"
                        value={disputeUrlsText}
                        onChange={(e) => setDisputeUrlsText(e.target.value)}
                        placeholder="HTTPS photo URLs, one per line"
                      />
                    </label>
                    <button
                      className="vr-btn vr-btn-outline"
                      disabled={!!busyAction}
                      type="submit"
                    >
                      Report damage
                    </button>
                  </form>
                )}
                {booking.status === "disputed" && (
                  <div className="vr-callout">
                    This booking is under dispute. Deposit deductions/refund
                    decisions require an administrator.
                  </div>
                )}
              </div>
            </section>
            {booking.dispute?.status !== "none" && (
              <section className="vr-panel">
                <h2>Dispute record</h2>
                <dl className="vr-kv">
                  <dt>Status</dt>
                  <dd>{booking.dispute.status}</dd>
                  <dt>Type</dt>
                  <dd>{booking.dispute.type}</dd>
                  <dt>Opened</dt>
                  <dd>{dateText(booking.dispute.openedAt)}</dd>
                  <dt>Description</dt>
                  <dd>{booking.dispute.description || "—"}</dd>
                  <dt>Admin resolution</dt>
                  <dd>{booking.dispute.resolution || "Awaiting decision"}</dd>
                  <dt>Admin notes</dt>
                  <dd>{booking.dispute.adminNotes || "—"}</dd>
                </dl>
                {booking.dispute.evidenceUrls?.map((url) => (
                  <p key={url}>
                    <a href={url} target="_blank" rel="noreferrer">
                      Open evidence
                    </a>
                  </p>
                ))}
              </section>
            )}
          </aside>
        </div>
      </main>
    </Layout>
  );
}
