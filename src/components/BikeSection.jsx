import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import { BikeCard, Skeletons } from "./BikeCard";
export default function BikeSection({ title, note, bikes }) {
  return (
    <section className="wrap bike-section">
      <div className="section-top">
        <div>
          <p className="eyebrow">{note}</p>
          <h2>{title}</h2>
        </div>
        <Link className="text-link" to="/bikes">
          View all <FiArrowRight />
        </Link>
      </div>
      {bikes === null ? (
        <Skeletons />
      ) : bikes.length ? (
        <div className="bike-grid">
          {bikes.slice(0, 3).map((bike) => (
            <BikeCard key={bike._id} bike={bike} />
          ))}
        </div>
      ) : (
        <div className="empty">
          No motorcycles available yet. Check back soon.
        </div>
      )}
    </section>
  );
}
