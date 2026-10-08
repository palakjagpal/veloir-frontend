import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiChevronRight, FiClock, FiDollarSign, FiEdit3, FiShoppingBag, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { acceptCounterOffer, acceptOffer, counterOffer, getOffer, rejectOffer, withdrawOffer } from "../../services/dealsService";
import { BikeMini, Deadline, ErrorState, LoadingState, PageHeader, PersonRow, StatusBadge } from "./DealUI";
import { dateTime, effectiveExpiryStatus, money, userId } from "./dealHelpers";
import { useAuth } from "../../context/AuthContext";

export default function OfferDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMessage, setCounterMessage] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setOffer((await getOffer(id)).data); }
    catch (err) { setError(err.message || "Unable to load offer."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const sellerView = offer && userId(offer.seller) === userId(user);
  const buyerView = offer && userId(offer.buyer) === userId(user);
  const status = offer && effectiveExpiryStatus(offer.status, offer.expiresAt);

  const doAction = async (type, extra = null) => {
    setBusy(type);
    try {
      if (type === "accept") {
        const res = await acceptOffer(id);
        toast.success("Offer accepted.");
        const purchaseId = res.data?.purchase?._id;
        if (purchaseId) { navigate(`/purchases/${purchaseId}`); return; }
      }
      if (type === "reject") {
        const reason = window.prompt("Optional rejection reason:", "");
        if (reason === null) return;
        await rejectOffer(id, reason); toast.success("Offer rejected.");
      }
      if (type === "withdraw") {
        await withdrawOffer(id); toast.success("Offer withdrawn.");
      }
      if (type === "counter") {
        if (!counterPrice || Number(counterPrice) <= 0) { toast.error("Enter a valid counter price."); return; }
        await counterOffer(id, { offeredPrice: Number(counterPrice), message: counterMessage });
        toast.success("Counter-offer sent."); setCounterPrice(""); setCounterMessage("");
      }
      if (type === "acceptCounter") {
        const res = await acceptCounterOffer(id, extra);
        toast.success("Counter-offer accepted.");
        const purchaseId = res.data?.purchase?._id;
        if (purchaseId) { navigate(`/purchases/${purchaseId}`); return; }
      }
      await load();
    } catch (err) { toast.error(err.message || "Action failed."); }
    finally { setBusy(""); }
  };

  return (
    <Layout>
      <main className="deal-page wrap">
        <div className="deal-page-topspace" />
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} retry={load} />}
        {!loading && !error && offer && <>
          <Link to="/offers" className="deal-back"><FiArrowLeft /> Back to offers</Link>
          <PageHeader eyebrow="Offer details" title={offer.bike?.title || "Offer"} description={`Created ${dateTime(offer.createdAt)}`} action={<StatusBadge status={status} />} />
          <div className="deal-detail-grid">
            <section className="deal-panel">
              <BikeMini bike={offer.bike} />
              <div className="deal-offer-summary">
                <div><span>Current offer</span><strong>{money(offer.offeredPrice)}</strong></div>
                <div><span>Original price</span><strong>{money(offer.originalPrice)}</strong></div>
                <div><span>Savings</span><strong>{money((offer.originalPrice || 0) - (offer.offeredPrice || 0))}</strong></div>
              </div>
              <Deadline expiresAt={offer.expiresAt} />
              {offer.message && <div className="deal-response"><strong>Offer message</strong><p>{offer.message}</p></div>}
              <div className="counter-history">
                <div className="section-heading"><h2>Negotiation history</h2><span><FiClock /> {offer.counterOffers?.length || 0} counter-offers</span></div>
                {offer.counterOffers?.length ? offer.counterOffers.map((counter, index) => <div className="counter-row" key={`${counter.createdAt}-${index}`}><div><strong>{money(counter.offeredPrice)}</strong><p>{counter.message || "No message"}</p><small>{counter.madeBy?.name || "User"} · {dateTime(counter.createdAt)}</small></div><div className="counter-actions">{counter.status === "pending" && <StatusBadge status="pending" />}{counter.status !== "pending" && <StatusBadge status={counter.status} />}{buyerView && status === "countered" && counter.status === "pending" && <button className="deal-btn deal-btn-green" disabled={!!busy} onClick={() => doAction("acceptCounter", index)}><FiCheck /> Accept</button>}</div></div>) : <p className="deal-muted">No counter-offers yet.</p>}
              </div>
            </section>
            <aside className="deal-panel deal-panel-side">
              <div className="deal-people"><PersonRow label="Buyer" person={offer.buyer} /><PersonRow label="Seller" person={offer.seller} /></div>
              {sellerView && status === "pending" && <div className="deal-action-stack"><button className="deal-btn deal-btn-green full" disabled={!!busy} onClick={() => doAction("accept")}><FiCheck /> Accept offer</button><button className="deal-btn deal-btn-danger full" disabled={!!busy} onClick={() => doAction("reject")}><FiX /> Reject offer</button></div>}
              {sellerView && status === "pending" && <div className="deal-form"><div className="section-heading"><h3><FiEdit3 /> Counter the offer</h3></div><input type="number" min="1" placeholder="Counter price" value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} /><textarea maxLength={500} placeholder="Message to the buyer (optional)" value={counterMessage} onChange={(e) => setCounterMessage(e.target.value)} /><button className="deal-btn deal-btn-dark full" disabled={!!busy} onClick={() => doAction("counter")}><FiDollarSign /> Send counter-offer</button></div>}
              {buyerView && ["pending", "countered"].includes(status) && <button className="deal-btn deal-btn-danger full" disabled={!!busy} onClick={() => doAction("withdraw")}><FiX /> Withdraw offer</button>}
              {offer.purchaseId && <Link className="deal-btn deal-btn-dark full" to={`/purchases/${offer.purchaseId}`}><FiShoppingBag /> View purchase <FiChevronRight /></Link>}
            </aside>
          </div>
        </>}
      </main>
    </Layout>
  );
}
