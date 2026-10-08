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

import {
  DealsPage,
  InquiriesPage,
  InquiryDetailPage,
  OffersPage,
  OfferDetailPage,
  PurchasesPage,
  PurchaseDetailPage,
  TransferDetailPage
} from "./pages/deals";

// Small helper to keep the route table readable.
const guard = (element, roles) => (
  <ProtectedRoute roles={roles}>{element}</ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/bikes" element={<BikesPage />} />
        <Route path="/bikes/:id" element={<BikeDetailsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/regions" element={<AllRegionsPage />} />

        {/* Authenticated */}
        <Route path="/settings" element={guard(<SettingsPage />)} />
        <Route path="/wishlist" element={guard(<WishlistPage />)} />
        <Route path="/bikes/create" element={guard(<CreateBikeListingPage />)} />
        <Route path="/bikes/:id/edit" element={guard(<EditBikeListingPage />)} />
        <Route path="/my-bikes" element={guard(<MyBikesPage />)} />

        {/* Deals*/}
        <Route path="/deals" element={guard(<DealsPage />)} />
        <Route path="/inquiries" element={guard(<InquiriesPage />)} />
        <Route path="/inquiries/:id" element={guard(<InquiryDetailPage />)} />
        <Route path="/offers" element={guard(<OffersPage />)} />
        <Route path="/offers/:id" element={guard(<OfferDetailPage />)} />
        <Route path="/purchases" element={guard(<PurchasesPage />)} />
        <Route path="/purchases/:id" element={guard(<PurchaseDetailPage />)} />
        <Route path="/transfers/:id" element={guard(<TransferDetailPage />)} />

        <Route path="*" element={<HomePage />} />
      </Routes>
    </AuthProvider>
  );
}