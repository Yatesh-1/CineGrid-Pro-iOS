import React from 'react';
import type { CompositionGridDefinition } from '../types/camera';
import { GridMiniaturePreview } from './grid-engine/GridMiniaturePreview';
import { X, Lightbulb, Compass, Award, CheckCircle } from 'lucide-react';

interface GuideExplainerModalProps {
  grid: CompositionGridDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyGrid: (grid: CompositionGridDefinition) => void;
}

export const GuideExplainerModal: React.FC<GuideExplainerModalProps> = ({
  grid,
  isOpen,
  onClose,
  onApplyGrid,
}) => {
  if (!isOpen || !grid) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div
        className="relative w-full max-w-md bg-zinc-900 border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-white max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Miniature Grid Geometry */}
        <div className="relative h-44 bg-zinc-950 flex items-center justify-center overflow-hidden border-b border-white/10 p-6">
          <div className="w-32 h-32 rounded-xl overflow-hidden shadow-2xl border border-white/20">
            <GridMiniaturePreview gridType={grid.id} color="#facc15" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/30 pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:text-white"
          >
            <X size={16} />
          </button>

          {/* Title tag */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                COMPOSITION MASTERCLASS
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">{grid.name}</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-mono font-bold uppercase">
              {grid.category}
            </span>
          </div>
        </div>

        {/* Content body */}
        <div className="p-5 flex flex-col gap-3.5 overflow-y-auto no-scrollbar">
          {/* Visual Geometry */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/60 border border-white/5">
            <Compass size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-zinc-200 mb-1">Visual Geometry & Structure</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {grid.description}
              </p>
            </div>
          </div>

          {/* Photography Use Case */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/60 border border-white/5">
            <Award size={18} className="text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-zinc-200 mb-1">Photography Use Case</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {grid.useCase}
              </p>
            </div>
          </div>

          {/* Pro Master Tip */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
            <Lightbulb size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-300 mb-1">Master Photographer Tip</h4>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                {grid.proTip}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 flex items-center gap-3 bg-zinc-950/80">
          <button
            onClick={() => {
              onApplyGrid(grid);
              onClose();
            }}
            className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
          >
            <CheckCircle size={15} />
            Apply This Grid Guide
          </button>
        </div>
      </div>
    </div>
  );
};
