export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "VITE_API_BASE_URL=https://veloir-backend.onrender.com";
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
  const token = localStorage.getItem("veloir_token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok){
    const err = new Error(data.message || data.error || "Something went wrong");
    Object.assign(err, data);
    throw err;
  }
  return data;
}
