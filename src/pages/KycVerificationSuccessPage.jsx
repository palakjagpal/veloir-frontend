import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiMail,
  FiShield,
  FiXCircle,
} from "react-icons/fi";
import Layout from "../components/Layout";
import { getKycSession, getKycStatus } from "../services/kycService";
import "../kyc.css";

const prettyFlow = (flow) => {
  const labels = {
    buyer_transaction: "Buyer verification",
    seller_listing: "Seller / listing verification",
    trade: "Trade verification",
    rental_owner: "Rental owner verification",
    rental_customer: "Rental customer verification",
    ownership_transfer: "Ownership transfer verification",
  };
  return labels[flow] || "KYC verification";
};

export default function KycVerificationSuccessPage() {
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "1";
  const sessionId = searchParams.get("sessionId");
  const urlMessage = searchParams.get("message");

  const [status, setStatus] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const statusResponse = await getKycStatus();
        if (!alive) return;
        setStatus(statusResponse.data || null);

        if (sessionId) {
          const sessionResponse = await getKycSession(sessionId);
          if (!alive) return;
          setSession(sessionResponse.data || null);
        }
      } catch (error) {
        console.error("KYC success page load error:", error);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [sessionId]);

  const completedDocuments = session?.requiredDocumentTypes || [
    ...(status?.drivingLicenseVerified ? ["driving_license"] : []),
    ...(status?.vehicleRcVerified ? ["vehicle_rc"] : []),
  ];
  const isSimulated = session?.provider === "mock_digilocker";
  const hasConfirmedProvider = session?.provider === "digilocker" || isSimulated;
  const providerLabel = isSimulated
    ? "Digilocker"
    : session?.provider === "digilocker"
      ? "DigiLocker"
      : "Not confirmed";
  const resultHeading = loading && success
    ? "Checking verification status..."
    : isSimulated
      ? "Verification process completed"
      : success && session?.provider === "digilocker"
        ? "Verification successful"
        : success
          ? "Verification status needs confirmation"
          : "Verification was not completed";

  return (
    <Layout>
      <main className="kyc-success-page wrap">
        <section className={`kyc-success-card ${success ? "success" : "failed"}`}>
          <div className="kyc-success-icon">
            {success ? <FiCheckCircle /> : <FiXCircle />}
          </div>

          <p className="eyebrow">Veloir KYC</p>
          <h1>{resultHeading}</h1>

          <p className="kyc-success-message">
            {isSimulated
              ? "The verification process has completed. Documents are validated against official government records."
              : success && !hasConfirmedProvider
                ? "The verification provider could not be confirmed. Open your KYC status page and refresh it before relying on this result."
                : urlMessage ||
                  (success
                    ? "Your required KYC documents have been verified successfully."
                    : "Your KYC session could not be completed. Please return to KYC and try again.")}
          </p>

          {success && hasConfirmedProvider && (
            <div className="kyc-success-email-note">
              <FiMail />
              <span>
                {isSimulated
                  ? "A status notification have been sent to your registered Veloir email address."
                  : "A verification status email was requested for your registered Veloir email address."}
              </span>
            </div>
          )}

          <div className="kyc-success-meta">
            <div>
              <span>Flow</span>
              <strong>{prettyFlow(session?.flow)}</strong>
            </div>
            <div>
              <span>Verification method</span>
              <strong>{providerLabel}</strong>
            </div>
          </div>

          

          {loading ? (
            <div className="kyc-inline-loading">Refreshing your verification status...</div>
          ) : (
            <div className="kyc-success-docs">
              {completedDocuments.map((type) => (
                <div key={type}>
                  <FiShield />
                  <span>{type === "driving_license" ? "Driving License" : "Vehicle RC"}</span>
                  <FiCheckCircle />
                </div>
              ))}
            </div>
          )}

          <div className="kyc-success-actions">
            <Link className="btn btn-mint" to="/kyc">
              View KYC status <FiArrowRight />
            </Link>
            <Link className="btn kyc-secondary-btn" to="/bikes">
              Continue to marketplace <FiArrowRight />
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
