import { useState, useRef, useEffect, useCallback, useMemo, useSyncExternalStore, Suspense, lazy } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { saveToDevice } from './services/deviceSaveService';
import { currentPhotoUrl } from './utils/photoVersions';
import { effectiveTint, setTintFilter } from './utils/tintFilter';
import { focusFromBox, portraitBlurStrength } from './utils/portraitBlur';
import { perfMark } from './utils/perfMarks';
import { lazyView } from './utils/lazyView';
import {
  loadNativeCapabilities,
  refreshNativeCapabilities,
  nativeCapture,
  stillSupportFor,
  pickNativeCamera,
  type NativeCapabilities,
} from './services/nativeCameraService';
import type {
  AspectRatio,
  GridCategory,
  GridType,
  GridStyleOptions,
  SecondaryGuideOptions,
  SmartFramingGuide,
  CompositionGridDefinition,
  MasterPhotographyPreset,
  CameraFilter,
  ProSettings,
  CapturedPhoto,
  CameraMode,
  DualCameraConfig,
  NightModeConfig,
  WideSelfieConfig,
  SlowMotionConfig,
  TimelapseConfig,
} from './types/camera';
import { CAMERA_FILTERS } from './data/presets';
import { COMPREHENSIVE_GRID_LIBRARY, recommendedGridIds } from './data/gridLibrary';
import { captureFrameToDataUrl } from './utils/shaders';
import { cameraAudio } from './utils/audio';
import { cameraService } from './services/cameraService';
import { planZoom, zoomLimits, lensAbsorbedZoom } from './utils/zoomPlan';
import { softwareExposureStops } from './utils/softwareExposure';
import { DEFAULT_GRID_STYLE, DEFAULT_PRO_SETTINGS } from './data/defaultSettings';
import { photoFromFile, validateImportFile } from './utils/importPhoto';
import { applyProSettings, calibrateExposureLock, calibrateFocusLock, calibrateSemiAuto, clearExposureLock, clearFocusLock, clearSemiAuto, semiAutoKey, meanLuma, NO_CONTROLS_APPLIED, readSupport, type AppliedControls } from './services/cameraControlService';
import { mediaStorageService } from './services/mediaStorageService';
import type { AvailableCameraDevice } from './services/cameraService';
import type { BlackmagicCameraPreset } from './data/blackmagicPresets';
import { Viewfinder } from './components/Viewfinder';
import { ProHUD } from './components/ProHUD';
import { TickDial } from './components/TickDial';
import { ShutterDock } from './components/ShutterDock';
import type { ProSettingsTab } from './components/ProSettingsDrawer';
import { licenseService, type StoredLicenseSession } from './services/licenseService';
import { MainNavigationBar, type MainNavTab } from './components/navigation/MainNavigationBar';
import { ADMIN_ENABLED, LICENSE_ENFORCED } from './config';
import { sessionService } from './services/sessionService';
import { lutStorageService } from './services/lutStorageService';
import { hardwareIntelligenceService } from './services/hardwareIntelligenceService';
import type { DeviceHardwareReport, ZoomMagnificationType } from './types/hardware';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import type { PhotographySession } from './types/session';
import { type GhostOverlaySettings, DEFAULT_GHOST_SETTINGS } from './types/ghost';
import { type LookState, DEFAULT_LOOK_STATE, type LutDefinition } from './types/lut';
import { cameraProfileStore } from './services/cameraProfileStore';
import { renderLookStill } from './utils/renderLookStill';
import { renderProbe } from './utils/renderProbe';
import { useNativeFilmCamera } from './hooks/useNativeFilmCamera';
import { NATIVE_RECORD_HEIGHT, nativeRecordingToBlobUrl } from './services/nativeFilmCamera';
import { loadPrefs, savePrefs } from './utils/uiPrefs';
import { Smartphone, Monitor, ShieldCheck, KeyRound, Loader2, Camera, Grid3X3, Palette, Sliders, RectangleHorizontal, ScanFace, Layers, Heart, Zap, ZapOff, SwitchCamera, Lock, Unlock, Sun, House, Timer as TimerIcon, FlipHorizontal } from 'lucide-react';
import { Sheet } from './components/ui/Sheet';
import { FeatureRail } from './components/camera/FeatureRail';
import { ModePanel } from './components/camera/ModePanel';
import { ZoomStrip } from './components/ZoomStrip';
import { CaptureModeSelector } from './components/CaptureModeSelector';
import { maxZoomFor } from './utils/zoomSlider';
import { clearLook } from './utils/lookActions';
import { compactPhoto, makeVideoThumb, needsCompaction, persistCompact } from './utils/photoMemory';
import { detectFace, detectSalientSubject, smoothBox, type SubjectBox } from './utils/subjectDetection';
import { frameWidthOverHeight } from './utils/frameFit';

// Ultimate Cinematography Video Engine (ARRI / RED / Sony VENICE / Blackmagic inspired)
import { cinemaVideoService } from './services/cinemaVideoService';
import type { CinemaVideoConfig } from './types/cinemaVideo';

// Lazy-loaded modal subsystems for fast startup & reduced initial JS heap
const CompositionPicker = lazyView(() => import('./components/CompositionPicker').then((m) => ({ default: m.CompositionPicker })));
const FilterPicker = lazyView(() => import('./components/FilterPicker').then((m) => ({ default: m.FilterPicker })));
const GalleryModal = lazyView(() => import('./components/GalleryModal').then((m) => ({ default: m.GalleryModal })));
const GridReferenceModal = lazyView(() => import('./components/GridReferenceModal').then((m) => ({ default: m.GridReferenceModal })));
const GridCustomizerModal = lazyView(() => import('./components/GridCustomizerModal').then((m) => ({ default: m.GridCustomizerModal })));
const WelcomeActivationScreen = lazyView(() => import('./components/licensing/WelcomeActivationScreen').then((m) => ({ default: m.WelcomeActivationScreen })));
const GhostOverlayDrawer = lazyView(() => import('./components/ghost/GhostOverlayDrawer').then((m) => ({ default: m.GhostOverlayDrawer })));
const HardwareInspectorModal = lazyView(() => import('./components/hardware/HardwareInspectorModal').then((m) => ({ default: m.HardwareInspectorModal })));
const CinemaVideoHUD = lazyView(() => import('./components/cinema/CinemaVideoHUD').then((m) => ({ default: m.CinemaVideoHUD })));
const CinemaMonitoringDrawer = lazyView(() => import('./components/cinema/CinemaMonitoringDrawer').then((m) => ({ default: m.CinemaMonitoringDrawer })));
const CinemaContextualPanels = lazyView(() => import('./components/cinema/CinemaContextualPanels').then((m) => ({ default: m.CinemaContextualPanels })));
const CinemaScopesOverlay = lazyView(() => import('./components/cinema/CinemaScopesOverlay').then((m) => ({ default: m.CinemaScopesOverlay })));
const ProductionSlateModal = lazyView(() => import('./components/cinema/ProductionSlateModal').then((m) => ({ default: m.ProductionSlateModal })));
const DirectorMonitorModal = lazyView(() => import('./components/cinema/DirectorMonitorModal').then((m) => ({ default: m.DirectorMonitorModal })));
const DualCameraControls = lazyView(() => import('./components/dual/DualCameraControls').then((m) => ({ default: m.DualCameraControls })));
const NightModeControls = lazyView(() => import('./components/night/NightModeControls').then((m) => ({ default: m.NightModeControls })));
const SlowMoControls = lazyView(() => import('./components/slowmo/SlowMoControls').then((m) => ({ default: m.SlowMoControls })));
const TimelapseControls = lazyView(() => import('./components/timelapse/TimelapseControls').then((m) => ({ default: m.TimelapseControls })));
const WideSelfieControls = lazyView(() => import('./components/wideselfie/WideSelfieControls').then((m) => ({ default: m.WideSelfieControls })));
const PortraitModeControls = lazyView(() => import('./components/portrait/PortraitModeControls').then((m) => ({ default: m.PortraitModeControls })));
const ProSettingsDrawer = lazyView(() => import('./components/ProSettingsDrawer').then((m) => ({ default: m.ProSettingsDrawer })));

const MasterPresetsModal = lazy(() =>
  import('./components/MasterPresetsModal').then((m) => ({ default: m.MasterPresetsModal }))
);
const PhotoEditorModal = lazy(() =>
  import('./components/PhotoEditorModal').then((m) => ({ default: m.PhotoEditorModal }))
);
const AdminDashboardModal = lazy(() =>
  import('./components/licensing/AdminDashboardModal').then((m) => ({ default: m.AdminDashboardModal }))
);
const LicenseInfoModal = lazy(() =>
  import('./components/licensing/LicenseInfoModal').then((m) => ({ default: m.LicenseInfoModal }))
);
const ContactAdminModal = lazy(() =>
  import('./components/licensing/ContactAdminModal').then((m) => ({ default: m.ContactAdminModal }))
);
const SessionsManagerModal = lazy(() =>
  import('./components/sessions/SessionsManagerModal').then((m) => ({ default: m.SessionsManagerModal }))
);
const ExportStudioModal = lazy(() =>
  import('./components/export/ExportStudioModal').then((m) => ({ default: m.ExportStudioModal }))
);
const LookStudioModal = lazy(() =>
  import('./components/look/LookStudioModal').then((m) => ({ default: m.LookStudioModal }))
);
const AudioStudioModal = lazy(() =>
  import('./components/audio/AudioStudioModal').then((m) => ({ default: m.AudioStudioModal }))
);

import { dualCameraService } from './services/dualCameraService';
import { nightCaptureService } from './services/nightCaptureService';
import { PanoramaStitcher, type PanoramaState } from './services/panoramaService';
import { boxToVideoRoi, visibleRect, snapshotFrame } from './utils/visibleFrame';
import { slowMotionService } from './services/slowMotionService';
import { timelapseService } from './services/timelapseService';
import { wideSelfieService } from './services/wideSelfieService';
import { audioIntelligenceService } from './services/audioIntelligenceService';

const DEFAULT_SECONDARY_GUIDES: SecondaryGuideOptions = {
  showHorizonLevel: false,
  showDualAxisLevel: false,
  showSafeArea: false,
  showReferenceOverlay: false,
};

// 5600 K is the neutral point of the white-balance filter in getEffectiveCssFilter
const NEUTRAL_WHITE_BALANCE = 5600;

export function App() {
  // Camera & Stream state
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraElement, setCameraElement] = useState<{
    video: HTMLVideoElement | null;
    image: HTMLImageElement | null;
  }>({ video: null, image: null });

  useEffect(() => {
    streamRef.current = stream;
    setCameraElement({
      video: videoRef.current,
      image: imageRef.current,
    });
  }, [stream]);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useSimulatedScene, setUseSimulatedScene] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [availableLenses, setAvailableLenses] = useState<AvailableCameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(undefined);

  // Torch state
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Video recording state
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<number | null>(null);

  // Grid system state with LocalStorage persistence
  const [gridList, setGridList] = useState<CompositionGridDefinition[]>(() => {
    try {
      const savedFavorites = localStorage.getItem('cinegrid_favorites');
      if (savedFavorites) {
        const favIds: string[] = JSON.parse(savedFavorites);
        return COMPREHENSIVE_GRID_LIBRARY.map((g) => ({
          ...g,
          isFavorite: favIds.includes(g.id),
        }));
      }
    } catch {}
    return COMPREHENSIVE_GRID_LIBRARY;
  });

  const [selectedGrid, setSelectedGrid] = useState<CompositionGridDefinition>(() => {
    try {
      const savedId = localStorage.getItem('cinegrid_selected_id');
      if (savedId) {
        const found = COMPREHENSIVE_GRID_LIBRARY.find((g) => g.id === savedId);
        // 'landscape_panoramic' was left selected by testing and masks the frame; it must be an explicit choice
        if (found && found.id !== 'landscape_panoramic') return found;
      }
    } catch {}
    // Every launch starts with no grid on screen; the user turns one on when they want it
    return COMPREHENSIVE_GRID_LIBRARY.find((g) => g.id === 'none') ?? COMPREHENSIVE_GRID_LIBRARY[0];
  });

  const [selectedCategory, setSelectedCategory] = useState<GridCategory>('all');
  // Settings that used to reset on every restart are restored from validated saved preferences (utils/uiPrefs.ts).
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(() => loadPrefs().aspectRatio ?? '4:3');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Smart Subject Framing Guide state
  const [framingGuide, setFramingGuide] = useState<SmartFramingGuide>({
    enabled: false,
    mode: 'manual',
    category: 'portrait',
    shape: 'silhouette_head',
    label: 'Portrait Headroom',
    x: 50,
    y: 45,
    width: 44,
    height: 52,
    isLocked: false,
  });

  // Grid style options with LocalStorage persistence
  const [gridStyle, setGridStyle] = useState<GridStyleOptions>(() => {
    try {
      const saved = localStorage.getItem('cinegrid_style');
      if (saved) return { ...DEFAULT_GRID_STYLE, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_GRID_STYLE;
  });

  // Secondary guides with LocalStorage persistence
  const [secondaryGuides, setSecondaryGuides] = useState<SecondaryGuideOptions>(() => {
    try {
      const saved = localStorage.getItem('cinegrid_secondary');
      if (saved) return { ...DEFAULT_SECONDARY_GUIDES, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SECONDARY_GUIDES;
  });

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<CameraFilter>(() => {
    const id = loadPrefs(undefined, CAMERA_FILTERS.map((f) => f.id)).filterId;
    return CAMERA_FILTERS.find((f) => f.id === id) ?? CAMERA_FILTERS[1]; // default: Portra 400
  });
  const [filterStrength, setFilterStrength] = useState<number>(() => loadPrefs().filterStrength ?? 85);

  // Pro settings state with separate Photo and Video persistence
  const [proSettings, setProSettings] = useState<ProSettings>(() => {
    try {
      const saved = localStorage.getItem('cinegrid_pro_photo_settings');
      if (saved) return { ...DEFAULT_PRO_SETTINGS, ...JSON.parse(saved), captureMode: 'photo' };
    } catch {}
    return DEFAULT_PRO_SETTINGS;
  });
  const [isProDrawerOpen, setIsProDrawerOpen] = useState(false);
  const [proDrawerTab, setProDrawerTab] = useState<ProSettingsTab | undefined>(undefined);
  const openPro = (tab?: ProSettingsTab) => {
    setProDrawerTab(tab);
    setIsProDrawerOpen(true);
  };

  // Capture & Gallery state
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [burstProgress, setBurstProgress] = useState<{ current: number; total: number } | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryToast, setGalleryToast] = useState<string | null>(null);
  // Native Camera2 capabilities (Android): decide which still formats / multi-frame modes are really available
  const [nativeCaps, setNativeCaps] = useState<NativeCapabilities | null>(null);
  const [hdrEnabled, setHdrEnabled] = useState(() => loadPrefs().hdr ?? false);
  useEffect(() => {
    loadNativeCapabilities().then((c) => {
      hardwareIntelligenceService.applyNativeSpecs(c); // real focal length / aperture / OIS instead of guesses
      setNativeCaps(c);
    });
  }, []);
  // Clean viewfinder by default: monitoring/readouts and picker sheets open on demand.
  // Live scopes (histogram, waveform) render inside the Pro > Monitoring tab, never on the picture or the main rail
  const [scopesHost, setScopesHost] = useState<HTMLDivElement | null>(null);
  const [traySheet, setTraySheet] = useState<'grid' | 'look' | null>(null);
  const [selectedTimer, setSelectedTimer] = useState<number>(() => loadPrefs().timer ?? 0);
  // Front camera mirroring: the preview and the saved photo agree (what you see is what you get).
  const [mirrorFront, setMirrorFront] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cinegrid_mirror_front') !== '0';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('cinegrid_mirror_front', mirrorFront ? '1' : '0');
    } catch {}
  }, [mirrorFront]);
  // The rear camera can be mirrored too (e.g. shooting through a mirror or for a teleprompter look); off by default.
  const [mirrorRear, setMirrorRear] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cinegrid_mirror_rear') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('cinegrid_mirror_rear', mirrorRear ? '1' : '0');
    } catch {}
  }, [mirrorRear]);
  const mirrorActive = isFrontCamera ? mirrorFront : mirrorRear;
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Panorama sweep (null state = not sweeping)
  const panoRef = useRef<PanoramaStitcher | null>(null);
  const panoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [panoState, setPanoState] = useState<PanoramaState | null>(null);
  // Still frame shown over the preview while a focus lock moves the lens
  const [freezeFrame, setFreezeFrame] = useState<string | null>(null);
  // Front-camera framing pill: shown after flipping or touching the viewfinder, hidden after 5 s of no use
  const [selfieControlsVisible, setSelfieControlsVisible] = useState(true);
  const selfieHideRef = useRef<number | null>(null);
  const showSelfieControls = () => {
    setSelfieControlsVisible(true);
    if (selfieHideRef.current) window.clearTimeout(selfieHideRef.current);
    selfieHideRef.current = window.setTimeout(() => setSelfieControlsVisible(false), 5000);
  };
  useEffect(() => {
    if (selfieControlsVisible) {
      if (selfieHideRef.current) window.clearTimeout(selfieHideRef.current);
      selfieHideRef.current = window.setTimeout(() => setSelfieControlsVisible(false), 5000);
    }
    return () => {
      if (selfieHideRef.current) window.clearTimeout(selfieHideRef.current);
    };
  }, [selfieControlsVisible]);
  const [timerCount, setTimerCount] = useState<number | null>(null);

  // Post-Capture Before/After Review & Editor state
  const [reviewingPhoto, setReviewingPhoto] = useState<CapturedPhoto | null>(null);
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);

  // Modals state
  const [referenceGrid, setReferenceGrid] = useState<CompositionGridDefinition | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isMasterPresetsOpen, setIsMasterPresetsOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | undefined>(undefined);

  // License & Authentication state
  const [isLicenseActivated, setIsLicenseActivated] = useState<boolean | null>(null);
  const [licenseSession, setLicenseSession] = useState<StoredLicenseSession | null>(null);
  const [activationWarning, setActivationWarning] = useState<string | undefined>(undefined);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(
    () => (ADMIN_ENABLED && typeof window !== 'undefined' ? window.location.hash === '#admin' : false)
  );
  const [isLicenseInfoOpen, setIsLicenseInfoOpen] = useState(false);
  const [isContactAdminOpen, setIsContactAdminOpen] = useState(false);

  // Main Navigation state
  const [mainNavTab, setMainNavTab] = useState<MainNavTab>('camera');

  // Ghost Overlay state
  const [ghostSettings, setGhostSettings] = useState<GhostOverlaySettings>(() => {
    try {
      const saved = localStorage.getItem('cinegrid_ghost_overlay');
      return saved ? JSON.parse(saved) : DEFAULT_GHOST_SETTINGS;
    } catch {
      return DEFAULT_GHOST_SETTINGS;
    }
  });
  const [isGhostDrawerOpen, setIsGhostDrawerOpen] = useState(false);

  // Photography Sessions state
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<PhotographySession | null>(() =>
    sessionService.getActiveSession()
  );

  // Export Studio state
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);
  const [exportPhoto, setExportPhoto] = useState<CapturedPhoto | null>(null);

  // Professional 3D LUT & Filter Look Studio state
  const [lookState, setLookState] = useState<LookState>(() => {
    try {
      const saved = localStorage.getItem('cinegrid_look_state');
      const base = saved ? { ...DEFAULT_LOOK_STATE, ...JSON.parse(saved) } : DEFAULT_LOOK_STATE;
      // The selected virtual camera outlives the launch reset of the rest of the look.
      return { ...base, cameraProfileId: cameraProfileStore.getActiveId() };
    } catch {
      return { ...DEFAULT_LOOK_STATE, cameraProfileId: cameraProfileStore.getActiveId() };
    }
  });
  const [isLookModalOpen, setIsLookModalOpen] = useState(false);
  const [activeLut, setActiveLut] = useState<LutDefinition | null>(null);
  const lutCanvasRef = useRef<HTMLCanvasElement>(null);

  // Advanced Capture Studio States (Audio Intelligence, Dual Camera, Night, Wide Selfie, Slow Mo, Timelapse)
  const [isAudioStudioOpen, setIsAudioStudioOpen] = useState(false);
  const [dualCameraConfig, setDualCameraConfig] = useState<DualCameraConfig>(
    dualCameraService.getConfig()
  );
  const [dualSecondaryStream, setDualSecondaryStream] = useState<MediaStream | null>(null);
  const [nightModeConfig, setNightModeConfig] = useState<NightModeConfig>({
    preset: 'auto',
    customSeconds: 3,
    iso: 800,
    isCapturing: false,
    progressPercent: 0,
    remainingSeconds: 0,
    isHardwareLongExposure: false,
    frameCount: 0,
    stabilityScore: 95,
  });
  const [wideSelfieConfig, setWideSelfieConfig] = useState<WideSelfieConfig>(
    wideSelfieService.getConfig()
  );
  const [slowMotionConfig, setSlowMotionConfig] = useState<SlowMotionConfig>(
    slowMotionService.getConfig()
  );
  const [timelapseConfig, setTimelapseConfig] = useState<TimelapseConfig>(
    timelapseService.getConfig()
  );
  const [portraitAperture, setPortraitAperture] = useState<number>(2.8);
  const [portraitBlurOn, setPortraitBlurOn] = useState<boolean>(true);
  // Subject detection (the Detect button; off at every launch) and the subject currently tracked
  const [detectOn, setDetectOn] = useState(false);
  const [subjectBox, setSubjectBox] = useState<SubjectBox | null>(null);
  const [showPortraitEyeline, setShowPortraitEyeline] = useState<boolean>(true);

  // Ultimate Cinematography Video Engine States (ARRI / RED / Sony VENICE / Blackmagic)
  const [cinemaConfig, setCinemaConfig] = useState<CinemaVideoConfig>(cinemaVideoService.getConfig());
  const [isSlateModalOpen, setIsSlateModalOpen] = useState(false);
  const [isDirectorMonitorOpen, setIsDirectorMonitorOpen] = useState(false);
  const [cinemaStorageEstimate, setCinemaStorageEstimate] = useState<{ freeGb: number; remainingMinutes: number }>({ freeGb: 64, remainingMinutes: 165 });
  const [cinemaAudioLevels, setCinemaAudioLevels] = useState<{ leftDb: number; rightDb: number; peakClipping: boolean }>({ leftDb: -60, rightDb: -60, peakClipping: false });

  useEffect(() => {
    const unsub = cinemaVideoService.subscribe((cfg) => {
      setCinemaConfig(cfg);
      if (cfg.anamorphicDeSqueeze !== proSettings.anamorphicDeSqueeze) {
        setProSettings((prev) => ({ ...prev, anamorphicDeSqueeze: cfg.anamorphicDeSqueeze }));
      }
    });

    const timer = window.setInterval(async () => {
      try {
        const est = await cinemaVideoService.getStorageEstimate();
        setCinemaStorageEstimate(est);
        const levels = cinemaVideoService.getAudioLevels();
        setCinemaAudioLevels(levels);
      } catch {}
    }, 400);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [proSettings.anamorphicDeSqueeze]);

  // Device Hardware Intelligence & Intelligent Lens States
  const [hardwareReport, setHardwareReport] = useState<DeviceHardwareReport | null>(null);
  const [isHardwareInspectorOpen, setIsHardwareInspectorOpen] = useState(false);
  const [zoomMagnificationType, setZoomMagnificationType] = useState<ZoomMagnificationType>('optical_lens');
  const [lensSelectionFeedback, setLensSelectionFeedback] = useState<string | null>(null);

  useEffect(() => {
    hardwareIntelligenceService.scanHardware().then((rep) => {
      setHardwareReport(rep);
    });
    return hardwareIntelligenceService.onReportUpdate((rep) => {
      setHardwareReport(rep);
    });
  }, []);

  useEffect(() => {
    if (lensSelectionFeedback) {
      const t = setTimeout(() => setLensSelectionFeedback(null), 3500);
      return () => clearTimeout(t);
    }
  }, [lensSelectionFeedback]);

  // Synchronize active LUT
  useEffect(() => {
    lutStorageService.init().then(() => {
      if (lookState.activeLutId) {
        setActiveLut(lutStorageService.getLutById(lookState.activeLutId) || null);
      } else {
        setActiveLut(null);
      }
    });
  }, [lookState.activeLutId]);

  // Persist look settings
  useEffect(() => {
    try {
      localStorage.setItem('cinegrid_look_state', JSON.stringify(lookState));
    } catch {}
  }, [lookState]);

  useEffect(() => {
    cameraProfileStore.setActiveId(lookState.cameraProfileId ?? null);
  }, [lookState.cameraProfileId]);

  // Persist Ghost Overlay settings
  useEffect(() => {
    try {
      localStorage.setItem('cinegrid_ghost_overlay', JSON.stringify(ghostSettings));
    } catch {}
  }, [ghostSettings]);

  // Initial startup: check license entitlement session & hash routing
  useEffect(() => {
    perfMark('app-mounted');
    if (!LICENSE_ENFORCED) {
      // Trial build: no gate. (No fake session either; see LICENSE_ENFORCED in config.ts.)
      setIsLicenseActivated(true);
      setLicenseSession(null);
    } else {
      licenseService.checkInitialActivation().then((res) => {
      if (!res.isActivated) {
        // No valid, server-issued entitlement: show the activation screen.
        setIsLicenseActivated(false);
        setLicenseSession(null);
        if (res.warningMessage) {
          setActivationWarning(res.warningMessage);
        }
      } else {
        setIsLicenseActivated(true);
        setLicenseSession(res.session);
        if (res.warningMessage) {
          setActivationWarning(res.warningMessage);
        }
      }
      });
    }

    // Restore persisted captures from IndexedDB
    mediaStorageService.loadAllPhotos().then((photos) => {
      if (photos && photos.length > 0) {
        // Merge, never overwrite: photos taken while this was loading must stay
        setCapturedPhotos((prev) => {
          const have = new Set(prev.map((p) => p.id));
          return [...prev, ...photos.filter((p) => !have.has(p.id))].sort((a, b) => b.timestamp - a.timestamp);
        });
      }
    }).catch(console.warn);

    const handleHash = () => {
      if (ADMIN_ENABLED && window.location.hash === '#admin') {
        setIsAdminDashboardOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Memory: move every freshly captured/edited photo's Base64 out of React state (blob URLs + small thumbnail).
  const compactingIds = useRef(new Set<string>());
  const compactQueue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    for (const p of capturedPhotos) {
      if (!needsCompaction(p) || compactingIds.current.has(p.id)) continue;
      compactingIds.current.add(p.id);
      // One photo at a time: converting many multi-megabyte images in parallel spikes memory (it killed the renderer)
      compactQueue.current = compactQueue.current.then(() =>
        compactPhoto(p)
          .then((c) => {
            setCapturedPhotos((prev) =>
              prev.map((x) =>
                x.id === p.id && x.dataUrl === p.dataUrl && x.lookDataUrl === p.lookDataUrl && x.editedDataUrl === p.editedDataUrl ? c : x
              )
            );
            persistCompact(c);
          })
          .catch((e) => console.warn('[memory] compaction failed', e))
          .finally(() => compactingIds.current.delete(p.id))
      );
    }
  }, [capturedPhotos]);

  // Videos get a real poster-frame thumbnail (they used to show broken-image text in the gallery and the strip)
  useEffect(() => {
    for (const p of capturedPhotos) {
      const needsThumb =
        p.mediaType === 'video' && p.dataUrl.includes('/files/recordings/') && !p.thumbnailUrl.includes('_thumb.jpg');
      if (!needsThumb || compactingIds.current.has(p.id)) continue;
      compactingIds.current.add(p.id);
      compactQueue.current = compactQueue.current.then(() =>
        makeVideoThumb(p.id, p.dataUrl)
          .then((thumb) => {
            if (!thumb) return;
            const updated = { ...p, thumbnailUrl: thumb };
            setCapturedPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, thumbnailUrl: thumb } : x)));
            persistCompact(updated);
          })
          .catch((e) => console.warn('[memory] video thumbnail failed', e))
          .finally(() => compactingIds.current.delete(p.id))
      );
    }
  }, [capturedPhotos]);

  // Hardware details are read from the camera again on every camera switch and whenever the app comes back to the
  // front, so the focal length, aperture and stabilization shown are never stale or guessed.
  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;
      refreshNativeCapabilities().then((c) => {
        if (!c) return;
        hardwareIntelligenceService.applyNativeSpecs(c);
        setNativeCaps(c);
      });
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [isFrontCamera]);
  // Mobile frame simulator vs responsive view (always responsive on native Android/iOS)
  const [frameMode, setFrameMode] = useState<'mobile-frame' | 'responsive'>(() =>
    Capacitor.isNativePlatform() ? 'responsive' : 'mobile-frame'
  );

  // Native Android hardware Back button integration
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let sub: any = null;
    CapacitorApp.addListener('backButton', () => {
      // 1. Dismiss Photo Editor & Review modal
      if (isPhotoEditorOpen) {
        setIsPhotoEditorOpen(false);
        return;
      }
      if (reviewingPhoto) {
        setReviewingPhoto(null);
        return;
      }
      // 2. Dismiss open drawers and tool sheets
      if (isProDrawerOpen) {
        setIsProDrawerOpen(false);
        return;
      }
      if (traySheet) {
        setTraySheet(null);
        return;
      }
      // 3. Dismiss secondary and primary modals
      if (isGalleryOpen) {
        setIsGalleryOpen(false);
        return;
      }
      if (isReferenceModalOpen) {
        setIsReferenceModalOpen(false);
        return;
      }
      if (isCustomizerOpen) {
        setIsCustomizerOpen(false);
        return;
      }
      if (isMasterPresetsOpen) {
        setIsMasterPresetsOpen(false);
        return;
      }
      if (isLicenseInfoOpen) {
        setIsLicenseInfoOpen(false);
        return;
      }
      if (isAdminDashboardOpen) {
        setIsAdminDashboardOpen(false);
        return;
      }
      if (isContactAdminOpen) {
        setIsContactAdminOpen(false);
        return;
      }
      if (isAudioStudioOpen) {
        setIsAudioStudioOpen(false);
        return;
      }
      if (isExportStudioOpen) {
        setIsExportStudioOpen(false);
        return;
      }
      if (isLookModalOpen) {
        setIsLookModalOpen(false);
        return;
      }
      if (isSessionsModalOpen) {
        setIsSessionsModalOpen(false);
        return;
      }
      if (isSlateModalOpen) {
        setIsSlateModalOpen(false);
        return;
      }
      if (isGhostDrawerOpen) {
        setIsGhostDrawerOpen(false);
        return;
      }
      if (isDirectorMonitorOpen) {
        setIsDirectorMonitorOpen(false);
        return;
      }
      if (isHardwareInspectorOpen) {
        setIsHardwareInspectorOpen(false);
        return;
      }
      // Safety net: any other full-screen panel that is open gets its own close/back button pressed, so Back never
      // quits the app while something is still on screen.
      const overlays = Array.from(document.querySelectorAll<HTMLElement>('.fixed.inset-0.z-50'));
      const top = overlays[overlays.length - 1];
      if (top) {
        const closer = Array.from(top.querySelectorAll<HTMLElement>('button')).find((b) =>
          /close|cancel|dismiss|back/i.test(`${b.getAttribute('aria-label') ?? ''} ${b.getAttribute('title') ?? ''}`)
        );
        if (closer) {
          closer.click();
          return;
        }
      }
      // 4. Return to main photo mode if in specialized mode
      if (proSettings.captureMode !== 'photo') {
        setProSettings((prev) => ({ ...prev, captureMode: 'photo' }));
        return;
      }

      // 5. Exit application if at root viewfinder
      CapacitorApp.exitApp();
    }).then((handle) => {
      sub = handle;
    });

    return () => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    };
  }, [
    isPhotoEditorOpen,
    reviewingPhoto,
    isProDrawerOpen,
    traySheet,
    isGalleryOpen,
    isReferenceModalOpen,
    isCustomizerOpen,
    isMasterPresetsOpen,
    isLicenseInfoOpen,
    isAdminDashboardOpen,
    isContactAdminOpen,
    isAudioStudioOpen,
    isExportStudioOpen,
    isLookModalOpen,
    isSessionsModalOpen,
    isSlateModalOpen,
    isGhostDrawerOpen,
    isDirectorMonitorOpen,
    isHardwareInspectorOpen,
    proSettings.captureMode,
  ]);

  // Persist grid settings
  useEffect(() => {
    try {
      localStorage.setItem('cinegrid_style', JSON.stringify(gridStyle));
    } catch {}
  }, [gridStyle]);

  useEffect(() => {
    try {
      localStorage.setItem('cinegrid_secondary', JSON.stringify(secondaryGuides));
    } catch {}
  }, [secondaryGuides]);

  useEffect(() => {
    try {
      localStorage.setItem('cinegrid_selected_id', selectedGrid.id);
    } catch {}
  }, [selectedGrid.id]);

  // Persist Photo and Video Pro Settings independently
  useEffect(() => {
    try {
      if (proSettings.captureMode === 'photo') {
        localStorage.setItem('cinegrid_pro_photo_settings', JSON.stringify(proSettings));
      } else {
        localStorage.setItem('cinegrid_pro_video_settings', JSON.stringify(proSettings));
      }
    } catch {}
  }, [proSettings]);

  // Enumerate physical lenses
  useEffect(() => {
    cameraService.enumerateAvailableLenses().then(setAvailableLenses);
  }, []);

  // Resolutions the phone reported but could not actually deliver smoothly when tried (see the frame-rate check)
  const [unusableVideoRes, setUnusableVideoRes] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cinegrid_unusable_video_res') || '[]');
    } catch {
      return [];
    }
  });

  // What this phone's camera and recorder can really do for video (from Camera2 + MediaRecorder), nothing invented
  const videoCaps = useMemo(() => {
    const sizes = pickNativeCamera(nativeCaps, isFrontCamera ? 'front' : 'back')?.videoSizes;
    // Camera2 lists the sizes it can record. Anything at or below the largest listed size is also available (the
    // report may only list the biggest few), and its frame rate is the best of the sizes that are at least as big.
    const maxFpsByHeight = new Map<number, number>();
    const usable = (sizes ?? []).filter((s) => s.maxFps >= 24);
    const maxHeight = Math.max(0, ...usable.map((s) => Math.min(s.width, s.height)));
    for (const h of [2160, 1080, 720]) {
      const fps = Math.max(0, ...usable.filter((s) => Math.min(s.width, s.height) >= h).map((s) => s.maxFps));
      if (fps > 0) maxFpsByHeight.set(h, fps);
    }
    const resolutions: CinemaVideoConfig['resolution'][] = [];
    if (!sizes || usable.length === 0) resolutions.push('1080p', '720p');
    else {
      if (maxHeight >= 2160) resolutions.push('4k');
      if (maxHeight >= 1080) resolutions.push('1080p');
      if (maxHeight >= 720) resolutions.push('720p');
      if (resolutions.length === 0) resolutions.push('720p');
    }
    // drop sizes this phone was measured not to sustain (never drop the last one)
    for (const bad of unusableVideoRes) {
      const i = resolutions.indexOf(bad as CinemaVideoConfig['resolution']);
      if (i >= 0 && resolutions.length > 1) resolutions.splice(i, 1);
    }
    const codecs: CinemaVideoConfig['codec'][] = [];
    const mr = typeof MediaRecorder !== 'undefined' ? MediaRecorder : null;
    if (mr?.isTypeSupported('video/mp4;codecs=hevc') || mr?.isTypeSupported('video/mp4;codecs=hvc1')) codecs.push('hevc');
    if (mr?.isTypeSupported('video/mp4;codecs=avc1')) codecs.push('h264');
    if (mr?.isTypeSupported('video/webm;codecs=vp9')) codecs.push('vp9');
    if (codecs.length === 0) codecs.push('vp9');
    return { resolutions, maxFpsByHeight, codecs };
  }, [nativeCaps, isFrontCamera, unusableVideoRes]);
  const heightOfRes = (r: CinemaVideoConfig['resolution']) => (r === '4k' ? 2160 : r === '720p' ? 720 : 1080);
  const availableFps = useMemo(() => {
    const maxFps = videoCaps.maxFpsByHeight.get(heightOfRes(cinemaConfig.resolution)) ?? 30;
    return [24, 25, 30, 60].filter((f) => f <= maxFps);
  }, [videoCaps, cinemaConfig.resolution]);

  // Keep the stored choice inside what exists (e.g. an old "4K / HEVC" default on a phone that has neither)
  useEffect(() => {
    const patch: Partial<CinemaVideoConfig> = {};
    if (!videoCaps.resolutions.includes(cinemaConfig.resolution)) {
      patch.resolution = videoCaps.resolutions.includes('1080p') ? '1080p' : videoCaps.resolutions[0];
    }
    if (!availableFps.includes(cinemaConfig.fps)) {
      patch.fps = (availableFps.includes(30) ? 30 : availableFps[availableFps.length - 1]) as CinemaVideoConfig['fps'];
    }
    if (!videoCaps.codecs.includes(cinemaConfig.codec)) {
      patch.codec = videoCaps.codecs.includes('h264') ? 'h264' : videoCaps.codecs[0];
    }
    if (Object.keys(patch).length) cinemaVideoService.updateConfig(patch);
  }, [videoCaps, availableFps, cinemaConfig.resolution, cinemaConfig.fps, cinemaConfig.codec]);

  // Video mode asks the camera for the chosen size and frame rate; the default 1080p/30 needs no restart.
  // Dual mode runs two cameras and a compositor, so its main camera is limited to 720p to keep the phone from running out of memory.
  const videoFormatKey =
    proSettings.captureMode === 'dual'
      ? 'dual-720p'
      : proSettings.captureMode === 'video' && (cinemaConfig.resolution !== '1080p' || cinemaConfig.fps !== 30)
        ? `${cinemaConfig.resolution}@${cinemaConfig.fps}`
        : 'default';
  const videoFormatRef = useRef<{ height: number; fps: number } | undefined>(undefined);
  videoFormatRef.current =
    videoFormatKey === 'default'
      ? undefined
      : videoFormatKey === 'dual-720p'
        ? { height: 720, fps: 30 }
        : { height: heightOfRes(cinemaConfig.resolution), fps: cinemaConfig.fps };

  // Start real device camera with concurrency & state machine coordination
  // True while the native film camera is meant to own the camera: the web camera must not be opened then.
  const nativeWantedRef = useRef(false);
  const initCamera = useCallback(async (deviceId?: string) => {
    if (nativeWantedRef.current) return;
    setCameraError(null);
    // Opening (or re-opening for a new format/lens) takes a moment: show the "starting camera" state, never a blank frame
    setCameraReady(false);
    perfMark('camera-request-start');
    try {
      const targetFacing = isFrontCamera ? 'user' : 'environment';
      const newStream = await cameraService.acquireCameraStream(deviceId, targetFacing, videoFormatRef.current);

      streamRef.current = newStream;
      setStream(newStream);
      setCameraReady(true);
      perfMark('camera-stream-acquired');
      setUseSimulatedScene(false);

      if (videoRef.current) {
        await cameraService.attachVideo(videoRef.current, newStream);
      }

      const track = newStream.getVideoTracks()[0];
      const capabilities = (track && track.getCapabilities ? track.getCapabilities() : {}) as { torch?: boolean };
      setHasTorch(!!(capabilities && capabilities.torch));
      // A new stream always starts with the torch off, so keep the UI honest
      setTorchOn(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('cancelled by newer request')) {
        return;
      }
      console.warn('Real camera initialization fallback:', err);
      const errMsg = err instanceof Error ? err.message : 'Camera could not be accessed';
      setCameraError(errMsg);
      setUseSimulatedScene(true);
      setCameraReady(true);
    }
    // videoFormatKey is a dependency on purpose: changing resolution/fps re-opens the camera with the new format
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFrontCamera, videoFormatKey]);

  useEffect(() => {
    initCamera(activeDeviceId);
    const videoEl = videoRef.current;
    return () => {
      cameraService.detachVideo(videoEl);
      cameraService.releaseCurrentStream();
    };
  }, [initCamera, activeDeviceId]);

  // Ensure videoRef attaches stream if stream was acquired before DOM mounted
  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      cameraService.attachVideo(videoRef.current, stream);
    }
  }, [stream]);

  // Handle visibility changes (app in background/foreground)
  // Android can stop the camera while another screen (file picker, permission dialog, another app) covers
  // this one. On return, make sure the track is live and frames are really advancing; otherwise restart it.
  const recoverTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const checkCameraAlive = () => {
      if (document.hidden) return;
      const video = videoRef.current;
      const track = streamRef.current?.getVideoTracks()[0];
      if (!video || !streamRef.current) return;
      if (!track || track.readyState === 'ended') {
        initCamera(activeDeviceId);
        return;
      }
      if (video.paused) video.play().catch(() => {});
      const before = video.currentTime;
      if (recoverTimerRef.current) window.clearTimeout(recoverTimerRef.current);
      recoverTimerRef.current = window.setTimeout(() => {
        const v = videoRef.current;
        if (!v || document.hidden) return;
        const t = streamRef.current?.getVideoTracks()[0];
        // Frames not advancing, or the track went muted/ended while we were away: acquire the camera again
        if (!t || t.readyState === 'ended' || t.muted || (!v.paused && v.currentTime === before)) {
          initCamera(activeDeviceId);
        }
      }, 1500);
    };
    const handleVis = () => {
      cameraService.handleVisibilityChange(!document.hidden);
      if (!document.hidden) checkCameraAlive();
    };
    document.addEventListener('visibilitychange', handleVis);
    let appStateHandle: { remove: () => void } | null = null;
    let disposed = false;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) checkCameraAlive();
    })
      .then((h) => {
        if (disposed) h.remove();
        else appStateHandle = h;
      })
      .catch(() => {});
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVis);
      appStateHandle?.remove();
      if (recoverTimerRef.current) window.clearTimeout(recoverTimerRef.current);
    };
  }, [initCamera, activeDeviceId]);

  // Zoom = what the camera hardware can do + a digital crop for the remainder (never both for the same part).
  const hwZoomRange = useMemo(() => cameraService.getZoomRange(stream), [stream]);
  // Zoom factor the active physical lens already represents (e.g. 3 on a 3x telephoto lens).
  const [lensBaseZoom, setLensBaseZoom] = useState(1);
  const activeDeviceRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    activeDeviceRef.current = activeDeviceId;
  }, [activeDeviceId]);
  const hasUltraWideLens =
    availableLenses.some((l) => l.role === 'ultrawide' || l.facing === 'ultrawide') ||
    !!hardwareReport?.opticalLensSteps?.some((s) => s.factor < 1);
  // Selfie cameras only get a modest digital crop (like stock camera apps); 24x on a front sensor is just mush.
  const limits = zoomLimits(hwZoomRange, lensBaseZoom, hasUltraWideLens, Math.min(maxZoomFor(proSettings.captureMode), isFrontCamera ? 4 : 24));
  const zoomPlan = planZoom(zoomLevel, hwZoomRange, lensBaseZoom);

  // Re-apply the hardware share of the zoom whenever a new track appears (lens switch, camera restart).
  useEffect(() => {
    if (stream && zoomPlan.hardwareZoom !== null) {
      cameraService.applyHardwareZoom(stream, zoomPlan.hardwareZoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  const handleZoomChange = (requested: number) => {
    const z = Math.min(limits.max, Math.max(limits.min, requested));
    setZoomLevel(z);
    const sel = hardwareIntelligenceService.selectBestLensForRequest({
      requestedZoom: z,
      captureMode: proSettings.captureMode,
      currentFacing: isFrontCamera ? 'front' : 'back',
    });

    let base = lensBaseZoom;
    // A lens only absorbs the zoom when its own optical factor really is the requested zoom. Front cameras and
    // single-lens devices report "exact match" for every request; trusting that would cancel the digital crop.
    const absorbed = lensAbsorbedZoom(sel.isExactPhysicalMatch, sel.selectedLens.opticalZoomFactor, z);
    if (absorbed !== null) {
      base = absorbed;
      setLensBaseZoom(absorbed);
      const target = sel.selectedLens.deviceId;
      if (target && target !== activeDeviceRef.current) {
        activeDeviceRef.current = target;
        setActiveDeviceId(target);
        initCamera(target);
        setLensSelectionFeedback(sel.selectionReason);
      }
    }

    const plan = planZoom(z, hwZoomRange, base);
    // A digital crop is never reported as optical.
    setZoomMagnificationType(plan.isDigital ? 'digital' : sel.zoomType);
    if (plan.hardwareZoom !== null) {
      cameraService.applyHardwareZoom(stream, plan.hardwareZoom);
    }
  };

  // A look is on when a LUT or a non-"none" filter is applied; the rail's × clears all of it at once.
  const lookIsActive = !!activeLut || !!lookState.activeLutId || !!lookState.activeFilterId || selectedFilter.id !== 'none';
  const handleRemoveLook = () => {
    setSelectedFilter(CAMERA_FILTERS.find((f) => f.id === 'none') ?? CAMERA_FILTERS[0]);
    setLookState((prev) => clearLook(prev));
    setActiveLut(null);
  };

  // Switching from photo (24x) to video (8x) must pull an over-limit zoom back into range.
  useEffect(() => {
    if (zoomLevel > limits.max + 0.01) handleZoomChange(limits.max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limits.max]);

  // Choose a physical lens directly (UW / 1x / TELE buttons); zoom follows that lens's native factor.
  const selectLensDevice = (id: string) => {
    if (id === activeDeviceRef.current) return;
    const factor = hardwareReport?.opticalLensSteps?.find((s) => s.deviceId === id)?.factor ?? 1;
    activeDeviceRef.current = id;
    setLensBaseZoom(factor);
    setZoomLevel(factor);
    setActiveDeviceId(id);
    initCamera(id);
  };
  // Professional controls are sent to the real camera track. Only what the hardware accepts counts as applied;
  // for the rest, EV and white balance fall back to a software adjustment and ISO/shutter stay unavailable.
  const controlSupport = useMemo(() => readSupport(stream?.getVideoTracks()[0]), [stream]);
  const [hwControls, setHwControls] = useState<AppliedControls>(NO_CONTROLS_APPLIED);
  // Only the fields that change camera behaviour trigger re-application (not recording timers etc.).
  const controlKey = JSON.stringify([
    proSettings.isoAuto, proSettings.iso, proSettings.shutterAuto, proSettings.shutterMode, proSettings.shutterSpeed,
    proSettings.shutterAngle, proSettings.videoFps, proSettings.captureMode, proSettings.ev, proSettings.exposureLocked,
    proSettings.wbAuto, proSettings.whiteBalance, proSettings.focusMode, proSettings.manualFocus,
    proSettings.focusLocked, proSettings.focusLock,
  ]);
  const proSettingsRef = useRef(proSettings);
  proSettingsRef.current = proSettings;
  useEffect(() => {
    const track = stream?.getVideoTracks()[0];
    if (!track || proSettingsRef.current.captureMode === 'dual') {
      setHwControls(NO_CONTROLS_APPLIED);
      return;
    }
    let stale = false;
    const timer = window.setTimeout(() => {
      applyProSettings(track, proSettingsRef.current).then((applied) => {
        if (!stale) setHwControls(applied);
      });
    }, 150);
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [stream, controlKey]);
  const lockChain = useRef<Promise<unknown>>(Promise.resolve());
  // AE lock: find the manual exposure that matches what auto was showing, then hold it (see calibrateExposureLock)
  useEffect(() => {
    const track = stream?.getVideoTracks()[0];
    if (!proSettings.exposureLocked) {
      clearExposureLock();
      return;
    }
    if (!track || proSettings.captureMode === 'dual') return;
    let cancelled = false;
    lockChain.current = calibrateExposureLock(track, videoRef.current).then(async (ok) => {
      if (cancelled) return;
      if (!ok) {
        showToast('This camera can not hold exposure; lock is off');
        setProSettings((p) => ({ ...p, exposureLocked: false }));
        return;
      }
      setHwControls(await applyProSettings(track, proSettingsRef.current));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, proSettings.exposureLocked]);
  // ISO priority / shutter priority: when only one of ISO / shutter is fixed, balance the other so the picture stays properly exposed
  const semiKey = semiAutoKey(proSettings);
  useEffect(() => {
    const track = stream?.getVideoTracks()[0];
    if (!semiKey || proSettings.exposureLocked || proSettings.captureMode === 'dual') {
      clearSemiAuto();
      return;
    }
    if (!track) return;
    let cancelled = false;
    lockChain.current = lockChain.current.then(async () => {
      if (cancelled) return;
      const ok = await calibrateSemiAuto(track, videoRef.current, proSettingsRef.current);
      if (cancelled || !ok) return;
      setHwControls(await applyProSettings(track, proSettingsRef.current));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, semiKey, proSettings.exposureLocked]);
  // AF lock: sweep the focus range, hold the sharpest position (see calibrateFocusLock). Fails honestly if nothing to lock on.
  useEffect(() => {
    const track = stream?.getVideoTracks()[0];
    if (!proSettings.focusLocked) {
      clearFocusLock();
      return;
    }
    if (!track || proSettings.captureMode === 'dual') return;
    let cancelled = false;
    showToast('Locking focus…', 2500);
    // wait for the exposure calibration so the sweep sees a steady picture
    lockChain.current = lockChain.current.then(async () => {
      if (cancelled) return;
      // find what the user is pointing at, so the lock measures sharpness on that subject (not the whole centre)
      let roi: ReturnType<typeof boxToVideoRoi> | null = null;
      try {
        const v = videoRef.current;
        if (v && v.videoWidth > 0) {
          const vis = visibleRect(v.videoWidth, v.videoHeight, aspectRatio, zoomPlan.digitalScale);
          const W = 192;
          const H = Math.max(8, Math.round((W * vis.h) / vis.w));
          const cv = document.createElement('canvas');
          cv.width = W;
          cv.height = H;
          const cx = cv.getContext('2d', { willReadFrequently: true });
          if (cx) {
            if (mirrorActive) {
              cx.translate(W, 0);
              cx.scale(-1, 1);
            }
            cx.drawImage(v, vis.x, vis.y, vis.w, vis.h, 0, 0, W, H);
            const box = subjectBox ?? (await detectFace(cv)) ?? detectSalientSubject(cx.getImageData(0, 0, W, H).data, W, H);
            if (box) {
              const shrink = 0.8; // the middle of the subject, away from its background edges
              const inner = { x: box.x + (box.w * (1 - shrink)) / 2, y: box.y + (box.h * (1 - shrink)) / 2, w: box.w * shrink, h: box.h * shrink };
              roi = boxToVideoRoi(inner, v.videoWidth, v.videoHeight, aspectRatio, zoomPlan.digitalScale, false);
            }
          }
          cv.width = 0;
        }
      } catch {
        roi = null;
      }
      if (cancelled) return;
      // The lens is moved through its range to measure sharpness; show a still of the current picture meanwhile so
      // the user does not watch the picture go blurry (the measurement reads the live video underneath).
      setFreezeFrame(snapshotFrame(videoRef.current));
      let ok = false;
      try {
        ok = await calibrateFocusLock(track, videoRef.current, roi);
      } finally {
        setFreezeFrame(null);
      }
      if (cancelled) return;
      if (!ok) {
        showToast('Focus could not be locked on this view (nothing sharp to lock on, or fixed focus)', 4500);
        setProSettings((p) => ({ ...p, focusLocked: false }));
        return;
      }
      setHwControls(await applyProSettings(track, proSettingsRef.current));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, proSettings.focusLocked]);
  // Settings used for the software look: anything the hardware already applied is not applied twice.
  const previewPro = useMemo(
    () => ({
      ...proSettings,
      // Software ISO and shutter join the software EV when the camera could not apply them itself
      ev: (hwControls.ev ? 0 : proSettings.ev) + softwareExposureStops(proSettings, hwControls),
      whiteBalance: hwControls.whiteBalance ? NEUTRAL_WHITE_BALANCE : proSettings.whiteBalance,
    }),
    [proSettings, hwControls]
  );
  // Portrait mode background softening follows the chosen aperture; other modes have none
  const portraitBlur = proSettings.captureMode === 'portrait' && portraitBlurOn ? portraitBlurStrength(portraitAperture) : 0;
  // the sharp area follows the detected subject (centre when none is found)
  const portraitFocus = useMemo(() => (portraitBlur > 0 && subjectBox ? focusFromBox(subjectBox) : null), [portraitBlur > 0, subjectBox]);
  // Keep the shared SVG tint filter in step with the Tint slider (preview and capture both read it)
  const currentTint = effectiveTint(proSettings);
  useEffect(() => {
    setTintFilter(currentTint);
  }, [currentTint]);
  // Native film camera (Camera2 -> GPU film shader) while a film camera is selected in photo mode on Android.
  useSyncExternalStore(cameraProfileStore.subscribe, cameraProfileStore.getRevision);
  const activeFilmProfile = cameraProfileStore.get(lookState.cameraProfileId);
  const nativeFilm = useNativeFilmCamera({
    wanted: Boolean(activeFilmProfile) && (proSettings.captureMode === 'photo' || proSettings.captureMode === 'video') && !useSimulatedScene,
    profile: activeFilmProfile,
    front: isFrontCamera,
    zoom: zoomLevel,
    evStops: proSettings.ev,
    releaseWebCamera: () => {
      cameraService.detachVideo(videoRef.current);
      cameraService.releaseCurrentStream();
      streamRef.current = null;
      setStream(null);
    },
    restoreWebCamera: () => {
      initCamera(activeDeviceId);
    },
  });
  nativeWantedRef.current = nativeFilm.intended;
  // The flash button reflects the camera's real flash unit while native owns the camera.
  const nativeHasFlash = nativeFilm.active ? Boolean(nativeFilm.info?.hasFlash) : null;
  useEffect(() => {
    if (nativeHasFlash !== null) setHasTorch(nativeHasFlash);
  }, [nativeHasFlash]);

  // Switch the torch and confirm the camera really did it
  const setTorch = async (nextState: boolean, quiet = false): Promise<boolean> => {
    if (nativeFilm.active) {
      try {
        await nativeFilm.setTorch(nextState);
        setTorchOn(nextState);
        return true;
      } catch {
        setTorchOn(false);
        if (!quiet) showToast('Could not switch the flash');
        return false;
      }
    }
    const track = stream?.getVideoTracks()[0];
    const caps = (track?.getCapabilities ? track.getCapabilities() : {}) as { torch?: boolean };
    if (!track || !caps.torch) {
      if (!quiet) showToast(isFrontCamera ? 'Front camera has no flash' : 'Flash is not available on this camera');
      return false;
    }
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: nextState }] });
      const actual = (track.getSettings() as { torch?: boolean }).torch;
      if (actual !== undefined && actual !== nextState) throw new Error('torch not applied');
      setTorchOn(nextState);
      return true;
    } catch {
      setTorchOn(false);
      if (!quiet) showToast('Could not switch the flash');
      return false;
    }
  };

  // Flash mode like other camera apps: Off, Auto (fires only for a dark photo), On (torch stays lit)
  const [flashMode, setFlashMode] = useState<'off' | 'auto' | 'on'>(() => loadPrefs().flashMode ?? 'off');
  useEffect(() => {
    savePrefs({ aspectRatio, filterId: selectedFilter.id, filterStrength, timer: selectedTimer, hdr: hdrEnabled, flashMode });
  }, [aspectRatio, selectedFilter, filterStrength, selectedTimer, hdrEnabled, flashMode]);
  const handleToggleTorch = async () => {
    const track = stream?.getVideoTracks()[0];
    const caps = (track?.getCapabilities ? track.getCapabilities() : {}) as { torch?: boolean };
    if (!(nativeFilm.active ? nativeFilm.info?.hasFlash : track && caps.torch)) {
      showToast(isFrontCamera ? 'Front camera has no flash' : 'Flash is not available on this camera');
      return;
    }
    const next = flashMode === 'off' ? 'auto' : flashMode === 'auto' ? 'on' : 'off';
    setFlashMode(next);
    await setTorch(next === 'on');
    if (next === 'auto') showToast('Flash auto: fires for photos in low light', 2500);
  };
  // A new camera stream starts with the torch off, so an "On" flash is re-applied after a flip / restart
  useEffect(() => {
    if (flashMode === 'on' && stream && hasTorch) setTorch(true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, hasTorch]);

  // Flip front/rear camera with intelligent sensor defaults
  const handleSwitchCamera = () => {
    const nextFacing = !isFrontCamera;
    setIsFrontCamera(nextFacing);
    setLensBaseZoom(1);
    setZoomLevel(1);
    activeDeviceRef.current = undefined;
    // Show the "starting camera" state right away instead of the stale stream's last (or empty) frame
    setCameraReady(false);
    setStream(null);
    if (nextFacing) {
      setSelfieControlsVisible(true);
    }

    if (hardwareReport) {
      const candidates = nextFacing ? hardwareReport.frontCameras : hardwareReport.rearCameras;
      if (candidates.length > 0) {
        const target = candidates.find((c) => c.role === (nextFacing ? 'front_wide' : 'wide')) || candidates[0];
        // The camera effect re-opens with the new facing + device; opening here too used the OLD facing and doubled the delay
        setActiveDeviceId(target.deviceId);
        return;
      }
    }
    setActiveDeviceId(undefined);
  };

  // Cycle aspect ratios
  const handleCycleAspectRatio = () => {
    // Every entry is a distinct frame shape (9:16 used to repeat 16:9 exactly, so it was dropped)
    const sequence: AspectRatio[] = ['4:3', '3:2', '16:9', '1:1', '2.39:1'];
    const curIdx = sequence.indexOf(aspectRatio);
    const nextIdx = (curIdx + 1) % sequence.length;
    setAspectRatio(sequence[nextIdx]);
  };

  // Toggle favorite for specific grid
  const handleToggleFavorite = (gridId: GridType) => {
    setGridList((prev) => {
      const updated = prev.map((g) =>
        g.id === gridId ? { ...g, isFavorite: !g.isFavorite } : g
      );
      try {
        const favIds = updated.filter((g) => g.isFavorite).map((g) => g.id);
        localStorage.setItem('cinegrid_favorites', JSON.stringify(favIds));
      } catch {}
      return updated;
    });

    if (selectedGrid.id === gridId) {
      setSelectedGrid((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
    }
  };

  // Apply one-touch master photography preset
  const handleApplyMasterPreset = (preset: MasterPhotographyPreset) => {
    setActivePresetId(preset.id);
    const targetGrid = COMPREHENSIVE_GRID_LIBRARY.find((g) => g.id === preset.gridType);
    if (targetGrid) {
      setSelectedGrid(targetGrid);
    }
    setAspectRatio(preset.aspectRatio);

    const targetFilter = CAMERA_FILTERS.find((f) => f.id === preset.filterId);
    if (targetFilter) {
      setSelectedFilter(targetFilter);
    }
    setFilterStrength(preset.filterStrength);

    setProSettings((prev) => ({
      ...prev,
      ev: preset.ev,
      shutterSpeed: preset.shutterSpeed || prev.shutterSpeed,
      iso: preset.iso || prev.iso,
      whiteBalance: preset.whiteBalance || prev.whiteBalance,
    }));
  };

  // Independent Camera Mode Switcher (Photo vs Video)
  const handleToggleCaptureMode = (targetMode?: 'photo' | 'video') => {
    const nextMode = targetMode || (proSettings.captureMode === 'photo' ? 'video' : 'photo');
    if (nextMode === proSettings.captureMode) return;

    // Save current mode's settings before switching
    try {
      const currentKey = proSettings.captureMode === 'photo' ? 'cinegrid_pro_photo_settings' : 'cinegrid_pro_video_settings';
      localStorage.setItem(currentKey, JSON.stringify(proSettings));

      const targetKey = nextMode === 'photo' ? 'cinegrid_pro_photo_settings' : 'cinegrid_pro_video_settings';
      const saved = localStorage.getItem(targetKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProSettings({ ...DEFAULT_PRO_SETTINGS, ...parsed, captureMode: nextMode });
        return;
      }
    } catch {}

    // Default configuration for target mode
    if (nextMode === 'video') {
      setProSettings((prev) => ({
        ...prev,
        captureMode: 'video',
        videoFps: 24,
        shutterSpeed: '1/48',
        shutterMode: 'angle',
        shutterAngle: 180.0,
        videoResolution: '1080p',
      }));
    } else {
      setProSettings((prev) => ({
        ...prev,
        captureMode: 'photo',
        shutterSpeed: '1/120',
        shutterMode: 'speed',
        iso: 100,
      }));
    }
  };

  // Helper to capture a single frame with optional EV adjustment
  const captureSingleFrameCore = async (evOffset: number = 0, tagSuffix: string = ''): Promise<CapturedPhoto | null> => {
    const previewSource = useSimulatedScene ? imageRef.current : videoRef.current;
    if (!previewSource) return null;

    const tempSettings = evOffset !== 0 ? { ...previewPro, ev: previewPro.ev + evOffset } : previewPro;

    const isLutActive = Boolean(
      (lookState?.cameraProfileId && cameraProfileStore.get(lookState.cameraProfileId)) ||
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

    const useLutCanvas = isLutActive && !!lutCanvasRef.current && lutCanvasRef.current.width > 0;

    // Real still from the phone's still pipeline (full sensor resolution) when no LUT canvas is needed;
    // otherwise, or if unavailable, the preview frame as before.
    const frameRatio = frameWidthOverHeight(aspectRatio);
    // Native film camera: the photo comes from Camera2 (EV, white balance and zoom were applied by the camera itself),
    // so none of them may be applied again below.
    const native = nativeFilm.active;
    const digitalScale = native ? 1 : zoomPlan.digitalScale;
    let nativeBitmap: ImageBitmap | null = null;
    if (native) {
      try {
        nativeBitmap = (await nativeFilm.takePhoto()).bitmap;
      } catch (err) {
        showToast(`Photo failed: ${(err as Error)?.message || 'the camera could not take it'}`, 3500);
        return null;
      }
    }
    const fullRes = native
      ? nativeBitmap
      : !useSimulatedScene
        ? await cameraService.takeFullResStill(videoRef.current, 4000, Math.max(frameRatio, 1 / frameRatio))
        : null;
    const source: HTMLVideoElement | HTMLImageElement | ImageBitmap = fullRes ?? previewSource;
    // With a look on, grade the full-resolution still with the same shader as the preview. If the GPU cannot,
    // fall back to the preview-resolution canvas (the previous behaviour) instead of faking detail.
    const lookStill =
      (useLutCanvas || native) && fullRes
        ? renderLookStill(fullRes, lookState, activeLut, cameraProfileStore.get(lookState.cameraProfileId), {
            ratio: frameRatio,
            zoom: digitalScale,
          })
        : null;
    if (native && isLutActive && !lookStill) showToast('The film look could not be applied to this photo (GPU unavailable)', 3500);
    const captureSource = lookStill ? lookStill.canvas : useLutCanvas ? lutCanvasRef.current! : source;
    const skipCss = useLutCanvas || native;

    try {
    const dataUrl = captureFrameToDataUrl(
      captureSource,
      selectedFilter,
      filterStrength,
      tempSettings,
      aspectRatio,
      proSettings.burnGridInExport ? selectedGrid.id : undefined,
      skipCss,
      digitalScale,
      portraitBlur,
      mirrorActive,
      portraitFocus
    );
    lookStill?.dispose();

    if (!dataUrl) return null;

    // The original is the untouched sensor frame (aspect crop only). The processed frame the user saw
    // in the viewfinder is stored separately, so BEFORE/AFTER compares two real images.
    const hasLook =
      isLutActive ||
      (selectedFilter.id !== 'none' && filterStrength > 0) ||
      tempSettings.ev !== 0 ||
      tempSettings.whiteBalance !== NEUTRAL_WHITE_BALANCE ||
      effectiveTint(tempSettings) !== 0 ||
      portraitBlur > 0 ||
      Boolean(proSettings.burnGridInExport && selectedGrid.id !== 'none');
    const originalUrl = hasLook
      ? captureFrameToDataUrl(
          source,
          CAMERA_FILTERS.find((f) => f.id === 'none') ?? CAMERA_FILTERS[0],
          0,
          { ...proSettings, ev: 0, whiteBalance: NEUTRAL_WHITE_BALANCE, tint: 0, wbTint: 0, burnGridInExport: false },
          aspectRatio,
          undefined,
          false,
          digitalScale,
          0,
          mirrorActive
        )
      : dataUrl;
    if (!originalUrl) return null;

    const filterName = activeLut
      ? `LUT: ${activeLut.name}`
      : lookState.activeFilterId
      ? `Look: ${lookState.activeFilterId}`
      : selectedFilter.name;

    return {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dataUrl: originalUrl,
      lookDataUrl: hasLook ? dataUrl : undefined,
      thumbnailUrl: dataUrl,
      timestamp: Date.now(),
      aspectRatio,
      filterUsed: filterName,
      gridUsed: `${selectedGrid.name}${tagSuffix}`,
      proSettings: {
        iso: tempSettings.iso,
        shutter: tempSettings.shutterSpeed,
        kelvin: tempSettings.whiteBalance,
        ev: tempSettings.ev,
      },
    };
    } finally {
      // Release the full-resolution bitmap's memory as soon as the JPEGs are made (dispose is idempotent)
      lookStill?.dispose();
      fullRes?.close();
    }
  };

  // Same capture, with its real end-to-end time recorded for the performance probe.
  const captureSingleFrame = async (evOffset: number = 0, tagSuffix: string = ''): Promise<CapturedPhoto | null> => {
    const t0 = performance.now();
    try {
      return await captureSingleFrameCore(evOffset, tagSuffix);
    } finally {
      renderProbe.recordCapture(performance.now() - t0);
    }
  };

  const nativeFacing: 'front' | 'back' = isFrontCamera ? 'front' : 'back';
  const stillSupport = useMemo(() => stillSupportFor(nativeCaps, nativeFacing), [nativeCaps, nativeFacing]);
  // Measure the frame rate the phone really delivers in video mode. A format the WebView pipeline cannot keep up with
  // (e.g. 4K at ~2 fps) is stepped down automatically; a merely slow one gets an honest warning, once.
  const fpsCheckedRef = useRef(new Set<string>());
  useEffect(() => {
    if (proSettings.captureMode !== 'video' || !stream || !cameraReady) return;
    const v = videoRef.current;
    if (!v || typeof v.requestVideoFrameCallback !== 'function') return;
    const res = cinemaConfig.resolution;
    const target = cinemaConfig.fps;
    let cancelled = false;
    let frames = 0;
    let t0 = 0;
    const finish = () => {
      if (cancelled) return;
      const fps = frames / ((performance.now() - t0) / 1000);
      console.info(`[perf] video preview ${v.videoWidth}x${v.videoHeight}: ${fps.toFixed(1)} fps (target ${target})`);
      const key = `${res}@${target}`;
      if (fps < target * 0.5 && res !== '720p') {
        // Measured, not guessed: this size cannot be recorded smoothly here, so stop offering it on this phone
        const lower = res === '4k' ? '1080p' : '720p';
        setUnusableVideoRes((prev) => {
          const next = Array.from(new Set([...prev, res]));
          try {
            localStorage.setItem('cinegrid_unusable_video_res', JSON.stringify(next));
          } catch {}
          return next;
        });
        showToast(`${res === '4k' ? '4K' : res} is not usable on this phone (about ${Math.max(1, Math.round(fps))} fps). Using ${lower}.`, 6000);
        cinemaVideoService.updateConfig({ resolution: lower });
      } else if (fps < target * 0.8 && !fpsCheckedRef.current.has(key)) {
        fpsCheckedRef.current.add(key);
        showToast(`Preview runs at about ${Math.round(fps)} fps in ${res === '4k' ? '4K' : res} on this phone`, 6000);
      }
    };
    const timer = window.setTimeout(() => {
      t0 = performance.now();
      const tick = () => {
        if (cancelled) return;
        frames += 1;
        if (performance.now() - t0 < 3000) v.requestVideoFrameCallback(tick);
        else finish();
      };
      v.requestVideoFrameCallback(tick);
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, cameraReady, proSettings.captureMode, cinemaConfig.resolution, cinemaConfig.fps]);

  // What a video recording will really be: size and frame rate measured on the live track, codec the recorder will use
  const deliveredVideo = useMemo(() => {
    const s = stream?.getVideoTracks()[0]?.getSettings();
    const short = Math.min(s?.width ?? 0, s?.height ?? 0);
    const resolution = short >= 2160 ? '4K' : short > 0 ? `${short}p` : '—';
    const fps = s?.frameRate ? Math.round(s.frameRate) : cinemaConfig.fps;
    return { resolution, fps, codec: cameraService.resolveRecordingCodec(proSettings.videoCodec).label };
  }, [stream, proSettings.videoCodec, cinemaConfig.fps]);
  const deliveredVideoLabel = `${deliveredVideo.resolution} · ${deliveredVideo.fps} FPS · ${deliveredVideo.codec}`;

  // Subject detection ("Detect" button, off at every launch): outlines the face / main object and focuses on it
  useEffect(() => {
    const portraitTracking = proSettings.captureMode === 'portrait' && portraitBlurOn;
    if (!(detectOn || portraitTracking) || !stream || proSettings.captureMode === 'dual') {
      setSubjectBox(null);
      return;
    }
    let cancelled = false;
    let prev: SubjectBox | null = null;
    let lastFocusAt = 0;
    let lastFocus = { x: -1, y: -1 };
    let busy = false;
    const canvas = document.createElement('canvas');
    const tick = async () => {
      if (cancelled || busy) return;
      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || video.readyState < 2) return;
      busy = true;
      try {
        // analyse exactly what the viewfinder shows: aspect crop + digital zoom + mirror
        const ratio = frameWidthOverHeight(aspectRatio);
        let cw = video.videoWidth;
        let ch = cw / ratio;
        if (ch > video.videoHeight) {
          ch = video.videoHeight;
          cw = ch * ratio;
        }
        const zoom = Math.max(1, zoomPlan.digitalScale);
        cw /= zoom;
        ch /= zoom;
        const W = 192;
        const H = Math.max(8, Math.round(W / ratio));
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        if (mirrorActive) {
          ctx.save();
          ctx.translate(W, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, (video.videoWidth - cw) / 2, (video.videoHeight - ch) / 2, cw, ch, 0, 0, W, H);
        if (mirrorActive) ctx.restore();
        const face = await detectFace(canvas);
        const found = face ?? detectSalientSubject(ctx.getImageData(0, 0, W, H).data, W, H);
        prev = smoothBox(prev, found);
        if (cancelled) return;
        setSubjectBox(prev);
        // follow the subject with focus (auto focus only; never fight a manual or locked focus)
        const p = proSettingsRef.current;
        if (prev && p.focusMode !== 'manual' && !p.focusLocked) {
          const cx = prev.x + prev.w / 2;
          const cy = prev.y + prev.h / 2;
          const moved = Math.hypot(cx - lastFocus.x, cy - lastFocus.y) > 0.1;
          if (moved || performance.now() - lastFocusAt > 4000) {
            lastFocus = { x: cx, y: cy };
            lastFocusAt = performance.now();
            cameraService.applyTapToFocus(streamRef.current, cx, cy);
          }
        }
      } finally {
        busy = false;
      }
    };
    const id = window.setInterval(tick, 450);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      canvas.width = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectOn, stream, aspectRatio, zoomPlan.digitalScale, mirrorActive, proSettings.captureMode, portraitBlurOn]);
  // Elapsed time of whatever is recording right now (null when nothing is)
  const recSeconds: number | null = cinemaConfig.isRecording
    ? cinemaConfig.recordingElapsedSeconds
    : isRecordingVideo
      ? recordingDuration
      : slowMotionConfig.isSlowMoRecording
        ? slowMotionConfig.recordingDuration
        : timelapseConfig.isRecording
          ? Math.round(timelapseConfig.realDurationSeconds)
          : null;
  const formatClock = (total: number) => {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  // Focal length shown in the UI: the camera in use, as reported by Camera2 (35 mm equivalent). Never a guess.
  const reportedFocalMm: number | undefined =
    lensBaseZoom === 1 ? pickNativeCamera(nativeCaps, nativeFacing)?.equivalentMm : undefined;

  const showToast = (msg: string, ms = 3500) => {
    setGalleryToast(msg);
    setTimeout(() => setGalleryToast((cur) => (cur === msg ? null : cur)), ms);
  };

  /**
   * The WebView holds the camera while the live preview runs, so a native Camera2 capture needs it released first.
   * Runs the task, then re-opens the preview whatever happened.
   */
  const withNativeCamera = async <T,>(task: () => Promise<T>): Promise<T> => {
    const video = videoRef.current;
    cameraService.detachVideo(video);
    cameraService.releaseCurrentStream();
    if (video) video.srcObject = null;
    await new Promise((r) => setTimeout(r, 500));
    try {
      return await task();
    } finally {
      await initCamera(activeDeviceId);
    }
  };

  /** Adds a photo that native code already saved to the gallery to the in-app gallery and opens it. */
  const addNativePhoto = (jpegBase64: string, label: string) => {
    const dataUrl = `data:image/jpeg;base64,${jpegBase64}`;
    const photo: CapturedPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dataUrl,
      thumbnailUrl: dataUrl,
      timestamp: Date.now(),
      aspectRatio,
      filterUsed: label,
      gridUsed: selectedGrid.name,
      proSettings: {
        iso: proSettings.iso,
        shutter: proSettings.shutterSpeed,
        kelvin: proSettings.whiteBalance,
        ev: proSettings.ev,
      },
    };
    setCapturedPhotos((prev) => [photo, ...prev]);
    sessionService.addPhotoToActiveSession(photo.id);
    mediaStorageService.savePhoto(photo);
    setActiveSession(sessionService.getActiveSession());
    setTimeout(() => {
      setReviewingPhoto(photo);
      setIsPhotoEditorOpen(true);
    }, 350);
  };

  const captureNativeRaw = async () => {
    cameraAudio.playShutter();
    showToast('Capturing RAW…', 12000);
    try {
      const res = await withNativeCamera(() => nativeCapture.raw(nativeFacing));      addNativePhoto(res.jpegBase64, `RAW ${res.rawWidth}x${res.rawHeight} + DNG`);
      showToast(
        `Saved ${res.fileName} (RAW ${res.rawWidth}x${res.rawHeight}) + JPEG ${res.jpegWidth ?? '?'}x${res.jpegHeight ?? '?'} ` +
          `[asked ${res.jpegRequestedWidth ?? '?'}x${res.jpegRequestedHeight ?? '?'}, cam ${res.cameraId ?? '?'}]`,
        8000
      );
    } catch (err) {
      showToast(`RAW capture failed: ${err instanceof Error ? err.message : String(err)}`, 5000);
    }
  };

  const captureNativeStack = async (mode: 'hdr' | 'night', frames?: number) => {
    cameraAudio.playShutter();
    showToast(mode === 'hdr' ? 'Capturing HDR… hold steady' : 'Capturing night frames… hold steady', 15000);
    try {
      const res = await withNativeCamera(() => nativeCapture.stack(mode, nativeFacing, frames));
      addNativePhoto(
        res.jpegBase64,
        `${mode === 'hdr' ? 'HDR' : 'Night'} ${res.framesUsed}/${res.framesCaptured} frames ${res.width}x${res.height}`
      );
      showToast(`Saved ${res.fileName} (${res.framesUsed} of ${res.framesCaptured} frames merged)`);
    } catch (err) {
      showToast(`${mode === 'hdr' ? 'HDR' : 'Night'} capture failed: ${err instanceof Error ? err.message : String(err)}`, 5000);
    }
  };

  // Execute Photo Capture (Supporting Single, Burst, and AEB Bracketing) with State Machine Mutex
  const performCapture = async () => {
    if (isCapturing) return;
    // The web camera's state machine only allows capture while its own stream is ready. With the native film camera the
    // web stream is closed on purpose and the photo comes from Camera2, so that gate does not apply.
    if (!nativeFilm.active && !cameraService.beginCapture()) return;

    setIsCapturing(true);

    try {
      // 0. NATIVE CAPTURE: RAW/DNG and multi-frame HDR come from the phone's Camera2 pipeline
      if (proSettings.burstMode === 'off') {
        const wantRaw = proSettings.photoFormat === 'raw_dng' || proSettings.photoFormat === 'raw';
        if (wantRaw && stillSupport.raw) {
          await captureNativeRaw();
          return;
        }
        if (wantRaw && stillSupport.known && !stillSupport.raw) {
          showToast('This camera cannot shoot RAW: saving a JPEG instead', 4000);
        }
        if (hdrEnabled && stillSupport.hdr) {
          await captureNativeStack('hdr');
          return;
        }
      }

      // 1. BURST CAPTURE MODE (3 FPS or 10 FPS)
      if (proSettings.burstMode !== 'off') {
        const totalShots = proSettings.burstMode === '3fps' ? 3 : 10;
        const intervalMs = proSettings.burstMode === '3fps' ? 250 : 120;
        const burstShots: CapturedPhoto[] = [];

        for (let i = 1; i <= totalShots; i++) {
          setBurstProgress({ current: i, total: totalShots });
          cameraAudio.playShutter();
          setScreenFlash(true);
          setTimeout(() => setScreenFlash(false), 60);

          const photo = await captureSingleFrame(0, ` [Burst ${i}/${totalShots}]`);
          if (photo) {
            burstShots.unshift(photo);
            mediaStorageService.savePhoto(photo);
            const timeStr = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
            saveToDevice(currentPhotoUrl(photo), `CINEGRID_${timeStr}_BURST_${i}.jpg`).catch((err) =>
              console.warn('Burst save error:', err)
            );
          }
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }

        setCapturedPhotos((prev) => [...burstShots, ...prev]);
        for (const p of burstShots) {
          sessionService.addPhotoToActiveSession(p.id);
        }
        setActiveSession(sessionService.getActiveSession());
        setBurstProgress(null);

        if (burstShots.length > 0) {
          setGalleryToast(`Saved ${burstShots.length} photos to Pictures/CineGrid Pro`);
          setTimeout(() => setGalleryToast(null), 3000);
          setTimeout(() => {
            setReviewingPhoto(burstShots[0]);
            setIsPhotoEditorOpen(true);
          }, 350);
        }
        return;
      }

      // 2. EXPOSURE BRACKETING MODE (AEB 3 or 5 shots)
      if (proSettings.bracketingMode !== 'off') {
        const isThree = proSettings.bracketingMode === '3_bracket' || (proSettings.bracketingMode as string) === '3_shots';
        const offsets = isThree ? [-1.0, 0.0, 1.0] : [-2.0, -1.0, 0.0, 1.0, 2.0];
        const bracketShots: CapturedPhoto[] = [];

        for (let i = 0; i < offsets.length; i++) {
          const offset = offsets[i];
          setBurstProgress({ current: i + 1, total: offsets.length });
          cameraAudio.playShutter();
          setScreenFlash(true);
          setTimeout(() => setScreenFlash(false), 80);

          const sign = offset > 0 ? '+' : '';
          const photo = await captureSingleFrame(offset, ` [AEB ${sign}${offset} EV]`);
          if (photo) {
            bracketShots.unshift(photo);
            mediaStorageService.savePhoto(photo);
            const timeStr = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
            saveToDevice(currentPhotoUrl(photo), `CINEGRID_${timeStr}_AEB_${i + 1}.jpg`).catch((err) =>
              console.warn('AEB save error:', err)
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        setCapturedPhotos((prev) => [...bracketShots, ...prev]);
        for (const p of bracketShots) {
          sessionService.addPhotoToActiveSession(p.id);
        }
        setActiveSession(sessionService.getActiveSession());
        setBurstProgress(null);

        if (bracketShots.length > 0) {
          setGalleryToast(`Saved ${bracketShots.length} AEB photos to Pictures/CineGrid Pro`);
          setTimeout(() => setGalleryToast(null), 3000);
          setTimeout(() => {
            setReviewingPhoto(bracketShots[0]);
            setIsPhotoEditorOpen(true);
          }, 350);
        }
        return;
      }

      // 3. STANDARD SINGLE PHOTO CAPTURE
      cameraAudio.playShutter();
      setScreenFlash(true);
      setTimeout(() => setScreenFlash(false), 120);

      const newPhoto = await captureSingleFrame();
      if (newPhoto) {
        setCapturedPhotos((prev) => [newPhoto, ...prev]);
        sessionService.addPhotoToActiveSession(newPhoto.id);
        mediaStorageService.savePhoto(newPhoto);
        setActiveSession(sessionService.getActiveSession());

        const timeStr = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
        // Save what the viewfinder showed (look / EV / WB applied), not the untouched sensor frame.
        saveToDevice(currentPhotoUrl(newPhoto), `CINEGRID_${timeStr}.jpg`)
          .then(() => {
            setGalleryToast('Saved to Pictures/CineGrid Pro');
            setTimeout(() => setGalleryToast(null), 3000);
          })
          .catch((err) => {
            console.warn('Auto-save to device gallery error:', err);
          });

        setTimeout(() => {
          setReviewingPhoto(newPhoto);
          setIsPhotoEditorOpen(true);
        }, 350);
      }
    } finally {
      cameraService.endCapture();
      setTimeout(() => {
        setIsCapturing(false);
        setTimerCount(null);
      }, 300);
    }
  };

  // Apply Blackmagic Preset
  const handleApplyBlackmagicPreset = (preset: BlackmagicCameraPreset) => {
    if (preset.settingsPatch) {
      setProSettings((prev) => ({ ...prev, ...preset.settingsPatch }));
    }
  };

  // Select Capture Mode Handler
  const handleSelectCaptureMode = async (mode: CameraMode) => {
    // 1. Cleanup outgoing mode
    if (proSettings.captureMode === 'dual' && mode !== 'dual') {
      dualCameraService.stopSecondaryCamera();
      setDualSecondaryStream(null);
    }
    if (proSettings.captureMode === 'slow_motion' && mode !== 'slow_motion') {
      slowMotionService.cleanup();
    }
    if (proSettings.captureMode === 'timelapse' && mode !== 'timelapse') {
      timelapseService.cleanup();
    }

    // 2. Set new mode
    setProSettings((prev) => ({ ...prev, captureMode: mode }));

    // 3. Initialize incoming mode
    if (mode === 'dual') {
      // No separate "probe" that opens both cameras twice (several seconds of delay): start the second camera for
      // real while the first keeps running. If both tracks are live, the phone supports it.
      // Not "unsupported" until the second camera has really failed to start
      setDualCameraConfig((prev) => ({ ...prev, isSupported: true, unsupportedReason: undefined }));
      const sec = await dualCameraService.startSecondaryCamera(isFrontCamera ? 'environment' : 'user');
      const primaryLive = streamRef.current?.getVideoTracks()[0]?.readyState === 'live';
      const secondaryLive = sec?.getVideoTracks()[0]?.readyState === 'live';
      const ok = Boolean(primaryLive && secondaryLive);
      setDualCameraConfig((prev) => ({
        ...prev,
        isSupported: ok,
        unsupportedReason: ok ? undefined : 'This phone cannot run both cameras at the same time.',
      }));
      setDualSecondaryStream(ok ? sec : null);
    } else if (mode === 'slow_motion') {
      const track = cameraService.getVideoTrack();
      const caps = slowMotionService.querySensorFpsCapabilities(track);
      setSlowMotionConfig((prev) => ({
        ...prev,
        supportedMaxFps: caps.maxSensorFps,
      }));
      await slowMotionService.configureCameraForHighSpeed(track, 60);
    } else if (mode === 'night') {
      const track = cameraService.getVideoTrack();
      const hw = nightCaptureService.queryHardwareExposureSupport(track);
      setNightModeConfig((prev) => ({
        ...prev,
        isHardwareLongExposure: hw.hasHardwareLongExposure,
      }));
    }

    // 4. Intelligent Automatic Best Camera Selection
    const autoLens = hardwareIntelligenceService.selectBestLensForRequest({
      captureMode: mode,
      currentFacing: isFrontCamera ? 'front' : 'back',
      preferLowLight: mode === 'night',
      preferHighFps: mode === 'slow_motion',
    });

    if (autoLens.selectedLens.deviceId && autoLens.selectedLens.deviceId !== activeDeviceId) {
      if (mode === 'night' || mode === 'portrait' || mode === 'slow_motion') {
        setActiveDeviceId(autoLens.selectedLens.deviceId);
        initCamera(autoLens.selectedLens.deviceId);
        setLensSelectionFeedback(autoLens.selectionReason);
      }
    }
  };

  // Swap Dual Cameras
  const handleSwapDualCameras = async () => {
    const res = await dualCameraService.swapCameras();
    setDualCameraConfig((prev) => ({
      ...prev,
      primaryFacing: res.primary,
      secondaryFacing: res.secondary,
    }));
    const sec = await dualCameraService.startSecondaryCamera(res.secondary);
    setDualSecondaryStream(sec);
  };

  // When a look is on, record the graded canvas so the LUT is baked into the video (not only the preview).
  const gradedRecordingStream = (source: MediaStream, fps: number): MediaStream => {
    const canvas = lutCanvasRef.current;
    const lookOn = Boolean(
      (lookState.cameraProfileId && cameraProfileStore.get(lookState.cameraProfileId)) ||
      (lookState.activeLutId && activeLut && lookState.lutIntensity > 0) ||
        Object.values(lookState.adjustments).some((v) => v !== 0)
    );
    if (!lookOn || !canvas || canvas.width === 0 || typeof canvas.captureStream !== 'function') return source;
    const graded = canvas.captureStream(fps);
    source.getAudioTracks().forEach((track) => graded.addTrack(track));
    return graded;
  };

  /**
   * Adds the microphone to a video stream. The processed chain (noise suppression, echo cancellation, gain control,
   * filters) is started on demand; before this, only the Audio Studio screen started it, so clips had no sound.
   */
  const withMicrophone = async (src: MediaStream): Promise<MediaStream> => {
    let proc = audioIntelligenceService.getProcessedAudioStream();
    if (!proc || proc.getAudioTracks().length === 0) {
      await audioIntelligenceService.initializeMicrophone();
      proc = audioIntelligenceService.getProcessedAudioStream();
    }
    const track = proc?.getAudioTracks()[0] ?? src.getAudioTracks()[0];
    if (!track) {
      showToast('Recording without sound: microphone not available');
      return src;
    }
    const out = new MediaStream();
    src.getVideoTracks().forEach((t) => out.addTrack(t));
    out.addTrack(track);
    return out;
  };
  /** Closes the microphone when nothing is recording (privacy + battery); Audio Studio manages it while it is open. */
  const releaseMicrophone = () => {
    if (!isAudioStudioOpen) audioIntelligenceService.cleanupNodes();
  };

  // Video Recording handler (with Audio Intelligence integration)
  // Video with the native film camera: Camera2 -> film shader -> hardware H.264 + AAC, all native. Nothing is sent
  // through the web recorder, and the result (size, fps, audio) is what the encoder really wrote.
  const saveNativeClip = async (res: Awaited<ReturnType<typeof nativeFilm.stopRecording>>, label?: string) => {
    const videoUrl = await nativeRecordingToBlobUrl(res.path);
    // clip names from the cinema slate already end in .mp4: strip it so the file is not called x.mp4_123.mp4
    const fileName = `${(label ?? 'CINEGRID_VID').replace(/\.mp4$/i, '')}_${Date.now()}.mp4`;
    saveToDevice(videoUrl, fileName, 'video/mp4').catch((err) => console.warn('Save to device failed:', err));
    if (!res.audio) showToast(`Saved without sound (${res.audioNote || 'no microphone'})`, 4000);
    else if (res.avgFps < 24) showToast(`Recorded at ${res.avgFps} fps: this phone could not keep up`, 4000);
    console.info(`[record] saved ${fileName}: ${res.width}x${res.height} ${res.frames} frames ${res.avgFps} fps audio=${res.audio} ${res.videoEncoder}`);
    const videoItem: CapturedPhoto = {
      id: fileName,
      dataUrl: videoUrl,
      thumbnailUrl: videoUrl,
      timestamp: Date.now(),
      aspectRatio,
      filterUsed: activeFilmProfile?.name ?? selectedFilter.name,
      gridUsed: selectedGrid.name,
      mediaType: 'video',
      durationSeconds: Math.round(res.durationMs / 1000),
      proSettings: {
        iso: proSettings.iso,
        shutter: proSettings.shutterSpeed,
        kelvin: proSettings.whiteBalance,
        ev: proSettings.ev,
      },
    };
    setCapturedPhotos((prev) => [videoItem, ...prev]);
    mediaStorageService.savePhoto(videoItem).catch(() => {});
  };

  const handleNativeVideoToggle = async () => {
    if (!isRecordingVideo) {
      try {
        await nativeFilm.startRecording(true, NATIVE_RECORD_HEIGHT);
      } catch (err) {
        showToast(`Could not start recording: ${(err as Error)?.message || 'the camera refused'}`, 3500);
        return;
      }
      setIsRecordingVideo(true);
      setRecordingDuration(0);
      cameraAudio.playFocusLock();
      recordingTimerRef.current = window.setInterval(() => setRecordingDuration((prev) => prev + 1), 1000);
      return;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVideo(false);
    cameraAudio.playShutter();
    try {
      await saveNativeClip(await nativeFilm.stopRecording());
    } catch (err) {
      showToast(`Recording failed: ${(err as Error)?.message || 'the video could not be saved'}`, 4000);
    }
  };

  // The cinema HUD (what Video mode shows) drives its own recording state; native recording reuses it.
  const handleNativeCinemaToggle = async () => {
    if (!cinemaConfig.isRecording) {
      try {
        await nativeFilm.startRecording(true, NATIVE_RECORD_HEIGHT);
      } catch (err) {
        showToast(`Could not start recording: ${(err as Error)?.message || 'the camera refused'}`, 3500);
        return;
      }
      cinemaVideoService.beginExternalRecording();
      cameraAudio.playFocusLock();
      return;
    }
    cameraAudio.playShutter();
    const clip = cinemaVideoService.endExternalRecording();
    try {
      await saveNativeClip(await nativeFilm.stopRecording(), clip?.clipName);
    } catch (err) {
      showToast(`Recording failed: ${(err as Error)?.message || 'the video could not be saved'}`, 4000);
    }
  };
  const handleToggleVideoRecording = async () => {
    if (nativeFilm.active) return handleNativeVideoToggle();
    if (!isRecordingVideo) {
      if (!stream) return;
      const recStream = await withMicrophone(stream);

      const started = cameraService.startVideoRecording(gradedRecordingStream(recStream, 30), {
        codec: proSettings.videoCodec,
        bitrate: proSettings.videoBitrate,
      });
      if (started) {
        setIsRecordingVideo(true);
        setRecordingDuration(0);
        cameraAudio.playFocusLock();

        recordingTimerRef.current = window.setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      const duration = recordingDuration;
      setIsRecordingVideo(false);
      cameraAudio.playShutter();

      try {
        const videoUrl = await cameraService.stopVideoRecording();
        const fileName = `CINEGRID_VID_${Date.now()}.mp4`;
        saveToDevice(videoUrl, fileName, 'video/mp4')
          .catch((err) => console.warn('Save to device failed:', err));

        const videoItem: CapturedPhoto = {
          id: fileName,
          dataUrl: videoUrl,
          thumbnailUrl: videoUrl,
          timestamp: Date.now(),
          aspectRatio,
          filterUsed: selectedFilter.name,
          gridUsed: selectedGrid.name,
          mediaType: 'video',
          durationSeconds: duration,
          proSettings: {
            iso: proSettings.iso,
            shutter: proSettings.shutterSpeed,
            kelvin: proSettings.whiteBalance,
            ev: proSettings.ev,
          },
        };
        setCapturedPhotos((prev) => [videoItem, ...prev]);
        mediaStorageService.savePhoto(videoItem).catch(() => {});
      } catch (err) {
        console.warn('Video record stop error:', err);
      }
      releaseMicrophone();
    }
  };

  // Pro is the one place to set exposure: mirror it into the video readouts and the recorded clip metadata
  useEffect(() => {
    if (proSettings.captureMode !== 'video') return;
    cinemaVideoService.updateConfig({
      ...(proSettings.isoAuto ? {} : { iso: proSettings.iso }),
      ...(proSettings.shutterAuto || proSettings.shutterMode !== 'angle' ? {} : { shutterAngle: proSettings.shutterAngle }),
      whiteBalanceKelvin: proSettings.whiteBalance,
      ev: proSettings.ev,
      focusMode: proSettings.focusMode === 'manual' ? 'manual' : 'auto',
    });
  }, [proSettings.captureMode, proSettings.isoAuto, proSettings.iso, proSettings.shutterAuto, proSettings.shutterMode, proSettings.shutterAngle, proSettings.whiteBalance, proSettings.ev, proSettings.focusMode]);

  // Cinema Video Recording handler (High-end digital cinema standards)
  const handleToggleCinemaRecord = async () => {
    if (nativeFilm.active) return handleNativeCinemaToggle();
    if (!cinemaConfig.isRecording) {
      if (!stream) return;
      // One source of truth: the codec/bitrate chosen in Pro settings is what the recorder uses.
      cinemaVideoService.updateConfig({
        codec: proSettings.videoCodec === 'h265' ? 'hevc' : proSettings.videoCodec,
        bitrate: proSettings.videoBitrate,
      });
      const ok = await cinemaVideoService.startCinemaRecording(gradedRecordingStream(await withMicrophone(stream), cinemaConfig.fps));
      if (ok) {
        cameraAudio.playFocusLock();
      } else {
        releaseMicrophone();
      }
    } else {
      cameraAudio.playShutter();
      // cinemaVideoService.stopCinemaRecording already saves the clip to the gallery;
      // saving again here wrote every cinema clip twice.
      const clip = await cinemaVideoService.stopCinemaRecording();
      releaseMicrophone();
      if (clip) {
        // Show the clip in the in-app gallery too (it was only reaching the phone's gallery)
        const videoItem: CapturedPhoto = {
          id: `${clip.clipName}_${Date.now()}`,
          dataUrl: clip.url,
          thumbnailUrl: '',
          timestamp: Date.now(),
          aspectRatio,
          filterUsed: selectedFilter.name,
          gridUsed: selectedGrid.name,
          mediaType: 'video',
          durationSeconds: clip.duration,
          proSettings: { iso: proSettings.iso, shutter: proSettings.shutterSpeed, kelvin: proSettings.whiteBalance, ev: proSettings.ev },
        };
        setCapturedPhotos((prev) => [videoItem, ...prev]);
        mediaStorageService.savePhoto(videoItem).catch(() => {});
      }
    }
  };

  const handleExecuteRackFocus = (dir: 'A_to_B' | 'B_to_A') => {
    cinemaVideoService.startRackFocusTransition(dir);
  };

  // Dual Camera Recording handler
  const handleToggleDualRecording = async () => {
    if (!isRecordingVideo) {
      // Read the live element: cameraElement can be stale (null) if the viewfinder mounted after the stream
      const dualVideo = videoRef.current ?? cameraElement.video;
      if (!dualVideo) return;
      if (!stream) return;
      const audioTrack = (await withMicrophone(stream)).getAudioTracks()[0];
      const compStream = dualCameraService.startCompositing(dualVideo, audioTrack);
      const started = cameraService.startVideoRecording(compStream, {
        codec: proSettings.videoCodec,
        bitrate: proSettings.videoBitrate,
      });
      if (started) {
        setIsRecordingVideo(true);
        setRecordingDuration(0);
        cameraAudio.playFocusLock();
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingDuration((p) => p + 1);
        }, 1000);
      }
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      const duration = recordingDuration;
      setIsRecordingVideo(false);
      cameraAudio.playShutter();
      try {
        const videoUrl = await cameraService.stopVideoRecording();
        dualCameraService.stopCompositing();
        const fileName = `CINEGRID_DUAL_${Date.now()}.mp4`;
        saveToDevice(videoUrl, fileName, 'video/mp4')
          .catch((err) => console.warn('Save to device failed:', err));

        const dualItem: CapturedPhoto = {
          id: fileName,
          dataUrl: videoUrl,
          thumbnailUrl: '',
          timestamp: Date.now(),
          aspectRatio,
          filterUsed: 'Dual Camera PiP',
          gridUsed: selectedGrid.name,
          mediaType: 'video',
          durationSeconds: duration,
          proSettings: {
            iso: proSettings.iso,
            shutter: proSettings.shutterSpeed,
            kelvin: proSettings.whiteBalance,
            ev: proSettings.ev,
          },
        };
        setCapturedPhotos((prev) => [dualItem, ...prev]);
        mediaStorageService.savePhoto(dualItem).catch(() => {});
      } catch (err) {
        console.warn('Dual recording stop error:', err);
      }
      releaseMicrophone();
    }
  };

  // Slow Motion Recording handler
  // Real slow motion: the phone's high-speed camera mode (e.g. 720p at 120 fps) recorded natively. The WebView camera
  // is capped at 30 fps, so the old path only recorded a normal clip and merely labelled it "slow-mo".
  const [nativeSlowMo, setNativeSlowMo] = useState<{ fps: number; width: number; height: number } | null>(null);
  const [highSpeedBroken, setHighSpeedBroken] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cinegrid_highspeed_broken') === '1';
    } catch {
      return false;
    }
  });
  const handleToggleSlowMoRecording = async () => {
    if (!slowMotionConfig.isSlowMoRecording) {
      // Real high-speed recording where the camera really supports it. Phones that report it but refuse to start it
      // (this test phone is one) are remembered, and use the direct recording below instead.
      const tryNative = stillSupport.highSpeedMaxFps >= 60 && !highSpeedBroken;
      if (tryNative) {
        const video = videoRef.current;
        cameraService.detachVideo(video);
        cameraService.releaseCurrentStream();
        if (video) video.srcObject = null;
        await new Promise((r) => setTimeout(r, 500));
        try {
          const info = await nativeCapture.startHighSpeed(nativeFacing);
          setNativeSlowMo({ fps: info.fps, width: info.width, height: info.height });
          setSlowMotionConfig((prev) => ({ ...prev, isSlowMoRecording: true, recordingDuration: 0, targetFps: info.fps as SlowMotionConfig['targetFps'] }));
          cameraAudio.playFocusLock();
          recordingTimerRef.current = window.setInterval(() => {
            setSlowMotionConfig((prev) => ({ ...prev, recordingDuration: prev.recordingDuration + 1 }));
          }, 1000);
          return;
        } catch (err) {
          console.warn('High-speed recording unavailable on this phone, using direct recording:', err);
          try {
            localStorage.setItem('cinegrid_highspeed_broken', '1');
          } catch {}
          setHighSpeedBroken(true);
          await initCamera(activeDeviceId);
          showToast('This phone cannot record high-speed video. Slow motion will use normal recording played back slowly.', 6000);
          return; // the camera is restarting; the next tap starts the direct recording
        }
      }

      // Direct recording through the normal camera pipeline (30 fps source). Honest: the clip is a normal clip that the
      // in-app viewer plays at the chosen slow speed.
      if (!stream) return;
      const started = slowMotionService.startSlowMoRecording(await withMicrophone(stream));
      if (started) {
        setSlowMotionConfig((prev) => ({ ...prev, isSlowMoRecording: true, recordingDuration: 0 }));
        cameraAudio.playFocusLock();
        recordingTimerRef.current = window.setInterval(() => {
          setSlowMotionConfig((prev) => ({ ...prev, recordingDuration: prev.recordingDuration + 1 }));
        }, 1000);
      }
    } else if (nativeSlowMo) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      cameraAudio.playShutter();
      try {
        const res = await nativeCapture.stopHighSpeed();
        const url = Capacitor.convertFileSrc(`file://${res.path}`);
        const fileName = `cinegrid_slowmo_${Date.now()}.mp4`;
        saveToDevice(url, fileName, 'video/mp4').catch((err) => console.warn('Save to device failed:', err));
        const item: CapturedPhoto = {
          id: fileName,
          dataUrl: url,
          thumbnailUrl: '',
          timestamp: Date.now(),
          aspectRatio,
          filterUsed: `Slow motion ${res.fps} fps`,
          gridUsed: selectedGrid.name,
          mediaType: 'video',
          durationSeconds: Math.round(res.durationMs / 1000),
          slowMotion: { fps: res.fps, playbackSpeed: Math.min(1, 30 / res.fps) },
          proSettings: { iso: proSettings.iso, shutter: proSettings.shutterSpeed, kelvin: proSettings.whiteBalance, ev: proSettings.ev },
        };
        setCapturedPhotos((prev) => [item, ...prev]);
        mediaStorageService.savePhoto(item).catch(() => {});
        showToast(`Slow motion saved: ${res.width}x${res.height} at ${res.fps} fps`, 4000);
      } catch (err) {
        console.warn('Slow motion stop error:', err);
        showToast(err instanceof Error ? err.message : 'Slow motion clip could not be saved');
      } finally {
        setSlowMotionConfig((prev) => ({ ...prev, isSlowMoRecording: false }));
        setNativeSlowMo(null);
        await initCamera(activeDeviceId);
      }
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      cameraAudio.playShutter();
      try {
        const videoUrl = await slowMotionService.stopSlowMoRecording();
        setSlowMotionConfig((prev) => ({ ...prev, isSlowMoRecording: false }));
        const fileName = `cinegrid_slowmo_${Date.now()}.mp4`;
        saveToDevice(videoUrl, fileName, 'video/mp4').catch((err) => console.warn('Save to device failed:', err));
        const item: CapturedPhoto = {
          id: fileName,
          dataUrl: videoUrl,
          thumbnailUrl: '',
          timestamp: Date.now(),
          aspectRatio,
          filterUsed: `Slow motion ${slowMotionConfig.playbackSpeed}x (normal recording)`,
          gridUsed: selectedGrid.name,
          mediaType: 'video',
          durationSeconds: slowMotionConfig.recordingDuration,
          slowMotion: { fps: 30, playbackSpeed: slowMotionConfig.playbackSpeed },
          proSettings: { iso: proSettings.iso, shutter: proSettings.shutterSpeed, kelvin: proSettings.whiteBalance, ev: proSettings.ev },
        };
        setCapturedPhotos((prev) => [item, ...prev]);
        mediaStorageService.savePhoto(item).catch(() => {});
      } catch (err) {
        console.warn('Slow motion stop error:', err);
      }
      releaseMicrophone();
    }
  };
  // Time-lapse Recording handler
  const handleToggleTimelapseRecording = async () => {
    if (!timelapseConfig.isRecording) {
      const timelapseVideo = videoRef.current ?? cameraElement.video;
      if (!timelapseVideo) return;
      const readiness = await timelapseService.checkDeviceReadiness();
      if (!readiness.canProceed) {
        alert(readiness.storageWarning || 'Cannot start time-lapse.');
        return;
      }
      const track = cameraService.getVideoTrack();
      const started = await timelapseService.startTimelapse(timelapseVideo, track);
      if (started) {
        setTimelapseConfig((prev) => ({
          ...prev,
          isRecording: true,
          capturedFrames: 1,
          realDurationSeconds: 0,
        }));
        cameraAudio.playFocusLock();
        recordingTimerRef.current = window.setInterval(() => {
          const stat = timelapseService.getStatus();
          setTimelapseConfig((prev) => ({
            ...prev,
            capturedFrames: stat.capturedFrames,
            realDurationSeconds: stat.realDurationSeconds,
          }));
        }, 1000);
      }
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      cameraAudio.playShutter();
      try {
        // Free the UI now; building the clip takes about as long as the finished video is
        setTimelapseConfig((prev) => ({ ...prev, isRecording: false }));
        setGalleryToast('Building time-lapse…');
        const videoUrl = await timelapseService.stopTimelapse();
        if (videoUrl) {
          await saveToDevice(videoUrl, `cinegrid_timelapse_${Date.now()}.webm`);
          setGalleryToast('Time-lapse saved to Movies/CineGrid Pro');
        } else {
          setGalleryToast('Time-lapse had no frames to save');
        }
        setTimeout(() => setGalleryToast(null), 3000);
      } catch (err) {
        setGalleryToast('Could not save the time-lapse');
        setTimeout(() => setGalleryToast(null), 3000);
        console.warn('Timelapse stop error:', err);
      }
    }
  };

  // Night Mode Capture handler
  const handleTriggerNightCapture = async () => {
    // Real multi-frame night stacking from the sensor (Camera2) where the phone supports it
    if (stillSupport.night) {
      setIsCapturing(true);
      setNightModeConfig((prev) => ({ ...prev, isCapturing: true, progressPercent: 50 }));
      try {
        // The duration choice sets how many frames are merged: longer = more frames = less noise (tripod advised)
        const seconds = nightCaptureService.resolveExposureDuration(nightModeConfig.preset, nightModeConfig.customSeconds);
        const frames = Math.max(6, Math.min(15, Math.round(2 + seconds * 1.3)));
        await captureNativeStack('night', frames);
      } finally {
        setIsCapturing(false);
        setNightModeConfig((prev) => ({ ...prev, isCapturing: false, progressPercent: 0 }));
      }
      return;
    }
    const nightVideo = videoRef.current ?? cameraElement.video;
    if (!nightVideo) return;
    setIsCapturing(true);
    setNightModeConfig((prev) => ({ ...prev, isCapturing: true, progressPercent: 0 }));
    cameraAudio.playFocusLock();

    try {
      const track = cameraService.getVideoTrack();
      const duration = nightCaptureService.resolveExposureDuration(
        nightModeConfig.preset,
        nightModeConfig.customSeconds
      );
      const res = await nightCaptureService.executeNightCapture(
        nightVideo,
        track,
        duration,
        (prog) => {
          setNightModeConfig((prev) => ({
            ...prev,
            progressPercent: prog.percent,
            remainingSeconds: prog.remainingSeconds,
            stabilityScore: prog.stabilityScore,
          }));
        }
      );

      cameraAudio.playShutter();
      const newPhoto: CapturedPhoto = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        dataUrl: res.dataUrl,
        thumbnailUrl: res.dataUrl,
        timestamp: Date.now(),
        aspectRatio,
        filterUsed: `Night: ${duration}s (${res.isHardwareLongExposure ? 'Hardware' : 'Stacked'})`,
        gridUsed: selectedGrid.name,
        proSettings: {
          iso: proSettings.iso,
          shutter: `${duration}s (Night)`,
          kelvin: proSettings.whiteBalance,
          ev: proSettings.ev,
        },
      };

      setCapturedPhotos((prev) => [newPhoto, ...prev]);
      sessionService.addPhotoToActiveSession(newPhoto.id);
      mediaStorageService.savePhoto(newPhoto);
      setActiveSession(sessionService.getActiveSession());
      const nightStamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      saveToDevice(res.dataUrl, `CINEGRID_${nightStamp}_NIGHT.jpg`)
        .then(() => {
          setGalleryToast('Saved to Pictures/CineGrid Pro');
          setTimeout(() => setGalleryToast(null), 3000);
        })
        .catch((saveErr) => console.warn('Night photo save error:', saveErr));
      setTimeout(() => {
        setReviewingPhoto(newPhoto);
        setIsPhotoEditorOpen(true);
      }, 350);
    } catch (err) {
      console.warn('Night capture error:', err);
    } finally {
      setIsCapturing(false);
      setNightModeConfig((prev) => ({ ...prev, isCapturing: false }));
    }
  };

  // Panorama: sweep the phone sideways while the shutter is "recording"; tap again to stitch and save
  const finishPanorama = () => {
    if (panoTimerRef.current) clearInterval(panoTimerRef.current);
    panoTimerRef.current = null;
    const stitcher = panoRef.current;
    panoRef.current = null;
    setPanoState(null);
    if (!stitcher) return;
    const url = stitcher.finish();
    if (!url) {
      setGalleryToast('Sweep the phone slowly sideways, at least one screen wide');
      setTimeout(() => setGalleryToast(null), 3000);
      return;
    }
    cameraAudio.playShutter();
    const newPhoto: CapturedPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dataUrl: url,
      thumbnailUrl: url,
      timestamp: Date.now(),
      aspectRatio,
      filterUsed: 'Panorama',
      gridUsed: selectedGrid.name,
      proSettings: { iso: proSettings.iso, shutter: String(proSettings.shutterSpeed), kelvin: proSettings.whiteBalance, ev: proSettings.ev },
    };
    setCapturedPhotos((prev) => [newPhoto, ...prev]);
    sessionService.addPhotoToActiveSession(newPhoto.id);
    mediaStorageService.savePhoto(newPhoto);
    setActiveSession(sessionService.getActiveSession());
    const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    saveToDevice(url, `CINEGRID_${stamp}_PANO.jpg`)
      .then(() => {
        setGalleryToast('Panorama saved to Pictures/CineGrid Pro');
        setTimeout(() => setGalleryToast(null), 3000);
      })
      .catch((e) => console.warn('Panorama save error:', e));
  };

  const handleTogglePanorama = () => {
    if (panoRef.current) {
      finishPanorama();
      return;
    }
    if (!videoRef.current) return;
    const stitcher = new PanoramaStitcher();
    panoRef.current = stitcher;
    setPanoState(stitcher.state());
    cameraAudio.playFocusLock();
    panoTimerRef.current = setInterval(() => {
      const v = videoRef.current;
      const s = panoRef.current;
      if (!v || !s) return;
      const st = s.addFrame(v);
      setPanoState(st);
      if (st.full) finishPanorama();
    }, 110);
  };

  useEffect(
    () => () => {
      if (panoTimerRef.current) clearInterval(panoTimerRef.current);
      panoRef.current?.dispose();
    },
    []
  );

  // Centralized Shutter trigger dispatcher
  const cancelTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    setTimerCount(null);
  };

  /**
   * Self-timer for every mode. It only delays a START (photo, night, or the beginning of a recording); stopping a
   * recording is always immediate. Tapping the shutter during the countdown cancels it.
   */
  const runWithTimer = (action: () => void, isStopping = false) => {
    if (timerIntervalRef.current) {
      cancelTimer();
      return;
    }
    if (isStopping || selectedTimer === 0) {
      action();
      return;
    }
    let remaining = selectedTimer;
    setTimerCount(remaining);
    cameraAudio.playTimerBeep(false);
    timerIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setTimerCount(remaining);
        cameraAudio.playTimerBeep(false);
      } else {
        cancelTimer();
        cameraAudio.playTimerBeep(true);
        action();
      }
    }, 1000);
  };

  // Never leave a countdown running when the screen is left
  useEffect(() => () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }, []);

  const handleCaptureTrigger = () => {
    const mode = proSettings.captureMode;

    if (mode === 'video') return runWithTimer(handleToggleVideoRecording, isRecordingVideo);
    if (mode === 'dual') return runWithTimer(handleToggleDualRecording, isRecordingVideo);
    if (mode === 'slow_motion') return runWithTimer(handleToggleSlowMoRecording, slowMotionConfig.isSlowMoRecording);
    if (mode === 'timelapse') return runWithTimer(handleToggleTimelapseRecording, timelapseConfig.isRecording);
    if (mode === 'night') return runWithTimer(handleTriggerNightCapture);
    if (mode === 'panorama') return runWithTimer(handleTogglePanorama, panoRef.current !== null);

    // Photo / Portrait. Flash Auto fires the torch only when the scene is really dark.
    runWithTimer(async () => {
      if (flashMode === 'auto' && hasTorch && !isFrontCamera) {
        const l = meanLuma(videoRef.current);
        if (l !== null && l < 60 && (await setTorch(true, true))) {
          await new Promise((r) => setTimeout(r, 700)); // let exposure settle under the light
          try {
            await performCapture();
          } finally {
            setTorch(false, true);
          }
          return;
        }
      }
      performCapture();
    });
  };

  // Handle saving edits from Before/After photo editor
  const handleSaveEditedPhoto = (id: string, editedDataUrl: string) => {
    setCapturedPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, editedDataUrl } : p))
    );
  };

  // Import a photo from the device so it can be edited like a captured one. The file is stored untouched.
  const handleImportPhoto = async (file: File): Promise<string | null> => {
    const problem = validateImportFile(file);
    if (problem) return problem;
    try {
      const photo = await photoFromFile(file);
      setCapturedPhotos((prev) => [photo, ...prev]);
      mediaStorageService.savePhoto(photo);
      setIsGalleryOpen(false);
      setReviewingPhoto(photo);
      setIsPhotoEditorOpen(true);
      return null;
    } catch {
      return 'This image could not be opened. Its format may not be supported by this browser (for example HEIC).';
    }
  };

  // Handle uploading reference ghosting image
  const handleUploadReferenceImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setProSettings((prev) => ({ ...prev, referenceImage: dataUrl }));
      setSecondaryGuides((prev) => ({ ...prev, showReferenceOverlay: true }));
    };
    reader.readAsDataURL(file);
  };

  const latestPhoto = capturedPhotos.length > 0 ? capturedPhotos[0] : null;

  // 1. LOADING SCREEN WHILE CHECKING STORED ENTITLEMENT
  if (isLicenseActivated === null) {
    return (
      <div className="min-h-screen w-full bg-[#050608] flex flex-col items-center justify-center text-white select-none">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-black shadow-2xl mb-4 shadow-amber-500/20">
          <Camera size={26} />
        </div>
        <div className="text-base font-mono font-bold tracking-widest text-zinc-100">CINEGRID PRO</div>
        <div className="text-[11px] font-mono text-amber-400 mt-1">INITIALIZING STUDIO LICENSE...</div>
        <Loader2 size={18} className="animate-spin text-amber-400 mt-5" />
      </div>
    );
  }

  // 2. WELCOME / LICENSE ACTIVATION SCREEN IF NOT ACTIVATED
  if (isLicenseActivated === false) {
    return (
      <>
        <WelcomeActivationScreen
          onActivated={() => {
            const s = licenseService.getSession();
            setLicenseSession(s);
            setIsLicenseActivated(true);
          }}
          onOpenAdmin={ADMIN_ENABLED ? () => setIsAdminDashboardOpen(true) : undefined}
          onOpenContactAdmin={() => setIsContactAdminOpen(true)}
          initialMessage={activationWarning}
        />
        <AdminDashboardModal
          isOpen={isAdminDashboardOpen}
          onClose={() => setIsAdminDashboardOpen(false)}
          onUseLicenseInApp={(key, name) => {
            licenseService.activate(name, key).then((res) => {
              if (res.success) {
                setLicenseSession(res.session || null);
                setIsLicenseActivated(true);
                setIsAdminDashboardOpen(false);
              }
            });
          }}
        />
        <ContactAdminModal
          isOpen={isContactAdminOpen}
          onClose={() => setIsContactAdminOpen(false)}
          onSelectSampleKey={(key, name) => {
            licenseService.activate(name, key).then((res) => {
              if (res.success) {
                setLicenseSession(res.session || null);
                setIsLicenseActivated(true);
                setIsContactAdminOpen(false);
              }
            });
          }}
        />
      </>
    );
  }

  return (
    <div
      className={`fixed inset-0 w-full h-full h-[100dvh] bg-black flex flex-col justify-between text-white overflow-hidden select-none safe-area-container ${
        frameMode === 'mobile-frame' && !Capacitor.isNativePlatform()
          ? 'items-center justify-center bg-[#050608] p-0 sm:p-4'
          : ''
      }`}
    >
      {/* SCREEN FLASH ON PHOTO CAPTURE */}
      {screenFlash && <div className="cg-shutter-blink fixed inset-0 bg-black z-[100] pointer-events-none" />}

      {/* TOP DESKTOP TOOLBAR (Hidden on native Android / iOS) */}
      {!Capacitor.isNativePlatform() && (
        <div className="hidden sm:flex items-center justify-between w-full max-w-md mb-2 px-2 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-bold text-zinc-200">CINEGRID PRO</span>
            <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-amber-400">BLACKMAGIC</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick License Status Pill */}
            <button
              onClick={() => setIsLicenseInfoOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-amber-300 border border-white/10 transition-colors"
              title="View License Entitlement Details"
            >
              <ShieldCheck size={12} className="text-emerald-400" />
              <span className="font-bold max-w-[90px] truncate">{licenseSession?.name || 'Licensed'}</span>
            </button>

            {/* Admin Dashboard shortcut (dev / VITE_ENABLE_ADMIN only) */}
            {ADMIN_ENABLED && (
              <button
                onClick={() => setIsAdminDashboardOpen(true)}
                className="p-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 border border-white/10 transition-colors"
                title="Administrator License Dashboard"
              >
                <KeyRound size={12} />
              </button>
            )}

            {/* Smartphone Frame vs Responsive */}
            <button
              onClick={() => setFrameMode(frameMode === 'mobile-frame' ? 'responsive' : 'mobile-frame')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-white/10 transition-colors"
              title="Toggle Smartphone Frame vs Full Screen"
            >
              {frameMode === 'mobile-frame' ? <Smartphone size={13} /> : <Monitor size={13} />}
              <span>{frameMode === 'mobile-frame' ? 'Phone Mode' : 'Full Window'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER: SMARTPHONE SHELL ON DESKTOP, FULL SCREEN ON MOBILE */}
      <div
        className={`relative w-full h-full flex flex-col justify-between bg-black overflow-hidden select-none transition-all ${
          frameMode === 'mobile-frame' && !Capacitor.isNativePlatform()
            ? 'sm:max-w-[430px] sm:h-[min(920px,calc(100dvh-5rem))] sm:rounded-[44px] sm:border-[8px] sm:border-zinc-800 sm:shadow-[0_0_60px_rgba(0,0,0,0.9)]'
            : 'w-full h-full'
        }`}
      >
        {/* Dynamic Island Notch Simulation (desktop preview mode only) */}
        {frameMode === 'mobile-frame' && !Capacitor.isNativePlatform() && (
          <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-40 border border-zinc-800/80 shadow-md">
            <div className="absolute right-3 top-2 w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700" />
          </div>
        )}

        {/* Gallery Auto-Save Toast Notification */}
        {/* Success confirmations ("Saved to …") are intentionally not shown; only progress and problems are. */}
        {galleryToast && !/^(saved|time-lapse saved)/i.test(galleryToast) && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/90 backdrop-blur-md border border-amber-400/70 shadow-2xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-mono font-bold text-amber-300">{galleryToast}</span>
          </div>
        )}

        {/* Small recording counter, for every recording mode */}
        {recSeconds !== null && (
          <div
            data-testid="rec-counter"
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 pointer-events-none"
            aria-live="off"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold text-white tabular-nums">{formatClock(recSeconds)}</span>
          </div>
        )}

        {/* Native slow-motion recording owns the camera, so the live preview is off: say so, with the real format */}
        {nativeSlowMo && (
          <div className="absolute inset-x-0 top-1/3 z-40 flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
            <span className="px-4 py-1.5 rounded-full bg-red-600 text-white text-sm font-semibold">● REC {slowMotionConfig.recordingDuration}s</span>
            <span className="text-white/90 text-sm">
              Slow motion {nativeSlowMo.width}×{nativeSlowMo.height} at {nativeSlowMo.fps} fps
            </span>
            <span className="text-white/60 text-xs">The preview is off while recording</span>
          </div>
        )}

        {/* Self-timer countdown, shown over the viewfinder in every mode; tap the shutter to cancel */}
        {timerCount !== null && (
          <div
            data-testid="timer-countdown"
            className="absolute inset-x-0 top-1/3 z-40 flex justify-center pointer-events-none"
            aria-live="assertive"
          >
            <span className="text-8xl font-light text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] tabular-nums">{timerCount}</span>
          </div>
        )}

        {/* 1. TOP VIEWFINDER AREA WITH PRO HUD & OVERLAYS */}
        <div
          className="relative w-full flex-1 min-h-0 flex flex-col justify-center overflow-hidden bg-black"
          onPointerDownCapture={() => {
            if (isFrontCamera) showSelfieControls();
          }}
        >

          {/* Active Session Status Badge Pill (Click to open session directives) */}
          {activeSession && (
            <div
              onClick={() => setIsSessionsModalOpen(true)}
              className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-amber-400/50 flex items-center gap-1.5 cursor-pointer shadow-xl hover:border-amber-400 active:scale-95 transition-all safe-top"
              title="Click to view Active Photography Session"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-amber-300 uppercase truncate max-w-[140px]">
                {activeSession.name}
              </span>
              <span className="text-[9px] font-mono text-zinc-400">
                ({activeSession.capturedPhotoIds.length})
              </span>
            </div>
          )}

          {/* Front camera framing (1x / wide / group guide): floats over the viewfinder, takes no layout space */}
          {isFrontCamera && (
            <div
              className={`absolute bottom-3 inset-x-0 z-30 flex justify-center pointer-events-none transition-opacity duration-300 ${
                selfieControlsVisible ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={!selfieControlsVisible}
            >
              <div className={selfieControlsVisible ? 'pointer-events-auto' : 'pointer-events-none'}>
                <WideSelfieControls
                  config={wideSelfieConfig}
                  onChangeConfig={(patch) => {
                    setWideSelfieConfig((p) => ({ ...p, ...patch }));
                    wideSelfieService.setConfig(patch);
                  }}
                  onToggleFraming={async (framing) => {
                    const track = cameraService.getVideoTrack();
                    const res = await wideSelfieService.setFraming(framing, track);
                    setWideSelfieConfig((p) => ({ ...p, framing, frontLensZoom: res.appliedZoom }));
                  }}
                  isFrontFacing={isFrontCamera}
                />
              </div>
            </div>
          )}

          <Viewfinder
            mirrored={mirrorActive}
            aspectRatio={aspectRatio}
            filter={selectedFilter}
            filterStrength={filterStrength}
            proSettings={previewPro}
            gridType={selectedGrid.id}
            gridStyleOptions={gridStyle}
            secondaryGuides={secondaryGuides}
            framingGuide={framingGuide}
            onChangeFramingGuide={(patch) => setFramingGuide((prev) => ({ ...prev, ...patch }))}
            zoomLevel={zoomLevel}
            onZoomChange={handleZoomChange}
            digitalScale={zoomPlan.digitalScale}
            zoomMin={limits.min}
            zoomMax={limits.max}
            isFrontCamera={isFrontCamera}
            videoRef={videoRef}
            imageRef={imageRef}
            useSimulatedScene={useSimulatedScene}
            activeSceneIndex={activeSceneIndex}
            onCycleScene={() => setActiveSceneIndex((prev) => prev + 1)}
            onRetryCamera={() => initCamera(activeDeviceId)}
            cameraError={cameraError}
            cameraReady={cameraReady}
            stream={stream}
            ghostSettings={ghostSettings}
            onUpdateGhostSettings={(patch) => setGhostSettings((prev) => ({ ...prev, ...patch }))}
            lookState={lookState}
            activeLut={activeLut}
            lutCanvasRef={lutCanvasRef}
          nativePreview={nativeFilm.intended}
            dualCameraConfig={dualCameraConfig}
            secondaryStream={dualSecondaryStream}
            onSwapDualCameras={handleSwapDualCameras}
            onChangePipPosition={(pos) => setDualCameraConfig((p) => ({ ...p, pipPosition: pos }))}
            showGroupSelfieGuide={isFrontCamera && wideSelfieConfig.groupGuideOverlay}
            subjectBox={detectOn ? subjectBox : null}
            ev={proSettings.ev}
            onChangeEv={(v) => setProSettings((prev) => ({ ...prev, ev: v }))}
            onAeAfLockChange={(locked) => setProSettings((prev) => ({ ...prev, exposureLocked: locked, focusLocked: locked }))}
            portraitBlur={portraitBlur}
            portraitFocus={portraitFocus}
            freezeFrame={freezeFrame}
            showPortraitEyeline={proSettings.captureMode === 'portrait' && showPortraitEyeline}
          />

          {/* Cinema Scopes Overlay (Real GPU/Canvas analysis on live frames) */}
          {proSettings.captureMode === 'video' && (
            <CinemaScopesOverlay videoRef={videoRef} config={cinemaConfig} />
          )}

          {proSettings.captureMode !== 'video' && (
            <>
              {/* Pro HUD Controls overlay (Status, false color, peaking, histogram, waveform, timecode) */}
              <ProHUD
                aspectRatio={aspectRatio}
                onCycleAspectRatio={handleCycleAspectRatio}
                proSettings={proSettings}
                onUpdatePro={(patch) => setProSettings((prev) => ({ ...prev, ...patch }))}
                videoElement={videoRef.current ?? cameraElement.video}
                imageElement={cameraElement.image}
                isFrontCamera={isFrontCamera}
                onSwitchCamera={handleSwitchCamera}
                hasTorch={hasTorch}
                torchOn={torchOn}
                onToggleTorch={handleToggleTorch}
                splitActive={false}
                onToggleSplit={() => {
                  if (latestPhoto) {
                    setReviewingPhoto(latestPhoto);
                    setIsPhotoEditorOpen(true);
                  }
                }}
                onOpenSettings={() => openPro()}
                zoomLevel={zoomLevel}
                onZoomChange={handleZoomChange}
                isRecordingVideo={isRecordingVideo}
                recordingDuration={recordingDuration}
                stream={stream}
                availableLenses={availableLenses}
                onSelectLens={selectLensDevice}
                activeDeviceId={activeDeviceId}
                onApplyPreset={handleApplyBlackmagicPreset}
                activePhysicalLens={hardwareIntelligenceService.getActiveProfile() || undefined}
                activeFocalLengthMm={reportedFocalMm}
                expanded={false}
                showHeader={false}
                toolsHost={scopesHost}
                scopesInHostOnly
                canCompare={!!latestPhoto}
                controlSupport={controlSupport}
                hwControls={hwControls}
                stillSupport={stillSupport}
              />
            </>
          )}
        </div>

        {/* 2. BOTTOM CONTROLS SECTION */}
        <div className="w-full bg-[#050608] border-t border-white/10 flex flex-col gap-0.5 pt-1 pb-1 px-1 z-30 safe-bottom">
          {/* PRIMARY APPLICATION NAVIGATION (Camera | Grid | Pro | Look | Sessions | Gallery) */}
          <MainNavigationBar
            activeTab={mainNavTab}
            onSelectTab={(tab) => {
              setMainNavTab(tab);
              if (tab === 'grid') setIsMasterPresetsOpen(true);
              if (tab === 'pro') openPro();
              if (tab === 'look') setIsLookModalOpen(true);
              if (tab === 'sessions') setIsSessionsModalOpen(true);
              if (tab === 'gallery') setIsGalleryOpen(true);
            }}
            activeSession={activeSession}
            photoCount={capturedPhotos.length}
            activeLookName={activeLut ? activeLut.name : lookState.activeFilterId ? 'Filter' : null}
          />
          {/* One feature rail: every feature is a chip; pickers open in a sheet, toggles act in place */}
          <FeatureRail
            onSelect={(id) => {
              if (id === 'home') {
                // Like other pro camera apps: leave to the phone's home screen without closing the camera session
                if (Capacitor.isNativePlatform()) CapacitorApp.minimizeApp().catch(() => {});
              } else if (id === 'pro') openPro();
              else if (id === 'grid' || id === 'look') setTraySheet(id);
              else if (id === 'flash') handleToggleTorch();
              else if (id === 'flip') handleSwitchCamera();
              else if (id === 'mirror') (isFrontCamera ? setMirrorFront : setMirrorRear)((m) => !m);
              else if (id === 'detect') setDetectOn((d) => !d);
              else if (id === 'timer') setSelectedTimer((t) => (t === 0 ? 3 : t === 3 ? 5 : t === 5 ? 10 : 0));
              else if (id === 'ratio') handleCycleAspectRatio();
              else if (id === 'hdr') {
                // HDR produces a merged JPEG, so it replaces RAW rather than combining with it
                const next = !hdrEnabled;
                setHdrEnabled(next);
                if (next) setProSettings((prev) => ({ ...prev, photoFormat: 'jpeg' }));
              } else if (id === 'aelock') {
                const next = !(proSettings.exposureLocked && proSettings.focusLocked);
                setProSettings((prev) => ({ ...prev, exposureLocked: next, focusLocked: next }));
              }
              else if (id === 'guide') setFramingGuide((prev) => ({ ...prev, enabled: !prev.enabled }));
              else if (id === 'ghost') setIsGhostDrawerOpen(true);
              else if (id === 'favorite') handleToggleFavorite(selectedGrid.id);
            }}
            items={[
              ...(Capacitor.isNativePlatform() ? [{ id: 'home', icon: <House size={15} />, label: 'Home' }] : []),
              { id: 'pro', icon: <Sliders size={15} />, label: 'Pro' },
              {
                id: 'flash',
                icon: flashMode === 'off' ? <ZapOff size={15} /> : <Zap size={15} />,
                label: 'Flash',
                value: flashMode === 'off' ? undefined : flashMode === 'auto' ? 'Auto' : 'On',
                active: flashMode !== 'off',
              },
              { id: 'flip', icon: <SwitchCamera size={15} />, label: 'Flip' },
              { id: 'mirror', icon: <FlipHorizontal size={15} />, label: 'Mirror', active: mirrorActive },
              { id: 'detect', icon: <ScanFace size={15} />, label: 'Detect', value: detectOn ? (subjectBox ? (subjectBox.kind === 'face' ? 'Face' : 'On') : 'On') : undefined, active: detectOn },
              {
                id: 'timer',
                icon: <TimerIcon size={15} />,
                label: 'Timer',
                value: selectedTimer > 0 ? `${selectedTimer}s` : undefined,
                active: selectedTimer > 0,
              },
              { id: 'ratio', icon: <RectangleHorizontal size={15} />, label: 'Ratio', value: aspectRatio },
              ...(stillSupport.hdr
                ? [{ id: 'hdr', icon: <Sun size={15} />, label: 'HDR', active: hdrEnabled }]
                : []),
              {
                id: 'aelock',
                icon: proSettings.exposureLocked && proSettings.focusLocked ? <Lock size={15} /> : <Unlock size={15} />,
                label: 'AE/AF Lock',
                active: Boolean(proSettings.exposureLocked && proSettings.focusLocked),
              },
              {
                id: 'grid',
                icon: <Grid3X3 size={15} />,
                label: 'Grid',
                value: selectedGrid.id === 'none' ? undefined : selectedGrid.name,
                active: selectedGrid.id !== 'none',
                onClear:
                  selectedGrid.id !== 'none'
                    ? () => {
                        const off = gridList.find((g) => g.id === 'none');
                        if (off) setSelectedGrid(off);
                      }
                    : undefined,
                clearLabel: 'Remove grid',
              },
              {
                id: 'look',
                icon: <Palette size={15} />,
                label: 'Look',
                value: activeLut ? activeLut.name : selectedFilter.id !== 'none' ? selectedFilter.name : undefined,
                active: lookIsActive,
                onClear: lookIsActive ? handleRemoveLook : undefined,
                clearLabel: 'Remove look',
              },
              { id: 'guide', icon: <ScanFace size={15} />, label: 'Guide', active: framingGuide.enabled },
              {
                id: 'ghost',
                icon: <Layers size={15} />,
                label: 'Ghost',
                active: ghostSettings.enabled,
                onClear: ghostSettings.enabled ? () => setGhostSettings((p) => ({ ...p, enabled: false })) : undefined,
                clearLabel: 'Turn off ghost overlay',
              },
              { id: 'favorite', icon: <Heart size={15} />, label: 'Favorite', active: !!selectedGrid.isFavorite },
            ]}
          />

          <Sheet
            scope="contain"
            isOpen={traySheet === 'grid'}
            onClose={() => setTraySheet(null)}
            title="Composition grid"
          >
            <label className="flex items-center gap-3 px-3 pb-2 text-xs text-zinc-300">
              <span className="w-24 flex-shrink-0">Grid opacity</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(gridStyle.opacity * 100)}
                aria-label="Grid opacity"
                onChange={(e) => setGridStyle((prev) => ({ ...prev, opacity: Number(e.target.value) / 100, isVisible: Number(e.target.value) > 0 }))}
                className="flex-1 min-h-[44px] accent-amber-400"
                style={{ touchAction: 'none' }}
              />
              <span className="w-9 text-right font-mono text-amber-300">{Math.round(gridStyle.opacity * 100)}%</span>
            </label>
            <CompositionPicker
              grids={gridList}
              selectedGridId={selectedGrid.id}
              onSelectGrid={(grid) => {
                setSelectedGrid(grid);
              }}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onOpenExplainer={(g) => {
                setReferenceGrid(g);
                setIsReferenceModalOpen(true);
              }}
              onOpenReferencePhotos={(g) => {
                setReferenceGrid(g);
                setIsReferenceModalOpen(true);
              }}
              onOpenCustomizer={() => setIsCustomizerOpen(true)}
              onToggleFavorite={handleToggleFavorite}
              onOpenMasterPresets={() => setIsMasterPresetsOpen(true)}
              recommendedIds={recommendedGridIds(proSettings.captureMode)}
            />
          </Sheet>

          <Sheet
            scope="contain"
            isOpen={traySheet === 'look'}
            onClose={() => setTraySheet(null)}
            title="Look"
          >
            <FilterPicker selectedFilterId={selectedFilter.id} onSelectFilter={setSelectedFilter} />
            {lookIsActive && (
              <div className="px-4 pb-1">
                <button
                  type="button"
                  onClick={handleRemoveLook}
                  className="h-9 px-4 rounded-full border border-white/15 text-xs font-bold text-zinc-200 hover:text-white hover:border-rose-400/60 flex items-center gap-1.5"
                >
                  Remove look
                </button>
              </div>
            )}
            <TickDial
              value={filterStrength}
              min={0}
              max={100}
              step={1}
              onChange={setFilterStrength}
              label={`${selectedFilter.name.toUpperCase()} INTENSITY`}
              unit="%"
            />
          </Sheet>
          {/* Contextual Advanced Studio Controls */}
          {proSettings.captureMode === 'night' && (
            <ModePanel title="Night studio" onClose={() => handleSelectCaptureMode('photo')}>
              <NightModeControls
                config={
                  stillSupport.night ? { ...nightModeConfig, isHardwareLongExposure: false } : nightModeConfig
                }
                onChangeConfig={(patch) => setNightModeConfig((p) => ({ ...p, ...patch }))}
                onCancelCapture={() => nightCaptureService.cancelCapture()}
              />
            </ModePanel>
          )}

          {proSettings.captureMode === 'dual' && (
            <ModePanel title="Dual camera" onClose={() => handleSelectCaptureMode('photo')}>
              <DualCameraControls
                config={dualCameraConfig}
                onChangeConfig={(patch) => {
                  setDualCameraConfig((p) => ({ ...p, ...patch }));
                  dualCameraService.setConfig(patch);
                }}
                onSwapCameras={handleSwapDualCameras}
              />
            </ModePanel>
          )}

          {proSettings.captureMode === 'slow_motion' && (
            <ModePanel title="Slow motion" onClose={() => handleSelectCaptureMode('photo')}>
              <SlowMoControls
                config={slowMotionConfig}
                onChangeConfig={(patch) => {
                  setSlowMotionConfig((p) => ({ ...p, ...patch }));
                  slowMotionService.setConfig(patch);
                  if (patch.targetFps) {
                    const track = cameraService.getVideoTrack();
                    slowMotionService.configureCameraForHighSpeed(track, patch.targetFps);
                  }
                }}
                isRecording={slowMotionConfig.isSlowMoRecording}
              />
            </ModePanel>
          )}

          {proSettings.captureMode === 'timelapse' && (
            <ModePanel title="Time-lapse" onClose={() => handleSelectCaptureMode('photo')}>
              <TimelapseControls
                config={timelapseConfig}
                onChangeConfig={(patch) => {
                  setTimelapseConfig((p) => ({ ...p, ...patch }));
                  timelapseService.setConfig(patch);
                }}
                isRecording={timelapseConfig.isRecording}
              />
            </ModePanel>
          )}

          {proSettings.captureMode === 'panorama' && (
            <ModePanel title="Panorama" onClose={() => { if (!panoRef.current) handleSelectCaptureMode('photo'); }}>
              <div className="w-full max-w-sm flex flex-col gap-2 text-[11px] font-mono">
                {panoState ? (
                  <>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, (panoState.widthPx / 7000) * 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-zinc-300">
                      <span>{panoState.direction === 0 ? 'Start moving sideways' : panoState.direction > 0 ? 'Sweeping right →' : '← Sweeping left'}</span>
                      <span>{panoState.widthPx} px</span>
                    </div>
                    {panoState.tooFast && <span className="text-rose-300 font-bold">Too fast: slow down or go back a little</span>}
                    <span className="text-zinc-500">Tap the shutter to finish.</span>
                  </>
                ) : (
                  <span className="text-zinc-400">Tap the shutter, then pan slowly in one direction. Tap again to stitch.</span>
                )}
              </div>
            </ModePanel>
          )}

          {proSettings.captureMode === 'portrait' && (
            <ModePanel title="Portrait" onClose={() => handleSelectCaptureMode('photo')}>
              <PortraitModeControls
                aperture={portraitAperture}
                onChangeAperture={setPortraitAperture}
                showEyelineGuide={showPortraitEyeline}
                onToggleEyelineGuide={() => setShowPortraitEyeline((p) => !p)}
                blurOn={portraitBlurOn}
                onToggleBlur={() => setPortraitBlurOn((b) => !b)}
                subjectFound={subjectBox !== null}
                aspectRatio={aspectRatio}
                onChangeAspectRatio={setAspectRatio}
              />
            </ModePanel>
          )}


          {proSettings.captureMode === 'video' ? (
            <CinemaVideoHUD
              delivered={deliveredVideo}
              config={cinemaConfig}
              onUpdateConfig={(patch) => cinemaVideoService.updateConfig(patch)}
              onToggleDrawer={() => cinemaVideoService.setMonitoringDrawerOpen(!cinemaConfig.isMonitoringDrawerOpen)}
              onOpenSlateModal={() => setIsSlateModalOpen(true)}
              onSelectLensZoom={handleZoomChange}
              currentZoom={zoomLevel}
              onToggleRecord={() => runWithTimer(handleToggleCinemaRecord, cinemaConfig.isRecording)}
              onOpenGallery={() => setIsGalleryOpen(true)}
              timecode={cameraService.formatTimecode(cinemaConfig.recordingElapsedSeconds, cinemaConfig.fps, cinemaConfig.timecodeMode)}
              storageEstimate={cinemaStorageEstimate}
              audioLevels={cinemaAudioLevels}
              onOpenPro={() => openPro()}
              onOpenProTab={openPro}
              minZoom={limits.min}
              maxZoom={limits.max}
              zoomType={zoomMagnificationType}
              focalLengthMm={reportedFocalMm}
              modeSelector={<CaptureModeSelector activeMode={proSettings.captureMode} onSelectMode={handleSelectCaptureMode} disabled={cinemaConfig.isRecording} />}
            />
          ) : (
            <>
              <ZoomStrip
                zoom={zoomLevel}
                min={limits.min}
                max={limits.max}
                onChange={handleZoomChange}
                zoomType={zoomMagnificationType}
                focalLengthMm={reportedFocalMm}
              />
            {/* Iconic Shutter Dock (Photo / Video recording) */}
            <ShutterDock
              onCapture={handleCaptureTrigger}
              isCapturing={isCapturing}
              timerCount={timerCount}
              onSelectTimer={setSelectedTimer}
              selectedTimer={selectedTimer}
              latestPhoto={latestPhoto}
              onOpenGallery={() => setIsGalleryOpen(true)}
              captureMode={proSettings.captureMode}
              onSelectCaptureMode={handleSelectCaptureMode}
              onToggleCaptureMode={() => handleToggleCaptureMode()}
              isRecordingVideo={
                isRecordingVideo ||
                panoState !== null ||
                slowMotionConfig.isSlowMoRecording ||
                timelapseConfig.isRecording
              }
              recordingDuration={
                slowMotionConfig.isSlowMoRecording
                  ? slowMotionConfig.recordingDuration
                  : timelapseConfig.isRecording
                    ? timelapseConfig.realDurationSeconds
                    : recordingDuration
              }
              burstMode={proSettings.burstMode}
              bracketingMode={proSettings.bracketingMode}
              burstProgress={burstProgress}
              onOpenAudioStudio={() => setIsAudioStudioOpen(true)}
            />
            </>
          )}
        </div>
      </div>

      {/* MODALS & DRAWERS */}
      {/* Cinema Contextual Panels (Exposure, Color, Focus, Audio) */}
      {proSettings.captureMode === 'video' && (
        <CinemaContextualPanels
          activeTab={cinemaConfig.activeContextualTab}
          onClose={() => cinemaVideoService.setActiveContextualTab(null)}
          config={cinemaConfig}
          onUpdateConfig={(patch) => cinemaVideoService.updateConfig(patch)}
          onExecuteRackFocus={handleExecuteRackFocus}
          audioLevels={cinemaAudioLevels}
        />
      )}

      {/* Cinema 8-Grid Monitoring Scopes Drawer */}
      <CinemaMonitoringDrawer
        isOpen={cinemaConfig.isMonitoringDrawerOpen}
        onClose={() => cinemaVideoService.setMonitoringDrawerOpen(false)}
        config={cinemaConfig}
        onToggleTool={(tool) => cinemaVideoService.toggleMonitoringTool(tool)}
        onUpdateConfig={(patch) => cinemaVideoService.updateConfig(patch)}
      />

      {/* Digital Cinema Production Slate Modal */}
      <ProductionSlateModal
        isOpen={isSlateModalOpen}
        onClose={() => setIsSlateModalOpen(false)}
        config={cinemaConfig}
        onUpdateConfig={(patch) => {
          cinemaVideoService.updateConfig(patch);
          // Pro settings and this screen share one codec / bitrate choice
          if (patch.codec) setProSettings((p) => ({ ...p, videoCodec: patch.codec === 'hevc' ? 'h265' : (patch.codec as ProSettings['videoCodec']) }));
          if (patch.bitrate) setProSettings((p) => ({ ...p, videoBitrate: patch.bitrate as ProSettings['videoBitrate'] }));
        }}
        availableResolutions={videoCaps.resolutions}
        availableFps={availableFps}
        availableCodecs={videoCaps.codecs}
        deliveredLabel={deliveredVideoLabel}
      />

      {/* Director Clean Feed Monitor Modal */}
      <DirectorMonitorModal
        isOpen={isDirectorMonitorOpen}
        onClose={() => setIsDirectorMonitorOpen(false)}
        config={cinemaConfig}
        videoRef={videoRef}
        timecode={cameraService.formatTimecode(
          cinemaConfig.recordingElapsedSeconds,
          cinemaConfig.fps,
          cinemaConfig.timecodeMode
        )}
      />

      {/* 1. Blackmagic Pro Manual Camera Settings Drawer */}
      <ProSettingsDrawer
        isOpen={isProDrawerOpen}
        onClose={() => setIsProDrawerOpen(false)}
        settings={proSettings}
        onChange={(patch) => {
          if (patch.photoFormat && patch.photoFormat !== 'jpeg') setHdrEnabled(false); // RAW and HDR are exclusive
          setProSettings((prev) => ({ ...prev, ...patch }));
        }}
        onReset={() => setProSettings(DEFAULT_PRO_SETTINGS)}
        onApplyPreset={handleApplyBlackmagicPreset}
        isFrontCamera={isFrontCamera}
        onSwitchCamera={handleSwitchCamera}
        onOpenLicenseInfo={() => setIsLicenseInfoOpen(true)}
        onOpenAdminDashboard={ADMIN_ENABLED ? () => setIsAdminDashboardOpen(true) : undefined}
        controlSupport={controlSupport}
        hardwareCaps={stream && stream.getVideoTracks()[0] ? cameraService.inspectCapabilities(stream.getVideoTracks()[0]) : undefined}
        activeHardwareProfile={hardwareIntelligenceService.getActiveProfile() || undefined}
        onOpenHardwareInspector={() => setIsHardwareInspectorOpen(true)}
        onScopesHost={setScopesHost}
        initialTab={proDrawerTab}
        selectedFilterId={selectedFilter.id}
        onSelectFilter={setSelectedFilter}
        stillSupport={stillSupport}
      />

      {/* 2. High-Res Photo Gallery & EXIF Metadata Inspector Modal */}
      <GalleryModal
        photos={capturedPhotos}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onDeletePhoto={(id) => {
          setCapturedPhotos((prev) => prev.filter((p) => p.id !== id));
          mediaStorageService.deletePhoto(id);
        }}
        onOpenEditor={(photo) => {
          setReviewingPhoto(photo);
          setIsPhotoEditorOpen(true);
        }}
        onOpenExportStudio={(photo) => {
          setExportPhoto(photo);
          setIsExportStudioOpen(true);
        }}
        onImportPhoto={handleImportPhoto}
      />

      {/* 3. Photography Composition Reference Showcase (3 Real Photos per Grid) */}
      <GridReferenceModal
        grid={referenceGrid || selectedGrid}
        isOpen={isReferenceModalOpen}
        onClose={() => setIsReferenceModalOpen(false)}
        onTryInCamera={(g) => {
          setSelectedGrid(g);
          setIsReferenceModalOpen(false);
        }}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* 4. Dedicated Grid & Guide Customizer Modal */}
      <GridCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        styleOptions={gridStyle}
        onChangeStyle={(patch) => setGridStyle((prev) => ({ ...prev, ...patch }))}
        secondaryGuides={secondaryGuides}
        onChangeSecondary={(patch) => setSecondaryGuides((prev) => ({ ...prev, ...patch }))}
        onReset={() => {
          setGridStyle(DEFAULT_GRID_STYLE);
          setSecondaryGuides(DEFAULT_SECONDARY_GUIDES);
        }}
        onSavePreset={(name) => {
          try {
            const savedCustom = JSON.parse(localStorage.getItem('cinegrid_custom_presets') || '[]');
            savedCustom.push({ name, style: gridStyle, secondary: secondaryGuides });
            localStorage.setItem('cinegrid_custom_presets', JSON.stringify(savedCustom));
          } catch {}
        }}
        activeGridType={selectedGrid.id}
        onUploadReferenceImage={handleUploadReferenceImage}
      />

      {/* Lazy-Loaded Modal Subsystems with Error Isolation */}
      <Suspense fallback={null}>
        {/* 5. One-Touch Master Photography Presets Modal */}
        {isMasterPresetsOpen && (
          <ErrorBoundary fallbackTitle="Master Presets Error" onReset={() => setIsMasterPresetsOpen(false)}>
            <MasterPresetsModal
              isOpen={isMasterPresetsOpen}
              onClose={() => setIsMasterPresetsOpen(false)}
              onApplyPreset={handleApplyMasterPreset}
              activePresetId={activePresetId}
            />
          </ErrorBoundary>
        )}

        {/* 6. Dedicated Post-Capture Review & Before/After Comparison Screen */}
        {isPhotoEditorOpen && (
          <ErrorBoundary fallbackTitle="Photo Editor Error" onReset={() => setIsPhotoEditorOpen(false)}>
            <PhotoEditorModal
              photo={reviewingPhoto}
              isOpen={isPhotoEditorOpen}
              onClose={() => setIsPhotoEditorOpen(false)}
              onSaveEditedPhoto={handleSaveEditedPhoto}
            />
          </ErrorBoundary>
        )}

        {/* 7. License Information Modal */}
        {isLicenseInfoOpen && (
          <ErrorBoundary fallbackTitle="Licensing Subsystem Error" onReset={() => setIsLicenseInfoOpen(false)}>
            <LicenseInfoModal
              isOpen={isLicenseInfoOpen}
              onClose={() => setIsLicenseInfoOpen(false)}
              onDeactivate={() => {
                setIsLicenseActivated(false);
                setLicenseSession(null);
                setIsLicenseInfoOpen(false);
              }}
              onOpenContactAdmin={() => setIsContactAdminOpen(true)}
            />
          </ErrorBoundary>
        )}

        {/* 8. Administrator License Dashboard Modal */}
        {isAdminDashboardOpen && (
          <ErrorBoundary fallbackTitle="Admin Dashboard Error" onReset={() => setIsAdminDashboardOpen(false)}>
            <AdminDashboardModal
              isOpen={isAdminDashboardOpen}
              onClose={() => setIsAdminDashboardOpen(false)}
              onUseLicenseInApp={(key, name) => {
                licenseService.activate(name, key).then((res) => {
                  if (res.success) {
                    setLicenseSession(res.session || null);
                    setIsLicenseActivated(true);
                    setIsAdminDashboardOpen(false);
                  }
                });
              }}
            />
          </ErrorBoundary>
        )}

        {/* 9. Contact Administrator Support Modal */}
        {isContactAdminOpen && (
          <ErrorBoundary fallbackTitle="Contact Admin Error" onReset={() => setIsContactAdminOpen(false)}>
            <ContactAdminModal
              isOpen={isContactAdminOpen}
              onClose={() => setIsContactAdminOpen(false)}
              onSelectSampleKey={(key, name) => {
                licenseService.activate(name, key).then((res) => {
                  if (res.success) {
                    setLicenseSession(res.session || null);
                    setIsLicenseActivated(true);
                    setIsContactAdminOpen(false);
                  }
                });
              }}
            />
          </ErrorBoundary>
        )}

        {/* 10. Ghost Overlay Reference Configuration Drawer */}
        <GhostOverlayDrawer
          isOpen={isGhostDrawerOpen}
          onClose={() => setIsGhostDrawerOpen(false)}
          settings={ghostSettings}
          onUpdate={(patch) => setGhostSettings((prev) => ({ ...prev, ...patch }))}
          onReset={() =>
            setGhostSettings((prev) => ({
              ...prev,
              scale: 1.0,
              rotation: 0,
              offsetX: 0,
              offsetY: 0,
              opacity: 0.5,
            }))
          }
          capturedPhotos={capturedPhotos}
        />

        {/* 11. Photography Sessions Manager Modal */}
        {isSessionsModalOpen && (
          <ErrorBoundary fallbackTitle="Sessions Manager Error" onReset={() => setIsSessionsModalOpen(false)}>
            <SessionsManagerModal
              isOpen={isSessionsModalOpen}
              onClose={() => setIsSessionsModalOpen(false)}
              onSelectSessionToShoot={(session) => {
                sessionService.setActiveSession(session.id);
                setActiveSession(session);
                if (session.selectedGridId) {
                  const found = COMPREHENSIVE_GRID_LIBRARY.find((g) => g.id === session.selectedGridId);
                  if (found) setSelectedGrid(found);
                }
                if (session.preferredAspectRatio) {
                  setAspectRatio(session.preferredAspectRatio);
                }
                if (session.referencePhotos.length > 0) {
                  setGhostSettings((prev) => ({
                    ...prev,
                    enabled: true,
                    imageUrl: session.referencePhotos[0].url,
                    imageName: session.referencePhotos[0].title || session.name,
                  }));
                }
                setMainNavTab('camera');
              }}
              photos={capturedPhotos}
              onOpenPhotoEditor={(photo) => {
                setReviewingPhoto(photo);
                setIsPhotoEditorOpen(true);
              }}
              onOpenExportStudio={(photo) => {
                setExportPhoto(photo);
                setIsExportStudioOpen(true);
              }}
            />
          </ErrorBoundary>
        )}

        {/* 12. Professional Export Studio Modal */}
        {isExportStudioOpen && (
          <ErrorBoundary fallbackTitle="Export Studio Error" onReset={() => setIsExportStudioOpen(false)}>
            <ExportStudioModal
              isOpen={isExportStudioOpen}
              onClose={() => setIsExportStudioOpen(false)}
              photo={exportPhoto || reviewingPhoto || latestPhoto}
            />
          </ErrorBoundary>
        )}

        {/* 13. Professional Filter & 3D LUT Studio Modal */}
        {isLookModalOpen && (
          <ErrorBoundary fallbackTitle="Look Studio Error" onReset={() => setIsLookModalOpen(false)}>
            <LookStudioModal
              isOpen={isLookModalOpen}
              onClose={() => setIsLookModalOpen(false)}
              lookState={lookState}
              onChangeLookState={(patch) => setLookState((prev) => ({ ...prev, ...patch }))}
              onResetLook={() => setLookState(DEFAULT_LOOK_STATE)}
              hasCapturedPhoto={!!latestPhoto}
              onCompareWithLastPhoto={() => {
                if (!latestPhoto) return;
                setIsLookModalOpen(false);
                setReviewingPhoto(latestPhoto);
                setIsPhotoEditorOpen(true);
              }}
            />
          </ErrorBoundary>
        )}

        {/* 14. Dedicated Audio Intelligence Studio Modal */}
        {isAudioStudioOpen && (
          <ErrorBoundary fallbackTitle="Audio Studio Error" onReset={() => setIsAudioStudioOpen(false)}>
            <AudioStudioModal
              isOpen={isAudioStudioOpen}
              onClose={() => setIsAudioStudioOpen(false)}
            />
          </ErrorBoundary>
        )}

        {/* 15. Device Hardware Intelligence Inspector Modal */}
        {isHardwareInspectorOpen && (
          <ErrorBoundary fallbackTitle="Hardware Inspector Error" onReset={() => setIsHardwareInspectorOpen(false)}>
            <HardwareInspectorModal
              isOpen={isHardwareInspectorOpen}
              onClose={() => setIsHardwareInspectorOpen(false)}
              report={hardwareReport}
              onRefreshHardware={async () => {
                const rep = await hardwareIntelligenceService.scanHardware(true);
                setHardwareReport(rep);
              }}
              activeDeviceId={activeDeviceId}
              onSelectCamera={(id) => {
                setActiveDeviceId(id);
                initCamera(id);
              }}
            />
          </ErrorBoundary>
        )}

        {/* Automatic Physical Lens Selection Feedback Toast */}
        {lensSelectionFeedback && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-black/90 border border-amber-400/60 text-amber-300 font-mono text-[11px] font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 pointer-events-none">
            <Camera size={13} className="text-amber-400" />
            <span>{lensSelectionFeedback}</span>
          </div>
        )}
      </Suspense>
    </div>
  );
}

export default App;

