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

  return (
    <Layout>
      <main className="kyc-success-page wrap">
        <section className={`kyc-success-card ${success ? "success" : "failed"}`}>
          <div className="kyc-success-icon">
            {success ? <FiCheckCircle /> : <FiXCircle />}
          </div>

          <p className="eyebrow">Veloir KYC</p>
          <h1>{success ? "Verification successful" : "Verification was not completed"}</h1>

          <p className="kyc-success-message">
            {urlMessage ||
              (success
                ? "Your required KYC documents have been verified successfully."
                : "Your KYC session could not be completed. Please return to KYC and try again.")}
          </p>

          {success && (
            <div className="kyc-success-email-note">
              <FiMail />
              <span>
                A verification success email was requested for your registered Veloir email
                address.
              </span>
            </div>
          )}

          <div className="kyc-success-meta">
            <div>
              <span>Flow</span>
              <strong>{prettyFlow(session?.flow)}</strong>
            </div>
            <div>
              <span>Mode</span>
              <strong>{session?.provider === "mock_digilocker" ? "Demo / Mock" : "DigiLocker"}</strong>
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
