import { useRef } from "react";

/**
 * Accessible status filter rendered as a tablist with live counts.
 * options: [{ value, label, count? }]
 * Arrow keys / Home / End move between tabs; on narrow screens the row scrolls horizontally.
 */
export function StatusFilter({ options, value, onChange, label = "Filter by status", disabled = false }) {
  const refs = useRef([]);

  const onKeyDown = (event, index) => {
    const last = options.length - 1;
    let next = null;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className="adm-filter" role="tablist" aria-label={label}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            className={`adm-filter-tab ${selected ? "is-active" : ""}`}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
            {option.count !== undefined && option.count !== null ? (
              <span className="adm-filter-count">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

const STATUS_LABELS = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
};

/** Green = approved, amber = pending, red = rejected. Colour is never the only cue (text label included). */
export function StatusBadge({ status, label }) {
  const tone = STATUS_LABELS[status] ? status : "pending";
  return <span className={`adm-status adm-status-${tone}`}>{label || STATUS_LABELS[tone]}</span>;
}
