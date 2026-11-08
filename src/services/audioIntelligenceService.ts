// CineGrid Pro — Advanced Audio Intelligence DSP Engine
// Real-time modular Web Audio DSP: Wind filter, HVAC notch, Voice focus formant shaping,
// Dynamics compressor, and MediaStream destination for synchronized video recording.

import { resourceManager } from './resourceManager';
import type { AudioIntelligenceConfig, AvailableAudioDevice } from '../types/camera';

export interface AudioIntelligenceMeter {
  rmsDb: number;        // -60 dB to 0 dB
  peakDb: number;       // -60 dB to 0 dB
  isClipping: boolean;
  noiseFloorEstimateDb: number;
}

export class AudioIntelligenceService {
  private static instance: AudioIntelligenceService;

  private audioCtx: AudioContext | null = null;
  private rawMicStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private highpassNode: BiquadFilterNode | null = null;
  private notchHumNode: BiquadFilterNode | null = null;
  private voicePeakingNode: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;
  private monitorGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  private analyserDataArray: Uint8Array | null = null;
  private noiseFloorRms = 0.01;

  private config: AudioIntelligenceConfig = {
    mode: 'auto',
    noiseReductionIntensity: 75,
    windReduction: true,
    voiceEnhancement: true,
    monitoringEnabled: false,
    bypassDsp: false,
    selectedInputId: 'default',
  };

  private testRecorder: MediaRecorder | null = null;
  private testAudioChunks: Blob[] = [];
  private testAudioUrl: string | null = null;

  public static getInstance(): AudioIntelligenceService {
    if (!AudioIntelligenceService.instance) {
      AudioIntelligenceService.instance = new AudioIntelligenceService();
    }
    return AudioIntelligenceService.instance;
  }

  public getConfig(): AudioIntelligenceConfig {
    return { ...this.config };
  }

  public setConfig(patch: Partial<AudioIntelligenceConfig>): void {
    this.config = { ...this.config, ...patch };
    this.applyDspParameters();
  }

  /**
   * Initialize or switch microphone with hardware constraints + DSP chain
   */
  public async initializeMicrophone(deviceId?: string): Promise<MediaStreamAudioDestinationNode | null> {
    this.cleanupNodes();

    if (deviceId) {
      this.config.selectedInputId = deviceId;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) {
        console.warn('[AudioIntelligence] Web Audio API is not supported on this device.');
        return null;
      }

      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume().catch(() => {});
      }

      // Request microphone stream with native constraints
      const audioConstraints: MediaTrackConstraints = {
        deviceId: this.config.selectedInputId !== 'default' ? { exact: this.config.selectedInputId } : undefined,
        echoCancellation: true,
        noiseSuppression: this.config.mode !== 'off',
        autoGainControl: true,
      };

      this.rawMicStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      // Register raw mic stream with ResourceManager
      resourceManager.register(
        'audio_intel_raw_mic',
        'stream',
        'audio_intelligence',
        this.rawMicStream,
        () => {
          this.rawMicStream?.getTracks().forEach((t) => t.stop());
        }
      );

      // 1. Microphone Source
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.rawMicStream);

      // 2. Highpass Filter (Wind reduction & low-frequency HVAC rumble)
      this.highpassNode = this.audioCtx.createBiquadFilter();
      this.highpassNode.type = 'highpass';

      // 3. Notch Filter (50Hz / 60Hz AC electrical hum)
      this.notchHumNode = this.audioCtx.createBiquadFilter();
      this.notchHumNode.type = 'notch';
      this.notchHumNode.frequency.value = 60;
      this.notchHumNode.Q.value = 4.0;

      // 4. Voice Peaking Filter (human speech formant boost 2.5 kHz)
      this.voicePeakingNode = this.audioCtx.createBiquadFilter();
      this.voicePeakingNode.type = 'peaking';
      this.voicePeakingNode.frequency.value = 2500;
      this.voicePeakingNode.Q.value = 1.4;

      // 5. Dynamics Compressor (prevents audio clipping & balances loud/quiet speech)
      this.compressorNode = this.audioCtx.createDynamicsCompressor();
      this.compressorNode.threshold.value = -20;
      this.compressorNode.knee.value = 24;
      this.compressorNode.ratio.value = 4;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.25;

      // 6. Master Volume / Output Gain
      this.masterGainNode = this.audioCtx.createGain();

      // 7. Headphone / Monitoring Gain Node
      this.monitorGainNode = this.audioCtx.createGain();
      this.monitorGainNode.gain.value = this.config.monitoringEnabled ? 1.0 : 0.0;
      this.monitorGainNode.connect(this.audioCtx.destination);

      // 8. Live Meter Analyser
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.3;
      this.analyserDataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

      // 9. Output Destination for video recording synchronization
      this.destinationNode = this.audioCtx.createMediaStreamDestination();

      this.reconnectChain();
      this.applyDspParameters();

      return this.destinationNode;
    } catch (err) {
      console.warn('[AudioIntelligence] Failed to initialize microphone chain:', err);
      return null;
    }
  }

  /**
   * Reconnects the audio graph based on bypass vs active DSP filtering
   */
  private reconnectChain(): void {
    if (!this.sourceNode || !this.destinationNode || !this.masterGainNode || !this.analyserNode) {
      return;
    }

    try {
      this.sourceNode.disconnect();
      this.highpassNode?.disconnect();
      this.notchHumNode?.disconnect();
      this.voicePeakingNode?.disconnect();
      this.compressorNode?.disconnect();
      this.masterGainNode.disconnect();

      if (this.config.bypassDsp || this.config.mode === 'off') {
        // Direct Raw Bypass Route
        this.sourceNode.connect(this.masterGainNode);
      } else {
        // Full DSP Pipeline: Mic -> Highpass -> Notch -> Voice Peaking -> Compressor -> Master
        let current: AudioNode = this.sourceNode;

        if (this.highpassNode) {
          current.connect(this.highpassNode);
          current = this.highpassNode;
        }
        if (this.notchHumNode) {
          current.connect(this.notchHumNode);
          current = this.notchHumNode;
        }
        if (this.voicePeakingNode) {
          current.connect(this.voicePeakingNode);
          current = this.voicePeakingNode;
        }
        if (this.compressorNode) {
          current.connect(this.compressorNode);
          current = this.compressorNode;
        }
        current.connect(this.masterGainNode);
      }

      // Route Master to both recording destination, analyzer, and optional headphone monitor
      this.masterGainNode.connect(this.destinationNode);
      this.masterGainNode.connect(this.analyserNode);

      if (this.monitorGainNode) {
        this.masterGainNode.connect(this.monitorGainNode);
      }
    } catch (err) {
      console.warn('[AudioIntelligence] Error reconnecting chain:', err);
    }
  }

  /**
   * Applies filter cutoffs, gains, and compression based on active noise mode
   */
  private applyDspParameters(): void {
    if (!this.audioCtx) return;

    const intensity = this.config.noiseReductionIntensity / 100;

    // Monitoring
    if (this.monitorGainNode) {
      this.monitorGainNode.gain.setValueAtTime(
        this.config.monitoringEnabled ? 1.0 : 0.0,
        this.audioCtx.currentTime
      );
    }

    if (this.config.bypassDsp || this.config.mode === 'off') {
      this.reconnectChain();
      return;
    }

    // Highpass (Wind & rumble)
    if (this.highpassNode) {
      let cutoff = 20;
      if (this.config.windReduction || this.config.mode === 'wind_reduction') {
        cutoff = 130 + intensity * 60; // 130Hz to 190Hz
      } else if (this.config.mode === 'strong') {
        cutoff = 110;
      } else if (this.config.mode === 'standard' || this.config.mode === 'auto') {
        cutoff = 80;
      } else if (this.config.mode === 'voice_focus') {
        cutoff = 140;
      }
      this.highpassNode.frequency.setValueAtTime(cutoff, this.audioCtx.currentTime);
      this.highpassNode.Q.setValueAtTime(0.707, this.audioCtx.currentTime);
    }

    // Voice Peaking (Speech formant enhancement)
    if (this.voicePeakingNode) {
      let boostDb = 0;
      if (this.config.voiceEnhancement || this.config.mode === 'voice_focus') {
        boostDb = 3.5 + intensity * 2.5; // +3.5 to +6 dB at 2.5 kHz
      } else if (this.config.mode === 'standard' || this.config.mode === 'auto') {
        boostDb = 1.5;
      }
      this.voicePeakingNode.gain.setValueAtTime(boostDb, this.audioCtx.currentTime);
    }

    // Compressor (Dynamic range smoothing)
    if (this.compressorNode) {
      if (this.config.mode === 'strong') {
        this.compressorNode.threshold.setValueAtTime(-28, this.audioCtx.currentTime);
        this.compressorNode.ratio.setValueAtTime(6, this.audioCtx.currentTime);
      } else {
        this.compressorNode.threshold.setValueAtTime(-20, this.audioCtx.currentTime);
        this.compressorNode.ratio.setValueAtTime(3.5, this.audioCtx.currentTime);
      }
    }

    this.reconnectChain();
  }

  /**
   * Live real-time audio meter readout in decibels (-60 dB to 0 dB)
   */
  public getLiveMeter(): AudioIntelligenceMeter {
    if (!this.analyserNode || !this.analyserDataArray) {
      return { rmsDb: -60, peakDb: -60, isClipping: false, noiseFloorEstimateDb: -55 };
    }

    this.analyserNode.getByteTimeDomainData(this.analyserDataArray as Uint8Array<ArrayBuffer>);
    let sumSquares = 0;
    let peak = 0;
    const len = this.analyserDataArray.length;

    for (let i = 0; i < len; i++) {
      const norm = (this.analyserDataArray[i] - 128) / 128;
      const absVal = Math.abs(norm);
      if (absVal > peak) peak = absVal;
      sumSquares += norm * norm;
    }

    const rms = Math.sqrt(sumSquares / len);

    // Track ambient noise floor dynamically
    if (rms > 0.001 && rms < this.noiseFloorRms) {
      this.noiseFloorRms = this.noiseFloorRms * 0.95 + rms * 0.05;
    } else if (rms > 0.001) {
      this.noiseFloorRms = this.noiseFloorRms * 0.999 + rms * 0.001;
    }

    let rmsDb = 20 * Math.log10(Math.max(0.001, rms));
    rmsDb = Math.max(-60, Math.min(0, rmsDb));

    let peakDb = 20 * Math.log10(Math.max(0.001, peak));
    peakDb = Math.max(-60, Math.min(0, peakDb));

    let noiseDb = 20 * Math.log10(Math.max(0.001, this.noiseFloorRms));
    noiseDb = Math.max(-60, Math.min(0, noiseDb));

    return {
      rmsDb,
      peakDb,
      isClipping: peak > 0.96,
      noiseFloorEstimateDb: noiseDb,
    };
  }

  /**
   * Get the processed destination MediaStream for recording
   */
  public getProcessedAudioStream(): MediaStream | null {
    if (this.destinationNode) {
      return this.destinationNode.stream;
    }
    return this.rawMicStream;
  }

  /**
   * Enumerate available microphones with categorization (external vs built-in)
   */
  public async enumerateMicrophones(): Promise<{
    inputs: AvailableAudioDevice[];
    hasExternalMic: boolean;
  }> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return {
        inputs: [{ deviceId: 'default', label: 'Default Microphone' }],
        hasExternalMic: false,
      };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      let hasExternal = false;

      const inputs = audioInputs.map((d, index) => {
        const label = d.label || `Microphone ${index + 1}`;
        const lower = label.toLowerCase();
        const isExternal =
          lower.includes('bluetooth') ||
          lower.includes('usb') ||
          lower.includes('headset') ||
          lower.includes('airpods') ||
          lower.includes('wireless') ||
          lower.includes('rode') ||
          lower.includes('dji');

        if (isExternal) hasExternal = true;

        return {
          deviceId: d.deviceId,
          label: isExternal ? `🎙️ ${label} (External)` : label,
        };
      });

      return {
        inputs: inputs.length > 0 ? inputs : [{ deviceId: 'default', label: 'Built-in Microphone' }],
        hasExternalMic: hasExternal,
      };
    } catch {
      return {
        inputs: [{ deviceId: 'default', label: 'Built-in Microphone' }],
        hasExternalMic: false,
      };
    }
  }

  /**
   * Record a 3-second test clip to preview noise cancellation clarity
   */
  public startTestRecording(): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = this.getProcessedAudioStream();
      if (!stream || typeof MediaRecorder === 'undefined') {
        reject(new Error('Audio stream unavailable for testing.'));
        return;
      }

      this.testAudioChunks = [];
      try {
        this.testRecorder = new MediaRecorder(stream);
        this.testRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.testAudioChunks.push(e.data);
          }
        };
        this.testRecorder.onstop = () => {
          const blob = new Blob(this.testAudioChunks, { type: 'audio/webm' });
          if (this.testAudioUrl) {
            resourceManager.revokeManagedObjectURL(this.testAudioUrl);
          }
          this.testAudioUrl = resourceManager.createManagedObjectURL(blob, 'audio_test');
          resolve();
        };

        this.testRecorder.start();
        setTimeout(() => {
          if (this.testRecorder && this.testRecorder.state === 'recording') {
            this.testRecorder.stop();
          }
        }, 3000);
      } catch (err) {
        reject(err);
      }
    });
  }

  public getTestAudioUrl(): string | null {
    return this.testAudioUrl;
  }

  /**
   * Release audio resources and listeners
   */
  public cleanupNodes(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    if (this.highpassNode) {
      try {
        this.highpassNode.disconnect();
      } catch {}
      this.highpassNode = null;
    }
    if (this.notchHumNode) {
      try {
        this.notchHumNode.disconnect();
      } catch {}
      this.notchHumNode = null;
    }
    if (this.voicePeakingNode) {
      try {
        this.voicePeakingNode.disconnect();
      } catch {}
      this.voicePeakingNode = null;
    }
    if (this.compressorNode) {
      try {
        this.compressorNode.disconnect();
      } catch {}
      this.compressorNode = null;
    }
    if (this.masterGainNode) {
      try {
        this.masterGainNode.disconnect();
      } catch {}
      this.masterGainNode = null;
    }
    if (this.monitorGainNode) {
      try {
        this.monitorGainNode.disconnect();
      } catch {}
      this.monitorGainNode = null;
    }
    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch {}
      this.analyserNode = null;
    }
    if (this.rawMicStream) {
      this.rawMicStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      this.rawMicStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close().catch(() => {});
      } catch {}
      this.audioCtx = null;
    }
    this.destinationNode = null;
    this.analyserDataArray = null;

    if (this.testAudioUrl) {
      resourceManager.revokeManagedObjectURL(this.testAudioUrl);
      this.testAudioUrl = null;
    }
  }
}

export const audioIntelligenceService = AudioIntelligenceService.getInstance();
