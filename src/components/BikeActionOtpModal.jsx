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

  // Reset modal state whenever a new verification operation opens.
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

  // Keep the resend countdown running only while the modal is open.
  useEffect(() => {
    if (!isOpen || seconds <= 0) return;

    const timer = setTimeout(() => {
      setSeconds((value) => value - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [seconds, isOpen]);

  // Prevent the page behind the modal from scrolling on mobile.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleDigitChange = (value, index) => {
    const numeric = value.replace(/\D/g, "");

    if (value !== "" && !numeric) return;

    const next = [...digits];

    // Also support mobile OTP autofill, which can populate
    // multiple digits into the first input at once.
    if (numeric.length > 1) {
      const incoming = numeric.slice(0, OTP_LENGTH - index);

      incoming.split("").forEach((digit, offset) => {
        next[index + offset] = digit;
      });

      setDigits(next);
      setError("");

      const focusIndex = Math.min(
        index + incoming.length,
        OTP_LENGTH - 1
      );

      refs.current[focusIndex]?.focus();
      return;
    }

    next[index] = numeric;
    setDigits(next);
    setError("");

    if (numeric && index < OTP_LENGTH - 1) {
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

    if (event.key === "Enter" && !busy && !verified) {
      handleVerify();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }

    if (
      event.key === "ArrowRight" &&
      index < OTP_LENGTH - 1
    ) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    event.preventDefault();

    const next = Array(OTP_LENGTH).fill("");

    pasted.split("").forEach((digit, index) => {
      next[index] = digit;
    });

    setDigits(next);
    setError("");

    refs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
  };

  const handleVerify = async () => {
    if (busy || verified) return;

    const otp = digits.join("");

    if (otp.length !== OTP_LENGTH) {
      setError(
        `Please enter the ${OTP_LENGTH}-digit verification code.`
      );
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

      setTimeout(() => {
        refs.current[0]?.focus();
      }, 0);
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (seconds > 0 || busy || verified) return;

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

  if (!isOpen) return null;

  const isDelete = action === "delete";

  return (
    <div
      className="
        fixed inset-0 z-[1000]
        overflow-y-auto overscroll-contain
        bg-black/60
        px-3 py-3
        sm:px-6 sm:py-6
      "
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bike-action-otp-title"
          aria-describedby="bike-action-otp-description"
          onClick={(event) => event.stopPropagation()}
          className="
            relative
            flex w-full max-w-md flex-col
            overflow-y-auto overscroll-contain
            rounded-2xl bg-white
            p-4 shadow-2xl
            sm:rounded-3xl sm:p-6
            max-h-[calc(100dvh-1.5rem)]
            sm:max-h-[calc(100dvh-3rem)]
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close verification modal"
              className="
                flex h-10 w-10 shrink-0 items-center justify-center
                rounded-full text-gray-500
                transition hover:bg-gray-100 hover:text-gray-900
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              <FiX size={21} />
            </button>
          </div>

          {/* Modal content */}
          <div className="mt-5 sm:mt-6">
            <h2 style={{
                  letterSpacing: "1px",
                  wordSpacing: "2px",
              }}

              id="bike-action-otp-title"
              className="
                text-xl font-bold leading-tight text-[#092532]
                sm:text-2xl
              "
            >
              {isDelete
                ? "Verify before deletion"
                : "Verify before updating"}
            </h2>

            <p
              id="bike-action-otp-description"
              className="mt-3 text-sm leading-6 text-gray-500"
            >
              Enter the {OTP_LENGTH}-digit verification code sent
              to your registered email{" "}
              <strong className="break-words font-semibold text-gray-800">
                {maskedEmail || "your registered email"}
              </strong>
              .
            </p>

            {/* Responsive OTP inputs */}
            <div
              className="
                mx-auto mt-6 grid w-full max-w-sm
                grid-cols-6 gap-1.5
                sm:mt-7 sm:gap-2
              "
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
                  pattern="[0-9]*"
                  autoComplete={
                    index === 0 ? "one-time-code" : "off"
                  }
                  maxLength={index === 0 ? OTP_LENGTH : 1}
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
                  aria-label={`OTP digit ${index + 1}`}
                  aria-invalid={Boolean(error)}
                  className={`
                    h-12 w-full min-w-0
                    rounded-lg border
                    text-center text-lg font-semibold
                    outline-none transition
                    sm:h-14 sm:rounded-xl sm:text-xl
                    ${
                      error
                        ? "border-red-400 bg-red-50 text-red-700"
                        : verified
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-gray-50 focus:border-emerald-400 focus:bg-white"
                    }
                    disabled:cursor-not-allowed disabled:opacity-75
                  `}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <p
                role="alert"
                className="
                  mt-4 break-words rounded-xl
                  bg-red-50 px-3 py-3
                  text-sm leading-5 text-red-600
                  sm:px-4
                "
              >
                {error}
              </p>
            )}

            {/* Verification success */}
            {verified && (
              <p
                role="status"
                className="
                  mt-4 flex items-start gap-2
                  rounded-xl bg-emerald-50
                  px-3 py-3 text-sm leading-5
                  text-emerald-700 sm:px-4
                "
              >
                <FiCheckCircle
                  className="mt-0.5 shrink-0"
                  size={18}
                />
                <span>Verification successful.</span>
              </p>
            )}

            {/* Primary action */}
            <button
              type="button"
              onClick={handleVerify}
              disabled={busy || verified}
              className="
                mt-6 flex min-h-12 w-full
                items-center justify-center gap-2
                rounded-xl bg-[#092532]
                px-4 py-3.5 text-sm font-semibold text-white
                transition hover:opacity-95
                disabled:cursor-not-allowed disabled:opacity-60
                sm:mt-7
              "
            >
              {busy
                ? "Verifying..."
                : verified
                  ? "Verified"
                  : isDelete
                    ? "Verify & Delete"
                    : "Verify & Update"}

              {!verified && <FiArrowRight size={17} />}
            </button>

            {/* Resend OTP */}
            <div
              className="
                mt-5 flex flex-wrap items-center
                justify-center gap-x-1 gap-y-1
                text-center text-sm leading-6 text-gray-500
              "
            >
              <span>Didn't receive the code?</span>

              {seconds > 0 ? (
                <span className="font-medium text-gray-700">
                  Resend in {seconds}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={busy || verified}
                  className="
                    font-semibold text-emerald-700
                    hover:underline
                    disabled:cursor-not-allowed disabled:opacity-50
                  "
                >
                  Resend code
                </button>
              )}
            </div>

            {/* Cancel */}
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="
                mt-3 min-h-11 w-full rounded-lg
                px-4 py-2 text-sm font-medium text-gray-500
                transition hover:bg-gray-50 hover:text-gray-800
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}