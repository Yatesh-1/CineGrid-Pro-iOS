import React, { useState } from 'react';
import {
  X,
  Clapperboard,
  Film,
  Clock,
  Check,
} from 'lucide-react';
import type {
  CinemaVideoConfig,
  CinemaResolution,
  CinemaFps,
  CinemaCodec,
  CinemaBitrate,
  AnamorphicDeSqueezeRatio,
} from '../../types/cinemaVideo';

interface ProductionSlateModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CinemaVideoConfig;
  onUpdateConfig: (partial: Partial<CinemaVideoConfig>) => void;
  /** Only formats this phone's camera and recorder can really deliver are offered. */
  availableResolutions: CinemaResolution[];
  availableFps: number[];
  availableCodecs: CinemaCodec[];
  /** What a recording will actually be, measured from the live camera (e.g. "1080p · 30 FPS · H.264"). */
  deliveredLabel: string;
}

export const ProductionSlateModal: React.FC<ProductionSlateModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  availableResolutions,
  availableFps,
  availableCodecs,
  deliveredLabel,
}) => {
  const [activeTab, setActiveTab] = useState<'slate' | 'format'>('slate');
  const [isClapping, setIsClapping] = useState(false);

  if (!isOpen) return null;

  const handleClap = () => {
    setIsClapping(true);
    // Beep / click audio tone using Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {}

    setTimeout(() => setIsClapping(false), 250);
  };

  const resolutions = (
    [
      { res: '4k', label: '4K UHD', desc: '3840 × 2160' },
      { res: '1080p', label: '1080p Full HD', desc: '1920 × 1080' },
      { res: '720p', label: '720p HD', desc: '1280 × 720' },
    ] as { res: CinemaResolution; label: string; desc: string }[]
  ).filter((r) => availableResolutions.includes(r.res));

  const frameRates = availableFps as CinemaFps[];

  const codecs = (
    [
      { codec: 'hevc', label: 'HEVC / H.265', note: 'Smaller files, newer players' },
      { codec: 'h264', label: 'H.264', note: 'Plays everywhere' },
      { codec: 'vp9', label: 'VP9 (WebM)', note: 'Open format' },
    ] as { codec: CinemaCodec; label: string; note: string }[]
  ).filter((c) => availableCodecs.includes(c.codec));

  const bitrates: { rate: CinemaBitrate; label: string; mbps: string }[] = [
    { rate: 'low', label: 'Economy', mbps: '~10 Mbps' },
    { rate: 'medium', label: 'Standard', mbps: '~25 Mbps' },
    { rate: 'high', label: 'Cinema HQ', mbps: '~50 Mbps' },
    { rate: 'maximum', label: 'Master Quality', mbps: '~100 Mbps' },
  ];

  const anamorphicRatios: { ratio: AnamorphicDeSqueezeRatio; label: string }[] = [
    { ratio: 1.0, label: '1.0x (Spherical)' },
    { ratio: 1.33, label: '1.33x (Anamorphic)' },
    { ratio: 1.5, label: '1.5x (Anamorphic)' },
    { ratio: 1.8, label: '1.8x (Anamorphic)' },
    { ratio: 2.0, label: '2.0x (CinemaScope)' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Digital Cinema Slate and Format Setup"
    >
      <div className="w-full max-w-lg bg-[#0d1117] border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Animated Clapper Sticks Header */}
        <div
          onClick={handleClap}
          className="cursor-pointer relative overflow-hidden bg-neutral-900 border-b border-neutral-800 p-3 select-none flex items-center justify-between"
          title="Click to clap slate!"
        >
          {/* Black & White Chevrons */}
          <div
            className={`flex items-center gap-2 transition-transform duration-150 origin-bottom-left ${
              isClapping ? '-rotate-6 scale-95' : 'rotate-0'
            }`}
          >
            <div className="w-10 h-7 bg-white text-black font-black text-xs flex items-center justify-center font-mono rounded border border-neutral-300">
              CLAP
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                {config.productionSlate.roll} · SCENE {config.productionSlate.scene} · TAKE {config.productionSlate.take}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono">
                {config.productionSlate.clipName}
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
            aria-label="Close Slate Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-neutral-800 bg-neutral-900/50">
          <button
            onClick={() => setActiveTab('slate')}
            className={`flex-1 py-2.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'slate'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" /> Production Slate
          </button>
          <button
            onClick={() => setActiveTab('format')}
            className={`flex-1 py-2.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'format'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" /> Recording Format
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* 1. SLATE TAB */}
          {activeTab === 'slate' && (
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                    ROLL / REEL
                  </label>
                  <input
                    type="text"
                    value={config.productionSlate.roll}
                    onChange={(e) =>
                      onUpdateConfig({
                        productionSlate: { ...config.productionSlate, roll: e.target.value },
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                    SCENE
                  </label>
                  <input
                    type="text"
                    value={config.productionSlate.scene}
                    onChange={(e) =>
                      onUpdateConfig({
                        productionSlate: { ...config.productionSlate, scene: e.target.value },
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                    TAKE
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        onUpdateConfig({
                          productionSlate: {
                            ...config.productionSlate,
                            take: Math.max(1, config.productionSlate.take - 1),
                          },
                        })
                      }
                      className="px-2 py-1 bg-neutral-800 text-neutral-300 rounded font-mono font-bold hover:bg-neutral-700"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-mono font-bold text-emerald-400">
                      {config.productionSlate.take}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateConfig({
                          productionSlate: {
                            ...config.productionSlate,
                            take: config.productionSlate.take + 1,
                          },
                        })
                      }
                      className="px-2 py-1 bg-neutral-800 text-neutral-300 rounded font-mono font-bold hover:bg-neutral-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Shot Type */}
              <div>
                <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                  SHOT FRAMING TYPE
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    ['wide', 'medium', 'close_up', 'extreme_close_up', 'establishing'] as const
                  ).map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        onUpdateConfig({
                          productionSlate: { ...config.productionSlate, shotType: type },
                        })
                      }
                      className={`py-1 px-1.5 rounded-lg text-[11px] font-mono capitalize transition-all ${
                        config.productionSlate.shotType === type
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      {type.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Director & DP */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                    DIRECTOR
                  </label>
                  <input
                    type="text"
                    value={config.productionSlate.director}
                    onChange={(e) =>
                      onUpdateConfig({
                        productionSlate: { ...config.productionSlate, director: e.target.value },
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                    CINEMATOGRAPHER (DP)
                  </label>
                  <input
                    type="text"
                    value={config.productionSlate.cinematographer}
                    onChange={(e) =>
                      onUpdateConfig({
                        productionSlate: {
                          ...config.productionSlate,
                          cinematographer: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                  />
                </div>
              </div>

              {/* Rolling Pre-Record Buffer */}
              <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-white text-xs font-bold">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PRE-RECORD ROLLING BUFFER</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {([0, 3, 5] as const).map((sec) => (
                      <button
                        key={sec}
                        onClick={() => onUpdateConfig({ preRecordSeconds: sec })}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          config.preRecordSeconds === sec
                            ? 'bg-emerald-500 text-black'
                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {sec === 0 ? 'OFF' : `${sec}s`}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400 leading-tight">
                  Continuously buffers video chunks so recording captures the 3 to 5 seconds before pressing Record.
                </p>
              </div>
            </div>
          )}

          {/* 2. FORMAT TAB */}
          {activeTab === 'format' && (
            <div className="space-y-4 text-xs">
              {/* Resolution */}
              <div>
                <label className="block text-[10px] font-mono text-neutral-400 mb-1.5">
                  RECORDING RESOLUTION
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {resolutions.map((r) => (
                    <button
                      key={r.res}
                      onClick={() => onUpdateConfig({ resolution: r.res })}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        config.resolution === r.res
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-850'
                      }`}
                    >
                      <div className="font-mono">{r.label}</div>
                      <div className="text-[10px] text-neutral-400">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Rate */}
              <div>
                <label className="block text-[10px] font-mono text-neutral-400 mb-1.5">
                  FRAME RATE (FPS)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {frameRates.map((fps) => (
                    <button
                      key={fps}
                      onClick={() => onUpdateConfig({ fps })}
                      className={`py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                        config.fps === fps
                          ? 'bg-emerald-500 text-black'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>

              {/* Codec */}
              <div>
                <label className="block text-[10px] font-mono text-neutral-400 mb-1.5">
                  RECORDING CODEC
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {codecs.map((c) => (
                    <button
                      key={c.codec}
                      onClick={() => onUpdateConfig({ codec: c.codec })}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        config.codec === c.codec
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-850'
                      }`}
                    >
                      <div className="font-mono font-bold text-xs">{c.label}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">{c.note}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bitrate */}
              <div>
                <label className="block text-[10px] font-mono text-neutral-400 mb-1.5">
                  ENCODING BITRATE
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {bitrates.map((b) => (
                    <button
                      key={b.rate}
                      onClick={() => onUpdateConfig({ bitrate: b.rate })}
                      className={`py-1.5 px-1 rounded-lg text-center font-mono transition-all ${
                        config.bitrate === b.rate
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      <div className="text-[11px]">{b.label}</div>
                      <div className="text-[10px] opacity-80">{b.mbps}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Anamorphic De-Squeeze */}
              <div>
                <label className="block text-[10px] font-mono text-neutral-400 mb-1.5">
                  ANAMORPHIC DE-SQUEEZE (PREVIEW ONLY)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {anamorphicRatios.map((a) => (
                    <button
                      key={a.ratio}
                      onClick={() => onUpdateConfig({ anamorphicDeSqueeze: a.ratio })}
                      className={`py-1.5 px-1 rounded-lg font-mono text-[11px] font-bold transition-all text-center ${
                        config.anamorphicDeSqueeze === a.ratio
                          ? 'bg-emerald-500 text-black'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
          <div className="text-[11px] font-mono text-neutral-400">
            {deliveredLabel}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> DONE
          </button>
        </div>
      </div>
    </div>
  );
};
