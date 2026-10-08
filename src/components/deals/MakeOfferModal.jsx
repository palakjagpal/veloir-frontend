import {
  useEffect,
  useState,
} from "react";

import {
  FiCalendar,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiX,
} from "react-icons/fi";

import toast from "react-hot-toast";

import { createInquiry } from "../../services/dealsService";

import {
  money,
} from "../../pages/deals/dealHelpers";

export default function SendInquiryModal({
  bike,
  user,
  onClose,
  onSuccess,
}) {
  const [form, setForm] =
    useState({
      message: "",
      proposedPrice:
        bike?.price || "",
      buyerPhone:
        user?.phone || "",
      buyerEmail:
        user?.email || "",
      preferredContact:
        "email",
      viewingRequested:
        false,
      viewingDate: "",
      viewingTime: "",
      viewingLocation: "",
    });

  const [busy, setBusy] =
    useState(false);

  useEffect(() => {
    const old =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        old;
    };
  }, []);

  const set = (
    key,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const submit = async (
    event
  ) => {
    event.preventDefault();

    if (!form.message.trim()) {
      toast.error(
        "Message is required."
      );
      return;
    }

    if (
      form.message.trim()
        .length > 1000
    ) {
      toast.error(
        "Message cannot exceed 1000 characters."
      );
      return;
    }

    setBusy(true);

    try {
      const response =
        await createInquiry(
          bike._id,
          {
            ...form,
            proposedPrice:
              Number(
                form.proposedPrice ||
                  bike.price
              ),
          }
        );

      toast.success(
        "Inquiry sent successfully."
      );

      onSuccess?.(
        response.data
      );
    } catch (err) {
      toast.error(
        err.message ||
          "Unable to send inquiry."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="deal-modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="deal-modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="deal-modal-head">
          <div>
            <p className="eyebrow">
              Contact seller
            </p>

            <h2>
              Send an inquiry
            </h2>

            <p>
              {bike?.title} ·{" "}
              {money(bike?.price)}
            </p>
          </div>

          <button
            className="deal-close"
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>

        <form onSubmit={submit}>
          <label>
            Message

            <textarea
              required
              maxLength={1000}
              rows={5}
              placeholder="Tell the seller what you would like to know…"
              value={form.message}
              onChange={(event) =>
                set(
                  "message",
                  event.target.value
                )
              }
            />
          </label>

          <div className="deal-form-grid">
            <label>
              Proposed price

              <input
                type="number"
                min="0"
                value={
                  form.proposedPrice
                }
                onChange={(event) =>
                  set(
                    "proposedPrice",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Preferred contact

              <select
                value={
                  form.preferredContact
                }
                onChange={(event) =>
                  set(
                    "preferredContact",
                    event.target.value
                  )
                }
              >
                <option value="email">
                  Email
                </option>

                <option value="phone">
                  Phone
                </option>

                <option value="both">
                  Email & phone
                </option>
              </select>
            </label>

            <label>
              <FiPhone />
              Your phone

              <input
                value={
                  form.buyerPhone
                }
                onChange={(event) =>
                  set(
                    "buyerPhone",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <FiMail />
              Your email

              <input
                type="email"
                value={
                  form.buyerEmail
                }
                onChange={(event) =>
                  set(
                    "buyerEmail",
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <label className="deal-check">
            <input
              type="checkbox"
              checked={
                form.viewingRequested
              }
              onChange={(event) =>
                set(
                  "viewingRequested",
                  event.target.checked
                )
              }
            />

            Request an in-person
            viewing
          </label>

          {form.viewingRequested && (
            <div className="deal-form-grid">
              <label>
                <FiCalendar />
                Viewing date

                <input
                  type="date"
                  value={
                    form.viewingDate
                  }
                  onChange={(event) =>
                    set(
                      "viewingDate",
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                Viewing time

                <input
                  type="time"
                  value={
                    form.viewingTime
                  }
                  onChange={(event) =>
                    set(
                      "viewingTime",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="span-2">
                <FiMapPin />
                Viewing location

                <input
                  value={
                    form.viewingLocation
                  }
                  onChange={(event) =>
                    set(
                      "viewingLocation",
                      event.target.value
                    )
                  }
                  placeholder="Suggested meeting location"
                />
              </label>
            </div>
          )}

          <div className="deal-modal-actions">
            <button
              type="button"
              className="deal-btn deal-btn-light"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="deal-btn deal-btn-dark"
              disabled={busy}
            >
              <FiMessageCircle />

              {busy
                ? "Sending…"
                : "Send inquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}