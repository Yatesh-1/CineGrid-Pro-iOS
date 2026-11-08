import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProHUD } from '../../components/ProHUD';
import { ProSettingsDrawer } from '../../components/ProSettingsDrawer';
import { DEFAULT_PRO_SETTINGS } from '../../data/defaultSettings';
import type { ControlSupport } from '../../services/cameraControlService';

const hudProps = (extra: Record<string, unknown> = {}) => ({
  aspectRatio: '4:3' as const,
  onCycleAspectRatio: vi.fn(),
  proSettings: { ...DEFAULT_PRO_SETTINGS, histogram: true, waveform: true },
  onUpdatePro: vi.fn(),
  videoElement: null,
  imageElement: null,
  isFrontCamera: false,
  onSwitchCamera: vi.fn(),
  hasTorch: false,
  torchOn: false,
  onToggleTorch: vi.fn(),
  splitActive: false,
  onToggleSplit: vi.fn(),
  onOpenSettings: vi.fn(),
  zoomLevel: 1,
  onZoomChange: vi.fn(),
  isRecordingVideo: false,
  recordingDuration: 0,
  stream: null,
  expanded: true,
  showHeader: false,
  onApplyPreset: vi.fn(),
  ...extra,
});

describe('exposure readouts and scopes render below the frame', () => {
  it('portals the readout bar and scopes into the host, not over the picture', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const { container } = render(<ProHUD {...(hudProps({ toolsHost: host }) as never)} />);

    // In the host: the readout pills and both scope canvases
    expect(host.textContent).toContain('SHUTTER');
    expect(host.textContent).toContain('ISO');
    expect(host.querySelectorAll('canvas').length).toBe(2);
    // Not inside the frame overlay
    expect(container.textContent).not.toContain('SHUTTER');
    expect(container.querySelectorAll('canvas').length).toBe(0);
    host.remove();
  });

  it('readout pills are not boxed when below the frame', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(<ProHUD {...(hudProps({ toolsHost: host }) as never)} />);
    const bar = host.querySelector('.overflow-x-auto')!;
    expect(bar.className).not.toMatch(/\bborder\b|\bbg-black/);
    host.remove();
  });
});

describe('scopes live in Pro > Monitoring, not on the camera screen', () => {
  it('draws no scopes at all when there is no host (the Pro tab is closed)', () => {
    const { container } = render(<ProHUD {...(hudProps({ expanded: false, scopesInHostOnly: true }) as never)} />);
    expect(container.querySelectorAll('canvas').length).toBe(0);
    expect(container.textContent).not.toContain('Waveform');
  });

  it('draws them inside the Monitoring tab host and closes each with its own button', () => {
    let host: HTMLDivElement | null = null;
    const onChange = vi.fn();
    const drawer = (
      <ProSettingsDrawer
        isOpen
        onClose={vi.fn()}
        settings={DEFAULT_PRO_SETTINGS}
        onChange={onChange}
        onReset={vi.fn()}
        onApplyPreset={vi.fn()}
        isFrontCamera={false}
        onScopesHost={(el) => {
          host = el;
        }}
      />
    );
    render(drawer);
    fireEvent.click(screen.getByRole('tab', { name: /MONITORING/ }));
    expect(host).not.toBeNull();

    const onUpdatePro = vi.fn();
    render(<ProHUD {...(hudProps({ toolsHost: host, scopesInHostOnly: true, expanded: false, onUpdatePro }) as never)} />);
    expect(host!.querySelectorAll('canvas').length).toBe(2);

    fireEvent.click(screen.getByLabelText('Close waveform'));
    expect(onUpdatePro).toHaveBeenLastCalledWith({ waveform: false });
    fireEvent.click(screen.getByLabelText('Close histogram'));
    expect(onUpdatePro).toHaveBeenLastCalledWith({ histogram: false });
  });
});

describe('ISO and shutter work as software exposure on cameras that cannot set them', () => {
  const noManual: ControlSupport = { iso: null, exposureTime: null, ev: null, whiteBalance: null, focus: null } as unknown as ControlSupport;
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    settings: DEFAULT_PRO_SETTINGS,
    onChange: vi.fn(),
    onReset: vi.fn(),
    onApplyPreset: vi.fn(),
    isFrontCamera: false,
    controlSupport: noManual,
  };

  it('keeps the ISO and shutter buttons enabled and explains the software behaviour', () => {
    const onChange = vi.fn();
    render(<ProSettingsDrawer {...baseProps} onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /EXPOSURE/ }));

    expect(screen.getByRole('note')).toHaveTextContent(/software exposure change/i);
    const iso800 = screen.getByText('800');
    expect(iso800).not.toBeDisabled();
    fireEvent.click(iso800);
    expect(onChange).toHaveBeenLastCalledWith({ iso: 800, isoAuto: false });

    const shutter = screen.getByText('1/50');
    expect(shutter).not.toBeDisabled();
    fireEvent.click(shutter);
    expect(onChange).toHaveBeenLastCalledWith({ shutterSpeed: '1/50', shutterMode: 'speed', shutterAuto: false });
  });
});

describe('Pro drawer opens on the requested tab', () => {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    settings: DEFAULT_PRO_SETTINGS,
    onChange: vi.fn(),
    onReset: vi.fn(),
    onApplyPreset: vi.fn(),
    isFrontCamera: false,
  };

  it('starts on Exposure, Color or Focus when asked, so each setting is one tap from its readout', () => {
    for (const [tab, label] of [['exposure', /EXPOSURE/], ['color', /COLOR/], ['focus', /FOCUS/]] as const) {
      const { unmount } = render(<ProSettingsDrawer {...props} initialTab={tab} />);
      expect(screen.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true');
      unmount();
    }
  });

  it('holds shutter, ISO, exposure, focus and temperature between its tabs', () => {
    render(<ProSettingsDrawer {...props} initialTab="exposure" />);
    expect(screen.getByText('ISO SENSOR GAIN')).toBeInTheDocument();
    expect(screen.getByText('SHUTTER SPEED (ANGLE)')).toBeInTheDocument();
    expect(screen.getByText('EXPOSURE COMPENSATION')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /FOCUS/ }));
    expect(screen.getByText('Focus Mode')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /COLOR/ }));
    expect(screen.getByText('COLOR TEMPERATURE')).toBeInTheDocument();
  });
});
