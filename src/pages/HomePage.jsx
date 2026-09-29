import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight } from "react-icons/fi";
import { api } from "../lib/api";
import Layout from "../components/Layout";
import SearchBox from "../components/SearchBox";
import BikeSection from "../components/BikeSection";
import RegionsSection from "../components/RegionsSection";
export default function HomePage() {
  const [featured, setFeatured] = useState(null);
  const [trending, setTrending] = useState(null);
  useEffect(() => {
    api("/api/bikes/featured?limit=3")
      .then((response) => setFeatured(response.data || []))
      .catch(() => setFeatured([]));
    api("/api/recommendations/trending")
      .then((response) => setTrending(response.data || []))
      .catch(() => setTrending([]));
  }, []);
  const categories = [
    "Adventure",
    "Cruiser",
    "Sport",
    "Touring",
    "Off-Road",
  ];
  return (
    <Layout>
      <main>
        <section className="hero">
          <div className="hero-art" />
          <div className="hero-content">
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="eyebrow"
            >
              Motorcycles · India
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Ride beyond
              <br />
              <em>the ordinary.</em>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="hero-copy"
            >
              Discover motorcycles built for the roads you haven’t taken yet.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SearchBox dark />
            </motion.div>
            <div className="hero-links">
              <Link to="/bikes">
                Explore bikes <FiArrowRight />
              </Link>
              <Link to="/sell">List your bike</Link>
            </div>
          </div>
          <div className="hero-caption">
            <span>01</span>
            <p>
              Where the road
              <br />
              becomes the story.
            </p>
          </div>
        </section>
        <section className="categories wrap">
          <div className="section-heading">
            <p className="eyebrow">Find your rhythm</p>
            <h2>
              Made for every
              <br />
              <em>kind of ride.</em>
            </h2>
          </div>
          <div className="category-list">
            {categories.map((category, index) => (
              <Link
                key={category}
                to={`/bikes?category=${category}`}
                className="category"
              >
                <span>0{index + 1}</span>
                <h3>{category}</h3>
                <FiArrowRight />
              </Link>
            ))}
          </div>
        </section>
        <BikeSection
          title="Machines worth stopping for."
          note="Selected for the road ahead"
          bikes={featured}
        />
        <RegionsSection />
        <section className="editorial" id="ride">
          <div className="editorial-img" />
          <div>
            <p className="eyebrow">The long way home</p>
            <h2>
              India is best seen
              <br />
              on <em>two wheels.</em>
            </h2>
            <p>
              From misty mountain passes to open coastlines, every mile holds a
              reason to keep going.
            </p>
            <Link className="text-link" to="/bikes">
              Explore the ride <FiArrowRight />
            </Link>
          </div>
        </section>
        <BikeSection
          title="What riders are looking at."
          note="Trending now"
          bikes={trending}
        />
        <section className="why wrap">
          <p className="eyebrow">The Veloir way</p>
          <h2>More than a marketplace.</h2>
          <div className="principles">
            {[
              ["01", "Discover", "Find a motorcycle that fits your journey."],
              ["02", "Connect", "Talk directly with serious riders."],
              ["03", "Negotiate", "Make offers and find the right deal."],
              ["04", "Own", "Move from conversation to ownership."],
            ].map(([number, title, copy]) => (
              <article key={title}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="sell-banner wrap">
          <div>
            <p className="eyebrow">A better next chapter</p>
            <h2>
              Your motorcycle
              <br />
              deserves one.
            </h2>
          </div>
          <div>
            <p>List it. Meet serious riders. Find its next home.</p>
            <Link className="btn btn-lime" to="/bikes/create">
              Sell your bike <FiArrowRight />
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
