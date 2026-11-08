import { describe, it, expect } from 'vitest';
import { parseCubeFile, generateCubeString, sampleLutTrilinear } from '../../utils/cubeParser';

describe('.CUBE Parser & Color Engine Tests', () => {
  it('correctly parses a minimal valid 2x2x2 .cube file', () => {
    const rawCube = `
# CineGrid Pro test LUT
TITLE "Test 2x2x2 Cube"
LUT_3D_SIZE 2
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0

0.000000 0.000000 0.000000
1.000000 0.000000 0.000000
0.000000 1.000000 0.000000
1.000000 1.000000 0.000000
0.000000 0.000000 1.000000
1.000000 0.000000 1.000000
0.000000 1.000000 1.000000
1.000000 1.000000 1.000000
`;

    const result = parseCubeFile(rawCube, 'test_2.cube');
    expect(result.success).toBe(true);
    expect(result.lut).toBeDefined();
    if (result.lut) {
      expect(result.lut.size).toBe(2);
      expect(result.lut.title).toBe('Test 2x2x2 Cube');
      expect(result.lut.data.length).toBe(2 * 2 * 2 * 3); // 24 floats
      expect(result.lut.domainMin).toEqual([0.0, 0.0, 0.0]);
      expect(result.lut.domainMax).toEqual([1.0, 1.0, 1.0]);
    }
  });

  it('rejects files larger than 25MB safeguard', () => {
    const mockBigContent = 'x'.repeat(26 * 1024 * 1024);
    const result = parseCubeFile(mockBigContent, 'huge.cube');
    expect(result.success).toBe(false);
    expect(result.error).toContain('safety limit');
  });

  it('rejects missing or invalid LUT_3D_SIZE', () => {
    const noSize = `
TITLE "Missing Size"
0.0 0.0 0.0
1.0 1.0 1.0
`;
    const resultNoSize = parseCubeFile(noSize, 'no_size.cube');
    expect(resultNoSize.success).toBe(false);
    expect(resultNoSize.error).toContain('LUT_3D_SIZE');

    const invalidSize = `
LUT_3D_SIZE 128
0.0 0.0 0.0
`;
    const resultInvalidSize = parseCubeFile(invalidSize, 'oversized.cube');
    expect(resultInvalidSize.success).toBe(false);
    expect(resultInvalidSize.error).toContain('between 2 and 65');
  });

  it('rejects non-numeric, NaN or corrupted RGB table values', () => {
    const corruptedCube = `
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 NaN 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0
`;
    const result = parseCubeFile(corruptedCube, 'corrupt.cube');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Malformed color value');
  });

  it('rejects incomplete data tables with mismatched line counts', () => {
    const incompleteCube = `
LUT_3D_SIZE 3
0.0 0.0 0.0
1.0 1.0 1.0
`;
    const result = parseCubeFile(incompleteCube, 'incomplete.cube');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Incomplete LUT data');
  });

  it('correctly generates a valid standard .cube file string from a table', () => {
    const size = 2;
    const data = new Float32Array(size * size * size * 3);
    for (let i = 0; i < data.length; i++) {
      data[i] = 0.5;
    }

    const exported = generateCubeString(data, size, 'Exported Grade');
    expect(exported).toContain('TITLE "Exported Grade"');
    expect(exported).toContain('LUT_3D_SIZE 2');
    expect(exported).toContain('0.500000 0.500000 0.500000');
  });

  it('correctly samples RGB values using trilinear interpolation', () => {
    const size = 2;
    // Identity 2x2x2 LUT
    const data = new Float32Array(24);
    for (let b = 0; b < 2; b++) {
      for (let g = 0; g < 2; g++) {
        for (let r = 0; r < 2; r++) {
          const idx = (b * 4 + g * 2 + r) * 3;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
        }
      }
    }

    // Midpoint sample (0.5, 0.5, 0.5) should yield approximately 0.5, 0.5, 0.5
    const sampled = sampleLutTrilinear(data, size, 0.5, 0.5, 0.5);
    expect(sampled[0]).toBeCloseTo(0.5, 1);
    expect(sampled[1]).toBeCloseTo(0.5, 1);
    expect(sampled[2]).toBeCloseTo(0.5, 1);
  });
});
