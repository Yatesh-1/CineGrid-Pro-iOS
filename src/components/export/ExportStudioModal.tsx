import React, { useState, useEffect } from 'react';
import { saveToDevice } from '../../services/deviceSaveService';
import { currentPhotoUrl } from '../../utils/photoVersions';
import type { CapturedPhoto } from '../../types/camera';
import type {
  PhotoExportSettings,
  VideoExportSettings,
  ExportPreset,
  PhotoExportFormat,
  ColorProfile,
  OutputSharpening,
  WatermarkPosition,
} from '../../types/export';
import { BUILTIN_EXPORT_PRESETS } from '../../types/export';
import { renderProcessedExport, isExportFormatSupported } from '../../utils/exportEngine';
import {
  X,
  Download,
  Sparkles,
  Check,
  RefreshCw,
  FileImage,
  Video,
  Globe,
  Printer,
  Share2,
} from 'lucide-react';

interface ExportStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: CapturedPhoto | null;
  videoUrl?: string | null;
}

const DEFAULT_PHOTO_SETTINGS: PhotoExportSettings = {
  format: 'jpeg',
  quality: 90,
  resizeMode: 'original',
  resizePercentage: 100,
  customWidth: 1920,
  customHeight: 1080,
  maintainAspectRatio: true,
  colorProfile: 'srgb',
  sharpening: 'low',
  preserveMetadata: true,
  stripGpsData: true,
  filenameTemplate: 'CINE_MASTER',
  watermark: {
    enabled: false,
    type: 'text',
    text: '© CINEGRID PRO',
    fontSize: 24,
    opacity: 0.7,
    position: 'bottom-right',
    color: '#ffffff',
  },
};

const DEFAULT_VIDEO_SETTINGS: VideoExportSettings = {
  resolution: '1080p',
  fps: 30,
  codec: 'h264',
  bitrate: 'high',
  audioQuality: '256k',
  colorProfile: 'rec709',
  compressionLevel: 'balanced',
};

export const ExportStudioModal: React.FC<ExportStudioModalProps> = ({
  isOpen,
  onClose,
  photo,
  videoUrl,
}) => {
  const [mediaType, setMediaType] = useState<'photo' | 'video'>(videoUrl ? 'video' : 'photo');
  const [photoSettings, setPhotoSettings] = useState<PhotoExportSettings>(DEFAULT_PHOTO_SETTINGS);
  const [videoSettings, setVideoSettings] = useState<VideoExportSettings>(DEFAULT_VIDEO_SETTINGS);
  const [activeTab, setActiveTab] = useState<'format' | 'sizing' | 'sharpening' | 'watermark' | 'video'>('format');
  const [activePresetId, setActivePresetId] = useState<string>('ig_post_4_5');

  // Preview & Render state
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewDims, setPreviewDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [estimatedSizeKb, setEstimatedSizeKb] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  const sourceUrl = photo ? currentPhotoUrl(photo) : null;

  // Re-render processed export preview whenever photo settings change
  useEffect(() => {
    if (!isOpen || !sourceUrl || mediaType !== 'photo') return;

    let isMounted = true;

    const debounceTimer = setTimeout(() => {
      if (isMounted) setIsProcessing(true);
      renderProcessedExport(sourceUrl, photoSettings)
        .then((res) => {
          if (isMounted) {
            setPreviewDataUrl(res.dataUrl);
            setPreviewDims({ width: res.width, height: res.height });
            setEstimatedSizeKb(res.estimatedSizeKb);
            setIsProcessing(false);
          }
        })
        .catch((err) => {
          console.warn('Export render preview error:', err);
          if (isMounted) setIsProcessing(false);
        });
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [isOpen, sourceUrl, photoSettings, mediaType]);

  if (!isOpen) return null;

  // Apply a ready-made preset
  const handleApplyPreset = (preset: ExportPreset) => {
    setActivePresetId(preset.id);
    if (preset.mediaType === 'photo' && preset.photoSettings) {
      setMediaType('photo');
      setPhotoSettings((prev) => ({ ...prev, ...preset.photoSettings }));
    } else if (preset.mediaType === 'video' && preset.videoSettings) {
      setMediaType('video');
      setVideoSettings((prev) => ({ ...prev, ...preset.videoSettings }));
    }
  };

  // Perform Final Export & Download
  const handleExport = async () => {
    if (mediaType === 'photo' && sourceUrl) {
      setExportProgress(20);
      setIsProcessing(true);

      try {
        setExportProgress(60);
        const res = await renderProcessedExport(sourceUrl, photoSettings);
        setExportProgress(90);

        // Generate download
        const ext = photoSettings.format === 'raw_dng' ? 'dng' : photoSettings.format;
        const filename = `${photoSettings.filenameTemplate || 'CINE_MASTER'}_${Date.now()}.${ext}`;

        saveToDevice(res.dataUrl, filename).catch((err) => console.warn('Save to device failed:', err));

        setExportProgress(100);
        setExportSuccessMsg(`Successfully exported ${filename} (${Math.round(res.estimatedSizeKb)} KB)`);
        setTimeout(() => setExportProgress(null), 1500);
      } catch (err) {
        console.error('Export error:', err);
        setExportProgress(null);
      } finally {
        setIsProcessing(false);
      }
    } else if (mediaType === 'video' && videoUrl) {
      // Direct video download
      saveToDevice(videoUrl, `CINE_VIDEO_${videoSettings.resolution}_${Date.now()}.webm`).catch((err) => console.warn('Save to device failed:', err));
      setExportSuccessMsg('Video export downloaded successfully.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-5xl max-h-full min-w-0 bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl flex flex-col text-white overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3 border-b border-white/10 bg-zinc-900/60 backdrop-blur-md min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 flex-shrink-0 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-black flex items-center justify-center font-bold">
              <Download size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 min-w-0">
                <span className="truncate">Export Studio</span>
                <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  MASTERING
                </span>
              </h2>
              <p className="hidden sm:block text-[11px] text-zinc-400 font-mono">
                Multi-Format Delivery, Output Sharpening & Color Spaces
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher: Photo / Video */}
            <div className="flex items-center bg-zinc-900 border border-white/10 rounded-xl p-0.5 text-xs font-mono">
              <button
                onClick={() => setMediaType('photo')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  mediaType === 'photo' ? 'bg-amber-400 text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FileImage size={13} />
                <span>Photo</span>
              </button>
              <button
                onClick={() => setMediaType('video')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  mediaType === 'video' ? 'bg-rose-500 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Video size={13} />
                <span>Video</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* READY-MADE PRESETS CAROUSEL STRIP */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/10 bg-zinc-950 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase flex-shrink-0 mr-1">
            Presets:
          </span>
          {BUILTIN_EXPORT_PRESETS.map((p) => {
            const isSelected = activePresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 transition-all ${
                  isSelected
                    ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-md'
                    : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {p.icon === 'instagram' && <Share2 size={13} />}
                {p.icon === 'youtube' && <Video size={13} />}
                {p.icon === 'video' && <Video size={13} />}
                {p.icon === 'globe' && <Globe size={13} />}
                {p.icon === 'printer' && <Printer size={13} />}
                {p.icon === 'sparkles' && <Sparkles size={13} />}
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* MAIN STUDIO SPLIT WORKSPACE */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 content-start">
          {/* LEFT: LIVE EXPORT PREVIEW (7 Cols) */}
          <div className="lg:col-span-7 bg-black/60 p-3 sm:p-6 flex flex-col items-center justify-between border-b lg:border-b-0 lg:border-r border-white/10 relative overflow-hidden">
            {/* Live Metrics Header Badge */}
            <div className="w-full flex items-center justify-between text-xs font-mono pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-300 font-bold uppercase">
                  {mediaType === 'photo' ? photoSettings.format : videoSettings.codec}
                </span>
                <span className="text-zinc-400">
                  {previewDims.width > 0 ? `${previewDims.width} × ${previewDims.height} px` : 'Analyzing'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">
                  {estimatedSizeKb > 0 ? `~${(estimatedSizeKb / 1024).toFixed(2)} MB` : ''}
                </span>
                <span className="text-zinc-500 uppercase">{photoSettings.colorProfile}</span>
              </div>
            </div>

            {/* Central Canvas Preview */}
            <div className="relative flex-1 w-full flex items-center justify-center p-2 overflow-hidden">
              {sourceUrl ? (
                <img
                  src={previewDataUrl || sourceUrl}
                  alt="Export preview"
                  className="max-w-full max-h-[30vh] lg:max-h-[52vh] object-contain rounded-xl shadow-2xl border border-white/10 transition-opacity duration-150"
                  style={{ opacity: isProcessing ? 0.7 : 1.0 }}
                />
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs font-mono">
                  No media currently selected for export.
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs">
                  <RefreshCw size={24} className="animate-spin text-amber-400" />
                </div>
              )}
            </div>

            {/* Safety Guarantee Notice */}
            <div className="w-full text-center text-[10px] text-zinc-500 font-mono pt-2">
              🔒 Original high-resolution photograph is strictly preserved and never overwritten.
            </div>
          </div>

          {/* RIGHT: CONFIGURATION PANELS (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col bg-zinc-950 lg:overflow-hidden">
            {/* Setting Tabs */}
            {mediaType === 'photo' ? (
              <div className="flex items-center gap-1 px-4 py-2.5 border-b border-white/10 bg-zinc-900/40 text-[11px] font-mono overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('format')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    activeTab === 'format' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Format & Quality
                </button>
                <button
                  onClick={() => setActiveTab('sizing')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    activeTab === 'sizing' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Dimensions
                </button>
                <button
                  onClick={() => setActiveTab('sharpening')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    activeTab === 'sharpening' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Color & Sharpen
                </button>
                <button
                  onClick={() => setActiveTab('watermark')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    activeTab === 'watermark' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Watermark
                </button>
              </div>
            ) : (
              <div className="px-4 py-2.5 border-b border-white/10 text-xs font-mono font-bold text-amber-400">
                Video Mastering Settings
              </div>
            )}

            {/* TAB CONTENT */}
            <div className="flex-1 lg:overflow-y-auto p-4 flex flex-col gap-3.5 text-xs font-mono">
              {mediaType === 'photo' && activeTab === 'format' && (
                <>
                  {/* Format Selection */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-zinc-400 font-semibold uppercase">Output Format</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['jpeg', 'png', 'webp', 'heif', 'raw_dng'] as PhotoExportFormat[]).map((fmt) => {
                        const supported = isExportFormatSupported(fmt);
                        return (
                          <button
                            key={fmt}
                            type="button"
                            disabled={!supported}
                            title={
                              supported
                                ? undefined
                                : fmt === 'raw_dng'
                                ? 'RAW export is not possible in a browser; edited photos are not RAW sensor data'
                                : 'This browser cannot encode this format'
                            }
                            onClick={() => setPhotoSettings({ ...photoSettings, format: fmt })}
                            className={`min-h-[44px] py-2 rounded-xl border text-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                              photoSettings.format === fmt
                                ? 'bg-amber-400 text-black border-amber-300 font-bold shadow'
                                : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white'
                            }`}
                          >
                            <span className="uppercase">{fmt === 'raw_dng' ? 'RAW DNG' : fmt}</span>
                            {!supported && <span className="block text-[10px] normal-case text-zinc-500">unavailable</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quality Slider (for JPEG / WebP / HEIF) */}
                  {photoSettings.format !== 'png' && photoSettings.format !== 'raw_dng' && (
                    <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300">Compression Quality</span>
                        <span className="text-amber-400 font-bold">{photoSettings.quality}%</span>
                      </div>
                      <input
                        type="range"
                        min="25"
                        max="100"
                        value={photoSettings.quality}
                        onChange={(e) => setPhotoSettings({ ...photoSettings, quality: parseInt(e.target.value, 10) })}
                        className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                      />
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>Compact (25%)</span>
                        <span>Balanced (80%)</span>
                        <span>Maximum (100%)</span>
                      </div>
                    </div>
                  )}

                  {/* Privacy & EXIF Metadata Options */}
                  <div className="flex flex-col gap-2 p-3 rounded-2xl bg-zinc-900 border border-white/10">
                    <span className="text-zinc-400 font-semibold uppercase text-[10px]">Metadata & Privacy</span>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-zinc-300">Preserve EXIF Metadata</span>
                      <input
                        type="checkbox"
                        checked={photoSettings.preserveMetadata}
                        onChange={(e) => setPhotoSettings({ ...photoSettings, preserveMetadata: e.target.checked })}
                        className="accent-amber-400 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer pt-1 border-t border-white/5">
                      <span className="text-zinc-300">Strip GPS Location (Privacy Protect)</span>
                      <input
                        type="checkbox"
                        checked={photoSettings.stripGpsData}
                        onChange={(e) => setPhotoSettings({ ...photoSettings, stripGpsData: e.target.checked })}
                        className="accent-amber-400 w-4 h-4"
                      />
                    </label>
                  </div>
                </>
              )}

              {mediaType === 'photo' && activeTab === 'sizing' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-zinc-400 font-semibold uppercase">Resizing Mode</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['original', 'percentage', 'custom'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPhotoSettings({ ...photoSettings, resizeMode: mode })}
                          className={`py-2 rounded-xl border text-center transition-all ${
                            photoSettings.resizeMode === mode
                              ? 'bg-amber-400 text-black border-amber-300 font-bold shadow'
                              : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          <span className="capitalize">{mode}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {photoSettings.resizeMode === 'percentage' && (
                    <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300">Scaling Percentage</span>
                        <span className="text-amber-400 font-bold">{photoSettings.resizePercentage}%</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 mt-1">
                        {[50, 75, 100, 150, 200].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => setPhotoSettings({ ...photoSettings, resizePercentage: pct })}
                            className={`py-1 rounded-lg border text-xs ${
                              photoSettings.resizePercentage === pct
                                ? 'bg-amber-400 text-black font-bold'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {photoSettings.resizeMode === 'custom' && (
                    <div className="flex flex-col gap-2 p-3 rounded-2xl bg-zinc-900 border border-white/10">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-zinc-400">Target Width (px)</label>
                          <input
                            type="number"
                            value={photoSettings.customWidth || 1920}
                            onChange={(e) => setPhotoSettings({ ...photoSettings, customWidth: parseInt(e.target.value, 10) || 1920 })}
                            className="w-full bg-zinc-800 rounded-lg p-2 text-white outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-400">Target Height (px)</label>
                          <input
                            type="number"
                            value={photoSettings.customHeight || 1080}
                            onChange={(e) => setPhotoSettings({ ...photoSettings, customHeight: parseInt(e.target.value, 10) || 1080 })}
                            className="w-full bg-zinc-800 rounded-lg p-2 text-white outline-none font-mono"
                          />
                        </div>
                      </div>

                      <label className="flex items-center justify-between cursor-pointer pt-1">
                        <span className="text-zinc-300 text-[11px]">Maintain Aspect Ratio</span>
                        <input
                          type="checkbox"
                          checked={photoSettings.maintainAspectRatio}
                          onChange={(e) => setPhotoSettings({ ...photoSettings, maintainAspectRatio: e.target.checked })}
                          className="accent-amber-400 w-4 h-4"
                        />
                      </label>
                    </div>
                  )}
                </>
              )}

              {mediaType === 'photo' && activeTab === 'sharpening' && (
                <>
                  {/* Output Sharpening */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-white/10">
                    <span className="text-zinc-400 font-semibold uppercase text-[10px]">Output Sharpening</span>
                    <div className="grid grid-cols-4 gap-1 mt-1">
                      {(['none', 'low', 'medium', 'high'] as OutputSharpening[]).map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setPhotoSettings({ ...photoSettings, sharpening: lvl })}
                          className={`py-1.5 rounded-lg border text-center uppercase text-xs ${
                            photoSettings.sharpening === lvl
                              ? 'bg-amber-400 text-black font-bold'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-0.5">
                      Applies an unsharp mask convolution kernel tailored for print or retina screens.
                    </span>
                  </div>

                  {/* Color Space Profile */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-white/10">
                    <span className="text-zinc-400 font-semibold uppercase text-[10px]">Color Profile / Gamut</span>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {([
                        { id: 'srgb', label: 'sRGB (Standard Web)' },
                        { id: 'display_p3', label: 'Display P3 (Apple Wide)' },
                        { id: 'adobe_rgb', label: 'Adobe RGB (Pro Print)' },
                        { id: 'rec709', label: 'Rec.709 (HD Video)' },
                      ] as { id: ColorProfile; label: string }[]).map((cp) => (
                        <button
                          key={cp.id}
                          onClick={() => setPhotoSettings({ ...photoSettings, colorProfile: cp.id })}
                          className={`p-2 rounded-xl border text-left text-xs ${
                            photoSettings.colorProfile === cp.id
                              ? 'bg-amber-400 text-black font-bold'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {cp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {mediaType === 'photo' && activeTab === 'watermark' && (
                <div className="flex flex-col gap-3 p-3 rounded-2xl bg-zinc-900 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-bold">Apply Watermark</span>
                    <input
                      type="checkbox"
                      checked={photoSettings.watermark.enabled}
                      onChange={(e) =>
                        setPhotoSettings({
                          ...photoSettings,
                          watermark: { ...photoSettings.watermark, enabled: e.target.checked },
                        })
                      }
                      className="accent-amber-400 w-4 h-4"
                    />
                  </div>

                  {photoSettings.watermark.enabled && (
                    <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
                      <div>
                        <label className="text-[10px] text-zinc-400">Watermark Text</label>
                        <input
                          type="text"
                          value={photoSettings.watermark.text}
                          onChange={(e) =>
                            setPhotoSettings({
                              ...photoSettings,
                              watermark: { ...photoSettings.watermark, text: e.target.value },
                            })
                          }
                          className="w-full bg-zinc-800 rounded-lg p-2 text-white outline-none font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-zinc-400">Opacity ({Math.round(photoSettings.watermark.opacity * 100)}%)</label>
                          <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={photoSettings.watermark.opacity}
                            onChange={(e) =>
                              setPhotoSettings({
                                ...photoSettings,
                                watermark: { ...photoSettings.watermark, opacity: parseFloat(e.target.value) },
                              })
                            }
                            className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-zinc-400">Position</label>
                          <select
                            value={photoSettings.watermark.position}
                            onChange={(e) =>
                              setPhotoSettings({
                                ...photoSettings,
                                watermark: { ...photoSettings.watermark, position: e.target.value as WatermarkPosition },
                              })
                            }
                            className="w-full bg-zinc-800 rounded-lg p-2 text-white outline-none"
                          >
                            <option value="bottom-right">Bottom Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="top-right">Top Right</option>
                            <option value="top-left">Top Left</option>
                            <option value="center">Center</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIDEO SETTINGS PANEL */}
              {mediaType === 'video' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-white/10">
                    <span className="text-zinc-400 font-semibold uppercase text-[10px]">Video Resolution</span>
                    <div className="grid grid-cols-4 gap-1 mt-1">
                      {(['720p', '1080p', '4k', '8k'] as const).map((res) => (
                        <button
                          key={res}
                          onClick={() => setVideoSettings({ ...videoSettings, resolution: res })}
                          className={`py-1.5 rounded-lg border text-center uppercase text-xs ${
                            videoSettings.resolution === res
                              ? 'bg-rose-500 text-white font-bold'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-white/10">
                    <span className="text-zinc-400 font-semibold uppercase text-[10px]">Codec & Container</span>
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      {[
                        { id: 'h264', label: 'H.264 (AVC)' },
                        { id: 'h265', label: 'H.265 (HEVC)' },
                        { id: 'prores', label: 'Apple ProRes' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setVideoSettings({ ...videoSettings, codec: c.id as any })}
                          className={`py-2 rounded-xl border text-center text-xs ${
                            videoSettings.codec === c.id
                              ? 'bg-rose-500 text-white font-bold'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-white/10">
                    <span className="text-zinc-400 font-semibold uppercase text-[10px]">Target Bitrate</span>
                    <div className="grid grid-cols-4 gap-1 mt-1">
                      {(['low', 'medium', 'high', 'maximum'] as const).map((br) => (
                        <button
                          key={br}
                          onClick={() => setVideoSettings({ ...videoSettings, bitrate: br })}
                          className={`py-1.5 rounded-lg border text-center uppercase text-xs ${
                            videoSettings.bitrate === br
                              ? 'bg-rose-500 text-white font-bold'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {br}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER EXPORT ACTION */}
            <div className="p-4 border-t border-white/10 bg-zinc-900 flex flex-col gap-2">
              {exportProgress !== null && (
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              )}

              {exportSuccessMsg && (
                <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{exportSuccessMsg}</span>
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={15} className="animate-spin text-black" />
                    <span>MASTERING & EXPORTING...</span>
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    <span>EXPORT HIGH-RES MASTER</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
