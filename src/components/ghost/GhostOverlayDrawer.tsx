import React, { useRef } from 'react';
import { currentPhotoUrl } from '../../utils/photoVersions';
import type { GhostOverlaySettings, GhostBlendMode } from '../../types/ghost';
import type { CapturedPhoto } from '../../types/camera';
import {
  X,
  Eye,
  EyeOff,
  Upload,
  Lock,
  Unlock,
  RotateCcw,
  RotateCw,
  Sliders,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Check,
  Trash2,
} from 'lucide-react';

interface GhostOverlayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GhostOverlaySettings;
  onUpdate: (patch: Partial<GhostOverlaySettings>) => void;
  onReset: () => void;
  capturedPhotos?: CapturedPhoto[];
}

const SAMPLE_REFERENCE_PHOTOS = [
  {
    name: 'Architectural Vertical Plumb',
    category: 'Architecture',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Classic Studio Portrait',
    category: 'Portrait',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Golden Ratio Landscape',
    category: 'Landscape',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'E-Commerce Product Symmetry',
    category: 'Product',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Urban Street Walking Pace',
    category: 'Street',
    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=80',
  },
];

const BLEND_MODES: { id: GhostBlendMode; label: string; desc: string }[] = [
  { id: 'difference', label: 'DIFFERENCE', desc: 'Inverts matching pixels to pure black for 100% exact alignment' },
  { id: 'screen', label: 'SCREEN', desc: 'Standard photographic ghosting overlay (Blackmagic default)' },
  { id: 'normal', label: 'NORMAL', desc: 'Direct translucent opacity overlay' },
  { id: 'multiply', label: 'MULTIPLY', desc: 'Darkens and highlights key structural outlines' },
  { id: 'overlay', label: 'OVERLAY', desc: 'High contrast edge alignment' },
];

export const GhostOverlayDrawer: React.FC<GhostOverlayDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
  onReset,
  capturedPhotos = [],
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onUpdate({
          enabled: true,
          imageUrl: dataUrl,
          imageName: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectCaptured = (photo: CapturedPhoto) => {
    onUpdate({
      enabled: true,
      imageUrl: currentPhotoUrl(photo),
      imageName: `Capture ${new Date(photo.timestamp).toLocaleTimeString()}`,
    });
  };

  const handleSelectSample = (sample: typeof SAMPLE_REFERENCE_PHOTOS[0]) => {
    onUpdate({
      enabled: true,
      imageUrl: sample.url,
      imageName: sample.name,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-zinc-950/95 border-t border-white/20 rounded-t-3xl p-4 sm:p-5 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 max-h-[88vh] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: title on the left, three equal round buttons on the right */}
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <div className="w-9 h-9 flex-shrink-0 rounded-full bg-zinc-900 text-amber-400 flex items-center justify-center">
            <Layers size={18} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white truncate">Ghost overlay</h3>
            <p className="text-xs text-zinc-400 truncate">Match a reference to your framing</p>
          </div>
          <button
            onClick={() => onUpdate({ enabled: !settings.enabled })}
            aria-pressed={settings.enabled}
            aria-label={settings.enabled ? 'Hide ghost overlay' : 'Show ghost overlay'}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${
              settings.enabled ? 'bg-amber-400 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
            title={settings.enabled ? 'Hide Ghost Overlay' : 'Show Ghost Overlay'}
          >
            {settings.enabled ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
          </button>
          <button
            onClick={() => onUpdate({ isLocked: !settings.isLocked })}
            aria-pressed={settings.isLocked}
            aria-label={settings.isLocked ? 'Unlock overlay position' : 'Lock overlay position'}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${
              settings.isLocked ? 'bg-amber-400 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
            title={settings.isLocked ? 'Position locked (tap to allow dragging)' : 'Position unlocked (drag on the viewfinder)'}
          >
            {settings.isLocked ? <Lock size={16} aria-hidden="true" /> : <Unlock size={16} aria-hidden="true" />}
          </button>
          <button
            onClick={onClose}
            aria-label="Close ghost overlay"
            className="w-9 h-9 flex-shrink-0 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Controls Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-4 pr-0.5">
          {/* Reference Image Source Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-semibold">Reference photo</span>
              {settings.imageUrl && (
                <button
                  onClick={() => onUpdate({ imageUrl: null, enabled: false })}
                  className="text-rose-400 hover:text-rose-300 text-[10px] flex items-center gap-1"
                >
                  <Trash2 size={11} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Active Reference Preview Banner */}
            {settings.imageUrl ? (
              <div className="p-3 rounded-2xl bg-zinc-900 border border-amber-400/40 flex items-center gap-3 shadow-inner">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-black border border-white/10 flex-shrink-0 relative">
                  <img
                    src={settings.imageUrl}
                    alt="Active reference"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 truncate">
                    <Sparkles size={12} className="text-amber-400 flex-shrink-0" />
                    <span className="truncate">{settings.imageName || 'Active Reference Image'}</span>
                  </div>
                  <span className="text-xs text-zinc-400 mt-0.5">
                    Opacity: {Math.round(settings.opacity * 100)}% • Scale: {settings.scale.toFixed(1)}x • Rot: {settings.rotation}°
                  </span>
                  <span className="text-xs text-emerald-400 mt-0.5">
                    {settings.isLocked ? 'Position Locked' : 'Touch/Drag enabled on camera'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-dashed border-white/15 text-center text-xs text-zinc-400">
                No reference image loaded. Select from below or upload a photo to align your shot.
              </div>
            )}

            {/* Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Upload size={14} className="text-amber-400" />
              <span>Upload Reference from Device Gallery</span>
            </button>

            {/* Recent Captures Quick Picker */}
            {capturedPhotos.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-xs text-zinc-400">Recent captures</span>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  {capturedPhotos.slice(0, 6).map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => handleSelectCaptured(photo)}
                      className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 hover:border-amber-400 flex-shrink-0 relative active:scale-95 transition-all"
                      title="Use this captured photo as reference"
                    >
                      <img src={photo.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Photography Guidelines */}
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-xs text-zinc-400">Built-in references</span>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {SAMPLE_REFERENCE_PHOTOS.map((sample) => (
                  <button
                    key={sample.name}
                    onClick={() => handleSelectSample(sample)}
                    className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-amber-400 flex items-center gap-2 flex-shrink-0 text-left transition-all active:scale-95"
                  >
                    <img src={sample.url} alt={sample.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex flex-col pr-1">
                      <span className="text-[11px] font-bold text-white leading-tight">{sample.category}</span>
                      <span className="text-xs text-zinc-400 leading-tight truncate max-w-[100px]">{sample.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Opacity Slider */}
          <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <Sliders size={13} className="text-amber-400" />
                <span>Reference Opacity</span>
              </span>
              <span className="font-bold text-amber-400">{Math.round(settings.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={settings.opacity}
              onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value), enabled: true })}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <button onClick={() => onUpdate({ opacity: 0.25 })} className="hover:text-white">25%</button>
              <button onClick={() => onUpdate({ opacity: 0.5 })} className="hover:text-white">50%</button>
              <button onClick={() => onUpdate({ opacity: 0.75 })} className="hover:text-white">75%</button>
              <button onClick={() => onUpdate({ opacity: 1.0 })} className="hover:text-white">100%</button>
            </div>
          </div>

          {/* 3. Scale / Zoom Slider */}
          <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <ImageIcon size={13} className="text-amber-400" />
                <span>Reference Scale / Zoom</span>
              </span>
              <span className="font-bold text-amber-400">{settings.scale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={settings.scale}
              onChange={(e) => onUpdate({ scale: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <button onClick={() => onUpdate({ scale: 0.5 })} className="hover:text-white">0.5x</button>
              <button onClick={() => onUpdate({ scale: 1.0 })} className="hover:text-white">1.0x (Fit)</button>
              <button onClick={() => onUpdate({ scale: 1.5 })} className="hover:text-white">1.5x</button>
              <button onClick={() => onUpdate({ scale: 2.0 })} className="hover:text-white">2.0x</button>
            </div>
          </div>

          {/* 4. Rotation Slider & 90° Flip */}
          <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <RotateCw size={13} className="text-amber-400" />
                <span>Rotation Angle</span>
              </span>
              <span className="font-bold text-amber-400">{settings.rotation}°</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onUpdate({ rotation: (settings.rotation - 90 + 360) % 360 })}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                title="Rotate 90° CCW"
              >
                <RotateCcw size={14} />
              </button>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={settings.rotation}
                onChange={(e) => onUpdate({ rotation: parseInt(e.target.value, 10) })}
                className="flex-1 accent-amber-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <button
                onClick={() => onUpdate({ rotation: (settings.rotation + 90) % 360 })}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                title="Rotate 90° CW"
              >
                <RotateCw size={14} />
              </button>
            </div>
          </div>

          {/* 5. Blend Mode Selection */}
          <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-white/10">
            <span className="text-xs text-zinc-300 font-semibold uppercase">Alignment Blend Mode</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1">
              {BLEND_MODES.map((bm) => (
                <button
                  key={bm.id}
                  onClick={() => onUpdate({ blendMode: bm.id })}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    settings.blendMode === bm.id
                      ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-md'
                      : 'bg-zinc-800/80 text-zinc-300 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span>{bm.label}</span>
                    {settings.blendMode === bm.id && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className={`text-[10px] leading-tight line-clamp-2 mt-0.5 ${settings.blendMode === bm.id ? 'text-black/80' : 'text-zinc-500'}`}>
                    {bm.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions: Reset Positioning */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          <button
            onClick={onReset}
            className="flex-1 min-w-0 h-11 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span className="truncate">Reset position</span>
          </button>

          <button
            onClick={onClose}
            className="h-11 px-8 flex-shrink-0 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold flex items-center justify-center active:scale-95 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
