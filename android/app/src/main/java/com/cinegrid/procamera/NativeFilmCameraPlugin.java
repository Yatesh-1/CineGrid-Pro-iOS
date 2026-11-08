package com.cinegrid.procamera;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.opengl.EGL14;
import android.opengl.EGLConfig;
import android.opengl.EGLContext;
import android.opengl.EGLDisplay;
import android.opengl.EGLSurface;
import android.opengl.GLES11Ext;
import android.opengl.GLES20;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Range;
import android.util.Size;
import android.view.Surface;
import android.view.TextureView;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Native live film preview: Camera2 -> SurfaceTexture (external OES texture) -> OpenGL ES 2 film shader ->
 * SurfaceView behind the transparent WebView. Camera frames never touch the CPU or the JS bridge.
 *
 * The fragment shader is generated from the web shader (scripts/gen-native-shader.mjs), so the web stills and this
 * preview share one implementation of the film look. The camera profile is the same JSON the web side stores.
 *
 * Everything reported by getStats() is measured here (frame counters and nanoTime), nothing is estimated.
 */
@CapacitorPlugin(name = "NativeFilmCamera")
public class NativeFilmCameraPlugin extends Plugin {
    private static final String TAG = "NativeFilm";

    // A TextureView (not a SurfaceView): it is composited as a normal view, so it shows through the transparent
    // WebView above it. A SurfaceView sits behind the whole window and stayed hidden behind the window background.
    private TextureView previewView;
    private Session session;
    private android.graphics.drawable.Drawable savedWebViewBackground;
    private boolean webViewBackgroundSaved;

    // ---------------------------------------------------------------------------------------------------------
    // Plugin API
    // ---------------------------------------------------------------------------------------------------------

    /** start({ facing: 'back'|'front', x, y, width, height (CSS px of the preview area), profile }) */
    @PluginMethod
    public void start(final PluginCall call) {
        if (session != null) {
            call.reject("Native film camera is already running.");
            return;
        }
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Camera permission has not been granted.");
            return;
        }
        final float density = getContext().getResources().getDisplayMetrics().density;
        final int x = Math.round(call.getFloat("x", 0f) * density);
        final int y = Math.round(call.getFloat("y", 0f) * density);
        final int w = Math.round(call.getFloat("width", 0f) * density);
        final int h = Math.round(call.getFloat("height", 0f) * density);
        if (w <= 0 || h <= 0) {
            call.reject("Preview area has no size.");
            return;
        }
        final boolean front = "front".equals(call.getString("facing", "back"));
        final JSObject profile = call.getObject("profile");

        getActivity().runOnUiThread(() -> {
            try {
                final WebView webView = getBridge().getWebView();
                final ViewGroup parent = (ViewGroup) webView.getParent();
                if (parent == null) {
                    call.reject("The web view is not attached to a window yet.");
                    return;
                }
                previewView = new TextureView(getContext());
                CoordinatorLayout.LayoutParams lp = new CoordinatorLayout.LayoutParams(w, h);
                lp.leftMargin = x;
                lp.topMargin = y;
                parent.addView(previewView, 0, lp); // index 0 = behind the WebView
                // The WebView must draw nothing of its own over the preview. setBackgroundColor alone left a theme-supplied
                // background drawable in place (measured: the preview was hidden behind it), so clear that too.
                if (!webViewBackgroundSaved) {
                    savedWebViewBackground = webView.getBackground();
                    webViewBackgroundSaved = true;
                }
                webView.setBackgroundColor(Color.TRANSPARENT);
                webView.setBackground(null);

                previewView.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
                    @Override public void onSurfaceTextureAvailable(SurfaceTexture texture, int width, int height) {
                        Session s = new Session(getContext(), new Surface(texture), front, profile, call);
                        s.setSurfaceSize(width, height);
                        session = s;
                        s.start();
                    }
                    @Override public void onSurfaceTextureSizeChanged(SurfaceTexture texture, int width, int height) {
                        if (session != null) session.setSurfaceSize(width, height);
                    }
                    @Override public boolean onSurfaceTextureDestroyed(SurfaceTexture texture) {
                        stopSession();
                        return true;
                    }
                    @Override public void onSurfaceTextureUpdated(SurfaceTexture texture) { }
                });
            } catch (Exception e) {
                call.reject("Could not create the native preview surface: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopSession();
        call.resolve();
    }

    /** setProfile({ profile }) - applies on the next frame. */
    @PluginMethod
    public void setProfile(PluginCall call) {
        if (session == null) {
            call.reject("Native film camera is not running.");
            return;
        }
        session.setProfile(call.getObject("profile"));
        call.resolve();
    }

    @PluginMethod
    public void getStats(PluginCall call) {
        if (session == null) {
            JSObject o = new JSObject();
            o.put("state", "stopped");
            call.resolve(o);
            return;
        }
        call.resolve(session.stats());
    }

    @Override
    protected void handleOnPause() {
        // The camera must be released when the app leaves the foreground; the web layer re-starts it on resume.
        if (session != null) {
            stopSession();
            notifyListeners("interrupted", new JSObject());
        }
        super.handleOnPause();
    }

    private void stopSession() {
        final Session s = session;
        session = null;
        if (s != null) s.stop();
        getActivity().runOnUiThread(() -> {
            if (previewView != null) {
                ViewGroup parent = (ViewGroup) previewView.getParent();
                if (parent != null) parent.removeView(previewView);
                previewView = null;
            }
            WebView webView = getBridge().getWebView();
            if (webView != null && webViewBackgroundSaved) {
                webView.setBackground(savedWebViewBackground);
                webViewBackgroundSaved = false;
            }
        });
    }

    // ---------------------------------------------------------------------------------------------------------
    // Profile uniforms (parsed once per setProfile, uploaded every frame)
    // ---------------------------------------------------------------------------------------------------------

    private static final class ProfileData {
        float[] mat = {1, 0, 0, 0, 1, 0, 0, 0, 1}; // column-major for GLSL
        float[] color = new float[4];
        float[] tone = {0, 0, 1, 0};
        float[] grain = {0, 1, 0.5f, 0};
        float grainShadow = 0.5f;
        float[] hal = {0, 0.5f, 0.8f, 0};
        float[] halColor = {1, 0.35f, 0.15f};
        float[] bloom = {0, 0.5f, 0.75f};
        float[] vig = {0, 0.5f, 0.5f};
        float[] optics = new float[3];
        float[] leak = {0, 25f / 360f, 0.85f};
        float[] flash = {0, 0.5f};
        float[] border = {0, 0};
        boolean active;

        static ProfileData from(JSONObject p) {
            ProfileData d = new ProfileData();
            if (p == null) return d;
            try {
                JSONObject color = p.optJSONObject("color");
                if (color != null) {
                    JSONArray m = color.optJSONArray("matrix");
                    if (m != null && m.length() == 9) {
                        double[] r = new double[9];
                        for (int i = 0; i < 9; i++) r[i] = m.optDouble(i, i % 4 == 0 ? 1 : 0);
                        d.mat = new float[]{(float) r[0], (float) r[3], (float) r[6], (float) r[1], (float) r[4], (float) r[7], (float) r[2], (float) r[5], (float) r[8]};
                    }
                    d.color = new float[]{f(color, "saturation", 0), f(color, "contrast", 0), f(color, "temperature", 0), f(color, "tint", 0)};
                }
                JSONObject tone = p.optJSONObject("tone");
                if (tone != null) d.tone = new float[]{f(tone, "blackPoint", 0), f(tone, "shadowLift", 0), f(tone, "midGamma", 1), f(tone, "highlightRolloff", 0)};
                JSONObject grain = p.optJSONObject("grain");
                if (grain != null) {
                    d.grain = new float[]{f(grain, "amount", 0), f(grain, "size", 1), f(grain, "roughness", 0.5f), f(grain, "chroma", 0)};
                    d.grainShadow = f(grain, "shadowBias", 0.5f);
                }
                JSONObject hal = p.optJSONObject("halation");
                if (hal != null) {
                    d.hal = new float[]{f(hal, "amount", 0), f(hal, "radius", 0.5f), f(hal, "threshold", 0.8f), 0};
                    JSONArray c = hal.optJSONArray("color");
                    if (c != null && c.length() == 3) d.halColor = new float[]{(float) c.optDouble(0, 1), (float) c.optDouble(1, 0.35), (float) c.optDouble(2, 0.15)};
                }
                JSONObject bloom = p.optJSONObject("bloom");
                if (bloom != null) d.bloom = new float[]{f(bloom, "amount", 0), f(bloom, "radius", 0.5f), f(bloom, "threshold", 0.75f)};
                JSONObject vig = p.optJSONObject("vignette");
                if (vig != null) d.vig = new float[]{f(vig, "amount", 0), f(vig, "roundness", 0.5f), f(vig, "softness", 0.5f)};
                d.optics = new float[]{(float) p.optDouble("softness", 0), (float) p.optDouble("chromaticAberration", 0), (float) p.optDouble("dust", 0)};
                JSONObject leak = p.optJSONObject("lightLeak");
                if (leak != null) d.leak = new float[]{f(leak, "amount", 0), f(leak, "hue", 25) / 360f, f(leak, "position", 0.85f)};
                JSONObject flash = p.optJSONObject("flash");
                if (flash != null) d.flash = new float[]{f(flash, "amount", 0), f(flash, "falloff", 0.5f)};
                JSONObject border = p.optJSONObject("border");
                if (border != null) {
                    String style = border.optString("style", "none");
                    d.border = new float[]{"film".equals(style) ? 1 : "instant".equals(style) ? 2 : 0, f(border, "width", 0)};
                }
                d.active = true;
            } catch (Exception ignored) {
                // A malformed profile must never break the camera: fall back to an unprocessed feed.
                return new ProfileData();
            }
            return d;
        }

        private static float f(JSONObject o, String k, float def) {
            return (float) o.optDouble(k, def);
        }
    }

    // ---------------------------------------------------------------------------------------------------------
    // Camera + GL session
    // ---------------------------------------------------------------------------------------------------------

    private static final class Session {
        private final Context context;
        private final Surface outSurface;
        private final boolean front;
        private PluginCall startCall;

        private final HandlerThread glThread = new HandlerThread("film-gl");
        private final HandlerThread camThread = new HandlerThread("film-cam");
        private Handler glHandler;
        private Handler camHandler;

        private EGLDisplay eglDisplay = EGL14.EGL_NO_DISPLAY;
        private EGLContext eglContext = EGL14.EGL_NO_CONTEXT;
        private EGLSurface eglSurface = EGL14.EGL_NO_SURFACE;
        private int program;      // pass 2: film shader, reads an ordinary RGBA texture
        private int program1;     // pass 1: copies the camera's external (YUV) texture once
        private int loc1Image;
        private int loc1StMat;
        private int fbo;
        private int fboTex;
        private int fboW;
        private int fboH;
        private int oesTex;
        private SurfaceTexture st;
        private Surface camSurface;
        private final float[] stMatrix = new float[16];
        private final float[] stMat3 = new float[9];
        private FloatBuffer quad;

        private CameraDevice camera;
        private CameraCaptureSession capture;
        private String cameraId;
        private Size previewSize = new Size(1440, 1080);
        private int sensorOrientation = 90;
        private volatile String state = "starting";
        private volatile String error = "";

        private volatile ProfileData profile = new ProfileData();
        private volatile int surfW = 0;
        private volatile int surfH = 0;
        private final AtomicInteger pending = new AtomicInteger();
        private volatile boolean running = true;

        // measured stats
        private final Object statsLock = new Object();
        private long framesRendered = 0;
        private long cameraFrames = 0;
        private long windowStartNs = 0;
        private int windowFrames = 0;
        private int windowCamFrames = 0;
        private double fpsRender = 0;
        private double fpsCamera = 0;
        private double sumRenderMs = 0;
        private double maxRenderMs = 0;
        private int renderSamples = 0;
        private double lastAvgRenderMs = 0;
        private double lastMaxRenderMs = 0;
        private long lastCamTimestampNs = 0;
        private long droppedCameraFrames = 0;
        private final String[] uniformNames = {"u_film", "u_res", "u_seed", "u_fMat", "u_fColor", "u_fTone", "u_fGrain", "u_fGrainShadow", "u_fHal", "u_fHalColor", "u_fBloom", "u_fVig", "u_fOptics", "u_fLeak", "u_fFlash", "u_fBorder", "u_hasDate", "u_dateRect", "u_dateColor", "u_dateTex", "u_frame", "u_image"};
        private final int[] uniformLoc = new int[uniformNames.length];
        private int frameCounter = 0;

        Session(Context context, Surface outSurface, boolean front, JSObject profileJson, PluginCall call) {
            this.context = context;
            this.outSurface = outSurface;
            this.front = front;
            this.startCall = call;
            this.profile = ProfileData.from(profileJson);
        }

        void setProfile(JSObject p) {
            profile = ProfileData.from(p);
        }

        void setSurfaceSize(int w, int h) {
            surfW = w;
            surfH = h;
        }

        void start() {
            glThread.start();
            camThread.start();
            glHandler = new Handler(glThread.getLooper());
            camHandler = new Handler(camThread.getLooper());
            glHandler.post(() -> {
                try {
                    initGl();
                    camHandler.post(this::openCamera);
                } catch (Throwable t) {
                    fail("GL init failed: " + t.getMessage());
                }
            });
        }

        void stop() {
            running = false;
            state = "stopped";
            if (glHandler == null) return;
            // Close the camera first so no more frames arrive, then tear GL down on its own thread.
            camHandler.post(() -> {
                try { if (capture != null) capture.close(); } catch (Exception ignored) { }
                try { if (camera != null) camera.close(); } catch (Exception ignored) { }
                capture = null;
                camera = null;
            });
            glHandler.post(() -> {
                releaseGl();
                glThread.quitSafely();
            });
            camHandler.post(camThread::quitSafely);
        }

        JSObject stats() {
            JSObject o = new JSObject();
            o.put("state", state);
            if (!error.isEmpty()) o.put("error", error);
            o.put("previewBuffer", previewSize.getWidth() + "x" + previewSize.getHeight());
            o.put("surface", surfW + "x" + surfH);
            o.put("sensorOrientation", sensorOrientation);
            synchronized (statsLock) {
                o.put("renderFps", Math.round(fpsRender * 10) / 10.0);
                o.put("cameraFps", Math.round(fpsCamera * 10) / 10.0);
                o.put("avgRenderMs", Math.round(lastAvgRenderMs * 100) / 100.0);
                o.put("maxRenderMs", Math.round(lastMaxRenderMs * 100) / 100.0);
                o.put("framesRendered", framesRendered);
                o.put("cameraFrames", cameraFrames);
                o.put("droppedCameraFrames", droppedCameraFrames);
            }
            return o;
        }

        private void fail(String message) {
            state = "error";
            error = message;
            android.util.Log.e(TAG, message);
            PluginCall c = startCall;
            startCall = null;
            if (c != null) c.reject(message);
        }

        // ---- GL ----------------------------------------------------------------------------------------------

        private void initGl() throws Exception {
            eglDisplay = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY);
            int[] ver = new int[2];
            if (!EGL14.eglInitialize(eglDisplay, ver, 0, ver, 1)) throw new IllegalStateException("eglInitialize failed");
            int[] attribs = {EGL14.EGL_RED_SIZE, 8, EGL14.EGL_GREEN_SIZE, 8, EGL14.EGL_BLUE_SIZE, 8, EGL14.EGL_ALPHA_SIZE, 8,
                EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT, EGL14.EGL_NONE};
            EGLConfig[] configs = new EGLConfig[1];
            int[] num = new int[1];
            EGL14.eglChooseConfig(eglDisplay, attribs, 0, configs, 0, 1, num, 0);
            if (num[0] == 0) throw new IllegalStateException("no EGL config");
            int[] ctxAttribs = {EGL14.EGL_CONTEXT_CLIENT_VERSION, 2, EGL14.EGL_NONE};
            eglContext = EGL14.eglCreateContext(eglDisplay, configs[0], EGL14.EGL_NO_CONTEXT, ctxAttribs, 0);
            eglSurface = EGL14.eglCreateWindowSurface(eglDisplay, configs[0], outSurface, new int[]{EGL14.EGL_NONE}, 0);
            if (!EGL14.eglMakeCurrent(eglDisplay, eglSurface, eglSurface, eglContext)) throw new IllegalStateException("eglMakeCurrent failed");
            EGL14.eglSwapInterval(eglDisplay, 0); // never block the renderer on vsync: it paces itself on camera frames

            String vs = "attribute vec2 a_pos;\nvarying vec2 v_texCoord;\nvoid main(){gl_Position=vec4(a_pos,0.0,1.0);v_texCoord=vec2(a_pos.x*0.5+0.5,0.5-a_pos.y*0.5);}\n";
            String fs = readAsset("film_fragment.glsl");
            int vsId = compile(GLES20.GL_VERTEX_SHADER, vs);
            String copyFs = "#extension GL_OES_EGL_image_external : require\nprecision mediump float;\nuniform samplerExternalOES u_image;\nuniform mat3 u_stMat;\nvarying vec2 v_texCoord;\nvoid main(){ vec3 p = u_stMat * vec3(v_texCoord.x, 1.0 - v_texCoord.y, 1.0); gl_FragColor = vec4(texture2D(u_image, p.xy).rgb, 1.0); }\n";
            program1 = link(vsId, compile(GLES20.GL_FRAGMENT_SHADER, copyFs));
            loc1Image = GLES20.glGetUniformLocation(program1, "u_image");
            loc1StMat = GLES20.glGetUniformLocation(program1, "u_stMat");
            program = link(vsId, compile(GLES20.GL_FRAGMENT_SHADER, fs));
            GLES20.glUseProgram(program);
            for (int i = 0; i < uniformNames.length; i++) uniformLoc[i] = GLES20.glGetUniformLocation(program, uniformNames[i]);

            float[] verts = {-1, -1, 1, -1, -1, 1, 1, 1};
            quad = ByteBuffer.allocateDirect(verts.length * 4).order(ByteOrder.nativeOrder()).asFloatBuffer();
            quad.put(verts).position(0);
            GLES20.glEnableVertexAttribArray(0);
            GLES20.glVertexAttribPointer(0, 2, GLES20.GL_FLOAT, false, 0, quad);

            int[] tex = new int[1];
            GLES20.glGenTextures(1, tex, 0);
            oesTex = tex[0];
            GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, oesTex);
            GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR);
            GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR);
            GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE);
            GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE);
            st = new SurfaceTexture(oesTex);
        }

        private String readAsset(String name) throws Exception {
            try (InputStream in = context.getAssets().open(name)) {
                byte[] b = new byte[in.available()];
                int n = 0;
                while (n < b.length) {
                    int r = in.read(b, n, b.length - n);
                    if (r < 0) break;
                    n += r;
                }
                return new String(b, 0, n, StandardCharsets.UTF_8);
            }
        }

        private int compile(int type, String src) {
            int s = GLES20.glCreateShader(type);
            GLES20.glShaderSource(s, src);
            GLES20.glCompileShader(s);
            int[] ok = new int[1];
            GLES20.glGetShaderiv(s, GLES20.GL_COMPILE_STATUS, ok, 0);
            if (ok[0] == 0) throw new IllegalStateException("shader compile: " + GLES20.glGetShaderInfoLog(s));
            return s;
        }

        private int link(int vs, int fs) {
            int p = GLES20.glCreateProgram();
            GLES20.glAttachShader(p, vs);
            GLES20.glAttachShader(p, fs);
            GLES20.glBindAttribLocation(p, 0, "a_pos");
            GLES20.glLinkProgram(p);
            int[] ok = new int[1];
            GLES20.glGetProgramiv(p, GLES20.GL_LINK_STATUS, ok, 0);
            if (ok[0] == 0) throw new IllegalStateException("program link: " + GLES20.glGetProgramInfoLog(p));
            return p;
        }

        private void releaseGl() {
            try { if (st != null) st.release(); } catch (Exception ignored) { }
            if (eglDisplay != EGL14.EGL_NO_DISPLAY) {
                EGL14.eglMakeCurrent(eglDisplay, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT);
                if (eglSurface != EGL14.EGL_NO_SURFACE) EGL14.eglDestroySurface(eglDisplay, eglSurface);
                if (eglContext != EGL14.EGL_NO_CONTEXT) EGL14.eglDestroyContext(eglDisplay, eglContext);
                EGL14.eglTerminate(eglDisplay);
            }
            eglDisplay = EGL14.EGL_NO_DISPLAY;
        }

        // ---- Camera ------------------------------------------------------------------------------------------

        private void openCamera() {
            try {
                CameraManager cm = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
                String id = null;
                CameraCharacteristics cc = null;
                for (String cid : cm.getCameraIdList()) {
                    CameraCharacteristics c = cm.getCameraCharacteristics(cid);
                    Integer facing = c.get(CameraCharacteristics.LENS_FACING);
                    if (facing != null && facing == (front ? CameraCharacteristics.LENS_FACING_FRONT : CameraCharacteristics.LENS_FACING_BACK)) {
                        id = cid;
                        cc = c;
                        break;
                    }
                }
                if (id == null) {
                    fail("No " + (front ? "front" : "back") + " camera found.");
                    return;
                }
                cameraId = id;
                Integer so = cc.get(CameraCharacteristics.SENSOR_ORIENTATION);
                sensorOrientation = so == null ? 90 : so;
                StreamConfigurationMap map = cc.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
                previewSize = pickPreviewSize(map.getOutputSizes(SurfaceTexture.class));
                final Range<Integer> fps = pickFps(cc.get(CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES));
                final CameraCharacteristics ccf = cc;

                glHandler.post(() -> {
                    st.setDefaultBufferSize(previewSize.getWidth(), previewSize.getHeight());
                    camSurface = new Surface(st);
                    st.setOnFrameAvailableListener(t -> {
                        pending.incrementAndGet();
                        synchronized (statsLock) {
                            cameraFrames++;
                            windowCamFrames++;
                            long ts = t.getTimestamp();
                            // A gap of more than 1.5 frame intervals at 30 fps means the camera delivered fewer frames than asked.
                            if (lastCamTimestampNs != 0 && ts - lastCamTimestampNs > 50_000_000L) droppedCameraFrames++;
                            lastCamTimestampNs = ts;
                        }
                        glHandler.post(Session.this::renderFrame);
                    }, glHandler);
                    camHandler.post(() -> openDevice(cm, ccf, fps));
                });
            } catch (Exception e) {
                fail("Camera setup failed: " + e.getMessage());
            }
        }

        private void openDevice(CameraManager cm, CameraCharacteristics cc, Range<Integer> fps) {
            try {
                cm.openCamera(cameraId, new CameraDevice.StateCallback() {
                    @Override public void onOpened(CameraDevice device) {
                        camera = device;
                        try {
                            device.createCaptureSession(Collections.singletonList(camSurface), new CameraCaptureSession.StateCallback() {
                                @Override public void onConfigured(CameraCaptureSession s) {
                                    capture = s;
                                    try {
                                        CaptureRequest.Builder b = device.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
                                        b.addTarget(camSurface);
                                        b.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
                                        b.set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON);
                                        if (fps != null) b.set(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, fps);
                                        s.setRepeatingRequest(b.build(), null, camHandler);
                                        state = "active";
                                        PluginCall c = startCall;
                                        startCall = null;
                                        if (c != null) {
                                            JSObject o = stats();
                                            o.put("fpsRange", fps == null ? "default" : fps.getLower() + "-" + fps.getUpper());
                                            c.resolve(o);
                                        }
                                    } catch (CameraAccessException e) {
                                        fail("Preview request failed: " + e.getMessage());
                                    }
                                }
                                @Override public void onConfigureFailed(CameraCaptureSession s) { fail("Camera session configuration failed."); }
                            }, camHandler);
                        } catch (CameraAccessException e) {
                            fail("Could not create the camera session: " + e.getMessage());
                        }
                    }
                    @Override public void onDisconnected(CameraDevice device) {
                        state = "disconnected";
                        device.close();
                    }
                    @Override public void onError(CameraDevice device, int err) {
                        device.close();
                        fail("Camera error " + err + " (it may be in use by another app).");
                    }
                }, camHandler);
            } catch (SecurityException | CameraAccessException e) {
                fail("Could not open the camera: " + e.getMessage());
            }
        }

        /** Largest 4:3 size up to 1920x1440; falls back to the largest size up to 1920x1080. */
        private static Size pickPreviewSize(Size[] sizes) {
            Size best = null;
            for (Size s : sizes) {
                if (s.getWidth() * 3 == s.getHeight() * 4 && s.getWidth() <= 1920 && s.getHeight() <= 1440) {
                    if (best == null || s.getWidth() * s.getHeight() > best.getWidth() * best.getHeight()) best = s;
                }
            }
            if (best != null) return best;
            for (Size s : sizes) {
                if (s.getWidth() <= 1920 && s.getHeight() <= 1080) {
                    if (best == null || s.getWidth() * s.getHeight() > best.getWidth() * best.getHeight()) best = s;
                }
            }
            return best != null ? best : sizes[0];
        }

        /** Prefer a 30 fps ceiling with a low floor (so low light can lengthen exposure without halving the rate). */
        private static Range<Integer> pickFps(Range<Integer>[] ranges) {
            if (ranges == null || ranges.length == 0) return null;
            Range<Integer> best = null;
            for (Range<Integer> r : ranges) {
                if (r.getUpper() > 30) continue;
                if (best == null || r.getUpper() > best.getUpper() || (r.getUpper().equals(best.getUpper()) && r.getLower() < best.getLower() && r.getLower() >= 15)) best = r;
            }
            return best != null ? best : ranges[0];
        }

        // ---- Render ------------------------------------------------------------------------------------------

        private void renderFrame() {
            if (!running || st == null || eglSurface == EGL14.EGL_NO_SURFACE) return;
            // Frames that queued up while the renderer was busy are skipped: only the newest one is drawn.
            if (pending.getAndSet(0) == 0) return;
            long t0 = System.nanoTime();
            try {
                st.updateTexImage();
            } catch (Exception e) {
                return;
            }
            st.getTransformMatrix(stMatrix);
            int w = surfW > 0 ? surfW : 720;
            int h = surfH > 0 ? surfH : 960;
            float[] stm = computeStMat();
            if (profile.active) {
                // Pass 1: camera frame -> ordinary RGBA texture, once. Pass 2: film shader reads that cheap texture.
                ensureFbo(w, h);
                GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, fbo);
                GLES20.glViewport(0, 0, w, h);
                drawCopy(stm);
                GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, 0);
                GLES20.glViewport(0, 0, w, h);
                GLES20.glUseProgram(program);
                GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
                GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, fboTex);
                setUniforms();
                GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4);
            } else {
                GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, 0);
                GLES20.glViewport(0, 0, w, h);
                drawCopy(stm); // unprocessed feed: a single pass straight to the screen
            }
            EGL14.eglSwapBuffers(eglDisplay, eglSurface);
            long t1 = System.nanoTime();
            recordFrame((t1 - t0) / 1e6, t1);
        }

        private void setUniforms() {
            ProfileData p = profile;
            int[] L = uniformLoc;
            GLES20.glUniform1f(L[0], p.active ? 1f : 0f); // u_film
            // upright image size (the camera buffer is landscape; upright swaps it)
            GLES20.glUniform2f(L[1], previewSize.getHeight(), previewSize.getWidth());
            frameCounter = (frameCounter + 1) % 24;
            GLES20.glUniform1f(L[2], frameCounter * 1.7f);
            GLES20.glUniformMatrix3fv(L[3], 1, false, p.mat, 0);
            GLES20.glUniform4fv(L[4], 1, p.color, 0);
            GLES20.glUniform4fv(L[5], 1, p.tone, 0);
            GLES20.glUniform4fv(L[6], 1, p.grain, 0);
            GLES20.glUniform1f(L[7], p.grainShadow);
            GLES20.glUniform4fv(L[8], 1, p.hal, 0);
            GLES20.glUniform3fv(L[9], 1, p.halColor, 0);
            GLES20.glUniform3fv(L[10], 1, p.bloom, 0);
            GLES20.glUniform3fv(L[11], 1, p.vig, 0);
            GLES20.glUniform3fv(L[12], 1, p.optics, 0);
            GLES20.glUniform3fv(L[13], 1, p.leak, 0);
            GLES20.glUniform2fv(L[14], 1, p.flash, 0);
            GLES20.glUniform2fv(L[15], 1, p.border, 0);
            GLES20.glUniform1f(L[16], 0f); // date imprint is not drawn by the spike
            GLES20.glUniform4f(L[17], 0, 0, 1, 1);
            GLES20.glUniform3f(L[18], 1, 1, 1);
            GLES20.glUniform4f(L[20], 0, 0, 1, 1); // u_frame: whole image (the surface already has the frame's aspect)
            GLES20.glUniform1i(L[21], 0);

        }

        /** upright image uv (y up) -> camera buffer uv:  SurfaceTexture transform * sensor rotation * selfie mirror. */
        private float[] computeStMat() {
            // upright uv (y up) -> camera buffer uv:  M = SurfaceTexture transform * rotation * mirror
            float[] mirror = front ? new float[]{-1, 0, 1, 0, 1, 0, 0, 0, 1} : new float[]{1, 0, 0, 0, 1, 0, 0, 0, 1};
            float[] rot;
            switch (sensorOrientation) {
                case 90: rot = new float[]{0, 1, 0, -1, 0, 1, 0, 0, 1}; break;
                case 180: rot = new float[]{-1, 0, 1, 0, -1, 1, 0, 0, 1}; break;
                case 270: rot = new float[]{0, -1, 1, 1, 0, 0, 0, 0, 1}; break;
                default: rot = new float[]{1, 0, 0, 0, 1, 0, 0, 0, 1};
            }
            float[] stAffine = {stMatrix[0], stMatrix[4], stMatrix[12], stMatrix[1], stMatrix[5], stMatrix[13], 0, 0, 1};
            float[] m = mul(stAffine, mul(rot, mirror)); // row-major
            // GLSL mat3 is column-major
            stMat3[0] = m[0]; stMat3[1] = m[3]; stMat3[2] = m[6];
            stMat3[3] = m[1]; stMat3[4] = m[4]; stMat3[5] = m[7];
            stMat3[6] = m[2]; stMat3[7] = m[5]; stMat3[8] = m[8];
            return stMat3;
        }

        private void drawCopy(float[] stm) {
            GLES20.glUseProgram(program1);
            GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
            GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, oesTex);
            GLES20.glUniform1i(loc1Image, 0);
            GLES20.glUniformMatrix3fv(loc1StMat, 1, false, stm, 0);
            GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4);
        }

        private void ensureFbo(int w, int h) {
            if (fboTex != 0 && fboW == w && fboH == h) return;
            if (fboTex != 0) {
                GLES20.glDeleteTextures(1, new int[]{fboTex}, 0);
                GLES20.glDeleteFramebuffers(1, new int[]{fbo}, 0);
            }
            int[] t = new int[1];
            GLES20.glGenTextures(1, t, 0);
            fboTex = t[0];
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, fboTex);
            GLES20.glTexImage2D(GLES20.GL_TEXTURE_2D, 0, GLES20.GL_RGBA, w, h, 0, GLES20.GL_RGBA, GLES20.GL_UNSIGNED_BYTE, null);
            GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR);
            GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR);
            GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE);
            GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE);
            int[] f = new int[1];
            GLES20.glGenFramebuffers(1, f, 0);
            fbo = f[0];
            GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, fbo);
            GLES20.glFramebufferTexture2D(GLES20.GL_FRAMEBUFFER, GLES20.GL_COLOR_ATTACHMENT0, GLES20.GL_TEXTURE_2D, fboTex, 0);
            if (GLES20.glCheckFramebufferStatus(GLES20.GL_FRAMEBUFFER) != GLES20.GL_FRAMEBUFFER_COMPLETE) {
                fail("Intermediate framebuffer is incomplete.");
            }
            fboW = w;
            fboH = h;
        }

        private static float[] mul(float[] a, float[] b) {
            float[] r = new float[9];
            for (int i = 0; i < 3; i++)
                for (int j = 0; j < 3; j++)
                    r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
            return r;
        }

        private void recordFrame(double ms, long nowNs) {
            synchronized (statsLock) {
                framesRendered++;
                windowFrames++;
                sumRenderMs += ms;
                maxRenderMs = Math.max(maxRenderMs, ms);
                renderSamples++;
                if (windowStartNs == 0) windowStartNs = nowNs;
                long span = nowNs - windowStartNs;
                if (span >= 1_000_000_000L) {
                    fpsRender = windowFrames * 1e9 / span;
                    fpsCamera = windowCamFrames * 1e9 / span;
                    lastAvgRenderMs = sumRenderMs / renderSamples;
                    lastMaxRenderMs = maxRenderMs;
                    android.util.Log.i(TAG, String.format(java.util.Locale.US,
                        "render %.1f fps | camera %.1f fps | submit avg %.2f ms max %.2f ms | cameraDrops %d | buffer %dx%d surface %dx%d",
                        fpsRender, fpsCamera, lastAvgRenderMs, lastMaxRenderMs, droppedCameraFrames,
                        previewSize.getWidth(), previewSize.getHeight(), surfW, surfH));
                    windowStartNs = nowNs;
                    windowFrames = 0;
                    windowCamFrames = 0;
                    sumRenderMs = 0;
                    maxRenderMs = 0;
                    renderSamples = 0;
                }
            }
        }
    }
}
