
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const ADMIN_TOKEN_KEY = "veloir_admin_token";

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
  "https://veloir-backend.onrender.com"
).replace(/\/+$/, "");

const AdminAuthContext = createContext(null);

function getStoredToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function removeStoredToken() {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // Storage may be unavailable in restricted browser environments.
  }
}

// Reuse this helper in administrator API requests.
export function getAdminAuthHeaders() {
  const token = getStoredToken();

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);

  const [admin, setAdmin] = useState(null);

  const [status, setStatus] = useState(() =>
    getStoredToken() ? "checking" : "anonymous"
  );

  const [authError, setAuthError] = useState("");

  // Verify the stored token against the backend.
  const verifyAdminSession = useCallback(async (tokenOverride) => {
    const currentToken = tokenOverride || getStoredToken();

    if (!currentToken) {
      removeStoredToken();
      setToken("");
      setAdmin(null);
      setStatus("anonymous");
      return false;
    }

    setStatus("checking");
    setAuthError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin-auth/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const data = await response.json().catch(() => ({}));

      // Remove credentials only when the backend explicitly
      // confirms that the session is invalid or unauthorized.
      if (response.status === 401 || response.status === 403) {
        removeStoredToken();
        setToken("");
        setAdmin(null);
        setStatus("anonymous");
        return false;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to verify administrator session."
        );
      }

      setToken(currentToken);
      setAdmin(data.admin);
      setStatus("authenticated");

      return true;
    } catch (error) {
      // A temporary network/server failure must not delete
      // an otherwise valid stored administrator token.
      setAuthError(
        error.message || "Unable to connect to the authentication server."
      );

      setStatus("error");
      return false;
    }
  }, []);

  // Restore the administrator session after refresh.
  useEffect(() => {
    verifyAdminSession();
  }, [verifyAdminSession]);

  // Call ONLY after successful email OTP verification.
  const loginAdmin = useCallback((newToken, adminData) => {
    if (!newToken || typeof newToken !== "string") {
      throw new Error("A valid administrator token is required.");
    }

    localStorage.setItem(ADMIN_TOKEN_KEY, newToken);

    setToken(newToken);
    setAdmin(adminData || null);
    setAuthError("");
    setStatus("authenticated");
  }, []);

  const logoutAdmin = useCallback(() => {
    removeStoredToken();

    setToken("");
    setAdmin(null);
    setAuthError("");
    setStatus("anonymous");
  }, []);

  // Synchronize administrator logout/login across browser tabs.
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key !== ADMIN_TOKEN_KEY) return;

      if (!event.newValue) {
        setToken("");
        setAdmin(null);
        setStatus("anonymous");
        setAuthError("");
        return;
      }

      setToken(event.newValue);
      verifyAdminSession(event.newValue);
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [verifyAdminSession]);

  const value = useMemo(
    () => ({
      admin,
      token,
      status,
      authError,

      isAuthenticated:
        status === "authenticated" && Boolean(token),

      loginAdmin,
      logoutAdmin,
      verifyAdminSession,
    }),
    [
      admin,
      token,
      status,
      authError,
      loginAdmin,
      logoutAdmin,
      verifyAdminSession,
    ]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error(
      "useAdminAuth must be used inside AdminAuthProvider."
    );
  }

  return context;
}
