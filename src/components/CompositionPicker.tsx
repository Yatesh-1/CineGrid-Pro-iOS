import React, { useMemo, useRef, useState } from 'react';
import type {
  GridType,
  GridCategory,
  CompositionGridDefinition,
} from '../types/camera';
import { GRID_CATEGORIES } from '../data/gridLibrary';
import { GridMiniaturePreview } from './grid-engine/GridMiniaturePreview';
import { Sliders, Heart, Sparkles, Image as ImageIcon, Info, Check, Search, Clock, Star } from 'lucide-react';

const RECENT_KEY = 'cinegrid.recentGrids';
const RECENT_MAX = 12;

function loadRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

type QuickView = 'category' | 'favorites' | 'recent' | 'suggested';

interface CompositionPickerProps {
  grids: CompositionGridDefinition[];
  selectedGridId: GridType;
  onSelectGrid: (grid: CompositionGridDefinition) => void;
  selectedCategory: GridCategory;
  onSelectCategory: (cat: GridCategory) => void;
  onOpenExplainer: (grid: CompositionGridDefinition) => void;
  onOpenCustomizer: () => void;
  onToggleFavorite: (gridId: GridType) => void;
  onOpenMasterPresets: () => void;
  onOpenReferencePhotos: (grid: CompositionGridDefinition) => void;
  /** Grids to suggest for the current capture mode. */
  recommendedIds?: GridType[];
}

export const CompositionPicker: React.FC<CompositionPickerProps> = ({
  grids,
  selectedGridId,
  onSelectGrid,
  selectedCategory,
  onSelectCategory,
  onOpenExplainer,
  onOpenCustomizer,
  onToggleFavorite,
  onOpenMasterPresets,
  onOpenReferencePhotos,
  recommendedIds = [],
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<QuickView>('category');
  const [recentIds, setRecentIds] = useState<string[]>(loadRecent);

  const selectGrid = (grid: CompositionGridDefinition) => {
    if (grid.id !== 'none') {
      const next = [grid.id, ...recentIds.filter((id) => id !== grid.id)].slice(0, RECENT_MAX);
      setRecentIds(next);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Recents are a convenience; ignore storage failures.
      }
    }
    onSelectGrid(grid);
  };

  const filteredGrids = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return grids.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.category.includes(q) ||
          g.aliases?.some((a) => a.toLowerCase().includes(q))
      );
    }
    const byId = new Map(grids.map((g) => [g.id as string, g]));
    if (view === 'favorites') return grids.filter((g) => g.isFavorite);
    if (view === 'recent') return recentIds.map((id) => byId.get(id)).filter((g): g is CompositionGridDefinition => !!g);
    if (view === 'suggested') return recommendedIds.map((id) => byId.get(id)).filter((g): g is CompositionGridDefinition => !!g);
    return selectedCategory === 'all' ? grids : grids.filter((g) => g.category === selectedCategory || g.id === 'none');
  }, [grids, query, view, recentIds, recommendedIds, selectedCategory]);

  const currentSelectedGrid = grids.find((g) => g.id === selectedGridId) || grids[0];

  return (
    <div className="w-full flex flex-col gap-1.5 select-none">
      {/* 0. Search + quick views */}
      <div className="flex items-center gap-1.5 px-3">
        <label className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${grids.length} grids`}
            aria-label="Search grids"
            className="w-full h-11 pl-8 pr-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </label>
        {([
          ['favorites', 'Favorites', <Heart key="f" size={14} />],
          ['recent', 'Recent', <Clock key="r" size={14} />],
          ['suggested', 'Suggested', <Star key="s" size={14} />],
        ] as const).map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-pressed={view === id}
            title={label}
            onClick={() => setView(view === id ? 'category' : id)}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${
              view === id ? 'bg-amber-400 text-black border-amber-300' : 'bg-zinc-900 text-zinc-300 border-white/10'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* 1. Category Filter Chips & Quick Tools */}
      <div className="flex items-center justify-between px-3 gap-2">
        {/* Horizontal Category Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
          {GRID_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setView('category');
                  setQuery('');
                  onSelectCategory(cat.id);
                }}
                className={`h-7 px-3 rounded-full text-[10px] font-mono font-bold whitespace-nowrap transition-all flex items-center justify-center flex-shrink-0 border ${
                  isSelected
                    ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-400/20'
                    : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border-white/5'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Quick Toolbar: 3 Refs, Master Presets & Customizer */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onOpenReferencePhotos(currentSelectedGrid)}
            className="h-7 px-2 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/40 flex items-center gap-1 text-[10px] font-mono font-bold transition-all active:scale-95"
            title="View 3 Photography Reference Photos"
          >
            <ImageIcon size={12} className="text-amber-400" />
            <span>3 REFS</span>
          </button>

          <button
            onClick={onOpenMasterPresets}
            className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-white/10 flex items-center justify-center transition-all active:scale-95"
            title="One-Touch Photography Presets"
          >
            <Sparkles size={13} />
          </button>

          <button
            onClick={onOpenCustomizer}
            className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-400 border border-white/10 flex items-center justify-center transition-all active:scale-95"
            title="Customize Grid Appearance"
          >
            <Sliders size={13} />
          </button>
        </div>
      </div>

      {/* 2. Redesigned Responsive Grid Cards Carousel */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar px-3 py-1 scroll-smooth"
      >
        {filteredGrids.map((grid) => {
          const isSelected = grid.id === selectedGridId;
          const cleanName = grid.name.replace(/\(.*\)/, '').trim();

          return (
            <div
              key={grid.id}
              onClick={() => selectGrid(grid)}
              className={`relative flex-shrink-0 w-24 h-28 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 group flex flex-col justify-between p-1.5 ${
                isSelected
                  ? 'border-amber-400 bg-zinc-900/90 shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/40 scale-[1.02]'
                  : 'border-white/10 hover:border-white/25 bg-zinc-950/90 hover:bg-zinc-900'
              }`}
            >
              {/* Top Controls: Favorite (Left) & Info / 3 Refs (Right) */}
              <div className="flex items-center justify-between w-full z-10">
                {/* Favorite Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(grid.id);
                  }}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    grid.isFavorite
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-black/60 text-zinc-500 hover:text-white border border-white/10'
                  }`}
                  title={grid.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart size={9} fill={grid.isFavorite ? 'currentColor' : 'none'} />
                </button>

                {/* Info / Reference Modal Trigger */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenExplainer(grid);
                  }}
                  className="w-5 h-5 rounded-full bg-black/60 hover:bg-amber-400 hover:text-black text-zinc-400 border border-white/10 flex items-center justify-center transition-all shadow-sm"
                  title="View Composition Guide & Real Examples"
                >
                  <Info size={10} />
                </button>
              </div>

              {/* Accurate Vector Geometry Thumbnail in Center */}
              <div className="relative w-full flex-1 my-0.5 rounded-lg overflow-hidden flex items-center justify-center bg-black/40">
                <GridMiniaturePreview
                  gridType={grid.id}
                  color={isSelected ? '#fbbf24' : 'rgba(255,255,255,0.7)'}
                />
                {isSelected && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center text-black shadow">
                    <Check size={8} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Grid Name Label */}
              <div className="w-full text-center px-0.5">
                <span
                  className={`text-[10px] font-mono font-bold truncate block leading-tight ${
                    isSelected ? 'text-amber-300' : 'text-zinc-300 group-hover:text-white'
                  }`}
                  title={grid.name}
                >
                  {cleanName}
                </span>
              </div>
            </div>
          );
        })}
        {filteredGrids.length === 0 && (
          <p className="text-xs text-zinc-400 px-1 py-6" role="status">
            {query ? 'No grids match your search.' : view === 'favorites' ? 'No favorites yet: tap the heart on a grid.' : view === 'recent' ? 'No recently used grids yet.' : 'No suggestions for this mode.'}
          </p>
        )}
      </div>
    </div>
  );
};
