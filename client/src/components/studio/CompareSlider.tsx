"use client";

import { useState } from "react";

/**
 * Before/after comparison. The hazy input sits underneath; the de-hazed output
 * is revealed up to a draggable divider. An invisible range input drives the
 * position so pointer, touch and keyboard all work.
 */
export function CompareSlider({
  before,
  after,
}: {
  before: string;
  after: string;
}) {
  const [position, setPosition] = useState(50);

  return (
    <div className="relative select-none overflow-hidden rounded-box border border-base-300 bg-checker">
      {/* Hazy input defines the frame. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- data/object URLs */}
      <img src={before} alt="Hazy input" draggable={false} className="block w-full" />

      {/* De-hazed output, clipped from the left edge to the divider. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- data URLs */}
      <img
        src={after}
        alt="De-hazed result"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />

      {/* Divider + grip */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 z-10"
        style={{ left: `${position}%` }}
      >
        <div className="absolute inset-y-0 -ml-px w-0.5 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
        <div className="absolute top-1/2 -ml-5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-base-300 bg-base-100/95 text-base-content shadow-sm backdrop-blur">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M9.5 7 5.5 12l4 5M14.5 7l4 5-4 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <span className="absolute left-3 top-3 z-10 rounded-full border border-white/40 bg-black/45 px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide text-white backdrop-blur">
        Hazy
      </span>
      <span className="absolute right-3 top-3 z-10 rounded-full border border-white/40 bg-black/45 px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide text-white backdrop-blur">
        Clear
      </span>

      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        aria-label="Reveal de-hazed result"
        className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}