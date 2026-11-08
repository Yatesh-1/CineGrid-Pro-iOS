import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..', '..');
const asset = resolve(root, 'android/app/src/main/assets/film_fragment.glsl');

describe('native film shader stays in sync with the web shader', () => {
  it('regenerating from webglLutPipeline.ts changes nothing (run `node scripts/gen-native-shader.mjs` if this fails)', () => {
    const before = readFileSync(asset, 'utf8');
    execFileSync(process.execPath, [resolve(root, 'scripts/gen-native-shader.mjs')], { cwd: root });
    const after = readFileSync(asset, 'utf8');
    expect(after).toBe(before);
  });

  it('contains the full film stage and routes every image read through the upright-texture helper', () => {
    const src = readFileSync(asset, 'utf8');
    for (const fn of ['float fHash', 'vec3 filmBase', 'vec3 filmColor', 'vec3 filmFinish', 'float toneCh']) {
      expect(src).toContain(fn);
    }
    expect((src.match(/texture2D\(u_image,/g) ?? []).length).toBe(1);
    expect(src).not.toContain('samplerExternalOES'); // pass 2 reads an ordinary texture; pass 1 owns the external one
  });

  it('applies the same highlight shoulder as the CPU reference (white stays white)', () => {
    const src = readFileSync(asset, 'utf8');
    expect(src).toContain('u + u_fTone.w * u * u * (1.0 - u)');
    expect(src).toContain('min(1.0, (y - knee) / (1.0 - knee))');
  });
});
