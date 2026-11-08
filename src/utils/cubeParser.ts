import type {
  LutDefinition,
  LutParseResult,
  LookState,
  ColorAdjustments,
} from '../types/lut';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB max limit

/**
 * Parses an Adobe/DaVinci standard .cube 3D LUT file with strict validation
 */
export function parseCubeFile(rawContent: string, fileName: string = 'Imported LUT'): LutParseResult {
  if (!rawContent || typeof rawContent !== 'string') {
    return { success: false, error: 'File content is empty or unreadable.' };
  }

  // 1. File size safeguard
  const byteLength = new Blob([rawContent]).size;
  if (byteLength > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: `File size exceeds the 25 MB safety limit (${(byteLength / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  const lines = rawContent.split(/\r?\n/);
  let title = fileName.replace(/\.cube$/i, '').trim();
  let lutSize = 0;
  let domainMin: [number, number, number] = [0.0, 0.0, 0.0];
  let domainMax: [number, number, number] = [1.0, 1.0, 1.0];
  let dataStartIndex = -1;

  // 2. Parse headers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const upper = line.toUpperCase();

    if (upper.startsWith('TITLE')) {
      const match = line.match(/TITLE\s+["']?([^"']+)["']?/i);
      if (match && match[1]) {
        title = match[1].trim();
      }
      continue;
    }

    if (upper.startsWith('LUT_1D_SIZE')) {
      return {
        success: false,
        error: '1D LUT format is not supported. Please import a standard 3D .cube LUT file.',
      };
    }

    if (upper.startsWith('LUT_3D_SIZE')) {
      const parts = line.split(/\s+/);
      const parsedSize = parseInt(parts[1], 10);
      if (isNaN(parsedSize) || parsedSize < 2 || parsedSize > 65) {
        return {
          success: false,
          error: `Invalid LUT_3D_SIZE: ${parts[1]}. Supported 3D dimensions are between 2 and 65 (e.g. 17, 33, 65).`,
        };
      }
      lutSize = parsedSize;
      continue;
    }

    if (upper.startsWith('DOMAIN_MIN')) {
      const parts = line.split(/\s+/).slice(1).map(Number);
      if (parts.length === 3 && parts.every((v) => !isNaN(v) && isFinite(v))) {
        domainMin = [parts[0], parts[1], parts[2]];
      }
      continue;
    }

    if (upper.startsWith('DOMAIN_MAX')) {
      const parts = line.split(/\s+/).slice(1).map(Number);
      if (parts.length === 3 && parts.every((v) => !isNaN(v) && isFinite(v))) {
        domainMax = [parts[0], parts[1], parts[2]];
      }
      continue;
    }

    // First line starting with numeric values represents table data
    const firstNum = parseFloat(line.split(/\s+/)[0]);
    if (!isNaN(firstNum)) {
      dataStartIndex = i;
      break;
    }
  }

  if (lutSize === 0) {
    return {
      success: false,
      error: 'Invalid .cube file: Missing or invalid "LUT_3D_SIZE" declaration in header.',
    };
  }

  if (dataStartIndex === -1) {
    return {
      success: false,
      error: 'Invalid .cube file: No RGB color data found following header.',
    };
  }

  const expectedPoints = lutSize * lutSize * lutSize;
  const floatData = new Float32Array(expectedPoints * 3);
  let parsedPoints = 0;

  const rangeR = domainMax[0] - domainMin[0] || 1.0;
  const rangeG = domainMax[1] - domainMin[1] || 1.0;
  const rangeB = domainMax[2] - domainMin[2] || 1.0;

  // 3. Parse RGB color triplets
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;

    const r = parseFloat(parts[0]);
    const g = parseFloat(parts[1]);
    const b = parseFloat(parts[2]);

    if (isNaN(r) || isNaN(g) || isNaN(b) || !isFinite(r) || !isFinite(g) || !isFinite(b)) {
      return {
        success: false,
        error: `Malformed color value on line ${i + 1}: [${parts.join(', ')}]. Values must be valid real numbers.`,
      };
    }

    // Normalize to 0.0 - 1.0 domain
    const normR = Math.max(0.0, Math.min(1.0, (r - domainMin[0]) / rangeR));
    const normG = Math.max(0.0, Math.min(1.0, (g - domainMin[1]) / rangeG));
    const normB = Math.max(0.0, Math.min(1.0, (b - domainMin[2]) / rangeB));

    if (parsedPoints < expectedPoints) {
      const idx = parsedPoints * 3;
      floatData[idx] = normR;
      floatData[idx + 1] = normG;
      floatData[idx + 2] = normB;
      parsedPoints++;
    }
  }

  if (parsedPoints !== expectedPoints) {
    return {
      success: false,
      error: `Incomplete LUT data: Expected ${expectedPoints} color points (${lutSize}x${lutSize}x${lutSize}), but found ${parsedPoints}.`,
    };
  }

  // 4. Generate dynamic thumbnail gradient from LUT samples
  const shadowIdx = 0;
  const midIdx = Math.floor(expectedPoints / 2) * 3;
  const highlightIdx = (expectedPoints - 1) * 3;

  const toRgbStr = (idx: number) => {
    const r = Math.round(floatData[idx] * 255);
    const g = Math.round(floatData[idx + 1] * 255);
    const b = Math.round(floatData[idx + 2] * 255);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const thumbnailGradient = `linear-gradient(135deg, ${toRgbStr(shadowIdx)} 0%, ${toRgbStr(midIdx)} 50%, ${toRgbStr(highlightIdx)} 100%)`;

  const lutId = `lut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const lut: LutDefinition = {
    id: lutId,
    name: title,
    title,
    category: 'imported',
    size: lutSize,
    domainMin,
    domainMax,
    data: floatData,
    rawCube: rawContent,
    thumbnailGradient,
    isFavorite: false,
    isImported: true,
    importDate: Date.now(),
    fileSize: byteLength,
  };

  return {
    success: true,
    lut,
    details: {
      size: lutSize,
      title,
      pointCount: parsedPoints,
      fileSize: byteLength,
    },
  };
}

/**
 * Generates an industry-standard .cube file string from a sampling function
 */
export function generateCubeFile(
  title: string,
  size: number,
  sampleColor: (r: number, g: number, b: number) => [number, number, number]
): string {
  const header = [
    `# Created with CineGrid Pro LUT Studio`,
    `TITLE "${title.replace(/"/g, '')}"`,
    `LUT_3D_SIZE ${size}`,
    `DOMAIN_MIN 0.0 0.0 0.0`,
    `DOMAIN_MAX 1.0 1.0 1.0`,
    '',
  ].join('\n');

  const rows: string[] = [];
  const step = size > 1 ? 1.0 / (size - 1) : 1.0;

  // Standard .cube traversal order: r changes fastest, then g, then b
  for (let b = 0; b < size; b++) {
    const normB = b * step;
    for (let g = 0; g < size; g++) {
      const normG = g * step;
      for (let r = 0; r < size; r++) {
        const normR = r * step;
        const [outR, outG, outB] = sampleColor(normR, normG, normB);
        const formatFloat = (v: number) => Math.max(0.0, Math.min(1.0, v)).toFixed(6);
        rows.push(`${formatFloat(outR)} ${formatFloat(outG)} ${formatFloat(outB)}`);
      }
    }
  }

  return header + rows.join('\n') + '\n';
}

/**
 * Trilinear 3D LUT sampler
 */
export function sampleLutAt(lutData: Float32Array, size: number, r: number, g: number, b: number): [number, number, number] {
  const maxIdx = size - 1;
  const scaledR = Math.max(0, Math.min(1, r)) * maxIdx;
  const scaledG = Math.max(0, Math.min(1, g)) * maxIdx;
  const scaledB = Math.max(0, Math.min(1, b)) * maxIdx;

  const r0 = Math.floor(scaledR);
  const r1 = Math.min(maxIdx, r0 + 1);
  const rf = scaledR - r0;

  const g0 = Math.floor(scaledG);
  const g1 = Math.min(maxIdx, g0 + 1);
  const gf = scaledG - g0;

  const b0 = Math.floor(scaledB);
  const b1 = Math.min(maxIdx, b0 + 1);
  const bf = scaledB - b0;

  const getIdx = (ir: number, ig: number, ib: number) => (ib * size * size + ig * size + ir) * 3;

  const getVal = (ir: number, ig: number, ib: number): [number, number, number] => {
    const idx = getIdx(ir, ig, ib);
    return [lutData[idx], lutData[idx + 1], lutData[idx + 2]];
  };

  const c000 = getVal(r0, g0, b0);
  const c100 = getVal(r1, g0, b0);
  const c010 = getVal(r0, g1, b0);
  const c110 = getVal(r1, g1, b0);
  const c001 = getVal(r0, g0, b1);
  const c101 = getVal(r1, g0, b1);
  const c011 = getVal(r0, g1, b1);
  const c111 = getVal(r1, g1, b1);

  // Trilinear blend
  const c00 = [c000[0] * (1 - rf) + c100[0] * rf, c000[1] * (1 - rf) + c100[1] * rf, c000[2] * (1 - rf) + c100[2] * rf];
  const c10 = [c010[0] * (1 - rf) + c110[0] * rf, c010[1] * (1 - rf) + c110[1] * rf, c010[2] * (1 - rf) + c110[2] * rf];
  const c01 = [c001[0] * (1 - rf) + c101[0] * rf, c001[1] * (1 - rf) + c101[1] * rf, c001[2] * (1 - rf) + c101[2] * rf];
  const c11 = [c011[0] * (1 - rf) + c111[0] * rf, c011[1] * (1 - rf) + c111[1] * rf, c011[2] * (1 - rf) + c111[2] * rf];

  const c0 = [c00[0] * (1 - gf) + c10[0] * gf, c00[1] * (1 - gf) + c10[1] * gf, c00[2] * (1 - gf) + c10[2] * gf];
  const c1 = [c01[0] * (1 - gf) + c11[0] * gf, c01[1] * (1 - gf) + c11[1] * gf, c01[2] * (1 - gf) + c11[2] * gf];

  return [c0[0] * (1 - bf) + c1[0] * bf, c0[1] * (1 - bf) + c1[1] * bf, c0[2] * (1 - bf) + c1[2] * bf];
}

/**
 * Applies color adjustments (exposure, contrast, saturation, temp, tint)
 */
export function applyAdjustmentsToColor(
  r: number,
  g: number,
  b: number,
  adj: ColorAdjustments
): [number, number, number] {
  // 1. Exposure
  const expFactor = Math.pow(2.0, adj.exposure);
  let cr = r * expFactor;
  let cg = g * expFactor;
  let cb = b * expFactor;

  // 2. Contrast
  if (adj.contrast !== 0) {
    const cFactor = (adj.contrast + 100) / 100;
    cr = (cr - 0.5) * cFactor + 0.5;
    cg = (cg - 0.5) * cFactor + 0.5;
    cb = (cb - 0.5) * cFactor + 0.5;
  }

  // 3. Temperature & Tint
  if (adj.temperature !== 0) {
    const t = adj.temperature / 100;
    if (t > 0) {
      cr += t * 0.15;
      cb -= t * 0.15;
    } else {
      cr += t * 0.15;
      cb -= t * 0.15;
    }
  }

  if (adj.tint !== 0) {
    const m = adj.tint / 100;
    cg -= m * 0.1;
  }

  // 4. Saturation
  if (adj.saturation !== 0) {
    const lum = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
    const sFactor = (adj.saturation + 100) / 100;
    cr = lum + (cr - lum) * sFactor;
    cg = lum + (cg - lum) * sFactor;
    cb = lum + (cb - lum) * sFactor;
  }

  // 5. Fade (lift shadows)
  if (adj.fade > 0) {
    const f = (adj.fade / 100) * 0.15;
    cr = cr * (1.0 - f) + f;
    cg = cg * (1.0 - f) + f;
    cb = cb * (1.0 - f) + f;
  }

  return [
    Math.max(0.0, Math.min(1.0, cr)),
    Math.max(0.0, Math.min(1.0, cg)),
    Math.max(0.0, Math.min(1.0, cb)),
  ];
}

export const sampleLutTrilinear = sampleLutAt;

/**
 * Convenience helper to serialize a Float32Array table into a .cube string
 */
export function generateCubeString(data: Float32Array, size: number, title: string = 'Exported Grade'): string {
  return generateCubeFile(title, size, (r, g, b) => {
    return sampleLutAt(data, size, r, g, b);
  });
}

/**
 * Exports current Look grade (base LUT + adjustments) into a 33x33x33 .cube file
 */
export function exportLookAsCube(
  lookState: LookState,
  activeLut?: LutDefinition | null,
  outputTitle: string = 'CineGrid Grade'
): string {
  const lutSize = 33;

  return generateCubeFile(outputTitle, lutSize, (r, g, b) => {
    let curR = r;
    let curG = g;
    let curB = b;

    // 1. Sample base LUT with intensity mix
    if (activeLut && lookState.lutIntensity > 0) {
      const [lutR, lutG, lutB] = sampleLutAt(activeLut.data, activeLut.size, r, g, b);
      const mix = lookState.lutIntensity / 100;
      curR = r * (1 - mix) + lutR * mix;
      curG = g * (1 - mix) + lutG * mix;
      curB = b * (1 - mix) + lutB * mix;
    }

    // 2. Apply adjustments
    const [finalR, finalG, finalB] = applyAdjustmentsToColor(curR, curG, curB, lookState.adjustments);
    return [finalR, finalG, finalB];
  });
}
