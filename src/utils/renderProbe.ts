/**
 * Live render performance probe. Records what really happened (frame timestamps, time spent submitting each
 * frame to the GPU, capture latency) and reports `null` for anything the platform cannot expose, instead of
 * inventing numbers.
 *
 * "Render ms" is the CPU time to submit one frame to WebGL (texture upload + draw call). It is NOT GPU execution
 * time: WebGL calls are asynchronous. GPU time is only reportable when EXT_disjoint_timer_query exists, and this
 * probe only reports whether it is available.
 */
export type ContextStatus = 'ok' | 'lost' | 'none';

export interface ProbeSnapshot {
  /** Frames per second over the last ~2 s, from frame timestamps. null until enough frames. */
  fps: number | null;
  frames: number;
  avgRenderMs: number | null;
  maxRenderMs: number | null;
  /** Frames whose gap to the previous one was more than twice the recent median gap (and over 40 ms). */
  droppedFrames: number;
  /** Used JS heap in MB (Chromium-only API); null if the WebView does not expose it. */
  jsHeapMB: number | null;
  gpuTimerAvailable: boolean;
  contextStatus: ContextStatus;
  lastCaptureMs: number | null;
  avgCaptureMs: number | null;
  captures: number;
}

const WINDOW_MS = 2000;
const MAX_SAMPLES = 240;

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

export class RenderProbe {
  private stamps: number[] = [];
  private renderTimes: number[] = [];
  private dropped = 0;
  private frames = 0;
  private captureTimes: number[] = [];
  private status: ContextStatus = 'none';
  private gpuTimer = false;

  reset(): void {
    this.stamps = [];
    this.renderTimes = [];
    this.dropped = 0;
    this.frames = 0;
    this.captureTimes = [];
  }

  recordFrame(renderMs: number, nowMs: number): void {
    const prev = this.stamps[this.stamps.length - 1];
    if (prev !== undefined && this.stamps.length >= 5) {
      const gaps: number[] = [];
      for (let i = 1; i < this.stamps.length; i++) gaps.push(this.stamps[i] - this.stamps[i - 1]);
      const gap = nowMs - prev;
      if (gap > 40 && gap > 2 * median(gaps)) this.dropped++;
    }
    this.stamps.push(nowMs);
    this.renderTimes.push(renderMs);
    if (this.stamps.length > MAX_SAMPLES) this.stamps.shift();
    if (this.renderTimes.length > MAX_SAMPLES) this.renderTimes.shift();
    this.frames++;
  }

  recordCapture(ms: number): void {
    this.captureTimes.push(ms);
    if (this.captureTimes.length > 50) this.captureTimes.shift();
  }

  setContextStatus(s: ContextStatus): void {
    this.status = s;
  }

  setGpuTimerAvailable(v: boolean): void {
    this.gpuTimer = v;
  }

  snapshot(nowMs: number = typeof performance !== 'undefined' ? performance.now() : 0): ProbeSnapshot {
    const recent = this.stamps.filter((t) => nowMs - t <= WINDOW_MS);
    let fps: number | null = null;
    if (recent.length >= 5) {
      const span = recent[recent.length - 1] - recent[0];
      if (span > 0) fps = Math.round(((recent.length - 1) / span) * 10000) / 10;
    }
    const rt = this.renderTimes;
    const heap = (typeof performance !== 'undefined' && (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize) || null;
    const caps = this.captureTimes;
    const r1 = (n: number) => Math.round(n * 10) / 10;
    return {
      fps,
      frames: this.frames,
      avgRenderMs: rt.length ? r1(rt.reduce((a, b) => a + b, 0) / rt.length) : null,
      maxRenderMs: rt.length ? r1(Math.max(...rt)) : null,
      droppedFrames: this.dropped,
      jsHeapMB: heap ? r1(heap / 1048576) : null,
      gpuTimerAvailable: this.gpuTimer,
      contextStatus: this.status,
      lastCaptureMs: caps.length ? Math.round(caps[caps.length - 1]) : null,
      avgCaptureMs: caps.length ? Math.round(caps.reduce((a, b) => a + b, 0) / caps.length) : null,
      captures: caps.length,
    };
  }
}

export const renderProbe = new RenderProbe();

// Handy for on-device debugging over remote DevTools: window.__cgPerf.snapshot()
if (typeof window !== 'undefined') (window as unknown as { __cgPerf: RenderProbe }).__cgPerf = renderProbe;
