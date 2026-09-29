import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { regions } from "../data/regions";
import "../regions-section.css";

export default function AllRegionsPage() {
  return (
    <Layout>
      <main className="market wrap">
        <div className="market-hero">
          <p className="eyebrow">Discover</p>
          <h1>
            All the iconic
            <br />
            <em>riding routes.</em>
          </h1>
        </div>
        <div className="regions-grid">
          {regions.map((region) => (
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
      </main>
    </Layout>
  );
}