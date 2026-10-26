import { useCallback, useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiFileText, FiRefreshCw, FiXCircle } from "react-icons/fi";
import Layout from "../components/Layout";
import {
  getPendingManualDocumentSubmissions,
  reviewManualDocumentSubmission,
} from "../services/kycService";
import "./AdminManualDocumentReviewPage.css";

const display = (value) => value === undefined || value === null || value === "" ? "—" : String(value);

export default function AdminManualDocumentReviewPage() {
  const [submissions, setSubmissions] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getPendingManualDocumentSubmissions();
      setSubmissions(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      setError(err?.message || "Unable to load the manual document review queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const decide = async (submission, decision) => {
    const action = decision === "verified" ? "approve" : "reject";
    const message = decision === "verified"
      ? "Approve this manual document submission? This records an administrator review; it does not authenticate government records."
      : "Reject this submission? The user will need to correct their details and submit again.";
    if (!window.confirm(message)) return;

    setBusyId(submission.id);
    setError("");
    setNotice("");
    try {
      const response = await reviewManualDocumentSubmission(submission.id, {
        decision,
        reviewNotes: notes[submission.id] || "",
      });
      setNotice(response?.message || `Submission ${decision === "verified" ? "approved" : "rejected"}.`);
      setSubmissions((current) => current.filter((item) => item.id !== submission.id));
    } catch (err) {
      setError(err?.message || `Unable to ${action} this submission.`);
    } finally {
      setBusyId("");
    }
  };

  return (
    <Layout>
      <main className="manual-review-page wrap">
        <header className="manual-review-header">
          <div>
            <p className="eyebrow">Administrator tools</p>
            <h1>Manual document review</h1>
            <p>Review Driving Licence and Vehicle RC details submitted with bike listings. Only pending submissions are shown.</p>
          </div>
          <button type="button" className="manual-review-refresh" onClick={loadQueue} disabled={loading || Boolean(busyId)}>
            <FiRefreshCw className={loading ? "manual-review-spin" : ""} /> Refresh queue
          </button>
        </header>

        <div className="manual-review-disclaimer">
          <FiShield /> <span>Approval records an internal manual review. Do not describe it as government-database verification. Review the details carefully before choosing a decision.</span>
        </div>

        {error && <div className="manual-review-alert is-error" role="alert"><FiXCircle /> {error}</div>}
        {notice && <div className="manual-review-alert is-success" role="status"><FiCheckCircle /> {notice}</div>}

        {loading ? (
          <div className="manual-review-empty"><FiRefreshCw className="manual-review-spin" /> Loading pending submissions…</div>
        ) : submissions.length === 0 ? (
          <div className="manual-review-empty"><FiCheckCircle /> No pending manual document submissions.</div>
        ) : (
          <section className="manual-review-list">
            {submissions.map((submission) => {
              const docs = submission.documents || {};
              const bike = submission.bike || {};
              const user = submission.user || {};
              const created = submission.submittedAt ? new Date(submission.submittedAt).toLocaleString("en-IN") : "—";
              return (
                <article className="manual-review-card" key={submission.id}>
                  <div className="manual-review-card-head">
                    <div>
                      <p className="manual-review-kicker"><FiClock /> Pending review · {created}</p>
                      <h2>{display(bike.title || `${bike.brand || "Bike"} ${bike.model || "listing"}`)}</h2>
                      <p>{display(bike.brand)} {display(bike.model)} {bike.year ? `· ${bike.year}` : ""}</p>
                    </div>
                    <span className="manual-review-status">Pending review</span>
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
                      <FiXCircle /> {busyId === submission.id ? "Saving…" : "Reject"}
                    </button>
                    <button type="button" className="manual-review-approve" onClick={() => decide(submission, "verified")} disabled={Boolean(busyId)}>
                      <FiCheckCircle /> {busyId === submission.id ? "Saving…" : "Approve submission"}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </Layout>
  );
}
