import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { cameraProfileStore as store } from '../services/cameraProfileStore';
import { DEFAULT_LOOK_STATE } from '../types/lut';
import { BUILTIN_PROFILES, importProfile, exportProfile } from '../utils/cameraProfile';

const shareTextFile = vi.fn();
vi.mock('../services/shareService', () => ({ shareTextFile: (...a: unknown[]) => shareTextFile(...a) }));

import { CameraProfilePanel } from '../components/look/CameraProfilePanel';

beforeEach(() => {
  localStorage.clear();
  store._reloadForTests();
  shareTextFile.mockReset();
});

const setup = () =>
  render(
    <CameraProfilePanel
      lookState={{ ...DEFAULT_LOOK_STATE, cameraProfileId: BUILTIN_PROFILES[0].id }}
      onChangeLookState={vi.fn()}
    />
  );

describe('camera profile export reports only what really happened', () => {
  it('writes real JSON for the active camera and says success only after the share resolved', async () => {
    let release: (v: string) => void = () => {};
    shareTextFile.mockReturnValue(new Promise((r) => (release = r)));
    setup();
    fireEvent.click(screen.getByLabelText('Export camera'));
    // not resolved yet: no success claim
    expect(screen.queryByRole('status')).toBeNull();
    release('shared');
    expect(await screen.findByRole('status')).toHaveTextContent(/Choose where to save/);

    const [fileName, text] = shareTextFile.mock.calls[0];
    expect(fileName).toMatch(/\.cinegrid-camera\.json$/);
    const back = importProfile(text as string, 'x');
    expect(back.ok).toBe(true);
    if (back.ok) expect({ ...back.profile, id: BUILTIN_PROFILES[0].id, builtIn: true }).toEqual(BUILTIN_PROFILES[0]);
  });

  it('reports a cancelled share as cancelled, not as saved', async () => {
    shareTextFile.mockResolvedValue('cancelled');
    setup();
    fireEvent.click(screen.getByLabelText('Export camera'));
    expect(await screen.findByRole('status')).toHaveTextContent(/cancelled.*Nothing was saved/i);
  });

  it('shows an error, not success, when writing the file fails', async () => {
    shareTextFile.mockRejectedValue(new Error('disk full'));
    setup();
    fireEvent.click(screen.getByLabelText('Export camera'));
    const status = await screen.findByRole('status');
    await waitFor(() => expect(status).toHaveTextContent(/Export failed: disk full/));
    expect(status).not.toHaveTextContent(/exported/i);
  });
});

describe('export -> delete -> import round trip', () => {
  it('a customised camera comes back with every parameter identical', () => {
    const dup = store.duplicate(BUILTIN_PROFILES[3].id)!;
    const edited = store.update({
      ...dup,
      name: 'Round Trip',
      grain: { ...dup.grain, amount: 0.61, size: 2.3 },
      halation: { ...dup.halation, color: [0.9, 0.2, 0.1] },
      color: { ...dup.color, matrix: [1, 0.1, 0, 0, 1, 0.05, 0.02, 0, 1] },
      border: { style: 'film', width: 0.06 },
      dateImprint: { ...dup.dateImprint, enabled: true, format: 'time', position: 'bottomLeft' },
    })!;
    const json = exportProfile(edited);
    store.remove(edited.id);
    expect(store.get(edited.id)).toBeNull();

    const r = store.importJson(json);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect({ ...r.profile, id: edited.id }).toEqual(edited); // new id, everything else identical
      expect(r.profile.id).not.toBe(edited.id);
      expect(r.profile.builtIn).toBe(false);
    }
  });
});
