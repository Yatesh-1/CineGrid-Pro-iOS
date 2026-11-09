import React, { useState, useRef, useEffect, useCallback } from 'react';
import { saveToDevice } from '../../services/deviceSaveService';
import { shareImage } from '../../services/shareService';
import type { CapturedPhoto } from '../../types/camera';
import type {
  StudioEditState,
  StudioTab,
  CompareViewMode,
  MaskType,
  MaskObject,
  StudioPreset,
} from '../../types/studio';
import { StudioEngine, DEFAULT_STUDIO_STATE } from '../../utils/studioEngine';
import { StudioTopBar } from './StudioTopBar';
import { StudioSidebar } from './StudioSidebar';
import { cameraAudio } from '../../utils/audio';
import { editorBaseUrl } from '../../utils/photoVersions';
import { CropOverlay } from './CropOverlay';
import { blendStates } from '../../utils/studioBlend';
import { ratioValue, FULL_CROP, type CropRect } from '../../utils/cropMath';

/** Edits run on a downscaled copy while dragging sliders; export always uses the full-resolution source. */
const PREVIEW_MAX_EDGE = 1024;

function makePreviewSource(img: HTMLImageElement): CanvasImageSource {
  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  if (longEdge <= PREVIEW_MAX_EDGE) return img;
  const k = PREVIEW_MAX_EDGE / longEdge;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
  const ctx = canvas.getContext('2d');
  if (!ctx) return img;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** The state used while the crop tool is open: the whole photo, unrotated, so crop handles map 1:1. */
const withoutGeometry = (s: StudioEditState): StudioEditState => ({
  ...s,
  geometry: {
    ...s.geometry,
    cropRect: { ...FULL_CROP },
    rotation: 0,
    straighten: 0,
    flipH: false,
    flipV: false,
    verticalKeystone: 0,
    horizontalKeystone: 0,
  },
  masks: [],
});

const clampPct = (v: number) => Math.min(100, Math.max(0, v));
const MAX_BRUSH_DABS = 400;

interface StudioWorkspaceProps {
  photo: CapturedPhoto | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveEdited: (photoId: string, editedDataUrl: string) => void;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  photo,
  isOpen,
  onClose,
  onSaveEdited,
}) => {
  // Current edit state
  const [state, setState] = useState<StudioEditState>(DEFAULT_STUDIO_STATE);

  // Undo / Redo history stack
  const [history, setHistory] = useState<StudioEditState[]>([DEFAULT_STUDIO_STATE]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Comparison & View modes
  const [compareMode, setCompareMode] = useState<CompareViewMode>('after-only');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage (0-100)
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [activeTab, setActiveTab] = useState<StudioTab>('light');
  const [showMaskOverlay, setShowMaskOverlay] = useState<boolean>(false);
  const [isCropEditing, setIsCropEditing] = useState<boolean>(false);
  const [draftCrop, setDraftCrop] = useState<CropRect | null>(null);
  const [imageAspect, setImageAspect] = useState<number>(1.5);

  // Custom Presets persisted to localStorage
  const [customPresets, setCustomPresets] = useState<StudioPreset[]>(() => {
    try {
      const saved = localStorage.getItem('cinegrid_studio_custom_presets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    return () => {
      StudioEngine.cleanResources();
    };
  }, []);

  // Canvas refs
  const editedCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  // Smaller copies used for the on-screen preview (identical to the full images when the photo is small)
  const previewSourceRef = useRef<CanvasImageSource | null>(null);
  const previewOriginalRef = useRef<CanvasImageSource | null>(null);
  const stateRef = useRef<StudioEditState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const lastPushRef = useRef<{ time: number; keys: string }>({ time: 0, keys: '' });
  const maskDragRef = useRef<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSplitRef = useRef<boolean>(false);

  // Re-render canvases whenever state or compare mode changes
  const renderAll = useCallback(
    (source: CanvasImageSource, editState: StudioEditState) => {
      if (editedCanvasRef.current) {
        StudioEngine.processImage(
          source,
          editState,
          editedCanvasRef.current,
          showMaskOverlay
        );
      }
      if (originalCanvasRef.current && (compareMode !== 'after-only' || isHoldingOriginal)) {
        // BEFORE is always the untouched capture, not the AFTER base (which may include the capture look)
        StudioEngine.processImage(
          previewOriginalRef.current ?? source,
          DEFAULT_STUDIO_STATE,
          originalCanvasRef.current,
          false
        );
      }
    },
    [compareMode, isHoldingOriginal, showMaskOverlay]
  );

  // Load photo into source image on open
  useEffect(() => {
    if (!photo) return;
    let cancelled = false;
    const loadImage = (url: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = 'anonymous';
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Photo could not be loaded'));
        el.src = url;
      });
    const baseUrl = editorBaseUrl(photo);
    Promise.all([
      loadImage(baseUrl),
      baseUrl === photo.dataUrl ? Promise.resolve(null) : loadImage(photo.dataUrl),
    ]).then(([img, original]) => {
      if (cancelled) return;
      originalImageRef.current = original ?? img;
      sourceImageRef.current = img;
      previewSourceRef.current = makePreviewSource(img);
      previewOriginalRef.current = original ? makePreviewSource(original) : previewSourceRef.current;
      setImageAspect(img.naturalWidth / img.naturalHeight);
      // Reset edit state to clean slate
      setState(DEFAULT_STUDIO_STATE);
      setHistory([DEFAULT_STUDIO_STATE]);
      setHistoryIndex(0);
      setLoadError(null);
      renderAll(previewSourceRef.current, DEFAULT_STUDIO_STATE);
    }).catch(() => {
      if (!cancelled) setLoadError('This photo could not be opened. It may have been removed from storage.');
    });
    return () => {
      cancelled = true;
    };
  }, [photo, renderAll]);

  useEffect(() => {
    if (previewSourceRef.current) {
      renderAll(previewSourceRef.current, isCropEditing ? withoutGeometry(state) : state);
    }
  }, [state, renderAll, isCropEditing]);

  // Push state to undo/redo history
  const pushState = (nextState: StudioEditState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    // Rapid edits to the same section (dragging one slider) replace one undo step instead of filling the stack
    const changed = (Object.keys(nextState) as (keyof StudioEditState)[]).filter((k) => nextState[k] !== state[k]).join(',');
    const now = Date.now();
    const coalesce =
      changed !== '' && changed === lastPushRef.current.keys && now - lastPushRef.current.time < 700 && historyIndex > 0;
    lastPushRef.current = { time: now, keys: changed };
    if (coalesce) newHistory[newHistory.length - 1] = nextState;
    else newHistory.push(nextState);
    // Limit history stack to 50 steps
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setState(nextState);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      cameraAudio.playClick();
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setState(history[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      cameraAudio.playClick();
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setState(history[nextIdx]);
    }
  };

  const handleResetAll = () => {
    cameraAudio.playClick();
    pushState(DEFAULT_STUDIO_STATE);
  };

  // State updates from sidebar panels
  const handleChangeState = (patch: Partial<StudioEditState>) => {
    const updated = { ...state, ...patch };
    pushState(updated);
  };

  // Preset Handlers. The state before the preset is remembered, so intensity can blend between "no preset"
  // and "full preset", and Reset can put the photo back exactly as it was.
  const presetBaseRef = useRef<StudioEditState | null>(null);
  const presetFullRef = useRef<StudioEditState | null>(null);

  const handleApplyPreset = (preset: StudioPreset) => {
    cameraAudio.playFocusLock();
    // choosing another preset replaces the previous one instead of stacking on it
    const base = presetBaseRef.current && state.activePresetId ? presetBaseRef.current : state;
    const full: StudioEditState = { ...base, ...preset.values, activePresetId: preset.id, presetIntensity: 100 };
    presetBaseRef.current = base;
    presetFullRef.current = full;
    pushState(full);
  };

  const handleChangePresetIntensity = (percent: number) => {
    const base = presetBaseRef.current;
    const full = presetFullRef.current;
    if (!base || !full || !state.activePresetId) {
      handleChangeState({ presetIntensity: percent });
      return;
    }
    pushState({ ...blendStates(base, full, percent / 100), activePresetId: full.activePresetId, presetIntensity: percent });
  };

  const handleResetPreset = () => {
    const base = presetBaseRef.current;
    presetBaseRef.current = null;
    presetFullRef.current = null;
    if (base) pushState({ ...base, activePresetId: undefined, presetIntensity: 100 });
    else handleChangeState({ activePresetId: undefined, presetIntensity: 100 });
  };

  const handleSaveCustomPreset = (name: string) => {
    const newPreset: StudioPreset = {
      id: `custom_${Date.now()}`,
      name,
      category: 'Natural',
      description: 'User-created custom color grade and adjustments.',
      thumbnailColor: '#facc15',
      values: { ...state },
    };
    const updated = [newPreset, ...customPresets];
    setCustomPresets(updated);
    try {
      localStorage.setItem('cinegrid_studio_custom_presets', JSON.stringify(updated));
    } catch {}
  };

  const handleImportPresets = (imported: StudioPreset[]) => {
    const updated = [...imported, ...customPresets];
    setCustomPresets(updated);
    try {
      localStorage.setItem('cinegrid_studio_custom_presets', JSON.stringify(updated));
    } catch {}
  };

  // Mask Handlers
  const MASK_NAMES: Record<MaskType, string> = {
    linear: 'Linear Gradient',
    radial: 'Radial Gradient',
    brush: 'Brush',
    luminance: 'Luminance Range',
    color: 'Color Range',
    sky: 'Sky (estimate)',
  };
  const handleAddMask = (type: MaskType) => {
    cameraAudio.playClick();
    const newMask: MaskObject = {
      id: `mask_${Date.now()}`,
      name: `${MASK_NAMES[type]} ${state.masks.length + 1}`,
      type,
      enabled: true,
      inverted: false,
      x: 50,
      y: type === 'linear' ? 35 : 50,
      width: type === 'brush' ? 40 : 60,
      height: 60,
      angle: type === 'linear' ? 90 : 0,
      feather: type === 'brush' ? 60 : 40,
      brushPoints: type === 'brush' ? [] : undefined,
      lumMin: type === 'luminance' ? 65 : undefined,
      lumMax: type === 'luminance' ? 100 : undefined,
      hue: type === 'color' ? 210 : undefined,
      hueRange: type === 'color' ? 30 : undefined,
      // A new mask changes nothing until the user moves a slider; the red overlay shows what it selects.
      adjustments: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, saturation: 0, sharpness: 0 },
    };
    setShowMaskOverlay(true);
    handleChangeState({ masks: [...state.masks, newMask], activeMaskId: newMask.id });
  };
  const handleUpdateMask = (updatedMask: MaskObject) => {
    const updatedMasks = state.masks.map((m) => (m.id === updatedMask.id ? updatedMask : m));
    handleChangeState({ masks: updatedMasks });
  };

  const handleDeleteMask = (id: string) => {
    const filtered = state.masks.filter((m) => m.id !== id);
    handleChangeState({
      masks: filtered,
      activeMaskId: state.activeMaskId === id ? null : state.activeMaskId,
    });
  };

  // Painting and placing masks directly on the photo (live while dragging, one undo step on release)
  const activeMask = state.masks.find((m) => m.id === state.activeMaskId) ?? null;
  const canEditMaskOnPhoto =
    activeTab === 'masking' &&
    !!activeMask &&
    (activeMask.type === 'linear' || activeMask.type === 'radial' || activeMask.type === 'brush') &&
    compareMode === 'after-only' &&
    !isCropEditing &&
    !isHoldingOriginal;

  const applyMaskPointer = (e: React.PointerEvent<HTMLElement>, first: boolean) => {
    const current = stateRef.current;
    const m = current.masks.find((mm) => mm.id === current.activeMaskId);
    if (!m) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = clampPct(((e.clientX - r.left) / r.width) * 100);
    const y = clampPct(((e.clientY - r.top) / r.height) * 100);
    let next: MaskObject;
    if (m.type === 'radial' || m.type === 'linear') {
      next = { ...m, x, y };
    } else if (m.type === 'brush') {
      const radius = m.width / 5; // percent of image width
      const last = m.brushPoints?.[m.brushPoints.length - 1];
      if (!first && last && Math.hypot(last.x - x, last.y - y) < radius * 0.35) return;
      const dabs = [...(m.brushPoints ?? []), { x, y, r: radius }].slice(-MAX_BRUSH_DABS);
      next = { ...m, brushPoints: dabs };
    } else {
      return;
    }
    setState((prev) => ({ ...prev, masks: prev.masks.map((mm) => (mm.id === m.id ? next : mm)) }));
  };

  const handleMaskPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!canEditMaskOnPhoto) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    maskDragRef.current = true;
    applyMaskPointer(e, true);
  };
  const handleMaskPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (maskDragRef.current) applyMaskPointer(e, false);
  };
  const handleMaskPointerUp = () => {
    if (!maskDragRef.current) return;
    maskDragRef.current = false;
    pushState(stateRef.current);
  };

  const handleToggleCropEditing = () => {
    setIsCropEditing((v) => {
      if (!v) {
        setCompareMode('after-only');
        setZoomLevel(1.0);
      }
      return !v;
    });
    setDraftCrop(null);
  };

  // Split-Slider Pointer handlers
  const handleSplitPointerDown = (e: React.PointerEvent) => {
    isDraggingSplitRef.current = true;
    updateSplitPosition(e.clientX, e.clientY);
  };

  const updateSplitPosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (compareMode === 'split-horizontal') {
      const y = clientY - rect.top;
      const pct = Math.max(5, Math.min(95, (y / rect.height) * 100));
      setSplitPos(pct);
    } else {
      const x = clientX - rect.left;
      const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
      setSplitPos(pct);
    }
  }, [compareMode]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingSplitRef.current) return;
      updateSplitPosition(e.clientX, e.clientY);
    };
    const handlePointerUp = () => {
      isDraggingSplitRef.current = false;
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [updateSplitPosition]);

  // Zoom Handler
  const handleToggleZoom = () => {
    setZoomLevel((prev) => (prev === 1.0 ? 1.5 : prev === 1.5 ? 2.0 : 1.0));
  };

  // Auto tone calculation (intelligent histogram expansion)
  const handleAutoTone = () => {
    cameraAudio.playFocusLock();
    pushState({
      ...state,
      light: {
        ...state.light,
        exposure: 0.35,
        contrast: 15,
        highlights: -25,
        shadows: 30,
        whites: 15,
        blacks: -10,
      },
      color: {
        ...state.color,
        vibrance: 15,
      },
      detail: {
        ...state.detail,
        sharpening: Math.max(state.detail.sharpening, 40),
      },
    });
  };

  // Save to in-app gallery & native Android MediaStore
  const handleSaveToGallery = () => {
    if (!photo || !sourceImageRef.current) return;
    const highRes = StudioEngine.exportHighRes(sourceImageRef.current, state, 'image/jpeg', 0.95);
    onSaveEdited(photo.id, highRes);
    cameraAudio.playShutter();

    const fileName = `CINEGRID_EDIT_${Date.now()}.jpg`;
    saveToDevice(highRes, fileName, 'image/jpeg')
      .then(() => console.log('Saved edited photo to device gallery'))
      .catch((err) => console.warn('Save to device failed:', err));

    onClose();
  };

  // Export full-res image download
  const handleExportDownload = (format: 'image/jpeg' | 'image/png') => {
    if (!sourceImageRef.current) return;
    cameraAudio.playShutter();
    const highRes = StudioEngine.exportHighRes(sourceImageRef.current, state, format, 0.98);
    saveToDevice(highRes, `cinegrid_studio_edit_${Date.now()}.${format === 'image/jpeg' ? 'jpg' : 'png'}`).catch((err) => console.warn('Save to device failed:', err));
  };

  // Real share sheet with the edited picture
  const handleShare = async () => {
    if (!sourceImageRef.current) return;
    try {
      const highRes = StudioEngine.exportHighRes(sourceImageRef.current, state, 'image/jpeg', 0.92);
      await shareImage(highRes, `CINEGRID_${Date.now()}.jpg`);
    } catch (err) {
      // user dismissing the sheet is not an error worth showing
      if (!/cancel|abort|dismiss/i.test(String((err as Error)?.message ?? err))) console.warn('Share failed:', err);
    }
  };

  if (!isOpen || !photo) return null;

  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6" role="alert">
        <div className="max-w-sm text-center text-white">
          <p className="text-sm mb-4">{loadError}</p>
          <button type="button" onClick={onClose} className="min-h-[44px] px-6 rounded-xl bg-amber-400 text-black font-bold text-sm">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none animate-fadeIn overflow-hidden">
      {/* 1. Studio Top Navigation Bar (Lightroom Mobile Style) */}
      <StudioTopBar
        photo={photo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        compareMode={compareMode}
        onChangeCompareMode={setCompareMode}
        isHoldingOriginal={isHoldingOriginal}
        onHoldOriginalStart={() => setIsHoldingOriginal(true)}
        onHoldOriginalEnd={() => setIsHoldingOriginal(false)}
        zoomLevel={zoomLevel}
        onToggleZoom={handleToggleZoom}
        onResetAll={handleResetAll}
        onSaveToGallery={handleSaveToGallery}
        onExportDownload={handleExportDownload}
        onShare={handleShare}
        onClose={onClose}
      />

      {/* 2. Main Studio Body: Canvas Center + Sidebar Right */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Central Photo Preview Canvas Container */}
        <div
          ref={containerRef}
          className="flex-1 relative bg-[#090a0d] flex items-center justify-center overflow-hidden p-2 sm:p-6"
        >
          {/* Zoom Wrapper */}
          <div
            className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Case A: Press-and-Hold Original or Normal Single View */}
            {compareMode === 'after-only' && (
              <div
                className={`relative shadow-2xl rounded-lg overflow-hidden border border-white/10 ${canEditMaskOnPhoto ? 'touch-none cursor-crosshair' : ''}`}
                onPointerDown={handleMaskPointerDown}
                onPointerMove={handleMaskPointerMove}
                onPointerUp={handleMaskPointerUp}
                onPointerCancel={handleMaskPointerUp}
              >
                {isCropEditing && (
                  <CropOverlay
                    rect={draftCrop ?? state.geometry.cropRect}
                    imageAspect={imageAspect}
                    lock={ratioValue(state.geometry.cropRatio, imageAspect)}
                    onChange={setDraftCrop}
                    onCommit={(rect) => {
                      setDraftCrop(null);
                      handleChangeState({ geometry: { ...state.geometry, cropRect: rect } });
                    }}
                  />
                )}
                {/* Edited Canvas */}
                <canvas
                  ref={editedCanvasRef}
                  className={`max-w-full max-h-[78vh] object-contain block ${
                    isHoldingOriginal ? 'hidden' : 'block'
                  }`}
                />
                {/* Original Canvas (shown only when holding "HOLD ORIG") */}
                <canvas
                  ref={originalCanvasRef}
                  className={`max-w-full max-h-[78vh] object-contain ${
                    isHoldingOriginal ? 'block' : 'hidden'
                  }`}
                />
                {isHoldingOriginal && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/80 backdrop-blur-sm border border-amber-400 text-amber-400 font-mono text-[10px] font-bold">
                    ORIGINAL RAW
                  </div>
                )}
              </div>
            )}

            {/* Case B: Draggable Vertical Split Slider */}
            {compareMode === 'split-vertical' && (
              <div className="relative shadow-2xl rounded-lg overflow-hidden border border-white/10 touch-none">
                {/* AFTER image (base full canvas) */}
                <canvas
                  ref={editedCanvasRef}
                  className="max-w-full max-h-[78vh] object-contain block"
                />

                {/* BEFORE image (clipped to left split percentage) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                >
                  <canvas ref={originalCanvasRef} className="block w-full h-full" />
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/20 text-white font-mono text-[10px] font-bold">
                    BEFORE
                  </div>
                </div>

                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-amber-400 text-amber-300 font-mono text-[10px] font-bold pointer-events-none">
                  AFTER
                </div>

                {/* Draggable Vertical Divider Bar with < > Handle */}
                <div
                  onPointerDown={handleSplitPointerDown}
                  className="absolute top-0 bottom-0 w-8 -ml-4 flex items-center justify-center cursor-ew-resize group z-30"
                  style={{ left: `${splitPos}%` }}
                >
                  <div className="w-0.5 h-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
                  <div className="absolute w-7 h-7 rounded-full bg-black/90 border-2 border-white shadow-xl flex items-center justify-center text-[10px] font-mono font-bold text-white group-hover:scale-110 active:scale-95 transition-all">
                    ↔
                  </div>
                </div>
              </div>
            )}

            {/* Case C: Draggable Horizontal Split Slider */}
            {compareMode === 'split-horizontal' && (
              <div className="relative shadow-2xl rounded-lg overflow-hidden border border-white/10 touch-none">
                <canvas
                  ref={editedCanvasRef}
                  className="max-w-full max-h-[78vh] object-contain block"
                />

                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ clipPath: `inset(0 0 ${100 - splitPos}% 0)` }}
                >
                  <canvas ref={originalCanvasRef} className="block w-full h-full" />
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/20 text-white font-mono text-[10px] font-bold">
                    BEFORE
                  </div>
                </div>

                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-amber-400 text-amber-300 font-mono text-[10px] font-bold pointer-events-none">
                  AFTER
                </div>

                {/* Draggable Horizontal Divider */}
                <div
                  onPointerDown={handleSplitPointerDown}
                  className="absolute left-0 right-0 h-8 -mt-4 flex items-center justify-center cursor-ns-resize group z-30"
                  style={{ top: `${splitPos}%` }}
                >
                  <div className="h-0.5 w-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
                  <div className="absolute w-7 h-7 rounded-full bg-black/90 border-2 border-white shadow-xl flex items-center justify-center text-[10px] font-mono font-bold text-white group-hover:scale-110 active:scale-95 transition-all">
                    ↕
                  </div>
                </div>
              </div>
            )}

            {/* Case D: Side-by-Side Mode */}
            {compareMode === 'side-by-side' && (
              <div className="flex items-center gap-3 max-w-full max-h-[78vh]">
                <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-xl">
                  <canvas
                    ref={originalCanvasRef}
                    className="max-w-[44vw] max-h-[74vh] object-contain block"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-white font-mono text-[10px] font-bold">
                    BEFORE (RAW)
                  </div>
                </div>

                <div className="relative rounded-lg overflow-hidden border border-amber-400/40 shadow-xl">
                  <canvas
                    ref={editedCanvasRef}
                    className="max-w-[44vw] max-h-[74vh] object-contain block"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-400 text-black font-mono text-[10px] font-bold">
                    AFTER (EDITED)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Professional Editing Tools Sidebar / Bottom Panel */}
        <StudioSidebar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          state={state}
          onChangeState={handleChangeState}
          onResetLight={() =>
            handleChangeState({
              light: DEFAULT_STUDIO_STATE.light,
              curves: DEFAULT_STUDIO_STATE.curves,
            })
          }
          onResetColor={() =>
            handleChangeState({
              color: DEFAULT_STUDIO_STATE.color,
              hsl: DEFAULT_STUDIO_STATE.hsl,
              colorGrading: DEFAULT_STUDIO_STATE.colorGrading,
            })
          }
          onResetEffects={() => handleChangeState({ effects: DEFAULT_STUDIO_STATE.effects })}
          onResetDetailOptics={() =>
            handleChangeState({
              detail: DEFAULT_STUDIO_STATE.detail,
              optics: DEFAULT_STUDIO_STATE.optics,
            })
          }
          onResetGeometry={() => handleChangeState({ geometry: DEFAULT_STUDIO_STATE.geometry })}
          onResetPreset={handleResetPreset}
          onChangePresetIntensity={handleChangePresetIntensity}
          onApplyPreset={handleApplyPreset}
          onSaveCustomPreset={handleSaveCustomPreset}
          customPresets={customPresets}
          onImportPresets={handleImportPresets}
          onAddMask={handleAddMask}
          onUpdateMask={handleUpdateMask}
          onDeleteMask={handleDeleteMask}
          showMaskOverlay={showMaskOverlay}
          onToggleMaskOverlay={() => setShowMaskOverlay(!showMaskOverlay)}
          imageAspect={imageAspect}
          isCropEditing={isCropEditing}
          onToggleCropEditing={handleToggleCropEditing}
          onAutoTone={handleAutoTone}
          onResetAll={handleResetAll}
        />
      </div>
    </div>
  );
};
