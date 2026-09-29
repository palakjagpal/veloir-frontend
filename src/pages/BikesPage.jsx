import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiSliders, FiX } from "react-icons/fi";
import { api } from "../lib/api";
import Layout from "../components/Layout";
import SearchBox from "../components/SearchBox";
import { BikeCard, Skeletons } from "../components/BikeCard";

const categories = [
  "Sport",
  "Cruiser",
  "Touring",
  "Adventure",
  "Off-Road",
  "Scooter",
  "Electric",
  "Other",
];
const conditions = [
  "New",
  "Like New",
  "Excellent",
  "Good",
  "Fair",
  "Needs Work",
];
const transactionTypes = [
  { value: "", label: "Any type" },
  { value: "sale", label: "For sale" },
  { value: "rent", label: "For rent" },
  { value: "trade", label: "For trade" },
];

export default function BikesPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const query = params.toString();
  const searchTerm = params.get("q") || "";
  const category = params.get("category") || "";

  const load = () => {
    setData(null);
    setError("");
    api(`/api/search/bikes?limit=12${query ? `&${query}` : ""}`)
      .then(setData)
      .catch((requestError) => setError(requestError.message));
  };
  useEffect(load, [query]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };

  return (
    <Layout>
      <main className="market wrap">
        <div className="market-hero">
          <p className="eyebrow">Discover</p>
          <h1>
            Find a ride that
            <br />
            <em>feels like yours.</em>
          </h1>
          <SearchBox />
        </div>
        <div className="market-layout">
          {/* Backdrop only appears on mobile when the drawer is open;
              clicking it closes the drawer. Desktop layout is untouched. */}
          {mobileFiltersOpen && (
            <div
              className="filter-backdrop"
              onClick={() => setMobileFiltersOpen(false)}
            />
          )}
          <aside className={mobileFiltersOpen ? "mobile-filters-open" : ""}>
            <div className="filter-title">
              <b>Filters</b>
              <div className="filter-title-actions">
                <button onClick={() => setParams({})}>Reset</button>
                <button
                  type="button"
                  className="filter-close"
                  onClick={() => setMobileFiltersOpen(false)}
                  aria-label="Close filters"
                >
                  <FiX />
                </button>
              </div>
            </div>

            {/* All filter fields now live in a two-column grid.
                filter-title (above) stays full-width. */}
            <div className="filter-grid">
              {/* --- Existing filters (unchanged) --- */}
              <label>
                Riding style
                <select
                  value={category}
                  onChange={(event) => setFilter("category", event.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Condition
                <select
                  value={params.get("condition") || ""}
                  onChange={(event) => setFilter("condition", event.target.value)}
                >
                  <option value="">Any condition</option>
                  {conditions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Maximum price
                <input
                  value={params.get("maxPrice") || ""}
                  placeholder="₹ e.g. 500000"
                  onChange={(event) => setFilter("maxPrice", event.target.value)}
                />
              </label>

              {/* --- New filters --- */}
              <label>
                Transaction type
                <select
                  value={params.get("type") || ""}
                  onChange={(event) => setFilter("type", event.target.value)}
                >
                  {transactionTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Brand
                <input
                  value={params.get("brand") || ""}
                  placeholder="e.g. Honda, Royal Enfield"
                  onChange={(event) => setFilter("brand", event.target.value)}
                />
              </label>

              <label>
                Minimum price
                <input
                  value={params.get("minPrice") || ""}
                  placeholder="₹ e.g. 100000"
                  onChange={(event) => setFilter("minPrice", event.target.value)}
                />
              </label>

              <label>
                Year (from)
                <input
                  value={params.get("minYear") || ""}
                  placeholder="e.g. 2018"
                  onChange={(event) => setFilter("minYear", event.target.value)}
                />
              </label>

              <label>
                Year (to)
                <input
                  value={params.get("maxYear") || ""}
                  placeholder="e.g. 2026"
                  onChange={(event) => setFilter("maxYear", event.target.value)}
                />
              </label>

              <label>
                Maximum mileage (km)
                <input
                  value={params.get("maxMileage") || ""}
                  placeholder="e.g. 20000"
                  onChange={(event) => setFilter("maxMileage", event.target.value)}
                />
              </label>

              <label>
                Engine capacity (from, cc)
                <input
                  value={params.get("minEngineCapacity") || ""}
                  placeholder="e.g. 150"
                  onChange={(event) =>
                    setFilter("minEngineCapacity", event.target.value)
                  }
                />
              </label>

              <label>
                Engine capacity (to, cc)
                <input
                  value={params.get("maxEngineCapacity") || ""}
                  placeholder="e.g. 650"
                  onChange={(event) =>
                    setFilter("maxEngineCapacity", event.target.value)
                  }
                />
              </label>

              <label>
                Color
                <input
                  value={params.get("color") || ""}
                  placeholder="e.g. Red, Black"
                  onChange={(event) => setFilter("color", event.target.value)}
                />
              </label>

              <label>
                City
                <input
                  value={params.get("city") || ""}
                  placeholder="e.g. Jalandhar"
                  onChange={(event) => setFilter("city", event.target.value)}
                />
              </label>
            </div>

            {/* Mobile-only "done" button, hidden on desktop via CSS */}
            <button
              type="button"
              className="filter-apply-mobile"
              onClick={() => setMobileFiltersOpen(false)}
            >
              Show {data?.pagination?.totalItems ?? ""} results
            </button>
          </aside>
          <section className="results">
            <div className="results-head">
              <p>
                {data?.pagination?.totalItems ?? "…"} motorcycles found{" "}
                {searchTerm && `for "${searchTerm}"`}
              </p>
              <button
                type="button"
                className="filter-mobile"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <FiSliders /> Filter & sort
              </button>
              <select
                value={`${params.get("sortBy") || "createdAt"}:${params.get("sortOrder") || "desc"}`}
                onChange={(event) => {
                  const [sortBy, sortOrder] = event.target.value.split(":");
                  setFilter("sortBy", sortBy);
                  setFilter("sortOrder", sortOrder);
                }}
              >
                <option value="createdAt:desc">Newest first</option>
                <option value="price:asc">Price: low to high</option>
                <option value="price:desc">Price: high to low</option>
                <option value="year:desc">Year: newest</option>
              </select>
            </div>
            {error ? (
              <div className="empty">
                {error}
                <button onClick={load}>Try again</button>
              </div>
            ) : !data ? (
              <Skeletons />
            ) : data.data.length ? (
              <div className="bike-grid">
                {data.data.map((bike) => (
                  <BikeCard key={bike._id} bike={bike} />
                ))}
              </div>
            ) : (
              <div className="empty">
                No rides match this search. Try broadening your filters.
              </div>
            )}
          </section>
        </div>
      </main>
    </Layout>
  );
}