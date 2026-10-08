import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  FiArrowRight,
  FiCheckCircle,
  FiDollarSign,
  FiInbox,
  FiShoppingBag,
} from "react-icons/fi";

import Layout from "../../components/Layout";

import {
  getInquiries,
  getOffers,
  getPurchases,
} from "../../services/dealsService";

import {
  ErrorState,
  LoadingState,
} from "./DealUI";

import {
  effectiveExpiryStatus,
} from "./dealHelpers";

export default function DealsPage() {
  const [data, setData] =
    useState(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const load = async () => {
      setError("");

      try {
        const [
          inquiries,
          offers,
          purchases,
        ] = await Promise.all([
          getInquiries({
            limit: 20,
          }),

          getOffers({
            limit: 20,
          }),

          getPurchases({
            limit: 20,
          }),
        ]);

        setData({
          inquiries:
            inquiries.data || [],

          offers:
            offers.data || [],

          purchases:
            purchases.data || [],
        });
      } catch (err) {
        setError(
          err.message ||
            "Unable to load your deals."
        );
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    if (!data) {
      return null;
    }

    const inquiryStatus = (item) =>
      effectiveExpiryStatus(
        item.status,
        item.expiresAt
      );

    const offerStatus = (item) =>
      effectiveExpiryStatus(
        item.status,
        item.expiresAt
      );

    return {
      inquiries:
        data.inquiries.length,

      pendingInquiries:
        data.inquiries.filter(
          (item) =>
            inquiryStatus(item) ===
            "pending"
        ).length,

      offers:
        data.offers.length,

      activeOffers:
        data.offers.filter(
          (item) =>
            ["pending", "countered"].includes(
              offerStatus(item)
            )
        ).length,

      purchases:
        data.purchases.length,

      activePurchases:
        data.purchases.filter(
          (item) =>
            ![
              "completed",
              "cancelled",
            ].includes(item.status)
        ).length,
    };
  }, [data]);

  return (
    <Layout>
      <main className="deal-page wrap">
        <div className="deal-page-topspace" />

        <div className="deal-hero">
          <div>
            <p className="eyebrow">
              Marketplace
            </p>

            <h1>
              Your <em>Deals.</em>
            </h1>

            <p>
              Follow every conversation,
              negotiation and purchase from
              one place.
            </p>
          </div>
        </div>

        {error && (
          <ErrorState message={error} />
        )}

        {!data && !error && (
          <LoadingState />
        )}

        {stats && (
          <>
            <section className="deal-stat-grid">
              <Stat
                icon={<FiInbox />}
                label="Inquiries"
                value={stats.inquiries}
                note={`${stats.pendingInquiries} pending`}
              />

              <Stat
                icon={<FiDollarSign />}
                label="Offers"
                value={stats.offers}
                note={`${stats.activeOffers} active`}
              />

              <Stat
                icon={<FiShoppingBag />}
                label="Purchases"
                value={stats.purchases}
                note={`${stats.activePurchases} active`}
              />

              <Stat
                icon={<FiCheckCircle />}
                label="Next step"
                value="Keep moving"
                note="Review your latest deal"
              />
            </section>

            <section className="deal-hub-grid">
              <HubCard
                icon={<FiInbox />}
                title="Inquiries"
                text="Respond to buyer interest and move accepted inquiries toward purchase."
                to="/inquiries"
              />

              <HubCard
                icon={<FiDollarSign />}
                title="Offers"
                text="Review offers, send counter-offers and accept the right price."
                to="/offers"
              />

              <HubCard
                icon={<FiShoppingBag />}
                title="Purchases"
                text="Track payment, purchase status and ownership transfer."
                to="/purchases"
              />
            </section>
          </>
        )}
      </main>
    </Layout>
  );
}

function Stat({
  icon,
  label,
  value,
  note,
}) {
  return (
    <div className="deal-stat-card">
      <div className="deal-stat-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>

        <strong>{value}</strong>

        <small>{note}</small>
      </div>
    </div>
  );
}

function HubCard({
  icon,
  title,
  text,
  to,
}) {
  return (
    <Link
      to={to}
      className="deal-hub-card"
    >
      <div className="deal-hub-icon">
        {icon}
      </div>

      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>

      <FiArrowRight />
    </Link>
  );
}