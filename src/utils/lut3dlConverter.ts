/**
 * Converts an Autodesk/Lustre .3dl LUT (the format Adobe Premiere, After Effects and Lightroom also read)
 * into .cube text so it goes through the same parser, storage and GPU pipeline as every other LUT.
 *
 * .3dl: an optional header line listing the mesh points (e.g. "0 64 128 ... 1023"), then size^3 rows of
 * integer RGB where blue changes fastest. .cube wants red fastest, so rows are reordered.
 */
export interface ThreeDlResult {
  success: boolean;
  cube?: string;
  size?: number;
  error?: string;
}

const BIT_DEPTHS = [255, 1023, 4095, 65535];

export function convert3dlToCube(text: string, title = 'Imported 3DL'): ThreeDlResult {
  const rows: [number, number, number][] = [];
  let headerPoints = 0;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || /^(title|lut_|domain_|3dmesh|mesh|gamma|input|output)/i.test(line)) continue;
    const parts = line.split(/\s+/);
    if (parts.some((p) => !/^-?\d+(\.\d+)?$/.test(p))) {
      return { success: false, error: `Malformed line in .3dl file: "${line.slice(0, 40)}"` };
    }
    const nums = parts.map(Number);
    if (nums.length === 3) rows.push([nums[0], nums[1], nums[2]]);
    else if (nums.length > 3 && rows.length === 0) headerPoints = nums.length; // mesh header
    else return { success: false, error: 'Unexpected row length in .3dl file.' };
  }

  // A mesh header with exactly 3 points looks like a data row: it is one when removing it leaves a perfect cube.
  const isCube = (n: number) => n > 1 && Math.round(Math.cbrt(n)) ** 3 === n;
  if (headerPoints === 0 && rows.length > 1 && !isCube(rows.length) && isCube(rows.length - 1)) {
    const first = rows[0];
    if (first[0] === 0 && first[1] > first[0] && first[2] > first[1]) {
      headerPoints = 3;
      rows.shift();
    }
  }

  if (rows.length === 0) return { success: false, error: 'No RGB data found in .3dl file.' };
  const size = Math.round(Math.cbrt(rows.length));
  if (size * size * size !== rows.length || size < 2) {
    return { success: false, error: `Invalid .3dl: ${rows.length} rows is not a cube (N×N×N).` };
  }
  if (headerPoints && headerPoints !== size) {
    return { success: false, error: `Invalid .3dl: header lists ${headerPoints} points but the table is ${size}×${size}×${size}.` };
  }

  let max = 0;
  for (const r of rows) max = Math.max(max, r[0], r[1], r[2]);
  const scale = BIT_DEPTHS.find((b) => max <= b) ?? max;

  const out: string[] = [`TITLE "${title.replace(/"/g, "'")}"`, `LUT_3D_SIZE ${size}`, 'DOMAIN_MIN 0.0 0.0 0.0', 'DOMAIN_MAX 1.0 1.0 1.0'];
  // .3dl index = (r*size + g)*size + b ; .cube order = r fastest, then g, then b
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const [cr, cg, cb] = rows[(r * size + g) * size + b];
        out.push(`${(cr / scale).toFixed(6)} ${(cg / scale).toFixed(6)} ${(cb / scale).toFixed(6)}`);
      }
    }
  }
  return { success: true, cube: out.join('\n'), size };
}
