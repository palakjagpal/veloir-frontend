import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FiAlertCircle, FiEye, FiTag } from "react-icons/fi";
import { StatusBadge, StatusFilter } from "../admin/StatusFilter";
import { api, getImageUrl } from "../lib/api";
import "./AdminListingCategoryPage.css";

const TYPE_META = {
  rent: {
    title: "Rental bikes",
    eyebrow: "Rental",
    intro: "Bikes listed for rent: daily, weekly and monthly pricing, security deposits and how the listings are performing.",
    priceCards: (t) => [
      ["Avg per day", t.avgPerDay],
      ["Avg per week", t.avgPerWeek],
      ["Avg per month", t.avgPerMonth],
      ["Avg security deposit", t.avgDeposit],
    ],
    rowPrice: (bike) => (bike.rentalDetails?.pricePerDay ? `${money(bike.rentalDetails.pricePerDay)} / day` : "Daily rate not set"),
  },
  sale: {
    title: "Bikes for sale",
    eyebrow: "Selling",
    intro: "Bikes listed for sale: asking prices, approval progress and the bikes getting the most attention.",
    priceCards: (t) => [
      ["Average price", t.avgPrice],
      ["Lowest price", t.minPrice],
      ["Highest price", t.maxPrice],
    ],
    rowPrice: (bike) => money(bike.price),
  },
  trade: {
    title: "Trade listings",
    eyebrow: "Trading",
    intro: "Bikes listed for trade: estimated trade values, approval progress and the listings getting the most attention.",
    priceCards: (t) => [
      ["Avg trade value", t.avgTradeValue],
      ["Avg listed price", t.avgPrice],
    ],
    rowPrice: (bike) =>
      bike.tradeDetails?.estimatedTradeValue ? `Trade value ${money(bike.tradeDetails.estimatedTradeValue)}` : "Trade value not set",
  },
};

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const APPROVAL_LABEL = { approved: "Approved", pending: "Pending", rejected: "Rejected" };
const APPROVAL_COLOR = { approved: "#2f7d5b", pending: "#c18b21", rejected: "#b4473f" };

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
}

const formatMonth = (id) => {
  const date = new Date(`${id}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? id : date.toLocaleString("en-IN", { month: "short", year: "2-digit" });
};

function StatTile({ label, value }) {
  return (
    <div className="acp-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({ title, children, wide = false }) {
  return (
    <section className={`acp-panel${wide ? " is-wide" : ""}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function EmptyChart({ text = "Not enough data yet." }) {
  return <p className="acp-empty-chart">{text}</p>;
}

export default function AdminListingCategoryPage({ type }) {
  const meta = TYPE_META[type] || TYPE_META.sale;
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ items: [], pagination: null, counts: {} });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  useEffect(() => {
    let active = true;
    setAnalytics(null);
    setAnalyticsError("");
    api(`/api/admin/listings/analytics?type=${type}`)
      .then((response) => {
        if (active) setAnalytics(response?.data || null);
      })
      .catch((err) => {
        if (active) setAnalyticsError(err?.message || "Unable to load analytics.");
      });
    return () => {
      active = false;
    };
  }, [type]);

  useEffect(() => {
    let active = true;
    setListLoading(true);
    setListError("");
    api(`/api/admin/bikes?type=${type}&status=${status}&page=${page}&limit=20`)
      .then((response) => {
        if (active) {
          setList({
            items: Array.isArray(response?.data) ? response.data : [],
            pagination: response?.pagination || null,
            counts: response?.counts || {},
          });
        }
      })
      .catch((err) => {
        if (active) setListError(err?.message || "Unable to load listings.");
      })
      .finally(() => {
        if (active) setListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [type, status, page]);

  const totals = analytics?.totals || {};
  const availability = Object.fromEntries((analytics?.availability || []).map((row) => [row._id, row.count]));
  const approvalCount = Object.fromEntries((analytics?.approval || []).map((row) => [row._id, row.count]));

  const monthData = (analytics?.byMonth || [])
    .slice()
    .reverse()
    .map((row) => ({ month: formatMonth(row._id), listings: row.count }));
  const approvalData = (analytics?.approval || []).map((row) => ({
    key: row._id,
    name: APPROVAL_LABEL[row._id] || row._id,
    value: row.count,
  }));
  const brandData = (analytics?.byBrand || []).map((row) => ({ name: row._id || "Unknown", count: row.count }));
  const categoryData = (analytics?.byCategory || []).map((row) => ({ name: row._id || "Unknown", count: row.count }));
  const cityData = (analytics?.byCity || []).map((row) => ({ name: row._id || "Unknown", count: row.count }));

  const { items, pagination } = list;

  return (
    <main className="acp-page">
      <header className="acp-header">
        <span className="acp-eyebrow">{meta.eyebrow}</span>
        <h1>{meta.title}</h1>
        <p>{meta.intro}</p>
      </header>

      {analyticsError && <div className="acp-error" role="alert">{analyticsError}</div>}

      <section className="acp-stats" aria-label="Summary statistics">
        <StatTile label="Total listings" value={totals.total ?? (analytics ? 0 : "—")} />
        <StatTile label="Approved" value={approvalCount.approved ?? (analytics ? 0 : "—")} />
        <StatTile label="Pending review" value={approvalCount.pending ?? (analytics ? 0 : "—")} />
        <StatTile label="Rejected" value={approvalCount.rejected ?? (analytics ? 0 : "—")} />
        <StatTile label="Available now" value={availability.available ?? (analytics ? 0 : "—")} />
        <StatTile label="Total views" value={analytics ? Number(totals.views || 0).toLocaleString("en-IN") : "—"} />
        {analytics && meta.priceCards(totals).map(([label, value]) => (
          <StatTile key={label} label={label} value={money(value)} />
        ))}
      </section>

      <section className="acp-analytics" aria-label="Analytics">
        <Panel title="Listings added per month" wide>
          {monthData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6efec" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="listings" name="Listings" fill="#2f7d5b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Panel>

        <Panel title="Approval status">
          {approvalData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={approvalData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {approvalData.map((entry) => (
                    <Cell key={entry.key} fill={APPROVAL_COLOR[entry.key] || "#8a9b9f"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Panel>

        <Panel title="Top brands">
          {brandData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={brandData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6efec" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Listings" fill="#39786d" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Panel>

        <Panel title="Top categories">
          {categoryData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6efec" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Listings" fill="#7aa89a" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Panel>

        <Panel title="Listings by city">
          {cityData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={cityData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6efec" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Listings" fill="#92b8ad" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Panel>

        <Panel title="Most viewed">
          {analytics?.topViewed?.length ? (
            <ol className="acp-top-list">
              {analytics.topViewed.map((bike) => (
                <li key={bike._id}>
                  <Link to={`/admin/listings/${bike._id}`}>{bike.title}</Link>
                  <span>{Number(bike.views || 0).toLocaleString("en-IN")} views</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyChart />
          )}
        </Panel>
      </section>

      <section className="acp-listings" aria-label="Listings">
        <div className="acp-listings-head">
          <h2>Listings</h2>
          <StatusFilter
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            label="Filter listings by approval status"
          />
        </div>

        {listError && <div className="acp-error" role="alert">{listError}</div>}

        {listLoading && !items.length && <div className="acp-state">Loading listings…</div>}

        {!listLoading && !listError && !items.length && (
          <div className="acp-state">No {status === "all" ? "" : `${status} `}{meta.eyebrow.toLowerCase()} listings yet.</div>
        )}

        <div className="acp-items">
          {items.map((bike) => {
            const approval = bike.approvalStatus || (bike.isApproved ? "approved" : "pending");
            const updated = (bike.pendingEdits?.fields?.length ?? 0) > 0;
            const image = bike.featuredImage || bike.images?.[0];
            return (
              <article className="acp-item" key={bike._id}>
                <div className="acp-thumb">
                  {image ? <img src={getImageUrl(image)} alt="" /> : <FiTag />}
                </div>
                <div className="acp-item-body">
                  <div className="acp-item-top">
                    <strong>{bike.title}</strong>
                    <StatusBadge status={approval} />
                    {updated && (
                      <span className="acp-updated"><FiAlertCircle /> Updated by seller</span>
                    )}
                  </div>
                  <p className="acp-item-sub">
                    {[bike.brand, bike.model, bike.year].filter(Boolean).join(" · ")}
                    {bike.location?.city ? ` · ${bike.location.city}` : ""}
                  </p>
                  <p className="acp-item-price">{meta.rowPrice(bike)}</p>
                </div>
                <Link className="acp-view" to={`/admin/listings/${bike._id}`}>
                  <FiEye /> View details
                </Link>
              </article>
            );
          })}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="acp-pager">
            <button type="button" disabled={page <= 1 || listLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </button>
            <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
            <button
              type="button"
              disabled={page >= pagination.totalPages || listLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
