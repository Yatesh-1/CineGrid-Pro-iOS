import type { LookState, LutDefinition } from '../types/lut';
import type { CameraProfile } from './cameraProfile';
import { WebGLLutPipeline } from './webglLutPipeline';

/** Longest side of a processed still. Matches the output cap in captureFrameToDataUrl. */
export const LOOK_STILL_MAX_SIDE = 4096;

export interface LookStill {
  /** GPU canvas holding the graded full-resolution still. Valid until dispose(). */
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  /** Releases the GPU context. Call after the canvas has been read. */
  dispose: () => void;
}

/**
 * Renders a full-resolution still through the same shader the live preview uses (LUT, adjustments and
 * the virtual camera), so a photo has the preview's look at the sensor's detail level rather than at
 * preview size. Returns null when the GPU cannot do it (no WebGL, texture too large, context lost),
 * in which case the caller keeps its preview-resolution fallback; nothing is faked or upscaled here.
 */
export function renderLookStill(
  still: ImageBitmap,
  look: LookState,
  lut: LutDefinition | null,
  profile: CameraProfile | null,
  maxSide: number = LOOK_STILL_MAX_SIDE
): LookStill | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const pipeline = new WebGLLutPipeline(canvas);
  if (!pipeline.filmSupported) {
    pipeline.dispose();
    return null;
  }
  try {
    pipeline.setFilmProfile(profile);
    // renderFrame falls back to a 2D draw on failure; that cannot grade, so require a real GL pass.
    const ok = pipeline.renderFrame(still, look, lut, maxSide);
    if (!ok || canvas.width === 0 || canvas.height === 0 || !pipeline.filmSupported) {
      pipeline.dispose();
      return null;
    }
    return { canvas, width: canvas.width, height: canvas.height, dispose: () => pipeline.dispose() };
  } catch (err) {
    console.warn('[renderLookStill] GPU still render failed, using the preview-resolution frame:', err);
    pipeline.dispose();
    return null;
  }
}
