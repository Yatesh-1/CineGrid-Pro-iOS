import React, { useState } from 'react';
import type { CameraFilter, FilmLookCategory } from '../types/camera';
import { CAMERA_FILTERS, FILM_LOOK_CATEGORIES } from '../data/presets';
import { Palette, Check, Heart, Sparkles } from 'lucide-react';

interface FilterPickerProps {
  selectedFilterId: string;
  onSelectFilter: (filter: CameraFilter) => void;
  favorites?: string[];
  onToggleFavorite?: (filterId: string) => void;
}

export const FilterPicker: React.FC<FilterPickerProps> = ({
  selectedFilterId,
  onSelectFilter,
  favorites = [],
  onToggleFavorite,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FilmLookCategory | 'All Looks'>('All Looks');

  const filteredLooks = selectedCategory === 'All Looks'
    ? CAMERA_FILTERS
    : CAMERA_FILTERS.filter((f) => f.category === selectedCategory);

  return (
    <div className="w-full flex flex-col gap-1.5 select-none px-3">
      {/* Category Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1 text-zinc-500 mr-1 flex-shrink-0">
          <Palette size={13} className="text-amber-400" />
          <span className="text-[10px] font-mono tracking-wider font-bold">LOOKS:</span>
        </div>

        {FILM_LOOK_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as FilmLookCategory)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono whitespace-nowrap transition-all border flex-shrink-0 ${
                isSelected
                  ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-sm shadow-amber-400/20'
                  : 'bg-zinc-900/90 text-zinc-400 border-white/5 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Horizontal Film Look Cards Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {filteredLooks.map((f) => {
          const isSelected = f.id === selectedFilterId;
          const isFav = favorites.includes(f.id) || !!f.isFavorite;

          return (
            <div
              key={f.id}
              onClick={() => onSelectFilter(f)}
              className={`relative flex-shrink-0 w-28 h-14 rounded-xl p-1.5 flex items-center gap-2 cursor-pointer transition-all border group ${
                isSelected
                  ? 'bg-zinc-900 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/30'
                  : 'bg-zinc-950/80 border-white/10 hover:border-white/25 hover:bg-zinc-900'
              }`}
            >
              {/* Color Swatch / Miniature Gradient */}
              <div
                className="w-10 h-10 rounded-lg flex-shrink-0 border border-white/15 relative overflow-hidden shadow-inner flex items-center justify-center"
                style={{
                  background: f.previewGradient || f.previewColor,
                }}
              >
                {isSelected ? (
                  <Check size={14} strokeWidth={3} className="text-black drop-shadow" />
                ) : (
                  <Sparkles size={11} className="text-white/40 group-hover:text-white transition-colors" />
                )}
              </div>

              {/* Label & Subtitle */}
              <div className="flex flex-col min-w-0 pr-4">
                <span className={`text-[11px] font-bold truncate leading-tight ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                  {f.name}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 truncate leading-tight">
                  {f.subtitle}
                </span>
              </div>

              {/* Favorite Heart Toggle */}
              {onToggleFavorite && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(f.id);
                  }}
                  className={`absolute top-1 right-1 p-1 transition-all ${
                    isFav ? 'text-rose-500' : 'text-zinc-600 hover:text-white'
                  }`}
                  title={isFav ? 'Unfavorite film look' : 'Favorite film look'}
                >
                  <Heart size={10} fill={isFav ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
