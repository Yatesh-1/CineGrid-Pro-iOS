import { describe, it, expect } from 'vitest';
import { parseCubeFileAsync } from '../../utils/cubeParserAsync';

describe('Asynchronous .CUBE Parser Tests', () => {
  it('parses valid 3D .cube file asynchronously without blocking UI', async () => {
    const rawCube = `
TITLE "Async Test Grade"
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0
`;

    const result = await parseCubeFileAsync(rawCube, 'Async_Test.cube');
    expect(result.success).toBe(true);
    expect(result.lut).toBeDefined();
    expect(result.lut?.name).toBe('Async Test Grade');
    expect(result.lut?.size).toBe(2);
    expect(result.lut?.data.length).toBe(24);
  });

  it('rejects corrupted cube files in async worker path gracefully', async () => {
    const corruptedCube = `
LUT_3D_SIZE 2
0.0 0.0 0.0
NaN 1.0 0.0
`;
    const result = await parseCubeFileAsync(corruptedCube, 'bad.cube');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
