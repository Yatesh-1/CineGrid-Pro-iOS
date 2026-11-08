import React, { useRef, useState, useEffect, useSyncExternalStore } from 'react';
import type {
  AspectRatio,
  CameraFilter,
  ProSettings,
  GridType,
  GridStyleOptions,
  SecondaryGuideOptions,
  SmartFramingGuide,
} from '../types/camera';
import { getEffectiveCssFilter } from '../utils/shaders';
import { GridRenderer } from './grid-engine/GridRenderer';
import { GeoGridOverlay } from './grid-engine/GeoGridOverlay';
import { isGeoGridId } from '../data/geoGrids';
import { SmartFramingOverlay } from './framing/SmartFramingOverlay';
import { GhostOverlayView } from './ghost/GhostOverlayView';
import { LiveAssistOverlay } from './camera/LiveAssistOverlay';
import { portraitBlurPx, portraitMaskCss, type PortraitFocus } from '../utils/portraitBlur';
import { fitFrame, frameWidthOverHeight, framePlacement } from '../utils/frameFit';
import type { GhostOverlaySettings } from '../types/ghost';
import { FALLBACK_SCENES } from '../data/presets';
import { cameraAudio } from '../utils/audio';
import { ExposureBiasSlider } from './camera/ExposureBiasSlider';
import { LONG_PRESS_MS, LONG_PRESS_SLOP, sliderSide } from '../utils/exposureBias';
import { cameraService } from '../services/cameraService';
import { WebGLLutPipeline } from '../utils/webglLutPipeline';
import { cameraProfileStore } from '../services/cameraProfileStore';
import { renderProbe } from '../utils/renderProbe';

/**
 * Longest side of the live GPU preview. Measured on the test phone (OPPO CPH2421): the full 1080x1920 camera frame
 * gave 9-15 fps, 1280 gave 15-19 fps, and going lower (360x640) gave no further gain, because the remaining cost is
 * uploading each video frame to the GPU, not shading. Photos never use this size: they are re-rendered from the
 * full-resolution still (utils/renderLookStill.ts).
 */
const PREVIEW_MAX_SIDE = 1280;
import type { LookState, LutDefinition } from '../types/lut';
import { Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { DualCameraViewportOverlay } from './dual/DualCameraViewportOverlay';
import { GroupSelfieGuideOverlay } from './wideselfie/GroupSelfieGuideOverlay';
import type { DualCameraConfig, PipPosition } from '../types/camera';

interface ViewfinderProps {
  aspectRatio: AspectRatio;
  filter: CameraFilter;
  filterStrength: number;
  proSettings: ProSettings;
  gridType: GridType;
  gridStyleOptions: GridStyleOptions;
  secondaryGuides: SecondaryGuideOptions;
  framingGuide: SmartFramingGuide;
  onChangeFramingGuide: (patch: Partial<SmartFramingGuide>) => void;
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
  /** Crop applied to the preview for the part of the zoom the hardware cannot do (1 = none). */
  digitalScale?: number;
  /** Front camera shown (and saved) as a mirror image. */
  mirrored?: boolean;
  zoomMin?: number;
  zoomMax?: number;
  isFrontCamera: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  useSimulatedScene: boolean;
  activeSceneIndex: number;
  onCycleScene: () => void;
  onRetryCamera: () => void;
  cameraError: string | null;
  cameraReady: boolean;
  /** The native film camera draws the picture behind the WebView; no web video is expected, so no loading overlay. */
  nativePreview?: boolean;
  stream: MediaStream | null;
  ghostSettings?: GhostOverlaySettings;
  onUpdateGhostSettings?: (patch: Partial<GhostOverlaySettings>) => void;
  lookState?: LookState;
  activeLut?: LutDefinition | null;
  lutCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  dualCameraConfig?: DualCameraConfig;
  secondaryStream?: MediaStream | null;
  onSwapDualCameras?: () => void;
  onChangePipPosition?: (pos: PipPosition) => void;
  showGroupSelfieGuide?: boolean;
  /** The detected main subject (normalised to the visible frame) */
  subjectBox?: { x: number; y: number; w: number; h: number; kind: 'face' | 'object' } | null;
  /** Current exposure compensation, shown on the brightness slider beside the focus square. */
  ev?: number;
  onChangeEv?: (ev: number) => void;
  /** Fired when a long press locks (or a tap releases) exposure and focus together. */
  onAeAfLockChange?: (locked: boolean) => void;
  /** Portrait background softening, 0 (off) to 1; see utils/portraitBlur.ts. */
  portraitBlur?: number;
  /** Where the portrait blur keeps things sharp (the detected subject); the centre when absent */
  portraitFocus?: PortraitFocus | null;
  /** A still of the live picture shown over the video while the lens is moved for a focus lock, so the sweep is not seen */
  freezeFrame?: string | null;
  showPortraitEyeline?: boolean;
}

export const Viewfinder: React.FC<ViewfinderProps> = ({
  aspectRatio,
  filter,
  filterStrength,
  proSettings,
  gridType,
  gridStyleOptions,
  secondaryGuides,
  framingGuide,
  onChangeFramingGuide,
  zoomLevel,
  onZoomChange,
  digitalScale = 1,
  mirrored = false,
  zoomMin = 0.5,
  zoomMax = 5,
  videoRef,
  imageRef,
  useSimulatedScene,
  activeSceneIndex,
  onCycleScene,
  onRetryCamera,
  cameraError,
  cameraReady = true,
  nativePreview = false,
  stream,
  ghostSettings,
  onUpdateGhostSettings,
  lookState,
  activeLut,
  lutCanvasRef,
  dualCameraConfig,
  secondaryStream,
  onSwapDualCameras,
  onChangePipPosition,
  showGroupSelfieGuide,
  subjectBox,
  ev = 0,
  onChangeEv,
  onAeAfLockChange,
  portraitBlur = 0,
  portraitFocus = null,
  freezeFrame = null,
  showPortraitEyeline = false,
}) => {
  // Focus reticle state
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [isFocusLocked, setIsFocusLocked] = useState(false);
  const [rollAngle, setRollAngle] = useState(0);
  const [pitchAngle, setPitchAngle] = useState(0);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const lastLevelSnapRef = useRef(0);

  // WebGL 3D LUT Live Shader Pipeline
  const internalLutCanvasRef = useRef<HTMLCanvasElement>(null);
  const pipelineRef = useRef<WebGLLutPipeline | null>(null);
  // Visible frame (aspect crop + digital zoom) for the film stage; read inside the render loop, so kept in a ref.
  const frameCfgRef = useRef({ ratio: frameWidthOverHeight(aspectRatio), zoom: digitalScale });
  useEffect(() => {
    frameCfgRef.current = { ratio: frameWidthOverHeight(aspectRatio), zoom: digitalScale };
  });

  // Re-render (and re-apply the profile) whenever the user edits a camera profile.
  const profileRevision = useSyncExternalStore(cameraProfileStore.subscribe, cameraProfileStore.getRevision);
  const activeCameraProfile = cameraProfileStore.get(lookState?.cameraProfileId);

  const isLutActive = Boolean(
    activeCameraProfile ||
    (lookState?.activeLutId && activeLut && lookState.lutIntensity > 0) ||
    (lookState && (
      lookState.adjustments.exposure !== 0 ||
      lookState.adjustments.contrast !== 0 ||
      lookState.adjustments.saturation !== 0 ||
      lookState.adjustments.temperature !== 0 ||
      lookState.adjustments.tint !== 0 ||
      lookState.adjustments.highlights !== 0 ||
      lookState.adjustments.shadows !== 0 ||
      lookState.adjustments.fade !== 0
    ))
  );

  useEffect(() => {
    const canvas = (lutCanvasRef && 'current' in lutCanvasRef && lutCanvasRef.current) || internalLutCanvasRef.current;
    if (!canvas) return;

    if (!pipelineRef.current) {
      pipelineRef.current = new WebGLLutPipeline(canvas);
    }

    // Applies the selected virtual camera (or clears it) before frames are drawn.
    pipelineRef.current.setFilmProfile(cameraProfileStore.get(lookState?.cameraProfileId));
    if (!isLutActive) return;

    let isRunning = true;
    let animId: number | null = null;
    let videoCallbackId: number | null = null;

    const video = videoRef?.current;
    const supportsVideoFrameCallback =
      !useSimulatedScene &&
      video &&
      typeof (video as any).requestVideoFrameCallback === 'function';

    const render = () => {
      if (!isRunning) return;
      // Skip rendering if document is hidden (backgrounded)
      if (typeof document !== 'undefined' && document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      const sourceEl = useSimulatedScene ? imageRef.current : videoRef.current;
      if (sourceEl && pipelineRef.current && lookState) {
        const vw = (sourceEl as HTMLVideoElement).videoWidth || (sourceEl as HTMLImageElement).naturalWidth || (sourceEl as any).width || 0;
        if (vw > 0) {
          pipelineRef.current.setFrame(frameCfgRef.current.ratio, frameCfgRef.current.zoom);
          const t0 = performance.now();
          pipelineRef.current.renderFrame(sourceEl, lookState, activeLut, PREVIEW_MAX_SIDE);
          const t1 = performance.now();
          renderProbe.recordFrame(t1 - t0, t1);
          renderProbe.setContextStatus(pipelineRef.current.contextStatus);
          renderProbe.setGpuTimerAvailable(pipelineRef.current.gpuTimerAvailable);
        }
      }

      if (supportsVideoFrameCallback && video && typeof (video as any).requestVideoFrameCallback === 'function') {
        videoCallbackId = (video as any).requestVideoFrameCallback(render);
      } else {
        animId = requestAnimationFrame(render);
      }
    };

    if (supportsVideoFrameCallback && video && typeof (video as any).requestVideoFrameCallback === 'function') {
      videoCallbackId = (video as any).requestVideoFrameCallback(render);
    } else {
      animId = requestAnimationFrame(render);
    }

    return () => {
      isRunning = false;
      if (animId !== null) cancelAnimationFrame(animId);
      if (videoCallbackId !== null && video && typeof (video as any).cancelVideoFrameCallback === 'function') {
        (video as any).cancelVideoFrameCallback(videoCallbackId);
      }
    };
  }, [isLutActive, lookState, activeLut, useSimulatedScene, videoRef, imageRef, lutCanvasRef, profileRevision]);

  useEffect(() => {
    return () => {
      if (pipelineRef.current) {
        pipelineRef.current.dispose();
        pipelineRef.current = null;
      }
    };
  }, []);

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Directly attach live camera stream to HTMLVideoElement with autoplay & playsinline enforcement
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    setVideoEl(video);

    // Enforce HTML5 DOM properties required by Android Chromium
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');

    if (stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().then(() => {
        setIsVideoPlaying(true);
      }).catch((err) => {
        console.warn('[Viewfinder] Video play error:', err);
      });
    }

    const handlePlay = () => setIsVideoPlaying(true);
    const handleLoadedMetadata = () => {
      video.play().then(() => setIsVideoPlaying(true)).catch(() => {});
    };

    video.addEventListener('playing', handlePlay);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('playing', handlePlay);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoRef, stream]);

  // Touch Pinch-to-zoom tracking
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(zoomLevel);

  // Mathematical Aspect Ratio CSS Padding
  // The stage is the area the viewfinder may use; the frame is the largest capture-ratio rectangle that fits it,
  // placed like a phone camera. (A fixed width AND height would make CSS ignore the ratio, so it is measured.)
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStageSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const frame = stageSize ? fitFrame(stageSize.w, stageSize.h, frameWidthOverHeight(aspectRatio)) : null;
  const frameStyle = frame && frame.width > 0 ? { width: frame.width, height: frame.height } : undefined;

  // Device orientation / Gyroscope for artificial horizon & dual axis level (throttled to 30 FPS)
  useEffect(() => {
    let lastUpdate = 0;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const now = Date.now();
      if (now - lastUpdate < 33) return; // 30 FPS throttle
      lastUpdate = now;

      if (e.gamma !== null) {
        let roll = e.gamma;
        roll = Math.max(-45, Math.min(45, roll));
        setRollAngle((prev) => (Math.abs(prev - roll) > 0.4 ? Number(roll.toFixed(1)) : prev));

        if (e.beta !== null) {
          let pitch = e.beta - 90;
          pitch = Math.max(-30, Math.min(30, pitch));
          setPitchAngle((prev) => (Math.abs(prev - pitch) > 0.4 ? Number(pitch.toFixed(1)) : prev));
        }

        // Acoustic level snap when hitting true zero
        if (Math.abs(roll) <= 0.6 && now - lastLevelSnapRef.current > 1500) {
          lastLevelSnapRef.current = now;
          cameraAudio.playLevelSnap();
        }
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Tap focuses and shows the brightness slider. Press and hold locks exposure and focus (AE/AF LOCK) until the next tap.
  const [aeAfLocked, setAeAfLocked] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressFiredRef = useRef(false);

  const scheduleHide = (ms = 3200) => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setFocusPoint(null), ms);
  };

  const pointFromEvent = (e: { clientX: number; clientY: number }, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
  };

  const setLock = (locked: boolean) => {
    setAeAfLocked(locked);
    onAeAfLockChange?.(locked);
  };

  const handleViewfinderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // the synthetic click that follows the end of a pinch is not a tap
    if (Date.now() - pinchEndedAtRef.current < 400) return;
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false; // the click that ends a long press must not release the lock it just made
      return;
    }
    const { x, y } = pointFromEvent(e, e.currentTarget);
    if (aeAfLocked) setLock(false);

    setFocusPoint({ x, y });
    setIsFocusLocked(false);
    cameraAudio.playFocusLock();
    cameraService.applyTapToFocus(stream, x / 100, y / 100);
    window.setTimeout(() => setIsFocusLocked(true), 350);
    scheduleHide();
  };

  const handlePressStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = e.currentTarget;
    pressStartRef.current = { x: e.clientX, y: e.clientY };
    longPressFiredRef.current = false;
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    const { x, y } = pointFromEvent(e, el);
    pressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      setFocusPoint({ x, y });
      setIsFocusLocked(true);
      cameraAudio.playFocusLock();
      cameraService.applyTapToFocus(stream, x / 100, y / 100);
      setLock(true);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    }, LONG_PRESS_MS);
  };

  const handlePressMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pressStartRef.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > LONG_PRESS_SLOP && pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
    pressStartRef.current = null;
  };

  useEffect(
    () => () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    },
    []
  );

  // Pinch-to-zoom, like a stock camera app: smooth, follows the fingers 1:1 (no animation lag), shows the zoom
  // factor while pinching, and a pinch never triggers tap-to-focus or the AE/AF lock.
  const [pinchBadge, setPinchBadge] = useState<number | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const pinchEndedAtRef = useRef(0);
  const pinchRafRef = useRef<number | null>(null);
  const pinchPendingRef = useRef<number | null>(null);
  const badgeTimerRef = useRef<number | null>(null);

  const touchDist = (e: React.TouchEvent<HTMLDivElement>) =>
    Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      initialPinchDistRef.current = touchDist(e);
      initialZoomRef.current = zoomLevel;
      setIsPinching(true);
      // two fingers down: cancel any pending long-press lock
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
      if (badgeTimerRef.current) window.clearTimeout(badgeTimerRef.current);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2 || initialPinchDistRef.current === null) return;
    const factor = touchDist(e) / initialPinchDistRef.current;
    const target = Math.min(zoomMax, Math.max(zoomMin, initialZoomRef.current * factor));
    pinchPendingRef.current = Math.round(target * 100) / 100;
    setPinchBadge(pinchPendingRef.current);
    // at most one zoom update per frame
    if (pinchRafRef.current === null) {
      pinchRafRef.current = requestAnimationFrame(() => {
        pinchRafRef.current = null;
        if (pinchPendingRef.current !== null) onZoomChange(pinchPendingRef.current);
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (initialPinchDistRef.current !== null && e.touches.length < 2) {
      initialPinchDistRef.current = null;
      pinchEndedAtRef.current = Date.now();
      setIsPinching(false);
      if (pinchPendingRef.current !== null) onZoomChange(pinchPendingRef.current);
      pinchPendingRef.current = null;
      badgeTimerRef.current = window.setTimeout(() => setPinchBadge(null), 900);
    }
  };

  useEffect(
    () => () => {
      if (pinchRafRef.current !== null) cancelAnimationFrame(pinchRafRef.current);
      if (badgeTimerRef.current) window.clearTimeout(badgeTimerRef.current);
    },
    []
  );

  // Filter & visual transform applied strictly to preview content (NOT grids)
  const deSqueeze = proSettings.anamorphicDeSqueeze || 1.0;
  const previewFilterStyle = {
    filter: getEffectiveCssFilter(filter, filterStrength, proSettings),
    // Hardware zoom already changes the image; only the remaining digital part is a crop, always about the centre.
    transform: `scale(${digitalScale}) scaleX(${deSqueeze * (mirrored ? -1 : 1)})`,
    transformOrigin: 'center center',
    // no easing while the fingers are down, so the picture follows them exactly
    transition: isPinching ? 'filter 0.15s ease-out' : 'transform 0.2s ease-out, filter 0.15s ease-out',
  };

  const currentFallback = FALLBACK_SCENES[activeSceneIndex % FALLBACK_SCENES.length];

  return (
    <div
      ref={stageRef}
      data-testid="viewfinder-stage"
      className={`relative w-full h-full flex justify-center ${framePlacement(aspectRatio) === 'start' ? 'items-start' : 'items-center'}`}
    >
    <div
      data-testid="viewfinder-frame"
      style={frameStyle ? { ...frameStyle, touchAction: 'none' } : { touchAction: 'none' }}
      onClick={handleViewfinderClick}
      onPointerDown={handlePressStart}
      onPointerMove={handlePressMove}
      onPointerUp={handlePressEnd}
      onPointerCancel={handlePressEnd}
      onPointerLeave={handlePressEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative flex-shrink-0 ${frameStyle ? '' : 'w-full h-full'} bg-black rounded-2xl overflow-hidden cursor-crosshair select-none shadow-2xl transition-all duration-300 border border-white/10`}
    >
      {/* 1. REAL SENSOR FEED (Video or Sample Scene) */}
      {useSimulatedScene ? (
        <img
          ref={imageRef as React.RefObject<HTMLImageElement>}
          src={currentFallback.url}
          alt={currentFallback.name}
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={previewFilterStyle}
        />
      ) : (
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          autoPlay
          playsInline
          muted
          // Transparent poster: without it Android WebView paints its grey play-button icon while the camera restarts
          poster="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={previewFilterStyle}
        />
      )}
      {freezeFrame && (
        <img
          data-testid="freeze-frame"
          src={freezeFrame}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={previewFilterStyle}
        />
      )}

      {/* Zoom readout while pinching */}
      {pinchBadge !== null && (
        <div
          data-testid="pinch-zoom-badge"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/60 text-amber-300 text-sm font-semibold tabular-nums pointer-events-none"
        >
          {pinchBadge.toFixed(1)}×
        </div>
      )}

      {/* 1.25 CAMERA LOADING & INITIALIZATION INDICATOR */}
      {!nativePreview && !useSimulatedScene && (!stream || !cameraReady || !isVideoPlaying) && !cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-20 pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin mb-3 shadow-lg shadow-amber-500/20" />
          <span className="text-xs font-mono font-bold tracking-widest text-amber-400">INITIALIZING OPTICAL SENSOR...</span>
          <span className="text-[10px] font-mono text-zinc-400 mt-1">Starting live camera feed</span>
        </div>
      )}

      {/* 1.3 CAMERA ERROR / PERMISSION FALLBACK OVERLAY */}
      {!nativePreview && cameraError && !useSimulatedScene && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center z-20">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
            <AlertCircle size={26} />
          </div>
          <span className="text-sm font-bold text-white mb-1">Camera Sensor Unavailable</span>
          <p className="text-xs text-zinc-400 max-w-xs mb-4">{cameraError}</p>
          <button
            type="button"
            onClick={onRetryCamera}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <RefreshCw size={13} />
            <span>RESTART CAMERA SENSOR</span>
          </button>
        </div>
      )}

      {/* 1.5 GPU-ACCELERATED LIVE 3D LUT & COLOR GRADE CANVAS */}
      <canvas
        ref={lutCanvasRef || internalLutCanvasRef}
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-150 ${
          isLutActive && isVideoPlaying ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none -z-10'
        }`}
        style={previewFilterStyle}
      />

      {/* 2. INTERACTIVE GHOST REFERENCE OVERLAY */}
      {ghostSettings && ghostSettings.enabled && (
        <GhostOverlayView
          settings={ghostSettings}
          onUpdateSettings={onUpdateGhostSettings}
        />
      )}

      {/* 2B. DUAL CAMERA PIP / SPLIT SCREEN OVERLAY */}
      {proSettings.captureMode === 'dual' && dualCameraConfig && (
        <DualCameraViewportOverlay
          config={dualCameraConfig}
          secondaryStream={secondaryStream || null}
          onSwapCameras={onSwapDualCameras || (() => {})}
          onChangePipPosition={onChangePipPosition || (() => {})}
        />
      )}

      {/* 2B2. DETECTED SUBJECT: outlines the face / main object that focus follows */}
      {subjectBox && (
        <div
          data-testid="subject-box"
          className={`absolute z-10 pointer-events-none rounded-md border-2 transition-all duration-200 ${
            subjectBox.kind === 'face' ? 'border-emerald-400' : 'border-amber-300'
          }`}
          style={{ left: `${subjectBox.x * 100}%`, top: `${subjectBox.y * 100}%`, width: `${subjectBox.w * 100}%`, height: `${subjectBox.h * 100}%` }}
        >
          <span className={`absolute -top-5 left-0 px-1.5 rounded text-[10px] font-semibold text-black ${subjectBox.kind === 'face' ? 'bg-emerald-400' : 'bg-amber-300'}`}>
            {subjectBox.kind === 'face' ? 'Face' : 'Subject'}
          </span>
        </div>
      )}

      {/* 2C. GROUP SELFIE GUIDANCE OVERLAY */}
      {showGroupSelfieGuide && (
        <GroupSelfieGuideOverlay isVisible={true} />
      )}

      {/* 3-5. REAL EXPOSURE / FOCUS ASSISTS: false colour, zebra (user IRE threshold), focus peaking.
          Computed from the live frame, drawn with the same crop and zoom as the picture. */}
      <LiveAssistOverlay
        videoRef={videoRef}
        imageRef={imageRef}
        useSimulatedScene={useSimulatedScene}
        falseColor={proSettings.falseColor}
        zebra={proSettings.zebraStripes}
        zebraThreshold={proSettings.zebraThreshold}
        peaking={proSettings.focusPeaking}
        peakingColor={proSettings.peakingColor}
        style={{ transform: previewFilterStyle.transform, transformOrigin: previewFilterStyle.transformOrigin }}
      />


      {/* 5B. PORTRAIT: centre-weighted background softening (real blur, strength follows the aperture) */}
      {portraitBlur > 0 && (
        <div
          data-testid="portrait-blur"
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backdropFilter: `blur(${Math.round(portraitBlur * portraitBlurPx(1, Math.min(window.innerWidth, 480)) * 10) / 10}px)`,
            WebkitBackdropFilter: `blur(${Math.round(portraitBlur * portraitBlurPx(1, Math.min(window.innerWidth, 480)) * 10) / 10}px)`,
            maskImage: portraitMaskCss(portraitFocus),
            WebkitMaskImage: portraitMaskCss(portraitFocus),
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
          }}
        />
      )}

      {/* 5C. PORTRAIT EYELINE GUIDE: eyes sit on the upper-third line, head top clear of the edge */}
      {showPortraitEyeline && (
        <div className="absolute inset-0 pointer-events-none z-10" data-testid="portrait-eyeline">
          <div className="absolute left-[10%] right-[10%] top-[36%] border-t border-dashed border-amber-300/80" />
          <span className="absolute left-[10%] top-[36%] -translate-y-full text-[10px] font-mono font-bold text-amber-300/90">EYES</span>
          <div className="absolute left-[30%] right-[30%] top-[12%] border-t border-dashed border-white/50" />
          <span className="absolute left-[30%] top-[12%] -translate-y-full text-[10px] font-mono text-white/70">HEAD TOP</span>
        </div>
      )}

      {/* 6. SMART SUBJECT FRAMING GUIDE (Dashed Shapes & Silhouettes) */}
      <SmartFramingOverlay
        guide={framingGuide}
        onChangeGuide={onChangeFramingGuide}
        videoElement={videoEl}
      />

      {/* 7. MATHEMATICALLY ACCURATE COMPOSITION GRID OVERLAY */}
      {isGeoGridId(gridType) && <GeoGridOverlay gridId={gridType} styleOptions={gridStyleOptions} />}
      <GridRenderer
        gridType={isGeoGridId(gridType) ? 'none' : gridType}
        styleOptions={gridStyleOptions}
        secondaryGuides={secondaryGuides}
        rollAngle={rollAngle}
        pitchAngle={pitchAngle}
      />

      {/* 8. FOCUS SQUARE + BRIGHTNESS SLIDER (iPhone style); long press locks AE/AF */}
      {focusPoint && (
        <>
          {aeAfLocked && (
            <div
              role="status"
              className="absolute top-3 left-1/2 -translate-x-1/2 z-40 h-7 px-3 rounded-full bg-amber-400 text-black text-xs font-bold flex items-center pointer-events-none"
            >
              AE/AF LOCK
            </div>
          )}
          <div
            className="absolute z-40 flex items-center gap-1 transition-all duration-150"
            style={{
              left: `${focusPoint.x}%`,
              top: `${focusPoint.y}%`,
              transform: `translate(${sliderSide(focusPoint.x) === 'left' ? '-100%' : '0'}, -50%) translateX(${sliderSide(focusPoint.x) === 'left' ? '36px' : '-36px'})`,
              flexDirection: sliderSide(focusPoint.x) === 'left' ? 'row-reverse' : 'row',
            }}
          >
            <div
              data-testid="focus-square"
              className={`w-[72px] h-[72px] border-[1.5px] flex-shrink-0 transition-all duration-300 pointer-events-none ${
                aeAfLocked ? 'border-amber-300 scale-100' : isFocusLocked ? 'border-amber-300 scale-95' : 'border-white scale-110'
              }`}
            />
            {onChangeEv && (
              <ExposureBiasSlider
                value={ev}
                onChange={onChangeEv}
                onInteract={() => {
                  if (!aeAfLocked) scheduleHide(4500);
                }}
              />
            )}
          </div>
        </>
      )}

      {/* 9. SIMULATION / FALLBACK SCENE BADGE */}
      {useSimulatedScene && (
        <div className="absolute bottom-3 left-3 pointer-events-auto z-30 flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-mono text-white/90 flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Scene: {currentFallback.name}</span>
          </div>
          <button
            onClick={onCycleScene}
            className="p-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white hover:text-amber-400 active:rotate-180 transition-all shadow-lg"
            title="Next Sample Scene"
          >
            <RefreshCw size={13} />
          </button>
          {cameraError && (
            <button
              onClick={onRetryCamera}
              className="px-2 py-1 rounded-full bg-amber-500/90 text-black text-[10px] font-bold flex items-center gap-1 shadow-lg hover:bg-amber-400 transition-colors"
              title="Grant camera permission"
            >
              <Camera size={12} />
              Enable Camera
            </button>
          )}
        </div>
      )}

      {/* 11. CAMERA PERMISSION ERROR BANNER (if any) */}
      {!nativePreview && cameraError && !useSimulatedScene && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center text-white">
          <AlertCircle size={40} className="text-amber-400 mb-3" />
          <h3 className="text-lg font-bold mb-1">Camera Permission Required</h3>
          <p className="text-xs text-zinc-400 max-w-xs mb-4">
            {cameraError}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onRetryCamera}
              className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs tracking-wide shadow-lg hover:bg-amber-300 active:scale-95 transition-all"
            >
              Retry Camera
            </button>
            <button
              onClick={onCycleScene}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-white font-medium text-xs border border-white/10 hover:bg-zinc-700 active:scale-95 transition-all"
            >
              Use Sample Photos
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
