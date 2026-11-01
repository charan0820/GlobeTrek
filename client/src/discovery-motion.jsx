import React, { useEffect, useState } from "react";
import { motion as Motion, useReducedMotion } from "motion/react";

// Transitions.dev's free panel-reveal pattern, adapted to the atlas palette.
// Content stays mounted: focus and navigation never wait for an exit animation.
export function DestinationReveal({ children, identity, className, ...props }) {
  const reduced = useReducedMotion();
  return (
    <Motion.section
      {...props}
      className={className}
      initial={reduced ? false : { opacity: 0.65, y: 6 }}
      animate={identity}
      variants={{ [identity]: { opacity: [0.65, 1], y: reduced ? 0 : [6, 0] } }}
      transition={{ duration: reduced ? 0 : 0.2, ease: "easeOut" }}
    >
      {children}
    </Motion.section>
  );
}

// Free text-state-swap pattern: no blur, which would reduce text legibility.
export function CountryEntryStatus({ country }) {
  const reduced = useReducedMotion();
  return (
    <p className="country-entry-status" role="status">
      <Motion.span
        key={country || "ready"}
        initial={reduced ? false : { opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.18 }}
        style={{ display: "inline-block" }}
      >
        {country
          ? `Opening ${country}…`
          : "Select a country to begin your journey."}
      </Motion.span>
    </p>
  );
}

export function CountryScrollProgress({ container, filter }) {
  const [progress, setProgress] = useState({ value: 0, scrollable: false });
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const update = () => {
      const range = element.scrollHeight - element.clientHeight;
      const value =
        range > 1 ? Math.round((100 * element.scrollTop) / range) : 100;
      setProgress({
        value: Math.max(0, Math.min(100, value)),
        scrollable: range > 1,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, [container, filter]);
  return (
    <div className="country-scroll-progress">
      <small>
        {progress.scrollable
          ? `Country list · ${progress.value}% scrolled`
          : "All matching countries visible"}
      </small>
      {progress.scrollable && (
        <div
          role="progressbar"
          aria-label="Country list scroll position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.value}
        >
          <Motion.span style={{ scaleX: progress.value / 100 }} />
        </div>
      )}
    </div>
  );
}
