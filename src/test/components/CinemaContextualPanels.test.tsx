import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CinemaContextualPanels } from '../../components/cinema/CinemaContextualPanels';
import { DEFAULT_CINEMA_CONFIG } from '../../types/cinemaVideo';

describe('CinemaContextualPanels Component Tests', () => {
  const defaultProps = {
    activeTab: 'exposure' as const,
    onClose: vi.fn(),
    config: { ...DEFAULT_CINEMA_CONFIG },
    onUpdateConfig: vi.fn(),
    onExecuteRackFocus: vi.fn(),
    audioLevels: { leftDb: -14, rightDb: -15, peakClipping: false },
  };

  it('renders Exposure tab controls (shutter angle presets, ISO, EV, exposure lock)', () => {
    render(<CinemaContextualPanels {...defaultProps} activeTab="exposure" />);

    expect(screen.getByText(/EXPOSURE CONTROLS/i)).toBeInTheDocument();
    expect(screen.getByText('SHUTTER ANGLE')).toBeInTheDocument();
    expect(screen.getByText('180°')).toBeInTheDocument();
    expect(screen.getByText('172.8°')).toBeInTheDocument();
    expect(screen.getByText('144°')).toBeInTheDocument();
    expect(screen.getByText('90°')).toBeInTheDocument();
    expect(screen.getByText('45°')).toBeInTheDocument();

    // Click 90°
    fireEvent.click(screen.getByText('90°'));
    expect(defaultProps.onUpdateConfig).toHaveBeenCalledWith({ shutterAngle: 90 });
  });

  it('renders Color tab controls (Kelvin presets, tint, color profile, bake LUT)', () => {
    render(<CinemaContextualPanels {...defaultProps} activeTab="color" />);

    expect(screen.getByText(/COLOR CONTROLS/i)).toBeInTheDocument();
    expect(screen.getByText('3200K Tungsten')).toBeInTheDocument();
    expect(screen.getByText('5600K Daylight')).toBeInTheDocument();
    expect(screen.getByText('Flat Log')).toBeInTheDocument();
    expect(screen.getByText('Rec.709')).toBeInTheDocument();

    // Click Flat Log
    fireEvent.click(screen.getByText('Flat Log').closest('button')!);
    expect(defaultProps.onUpdateConfig).toHaveBeenCalledWith({ colorProfile: 'flat_log' });
  });

  it('renders Focus tab controls (AF/MF, manual focus, rack focus Point A/B, rack execute)', () => {
    render(<CinemaContextualPanels {...defaultProps} activeTab="focus" />);

    expect(screen.getByText(/FOCUS CONTROLS/i)).toBeInTheDocument();
    expect(screen.getByText('AUTO (AF)')).toBeInTheDocument();
    expect(screen.getByText('MANUAL (MF)')).toBeInTheDocument();
    expect(screen.getByText('RACK FOCUS AUTOMATION')).toBeInTheDocument();

    const rackAtoBBtn = screen.getByText(/RACK A → B/);
    fireEvent.click(rackAtoBBtn);
    expect(defaultProps.onExecuteRackFocus).toHaveBeenCalledWith('A_to_B');
  });

  it('renders Audio tab controls (stereo VU meters, noise modes, mute)', () => {
    render(<CinemaContextualPanels {...defaultProps} activeTab="audio" />);

    expect(screen.getByText(/AUDIO CONTROLS/i)).toBeInTheDocument();
    expect(screen.getByText('STEREO INPUT VU METER')).toBeInTheDocument();
    expect(screen.getByText('NOISE REDUCTION DSP')).toBeInTheDocument();
    expect(screen.getByText('wind')).toBeInTheDocument();
    expect(screen.getByText('MUTE AUDIO')).toBeInTheDocument();

    fireEvent.click(screen.getByText('wind'));
    expect(defaultProps.onUpdateConfig).toHaveBeenCalledWith({ audioNoiseMode: 'wind' });
  });

  it('does not render when activeTab is null', () => {
    const { container } = render(
      <CinemaContextualPanels {...defaultProps} activeTab={null} />
    );
    expect(container.firstChild).toBeNull();
  });
});
