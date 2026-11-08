// Asynchronous Web Worker & Time-Sliced Non-Blocking .CUBE Parser
// Prevents UI thread stalls when importing large 33x or 65x 3D LUT files.

import type { LutParseResult } from '../types/lut';
import { parseCubeFile } from './cubeParser';

// Dedicated Worker Source code embedded as a Blob worker for seamless bundling
const WORKER_SCRIPT = `
self.onmessage = function(e) {
  var rawContent = e.data.rawContent;
  var fileName = e.data.fileName || 'Imported LUT';

  try {
    if (!rawContent || typeof rawContent !== 'string') {
      self.postMessage({ success: false, error: 'File content is empty or unreadable.' });
      return;
    }

    // 25MB safety safeguard
    if (rawContent.length > 25 * 1024 * 1024) {
      self.postMessage({ success: false, error: 'File size exceeds the 25 MB safety limit.' });
      return;
    }

    var lines = rawContent.split(/\\r?\\n/);
    var title = fileName.replace(/\\.cube$/i, '').trim();
    var lutSize = 0;
    var domainMin = [0.0, 0.0, 0.0];
    var domainMax = [1.0, 1.0, 1.0];
    var dataStartIndex = -1;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      var upper = line.toUpperCase();
      if (upper.startsWith('TITLE')) {
        var match = line.match(/TITLE\\s+["']?([^"']+)["']?/i);
        if (match && match[1]) title = match[1].trim();
        continue;
      }

      if (upper.startsWith('LUT_1D_SIZE')) {
        self.postMessage({ success: false, error: '1D LUT format is not supported.' });
        return;
      }

      if (upper.startsWith('LUT_3D_SIZE')) {
        var parts = line.split(/\\s+/);
        var parsedSize = parseInt(parts[1], 10);
        if (isNaN(parsedSize) || parsedSize < 2 || parsedSize > 65) {
          self.postMessage({ success: false, error: 'Invalid LUT_3D_SIZE: ' + parts[1] + '. Supported dimensions are between 2 and 65.' });
          return;
        }
        lutSize = parsedSize;
        continue;
      }

      if (upper.startsWith('DOMAIN_MIN')) {
        var pMin = line.split(/\\s+/).slice(1).map(Number);
        if (pMin.length === 3 && pMin.every(function(v) { return !isNaN(v) && isFinite(v); })) {
          domainMin = [pMin[0], pMin[1], pMin[2]];
        }
        continue;
      }

      if (upper.startsWith('DOMAIN_MAX')) {
        var pMax = line.split(/\\s+/).slice(1).map(Number);
        if (pMax.length === 3 && pMax.every(function(v) { return !isNaN(v) && isFinite(v); })) {
          domainMax = [pMax[0], pMax[1], pMax[2]];
        }
        continue;
      }

      var firstNum = parseFloat(line.split(/\\s+/)[0]);
      if (!isNaN(firstNum)) {
        dataStartIndex = i;
        break;
      }
    }

    if (lutSize === 0) {
      self.postMessage({ success: false, error: 'Invalid .cube file: Missing LUT_3D_SIZE header.' });
      return;
    }

    if (dataStartIndex === -1) {
      self.postMessage({ success: false, error: 'Invalid .cube file: No RGB color data found.' });
      return;
    }

    var expectedPoints = lutSize * lutSize * lutSize;
    var floatData = new Float32Array(expectedPoints * 3);
    var parsedPoints = 0;
    var rangeR = domainMax[0] - domainMin[0] || 1.0;
    var rangeG = domainMax[1] - domainMin[1] || 1.0;
    var rangeB = domainMax[2] - domainMin[2] || 1.0;

    for (var j = dataStartIndex; j < lines.length; j++) {
      var row = lines[j].trim();
      if (!row || row.startsWith('#')) continue;

      var vals = row.split(/\\s+/);
      if (vals.length < 3) continue;

      var r = parseFloat(vals[0]);
      var g = parseFloat(vals[1]);
      var b = parseFloat(vals[2]);

      if (isNaN(r) || isNaN(g) || isNaN(b) || !isFinite(r) || !isFinite(g) || !isFinite(b)) {
        self.postMessage({ success: false, error: 'Malformed color value on line ' + (j + 1) });
        return;
      }

      var normR = Math.max(0.0, Math.min(1.0, (r - domainMin[0]) / rangeR));
      var normG = Math.max(0.0, Math.min(1.0, (g - domainMin[1]) / rangeG));
      var normB = Math.max(0.0, Math.min(1.0, (b - domainMin[2]) / rangeB));

      if (parsedPoints < expectedPoints) {
        var idx = parsedPoints * 3;
        floatData[idx] = normR;
        floatData[idx + 1] = normG;
        floatData[idx + 2] = normB;
        parsedPoints++;
      }
    }

    if (parsedPoints !== expectedPoints) {
      self.postMessage({
        success: false,
        error: 'Incomplete LUT data: Expected ' + expectedPoints + ' points, but found ' + parsedPoints + '.'
      });
      return;
    }

    var shadowIdx = 0;
    var midIdx = Math.floor(expectedPoints / 2) * 3;
    var highlightIdx = (expectedPoints - 1) * 3;

    function toRgb(idx) {
      return 'rgb(' + Math.round(floatData[idx] * 255) + ',' + Math.round(floatData[idx + 1] * 255) + ',' + Math.round(floatData[idx + 2] * 255) + ')';
    }

    var gradient = 'linear-gradient(135deg, ' + toRgb(shadowIdx) + ' 0%, ' + toRgb(midIdx) + ' 50%, ' + toRgb(highlightIdx) + ' 100%)';
    var lutId = 'lut_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Send result back with Transferable Float32Array
    self.postMessage({
      success: true,
      lut: {
        id: lutId,
        name: title,
        title: title,
        category: 'imported',
        size: lutSize,
        domainMin: domainMin,
        domainMax: domainMax,
        data: floatData,
        rawCube: rawContent,
        thumbnailGradient: gradient,
        isFavorite: false,
        isImported: true,
        importDate: Date.now(),
        fileSize: rawContent.length,
      },
      details: {
        size: lutSize,
        title: title,
        pointCount: parsedPoints,
        fileSize: rawContent.length,
      }
    }, [floatData.buffer]);
  } catch (err) {
    self.postMessage({ success: false, error: err.message || 'Worker parsing error' });
  }
};
`;

let workerBlobUrl: string | null = null;

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  try {
    if (!workerBlobUrl) {
      const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
      workerBlobUrl = URL.createObjectURL(blob);
    }
    return new Worker(workerBlobUrl);
  } catch {
    return null;
  }
}

/**
 * Asynchronously parses a .cube file on a background worker thread.
 * If workers are unavailable, falls back gracefully to non-blocking microtask execution.
 */
export async function parseCubeFileAsync(
  rawContent: string,
  fileName: string = 'Imported LUT'
): Promise<LutParseResult> {
  const worker = getWorker();

  if (worker) {
    return new Promise((resolve) => {
      const cleanup = () => {
        worker.terminate();
      };

      worker.onmessage = (e) => {
        cleanup();
        const data = e.data;
        if (data.success && data.lut && !(data.lut.data instanceof Float32Array)) {
          // Re-wrap buffer if transfer reconstructed array
          data.lut.data = new Float32Array(data.lut.data);
        }
        resolve(data);
      };

      worker.onerror = (err) => {
        cleanup();
        console.warn('Worker error during LUT parsing, falling back to synchronous:', err);
        resolve(parseCubeFile(rawContent, fileName));
      };

      worker.postMessage({ rawContent, fileName });
    });
  }

  // Fallback: asynchronous microtask
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(parseCubeFile(rawContent, fileName));
    }, 0);
  });
}
