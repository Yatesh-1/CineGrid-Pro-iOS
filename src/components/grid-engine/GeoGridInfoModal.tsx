import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Heart, X, Camera } from 'lucide-react';
import type { CompositionGridDefinition } from '../../types/camera';
import type { GeoGridDefinition } from '../../types/gridGeometry';
import { CATEGORY_GUIDE, CATEGORY_LABELS } from '../../data/geoGrids';
import { geoGridParamsService } from '../../services/geoGridParamsService';
import { GeoGridSvg } from './GeoGridOverlay';
import { GeoGridScene } from './GeoGridScenes';

interface Props {
  grid: CompositionGridDefinition;
  def: GeoGridDefinition;
  isOpen: boolean;
  onClose: () => void;
  onTryInCamera: (grid: CompositionGridDefinition) => void;
  onToggleFavorite?: (id: CompositionGridDefinition['id']) => void;
}

const EXAMPLE_W = 200;

const Example: React.FC<{ def: GeoGridDefinition; variant: number }> = ({ def, variant }) => {
  const aspect = def.previewAspect ?? 1;
  const w = EXAMPLE_W;
  const h = Math.round(EXAMPLE_W / aspect);
  const params = useSyncExternalStore(geoGridParamsService.subscribe, () => geoGridParamsService.get(def));
  const prims = useMemo(() => def.build(aspect, params), [def, aspect, params]);
  return (
    <figure className="flex-shrink-0 snap-start">
      <div className="relative" style={{ width: w, height: h }}>
        <GeoGridScene kind={def.scene ?? 'abstract'} variant={variant} w={w} h={h} />
        <div className="absolute inset-0">
          <GeoGridSvg prims={prims} width={w} height={h} style={{ color: '#facc15', strokeWidth: 1.4 }} plain />
        </div>
      </div>
      <figcaption className="text-[10px] text-zinc-400 mt-1">Example {variant + 1} (illustration)</figcaption>
    </figure>
  );
};

export interface GeoGridPhoto {
  title: string;
  url: string;
  page: string;
  author: string;
  license: string;
  w: number;
  h: number;
}

const PHOTO_W = 240;

/** Real photographs (Wikimedia Commons, free licences) with this grid drawn over each one. */
const PhotoExample: React.FC<{ def: GeoGridDefinition; photo: GeoGridPhoto }> = ({ def, photo }) => {
  const aspect = Math.min(1.8, Math.max(0.6, photo.w / photo.h));
  const w = PHOTO_W;
  const h = Math.round(w / aspect);
  const params = useSyncExternalStore(geoGridParamsService.subscribe, () => geoGridParamsService.get(def));
  const prims = useMemo(() => def.build(aspect, params), [def, aspect, params]);
  return (
    <figure className="flex-shrink-0 snap-start" style={{ width: w }}>
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900" style={{ width: w, height: h }}>
        <img src={photo.url} alt={photo.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0">
          <GeoGridSvg prims={prims} width={w} height={h} style={{ color: '#facc15', strokeWidth: 1.4 }} plain />
        </div>
      </div>
      <figcaption className="text-[10px] text-zinc-500 mt-1 truncate">
        <a href={photo.page} target="_blank" rel="noopener noreferrer" className="underline">
          {photo.author}
        </a>{' '}
        · {photo.license}
      </figcaption>
    </figure>
  );
};

/** Loads the photo index on demand so it stays out of the main bundle. */
export const useGeoGridPhotos = (id: string): GeoGridPhoto[] | null => {
  const [photos, setPhotos] = useState<GeoGridPhoto[] | null>(null);
  useEffect(() => {
    let live = true;
    import('../../data/geoGridPhotos.json')
      .then((m) => {
        const all = (m.default ?? m) as Record<string, GeoGridPhoto[]>;
        if (live) setPhotos(all[id] ?? []);
      })
      .catch(() => live && setPhotos([]));
    return () => {
      live = false;
    };
  }, [id]);
  return photos;
};

export const GeoGridInfoModal: React.FC<Props> = ({ grid, def, isOpen, onClose, onTryInCamera, onToggleFavorite }) => {
  const [fav, setFav] = useState(!!grid.isFavorite);
  const photos = useGeoGridPhotos(def.id);
  const params = useSyncExternalStore(geoGridParamsService.subscribe, () => geoGridParamsService.get(def));
  if (!isOpen) return null;
  const guide = CATEGORY_GUIDE[def.category];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${def.name} guide`}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[92dvh] flex flex-col bg-[#0c0d10] text-white rounded-t-3xl sm:rounded-3xl border border-white/10"
      >
        <header className="flex items-start justify-between gap-2 px-4 pt-3 pb-2 border-b border-white/10">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-amber-400">{CATEGORY_LABELS[def.category]}</div>
            <h2 className="text-base font-bold leading-tight">{def.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close guide" className="w-11 h-11 -mr-2 flex items-center justify-center text-zinc-400 hover:text-white">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-3 space-y-4">
          <section aria-label="Examples">
            <div className="flex gap-3 overflow-x-auto snap-x pb-1 no-scrollbar">
              {photos && photos.length > 0
                ? photos.map((p) => <PhotoExample key={p.url} def={def} photo={p} />)
                : [0, 1, 2].map((v) => <Example key={v} def={def} variant={v} />)}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              {photos && photos.length > 0
                ? 'Photos from Wikimedia Commons under free licences; tap a name to see the source. The grid is drawn over each photo.'
                : 'Illustrations drawn in the app to show the grid in use; they are not photographs.'}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-bold text-zinc-300 mb-1">Purpose</h3>
            <p className="text-sm text-zinc-300">{def.description}</p>
          </section>

          <section>
            <h3 className="text-xs font-bold text-zinc-300 mb-1">Recommended subjects</h3>
            <div className="flex flex-wrap gap-1.5">
              {guide.subjects.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full bg-zinc-800 text-[11px] text-zinc-200">
                  {s}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-zinc-300 mb-1">How to use</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-300">
              {guide.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="text-xs text-amber-300/90 mt-2">{guide.tip}</p>
          </section>

          {def.params && (
            <section aria-label="Customise">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-zinc-300">Customise</h3>
                <button type="button" onClick={() => geoGridParamsService.reset(def)} className="min-h-[44px] px-2 text-xs text-amber-400">
                  Reset to default
                </button>
              </div>
              {def.params.map((p) => (
                <label key={p.key} className="block mb-2 text-xs text-zinc-300">
                  <span className="flex justify-between">
                    <span>{p.label}</span>
                    <span className="font-mono text-amber-300">{params[p.key]}</span>
                  </span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={params[p.key]}
                    aria-label={p.label}
                    onChange={(e) => geoGridParamsService.set(def, { [p.key]: Number(e.target.value) })}
                    className="w-full min-h-[44px] accent-amber-400"
                    style={{ touchAction: 'none' }}
                  />
                </label>
              ))}
            </section>
          )}
        </div>

        <footer className="flex gap-2 px-4 py-3 border-t border-white/10 safe-bottom">
          <button
            type="button"
            aria-pressed={fav}
            onClick={() => {
              setFav((f) => !f);
              onToggleFavorite?.(grid.id);
            }}
            className={`min-h-[44px] px-4 rounded-xl border text-sm flex items-center gap-1.5 ${fav ? 'bg-rose-500/20 border-rose-400 text-rose-200' : 'bg-zinc-900 border-white/10 text-zinc-200'}`}
          >
            <Heart size={16} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
            {fav ? 'Favorited' : 'Favorite'}
          </button>
          <button
            type="button"
            onClick={() => {
              onTryInCamera(grid);
              onClose();
            }}
            className="flex-1 min-h-[44px] rounded-xl bg-amber-400 text-black font-bold text-sm flex items-center justify-center gap-1.5"
          >
            <Camera size={16} aria-hidden="true" />
            Activate grid
          </button>
        </footer>
      </div>
    </div>
  );
};
