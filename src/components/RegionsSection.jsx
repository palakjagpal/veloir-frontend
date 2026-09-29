import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import { regions } from "../data/regions";
import "../regions-section.css";

const featuredRegions = regions.slice(0, 4); 

export default function RegionsSection() {
  return (
    <section className="regions wrap" id="explore">
      <div className="regions-header">
        <div>
          <p>Ready to ride?</p>
          <h2>
            Discover the most iconic
            <br />
            riding routes across India.
          </h2>
        </div>
        <Link className="regions-cta" to="/regions">
          View all regions <FiArrowRight />
        </Link>
      </div>
      <div className="regions-grid">
        {featuredRegions.map((region) => (
          <Link
            to={`/bikes?state=${encodeURIComponent(region.name)}`}
            className="region-card"
            key={region.name}
            style={{ backgroundImage: `url(${region.image})` }}
            aria-label={`View bikes available for ${region.name}`}
          >
            <div className="region-overlay" />
            <div className="region-content">
              <h3>{region.name}</h3>
              <p>{region.description}</p>
              <div className="region-badges">
                <span>{region.bikes}</span>
                <span>{region.rentals}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}