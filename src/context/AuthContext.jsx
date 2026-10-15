import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearAuthToken, getAuthToken, storeAuthToken } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hydrating, setHydrating] = useState(false);
  const [oauthNotice, setOauthNotice] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("token");
    if (oauthToken) {
      // OAuth callback uses the same canonical token key as normal login.
      storeAuthToken(oauthToken);
      setOauthNotice({ isNew: params.get("isNew") === "true", notice: params.get("notice") });
      params.delete("token");
      params.delete("isNew");
      const cleanQuery = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (cleanQuery ? `?${cleanQuery}` : ""));
    }

    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    api("/api/users/me")
      .then((response) => {
        if (!cancelled) setUser(response.data || response.user || response);
      })
      .catch((error) => {
        // Only clear a rejected credential. Temporary API/network/server failures
        // should not silently log out an otherwise valid client session.
        if (error?.status === 401) {
          clearAuthToken();
          if (!cancelled) setUser(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const login = useCallback((token, userData) => {
    storeAuthToken(token);
    setUser(userData || null);
    setHydrating(true);
    api("/api/users/me")
      .then((response) => {
        const fullUser = response.data || response.user || response;
        setUser((previous) => ({ ...(previous || {}), ...(fullUser || {}) }));
      })
      .catch((error) => {
        if (error?.status === 401) {
          clearAuthToken();
          setUser(null);
        }
      })
      .finally(() => setHydrating(false));
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAuthToken()) await api("/api/auth/logout", { method: "POST" });
    } catch (error) {
      // Logout still clears the local session if the server is unreachable.
      if (import.meta.env.DEV) console.warn("Logout API request failed.", error?.status || "network error");
    } finally {
      clearAuthToken();
      setUser(null);
      setHydrating(false);
    }
  }, []);

  const hasRole = useCallback((...roles) => {
    const expected = roles.flat().filter(Boolean);
    return Boolean(user) && (expected.length === 0 || expected.includes(user.role));
  }, [user]);

  const value = useMemo(() => ({
    user, setUser, loading, hydrating, oauthNotice, setOauthNotice, login, logout, hasRole,
  }), [user, loading, hydrating, oauthNotice, login, logout, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
