// Resolve the single primary price to display for a bike listing.
// `preferredType` comes from the active search/filter context or the detail URL.
// The Bike schema stores the sale/trade price in `price` and the rental day rate in
// `rentalDetails.pricePerDay`. Never fall back to `price` for a rent listing.

const normalizeType = (value) => {
  const type = String(value || "").trim().toLowerCase();
  if (type === "buy" || type === "sell") return "sale";
  return ["sale", "rent", "trade"].includes(type) ? type : "";
};

const readAmount = (value) => {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") {
    return null;
  }

  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

const supportsType = (bike, type) => {
  if (type === "sale") return bike?.isForSale !== false;
  if (type === "rent") return bike?.isForRent === true;
  if (type === "trade") return bike?.isForTrade === true;
  return false;
};

export function getBikePricing(bike, preferredType) {
  const record = bike || {};
  const requestedType = normalizeType(preferredType);
  const explicitType = normalizeType(
    record.listingType || record.transactionType || record.type
  );

  let type = "sale";

  // The selected type filter is authoritative when the bike supports that transaction.
  if (requestedType && supportsType(record, requestedType)) {
    type = requestedType;
  } else if (explicitType) {
    type = explicitType;
  } else {
    const isSale = record.isForSale !== false;
    const isRent = record.isForRent === true;
    const isTrade = record.isForTrade === true;

    // A single-type listing can be inferred safely. For multi-type listings without a
    // selected context, retain sale price as the default rather than guessing rent.
    if (isRent && !isSale && !isTrade) type = "rent";
    else if (isTrade && !isSale && !isRent) type = "trade";
    else if (isSale) type = "sale";
    else if (isTrade) type = "trade";
    else if (isRent) type = "rent";
  }

  if (type === "rent") {
    const rawRate = readAmount(record.rentalDetails?.pricePerDay);
    const amount = rawRate !== null && rawRate > 0 ? rawRate : null;
    return {
      type,
      label: "Rent per day",
      amount,
      suffix: "/day",
      unavailableLabel: "Daily rate unavailable",
    };
  }

  // The existing Bike schema keeps the main sale/trade listing price in `price`.
  // Optional `tradeDetails.estimatedTradeValue` remains supplemental trade information.
  return {
    type,
    label: "Price",
    amount: readAmount(record.price),
    suffix: "",
    unavailableLabel: "Price unavailable",
  };
}

export { normalizeType as normalizeBikeTransactionType };
