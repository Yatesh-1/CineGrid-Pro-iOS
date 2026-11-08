import React from 'react';
import { Clapperboard, Image as ImageIcon, HardDrive, Mic, Activity, Sliders } from 'lucide-react';
import type { CinemaVideoConfig } from '../../types/cinemaVideo';
import type { ZoomMagnificationType } from '../../types/hardware';
import type { ProSettingsTab } from '../ProSettingsDrawer';
import { ZoomStrip } from '../ZoomStrip';
import { VIDEO_MAX_ZOOM } from '../../utils/zoomSlider';

interface CinemaVideoHUDProps {
  config: CinemaVideoConfig;
  onUpdateConfig: (partial: Partial<CinemaVideoConfig>) => void;
  onToggleDrawer: () => void;
  onOpenSlateModal: () => void;
  /** Every readout opens the Pro panel on the matching tab; nothing else carries exposure controls. */
  onOpenProTab: (tab: ProSettingsTab) => void;
  onSelectLensZoom: (zoomFactor: number) => void;
  currentZoom: number;
  onToggleRecord: () => void;
  onOpenGallery: () => void;
  timecode: string;
  storageEstimate: { freeGb: number; remainingMinutes: number };
  audioLevels: { leftDb: number; rightDb: number; peakClipping: boolean };
  /** Opens the pro settings drawer straight from the video screen. */
  onOpenPro?: () => void;
  /** iPhone-style mode carousel, rendered between the tools and the record button. */
  modeSelector?: React.ReactNode;
  minZoom?: number;
  maxZoom?: number;
  zoomType?: ZoomMagnificationType;
  focalLengthMm?: number;
  /** What the recorder will really deliver on this phone (overrides the slate's wish-list values). */
  delivered?: { resolution: string; fps: number; codec: string };
}

const formatEstTime = (mins: number) => {
  if (mins >= 60) return `EST ${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `EST ${mins}m`;
};

const chip = 'flex-shrink-0 h-8 flex items-center gap-1.5 text-xs font-semibold transition-colors';

/**
 * Video controls live below the viewfinder, never on it: a sliding tools row, the zoom strip,
 * the mode carousel and the record dock. Exposure, colour, focus and audio settings live in Pro.
 * Every readout in the tools row is a button that opens its own panel.
 */
export const CinemaVideoHUD: React.FC<CinemaVideoHUDProps> = ({
  config,
  onUpdateConfig: _onUpdateConfig,
  onToggleDrawer,
  onOpenSlateModal,
  onOpenProTab,
  onSelectLensZoom,
  currentZoom,
  onToggleRecord,
  onOpenGallery,
  timecode,
  storageEstimate,
  audioLevels,
  onOpenPro,
  modeSelector,
  minZoom = 0.5,
  maxZoom = VIDEO_MAX_ZOOM,
  zoomType,
  focalLengthMm,
  delivered,
}) => {
  const activeCount = config.activeScopes.size;
  const meterWidth = Math.max(0, Math.min(100, (audioLevels.leftDb + 60) * (100 / 60)));

  return (
    <div className="w-full flex flex-col gap-1 pt-1.5 pb-2 select-none font-mono" data-testid="video-panel">
      {/* TOOLS: one sliding row */}
      <div role="toolbar" aria-label="Video tools" className="px-4 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex min-w-full w-max items-center justify-between gap-4">
        <button onClick={onOpenSlateModal} className={`${chip} text-white`} title="Configure Format & Slate">
          <span className="uppercase">{delivered ? delivered.resolution : config.resolution}</span>
          <span className="text-zinc-600">·</span>
          <span>{delivered ? delivered.fps : config.fps} FPS</span>
          <span className="text-zinc-600">·</span>
          <span className="text-amber-300 uppercase">{delivered ? delivered.codec : config.codec}</span>
        </button>
        <button onClick={() => onOpenProTab('exposure')} className={`${chip} text-zinc-100`} title="Shutter angle: open Pro exposure settings">
          {config.shutterAngle}° ({config.calculatedShutterSpeed}s)
        </button>
        <button onClick={() => onOpenProTab('exposure')} className={`${chip} text-zinc-100`} title="ISO: open Pro exposure settings">
          ISO {config.iso}
        </button>
        <button onClick={() => onOpenProTab('color')} className={`${chip} text-zinc-100`} title="White balance: open Pro colour settings">
          {config.whiteBalanceKelvin}K
        </button>
        {config.colorProfile === 'flat_log' && (
          <button onClick={() => onOpenProTab('color')} className={`${chip} text-zinc-100`} title="Log profile: open Pro colour settings">
            LOG
          </button>
        )}
        <button onClick={() => onOpenProTab('focus')} className={`${chip} text-zinc-100`} title="Focus: open Pro focus settings">
          {config.focusMode === 'manual' ? 'MF' : 'AF'}
        </button>
        <span className={`${chip} text-zinc-300 cursor-default`} title={`${storageEstimate.freeGb} GB Free`}>
          <HardDrive className="w-3.5 h-3.5" aria-hidden="true" />
          {formatEstTime(storageEstimate.remainingMinutes)}
        </span>
        <button onClick={() => onOpenProTab('recording')} className={`${chip} text-zinc-300`} title="Live audio levels: open Pro recording settings">
          <Mic className={`w-3.5 h-3.5 ${audioLevels.peakClipping ? 'text-red-500 animate-pulse' : ''}`} aria-hidden="true" />
          <span className="w-9 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
            <span
              className={`h-full ${audioLevels.leftDb > -3 ? 'bg-red-500' : audioLevels.leftDb > -12 ? 'bg-amber-400' : 'bg-emerald-500'}`}
              style={{ width: `${meterWidth}%` }}
            />
          </span>
        </button>
        {onOpenPro && (
          <button onClick={onOpenPro} className={`${chip} text-zinc-100`} title="Open Pro Settings" aria-label="Open Pro Settings">
            <Sliders size={14} aria-hidden="true" />
            PRO
          </button>
        )}
        <button
          onClick={onToggleDrawer}
          className={`${chip} ${activeCount > 0 ? 'text-emerald-400' : 'text-zinc-300'}`}
          title="Open 8 Monitoring Scopes Drawer"
        >
          <Activity size={14} aria-hidden="true" />
          <span>SCOPES</span>
          {activeCount > 0 && <span className="text-[10px]">{activeCount}</span>}
        </button>
        </div>
      </div>

      <ZoomStrip zoom={currentZoom} min={minZoom} max={maxZoom} onChange={onSelectLensZoom} zoomType={zoomType} focalLengthMm={focalLengthMm} />

      {modeSelector}

      <div className="flex items-center justify-between w-full px-8">
        <button
          onClick={onOpenSlateModal}
          className="w-10 h-10 rounded-full bg-zinc-900 text-zinc-300 hover:text-white flex items-center justify-center active:scale-95 transition-colors"
          title="Digital Production Slate"
          aria-label="Digital Production Slate"
        >
          <Clapperboard className="w-[18px] h-[18px]" aria-hidden="true" />
        </button>

        <div className="flex flex-col items-center">
          <button
            onClick={onToggleRecord}
            className={`w-16 h-16 rounded-full flex items-center justify-center border-[3px] transition-colors active:scale-95 ${
              config.isRecording ? 'border-red-500' : 'border-white'
            }`}
            title={config.isRecording ? 'Stop Cinema Recording' : 'Start Cinema Recording'}
            aria-label={config.isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            <span
              className={`block bg-red-600 transition-all duration-200 ${config.isRecording ? 'w-6 h-6 rounded-md' : 'w-12 h-12 rounded-full'}`}
            />
          </button>
          <span className={`mt-0.5 text-xs font-bold ${config.isRecording ? 'text-red-400' : 'text-zinc-400'}`}>{timecode}</span>
        </div>

        <button
          onClick={onOpenGallery}
          className="w-10 h-10 rounded-full bg-zinc-900 text-zinc-300 hover:text-white flex items-center justify-center active:scale-95 transition-colors"
          title="Media Gallery"
          aria-label="Media Gallery"
        >
          <ImageIcon className="w-[18px] h-[18px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
