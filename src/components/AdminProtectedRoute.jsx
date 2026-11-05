
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function AdminProtectedRoute({ children }) {
  const location = useLocation();

  const {
    status,
    isAuthenticated,
    authError,
    verifyAdminSession,
  } = useAdminAuth();

  // Wait until the saved token has been checked.
  if (status === "checking") {
    return (
      <div
        role="status"
        style={{
          minHeight: "70vh",
          display: "grid",
          placeItems: "center",
          color: "#092532",
          fontWeight: 600,
        }}
      >
        Verifying administrator session...
      </div>
    );
  }

  // Do not redirect to login just because the backend
  // temporarily cannot be reached.
  if (status === "error") {
    return (
      <div
        role="alert"
        style={{
          minHeight: "70vh",
          display: "grid",
          placeContent: "center",
          textAlign: "center",
          gap: "14px",
          padding: "24px",
        }}
      >
        <p>{authError}</p>

        <button
          type="button"
          onClick={() => verifyAdminSession()}
        >
          Retry authentication
        </button>
      </div>
    );
  }

  // Redirect only when there is no valid administrator session.
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}
