import type { LutDefinition, LookState, ColorAdjustments } from '../types/lut';
import { resampleLut, maxLutSizeFor } from './lutResample';

const VS_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

// The LUT atlas is size*size texels wide (1089 for a 33-point cube). mediump (fp16) cannot address
// that precisely and shifts colours on phone GPUs, so use highp whenever the device offers it.
export const FS_PRECISION_HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

const FS_SOURCE = `${FS_PRECISION_HEADER}
uniform sampler2D u_image;
uniform sampler2D u_lut;
uniform float u_hasLut;
uniform float u_lutSize;
uniform float u_lutIntensity;

// Color adjustments
uniform float u_exposure;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_temperature;
uniform float u_tint;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_fade;

// Split comparison
uniform float u_compareActive;
uniform float u_compareSplit;

varying vec2 v_texCoord;

vec4 sample3DLut(sampler2D lut, vec3 color, float size) {
  float maxIdx = size - 1.0;
  float b = color.b * maxIdx;
  float b0 = floor(b);
  float b1 = min(maxIdx, b0 + 1.0);
  float bFrac = b - b0;

  // Exact texel coordinate mapping into 2D (size*size x size) atlas
  float u0 = (b0 * size + color.r * maxIdx + 0.5) / (size * size);
  float u1 = (b1 * size + color.r * maxIdx + 0.5) / (size * size);
  float v = (color.g * maxIdx + 0.5) / size;

  vec4 col0 = texture2D(lut, vec2(u0, v));
  vec4 col1 = texture2D(lut, vec2(u1, v));
  return mix(col0, col1, bFrac);
}

void main() {
  vec4 origColor = texture2D(u_image, v_texCoord);

  // If Before/After split is active and pixel is to the left of split, show original
  if (u_compareActive > 0.5 && v_texCoord.x < u_compareSplit) {
    gl_FragColor = origColor;
    return;
  }

  vec3 rgb = origColor.rgb;

  // 1. 3D LUT Transformation
  if (u_hasLut > 0.5) {
    vec4 graded = sample3DLut(u_lut, clamp(rgb, 0.0, 1.0), u_lutSize);
    rgb = mix(rgb, graded.rgb, u_lutIntensity);
  }

  // 2. Exposure (power of 2)
  if (u_exposure != 0.0) {
    rgb = rgb * pow(2.0, u_exposure);
  }

  // 3. Contrast (pivot around 0.5)
  if (u_contrast != 0.0) {
    float cFactor = (u_contrast + 100.0) / 100.0;
    rgb = (rgb - 0.5) * cFactor + 0.5;
  }

  // 4. White Balance (Temperature & Tint)
  if (u_temperature != 0.0 || u_tint != 0.0) {
    float t = u_temperature / 100.0;
    float m = u_tint / 100.0;
    rgb.r += t * 0.15;
    rgb.b -= t * 0.15;
    rgb.g -= m * 0.1;
  }

  // 5. Highlights and Shadows
  if (u_highlights != 0.0 || u_shadows != 0.0) {
    float lum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    float hWeight = smoothstep(0.5, 1.0, lum);
    float sWeight = 1.0 - smoothstep(0.0, 0.5, lum);
    rgb += hWeight * (u_highlights / 100.0) * 0.2;
    rgb += sWeight * (u_shadows / 100.0) * 0.2;
  }

  // 6. Saturation
  if (u_saturation != 0.0) {
    float lum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    float sFactor = (u_saturation + 100.0) / 100.0;
    rgb = mix(vec3(lum), rgb, sFactor);
  }

  // 7. Fade (lift shadows)
  if (u_fade > 0.0) {
    float f = (u_fade / 100.0) * 0.15;
    rgb = rgb * (1.0 - f) + vec3(f);
  }

  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), origColor.a);
}
`;

export class WebGLLutPipeline {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private posBuffer: WebGLBuffer | null = null;
  private texBuffer: WebGLBuffer | null = null;
  private imageTexture: WebGLTexture | null = null;
  private lastTexWidth = 0;
  private lastTexHeight = 0;
  private lutTexturesCache: Map<string, { texture: WebGLTexture; size: number }> = new Map();
  private maxCachedLuts: number = 6;
  private isContextLost = false;

  // Uniform locations
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initGL();
    this.attachContextLossListeners();
  }

  private initGL() {
    try {
      this.gl = this.canvas.getContext('webgl', {
        preserveDrawingBuffer: true,
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
      });

      if (!this.gl) {
        console.warn('WebGL not available for 3D LUT pipeline, using fallback.');
        return;
      }

      this.setupShaders();
      this.setupBuffers();
    } catch (err) {
      console.warn('Failed to initialize WebGL LUT pipeline:', err);
      this.gl = null;
    }
  }

  private attachContextLossListeners() {
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.isContextLost = true;
      this.lutTexturesCache.clear();
      this.imageTexture = null;
    });

    this.canvas.addEventListener('webglcontextrestored', () => {
      this.isContextLost = false;
      this.initGL();
    });
  }

  private setupShaders() {
    if (!this.gl) return;
    const gl = this.gl;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VS_SOURCE);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, FS_SOURCE);
    gl.compileShader(fs);

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Shader link error:', gl.getProgramInfoLog(prog));
      return;
    }

    this.vs = vs;
    this.fs = fs;
    this.program = prog;
    gl.useProgram(prog);

    // Cache uniform locations
    const uniformNames = [
      'u_image',
      'u_lut',
      'u_hasLut',
      'u_lutSize',
      'u_lutIntensity',
      'u_exposure',
      'u_contrast',
      'u_saturation',
      'u_temperature',
      'u_tint',
      'u_highlights',
      'u_shadows',
      'u_fade',
      'u_compareActive',
      'u_compareSplit',
    ];

    this.uniforms = {};
    for (const name of uniformNames) {
      this.uniforms[name] = gl.getUniformLocation(prog, name);
    }
  }

  private setupBuffers() {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    // Fullscreen quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      0, 0,
      1, 1,
      1, 0,
    ]);

    const posBuffer = gl.createBuffer();
    this.posBuffer = posBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const texBuffer = gl.createBuffer();
    this.texBuffer = texBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const aTex = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);

    // Image texture on Unit 0
    this.imageTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  /**
   * Uploads 3D LUT Float32Array into a 2D atlas texture of size (N*N x N)
   */
  public uploadLutTexture(lut: LutDefinition): WebGLTexture | null {
    if (!this.gl) return null;
    const gl = this.gl;

    if (this.lutTexturesCache.has(lut.id)) {
      return this.lutTexturesCache.get(lut.id)!.texture;
    }

    // Prune cache if exceeded budget
    if (this.lutTexturesCache.size >= this.maxCachedLuts) {
      const oldestKey = this.lutTexturesCache.keys().next().value;
      if (oldestKey) {
        const item = this.lutTexturesCache.get(oldestKey);
        if (item) gl.deleteTexture(item.texture);
        this.lutTexturesCache.delete(oldestKey);
      }
    }

    // The strip is size*size pixels wide; a bigger LUT than the GPU allows would be an unusable (black) texture.
    // Reduce it to the largest size that fits instead.
    const maxTex = (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) || 2048;
    const size = Math.min(lut.size, maxLutSizeFor(maxTex));
    const data = size < lut.size ? resampleLut(lut.data, lut.size, size) : lut.data;
    const atlasWidth = size * size;
    const atlasHeight = size;

    // Convert Float32Array [0..1] to Uint8Array [0..255] for standard RGBA texture
    const pixelBytes = new Uint8Array(atlasWidth * atlasHeight * 4);

    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          const lutIdx = (b * size * size + g * size + r) * 3;
          const atlasX = b * size + r;
          const atlasY = g;
          const pixelIdx = (atlasY * atlasWidth + atlasX) * 4;

          pixelBytes[pixelIdx] = Math.round(data[lutIdx] * 255);
          pixelBytes[pixelIdx + 1] = Math.round(data[lutIdx + 1] * 255);
          pixelBytes[pixelIdx + 2] = Math.round(data[lutIdx + 2] * 255);
          pixelBytes[pixelIdx + 3] = 255;
        }
      }
    }

    const texture = gl.createTexture();
    if (!texture) return null;

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      atlasWidth,
      atlasHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixelBytes
    );

    this.lutTexturesCache.set(lut.id, { texture, size });
    return texture;
  }

  /**
   * Renders the source image or video element with active LUT and Color Adjustments
   */
  public renderFrame(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    lookState: LookState,
    lut?: LutDefinition | null
  ): boolean {
    if (this.isContextLost || !this.gl || !this.program) {
      return this.renderFallback2D(source, lookState);
    }

    const gl = this.gl;
    const width = (source as HTMLVideoElement).videoWidth || (source as HTMLImageElement).naturalWidth || (source as HTMLCanvasElement).width || 1280;
    const height = (source as HTMLVideoElement).videoHeight || (source as HTMLImageElement).naturalHeight || (source as HTMLCanvasElement).height || 720;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      gl.viewport(0, 0, width, height);
    }

    gl.useProgram(this.program);

    // 1. Upload Video or Image frame to Texture Unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    try {
      if (this.lastTexWidth === width && this.lastTexHeight === height) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        this.lastTexWidth = width;
        this.lastTexHeight = height;
      }
    } catch {
      return this.renderFallback2D(source, lookState);
    }
    gl.uniform1i(this.uniforms.u_image, 0);

    // 2. Upload and bind 3D LUT texture to Texture Unit 1
    if (lut && lookState.lutIntensity > 0) {
      const lutTexture = this.uploadLutTexture(lut);
      if (lutTexture) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, lutTexture);
        gl.uniform1i(this.uniforms.u_lut, 1);
        gl.uniform1f(this.uniforms.u_hasLut, 1.0);
        gl.uniform1f(this.uniforms.u_lutSize, this.lutTexturesCache.get(lut.id)?.size ?? lut.size);
        gl.uniform1f(this.uniforms.u_lutIntensity, lookState.lutIntensity / 100);      } else {
        gl.uniform1f(this.uniforms.u_hasLut, 0.0);
      }
    } else {
      gl.uniform1f(this.uniforms.u_hasLut, 0.0);
    }

    // 3. Set Color Adjustment uniforms
    const adj: ColorAdjustments = lookState.adjustments;
    gl.uniform1f(this.uniforms.u_exposure, adj.exposure);
    gl.uniform1f(this.uniforms.u_contrast, adj.contrast);
    gl.uniform1f(this.uniforms.u_saturation, adj.saturation);
    gl.uniform1f(this.uniforms.u_temperature, adj.temperature);
    gl.uniform1f(this.uniforms.u_tint, adj.tint);
    gl.uniform1f(this.uniforms.u_highlights, adj.highlights);
    gl.uniform1f(this.uniforms.u_shadows, adj.shadows);
    gl.uniform1f(this.uniforms.u_fade, adj.fade);

    // 4. Comparison mode
    // Before/after comparison belongs to the post-capture editor; the live preview is never split.
    gl.uniform1f(this.uniforms.u_compareActive, 0.0);
    gl.uniform1f(this.uniforms.u_compareSplit, lookState.compareSplitPosition / 100);

    // Draw full-screen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return true;
  }

  /**
   * Safe fallback for devices where WebGL is disabled or crashed
   */
  private renderFallback2D(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    lookState: LookState
  ): boolean {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return false;

    const width = (source as HTMLVideoElement).videoWidth || (source as HTMLImageElement).naturalWidth || (source as HTMLCanvasElement).width || 1280;
    const height = (source as HTMLVideoElement).videoHeight || (source as HTMLImageElement).naturalHeight || (source as HTMLCanvasElement).height || 720;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    const adj = lookState.adjustments;
    const b = 100 + adj.exposure * 25;
    const c = 100 + adj.contrast;
    const s = 100 + adj.saturation;

    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
    ctx.drawImage(source, 0, 0, width, height);
    ctx.filter = 'none';
    return true;
  }

  public dispose() {
    if (!this.gl) return;
    const gl = this.gl;

    for (const item of this.lutTexturesCache.values()) {
      gl.deleteTexture(item.texture);
    }
    this.lutTexturesCache.clear();

    if (this.imageTexture) {
      gl.deleteTexture(this.imageTexture);
      this.imageTexture = null;
    }

    if (this.posBuffer) {
      gl.deleteBuffer(this.posBuffer);
      this.posBuffer = null;
    }

    if (this.texBuffer) {
      gl.deleteBuffer(this.texBuffer);
      this.texBuffer = null;
    }

    if (this.vs) {
      gl.deleteShader(this.vs);
      this.vs = null;
    }

    if (this.fs) {
      gl.deleteShader(this.fs);
      this.fs = null;
    }

    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}
