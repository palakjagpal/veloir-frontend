import { api } from "../lib/api";

/* =========================
   INQUIRIES
========================= */

export const createInquiry = (bikeId, payload) =>
    api(`/api/inquiries/bike/${bikeId}`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const getMyInquiries = (role = "") =>
    api(`/api/inquiries${role ? `?role=${role}` : ""}`);

export const getInquiry = (id) =>
    api(`/api/inquiries/${id}`);

export const acceptInquiry = (id, responseMessage = "") =>
    api(`/api/inquiries/${id}/accept`, {
        method: "PUT",
        body: JSON.stringify({
            responseMessage,
        }),
    });

export const rejectInquiry = (id, rejectionReason = "") =>
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


/* =========================
   OFFERS
========================= */

export const createOffer = (bikeId, payload) =>
    api(`/api/offers/bike/${bikeId}`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const getMyOffers = (role = "") =>
    api(`/api/offers${role ? `?role=${role}` : ""}`);

export const getOffer = (id) =>
    api(`/api/offers/${id}`);

export const acceptOffer = (id) =>
    api(`/api/offers/${id}/accept`, {
        method: "PUT",
    });

export const rejectOffer = (id, rejectionReason = "") =>
    api(`/api/offers/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({
            rejectionReason,
        }),
    });

export const counterOffer = (id, payload) =>
    api(`/api/offers/${id}/counter`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const acceptCounterOffer = (id, counterIndex) =>
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


/* =========================
   PURCHASES
========================= */

export const buyBikeNow = (bikeId) =>
    api(`/api/purchases/buy/${bikeId}`, {
        method: "POST",
    });

export const getMyPurchases = (role = "") =>
    api(`/api/purchases${role ? `?role=${role}` : ""}`);

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

export const updatePayment = (id, payload) =>
    api(`/api/purchases/${id}/payment`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const initiateOwnershipTransfer = (
    id,
    notes = ""
) =>
    api(`/api/purchases/${id}/transfer`, {
        method: "POST",
        body: JSON.stringify({
            notes,
        }),
    });