import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CinemaMonitoringDrawer } from '../../components/cinema/CinemaMonitoringDrawer';
import { DEFAULT_CINEMA_CONFIG } from '../../types/cinemaVideo';

describe('CinemaMonitoringDrawer Component Tests', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    config: {
      ...DEFAULT_CINEMA_CONFIG,
      activeScopes: new Set<'false_color' | 'waveform'>(),
    },
    onToggleTool: vi.fn(),
    onUpdateConfig: vi.fn(),
  };

  it('renders all 8 monitoring tools matching the SmallHD / Blackmagic design', () => {
    render(<CinemaMonitoringDrawer {...defaultProps} />);

    expect(screen.getByText('False Color')).toBeInTheDocument();
    expect(screen.getByText('Waveform')).toBeInTheDocument();
    expect(screen.getByText('RGB Parade')).toBeInTheDocument();
    expect(screen.getByText('Vectorscope')).toBeInTheDocument();
    expect(screen.getByText('Zebra')).toBeInTheDocument();
    expect(screen.getByText('Peaking')).toBeInTheDocument();
    expect(screen.getByText('Histogram')).toBeInTheDocument();
    expect(screen.getByText('LUT')).toBeInTheDocument();
  });

  it('triggers onToggleTool when clicking on a tool card', () => {
    render(<CinemaMonitoringDrawer {...defaultProps} />);

    const falseColorBtn = screen.getByText('False Color').closest('button');
    expect(falseColorBtn).not.toBeNull();
    fireEvent.click(falseColorBtn!);

    expect(defaultProps.onToggleTool).toHaveBeenCalledWith('false_color');
  });

  it('triggers onUpdateConfig when selecting a focus peaking color', () => {
    render(<CinemaMonitoringDrawer {...defaultProps} />);

    const redColorBtn = screen.getByTitle('Peaking red');
    fireEvent.click(redColorBtn);

    expect(defaultProps.onUpdateConfig).toHaveBeenCalledWith({
      focusPeakingColor: 'red',
    });
  });

  it('triggers onClose when clicking close button', () => {
    render(<CinemaMonitoringDrawer {...defaultProps} />);

    const closeBtn = screen.getByLabelText('Close Monitoring Drawer');
    fireEvent.click(closeBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CinemaMonitoringDrawer {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });
});
