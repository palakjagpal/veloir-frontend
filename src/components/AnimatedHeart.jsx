import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FiHeart } from "react-icons/fi";

// Uses <i> rather than <span>: global rules such as `.bike-image span` (the lime label style) would otherwise
// absolutely position and restyle the heart inside bike cards.
import "./AnimatedHeart.css";

// Fixed references so framer-motion does not restart the animation on every render.
const POP = { scale: [1, 1.35, 0.9, 1.08, 1] };
const REST = { scale: 1 };
const POP_TRANSITION = { duration: 0.5, ease: "easeOut" };

// Six dots that fly outward from the heart when it is liked.
const PARTICLES = Array.from({ length: 6 }, (_, index) => {
  const angle = (index / 6) * Math.PI * 2;
  return { x: Math.cos(angle) * 22, y: Math.sin(angle) * 22 };
});

/**
 * Heart icon that pops, fills with red and sends out a small burst when it becomes active.
 * Props: active (boolean), size (px). The parent button keeps its own onClick and title.
 */
export default function AnimatedHeart({ active = false, size = 16 }) {
  const reduceMotion = useReducedMotion();
  const [burst, setBurst] = useState(0);
  const wasActive = useRef(active);

  useEffect(() => {
    if (active && !wasActive.current) setBurst((count) => count + 1);
    wasActive.current = active;
  }, [active]);

  return (
    <i
      className={`animated-heart ${active ? "is-active" : ""}`}
      style={{ width: size, height: size }}
    >
      <motion.i
        className="animated-heart-icon"
        animate={reduceMotion ? undefined : active ? POP : REST}
        transition={POP_TRANSITION}
      >
        <FiHeart
          size={size}
          fill="currentColor"
          style={{ fillOpacity: active ? 1 : 0 }}
        />
      </motion.i>

      {!reduceMotion && burst > 0 && (
        <i key={burst} className="animated-heart-burst" aria-hidden="true">
          {PARTICLES.map((point, index) => (
            <motion.i
              key={index}
              className="animated-heart-dot"
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
              animate={{ x: point.x, y: point.y, opacity: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            />
          ))}
        </i>
      )}
    </i>
  );
}
