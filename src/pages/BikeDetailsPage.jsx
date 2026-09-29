import { api, formatPrice, getImageUrl } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../hooks/useWishlist";
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  FiMapPin,
  FiCalendar,
  FiZap,
  FiActivity,
  FiHeart,
  FiShare2,
  FiFlag,
  FiMessageCircle,
  FiPhone,
  FiMail,
  FiStar,
  FiUser,
  FiCheckCircle,
  FiArrowLeft,
} from "react-icons/fi";
import Layout from "../components/Layout";
import { BikeCard } from "../components/BikeCard";


export default function BikeDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const handleWishlistToggle = async () => {
    const result = await toggleWishlist(id);
    if (result.requiresAuth) navigate("/login");
  };

  const [bike, setBike] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    loadBike();
    // eslint-disable-next-line
  }, [id]);

  const loadBike = async () => {
    setLoading(true);
    setError("");
    try {
      const [bikeRes, similarRes] = await Promise.all([
        api(`/api/bikes/${id}`),
        api(`/api/recommendations/similar/${id}?limit=3`).catch(() => ({
          data: [],
        })),
      ]);
      setBike(bikeRes.data);
      setSimilar(similarRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load bike details");
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    setReviewBusy(true);
    setReviewMessage("");
    try {
      await api(`/api/reviews/bike/${id}`, {
        method: "POST",
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      setReviewComment("");
      setReviewRating(5);
      setReviewMessage("Review submitted!");
      loadBike();
    } catch (err) {
      setReviewMessage(err.message || "Failed to submit review");
    } finally {
      setReviewBusy(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <main className="bike-details wrap">
          <div className="details-loading">Loading bike details…</div>
        </main>
      </Layout>
    );
  }

  if (error || !bike) {
    return (
      <Layout>
        <main className="bike-details wrap">
          <div className="empty">
            {error || "Bike not found"}
            <button onClick={() => navigate("/bikes")}>
              Back to listings
            </button>
          </div>
        </main>
      </Layout>
    );
  }

  const seller = bike.seller || {};
  const images = [
    bike.featuredImage,
    ...(bike.images || []),
  ].filter(Boolean);
  const uniqueImages = [...new Set(images)];

  const transactions = [];
  if (bike.isForSale !== false) transactions.push({ key: "buy", label: "For Sale" });
  if (bike.isForRent) transactions.push({ key: "rent", label: "For Rent" });
  if (bike.isForTrade) transactions.push({ key: "trade", label: "For Trade" });

  return (
    <Layout>
      <main className="bike-details wrap">
        <button className="back-link" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>

        <div className="bike-details-grid">
          {/* Gallery */}
          <div className="bike-gallery">
            <div className="bike-gallery-main">
              <img
                src={getImageUrl(uniqueImages[activeImage])}
                alt={bike.title}
              />
              {bike.isFeatured && (
                <span className="featured-badge">Featured</span>
              )}
            </div>
            {uniqueImages.length > 1 && (
              <div className="bike-gallery-thumbs">
                {uniqueImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={i === activeImage ? "active" : ""}
                  >
                    <img src={getImageUrl(img)} alt={`${bike.title} ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary Info */}
          <div className="bike-details-info">
            <p className="eyebrow">
              {bike.brand} · {bike.category}
            </p>
            <h1>{bike.title || `${bike.brand} ${bike.model}`}</h1>

            <div className="details-badges">
              {transactions.map((t) => (
                <span key={t.key} className={`txn-badge txn-${t.key}`}>
                  {t.label}
                </span>
              ))}
              <span className="condition-badge">{bike.condition}</span>
              {bike.isApproved ? (
                <span className="approved-badge">
                  <FiCheckCircle /> Verified
                </span>
              ) : null}
            </div>

            <div className="details-price">
              <div className="details-price-main">
                <span className="details-price-label">Price</span>
                <span className="details-price-value">
                  {formatPrice(bike.price)}
                </span>
              </div>
              {bike.isForRent && bike.rentalDetails?.pricePerDay && (
                <div className="details-price-secondary">
                  <span>Rental</span>
                  <b>{formatPrice(bike.rentalDetails.pricePerDay)}/day</b>
                </div>
              )}
              {bike.isForTrade && bike.tradeDetails?.estimatedTradeValue && (
                <div className="details-price-secondary">
                  <span>Trade Value</span>
                  <b>{formatPrice(bike.tradeDetails.estimatedTradeValue)}</b>
                </div>
              )}
            </div>

            <div className="details-quick">
              <div>
                <FiCalendar />
                <span>Year</span>
                <b>{bike.year}</b>
              </div>
              <div>
                <FiActivity />
                <span>Mileage</span>
                <b>{bike.mileage?.toLocaleString("en-IN")} km</b>
              </div>
              <div>
                <FiZap />
                <span>Engine</span>
                <b>{bike.engineCapacity} cc</b>
              </div>
              <div>
                <FiMapPin />
                <span>Location</span>
                <b>
                  {bike.location?.city}, {bike.location?.state}
                </b>
              </div>
            </div>

            <div className="details-actions">
              <a
                href={`tel:${seller.phone || ""}`}
                className="btn btn-mint"
              >
                <FiPhone /> Contact Seller
              </a>
              <a
                href={`mailto:${seller.email || ""}?subject=Inquiry about ${
                  bike.title
                }`}
                className="btn btn-outline"
              >
                <FiMail /> Send Inquiry
              </a>
              <button
                className={`icon-action ${isWishlisted(id) ? "active-wishlist" : ""}`}
                title={isWishlisted(id) ? "Remove from wishlist" : "Add to wishlist"}
                onClick={handleWishlistToggle}
              >
                <FiHeart fill={isWishlisted(id) ? "currentColor" : "none"} />
              </button>
              <button className="icon-action" title="Share">
                <FiShare2 />
              </button>
              <button className="icon-action" title="Report listing">
                <FiFlag />
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <section className="details-section">
          <h2>Description</h2>
          <p className="details-description">{bike.description}</p>
        </section>

        {/* Specifications */}
        <section className="details-section">
          <h2>Specifications</h2>
          <div className="specs-grid">
            <Spec label="Brand" value={bike.brand} />
            <Spec label="Model" value={bike.model} />
            <Spec label="Year" value={bike.year} />
            <Spec label="Category" value={bike.category} />
            <Spec label="Condition" value={bike.condition} />
            <Spec label="Color" value={bike.color || "—"} />
            <Spec label="Engine Capacity" value={`${bike.engineCapacity} cc`} />
            <Spec
              label="Mileage"
              value={`${bike.mileage?.toLocaleString("en-IN")} km`}
            />
            {bike.specs?.fuelType && (
              <Spec label="Fuel Type" value={bike.specs.fuelType} />
            )}
            {bike.specs?.transmissionType && (
              <Spec
                label="Transmission"
                value={bike.specs.transmissionType}
              />
            )}
            {bike.specs?.maxPower && (
              <Spec label="Max Power" value={bike.specs.maxPower} />
            )}
            {bike.specs?.torque && (
              <Spec label="Torque" value={bike.specs.torque} />
            )}
            {bike.specs?.topSpeed && (
              <Spec label="Top Speed" value={`${bike.specs.topSpeed} km/h`} />
            )}
            {bike.specs?.fuelTankCapacity && (
              <Spec
                label="Fuel Tank"
                value={`${bike.specs.fuelTankCapacity} L`}
              />
            )}
            {bike.specs?.weight && (
              <Spec label="Weight" value={`${bike.specs.weight} kg`} />
            )}
            {bike.specs?.registrationNumber && (
              <Spec
                label="Registration No."
                value={bike.specs.registrationNumber}
              />
            )}
          </div>
        </section>

        {/* Rental Details */}
        {bike.isForRent && bike.rentalDetails && (
          <section className="details-section">
            <h2>Rental Details</h2>
            <div className="specs-grid">
              {bike.rentalDetails.pricePerDay && (
                <Spec
                  label="Per Day"
                  value={formatPrice(bike.rentalDetails.pricePerDay)}
                />
              )}
              {bike.rentalDetails.pricePerWeek && (
                <Spec
                  label="Per Week"
                  value={formatPrice(bike.rentalDetails.pricePerWeek)}
                />
              )}
              {bike.rentalDetails.pricePerMonth && (
                <Spec
                  label="Per Month"
                  value={formatPrice(bike.rentalDetails.pricePerMonth)}
                />
              )}
              {bike.rentalDetails.securityDeposit && (
                <Spec
                  label="Security Deposit"
                  value={formatPrice(bike.rentalDetails.securityDeposit)}
                />
              )}
              {bike.rentalDetails.minDuration && (
                <Spec
                  label="Min Duration"
                  value={`${bike.rentalDetails.minDuration} day(s)`}
                />
              )}
              {bike.rentalDetails.maxDuration && (
                <Spec
                  label="Max Duration"
                  value={`${bike.rentalDetails.maxDuration} day(s)`}
                />
              )}
            </div>
            {bike.rentalDetails.terms && (
              <p className="details-notes">{bike.rentalDetails.terms}</p>
            )}
          </section>
        )}

        {/* Trade Details */}
        {bike.isForTrade && bike.tradeDetails && (
          <section className="details-section">
            <h2>Trade Details</h2>
            <div className="specs-grid">
              {bike.tradeDetails.estimatedTradeValue && (
                <Spec
                  label="Estimated Trade Value"
                  value={formatPrice(bike.tradeDetails.estimatedTradeValue)}
                />
              )}
              {bike.tradeDetails.preferredBrands?.length > 0 && (
                <Spec
                  label="Preferred Brands"
                  value={bike.tradeDetails.preferredBrands.join(", ")}
                />
              )}
              {bike.tradeDetails.preferredCategories?.length > 0 && (
                <Spec
                  label="Preferred Categories"
                  value={bike.tradeDetails.preferredCategories.join(", ")}
                />
              )}
            </div>
            {bike.tradeDetails.conditions && (
              <p className="details-notes">{bike.tradeDetails.conditions}</p>
            )}
          </section>
        )}

        {/* Seller Information */}
        <section className="details-section">
          <h2>Seller Information</h2>
          <div className="seller-card">
            <div className="seller-avatar">
              {seller.profileImage || seller.avatar ? (
                <img
                  src={getImageUrl(seller.profileImage || seller.avatar)}
                  alt={seller.name}
                />
              ) : (
                <span>{seller.name?.[0]?.toUpperCase() || "U"}</span>
              )}
            </div>
            <div className="seller-info">
              <h3>{seller.name || "Unknown Seller"}</h3>
              <p className="seller-meta">
                {seller.sellerInfo?.verifiedSeller && (
                  <span className="verified-tag">
                    <FiCheckCircle /> Verified
                  </span>
                )}
                <span>
                  Member since{" "}
                  {seller.createdAt
                    ? new Date(seller.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </p>
              <p className="seller-location">
                <FiMapPin />{" "}
                {bike.location?.city}, {bike.location?.state}
              </p>
              <div className="seller-actions">
                {seller.phone && (
                  <a href={`tel:${seller.phone}`} className="seller-btn">
                    <FiPhone /> Call
                  </a>
                )}
                <a
                  href={`mailto:${seller.email}`}
                  className="seller-btn"
                >
                  <FiMail /> Email
                </a>
                <button className="seller-btn">
                  <FiMessageCircle /> Chat
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="details-section">
          <h2>
            Reviews ({bike.numReviews || 0})
            {bike.rating > 0 && (
              <span className="avg-rating">
                <FiStar /> {bike.rating.toFixed(1)}
              </span>
            )}
          </h2>

          {/* Review Form */}
          {user && (
            <form className="review-form" onSubmit={submitReview}>
              <div className="review-stars">
                <span>Your rating:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={n <= reviewRating ? "active" : ""}
                    onClick={() => setReviewRating(n)}
                  >
                    <FiStar />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your thoughts about this bike…"
                required
                minLength={5}
                maxLength={1000}
              />
              {reviewMessage && (
                <p className="review-message">{reviewMessage}</p>
              )}
              <button
                type="submit"
                className="btn btn-mint"
                disabled={reviewBusy}
              >
                {reviewBusy ? "Submitting…" : "Submit Review"}
              </button>
            </form>
          )}

          {/* Review List */}
          <div className="review-list">
            {bike.reviews?.length > 0 ? (
              bike.reviews.map((review) => (
                <article className="review-item" key={review._id}>
                  <div className="review-user">
                    <div className="review-avatar">
                      {review.user?.profileImage || review.user?.avatar ? (
                        <img
                          src={getImageUrl(
                            review.user.profileImage || review.user.avatar
                          )}
                          alt={review.user.name}
                        />
                      ) : (
                        <span>
                          {review.user?.name?.[0]?.toUpperCase() || "U"}
                        </span>
                      )}
                    </div>
                    <div>
                      <strong>{review.user?.name || "Anonymous"}</strong>
                      <span className="review-date">
                        {new Date(review.createdAt).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="review-stars-display">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <FiStar
                        key={n}
                        className={n <= review.rating ? "filled" : ""}
                      />
                    ))}
                  </div>
                  <p className="review-comment">{review.comment}</p>
                </article>
              ))
            ) : (
              <p className="no-reviews">
                No reviews yet. Be the first to review!
              </p>
            )}
          </div>
        </section>

        {/* Similar Bikes */}
        {similar.length > 0 && (
          <section className="details-section similar-section">
            <h2>Similar Bikes</h2>
            <div className="bike-grid">
              {similar.map((b) => (
                <BikeCard key={b._id} bike={b} />
              ))}
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}

function Spec({ label, value }) {
  return (
    <div className="spec-item">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}