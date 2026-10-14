import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { formatPrice } from "../../lib/api";
import {
  getRentalDisputes,
  resolveRentalDispute,
} from "../../services/rentalService";
import toast from "react-hot-toast";
import "../../components/rentals/rental.css";

const dateText = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "—";
export default function AdminRentalDisputesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [forms, setForms] = useState({});
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getRentalDisputes();
      setItems(res.data || []);
    } catch (err) {
      setError(err.message || "Unable to load disputes.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const update = (id, key, value) =>
    setForms((old) => ({
      ...old,
      [id]: {
        decision: "no_refund",
        amount: "",
        depositDecision: "release",
        depositAmount: "",
        note: "",
        ...old[id],
        [key]: value,
      },
    }));
  const submit = async (event, item) => {
    event.preventDefault();
    const form = forms[item._id] || {
      decision: "no_refund",
      amount: "",
      depositDecision: "release",
      depositAmount: "",
      note: "",
    };
    if (
      !window.confirm(
        `Record admin resolution “${form.decision}” for ${item.bookingCode}?`,
      )
    )
      return;
    setBusy(item._id);
    setError("");
    try {
      const res = await resolveRentalDispute(item._id, {
        decision: form.decision,
        amount: form.amount === "" ? undefined : Number(form.amount),
        depositDecision: form.depositDecision,
        depositAmount:
          form.depositAmount === "" ? undefined : Number(form.depositAmount),
        note: form.note,
      });
      toast.success(res.message || "Resolution saved.");
      await load();
    } catch (err) {
      setError(err.message || "Could not resolve dispute.");
      toast.error(err.message || "Could not resolve dispute.");
    } finally {
      setBusy("");
    }
  };
  return (
    <Layout>
      <main className="wrap vr-page">
        <p className="vr-eyebrow">ADMIN TOOLS</p>
        <h1>Rental disputes & refunds</h1>
        <p className="vr-page-subtitle">
          Review participant evidence and record a traceable resolution.
          Refund/deposit settlement in this build is sandbox-only; never use it
          as proof of a real transfer.
        </p>
        <div className="vr-callout">
          <strong>Sandbox settlement warning:</strong> no money is moved by this
          interface. In production, connect and verify a payment provider before
          executing actual refunds or deposit deductions.
        </div>
        {error && <div className="vr-alert">{error}</div>}
        {loading ? (
          <div className="vr-empty">Loading disputes…</div>
        ) : items.length === 0 ? (
          <div className="vr-empty">
            <h3>No open rental disputes</h3>
            <p>Damage reports and participant disputes will appear here.</p>
          </div>
        ) : (
          <div className="vr-admin-disputes">
            {items.map((item) => {
              const form = forms[item._id] || {
                decision: "no_refund",
                amount: "",
                depositDecision: "release",
                depositAmount: "",
                note: "",
              };
              return (
                <article className="vr-panel" key={item._id}>
                  <span className="vr-status disputed">
                    {item.dispute?.status || "open"}
                  </span>
                  <h2 style={{ marginTop: 12 }}>{item.bikeTitleSnapshot}</h2>
                  <p className="vr-list-meta">
                    {item.bookingCode} · {dateText(item.startDate)} →{" "}
                    {dateText(item.endDate)}
                    <br />
                    Renter: {item.renter?.name || "User"} · Owner:{" "}
                    {item.owner?.name || "User"}
                    <br />
                    Dispute type: {item.dispute?.type}
                  </p>
                  <p>
                    <strong>Reported issue</strong>
                    <br />
                    {item.dispute?.description}
                  </p>
                  {(item.dispute?.evidenceUrls || []).map((url) => (
                    <p key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        Open submitted evidence
                      </a>
                    </p>
                  ))}
                  <div className="vr-breakdown">
                    <div className="vr-price-line">
                      <span>Rental charge</span>
                      <strong>
                        {formatPrice(item.pricingSnapshot?.rentalCharge || 0)}
                      </strong>
                    </div>
                    <div className="vr-price-line">
                      <span>Security deposit</span>
                      <strong>{formatPrice(item.deposit?.amount || 0)}</strong>
                    </div>
                    <div className="vr-price-line">
                      <span>Deposit currently recorded</span>
                      <strong>{item.deposit?.status || "not collected"}</strong>
                    </div>
                  </div>
                  <form className="vr-form" onSubmit={(e) => submit(e, item)}>
                    <label className="vr-form-label">
                      Rental charge resolution
                      <select
                        className="vr-control"
                        value={form.decision}
                        onChange={(e) =>
                          update(item._id, "decision", e.target.value)
                        }
                      >
                        <option value="no_refund">
                          No rental-charge refund
                        </option>
                        <option value="refund_full">
                          Full rental-charge refund (sandbox)
                        </option>
                        <option value="refund_partial">
                          Partial rental-charge refund (sandbox)
                        </option>
                      </select>
                    </label>
                    {form.decision === "refund_partial" && (
                      <label className="vr-form-label">
                        Rental refund amount (INR)
                        <input
                          className="vr-control"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={form.amount}
                          onChange={(e) =>
                            update(item._id, "amount", e.target.value)
                          }
                        />
                      </label>
                    )}
                    <label className="vr-form-label">
                      Security deposit decision
                      <select
                        className="vr-control"
                        value={form.depositDecision}
                        onChange={(e) =>
                          update(item._id, "depositDecision", e.target.value)
                        }
                      >
                        <option value="release">
                          Release remaining deposit
                        </option>
                        <option value="deduct">
                          Deduct a portion (remainder is returned)
                        </option>
                        <option value="retain">
                          Retain the deposit (record as forfeited)
                        </option>
                      </select>
                    </label>
                    {form.depositDecision === "deduct" && (
                      <label className="vr-form-label">
                        Deposit deduction amount (INR)
                        <input
                          className="vr-control"
                          type="number"
                          min="0"
                          max={item.deposit?.amount || 0}
                          step="0.01"
                          required
                          value={form.depositAmount}
                          onChange={(e) =>
                            update(item._id, "depositAmount", e.target.value)
                          }
                        />
                      </label>
                    )}
                    <label className="vr-form-label">
                      Admin notes
                      <textarea
                        className="vr-control"
                        minLength={5}
                        maxLength={5000}
                        required
                        value={form.note}
                        onChange={(e) =>
                          update(item._id, "note", e.target.value)
                        }
                        placeholder="Document the evidence reviewed and reason for decision"
                      />
                    </label>
                    <button
                      type="submit"
                      className="vr-btn vr-btn-dark"
                      disabled={busy === item._id}
                    >
                      {busy === item._id
                        ? "Saving resolution…"
                        : "Record resolution"}
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </Layout>
  );
}
