import React, { useRef, useState, useEffect } from 'react';
import { MediaThumb } from './MediaThumb';
import { saveToDevice } from '../services/deviceSaveService';
import { currentPhotoUrl } from '../utils/photoVersions';
import type { CapturedPhoto } from '../types/camera';
import {
  X,
  Download,
  Trash2,
  Upload,
  Camera,
  Calendar,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Grid,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  Share2,
  Play,
  Film,
} from 'lucide-react';

interface GalleryModalProps {
  photos: CapturedPhoto[];
  isOpen: boolean;
  onClose: () => void;
  onDeletePhoto: (id: string) => void;
  onOpenEditor: (photo: CapturedPhoto) => void;
  onOpenExportStudio?: (photo: CapturedPhoto) => void;
  /** Imports a photo from the device. Resolves with an error message, or null on success. */
  onImportPhoto?: (file: File) => Promise<string | null>;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({
  photos,
  isOpen,
  onClose,
  onDeletePhoto,
  onOpenEditor,
  onOpenExportStudio,
  onImportPhoto,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showExif, setShowExif] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [photoToDelete, setPhotoToDelete] = useState<CapturedPhoto | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Multi-select: long-press a thumbnail or tap "Select"; then select all / save / delete several at once
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  // Reset zoom & pan when switching photo
  useEffect(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  }, [selectedIndex, viewMode]);

  // Keep index in bounds
  useEffect(() => {
    if (selectedIndex >= photos.length && photos.length > 0) {
      setSelectedIndex(photos.length - 1);
    }
  }, [photos.length, selectedIndex]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onImportPhoto) return;
    setIsImporting(true);
    setImportError(null);
    const error = await onImportPhoto(file);
    setIsImporting(false);
    if (error) setImportError(error);
    else showToast('Photo imported successfully');
  };

  const currentPhoto = photos[Math.min(selectedIndex, Math.max(0, photos.length - 1))];

  const isCurrentVideo = Boolean(
    currentPhoto &&
      (currentPhoto.mediaType === 'video' ||
        currentPhoto.id.endsWith('.mp4') ||
        currentPhoto.id.endsWith('.webm') ||
        currentPhoto.dataUrl.startsWith('data:video'))
  );

  const exitSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  };
  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = photos.length > 0 && selectedIds.size === photos.length;
  const isVideoItem = (p: CapturedPhoto) =>
    p.mediaType === 'video' || p.id.endsWith('.mp4') || p.id.endsWith('.webm') || p.dataUrl.startsWith('data:video');

  const bulkDelete = () => {
    const ids = [...selectedIds];
    ids.forEach((id) => onDeletePhoto(id));
    exitSelect();
    showToast(`${ids.length} item${ids.length === 1 ? '' : 's'} deleted`);
  };

  const bulkSave = async () => {
    const chosen = photos.filter((p) => selectedIds.has(p.id));
    let ok = 0;
    for (const p of chosen) {
      const vid = isVideoItem(p);
      const stamp = new Date(p.timestamp).toISOString().slice(0, 19).replace(/[:T]/g, '_');
      try {
        await saveToDevice(currentPhotoUrl(p), `${vid ? 'CINEGRID_VID_' : 'CINEGRID_IMG_'}${stamp}${vid ? '.mp4' : '.jpg'}`, vid ? 'video/mp4' : 'image/jpeg');
        ok++;
      } catch (err) {
        console.warn('Save to device failed:', err);
      }
    }
    showToast(ok === chosen.length ? `Saved ${ok} to your phone gallery` : `Saved ${ok} of ${chosen.length}`);
    exitSelect();
  };

  const startPress = (id: string) => {
    longPressed.current = false;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setSelectMode(true);
      setSelectedIds((prev) => new Set(prev).add(id));
    }, 450);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const handleDownload = (type: 'current' | 'original') => {
    if (!currentPhoto) return;
    const url = type === 'original' ? currentPhoto.dataUrl : currentPhotoUrl(currentPhoto);
    const isVid = isCurrentVideo;
    const ext = isVid ? '.mp4' : '.jpg';
    const mime = isVid ? 'video/mp4' : 'image/jpeg';
    const prefix = isVid ? 'CINEGRID_VID_' : 'CINEGRID_IMG_';
    const fileName = `${prefix}${new Date(currentPhoto.timestamp)
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '_')}${ext}`;

    saveToDevice(url, fileName, mime)
      .then(() =>
        showToast(
          isVid ? 'Saved video to Movies/CineGrid Pro' : 'Saved photo to Pictures/CineGrid Pro'
        )
      )
      .catch((err) => {
        console.warn('Save to device failed:', err);
        showToast('Error saving to device');
      });
  };

  const nextPhoto = () => {
    setSelectedIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const prevPhoto = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleZoomIn = () => setZoomScale((prev) => Math.min(4, Number((prev + 0.5).toFixed(1))));
  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(1)));
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomScale <= 1) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Import controls
  const importControls = onImportPhoto ? (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChosen}
        aria-label="Choose a photo to import"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-zinc-800 text-zinc-100 border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-zinc-700 active:scale-95 transition-all disabled:opacity-50"
        title="Import a photo from this device to edit"
      >
        <Upload size={14} aria-hidden="true" />
        <span className="hidden sm:inline">{isImporting ? 'Importing…' : 'Import'}</span>
      </button>
    </>
  ) : null;

  const importErrorNote = importError ? (
    <p role="alert" className="text-xs text-rose-300 px-4 py-2 bg-rose-950/70 border-b border-rose-800/40">
      {importError}
    </p>
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050608] text-white select-none animate-fadeIn">
      {selectMode && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-zinc-950/95 z-30 safe-top" role="toolbar" aria-label="Selection">
          <button type="button" onClick={exitSelect} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-zinc-800 text-white border border-white/10 active:scale-95" title="Cancel selection" aria-label="Cancel selection">
            <X size={18} />
          </button>
          <span className="flex-1 min-w-0 truncate text-sm font-bold text-white">{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={() => setSelectedIds(allSelected ? new Set() : new Set(photos.map((p) => p.id)))}
            className="min-h-[44px] px-3 rounded-xl bg-zinc-800 text-zinc-100 border border-white/10 text-xs font-bold active:scale-95"
          >
            {allSelected ? 'None' : 'Select all'}
          </button>
          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={bulkSave}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-zinc-800 text-amber-300 border border-white/10 disabled:opacity-40 active:scale-95"
            title="Save selected to phone gallery"
            aria-label="Save selected"
          >
            <Download size={18} />
          </button>
          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={() => setConfirmBulkDelete(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-rose-950/70 text-rose-300 border border-rose-800/40 disabled:opacity-40 active:scale-95"
            title="Delete selected"
            aria-label="Delete selected"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
      {/* Top Header */}
      <div className={`${selectMode ? 'hidden' : 'flex'} flex-wrap gap-y-2 items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-white/10 bg-zinc-950/90 backdrop-blur-md z-30 safe-top`}>
        <div className="flex items-center gap-2 min-w-0">
          {/* title block below is truncated so a long label never squeezes the buttons */}
          <button
            type="button"
            onClick={() => (viewMode === 'detail' && photos.length > 0 ? setViewMode('grid') : onClose())}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-zinc-800 text-white border border-white/10 active:scale-95"
            title={viewMode === 'detail' ? 'Back to gallery' : 'Back to camera'}
            aria-label={viewMode === 'detail' ? 'Back to gallery' : 'Back to camera'}
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-mono font-bold text-zinc-100 truncate">
              {viewMode === 'grid'
                ? `Gallery (${photos.length})`
                : `${selectedIndex + 1} / ${photos.length}`}
            </span>
            <span className="text-[10px] font-mono text-amber-400 truncate max-w-[40vw]">
              {viewMode === 'grid' ? 'Pictures/CineGrid Pro' : currentPhoto?.filterUsed || 'Standard Capture'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {importControls}

          {photos.length > 0 && viewMode === 'grid' && (
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-zinc-800 text-zinc-100 border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-zinc-700 active:scale-95 transition-all"
              title="Select several to delete or save"
              aria-label="Select"
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Select</span>
            </button>
          )}

          {photos.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode((prev) => (prev === 'grid' ? 'detail' : 'grid'))}
              className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border text-xs font-mono flex items-center justify-center transition-all ${
                viewMode === 'grid'
                  ? 'bg-amber-400 text-black border-amber-400 font-bold'
                  : 'bg-zinc-800 text-zinc-300 border-white/10 hover:text-white'
              }`}
              title={viewMode === 'grid' ? 'Switch to Full Screen' : 'Switch to Grid'}
            >
              {viewMode === 'grid' ? <Maximize2 size={16} /> : <Grid size={16} />}
            </button>
          )}

          {viewMode === 'detail' && currentPhoto && (
            <>
              {isCurrentVideo ? (
                <span className="min-h-[44px] px-3 py-1.5 rounded-xl bg-zinc-800 text-amber-400 font-mono font-bold text-xs flex items-center gap-1.5 border border-white/10">
                  <Film size={14} />
                  <span>Video Clip</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenEditor(currentPhoto)}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  title="Edit in Studio"
                >
                  <Sliders size={14} />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}

              {onOpenExportStudio && !isCurrentVideo && (
                <button
                  type="button"
                  onClick={() => onOpenExportStudio(currentPhoto)}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 font-bold text-xs flex items-center gap-1.5 transition-all"
                  title="Open Export Studio"
                >
                  <Share2 size={14} />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowExif(!showExif)}
                className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border text-xs font-mono transition-colors ${
                  showExif ? 'bg-amber-400 text-black border-amber-400 font-bold' : 'bg-zinc-800 text-zinc-300 border-white/10'
                }`}
                title="Toggle EXIF Metadata"
              >
                <Sliders size={16} />
              </button>

              <button
                type="button"
                onClick={() => handleDownload('current')}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 active:scale-95 transition-all"
                title="Download / Save to Gallery"
              >
                <Download size={16} />
              </button>

              <button
                type="button"
                onClick={() => setPhotoToDelete(currentPhoto)}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-rose-950/60 text-rose-400 hover:bg-rose-900 border border-rose-800/40 active:scale-95 transition-all"
                title="Delete Photo"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 active:scale-95 transition-all"
            title="Close Gallery"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {importErrorNote}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 shadow-2xl animate-in fade-in duration-200">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      {photos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-sm bg-zinc-950/80 border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto mb-4">
              <Camera size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No Photos Captured Yet</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Photographs captured with CineGrid Pro appear here automatically and save directly to your Android device gallery.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-xs font-mono tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              START SHOOTING
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Responsive Thumbnail Grid */
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
            {photos.map((photo, idx) => {
              const isVid =
                photo.mediaType === 'video' ||
                photo.id.endsWith('.mp4') ||
                photo.id.endsWith('.webm') ||
                photo.dataUrl.startsWith('data:video');

              return (
                <div
                  key={photo.id}
                  onPointerDown={() => startPress(photo.id)}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  onPointerCancel={cancelPress}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={() => {
                    if (longPressed.current) {
                      longPressed.current = false; // the long-press already started selecting
                      return;
                    }
                    if (selectMode) {
                      toggleSelected(photo.id);
                      return;
                    }
                    setSelectedIndex(idx);
                    setViewMode('detail');
                  }}
                  className={`group relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border cursor-pointer active:scale-95 transition-all ${
                    selectMode && selectedIds.has(photo.id)
                      ? 'border-amber-400 ring-2 ring-amber-400/60'
                      : selectedIndex === idx && !selectMode
                      ? 'border-amber-400 ring-2 ring-amber-400/30'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  {selectMode && (
                    <div className={`absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedIds.has(photo.id) ? 'bg-amber-400 border-amber-300 text-black' : 'bg-black/50 border-white/70 text-transparent'}`} aria-hidden="true">
                      <CheckCircle2 size={14} />
                    </div>
                  )}
                  {selectMode && selectedIds.has(photo.id) && <div className="absolute inset-0 bg-amber-400/20 z-[5] pointer-events-none" />}
                  <MediaThumb
                    photo={photo}
                    alt={`Photo ${idx + 1}`}
                    lazy
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-[10px] font-mono text-amber-300 truncate font-semibold">
                      {photo.filterUsed}
                    </span>
                  </div>
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-mono text-zinc-300">
                    {idx + 1}
                  </div>
                  {isVid && (
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-amber-400/40 text-amber-400 flex items-center gap-1 shadow-md">
                      <Play size={10} fill="currentColor" />
                      {photo.durationSeconds ? (
                        <span className="text-[8px] font-mono font-bold">
                          {Math.floor(photo.durationSeconds / 60)}:
                          {String(photo.durationSeconds % 60).padStart(2, '0')}
                        </span>
                      ) : (
                        <span className="text-[8px] font-mono font-bold">VID</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Full-Screen Photo or Video Viewer with Zoom & Pan */
        <div
          className="relative flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {currentPhoto &&
            (isCurrentVideo ? (
              <div className="max-w-full max-h-full flex items-center justify-center p-2">
                <video
                  src={currentPhotoUrl(currentPhoto)}
                  // slow-motion clips are recorded at high speed (e.g. 120 fps) and shown here at a slower pace
                  ref={(el) => {
                    if (el && currentPhoto.slowMotion) el.defaultPlaybackRate = currentPhoto.slowMotion.playbackSpeed;
                    if (el && currentPhoto.slowMotion) el.playbackRate = currentPhoto.slowMotion.playbackSpeed;
                  }}
                  controls
                  playsInline
                  autoPlay={false}
                  className="max-w-full max-h-[76vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                />
              </div>
            ) : (
              <div
                style={{
                  transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                  cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
                className="max-w-full max-h-full flex items-center justify-center"
              >
                <img
                  src={currentPhotoUrl(currentPhoto)}
                  alt="Captured shot"
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10 select-none pointer-events-none"
                />
              </div>
            ))}

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevPhoto}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 min-h-[48px] min-w-[48px] rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all shadow-xl z-20"
                title="Previous Photo"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={nextPhoto}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 min-h-[48px] min-w-[48px] rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all shadow-xl z-20"
                title="Next Photo"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* On-screen Zoom Toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 z-20">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomScale <= 1}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 disabled:opacity-40 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-[11px] font-mono text-amber-400 font-bold px-1.5 min-w-[42px] text-center">
              {zoomScale.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomScale >= 4}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 disabled:opacity-40 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            {zoomScale > 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 rounded-full hover:bg-white/10 text-amber-400 transition-colors ml-1"
                title="Reset Zoom"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating / Bottom EXIF Data Inspector */}
      {viewMode === 'detail' && showExif && currentPhoto && (
        <div className="p-3 sm:p-4 border-t border-white/10 bg-zinc-950/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono z-30">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-zinc-500 block text-[10px]">FILTER LOOK</span>
              <span className="text-amber-400 font-bold">{currentPhoto.filterUsed}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">COMPOSITION GUIDE</span>
              <span className="text-white font-bold">{currentPhoto.gridUsed}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">ASPECT</span>
              <span className="text-white font-bold">{currentPhoto.aspectRatio}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <span className="text-zinc-500 block text-[10px]">SHUTTER</span>
              <span className="text-white">{currentPhoto.proSettings.shutter}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">ISO</span>
              <span className="text-white">{currentPhoto.proSettings.iso}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">WHITE BALANCE</span>
              <span className="text-amber-300">{currentPhoto.proSettings.kelvin}K</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">EV</span>
              <span className="text-white">
                {currentPhoto.proSettings.ev > 0 ? `+${currentPhoto.proSettings.ev}` : currentPhoto.proSettings.ev}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
            <Calendar size={12} />
            <span>{new Date(currentPhoto.timestamp).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/15 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h4 className="text-base font-bold text-white mb-1.5">Delete {selectedIds.size} item{selectedIds.size === 1 ? '' : 's'}?</h4>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">They will be permanently removed from your CineGrid Pro library.</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setConfirmBulkDelete(false)} className="flex-1 min-h-[48px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold">
                CANCEL
              </button>
              <button type="button" onClick={bulkDelete} className="flex-1 min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold shadow-lg shadow-rose-600/30">
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/15 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h4 className="text-base font-bold text-white mb-1.5">Delete Photograph?</h4>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              This photo will be permanently removed from your CineGrid Pro library.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 min-h-[48px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold transition-all"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePhoto(photoToDelete.id);
                  setPhotoToDelete(null);
                  showToast('Photo deleted');
                }}
                className="flex-1 min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
