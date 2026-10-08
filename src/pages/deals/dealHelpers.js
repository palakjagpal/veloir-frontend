export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

export const dateOnly = (value) =>
  value
    ? new Date(value).toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      )
    : "—";

export const userId = (user) =>
  String(user?._id || user?.id || "");

export const imageUrl = (value) =>
  value || "/veloir-placeholder-bike.jpg";

export const displayName = (user) =>
  user?.name || "Unknown user";

export const effectiveExpiryStatus = (
  status,
  expiresAt
) => {
  if (
    ["pending", "accepted", "countered"].includes(
      status
    ) &&
    expiresAt
  ) {
    if (
      new Date(expiresAt).getTime() <
      Date.now()
    ) {
      return "expired";
    }
  }

  return status;
};

export const statusLabel = (status) =>
  String(status || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) =>
      c.toUpperCase()
    );