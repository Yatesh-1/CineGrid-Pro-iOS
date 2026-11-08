import React from 'react';
import { X } from 'lucide-react';

export interface FeatureRailItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  /** Current value, e.g. the selected grid name. When set it replaces the label: just the name is shown. */
  value?: string;
  /** Highlights the feature (it is on). */
  active?: boolean;
  /** When set, an inline × clears this feature immediately without opening anything. */
  onClear?: () => void;
  clearLabel?: string;
}

interface FeatureRailProps {
  items: FeatureRailItem[];
  onSelect: (id: string) => void;
}

/**
 * One horizontally scrolling rail holding every camera feature, as plain names with no boxes.
 * Chips open their own sheet or toggle in place; an applied feature shows its own name in amber.
 */
export const FeatureRail: React.FC<FeatureRailProps> = ({ items, onSelect }) => (
  <div
    role="toolbar"
    aria-label="Camera features"
    className="px-4 overflow-x-auto no-scrollbar scroll-smooth snap-x"
  >
    <div className="flex min-w-full w-max items-center justify-between gap-4">
    {items.map((item) => (
      <div key={item.id} className="flex-shrink-0 snap-start flex items-center">
        <button
          type="button"
          onClick={() => onSelect(item.id)}
          aria-pressed={item.active}
          aria-label={item.value ? `${item.label}: ${item.value}` : item.label}
          className={`h-8 flex items-center gap-1.5 text-xs font-semibold active:opacity-60 transition-colors ${
            item.active ? 'text-amber-300' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span aria-hidden="true" className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:stroke-[1.75]">{item.icon}</span>
          <span className="max-w-[120px] truncate">{item.value ?? item.label}</span>
        </button>
        {item.onClear && (
          <button
            type="button"
            onClick={item.onClear}
            aria-label={item.clearLabel ?? `Remove ${item.label}`}
            className="h-9 w-7 flex items-center justify-center text-zinc-500 hover:text-white"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    ))}
    </div>
  </div>
);
