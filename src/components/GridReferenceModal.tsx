import React, { useState } from 'react';
import type { CompositionGridDefinition } from '../types/camera';
import { getGridReferences, type GridReferencePhoto } from '../data/gridReferences';
import { GridRenderer } from './grid-engine/GridRenderer';
import { GeoGridInfoModal } from './grid-engine/GeoGridInfoModal';
import { getGeoGrid } from '../data/geoGrids';
import {
  X,
  Camera,
  ChevronLeft,
  ChevronRight,
  Target,
  Lightbulb,
  Eye,
  EyeOff,
  Compass,
  Palette,
  Award
} from 'lucide-react';
import { cameraAudio } from '../utils/audio';

interface GridReferenceModalProps {
  grid: CompositionGridDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onTryInCamera: (grid: CompositionGridDefinition) => void;
}

interface DelegatingProps extends GridReferenceModalProps {
  onToggleFavorite?: (id: CompositionGridDefinition['id']) => void;
}

/** Geometry-engine grids get their own guide screen; original grids keep the photo reference viewer. */
export const GridReferenceModal: React.FC<DelegatingProps> = ({ onToggleFavorite, ...props }) => {
  const def = props.grid ? getGeoGrid(props.grid.id) : undefined;
  if (props.grid && def) {
    return <GeoGridInfoModal grid={props.grid} def={def} isOpen={props.isOpen} onClose={props.onClose} onTryInCamera={props.onTryInCamera} onToggleFavorite={onToggleFavorite} />;
  }
  return <PhotoReferenceModal {...props} />;
};

const PhotoReferenceModal: React.FC<GridReferenceModalProps> = ({
  grid,
  isOpen,
  onClose,
  onTryInCamera,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showGridOverlay, setShowGridOverlay] = useState(true);
  const [showSubjectHighlight, setShowSubjectHighlight] = useState(true);
  const [overlayColor, setOverlayColor] = useState<'#facc15' | '#38bdf8' | '#ffffff'>('#facc15');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [prevGridId, setPrevGridId] = useState(grid?.id);

  // Synchronize photo selection when grid changes
  if (grid?.id !== prevGridId) {
    setPrevGridId(grid?.id);
    setActivePhotoIndex(0);
    setImageLoaded(false);
  }

  if (!isOpen || !grid) return null;

  const references: GridReferencePhoto[] = getGridReferences(grid.id);
  const currentPhoto = references[activePhotoIndex] || references[0];

  const handleNext = () => {
    cameraAudio.playClick();
    setImageLoaded(false);
    setActivePhotoIndex((prev) => (prev + 1) % references.length);
  };

  const handlePrev = () => {
    cameraAudio.playClick();
    setImageLoaded(false);
    setActivePhotoIndex((prev) => (prev - 1 + references.length) % references.length);
  };

  const handleSelectIndex = (idx: number) => {
    if (idx === activePhotoIndex) return;
    cameraAudio.playClick();
    setImageLoaded(false);
    setActivePhotoIndex(idx);
  };

  const handleTryInCamera = () => {
    cameraAudio.playFocusLock();
    onTryInCamera(grid);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-zinc-950 border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-white my-auto max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Compass size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight leading-tight">
                  {grid.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-mono border border-white/10 uppercase">
                  {grid.category}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-none mt-0.5">
                3 Real Photography Reference Examples
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* 3-Example Tab Switcher */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {references.map((refPhoto, idx) => {
              const isSelected = idx === activePhotoIndex;
              return (
                <button
                  key={refPhoto.id}
                  onClick={() => handleSelectIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-bold'
                      : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-white/5'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-black text-amber-400' : 'bg-zinc-700 text-zinc-300'
                  }`}>
                    {idx + 1}
                  </span>
                  <span>{refPhoto.genre}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Controls: Grid Toggle, Sweet Spot Toggle, Color */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            <button
              onClick={() => setShowGridOverlay(!showGridOverlay)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                showGridOverlay
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                  : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-white'
              }`}
              title={showGridOverlay ? 'Hide Grid Lines' : 'Show Grid Lines'}
            >
              {showGridOverlay ? <Eye size={13} /> : <EyeOff size={13} />}
              <span className="text-[10px] font-mono hidden sm:inline">GRID</span>
            </button>

            <button
              onClick={() => setShowSubjectHighlight(!showSubjectHighlight)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                showSubjectHighlight
                  ? 'bg-sky-400/20 text-sky-300 border-sky-400/40'
                  : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-white'
              }`}
              title={showSubjectHighlight ? 'Hide Subject Sweet Spot' : 'Show Subject Sweet Spot'}
            >
              <Target size={13} />
              <span className="text-[10px] font-mono hidden sm:inline">SPOT</span>
            </button>

            <button
              onClick={() => {
                const colors: ('#facc15' | '#38bdf8' | '#ffffff')[] = ['#facc15', '#38bdf8', '#ffffff'];
                const nextIdx = (colors.indexOf(overlayColor) + 1) % colors.length;
                setOverlayColor(colors[nextIdx]);
              }}
              className="p-1.5 rounded-lg bg-zinc-800 border border-white/10 hover:bg-zinc-700 text-zinc-300"
              title="Cycle Grid Color (Gold / Cyan / White)"
            >
              <Palette size={13} style={{ color: overlayColor }} />
            </button>
          </div>
        </div>

        {/* Scrollable Center Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
          {/* Photograph Canvas Container with Grid Overlay */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[46vh] bg-black flex items-center justify-center overflow-hidden flex-shrink-0 group">
            {/* Loading skeleton */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-zinc-900 animate-pulse flex items-center justify-center">
                <span className="text-xs text-zinc-500 font-mono">Loading reference photograph...</span>
              </div>
            )}

            {/* Actual Reference Photograph */}
            <img
              src={currentPhoto.imageUrl}
              alt={currentPhoto.title}
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Subtle contrast gradient for line visibility */}
            <div className="absolute inset-0 bg-black/10 pointer-events-none" />

            {/* Real SVG Grid Overlay using existing GridRenderer */}
            {showGridOverlay && grid.id !== 'none' && (
              <div className="absolute inset-0 pointer-events-none filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                <GridRenderer
                  gridType={grid.id}
                  styleOptions={{
                    color: overlayColor,
                    opacity: 0.92,
                    strokeWidth: 1.8,
                    lineStyle: 'solid',
                    showCenterDot: true,
                    showIntersectionNodes: true,
                    isVisible: true,
                    scale: 1.0,
                    rotation: 0,
                    offsetX: 0,
                    offsetY: 0,
                  }}
                />
              </div>
            )}

            {/* Subject Position Highlight Marker */}
            {showSubjectHighlight && currentPhoto.subjectHighlight && (
              <div
                className="absolute pointer-events-none transition-all duration-300 z-20"
                style={{
                  left: `${currentPhoto.subjectHighlight.x}%`,
                  top: `${currentPhoto.subjectHighlight.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {currentPhoto.subjectHighlight.shape === 'box' ? (
                  // Bounding Box Highlight
                  <div
                    className="border-2 border-dashed border-white bg-black/20 rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.6)] flex items-center justify-center"
                    style={{
                      width: `${(currentPhoto.subjectHighlight.width || 60) * 3}px`,
                      height: `${(currentPhoto.subjectHighlight.height || 60) * 2.2}px`,
                    }}
                  >
                    <span className="px-2 py-0.5 rounded-full bg-black text-[11px] font-semibold text-white border border-white/70">
                      {currentPhoto.subjectHighlight.label}
                    </span>
                  </div>
                ) : (
                  // Circular Sweet Spot Target with Pulse
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing radar wave */}
                    <div className="absolute w-12 h-12 rounded-full bg-white/25 animate-ping motion-reduce:animate-none" />
                    {/* Outer glowing ring */}
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-black/25 shadow-[0_0_0_1px_rgba(0,0,0,0.7)] flex items-center justify-center">
                      {/* Inner reticle dot */}
                      <div className="w-2.5 h-2.5 rounded-full bg-white ring-1 ring-black/70" />
                    </div>

                    {/* Reticle crosshair ticks */}
                    <div className="absolute -top-1 w-0.5 h-2 bg-white" />
                    <div className="absolute -bottom-1 w-0.5 h-2 bg-white" />
                    <div className="absolute -left-1 h-0.5 w-2 bg-white" />
                    <div className="absolute -right-1 h-0.5 w-2 bg-white" />

                    {/* Sweet-Spot Floating Pill */}
                    <div className="absolute top-11 whitespace-nowrap h-7 px-3 rounded-full bg-black border border-white/70 shadow-xl flex items-center gap-1.5">
                      <Target size={12} className="text-white" />
                      <span className="text-[11px] font-semibold text-white">
                        {currentPhoto.subjectHighlight.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prev / Next Chevrons on Image */}
            <button
              onClick={handlePrev}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 backdrop-blur-sm flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95"
              title="Previous Reference Photo"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={handleNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 backdrop-blur-sm flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95"
              title="Next Reference Photo"
            >
              <ChevronRight size={20} />
            </button>

            {/* Photo Counter Pill (e.g. 1 / 3) */}
            <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300">
              {activePhotoIndex + 1} / {references.length}
            </div>

          </div>

          {/* Detailed Photography Explanation & Subject Positioning */}
          <div className="p-4 sm:p-5 flex flex-col gap-3 bg-zinc-950">
            {/* Title & Subject Highlight Callout */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                  EXAMPLE {activePhotoIndex + 1} OF {references.length} — {currentPhoto.genre.toUpperCase()}
                </span>
                <h4 className="text-base font-bold text-white tracking-tight">
                  {currentPhoto.title}
                </h4>
              </div>

              {/* Sweet spot coordinate readout */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-white/5 w-fit">
                <Target size={12} className="text-amber-400" />
                <span>Sweet Spot: X:{currentPhoto.subjectHighlight.x}% Y:{currentPhoto.subjectHighlight.y}%</span>
              </div>
            </div>

            {/* How to Position the Subject */}
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 flex items-start gap-3">
              <Target size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="text-xs font-bold text-zinc-200 mb-1">
                  How to Position the Subject with this Grid
                </h5>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {currentPhoto.explanation}
                </p>
                {currentPhoto.subjectHighlight.description && (
                  <p className="text-[11px] text-zinc-400 mt-1 italic">
                    Focus indicator: {currentPhoto.subjectHighlight.description}
                  </p>
                )}
              </div>
            </div>

            {/* Pro Photographer Tip */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-start gap-3">
              <Lightbulb size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="text-xs font-bold text-amber-300 mb-0.5">
                  Pro Composition Technique
                </h5>
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  {currentPhoto.proTip}
                </p>
              </div>
            </div>

            {/* General Grid Information */}
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 px-1">
              <Award size={13} className="text-sky-400 flex-shrink-0" />
              <span className="truncate">
                <strong className="text-zinc-300">Best for:</strong> {grid.useCase}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions: Try This Grid in Camera */}
        <div className="p-3 sm:p-4 border-t border-white/10 flex items-center gap-3 bg-zinc-900/90 flex-shrink-0">
          <button
            onClick={handlePrev}
            className="h-12 w-12 flex-shrink-0 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center active:scale-95 transition-colors"
            title="Previous Example"
            aria-label="Previous example"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={handleTryInCamera}
            className="flex-1 min-w-0 h-12 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-colors"
          >
            <Camera size={18} aria-hidden="true" />
            <span className="truncate">Try this grid in camera</span>
          </button>

          <button
            onClick={handleNext}
            className="h-12 w-12 flex-shrink-0 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center active:scale-95 transition-colors"
            title="Next Example"
            aria-label="Next example"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
