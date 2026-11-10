import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Bike,
  ChevronRight,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { AdminUIProvider } from "./AdminUIProvider";
import "./admin.css";

/**
 * Dedicated shell for every /admin/* management page.
 * It deliberately imports nothing from the user-facing Layout (navbar/footer).
 */
export const ADMIN_NAV_ITEMS = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard, end: true, title: "Dashboard overview" },
  {
    label: "Bike listings",
    to: "/admin/listings",
    icon: Bike,
    title: "Bike listings",
    children: [
      { label: "Rental", to: "/admin/listings/for-rent", title: "Rental bikes" },
      { label: "Selling", to: "/admin/listings/for-sale", title: "Bikes for sale" },
      { label: "Trading", to: "/admin/listings/for-trade", title: "Trade listings" },
    ],
  },
  { label: "Featured bikes", to: "/admin/featured-bikes", icon: Star, title: "Featured bikes" },
  { label: "Document reviews", to: "/admin/document-review", icon: FileCheck2, title: "Document reviews" },
  { label: "Rental disputes", to: "/admin/rentals/disputes", icon: ShieldCheck, title: "Rental disputes" },
];

function initials(value = "Admin") {
  return (
    String(value)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "AD"
  );
}

function currentTitle(pathname) {
  // Pick the most specific match so "Rental" wins over its parent "Bike listings".
  const candidates = ADMIN_NAV_ITEMS.flatMap((item) => [item, ...(item.children || [])])
    .filter((item) =>
      item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
    )
    .sort((a, b) => b.to.length - a.to.length);
  return candidates[0]?.title || "Administration";
}

export default function AdminLayout() {
  const { admin, logoutAdmin } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const onListingsRoute = location.pathname.startsWith("/admin/listings");
  const [listingsOpen, setListingsOpen] = useState(onListingsRoute);

  // Keep the sub-menu open while the admin is on any listings page.
  useEffect(() => {
    if (onListingsRoute) setListingsOpen(true);
  }, [onListingsRoute]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logoutAdmin();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="adm-root">
      <AdminUIProvider>
        {menuOpen ? (
          <button type="button" className="adm-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />
        ) : null}

        <aside className={`adm-sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Administrator navigation">
          <div className="adm-sidebar-head">
            <NavLink to="/admin" className="adm-brand" end>
              <span className="adm-brand-mark"><img src="/veloir-logo.png" alt="" width="40" height="40" /></span>
              <span className="adm-brand-text">
                <span className="adm-brand-name">veloir</span>
                <span className="adm-brand-sub">Admin console</span>
              </span>
            </NavLink>
            <button type="button" className="adm-icon-btn adm-sidebar-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <X size={19} />
            </button>
          </div>

          <p className="adm-nav-label">Workspace</p>
          <nav className="adm-nav">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              if (!item.children) {
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `adm-nav-link ${isActive ? "is-active" : ""}`}
                  >
                    <Icon size={18} strokeWidth={2} />
                    <span>{item.label}</span>
                    <ChevronRight size={15} className="adm-nav-chevron" />
                  </NavLink>
                );
              }
              return (
                <div key={item.to} className="adm-nav-group">
                  <div className="adm-nav-row">
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => `adm-nav-link ${isActive ? "is-active" : ""}`}
                      onClick={() => setListingsOpen(true)}
                    >
                      <Icon size={18} strokeWidth={2} />
                      <span>{item.label}</span>
                    </NavLink>
                    <button
                      type="button"
                      className={`adm-nav-toggle ${listingsOpen ? "is-open" : ""}`}
                      aria-expanded={listingsOpen}
                      aria-label={`${listingsOpen ? "Collapse" : "Expand"} ${item.label} menu`}
                      onClick={() => setListingsOpen((open) => !open)}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                  {listingsOpen && (
                    <div className="adm-nav-sub">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) => `adm-nav-sublink ${isActive ? "is-active" : ""}`}
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="adm-sidebar-foot">
            <a className="adm-site-link" href="/" target="_blank" rel="noreferrer">
              View public site <ArrowUpRight size={14} />
            </a>
            <div className="adm-profile">
              <span className="adm-avatar">{initials(admin?.name || "Admin")}</span>
              <span className="adm-profile-text">
                <strong>{admin?.name || "Veloir Admin"}</strong>
                <span>{admin?.email || "Administrator"}</span>
              </span>
            </div>
            <button type="button" className="adm-signout" onClick={handleLogout}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </aside>

        <div className="adm-main">
          <header className="adm-topbar">
            <button type="button" className="adm-icon-btn adm-menu-btn" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="adm-topbar-title">
              <span className="adm-crumb">Veloir / Admin</span>
              <span className="adm-page-name">{currentTitle(location.pathname)}</span>
            </div>
          </header>

          <div className="adm-content">
            <Outlet />
          </div>
        </div>
      </AdminUIProvider>
    </div>
  );
}
