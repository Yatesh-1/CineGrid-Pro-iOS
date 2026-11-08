import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DEFAULT_LOOK_STATE } from '../../types/lut';

const getStats = vi.fn();
const shareTextFile = vi.fn();
let nativeSupported = true;

vi.mock('../../services/nativeFilmCamera', () => ({
  isNativeFilmSupported: () => nativeSupported,
  nativeFilm: { getStats: (...a: unknown[]) => getStats(...a) },
}));
vi.mock('../../services/shareService', () => ({ shareTextFile: (...a: unknown[]) => shareTextFile(...a) }));

import { CameraProfilePanel } from '../../components/look/CameraProfilePanel';

const open = () => {
  const d = screen.getByTestId('perf-readout') as HTMLDetailsElement;
  d.open = true;
  fireEvent(d, new Event('toggle'));
};

const setup = () => render(<CameraProfilePanel lookState={DEFAULT_LOOK_STATE} onChangeLookState={vi.fn()} />);

beforeEach(() => {
  getStats.mockReset();
  shareTextFile.mockReset();
  nativeSupported = true;
});

describe('diagnostics readout', () => {
  it('shows the native camera measurements when native is running', async () => {
    getStats.mockResolvedValue({
      state: 'active', front: false, renderFps: 29.6, cameraFps: 29.6, avgRenderMs: 4.3, maxRenderMs: 6.1,
      droppedCameraFrames: 2, previewBuffer: '1920x1440', surface: '720x960', stillSize: '3264x2448',
      aeFpsRange: '30-30', zoom: 2, evStops: 0.5, recording: false,
    });
    setup();
    open();
    expect(await screen.findByText('rear - active')).toBeInTheDocument();
    expect(screen.getByText('29.6 / 29.6')).toBeInTheDocument();
    expect(screen.getByText('3264x2448')).toBeInTheDocument();
    expect(screen.getByText('2x / 0.5')).toBeInTheDocument();
    expect(screen.getByText('idle')).toBeInTheDocument();
  });

  it('shows no native rows when the native camera is stopped, but always says thermal is not exposed', async () => {
    getStats.mockResolvedValue({ state: 'stopped' });
    setup();
    open();
    await waitFor(() => expect(getStats).toHaveBeenCalled());
    expect(screen.queryByText(/Native preview FPS/)).toBeNull();
    expect(screen.getAllByText('not exposed to the app by this platform').length).toBeGreaterThan(0);
  });

  it('does not even ask for native stats off Android', async () => {
    nativeSupported = false;
    setup();
    open();
    expect(getStats).not.toHaveBeenCalled();
    expect(screen.queryByText(/Native preview FPS/)).toBeNull();
  });

  it('exports a real report and only says success after the share happened', async () => {
    getStats.mockResolvedValue({ state: 'active', renderFps: 30 });
    let release: (v: string) => void = () => {};
    shareTextFile.mockReturnValue(new Promise((r) => (release = r)));
    setup();
    open();
    fireEvent.click(screen.getByText('Export diagnostics'));
    expect(screen.queryByText(/Choose where to save/)).toBeNull();
    release('shared');
    expect(await screen.findByText(/Choose where to save the diagnostics file/)).toBeInTheDocument();
    const [name, text] = shareTextFile.mock.calls[0];
    expect(name).toBe('cinegrid-diagnostics.json');
    const report = JSON.parse(text as string);
    expect(report.thermal).toMatch(/not exposed/);
    expect(report.web).toHaveProperty('contextStatus');
  });

  it('reports a failed or cancelled export as such', async () => {
    getStats.mockResolvedValue({ state: 'stopped' });
    shareTextFile.mockRejectedValueOnce(new Error('disk full'));
    setup();
    open();
    fireEvent.click(screen.getByText('Export diagnostics'));
    expect(await screen.findByText(/Export failed: disk full/)).toBeInTheDocument();
    shareTextFile.mockResolvedValueOnce('cancelled');
    fireEvent.click(screen.getByText('Export diagnostics'));
    expect(await screen.findByText(/Nothing was saved/)).toBeInTheDocument();
  });
});
