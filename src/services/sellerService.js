import { api } from "../lib/api";

// Get logged-in seller statistics
export const getBikeStats = () =>
  api("/api/bikes/stats");

// Toggle availability of a bike
export const toggleBikeAvailability = (bikeId) =>
  api(`/api/bikes/${bikeId}/availability`, {
    method: "PATCH",
  });