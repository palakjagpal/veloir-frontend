import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiCreditCard,
  FiFileText,
  FiMapPin,
  FiRefreshCw,
  FiShield,
  FiTruck,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import {
  getPurchase,
  initiateTransfer,
  updatePayment,
  updatePurchaseStatus,
} from "../../services/dealsService";
import {
  BikeMini,
  ErrorState,
  LoadingState,
  PageHeader,
  PersonRow,
  StatusBadge,
} from "./DealUI";
import { dateTime, money, userId } from "./dealHelpers";
import { useAuth } from "../../context/AuthContext";

const transitionMap = {
  pending: ["payment_pending", "cancelled"],
  payment_pending: ["payment_completed", "cancelled"],
  payment_completed: ["ownership_transfer_pending", "cancelled"],
  ownership_transfer_pending: ["completed", "cancelled"],
  disputed: ["completed", "cancelled"],
};

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [payment, setPayment] = useState({
    method: "upi",
    transactionId: "",
    paymentAmount: "",
    paymentStatus: "success",
  });
  const [statusNotes, setStatusNotes] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setPurchase((await getPurchase(id)).data);
    } catch (err) {
      setError(err.message || "Unable to load purchase.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [id]);

  const buyerView = purchase && userId(purchase.buyer) === userId(user);
  const nextStatuses = useMemo(
    () => transitionMap[purchase?.status] || [],
    [purchase?.status],
  );

  const submitPayment = async (paymentStatus) => {
    setBusy("payment");
    try {
      await updatePayment(id, {
        ...payment,
        paymentAmount: Number(payment.paymentAmount || purchase.finalPrice),
        paymentStatus,
      });
      toast.success(
        paymentStatus === "success"
          ? "Payment marked successful."
          : "Payment marked pending.",
      );
      await load();
    } catch (err) {
      toast.error(err.message || "Unable to update payment.");
    } finally {
      setBusy("");
    }
  };

  const changeStatus = async (status) => {
    const notes =
      status === "cancelled"
        ? window.prompt("Cancellation reason:", "")
        : statusNotes;
    if (status === "cancelled" && notes === null) return;
    setBusy(`status:${status}`);
    try {
      await updatePurchaseStatus(id, status, notes || "");
      toast.success(`Purchase moved to ${status.replaceAll("_", " ")}.`);
      setStatusNotes("");
      await load();
    } catch (err) {
      toast.error(err.message || "Unable to update purchase status.");
    } finally {
      setBusy("");
    }
  };

  const startTransfer = async () => {
    setBusy("transfer");
    try {
      const res = await initiateTransfer(id, transferNotes);
      toast.success("Ownership transfer initiated.");
      const transferId = res.data?.transfer?._id;
      if (transferId) navigate(`/transfers/${transferId}`);
      else await load();
    } catch (err) {
      toast.error(err.message || "Unable to initiate transfer.");
    } finally {
      setBusy("");
    }
  };

  return (
    <Layout>
      <main className="deal-page wrap">
        <div className="deal-page-topspace" />
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} retry={load} />}
        {!loading && !error && purchase && (
          <>
            <Link to="/purchases" className="deal-back">
              <FiArrowLeft /> Back to purchases
            </Link>
            <PageHeader
              eyebrow="Purchase details"
              title={purchase.bike?.title || "Purchase"}
              description={`Created ${dateTime(purchase.createdAt)}`}
              action={<StatusBadge status={purchase.status} />}
            />
            <div className="deal-detail-grid">
              <section className="deal-panel">
                <BikeMini bike={purchase.bike} />
                <div className="deal-offer-summary">
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
                <h2>People</h2>
                <div className="deal-people">
                  <PersonRow label="Buyer" person={purchase.buyer} />
                  <PersonRow label="Seller" person={purchase.seller} />
                </div>
                <div className="deal-timeline">
                  <Timeline
                    label="Purchase created"
                    date={purchase.createdAt}
                    done
                  />
                  <Timeline
                    label="Payment completed"
                    date={purchase.paymentDetails?.paymentDate}
                    done={
                      [
                        "payment_completed",
                        "ownership_transfer_pending",
                        "completed",
                      ].includes(purchase.status) ||
                      purchase.paymentDetails?.paymentStatus === "success"
                    }
                  />
                  <Timeline
                    label="Ownership transfer"
                    date={purchase.ownershipTransferDetails?.transferredAt}
                    done={["ownership_transfer_pending", "completed"].includes(
                      purchase.status,
                    )}
                  />
                  <Timeline
                    label="Completed"
                    date={purchase.completedAt}
                    done={purchase.status === "completed"}
                  />
                </div>
              </section>
              <aside className="deal-panel deal-panel-side">
                {buyerView &&
                  ["pending", "payment_pending"].includes(purchase.status) && (
                    <div className="deal-form">
                      <div className="section-heading">
                        <h3>
                          <FiCreditCard /> Payment details
                        </h3>
                      </div>
                      <select
                        value={payment.method}
                        onChange={(e) =>
                          setPayment((p) => ({ ...p, method: e.target.value }))
                        }
                      >
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                        <option value="netbanking">Net banking</option>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank transfer</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        placeholder="Transaction ID"
                        value={payment.transactionId}
                        onChange={(e) =>
                          setPayment((p) => ({
                            ...p,
                            transactionId: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder={`Amount (default ${purchase.finalPrice})`}
                        value={payment.paymentAmount}
                        onChange={(e) =>
                          setPayment((p) => ({
                            ...p,
                            paymentAmount: e.target.value,
                          }))
                        }
                      />
                      <button
                        className="deal-btn deal-btn-green full"
                        disabled={busy === "payment"}
                        onClick={() => submitPayment("success")}
                      >
                        <FiCheckCircle /> Mark payment successful
                      </button>
                      <button
                        className="deal-btn deal-btn-light full"
                        disabled={busy === "payment"}
                        onClick={() => submitPayment("pending")}
                      >
                        Save as payment pending
                      </button>
                      <small className="deal-note">
                        This connects to your current manual payment-status API;
                        it is not a live payment gateway.
                      </small>
                    </div>
                  )}
                {purchase.status === "payment_completed" &&
                  !purchase.ownershipTransfer && (
                    <div className="deal-form">
                      <div className="section-heading">
                        <h3>
                          <FiShield /> Ownership transfer
                        </h3>
                      </div>
                      <textarea
                        maxLength={500}
                        placeholder="Transfer notes (optional)"
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                      />
                      <button
                        className="deal-btn deal-btn-dark full"
                        disabled={busy === "transfer"}
                        onClick={startTransfer}
                      >
                        Initiate ownership transfer
                      </button>
                    </div>
                  )}
                {purchase.ownershipTransfer && (
                  <div className="deal-form">
                    <div className="section-heading">
                      <h3>
                        <FiFileText /> Transfer started
                      </h3>
                    </div>
                    <p className="deal-note">
                      Status:{" "}
                      <strong>
                        {purchase.ownershipTransfer.status?.replaceAll(
                          "_",
                          " ",
                        )}
                      </strong>
                    </p>
                    <Link
                      className="deal-btn deal-btn-dark full"
                      to={`/transfers/${purchase.ownershipTransfer._id}`}
                    >
                      Open transfer details
                    </Link>
                  </div>
                )}
                {nextStatuses.length > 0 && (
                  <div className="deal-form">
                    <div className="section-heading">
                      <h3>
                        <FiRefreshCw /> Purchase status
                      </h3>
                    </div>
                    {nextStatuses.map((next) => (
                      <button
                        key={next}
                        className={`deal-btn full ${next === "cancelled" ? "deal-btn-danger" : "deal-btn-light"}`}
                        disabled={busy === `status:${next}`}
                        onClick={() => changeStatus(next)}
                      >
                        {next
                          .replaceAll("_", " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </button>
                    ))}
                    {nextStatuses.includes("ownership_transfer_pending") && (
                      <small className="deal-note">
                        Use the ownership-transfer button above rather than
                        changing this status manually.
                      </small>
                    )}
                    <textarea
                      maxLength={500}
                      placeholder="Optional status notes"
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                    />
                  </div>
                )}
                {purchase.deliveryDetails && (
                  <div className="deal-form">
                    <div className="section-heading">
                      <h3>
                        <FiTruck /> Delivery
                      </h3>
                    </div>
                    <p>
                      <FiMapPin />{" "}
                      {purchase.deliveryDetails.address ||
                        "Pickup / delivery details not set"}
                    </p>
                    <p>
                      {purchase.deliveryDetails.city}
                      {purchase.deliveryDetails.state
                        ? `, ${purchase.deliveryDetails.state}`
                        : ""}{" "}
                      {purchase.deliveryDetails.pincode || ""}
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
function Timeline({ label, date, done }) {
  return (
    <div className={`timeline-item ${done ? "done" : ""}`}>
      <div className="timeline-dot" />{" "}
      <div>
        <strong>{label}</strong>
        <span>{date ? dateTime(date) : "Not reached"}</span>
      </div>
    </div>
  );
}
