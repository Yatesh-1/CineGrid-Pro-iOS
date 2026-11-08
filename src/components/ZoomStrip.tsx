import React, { useEffect, useRef } from 'react';
import type { ZoomMagnificationType } from '../types/hardware';
import { formatZoom, zoomStops } from '../utils/zoomSlider';

interface ZoomStripProps {
  zoom: number;
  min: number;
  max: number;
  onChange: (zoom: number) => void;
  zoomType?: ZoomMagnificationType;
  /** Equivalent focal length of the active lens, shown in the small square at the start of the strip. */
  focalLengthMm?: number;
}

const TYPE_LABEL: Record<ZoomMagnificationType, string> = {
  optical_lens: 'OPT',
  optical_zoom: 'OPT',
  sensor_crop: 'CROP',
  digital: 'DIG',
};

/**
 * Zoom as one sliding row of stops, sitting below the viewfinder (never on it).
 * Everything from `min` to `max` is reachable: tap a stop, or swipe the row.
 * The square at the start says what kind of magnification is active.
 */
export const ZoomStrip: React.FC<ZoomStripProps> = ({ zoom, min, max, onChange, zoomType = 'optical_lens', focalLengthMm }) => {
  const stops = zoomStops(min, max);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const matches = (s: number) => Math.abs(zoom - s) < Math.max(0.08, s * 0.03);
  const onStop = stops.some(matches);

  // Keep the active stop in view as zoom changes (pinch, lens switch)
  useEffect(() => {
    const row = rowRef.current;
    const btn = activeRef.current;
    if (row && btn && typeof row.scrollTo === 'function') {
      row.scrollTo({ left: btn.offsetLeft - row.offsetWidth / 2 + btn.offsetWidth / 2, behavior: 'smooth' });
    }
  }, [zoom]);

  return (
    <div className="flex items-center gap-2 px-4" data-testid="zoom-strip">
      <div
        className="flex-shrink-0 w-11 h-8 rounded-md border border-amber-400/60 flex flex-col items-center justify-center leading-none"
        title={focalLengthMm ? `${TYPE_LABEL[zoomType]} ${focalLengthMm}mm equivalent` : TYPE_LABEL[zoomType]}
      >
        <span className="text-[11px] font-bold text-amber-300">{focalLengthMm ? `${focalLengthMm}mm` : TYPE_LABEL[zoomType]}</span>
        {/* "OPT" is never claimed here: only crop/digital magnification is labelled, the lens itself is just its mm */}
        {focalLengthMm && TYPE_LABEL[zoomType] !== 'OPT' ? <span className="text-[10px] text-zinc-400 mt-0.5">{TYPE_LABEL[zoomType]}</span> : null}
      </div>
      <div ref={rowRef} role="toolbar" aria-label="Zoom" className="flex-1 min-w-0 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex min-w-full w-max items-center justify-between gap-4">
        {stops.map((s) => {
          const selected = matches(s);
          return (
            <button
              key={s}
              ref={selected ? activeRef : null}
              type="button"
              onClick={() => onChange(s)}
              aria-pressed={selected}
              className={`flex-shrink-0 h-8 text-xs font-semibold transition-colors ${
                selected ? 'text-amber-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {formatZoom(s)}
            </button>
          );
        })}
        </div>
      </div>
      {!onStop && (
        <span className="flex-shrink-0 text-xs font-bold text-amber-300" data-testid="zoom-readout">
          {formatZoom(zoom)}
        </span>
      )}
    </div>
  );
};
