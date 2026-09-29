import { API_BASE_URL, api } from "./api";

export async function verifyTwoFactorLogin(tempToken, otpCode) {
  try {
    return await api("/api/auth/verify-2fa-login", {
      method: "POST",
      body: JSON.stringify({ tempToken, otpCode }),
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
  const token = localStorage.getItem("veloir_token");
  const form = new FormData();
  form.append("image", file);
  const response = await fetch(`${API_BASE_URL}/api/users/profile-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Unable to upload image");
  return data;
}
