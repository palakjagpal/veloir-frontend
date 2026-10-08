import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiEye, FiShoppingBag } from "react-icons/fi";
import Layout from "../../components/Layout";
import { getPurchases } from "../../services/dealsService";
import {
  BikeMini,
  EmptyState,
  ErrorState,
  LoadingState,
  Pager,
  PageHeader,
  StatusBadge,
} from "./DealUI";
import { money } from "./dealHelpers";

const TABS = [
  { value: "", label: "All" },
  { value: "buyer", label: "As Buyer" },
  { value: "seller", label: "As Seller" },
];
const STATUSES = [
  "",
  "pending",
  "payment_pending",
  "payment_completed",
  "ownership_transfer_pending",
  "completed",
  "cancelled",
  "disputed",
];

export default function PurchasesPage() {
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await getPurchases({ role, status, page, limit: 10 }));
    } catch (err) {
      setError(err.message || "Unable to load purchases.");
    } finally {
      setLoading(false);
    }
  }, [role, status, page]);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <Layout>
      <main className="deal-page wrap">
        <div className="deal-page-topspace" />
        <PageHeader
          eyebrow="Ownership"
          title="Purchases"
          description="Track payment, delivery readiness and the road to ownership."
        />
        <div className="deal-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              className={role === tab.value ? "active" : ""}
              onClick={() => {
                setRole(tab.value);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="deal-filters">
          <label>
            Status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s
                    ? s
                        .replaceAll("_", " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                    : "All statuses"}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} retry={load} />}
        {!loading && !error && !(result?.data || []).length && (
          <EmptyState
            title="No purchases yet"
            text="Accepted offers and converted inquiries will create purchases here."
            action={
              <Link className="deal-btn deal-btn-dark" to="/offers">
                Review offers
              </Link>
            }
          />
        )}
        {!loading && !error && !!(result?.data || []).length && (
          <div className="deal-list">
            {result.data.map((purchase) => (
              <article className="deal-card" key={purchase._id}>
                <div className="deal-card-main">
                  <BikeMini bike={purchase.bike} />
                  <div className="deal-card-info">
                    <div className="deal-card-title-row">
                      <StatusBadge status={purchase.status} />
                    </div>
                    <div className="offer-price-row">
                      <div>
                        <span>Final price</span>
                        <strong>{money(purchase.finalPrice)}</strong>
                      </div>
                      <div>
                        <span>Listed price</span>
                        <strong>{money(purchase.originalListedPrice)}</strong>
                      </div>
                      <div>
                        <span>Savings</span>
                        <strong>
                          {money(
                            (purchase.originalListedPrice || 0) -
                              (purchase.finalPrice || 0),
                          )}
                        </strong>
                      </div>
                    </div>
                    <p className="deal-message">
                      Purchase created{" "}
                      {purchase.createdAt
                        ? new Date(purchase.createdAt).toLocaleDateString(
                            "en-IN",
                          )
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="deal-card-actions">
                  <Link
                    className="deal-icon-link"
                    title="View purchase"
                    to={`/purchases/${purchase._id}`}
                  >
                    <FiEye />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && !error && result?.pagination && (
          <Pager pagination={result.pagination} onPage={setPage} />
        )}
      </main>
    </Layout>
  );
}
