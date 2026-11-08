import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CinemaVideoHUD } from '../../components/cinema/CinemaVideoHUD';
import { DEFAULT_CINEMA_CONFIG } from '../../types/cinemaVideo';

describe('CinemaVideoHUD Component Tests', () => {
  const defaultProps = {
    config: { ...DEFAULT_CINEMA_CONFIG },
    onUpdateConfig: vi.fn(),
    onToggleDrawer: vi.fn(),
    onOpenSlateModal: vi.fn(),
    onOpenProTab: vi.fn(),
    onSelectLensZoom: vi.fn(),
    currentZoom: 1.0,
    onToggleRecord: vi.fn(),
    onOpenGallery: vi.fn(),
    timecode: '00:00:14:12',
    storageEstimate: { freeGb: 64, remainingMinutes: 165 },
    audioLevels: { leftDb: -18, rightDb: -19, peakClipping: false },
    onToggleCaptureMode: vi.fn(),
  };

  it('renders top telemetry bar with format, shutter, ISO, WB, and storage', () => {
    render(<CinemaVideoHUD {...defaultProps} />);

    // Format & Codec
    expect(screen.getByText(/1080p/i)).toBeInTheDocument();
    expect(screen.getByText(/30 FPS/i)).toBeInTheDocument();
    expect(screen.getByText(/h264/i)).toBeInTheDocument();

    // Shutter & WB
    expect(screen.getByText(/180°/)).toBeInTheDocument();
    expect(screen.getByText(/ISO 100/)).toBeInTheDocument();
    expect(screen.getByText('5600K')).toBeInTheDocument();

    // Storage
    expect(screen.getByText('EST 2h 45m')).toBeInTheDocument();

    // Timecode
    expect(screen.getByText('00:00:14:12')).toBeInTheDocument();
  });

  it('renders lens selection switches [0.5x], [1x], [3x] and triggers callback', () => {
    render(<CinemaVideoHUD {...defaultProps} />);

    const halfX = screen.getByText('0.5x');
    const oneX = screen.getByText('1x');
    const threeX = screen.getByText('3x');

    expect(halfX).toBeInTheDocument();
    expect(oneX).toBeInTheDocument();
    expect(threeX).toBeInTheDocument();

    fireEvent.click(threeX);
    expect(defaultProps.onSelectLensZoom).toHaveBeenCalledWith(3.0);
  });

  it('has no separate exposure / color / focus / audio row: those settings live in Pro', () => {
    render(<CinemaVideoHUD {...defaultProps} />);
    for (const name of ['exposure', 'color', 'focus', 'audio']) {
      expect(screen.queryByText(name)).toBeNull();
    }
  });

  it('triggers record toggle when clicking the prominent cinema record button', () => {
    render(<CinemaVideoHUD {...defaultProps} />);

    const recordBtn = screen.getByLabelText('Start Recording');
    fireEvent.click(recordBtn);
    expect(defaultProps.onToggleRecord).toHaveBeenCalledTimes(1);
  });

  it('renders the iPhone-style mode selector passed to it, above the record button', () => {
    render(<CinemaVideoHUD {...defaultProps} modeSelector={<div data-testid="modes">modes</div>} />);
    expect(screen.getByTestId('modes')).toBeInTheDocument();
  });

  it('no longer shows a battery percentage', () => {
    render(<CinemaVideoHUD {...defaultProps} />);
    expect(screen.queryByText('88%')).toBeNull();
  });

  it('opens pro settings directly from the video screen', () => {
    const onOpenPro = vi.fn();
    render(<CinemaVideoHUD {...defaultProps} onOpenPro={onOpenPro} />);
    fireEvent.click(screen.getByLabelText('Open Pro Settings'));
    expect(onOpenPro).toHaveBeenCalledTimes(1);
  });

  it('hides the PRO button when no handler is supplied', () => {
    render(<CinemaVideoHUD {...defaultProps} />);
    expect(screen.queryByLabelText('Open Pro Settings')).toBeNull();
  });

  it('zooms 0.5x to 8x from a sliding strip of stops and never beyond 8x', () => {
    const onSelectLensZoom = vi.fn();
    render(<CinemaVideoHUD {...defaultProps} onSelectLensZoom={onSelectLensZoom} />);

    fireEvent.click(screen.getByText('8x'));
    expect(onSelectLensZoom).toHaveBeenLastCalledWith(8);
    fireEvent.click(screen.getByText('0.5x'));
    expect(onSelectLensZoom).toHaveBeenLastCalledWith(0.5);
    expect(screen.queryByText('10x')).toBeNull();
    expect(screen.queryByText('24x')).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('puts every control below the frame: the panel is in normal flow, not an overlay', () => {
    render(<CinemaVideoHUD {...defaultProps} />);
    const panel = screen.getByTestId('video-panel');
    expect(panel.className).not.toMatch(/\babsolute\b/);
    expect(panel.className).not.toMatch(/\binset-/);
  });

  it('opens Pro on the matching tab from every readout', () => {
    const onOpenProTab = vi.fn();
    render(<CinemaVideoHUD {...defaultProps} onOpenProTab={onOpenProTab} />);

    fireEvent.click(screen.getByText(/ISO 100/));
    expect(onOpenProTab).toHaveBeenLastCalledWith('exposure');
    fireEvent.click(screen.getByText(/180?/));
    expect(onOpenProTab).toHaveBeenLastCalledWith('exposure');
    fireEvent.click(screen.getByText('5600K'));
    expect(onOpenProTab).toHaveBeenLastCalledWith('color');
    fireEvent.click(screen.getByText('AF'));
    expect(onOpenProTab).toHaveBeenLastCalledWith('focus');
    fireEvent.click(screen.getByTitle('Live audio levels: open Pro recording settings'));
    expect(onOpenProTab).toHaveBeenLastCalledWith('recording');
  });

  it('shows MF when focus is manual', () => {
    render(<CinemaVideoHUD {...defaultProps} config={{ ...DEFAULT_CINEMA_CONFIG, focusMode: 'manual' }} />);
    expect(screen.getByText('MF')).toBeInTheDocument();
  });

  it('triggers scopes drawer toggle when clicking SCOPES button', () => {
    render(<CinemaVideoHUD {...defaultProps} />);

    const scopesBtn = screen.getByTitle('Open 8 Monitoring Scopes Drawer');
    fireEvent.click(scopesBtn);
    expect(defaultProps.onToggleDrawer).toHaveBeenCalledTimes(1);
  });
});
