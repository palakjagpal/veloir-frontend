import { Navigate } from "react-router-dom";

function readJson(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

/**
 * Client-side navigation gate for admin pages. It checks that the current
 * shared session is the admin session, not just that an old admin token exists.
 * The backend independently verifies the signed admin JWT on every API.
 */
export default function AdminProtectedRoute({ children }) {
  const adminToken = window.localStorage.getItem("veloirAdminToken");
  const currentToken = window.localStorage.getItem("token");
  const currentUser = readJson("user");
  const isCurrentAdminSession = Boolean(
    adminToken && currentToken === adminToken && currentUser?.accountType === "admin"
  );

  return isCurrentAdminSession ? children : <Navigate to="/admin/login" replace />;
}
