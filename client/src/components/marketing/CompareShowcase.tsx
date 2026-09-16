"use client";

import { useState } from "react";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import { ChevronsLeftRight } from "lucide-react";

/**
 * Real before/after examples, cropped from the source photograph in /public:
 * the full hazy valley frame and a close crop of the summit.
 */
const EXAMPLES = [
  {
    id: "valley",
    hazy: "/mountain-hazy.jpg",
    clear: "/mountain-clear.jpg",
    alt: "Mountain valley",
    aspect: "aspect-[3/4]",
    caption: "Dehamer restores scene radiance from a single hazy frame.",
  },
  {
    id: "summit",
    hazy: "/peak-hazy.jpg",
    clear: "/peak-clear.jpg",
    alt: "Mountain summit",
    aspect: "aspect-square",
    caption: "Fine texture and contrast return once the veil of haze lifts.",
  },
] as const;

/** Custom draggable handle — full-height line with a round “<>” grip. */
function CompareHandle() {
  return (
    <div className="rcs-handle">
      <span className="rcs-handle-line" />
      <span className="rcs-handle-btn">
        <ChevronsLeftRight className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="rcs-handle-line" />
    </div>
  );
}

/**
 * Draggable before/after comparison built on react-compare-slider — pointer,
 * touch and keyboard accessible, with Hazy/Clear pills, a caption and
 * carousel dots for switching between examples.
 */
export function CompareShowcase() {
  const [active, setActive] = useState(0);
  const example = EXAMPLES[active];

  return (
    <figure className="w-full">
      <div
        className={`relative ${example.aspect} w-full overflow-hidden rounded-2xl border border-sand shadow-lift`}
      >
        <ReactCompareSlider
          key={example.id}
          className="h-full w-full"
          defaultPosition={50}
          itemOne={
            <ReactCompareSliderImage
              alt={`${example.alt} — hazy input`}
              className="h-full w-full object-cover"
              draggable={false}
            />
          }
          itemTwo={
            <ReactCompareSliderImage
              src={example.clear}
              alt={`${example.alt} — de-hazed result`}
              className="h-full w-full object-cover"
              draggable={false}
            />
          }
          handle={<CompareHandle />}
        />

        <span className="pointer-events-none absolute top-3 left-3 z-10 rounded-full border border-white/30 bg-ink/45 px-3 py-1 text-[0.6875rem] font-medium tracking-wide text-white backdrop-blur-sm">
          Hazy
        </span>
        <span className="pointer-events-none absolute top-3 right-3 z-10 rounded-full border border-white/30 bg-ink/45 px-3 py-1 text-[0.6875rem] font-medium tracking-wide text-white backdrop-blur-sm">
          Clear
        </span>
      </div>

      <figcaption className="mt-4 text-center">
        <p className="text-sm leading-relaxed text-clay">{example.caption}</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          {EXAMPLES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show example: ${item.alt}`}
              aria-pressed={index === active}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === active
                  ? "w-6 bg-maroon"
                  : "w-2 bg-sand hover:bg-clay/60"
              }`}
            />
          ))}
        </div>
      </figcaption>
    </figure>
  );
}