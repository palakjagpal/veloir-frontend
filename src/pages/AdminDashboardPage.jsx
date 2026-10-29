import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiActivity, FiArrowUpRight, FiBike, FiCalendar, FiCheckCircle,
  FiClock, FiFileText, FiRefreshCw, FiShield, FiShoppingBag, FiUsers,
  FiAlertCircle, FiInbox, FiPercent,
} from "react-icons/fi";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import "./AdminDashboardPage.css";

const number = (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const metricCards = [
  { key: "totalUsers", label: "Total users", icon: FiUsers, tone: "mint" },
  { key: "totalBikes", label: "Bike listings", icon: FiBike, tone: "blue" },
  { key: "pendingBikes", label: "Pending listings", icon: FiClock, tone: "amber" },
  { key: "pendingManualReviews", label: "Manual KYC reviews", icon: FiShield, tone: "violet" },
  { key: "totalRentals", label: "Rental bookings", icon: FiCalendar, tone: "blue" },
  { key: "openDisputes", label: "Open disputes", icon: FiAlertCircle, tone: "rose" },
  { key: "totalInquiries", label: "Inquiries", icon: FiInbox, tone: "mint" },
  { key: "totalPurchases", label: "Purchase records", icon: FiShoppingBag, tone: "violet" },
];

const adminLinks = [
  { title: "Review bike listings", description: "Approve or reject pending marketplace listings.", to: "/admin/listings", icon: FiBike, countKey: "pendingBikes", action: "Open listings" },
  { title: "Manual document review", description: "Review submitted listing documents and record a decision.", to: "/admin/document-review", icon: FiFileText, countKey: "pendingManualReviews", action: "Review documents" },
  { title: "Rental disputes", description: "Review open disputes and follow the existing resolution workflow.", to: "/admin/rentals/disputes", icon: FiShield, countKey: "openDisputes", action: "Manage disputes" },
];

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api("/api/admin/dashboard/stats");
      setDashboard(response?.data || null);
    } catch (err) {
      setError(err?.message || "Could not load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  const metrics = dashboard?.metrics || {};

  return (
    <Layout>
      <main className="admin-dashboard-page">
        <section className="admin-dashboard-hero">
          <div className="admin-dashboard-hero-copy">
            <span className="admin-eyebrow"><FiShield /> VELOIR ADMINISTRATION</span>
            <h1>Admin dashboard</h1>
            <p>Monitor your marketplace, review requests, and keep Veloir running smoothly.</p>
          </div>
          <button className="admin-refresh-button" type="button" onClick={loadDashboard} disabled={loading}>
            <FiRefreshCw className={loading ? "admin-spinning" : ""} /> {loading ? "Refreshing…" : "Refresh data"}
          </button>
        </section>

        {error && <div className="admin-dashboard-error" role="alert"><FiAlertCircle /> <span>{error}</span><button onClick={loadDashboard}>Retry</button></div>}

        <section className="admin-metrics-grid" aria-label="Platform statistics">
          {metricCards.map(({ key, label, icon: Icon, tone }) => (
            <article className="admin-metric-card" key={key}>
              <div className={`admin-metric-icon ${tone}`}><Icon /></div>
              <div className="admin-metric-label">{label}</div>
              <div className="admin-metric-value">{loading && !dashboard ? "—" : number(metrics[key])}</div>
              <div className="admin-metric-foot">{key === "pendingBikes" || key === "pendingManualReviews" || key === "openDisputes" ? "Needs attention" : "Current total"}</div>
            </article>
          ))}
        </section>

        <section className="admin-dashboard-section">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">WORK QUEUE</span><h2>Admin actions</h2></div><span className="admin-section-note"><FiActivity /> Live counts from your database</span></div>
          <div className="admin-action-grid">
            {adminLinks.map(({ title, description, to, icon: Icon, countKey, action }) => (
              <article className="admin-action-card" key={to}>
                <div className="admin-action-top"><span className="admin-action-icon"><Icon /></span><span className="admin-action-count">{loading && !dashboard ? "—" : number(metrics[countKey])}</span></div>
                <h3>{title}</h3><p>{description}</p>
                <Link to={to}>{action}<FiArrowUpRight /></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-dashboard-lower-grid">
          <div className="admin-data-panel">
            <div className="admin-panel-heading"><div><h2>Recent bike listings</h2><p>Latest listings submitted to Veloir</p></div><Link to="/admin/listings">View all <FiArrowUpRight /></Link></div>
            {loading && !dashboard ? <div className="admin-empty-state">Loading listings…</div> : dashboard?.recentBikes?.length ? (
              <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Bike</th><th>Submitted</th><th>Status</th></tr></thead><tbody>
                {dashboard.recentBikes.map((bike) => <tr key={bike._id}><td><strong>{bike.title || `${bike.brand || "Bike"} ${bike.model || ""}`}</strong><span>{[bike.brand, bike.model].filter(Boolean).join(" · ")}</span></td><td>{date(bike.createdAt)}</td><td><span className={`admin-status-pill ${bike.isApproved ? "approved" : "pending"}`}>{bike.isApproved ? "Approved" : "Pending"}</span></td></tr>)}
              </tbody></table></div>
            ) : <div className="admin-empty-state"><FiBike /><span>No bike listings found.</span></div>}
          </div>

          <div className="admin-data-panel">
            <div className="admin-panel-heading"><div><h2>New users</h2><p>Most recently registered accounts</p></div><span className="admin-panel-icon"><FiUsers /></span></div>
            {loading && !dashboard ? <div className="admin-empty-state">Loading users…</div> : dashboard?.recentUsers?.length ? (
              <div className="admin-user-list">{dashboard.recentUsers.map((user) => <div className="admin-user-row" key={user._id}><span className="admin-user-avatar">{(user.name || user.email || "U").trim().charAt(0).toUpperCase()}</span><span className="admin-user-details"><strong>{user.name || "Unnamed user"}</strong><span>{user.email}</span></span><span className="admin-role-pill">{user.role || "user"}</span></div>)}</div>
            ) : <div className="admin-empty-state"><FiUsers /><span>No user accounts found.</span></div>}
          </div>
        </section>

        <footer className="admin-dashboard-footer"><FiCheckCircle /> Admin actions are restricted by the existing backend role-protected routes.{dashboard?.generatedAt ? <span>Last updated {new Date(dashboard.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span> : null}</footer>
      </main>
    </Layout>
  );
}
