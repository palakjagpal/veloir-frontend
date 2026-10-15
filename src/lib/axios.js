import axios from "axios";
import { API_BASE_URL, getAuthToken } from "./api";

const axiosClient = axios.create({ baseURL: API_BASE_URL });

axiosClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  const existingAuthorization = config.headers?.Authorization
    || config.headers?.authorization
    || config.headers?.get?.("Authorization");

  // Keep explicitly supplied credentials intact (e.g. OTP pre-auth); otherwise
  // attach the same canonical access token used by fetch-based API calls.
  if (!existingAuthorization && token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
