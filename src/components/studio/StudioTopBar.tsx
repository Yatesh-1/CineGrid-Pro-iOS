import React, { useRef, useState } from 'react';
import type { CompareViewMode } from '../../types/studio';
import type { CapturedPhoto } from '../../types/camera';
import {
  ChevronLeft,
  Info,
  Undo2,
  Redo2,
  HelpCircle,
  Share2,
  MoreVertical,
  SplitSquareVertical,
  Eye,
  RotateCcw,
  Check,
  Download,
  ZoomIn,
} from 'lucide-react';

interface StudioTopBarProps {
  photo?: CapturedPhoto | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  compareMode: CompareViewMode;
  onChangeCompareMode: (mode: CompareViewMode) => void;
  isHoldingOriginal: boolean;
  onHoldOriginalStart: () => void;
  onHoldOriginalEnd: () => void;
  zoomLevel: number;
  onToggleZoom: () => void;
  onResetAll: () => void;
  onSaveToGallery: () => void;
  onExportDownload: (format: 'image/jpeg' | 'image/png') => void;
  onShare: () => void;
  onClose: () => void;
}

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  photo,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  compareMode,
  onChangeCompareMode,
  isHoldingOriginal,
  onHoldOriginalStart,
  onHoldOriginalEnd,
  zoomLevel,
  onToggleZoom,
  onResetAll,
  onSaveToGallery,
  onExportDownload,
  onShare,
  onClose,
}) => {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);
  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (heldRef.current) onHoldOriginalEnd();
  };
  const [showInfo, setShowInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const copiedNotification: string | null = null;

  const handleHelp = () => {
    alert('CineGrid Pro Photo Studio:\n\n• Long-press on the image anytime to compare with the untouched original.\n• Use the bottom sliders to adjust exposure, color, effects, and details non-destructively.\n• Tap the Checkmark (✓) or Share to save high-resolution copies directly to your phone Gallery.');
  };

  const formattedDate = photo?.timestamp
    ? new Date(photo.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="flex flex-col bg-black border-b border-white/10 select-none z-30 flex-shrink-0 safe-top">
      {/* Primary Top Bar Strip (matching Lightroom Mobile Screenshot 1) */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2">
        {/* Left: Back Arrow < and Info (i) */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Back to Gallery"
          >
            <ChevronLeft size={22} />
          </button>

          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-full transition-colors ${
              showInfo ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Toggle Shot Metadata"
          >
            <Info size={19} />
          </button>
        </div>

        {/* Center: Hold Original & Compare modes */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onPointerDown={() => {
              heldRef.current = false;
              holdTimer.current = setTimeout(() => {
                heldRef.current = true;
                onHoldOriginalStart();
              }, 300);
            }}
            onPointerUp={() => {
              const wasHold = heldRef.current;
              endHold();
              // a quick tap toggles the before/after split; a hold only peeks at the original
              if (!wasHold) onChangeCompareMode(compareMode === 'after-only' ? 'split-vertical' : 'after-only');
              heldRef.current = false;
            }}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1 transition-all select-none active:scale-95 touch-none ${
              isHoldingOriginal || compareMode !== 'after-only'
                ? 'bg-amber-400 text-black font-extrabold shadow-md'
                : 'bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white'
            }`}
            title="Tap: before/after split. Hold: see the original"
          >
            <Eye size={12} />
            <span>{isHoldingOriginal ? 'ORIGINAL' : 'COMPARE'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-0.5 bg-zinc-900 p-0.5 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => onChangeCompareMode('after-only')}
              className={`p-1 rounded text-xs ${
                compareMode === 'after-only' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Normal View"
            >
              <Eye size={13} />
            </button>
            <button
              type="button"
              onClick={() => onChangeCompareMode('split-vertical')}
              className={`p-1 rounded text-xs ${
                compareMode === 'split-vertical' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Split View"
            >
              <SplitSquareVertical size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleZoom}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 border border-white/10 text-xs text-zinc-300 hover:text-white"
            title="Toggle Zoom"
          >
            <ZoomIn size={12} />
            <span className="font-mono text-[11px]">{Math.round(zoomLevel * 100)}%</span>
          </button>
        </div>

        {/* Right: Undo, Redo, Help, Share, Save Checkmark, More */}
        <div className="flex items-center gap-0.5 sm:gap-1 relative">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-full transition-colors ${
              canUndo ? 'text-zinc-300 hover:text-white hover:bg-zinc-800' : 'text-zinc-700 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <Undo2 size={18} />
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-full transition-colors hidden sm:flex ${
              canRedo ? 'text-zinc-300 hover:text-white hover:bg-zinc-800' : 'text-zinc-700 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <Redo2 size={18} />
          </button>

          <button
            type="button"
            onClick={handleHelp}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors hidden sm:flex"
            title="Help"
          >
            <HelpCircle size={18} />
          </button>

          <button
            type="button"
            onClick={onShare}
            className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Share"
            aria-label="Share"
          >
            <Share2 size={18} />
          </button>

          <button
            type="button"
            onClick={onSaveToGallery}
            className="p-2 rounded-full bg-amber-400 text-black hover:bg-amber-300 font-bold active:scale-95 transition-all shadow-md ml-1"
            title="Save Edited Copy to Gallery"
          >
            <Check size={18} strokeWidth={3} />
          </button>

          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="More Options"
          >
            <MoreVertical size={18} />
          </button>

          {/* More Options Dropdown */}
          {showMenu && (
            <div className="absolute top-12 right-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={onResetAll}
                className="w-full px-3 py-2 text-left text-xs text-rose-300 hover:bg-zinc-800 flex items-center gap-2"
              >
                <RotateCcw size={14} />
                <span>Reset to Original</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onExportDownload('image/png');
                }}
                className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 border-t border-white/5"
              >
                <Download size={14} />
                <span>Export Lossless PNG</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Metadata Bar (Lightroom Mobile style: Screenshot 1) */}
      {showInfo && photo && (
        <div className="px-4 py-2 bg-zinc-950/90 border-t border-white/5 flex flex-col gap-0.5 text-xs font-mono animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-zinc-300 font-bold">
            <span>{photo.filterUsed || 'Original Raw'}</span>
            <span className="text-zinc-500 font-normal">{photo.aspectRatio} Aspect</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>
              {photo.proSettings.shutter} sec at {photo.proSettings.kelvin}K, ISO {photo.proSettings.iso}
            </span>
            <span>{formattedDate}</span>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {copiedNotification && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-zinc-800 text-amber-300 px-3 py-1.5 rounded-full text-xs font-mono font-medium shadow-xl border border-white/10 z-50">
          {copiedNotification}
        </div>
      )}
    </div>
  );
};
