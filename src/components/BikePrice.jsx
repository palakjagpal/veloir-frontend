import { formatPrice } from "../lib/api";
import { getBikePricing } from "../lib/bikePricing";

/**
 * Shared primary-price renderer used by marketplace cards, details and seller listings.
 * Pass `type` when the current page/filter has an explicit transaction context.
 */
export default function BikePrice({
  bike,
  type,
  className = "",
  labelClassName = "",
  valueClassName = "",
}) {
  const pricing = getBikePricing(bike, type);
  const unavailableClass = pricing.amount === null ? " is-unavailable" : "";

  return (
    <div className={className}>
      <span className={labelClassName}>{pricing.label}</span>
      <strong className={`${valueClassName}${unavailableClass}`}>
        {pricing.amount === null
          ? pricing.unavailableLabel
          : `${formatPrice(pricing.amount)}${pricing.suffix}`}
      </strong>
    </div>
  );
}
