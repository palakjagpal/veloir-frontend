import { api } from "../lib/api";

const query = (params = {}) => {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      qs.set(key, value);
    }
  });

  return qs.toString();
};

/* =========================================================
   INQUIRIES
========================================================= */

export const createInquiry = (bikeId, payload) =>
  api(`/api/inquiries/bike/${bikeId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getInquiries = (params = {}) => {
  const q = query(params);

  return api(
    `/api/inquiries${q ? `?${q}` : ""}`
  );
};

export const getInquiry = (id) =>
  api(`/api/inquiries/${id}`);

export const acceptInquiry = (
  id,
  responseMessage = ""
) =>
  api(`/api/inquiries/${id}/accept`, {
    method: "PUT",
    body: JSON.stringify({
      responseMessage,
    }),
  });

export const rejectInquiry = (
  id,
  rejectionReason = ""
) =>
  api(`/api/inquiries/${id}/reject`, {
    method: "PUT",
    body: JSON.stringify({
      rejectionReason,
    }),
  });

export const convertInquiryToPurchase = (id) =>
  api(`/api/inquiries/${id}/convert`, {
    method: "POST",
  });

export const deleteInquiry = (id) =>
  api(`/api/inquiries/${id}`, {
    method: "DELETE",
  });

/* =========================================================
   OFFERS
========================================================= */

export const createOffer = (
  bikeId,
  payload
) =>
  api(`/api/offers/bike/${bikeId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getOffers = (params = {}) => {
  const q = query(params);

  return api(
    `/api/offers${q ? `?${q}` : ""}`
  );
};

export const getOffer = (id) =>
  api(`/api/offers/${id}`);

export const acceptOffer = (id) =>
  api(`/api/offers/${id}/accept`, {
    method: "PUT",
  });

export const rejectOffer = (
  id,
  rejectionReason = ""
) =>
  api(`/api/offers/${id}/reject`, {
    method: "PUT",
    body: JSON.stringify({
      rejectionReason,
    }),
  });

export const counterOffer = (
  id,
  payload
) =>
  api(`/api/offers/${id}/counter`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const acceptCounterOffer = (
  id,
  counterIndex
) =>
  api(`/api/offers/${id}/accept-counter`, {
    method: "PUT",
    body: JSON.stringify({
      counterIndex,
    }),
  });

export const withdrawOffer = (id) =>
  api(`/api/offers/${id}/withdraw`, {
    method: "PUT",
  });

/* =========================================================
   PURCHASES
========================================================= */

export const getPurchases = (
  params = {}
) => {
  const q = query(params);

  return api(
    `/api/purchases${q ? `?${q}` : ""}`
  );
};

export const getPurchase = (id) =>
  api(`/api/purchases/${id}`);

export const updatePurchaseStatus = (
  id,
  status,
  notes = ""
) =>
  api(`/api/purchases/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({
      status,
      notes,
    }),
  });

export const updatePayment = (
  id,
  payload
) =>
  api(`/api/purchases/${id}/payment`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const initiateTransfer = (
  id,
  notes = ""
) =>
  api(`/api/purchases/${id}/transfer`, {
    method: "POST",
    body: JSON.stringify({
      notes,
    }),
  });

/*
  This endpoint needs the small backend addition
  shown in section 8 below.
*/
export const getTransfer = (id) =>
  api(`/api/purchases/transfer/${id}`);