import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import HomePage from "./pages/HomePage";
import BikesPage from "./pages/BikesPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SettingsPage from "./pages/SettingsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProtectedRoute from "./components/ProtectedRoute";
import BikeDetailsPage from "./pages/BikeDetailsPage";
import WishlistPage from "./pages/WishlistPage";
import CreateBikeListingPage from "./pages/CreateBikeListingPage";
import MyBikesPage from "./pages/MyBikesPage";
import EditBikeListingPage from "./pages/EditBikeListingPage";
import AllRegionsPage from "./pages/AllRegionsPage";

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bikes" element={<BikesPage />} />
        <Route path="/bikes/:id" element={<BikeDetailsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<HomePage />} />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <WishlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bikes/create"
          element={
            <ProtectedRoute>
              <CreateBikeListingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bikes/:id/edit"
          element={
            <ProtectedRoute>
              <EditBikeListingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bikes"
          element={
            <ProtectedRoute>
              <MyBikesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/regions" element={<AllRegionsPage />} />
      </Routes>
    </AuthProvider>
  );
}
