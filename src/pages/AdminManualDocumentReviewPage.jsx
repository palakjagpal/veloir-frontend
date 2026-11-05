import { useCallback, useEffect, useRef, useState } from "react";
import { FiCheckCircle, FiClock, FiFileText, FiRefreshCw, FiShield, FiXCircle } from "react-icons/fi";
import { useAdminUI } from "../admin/AdminUIProvider";
import { StatusBadge, StatusFilter } from "../admin/StatusFilter";
import {
  getManualDocumentSubmissions,
  reviewManualDocumentSubmission,
} from "../services/kycService";
import "./AdminManualDocumentReviewPage.css";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "Pending verification" },
  { value: "verified", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

// API status -> shared badge tone
const BADGE = { pending_review: "pending", verified: "approved", rejected: "rejected" };
const BADGE_LABEL = { pending_review: "Pending verification", verified: "Approved", rejected: "Rejected" };
const EMPTY_COPY = {
  all: "No manual document submissions yet.",
  pending_review: "No submissions are waiting for verification.",
  verified: "No submissions have been approved yet.",
  rejected: "No submissions have been rejected.",
};

const display = (value) => value === undefined || value === null || value === "" ? "—" : String(value);

export default function AdminManualDocumentReviewPage() {
  const { confirm, toast } = useAdminUI();
  const [status, setStatus] = useState("pending_review");
  const [counts, setCounts] = useState({});
  const [submissions, setSubmissions] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const loadQueue = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const response = await getManualDocumentSubmissions(status);
      if (requestId !== requestRef.current) return; // superseded by a newer tab selection
      setSubmissions(Array.isArray(response?.data) ? response.data : []);
      setCounts(response?.counts || {});
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setError(err?.message || "Unable to load the manual document review queue.");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [status]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const decide = async (submission, decision) => {
    const action = decision === "verified" ? "approve" : "reject";
    const approving = decision === "verified";
    const confirmed = await confirm(
      approving
        ? {
            title: "Approve this document?",
            message: "This records an administrator review; it does not authenticate government records.",
            confirmLabel: "Approve document",
          }
        : {
            title: "Reject this document?",
            message: "The user will need to correct their details and submit again.",
            confirmLabel: "Reject document",
            tone: "danger",
          }
    );
    if (!confirmed) return;

    setBusyId(submission.id);
    setError("");
    try {
      const response = await reviewManualDocumentSubmission(submission.id, {
        decision,
        reviewNotes: notes[submission.id] || "",
      });
      const successMessage = response?.message || `Submission ${decision === "verified" ? "approved" : "rejected"}.`;
      toast.success(successMessage, approving ? "Document approved" : "Document rejected");
      setNotes((current) => {
        const { [submission.id]: _removed, ...rest } = current;
        return rest;
      });
      await loadQueue(); // refresh list and tab counts together
    } catch (err) {
      const failureMessage = err?.message || `Unable to ${action} this submission.`;
      toast.error(failureMessage, "Review not saved");
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      <main className="manual-review-page wrap">
        <header className="manual-review-header">
          <div>
            <p className="eyebrow">Administrator tools</p>
            <h1>Manual document review</h1>
            <p>Review Driving Licence and Vehicle RC details submitted with bike listings, and filter by review status.</p>
          </div>
          <button type="button" className="manual-review-refresh" onClick={loadQueue} disabled={loading || Boolean(busyId)}>
            <FiRefreshCw className={loading ? "manual-review-spin" : ""} /> Refresh
          </button>
        </header>

        <div className="manual-review-disclaimer">
          <FiShield /> <span>Approval records an internal manual review. Do not describe it as government-database verification. Review the details carefully before choosing a decision.</span>
        </div>

        <StatusFilter
          options={FILTERS.map((filter) => ({ ...filter, count: counts[filter.value] }))}
          value={status}
          onChange={setStatus}
          label="Filter document submissions by review status"
        />

        {error && <div className="manual-review-alert is-error" role="alert"><FiXCircle /> {error}</div>}

        {loading ? (
          <div className="manual-review-empty"><FiRefreshCw className="manual-review-spin" /> Loading submissions…</div>
        ) : submissions.length === 0 ? (
          <div className="manual-review-empty"><FiCheckCircle /> {EMPTY_COPY[status]}</div>
        ) : (
          <section className="manual-review-list">
            {submissions.map((submission) => {
              const docs = submission.documents || {};
              const bike = submission.bike || {};
              const user = submission.user || {};
              const created = submission.submittedAt ? new Date(submission.submittedAt).toLocaleString("en-IN") : "—";
              const reviewed = submission.reviewedAt ? new Date(submission.reviewedAt).toLocaleString("en-IN") : "";
              const isPending = submission.status === "pending_review";
              return (
                <article className="manual-review-card" key={submission.id}>
                  <div className="manual-review-card-head">
                    <div>
                      <p className="manual-review-kicker"><FiClock /> Submitted {created}</p>
                      <h2>{display(bike.title || `${bike.brand || "Bike"} ${bike.model || "listing"}`)}</h2>
                      <p>{display(bike.brand)} {display(bike.model)} {bike.year ? `· ${bike.year}` : ""}</p>
                    </div>
                    <StatusBadge status={BADGE[submission.status]} label={BADGE_LABEL[submission.status]} />
                  </div>

                  <div className="manual-review-user">
                    <strong>Submitted by</strong>
                    <span>{display(user.name)}</span>
                    <span>{display(user.email)}</span>
                  </div>

                  <div className="manual-review-doc-grid">
                    <section>
                      <h3><FiFileText /> Driving Licence</h3>
                      <dl>
                        <div><dt>Licence number</dt><dd>{display(docs.drivingLicenceNumber)}</dd></div>
                      </dl>
                    </section>
                    <section>
                      <h3><FiFileText /> Vehicle RC</h3>
                      <dl>
                        <div><dt>Registration number</dt><dd>{display(docs.vehicleRegistrationNumber)}</dd></div>
                        <div><dt>Registered owner</dt><dd>{display(docs.rcOwnerName)}</dd></div>
                        <div><dt>Registration date</dt><dd>{display(docs.rcRegistrationDate)}</dd></div>
                        <div><dt>RTO</dt><dd>{display(docs.rcRto)}</dd></div>
                        <div><dt>Vehicle class</dt><dd>{display(docs.rcVehicleClass)}</dd></div>
                        <div><dt>Make / model</dt><dd>{display([docs.rcVehicleMake, docs.rcVehicleModel].filter(Boolean).join(" "))}</dd></div>
                      </dl>
                    </section>
                  </div>

                  {isPending ? (
                    <>
                      <label className="manual-review-notes-label" htmlFor={`review-note-${submission.id}`}>Review note (optional, max 500 characters)</label>
                      <textarea
                        id={`review-note-${submission.id}`}
                        maxLength={500}
                        rows={3}
                        value={notes[submission.id] || ""}
                        onChange={(event) => setNotes((current) => ({ ...current, [submission.id]: event.target.value }))}
                        placeholder="Add a concise reason or review note for the user…"
                        disabled={Boolean(busyId)}
                      />

                      <div className="manual-review-actions">
                        <button type="button" className="manual-review-reject" onClick={() => decide(submission, "rejected")} disabled={Boolean(busyId)}>
                          <FiXCircle /> {busyId === submission.id ? "Saving…" : "Reject Document"}
                        </button>
                        <button type="button" className="manual-review-approve" onClick={() => decide(submission, "verified")} disabled={Boolean(busyId)}>
                          <FiCheckCircle /> {busyId === submission.id ? "Saving…" : "Approve Document"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="manual-review-record">
                      <strong>{submission.status === "verified" ? "Approved" : "Rejected"}{reviewed ? ` on ${reviewed}` : ""}</strong>
                      {submission.reviewNotes ? <span>Note: {submission.reviewNotes}</span> : <span>No review note was added.</span>}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </main>
    </>
  );
}
