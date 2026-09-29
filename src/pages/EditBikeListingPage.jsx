import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  FiChevronLeft,
  FiLoader,
  FiSave,
} from "react-icons/fi";

import Layout from "../components/Layout";
import BikeActionOtpModal from "../components/BikeActionOtpModal";
import { api, getImageUrl, formatPrice } from "../lib/api";

import {
  CATEGORIES,
  CONDITIONS,
  FUEL_TYPES,
  TRANSMISSION_TYPES,
} from "../lib/bikeFormConstants";

const currentYear = new Date().getFullYear();

function toFormValues(bike) {
  return {
    title: bike.title || "",
    description: bike.description || "",
    brand: bike.brand || "",
    model: bike.model || "",
    year: bike.year || "",
    price: bike.price || "",
    category: bike.category || "",
    condition: bike.condition || "",
    color: bike.color || "",
    mileage: bike.mileage ?? "",
    engineCapacity: bike.engineCapacity || "",

    city: bike.location?.city || "",
    state: bike.location?.state || "",
    country: bike.location?.country || "India",
    pincode: bike.location?.pincode || "",

    isForSale: bike.isForSale !== false,
    isForRent: Boolean(bike.isForRent),
    isForTrade: Boolean(bike.isForTrade),

    fuelType: bike.specs?.fuelType || "Petrol",
    transmissionType:
      bike.specs?.transmissionType || "Manual",
    topSpeed: bike.specs?.topSpeed ?? "",
    maxPower: bike.specs?.maxPower || "",
    torque: bike.specs?.torque || "",
    registrationNumber:
      bike.specs?.registrationNumber || "",

    pricePerDay:
      bike.rentalDetails?.pricePerDay ?? "",
    pricePerWeek:
      bike.rentalDetails?.pricePerWeek ?? "",
    pricePerMonth:
      bike.rentalDetails?.pricePerMonth ?? "",
    securityDeposit:
      bike.rentalDetails?.securityDeposit ?? "",
    minDuration:
      bike.rentalDetails?.minDuration ?? 1,
    maxDuration:
      bike.rentalDetails?.maxDuration ?? 30,
    rentalTerms:
      bike.rentalDetails?.terms || "",

    preferredBrands:
      Array.isArray(
        bike.tradeDetails?.preferredBrands
      )
        ? bike.tradeDetails.preferredBrands.join(", ")
        : "",

    preferredCategories:
      Array.isArray(
        bike.tradeDetails?.preferredCategories
      )
        ? bike.tradeDetails.preferredCategories.join(
            ", "
          )
        : "",

    tradeConditions:
      bike.tradeDetails?.conditions || "",

    estimatedTradeValue:
      bike.tradeDetails?.estimatedTradeValue ?? "",
  };
}

export default function EditBikeListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bike, setBike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpOperationId, setOtpOperationId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  const isForRent = watch("isForRent");
  const isForTrade = watch("isForTrade");
  const isForSale = watch("isForSale");

  useEffect(() => {
    loadBike();
  }, [id]);

  const loadBike = async () => {
    setLoading(true);
    setPageError("");

    try {
      const response = await api(`/api/bikes/${id}`);

      const loadedBike = response.data;

      setBike(loadedBike);
      reset(toFormValues(loadedBike));
    } catch (err) {
      setPageError(
        err.message || "Failed to load bike listing"
      );
    } finally {
      setLoading(false);
    }
  };

  const prepareChanges = (data) => {
    return {
      title: data.title.trim(),
      description: data.description.trim(),
      brand: data.brand.trim(),
      model: data.model.trim(),
      year: Number(data.year),
      price: Number(data.price),
      category: data.category,
      condition: data.condition,
      color: data.color?.trim() || "",
      mileage: data.mileage
        ? Number(data.mileage)
        : 0,
      engineCapacity: Number(data.engineCapacity),

      location: {
        city: data.city.trim(),
        state: data.state.trim(),
        country:
          data.country?.trim() || "India",
        pincode: data.pincode?.trim() || "",
      },

      isForSale: Boolean(data.isForSale),
      isForRent: Boolean(data.isForRent),
      isForTrade: Boolean(data.isForTrade),

      specs: {
        fuelType: data.fuelType || "Petrol",
        transmissionType:
          data.transmissionType || "Manual",
        topSpeed: data.topSpeed
          ? Number(data.topSpeed)
          : null,
        maxPower: data.maxPower?.trim() || "",
        torque: data.torque?.trim() || "",
        registrationNumber:
          data.registrationNumber?.trim() || "",
      },

      rentalDetails: data.isForRent
        ? {
            pricePerDay: data.pricePerDay
              ? Number(data.pricePerDay)
              : null,
            pricePerWeek: data.pricePerWeek
              ? Number(data.pricePerWeek)
              : null,
            pricePerMonth: data.pricePerMonth
              ? Number(data.pricePerMonth)
              : null,
            securityDeposit:
              data.securityDeposit
                ? Number(data.securityDeposit)
                : null,
            minDuration:
              data.minDuration
                ? Number(data.minDuration)
                : 1,
            maxDuration:
              data.maxDuration
                ? Number(data.maxDuration)
                : 30,
            terms:
              data.rentalTerms?.trim() || "",
          }
        : null,

      tradeDetails: data.isForTrade
        ? {
            preferredBrands: (
              data.preferredBrands || ""
            )
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),

            preferredCategories: (
              data.preferredCategories || ""
            )
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),

            conditions:
              data.tradeConditions?.trim() || "",

            estimatedTradeValue:
              data.estimatedTradeValue
                ? Number(data.estimatedTradeValue)
                : null,
          }
        : null,
    };
  };

  const onSubmit = async (data) => {
    if (
      !isForSale &&
      !isForRent &&
      !isForTrade
    ) {
      toast.error(
        "Select at least one listing type."
      );
      return;
    }

    setSubmitting(true);

    try {
      const changes = prepareChanges(data);

      const response = await api(
        `/api/bikes/${id}/security/request-otp`,
        {
          method: "POST",
          body: JSON.stringify({
            action: "update",
            changes,
          }),
        }
      );

      setOtpOperationId(response.operationId);
      setMaskedEmail(response.maskedEmail);
      setOtpOpen(true);
    } catch (err) {
      toast.error(
        err.message ||
          "Unable to start update verification."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSuccess = (response) => {
    toast.success(
      response.message ||
        "Bike listing updated successfully."
    );

    navigate("/my-bikes");
  };

  if (loading) {
    return (
      <Layout>
        <main className="mx-auto max-w-5xl px-4 pb-20 pt-36">
          <div className="flex min-h-75 items-center justify-center">
            <FiLoader className="animate-spin text-2xl text-emerald-600" />
          </div>
        </main>
      </Layout>
    );
  }

  if (pageError || !bike) {
    return (
      <Layout>
        <main className="mx-auto max-w-5xl px-4 pb-20 pt-36">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
            {pageError || "Bike listing not found."}
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-36">
        <Link
          to="/my-bikes"
          className="mb-5 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600"
        >
          <FiChevronLeft />
          Back to My Bikes
        </Link>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600">
            Manage listing
          </p>

          <br></br>

          <h1 className="mt-2 text-3xl font-bold text-[#092532]">
            Edit Bike Listing
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Your changes are kept pending until you
            verify the security code sent to your
            registered email.
          </p>
        </div>

        {bike.images?.length > 0 && (
          <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900" style={{
                letterSpacing: "1px",
                wordSpacing: "2px",
              }}>
              Current Photos
            </h2>
            <br></br>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {bike.images.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="overflow-hidden rounded-xl border border-gray-200"
                >
                  <img
                    src={getImageUrl(image)}
                    alt={`${bike.title} ${index + 1}`}
                    className="h-28 w-full object-cover"
                  />
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Existing images are preserved by this
              edit flow.
            </p>
          </section>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8"
        >
          {/* Basic details */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-5 text-lg font-semibold text-[#092532]" style={{
                letterSpacing: "1px",
                wordSpacing: "2px",
              }}>
              Basic Details
            </h2>
            <br></br>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Title *
                </label>

                <input
                  {...register("title", {
                    required: "Title is required",
                    maxLength: {
                      value: 100,
                      message:
                        "Maximum 100 characters.",
                    },
                  })}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />

                {errors.title && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Description *
                </label>

                <textarea
                  rows={5}
                  {...register("description", {
                    required:
                      "Description is required",
                    maxLength: {
                      value: 2000,
                      message:
                        "Maximum 2000 characters.",
                    },
                  })}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />

                {errors.description && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Brand *
                </label>

                <input
                  {...register("brand", {
                    required: "Brand is required",
                  })}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Model *
                </label>

                <input
                  {...register("model", {
                    required: "Model is required",
                  })}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Year *
                </label>

                <input
                  type="number"
                  {...register("year", {
                    required: "Year is required",
                    min: {
                      value: 1900,
                      message: "Invalid year.",
                    },
                    max: {
                      value: currentYear + 1,
                      message: "Invalid year.",
                    },
                  })}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Price (₹) *
                </label>

                <input
                  type="number"
                  {...register("price", {
                    required: "Price is required",
                    min: {
                      value: 0,
                      message:
                        "Price cannot be negative.",
                    },
                  })}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Category *
                </label>

                <select
                  {...register("category", {
                    required:
                      "Category is required",
                  })}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
                >
                  <option value="">
                    Select category
                  </option>

                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Condition *
                </label>

                <select
                  {...register("condition", {
                    required:
                      "Condition is required",
                  })}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
                >
                  <option value="">
                    Select condition
                  </option>

                  {CONDITIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Color
                </label>

                <input
                  {...register("color")}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Mileage (km)
                </label>

                <input
                  type="number"
                  {...register("mileage", {
                    min: {
                      value: 0,
                      message:
                        "Mileage cannot be negative.",
                    },
                  })}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Engine Capacity (cc) *
                </label>

                <input
                  type="number"
                  {...register("engineCapacity", {
                    required:
                      "Engine capacity is required",
                    min: {
                      value: 50,
                      message:
                        "Minimum engine capacity is 50cc.",
                    },
                  })}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-5 text-lg font-semibold text-[#092532]" style={{
                letterSpacing: "1px",
                wordSpacing: "2px",
              }}>
              Location
            </h2>
            <br></br>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  City *
                </label>

                <input
                  {...register("city", {
                    required: "City is required",
                  })}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  State *
                </label>

                <input
                  {...register("state", {
                    required:
                      "State is required",
                  })}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Country
                </label>

                <input
                  {...register("country")}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Pincode
                </label>

                <input
                  {...register("pincode")}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </section>

          {/* Listing type */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-5 text-lg font-semibold text-[#092532]" style={{
                letterSpacing: "1px",
                wordSpacing: "2px",
              }}>
              Listing Type
            </h2>
            <br></br>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                ["isForSale", "For Sale"],
                ["isForRent", "For Rent"],
                ["isForTrade", "For Trade"],
              ].map(([field, label]) => (
                <label
                  key={field}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4"
                >
                  <input
                    type="checkbox"
                    {...register(field)}
                    disabled={submitting || otpOpen}
                    className="h-4 w-4 accent-emerald-600"
                  />

                  <span className="text-sm font-medium text-gray-700">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Specs */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-5 text-lg font-semibold text-[#092532]" style={{
                letterSpacing: "1px",
                wordSpacing: "2px",
              }}>
              Specifications
            </h2>
            <br></br>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Fuel Type
                </label>

                <select
                  {...register("fuelType")}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
                >
                  {FUEL_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}

                  <option value="Electric">
                    Electric
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Transmission
                </label>

                <select
                  {...register("transmissionType")}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
                >
                  {TRANSMISSION_TYPES.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Top Speed (km/h)
                </label>

                <input
                  type="number"
                  {...register("topSpeed")}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Horse Power
                </label>

                <input
                  {...register("maxPower")}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Torque
                </label>

                <input
                  {...register("torque")}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Registration Number
                </label>

                <input
                  {...register(
                    "registrationNumber"
                  )}
                  disabled={submitting || otpOpen}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </section>

          {/* Rental */}
          {isForRent && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="mb-5 text-lg font-semibold text-[#092532]">
                Rental Details
              </h2>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Price / Day
                  </label>

                  <input
                    type="number"
                    {...register("pricePerDay")}
                    disabled={submitting || otpOpen}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Price / Week
                  </label>

                  <input
                    type="number"
                    {...register("pricePerWeek")}
                    disabled={submitting || otpOpen}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Price / Month
                  </label>

                  <input
                    type="number"
                    {...register("pricePerMonth")}
                    disabled={submitting || otpOpen}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Security Deposit
                  </label>

                  <input
                    type="number"
                    {...register("securityDeposit")}
                    disabled={submitting || otpOpen}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Min Duration
                  </label>

                  <input
                    type="number"
                    {...register("minDuration")}
                    disabled={submitting || otpOpen}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Max Duration
                  </label>

                  <input
                    type="number"
                    {...register("maxDuration")}
                    disabled={submitting || otpOpen}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    Rental Terms
                  </label>

                  <textarea
                    rows={4}
                    {...register("rentalTerms")}
                    disabled={submitting || otpOpen}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Trade */}
          {isForTrade && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="mb-5 text-lg font-semibold text-[#092532]" style={{
                letterSpacing: "1px",
                wordSpacing: "2px",
              }}>
                Trade Details
              </h2>
              <br></br>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Preferred Brands
                  </label>

                  <input
                    {...register("preferredBrands")}
                    placeholder="Honda, Yamaha, Royal Enfield"
                    disabled={submitting || otpOpen}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Preferred Categories
                  </label>

                  <input
                    {...register(
                      "preferredCategories"
                    )}
                    placeholder="Sport, Cruiser"
                    disabled={submitting || otpOpen}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Acceptable Conditions
                  </label>

                  <textarea
                    rows={3}
                    {...register("tradeConditions")}
                    disabled={submitting || otpOpen}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Estimated Trade Value
                  </label>

                  <input
                    type="number"
                    {...register(
                      "estimatedTradeValue"
                    )}
                    disabled={submitting || otpOpen}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Security information */}
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="text-sm leading-6 text-emerald-900">
              Your changes are not saved immediately.
              After you submit this form, Veloir will
              send a verification code to your registered
              email. Only successful OTP verification will
              commit these changes to your bike listing.
            </p>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/my-bikes"
              className="rounded-xl border border-gray-200 px-6 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting || otpOpen}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#092532] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <FiLoader className="animate-spin" />
                  Sending code...
                </>
              ) : (
                <>
                  <FiSave />
                  Request Update
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      <BikeActionOtpModal
        isOpen={otpOpen}
        onClose={() => {
          setOtpOpen(false);
        }}
        bikeId={id}
        operationId={otpOperationId}
        action="update"
        maskedEmail={maskedEmail}
        onSuccess={handleOtpSuccess}
      />
    </Layout>
  );
}