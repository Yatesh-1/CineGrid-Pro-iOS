import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoomStrip } from '../../components/ZoomStrip';
import { CaptureModeSelector } from '../../components/CaptureModeSelector';
import { FeatureRail } from '../../components/camera/FeatureRail';

describe('ZoomStrip (0.5x to 24x, sliding row, below the frame)', () => {
  it('offers every stop from 0.5x to 24x and reaches both ends', () => {
    const onChange = vi.fn();
    render(<ZoomStrip zoom={1} min={0.5} max={24} onChange={onChange} />);

    for (const label of ['0.5x', '1x', '2x', '3x', '5x', '8x', '10x', '15x', '24x']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByText('24x'));
    expect(onChange).toHaveBeenLastCalledWith(24);
    fireEvent.click(screen.getByText('0.5x'));
    expect(onChange).toHaveBeenLastCalledWith(0.5);
  });

  it('is a sliding toolbar, not a slider control', () => {
    render(<ZoomStrip zoom={1} min={0.5} max={24} onChange={vi.fn()} />);
    expect(screen.getByRole('toolbar', { name: 'Zoom' }).className).toContain('overflow-x-auto');
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('marks the active stop and shows a readout only between stops', () => {
    const { rerender } = render(<ZoomStrip zoom={2} min={0.5} max={24} onChange={vi.fn()} />);
    expect(screen.getByText('2x')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('zoom-readout')).toBeNull();

    rerender(<ZoomStrip zoom={12.4} min={0.5} max={24} onChange={vi.fn()} />);
    expect(screen.getByTestId('zoom-readout')).toHaveTextContent('12x');
  });

  it('holds the lens kind and focal length in a small square at the start, not on the frame', () => {
    render(<ZoomStrip zoom={1} min={0.5} max={24} onChange={vi.fn()} zoomType="optical_lens" focalLengthMm={24} />);
    expect(screen.getByText('24mm')).toBeInTheDocument();
    // the lens is shown as its mm only: "OPT" is never claimed
    expect(screen.queryByText('OPT')).toBeNull();
    expect(screen.queryByText(/OPTICAL 24MM/i)).toBeNull();
  });

  it('labels crop and digital magnification honestly', () => {
    render(<ZoomStrip zoom={3} min={0.5} max={24} onChange={vi.fn()} zoomType="digital" focalLengthMm={26} />);
    expect(screen.getByText('DIG')).toBeInTheDocument();
  });

  it('limits stops to the supported range', () => {
    render(<ZoomStrip zoom={1} min={0.5} max={8} onChange={vi.fn()} />);
    expect(screen.getByText('8x')).toBeInTheDocument();
    expect(screen.queryByText('10x')).toBeNull();
  });
});

describe('iPhone-style mode carousel', () => {
  it('is a tablist with the active mode selected and switches on tap', () => {
    const onSelect = vi.fn();
    render(<CaptureModeSelector activeMode="photo" onSelectMode={onSelect} />);
    expect(screen.getByRole('tablist', { name: 'Capture mode' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'PHOTO' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'VIDEO' }));
    expect(onSelect).toHaveBeenCalledWith('video');
  });

  it('is padded so the first and last modes can sit in the centre, and has no underline box', () => {
    render(<CaptureModeSelector activeMode="video" onSelectMode={vi.fn()} />);
    expect(screen.getByRole('tablist').className).toContain('px-[42%]');
    expect(screen.getByRole('tab', { name: 'VIDEO' }).className).toContain('text-amber-400');
  });

  it('does not switch while recording', () => {
    const onSelect = vi.fn();
    render(<CaptureModeSelector activeMode="video" onSelectMode={onSelect} disabled />);
    fireEvent.click(screen.getByRole('tab', { name: 'PHOTO' }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('FeatureRail shows just a name', () => {
  it('replaces the label with the value, with no box around the chip', () => {
    render(
      <FeatureRail
        onSelect={vi.fn()}
        items={[{ id: 'look', icon: <i />, label: 'Look', value: 'Studio Neutral', active: true, onClear: vi.fn() }]}
      />
    );
    expect(screen.getByText('Studio Neutral')).toBeInTheDocument();
    expect(screen.queryByText('Look')).toBeNull();
    const chip = screen.getByText('Studio Neutral').closest('button')!;
    expect(chip.className).not.toMatch(/\bborder\b/);
    expect(chip.className).not.toMatch(/\bbg-/);
    expect(chip.className).toContain('text-amber-300');
  });
});
