import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  FiCheckCircle,
  FiChevronDown,
  FiEdit2,
  FiMapPin,
  FiNavigation,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { api } from "../lib/api";
import "leaflet/dist/leaflet.css";
import "./AddressManagement.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Configure Leaflet's marker assets for Vite builds.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const COUNTRY_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const DEFAULT_CENTER = [22.9734, 78.6569];

function handleExpiredSession(error) {
  const unauthorized = error?.status === 401 || /not authorized|token failed|token expired/i.test(error?.message || "");
  if (unauthorized) {
    localStorage.removeItem("veloir_token");
    window.location.assign("/login?sessionExpired=1");
    return true;
  }
  return false;
}

const blankAddress = () => ({
  fullAddress: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  countryCode: "IN",
  latitude: null,
  longitude: null,
  formattedAddress: "",
  placeId: "",
  isDefault: false,
});

function normalizeLocation(item) {
  return {
    ...item,
    country: item.country || "India",
    countryCode: (item.countryCode || "IN").toUpperCase(),
    latitude: item.latitude === null || item.latitude === undefined || item.latitude === "" ? null : (Number.isFinite(Number(item.latitude)) ? Number(item.latitude) : null),
    longitude: item.longitude === null || item.longitude === undefined || item.longitude === "" ? null : (Number.isFinite(Number(item.longitude)) ? Number(item.longitude) : null),
  };
}

function addressFromSaved(item) {
  return normalizeLocation({
    fullAddress: item.fullAddress || "",
    city: item.city || "",
    state: item.state || "",
    postalCode: item.postalCode || "",
    country: item.country || "India",
    countryCode: item.countryCode || "IN",
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    formattedAddress: item.formattedAddress || "",
    placeId: item.placeId || "",
    isDefault: Boolean(item.isDefault),
  });
}

function postalCodeError(value, countryCode) {
  const postal = String(value || "").trim();
  if (!postal) return "Postal code is required.";
  const code = (countryCode || "IN").toUpperCase();
  const patterns = {
    IN: /^[1-9]\d{5}$/,
    US: /^\d{5}(-\d{4})?$/,
    CA: /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i,
    GB: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
    AU: /^\d{4}$/,
    DE: /^\d{5}$/,
    FR: /^\d{5}$/,
    JP: /^\d{3}-?\d{4}$/,
  };
  if (patterns[code] && !patterns[code].test(postal)) {
    return code === "IN"
      ? "Enter a valid 6-digit Indian PIN code."
      : `Enter a valid postal code for ${countryNames.of(code) || code}.`;
  }
  if (!patterns[code] && !/^[A-Z0-9][A-Z0-9 -]{1,11}$/i.test(postal)) {
    return "Enter a valid postal code for the selected country.";
  }
  return "";
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

function MapCenterUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 13), { duration: 0.45 });
  }, [center, map]);
  return null;
}

function LocationSuggestions({ items, onChoose, busy }) {
  if (busy) return <div className="address-suggestions-note">Searching locations…</div>;
  if (!items.length) return null;
  return (
    <ul className="address-suggestions" role="listbox">
      {items.map((item) => (
        <li key={item.id || `${item.label}-${item.latitude}-${item.longitude}`}>
          <button type="button" role="option" onClick={() => onChoose(item)}>
            <FiMapPin aria-hidden="true" />
            <span>
              <strong>{item.label}</strong>
              <small>{[item.city, item.state, item.country, item.postalCode].filter(Boolean).join(", ")}</small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function AddressManagement() {
  const [addresses, setAddresses] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(blankAddress);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [fieldLookup, setFieldLookup] = useState(null);
  const [fieldResults, setFieldResults] = useState([]);
  const [fieldSearchLoading, setFieldSearchLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [mapMessage, setMapMessage] = useState("");

  const countries = useMemo(() => COUNTRY_CODES.map((code) => ({
    code,
    name: countryNames.of(code) || code,
  })).sort((a, b) => a.name.localeCompare(b.name)), []);

  const loadAddresses = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const response = await api("/api/addresses");
      setAddresses(response.data || response.addresses || []);
    } catch (error) {
      if (handleExpiredSession(error)) return;
      setListError(error.message || "Unable to load saved addresses.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Address/locality autocomplete. Debouncing and aborting stale browser requests prevents
  // a location request from being sent for every keystroke when the user is typing quickly.
  useEffect(() => {
    const query = searchQuery.trim();
    if (!formOpen || query.length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }
    let cancelled = false;
    let controller;
    const timer = setTimeout(async () => {
      controller = new AbortController();
      setSearchLoading(true);
      try {
        const response = await api(`/api/addresses/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!cancelled) setSearchResults(response.results || []);
      } catch (error) {
        if (error.name === "AbortError") return;
        if (handleExpiredSession(error)) return;
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 650);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [searchQuery, formOpen]);

  // City and state inputs share the real location index, with the same debounce/cancellation behaviour.
  useEffect(() => {
    const query = fieldLookup?.query?.trim() || "";
    if (!formOpen || query.length < 3) {
      setFieldResults([]);
      setFieldSearchLoading(false);
      return undefined;
    }
    let cancelled = false;
    let controller;
    const timer = setTimeout(async () => {
      controller = new AbortController();
      setFieldSearchLoading(true);
      const context = [fieldLookup?.field === "state" ? "" : form.state, form.country].filter(Boolean).join(", ");
      const q = [query, context].filter(Boolean).join(", ");
      try {
        const response = await api(`/api/addresses/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!cancelled) setFieldResults(response.results || []);
      } catch (error) {
        if (error.name === "AbortError") return;
        if (handleExpiredSession(error)) return;
        if (!cancelled) setFieldResults([]);
      } finally {
        if (!cancelled) setFieldSearchLoading(false);
      }
    }, 650);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [fieldLookup, form.state, form.country, formOpen]);

  const openNewForm = () => {
    setEditingId(null);
    setForm(blankAddress());
    setFieldErrors({});
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPoint(null);
    setMapCenter(DEFAULT_CENTER);
    setMapMessage("");
    setNotice({ type: "", text: "" });
    setFormOpen(true);
  };

  const openEditForm = (address) => {
    const nextForm = addressFromSaved(address);
    setEditingId(address._id);
    setForm(nextForm);
    setFieldErrors({});
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPoint(
      Number.isFinite(nextForm.latitude) && Number.isFinite(nextForm.longitude)
        ? { latitude: nextForm.latitude, longitude: nextForm.longitude }
        : null
    );
    setMapCenter(
      Number.isFinite(nextForm.latitude) && Number.isFinite(nextForm.longitude)
        ? [nextForm.latitude, nextForm.longitude]
        : DEFAULT_CENTER
    );
    setMapMessage("");
    setNotice({ type: "", text: "" });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving || geoLoading || reverseLoading) return;
    setFormOpen(false);
    setEditingId(null);
    setFieldLookup(null);
    setFieldResults([]);
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setNotice({ type: "", text: "" });
  };

  const applyLocation = (rawLocation) => {
    const location = normalizeLocation(rawLocation);
    setForm((prev) => ({
      ...prev,
      fullAddress: location.fullAddress || location.label || prev.fullAddress,
      city: location.city || prev.city,
      state: location.state || prev.state,
      postalCode: location.postalCode || prev.postalCode,
      country: location.country || prev.country,
      countryCode: location.countryCode || prev.countryCode || "IN",
      latitude: location.latitude ?? prev.latitude,
      longitude: location.longitude ?? prev.longitude,
      formattedAddress: location.formattedAddress || location.label || prev.formattedAddress,
      placeId: location.placeId || prev.placeId,
    }));
    setFieldErrors({});
    setSelectedPoint(
      Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
        ? { latitude: location.latitude, longitude: location.longitude }
        : null
    );
    if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
      setMapCenter([location.latitude, location.longitude]);
    }
    setSearchQuery(location.label || "");
    setSearchResults([]);
    setShowSearchResults(false);
    setFieldLookup(null);
    setFieldResults([]);
    setMapMessage("Location details filled in. Review or edit every field before saving.");
  };

  const chooseFieldLocation = (field, item) => {
    const location = normalizeLocation(item);
    if (field === "city") {
      updateField("city", location.city || location.label || "");
      setForm((prev) => ({
        ...prev,
        city: location.city || location.label || "",
        state: location.state || prev.state,
        postalCode: location.postalCode || prev.postalCode,
        country: location.country || prev.country,
        countryCode: location.countryCode || prev.countryCode,
        latitude: location.latitude ?? prev.latitude,
        longitude: location.longitude ?? prev.longitude,
        formattedAddress: location.formattedAddress || location.label || prev.formattedAddress,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        state: location.state || location.label || prev.state,
        city: location.city || prev.city,
        postalCode: location.postalCode || prev.postalCode,
        country: location.country || prev.country,
        countryCode: location.countryCode || prev.countryCode,
        latitude: location.latitude ?? prev.latitude,
        longitude: location.longitude ?? prev.longitude,
      }));
    }
    setSelectedPoint(
      Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
        ? { latitude: location.latitude, longitude: location.longitude }
        : null
    );
    if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
      setMapCenter([location.latitude, location.longitude]);
    }
    setFieldLookup(null);
    setFieldResults([]);
  };

  const reverseLookup = async ({ latitude, longitude }, source) => {
    setReverseLoading(true);
    setMapMessage("");
    try {
      const response = await api(`/api/addresses/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`);
      const result = response.result;
      if (!result) throw new Error("No address details were returned for this position.");
      applyLocation({ ...result, latitude, longitude });
      setMapCenter([latitude, longitude]);
      setMapMessage(source === "current"
        ? "Current location found. Confirm the details before saving."
        : "Map location selected. Confirm the details before saving.");
    } catch (error) {
      if (handleExpiredSession(error)) return;
      setSelectedPoint({ latitude, longitude });
      setMapCenter([latitude, longitude]);
      setForm((prev) => ({ ...prev, latitude, longitude }));
      setMapMessage(error.message || "We could not convert this position to an address. Enter the address manually.");
    } finally {
      setReverseLoading(false);
    }
  };

  const useCurrentLocation = () => {
    setNotice({ type: "", text: "" });
    setMapMessage("");
    if (!navigator.geolocation) {
      setNotice({ type: "error", text: "This browser does not support location access. Search for a place or enter your address manually." });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false);
        void reverseLookup({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }, "current");
      },
      (error) => {
        setGeoLoading(false);
        const messages = {
          1: "Location permission was denied. Allow location access in your browser settings or enter the address manually.",
          2: "Your current location is unavailable. Check your device location settings or search for an address.",
          3: "Location request timed out. Please try again or search for an address.",
        };
        setNotice({ type: "error", text: messages[error.code] || "Unable to get your current location. Please enter it manually." });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const validate = () => {
    const errors = {};
    if (form.fullAddress.trim().length < 4) errors.fullAddress = "Enter your house/flat number, street, locality, or landmark.";
    if (!form.city.trim()) errors.city = "City is required.";
    if (!form.state.trim()) errors.state = "State or region is required.";
    const postalError = postalCodeError(form.postalCode, form.countryCode);
    if (postalError) errors.postalCode = postalError;
    if (!form.country.trim() || !form.countryCode) errors.countryCode = "Select a country.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    setNotice({ type: "", text: "" });
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        fullAddress: form.fullAddress.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim().toUpperCase(),
        country: form.country.trim(),
        countryCode: (form.countryCode || "IN").toUpperCase(),
        latitude: form.latitude,
        longitude: form.longitude,
        formattedAddress: form.formattedAddress,
        placeId: form.placeId,
        isDefault: Boolean(form.isDefault),
      };
      const response = await api(
        editingId ? `/api/addresses/${encodeURIComponent(editingId)}` : "/api/addresses",
        { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      const saved = response.data;
      if (saved) {
        setAddresses((previous) => {
          const others = previous
            .filter((address) => address._id !== saved._id)
            .map((address) => saved.isDefault ? { ...address, isDefault: false } : address);
          const next = [...others, saved];
          return next.sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)) || new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
        });
      }
      setNotice({ type: "success", text: response.message || (editingId ? "Address updated successfully." : "Address saved successfully.") });
      setFormOpen(false);
      setEditingId(null);
    } catch (error) {
      if (handleExpiredSession(error)) return;
      if (error?.errors && typeof error.errors === "object") setFieldErrors(error.errors);
      setNotice({ type: "error", text: error.message || "Unable to save address. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (address) => {
    const confirmed = window.confirm(`Delete this address?\n\n${address.fullAddress}, ${address.city}, ${address.state}`);
    if (!confirmed) return;
    setDeletingId(address._id);
    setNotice({ type: "", text: "" });
    try {
      const response = await api(`/api/addresses/${encodeURIComponent(address._id)}`, { method: "DELETE" });
      setAddresses(response.data?.addresses || addresses.filter((item) => item._id !== address._id));
      setNotice({ type: "success", text: response.message || "Address deleted." });
    } catch (error) {
      if (handleExpiredSession(error)) return;
      setNotice({ type: "error", text: error.message || "Unable to delete this address." });
    } finally {
      setDeletingId(null);
    }
  };

  const chooseSearchResult = (result) => applyLocation(result);
  const selectMapPoint = ({ latitude, longitude }) => {
    setSelectedPoint({ latitude, longitude });
    void reverseLookup({ latitude, longitude }, "map");
  };

  const setLocationField = (field, value) => {
    updateField(field, value);
    setFieldResults([]);
    setFieldLookup(value.trim().length >= 3 ? { field, query: value } : null);
  };

  return (
    <section className="settings-card address-management-card" aria-labelledby="address-management-title">
      <div className="settings-card-heading">
        <FiMapPin aria-hidden="true" />
        <div>
          <h2 id="address-management-title">Saved addresses</h2>
          <p>Keep your delivery and contact locations up to date.</p>
        </div>
      </div>

      {notice.text && (
        <div className={`address-notice ${notice.type === "error" ? "is-error" : "is-success"}`} role="status">
          {notice.type === "error" ? <FiX aria-hidden="true" /> : <FiCheckCircle aria-hidden="true" />}
          <span>{notice.text}</span>
        </div>
      )}

      {listError && <div className="address-notice is-error" role="alert">{listError}</div>}

      {!formOpen && (
        <div className="address-list-toolbar">
          <p className="address-supporting-copy">Addresses are private to your account. You can edit or remove them at any time.</p>
          <button type="button" className="address-primary-button" onClick={openNewForm}>
            <FiPlus aria-hidden="true" /> Add address
          </button>
        </div>
      )}

      {listLoading ? (
        <div className="address-loading" role="status"><span className="address-spinner" /> Loading saved addresses…</div>
      ) : !formOpen && addresses.length === 0 ? (
        <div className="address-empty-state">
          <span className="address-empty-icon"><FiMapPin aria-hidden="true" /></span>
          <h3>No saved addresses yet</h3>
          <p>Add your address manually, search for a location, use your current location, or select a point on the map.</p>
          <button type="button" className="address-primary-button" onClick={openNewForm}><FiPlus /> Add your first address</button>
        </div>
      ) : null}

      {!formOpen && addresses.length > 0 && !listLoading && (
        <div className="address-card-list">
          {addresses.map((address) => (
            <article className="saved-address-card" key={address._id}>
              <div className="saved-address-marker"><FiMapPin aria-hidden="true" /></div>
              <div className="saved-address-body">
                <div className="saved-address-title-row">
                  <h3>{address.city}, {address.state}</h3>
                  {address.isDefault && <span className="address-default-badge">Default</span>}
                </div>
                <p>{address.fullAddress}</p>
                <p className="saved-address-secondary">{[address.postalCode, address.country].filter(Boolean).join(", ")}</p>
                {address.latitude !== null && address.latitude !== undefined && address.longitude !== null && address.longitude !== undefined && Number.isFinite(Number(address.latitude)) && Number.isFinite(Number(address.longitude)) && (
                  <small className="address-coordinates">Map position: {Number(address.latitude).toFixed(5)}, {Number(address.longitude).toFixed(5)}</small>
                )}
              </div>
              <div className="saved-address-actions">
                <button type="button" onClick={() => openEditForm(address)} aria-label={`Edit address in ${address.city}`}><FiEdit2 /> Edit</button>
                <button type="button" className="address-delete-button" onClick={() => deleteAddress(address)} disabled={deletingId !== null} aria-label={`Delete address in ${address.city}`}>
                  {deletingId === address._id ? <span className="address-spinner small" /> : <FiTrash2 />} {deletingId === address._id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {formOpen && (
        <form className="address-form" onSubmit={saveAddress} noValidate>
          <div className="address-form-heading">
            <div>
              <h3>{editingId ? "Edit address" : "Add a new address"}</h3>
              <p>Use search, GPS, or the map to fill in the details. Check everything before saving.</p>
            </div>
            <button type="button" className="address-close-button" onClick={closeForm} disabled={saving || geoLoading || reverseLoading} aria-label="Close address form"><FiX /></button>
          </div>

          <label className="address-field address-search-field">
            <span>Search address or place</span>
            <div className="address-search-input-wrap">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => { setSearchQuery(event.target.value); setShowSearchResults(true); }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Search street, locality, city, landmark, or PIN code"
                autoComplete="off"
              />
              <FiChevronDown aria-hidden="true" />
            </div>
            {showSearchResults && (searchLoading || searchResults.length > 0) && (
              <LocationSuggestions items={searchResults} busy={searchLoading} onChoose={chooseSearchResult} />
            )}
            {showSearchResults && !searchLoading && searchQuery.trim().length >= 3 && searchResults.length === 0 && (
              <div className="address-suggestions-note">No suggestions found. You can still enter the address manually.</div>
            )}
          </label>

          <div className="address-location-actions">
            <button type="button" className="address-secondary-button" onClick={useCurrentLocation} disabled={geoLoading || reverseLoading}>
              {geoLoading ? <span className="address-spinner small" /> : <FiNavigation aria-hidden="true" />}
              {geoLoading ? "Getting current location…" : "Use My Current Location"}
            </button>
            <span>Location permission is requested only after you press this button.</span>
          </div>

          {(reverseLoading || mapMessage) && (
            <p className={`address-map-message ${reverseLoading ? "is-loading" : ""}`} role="status">
              {reverseLoading && <span className="address-spinner small" />}{reverseLoading ? "Looking up this location…" : mapMessage}
            </p>
          )}

          <div className="address-map-frame">
            <div className="address-map-caption"><FiMapPin /> <span>Tap the map to choose a point. The address can be corrected below.</span></div>
            <MapContainer center={mapCenter} zoom={5} scrollWheelZoom className="address-map">
              <MapCenterUpdater center={mapCenter} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onSelect={selectMapPoint} />
              {selectedPoint && <Marker position={[selectedPoint.latitude, selectedPoint.longitude]} />}
            </MapContainer>
          </div>
          {selectedPoint && (
            <p className="address-coordinate-note">Selected position: {selectedPoint.latitude.toFixed(5)}, {selectedPoint.longitude.toFixed(5)} (approximate)</p>
          )}

          <label className="address-field">
            <span>Full address <b>*</b></span>
            <textarea
              value={form.fullAddress}
              onChange={(event) => updateField("fullAddress", event.target.value)}
              placeholder="House / flat number, street, locality, or landmark"
              rows={3}
              maxLength={300}
              required
            />
            {fieldErrors.fullAddress && <small className="address-field-error">{fieldErrors.fullAddress}</small>}
          </label>

          <div className="address-fields-grid">
            <label className="address-field address-autocomplete-field">
              <span>State / region <b>*</b></span>
              <input
                value={form.state}
                onChange={(event) => setLocationField("state", event.target.value)}
                placeholder="Enter state or region"
                autoComplete="address-level1"
                required
              />
              {fieldLookup?.field === "state" && (fieldSearchLoading || fieldResults.length > 0) && (
                <LocationSuggestions items={fieldResults} busy={fieldSearchLoading} onChoose={(item) => chooseFieldLocation("state", item)} />
              )}
              {fieldErrors.state && <small className="address-field-error">{fieldErrors.state}</small>}
            </label>
            <label className="address-field address-autocomplete-field">
              <span>City <b>*</b></span>
              <input
                value={form.city}
                onChange={(event) => setLocationField("city", event.target.value)}
                placeholder="Enter city or town"
                autoComplete="address-level2"
                required
              />
              {fieldLookup?.field === "city" && (fieldSearchLoading || fieldResults.length > 0) && (
                <LocationSuggestions items={fieldResults} busy={fieldSearchLoading} onChoose={(item) => chooseFieldLocation("city", item)} />
              )}
              {fieldErrors.city && <small className="address-field-error">{fieldErrors.city}</small>}
            </label>
            <label className="address-field">
              <span>Postal code / PIN code <b>*</b></span>
              <input
                value={form.postalCode}
                onChange={(event) => updateField("postalCode", event.target.value)}
                placeholder={form.countryCode === "IN" ? "6-digit PIN code" : "Postal code"}
                autoComplete="postal-code"
                maxLength={12}
                required
              />
              {fieldErrors.postalCode && <small className="address-field-error">{fieldErrors.postalCode}</small>}
            </label>
            <label className="address-field">
              <span>Country <b>*</b></span>
              <select
                value={form.countryCode || "IN"}
                onChange={(event) => {
                  const code = event.target.value;
                  setForm((prev) => ({ ...prev, countryCode: code, country: countryNames.of(code) || code }));
                  setFieldErrors((prev) => ({ ...prev, countryCode: "", postalCode: "" }));
                }}
                autoComplete="country"
                required
              >
                {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
              </select>
              {fieldErrors.countryCode && <small className="address-field-error">{fieldErrors.countryCode}</small>}
            </label>
          </div>

          <label className="address-default-checkbox">
            <input type="checkbox" checked={Boolean(form.isDefault)} onChange={(event) => updateField("isDefault", event.target.checked)} />
            <span>Make this my default address</span>
          </label>

          <div className="address-form-footer">
            <p>Map and search data are approximate. Review the complete address before saving.</p>
            <div>
              <button type="button" className="address-cancel-button" onClick={closeForm} disabled={saving || geoLoading || reverseLoading}>Cancel</button>
              <button type="submit" className="address-primary-button" disabled={saving || listLoading}>
                {saving ? <><span className="address-spinner small" /> Saving…</> : <><FiCheckCircle /> {editingId ? "Save address" : "Add address"}</>}
              </button>
            </div>
          </div>
        </form>
      )}
      <p className="address-provider-credit">Location search: <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Powered by Geoapify</a> (when configured, with Photon fallback). Map tiles: OpenStreetMap contributors.</p>
    </section>
  );
}
