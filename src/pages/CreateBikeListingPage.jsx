import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Layout";
import AddressManagement from "../components/AddressManagement";
import { API_BASE_URL, getAuthToken } from "../lib/api";
import "./CreateBikeListingPage.css";

const configuredApi = String(API_BASE_URL || "https://veloir-backend.onrender.com").replace(/\/$/, "");
const API_ORIGIN = configuredApi.endsWith("/api") ? configuredApi.slice(0, -4) : configuredApi;
const apiUrl = (path) => `${API_ORIGIN}${path.startsWith("/api") ? path : `/api${path}`}`;

const INITIAL_FORM = {
  title: "", description: "", brand: "", model: "", year: String(new Date().getFullYear()),
  price: "", category: "Sport", condition: "Good", mileage: "", engineCapacity: "", color: "",
  isForSale: true, isForRent: false, isForTrade: false,
  fuelType: "Petrol", transmissionType: "Manual", topSpeed: "", maxPower: "", torque: "", weight: "", fuelTankCapacity: "",
  rentalDetails: { pricePerDay: "", pricePerWeek: "", pricePerMonth: "", securityDeposit: "", minDuration: "1", maxDuration: "30", terms: "" },
  tradeDetails: { preferredBrands: "", preferredCategories: "", conditions: "", estimatedTradeValue: "" },
  location: { fullAddress: "", formattedAddress: "", city: "", state: "", country: "India", countryCode: "IN", postalCode: "", latitude: null, longitude: null, placeId: "" },
  manualDocuments: { vehicleRegistrationNumber: "", drivingLicenceNumber: "", rcOwnerName: "", rcRegistrationDate: "", rcRto: "", rcVehicleClass: "Motorcycle", rcVehicleMake: "", rcVehicleModel: "" },
};

const SECTIONS = [
  { title: "Bike details", description: "Tell buyers about the motorcycle." },
  { title: "Listing options", description: "Choose how it can be listed and add specifications." },
  { title: "Location", description: "Set the listing's location or select an autocomplete result." },
  { title: "RC & licence", description: "Enter the details for confidential manual review." },
  { title: "Photos & review", description: "Add images and confirm your listing details." },
];

function formatApiError(payload, fallback) {
  if (payload?.errors && typeof payload.errors === "object") {
    return Object.values(payload.errors).filter(Boolean).join(" ");
  }
  return payload?.message || fallback;
}

function MaskedField({ label, value, onChange, name, placeholder, required = true, help, inputMode = "text" }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="cbl-field">
      <span>{label}{required ? <b aria-hidden="true"> *</b> : null}</span>
      <div className="cbl-secret-input">
        <input
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          inputMode={inputMode}
          maxLength={25}
        />
        <button type="button" className="cbl-show-secret" onClick={() => setVisible((state) => !state)} aria-label={`${visible ? "Hide" : "Show"} ${label}`}>
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {help ? <small>{help}</small> : null}
    </label>
  );
}

export default function CreateBikeListingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [activeSection, setActiveSection] = useState(0);
  const [completedSections, setCompletedSections] = useState([]);
  const [sectionErrors, setSectionErrors] = useState({});
  const [images, setImages] = useState([]);
  const [locationMessage, setLocationMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submission, setSubmission] = useState(null);
  const [documentConsent, setDocumentConsent] = useState(false);
  const previewUrls = useRef([]);

  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const update = (field, value) => {
    const sectionIndex = ["title", "description", "brand", "model", "year", "price", "category", "condition", "mileage", "engineCapacity", "color"].includes(field) ? 0 : 1;
    setCompletedSections((prev) => prev.filter((section) => section < sectionIndex));
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const updateNested = (group, field, value) => {
    const sectionIndex = group === "location" ? 2 : group === "manualDocuments" ? 3 : 1;
    setCompletedSections((prev) => prev.filter((section) => section < sectionIndex));
    setForm((prev) => ({ ...prev, [group]: { ...prev[group], [field]: value } }));
  };

  const handleUseAddress = (address) => {
    setForm((previous) => ({
      ...previous,
      location: {
        ...previous.location,
        fullAddress: address.fullAddress || address.formattedAddress || address.label || "",
        formattedAddress: address.formattedAddress || address.label || address.fullAddress || "",
        city: address.city || "",
        state: address.state || "",
        country: address.country || "India",
        countryCode: address.countryCode || "IN",
        postalCode: address.postalCode || address.pincode || "",
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
        placeId: address.placeId || address.id || "",
      },
    }));
    setCompletedSections((previous) => previous.filter((section) => section < 2));
    setSectionErrors((previous) => ({ ...previous, 2: "" }));
    setLocationMessage("Address selected. Confirm the details in the listing summary before submitting.");
  };

  const validateSection = (sectionIndex) => {
    const errors = [];
    const required = (value, label) => { if (value === undefined || value === null || String(value).trim() === "") errors.push(`${label} is required.`); };
    if (sectionIndex === 0) {
      [
        [form.title, "Title"], [form.description, "Description"], [form.brand, "Brand"], [form.model, "Model"],
        [form.year, "Year"], [form.price, "Price"], [form.category, "Category"], [form.condition, "Condition"], [form.engineCapacity, "Engine capacity"],
      ].forEach(([value, label]) => required(value, label));
      if (form.title.trim().length > 100) errors.push("Title must be no longer than 100 characters.");
      if (form.description.trim().length < 20 || form.description.length > 2000) errors.push("Description must be 20–2000 characters.");
      if (Number(form.year) < 1950 || Number(form.year) > new Date().getFullYear() + 1) errors.push("Enter a valid model year.");
      if (!(Number(form.price) > 0)) errors.push("Price must be greater than zero.");
      if (form.mileage !== "" && Number(form.mileage) < 0) errors.push("Mileage cannot be negative.");
      if (!(Number(form.engineCapacity) >= 50)) errors.push("Engine capacity must be at least 50cc.");
    } else if (sectionIndex === 1) {
      if (!form.isForSale && !form.isForRent && !form.isForTrade) errors.push("Choose at least one listing option.");
      if (form.isForRent && !(Number(form.rentalDetails.pricePerDay) > 0)) errors.push("Enter a daily rental price greater than zero.");
      if (form.isForRent && Number(form.rentalDetails.minDuration) > Number(form.rentalDetails.maxDuration)) errors.push("Minimum rental duration cannot exceed maximum duration.");
      if (form.topSpeed !== "" && Number(form.topSpeed) <= 0) errors.push("Top speed must be positive.");
      if (form.fuelTankCapacity !== "" && Number(form.fuelTankCapacity) < 0) errors.push("Fuel tank capacity cannot be negative.");
    } else if (sectionIndex === 2) {
      required(form.location.fullAddress, "Address or location");
      required(form.location.city, "City");
      required(form.location.state, "State");
      required(form.location.country, "Country");
      required(form.location.postalCode, "Postal / PIN code");
      if (form.location.fullAddress.trim().length < 4) errors.push("Enter at least 4 characters for the address.");
    } else if (sectionIndex === 3) {
      const docs = form.manualDocuments;
      required(docs.vehicleRegistrationNumber, "Vehicle registration number");
      required(docs.drivingLicenceNumber, "Driving licence number");
      required(docs.rcOwnerName, "Registered owner's name");
      required(docs.rcRegistrationDate, "RC registration date");
      required(docs.rcRto, "Registering RTO");
      required(docs.rcVehicleClass, "Vehicle class");
      required(docs.rcVehicleMake, "RC make");
      required(docs.rcVehicleModel, "RC model");
      if (!/^[A-Z0-9/-]{5,20}$/.test(docs.vehicleRegistrationNumber.replace(/\s+/g, "").toUpperCase())) errors.push("Vehicle registration number must contain 5–20 letters/numbers.");
      if (!/^[A-Z0-9/-]{8,25}$/.test(docs.drivingLicenceNumber.replace(/\s+/g, "").toUpperCase())) errors.push("Driving licence number must contain 8–25 letters/numbers.");
      if (docs.rcRegistrationDate && new Date(`${docs.rcRegistrationDate}T00:00:00`) > new Date()) errors.push("RC registration date cannot be in the future.");
      if (docs.rcOwnerName.trim().length < 2) errors.push("Enter the full registered owner's name.");
      if (!documentConsent) errors.push("Confirm that the document details are accurate before continuing.");
    } else if (sectionIndex === 4) {
      if (images.length < 1) errors.push("Upload at least one bike image.");
      if (images.length > 5) errors.push("You can upload up to five images.");
    }
    const message = errors.join(" ");
    setSectionErrors((prev) => ({ ...prev, [sectionIndex]: message }));
    return errors.length === 0;
  };

  const goNext = () => {
    setSubmitError("");
    if (!validateSection(activeSection)) return;
    setCompletedSections((prev) => prev.includes(activeSection) ? prev : [...prev, activeSection]);
    setActiveSection((prev) => Math.min(SECTIONS.length - 1, prev + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToSection = (index) => {
    if (index > activeSection && !completedSections.includes(index - 1)) return;
    setActiveSection(index);
    setSubmitError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImages = (event) => {
    const chosen = Array.from(event.target.files || []);
    event.target.value = "";
    const all = [...images, ...chosen];
    if (all.length > 5) {
      setSectionErrors((prev) => ({ ...prev, 4: "You can upload up to five images." }));
      return;
    }
    const oversized = chosen.find((file) => file.size > 5 * 1024 * 1024);
    if (oversized) {
      setSectionErrors((prev) => ({ ...prev, 4: `${oversized.name} is larger than 5 MB.` }));
      return;
    }
    const invalid = chosen.find((file) => !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type));
    if (invalid) {
      setSectionErrors((prev) => ({ ...prev, 4: "Use JPEG, PNG, WEBP or AVIF images." }));
      return;
    }
    const mapped = chosen.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.push(preview);
      return { file, preview, id: `${file.name}-${file.lastModified}-${Math.random()}` };
    });
    setImages([...images, ...mapped]);
    setCompletedSections((prev) => prev.filter((section) => section < 4));
    setSectionErrors((prev) => ({ ...prev, 4: "" }));
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const removed = prev.find((image) => image.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((image) => image.id !== id);
    });
    setCompletedSections((prev) => prev.filter((section) => section < 4));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    for (let index = 0; index < SECTIONS.length; index += 1) {
      if (!validateSection(index)) {
        setActiveSection(index);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    const token = getAuthToken();
    if (!token) {
      setSubmitError("Your sign-in session could not be found. Please sign in again and retry.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    const body = new FormData();
    body.append("title", form.title.trim());
    body.append("description", form.description.trim());
    body.append("brand", form.brand.trim());
    body.append("model", form.model.trim());
    body.append("year", form.year);
    body.append("price", form.price);
    body.append("category", form.category);
    body.append("condition", form.condition);
    body.append("mileage", form.mileage || "0");
    body.append("engineCapacity", form.engineCapacity);
    body.append("color", form.color.trim());
    body.append("isForSale", String(form.isForSale));
    body.append("isForRent", String(form.isForRent));
    body.append("isForTrade", String(form.isForTrade));
    body.append("location", JSON.stringify({
      ...form.location,
      pincode: form.location.postalCode,
    }));
    body.append("specs", JSON.stringify({
      fuelType: form.fuelType,
      transmissionType: form.transmissionType,
      topSpeed: form.topSpeed ? Number(form.topSpeed) : null,
      maxPower: form.maxPower,
      torque: form.torque,
      weight: form.weight ? Number(form.weight) : null,
      fuelTankCapacity: form.fuelTankCapacity ? Number(form.fuelTankCapacity) : null,
    }));
    body.append("manualDocuments", JSON.stringify({
      ...form.manualDocuments,
      vehicleRegistrationNumber: form.manualDocuments.vehicleRegistrationNumber.trim().toUpperCase(),
      drivingLicenceNumber: form.manualDocuments.drivingLicenceNumber.trim().toUpperCase(),
    }));
    if (form.isForRent) body.append("rentalDetails", JSON.stringify({
      ...form.rentalDetails,
      pricePerDay: Number(form.rentalDetails.pricePerDay),
      pricePerWeek: form.rentalDetails.pricePerWeek ? Number(form.rentalDetails.pricePerWeek) : null,
      pricePerMonth: form.rentalDetails.pricePerMonth ? Number(form.rentalDetails.pricePerMonth) : null,
      securityDeposit: form.rentalDetails.securityDeposit ? Number(form.rentalDetails.securityDeposit) : null,
      minDuration: Number(form.rentalDetails.minDuration || 1),
      maxDuration: Number(form.rentalDetails.maxDuration || 30),
    }));
    if (form.isForTrade) body.append("tradeDetails", JSON.stringify({
      ...form.tradeDetails,
      preferredBrands: form.tradeDetails.preferredBrands.split(",").map((item) => item.trim()).filter(Boolean),
      preferredCategories: form.tradeDetails.preferredCategories.split(",").map((item) => item.trim()).filter(Boolean),
      estimatedTradeValue: form.tradeDetails.estimatedTradeValue ? Number(form.tradeDetails.estimatedTradeValue) : null,
    }));
    images.forEach(({ file }) => body.append("images", file));

    try {
      const response = await fetch(apiUrl("/api/bikes"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(formatApiError(payload, "Unable to create the listing. Please review your entries."));
      setSubmission(payload);
      // Drop sensitive document values from React state immediately after a successful submission.
      setForm((prev) => ({
        ...prev,
        manualDocuments: {
          vehicleRegistrationNumber: "",
          drivingLicenceNumber: "",
          rcOwnerName: "",
          rcRegistrationDate: "",
          rcRto: "",
          rcVehicleClass: "Motorcycle",
          rcVehicleMake: "",
          rcVehicleModel: "",
        },
      }));
      setDocumentConsent(false);
      setCompletedSections([0, 1, 2, 3, 4]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(error.message || "Failed to submit listing. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const summaryLocation = useMemo(() => [form.location.fullAddress, form.location.city, form.location.state, form.location.postalCode, form.location.country].filter(Boolean).join(", "), [form.location.fullAddress, form.location.city, form.location.state, form.location.postalCode, form.location.country]);

  if (submission) {
    return (
      <main className="cbl-page">
        <div className="cbl-brand-bar"><Logo /></div>
        <section className="cbl-success" aria-live="polite">
          <div className="cbl-success-mark">✓</div>
          <p className="cbl-kicker">Listing submitted</p>
          <h1>Your bike is in review.</h1>
          <p>{submission.message || "Your listing was submitted successfully."}</p>
          <div className="cbl-review-status">
            <strong>Document review: Pending</strong>
            <span>Registration: {submission.documentReview?.registrationNumberMasked || "••••••"}</span>
            <span>Driving licence: {submission.documentReview?.drivingLicenceMasked || "••••••"}</span>
          </div>
          <p className="cbl-security-note">Your full document values are not shown here or included in the public listing response.</p>
          <div className="cbl-success-actions">
            <Link className="cbl-primary-btn" to="/my-bikes">View my listings</Link>
            <button className="cbl-secondary-btn" type="button" onClick={() => navigate("/bikes")}>Browse bikes</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="cbl-page">
      <div className="cbl-brand-bar"><Logo /></div>
      <div className="cbl-heading">
        <div>
          <p className="cbl-kicker">Sell, rent or trade</p>
          <h1>Create a bike listing</h1>
          <p>Complete each step. Your entries stay in this form as you move back and forth.</p>
        </div>
        <Link className="cbl-back-link" to="/my-bikes">Back to my bikes</Link>
      </div>

      <div className="cbl-progress-top">
        <div className="cbl-progress-label"><span>Step {activeSection + 1} of {SECTIONS.length}</span><strong>{Math.round(((activeSection + (completedSections.includes(activeSection) ? 1 : 0)) / SECTIONS.length) * 100)}% complete</strong></div>
        <div className="cbl-progress-track"><span style={{ width: `${((activeSection + 1) / SECTIONS.length) * 100}%` }} /></div>
      </div>

      <nav className="cbl-step-nav" aria-label="Listing form progress">
        {SECTIONS.map((section, index) => {
          const isDone = completedSections.includes(index);
          const isLocked = index > activeSection && !completedSections.includes(index - 1);
          return (
            <button key={section.title} type="button" className={`cbl-step ${index === activeSection ? "is-active" : ""} ${isDone ? "is-complete" : ""}`} onClick={() => goToSection(index)} disabled={isLocked} aria-current={index === activeSection ? "step" : undefined}>
              <span className="cbl-step-number">{isDone ? "✓" : index + 1}</span>
              <span className="cbl-step-text"><strong>{section.title}</strong><small>{isDone ? "Completed" : isLocked ? "Locked" : "In progress"}</small></span>
            </button>
          );
        })}
      </nav>

      <form className="cbl-form" onSubmit={handleSubmit} noValidate>
        {submitError ? <div className="cbl-alert cbl-alert-error" role="alert">{submitError}</div> : null}
        {SECTIONS.map((section, index) => index === activeSection ? (
          <section key={section.title} className="cbl-section cbl-section-enter" aria-labelledby={`cbl-section-title-${index}`}>
            <div className="cbl-section-heading">
              <div><span className="cbl-section-index">0{index + 1}</span><h2 id={`cbl-section-title-${index}`}>{section.title}</h2></div>
              <p>{section.description}</p>
            </div>
            {sectionErrors[index] ? <div className="cbl-alert cbl-alert-error" role="alert">{sectionErrors[index]}</div> : null}

            {index === 0 ? <div className="cbl-grid">
              <label className="cbl-field cbl-span-2"><span>Listing title <b>*</b></span><input value={form.title} maxLength={100} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Honda CBR 650R 2024" /></label>
              <label className="cbl-field cbl-span-2"><span>Description <b>*</b></span><textarea value={form.description} maxLength={2000} rows={4} onChange={(e) => update("description", e.target.value)} placeholder="Describe condition, service history, accessories and other useful details." /><small>{form.description.length}/2000 characters (minimum 20)</small></label>
              <label className="cbl-field"><span>Brand <b>*</b></span><input value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="e.g. Honda" /></label>
              <label className="cbl-field"><span>Model <b>*</b></span><input value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="e.g. CBR 650R" /></label>
              <label className="cbl-field"><span>Year <b>*</b></span><input type="number" min="1950" max={new Date().getFullYear() + 1} value={form.year} onChange={(e) => update("year", e.target.value)} /></label>
              <label className="cbl-field"><span>Price (₹) <b>*</b></span><input type="number" min="1" value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="850000" /></label>
              <label className="cbl-field"><span>Category <b>*</b></span><select value={form.category} onChange={(e) => update("category", e.target.value)}>{["Sport", "Cruiser", "Touring", "Adventure", "Off-Road", "Scooter", "Electric", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="cbl-field"><span>Condition <b>*</b></span><select value={form.condition} onChange={(e) => update("condition", e.target.value)}>{["New", "Like New", "Excellent", "Good", "Fair", "Needs Work"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="cbl-field"><span>Mileage (km)</span><input type="number" min="0" value={form.mileage} onChange={(e) => update("mileage", e.target.value)} placeholder="e.g. 5000" /></label>
              <label className="cbl-field"><span>Engine capacity (cc) <b>*</b></span><input type="number" min="50" value={form.engineCapacity} onChange={(e) => update("engineCapacity", e.target.value)} placeholder="e.g. 649" /></label>
              <label className="cbl-field"><span>Colour</span><input value={form.color} onChange={(e) => update("color", e.target.value)} placeholder="e.g. Red" /></label>
            </div> : null}

            {index === 1 ? <div className="cbl-stack">
              <div className="cbl-option-grid">
                <label className={`cbl-option-card ${form.isForSale ? "selected" : ""}`}><input type="checkbox" checked={form.isForSale} onChange={(e) => update("isForSale", e.target.checked)} /><span><strong>Buy / Sell</strong><small>List the bike for sale.</small></span></label>
                <label className={`cbl-option-card ${form.isForRent ? "selected" : ""}`}><input type="checkbox" checked={form.isForRent} onChange={(e) => update("isForRent", e.target.checked)} /><span><strong>Rent</strong><small>Offer the bike for rental.</small></span></label>
                <label className={`cbl-option-card ${form.isForTrade ? "selected" : ""}`}><input type="checkbox" checked={form.isForTrade} onChange={(e) => update("isForTrade", e.target.checked)} /><span><strong>Trade</strong><small>Consider exchange offers.</small></span></label>
              </div>
              {form.isForRent ? <div className="cbl-subpanel"><h3>Rental details</h3><div className="cbl-grid">
                <label className="cbl-field"><span>Price per day (₹) <b>*</b></span><input type="number" min="1" value={form.rentalDetails.pricePerDay} onChange={(e) => updateNested("rentalDetails", "pricePerDay", e.target.value)} /></label>
                <label className="cbl-field"><span>Price per week (₹)</span><input type="number" min="0" value={form.rentalDetails.pricePerWeek} onChange={(e) => updateNested("rentalDetails", "pricePerWeek", e.target.value)} /></label>
                <label className="cbl-field"><span>Price per month (₹)</span><input type="number" min="0" value={form.rentalDetails.pricePerMonth} onChange={(e) => updateNested("rentalDetails", "pricePerMonth", e.target.value)} /></label>
                <label className="cbl-field"><span>Security deposit (₹)</span><input type="number" min="0" value={form.rentalDetails.securityDeposit} onChange={(e) => updateNested("rentalDetails", "securityDeposit", e.target.value)} /></label>
                <label className="cbl-field"><span>Minimum duration (days)</span><input type="number" min="1" value={form.rentalDetails.minDuration} onChange={(e) => updateNested("rentalDetails", "minDuration", e.target.value)} /></label>
                <label className="cbl-field"><span>Maximum duration (days)</span><input type="number" min="1" value={form.rentalDetails.maxDuration} onChange={(e) => updateNested("rentalDetails", "maxDuration", e.target.value)} /></label>
                <label className="cbl-field cbl-span-2"><span>Rental terms</span><textarea rows={2} value={form.rentalDetails.terms} onChange={(e) => updateNested("rentalDetails", "terms", e.target.value)} placeholder="Optional rental conditions" /></label>
              </div></div> : null}
              {form.isForTrade ? <div className="cbl-subpanel"><h3>Trade preferences</h3><div className="cbl-grid">
                <label className="cbl-field"><span>Preferred brands</span><input value={form.tradeDetails.preferredBrands} onChange={(e) => updateNested("tradeDetails", "preferredBrands", e.target.value)} placeholder="Comma-separated" /></label>
                <label className="cbl-field"><span>Preferred categories</span><input value={form.tradeDetails.preferredCategories} onChange={(e) => updateNested("tradeDetails", "preferredCategories", e.target.value)} placeholder="Comma-separated" /></label>
                <label className="cbl-field"><span>Estimated trade value (₹)</span><input type="number" min="0" value={form.tradeDetails.estimatedTradeValue} onChange={(e) => updateNested("tradeDetails", "estimatedTradeValue", e.target.value)} /></label>
                <label className="cbl-field"><span>Trade conditions</span><input value={form.tradeDetails.conditions} onChange={(e) => updateNested("tradeDetails", "conditions", e.target.value)} /></label>
              </div></div> : null}
              <div className="cbl-subpanel"><h3>Specifications</h3><div className="cbl-grid">
                <label className="cbl-field"><span>Fuel type</span><select value={form.fuelType} onChange={(e) => update("fuelType", e.target.value)}>{["Petrol", "Diesel", "Electric", "Hybrid"].map((v) => <option key={v}>{v}</option>)}</select></label>
                <label className="cbl-field"><span>Transmission</span><select value={form.transmissionType} onChange={(e) => update("transmissionType", e.target.value)}>{["Manual", "Automatic", "Semi-Automatic"].map((v) => <option key={v}>{v}</option>)}</select></label>
                <label className="cbl-field"><span>Top speed (km/h)</span><input type="number" min="1" value={form.topSpeed} onChange={(e) => update("topSpeed", e.target.value)} /></label>
                <label className="cbl-field"><span>Max power</span><input value={form.maxPower} onChange={(e) => update("maxPower", e.target.value)} placeholder="e.g. 93 HP" /></label>
                <label className="cbl-field"><span>Torque</span><input value={form.torque} onChange={(e) => update("torque", e.target.value)} placeholder="e.g. 64 Nm" /></label>
                <label className="cbl-field"><span>Weight (kg)</span><input type="number" min="0" value={form.weight} onChange={(e) => update("weight", e.target.value)} /></label>
                <label className="cbl-field"><span>Fuel tank capacity (L)</span><input type="number" min="0" value={form.fuelTankCapacity} onChange={(e) => update("fuelTankCapacity", e.target.value)} /></label>
              </div></div>
            </div> : null}

            {index === 2 ? <div className="cbl-stack">
              <AddressManagement mode="listing" onUseAddress={handleUseAddress} />
              {locationMessage ? <p className="cbl-location-selected-message" role="status">{locationMessage}</p> : null}
              <div className="cbl-location-summary">
                <div><span className="cbl-location-summary-icon" aria-hidden="true">✓</span><div><strong>{form.location.fullAddress || form.location.formattedAddress || "No listing location selected yet"}</strong><small>{[form.location.city, form.location.state, form.location.postalCode, form.location.country].filter(Boolean).join(", ") || "Add, search for, or choose a location above."}</small></div></div>
                {form.location.latitude != null && form.location.longitude != null ? <small className="cbl-location-coordinates">Coordinates: {Number(form.location.latitude).toFixed(6)}, {Number(form.location.longitude).toFixed(6)}</small> : <small className="cbl-location-coordinates">Coordinates will be saved when a search result, saved address or map point with coordinates is selected.</small>}
              </div>
              <div className="cbl-privacy-note"><strong>Location privacy</strong><span>The selected address and coordinates are saved with this bike listing and may be displayed to marketplace users. Use an appropriate pickup or inspection location; avoid entering private access instructions.</span></div>
            </div> : null}

            {index === 3 ? <div className="cbl-stack">
              <div className="cbl-doc-warning"><strong>Confidential document entry</strong><p>Document numbers are encrypted before database storage and are masked in normal responses. Submitting them is a self-declaration only; an authorised reviewer must check the documents before they can be marked verified.</p></div>
              <div className="cbl-grid">
                <MaskedField label="Vehicle registration number" name="vehicleRegistrationNumber" value={form.manualDocuments.vehicleRegistrationNumber} onChange={(value) => updateNested("manualDocuments", "vehicleRegistrationNumber", value)} placeholder="e.g. PB10AB1234" help="Used to associate the RC with this bike." />
                <MaskedField label="Driving licence number" name="drivingLicenceNumber" value={form.manualDocuments.drivingLicenceNumber} onChange={(value) => updateNested("manualDocuments", "drivingLicenceNumber", value)} placeholder="Enter the licence number" help="Only an authorised manual reviewer can access the submitted value." />
                <label className="cbl-field"><span>Registered owner name <b>*</b></span><input value={form.manualDocuments.rcOwnerName} onChange={(e) => updateNested("manualDocuments", "rcOwnerName", e.target.value)} autoComplete="off" /></label>
                <label className="cbl-field"><span>RC registration date <b>*</b></span><input type="date" max={new Date().toISOString().slice(0, 10)} value={form.manualDocuments.rcRegistrationDate} onChange={(e) => updateNested("manualDocuments", "rcRegistrationDate", e.target.value)} /></label>
                <label className="cbl-field"><span>Registering RTO <b>*</b></span><input value={form.manualDocuments.rcRto} onChange={(e) => updateNested("manualDocuments", "rcRto", e.target.value)} placeholder="e.g. RTO Ludhiana" /></label>
                <label className="cbl-field"><span>Vehicle class <b>*</b></span><input value={form.manualDocuments.rcVehicleClass} onChange={(e) => updateNested("manualDocuments", "rcVehicleClass", e.target.value)} placeholder="e.g. Motorcycle" /></label>
                <label className="cbl-field"><span>Make shown on RC <b>*</b></span><input value={form.manualDocuments.rcVehicleMake} onChange={(e) => updateNested("manualDocuments", "rcVehicleMake", e.target.value)} /></label>
                <label className="cbl-field"><span>Model shown on RC <b>*</b></span><input value={form.manualDocuments.rcVehicleModel} onChange={(e) => updateNested("manualDocuments", "rcVehicleModel", e.target.value)} /></label>
              </div>
              <label className="cbl-consent"><input type="checkbox" checked={documentConsent} onChange={(e) => { setDocumentConsent(e.target.checked); setSectionErrors((prev) => ({ ...prev, 3: "" })); setCompletedSections((prev) => prev.filter((section) => section < 3)); }} /> <span>I confirm these details are accurate and agree to Veloir using them for listing-document review.</span></label>
            </div> : null}

            {index === 4 ? <div className="cbl-stack">
              <div className="cbl-upload-box"><div><strong>Upload bike photos</strong><p>Up to 5 images, max 5 MB each. The first selected image is the featured image.</p></div><label className="cbl-upload-btn">Choose images<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={handleImages} /></label></div>
              <div className="cbl-image-grid">{images.map((image, imageIndex) => <div key={image.id} className="cbl-image-card"><img src={image.preview} alt={`Bike upload ${imageIndex + 1}`} /><span>{imageIndex === 0 ? "Featured image" : `Image ${imageIndex + 1}`}</span><button type="button" onClick={() => removeImage(image.id)} aria-label={`Remove image ${imageIndex + 1}`}>Remove</button></div>)}</div>
              <div className="cbl-review-card"><h3>Listing summary</h3><div><span>Bike</span><strong>{form.brand || "—"} {form.model}</strong></div><div><span>Year / condition</span><strong>{form.year} · {form.condition}</strong></div><div><span>Price</span><strong>{form.price ? `₹${Number(form.price).toLocaleString("en-IN")}` : "—"}</strong></div><div><span>Listing types</span><strong>{[form.isForSale && "Buy / sell", form.isForRent && "Rent", form.isForTrade && "Trade"].filter(Boolean).join(", ") || "Not selected"}</strong></div><div><span>Location</span><strong>{summaryLocation || "—"}</strong></div><div><span>RC</span><strong>{form.manualDocuments.vehicleRegistrationNumber ? `Entered · ${"•".repeat(Math.max(4, form.manualDocuments.vehicleRegistrationNumber.length - 4))}${form.manualDocuments.vehicleRegistrationNumber.slice(-4)}` : "Not entered"}</strong></div><p>After submission, your bike listing and document details enter separate review processes. Full document numbers are not displayed on this page after submission.</p></div>
            </div> : null}

            <div className="cbl-section-footer">
              <button type="button" className="cbl-secondary-btn" onClick={() => goToSection(activeSection - 1)} disabled={activeSection === 0}>Previous</button>
              {activeSection < SECTIONS.length - 1 ? <button type="button" className="cbl-primary-btn" onClick={goNext}>Save & continue <span aria-hidden="true">→</span></button> : <button type="submit" className="cbl-primary-btn" disabled={submitting}>{submitting ? "Submitting securely…" : "Submit listing for review"}</button>}
            </div>
          </section>
        ) : null)}
      </form>
      <p className="cbl-footnote">Your document identifiers are sent to the API over HTTPS in production and are never written to browser storage by this form. Do not use public/shared computers to submit documents.</p>
    </main>
  );
}
