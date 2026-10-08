import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  FiCheck,
  FiEye,
  FiInbox,
  FiX,
} from "react-icons/fi";

import toast from "react-hot-toast";

import Layout from "../../components/Layout";

import { useAuth } from "../../context/AuthContext";

import {
  acceptInquiry,
  getInquiries,
  rejectInquiry,
} from "../../services/dealsService";

import {
  BikeMini,
  Deadline,
  EmptyState,
  ErrorState,
  LoadingState,
  Pager,
  PageHeader,
  StatusBadge,
} from "./DealUI";

import {
  effectiveExpiryStatus,
  userId,
} from "./dealHelpers";

const TABS = [
  {
    value: "",
    label: "All",
  },
  {
    value: "buyer",
    label: "As Buyer",
  },
  {
    value: "seller",
    label: "As Seller",
  },
];

const STATUSES = [
  "",
  "pending",
  "accepted",
  "rejected",
  "expired",
  "converted",
];

export default function InquiriesPage() {
  const { user } = useAuth();

  const [role, setRole] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [result, setResult] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState("");

  const [error, setError] =
    useState("");

  const load = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await getInquiries({
            role,
            status,
            page,
            limit: 10,
          });

        setResult(response);
      } catch (err) {
        setError(
          err.message ||
            "Unable to load inquiries."
        );

        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [role, status, page]
  );

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (
    id,
    type
  ) => {
    const promptText =
      type === "accept"
        ? "Optional response to the buyer:"
        : "Optional rejection reason:";

    const message =
      window.prompt(
        promptText,
        ""
      );

    if (message === null) {
      return;
    }

    setBusy(`${type}:${id}`);

    try {
      if (type === "accept") {
        await acceptInquiry(
          id,
          message
        );
      } else {
        await rejectInquiry(
          id,
          message
        );
      }

      toast.success(
        type === "accept"
          ? "Inquiry accepted."
          : "Inquiry rejected."
      );

      load();
    } catch (err) {
      toast.error(
        err.message ||
          "Action failed."
      );
    } finally {
      setBusy("");
    }
  };

  return (
    <Layout>
      <main className="deal-page wrap">
        <div className="deal-page-topspace" />

        <PageHeader
          eyebrow="Your marketplace"
          title="Inquiries"
          description="See every buyer conversation involving your listings and every inquiry you have sent."
        />

        <div className="deal-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              className={
                role === tab.value
                  ? "active"
                  : ""
              }
              onClick={() => {
                setRole(tab.value);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="deal-filters">
          <label>
            Status

            <select
              value={status}
              onChange={(event) => {
                setStatus(
                  event.target.value
                );
                setPage(1);
              }}
            >
              {STATUSES.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item
                    ? item
                        .charAt(0)
                        .toUpperCase() +
                      item.slice(1)
                    : "All statuses"}
                </option>
              ))}
            </select>
          </label>

          <Link
            className="deal-btn deal-btn-dark"
            to="/bikes"
          >
            <FiInbox />
            Browse bikes
          </Link>
        </div>

        {loading && (
          <LoadingState />
        )}

        {!loading && error && (
          <ErrorState
            message={error}
            retry={load}
          />
        )}

        {!loading &&
          !error &&
          !(result?.data || []).length && (
            <EmptyState
              title="No inquiries yet"
              text="Your buyer and seller conversations will appear here."
              action={
                <Link
                  className="deal-btn deal-btn-dark"
                  to="/bikes"
                >
                  Explore bikes
                </Link>
              }
            />
          )}

        {!loading &&
          !error &&
          !!(result?.data || []).length && (
            <div className="deal-list">
              {result.data.map(
                (inquiry) => {
                  const effective =
                    effectiveExpiryStatus(
                      inquiry.status,
                      inquiry.expiresAt
                    );

                  const sellerCanAct =
                    userId(
                      inquiry.seller
                    ) ===
                    userId(user);

                  return (
                    <article
                      className="deal-card"
                      key={inquiry._id}
                    >
                      <div className="deal-card-main">
                        <BikeMini
                          bike={
                            inquiry.bike
                          }
                        />

                        <div className="deal-card-info">
                          <div className="deal-card-title-row">
                            <StatusBadge
                              status={
                                effective
                              }
                            />

                            <Deadline
                              expiresAt={
                                inquiry.expiresAt
                              }
                            />
                          </div>

                          <p className="deal-message">
                            {
                              inquiry.message
                            }
                          </p>

                          <div className="deal-data-grid">
                            <span>
                              Proposed price

                              <strong>
                                ₹
                                {Number(
                                  inquiry.proposedPrice ||
                                    inquiry.bike
                                      ?.price ||
                                    0
                                ).toLocaleString(
                                  "en-IN"
                                )}
                              </strong>
                            </span>

                            <span>
                              Created

                              <strong>
                                {new Date(
                                  inquiry.createdAt
                                ).toLocaleDateString(
                                  "en-IN"
                                )}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="deal-card-actions">
                        <Link
                          className="deal-icon-link"
                          title="View inquiry"
                          to={`/inquiries/${inquiry._id}`}
                        >
                          <FiEye />
                        </Link>

                        {sellerCanAct &&
                          effective ===
                            "pending" && (
                            <>
                              <button
                                className="deal-btn deal-btn-green"
                                disabled={
                                  busy ===
                                  `accept:${inquiry._id}`
                                }
                                onClick={() =>
                                  runAction(
                                    inquiry._id,
                                    "accept"
                                  )
                                }
                              >
                                <FiCheck />
                                Accept
                              </button>

                              <button
                                className="deal-btn deal-btn-danger"
                                disabled={
                                  busy ===
                                  `reject:${inquiry._id}`
                                }
                                onClick={() =>
                                  runAction(
                                    inquiry._id,
                                    "reject"
                                  )
                                }
                              >
                                <FiX />
                                Reject
                              </button>
                            </>
                          )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}

        {!loading &&
          !error &&
          result?.pagination && (
            <Pager
              pagination={
                result.pagination
              }
              onPage={setPage}
            />
          )}
      </main>
    </Layout>
  );
}