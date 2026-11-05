
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://veloir-backend.onrender.com/api";

const CLEAN_API_BASE = String(RAW_API_BASE).replace(/\/+$/, "");

const API_BASE = CLEAN_API_BASE.endsWith("/api")
  ? CLEAN_API_BASE
  : `${CLEAN_API_BASE}/api`;

// Reusable POST request helper.
async function postJson(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(
      payload.message || `Request failed (HTTP ${response.status}).`
    );
  }

  return payload;
}

// Format OTP expiration countdown.
function formatTime(seconds) {
  const value = Math.max(0, Number(seconds) || 0);

  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { loginAdmin, isAuthenticated, status } = useAdminAuth();

  const [step, setStep] = useState("credentials");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");

  const [maskedEmail, setMaskedEmail] = useState(
    "your administrator email"
  );

  const [secondsLeft, setSecondsLeft] = useState(300);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Redirect an already authenticated administrator.
  useEffect(() => {
    if (status === "authenticated" && isAuthenticated) {
      navigate("/admin", { replace: true });
    }
  }, [status, isAuthenticated, navigate]);

  // OTP countdown.
  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [step, secondsLeft]);

  const expired = step === "otp" && secondsLeft <= 0;

  const heading = useMemo(
    () =>
      step === "credentials"
        ? "Administrator sign in"
        : "Verify it’s you",
    [step]
  );

  // STEP 1: Administrator email and password.
  const handleCredentialsSubmit = async (event) => {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const payload = await postJson("/admin-auth/login", {
        email: email.trim(),
        password,
      });

      if (!payload.challengeId || !payload.requiresEmailOtp) {
        throw new Error(
          "The administrator verification challenge could not be created."
        );
      }

      setChallengeId(payload.challengeId);

      setMaskedEmail(payload.maskedEmail || email);

      setSecondsLeft(Number(payload.expiresInSeconds) || 300);

      setOtp("");

      setStep("otp");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  // STEP 2: Verify OTP and establish persistent admin session.
  const handleOtpSubmit = async (event) => {
    event.preventDefault();

    if (busy) return;

    if (expired) {
      setError(
        "This code has expired. Go back and request a new code."
      );
      return;
    }

    if (!challengeId || otp.length !== 6) {
      setError("Please enter a valid six-digit verification code.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const payload = await postJson("/admin-auth/verify-otp", {
        challengeId,
        otp,
      });

      // Validate the actual administrator JWT response.
      if (!payload.token || payload.user?.isAdmin !== true) {
        throw new Error(
          "The server did not return a valid administrator session."
        );
      }

      // IMPORTANT:
      // AdminAuthContext saves the token using its dedicated
      // veloir_admin_token localStorage key and updates React state.
      // Do not write this token into customer authentication keys.
      loginAdmin(payload.token, payload.user);

      // Preserve the requested dashboard destination if available.
      const requestedPath = location.state?.from?.pathname;

      // Only allow navigation to internal admin routes.
      const destination =
        typeof requestedPath === "string" &&
        requestedPath.startsWith("/admin") &&
        !requestedPath.startsWith("/admin/login")
          ? requestedPath
          : "/admin";

      // No full-page reload required.
      navigate(destination, { replace: true });

    } catch (requestError) {
      setError(
        requestError.message ||
          "The verification code could not be confirmed."
      );

      setBusy(false);
    }
  };

  // Return to credentials step.
  const returnToCredentials = () => {
    setStep("credentials");

    setOtp("");
    setChallengeId("");

    setSecondsLeft(300);

    setError("");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f7f3] px-4 py-10 text-[#092532] sm:px-6">

      <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-[#c7e2b2]/45 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-36 -right-28 h-96 w-96 rounded-full bg-[#89c9b8]/30 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[26px] border border-[#dce7df] bg-white shadow-[0_28px_90px_rgba(9,37,50,0.13)] lg:grid-cols-[0.95fr_1.05fr]">

        {/* LEFT BRANDING PANEL */}

        <aside className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-[#092532] p-10 text-white lg:flex">

          <div className="absolute -right-24 top-20 h-72 w-72 rounded-full border border-[#89c9b8]/20" />

          <div className="absolute -right-8 top-36 h-56 w-56 rounded-full border border-[#89c9b8]/25" />

          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-[#89c9b8]/10 blur-2xl" />

          <div className="relative z-10">

            <div className="flex items-center gap-3">

              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#89c9b8] text-[#092532]">
                <ShieldCheck size={23} />
              </span>

              <div>
                <p className="text-xl font-black tracking-[0.18em]">
                  VELOIR
                </p>

                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#a9c9bf]">
                  Administration
                </p>
              </div>

            </div>

          </div>

          <div className="relative z-10 max-w-sm">

            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#89c9b8]/30 bg-white/5 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#b5dfd1]">

              <Sparkles size={13} />

              Control centre

            </p>

            <h1 className="text-[42px] font-extrabold leading-[1.1] tracking-tight">
              Everything moving. One clear view.
            </h1>

            <p className="mt-5 text-sm leading-7 text-[#c5d4d2]">
              Manage marketplace activity, review documents,
              monitor rentals and keep the Veloir community
              running smoothly.
            </p>

          </div>

          <div className="relative z-10 flex items-center gap-3 border-t border-white/10 pt-6 text-xs text-[#a9c1bd]">

            <LockKeyhole size={16} className="text-[#89c9b8]" />

            Protected administrator access

          </div>

        </aside>

        {/* LOGIN PANEL */}

        <section className="flex min-h-[620px] flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">

          {/* MOBILE BRANDING */}

          <div className="mb-9 flex items-center gap-3 lg:hidden">

            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#092532] text-[#89c9b8]">
              <ShieldCheck size={23} />
            </span>

            <div>
              <p className="text-lg font-black tracking-[0.16em]">
                VELOIR
              </p>

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#678078]">
                Admin portal
              </p>
            </div>

          </div>

          <AnimatePresence mode="wait">

            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >

              {/* HEADING */}

              <div className="mb-7">

                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#568075]">
                  Secure access
                </p>

                <h2 className="text-3xl font-extrabold tracking-tight sm:text-[35px]">
                  {heading}
                </h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-[#71817d]">

                  {step === "credentials"
                    ? "Sign in with the dedicated Veloir administrator account. A verification code will be sent to your registered administrator email."
                    : `Enter the six-digit code sent to ${maskedEmail}. It expires in five minutes.`}

                </p>

              </div>

              {/* ERROR MESSAGE */}

              {error ? (

                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2 rounded-xl border border-[#f0d1d1] bg-[#fff4f3] px-4 py-3 text-sm font-medium text-[#9b4141]"
                >

                  <span className="mt-0.5">!</span>

                  <span>{error}</span>

                </div>

              ) : null}

              {/* CREDENTIALS FORM */}

              {step === "credentials" ? (

                <form
                  onSubmit={handleCredentialsSubmit}
                  className="space-y-5"
                >

                  {/* EMAIL */}

                  <label className="block">

                    <span className="mb-2 block text-xs font-extrabold text-[#344f50]">
                      Administrator email
                    </span>

                    <span className="relative block">

                      <Mail
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#80938c]"
                      />

                      <input
                        type="email"
                        autoComplete="username"
                        required
                        value={email}
                        onChange={(event) =>
                          setEmail(event.target.value)
                        }
                        className="h-14 w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] py-3.5 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#5a9b8b] focus:ring-4 focus:ring-[#89c9b8]/20"
                        placeholder="admin@veloir.in"
                      />

                    </span>

                  </label>

                  {/* PASSWORD */}

                  <label className="block">

                    <span className="mb-2 block text-xs font-extrabold text-[#344f50]">
                      Password
                    </span>

                    <span className="relative block">

                      <KeyRound
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#80938c]"
                      />

                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) =>
                          setPassword(event.target.value)
                        }
                        className="h-14 w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] py-3.5 pl-11 pr-12 text-sm font-semibold outline-none transition focus:border-[#5a9b8b] focus:ring-4 focus:ring-[#89c9b8]/20"
                        placeholder="Enter administrator password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((value) => !value)
                        }
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#738780] hover:bg-[#eef5f0]"
                      >

                        {showPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}

                      </button>

                    </span>

                  </label>

                  {/* LOGIN BUTTON */}

                  <button
                    type="submit"
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#092532] px-5 py-4 text-sm font-extrabold text-white shadow-[0_10px_20px_rgba(9,37,50,0.16)] transition hover:bg-[#174454] disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {busy
                      ? "Checking credentials..."
                      : "Continue securely"}

                    {!busy ? <ArrowRight size={17} /> : null}

                  </button>

                </form>

              ) : (

                /* OTP FORM */

                <form
                  onSubmit={handleOtpSubmit}
                  className="space-y-5"
                >

                  <label className="block">

                    <span className="mb-2 block text-xs font-extrabold text-[#344f50]">
                      Email verification code
                    </span>

                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(event) =>
                        setOtp(
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6)
                        )
                      }
                      className="h-16 w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] px-4 text-center text-2xl font-extrabold tracking-[0.55em] text-[#092532] outline-none transition focus:border-[#5a9b8b] focus:ring-4 focus:ring-[#89c9b8]/20"
                      placeholder="••••••"
                    />

                  </label>

                  {/* OTP TIMER */}

                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f3f8f4] px-4 py-3 text-xs">

                    <span className="inline-flex items-center gap-2 font-semibold text-[#54716a]">

                      <Mail size={15} />

                      Sent to admin inbox

                    </span>

                    <span
                      className={`font-extrabold tabular-nums ${
                        expired
                          ? "text-[#b34c4c]"
                          : "text-[#294e4a]"
                      }`}
                    >

                      {expired
                        ? "Expired"
                        : `Expires in ${formatTime(secondsLeft)}`}

                    </span>

                  </div>

                  {/* VERIFY BUTTON */}

                  <button
                    type="submit"
                    disabled={busy || otp.length !== 6 || expired}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#092532] px-5 py-4 text-sm font-extrabold text-white shadow-[0_10px_20px_rgba(9,37,50,0.16)] transition hover:bg-[#174454] disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    {busy
                      ? "Verifying..."
                      : "Verify and open dashboard"}

                    {!busy ? <CheckCircle2 size={17} /> : null}

                  </button>

                  {/* BACK BUTTON */}

                  <button
                    type="button"
                    onClick={returnToCredentials}
                    className="flex w-full items-center justify-center gap-2 py-2 text-xs font-bold text-[#55776d] hover:text-[#092532]"
                  >

                    <ArrowLeft size={14} />

                    Back to administrator sign in

                  </button>

                </form>

              )}

            </motion.div>

          </AnimatePresence>

          {/* FOOTER */}

          <div className="mt-9 border-t border-[#edf1ed] pt-5 text-center">

            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#668078] transition hover:text-[#092532]"
            >

              <ArrowLeft size={14} />

              Return to customer login

            </Link>

            <p className="mt-4 text-[10px] leading-5 text-[#98a6a1]">

              Only accounts created in the separate administrator
              collection can access this portal. Customer accounts
              cannot use administrator sessions.

            </p>

            <Link
              to="/admin/register"
              className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-[#315e53] transition hover:text-[#092532]"
            >

              Create an administrator account

              <ArrowRight size={14} />

            </Link>

          </div>

        </section>

      </div>

    </main>
  );
}
