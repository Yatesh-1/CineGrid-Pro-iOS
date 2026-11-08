import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GalleryModal } from '../../components/GalleryModal';
import { StudioTopBar } from '../../components/studio/StudioTopBar';
import { PortraitModeControls } from '../../components/portrait/PortraitModeControls';
import type { CapturedPhoto } from '../../types/camera';

vi.mock('../../components/MediaThumb', () => ({ MediaThumb: ({ alt }: { alt: string }) => <div data-testid="thumb">{alt}</div> }));
vi.mock('../../services/deviceSaveService', () => ({ saveToDevice: vi.fn(async () => ({ ok: true })) }));

const photo = (n: number): CapturedPhoto =>
  ({
    id: `p${n}`,
    dataUrl: `data:image/jpeg;base64,AA${n}`,
    thumbnailUrl: `data:image/jpeg;base64,AA${n}`,
    timestamp: 1_700_000_000_000 + n,
    aspectRatio: '4:3',
    filterUsed: 'None',
    gridUsed: 'None',
    proSettings: { iso: 100, shutter: '1/60', kelvin: 5600, ev: 0 },
  }) as unknown as CapturedPhoto;

function renderGallery(photos: CapturedPhoto[], over: Partial<React.ComponentProps<typeof GalleryModal>> = {}) {
  const props = { photos, isOpen: true, onClose: vi.fn(), onDeletePhoto: vi.fn(), onOpenEditor: vi.fn(), ...over };
  render(<GalleryModal {...props} />);
  return props;
}

describe('Gallery navigation', () => {
  it('has a back button that leaves the gallery from the grid', () => {
    const p = renderGallery([photo(1)]);
    fireEvent.click(screen.getByRole('button', { name: 'Back to camera' }));
    expect(p.onClose).toHaveBeenCalled();
  });

  it('goes from a single photo back to the grid first, not straight out', () => {
    const p = renderGallery([photo(1), photo(2)]);
    fireEvent.click(screen.getByText('Photo 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Back to gallery' }));
    expect(p.onClose).not.toHaveBeenCalled();
    expect(screen.getByText(/Gallery \(2\)/)).toBeInTheDocument();
  });
});

describe('Gallery multi-select', () => {
  it('selects everything, shows the count, and deletes only after confirming', () => {
    const p = renderGallery([photo(1), photo(2), photo(3)]);
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByText('Select all'));
    expect(screen.getByText('3 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    expect(p.onDeletePhoto).not.toHaveBeenCalled(); // confirmation first
    expect(screen.getByText('Delete 3 items?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('DELETE'));
    expect(p.onDeletePhoto).toHaveBeenCalledTimes(3);
    expect(p.onDeletePhoto.mock.calls.map((c) => c[0]).sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('tapping thumbnails toggles them instead of opening them while selecting', () => {
    renderGallery([photo(1), photo(2)]);
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByText('Photo 1'));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Photo 1'));
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    // still the grid: no single-photo view opened
    expect(screen.queryByRole('button', { name: 'Back to gallery' })).toBeNull();
  });

  it('Cancel leaves selection mode without deleting anything', () => {
    const p = renderGallery([photo(1)]);
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel selection' }));
    expect(p.onDeletePhoto).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
  });

  it('a long press starts selecting that photo', () => {
    vi.useFakeTimers();
    try {
      renderGallery([photo(1), photo(2)]);
      const t = screen.getByText('Photo 2').parentElement as HTMLElement;
      fireEvent.pointerDown(t);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      fireEvent.pointerUp(t);
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('delete and save stay disabled until something is selected', () => {
    renderGallery([photo(1)]);
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.getByRole('button', { name: 'Delete selected' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save selected' })).toBeDisabled();
  });
});

const topBarProps = () => ({
  photo: photo(1),
  canUndo: false,
  canRedo: false,
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  compareMode: 'after-only' as const,
  onChangeCompareMode: vi.fn(),
  isHoldingOriginal: false,
  onHoldOriginalStart: vi.fn(),
  onHoldOriginalEnd: vi.fn(),
  zoomLevel: 1,
  onToggleZoom: vi.fn(),
  onResetAll: vi.fn(),
  onSaveToGallery: vi.fn(),
  onExportDownload: vi.fn(),
  onShare: vi.fn(),
  onClose: vi.fn(),
});

describe('Studio top bar: Compare and Share', () => {
  it('a quick tap on Compare toggles the before/after split', () => {
    const p = topBarProps();
    render(<StudioTopBar {...p} />);
    const b = screen.getByTitle(/before\/after split/i);
    fireEvent.pointerDown(b);
    fireEvent.pointerUp(b);
    expect(p.onChangeCompareMode).toHaveBeenCalledWith('split-vertical');
    expect(p.onHoldOriginalStart).not.toHaveBeenCalled();
  });

  it('tapping Compare again while split goes back to the normal view', () => {
    const p = { ...topBarProps(), compareMode: 'split-vertical' as const };
    render(<StudioTopBar {...p} />);
    const b = screen.getByTitle(/before\/after split/i);
    fireEvent.pointerDown(b);
    fireEvent.pointerUp(b);
    expect(p.onChangeCompareMode).toHaveBeenCalledWith('after-only');
  });

  it('holding Compare shows the original and does not toggle the split', () => {
    vi.useFakeTimers();
    try {
      const p = topBarProps();
      render(<StudioTopBar {...p} />);
      const b = screen.getByTitle(/before\/after split/i);
      fireEvent.pointerDown(b);
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(p.onHoldOriginalStart).toHaveBeenCalled();
      fireEvent.pointerUp(b);
      expect(p.onHoldOriginalEnd).toHaveBeenCalled();
      expect(p.onChangeCompareMode).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('Share calls the share handler (not a file download)', () => {
    const p = topBarProps();
    render(<StudioTopBar {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(p.onShare).toHaveBeenCalledTimes(1);
    expect(p.onExportDownload).not.toHaveBeenCalled();
  });

  it('no longer offers a "Copy Edit Settings" action that copied nothing', () => {
    render(<StudioTopBar {...topBarProps()} />);
    fireEvent.click(screen.getByTitle('More Options'));
    expect(screen.queryByText('Copy Edit Settings')).toBeNull();
    expect(screen.getByText('Reset to Original')).toBeInTheDocument();
  });
});

describe('Portrait controls', () => {
  const base = {
    aperture: 2.8,
    onChangeAperture: vi.fn(),
    showEyelineGuide: false,
    onToggleEyelineGuide: vi.fn(),
    blurOn: true,
    onToggleBlur: vi.fn(),
    subjectFound: true,
    aspectRatio: '4:3',
    onChangeAspectRatio: vi.fn(),
  };

  it('offers every ratio and reports the one chosen', () => {
    const onChangeAspectRatio = vi.fn();
    render(<PortraitModeControls {...base} onChangeAspectRatio={onChangeAspectRatio} />);
    for (const r of ['4:3', '3:2', '16:9', '1:1', '2.39:1']) expect(screen.getByRole('button', { name: r })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '16:9' }));
    expect(onChangeAspectRatio).toHaveBeenCalledWith('16:9');
    expect(screen.getByRole('button', { name: '4:3' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('the blur can be switched off, which disables the f-stops', () => {
    const onToggleBlur = vi.fn();
    const { rerender } = render(<PortraitModeControls {...base} onToggleBlur={onToggleBlur} />);
    fireEvent.click(screen.getByRole('button', { name: /Blur On/ }));
    expect(onToggleBlur).toHaveBeenCalled();
    rerender(<PortraitModeControls {...base} blurOn={false} onToggleBlur={onToggleBlur} />);
    expect(screen.getByRole('button', { name: 'f/2.8' })).toBeDisabled();
  });
});
