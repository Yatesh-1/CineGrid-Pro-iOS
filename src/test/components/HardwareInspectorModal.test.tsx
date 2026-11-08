import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HardwareInspectorModal } from '../../components/hardware/HardwareInspectorModal';
import type { DeviceHardwareReport } from '../../types/hardware';

const mockReport: DeviceHardwareReport = {
  platform: 'ios',
  platformDescription: 'iOS Native App (AVFoundation Bridge)',
  isNativeBridgeActive: true,
  nativeFramework: 'AVFoundation',
  totalCameras: 3,
  rearCameras: [
    {
      deviceId: 'cam_back_uw',
      label: 'Ultra Wide Camera (0.5x)',
      role: 'ultrawide',
      facing: 'back',
      opticalZoomFactor: 0.5,
      equivalentFocalLengthMm: 13,
      nativeAperture: 'f/2.2',
      supportedResolutions: [{ label: '4K UHD (3840×2160)', width: 3840, height: 2160, aspectRatio: '16:9' }],
      frameRate: { min: 24, max: 120, supportedFps: [24, 30, 60, 120], supportsSlowMo: true },
      exposure: {
        hasHardwareExposureTime: true,
        minExposureDurationMs: 0.125,
        maxExposureDurationMs: 1000,
        hasHardwareIso: true,
        minIso: 50,
        maxIso: 3200,
        stepIso: 50,
        hasExposureCompensation: true,
        minEv: -3.0,
        maxEv: 3.0,
        stepEv: 0.1,
      },
      focus: { hasAutoFocus: true, hasManualFocus: true, isFixedFocus: false, supportedModes: ['continuous', 'manual'] },
      whiteBalance: { hasAuto: true, hasManualKelvin: true, minKelvin: 2500, maxKelvin: 9000, stepKelvin: 100, supportedModes: ['continuous', 'manual'] },
      hasHardwareZoom: true,
      minHardwareZoom: 1.0,
      maxHardwareZoom: 5.0,
      stepHardwareZoom: 0.1,
      hasTorch: true,
      hasOpticalStabilization: false,
      hasElectronicStabilization: true,
      hasDepthCapture: true,
      isMacroCapable: true,
      isVirtualLogicalDevice: false,
    },
    {
      deviceId: 'cam_back_w',
      label: 'Wide Primary Camera (1x)',
      role: 'wide',
      facing: 'back',
      opticalZoomFactor: 1.0,
      equivalentFocalLengthMm: 24,
      nativeAperture: 'f/1.6',
      supportedResolutions: [{ label: '4K UHD (3840×2160)', width: 3840, height: 2160, aspectRatio: '16:9' }],
      frameRate: { min: 24, max: 120, supportedFps: [24, 30, 60, 120], supportsSlowMo: true },
      exposure: {
        hasHardwareExposureTime: true,
        minExposureDurationMs: 0.125,
        maxExposureDurationMs: 1000,
        hasHardwareIso: true,
        minIso: 50,
        maxIso: 6400,
        stepIso: 50,
        hasExposureCompensation: true,
        minEv: -3.0,
        maxEv: 3.0,
        stepEv: 0.1,
      },
      focus: { hasAutoFocus: true, hasManualFocus: true, isFixedFocus: false, supportedModes: ['continuous', 'manual'] },
      whiteBalance: { hasAuto: true, hasManualKelvin: true, minKelvin: 2500, maxKelvin: 9000, stepKelvin: 100, supportedModes: ['continuous', 'manual'] },
      hasHardwareZoom: true,
      minHardwareZoom: 1.0,
      maxHardwareZoom: 5.0,
      stepHardwareZoom: 0.1,
      hasTorch: true,
      hasOpticalStabilization: true,
      hasElectronicStabilization: true,
      hasDepthCapture: true,
      isMacroCapable: false,
      isVirtualLogicalDevice: false,
    },
  ],
  frontCameras: [
    {
      deviceId: 'cam_front',
      label: 'TrueDepth Front Camera',
      role: 'front_wide',
      facing: 'front',
      opticalZoomFactor: 1.0,
      equivalentFocalLengthMm: 23,
      nativeAperture: 'f/2.2',
      supportedResolutions: [{ label: '4K UHD (3840×2160)', width: 3840, height: 2160, aspectRatio: '16:9' }],
      frameRate: { min: 24, max: 60, supportedFps: [24, 30, 60], supportsSlowMo: false },
      exposure: {
        hasHardwareExposureTime: false,
        minExposureDurationMs: 1,
        maxExposureDurationMs: 1000,
        hasHardwareIso: false,
        minIso: 100,
        maxIso: 1600,
        stepIso: 100,
        hasExposureCompensation: true,
        minEv: -2.0,
        maxEv: 2.0,
        stepEv: 0.1,
      },
      focus: { hasAutoFocus: true, hasManualFocus: false, isFixedFocus: false, supportedModes: ['auto'] },
      whiteBalance: { hasAuto: true, hasManualKelvin: false, minKelvin: 3000, maxKelvin: 7000, stepKelvin: 200, supportedModes: ['auto'] },
      hasHardwareZoom: false,
      minHardwareZoom: 1.0,
      maxHardwareZoom: 3.0,
      stepHardwareZoom: 0.1,
      hasTorch: false,
      hasOpticalStabilization: false,
      hasElectronicStabilization: true,
      hasDepthCapture: true,
      isMacroCapable: false,
      isVirtualLogicalDevice: false,
    },
  ],
  allCameras: [],
  opticalLensSteps: [
    { factor: 0.5, label: '0.5x', focalLengthLabel: '13mm', role: 'ultrawide', deviceId: 'cam_back_uw', isPhysicalSwitch: true },
    { factor: 1.0, label: '1x', focalLengthLabel: '24mm', role: 'wide', deviceId: 'cam_back_w', isPhysicalSwitch: true },
  ],
  hasConcurrentCameraSupport: true,
  concurrentCombinations: [{ primaryId: 'cam_back_w', secondaryId: 'cam_front' }],
  audioInputsCount: 2,
  detectedAt: Date.now(),
  warningsAndLimitations: [],
};

mockReport.allCameras = [...mockReport.rearCameras, ...mockReport.frontCameras];

describe('HardwareInspectorModal Component Tests', () => {
  it('renders modal with hardware title, platform details, and detected sensors when open', () => {
    render(
      <HardwareInspectorModal
        isOpen={true}
        onClose={vi.fn()}
        report={mockReport}
        activeDeviceId="cam_back_w"
      />
    );

    expect(screen.getByText('DEVICE HARDWARE INTELLIGENCE')).toBeInTheDocument();
    expect(screen.getByText(/AVFoundation/)).toBeInTheDocument();
    expect(screen.getByText('Detected Physical Sensors (3)')).toBeInTheDocument();
    expect(screen.getByText('Ultra Wide Camera (0.5x)')).toBeInTheDocument();
    expect(screen.getAllByText('Wide Primary Camera (1x)')[0]).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <HardwareInspectorModal
        isOpen={false}
        onClose={vi.fn()}
        report={mockReport}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('allows clicking different camera profiles to inspect sensor specifics', () => {
    render(
      <HardwareInspectorModal
        isOpen={true}
        onClose={vi.fn()}
        report={mockReport}
        activeDeviceId="cam_back_w"
      />
    );

    const uwItem = screen.getByText('Ultra Wide Camera (0.5x)');
    fireEvent.click(uwItem);

    expect(screen.getAllByText(/ULTRAWIDE/i).length).toBeGreaterThan(0);
  });

  it('calls onClose when Done or close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <HardwareInspectorModal
        isOpen={true}
        onClose={handleClose}
        report={mockReport}
        activeDeviceId="cam_back_w"
      />
    );

    const doneBtn = screen.getByText('Done');
    fireEvent.click(doneBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
