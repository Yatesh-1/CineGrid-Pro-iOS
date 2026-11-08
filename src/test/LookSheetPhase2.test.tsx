import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LookStudioModal } from '../components/look/LookStudioModal';
import { cameraProfileStore as store } from '../services/cameraProfileStore';
import { DEFAULT_LOOK_STATE } from '../types/lut';
import { BUILTIN_PROFILES } from '../utils/cameraProfile';
import { renderLookStill } from '../utils/renderLookStill';

beforeEach(() => {
  localStorage.clear();
  store._reloadForTests();
});

const base = { isOpen: true, onClose: vi.fn(), onChangeLookState: vi.fn(), onResetLook: vi.fn() };

describe('Look Studio compact sheet and header', () => {
  it('shows the real active camera name, not a fixed label', () => {
    const b = BUILTIN_PROFILES[0];
    const { rerender } = render(<LookStudioModal {...base} lookState={{ ...DEFAULT_LOOK_STATE, cameraProfileId: b.id }} />);
    expect(screen.getByText(b.name)).toBeInTheDocument();
    expect(screen.queryByText('Clean Raw')).toBeNull();
    rerender(<LookStudioModal {...base} lookState={{ ...DEFAULT_LOOK_STATE, cameraProfileId: BUILTIN_PROFILES[3].id }} />);
    expect(screen.getByText(BUILTIN_PROFILES[3].name)).toBeInTheDocument();
    rerender(<LookStudioModal {...base} lookState={DEFAULT_LOOK_STATE} />);
    expect(screen.getByText('Clean Raw')).toBeInTheDocument();
  });

  it('opens compact, expands and collapses from the handle, and never dims or blocks the viewfinder', () => {
    const { container } = render(<LookStudioModal {...base} lookState={DEFAULT_LOOK_STATE} />);
    const sheet = screen.getByTestId('look-sheet');
    expect(sheet).toHaveAttribute('data-expanded', 'false');
    expect(sheet.style.maxHeight).toContain('44dvh');
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('pointer-events-none');
    expect(root.className).not.toContain('backdrop-blur');
    expect(root.className).not.toContain('bg-black');

    fireEvent.click(screen.getByLabelText('Expand panel'));
    expect(sheet).toHaveAttribute('data-expanded', 'true');
    expect(sheet.style.maxHeight).toContain('85dvh');
    fireEvent.click(screen.getByLabelText('Collapse panel'));
    expect(sheet).toHaveAttribute('data-expanded', 'false');
  });

  it('drag up on the handle expands, drag down collapses', () => {
    render(<LookStudioModal {...base} lookState={DEFAULT_LOOK_STATE} />);
    const sheet = screen.getByTestId('look-sheet');
    const handle = screen.getByLabelText('Expand panel');
    fireEvent.pointerDown(handle, { clientY: 400 });
    fireEvent.pointerUp(handle, { clientY: 300 });
    expect(sheet).toHaveAttribute('data-expanded', 'true');
    const handle2 = screen.getByLabelText('Collapse panel');
    fireEvent.pointerDown(handle2, { clientY: 300 });
    fireEvent.pointerUp(handle2, { clientY: 420 });
    expect(sheet).toHaveAttribute('data-expanded', 'false');
  });
});

describe('renderLookStill', () => {
  it('returns null (so the caller keeps its fallback) when the GPU is unavailable, and never throws', () => {
    const fake = { width: 4000, height: 3000, close: () => {} } as unknown as ImageBitmap;
    expect(renderLookStill(fake, DEFAULT_LOOK_STATE, null, BUILTIN_PROFILES[0])).toBeNull();
  });
});
