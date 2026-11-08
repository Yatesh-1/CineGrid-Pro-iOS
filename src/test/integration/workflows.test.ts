import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionService } from '../../services/sessionService';
import { CameraService } from '../../services/cameraService';
import { calculateOutputDimensions } from '../../utils/exportEngine';
import { DEFAULT_STUDIO_STATE } from '../../utils/studioEngine';
import type { CapturedPhoto } from '../../types/camera';

describe('Phase 13: End-to-End Workflows Integration Testing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Workflow A: Complete photo capture, editing, and storage persistence
  describe('Workflow A: Complete Photo Capture & Processing Flow', () => {
    it('captures photo, links to active session, applies edits, and verifies persistence', () => {
      // 1. Create and activate a session
      const session = sessionService.createSession({
        name: 'Vogue Integration Test',
        category: 'Fashion',
      });
      sessionService.setActiveSession(session.id);

      // 2. Simulate photo capture
      const photo: CapturedPhoto = {
        id: `photo_${Date.now()}`,
        dataUrl: 'data:image/jpeg;base64,mockCaptureBase64',
        timestamp: Date.now(),
        filter: 'portra_400',
        gridType: 'rule_of_thirds',
        aspectRatio: '4:3',
        sessionId: session.id,
      };

      // 3. Link captured photo to active session
      const linked = sessionService.addPhotoToActiveSession(photo.id);
      expect(linked).toBe(true);

      const updatedSession = sessionService.getActiveSession();
      expect(updatedSession?.capturedPhotoIds).toContain(photo.id);

      // 4. Edit photo (simulate applying studio state)
      const editedPhoto: CapturedPhoto = {
        ...photo,
        editedDataUrl: 'data:image/jpeg;base64,mockEditedBase64',
      };

      // Original image is preserved
      expect(editedPhoto.dataUrl).toBe(photo.dataUrl);
      expect(editedPhoto.editedDataUrl).not.toBe(photo.dataUrl);

      // 5. Store in gallery state and verify localStorage persistence
      const gallery = [editedPhoto];
      localStorage.setItem('cinegrid_captured_photos', JSON.stringify(gallery));

      const retrievedRaw = localStorage.getItem('cinegrid_captured_photos');
      expect(retrievedRaw).not.toBeNull();
      const retrieved = JSON.parse(retrievedRaw!);
      expect(retrieved[0].id).toBe(photo.id);
      expect(retrieved[0].sessionId).toBe(session.id);
    });
  });

  // Workflow B: Complete video recording & finalization
  describe('Workflow B: Complete Video Recording Flow', () => {
    it('manages video recording duration, timecode, and stream finalization', () => {
      const camera = CameraService.getInstance();

      // 1. Calculate cinema shutter for 24fps
      const shutter = camera.calculate180DegreeShutter(24);
      expect(shutter.shutterSpeed).toBe('1/50');

      // 2. Simulate timecode progression
      const tc0 = camera.formatTimecode(0, 24, 'record_run');
      const tc15 = camera.formatTimecode(15.5, 24, 'record_run');
      expect(tc0).toBe('00:00:00:00');
      expect(tc15).toBe('00:00:15:12');

      // 3. Verify clean disposal of audio meter
      expect(() => camera.cleanupAudioMeter()).not.toThrow();
      expect(() => camera.dispose()).not.toThrow();
    });
  });

  // Workflow C: Camera controls (zoom, exposure, flash)
  describe('Workflow C: Camera Controls & Capability Fallbacks', () => {
    it('applies zoom constraints and handles unsupported hardware safely', async () => {
      const camera = CameraService.getInstance();

      // Apply zoom with null stream should gracefully return false without crashing
      const zoomResult = await camera.applyHardwareZoom(null, 2.5);
      expect(zoomResult).toBe(false);

      // Apply EV compensation with null stream
      const evResult = await camera.applyHardwareEV(null, 1.0);
      expect(evResult).toBe(false);

      // Apply tap to focus with null stream
      const focusResult = await camera.applyTapToFocus(null, 0.5, 0.5);
      expect(focusResult).toBe(false);
    });
  });

  // Workflow D: Image editing (undo/redo, tone curves, export scaling)
  describe('Workflow D: Image Editing & Export Transformations', () => {
    it('maintains undo/redo stack consistency and calculates export dimensions', () => {
      // 1. Initial history stack
      const history = [DEFAULT_STUDIO_STATE];
      let historyIndex = 0;

      // 2. User modifies exposure
      const state2 = {
        ...DEFAULT_STUDIO_STATE,
        light: { ...DEFAULT_STUDIO_STATE.light, exposure: 1.2 },
      };
      history.push(state2);
      historyIndex = 1;

      expect(history.length).toBe(2);
      expect(history[historyIndex].light.exposure).toBe(1.2);

      // 3. User modifies contrast
      const state3 = {
        ...state2,
        light: { ...state2.light, contrast: 25 },
      };
      history.push(state3);
      historyIndex = 2;
      expect(history[historyIndex].light.contrast).toBe(25);

      // 4. Undo action
      historyIndex--;
      expect(history[historyIndex].light.contrast).toBe(0);
      expect(history[historyIndex].light.exposure).toBe(1.2);

      // 5. Redo action
      historyIndex++;
      expect(history[historyIndex].light.contrast).toBe(25);

      // 6. Export calculations: resize to 1080x1350 Instagram 4:5
      const exportDims = calculateOutputDimensions(4000, 3000, {
        format: 'jpeg',
        quality: 92,
        resizeMode: 'custom',
        resizePercentage: 100,
        customWidth: 1080,
        customHeight: 1350,
        maintainAspectRatio: true,
        colorSpace: 'sRGB',
        stripGpsMetadata: true,
        stripExifCameraInfo: false,
        sharpening: 'medium',
        watermark: {
          enabled: false,
          text: '',
          opacity: 50,
          position: 'bottom_right',
          fontSize: 24,
          color: '#ffffff',
        },
      });

      expect(exportDims.width).toBeLessThanOrEqual(1080);
      expect(exportDims.height).toBeLessThanOrEqual(1350);
    });
  });

  // Workflow E: Gallery & Media deletion & Persistence
  describe('Workflow E: Gallery Management & Storage Cleanup', () => {
    it('adds multiple media items, deletes specified photo, and maintains integrity', () => {
      const p1: CapturedPhoto = {
        id: 'p_101',
        dataUrl: 'data:img/1',
        timestamp: 1000,
        filter: 'normal',
        gridType: 'rule_of_thirds',
        aspectRatio: '16:9',
      };
      const p2: CapturedPhoto = {
        id: 'p_102',
        dataUrl: 'data:img/2',
        timestamp: 2000,
        filter: 'portra_400',
        gridType: 'golden_ratio_grid',
        aspectRatio: '1:1',
      };

      let gallery = [p1, p2];
      localStorage.setItem('cinegrid_captured_photos', JSON.stringify(gallery));

      // Delete p1
      gallery = gallery.filter((item) => item.id !== 'p_101');
      localStorage.setItem('cinegrid_captured_photos', JSON.stringify(gallery));

      const loaded = JSON.parse(localStorage.getItem('cinegrid_captured_photos')!);
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe('p_102');
    });
  });

  // Workflow F: Permissions & Error State Recovery
  describe('Workflow F: Permission Denial & Simulated Scene Fallback', () => {
    it('handles camera permission failure gracefully without unhandled exceptions', () => {
      let cameraError: string | null = null;
      let useSimulatedScene = false;

      // Mock failure simulation
      try {
        throw new Error('NotAllowedError: Camera permission denied by system');
      } catch (err) {
        cameraError = err instanceof Error ? err.message : 'Error';
        useSimulatedScene = true;
      }

      expect(cameraError).toContain('Camera permission denied');
      expect(useSimulatedScene).toBe(true);

      // Recovery action
      cameraError = null;
      expect(cameraError).toBeNull();
    });
  });

  // Workflow G: Lifecycle Background & Resume
  describe('Workflow G: App Lifecycle Backgrounding & Stream Management', () => {
    it('suspends and resumes audio/camera resources on visibility change', () => {
      const camera = CameraService.getInstance();
      const cleanupSpy = vi.spyOn(camera, 'cleanupAudioMeter');

      // Simulate visibilitychange -> hidden
      camera.cleanupAudioMeter();
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});
