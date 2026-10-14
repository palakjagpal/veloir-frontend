import { api, API_BASE_URL } from "../lib/api";

const query = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      search.set(key, value);
  });
  return search.toString();
};

export const getRentalPaymentMode = () => api("/api/rentals/payment-mode");
export const quoteRental = (bikeId, startDate, endDate) =>
  api(`/api/rentals/bike/${bikeId}/quote`, {
    method: "POST",
    body: JSON.stringify({ startDate, endDate }),
  });
export const checkRentalAvailability = (bikeId, startDate, endDate) => {
  const qs = query({ startDate, endDate });
  return api(`/api/rentals/availability/${bikeId}?${qs}`);
};
export const createRentalBooking = (bikeId, startDate, endDate) =>
  api(`/api/rentals/bike/${bikeId}/bookings`, {
    method: "POST",
    body: JSON.stringify({ startDate, endDate }),
  });
export const getRentals = (role = "renter", status = "all") =>
  api(`/api/rentals?${query({ role, status })}`);
export const getRental = (id) => api(`/api/rentals/${id}`);
export const decideRental = (id, decision, note = "") =>
  api(`/api/rentals/${id}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision, note }),
  });
export const completeSandboxRentalPayment = (id) =>
  api(`/api/rentals/${id}/sandbox-payment`, { method: "POST" });
export const cancelRental = (id, reason = "") =>
  api(`/api/rentals/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
export const submitPickupEvidence = (id, payload) =>
  api(`/api/rentals/${id}/pickup`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const submitReturnEvidence = (id, payload) =>
  api(`/api/rentals/${id}/return`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const createRentalDispute = (id, payload) =>
  api(`/api/rentals/${id}/disputes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const reportRentalDamage = (id, payload) =>
  api(`/api/rentals/${id}/damage-report`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const getRentalDisputes = () => api("/api/rentals/admin/disputes");
export const resolveRentalDispute = (id, payload) =>
  api(`/api/rentals/admin/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export async function uploadRentalEvidence(bookingId, files) {
  if (!files?.length) return { success: true, data: { urls: [] } };
  const formData = new FormData();
  [...files].slice(0, 5).forEach((file) => formData.append("images", file));
  const token = localStorage.getItem("veloir_token");
  const response = await fetch(
    `${API_BASE_URL}/api/rentals/${bookingId}/evidence-upload`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Evidence upload failed.");
    Object.assign(error, data);
    throw error;
  }
  return data;
}

export const releaseSandboxRentalDeposit = (id) =>
  api(`/api/rentals/${id}/deposit/release`, { method: "POST" });
