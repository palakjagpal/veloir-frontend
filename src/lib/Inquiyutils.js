// Shared helpers for the inquiry flow (Phase 1)

export const INQUIRY_STATUSES = ["pending", "accepted", "rejected", "expired", "converted"];

export const STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  converted: "Converted",
};

export const CONTACT_LABELS = { email: "Email", phone: "Phone", both: "Email & phone" };

// /users/me returns `_id`; login / 2FA responses return `id`
export const getUserId = (u) => String(u?._id || u?.id || "");

// The API only flips pending -> expired lazily (after list queries / seller views),
// so derive the real state on the client too.
export const getEffectiveStatus = (inquiry) => {
  if (
    inquiry?.status === "pending" &&
    inquiry?.expiresAt &&
    new Date(inquiry.expiresAt).getTime() < Date.now()
  ) {
    return "expired";
  }
  return inquiry?.status;
};

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

export const daysLeft = (expiresAt) => {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
};