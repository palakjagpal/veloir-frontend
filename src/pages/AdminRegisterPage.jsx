import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Mail, UserRound } from "lucide-react";

const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://veloir-backend.onrender.com/api";
const CLEAN_API_BASE = String(RAW_API_BASE).replace(/\/+$/, "");
const API_BASE = CLEAN_API_BASE.endsWith("/api") ? CLEAN_API_BASE : `${CLEAN_API_BASE}/api`;

async function postJson(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Request failed (HTTP ${response.status}).`);
  return payload;
}

function formatTime(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export default function AdminRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("details");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [registrationChallengeId, setRegistrationChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("your administrator email");
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (step !== "verify" || secondsLeft <= 0) return undefined;
    const timer = window.setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [step, secondsLeft]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 12) {
      setError("Use an administrator password containing at least 12 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("The password and confirmation do not match.");
      return;
    }

    setBusy(true);
    try {
      const result = await postJson("/admin-auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      if (!result.registrationChallengeId || !result.requiresEmailOtp) {
        throw new Error("The registration verification challenge could not be created.");
      }
      setRegistrationChallengeId(result.registrationChallengeId);
      setMaskedEmail(result.maskedEmail || form.email);
      setSecondsLeft(Number(result.expiresInSeconds) || 300);
      setOtp("");
      setStep("verify");
      setSuccess(result.message || "A verification code has been sent to your email.");
    } catch (requestError) {
      setError(requestError.message || "Unable to start administrator registration.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    setError("");
    if (secondsLeft <= 0) {
      setError("This code has expired. Return to the registration form and try again.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit verification code.");
      return;
    }

    setBusy(true);
    try {
      const result = await postJson("/admin-auth/verify-registration", {
        registrationChallengeId,
        otp,
      });
      setSuccess(result.message || "Administrator account created successfully.");
      setStep("complete");
    } catch (requestError) {
      setError(requestError.message || "Unable to verify administrator registration.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f7f3] px-4 py-10 text-[#092532] sm:px-6">
      <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-[#c7e2b2]/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-28 h-96 w-96 rounded-full bg-[#89c9b8]/30 blur-3xl" />

      <section className="relative z-10 w-full max-w-xl rounded-[26px] border border-[#dce7df] bg-white px-6 py-9 shadow-[0_28px_90px_rgba(9,37,50,0.13)] sm:px-10">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white p-1"><img src="/veloir-logo.png" alt="" className="h-full w-full object-contain" /></span>
          <div>
            <p className="text-lg font-black tracking-[0.16em]">VELOIR</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#678078]">Administrator registration</p>
          </div>
        </div>

        {step === "details" && (
          <>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#568075]">First administrator setup</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Create admin account</h1>
            <p className="mt-3 text-sm leading-6 text-[#71817d]">
              The first administrator must use the email configured in the backend. We will send a one-time verification code before creating the account. Registration closes automatically after the first administrator is created.
            </p>
            {error && <div role="alert" className="mt-5 rounded-xl border border-[#f0d1d1] bg-[#fff4f3] px-4 py-3 text-sm font-medium text-[#9b4141]">{error}</div>}

            <form onSubmit={handleRegister} className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold text-[#344f50]">Full name</span>
                <span className="relative block"><UserRound size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#80938c]" />
                  <input required minLength={2} maxLength={80} value={form.name} onChange={update("name")} autoComplete="name" placeholder="Administrator name" className="h-14 w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#5a9b8b] focus:ring-4 focus:ring-[#89c9b8]/20" />
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold text-[#344f50]">Authorized email address</span>
                <span className="relative block"><Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#80938c]" />
                  <input required type="email" value={form.email} onChange={update("email")} autoComplete="email" placeholder="veloir.inn@gmail.com" className="h-14 w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#5a9b8b] focus:ring-4 focus:ring-[#89c9b8]/20" />
                </span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-extrabold text-[#344f50]">Password (12+ characters)</span>
                  <span className="relative block"><LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#80938c]" />
                    <input required minLength={12} maxLength={128} type="password" value={form.password} onChange={update("password")} autoComplete="new-password" placeholder="Create password" className="h-14 w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#5a9b8b] focus:ring-4 focus:ring-[#89c9b8]/20" />
                  </span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-extrabold text-[#344f50]">Confirm password</span>
                  <span className="relative block"><LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#80938c]" />
                    <input required minLength={12} maxLength={128} type="password" value={form.confirmPassword} onChange={update("confirmPassword")} autoComplete="new-password" placeholder="Confirm password" className="h-14 w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#5a9b8b] focus:ring-4 focus:ring-[#89c9b8]/20" />
                  </span>
                </label>
              </div>
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#092532] px-5 py-4 text-sm font-extrabold text-white shadow-[0_10px_20px_rgba(9,37,50,0.16)] transition hover:bg-[#174454] disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? "Sending verification code…" : "Continue with email verification"}{!busy && <ArrowRight size={17} />}
              </button>
            </form>
          </>
        )}

        {step === "verify" && (
          <>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#568075]">Email verification</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Verify your email</h1>
            <p className="mt-3 text-sm leading-6 text-[#71817d]">Enter the six-digit code sent to <strong>{maskedEmail}</strong>. The code expires in five minutes.</p>
            {success && <div role="status" className="mt-5 rounded-xl border border-[#cfe5d8] bg-[#f0f8f2] px-4 py-3 text-sm font-semibold text-[#275c47]">{success}</div>}
            {error && <div role="alert" className="mt-4 rounded-xl border border-[#f0d1d1] bg-[#fff4f3] px-4 py-3 text-sm font-medium text-[#9b4141]">{error}</div>}
            <form onSubmit={handleVerify} className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold text-[#344f50]">Verification code</span>
                <input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit code" className="h-14 w-full rounded-xl border border-[#dce7df] bg-[#fbfdfb] px-4 text-center text-xl font-extrabold tracking-[0.45em] outline-none focus:border-[#5a9b8b] focus:ring-4 focus:ring-[#89c9b8]/20" />
              </label>
              <div className="flex items-center justify-between text-xs font-semibold text-[#71817d]">
                <span>Code expires in {formatTime(secondsLeft)}</span>
                <button type="button" onClick={() => { setStep("details"); setError(""); setSuccess(""); setOtp(""); }} className="underline">Back to details</button>
              </div>
              <button type="submit" disabled={busy || secondsLeft <= 0 || otp.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#092532] px-5 py-4 text-sm font-extrabold text-white shadow-[0_10px_20px_rgba(9,37,50,0.16)] transition hover:bg-[#174454] disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? "Verifying…" : "Verify and create administrator"}{!busy && <CheckCircle2 size={17} />}
              </button>
            </form>
          </>
        )}

        {step === "complete" && (
          <div className="py-4 text-center">
            <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#e8f5ec] text-[#276947]"><CheckCircle2 size={34} /></span>
            <h1 className="text-3xl font-extrabold tracking-tight">Admin account created</h1>
            <p className="mt-3 text-sm leading-6 text-[#71817d]">{success} You can now sign in using your administrator email and password.</p>
            <button type="button" onClick={() => navigate("/admin/login")} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#092532] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#174454]">Go to admin login <ArrowRight size={17} /></button>
          </div>
        )}

        <div className="mt-7 border-t border-[#edf1ed] pt-5 text-center">
          <Link to="/admin/login" className="inline-flex items-center gap-2 text-xs font-bold text-[#668078] transition hover:text-[#092532]"><ArrowLeft size={14} /> Back to administrator login</Link>
          <p className="mt-4 text-[10px] leading-5 text-[#98a6a1]">Only the backend-configured administrator email can complete the first registration. Registration closes after the first account is created.</p>
        </div>
      </section>
    </main>
  );
}
