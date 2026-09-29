// frontend/src/hooks/useWishlist.js
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function useWishlist() {
  const { user, setUser } = useAuth();

  const isWishlisted = (bikeId) =>
    !!user?.wishlist?.some((id) => String(id) === String(bikeId));

  const toggleWishlist = async (bikeId) => {
    if (!user) {
      return { requiresAuth: true };
    }

    const alreadyIn = isWishlisted(bikeId);

    try {
      const response = alreadyIn
        ? await api(`/api/wishlist/${bikeId}`, { method: "DELETE" })
        : await api(`/api/wishlist/${bikeId}`, { method: "POST" });

      setUser((prev) => ({ ...prev, wishlist: response.wishlist }));
      return { success: true, wishlisted: !alreadyIn };
    } catch (err) {
      return { success: false, error: err.message || "Failed to update wishlist" };
    }
  };

  return { isWishlisted, toggleWishlist };
}