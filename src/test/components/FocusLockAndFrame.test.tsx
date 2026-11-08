import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Viewfinder } from '../../components/Viewfinder';
import { ExposureBiasSlider } from '../../components/camera/ExposureBiasSlider';
import { DEFAULT_PRO_SETTINGS } from '../../data/defaultSettings';
import { DEFAULT_GRID_STYLE } from '../../data/defaultSettings';
import { CAMERA_FILTERS } from '../../data/presets';
import {
  EV_MAX,
  EV_MIN,
  LONG_PRESS_MS,
  evFromTrackPosition,
  sliderSide,
  stepEv,
  trackPositionFromEv,
} from '../../utils/exposureBias';

describe('brightness slider maths', () => {
  it('top is brightest, bottom is darkest, middle is zero', () => {
    expect(evFromTrackPosition(0, 100)).toBe(EV_MAX);
    expect(evFromTrackPosition(100, 100)).toBe(EV_MIN);
    expect(evFromTrackPosition(50, 100)).toBe(0);
  });

  it('snaps to 0.1, clamps outside the track and never returns -0', () => {
    expect(evFromTrackPosition(-40, 100)).toBe(EV_MAX);
    expect(evFromTrackPosition(500, 100)).toBe(EV_MIN);
    expect(Object.is(evFromTrackPosition(50, 100), -0)).toBe(false);
    expect(evFromTrackPosition(33.3, 100) * 10).toBeCloseTo(Math.round(evFromTrackPosition(33.3, 100) * 10), 6);
    expect(evFromTrackPosition(10, 0)).toBe(0);
  });

  it('positions the thumb from the value and round-trips', () => {
    expect(trackPositionFromEv(EV_MAX, 100)).toBe(0);
    expect(trackPositionFromEv(EV_MIN, 100)).toBe(100);
    for (const ev of [-2.5, -1, 0, 0.7, 3]) {
      expect(evFromTrackPosition(trackPositionFromEv(ev, 112), 112)).toBeCloseTo(ev, 1);
    }
  });

  it('keyboard steps stay on the 0.1 grid and inside the range', () => {
    expect(stepEv(0, 1)).toBe(0.1);
    expect(stepEv(0.1, -1)).toBe(0);
    expect(stepEv(EV_MAX, 1)).toBe(EV_MAX);
    expect(stepEv(EV_MIN, -1)).toBe(EV_MIN);
  });

  it('puts the slider on the other side when the focus square is near the right edge', () => {
    expect(sliderSide(20)).toBe('right');
    expect(sliderSide(90)).toBe('left');
  });
});

describe('ExposureBiasSlider', () => {
  it('exposes a labelled vertical slider and moves with the arrow keys', () => {
    const onChange = vi.fn();
    render(<ExposureBiasSlider value={0.5} onChange={onChange} />);
    const s = screen.getByRole('slider', { name: 'Exposure brightness' });
    expect(s).toHaveAttribute('aria-orientation', 'vertical');
    expect(s).toHaveAttribute('aria-valuenow', '0.5');
    expect(s).toHaveAttribute('aria-valuetext', '+0.5 EV');

    fireEvent.keyDown(s, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(0.6);
    fireEvent.keyDown(s, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(0.4);
  });
});

describe('Viewfinder: tap focus, brightness slider and AE/AF lock', () => {
  const videoRef = React.createRef<HTMLVideoElement>();
  const imageRef = React.createRef<HTMLImageElement>();

  const props = (extra: Record<string, unknown> = {}) => ({
    aspectRatio: '4:3' as const,
    filter: CAMERA_FILTERS[0],
    filterStrength: 100,
    proSettings: DEFAULT_PRO_SETTINGS,
    gridType: 'none' as const,
    gridStyleOptions: DEFAULT_GRID_STYLE,
    secondaryGuides: {} as never,
    framingGuide: { enabled: false } as never,
    onChangeFramingGuide: vi.fn(),
    zoomLevel: 1,
    onZoomChange: vi.fn(),
    isFrontCamera: false,
    videoRef,
    imageRef,
    useSimulatedScene: true,
    activeSceneIndex: 0,
    onCycleScene: vi.fn(),
    onRetryCamera: vi.fn(),
    cameraError: null,
    cameraReady: true,
    stream: null,
    ev: 0,
    onChangeEv: vi.fn(),
    onAeAfLockChange: vi.fn(),
    ...extra,
  });

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const frame = () => screen.getByTestId('viewfinder-frame');

  it('a tap shows the focus square and the brightness slider, and never says AE/AF LOCK', () => {
    render(<Viewfinder {...(props() as never)} />);
    expect(screen.queryByTestId('focus-square')).toBeNull();
    fireEvent.click(frame(), { clientX: 50, clientY: 50 });
    expect(screen.getByTestId('focus-square')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Exposure brightness' })).toBeInTheDocument();
    expect(screen.queryByText('AE/AF LOCK')).toBeNull();
  });

  it('the square and slider disappear by themselves after a few seconds', () => {
    render(<Viewfinder {...(props() as never)} />);
    fireEvent.click(frame(), { clientX: 50, clientY: 50 });
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.queryByTestId('focus-square')).toBeNull();
  });

  it('pressing and holding locks exposure and focus, and the lock does not time out', () => {
    const onAeAfLockChange = vi.fn();
    render(<Viewfinder {...(props({ onAeAfLockChange }) as never)} />);
    fireEvent.pointerDown(frame(), { clientX: 40, clientY: 40, pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS + 20);
    });
    expect(screen.getByText('AE/AF LOCK')).toBeInTheDocument();
    expect(onAeAfLockChange).toHaveBeenLastCalledWith(true);

    // the click that ends the press must not release the lock it just made
    fireEvent.pointerUp(frame());
    fireEvent.click(frame(), { clientX: 40, clientY: 40 });
    expect(screen.getByText('AE/AF LOCK')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText('AE/AF LOCK')).toBeInTheDocument();
    expect(screen.getByTestId('focus-square')).toBeInTheDocument();
  });

  it('a later tap releases the lock', () => {
    const onAeAfLockChange = vi.fn();
    render(<Viewfinder {...(props({ onAeAfLockChange }) as never)} />);
    fireEvent.pointerDown(frame(), { clientX: 40, clientY: 40, pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS + 20);
    });
    fireEvent.pointerUp(frame());
    fireEvent.click(frame(), { clientX: 40, clientY: 40 }); // end of the long press

    fireEvent.click(frame(), { clientX: 60, clientY: 60 }); // a fresh tap
    expect(screen.queryByText('AE/AF LOCK')).toBeNull();
    expect(onAeAfLockChange).toHaveBeenLastCalledWith(false);
  });

  it('moving the finger cancels a long press (it is a drag, not a lock)', () => {
    render(<Viewfinder {...(props() as never)} />);
    fireEvent.pointerDown(frame(), { clientX: 40, clientY: 40, pointerType: 'touch' });
    fireEvent.pointerMove(frame(), { clientX: 90, clientY: 90 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS + 100);
    });
    expect(screen.queryByText('AE/AF LOCK')).toBeNull();
  });

  it('a short press never locks', () => {
    render(<Viewfinder {...(props() as never)} />);
    fireEvent.pointerDown(frame(), { clientX: 40, clientY: 40, pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.pointerUp(frame());
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('AE/AF LOCK')).toBeNull();
  });
});
