/**
 * Resamples a 3D LUT (red fastest, then green, then blue; values 0..1) to a smaller cube with trilinear interpolation.
 * Used when the GPU cannot hold a LUT strip of size*size pixels (a 65-point LUT is 4225 pixels wide, more than many
 * phones allow), so the LUT is reduced instead of the picture going black.
 */
export function resampleLut(data: Float32Array, from: number, to: number): Float32Array {
  if (to >= from) return data;
  const out = new Float32Array(to * to * to * 3);
  const at = (r: number, g: number, b: number, c: number) => data[((b * from + g) * from + r) * 3 + c];
  const scale = (from - 1) / (to - 1);
  let o = 0;
  for (let b = 0; b < to; b++) {
    const fb = b * scale;
    const b0 = Math.floor(fb);
    const b1 = Math.min(from - 1, b0 + 1);
    const tb = fb - b0;
    for (let g = 0; g < to; g++) {
      const fg = g * scale;
      const g0 = Math.floor(fg);
      const g1 = Math.min(from - 1, g0 + 1);
      const tg = fg - g0;
      for (let r = 0; r < to; r++) {
        const fr = r * scale;
        const r0 = Math.floor(fr);
        const r1 = Math.min(from - 1, r0 + 1);
        const tr = fr - r0;
        for (let c = 0; c < 3; c++) {
          const c00 = at(r0, g0, b0, c) * (1 - tr) + at(r1, g0, b0, c) * tr;
          const c10 = at(r0, g1, b0, c) * (1 - tr) + at(r1, g1, b0, c) * tr;
          const c01 = at(r0, g0, b1, c) * (1 - tr) + at(r1, g0, b1, c) * tr;
          const c11 = at(r0, g1, b1, c) * (1 - tr) + at(r1, g1, b1, c) * tr;
          out[o++] = (c00 * (1 - tg) + c10 * tg) * (1 - tb) + (c01 * (1 - tg) + c11 * tg) * tb;
        }
      }
    }
  }
  return out;
}

/** Largest LUT size whose strip (size*size wide) fits a texture of `maxTextureSize`, keeping a safety margin. */
export function maxLutSizeFor(maxTextureSize: number): number {
  return Math.max(2, Math.min(64, Math.floor(Math.sqrt(Math.max(4, maxTextureSize)))));
}
