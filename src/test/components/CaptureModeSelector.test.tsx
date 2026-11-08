// CineGrid Pro — CaptureModeSelector Component Tests

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CaptureModeSelector } from '../../components/CaptureModeSelector';

describe('CaptureModeSelector Component Tests', () => {
  it('renders all seven core camera modes', () => {
    render(<CaptureModeSelector activeMode="photo" onSelectMode={vi.fn()} />);

    expect(screen.getByText('PHOTO')).toBeInTheDocument();
    expect(screen.getByText('VIDEO')).toBeInTheDocument();
    expect(screen.getByText('PORTRAIT')).toBeInTheDocument();
    expect(screen.getByText('NIGHT')).toBeInTheDocument();
    expect(screen.getByText('DUAL')).toBeInTheDocument();
    expect(screen.getByText('SLOW-MO')).toBeInTheDocument();
    expect(screen.getByText('TIME-LAPSE')).toBeInTheDocument();
  });

  it('triggers onSelectMode when a different mode is tapped', () => {
    const handleSelect = vi.fn();
    render(<CaptureModeSelector activeMode="photo" onSelectMode={handleSelect} />);

    fireEvent.click(screen.getByText('NIGHT'));
    expect(handleSelect).toHaveBeenCalledWith('night');

    fireEvent.click(screen.getByText('DUAL'));
    expect(handleSelect).toHaveBeenCalledWith('dual');
  });

  it('does not trigger onSelectMode when mode is already active or disabled', () => {
    const handleSelect = vi.fn();
    render(<CaptureModeSelector activeMode="photo" onSelectMode={handleSelect} disabled={true} />);

    fireEvent.click(screen.getByText('VIDEO'));
    expect(handleSelect).not.toHaveBeenCalled();
  });
});
