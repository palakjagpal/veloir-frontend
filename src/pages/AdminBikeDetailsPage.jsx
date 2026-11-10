import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { useAdminUI } from "../admin/AdminUIProvider";
import { StatusBadge } from "../admin/StatusFilter";
import { api, getImageUrl } from "../lib/api";
import "./AdminBikeDetailsPage.css";

const MONEY_KEYS = new Set(["price", "pricePerDay", "pricePerWeek", "pricePerMonth", "securityDeposit", "estimatedTradeValue"]);
const UNIT_SUFFIX = { mileage: " km", engineCapacity: " cc", minDuration: " day(s)", maxDuration: " day(s)", fuelTankCapacity: " L" };

const LISTING_ITEMS = [
  ["title", "Title"], ["brand", "Brand"], ["model", "Model"], ["year", "Year"], ["price", "Price"],
  ["category", "Category"], ["condition", "Condition"], ["mileage", "Mileage"],
  ["engineCapacity", "Engine capacity"], ["color", "Colour"],
];
const LOCATION_ITEMS = [["city", "City"], ["state", "State"], ["country", "Country"], ["pincode", "Pincode"], ["fullAddress", "Street address"]];
const TYPE_ITEMS = [["isForSale", "For sale"], ["isForRent", "For rent"], ["isForTrade", "For trade"]];
const RENTAL_ITEMS = [
  ["pricePerDay", "Per day"], ["pricePerWeek", "Per week"], ["pricePerMonth", "Per month"],
  ["securityDeposit", "Security deposit"], ["minDuration", "Min duration"], ["maxDuration", "Max duration"],
];
const TRADE_ITEMS = [
  ["preferredBrands", "Preferred brands"], ["preferredCategories", "Preferred categories"],
  ["conditions", "Conditions"], ["estimatedTradeValue", "Estimated trade value"],
];

// Human-readable names for the fields the seller can change (used in the review summary).
const FIELD_LABELS = {
  ...Object.fromEntries(LISTING_ITEMS),
  ...Object.fromEntries(TYPE_ITEMS),
  location: "Location",
  description: "Description",
  specs: "Specifications",
  rentalDetails: "Rental details",
  tradeDetails: "Trade details",
  registrationNumber: "Registration number",
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);

const formatDate = (value) =>
  value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

const labelize = (value) => {
  const text = String(value || "").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const sameJSON = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const normalizeText = (value) => String(value || "").replace(/\\r\\n|\\n|\\r/g, "\n");

function formatValue(key, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return [value.city, value.state].filter(Boolean).join(", ") || "—";
  if (MONEY_KEYS.has(key)) return formatMoney(value);
  return `${value}${UNIT_SUFFIX[key] || ""}`;
}

function Row({ label, value, changed = false, previous }) {
  return (
    <div className={`abd-row${changed ? " is-changed" : ""}`}>
      <dt>
        {label}
        {changed && <span className="abd-pill">Updated</span>}
      </dt>
      <dd>{value}</dd>
      {changed && <p className="abd-before">Before: {previous}</p>}
    </div>
  );
}

function Section({ title, children, changed = false, wide = false }) {
  return (
    <section className={`abd-card${wide ? " is-wide" : ""}${changed ? " has-changes" : ""}`}>
      <h2>{title}</h2>
      <dl className="abd-rows">{children}</dl>
    </section>
  );
}

function TextBlock({ title, text, emptyText, changed = false, previous }) {
  return (
    <section className={`abd-card is-wide${changed ? " has-changes" : ""}`}>
      <h2>
        {title}
        {changed && <span className="abd-pill">Updated</span>}
      </h2>
      <p className="abd-text">{normalizeText(text) || emptyText}</p>
      {changed && (
        <div className="abd-before-block">
          <span>Previous</span>
          <p className="abd-text">{normalizeText(previous) || "—"}</p>
        </div>
      )}
    </section>
  );
}

function BikeReview({ bike, busy, onDecide, onMarkReviewed, activeImage, setActiveImage }) {
  const approval = bike.approvalStatus || (bike.isApproved ? "approved" : "pending");
  const fields = bike.pendingEdits?.fields || [];
  const baselines = bike.pendingEdits?.previousValues || {};
  const hasEdits = fields.length > 0;
  const changed = (key) => fields.includes(key);
  const subChanged = (group, sub) => changed(group) && !sameJSON(baselines[group]?.[sub], bike[group]?.[sub]);
  const docBlocked = ["pending_review", "rejected"].includes(bike.manualDocumentStatus);

  const topRows = (items) =>
    items.map(([key, label]) => (
      <Row
        key={key}
        label={label}
        value={formatValue(key, bike[key])}
        changed={changed(key)}
        previous={formatValue(key, baselines[key])}
      />
    ));

  const groupRows = (group, items) =>
    items.map(([sub, label]) => {
      const value = bike[group]?.[sub];
      const isChangedRow = subChanged(group, sub);
      const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length);
      if (empty && !isChangedRow) return null;
      return (
        <Row
          key={`${group}.${sub}`}
          label={label}
          value={formatValue(sub, value)}
          changed={isChangedRow}
          previous={formatValue(sub, baselines[group]?.[sub])}
        />
      );
    });

  const specItems = Object.keys(bike.specs || {})
    .filter((key) => !/registrationNumber/i.test(key))
    .map((key) => [key, labelize(key)]);

  const images = [...new Set([bike.featuredImage, ...(bike.images || [])].filter(Boolean))];
  const safeIndex = Math.min(activeImage, Math.max(images.length - 1, 0));
  const currentImage = images[safeIndex];

  return (
    <>
      <div className="abd-header">
        <figure className="abd-gallery">
          {currentImage ? (
            <img src={getImageUrl(currentImage)} alt={bike.title} />
          ) : (
            <div className="abd-noimg">No photos uploaded</div>
          )}
          {images.length > 1 && (
            <div className="abd-thumbs">
              {images.map((src, index) => (
                <button
                  type="button"
                  key={src}
                  className={index === safeIndex ? "is-active" : ""}
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show photo ${index + 1}`}
                >
                  <img src={getImageUrl(src)} alt="" />
                </button>
              ))}
            </div>
          )}
        </figure>

        <div className="abd-summary">
          <div className="abd-badges">
            <StatusBadge status={approval} />
            {bike.isFeatured && <span className="abd-featured">Featured</span>}
            {hasEdits && (
              <span className="abd-updated-badge">
                <FiAlertCircle /> Updated by seller
              </span>
            )}
          </div>
          <h1>{bike.title}</h1>
          <p className="abd-subtitle">{[bike.brand, bike.model, bike.year].filter(Boolean).join(" · ")}</p>
          <p className="abd-price">{formatMoney(bike.price)}</p>
          <p className="abd-location">
            {[bike.location?.city, bike.location?.state].filter(Boolean).join(", ") || "Location not provided"}
          </p>

          {approval === "rejected" && bike.rejectionReason && (
            <div className="abd-note is-rejected">Rejection reason: {bike.rejectionReason}</div>
          )}
          {docBlocked && (
            <div className="abd-note is-warning">
              Manual document review must be completed before this listing can be approved.
            </div>
          )}

          <div className="abd-actions">
            {approval !== "approved" && approval !== "rejected" && (
              <button type="button" className="abd-reject" disabled={busy} onClick={() => onDecide("reject")}>
                <FiXCircle /> Reject
              </button>
            )}
            {approval !== "approved" && (
              <button type="button" className="abd-approve" disabled={busy || docBlocked} onClick={() => onDecide("approve")}>
                <FiCheckCircle /> Approve
              </button>
            )}
            {approval === "approved" && hasEdits && (
              <button type="button" className="abd-review" disabled={busy} onClick={onMarkReviewed}>
                <FiCheckCircle /> Mark changes reviewed
              </button>
            )}
          </div>
        </div>
      </div>

      {hasEdits && (
        <section className="abd-review-banner" role="status">
          <FiAlertCircle />
          <div>
            <strong>The seller updated this listing</strong>
            <span>
              {fields.length} {fields.length === 1 ? "field" : "fields"} changed
              {bike.pendingEdits?.updatedAt ? ` on ${formatDate(bike.pendingEdits.updatedAt)}` : ""}. Changed values are
              marked “Updated” below, with the value they replaced.
            </span>
            <div className="abd-chips">
              {fields.map((field) => (
                <span key={field} className="abd-chip">{FIELD_LABELS[field] || labelize(field)}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="abd-sections">
        <Section title="Listing details" changed={LISTING_ITEMS.some(([key]) => changed(key))}>
          {topRows(LISTING_ITEMS)}
        </Section>

        <Section title="Location" changed={changed("location")}>
          {groupRows("location", LOCATION_ITEMS)}
        </Section>

        <Section title="Listing type" changed={TYPE_ITEMS.some(([key]) => changed(key))}>
          {topRows(TYPE_ITEMS)}
        </Section>

        <Section title="Specifications" changed={changed("specs")}>
          {groupRows("specs", specItems)}
        </Section>

        {bike.isForRent && (
          <Section title="Rental details" changed={changed("rentalDetails")}>
            {groupRows("rentalDetails", RENTAL_ITEMS)}
          </Section>
        )}

        {bike.isForTrade && (
          <Section title="Trade details" changed={changed("tradeDetails")}>
            {groupRows("tradeDetails", TRADE_ITEMS)}
          </Section>
        )}

        <Section title="Seller & moderation">
          <Row label="Seller" value={bike.seller?.name || "Unknown"} />
          <Row label="Email" value={bike.seller?.email || "—"} />
          <Row label="Phone" value={bike.seller?.phone || "—"} />
          <Row label="Seller since" value={formatDate(bike.seller?.createdAt)} />
          <Row label="Listed on" value={formatDate(bike.createdAt)} />
          <Row label="Last updated" value={formatDate(bike.updatedAt)} />
          <Row label="Manual document review" value={labelize(bike.manualDocumentStatus || "not_submitted")} />
        </Section>

        <TextBlock
          title="Description"
          text={bike.description}
          emptyText="No description provided."
          changed={changed("description")}
          previous={baselines.description}
        />

        {(bike.isForRent || subChanged("rentalDetails", "terms")) && (
          <TextBlock
            title="Rental terms"
            text={bike.rentalDetails?.terms}
            emptyText="No rental terms provided."
            changed={subChanged("rentalDetails", "terms")}
            previous={baselines.rentalDetails?.terms}
          />
        )}
      </div>
    </>
  );
}

export default function AdminBikeDetailsPage() {
  const { id } = useParams();
  const { confirm, toast } = useAdminUI();
  const [bike, setBike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api(`/api/admin/bikes/${id}`);
      setBike(response?.data || null);
    } catch (err) {
      setError(err?.message || "Unable to load this listing.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Same approve/reject endpoints and confirmation copy as the listings page.
  const onDecide = async (decision) => {
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
    setBusy(true);
    try {
      const response = await api(`/api/admin/bikes/${id}/${decision}`, {
        method: "PUT",
        body: JSON.stringify(decision === "reject" ? { reason: "Listing did not meet Veloir marketplace review requirements." } : {}),
      });
      toast.success(response?.message || `Listing ${decision === "approve" ? "approved" : "rejected"}.`);
      await load();
    } catch (err) {
      toast.error(err?.message || `Could not ${decision} listing.`);
    } finally {
      setBusy(false);
    }
  };

  // Approving an already-approved listing acknowledges the seller's edits and clears the highlight.
  const onMarkReviewed = async () => {
    const confirmed = await confirm({
      title: "Mark seller changes as reviewed?",
      message: "The “Updated” highlights will be cleared. The listing stays published as it is.",
      confirmLabel: "Mark reviewed",
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const response = await api(`/api/admin/bikes/${id}/approve`, { method: "PUT", body: JSON.stringify({}) });
      toast.success(response?.message || "Changes marked as reviewed.");
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not mark changes as reviewed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="abd-page">
      <Link to="/admin/listings" className="abd-back">
        <FiArrowLeft /> Listings
      </Link>

      {error && (
        <div className="abd-error" role="alert">
          {error}
          <button type="button" onClick={load}>Retry</button>
        </div>
      )}

      {loading && !bike && !error && <div className="abd-state">Loading listing…</div>}

      {bike && (
        <BikeReview
          bike={bike}
          busy={busy}
          onDecide={onDecide}
          onMarkReviewed={onMarkReviewed}
          activeImage={activeImage}
          setActiveImage={setActiveImage}
        />
      )}
    </main>
  );
}
