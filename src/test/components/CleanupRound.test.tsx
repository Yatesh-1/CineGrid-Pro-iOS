import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShutterDock } from '../../components/ShutterDock';
import { GridReferenceModal } from '../../components/GridReferenceModal';
import { ProSettingsDrawer } from '../../components/ProSettingsDrawer';
import { LookStudioModal } from '../../components/look/LookStudioModal';
import { COMPREHENSIVE_GRID_LIBRARY } from '../../data/gridLibrary';
import { DEFAULT_PRO_SETTINGS } from '../../data/defaultSettings';
import { DEFAULT_LOOK_STATE } from '../../types/lut';

describe('shutter dock has no help (?) button', () => {
  it('renders no composition-help control in photo or video mode', () => {
    for (const mode of ['photo', 'video'] as const) {
      const { unmount } = render(
        <ShutterDock
          onCapture={vi.fn()}
          isCapturing={false}
          timerCount={null}
          onSelectTimer={vi.fn()}
          selectedTimer={0}
          latestPhoto={null}
          onOpenGallery={vi.fn()}
          captureMode={mode}
        />
      );
      expect(screen.queryByTitle(/Masterclass/i)).toBeNull();
      expect(screen.queryByLabelText(/help/i)).toBeNull();
      unmount();
    }
  });
});

describe('reference photo screen', () => {
  const grid = COMPREHENSIVE_GRID_LIBRARY.find((g) => g.id === 'golden_ratio' || g.id === 'rule_of_thirds')!;

  it('has no genre badge laid over the photograph', () => {
    render(<GridReferenceModal grid={grid} isOpen onClose={vi.fn()} onTryInCamera={vi.fn()} />);
    // The genre appears as a tab and a heading, but not as a floating badge on the image
    const image = document.querySelector('img')!;
    const frame = image.parentElement!;
    expect(frame.querySelector('.uppercase')).toBeNull();
  });

  it('draws the sweet spot in black and white, with no gold on the marker', () => {
    render(<GridReferenceModal grid={grid} isOpen onClose={vi.fn()} onTryInCamera={vi.fn()} />);
    const frame = document.querySelector('img')!.parentElement!;
    const marker = frame.querySelector('.rounded-full.border-white');
    expect(marker).not.toBeNull();
    expect(frame.innerHTML).not.toMatch(/bg-amber-4|border-amber-4|text-amber-3/);
  });

  it('keeps previous / try / next in one aligned row of equal height', () => {
    render(<GridReferenceModal grid={grid} isOpen onClose={vi.fn()} onTryInCamera={vi.fn()} />);
    const prev = screen.getByLabelText('Previous example');
    const next = screen.getByLabelText('Next example');
    const cta = screen.getByText('Try this grid in camera').closest('button')!;
    for (const b of [prev, next, cta]) expect(b.className).toContain('h-12');
    expect(cta.className).toContain('justify-center');
  });
});

describe('Pro settings drawer', () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    settings: DEFAULT_PRO_SETTINGS,
    onChange: vi.fn(),
    onReset: vi.fn(),
    onApplyPreset: vi.fn(),
    isFrontCamera: false,
  };

  it('no longer shows the physical lens selection block', () => {
    render(<ProSettingsDrawer {...baseProps} />);
    expect(screen.queryByText('PHYSICAL LENS SELECTION')).toBeNull();
    expect(screen.queryByText(/0\.5x Ultra-Wide/)).toBeNull();
  });

  it('lays tabs out as a sliding row of plain names, all six reachable', () => {
    render(<ProSettingsDrawer {...baseProps} />);
    const list = screen.getByRole('tablist');
    expect(list.className).toContain('overflow-x-auto');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['CAMERA', 'EXPOSURE', 'FOCUS', 'COLOR', 'MONITORING', 'RECORDING']);
    for (const t of tabs) {
      expect(t.className).toContain('flex-shrink-0');
      expect(t.className).not.toMatch(/\bbg-amber/);
    }
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('CAMERA');
  });
});

describe('Look studio rows', () => {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    lookState: DEFAULT_LOOK_STATE,
    onChangeLookState: vi.fn(),
    onResetLook: vi.fn(),
  };

  it('puts header actions in equal round icon buttons', () => {
    render(<LookStudioModal {...props} onCompareWithLastPhoto={vi.fn()} hasCapturedPhoto />);
    for (const name of ['Compare last photo', 'Export grade as .CUBE', 'Reset all look settings', 'Close Look Studio']) {
      const b = screen.getByLabelText(name);
      expect(b.className).toContain('w-9');
      expect(b.className).toContain('h-9');
      expect(b.className).toContain('rounded-full');
    }
  });

  it('shows the four tabs (Cameras, LUTs, Filters, Adjustments) as one equal-width row', () => {
    render(<LookStudioModal {...props} />);
    const row = screen.getByRole('tablist');
    expect(row.className).toContain('grid-cols-4');
    expect(screen.getAllByRole('tab').length).toBe(4);
    fireEvent.click(screen.getByText('Adjustments'));
    expect(screen.getByText('Precision Manual Controls')).toBeInTheDocument();
  });

  it('uses one font family: no monospace anywhere in the studio', () => {
    const { container } = render(<LookStudioModal {...props} />);
    expect(container.innerHTML).not.toContain('font-mono');
  });
});
