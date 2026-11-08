import type { LutDefinition, LookState, ColorAdjustments } from '../types/lut';
import { resampleLut, maxLutSizeFor } from './lutResample';
import { type CameraProfile, formatDateImprint, isNeutralProfile } from './cameraProfile';

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

// Virtual camera film stage (see utils/cameraProfile.ts; the maths here mirrors its CPU reference)
uniform float u_film;
uniform vec2 u_res;
uniform float u_seed;
uniform mat3 u_fMat;
uniform vec4 u_fColor;   // saturation, contrast, temperature, tint
uniform vec4 u_fTone;    // blackPoint, shadowLift, midGamma, highlightRolloff
uniform vec4 u_fGrain;   // amount, size, roughness, chroma
uniform float u_fGrainShadow;
uniform vec4 u_fHal;     // amount, radius, threshold, unused
uniform vec3 u_fHalColor;
uniform vec3 u_fBloom;   // amount, radius, threshold
uniform vec3 u_fVig;     // amount, roundness, softness
uniform vec3 u_fOptics;  // softness, chromaticAberration, dust
uniform vec3 u_fLeak;    // amount, hue(0..1), position
uniform vec2 u_fFlash;   // amount, falloff
uniform vec2 u_fBorder;  // style (0 none,1 film,2 instant), width
uniform float u_hasDate;
uniform vec4 u_dateRect; // x, y, w, h in FRAME uv (y=0 is frame top)
uniform vec4 u_frame;    // visible frame inside the image: x0, y0, w, h in uv (the crop that is shown and saved)
uniform vec3 u_dateColor;
uniform sampler2D u_dateTex;

varying vec2 v_texCoord;

float fHash(vec2 p, float s) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + s * 37.719) * 43758.5453);
}

vec3 hue2rgb(float h) {
  return clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
}

float luma709(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

float toneCh(float x) {
  float y = max(0.0, (x - u_fTone.x) / (1.0 - u_fTone.x));
  y = pow(y, u_fTone.z);
  if (u_fTone.w > 0.0) {
    float knee = 1.0 - 0.6 * u_fTone.w;
    if (y > knee) {
      // Over-range values are clipped first: the polynomial is only valid for u <= 1.
      float u = min(1.0, (y - knee) / (1.0 - knee));
      y = knee + (1.0 - knee) * (u + u_fTone.w * u * u * (1.0 - u));
    }
  }
  return u_fTone.y + y * (1.0 - u_fTone.y);
}

// Sampling stage: chromatic aberration, lens softness, halation and bloom glow.
vec3 filmBase(vec2 uv) {
  vec2 c = uv - 0.5;
  // Radii are defined at 1080 px image height so a 4K still looks like the preview, only sharper.
  float rs = u_res.y / 1080.0;
  vec2 texel = rs / u_res;
  // Radial R/B channel shift, strongest at the corners.
  vec2 ca = c * (u_fOptics.y * 0.012);
  vec3 col = vec3(
    texture2D(u_image, uv + ca).r,
    texture2D(u_image, uv).g,
    texture2D(u_image, uv - ca).b);

  // Lens softness: mix toward a 8-tap blur.
  if (u_fOptics.x > 0.0) {
    float r = (1.0 + u_fOptics.x * 4.0);
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398;
      acc += texture2D(u_image, uv + vec2(cos(a), sin(a)) * texel * r).rgb;
    }
    col = mix(col, acc / 8.0, u_fOptics.x);
  }

  // Glow: two rings of taps, thresholded. Halation is tinted and wider; bloom is neutral.
  if (u_fHal.x > 0.0 || u_fBloom.x > 0.0) {
    float hr = 6.0 + u_fHal.y * 40.0;
    float br = 4.0 + u_fBloom.y * 30.0;
    vec3 hAcc = vec3(0.0);
    vec3 bAcc = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 0.5236;
      vec2 d = vec2(cos(a), sin(a)) * texel;
      hAcc += max(texture2D(u_image, uv + d * hr).rgb - u_fHal.z, 0.0);
      bAcc += max(texture2D(u_image, uv + d * br * 0.6).rgb - u_fBloom.z, 0.0);
    }
    col += (hAcc / 12.0) * u_fHalColor * (u_fHal.x * 3.0);
    col += (bAcc / 12.0) * (u_fBloom.x * 3.0);
  }
  return col;
}

// Colour stage: matrix, temperature/tint, saturation, contrast, tone curve.
vec3 filmColor(vec3 rgb) {
  rgb = u_fMat * rgb;
  rgb.r *= 1.0 + u_fColor.z * 0.12;
  rgb.b *= 1.0 - u_fColor.z * 0.12;
  rgb.g *= 1.0 - u_fColor.w * 0.08;
  float l = luma709(rgb);
  rgb = mix(vec3(l), rgb, 1.0 + u_fColor.x);
  rgb = (rgb - 0.5) * (1.0 + u_fColor.y) + 0.5;
  rgb = clamp(rgb, 0.0, 1.5);
  return vec3(toneCh(rgb.r), toneCh(rgb.g), toneCh(rgb.b));
}

// Finishing stage: vignette, flash, light leak, grain/noise, dust, border, date imprint.
vec3 filmFinish(vec3 rgb, vec2 uv) {
  // Vignette, flash, leak, border and date belong to the FRAME the user sees and saves, not to the sensor image,
  // otherwise a 4:3 crop of a 9:16 sensor frame would cut them off.
  vec2 fuv = (uv - u_frame.xy) / u_frame.zw;
  float aspect = (u_res.x * u_frame.z) / (u_res.y * u_frame.w);
  vec2 q = (fuv - 0.5) * 2.0;
  q.x *= 1.0 + (aspect - 1.0) * u_fVig.y;
  float d = length(q) / 1.41421356;

  if (u_fVig.x > 0.0) {
    float inner = 0.3 * (1.0 - u_fVig.z * 0.5);
    float t = clamp((d - inner) / (1.05 - inner), 0.0, 1.0);
    rgb *= 1.0 - u_fVig.x * (t * t * (3.0 - 2.0 * t));
  }
  if (u_fFlash.x > 0.0) {
    float boost = u_fFlash.x * 0.55 * (1.0 - smoothstep(0.0, 0.5 + 0.5 * u_fFlash.y, d));
    rgb *= 1.0 + boost;
    rgb *= 1.0 - u_fFlash.x * 0.25 * smoothstep(0.3, 1.0, d);
  }
  if (u_fLeak.x > 0.0) {
    vec2 lc = vec2(u_fLeak.z, 0.5);
    float ld = length((fuv - lc) * vec2(1.0, 0.6));
    float leak = exp(-ld * ld * 9.0) * (0.65 + 0.35 * sin(fuv.y * 7.0 + u_fLeak.y * 20.0));
    vec3 lcol = hue2rgb(u_fLeak.y);
    rgb = 1.0 - (1.0 - rgb) * (1.0 - leak * u_fLeak.x * lcol);
  }
  if (u_fGrain.x > 0.0) {
    float cellPx = max(1.0, u_fGrain.y * (u_res.y / 1080.0));
    vec2 cell = floor(uv * u_res / cellPx);
    float h1 = fHash(cell, u_seed);
    float h2 = fHash(cell + 17.3, u_seed + 3.1);
    float nl = mix((h1 + h2) * 0.5, h1, u_fGrain.z) - 0.5;
    vec3 nc = vec3(h1, fHash(cell + 5.7, u_seed + 1.3), fHash(cell + 9.1, u_seed + 2.2)) - 0.5;
    vec3 n = mix(vec3(nl), nc, u_fGrain.w);
    float lum = luma709(rgb);
    float amp = u_fGrain.x * 0.5 * mix(1.0, 0.25 + 1.5 * (1.0 - lum), u_fGrainShadow);
    rgb += n * amp;
  }
  if (u_fOptics.z > 0.0) {
    float dcell = 6.0 * (u_res.y / 1080.0);
    vec2 dc = floor(uv * u_res / dcell);
    float dh = fHash(dc, 91.0);
    vec2 inCell = fract(uv * u_res / dcell) - 0.5;
    float speck = step(1.0 - 0.012 * u_fOptics.z, dh) * (1.0 - smoothstep(0.1, 0.45, length(inCell)));
    float sx = fHash(vec2(floor(uv.x * u_res.x / (3.0 * (u_res.y / 1080.0))), 7.0), 55.0);
    float scratch = step(1.0 - 0.0025 * u_fOptics.z, sx) * 0.35;
    rgb = mix(rgb, vec3(0.92), clamp(speck * 0.8 + scratch, 0.0, 1.0));
  }
  if (u_hasDate > 0.5) {
    vec2 dp = (fuv - u_dateRect.xy) / u_dateRect.zw;
    if (dp.x >= 0.0 && dp.x <= 1.0 && dp.y >= 0.0 && dp.y <= 1.0) {
      float a = texture2D(u_dateTex, dp).a;
      rgb = mix(rgb, u_dateColor, a);
    }
  }
  if (u_fBorder.x > 0.5) {
    float w = u_fBorder.y;
    float bx = w * (u_res.y * u_frame.w) / (u_res.x * u_frame.z);
    float bottom = u_fBorder.x > 1.5 ? w * 3.0 : w;
    bool inside = fuv.x > bx && fuv.x < 1.0 - bx && fuv.y > w && fuv.y < 1.0 - bottom;
    if (!inside) rgb = u_fBorder.x > 1.5 ? vec3(0.96, 0.95, 0.91) : vec3(0.04);
  }
  return rgb;
}

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
  if (u_film > 0.5) {
    rgb = filmColor(filmBase(v_texCoord));
  }

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

  if (u_film > 0.5) {
    rgb = filmFinish(rgb, v_texCoord);
  }

  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), origColor.a);
}
`;

/** Visible frame inside an image (uv). Mirrors the crop in captureFrameToDataUrl: centred aspect crop, then 1/zoom. */
export function frameRect(
  imageAspect: number,
  ratio: number | null,
  zoom: number
): { x: number; y: number; w: number; h: number } {
  let w = 1;
  let h = 1;
  if (ratio) {
    if (imageAspect > ratio) w = ratio / imageAspect;
    else h = imageAspect / ratio;
  }
  w /= zoom;
  h /= zoom;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

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
  private filmProfile: CameraProfile | null = null;
  private dateTexture: WebGLTexture | null = null;
  private dateKey = '';
  private dateAspect = 1;
  private frameCounter = 0;
  private gpuTimerExt: unknown = null;
  private frameRatio: number | null = null;
  private frameZoom = 1;

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
      this.gpuTimerExt = this.gl.getExtension('EXT_disjoint_timer_query');
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
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compile error:', gl.getShaderInfoLog(fs));
    }

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
      'u_film', 'u_res', 'u_seed', 'u_fMat', 'u_fColor', 'u_fTone', 'u_fGrain', 'u_fGrainShadow',
      'u_fHal', 'u_fHalColor', 'u_fBloom', 'u_fVig', 'u_fOptics', 'u_fLeak', 'u_fFlash', 'u_fBorder',
      'u_hasDate', 'u_dateRect', 'u_dateColor', 'u_dateTex', 'u_frame',
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

  /** Sets (or clears with null) the virtual camera rendered by the film stage. Cheap; applied on the next frame. */
  public setFilmProfile(profile: CameraProfile | null): void {
    this.filmProfile = profile && !isNeutralProfile(profile) ? profile : null;
  }

  /**
   * Tells the film stage which part of the image is actually shown and saved (aspect crop plus digital zoom), so
   * border, date imprint, vignette and light leak sit on the visible frame. Same rule as captureFrameToDataUrl.
   * ratio = frame width / height (null = whole image).
   */
  public setFrame(ratio: number | null, zoom: number = 1): void {
    this.frameRatio = ratio && Number.isFinite(ratio) && ratio > 0 ? ratio : null;
    this.frameZoom = zoom >= 1 && Number.isFinite(zoom) ? zoom : 1;
  }

  /** Whether the GPU can report real execution time (EXT_disjoint_timer_query). Reported, not used for fake numbers. */
  public get gpuTimerAvailable(): boolean {
    return Boolean(this.gpuTimerExt);
  }

  public get contextStatus(): 'ok' | 'lost' | 'none' {
    if (!this.gl) return 'none';
    return this.isContextLost ? 'lost' : 'ok';
  }

  /** True when the film stage can really run (WebGL program linked), so the UI never claims a fake effect. */
  public get filmSupported(): boolean {
    return Boolean(this.gl && this.program && !this.isContextLost);
  }

  private uploadDateTexture(
    text: string,
    width: number,
    height: number,
    pos: 'bottomRight' | 'bottomLeft'
  ): [number, number, number, number] | null {
    const gl = this.gl;
    if (!gl || typeof document === 'undefined') return null;
    if (text !== this.dateKey || !this.dateTexture) {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 64;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.font = 'bold 52px "Courier New", monospace';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      const textW = Math.min(c.width - 8, ctx.measureText(text).width);
      ctx.fillText(text, 4, c.height / 2 + 2);
      // Fraction of the texture's width that actually holds text.
      this.dateAspect = (textW + 8) / c.height;
      if (!this.dateTexture) this.dateTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.dateTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      this.dateKey = text;
    }
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.dateTexture);
    // The rect covers the whole 512x64 texture: its height is 3.2% of the image, width follows the 8:1 texture.
    const hUv = 0.032;
    const wUv = (hUv * height * (512 / 64)) / width;
    const margin = 0.035;
    // Right-aligned text sits at the right end of the texture area only if we shift by the unused part.
    const usedUv = (hUv * height * this.dateAspect) / width;
    const x = pos === 'bottomLeft' ? margin : 1 - margin - usedUv;
    return [x, 1 - margin - hUv, wUv, hUv];
  }

  private applyFilmUniforms(width: number, height: number): void {
    const gl = this.gl;
    if (!gl) return;
    const u = this.uniforms;
    const p = this.filmProfile;
    if (!p) {
      gl.uniform1f(u.u_film, 0.0);
      gl.uniform1f(u.u_hasDate, 0.0);
      return;
    }
    gl.uniform1f(u.u_film, 1.0);
    gl.uniform2f(u.u_res, width, height);
    const frame = frameRect(width / height, this.frameRatio, this.frameZoom);
    gl.uniform4f(u.u_frame, frame.x, frame.y, frame.w, frame.h);
    this.frameCounter = (this.frameCounter + 1) % 24;
    gl.uniform1f(u.u_seed, this.frameCounter * 1.7);
    const m = p.color.matrix; // row-major -> column-major (WebGL1 requires transpose=false)
    gl.uniformMatrix3fv(u.u_fMat, false, new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]));
    gl.uniform4f(u.u_fColor, p.color.saturation, p.color.contrast, p.color.temperature, p.color.tint);
    gl.uniform4f(u.u_fTone, p.tone.blackPoint, p.tone.shadowLift, p.tone.midGamma, p.tone.highlightRolloff);
    gl.uniform4f(u.u_fGrain, p.grain.amount, p.grain.size, p.grain.roughness, p.grain.chroma);
    gl.uniform1f(u.u_fGrainShadow, p.grain.shadowBias);
    gl.uniform4f(u.u_fHal, p.halation.amount, p.halation.radius, p.halation.threshold, 0);
    gl.uniform3f(u.u_fHalColor, p.halation.color[0], p.halation.color[1], p.halation.color[2]);
    gl.uniform3f(u.u_fBloom, p.bloom.amount, p.bloom.radius, p.bloom.threshold);
    gl.uniform3f(u.u_fVig, p.vignette.amount, p.vignette.roundness, p.vignette.softness);
    gl.uniform3f(u.u_fOptics, p.softness, p.chromaticAberration, p.dust);
    gl.uniform3f(u.u_fLeak, p.lightLeak.amount, p.lightLeak.hue / 360, p.lightLeak.position);
    gl.uniform2f(u.u_fFlash, p.flash.amount, p.flash.falloff);
    gl.uniform2f(
      u.u_fBorder,
      p.border.style === 'film' ? 1 : p.border.style === 'instant' ? 2 : 0,
      p.border.width
    );

    let hasDate = 0.0;
    if (p.dateImprint.enabled) {
      const rect = this.uploadDateTexture(
        formatDateImprint(new Date(), p.dateImprint.format),
        width * frame.w,
        height * frame.h,
        p.dateImprint.position
      );
      if (rect) {
        hasDate = 1.0;
        gl.uniform1i(u.u_dateTex, 2);
        gl.uniform4f(u.u_dateRect, rect[0], rect[1], rect[2], rect[3]);
        gl.uniform3f(u.u_dateColor, p.dateImprint.color[0], p.dateImprint.color[1], p.dateImprint.color[2]);
      }
    }
    gl.uniform1f(u.u_hasDate, hasDate);
  }

  /**
   * Renders the source image or video element with active LUT and Color Adjustments
   */
  public renderFrame(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    lookState: LookState,
    lut?: LutDefinition | null,
    /** Optional cap on the longest output side (still capture). Live preview leaves this undefined. */
    maxSide?: number
  ): boolean {
    if (this.isContextLost || !this.gl || !this.program) {
      return this.renderFallback2D(source, lookState);
    }

    const gl = this.gl;
    const srcW = (source as HTMLVideoElement).videoWidth || (source as HTMLImageElement).naturalWidth || (source as HTMLCanvasElement).width || 1280;
    const srcH = (source as HTMLVideoElement).videoHeight || (source as HTMLImageElement).naturalHeight || (source as HTMLCanvasElement).height || 720;
    const cap = maxSide && Math.max(srcW, srcH) > maxSide ? maxSide / Math.max(srcW, srcH) : 1;
    const width = Math.round(srcW * cap);
    const height = Math.round(srcH * cap);

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
      if (this.lastTexWidth === srcW && this.lastTexHeight === srcH) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        this.lastTexWidth = srcW;
        this.lastTexHeight = srcH;
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

    // 5. Virtual camera film stage (u_film = 0 when no profile is set)
    this.applyFilmUniforms(width, height);

    // Draw full-screen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return true;
  }

  /**
   * Safe fallback for devices where WebGL is disabled or crashed
   */
  private renderFallback2D(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap,
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
    if (this.dateTexture) {
      gl.deleteTexture(this.dateTexture);
      this.dateTexture = null;
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

    // Free the GPU context now: a still render uses a throwaway pipeline per photo, and browsers cap live contexts.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
  }
}
