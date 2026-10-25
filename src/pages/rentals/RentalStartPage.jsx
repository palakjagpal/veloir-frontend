import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiMapPin, FiShield } from "react-icons/fi";
import Layout from "../../components/Layout";
import RentalBookingWidget from "../../components/rentals/RentalBookingWidget";
import { api, formatPrice, getImageUrl } from "../../lib/api";
import "../../components/rentals/rental.css";

const bikeLocation = (location) => {
  if (!location) return "Location not provided";
  if (typeof location === "string") return location;
  return [location.city, location.state, location.country].filter(Boolean).join(", ")
    || location.formattedAddress
    || location.fullAddress
    || "Location not provided";
};

export default function RentalStartPage() {
  const { bikeId } = useParams();
  const [bike, setBike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setBike(null);

    api(`/api/bikes/${bikeId}`)
      .then((response) => {
        if (active) setBike(response.data || response.bike || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load this bike listing.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [bikeId]);

  const rentalIsConfigured = Boolean(
    bike?.isForRent
    && bike?.rentalDetails
    && [bike.rentalDetails.pricePerDay, bike.rentalDetails.pricePerWeek, bike.rentalDetails.pricePerMonth]
      .some((rate) => Number(rate) > 0)
  );
  const rentalListingIsReady = Boolean(
    rentalIsConfigured
    && bike?.isApproved === true
    && bike?.isAvailable !== false
    && !["sold", "pending", "rented"].includes(bike?.status)
  );

  return (
    <Layout>
      <main className="wrap vr-page vr-start-page">
        <Link className="vr-start-back" to={bike ? `/bikes/${bike._id}` : "/bikes"}>
          <FiArrowLeft aria-hidden="true" /> Back to bike details
        </Link>

        <p className="vr-eyebrow">VELOIR RENTALS</p>
        <h1>Book your ride</h1>
        <p className="vr-page-subtitle">
          Choose your pickup and return dates, confirm availability, and review the server-calculated quote before requesting the rental.
        </p>

        {loading ? (
          <div className="vr-empty" role="status">Loading bike details…</div>
        ) : error || !bike ? (
          <section className="vr-empty" role="alert">
            <h2>We couldn’t load this bike</h2>
            <p>{error || "This bike listing could not be found."}</p>
            <Link className="vr-btn vr-btn-dark" to="/bikes">Browse bikes</Link>
          </section>
        ) : (
          <>
            <section className="vr-start-bike" aria-label="Selected bike">
              <img
                className="vr-start-bike-image"
                src={getImageUrl(bike.featuredImage || bike.images?.[0])}
                alt={bike.title || `${bike.brand || "Bike"} ${bike.model || ""}`}
              />
              <div className="vr-start-bike-copy">
                <p className="vr-eyebrow">YOUR SELECTED BIKE</p>
                <h2>{bike.title || `${bike.brand || ""} ${bike.model || ""}`.trim() || "Bike rental"}</h2>
                <p className="vr-start-location"><FiMapPin aria-hidden="true" /> {bikeLocation(bike.location)}</p>
                {bike.rentalDetails?.pricePerDay > 0 && (
                  <p className="vr-start-daily-rate"><strong>{formatPrice(bike.rentalDetails.pricePerDay)}</strong><span>/ day</span></p>
                )}
                <div className="vr-start-assurance"><FiShield aria-hidden="true" /> <span>Booking, date availability and pricing are validated by Veloir platform</span></div>
              </div>
            </section>

            {!bike.isForRent ? (
              <div className="vr-alert" role="alert">This listing is not configured for rental.</div>
            ) : !rentalIsConfigured ? (
              <div className="vr-alert" role="alert">The owner has not configured a valid rental rate for this listing.</div>
            ) : !rentalListingIsReady ? (
              <div className="vr-alert" role="alert">
                This rental listing is not currently approved and available. Please return to the bike details page or choose another bike.
              </div>
            ) : (
              <RentalBookingWidget bike={bike} />
            )}

          </>
        )}
      </main>
    </Layout>
  );
}
