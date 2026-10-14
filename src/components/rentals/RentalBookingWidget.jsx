import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { FiCalendar, FiShield, FiClock } from "react-icons/fi";
import { formatPrice } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { getUserId } from "../../lib/inquiryUtils";
import { createRentalBooking, quoteRental } from "../../services/rentalService";
import "./rental.css";

const toDateInput = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const shiftDate = (days) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days); return toDateInput(d); };
const addInputDays = (value, days) => {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
};

export default function RentalBookingWidget({ bike }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(shiftDate(1));
  const [endDate, setEndDate] = useState(shiftDate(2));
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  const sellerId = bike?.seller?._id || bike?.seller;
  const isOwner = !!user && String(getUserId(user)) === String(sellerId);
  const minDate = useMemo(() => shiftDate(0), []);
  const minDuration = Math.max(1, Number(bike?.rentalDetails?.minDuration) || 1);
  const maxDuration = Math.min(180, Math.max(minDuration, Number(bike?.rentalDetails?.maxDuration) || 30));
  const minEndDate = addInputDays(startDate, minDuration);
  const maxEndDate = addInputDays(startDate, maxDuration);

  const loadQuote = async (event) => {
    event?.preventDefault();
    setQuoting(true); setError(""); setQuote(null);
    try {
      const response = await quoteRental(bike._id, startDate, endDate);
      setQuote(response);
      if (response.available === false) setError(response.message || "Those dates are not available.");
      else if (response.selfBooking || isOwner) setError("You cannot rent your own listing.");
    } catch (err) {
      setError(err.message || "Could not calculate a rental quote.");
    } finally { setQuoting(false); }
  };

  const submitBooking = async () => {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }
    if (isOwner) { toast.error("You cannot rent your own listing."); return; }
    if (!quote || quote.available !== true) { toast.error("Check availability and refresh the quote first."); return; }
    setBooking(true); setError("");
    try {
      const result = await createRentalBooking(bike._id, startDate, endDate);
      toast.success("Rental request submitted. The owner has been notified.");
      navigate(`/rentals/${result.data._id}`);
    } catch (err) {
      setError(err.message || "Could not submit your rental request.");
      if (err.kycRequired || err.code === "KYC_REQUIRED" || err.code === "BIKE_RC_NOT_VERIFIED") {
        toast.error("Verified driving licence and the bike owner's verified RC are required. Check your KYC status.");
      } else toast.error(err.message || "Could not submit rental request.");
    } finally { setBooking(false); }
  };

  if (!bike?.isForRent) return null;

  return (
    <section className="vr-card vr-booking-widget" aria-labelledby="vr-booking-title">
      <div className="vr-section-heading">
        <span className="vr-icon-tile"><FiCalendar /></span>
        <div><p className="vr-eyebrow">RENTAL BOOKING</p><h2 id="vr-booking-title">Choose your dates</h2></div>
      </div>
      <p className="vr-muted">Return date is exclusive: pickup on the 10th and return on the 12th is a 2-day rental.</p>
      <form className="vr-date-grid" onSubmit={loadQuote}>
        <label>Pickup date<input type="date" value={startDate} min={minDate} required onChange={(e) => { const nextStart = e.target.value; setStartDate(nextStart); setEndDate((current) => !current || current < addInputDays(nextStart, minDuration) ? addInputDays(nextStart, minDuration) : current); setQuote(null); }} /></label>
        <label>Return date<input type="date" value={endDate} min={minEndDate || minDate} max={maxEndDate} required onChange={(e) => { setEndDate(e.target.value); setQuote(null); }} /></label>
        <p className="vr-span-note">Allowed duration: {minDuration}–{maxDuration} day(s)</p>
        <button className="vr-btn vr-btn-dark" type="submit" disabled={quoting || !startDate || !endDate}>{quoting ? "Calculating…" : "Check availability & quote"}</button>
      </form>
      {error && <div className="vr-alert" role="alert">{error}</div>}
      {quote?.quote && (
        <div className="vr-quote" aria-live="polite">
          {quote.available === false ? <p className="vr-alert">Dates are not available. Please choose another range.</p> : (
            <>
              <div className="vr-quote-head"><strong>Price estimate</strong><span>{quote.quote.rentalDays} rental day(s)</span></div>
              {(quote.quote.pricingSnapshot.calculation || []).map((line, index) => <div className="vr-price-line" key={`${line.label}-${index}`}><span>{line.label} × {line.units}</span><strong>{formatPrice(line.amount)}</strong></div>)}
              <div className="vr-price-line"><span>Rental charge</span><strong>{formatPrice(quote.quote.pricingSnapshot.rentalCharge)}</strong></div>
              <div className="vr-price-line"><span>Security deposit (tracked separately)</span><strong>{formatPrice(quote.quote.pricingSnapshot.securityDeposit)}</strong></div>
              <div className="vr-price-total"><span>Total payable in sandbox checkout</span><strong>{formatPrice(quote.quote.pricingSnapshot.totalDue)}</strong></div>
              <div className="vr-notice"><FiShield /><span>Server-calculated quote. The owner must accept before checkout. Verified driving licence and verified vehicle RC are checked again by the API.</span></div>
              <button className="vr-btn vr-btn-mint" type="button" disabled={booking || quote.selfBooking || isOwner || quote.available === false} onClick={submitBooking}>{booking ? "Submitting request…" : user ? "Request this rental" : "Sign in to request rental"}</button>
              <div className="vr-notice vr-notice-subtle"><FiClock /><span>Request dates are temporarily held while the owner decides. If accepted, payment is due by the deadline shown in My Rentals.</span></div>
            </>
          )}
        </div>
      )}
      {bike.rentalDetails?.terms && <div className="vr-terms"><strong>Owner rental terms</strong><p>{bike.rentalDetails.terms}</p></div>}
    </section>
  );
}
