import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bike,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NavLink, useNavigate } from "react-router-dom";

const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://veloir-backend.onrender.com/api";

const CLEAN_API_BASE = String(RAW_API_BASE).replace(/\/+$/, "");
const API_BASE = CLEAN_API_BASE.endsWith("/api")
  ? CLEAN_API_BASE
  : `${CLEAN_API_BASE}/api`;

const NAV_ITEMS = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "Bike listings", to: "/admin/listings", icon: Bike },
  { label: "Document reviews", to: "/admin/document-review", icon: FileCheck2 },
  { label: "Rental disputes", to: "/admin/rentals/disputes", icon: ShieldCheck },
];

const PIE_COLORS = ["#092532", "#89c9b8"];

function safeParse(value) {
  if (!value || typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function readStoredToken() {
  if (typeof window === "undefined") return "";

  const directKeys = [
    "token",
    "accessToken",
    "authToken",
    "jwtToken",
    "access_token",
    "auth_token",
    "userToken",
    "veloirToken",
  ];
  const objectKeys = ["auth", "authData", "user", "userInfo", "currentUser", "veloirUser"];
  const stores = [window.localStorage, window.sessionStorage].filter(Boolean);

  for (const store of stores) {
    for (const key of directKeys) {
      const value = safeParse(store.getItem(key));
      if (typeof value === "string" && value.trim()) {
        return value.replace(/^Bearer\s+/i, "").trim();
      }
      if (value && typeof value === "object") {
        const nested = value.token || value.accessToken || value.jwt || value.access_token;
        if (typeof nested === "string" && nested.trim()) return nested.trim();
      }
    }

    for (const key of objectKeys) {
      const value = safeParse(store.getItem(key));
      if (!value || typeof value !== "object") continue;
      const nested =
        value.token ||
        value.accessToken ||
        value.jwt ||
        value.access_token ||
        value.auth?.token ||
        value.user?.token;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
  }

  return "";
}

function readStoredAdmin() {
  if (typeof window === "undefined") return null;
  const keys = ["user", "userInfo", "currentUser", "authUser", "profile"];
  const stores = [window.localStorage, window.sessionStorage].filter(Boolean);

  for (const store of stores) {
    for (const key of keys) {
      const value = safeParse(store.getItem(key));
      if (value && typeof value === "object") {
        const candidate = value.user || value.currentUser || value;
        if (candidate && (candidate.name || candidate.email || candidate.role)) return candidate;
      }
    }
  }
  return null;
}

async function adminRequest(path, signal) {
  const token = readStoredToken();
  if (!token) {
    throw new Error(
      "Your Veloir login token was not found in browser storage. Sign in again, then check that your existing authentication flow saves its JWT in localStorage or sessionStorage."
    );
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message =
      payload.message ||
      (response.status === 401
        ? "Your session has expired. Please sign in again."
        : response.status === 403
          ? "This account does not have administrator access."
          : `Unable to load dashboard data (HTTP ${response.status}).`);
    throw new Error(message);
  }

  return payload;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function initials(value = "Admin") {
  return String(value)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "AD";
}

function MetricCard({ label, value, detail, icon: Icon, iconClass, delay = 0 }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl border border-[#e4ebe5] bg-white p-5 shadow-[0_8px_24px_rgba(9,37,50,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(9,37,50,0.075)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-[#71817f]">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#092532] sm:text-[34px]">
            {formatNumber(value)}
          </p>
          <p className="mt-1.5 text-xs font-medium text-[#82908c]">{detail}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconClass}`}>
          <Icon size={20} strokeWidth={2.1} />
        </span>
      </div>
    </motion.article>
  );
}

function StatusPill({ approved }) {
  return approved ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f5ec] px-2.5 py-1 text-[11px] font-bold text-[#28734c]">
      <CheckCircle2 size={12} /> Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4dc] px-2.5 py-1 text-[11px] font-bold text-[#936b1a]">
      <Clock3 size={12} /> Pending
    </span>
  );
}

function SectionHeading({ eyebrow, title, action, onAction }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[1.6px] text-[#648078]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-extrabold tracking-tight text-[#092532] sm:text-xl">{title}</h2>
      </div>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#386e65] transition hover:text-[#092532]"
        >
          {action} <ArrowRight size={14} />
        </button>
      ) : null}
    </div>
  );
}

function LoadingDashboard() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard" aria-busy="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[132px] animate-pulse rounded-2xl border border-[#e5ece6] bg-white" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="h-[320px] animate-pulse rounded-2xl border border-[#e5ece6] bg-white" />
        <div className="h-[320px] animate-pulse rounded-2xl border border-[#e5ece6] bg-white" />
      </div>
    </div>
  );
}

function Sidebar({ open, onClose, admin }) {
  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            type="button"
            aria-label="Close navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-[#061a23]/60 backdrop-blur-[2px] lg:hidden"
          />
        ) : null}
      </AnimatePresence>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-[#092532] text-white shadow-2xl transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:z-30 lg:shadow-none`}
      >
        <div className="flex h-[82px] items-center justify-between border-b border-white/10 px-6">
          <NavLink to="/admin" onClick={onClose} className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#89c9b8] text-[#092532]">
              <Bike size={23} strokeWidth={2.3} />
            </span>
            <span>
              <span className="block font-['Comfortaa'] text-[21px] font-bold tracking-[-1.3px]">veloir</span>
              <span className="mt-0.5 block text-[9px] font-extrabold uppercase tracking-[2px] text-[#89c9b8]">Admin console</span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[1.6px] text-white/40">
            Workspace
          </p>
          <nav className="space-y-1" aria-label="Admin navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[13px] font-bold transition ${
                      isActive
                        ? "bg-[#89c9b8] text-[#092532] shadow-[0_8px_18px_rgba(137,201,184,0.16)]"
                        : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={2.1} />
                  <span>{item.label}</span>
                  <ChevronRight className="ml-auto opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-60" size={15} />
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto px-4 pb-5">
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
            <div className="mb-3 flex items-center gap-2 text-[#c7e2b2]">
              <CircleHelp size={16} />
              <span className="text-[11px] font-extrabold">Admin workspace</span>
            </div>
            <p className="text-[11px] leading-5 text-white/55">
              Review marketplace activity, verify documents and manage rental escalations.
            </p>
            <NavLink
              to="/"
              onClick={onClose}
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#89c9b8] hover:text-white"
            >
              Open marketplace <ArrowRight size={13} />
            </NavLink>
          </div>
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#c7e2b2] text-xs font-extrabold text-[#092532]">
              {initials(admin?.name || "Admin")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold text-white">{admin?.name || "Veloir Admin"}</p>
              <p className="truncate text-[10px] text-white/45">{admin?.email || "Administrator"}</p>
            </div>
            <span className="rounded-md border border-[#89c9b8]/30 px-1.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#89c9b8]">
              Admin
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [admin] = useState(() => readStoredAdmin());

  const loadDashboard = useCallback(async (signal, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await adminRequest("/admin/dashboard/stats", signal);
      if (response?.success === false) {
        throw new Error(response.message || "The server could not provide dashboard statistics.");
      }
      setDashboard(response?.data || null);
    } catch (requestError) {
      if (requestError?.name !== "AbortError") {
        setError(requestError?.message || "Unable to load the administrator dashboard.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  const metrics = dashboard?.metrics || {};
  const recentBikes = Array.isArray(dashboard?.recentBikes) ? dashboard.recentBikes : [];
  const recentUsers = Array.isArray(dashboard?.recentUsers) ? dashboard.recentUsers : [];

  const metricCards = [
    {
      label: "Total users",
      value: metrics.totalUsers,
      detail: "Registered Veloir accounts",
      icon: Users,
      iconClass: "bg-[#e9f4ec] text-[#2d7154]",
    },
    {
      label: "Bike listings",
      value: metrics.totalBikes,
      detail: "All marketplace listings",
      icon: Bike,
      iconClass: "bg-[#e9f0f5] text-[#315f78]",
    },
    {
      label: "Pending listings",
      value: metrics.pendingBikes,
      detail: "Awaiting admin approval",
      icon: Clock3,
      iconClass: "bg-[#fff3df] text-[#9a7022]",
    },
    {
      label: "Published bikes",
      value: metrics.approvedBikes,
      detail: "Approved listings",
      icon: CheckCircle2,
      iconClass: "bg-[#e7f5ec] text-[#28734c]",
    },
    {
      label: "Pending KYC reviews",
      value: metrics.pendingManualReviews,
      detail: "Manual document submissions",
      icon: FileCheck2,
      iconClass: "bg-[#f0eafa] text-[#7655a2]",
    },
    {
      label: "Open rental disputes",
      value: metrics.openDisputes,
      detail: "Requiring administrator review",
      icon: AlertTriangle,
      iconClass: "bg-[#fff0ed] text-[#b85643]",
    },
  ];

  const activityData = useMemo(
    () => [
      { name: "Inquiries", value: Number(metrics.totalInquiries) || 0, fill: "#89c9b8" },
      { name: "Offers", value: Number(metrics.totalOffers) || 0, fill: "#5b8b83" },
      { name: "Purchases", value: Number(metrics.totalPurchases) || 0, fill: "#092532" },
      { name: "Rentals", value: Number(metrics.totalRentals) || 0, fill: "#b6d89e" },
    ],
    [metrics.totalInquiries, metrics.totalOffers, metrics.totalPurchases, metrics.totalRentals]
  );

  const listingData = useMemo(
    () => [
      { name: "Published", value: Number(metrics.approvedBikes) || 0 },
      { name: "Pending", value: Number(metrics.pendingBikes) || 0 },
    ],
    [metrics.approvedBikes, metrics.pendingBikes]
  );

  const filteredBikes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return recentBikes;
    return recentBikes.filter((bike) =>
      [bike.title, bike.brand, bike.model, bike.status].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [recentBikes, searchTerm]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return recentUsers;
    return recentUsers.filter((user) =>
      [user.name, user.email, user.role].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [recentUsers, searchTerm]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const handleRefresh = () => {
    const controller = new AbortController();
    loadDashboard(controller.signal, true);
  };

  const quickActions = [
    {
      title: "Bike listing approvals",
      description: "Inspect and approve marketplace submissions.",
      count: metrics.pendingBikes,
      icon: Bike,
      to: "/admin/listings",
      tone: "bg-[#e9f0f5] text-[#315f78]",
      action: "Review listings",
    },
    {
      title: "Manual document reviews",
      description: "Review submitted RC and driving-licence documents.",
      count: metrics.pendingManualReviews,
      icon: FileCheck2,
      to: "/admin/document-review",
      tone: "bg-[#f0eafa] text-[#7655a2]",
      action: "Review documents",
    },
    {
      title: "Rental dispute queue",
      description: "Review open rental cases and record resolutions.",
      count: metrics.openDisputes,
      icon: ShieldCheck,
      to: "/admin/rentals/disputes",
      tone: "bg-[#fff0ed] text-[#b85643]",
      action: "Manage disputes",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7f3] text-[#092532]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} admin={admin} />

      <div className="min-h-screen lg:pl-[270px]">
        <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-[#e5ece6] bg-white/90 px-4 backdrop-blur-xl sm:px-6 xl:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e2eae3] bg-white text-[#092532] transition hover:bg-[#f3f8f3] lg:hidden"
            >
              <Menu size={19} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#688079]">Veloir / Admin</p>
              <p className="mt-0.5 truncate text-sm font-extrabold text-[#092532]">Dashboard overview</p>
            </div>
          </div>

          <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-xl bg-[#f5f8f4] px-3 py-2 text-[11px] font-bold text-[#667b7e] md:flex">
              <CalendarDays size={14} className="text-[#4c7d70]" />
              {todayLabel}
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/document-review")}
              aria-label="Open pending document reviews"
              title="Document review queue"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#e5ece6] bg-white text-[#49645e] transition hover:bg-[#f3f8f3]"
            >
              <Bell size={17} />
              {Number(metrics.pendingManualReviews) > 0 ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#d56a54]" />
              ) : null}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#092532] px-3.5 text-xs font-extrabold text-white transition hover:bg-[#174352] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 pb-10 pt-7 sm:px-6 sm:pt-8 xl:px-9">
          <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#dce9df] bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1.1px] text-[#52766a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4c9b72]" /> Live marketplace overview
              </div>
              <h1 className="text-[28px] font-extrabold leading-tight tracking-[-1.5px] text-[#092532] sm:text-[34px]">
                {greeting}, {admin?.name?.split(" ")?.[0] || "Admin"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71817f]">
                Monitor Veloir marketplace performance and keep key review queues moving.
              </p>
            </div>

            <div className="flex w-full items-center gap-2 rounded-xl border border-[#e3ebe4] bg-white px-3.5 py-2.5 shadow-sm sm:max-w-[340px]">
              <Search size={16} className="shrink-0 text-[#84938e]" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search recent listings or users"
                aria-label="Search recent listings and users"
                className="w-full min-w-0 border-0 bg-transparent text-xs font-semibold text-[#092532] outline-none placeholder:font-medium placeholder:text-[#9aa6a1] focus:ring-0"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[#84938e] hover:bg-[#f0f5f0] hover:text-[#092532]"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#efd5d0] bg-[#fff7f5] p-4 text-sm text-[#914b3d] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                <div>
                  <p className="font-extrabold">Dashboard data could not be loaded</p>
                  <p className="mt-1 text-xs leading-5">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#e4c7c0] bg-white px-3 py-2 text-xs font-extrabold text-[#834438] hover:bg-[#fff0ec] disabled:opacity-60 sm:self-center"
              >
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Try again
              </button>
            </div>
          ) : null}

          {loading ? (
            <LoadingDashboard />
          ) : dashboard ? (
            <>
              <section aria-label="Marketplace statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {metricCards.map((card, index) => (
                  <MetricCard key={card.label} {...card} delay={index * 0.045} />
                ))}
              </section>

              <section className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.85fr]">
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.12 }}
                  className="min-w-0 rounded-2xl border border-[#e4ebe5] bg-white p-5 shadow-[0_8px_24px_rgba(9,37,50,0.035)] sm:p-6"
                >
                  <SectionHeading eyebrow="Marketplace activity" title="Buyer journey snapshot" />
                  <p className="-mt-3 mb-3 text-xs leading-5 text-[#82908c]">
                    Current totals across the inquiry, offer, purchase and rental modules.
                  </p>
                  {activityData.some((item) => item.value > 0) ? (
                    <div className="h-[255px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activityData} layout="vertical" margin={{ top: 8, right: 18, left: 4, bottom: 4 }}>
                          <CartesianGrid stroke="#edf2ed" horizontal={false} />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#82908c", fontSize: 11 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={78}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#526a65", fontSize: 11, fontWeight: 700 }}
                          />
                          <Tooltip
                            cursor={{ fill: "#f4f8f4" }}
                            contentStyle={{ border: "1px solid #e1eae2", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 24px rgba(9,37,50,.08)" }}
                            formatter={(value) => [formatNumber(value), "Total"]}
                          />
                          <Bar dataKey="value" radius={[0, 7, 7, 0]} maxBarSize={28}>
                            {activityData.map((item) => <Cell key={item.name} fill={item.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="grid h-[255px] place-items-center rounded-xl bg-[#f8faf7] text-center">
                      <div>
                        <Activity className="mx-auto mb-2 text-[#9aaba4]" size={25} />
                        <p className="text-xs font-bold text-[#71817f]">No marketplace activity recorded yet</p>
                        <p className="mt-1 text-[11px] text-[#9aa6a1]">Counts will appear as users interact with Veloir.</p>
                      </div>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.18 }}
                  className="min-w-0 rounded-2xl border border-[#e4ebe5] bg-white p-5 shadow-[0_8px_24px_rgba(9,37,50,0.035)] sm:p-6"
                >
                  <SectionHeading eyebrow="Listing health" title="Approval overview" action="Open listings" onAction={() => navigate("/admin/listings")} />
                  <div className="flex min-h-[250px] flex-col items-center justify-center sm:flex-row sm:gap-2">
                    {Number(metrics.totalBikes) > 0 ? (
                      <div className="h-[220px] w-full max-w-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={listingData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="48%"
                              innerRadius={62}
                              outerRadius={90}
                              paddingAngle={4}
                              stroke="none"
                            >
                              {listingData.map((item, index) => (
                                <Cell key={item.name} fill={PIE_COLORS[index]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ border: "1px solid #e1eae2", borderRadius: 12, fontSize: 12 }}
                              formatter={(value, name) => [formatNumber(value), name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="grid h-[220px] w-full max-w-[250px] place-items-center text-center">
                        <div className="grid h-36 w-36 place-items-center rounded-full border-[14px] border-[#edf3ed] text-center">
                          <div><p className="text-2xl font-extrabold">0</p><p className="text-[10px] font-bold text-[#84938e]">Total bikes</p></div>
                        </div>
                      </div>
                    )}
                    <div className="grid w-full gap-3 sm:max-w-[150px]">
                      <div className="rounded-xl bg-[#f5f8f4] p-3.5">
                        <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-[#6e8179]"><span className="h-2.5 w-2.5 rounded-full bg-[#092532]" /> Published</div>
                        <p className="text-2xl font-extrabold text-[#092532]">{formatNumber(metrics.approvedBikes)}</p>
                      </div>
                      <div className="rounded-xl bg-[#f5f8f4] p-3.5">
                        <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-[#6e8179]"><span className="h-2.5 w-2.5 rounded-full bg-[#89c9b8]" /> Pending</div>
                        <p className="text-2xl font-extrabold text-[#092532]">{formatNumber(metrics.pendingBikes)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between border-t border-[#edf1ed] pt-4 text-[11px]">
                    <span className="font-semibold text-[#82908c]">Total marketplace listings</span>
                    <span className="font-extrabold text-[#092532]">{formatNumber(metrics.totalBikes)}</span>
                  </div>
                </motion.div>
              </section>

              <section className="mt-7">
                <SectionHeading eyebrow="Needs attention" title="Admin review queues" />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {quickActions.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        type="button"
                        key={item.title}
                        onClick={() => navigate(item.to)}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.08 + index * 0.06 }}
                        className="group flex w-full items-start gap-4 rounded-2xl border border-[#e4ebe5] bg-white p-5 text-left shadow-[0_8px_24px_rgba(9,37,50,0.025)] transition hover:-translate-y-0.5 hover:border-[#cbded1] hover:shadow-[0_12px_28px_rgba(9,37,50,0.07)]"
                      >
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.tone}`}><Icon size={20} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-extrabold text-[#092532]">{item.title}</span>
                            <span className="rounded-full bg-[#f1f5f1] px-2.5 py-1 text-[11px] font-extrabold text-[#49645e]">{formatNumber(item.count)}</span>
                          </span>
                          <span className="mt-1.5 block text-xs leading-5 text-[#82908c]">{item.description}</span>
                          <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#3d7669] group-hover:text-[#092532]">{item.action} <ArrowRight size={13} className="transition group-hover:translate-x-0.5" /></span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              <section className="mt-7 grid grid-cols-1 gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
                <div className="min-w-0 rounded-2xl border border-[#e4ebe5] bg-white p-5 shadow-[0_8px_24px_rgba(9,37,50,0.035)] sm:p-6">
                  <SectionHeading eyebrow="Latest marketplace entries" title="Recent bike listings" action="View all listings" onAction={() => navigate("/admin/listings")} />
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[#edf1ed] text-[10px] font-extrabold uppercase tracking-[1px] text-[#94a19b]">
                          <th className="pb-3 pr-4">Bike</th>
                          <th className="pb-3 pr-4">Created</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBikes.length ? filteredBikes.map((bike) => (
                          <tr key={bike._id || bike.id || `${bike.title}-${bike.createdAt}`} className="border-b border-[#f0f3ef] last:border-0">
                            <td className="py-4 pr-4">
                              <p className="max-w-[260px] truncate text-xs font-extrabold text-[#092532]">{bike.title || `${bike.brand || "Bike"} ${bike.model || ""}`.trim()}</p>
                              <p className="mt-1 text-[10px] font-medium text-[#8a9992]">{[bike.brand, bike.model].filter(Boolean).join(" · ") || "Marketplace listing"}</p>
                            </td>
                            <td className="py-4 pr-4 text-[11px] font-semibold text-[#71817f]">{formatDate(bike.createdAt)}</td>
                            <td className="py-4 pr-4"><StatusPill approved={bike.isApproved === true} /></td>
                            <td className="py-4 text-right">
                              <button type="button" onClick={() => navigate("/admin/listings")} className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#47786d] hover:text-[#092532]">Review <ChevronRight size={13} /></button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} className="py-10 text-center text-xs font-semibold text-[#8b9993]">{searchTerm ? "No recent listings match your search." : "No bike listings available yet."}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[#edf1ed] pt-4 text-[10px] font-semibold text-[#93a099]">
                    <span>Showing up to 5 most recent listings from the dashboard API</span>
                    <span>{filteredBikes.length} shown</span>
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-[#e4ebe5] bg-white p-5 shadow-[0_8px_24px_rgba(9,37,50,0.035)] sm:p-6">
                  <SectionHeading eyebrow="Community growth" title="Newest users" />
                  <div className="space-y-1">
                    {filteredUsers.length ? filteredUsers.map((user) => (
                      <div key={user._id || user.id || user.email} className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-[#f7faf6]">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e9f3e8] text-[11px] font-extrabold text-[#426f5e]">{initials(user.name || user.email || "User")}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-extrabold text-[#092532]">{user.name || "Veloir member"}</p>
                          <p className="mt-1 truncate text-[10px] font-medium text-[#8a9992]">{user.email || "Email unavailable"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#6c877c]">{user.role || "user"}</p>
                          <p className="mt-1 text-[9px] font-medium text-[#a0aaa5]">{formatDate(user.createdAt)}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="py-10 text-center text-xs font-semibold text-[#8b9993]">{searchTerm ? "No recent users match your search." : "No user registrations available yet."}</div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f5f8f4] p-3 text-[10px] leading-5 text-[#71817f]">
                    <Users size={15} className="shrink-0 text-[#5d8173]" />
                    <span>The dashboard API currently returns the five newest user records.</span>
                  </div>
                </div>
              </section>

              <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#e2eae3] pt-5 text-[10px] font-medium text-[#96a39c] sm:flex-row sm:items-center">
                <span>© {new Date().getFullYear()} Veloir Admin Console</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#4d9a71]" /> Data loaded from your Veloir backend{dashboard.generatedAt ? ` · Updated ${formatDate(dashboard.generatedAt)}` : ""}</span>
              </footer>
            </>
          ) : error ? null : (
            <div className="rounded-2xl border border-[#e4ebe5] bg-white p-10 text-center">
              <Wallet size={28} className="mx-auto mb-3 text-[#91a49b]" />
              <p className="text-sm font-extrabold">No dashboard data returned</p>
              <p className="mt-1 text-xs text-[#82908c]">The API responded successfully, but its dashboard payload was empty.</p>
              <button type="button" onClick={handleRefresh} className="mt-4 rounded-lg bg-[#092532] px-4 py-2 text-xs font-bold text-white">Reload dashboard</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
