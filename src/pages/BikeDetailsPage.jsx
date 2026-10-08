import { api, formatPrice, getImageUrl } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../hooks/useWishlist";
import { useEffect, useState } from "react";
import {
  Link,
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";

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
  FiDollarSign,
} from "react-icons/fi";

import Layout from "../components/Layout";
import { BikeCard } from "../components/BikeCard";

import SendInquiryModal from "../components/deals/SendInquiryModal";
import MakeOfferModal from "../components/deals/MakeOfferModal";

import { getUserId } from "../lib/inquiryUtils";

export default function BikeDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useAuth();

  const [showInquiry, setShowInquiry] =
    useState(false);

  const [showOffer, setShowOffer] =
    useState(false);

  const {
    isWishlisted,
    toggleWishlist,
  } = useWishlist();

  const [bike, setBike] =
    useState(null);

  const [similar, setSimilar] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [activeImage, setActiveImage] =
    useState(0);

  // Review form
  const [reviewRating, setReviewRating] =
    useState(5);

  const [reviewComment, setReviewComment] =
    useState("");

  const [reviewBusy, setReviewBusy] =
    useState(false);

  const [reviewMessage, setReviewMessage] =
    useState("");

  /*
   * =========================================================
   * LOAD BIKE
   * =========================================================
   */

  useEffect(() => {
    loadBike();

    // eslint-disable-next-line
  }, [id]);

  const loadBike = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        bikeRes,
        similarRes,
      ] = await Promise.all([
        api(`/api/bikes/${id}`),

        api(
          `/api/recommendations/similar/${id}?limit=3`
        ).catch(() => ({
          data: [],
        })),
      ]);

      setBike(
        bikeRes.data
      );

      setSimilar(
        similarRes.data || []
      );
    } catch (err) {
      setError(
        err.message ||
          "Failed to load bike details"
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * WISHLIST
   * =========================================================
   */

  const handleWishlistToggle = async () => {
    const result =
      await toggleWishlist(id);

    if (result.requiresAuth) {
      navigate("/login", {
        state: {
          from: location,
        },
      });
    }
  };

  /*
   * =========================================================
   * REVIEW
   * =========================================================
   */

  const submitReview = async (e) => {
    e.preventDefault();

    if (!user) {
      navigate("/login", {
        state: {
          from: location,
        },
      });

      return;
    }

    setReviewBusy(true);
    setReviewMessage("");

    try {
      await api(
        `/api/reviews/bike/${id}`,
        {
          method: "POST",
          body: JSON.stringify({
            rating: reviewRating,
            comment: reviewComment,
          }),
        }
      );

      setReviewComment("");
      setReviewRating(5);

      setReviewMessage(
        "Review submitted!"
      );

      await loadBike();
    } catch (err) {
      setReviewMessage(
        err.message ||
          "Failed to submit review"
      );
    } finally {
      setReviewBusy(false);
    }
  };

  /*
   * =========================================================
   * LOADING STATE
   * =========================================================
   */

  if (loading) {
    return (
      <Layout>
        <main className="bike-details wrap">
          <div className="details-loading">
            Loading bike details…
          </div>
        </main>
      </Layout>
    );
  }

  /*
   * =========================================================
   * ERROR STATE
   * =========================================================
   */

  if (error || !bike) {
    return (
      <Layout>
        <main className="bike-details wrap">
          <div className="empty">
            <p>
              {error ||
                "Bike not found"}
            </p>

            <button
              onClick={() =>
                navigate("/bikes")
              }
            >
              Back to listings
            </button>
          </div>
        </main>
      </Layout>
    );
  }

  /*
   * =========================================================
   * DERIVED DATA
   * =========================================================
   */

  const seller =
    bike.seller || {};

  const images = [
    bike.featuredImage,
    ...(bike.images || []),
  ].filter(Boolean);

  const uniqueImages = [
    ...new Set(images),
  ];

  const isOwnListing =
    !!user &&
    getUserId(user) ===
      String(
        seller._id || ""
      );

  const bikeAvailable =
    bike.isAvailable !== false &&
    (
      !bike.status ||
      bike.status ===
        "available"
    );

  /*
   * Inquiry is available when:
   *
   * - user is not the seller
   * - bike is available
   */

  const canInquire =
    !isOwnListing &&
    bikeAvailable;

  /*
   * Offer is available only when:
   *
   * - listing is for sale
   * - bike is available
   * - user is not the seller
   */

  const canOffer =
    !isOwnListing &&
    bikeAvailable &&
    bike.isForSale !== false;

  /*
   * =========================================================
   * SEND INQUIRY
   * =========================================================
   */

  const handleSendInquiry = () => {
    if (!user) {
      navigate("/login", {
        state: {
          from: location,
        },
      });

      return;
    }

    if (canInquire) {
      setShowInquiry(true);
    }
  };

  /*
   * =========================================================
   * MAKE OFFER
   * =========================================================
   */

  const handleMakeOffer = () => {
    if (!user) {
      navigate("/login", {
        state: {
          from: location,
        },
      });

      return;
    }

    if (canOffer) {
      setShowOffer(true);
    }
  };

  /*
   * =========================================================
   * TRANSACTION TYPES
   * =========================================================
   */

  const transactions = [];

  if (
    bike.isForSale !== false
  ) {
    transactions.push({
      key: "buy",
      label: "For Sale",
    });
  }

  if (bike.isForRent) {
    transactions.push({
      key: "rent",
      label: "For Rent",
    });
  }

  if (bike.isForTrade) {
    transactions.push({
      key: "trade",
      label: "For Trade",
    });
  }

  /*
   * =========================================================
   * MAIN UI
   * =========================================================
   */

  return (
    <Layout>
      <main className="bike-details wrap">

        {/* =================================================
            BACK
        ================================================= */}

        <button
          className="back-link"
          onClick={() =>
            navigate(-1)
          }
        >
          <FiArrowLeft />
          Back
        </button>

        {/* =================================================
            MAIN BIKE SECTION
        ================================================= */}

        <div className="bike-details-grid">

          {/* =================================================
              GALLERY
          ================================================= */}

          <div className="bike-gallery">

            <div className="bike-gallery-main">

              <img
                src={getImageUrl(
                  uniqueImages[
                    activeImage
                  ]
                )}
                alt={
                  bike.title ||
                  `${bike.brand} ${bike.model}`
                }
              />

              {bike.isFeatured && (
                <span className="featured-badge">
                  Featured
                </span>
              )}

            </div>

            {uniqueImages.length >
              1 && (
              <div className="bike-gallery-thumbs">

                {uniqueImages.map(
                  (img, i) => (
                    <button
                      key={`${img}-${i}`}
                      type="button"
                      onClick={() =>
                        setActiveImage(
                          i
                        )
                      }
                      className={
                        i ===
                        activeImage
                          ? "active"
                          : ""
                      }
                    >
                      <img
                        src={getImageUrl(
                          img
                        )}
                        alt={`${bike.title} ${
                          i + 1
                        }`}
                      />
                    </button>
                  )
                )}

              </div>
            )}

          </div>

          {/* =================================================
              PRIMARY INFO
          ================================================= */}

          <div className="bike-details-info">

            <p className="eyebrow">
              {bike.brand}
              {" · "}
              {bike.category}
            </p>

            <h1>
              {bike.title ||
                `${bike.brand} ${bike.model}`}
            </h1>

            {/* TRANSACTION / CONDITION / APPROVAL BADGES */}

            <div className="details-badges">

              {transactions.map(
                (transaction) => (
                  <span
                    key={
                      transaction.key
                    }
                    className={`txn-badge txn-${transaction.key}`}
                  >
                    {
                      transaction.label
                    }
                  </span>
                )
              )}

              {bike.condition && (
                <span className="condition-badge">
                  {bike.condition}
                </span>
              )}

              {bike.isApproved && (
                <span className="approved-badge">
                  <FiCheckCircle />
                  Verified
                </span>
              )}

            </div>

            {/* =================================================
                PRICE
            ================================================= */}

            <div className="details-price">

              <div className="details-price-main">

                <span className="details-price-label">
                  Price
                </span>

                <span className="details-price-value">
                  {formatPrice(
                    bike.price
                  )}
                </span>

              </div>

              {bike.isForRent &&
                bike.rentalDetails
                  ?.pricePerDay && (
                  <div className="details-price-secondary">

                    <span>
                      Rental
                    </span>

                    <b>
                      {formatPrice(
                        bike
                          .rentalDetails
                          .pricePerDay
                      )}
                      /day
                    </b>

                  </div>
                )}

              {bike.isForTrade &&
                bike.tradeDetails
                  ?.estimatedTradeValue && (
                  <div className="details-price-secondary">

                    <span>
                      Trade Value
                    </span>

                    <b>
                      {formatPrice(
                        bike
                          .tradeDetails
                          .estimatedTradeValue
                      )}
                    </b>

                  </div>
                )}

            </div>

            {/* =================================================
                QUICK STATS
            ================================================= */}

            <div className="details-quick">

              <div>
                <FiCalendar />
                <span>
                  Year
                </span>
                <b>
                  {bike.year ||
                    "—"}
                </b>
              </div>

              <div>
                <FiActivity />
                <span>
                  Mileage
                </span>
                <b>
                  {bike.mileage !==
                  undefined &&
                  bike.mileage !==
                    null
                    ? `${bike.mileage.toLocaleString(
                        "en-IN"
                      )} km`
                    : "—"}
                </b>
              </div>

              <div>
                <FiZap />
                <span>
                  Engine
                </span>
                <b>
                  {bike.engineCapacity
                    ? `${bike.engineCapacity} cc`
                    : "—"}
                </b>
              </div>

              <div>
                <FiMapPin />
                <span>
                  Location
                </span>
                <b>
                  {bike.location
                    ?.city ||
                    "—"}
                  {bike.location
                    ?.state
                    ? `, ${bike.location.state}`
                    : ""}
                </b>
              </div>

            </div>

            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="details-actions">

              {/* CONTACT SELLER */}

              <a
                href={
                  seller.phone
                    ? `tel:${seller.phone}`
                    : "#"
                }
                className="btn btn-mint"
                onClick={(event) => {
                  if (!seller.phone) {
                    event.preventDefault();
                  }
                }}
                title={
                  seller.phone
                    ? "Call seller"
                    : "Seller phone unavailable"
                }
              >
                <FiPhone />
                Contact Seller
              </a>

              {/* SEND INQUIRY */}

              <button
                type="button"
                className="btn btn-outline"
                disabled={
                  !!user &&
                  !canInquire
                }
                title={
                  isOwnListing
                    ? "This is your own listing"
                    : !bikeAvailable
                      ? "This bike is no longer available"
                      : undefined
                }
                onClick={
                  handleSendInquiry
                }
              >
                <FiMail />

                {isOwnListing
                  ? "Your listing"
                  : !bikeAvailable
                    ? "Unavailable"
                    : "Send Inquiry"}
              </button>

              {/* MAKE OFFER */}

              {bike.isForSale !==
                false && (
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={
                    !!user &&
                    !canOffer
                  }
                  title={
                    isOwnListing
                      ? "You cannot make an offer on your own listing"
                      : !bikeAvailable
                        ? "This bike is no longer available"
                        : undefined
                  }
                  onClick={
                    handleMakeOffer
                  }
                >
                  <FiDollarSign />

                  {isOwnListing
                    ? "Your listing"
                    : !bikeAvailable
                      ? "Unavailable"
                      : "Make Offer"}
                </button>
              )}

              {/* WISHLIST */}

              <button
                type="button"
                className={`icon-action ${
                  isWishlisted(id)
                    ? "active-wishlist"
                    : ""
                }`}
                title={
                  isWishlisted(id)
                    ? "Remove from wishlist"
                    : "Add to wishlist"
                }
                onClick={
                  handleWishlistToggle
                }
              >
                <FiHeart
                  fill={
                    isWishlisted(id)
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>

              {/* SHARE */}

              <button
                type="button"
                className="icon-action"
                title="Share"
                onClick={async () => {
                  const shareData = {
                    title:
                      bike.title ||
                      `${bike.brand} ${bike.model}`,
                    text:
                      "Check out this bike on Veloir.",
                    url:
                      window.location.href,
                  };

                  try {
                    if (
                      navigator.share
                    ) {
                      await navigator.share(
                        shareData
                      );
                    } else if (
                      navigator.clipboard
                    ) {
                      await navigator.clipboard.writeText(
                        window.location.href
                      );
                    }
                  } catch {
                    // User cancelled sharing
                  }
                }}
              >
                <FiShare2 />
              </button>

              {/* REPORT */}

              <button
                type="button"
                className="icon-action"
                title="Report listing"
              >
                <FiFlag />
              </button>

            </div>

          </div>

        </div>

        {/* =================================================
            DESCRIPTION
        ================================================= */}

        <section className="details-section">

          <h2>
            Description
          </h2>

          <p className="details-description">
            {bike.description ||
              "No description provided."}
          </p>

        </section>

        {/* =================================================
            SPECIFICATIONS
        ================================================= */}

        <section className="details-section">

          <h2>
            Specifications
          </h2>

          <div className="specs-grid">

            <Spec
              label="Brand"
              value={
                bike.brand ||
                "—"
              }
            />

            <Spec
              label="Model"
              value={
                bike.model ||
                "—"
              }
            />

            <Spec
              label="Year"
              value={
                bike.year ||
                "—"
              }
            />

            <Spec
              label="Category"
              value={
                bike.category ||
                "—"
              }
            />

            <Spec
              label="Condition"
              value={
                bike.condition ||
                "—"
              }
            />

            <Spec
              label="Color"
              value={
                bike.color ||
                "—"
              }
            />

            <Spec
              label="Engine Capacity"
              value={
                bike.engineCapacity
                  ? `${bike.engineCapacity} cc`
                  : "—"
              }
            />

            <Spec
              label="Mileage"
              value={
                bike.mileage !==
                  undefined &&
                bike.mileage !==
                  null
                  ? `${bike.mileage.toLocaleString(
                      "en-IN"
                    )} km`
                  : "—"
              }
            />

            {bike.specs
              ?.fuelType && (
              <Spec
                label="Fuel Type"
                value={
                  bike.specs
                    .fuelType
                }
              />
            )}

            {bike.specs
              ?.transmissionType && (
              <Spec
                label="Transmission"
                value={
                  bike.specs
                    .transmissionType
                }
              />
            )}

            {bike.specs
              ?.maxPower && (
              <Spec
                label="Max Power"
                value={
                  bike.specs
                    .maxPower
                }
              />
            )}

            {bike.specs?.torque && (
              <Spec
                label="Torque"
                value={
                  bike.specs.torque
                }
              />
            )}

            {bike.specs
              ?.topSpeed && (
              <Spec
                label="Top Speed"
                value={`${bike.specs.topSpeed} km/h`}
              />
            )}

            {bike.specs
              ?.fuelTankCapacity && (
              <Spec
                label="Fuel Tank"
                value={`${bike.specs.fuelTankCapacity} L`}
              />
            )}

            {bike.specs
              ?.weight && (
              <Spec
                label="Weight"
                value={`${bike.specs.weight} kg`}
              />
            )}

            {bike.specs
              ?.registrationNumber && (
              <Spec
                label="Registration No."
                value={
                  bike.specs
                    .registrationNumber
                }
              />
            )}

          </div>

        </section>

        {/* =================================================
            RENTAL DETAILS
        ================================================= */}

        {bike.isForRent &&
          bike.rentalDetails && (
            <section className="details-section">

              <h2>
                Rental Details
              </h2>

              <div className="specs-grid">

                {bike.rentalDetails
                  .pricePerDay && (
                  <Spec
                    label="Per Day"
                    value={formatPrice(
                      bike
                        .rentalDetails
                        .pricePerDay
                    )}
                  />
                )}

                {bike.rentalDetails
                  .pricePerWeek && (
                  <Spec
                    label="Per Week"
                    value={formatPrice(
                      bike
                        .rentalDetails
                        .pricePerWeek
                    )}
                  />
                )}

                {bike.rentalDetails
                  .pricePerMonth && (
                  <Spec
                    label="Per Month"
                    value={formatPrice(
                      bike
                        .rentalDetails
                        .pricePerMonth
                    )}
                  />
                )}

                {bike.rentalDetails
                  .securityDeposit && (
                  <Spec
                    label="Security Deposit"
                    value={formatPrice(
                      bike
                        .rentalDetails
                        .securityDeposit
                    )}
                  />
                )}

                {bike.rentalDetails
                  .minDuration && (
                  <Spec
                    label="Min Duration"
                    value={`${bike.rentalDetails.minDuration} day(s)`}
                  />
                )}

                {bike.rentalDetails
                  .maxDuration && (
                  <Spec
                    label="Max Duration"
                    value={`${bike.rentalDetails.maxDuration} day(s)`}
                  />
                )}

              </div>

              {bike.rentalDetails
                .terms && (
                <p className="details-notes">
                  {
                    bike.rentalDetails
                      .terms
                  }
                </p>
              )}

            </section>
          )}

        {/* =================================================
            TRADE DETAILS
        ================================================= */}

        {bike.isForTrade &&
          bike.tradeDetails && (
            <section className="details-section">

              <h2>
                Trade Details
              </h2>

              <div className="specs-grid">

                {bike.tradeDetails
                  .estimatedTradeValue && (
                  <Spec
                    label="Estimated Trade Value"
                    value={formatPrice(
                      bike
                        .tradeDetails
                        .estimatedTradeValue
                    )}
                  />
                )}

                {bike.tradeDetails
                  .preferredBrands
                  ?.length > 0 && (
                  <Spec
                    label="Preferred Brands"
                    value={bike.tradeDetails.preferredBrands.join(
                      ", "
                    )}
                  />
                )}

                {bike.tradeDetails
                  .preferredCategories
                  ?.length > 0 && (
                  <Spec
                    label="Preferred Categories"
                    value={bike.tradeDetails.preferredCategories.join(
                      ", "
                    )}
                  />
                )}

              </div>

              {bike.tradeDetails
                .conditions && (
                <p className="details-notes">
                  {
                    bike.tradeDetails
                      .conditions
                  }
                </p>
              )}

            </section>
          )}

        {/* =================================================
            SELLER INFORMATION
        ================================================= */}

        <section className="details-section">

          <h2>
            Seller Information
          </h2>

          <div className="seller-card">

            <div className="seller-avatar">

              {seller.profileImage ||
              seller.avatar ? (
                <img
                  src={getImageUrl(
                    seller.profileImage ||
                      seller.avatar
                  )}
                  alt={
                    seller.name ||
                    "Seller"
                  }
                />
              ) : (
                <span>
                  {seller.name?.[0]?.toUpperCase() ||
                    "U"}
                </span>
              )}

            </div>

            <div className="seller-info">

              <h3>
                {seller.name ||
                  "Unknown Seller"}
              </h3>

              <p className="seller-meta">

                {seller
                  .sellerInfo
                  ?.verifiedSeller && (
                  <span className="verified-tag">
                    <FiCheckCircle />
                    Verified
                  </span>
                )}

                <span>
                  Member since{" "}
                  {seller.createdAt
                    ? new Date(
                        seller.createdAt
                      ).toLocaleDateString(
                        "en-IN",
                        {
                          month:
                            "short",
                          year:
                            "numeric",
                        }
                      )
                    : "—"}
                </span>

              </p>

              <p className="seller-location">
                <FiMapPin />

                {" "}

                {bike.location
                  ?.city ||
                  "—"}

                {bike.location
                  ?.state
                  ? `, ${bike.location.state}`
                  : ""}
              </p>

              <div className="seller-actions">

                {seller.phone && (
                  <a
                    href={`tel:${seller.phone}`}
                    className="seller-btn"
                  >
                    <FiPhone />
                    Call
                  </a>
                )}

                {seller.email && (
                  <a
                    href={`mailto:${seller.email}`}
                    className="seller-btn"
                  >
                    <FiMail />
                    Email
                  </a>
                )}

                <button
                  type="button"
                  className="seller-btn"
                  onClick={
                    handleSendInquiry
                  }
                  disabled={
                    !!user &&
                    !canInquire
                  }
                >
                  <FiMessageCircle />
                  Chat
                </button>

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            REVIEWS
        ================================================= */}

        <section className="details-section">

          <h2>

            Reviews (
            {bike.numReviews ||
              0}
            )

            {bike.rating >
              0 && (
              <span className="avg-rating">
                <FiStar />
                {" "}
                {Number(
                  bike.rating
                ).toFixed(1)}
              </span>
            )}

          </h2>

          {/* REVIEW FORM */}

          {user && (
            <form
              className="review-form"
              onSubmit={
                submitReview
              }
            >

              <div className="review-stars">

                <span>
                  Your rating:
                </span>

                {[1, 2, 3, 4, 5].map(
                  (n) => (
                    <button
                      key={n}
                      type="button"
                      className={
                        n <=
                        reviewRating
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setReviewRating(
                          n
                        )
                      }
                    >
                      <FiStar />
                    </button>
                  )
                )}

              </div>

              <textarea
                value={
                  reviewComment
                }
                onChange={(e) =>
                  setReviewComment(
                    e.target.value
                  )
                }
                placeholder="Share your thoughts about this bike…"
                required
                minLength={5}
                maxLength={1000}
              />

              {reviewMessage && (
                <p className="review-message">
                  {reviewMessage}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-mint"
                disabled={
                  reviewBusy
                }
              >
                {reviewBusy
                  ? "Submitting…"
                  : "Submit Review"}
              </button>

            </form>
          )}

          {/* REVIEW LIST */}

          <div className="review-list">

            {bike.reviews?.length >
            0 ? (
              bike.reviews.map(
                (review) => (
                  <article
                    className="review-item"
                    key={
                      review._id
                    }
                  >

                    <div className="review-user">

                      <div className="review-avatar">

                        {review.user
                          ?.profileImage ||
                        review.user
                          ?.avatar ? (
                          <img
                            src={getImageUrl(
                              review
                                .user
                                .profileImage ||
                                review
                                  .user
                                  .avatar
                            )}
                            alt={
                              review
                                .user
                                .name ||
                              "User"
                            }
                          />
                        ) : (
                          <span>
                            {review.user?.name?.[0]?.toUpperCase() ||
                              "U"}
                          </span>
                        )}

                      </div>

                      <div>

                        <strong>
                          {
                            review
                              .user
                              ?.name ||
                            "Anonymous"
                          }
                        </strong>

                        <span className="review-date">

                          {review.createdAt
                            ? new Date(
                                review.createdAt
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  day:
                                    "numeric",
                                  month:
                                    "short",
                                  year:
                                    "numeric",
                                }
                              )
                            : "—"}

                        </span>

                      </div>

                    </div>

                    <div className="review-stars-display">

                      {[1, 2, 3, 4, 5].map(
                        (n) => (
                          <FiStar
                            key={n}
                            className={
                              n <=
                              review.rating
                                ? "filled"
                                : ""
                            }
                          />
                        )
                      )}

                    </div>

                    <p className="review-comment">
                      {
                        review.comment
                      }
                    </p>

                  </article>
                )
              )
            ) : (
              <p className="no-reviews">
                No reviews yet. Be
                the first to review!
              </p>
            )}

          </div>

        </section>

        {/* =================================================
            SIMILAR BIKES
        ================================================= */}

        {similar.length >
          0 && (
          <section className="details-section similar-section">

            <h2>
              Similar Bikes
            </h2>

            <div className="bike-grid">

              {similar.map(
                (similarBike) => (
                  <BikeCard
                    key={
                      similarBike._id
                    }
                    bike={
                      similarBike
                    }
                  />
                )
              )}

            </div>

          </section>
        )}

      </main>

      {/* ===================================================
          SEND INQUIRY MODAL
      =================================================== */}

      {showInquiry && (
        <SendInquiryModal
          bike={bike}
          user={user}
          onClose={() =>
            setShowInquiry(false)
          }
          onSuccess={(
            inquiry
          ) => {
            setShowInquiry(false);

            navigate(
              inquiry?._id
                ? `/inquiries/${inquiry._id}`
                : "/inquiries"
            );
          }}
        />
      )}

      {/* ===================================================
          MAKE OFFER MODAL
      =================================================== */}

      {showOffer && (
        <MakeOfferModal
          bike={bike}
          onClose={() =>
            setShowOffer(false)
          }
          onSuccess={(
            offer
          ) => {
            setShowOffer(false);

            navigate(
              offer?._id
                ? `/offers/${offer._id}`
                : "/offers"
            );
          }}
        />
      )}

    </Layout>
  );
}

/*
 * =========================================================
 * SPECIFICATION COMPONENT
 * =========================================================
 */

function Spec({
  label,
  value,
}) {
  return (
    <div className="spec-item">
      <span>
        {label}
      </span>

      <b>
        {value || "—"}
      </b>
    </div>
  );
}
