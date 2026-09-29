// frontend/src/pages/WishlistPage.jsx
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { BikeCard, Skeletons } from "../components/BikeCard";
import { api } from "../lib/api";

export default function WishlistPage() {
  const [bikes, setBikes] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    setError("");
    try {
      const response = await api("/api/wishlist");
      setBikes(response.data || []);
    } catch (err) {
      setError(err.message || "Failed to load your wishlist");
      setBikes([]);
    }
  };

  return (
    <Layout>
        <br/>
        <br/><br/>
        <br/>
        <br/>
        <br/>
      <main className="wrap bike-section">
        <div className="section-top">
          <div>
            <p className="eyebrow">Saved</p>
            <h2>Your Wishlist</h2>
          </div>
        </div>

        {error && <div className="empty">{error}</div>}

        {bikes === null ? (
          <Skeletons />
        ) : bikes.length ? (
          <div className="bike-grid">
            {bikes.map((bike) => (
              <BikeCard key={bike._id} bike={bike} />
            ))}
          </div>
        ) : (
          !error && (
            <div className="empty">
              No bikes in your wishlist yet. Tap the heart icon on any listing to save it here.
            </div>
          )
        )}
      </main>
    </Layout>
  );
}