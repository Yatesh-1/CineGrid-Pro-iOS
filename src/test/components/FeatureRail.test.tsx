import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureRail } from '../../components/camera/FeatureRail';
import { ModePanel } from '../../components/camera/ModePanel';
import { DualCameraControls } from '../../components/dual/DualCameraControls';
import type { DualCameraConfig } from '../../types/camera';

const DEFAULT_DUAL_CAMERA_CONFIG: DualCameraConfig = {
  layout: 'pip',
  primaryFacing: 'environment',
  secondaryFacing: 'user',
  pipPosition: 'top_right',
  pipSize: 'medium',
  enableSecondaryAudio: false,
  isSupported: true,
};

describe('FeatureRail', () => {
  const items = [
    { id: 'pro', icon: <i />, label: 'Pro' },
    { id: 'grid', icon: <i />, label: 'Grid', value: 'Rule of Thirds', active: true, onClear: vi.fn(), clearLabel: 'Remove grid' },
    { id: 'look', icon: <i />, label: 'Look', value: 'Portra', active: true, onClear: vi.fn(), clearLabel: 'Remove look' },
  ];

  it('renders every feature in one toolbar', () => {
    render(<FeatureRail items={items} onSelect={vi.fn()} />);
    expect(screen.getByRole('toolbar', { name: 'Camera features' })).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Rule of Thirds')).toBeInTheDocument();
    expect(screen.getByText('Portra')).toBeInTheDocument();
  });

  it('selects a feature by id', () => {
    const onSelect = vi.fn();
    render(<FeatureRail items={items} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Pro'));
    expect(onSelect).toHaveBeenCalledWith('pro');
  });

  it('removes an applied look instantly without opening anything', () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();
    render(
      <FeatureRail
        onSelect={onSelect}
        items={[{ id: 'look', icon: <i />, label: 'Look', value: 'LUT', active: true, onClear, clearLabel: 'Remove look' }]}
      />
    );
    fireEvent.click(screen.getByLabelText('Remove look'));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows no remove button when the feature is off', () => {
    render(<FeatureRail onSelect={vi.fn()} items={[{ id: 'look', icon: <i />, label: 'Look' }]} />);
    expect(screen.queryByLabelText('Remove look')).toBeNull();
  });
});

describe('ModePanel', () => {
  it('has a close button that fires onClose', () => {
    const onClose = vi.fn();
    render(
      <ModePanel title="Dual camera" onClose={onClose}>
        <p>body</p>
      </ModePanel>
    );
    fireEvent.click(screen.getByLabelText('Close Dual camera'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('omits the close button when there is nothing to close', () => {
    render(
      <ModePanel title="Wide selfie">
        <p>body</p>
      </ModePanel>
    );
    expect(screen.queryByLabelText('Close Wide selfie')).toBeNull();
  });
});

describe('DualCameraControls layout', () => {
  it('switches layout, swaps cameras and sizes the PIP from one row', () => {
    const onChange = vi.fn();
    const onSwap = vi.fn();
    render(
      <DualCameraControls
        config={{ ...DEFAULT_DUAL_CAMERA_CONFIG, layout: 'pip' }}
        onChangeConfig={onChange}
        onSwapCameras={onSwap}
      />
    );

    fireEvent.click(screen.getByTitle('Split Screen Vertical'));
    expect(onChange).toHaveBeenCalledWith({ layout: 'split_vertical' });

    fireEvent.click(screen.getByTitle('Swap Primary and Secondary Cameras'));
    expect(onSwap).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTitle('PIP size large'));
    expect(onChange).toHaveBeenCalledWith({ pipSize: 'large' });
  });

  it('hides PIP sizes in split layouts', () => {
    render(
      <DualCameraControls
        config={{ ...DEFAULT_DUAL_CAMERA_CONFIG, layout: 'split_horizontal' }}
        onChangeConfig={vi.fn()}
        onSwapCameras={vi.fn()}
      />
    );
    expect(screen.queryByTitle('PIP size small')).toBeNull();
  });
});
