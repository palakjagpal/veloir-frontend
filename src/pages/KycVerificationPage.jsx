import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiFileText,
  FiInfo,
  FiRefreshCw,
  FiShield,
  FiTruck,
  FiUserCheck,
  FiXCircle,
} from "react-icons/fi";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import {
  getKycDocuments,
  getKycStatus,
  startDigiLockerVerification,
  verifyMockKyc,
} from "../services/kycService";
import "../kyc.css";

const DEMO_MODE = import.meta.env.VITE_KYC_DEMO_MODE !== "false";

const flowLabel = {
  buyer_transaction: "Buyer verification",
  seller_listing: "Seller / listing verification",
};

const documentTitle = (type) =>
  type === "driving_license" ? "Driving License" : "Vehicle RC";

const isVerified = (doc) =>
  doc?.status === "verified" &&
  (!doc?.consent?.validTill || new Date(doc.consent.validTill) > new Date());

function StatusBadge({ verified }) {
  return verified ? (
    <span className="kyc-status-badge kyc-status-badge--verified">
      <FiCheckCircle /> Verified
    </span>
  ) : (
    <span className="kyc-status-badge kyc-status-badge--pending">
      <FiClock /> Required
    </span>
  );
}

function DocumentCard({ title, icon, verified, document }) {
  const updated = document?.updatedAt
    ? new Date(document.updatedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <article className={`kyc-document-card ${verified ? "is-verified" : ""}`}>
      <div className="kyc-document-icon">{icon}</div>

      <div className="kyc-document-main">
        <div className="kyc-document-topline">
          <div>
            <p className="kyc-eyebrow">Identity document</p>
            <h3>{title}</h3>
          </div>
          <StatusBadge verified={verified} />
        </div>

        {verified ? (
          <div className="kyc-document-details">
            <p>
              Holder: <strong>{document?.holderName || "Verified account holder"}</strong>
            </p>
            {document?.documentNumberMasked && (
              <p>
                Document: <strong>{document.documentNumberMasked}</strong>
              </p>
            )}
            {document?.vehicle?.registrationNumberMasked && (
              <p>
                Registration: <strong>{document.vehicle.registrationNumberMasked}</strong>
              </p>
            )}
            {updated && <p>Last checked: {updated}</p>}
          </div>
        ) : (
          <p className="kyc-document-description">
            This document is required before protected Veloir actions can continue.
          </p>
        )}
      </div>
    </article>
  );
}

export default function KycVerificationPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [flow, setFlow] = useState("buyer_transaction");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadKyc = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    setError("");

    try {
      const [statusResponse, documentsResponse] = await Promise.all([
        getKycStatus(),
        getKycDocuments(),
      ]);

      setStatus(statusResponse.data || null);
      setDocuments(documentsResponse.data || []);
    } catch (err) {
      setError(err.message || "Unable to load your KYC status.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadKyc();
  }, [loadKyc]);

  const drivingLicense = useMemo(
    () => documents.find((doc) => doc.documentType === "driving_license") || null,
    [documents]
  );

  const latestVehicleRc = useMemo(
    () =>
      documents.find((doc) => doc.documentType === "vehicle_rc" && isVerified(doc)) ||
      documents.find((doc) => doc.documentType === "vehicle_rc") ||
      null,
    [documents]
  );

  const buyerReady = !!status?.canBuy;
  const sellerReady = !!status?.canSell;

  const selectedFlowNeedsRc = flow === "seller_listing";

  const handleVerification = async (demo = false) => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (selectedFlowNeedsRc && !registrationNumber.trim()) {
        throw new Error("Enter the vehicle registration number for RC verification.");
      }

      if (demo) {
        const response = await verifyMockKyc({
          flow,
          vehicleRegistrationNumber: selectedFlowNeedsRc
            ? registrationNumber.trim().toUpperCase()
            : "",
        });

        setNotice(
          `${flowLabel[flow]} completed in demo mode. ` +
            (response.emailSent
              ? "The KYC success email was sent."
              : "KYC completed, but the success email could not be confirmed.")
        );

        await loadKyc({ silent: true });
        return;
      }

      const response = await startDigiLockerVerification({
        flow,
        vehicleRegistrationNumber: selectedFlowNeedsRc
          ? registrationNumber.trim().toUpperCase()
          : "",
      });

      if (!response.authorizationUrl) {
        throw new Error("The backend did not return a DigiLocker authorization URL.");
      }

      window.location.assign(response.authorizationUrl);
    } catch (err) {
      setError(err.message || "Unable to start KYC verification.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <main className="kyc-page wrap">
        <div className="kyc-page-head">
          <div>
            <p className="eyebrow">Trust & verification</p>
            <h1>Verify your identity</h1>
            <p className="kyc-page-subtitle">
              Complete your Veloir document verification once, then use the marketplace
              with the required identity checks in place.
            </p>
          </div>

          <button
            type="button"
            className="kyc-refresh"
            onClick={() => loadKyc()}
            disabled={refreshing}
            title="Refresh KYC status"
          >
            <FiRefreshCw className={refreshing ? "kyc-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="kyc-alert kyc-alert--error">
            <FiXCircle />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="kyc-alert kyc-alert--success">
            <FiCheckCircle />
            <span>{notice}</span>
          </div>
        )}

        <section className="kyc-summary-card">
          <div className="kyc-summary-icon">
            <FiShield />
          </div>
          <div className="kyc-summary-copy">
            <p className="kyc-eyebrow">Account</p>
            <h2>{user?.name || "Veloir member"}</h2>
            <p>{user?.email || "Your signed-in Veloir account"}</p>
          </div>
          <div className="kyc-summary-state">
            <span className="kyc-mini-label">Marketplace access</span>
            <strong>
              {sellerReady ? "Seller + Buyer ready" : buyerReady ? "Buyer ready" : "Verification required"}
            </strong>
          </div>
        </section>

        <section className="kyc-documents-grid">
          <DocumentCard
            title="Driving License"
            icon={<FiUserCheck />}
            verified={!!status?.drivingLicenseVerified}
            document={drivingLicense || status?.drivingLicense}
          />

          <DocumentCard
            title="Vehicle RC"
            icon={<FiTruck />}
            verified={!!status?.vehicleRcVerified}
            document={latestVehicleRc || status?.vehicleRc}
          />
        </section>

        <section className="kyc-flow-card">
          <div className="kyc-section-heading">
            <div>
              <p className="kyc-eyebrow">Demo KYC</p>
              <h2>Choose what you need to verify</h2>
            </div>
            <div className="kyc-demo-chip">Backend: mock mode</div>
          </div>

          <div className="kyc-flow-options">
            <button
              type="button"
              className={`kyc-flow-option ${flow === "buyer_transaction" ? "selected" : ""}`}
              onClick={() => {
                setFlow("buyer_transaction");
                setError("");
                setNotice("");
              }}
            >
              <span className="kyc-flow-radio" />
              <span>
                <strong>Buyer verification</strong>
                <small>Driving License only</small>
              </span>
            </button>

            <button
              type="button"
              className={`kyc-flow-option ${flow === "seller_listing" ? "selected" : ""}`}
              onClick={() => {
                setFlow("seller_listing");
                setError("");
                setNotice("");
              }}
            >
              <span className="kyc-flow-radio" />
              <span>
                <strong>Seller / listing verification</strong>
                <small>Driving License + Vehicle RC</small>
              </span>
            </button>
          </div>

          {selectedFlowNeedsRc && (
            <div className="kyc-field">
              <label htmlFor="registrationNumber">Vehicle registration number</label>
              <input
                id="registrationNumber"
                value={registrationNumber}
                onChange={(event) => {
                  setRegistrationNumber(event.target.value.toUpperCase());
                  setError("");
                }}
                placeholder="e.g. PB10AB1234"
                autoComplete="off"
              />
              <small>
                In demo mode this number is linked to the mock RC record. When you create a
                real listing later, the backend checks that the listing registration number
                matches the verified RC.
              </small>
            </div>
          )}

          <div className="kyc-action-row">
            {DEMO_MODE && (
              <button
                type="button"
                className="btn btn-mint kyc-primary-btn"
                onClick={() => handleVerification(true)}
                disabled={busy}
              >
                {busy ? "Verifying..." : "Verify instantly (Demo)"}
                <FiCheckCircle />
              </button>
            )}

            <button
              type="button"
              className="btn kyc-secondary-btn"
              onClick={() => handleVerification(false)}
              disabled={busy}
            >
              Start DigiLocker flow <FiExternalLink />
            </button>
          </div>

          <div className="kyc-info-box">
            <FiInfo />
            <p>
              Demo verification creates test records in your dedicated KYC collection. It is
              not a real government verification. Production DigiLocker verification should
              only be enabled after the appropriate requester onboarding and credentials are
              available.
            </p>
          </div>
        </section>

        <section className="kyc-access-card">
          <div className="kyc-section-heading">
            <div>
              <p className="kyc-eyebrow">What this unlocks</p>
              <h2>Verification capabilities</h2>
            </div>
          </div>

          <div className="kyc-capability-grid">
            {[
              ["Buy", status?.canBuy, "Driving License"],
              ["Make Offer", status?.canMakeOffers, "Driving License"],
              ["Send Inquiry", status?.canMakeInquiries, "Driving License"],
              ["Sell", status?.canSell, "Driving License + RC"],
              ["Rent", status?.canRent, "Driving License + RC"],
              ["Trade", status?.canTrade, "Driving License + RC"],
              ["Ownership Transfer", status?.canTransferOwnership, "Driving License"],
            ].map(([label, ready, requirement]) => (
              <div className="kyc-capability" key={label}>
                {ready ? <FiCheckCircle className="ready" /> : <FiClock />}
                <div>
                  <strong>{label}</strong>
                  <small>{requirement}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="kyc-footer-actions">
          <Link to="/bikes">Back to marketplace <FiArrowRight /></Link>
          <Link to="/settings">Open account settings <FiArrowRight /></Link>
        </div>
      </main>
    </Layout>
  );
}
