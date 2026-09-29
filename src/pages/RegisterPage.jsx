// frontend/src/pages/RegisterPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";
import {API_BASE_URL, api } from "../lib/api";
import { useAuth } from '../context/AuthContext'
import { Logo } from "../components/Layout";
import TwoFactorAuthModal from '../components/TwoFactorAuthModal'
import "../password-field.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSuccess(response.msg || "Account created. You can now sign in.");
      setTimeout(() => navigate("/login"), 1400);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <div className="auth-panel">
        <Link to="/" className="back">← Back to Veloir</Link>
        <Logo />
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
        >
          <p className="eyebrow">Begin your journey</p>
          <h1>
            Join the
            <br />
            <em>Veloir road.</em>
          </h1>
          <p className="form-intro">
            Create your account to discover motorcycles and connect with riders.
          </p>
          <label>
            Your name
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Your full name"
            />
          </label>
          <label>
            Email address
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="you@example.com"
            />
          </label>
          <label>
            Create a password
            <span className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                minLength="6"
                required
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </span>
          </label>
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}
          <button className="btn btn-mint full" disabled={busy}>
            {busy ? "Creating your account…" : "Create account"}{" "}
            <FiArrowRight />
          </button>

          <button
                      type="button"
                      className="google"
                      onClick={() => location.assign(`${API_BASE_URL}/api/auth/google?intent=register`)}
                    >
                      Continue with Google
                    </button>
          
          <p className="form-foot">
            Already riding with us? <Link to="/login">Sign in</Link>
          </p>
        </motion.form>
      </div>
    </main>
  );
}