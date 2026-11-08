import { describe, it, expect, beforeEach } from 'vitest';
import {
  sampleSourceImageData,
  drawFalseColor,
  drawWaveform,
  drawRgbParade,
  drawVectorscope,
  drawZebraOverlay,
  drawFocusPeaking,
  drawFocusMagnifier,
} from '../../utils/cinemaScopes';

describe('Cinema Scopes & Real-Time GPU Algorithms Tests', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockSource: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 320;
    mockCanvas.height = 180;

    mockSource = document.createElement('canvas');
    mockSource.width = 160;
    mockSource.height = 90;
    const sCtx = mockSource.getContext('2d');
    if (sCtx) {
      sCtx.fillStyle = 'rgb(128, 128, 128)';
      sCtx.fillRect(0, 0, 160, 90);
    }
  });

  it('samples image data from valid source canvas', () => {
    const data = sampleSourceImageData(mockSource, 16, 9);
    expect(data).not.toBeNull();
    expect(data?.width).toBe(16);
    expect(data?.height).toBe(9);
    expect(data?.data.length).toBe(16 * 9 * 4);
  });

  it('executes false color exposure zone mapping without errors', () => {
    expect(() => {
      drawFalseColor(mockSource, mockCanvas, 40, 30);
    }).not.toThrow();
  });

  it('executes luma waveform drawing with IRE graticules without errors', () => {
    expect(() => {
      drawWaveform(mockSource, mockCanvas, 40, 30);
    }).not.toThrow();
  });

  it('executes RGB parade 3-channel column drawing without errors', () => {
    expect(() => {
      drawRgbParade(mockSource, mockCanvas, 30, 20);
    }).not.toThrow();
  });

  it('executes vectorscope polar graticule drawing without errors', () => {
    expect(() => {
      drawVectorscope(mockSource, mockCanvas, 30, 20);
    }).not.toThrow();
  });

  it('executes zebra stripes overlay drawing without errors', () => {
    expect(() => {
      drawZebraOverlay(mockSource, mockCanvas, 80, 40, 30);
    }).not.toThrow();
  });

  it('executes focus peaking contrast edge detection without errors', () => {
    expect(() => {
      drawFocusPeaking(mockSource, mockCanvas, '#22c55e', 20, 40, 30);
    }).not.toThrow();
  });

  it('executes focus magnifier 2x zoom without errors', () => {
    expect(() => {
      drawFocusMagnifier(mockSource, mockCanvas, 2.0, { x: 0.5, y: 0.5 });
    }).not.toThrow();
  });
});
