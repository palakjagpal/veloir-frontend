import { api } from "../lib/api";

/** Account-level KYC status derived from bike-listing manual document submissions. */
export const getKycStatus = () => api("/api/kyc/status");

/** Returns masked status records only; full document values remain admin-only. */
export const getKycDocuments = () => api("/api/kyc/documents");

/** User-facing list of this account's manual submissions and review outcomes. */
export const getMyManualDocumentSubmissions = () =>
  api("/api/kyc/manual-submissions/me");

/** Admin-only review queue. The backend enforces the administrator role. */
export const getPendingManualDocumentSubmissions = () =>
  api("/api/kyc/manual-submissions/pending");

/** Submit an admin's final decision for one pending bike-document submission. */
export const reviewManualDocumentSubmission = (id, { decision, reviewNotes = "" }) =>
  api(`/api/kyc/manual-submissions/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ decision, reviewNotes }),
  });
