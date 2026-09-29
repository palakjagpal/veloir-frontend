import { Link, useNavigate } from "react-router-dom";
import { FiMapPin, FiHeart } from "react-icons/fi";
import { formatPrice, getImageUrl } from "../lib/api";
import { useWishlist } from "../hooks/useWishlist";


// Compute transaction badges
function getTransactionTypes(bike) {
  const types = [];
  if (bike.isForSale !== false) types.push({ key: "buy", label: "Buy" });
  if (bike.isForRent) types.push({ key: "rent", label: "Rent" });
  if (bike.isForTrade) types.push({ key: "trade", label: "Trade" });
  return types;
}

export function BikeCard({ bike }) {
  const transactions = getTransactionTypes(bike);
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(bike._id);

  const handleWishlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggleWishlist(bike._id);
    if (result.requiresAuth) navigate("/login");
  };

  return (
    <Link className="bike-card" to={`/bikes/${bike._id}`}>
      <div className="bike-image">
        <img
          src={getImageUrl(bike.featuredImage || bike.images?.[0])}
          alt={bike.title}
        />
        {bike.isFeatured && (
          <span className="featured-badge">Featured</span>
        )}

        <button
          className={`wishlist-toggle ${wishlisted ? "active" : ""}`}
          onClick={handleWishlistClick}
          title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <FiHeart fill={wishlisted ? "currentColor" : "none"} />
        </button>

        <div className="transaction-badges">
          {transactions.map((t) => (
            <span key={t.key} className={`txn-badge txn-${t.key}`}>
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="bike-card-copy">
        <p>
          {bike.brand} · {bike.category}
        </p>
        <h3>{bike.title || `${bike.brand} ${bike.model}`}</h3>

        <div className="bike-info">
          <span>{bike.year}</span>
          <i /> <span>{bike.mileage?.toLocaleString("en-IN")} km</span>
          <i /> <span>{bike.engineCapacity} cc</span>
        </div>

        <div className="bike-card-meta">
          <span className="bike-condition">{bike.condition}</span>
          {bike.rating > 0 && (
            <span className="bike-rating">
              ★ {bike.rating} ({bike.numReviews})
            </span>
          )}
        </div>

        <div className="bike-price">
          {formatPrice(bike.price)}
          <small>
            <FiMapPin /> {bike.location?.city || "India"}
          </small>
        </div>

        <div className="bike-card-cta">
          <span className="view-details-btn">View Details</span>
        </div>
      </div>
    </Link>
  );
}

export function Skeletons() {
  return (
    <div className="bike-grid">
      {[1, 2, 3].map((item) => (
        <div className="skeleton" key={item} />
      ))}
    </div>
  );
}