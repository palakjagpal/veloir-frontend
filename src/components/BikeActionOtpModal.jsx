import { useEffect, useRef, useState } from "react";
import {
  FiArrowRight,
  FiCheckCircle,
  FiShield,
  FiX,
} from "react-icons/fi";
import { api } from "../lib/api";

const OTP_LENGTH = 6;

export default function BikeActionOtpModal({
  isOpen,
  onClose,
  bikeId,
  operationId,
  action,
  maskedEmail,
  onSuccess,
}) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [seconds, setSeconds] = useState(30);

  const refs = useRef([]);

  useEffect(() => {
    if (!isOpen) return;

    setDigits(Array(OTP_LENGTH).fill(""));
    setError("");
    setBusy(false);
    setVerified(false);
    setSeconds(30);

    const timer = setTimeout(() => {
      refs.current[0]?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, operationId]);

  useEffect(() => {
    if (!isOpen || seconds <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setSeconds((value) => value - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [seconds, isOpen]);

  const handleDigitChange = (value, index) => {
    if (!/^\d?$/.test(value)) {
      return;
    }

    const next = [...digits];
    next[index] = value;

    setDigits(next);
    setError("");

    if (value && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event, index) => {
    if (
      event.key === "Backspace" &&
      !digits[index] &&
      index > 0
    ) {
      refs.current[index - 1]?.focus();
    }

    if (event.key === "Enter") {
      handleVerify();
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (pasted.length !== OTP_LENGTH) {
      return;
    }

    event.preventDefault();

    setDigits(pasted.split(""));
    refs.current[OTP_LENGTH - 1]?.focus();
  };

  const handleVerify = async () => {
    const otp = digits.join("");

    if (otp.length !== OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit verification code.`);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await api(
        `/api/bikes/${bikeId}/security/verify-otp`,
        {
          method: "POST",
          body: JSON.stringify({
            operationId,
            otp,
          }),
        }
      );

      setVerified(true);

      setTimeout(() => {
        onSuccess?.(response);
        onClose?.();
      }, 500);
    } catch (err) {
      setError(
        err.message ||
          "Invalid verification code. Please try again."
      );

      setDigits(Array(OTP_LENGTH).fill(""));
      refs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (seconds > 0 || busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await api(
        `/api/bikes/${bikeId}/security/resend-otp`,
        {
          method: "POST",
          body: JSON.stringify({
            operationId,
          }),
        }
      );

      setSeconds(30);
      setDigits(Array(OTP_LENGTH).fill(""));

      setTimeout(() => {
        refs.current[0]?.focus();
      }, 50);
    } catch (err) {
      setError(
        err.message ||
          "Unable to resend verification code."
      );
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const isDelete = action === "delete";

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#092532] text-white">
            <FiShield size={22} />
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <FiX />
          </button>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
            Secure verification
          </p>

          <h2 className="mt-1 text-2xl font-bold text-[#092532]">
            {isDelete
              ? "Verify deletion"
              : "Verify update"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Enter the {OTP_LENGTH}-digit code sent to{" "}
            <strong className="text-gray-700">
              {maskedEmail || "your registered email"}
            </strong>
            .
          </p>

          <div
            className="mt-7 flex justify-between gap-2"
            onPaste={handlePaste}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  refs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={busy || verified}
                onChange={(event) =>
                  handleDigitChange(
                    event.target.value,
                    index
                  )
                }
                onKeyDown={(event) =>
                  handleKeyDown(event, index)
                }
                className={`h-14 w-11 rounded-xl border text-center text-xl font-semibold outline-none transition
                  ${
                    error
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 bg-gray-50 focus:border-emerald-400 focus:bg-white"
                  }
                `}
                aria-label={`OTP digit ${index + 1}`}
              />
            ))}
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          {verified && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <FiCheckCircle />
              Verification successful.
            </p>
          )}

          <button
            type="button"
            onClick={handleVerify}
            disabled={busy || verified}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#092532] px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Verifying..."
              : verified
                ? "Verified"
                : isDelete
                  ? "Verify & Delete"
                  : "Verify & Update"}

            {!verified && <FiArrowRight />}
          </button>

          <div className="mt-5 text-center text-sm text-gray-500">
            Didn't receive the code?{" "}

            {seconds > 0 ? (
              <span className="font-medium text-gray-700">
                Resend in {seconds}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={busy}
                className="font-semibold text-emerald-700 hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="mt-4 w-full text-sm text-gray-500 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}