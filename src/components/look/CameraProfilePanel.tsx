import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Copy, Download, RotateCcw, Trash2, Upload, Camera, Ban } from 'lucide-react';
import type { LookState } from '../../types/lut';
import { cameraProfileStore } from '../../services/cameraProfileStore';
import type { CameraProfile, BorderStyle, DateFormat, DatePosition } from '../../utils/cameraProfile';
import { renderProbe, type ProbeSnapshot } from '../../utils/renderProbe';

interface Props {
  lookState: LookState;
  onChangeLookState: (patch: Partial<LookState>) => void;
}

type Row = { path: string; label: string; min: number; max: number; step: number };

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Colour',
    rows: [
      { path: 'color.saturation', label: 'Saturation', min: -1, max: 1, step: 0.01 },
      { path: 'color.contrast', label: 'Contrast', min: -1, max: 1, step: 0.01 },
      { path: 'color.temperature', label: 'Temperature', min: -1, max: 1, step: 0.01 },
      { path: 'color.tint', label: 'Tint', min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Tone curve',
    rows: [
      { path: 'tone.blackPoint', label: 'Black point', min: 0, max: 0.2, step: 0.005 },
      { path: 'tone.shadowLift', label: 'Shadow lift', min: 0, max: 0.25, step: 0.005 },
      { path: 'tone.midGamma', label: 'Mid gamma', min: 0.6, max: 1.6, step: 0.01 },
      { path: 'tone.highlightRolloff', label: 'Highlight roll-off', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Grain / sensor noise',
    rows: [
      { path: 'grain.amount', label: 'Amount', min: 0, max: 1, step: 0.01 },
      { path: 'grain.size', label: 'Size', min: 0.5, max: 4, step: 0.1 },
      { path: 'grain.roughness', label: 'Roughness', min: 0, max: 1, step: 0.01 },
      { path: 'grain.chroma', label: 'Colour noise', min: 0, max: 1, step: 0.01 },
      { path: 'grain.shadowBias', label: 'Shadow bias', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Halation & bloom',
    rows: [
      { path: 'halation.amount', label: 'Halation', min: 0, max: 1, step: 0.01 },
      { path: 'halation.radius', label: 'Halation radius', min: 0, max: 1, step: 0.01 },
      { path: 'halation.threshold', label: 'Halation threshold', min: 0.4, max: 1, step: 0.01 },
      { path: 'bloom.amount', label: 'Bloom', min: 0, max: 1, step: 0.01 },
      { path: 'bloom.radius', label: 'Bloom radius', min: 0, max: 1, step: 0.01 },
      { path: 'bloom.threshold', label: 'Bloom threshold', min: 0.4, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Lens (simulated)',
    rows: [
      { path: 'softness', label: 'Softness', min: 0, max: 1, step: 0.01 },
      { path: 'chromaticAberration', label: 'Chromatic aberration', min: 0, max: 1, step: 0.01 },
      { path: 'vignette.amount', label: 'Vignette', min: 0, max: 1, step: 0.01 },
      { path: 'vignette.roundness', label: 'Vignette roundness', min: 0, max: 1, step: 0.01 },
      { path: 'vignette.softness', label: 'Vignette softness', min: 0, max: 1, step: 0.01 },
      { path: 'flash.amount', label: 'Retro flash look', min: 0, max: 1, step: 0.01 },
      { path: 'flash.falloff', label: 'Flash falloff', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Light leak & dust',
    rows: [
      { path: 'lightLeak.amount', label: 'Light leak', min: 0, max: 1, step: 0.01 },
      { path: 'lightLeak.hue', label: 'Leak hue', min: 0, max: 360, step: 1 },
      { path: 'lightLeak.position', label: 'Leak position', min: 0, max: 1, step: 0.01 },
      { path: 'dust', label: 'Dust & scratches', min: 0, max: 1, step: 0.01 },
      { path: 'border.width', label: 'Border width', min: 0, max: 0.2, step: 0.005 },
    ],
  },
];

/** Live readout of the render probe. Values the WebView cannot provide show as n/a rather than a guess. */
const PerfReadout: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<ProbeSnapshot>(() => renderProbe.snapshot());
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setSnap(renderProbe.snapshot()), 1000);
    return () => window.clearInterval(id);
  }, [open]);
  const v = (x: number | null, unit = ''): string => (x === null ? 'n/a' : `${x}${unit}`);
  const rows: [string, string][] = [
    ['Preview FPS', v(snap.fps)],
    ['GPU submit time (avg / max)', `${v(snap.avgRenderMs)} / ${v(snap.maxRenderMs, ' ms')}`],
    ['Dropped frames', String(snap.droppedFrames)],
    ['JS heap', v(snap.jsHeapMB, ' MB')],
    ['GPU execution timer', snap.gpuTimerAvailable ? 'available' : 'not exposed by this WebView'],
    ['WebGL context', snap.contextStatus],
    ['Photo capture (last / avg)', `${v(snap.lastCaptureMs)} / ${v(snap.avgCaptureMs, ' ms')}  (${snap.captures})`],
  ];
  return (
    <details
      className="rounded-xl border border-white/10 bg-zinc-950/60"
      data-testid="perf-readout"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="px-3 h-10 flex items-center text-xs font-semibold text-zinc-200 cursor-pointer">Performance</summary>
      <div className="px-3 pb-3 space-y-1 text-[11px]">
        {rows.map(([k, val]) => (
          <div key={k} className="flex justify-between gap-2">
            <span className="text-zinc-400">{k}</span>
            <span className="text-zinc-100 tabular-nums text-right">{val}</span>
          </div>
        ))}
        <button
          type="button"
          className="mt-1 h-8 px-3 rounded-full text-[11px] font-semibold border border-white/10 bg-zinc-900 text-zinc-200"
          onClick={() => {
            renderProbe.reset();
            setSnap(renderProbe.snapshot());
          }}
        >
          Reset counters
        </button>
      </div>
    </details>
  );
};

const MATRIX_LABELS = ['R→R', 'G→R', 'B→R', 'R→G', 'G→G', 'B→G', 'R→B', 'G→B', 'B→B'];

function getPath(obj: unknown, path: string): number {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], obj) as number;
}

function setPath<T>(obj: T, path: string, value: number): T {
  const keys = path.split('.');
  const clone = structuredClone(obj) as Record<string, unknown>;
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]] as Record<string, unknown>;
  cur[keys[keys.length - 1]] = value;
  return clone as T;
}

const hexOf = (c: [number, number, number]): string =>
  '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const rgbOf = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];

export const CameraProfilePanel: React.FC<Props> = ({ lookState, onChangeLookState }) => {
  useSyncExternalStore(cameraProfileStore.subscribe, cameraProfileStore.getRevision);
  const profiles = cameraProfileStore.list();
  const active = cameraProfileStore.get(lookState.cameraProfileId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const select = (id: string | null) => onChangeLookState({ cameraProfileId: id });
  const edit = (next: CameraProfile) => cameraProfileStore.update(next);

  const handleDuplicate = () => {
    if (!active) return;
    const copy = cameraProfileStore.duplicate(active.id);
    if (copy) {
      select(copy.id);
      setMessage({ kind: 'ok', text: `Created “${copy.name}”.` });
    } else setMessage({ kind: 'error', text: 'Could not duplicate (profile limit reached).' });
  };

  const handleExport = () => {
    if (!active) return;
    const json = cameraProfileStore.exportJson(active.id);
    if (!json) return;
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${active.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.cinegrid-camera.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMessage({ kind: 'ok', text: 'Profile exported.' });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 64 * 1024) {
      setMessage({ kind: 'error', text: 'That file is too large to be a camera profile.' });
      return;
    }
    const r = cameraProfileStore.importJson(await file.text());
    if (r.ok) {
      select(r.profile.id);
      setMessage({ kind: 'ok', text: `Imported “${r.profile.name}”.` });
    } else setMessage({ kind: 'error', text: r.error });
  };

  const handleDelete = () => {
    if (!active || active.builtIn) return;
    if (cameraProfileStore.remove(active.id)) {
      select(null);
      setMessage({ kind: 'ok', text: 'Profile deleted.' });
    }
  };

  const handleReset = () => {
    if (!active) return;
    cameraProfileStore.reset(active.id);
    setMessage({ kind: 'ok', text: 'Restored factory settings.' });
  };

  const btn =
    'h-10 min-w-10 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 disabled:opacity-35 disabled:hover:bg-zinc-900';

  return (
    <div className="space-y-3" data-testid="camera-profile-panel">
      <p className="text-[11px] text-zinc-400 leading-snug">
        Virtual cameras are simulated looks rendered on the GPU in the live preview, saved photos and recorded video.
        They do not switch to a different physical lens.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Virtual cameras">
        <button
          role="option"
          aria-selected={!active}
          onClick={() => select(null)}
          className={`flex-shrink-0 w-24 h-16 rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-1 ${
            !active ? 'border-amber-400 text-amber-300 bg-amber-400/10' : 'border-white/10 text-zinc-300 bg-zinc-900'
          }`}
        >
          <Ban size={14} aria-hidden="true" />
          No camera
        </button>
        {profiles.map((p) => (
          <button
            key={p.id}
            role="option"
            aria-selected={active?.id === p.id}
            onClick={() => select(p.id)}
            className={`flex-shrink-0 w-28 h-16 rounded-xl border px-2 text-left ${
              active?.id === p.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-zinc-900'
            }`}
          >
            <span className="flex items-center gap-1 text-[11px] font-semibold text-white leading-tight line-clamp-2">
              <Camera size={11} aria-hidden="true" className="flex-shrink-0 text-amber-300" />
              {p.name}
            </span>
            <span className="text-[9px] uppercase tracking-wide text-zinc-500">
              {p.kind}
              {p.builtIn && cameraProfileStore.isModified(p.id) ? ' · edited' : ''}
              {!p.builtIn ? ' · mine' : ''}
            </span>
          </button>
        ))}
      </div>

      {message && (
        <div
          role="status"
          className={`px-3 py-2 rounded-xl text-xs border ${
            message.kind === 'ok'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button className={btn} onClick={handleDuplicate} disabled={!active} aria-label="Duplicate camera">
          <Copy size={13} aria-hidden="true" /> Duplicate
        </button>
        <button
          className={btn}
          onClick={handleReset}
          disabled={!active || !active.builtIn || !cameraProfileStore.isModified(active.id)}
          aria-label="Reset camera to factory settings"
        >
          <RotateCcw size={13} aria-hidden="true" /> Reset
        </button>
        <button className={btn} onClick={handleExport} disabled={!active} aria-label="Export camera">
          <Download size={13} aria-hidden="true" /> Export
        </button>
        <button className={btn} onClick={() => fileRef.current?.click()} aria-label="Import camera">
          <Upload size={13} aria-hidden="true" /> Import
        </button>
        <button className={btn} onClick={handleDelete} disabled={!active || active.builtIn} aria-label="Delete camera">
          <Trash2 size={13} aria-hidden="true" /> Delete
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
      </div>

      <PerfReadout />

      {active && (
        <div className="space-y-3 pb-4">
          <p className="text-[11px] text-zinc-400">{active.description}</p>

          {GROUPS.map((g) => (
            <details key={g.title} className="rounded-xl border border-white/10 bg-zinc-950/60" open={g.title === 'Colour'}>
              <summary className="px-3 h-10 flex items-center text-xs font-semibold text-zinc-200 cursor-pointer">
                {g.title}
              </summary>
              <div className="px-3 pb-3 space-y-2">
                {g.rows.map((r) => {
                  const v = getPath(active, r.path);
                  return (
                    <label key={r.path} className="flex items-center gap-2 text-[11px] text-zinc-300">
                      <span className="w-32 flex-shrink-0">{r.label}</span>
                      <input
                        type="range"
                        aria-label={r.label}
                        className="flex-1 h-8 accent-amber-400"
                        min={r.min}
                        max={r.max}
                        step={r.step}
                        value={v}
                        onChange={(e) => edit(setPath(active, r.path, Number(e.target.value)))}
                      />
                      <span className="w-10 text-right tabular-nums text-zinc-500">{Number(v.toFixed(2))}</span>
                    </label>
                  );
                })}
              </div>
            </details>
          ))}

          <details className="rounded-xl border border-white/10 bg-zinc-950/60">
            <summary className="px-3 h-10 flex items-center text-xs font-semibold text-zinc-200 cursor-pointer">
              Colour matrix (channel mix)
            </summary>
            <div className="px-3 pb-3 grid grid-cols-3 gap-x-3 gap-y-2">
              {active.color.matrix.map((v, i) => (
                <label key={i} className="text-[10px] text-zinc-400 flex flex-col">
                  {MATRIX_LABELS[i]} <span className="text-zinc-500 tabular-nums">{v.toFixed(2)}</span>
                  <input
                    type="range"
                    aria-label={`Matrix ${MATRIX_LABELS[i]}`}
                    className="h-8 accent-amber-400"
                    min={-0.5}
                    max={1.5}
                    step={0.01}
                    value={v}
                    onChange={(e) => {
                      const matrix = [...active.color.matrix] as CameraProfile['color']['matrix'];
                      matrix[i] = Number(e.target.value);
                      edit({ ...active, color: { ...active.color, matrix } });
                    }}
                  />
                </label>
              ))}
            </div>
          </details>

          <details className="rounded-xl border border-white/10 bg-zinc-950/60">
            <summary className="px-3 h-10 flex items-center text-xs font-semibold text-zinc-200 cursor-pointer">
              Border & date imprint
            </summary>
            <div className="px-3 pb-3 space-y-2 text-[11px] text-zinc-300">
              <label className="flex items-center gap-2">
                <span className="w-32">Border style</span>
                <select
                  aria-label="Border style"
                  className="flex-1 h-9 rounded-lg bg-zinc-900 border border-white/10 px-2"
                  value={active.border.style}
                  onChange={(e) =>
                    edit({
                      ...active,
                      border: {
                        style: e.target.value as BorderStyle,
                        width: active.border.width || (e.target.value === 'none' ? 0 : 0.05),
                      },
                    })
                  }
                >
                  <option value="none">None</option>
                  <option value="film">Film edge</option>
                  <option value="instant">Instant frame</option>
                </select>
              </label>
              <button
                role="switch"
                aria-checked={active.dateImprint.enabled}
                className={`${btn} w-full justify-between`}
                onClick={() => edit({ ...active, dateImprint: { ...active.dateImprint, enabled: !active.dateImprint.enabled } })}
              >
                <span>Date imprint</span>
                <span className={active.dateImprint.enabled ? 'text-amber-300' : 'text-zinc-500'}>
                  {active.dateImprint.enabled ? 'ON' : 'OFF'}
                </span>
              </button>
              <label className="flex items-center gap-2">
                <span className="w-32">Format</span>
                <select
                  aria-label="Date format"
                  className="flex-1 h-9 rounded-lg bg-zinc-900 border border-white/10 px-2"
                  value={active.dateImprint.format}
                  onChange={(e) =>
                    edit({ ...active, dateImprint: { ...active.dateImprint, format: e.target.value as DateFormat } })
                  }
                >
                  <option value="yy mm dd">'YY MM DD</option>
                  <option value="dd mm yy">DD MM 'YY</option>
                  <option value="mm/dd/yy">MM/DD/YY</option>
                  <option value="time">HH:MM:SS</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="w-32">Position</span>
                <select
                  aria-label="Date position"
                  className="flex-1 h-9 rounded-lg bg-zinc-900 border border-white/10 px-2"
                  value={active.dateImprint.position}
                  onChange={(e) =>
                    edit({ ...active, dateImprint: { ...active.dateImprint, position: e.target.value as DatePosition } })
                  }
                >
                  <option value="bottomRight">Bottom right</option>
                  <option value="bottomLeft">Bottom left</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="w-32">Imprint colour</span>
                <input
                  type="color"
                  aria-label="Date imprint colour"
                  className="h-9 w-16 rounded bg-transparent"
                  value={hexOf(active.dateImprint.color)}
                  onChange={(e) =>
                    edit({ ...active, dateImprint: { ...active.dateImprint, color: rgbOf(e.target.value) } })
                  }
                />
              </label>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
