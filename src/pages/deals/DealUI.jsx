import { Link } from "react-router-dom";
import { FiArrowRight, FiClock, FiMapPin } from "react-icons/fi";
import { dateTime, displayName, imageUrl, money, statusLabel } from "./dealHelpers";

export function PageHeader({ eyebrow = "Veloir", title, description, action }) {
  return (
    <div className="deal-page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="deal-page-subtitle">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`deal-status deal-status-${status}`}>{statusLabel(status)}</span>;
}

export function LoadingState() {
  return <div className="deal-state"><div className="deal-spinner" /> Loading…</div>;
}

export function ErrorState({ message, retry }) {
  return (
    <div className="deal-state deal-state-error">
      <strong>Something went wrong</strong>
      <p>{message}</p>
      {retry && <button className="deal-btn deal-btn-dark" onClick={retry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="deal-state">
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Pager({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { currentPage, totalPages } = pagination;
  return (
    <div className="deal-pager">
      <button disabled={currentPage <= 1} onClick={() => onPage(currentPage - 1)}>Previous</button>
      <span>Page {currentPage} of {totalPages}</span>
      <button disabled={currentPage >= totalPages} onClick={() => onPage(currentPage + 1)}>Next</button>
    </div>
  );
}

export function BikeMini({ bike }) {
  const image = bike?.featuredImage || bike?.images?.[0];
  return (
    <div className="deal-bike-mini">
      <img src={imageUrl(image)} alt={bike?.title || "Bike"} />
      <div>
        <h3>{bike?.title || `${bike?.brand || ""} ${bike?.model || ""}`.trim()}</h3>
        <p>{bike?.brand} · {bike?.model}</p>
        <strong>{money(bike?.price)}</strong>
        {bike?.location?.city && (
          <small><FiMapPin /> {bike.location.city}{bike.location.state ? `, ${bike.location.state}` : ""}</small>
        )}
      </div>
    </div>
  );
}

export function PersonRow({ label, person }) {
  return (
    <div className="deal-person">
      <div className="deal-avatar">
        {person?.profileImage ? <img src={person.profileImage} alt={person.name} /> : person?.name?.[0]?.toUpperCase() || "U"}
      </div>
      <div>
        <span>{label}</span>
        <strong>{displayName(person)}</strong>
        {person?.email && <small>{person.email}</small>}
      </div>
    </div>
  );
}

export function Deadline({ expiresAt }) {
  if (!expiresAt) return null;
  const left = new Date(expiresAt).getTime() - Date.now();
  if (left <= 0) return <span className="deal-deadline expired"><FiClock /> Expired</span>;
  const days = Math.ceil(left / 86400000);
  return <span className="deal-deadline"><FiClock /> {days} day{days === 1 ? "" : "s"} left</span>;
}

export function ActionLink({ to, children }) {
  return <Link className="deal-btn deal-btn-light" to={to}>{children} <FiArrowRight /></Link>;
}

export const cardMetaDate = (value) => dateTime(value);
