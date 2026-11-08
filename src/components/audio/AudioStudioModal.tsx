// CineGrid Pro — Audio Studio Modal & Intelligent Noise DSP Interface
// Real-time stereo VU meter, noise reduction presets, microphone picker, test recording, and bypass switch.

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Wind,
  Volume2,
  Play,
  Headphones,
  X,
  Sparkles,
} from 'lucide-react';
import {
  audioIntelligenceService,
  type AudioIntelligenceMeter,
} from '../../services/audioIntelligenceService';
import type { AudioNoiseMode, AvailableAudioDevice, AudioIntelligenceConfig } from '../../types/camera';

interface AudioStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioStudioModal: React.FC<AudioStudioModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AudioIntelligenceConfig>(audioIntelligenceService.getConfig());
  const [mics, setMics] = useState<AvailableAudioDevice[]>([]);
  const [hasExternalMic, setHasExternalMic] = useState(false);
  const [meter, setMeter] = useState<AudioIntelligenceMeter>({
    rmsDb: -60,
    peakDb: -60,
    isClipping: false,
    noiseFloorEstimateDb: -55,
  });

  const [isTestRecording, setIsTestRecording] = useState(false);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Meter polling ticker at 30 FPS
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    const poll = () => {
      setMeter(audioIntelligenceService.getLiveMeter());
      animId = requestAnimationFrame(poll);
    };
    animId = requestAnimationFrame(poll);

    return () => cancelAnimationFrame(animId);
  }, [isOpen]);

  // Load available microphones
  useEffect(() => {
    if (!isOpen) return;

    audioIntelligenceService.enumerateMicrophones().then((res) => {
      setMics(res.inputs);
      setHasExternalMic(res.hasExternalMic);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleModeChange = (mode: AudioNoiseMode) => {
    const updated = { ...config, mode, bypassDsp: mode === 'off' };
    setConfig(updated);
    audioIntelligenceService.setConfig(updated);
  };

  const handleIntensityChange = (val: number) => {
    const updated = { ...config, noiseReductionIntensity: val };
    setConfig(updated);
    audioIntelligenceService.setConfig(updated);
  };

  const handleMicChange = async (deviceId: string) => {
    const updated = { ...config, selectedInputId: deviceId };
    setConfig(updated);
    audioIntelligenceService.setConfig(updated);
    await audioIntelligenceService.initializeMicrophone(deviceId);
  };

  const handleToggleWind = () => {
    const updated = { ...config, windReduction: !config.windReduction };
    setConfig(updated);
    audioIntelligenceService.setConfig(updated);
  };

  const handleToggleVoice = () => {
    const updated = { ...config, voiceEnhancement: !config.voiceEnhancement };
    setConfig(updated);
    audioIntelligenceService.setConfig(updated);
  };

  const handleToggleMonitoring = () => {
    const updated = { ...config, monitoringEnabled: !config.monitoringEnabled };
    setConfig(updated);
    audioIntelligenceService.setConfig(updated);
  };

  const handleToggleBypass = () => {
    const updated = { ...config, bypassDsp: !config.bypassDsp };
    setConfig(updated);
    audioIntelligenceService.setConfig(updated);
  };

  const handleStartTestRecord = async () => {
    setIsTestRecording(true);
    try {
      await audioIntelligenceService.startTestRecording();
      setTestAudioUrl(audioIntelligenceService.getTestAudioUrl());
    } catch (err) {
      console.warn('Audio test record error:', err);
    } finally {
      setIsTestRecording(false);
    }
  };

  const handlePlayTest = () => {
    if (!testAudioUrl) return;
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(testAudioUrl);
      audioPlayerRef.current.onended = () => setIsPlayingTest(false);
    } else {
      audioPlayerRef.current.src = testAudioUrl;
    }
    setIsPlayingTest(true);
    audioPlayerRef.current.play().catch(() => setIsPlayingTest(false));
  };

  const modesList: { id: AudioNoiseMode; label: string; desc: string; icon: string }[] = [
    { id: 'auto', label: 'Adaptive Auto', desc: 'Continuous environmental noise floor tracking', icon: '✨' },
    { id: 'standard', label: 'Standard', desc: 'Mild stationary noise reduction', icon: '🛡️' },
    { id: 'strong', label: 'Strong', desc: 'Heavy HVAC, fan, and air-conditioning suppression', icon: '⚡' },
    { id: 'wind_reduction', label: 'Wind Filter', desc: 'Low-frequency rumble cutoff (130Hz)', icon: '🍃' },
    { id: 'voice_focus', label: 'Voice Focus', desc: '2.5 kHz speech formant enhancement', icon: '🗣️' },
    { id: 'off', label: 'Raw Mic (Off)', desc: 'Unprocessed direct microphone signal', icon: '🎙️' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg bg-[#0e1117] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto safe-area-container">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
              <Mic size={18} />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-white tracking-wide">AUDIO STUDIO</h2>
              <p className="text-[10px] font-mono text-zinc-400">Intelligent Noise DSP & Voice Enhancement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        {/* Real-Time Audio Level & Clipping Meter */}
        <div className="mt-4 p-3 rounded-2xl bg-zinc-950/80 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">INPUT SIGNAL</span>
            <span className={`font-bold ${meter.isClipping ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
              {meter.isClipping ? 'CLIPPING PEAK (>0 dB)' : `${Math.round(meter.rmsDb)} dB`}
            </span>
          </div>

          {/* Level Bar */}
          <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden flex relative">
            <div
              className={`h-full transition-all duration-75 rounded-full ${
                meter.rmsDb > -6 ? 'bg-rose-500' : meter.rmsDb > -18 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, ((meter.rmsDb + 60) / 60) * 100))}%` }}
            />
            {/* 0 dB marker */}
            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-rose-600" />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>-60 dB</span>
            <span>-24 dB</span>
            <span>-12 dB</span>
            <span>-6 dB</span>
            <span>0 dB</span>
          </div>
        </div>

        {/* Microphone Device Picker */}
        <div className="mt-4">
          <label className="text-[11px] font-mono font-bold text-zinc-400 block mb-1.5">
            MICROPHONE SOURCE {hasExternalMic && <span className="text-amber-400 ml-1">● EXTERNAL CONNECTED</span>}
          </label>
          <select
            value={config.selectedInputId}
            onChange={(e) => handleMicChange(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
          >
            {mics.map((m) => (
              <option key={m.deviceId} value={m.deviceId}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Noise Reduction Mode Grid */}
        <div className="mt-4">
          <label className="text-[11px] font-mono font-bold text-zinc-400 block mb-1.5">
            PROCESSING PRESETS
          </label>
          <div className="grid grid-cols-2 gap-2">
            {modesList.map((m) => {
              const isSelected = config.mode === m.id && !config.bypassDsp;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-amber-400/10 border-amber-400 text-white shadow-md shadow-amber-400/10'
                      : 'bg-zinc-900/60 border-white/5 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{m.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Noise Reduction Intensity Slider */}
        {config.mode !== 'off' && !config.bypassDsp && (
          <div className="mt-4 p-3 rounded-2xl bg-zinc-900/40 border border-white/5">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span className="text-zinc-300">SUPPRESSION INTENSITY</span>
              <span className="text-amber-400 font-bold">{config.noiseReductionIntensity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={config.noiseReductionIntensity}
              onChange={(e) => handleIntensityChange(Number(e.target.value))}
              className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* Specific Toggles: Wind, Voice, Headphone Monitor, Raw Bypass */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={handleToggleWind}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
              config.windReduction
                ? 'bg-sky-500/15 border-sky-400/60 text-sky-300'
                : 'bg-zinc-900 border-white/5 text-zinc-400'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Wind size={14} />
              <span>Wind Filter</span>
            </div>
            <span className="text-[10px] font-bold">{config.windReduction ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleToggleVoice}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
              config.voiceEnhancement
                ? 'bg-amber-500/15 border-amber-400/60 text-amber-300'
                : 'bg-zinc-900 border-white/5 text-zinc-400'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>Voice Focus</span>
            </div>
            <span className="text-[10px] font-bold">{config.voiceEnhancement ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleToggleMonitoring}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
              config.monitoringEnabled
                ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300'
                : 'bg-zinc-900 border-white/5 text-zinc-400'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Headphones size={14} />
              <span>Monitoring</span>
            </div>
            <span className="text-[10px] font-bold">{config.monitoringEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleToggleBypass}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
              config.bypassDsp
                ? 'bg-rose-500/15 border-rose-400/60 text-rose-300'
                : 'bg-zinc-900 border-white/5 text-zinc-400'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Volume2 size={14} />
              <span>Bypass DSP</span>
            </div>
            <span className="text-[10px] font-bold">{config.bypassDsp ? 'ACTIVE' : 'OFF'}</span>
          </button>
        </div>

        {/* Test Audio Recording Preview */}
        <div className="mt-4 p-3 rounded-2xl bg-zinc-950 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-white">Audio Test Recording</div>
            <div className="text-[10px] font-mono text-zinc-400">Record 3s clip to verify voice clarity</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartTestRecord}
              disabled={isTestRecording}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all ${
                isTestRecording
                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                  : 'bg-zinc-800 text-zinc-200 border-white/10 hover:bg-zinc-700'
              }`}
            >
              <Mic size={13} />
              <span>{isTestRecording ? 'Recording (3s)...' : 'Test Clip'}</span>
            </button>

            {testAudioUrl && (
              <button
                onClick={handlePlayTest}
                disabled={isPlayingTest}
                className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-mono text-xs font-bold flex items-center gap-1 active:scale-95 shadow-md shadow-amber-400/20"
              >
                <Play size={12} fill="black" />
                <span>{isPlayingTest ? 'Playing...' : 'Play'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
