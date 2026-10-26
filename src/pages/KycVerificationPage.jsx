import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiShield,
  FiTruck,
  FiUserCheck,
  FiXCircle,
} from "react-icons/fi";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { getKycDocuments, getKycStatus } from "../services/kycService";
import "../kyc.css";

const formatRecordedDateTime = (date) => {
  if (!date) return null;
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
    timeZoneName: "short",
  }).format(parsedDate);
};

const statusText = (status) => {
  if (status === "verified") return "Admin approved";
  if (status === "pending_review") return "Pending admin review";
  if (status === "rejected") return "Rejected";
  return "Not submitted";
};

function StatusBadge({ status }) {
  const className = status === "verified"
    ? "kyc-status-badge kyc-status-badge--verified"
    : status === "rejected"
      ? "kyc-status-badge kyc-status-badge--rejected"
      : "kyc-status-badge kyc-status-badge--pending";

  return (
    <span className={className}>
      {status === "verified" ? <FiCheckCircle /> : status === "rejected" ? <FiXCircle /> : <FiClock />}
      {statusText(status)}
    </span>
  );
}

function DocumentCard({ title, icon, document }) {
  const status = document?.status || "not_submitted";
  const submittedAt = formatRecordedDateTime(document?.submittedAt || document?.createdAt);
  const reviewedAt = formatRecordedDateTime(document?.reviewedAt || document?.verifiedAt);

  const description = status === "verified"
    ? "An authorised Veloir administrator has approved this manual document submission."
    : status === "pending_review"
      ? "Your details have been submitted and are awaiting administrator review. Protected actions remain blocked until approval."
      : status === "rejected"
        ? "An administrator rejected this submission. Review the note below, correct the details, and submit updated documents with a bike listing."
        : "Driving Licence and Vehicle RC details are entered in the bike listing document section. Submissions stay blocked for protected actions until an administrator approves them.";

  return (
    <article className={`kyc-document-card ${status === "verified" ? "is-verified" : ""}`}>
      <div className="kyc-document-icon">{icon}</div>
      <div className="kyc-document-main">
        <div className="kyc-document-topline">
          <div>
            <p className="kyc-eyebrow">Manual document review</p>
            <h3>{title}</h3>
          </div>
          <StatusBadge status={status} />
        </div>

        <p className="kyc-document-description">{description}</p>

        {document?.documentNumberMasked && (
          <p>
            Document number: <strong>{document.documentNumberMasked}</strong>
          </p>
        )}

        {document?.bike?.title && (
          <p>
            Submitted with listing: <strong>{document.bike.title}</strong>
          </p>
        )}

        {document?.reviewNotes && (
          <p className="kyc-review-note">
            <strong>Administrator note:</strong> {document.reviewNotes}
          </p>
        )}

        {submittedAt && (
          <div className="kyc-recorded-time">
            <span>Submitted</span>
            <strong>{submittedAt}</strong>
          </div>
        )}
        {reviewedAt && (
          <div className="kyc-recorded-time">
            <span>{status === "verified" ? "Approved" : "Reviewed"}</span>
            <strong>{reviewedAt}</strong>
          </div>
        )}
      </div>
    </article>
  );
}

export default function KycVerificationPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadKyc = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const [statusResponse, documentsResponse] = await Promise.all([
        getKycStatus(),
        getKycDocuments(),
      ]);
      setStatus(statusResponse?.data ?? statusResponse?.data?.data ?? null);
      const responseDocuments = documentsResponse?.data;
      setDocuments(Array.isArray(responseDocuments) ? responseDocuments : []);
    } catch (err) {
      setError(err?.message || "Unable to load your manual document status.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadKyc();
  }, [loadKyc]);

  const drivingLicense = useMemo(
    () => status?.drivingLicense || documents.find((doc) => doc.documentType === "driving_license") || null,
    [status, documents],
  );
  const vehicleRc = useMemo(
    () => status?.vehicleRc || documents.find((doc) => doc.documentType === "vehicle_rc") || null,
    [status, documents],
  );

  const drivingLicenseVerified = Boolean(status?.drivingLicenseVerified);
  const vehicleRcVerified = Boolean(status?.vehicleRcVerified);
  const verificationComplete = drivingLicenseVerified && vehicleRc?.status === "verified";
  const latestRecordedAt = drivingLicense?.verifiedAt || drivingLicense?.reviewedAt || drivingLicense?.submittedAt;

  return (
    <Layout>
      <main className="kyc-page wrap">
        <div className="kyc-page-head">
          <div>
            <p className="eyebrow">Identity &amp; document checks</p>
            <h1>Manual document review</h1>
            <p className="kyc-page-subtitle">
              Submit your Driving Licence and the listing's Vehicle RC details in the bike listing form. An authorised administrator must approve the submission before it can satisfy KYC checks.
            </p>
          </div>
          <button
            type="button"
            className="kyc-refresh"
            onClick={loadKyc}
            disabled={refreshing}
            title="Refresh manual document status"
          >
            <FiRefreshCw className={refreshing ? "kyc-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="kyc-alert kyc-alert--error" role="alert">
            <FiXCircle />
            <span>{error}</span>
          </div>
        )}

        <section className="kyc-summary-card">
          <div className="kyc-summary-icon"><FiShield /></div>
          <div className="kyc-summary-copy">
            <p className="kyc-eyebrow">Account</p>
            <h2>{user?.name || "Veloir member"}</h2>
            <p>{user?.email || "Your signed-in Veloir account"}</p>
          </div>
          <div className="kyc-summary-state">
            <span className="kyc-mini-label">Manual review status</span>
            <strong>
              {verificationComplete
                ? "Approved documents on record"
                : drivingLicenseVerified
                  ? "Driving Licence approved"
                  : status?.latestSubmissionStatus === "pending_review"
                    ? "Awaiting administrator review"
                    : status?.latestSubmissionStatus === "rejected"
                      ? "Submission rejected"
                      : "Submission required"}
            </strong>
          </div>
        </section>

        <section className="kyc-documents-grid">
          <DocumentCard
            title="Driving Licence"
            icon={<FiUserCheck />}
            document={drivingLicense}
          />
          <DocumentCard
            title="Vehicle Registration Certificate (RC)"
            icon={<FiTruck />}
            document={vehicleRc}
          />
        </section>

        {latestRecordedAt && (
          <div className="kyc-recorded-time kyc-recorded-time--summary">
            <FiClock />
            <span>Latest Driving Licence review activity</span>
            <strong>{formatRecordedDateTime(latestRecordedAt)}</strong>
          </div>
        )}

        <section className="kyc-flow-card">
          <div className="kyc-section-heading">
            <div>
              <p className="kyc-eyebrow">How manual review works</p>
              <h2>{drivingLicenseVerified ? "Your Driving Licence is approved" : "Submit documents with a bike listing"}</h2>
            </div>
            <div className="kyc-provider-chip">Administrator approval required</div>
          </div>

          <div className="kyc-process-steps">
            <div><span>1</span><div><strong>Enter document details</strong><small>Use the RC &amp; licence section of Create a Bike Listing.</small></div></div>
            <div><span>2</span><div><strong>Wait for review</strong><small>The submission remains pending and cannot satisfy KYC until an authorised admin reviews it.</small></div></div>
            <div><span>3</span><div><strong>Continue after approval</strong><small>Rental booking checks your approved Driving Licence and separately checks the selected bike's RC.</small></div></div>
          </div>

          <div className="kyc-action-row">
            <Link className="btn btn-mint" to="/bikes/create">
              {drivingLicenseVerified ? "Submit documents for another bike" : "Go to bike listing documents"}
              <FiArrowRight />
            </Link>
            <Link className="btn kyc-secondary-btn" to="/my-bikes">
              View my listings <FiArrowRight />
            </Link>
          </div>
        </section>

        <section className="kyc-access-card">
          <div className="kyc-section-heading">
            <div>
              <p className="kyc-eyebrow">Protected actions</p>
              <h2>What your review status means</h2>
            </div>
          </div>
          <div className="kyc-capability-grid">
            {[
              ["Buy", status?.canBuy, "Approved Driving Licence"],
              ["Make Offer", status?.canMakeOffers, "Approved Driving Licence"],
              ["Send Inquiry", status?.canMakeInquiries, "Approved Driving Licence"],
              ["Sell", status?.canSell, "Approved licence + listing RC"],
              ["Rent a bike", status?.canRent, "Approved licence + selected bike RC check"],
              ["Trade", status?.canTrade, "Approved licence + listing RC"],
              ["Ownership Transfer", status?.canTransferOwnership, "Approved Driving Licence"],
            ].map(([label, ready, requirement]) => (
              <div className="kyc-capability" key={label}>
                {ready ? <FiCheckCircle className="ready" /> : <FiClock />}
                <div><strong>{label}</strong><small>{requirement}</small></div>
              </div>
            ))}
          </div>
        </section>

        <p className="kyc-manual-disclaimer">
          This is an administrative manual review of user-submitted details. It does not query or independently authenticate records against a government database.
        </p>

        <div className="kyc-footer-actions">
          <Link to="/bikes">Back to marketplace <FiArrowRight /></Link>
          <Link to="/settings">Open account settings <FiArrowRight /></Link>
        </div>
      </main>
    </Layout>
  );
}
