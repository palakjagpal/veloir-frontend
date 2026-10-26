import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiClock, FiShield, FiXCircle } from "react-icons/fi";
import Layout from "../components/Layout";
import { getKycStatus } from "../services/kycService";
import "../kyc.css";

export default function KycVerificationSuccessPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getKycStatus()
      .then((response) => {
        if (alive) setStatus(response?.data ?? null);
      })
      .catch((loadError) => {
        if (alive) setError(loadError?.message || "Unable to load your manual review status.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const licenseStatus = status?.drivingLicense?.status || status?.latestSubmissionStatus || "not_submitted";
  const approved = licenseStatus === "verified" || Boolean(status?.drivingLicenseVerified);
  const pending = !approved && licenseStatus === "pending_review";
  const rejected = !approved && licenseStatus === "rejected";

  const heading = loading
    ? "Loading manual review status"
    : approved
      ? "Manual review approved"
      : pending
        ? "Documents awaiting administrator review"
        : rejected
          ? "Documents were rejected"
          : "No manual documents submitted yet";

  const message = approved
    ? "An administrator has approved a manual document submission. Rental booking will still verify the selected bike's Vehicle RC separately."
    : pending
      ? "Your submitted details are still pending review. Protected actions continue to return KYC_REQUIRED until an authorised administrator approves them."
      : rejected
        ? "Review the administrator's note on the KYC status page, correct your details, and submit again through the bike listing documents."
        : "Enter Driving Licence and Vehicle RC details in the RC & licence section when creating a bike listing. The submission will require administrator approval.";

  return (
    <Layout>
      <main className="kyc-success-page wrap">
        <section className={`kyc-success-card ${approved ? "success" : pending ? "pending" : "failed"}`}>
          <div className="kyc-success-icon">
            {loading ? <FiShield /> : approved ? <FiCheckCircle /> : pending ? <FiClock /> : <FiXCircle />}
          </div>
          <p className="eyebrow">Veloir manual KYC</p>
          <h1>{heading}</h1>
          <p className="kyc-success-message">{error || message}</p>
          {!loading && !error && (
            <div className="kyc-success-meta">
              <div><span>Driving Licence status</span><strong>{licenseStatus.replaceAll("_", " ")}</strong></div>
              <div><span>Verification method</span><strong>Manual administrator review</strong></div>
            </div>
          )}
          <p className="kyc-manual-disclaimer">
            Manual review does not independently authenticate details against government records.
          </p>
          <div className="kyc-success-actions">
            <Link className="btn btn-mint" to="/kyc">View KYC status <FiArrowRight /></Link>
            <Link className="btn kyc-secondary-btn" to="/bikes/create">Bike listing documents <FiArrowRight /></Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
