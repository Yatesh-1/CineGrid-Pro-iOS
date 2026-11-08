import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShutterDock } from '../../components/ShutterDock';

describe('ShutterDock Component Tests', () => {
  it('renders mode selectors for PHOTO and VIDEO', () => {
    const onToggle = vi.fn();
    render(
      <ShutterDock
        onCapture={vi.fn()}
        isCapturing={false}
        timerCount={null}
        onSelectTimer={vi.fn()}
        selectedTimer={0}
        latestPhoto={null}
        onOpenGallery={vi.fn()}
        captureMode="photo"
        onToggleCaptureMode={onToggle}
      />
    );

    const photoBtn = screen.getByText('PHOTO');
    const videoBtn = screen.getByText('VIDEO');

    expect(photoBtn).toBeInTheDocument();
    expect(videoBtn).toBeInTheDocument();

    // Clicking video mode triggers toggle
    fireEvent.click(videoBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('triggers onCapture callback when clicking shutter button in photo mode', () => {
    const onCapture = vi.fn();
    render(
      <ShutterDock
        onCapture={onCapture}
        isCapturing={false}
        timerCount={null}
        onSelectTimer={vi.fn()}
        selectedTimer={0}
        latestPhoto={null}
        onOpenGallery={vi.fn()}
        captureMode="photo"
        onToggleCaptureMode={vi.fn()}
      />
    );

    const captureButton = screen.getByTitle('Take High-Res Photo');
    expect(captureButton).toBeInTheDocument();

    fireEvent.click(captureButton);
    expect(onCapture).toHaveBeenCalledTimes(1);
  });

  it('displays recording state and duration in video mode', () => {
    render(
      <ShutterDock
        onCapture={vi.fn()}
        isCapturing={false}
        timerCount={null}
        onSelectTimer={vi.fn()}
        selectedTimer={0}
        latestPhoto={null}
        onOpenGallery={vi.fn()}
        captureMode="video"
        onToggleCaptureMode={vi.fn()}
        isRecordingVideo={true}
        recordingDuration={75} // 01:15
      />
    );

    expect(screen.getByText('01:15')).toBeInTheDocument();
    expect(screen.getByTitle('Stop Recording')).toBeInTheDocument();
  });

  it('opens gallery when clicking the thumbnail button', () => {
    const onOpenGallery = vi.fn();
    render(
      <ShutterDock
        onCapture={vi.fn()}
        isCapturing={false}
        timerCount={null}
        onSelectTimer={vi.fn()}
        selectedTimer={0}
        latestPhoto={null}
        onOpenGallery={onOpenGallery}
        captureMode="photo"
        onToggleCaptureMode={vi.fn()}
      />
    );

    const galleryBtn = screen.getByTitle('Open Photo Gallery & Editor');
    fireEvent.click(galleryBtn);
    expect(onOpenGallery).toHaveBeenCalledTimes(1);
  });
});
