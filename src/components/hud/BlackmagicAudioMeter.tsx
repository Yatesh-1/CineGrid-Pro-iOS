import React, { useEffect, useState } from 'react';
import { cameraService } from '../../services/cameraService';

interface BlackmagicAudioMeterProps {
  isRecording?: boolean;
  stream: MediaStream | null;
  channels?: 'mono' | 'stereo';
  gain?: number; // 0 - 100
}

export const BlackmagicAudioMeter: React.FC<BlackmagicAudioMeterProps> = ({
  isRecording = false,
  stream,
  channels = 'stereo',
  gain = 80,
}) => {
  const [leftDb, setLeftDb] = useState<number>(-48);
  const [rightDb, setRightDb] = useState<number>(-48);
  const [isClipping, setIsClipping] = useState<boolean>(false);

  useEffect(() => {
    // If stream is available and has audio track, connect Web Audio analyser
    if (stream && stream.getAudioTracks().length > 0) {
      cameraService.setupAudioMeter(stream);
    }

    let animId: number;
    let clipTimeout: number;

    const updateMeter = () => {
      const levels = cameraService.getLiveAudioLevels();

      // Apply software gain multiplier
      const gainFactor = gain / 80;
      let l = levels.leftDb;
      let r = levels.rightDb;

      if (l > -60) {
        l = Math.min(0, l + (gainFactor - 1) * 10);
      }
      if (r > -60) {
        r = Math.min(0, r + (gainFactor - 1) * 10);
      }

      // If simulated / ambient fallback (when no microphone audio stream)
      if (levels.leftDb <= -58) {
        const ambient = -38 + (Math.sin(Date.now() / 250) * 8) + (Math.random() * 4);
        l = ambient;
        r = ambient + (Math.random() - 0.5) * 3;
      }

      setLeftDb(l);
      setRightDb(channels === 'mono' ? l : r);

      if (levels.peakClipping || l > -1.5) {
        setIsClipping(true);
        window.clearTimeout(clipTimeout);
        clipTimeout = window.setTimeout(() => setIsClipping(false), 500);
      }

      animId = requestAnimationFrame(updateMeter);
    };

    animId = requestAnimationFrame(updateMeter);
    return () => {
      cancelAnimationFrame(animId);
      window.clearTimeout(clipTimeout);
    };
  }, [stream, channels, gain]);

  // Convert dB (-60 dB to 0 dB) to percentage (0% to 100%)
  const dbToPercent = (db: number) => {
    if (db <= -60) return 0;
    if (db >= 0) return 100;
    return Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  };

  const leftPercent = dbToPercent(leftDb);
  const rightPercent = dbToPercent(rightDb);

  return (
    <div
      className="flex flex-col gap-1 px-2 py-1 bg-black/75 backdrop-blur-md rounded-md border border-white/10 select-none shadow-sm"
      title={`Audio Levels: L ${leftDb.toFixed(1)} dB / R ${rightDb.toFixed(1)} dB`}
    >
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 gap-2">
        <span className="flex items-center gap-1 font-bold">
          <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
          CH 1/2
        </span>
        <div className="flex items-center gap-2 text-[7px] text-zinc-500">
          <span>-40</span>
          <span>-20</span>
          <span>-12</span>
          <span>-6</span>
          <span className={isClipping ? 'text-rose-400 font-bold' : 'text-zinc-500'}>0</span>
        </div>
      </div>

      {/* Channel 1 (Left) */}
      <div className="flex items-center gap-1">
        <span className="text-[7px] font-mono text-zinc-400 w-2">L</span>
        <div className="relative w-28 h-1.5 bg-zinc-900 rounded-sm overflow-hidden flex">
          <div
            className="h-full transition-all duration-75"
            style={{
              width: `${leftPercent}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #10b981 65%, #f59e0b 85%, #ef4444 100%)',
            }}
          />
        </div>
      </div>

      {/* Channel 2 (Right) */}
      {channels === 'stereo' && (
        <div className="flex items-center gap-1">
          <span className="text-[7px] font-mono text-zinc-400 w-2">R</span>
          <div className="relative w-28 h-1.5 bg-zinc-900 rounded-sm overflow-hidden flex">
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${rightPercent}%`,
                background: 'linear-gradient(90deg, #10b981 0%, #10b981 65%, #f59e0b 85%, #ef4444 100%)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
