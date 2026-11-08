import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GhostOverlayDrawer } from '../../components/ghost/GhostOverlayDrawer';
import { ZoomStrip } from '../../components/ZoomStrip';
import { FeatureRail } from '../../components/camera/FeatureRail';
import { DEFAULT_GHOST_SETTINGS } from '../../types/ghost';

describe('Ghost overlay studio layout', () => {
  const props = () => ({ isOpen: true, onClose: vi.fn(), settings: DEFAULT_GHOST_SETTINGS, onUpdate: vi.fn(), onReset: vi.fn() });

  it('has a one-line title and three equal round header buttons', () => {
    render(<GhostOverlayDrawer {...props()} />);
    expect(screen.getByText('Ghost overlay')).toHaveClass('truncate');
    for (const name of [/overlay$/i, /overlay position/i, 'Close ghost overlay']) {
      const b = screen.getAllByRole('button', { name }).find((el) => el.className.includes('w-9'));
      expect(b).toBeTruthy();
      expect(b!.className).toContain('h-9');
      expect(b!.className).toContain('rounded-full');
    }
  });

  it('keeps footer buttons the same height and wired up', () => {
    const p = props();
    render(<GhostOverlayDrawer {...p} />);
    const reset = screen.getByText('Reset position').closest('button')!;
    const done = screen.getByText('Done').closest('button')!;
    expect(reset.className).toContain('h-11');
    expect(done.className).toContain('h-11');
    fireEvent.click(reset);
    fireEvent.click(done);
    expect(p.onReset).toHaveBeenCalled();
    expect(p.onClose).toHaveBeenCalled();
  });

  it('uses one font: no monospace text', () => {
    const { container } = render(<GhostOverlayDrawer {...props()} />);
    expect(container.innerHTML).not.toContain('font-mono');
  });
});

describe('rows spread across the width and still slide when crowded', () => {
  it('zoom stops use the full row', () => {
    render(<ZoomStrip zoom={1} min={0.5} max={8} onChange={vi.fn()} />);
    const toolbar = screen.getByRole('toolbar', { name: 'Zoom' });
    expect(toolbar.className).toContain('overflow-x-auto');
    const inner = toolbar.firstElementChild as HTMLElement;
    expect(inner.className).toContain('justify-between');
    expect(inner.className).toContain('min-w-full');
  });

  it('the feature rail does the same', () => {
    render(<FeatureRail onSelect={vi.fn()} items={[{ id: 'a', icon: <i />, label: 'A' }, { id: 'b', icon: <i />, label: 'B' }]} />);
    const inner = screen.getByRole('toolbar').firstElementChild as HTMLElement;
    expect(inner.className).toContain('justify-between');
  });
});
