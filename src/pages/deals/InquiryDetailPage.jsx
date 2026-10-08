import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiChevronRight, FiMail, FiPhone, FiShoppingBag, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { acceptInquiry, convertInquiryToPurchase, getInquiry, rejectInquiry } from "../../services/dealsService";
import { BikeMini, Deadline, ErrorState, LoadingState, PageHeader, PersonRow, StatusBadge } from "./DealUI";
import { effectiveExpiryStatus, money, dateTime, userId } from "./dealHelpers";
import { useAuth } from "../../context/AuthContext";

export default function InquiryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { const res = await getInquiry(id); setInquiry(res.data); }
    catch (err) { setError(err.message || "Unable to load inquiry."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const sellerView = inquiry && userId(inquiry.seller) === userId(user);
  const buyerView = inquiry && userId(inquiry.buyer) === userId(user);
  const status = inquiry && effectiveExpiryStatus(inquiry.status, inquiry.expiresAt);

  const action = async (type) => {
    setBusy(type);
    try {
      if (type === "accept") {
        const message = window.prompt("Optional response to the buyer:", "Your inquiry has been accepted. Please proceed with the next step.");
        if (message === null) return;
        await acceptInquiry(id, message);
        toast.success("Inquiry accepted.");
      } else if (type === "reject") {
        const reason = window.prompt("Optional rejection reason:", "");
        if (reason === null) return;
        await rejectInquiry(id, reason);
        toast.success("Inquiry rejected.");
      } else {
        const res = await convertInquiryToPurchase(id);
        toast.success("Inquiry converted to purchase.");
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
        {!loading && !error && inquiry && (
          <>
            <Link to="/inquiries" className="deal-back"><FiArrowLeft /> Back to inquiries</Link>
            <PageHeader eyebrow="Inquiry details" title={inquiry.bike?.title || "Inquiry"} description={`Created ${dateTime(inquiry.createdAt)}`} action={<StatusBadge status={status} />} />

            <div className="deal-detail-grid">
              <section className="deal-panel">
                <BikeMini bike={inquiry.bike} />
                <div className="deal-detail-status"><Deadline expiresAt={inquiry.expiresAt} /></div>
                <h2>Buyer message</h2>
                <p className="deal-large-text">{inquiry.message}</p>
                <div className="deal-data-grid large">
                  <span>Proposed price<strong>{money(inquiry.proposedPrice)}</strong></span>
                  <span>Preferred contact<strong>{inquiry.preferredContact || "Email"}</strong></span>
                  <span>Viewing requested<strong>{inquiry.viewingRequested ? "Yes" : "No"}</strong></span>
                  {inquiry.viewingDate && <span>Viewing date<strong>{dateTime(inquiry.viewingDate)}</strong></span>}
                  {inquiry.viewingLocation && <span>Viewing location<strong>{inquiry.viewingLocation}</strong></span>}
                </div>
                {inquiry.responseMessage && <div className="deal-response"><strong>Seller response</strong><p>{inquiry.responseMessage}</p><small>{dateTime(inquiry.respondedAt)}</small></div>}
              </section>

              <aside className="deal-panel deal-panel-side">
                <div className="deal-people">
                  <PersonRow label="Buyer" person={inquiry.buyer} />
                  <PersonRow label="Seller" person={inquiry.seller} />
                </div>
                <div className="deal-contact-stack">
                  {inquiry.buyer?.email && <a href={`mailto:${inquiry.buyer.email}`}><FiMail /> Buyer email</a>}
                  {inquiry.buyer?.phone && <a href={`tel:${inquiry.buyer.phone}`}><FiPhone /> Buyer phone</a>}
                  {inquiry.seller?.email && <a href={`mailto:${inquiry.seller.email}`}><FiMail /> Seller email</a>}
                  {inquiry.seller?.phone && <a href={`tel:${inquiry.seller.phone}`}><FiPhone /> Seller phone</a>}
                </div>

                {sellerView && status === "pending" && <div className="deal-action-stack"><button className="deal-btn deal-btn-green full" disabled={!!busy} onClick={() => action("accept")}><FiCheck /> Accept inquiry</button><button className="deal-btn deal-btn-danger full" disabled={!!busy} onClick={() => action("reject")}><FiX /> Reject inquiry</button></div>}
                {buyerView && status === "accepted" && <button className="deal-btn deal-btn-dark full" disabled={!!busy} onClick={() => action("convert")}><FiShoppingBag /> Proceed to purchase <FiChevronRight /></button>}
                {buyerView && status === "accepted" && <Link className="deal-btn deal-btn-light full" to={`/bikes/${inquiry.bike?._id}`}>Back to bike</Link>}
              </aside>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
