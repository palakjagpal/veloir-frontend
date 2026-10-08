import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiFileText,
  FiInfo,
  FiShield,
} from "react-icons/fi";
import Layout from "../../components/Layout";
import { getTransfer } from "../../services/dealsService";
import {
  ErrorState,
  LoadingState,
  PageHeader,
  PersonRow,
  StatusBadge,
  BikeMini,
} from "./DealUI";
import { dateTime } from "./dealHelpers";

const DOCS = [
  ["registrationCertificate", "Registration Certificate"],
  ["insuranceCertificate", "Insurance Certificate"],
  ["pollutionCertificate", "Pollution Certificate"],
  ["saleAgreement", "Sale Agreement"],
];

export default function TransferDetailPage() {
  const { id } = useParams();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setTransfer((await getTransfer(id)).data);
    } catch (err) {
      setError(err.message || "Unable to load transfer details.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [id]);
  return (
    <Layout>
      <main className="deal-page wrap">
        <div className="deal-page-topspace" />
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} retry={load} />}
        {!loading && !error && transfer && (
          <>
            <Link
              to={`/purchases/${transfer.purchase?._id || ""}`}
              className="deal-back"
            >
              <FiArrowLeft /> Back to purchase
            </Link>
            <PageHeader
              eyebrow="Ownership transfer"
              title={transfer.bike?.title || "Ownership transfer"}
              description={`Started ${dateTime(transfer.createdAt)}`}
              action={<StatusBadge status={transfer.status} />}
            />
            <div className="deal-detail-grid">
              <section className="deal-panel">
                <BikeMini bike={transfer.bike} />
                <div className="deal-people">
                  <PersonRow label="Transfer from" person={transfer.fromUser} />
                  <PersonRow label="Transfer to" person={transfer.toUser} />
                </div>
                <div className="deal-response">
                  <strong>Transfer notes</strong>
                  <p>
                    {transfer.transferNotes || "No transfer notes were added."}
                  </p>
                </div>
                <div className="deal-note-box">
                  <FiInfo />
                  <p>
                    The current backend includes the ownership-transfer record
                    and initiation endpoint. Document upload/verification
                    endpoints are not present yet, so this page is currently
                    read-only.
                  </p>
                </div>
              </section>
              <aside className="deal-panel deal-panel-side">
                <div className="section-heading">
                  <h3>
                    <FiFileText /> Required documents
                  </h3>
                </div>
                <div className="document-list">
                  {DOCS.map(([key, label]) => {
                    const doc = transfer.documents?.[key];
                    return (
                      <div className="document-row" key={key}>
                        <div>
                          <strong>{label}</strong>
                          <small>
                            {doc?.uploadedAt
                              ? `Uploaded ${dateTime(doc.uploadedAt)}`
                              : "Not uploaded"}
                          </small>
                        </div>
                        {doc?.url ? (
                          <a href={doc.url} target="_blank" rel="noreferrer">
                            View
                          </a>
                        ) : (
                          <span className="document-missing">Pending</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="deal-form">
                  <div className="section-heading">
                    <h3>
                      <FiShield /> Verification
                    </h3>
                  </div>
                  <p>
                    Status:{" "}
                    <strong>
                      {transfer.verificationDetails?.verificationStatus ||
                        "pending"}
                    </strong>
                  </p>
                  {transfer.verificationDetails?.verifiedAt && (
                    <p>
                      Verified{" "}
                      {dateTime(transfer.verificationDetails.verifiedAt)}
                    </p>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
