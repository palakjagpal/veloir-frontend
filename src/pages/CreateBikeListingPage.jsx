import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  FiChevronLeft,
  FiTag,
  FiMapPin,
  FiSliders,
  FiKey,
  FiRepeat,
  FiLoader,
} from "react-icons/fi";
import { Link } from "react-router-dom";

import Layout from "../components/Layout";
import axiosClient from "../lib/axios";
import BikeImageUploader from "../components/bike-form/BikeImageUploader";
import { Field, inputClasses } from "../components/bike-form/FormField";
import {
  CATEGORIES,
  CONDITIONS,
  FUEL_TYPES,
  TRANSMISSION_TYPES,
} from "../lib/bikeFormConstants";

const currentYear = new Date().getFullYear();

export default function CreateBikeListingPage() {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagesTouched, setImagesTouched] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      brand: "",
      model: "",
      year: "",
      price: "",
      category: "",
      condition: "",
      color: "",
      mileage: "",
      engineCapacity: "",
      city: "",
      state: "",
      country: "India",
      pincode: "",
      isForSale: true,
      isForRent: false,
      isForTrade: false,
      fuelType: "Petrol",
      transmissionType: "Manual",
      topSpeed: "",
      maxPower: "",
      torque: "",
      registrationNumber: "",
      pricePerDay: "",
      pricePerWeek: "",
      pricePerMonth: "",
      securityDeposit: "",
      minDuration: "1",
      maxDuration: "30",
      rentalTerms: "",
      preferredBrands: "",
      preferredCategories: "",
      tradeConditions: "",
      estimatedTradeValue: "",
    },
  });

  const isForRent = watch("isForRent");
  const isForTrade = watch("isForTrade");
  const isForSale = watch("isForSale");

  const onSubmit = async (data) => {
    setImagesTouched(true);

    if (images.length === 0) {
      toast.error("Please add at least one PNG image before submitting.");
      return;
    }
    if (!isForSale && !isForRent && !isForTrade) {
      toast.error("Select at least one listing type (Sale, Rent, or Trade).");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // --- Core fields ---
      formData.append("title", data.title.trim());
      formData.append("description", data.description.trim());
      formData.append("brand", data.brand.trim());
      formData.append("model", data.model.trim());
      formData.append("year", data.year);
      formData.append("price", data.price);
      formData.append("category", data.category);
      formData.append("condition", data.condition);
      formData.append("color", data.color?.trim() || "");
      formData.append("mileage", data.mileage || 0);
      formData.append("engineCapacity", data.engineCapacity);

      // --- Listing type ---
      formData.append("isForSale", String(!!isForSale));
      formData.append("isForRent", String(!!isForRent));
      formData.append("isForTrade", String(!!isForTrade));

      // --- Location (must be a JSON string per backend controller) ---
      const location = {
        city: data.city.trim(),
        state: data.state.trim(),
        country: (data.country || "India").trim(),
        pincode: data.pincode?.trim() || "",
      };
      formData.append("location", JSON.stringify(location));

      // --- Specifications (JSON string) ---
      const specs = {
        fuelType: data.fuelType || "",
        transmissionType: data.transmissionType || "",
        topSpeed: data.topSpeed ? Number(data.topSpeed) : null,
        maxPower: data.maxPower?.trim() || "",
        torque: data.torque?.trim() || "",
        registrationNumber: data.registrationNumber?.trim() || "",
      };
      formData.append("specs", JSON.stringify(specs));

      // --- Rental details (JSON string, only when relevant) ---
      if (isForRent) {
        const rentalDetails = {
          pricePerDay: data.pricePerDay ? Number(data.pricePerDay) : null,
          pricePerWeek: data.pricePerWeek ? Number(data.pricePerWeek) : null,
          pricePerMonth: data.pricePerMonth ? Number(data.pricePerMonth) : null,
          securityDeposit: data.securityDeposit ? Number(data.securityDeposit) : null,
          minDuration: data.minDuration ? Number(data.minDuration) : 1,
          maxDuration: data.maxDuration ? Number(data.maxDuration) : 30,
          terms: data.rentalTerms?.trim() || "",
        };
        formData.append("rentalDetails", JSON.stringify(rentalDetails));
      }

      // --- Trade details (JSON string, only when relevant) ---
      if (isForTrade) {
        const tradeDetails = {
          preferredBrands: (data.preferredBrands || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          preferredCategories: (data.preferredCategories || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          conditions: data.tradeConditions?.trim() || "",
          estimatedTradeValue: data.estimatedTradeValue
            ? Number(data.estimatedTradeValue)
            : null,
        };
        formData.append("tradeDetails", JSON.stringify(tradeDetails));
      }

      // --- Images (field name "images" — required by uploadBikeImages middleware) ---
      // images[0] is always the featured image (enforced by BikeImageUploader).
      images.forEach((img) => formData.append("images", img.file));

      await axiosClient.post("/api/bikes", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });

      toast.success("Bike listing created successfully. Waiting for admin approval.");
      navigate("/my-bikes");
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to create bike listing";
      toast.error(message);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <Layout>
      <br />
      <br />
      <br />
      <br />
      <main className="wrap max-w-4xl mx-auto px-4 pb-20">
        <Link
          to="/bikes"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 mb-4"
        >
          <FiChevronLeft /> Back to Bikes
        </Link>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Sell, rent or trade
          </p>
          <br></br>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
            Create a Bike Listing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Fill in the details below. Your listing will be reviewed by an admin before it
            goes live.
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-10"
        >
          {/* ---------------- Images ---------------- */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4" style={{
                letterSpacing: "1px",
                wordSpacing: "2px",
              }}>
              <FiTag className="text-emerald-600" /> Photos
            </h2>
            <br></br>
            <BikeImageUploader images={images} onChange={setImages} disabled={submitting} />
            {imagesTouched && images.length === 0 && (
              <p className="mt-2 text-xs text-red-600">At least one image is required.</p>
            )}
          </section>

          {/* ---------------- Basic details ---------------- */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4" style={{
                letterSpacing: "1px",
                wordSpacing: "2px",
              }}>
              <FiTag className="text-emerald-600" /> Basic details
            </h2>
            <br></br>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Title" required error={errors.title}>
                  <input
                    className={inputClasses(errors.title)}
                    placeholder="e.g. 2022 Royal Enfield Classic 350"
                    disabled={submitting}
                    {...register("title", {
                      required: "Title is required",
                      maxLength: { value: 100, message: "Max 100 characters" },
                    })}
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Description" required error={errors.description}>
                  <textarea
                    rows={4}
                    className={inputClasses(errors.description)}
                    placeholder="Describe condition, history, upgrades, and why it's a great ride…"
                    disabled={submitting}
                    {...register("description", {
                      required: "Description is required",
                      maxLength: { value: 2000, message: "Max 2000 characters" },
                    })}
                  />
                </Field>
              </div>

              <Field label="Brand" required error={errors.brand}>
                <input
                  className={inputClasses(errors.brand)}
                  placeholder="e.g. Royal Enfield"
                  disabled={submitting}
                  {...register("brand", { required: "Brand is required" })}
                />
              </Field>

              <Field label="Model" required error={errors.model}>
                <input
                  className={inputClasses(errors.model)}
                  placeholder="e.g. Classic 350"
                  disabled={submitting}
                  {...register("model", { required: "Model is required" })}
                />
              </Field>

              <Field label="Year" required error={errors.year}>
                <input
                  type="number"
                  className={inputClasses(errors.year)}
                  placeholder="e.g. 2022"
                  disabled={submitting}
                  {...register("year", {
                    required: "Year is required",
                    min: { value: 1900, message: "Enter a valid year" },
                    max: { value: currentYear + 1, message: "Enter a valid year" },
                  })}
                />
              </Field>

              <Field label="Price (₹)" required error={errors.price}>
                <input
                  type="number"
                  className={inputClasses(errors.price)}
                  placeholder="e.g. 185000"
                  disabled={submitting}
                  {...register("price", {
                    required: "Price is required",
                    min: { value: 0, message: "Price cannot be negative" },
                  })}
                />
              </Field>

              <Field label="Category" required error={errors.category}>
                <select
                  className={inputClasses(errors.category)}
                  disabled={submitting}
                  defaultValue=""
                  {...register("category", { required: "Category is required" })}
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Condition" required error={errors.condition}>
                <select
                  className={inputClasses(errors.condition)}
                  disabled={submitting}
                  defaultValue=""
                  {...register("condition", { required: "Condition is required" })}
                >
                  <option value="" disabled>
                    Select condition
                  </option>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Color" error={errors.color}>
                <input
                  className={inputClasses(errors.color)}
                  placeholder="e.g. Stealth Black"
                  disabled={submitting}
                  {...register("color")}
                />
              </Field>

              <Field label="Mileage (km)" error={errors.mileage}>
                <input
                  type="number"
                  className={inputClasses(errors.mileage)}
                  placeholder="e.g. 12000"
                  disabled={submitting}
                  {...register("mileage", {
                    min: { value: 0, message: "Mileage cannot be negative" },
                  })}
                />
              </Field>

              <Field label="Engine Capacity (cc)" required error={errors.engineCapacity}>
                <input
                  type="number"
                  className={inputClasses(errors.engineCapacity)}
                  placeholder="e.g. 349"
                  disabled={submitting}
                  {...register("engineCapacity", {
                    required: "Engine capacity is required",
                    min: { value: 50, message: "Must be at least 50cc" },
                  })}
                />
              </Field>
            </div>
          </section>

          {/* ---------------- Location ---------------- */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4" style={{
                letterSpacing: "1px",
                wordSpacing: "2px",
              }}>
              <FiMapPin className="text-emerald-600" /> Location
            </h2>
            <br></br>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="City" required error={errors.city}>
                <input
                  className={inputClasses(errors.city)}
                  placeholder="e.g. Jalandhar"
                  disabled={submitting}
                  {...register("city", { required: "City is required" })}
                />
              </Field>
              <Field label="State" required error={errors.state}>
                <input
                  className={inputClasses(errors.state)}
                  placeholder="e.g. Punjab"
                  disabled={submitting}
                  {...register("state", { required: "State is required" })}
                />
              </Field>
              <Field label="Country" error={errors.country}>
                <input
                  className={inputClasses(errors.country)}
                  placeholder="e.g. India"
                  disabled={submitting}
                  {...register("country")}
                />
              </Field>
              <Field
                label="Address / Pincode"
                error={errors.pincode}
              >
                <input
                  className={inputClasses(errors.pincode)}
                  placeholder="e.g. 144001"
                  disabled={submitting}
                  {...register("pincode")}
                />
              </Field>
            </div>
          </section>

          {/* ---------------- Listing type ---------------- */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4" style={{
                letterSpacing: "1px",
                wordSpacing: "2px",
              }}>
              <FiRepeat className="text-emerald-600" /> Listing type
            </h2>
            <br></br>
            <p className="text-xs text-gray-500 mb-3">Select one or more.</p>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm cursor-pointer has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                <input
                  type="checkbox"
                  disabled={submitting}
                  {...register("isForSale")}
                />
                For Sale
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm cursor-pointer has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                <input
                  type="checkbox"
                  disabled={submitting}
                  {...register("isForRent")}
                />
                For Rent
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm cursor-pointer has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                <input
                  type="checkbox"
                  disabled={submitting}
                  {...register("isForTrade")}
                />
                For Trade
              </label>
            </div>
          </section>

          {/* ---------------- Specifications ---------------- */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4" style={{
                letterSpacing: "1px",
                wordSpacing: "2px",
              }}>
              <FiSliders className="text-emerald-600" /> Specifications
            </h2>
            <br></br>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Fuel Type" error={errors.fuelType}>
                <select
                  className={inputClasses(errors.fuelType)}
                  disabled={submitting}
                  {...register("fuelType")}
                >
                  {FUEL_TYPES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Transmission" error={errors.transmissionType}>
                <select
                  className={inputClasses(errors.transmissionType)}
                  disabled={submitting}
                  {...register("transmissionType")}
                >
                  {TRANSMISSION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Top Speed (km/h)" error={errors.topSpeed}>
                <input
                  type="number"
                  className={inputClasses(errors.topSpeed)}
                  placeholder="e.g. 130"
                  disabled={submitting}
                  {...register("topSpeed")}
                />
              </Field>
              <Field label="Horse Power" error={errors.maxPower}>
                <input
                  className={inputClasses(errors.maxPower)}
                  placeholder="e.g. 20.2 bhp @ 6100 rpm"
                  disabled={submitting}
                  {...register("maxPower")}
                />
              </Field>
              <Field label="Torque" error={errors.torque}>
                <input
                  className={inputClasses(errors.torque)}
                  placeholder="e.g. 27 Nm @ 4000 rpm"
                  disabled={submitting}
                  {...register("torque")}
                />
              </Field>
              <Field
                label="Registration Year"
                error={errors.registrationNumber}
                hint="Stored in the backend's specs.registrationNumber field"
              >
                <input
                  className={inputClasses(errors.registrationNumber)}
                  placeholder="e.g. 2022"
                  disabled={submitting}
                  {...register("registrationNumber")}
                />
              </Field>
            </div>
          </section>

          {/* ---------------- Rental details ---------------- */}
          {isForRent && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 md:p-6 shadow-sm"
            >
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
                <FiKey className="text-emerald-600" /> Rental details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Price per day (₹)">
                  <input
                    type="number"
                    className={inputClasses()}
                    disabled={submitting}
                    {...register("pricePerDay")}
                  />
                </Field>
                <Field label="Price per week (₹)">
                  <input
                    type="number"
                    className={inputClasses()}
                    disabled={submitting}
                    {...register("pricePerWeek")}
                  />
                </Field>
                <Field label="Price per month (₹)">
                  <input
                    type="number"
                    className={inputClasses()}
                    disabled={submitting}
                    {...register("pricePerMonth")}
                  />
                </Field>
                <Field label="Security deposit (₹)">
                  <input
                    type="number"
                    className={inputClasses()}
                    disabled={submitting}
                    {...register("securityDeposit")}
                  />
                </Field>
                <Field label="Minimum duration (days)">
                  <input
                    type="number"
                    className={inputClasses()}
                    disabled={submitting}
                    {...register("minDuration")}
                  />
                </Field>
                <Field label="Maximum duration (days)">
                  <input
                    type="number"
                    className={inputClasses()}
                    disabled={submitting}
                    {...register("maxDuration")}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Rental terms">
                    <textarea
                      rows={3}
                      className={inputClasses()}
                      placeholder="Helmet included, fuel not included, valid ID required…"
                      disabled={submitting}
                      {...register("rentalTerms")}
                    />
                  </Field>
                </div>
              </div>
            </motion.section>
          )}

          {/* ---------------- Trade details ---------------- */}
          {isForTrade && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 md:p-6 shadow-sm"
            >
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
                <FiRepeat className="text-amber-600" /> Trade details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Preferred brands" hint="Comma-separated, e.g. Honda, Yamaha">
                  <input
                    className={inputClasses()}
                    placeholder="Honda, Yamaha, KTM"
                    disabled={submitting}
                    {...register("preferredBrands")}
                  />
                </Field>
                <Field
                  label="Preferred categories"
                  hint="Comma-separated, e.g. Sport, Cruiser"
                >
                  <input
                    className={inputClasses()}
                    placeholder="Sport, Cruiser"
                    disabled={submitting}
                    {...register("preferredCategories")}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Preferred condition of traded bike">
                    <input
                      className={inputClasses()}
                      placeholder="e.g. Good or better, low mileage"
                      disabled={submitting}
                      {...register("tradeConditions")}
                    />
                  </Field>
                </div>
                <Field label="Estimated trade value (₹)">
                  <input
                    type="number"
                    className={inputClasses()}
                    disabled={submitting}
                    {...register("estimatedTradeValue")}
                  />
                </Field>
              </div>
            </motion.section>
          )}

          {/* ---------------- Submit ---------------- */}
          <div className="sticky bottom-4 z-10">
            <div className="rounded-2xl border border-gray-200 bg-white/95 backdrop-blur p-4 shadow-lg flex flex-col gap-3">
              {submitting && (
                <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-mint w-full flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <FiLoader className="animate-spin" />
                    {uploadProgress > 0 && uploadProgress < 100
                      ? `Uploading… ${uploadProgress}%`
                      : "Creating listing…"}
                  </>
                ) : (
                  "Create Bike Listing"
                )}
              </button>
            </div>
          </div>
        </motion.form>
      </main>
    </Layout>
  );
}
