const configuredApiBase = String(
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "https://veloir-backend.onrender.com",
).replace(/\/+$/, "");
export const API_BASE_URL = configuredApiBase.endsWith("/api")
  ? configuredApiBase.slice(0, -4)
  : configuredApiBase;

/**
 * Decode only the JWT payload shape. This is not signature verification: the API
 * remains responsible for validating signatures and expiry. This helper is solely
 * used to avoid accidentally treating a short-lived MFA/reset token as an access token.
 */
function readJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(decodeURIComponent(Array.from(atob(padded), (char) =>
      `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`
    ).join("")));
  } catch {
    return null;
  }
}

function isReusableAuthToken(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const payload = readJwtPayload(value.trim());
  if (!payload || payload.isPreAuth === true) return false;
  // Full access tokens carry email. Password-reset and short-lived phone/MFA
  // verification tokens are intentionally not migrated from legacy generic keys.
  return Boolean(payload.email);
}

/** The one canonical token key used by AuthContext and every API request. */
export function getAuthToken() {
  try {
    const canonical = localStorage.getItem("veloir_token");
    if (canonical?.trim()) {
      // Never use the short-lived MFA pre-auth token for normal app requests.
      if (readJwtPayload(canonical.trim())?.isPreAuth === true) {
        localStorage.removeItem("veloir_token");
      } else {
        return canonical.trim();
      }
    }

    // Migrate only recognizable legacy access tokens. Never migrate generic
    // `token` values unless they are a valid, non-MFA access token shape.
    const directKeys = ["veloirToken", "accessToken", "access_token", "authToken", "jwt", "token"];
    for (const key of directKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let candidate = raw;
      try {
        const parsed = JSON.parse(raw);
        candidate = parsed?.token || parsed?.accessToken || parsed?.access_token || parsed?.jwt || "";
      } catch {
        // Raw JWT value.
      }
      if (isReusableAuthToken(candidate)) {
        localStorage.setItem("veloir_token", candidate);
        return candidate;
      }
    }

    const objectKeys = ["userInfo", "user", "auth", "veloirUser"];
    for (const key of objectKeys) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        const candidate = parsed?.token || parsed?.accessToken || parsed?.access_token || parsed?.jwt || "";
        if (isReusableAuthToken(candidate)) {
          localStorage.setItem("veloir_token", candidate);
          return candidate;
        }
      } catch {
        // Ignore unrelated/non-JSON storage values.
      }
    }
  } catch {
    // Storage can be unavailable in restrictive browsing contexts.
  }
  return "";
}

export function storeAuthToken(token) {
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("The authentication response did not include a valid token.");
  }
  if (readJwtPayload(token.trim())?.isPreAuth === true) {
    throw new Error("A pre-authentication token cannot be used as the Veloir access token.");
  }
  localStorage.setItem("veloir_token", token.trim());
}

export function clearAuthToken() {
  try {
    ["veloir_token", "veloirToken", "accessToken", "access_token", "authToken", "jwt"].forEach((key) => localStorage.removeItem(key));
    const rawToken = localStorage.getItem("token");
    if (isReusableAuthToken(rawToken)) localStorage.removeItem("token");
    ["userInfo", "user", "auth", "veloirUser"].forEach((key) => {
      // These keys may hold unrelated profile/state data, so remove only objects
      // that contain a recognizable reusable access-token value.
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const value = JSON.parse(raw);
        const candidate = value?.token || value?.accessToken || value?.access_token || value?.jwt || "";
        if (isReusableAuthToken(candidate)) localStorage.removeItem(key);
      } catch { /* leave unrelated values alone */ }
    });
  } catch {
    // Nothing else to do if storage is disabled.
  }
}

export const getImageUrl = (path) =>
  path?.startsWith("http")
    ? path
    : path
      ? `${API_BASE_URL}${path}`
      : "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80";

export const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export async function api(path, options = {}) {
  const token = getAuthToken();
  const suppliedHeaders = new Headers(options.headers || {});
  const headers = new Headers();
  suppliedHeaders.forEach((value, key) => headers.set(key, value));

  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  // Respect an explicit Authorization header (e.g. the short-lived pre-auth token
  // used only by the login OTP endpoint); otherwise use the canonical access token.
  if (!headers.has("Authorization") && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || "Something went wrong");
    Object.assign(error, data);
    error.status = response.status;
    throw error;
  }
  return data;
}


/** Complete the existing SMS second-factor login flow using the temporary token
 * only on the OTP-verification endpoint. The temporary token is never stored as
 * the canonical Veloir access token. */
export async function verifyTwoFactorLogin(tempToken, otpCode) {
  if (!tempToken || !otpCode) throw new Error("The temporary login token and verification code are required.");
  try {
    return await api("/api/auth/verify-2fa-login", {
      method: "POST",
      headers: { Authorization: `Bearer ${tempToken}` },
      body: JSON.stringify({ tempToken, otpCode, otp: otpCode }),
    });
  } catch {
    return api("/api/auth/verify-login-otp", {
      method: "POST",
      headers: { Authorization: `Bearer ${tempToken}` },
      body: JSON.stringify({ otp: otpCode }),
    });
  }
}

export async function uploadAvatar(file) {
  const token = getAuthToken();
  if (!token) {
    const error = new Error("Your sign-in session is missing. Please sign in again.");
    error.status = 401;
    throw error;
  }
  const form = new FormData();
  form.append("image", file);
  const response = await fetch(`${API_BASE_URL}/api/users/profile-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Unable to upload image");
    Object.assign(error, data);
    error.status = response.status;
    throw error;
  }
  return data;
}
