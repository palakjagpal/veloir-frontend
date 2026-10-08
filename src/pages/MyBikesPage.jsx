import BikeGalleryManager from "../components/BikeGalleryManager";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiPackage,
  FiCheckCircle,
  FiClock,
  FiBarChart2,
} from "react-icons/fi";
import toast from "react-hot-toast";

import Layout from "../components/Layout";
import { Skeletons } from "../components/BikeCard";
import BikeActionOtpModal from "../components/BikeActionOtpModal";
import { api, getImageUrl, formatPrice } from "../lib/api";
import {
  getBikeStats,
  toggleBikeAvailability,
} from "../services/sellerService";

function statusBadgeClasses(bike) {
  if (!bike.isApproved) {
    return "bg-amber-100 text-amber-700";
  }

  if (
    bike.status === "sold" ||
    bike.status === "rented"
  ) {
    return "bg-gray-200 text-gray-600";
  }

  if (bike.isAvailable === false) {
    return "bg-gray-200 text-gray-600";
  }

  return "bg-emerald-100 text-emerald-700";
}

function statusLabel(bike) {
  if (!bike.isApproved) {
    return "Pending approval";
  }

  if (bike.status === "sold") {
    return "Sold";
  }

  if (bike.status === "rented") {
    return "Rented";
  }

  if (bike.isAvailable === false) {
    return "Unavailable";
  }

  if (bike.status === "pending") {
    return "Pending";
  }

  return "Live";
}

export default function MyBikesPage() {
  const navigate = useNavigate();

  const [bikes, setBikes] = useState(null);
  const [error, setError] = useState("");

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [availabilityBusy, setAvailabilityBusy] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpBikeId, setOtpBikeId] = useState("");
  const [otpOperationId, setOtpOperationId] = useState("");
  const [otpMaskedEmail, setOtpMaskedEmail] = useState("");

  useEffect(() => {
    loadMyBikes();
    loadStats();
  }, []);

  const loadMyBikes = async () => {
    setError("");

    try {
      const response = await api(
        "/api/bikes/my-listings"
      );

      setBikes(response.data || []);
    } catch (err) {
      setError(
        err.message ||
          "Failed to load your listings"
      );

      setBikes([]);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);

    try {
      const response = await getBikeStats();
      setStats(response.data || null);
    } catch (err) {
      console.error("Failed to load bike stats:", err);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleToggleAvailability = async (
    event,
    bike
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (availabilityBusy === bike._id) {
      return;
    }

    setAvailabilityBusy(bike._id);

    try {
      const response =
        await toggleBikeAvailability(
          bike._id
        );

      toast.success(
        response.message ||
          "Availability updated successfully."
      );

      const updatedBike =
        response.data;

      setBikes((current) =>
        current?.map((item) =>
          item._id === bike._id
            ? {
                ...item,
                ...updatedBike,
              }
            : item
        )
      );

      await loadStats();
    } catch (err) {
      toast.error(
        err.message ||
          "Unable to update bike availability."
      );
    } finally {
      setAvailabilityBusy("");
    }
  };

  const startDeleteFlow = (
    event,
    bike
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setDeleteTarget(bike);
  };

  const cancelDelete = () => {
    if (deleteBusy) {
      return;
    }

    setDeleteTarget(null);
  };

  const requestDeleteOtp = async () => {
    if (!deleteTarget || deleteBusy) {
      return;
    }

    setDeleteBusy(true);

    try {
      const response = await api(
        `/api/bikes/${deleteTarget._id}/security/request-otp`,
        {
          method: "POST",
          body: JSON.stringify({
            action: "delete",
          }),
        }
      );

      setOtpBikeId(
        deleteTarget._id
      );

      setOtpOperationId(
        response.operationId
      );

      setOtpMaskedEmail(
        response.maskedEmail
      );

      setDeleteTarget(null);
      setOtpOpen(true);
    } catch (err) {
      toast.error(
        err.message ||
          "Unable to start deletion verification."
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleDeleteOtpSuccess =
    async (response) => {
      toast.success(
        response.message ||
          "Bike listing deleted successfully."
      );

      setOtpOpen(false);
      setOtpBikeId("");
      setOtpOperationId("");
      setOtpMaskedEmail("");

      await loadMyBikes();
      await loadStats();
    };

  return (
    <Layout>
      <br />
      <br />
      <br />
      <br />

      <main className="wrap bike-section">
        <div className="section-top">
          <div>
            <p className="eyebrow">
              Your garage
            </p>

            <h2>My Bikes</h2>
          </div>

          <Link
            to="/bikes/create"
            className="btn btn-mint inline-flex items-center gap-2"
          >
            <FiPlus />
            New Listing
          </Link>
        </div>

        {/* Seller statistics */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <FiPackage />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Total Listings
            </p>

            <h3 className="mt-1 text-2xl font-bold text-[#092532]">
              {statsLoading
                ? "..."
                : stats?.totalBikes ?? 0}
            </h3>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <FiCheckCircle />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Available
            </p>

            <h3 className="mt-1 text-2xl font-bold text-[#092532]">
              {statsLoading
                ? "..."
                : stats?.availableBikes ?? 0}
            </h3>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <FiPackage />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Sold
            </p>

            <h3 className="mt-1 text-2xl font-bold text-[#092532]">
              {statsLoading
                ? "..."
                : stats?.soldBikes ?? 0}
            </h3>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <FiClock />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Pending Approval
            </p>

            <h3 className="mt-1 text-2xl font-bold text-[#092532]">
              {statsLoading
                ? "..."
                : stats?.pendingApproval ?? 0}
            </h3>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <FiBarChart2 />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Total Views
            </p>

            <h3 className="mt-1 text-2xl font-bold text-[#092532]">
              {statsLoading
                ? "..."
                : stats?.totalViews ?? 0}
            </h3>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {bikes === null ? (
          <Skeletons />
        ) : bikes.length ? (
          <div className="bike-grid">
            {bikes.map((bike) => (
              <article
                key={bike._id}
                className="bike-card"
              >
                <Link
                  to={`/bikes/${bike._id}`}
                  className="block"
                >
                  <div className="bike-image relative">
                    <img
                      src={getImageUrl(
                        bike.featuredImage ||
                          bike.images?.[0]
                      )}
                      alt={bike.title}
                    />

                    <span
                      className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClasses(
                        bike
                      )}`}
                    >
                      {statusLabel(bike)}
                    </span>
                  </div>

                  <div className="bike-card-copy">
                    <p>
                      {bike.brand} ·{" "}
                      {bike.category}
                    </p>

                    <h3>
                      {bike.title ||
                        `${bike.brand} ${bike.model}`}
                    </h3>

                    <div className="bike-price">
                      {formatPrice(
                        bike.price
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <FiEye />
                      {bike.views || 0} views
                    </div>
                  </div>
                </Link>

                {/* Availability */}
                {bike.isApproved &&
                  bike.status !==
                    "sold" &&
                  bike.status !==
                    "rented" && (
                    <div className="px-4 pb-3">
                      <button
                        type="button"
                        onClick={(event) =>
                          handleToggleAvailability(
                            event,
                            bike
                          )
                        }
                        disabled={
                          availabilityBusy ===
                          bike._id
                        }
                        className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          bike.isAvailable ===
                          false
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {availabilityBusy ===
                        bike._id ? (
                          "Updating..."
                        ) : bike.isAvailable ===
                          false ? (
                          <>
                            <FiEye />
                            Make Available
                          </>
                        ) : (
                          <>
                            <FiEyeOff />
                            Mark Unavailable
                          </>
                        )}
                      </button>
                    </div>
                  )}

                <div className="px-4">
                  <BikeGalleryManager
                    bikeId={bike._id}
                    onChanged={(gallery) => {
                      setBikes((current) =>
                        current?.map((item) =>
                          item._id === bike._id
                            ? {
                                ...item,
                                images: gallery.images,
                                featuredImage: gallery.featuredImage,
                              }
                            : item
                        )
                      );
                    }}
                  />
                </div>

                <br></br>

                <div className="flex gap-2 px-4 pb-4">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/bikes/${bike._id}/edit`
                      )
                    }
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    <FiEdit2 />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={(event) =>
                      startDeleteFlow(
                        event,
                        bike
                      )
                    }
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    <FiTrash2 />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          !error && (
            <div className="empty">
              You haven't listed any bikes yet.{" "}
              <Link to="/bikes/create">
                Create your first listing
              </Link>
              .
            </div>
          )
        )}
      </main>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-900 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <FiTrash2 size={22} />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-[#092532]">
              Delete this listing?
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              You're about to delete{" "}
              <strong className="text-gray-700">
                {deleteTarget.title}
              </strong>
              .
              <br />
              The bike will only be deleted after
              your email verification succeeds.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={deleteBusy}
                className="flex-1 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={requestDeleteOtp}
                disabled={deleteBusy}
                className="flex-1 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteBusy
                  ? "Sending code..."
                  : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BikeActionOtpModal
        isOpen={otpOpen}
        onClose={() => {
          setOtpOpen(false);
        }}
        bikeId={otpBikeId}
        operationId={otpOperationId}
        action="delete"
        maskedEmail={otpMaskedEmail}
        onSuccess={
          handleDeleteOtpSuccess
        }
      />
    </Layout>
  );
}