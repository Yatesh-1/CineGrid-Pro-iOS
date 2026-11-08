import { describe, it, expect } from 'vitest';
import { RenderProbe } from '../utils/renderProbe';

const feed = (p: RenderProbe, count: number, gapMs: number, start = 1000, renderMs = 2) => {
  let t = start;
  for (let i = 0; i < count; i++) {
    p.recordFrame(renderMs, t);
    t += gapMs;
  }
  return t - gapMs;
};

describe('RenderProbe', () => {
  it('reports null (not zero) before any data, and never invents GPU time', () => {
    const s = new RenderProbe().snapshot(0);
    expect(s.fps).toBeNull();
    expect(s.avgRenderMs).toBeNull();
    expect(s.lastCaptureMs).toBeNull();
    expect(s.gpuTimerAvailable).toBe(false);
    expect(s.contextStatus).toBe('none');
  });

  it('computes FPS from frame timestamps', () => {
    const p = new RenderProbe();
    const last = feed(p, 40, 1000 / 30); // 30 fps
    expect(p.snapshot(last).fps).toBeCloseTo(30, 0);
    const q = new RenderProbe();
    const lastQ = feed(q, 70, 1000 / 60); // 60 fps
    expect(q.snapshot(lastQ).fps).toBeCloseTo(60, 0);
  });

  it('ignores frames older than the 2 s window', () => {
    const p = new RenderProbe();
    feed(p, 40, 33);
    expect(p.snapshot(1000 + 40 * 33 + 5000).fps).toBeNull();
  });

  it('averages and maxes render time', () => {
    const p = new RenderProbe();
    p.recordFrame(2, 0);
    p.recordFrame(4, 33);
    p.recordFrame(9, 66);
    const s = p.snapshot(70);
    expect(s.avgRenderMs).toBe(5);
    expect(s.maxRenderMs).toBe(9);
    expect(s.frames).toBe(3);
  });

  it('counts a stall as a dropped frame but not normal jitter', () => {
    const p = new RenderProbe();
    let last = feed(p, 20, 33);
    p.recordFrame(2, last + 38); // jitter, under 2x the median gap
    last += 38;
    expect(p.snapshot(last).droppedFrames).toBe(0);
    p.recordFrame(2, last + 200); // a real hitch
    expect(p.snapshot(last + 200).droppedFrames).toBe(1);
  });

  it('tracks capture latency and context status; reset clears counters', () => {
    const p = new RenderProbe();
    p.recordCapture(800);
    p.recordCapture(1000);
    p.setContextStatus('lost');
    p.setGpuTimerAvailable(true);
    let s = p.snapshot(0);
    expect(s.lastCaptureMs).toBe(1000);
    expect(s.avgCaptureMs).toBe(900);
    expect(s.captures).toBe(2);
    expect(s.contextStatus).toBe('lost');
    expect(s.gpuTimerAvailable).toBe(true);
    p.reset();
    s = p.snapshot(0);
    expect(s.captures).toBe(0);
    expect(s.frames).toBe(0);
  });
});
