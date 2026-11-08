import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CameraProfilePanel } from '../components/look/CameraProfilePanel';
import { cameraProfileStore as store } from '../services/cameraProfileStore';
import { DEFAULT_LOOK_STATE, type LookState } from '../types/lut';
import { BUILTIN_PROFILES } from '../utils/cameraProfile';

beforeEach(() => {
  localStorage.clear();
  store._reloadForTests();
});

const setup = (look: Partial<LookState> = {}) => {
  const onChange = vi.fn();
  const utils = render(<CameraProfilePanel lookState={{ ...DEFAULT_LOOK_STATE, ...look }} onChangeLookState={onChange} />);
  return { onChange, ...utils };
};

describe('CameraProfilePanel', () => {
  it('lists every built-in camera plus "No camera" and selecting one reports its id', () => {
    const { onChange } = setup();
    expect(screen.getAllByRole('option').length).toBe(BUILTIN_PROFILES.length + 1);
    fireEvent.click(screen.getByRole('option', { name: new RegExp(BUILTIN_PROFILES[1].name) }));
    expect(onChange).toHaveBeenCalledWith({ cameraProfileId: BUILTIN_PROFILES[1].id });
    fireEvent.click(screen.getByRole('option', { name: /No camera/ }));
    expect(onChange).toHaveBeenCalledWith({ cameraProfileId: null });
  });

  it('disables actions that cannot work with no camera selected', () => {
    setup();
    expect(screen.getByLabelText('Duplicate camera')).toBeDisabled();
    expect(screen.getByLabelText('Export camera')).toBeDisabled();
    expect(screen.getByLabelText('Delete camera')).toBeDisabled();
    expect(screen.getByLabelText('Import camera')).toBeEnabled();
    expect(screen.queryByLabelText('Saturation')).toBeNull();
  });

  it('a slider edits the real stored profile, and Reset restores factory values', () => {
    const b = BUILTIN_PROFILES[0];
    setup({ cameraProfileId: b.id });
    const reset = screen.getByLabelText('Reset camera to factory settings');
    expect(reset).toBeDisabled(); // nothing modified yet, so no fake reset

    fireEvent.change(screen.getByLabelText('Saturation'), { target: { value: '0.5' } });
    expect(store.get(b.id)?.color.saturation).toBe(0.5);
    expect(screen.getByLabelText('Reset camera to factory settings')).toBeEnabled();

    fireEvent.click(screen.getByLabelText('Reset camera to factory settings'));
    expect(store.get(b.id)?.color.saturation).toBe(b.color.saturation);
  });

  it('built-in cameras cannot be deleted; duplicates can, and duplicating selects the copy', () => {
    const b = BUILTIN_PROFILES[0];
    const { onChange } = setup({ cameraProfileId: b.id });
    expect(screen.getByLabelText('Delete camera')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Duplicate camera'));
    const copy = store.list().find((p) => !p.builtIn)!;
    expect(copy).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith({ cameraProfileId: copy.id });
  });

  it('exposes date imprint as a real switch bound to profile state', () => {
    const b = BUILTIN_PROFILES.find((p) => p.dateImprint.enabled === false)!;
    setup({ cameraProfileId: b.id });
    const sw = screen.getByRole('switch');
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    expect(store.get(b.id)?.dateImprint.enabled).toBe(true);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('importing an invalid file shows an error and adds nothing', async () => {
    setup();
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    const file = new File(['not a profile'], 'x.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve('not a profile') });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole('status')).toHaveTextContent(/valid JSON|CineGrid camera profile/);
    expect(store.list().length).toBe(BUILTIN_PROFILES.length);
  });
});
