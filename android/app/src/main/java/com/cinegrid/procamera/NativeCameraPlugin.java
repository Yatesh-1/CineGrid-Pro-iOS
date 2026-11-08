package com.cinegrid.procamera;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ImageFormat;
import android.graphics.Matrix;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.CaptureResult;
import android.hardware.camera2.DngCreator;
import android.hardware.camera2.TotalCaptureResult;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.ExifInterface;
import android.media.Image;
import android.media.ImageReader;
import android.media.MediaCodecInfo;
import android.media.MediaCodecList;
import android.media.MediaRecorder;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.HandlerThread;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.util.Range;
import android.util.Size;
import android.view.Surface;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Native Camera2 capture for things the WebView camera cannot do:
 *  - real capability report (hardware level, RAW, manual sensor, burst, video limits)
 *  - RAW (DNG) + JPEG capture
 *  - multi-frame night stacking (aligned average) and multi-frame HDR (bracketed exposure fusion)
 *
 * The WebView holds the camera while the live preview runs, so the JS side must release the web camera
 * before calling these methods and re-open it afterwards.
 */
@CapacitorPlugin(name = "NativeCamera")
public class NativeCameraPlugin extends Plugin {
    private static final String TAG = "NativeCamera";
    private static final String ALBUM = "CineGrid Pro";
    /** Stacking and HDR run at up to ~8 MP so several frames fit in memory on a 4 GB phone. */
    private static final long STACK_MAX_AREA = 8_500_000L;
    private static final int ALIGN_SCALE = 8;
    private static final int ALIGN_RANGE = 12;

    // ------------------------------------------------------------------------------------------------
    // Capabilities
    // ------------------------------------------------------------------------------------------------

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        try {
            CameraManager manager = manager();
            JSArray cams = new JSArray();
            for (String id : manager.getCameraIdList()) {
                CameraCharacteristics ch = manager.getCameraCharacteristics(id);
                JSObject o = new JSObject();
                o.put("id", id);
                Integer facing = ch.get(CameraCharacteristics.LENS_FACING);
                o.put("facing", facing == null ? "unknown"
                        : facing == CameraCharacteristics.LENS_FACING_FRONT ? "front"
                        : facing == CameraCharacteristics.LENS_FACING_BACK ? "back" : "external");
                o.put("hardwareLevel", levelName(ch.get(CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL)));
                int[] caps = ch.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES);
                o.put("raw", has(caps, CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_RAW));
                o.put("manualSensor", has(caps, CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_MANUAL_SENSOR));
                o.put("burstCapture", has(caps, CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_BURST_CAPTURE));
                o.put("backwardCompatible", has(caps, CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_BACKWARD_COMPATIBLE));
                Integer sensorOrientation = ch.get(CameraCharacteristics.SENSOR_ORIENTATION);
                o.put("sensorOrientation", sensorOrientation == null ? 0 : sensorOrientation);
                // Optics as reported by the camera HAL. Anything the HAL leaves out is simply not put here.
                float[] focals = ch.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS);
                android.util.SizeF sensorMm = ch.get(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE);
                if (focals != null && focals.length > 0 && focals[0] > 0) {
                    o.put("focalLengthMm", focals[0]);
                    if (sensorMm != null && sensorMm.getWidth() > 0 && sensorMm.getHeight() > 0) {
                        o.put("sensorWidthMm", sensorMm.getWidth());
                        o.put("sensorHeightMm", sensorMm.getHeight());
                        double diag = Math.hypot(sensorMm.getWidth(), sensorMm.getHeight());
                        // 35 mm full-frame diagonal is 43.27 mm
                        o.put("equivalentMm", Math.round(focals[0] * 43.2666 / diag));
                    }
                }
                float[] apertures = ch.get(CameraCharacteristics.LENS_INFO_AVAILABLE_APERTURES);
                if (apertures != null && apertures.length > 0 && apertures[0] > 0) o.put("aperture", apertures[0]);
                int[] oisModes = ch.get(CameraCharacteristics.LENS_INFO_AVAILABLE_OPTICAL_STABILIZATION);
                o.put("ois", has(oisModes, CameraCharacteristics.LENS_OPTICAL_STABILIZATION_MODE_ON));
                int[] eisModes = ch.get(CameraCharacteristics.CONTROL_AVAILABLE_VIDEO_STABILIZATION_MODES);
                o.put("eis", has(eisModes, CameraCharacteristics.CONTROL_VIDEO_STABILIZATION_MODE_ON));
                Boolean flash = ch.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                o.put("hasFlash", flash != null && flash);
                float[] focusMin = new float[] { ch.get(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE) == null ? 0f : ch.get(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE) };
                o.put("autofocus", focusMin[0] > 0);
                Range<Integer> iso = ch.get(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE);
                if (iso != null) {
                    o.put("isoMin", iso.getLower());
                    o.put("isoMax", iso.getUpper());
                }
                Range<Long> exp = ch.get(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE);
                if (exp != null) {
                    o.put("exposureMinNs", exp.getLower());
                    o.put("exposureMaxNs", exp.getUpper());
                }
                Float zoom = ch.get(CameraCharacteristics.SCALER_AVAILABLE_MAX_DIGITAL_ZOOM);
                o.put("maxDigitalZoom", zoom == null ? 1.0 : zoom);
                StreamConfigurationMap map = ch.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
                if (map != null) {
                    Size jpeg = largest(map.getOutputSizes(ImageFormat.JPEG), Long.MAX_VALUE);
                    if (jpeg != null) {
                        o.put("jpegWidth", jpeg.getWidth());
                        o.put("jpegHeight", jpeg.getHeight());
                    }
                    // Every JPEG size this app is actually offered (some phones hide the biggest from third-party apps)
                    Size[] allJpeg = map.getOutputSizes(ImageFormat.JPEG);
                    JSArray jpegSizes = new JSArray();
                    if (allJpeg != null) {
                        List<Size> sortedJpeg = new ArrayList<>();
                        for (Size s : allJpeg) sortedJpeg.add(s);
                        sortedJpeg.sort((a, b) -> Long.compare((long) b.getWidth() * b.getHeight(), (long) a.getWidth() * a.getHeight()));
                        for (int i = 0; i < Math.min(8, sortedJpeg.size()); i++) {
                            jpegSizes.put(sortedJpeg.get(i).getWidth() + "x" + sortedJpeg.get(i).getHeight());
                        }
                    }
                    o.put("jpegSizes", jpegSizes);
                    Size raw = largest(map.getOutputSizes(ImageFormat.RAW_SENSOR), Long.MAX_VALUE);
                    if (raw != null) {
                        o.put("rawWidth", raw.getWidth());
                        o.put("rawHeight", raw.getHeight());
                    }
                    Size[] vsizes = map.getOutputSizes(MediaRecorder.class);
                    JSArray video = new JSArray();
                    if (vsizes != null) {
                        List<Size> sorted = new ArrayList<>();
                        for (Size s : vsizes) sorted.add(s);
                        sorted.sort((a, b) -> Long.compare((long) b.getWidth() * b.getHeight(), (long) a.getWidth() * a.getHeight()));
                        for (int i = 0; i < Math.min(4, sorted.size()); i++) {
                            Size s = sorted.get(i);
                            long minDur = map.getOutputMinFrameDuration(MediaRecorder.class, s);
                            JSObject v = new JSObject();
                            v.put("width", s.getWidth());
                            v.put("height", s.getHeight());
                            v.put("maxFps", minDur > 0 ? Math.round(1_000_000_000.0 / minDur) : 0);
                            video.put(v);
                        }
                    }
                    o.put("videoSizes", video);
                    int maxHighSpeed = 0;
                    Size[] hs = map.getHighSpeedVideoSizes();
                    if (hs != null) {
                        for (Size s : hs) {
                            for (Range<Integer> r : map.getHighSpeedVideoFpsRangesFor(s)) {
                                maxHighSpeed = Math.max(maxHighSpeed, r.getUpper());
                            }
                        }
                    }
                    o.put("highSpeedMaxFps", maxHighSpeed);
                }
                Range<Integer>[] fps = ch.get(CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES);
                int maxFps = 0;
                if (fps != null) for (Range<Integer> r : fps) maxFps = Math.max(maxFps, r.getUpper());
                o.put("maxPreviewFps", maxFps);
                cams.put(o);
            }
            JSObject ret = new JSObject();
            ret.put("cameras", cams);
            ret.put("hevcEncoder", hasEncoder("video/hevc"));
            ret.put("heicEncoder", hasEncoder("image/vnd.android.heic"));
            ret.put("androidSdk", Build.VERSION.SDK_INT);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "getCapabilities failed", e);
            call.reject("Could not read camera capabilities: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------------------------------------------
    // RAW (DNG) + JPEG
    // ------------------------------------------------------------------------------------------------

    @PluginMethod
    public void captureRaw(PluginCall call) {
        final String facing = call.getString("facing", "back");
        new Thread(() -> {
            Rig rig = new Rig();
            ImageReader rawReader = null;
            ImageReader jpgReader = null;
            ImageReader previewReader = null;
            Image rawImage = null;
            try {
                requireCameraPermission();
                String id = pickCamera(facing);
                if (id == null) throw new IOException("No suitable camera found");
                CameraCharacteristics ch = manager().getCameraCharacteristics(id);
                int[] caps = ch.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES);
                if (!has(caps, CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_RAW)) {
                    throw new IOException("This camera does not support RAW capture");
                }
                StreamConfigurationMap map = ch.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
                Size rawSize = largest(map.getOutputSizes(ImageFormat.RAW_SENSOR), Long.MAX_VALUE);
                Size jpgSize = largestJpeg(ch, map, Long.MAX_VALUE);
                if (rawSize == null || jpgSize == null) throw new IOException("RAW or JPEG output size unavailable");

                rawReader = ImageReader.newInstance(rawSize.getWidth(), rawSize.getHeight(), ImageFormat.RAW_SENSOR, 2);
                jpgReader = ImageReader.newInstance(jpgSize.getWidth(), jpgSize.getHeight(), ImageFormat.JPEG, 2);
                previewReader = newPreviewReader(rig);
                rig.readers.add(rawReader);
                rig.readers.add(jpgReader);
                rig.readers.add(previewReader);

                openDevice(rig, id);
                List<Surface> surfaces = new ArrayList<>();
                surfaces.add(previewReader.getSurface());
                surfaces.add(jpgReader.getSurface());
                surfaces.add(rawReader.getSurface());
                createSession(rig, surfaces);

                CaptureRequest.Builder preview = rig.device.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
                preview.addTarget(previewReader.getSurface());
                preview.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
                converge(rig, preview, 2500);

                int jpegOrientation = jpegOrientation(ch, facing);
                CaptureRequest.Builder still = rig.device.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE);
                still.addTarget(jpgReader.getSurface());
                still.addTarget(rawReader.getSurface());
                still.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
                still.set(CaptureRequest.JPEG_QUALITY, (byte) 95);
                still.set(CaptureRequest.JPEG_ORIENTATION, jpegOrientation);

                Shot shot = takeShot(rig, still, jpgReader, rawReader, 10_000);
                if (shot.result == null) throw new IOException("Capture failed");
                if (shot.jpeg == null) throw new IOException("No JPEG returned");
                if (shot.raw == null) throw new IOException("No RAW frame returned");
                rawImage = shot.raw;

                String stamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
                final Image rawToWrite = rawImage;
                final TotalCaptureResult result = shot.result;
                final int exifOrientation = exifOrientation(jpegOrientation);
                final CameraCharacteristics chFinal = ch;
                Uri dngUri = saveToGallery("RAW_" + stamp + ".dng", "image/x-adobe-dng", os -> {
                    DngCreator dng = new DngCreator(chFinal, result);
                    try {
                        dng.setOrientation(exifOrientation);
                        dng.writeImage(os, rawToWrite);
                    } finally {
                        dng.close();
                    }
                });
                final byte[] jpeg = shot.jpeg;
                Uri jpgUri = saveToGallery("RAW_" + stamp + ".jpg", "image/jpeg", os -> os.write(jpeg));

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("dngUri", dngUri == null ? "" : dngUri.toString());
                ret.put("jpegUri", jpgUri == null ? "" : jpgUri.toString());
                ret.put("fileName", "RAW_" + stamp + ".dng");
                ret.put("rawWidth", rawSize.getWidth());
                ret.put("rawHeight", rawSize.getHeight());
                ret.put("jpegRequestedWidth", jpgSize.getWidth());
                ret.put("jpegRequestedHeight", jpgSize.getHeight());
                ret.put("jpegWidth", shot.jpegWidth);
                ret.put("jpegHeight", shot.jpegHeight);
                ret.put("cameraId", id);
                ret.put("jpegBase64", Base64.encodeToString(jpeg, Base64.NO_WRAP));
                call.resolve(ret);
            } catch (Throwable t) {
                Log.e(TAG, "captureRaw failed", t);
                call.reject("RAW capture failed: " + t.getMessage());
            } finally {
                if (rawImage != null) rawImage.close();
                rig.close();
            }
        }, "NativeCamera-raw").start();
    }

    // ------------------------------------------------------------------------------------------------
    // High-speed (slow-motion) video: Camera2 constrained high-speed session -> MediaRecorder -> file
    // ------------------------------------------------------------------------------------------------

    private Rig hsRig;
    private MediaRecorder hsRecorder;
    private android.graphics.SurfaceTexture hsTexture;
    private File hsFile;
    private int hsFps;
    private Size hsSize;
    private long hsStartedAt;

    private static final class HsCandidate {
        String id;
        Size size;
        Range<Integer> range;
        CameraCharacteristics ch;
    }

    @PluginMethod
    public void startHighSpeed(PluginCall call) {
        final String facing = call.getString("facing", "back");
        new Thread(() -> {
            try {
                requireCameraPermission();
                if (hsRig != null) throw new IOException("A slow-motion recording is already running");

                // Every high-speed mode this camera offers, best first: fastest, fixed-rate, then biggest picture
                int want = "front".equals(facing) ? CameraCharacteristics.LENS_FACING_FRONT : CameraCharacteristics.LENS_FACING_BACK;
                List<HsCandidate> cands = new ArrayList<>();
                StringBuilder offered = new StringBuilder();
                for (String cid : manager().getCameraIdList()) {
                    CameraCharacteristics c = manager().getCameraCharacteristics(cid);
                    Integer f = c.get(CameraCharacteristics.LENS_FACING);
                    if (f == null || f != want) continue;
                    StreamConfigurationMap m = c.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
                    if (m == null || m.getHighSpeedVideoSizes() == null) continue;
                    for (Size s : m.getHighSpeedVideoSizes()) {
                        for (Range<Integer> r : m.getHighSpeedVideoFpsRangesFor(s)) {
                            offered.append(s.getWidth()).append('x').append(s.getHeight()).append(r).append(' ');
                            if (r.getUpper() < 60) continue;
                            HsCandidate k = new HsCandidate();
                            k.id = cid; k.size = s; k.range = r; k.ch = c;
                            cands.add(k);
                        }
                    }
                }
                if (cands.isEmpty()) throw new IOException("This camera has no high-speed (slow-motion) mode");
                java.util.Collections.sort(cands, (a, b) -> {
                    if (a.range.getUpper().intValue() != b.range.getUpper().intValue()) return b.range.getUpper() - a.range.getUpper();
                    boolean fa = a.range.getLower().equals(a.range.getUpper());
                    boolean fb = b.range.getLower().equals(b.range.getUpper());
                    if (fa != fb) return fa ? -1 : 1;
                    return Long.compare((long) b.size.getWidth() * b.size.getHeight(), (long) a.size.getWidth() * a.size.getHeight());
                });

                String lastError = "";
                int attempts = 0;
                for (HsCandidate cand : cands) {
                    for (int variant = 0; variant < 2; variant++) { // 0: preview + recorder surfaces, 1: recorder only
                        if (attempts++ >= 6) break;
                        Rig rig = new Rig();
                        MediaRecorder rec = null;
                        android.graphics.SurfaceTexture texture = null;
                        File file = null;
                        try {
                            File dir = new File(getContext().getFilesDir(), "recordings");
                            if (!dir.exists()) dir.mkdirs();
                            String stamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
                            file = new File(dir, "slowmo_" + stamp + ".mp4");
                            int fps = cand.range.getUpper();
                            Size size = cand.size;

                            rec = new MediaRecorder();
                            rec.setVideoSource(MediaRecorder.VideoSource.SURFACE);
                            rec.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                            rec.setOutputFile(file.getAbsolutePath());
                            rec.setVideoEncodingBitRate((int) Math.min(30_000_000L, (long) size.getWidth() * size.getHeight() * fps / 6));
                            rec.setVideoFrameRate(fps);
                            rec.setVideoSize(size.getWidth(), size.getHeight());
                            rec.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
                            rec.setOrientationHint(jpegOrientation(cand.ch, facing));
                            rec.prepare();
                            Surface recSurface = rec.getSurface();
                            List<Surface> surfaces = new ArrayList<>();
                            if (variant == 0) {
                                texture = new android.graphics.SurfaceTexture(false);
                                texture.setDefaultBufferSize(size.getWidth(), size.getHeight());
                                surfaces.add(new Surface(texture));
                            }
                            surfaces.add(recSurface);

                            openDevice(rig, cand.id);
                            final CountDownLatch latch = new CountDownLatch(1);
                            final boolean[] ok = new boolean[1];
                            rig.device.createConstrainedHighSpeedCaptureSession(surfaces, new CameraCaptureSession.StateCallback() {
                                @Override public void onConfigured(CameraCaptureSession s) {
                                    rig.session = s;
                                    ok[0] = true;
                                    latch.countDown();
                                }
                                @Override public void onConfigureFailed(CameraCaptureSession s) {
                                    latch.countDown();
                                }
                            }, rig.handler);
                            if (!latch.await(6, TimeUnit.SECONDS) || !ok[0]) throw new IOException("session not configured");

                            CaptureRequest.Builder b = rig.device.createCaptureRequest(CameraDevice.TEMPLATE_RECORD);
                            for (Surface sf : surfaces) b.addTarget(sf);
                            b.set(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, cand.range);
                            android.hardware.camera2.CameraConstrainedHighSpeedCaptureSession hs = (android.hardware.camera2.CameraConstrainedHighSpeedCaptureSession) rig.session;
                            List<CaptureRequest> burst = hs.createHighSpeedRequestList(b.build());
                            hs.setRepeatingBurst(burst, null, rig.handler);
                            rec.start();

                            hsRig = rig;
                            hsTexture = texture;
                            hsRecorder = rec;
                            hsFile = file;
                            hsFps = fps;
                            hsSize = size;
                            hsStartedAt = System.currentTimeMillis();

                            JSObject ret = new JSObject();
                            ret.put("success", true);
                            ret.put("width", size.getWidth());
                            ret.put("height", size.getHeight());
                            ret.put("fps", fps);
                            call.resolve(ret);
                            return;
                        } catch (Throwable t) {
                            lastError = size2(cand) + (variant == 0 ? " +preview" : " recorder-only") + ": " + t.getMessage();
                            Log.w(TAG, "high-speed attempt failed: " + lastError);
                            try { if (rec != null) rec.release(); } catch (Exception ignored) { }
                            try { if (texture != null) texture.release(); } catch (Exception ignored) { }
                            rig.close();
                            if (file != null && file.exists()) file.delete();
                        }
                    }
                    if (attempts >= 6) break;
                }
                throw new IOException("none of the camera's high-speed modes could be started (" + lastError + "; offered: " + offered + ")");
            } catch (Throwable t) {
                Log.e(TAG, "startHighSpeed failed", t);
                call.reject("Slow-motion could not start: " + t.getMessage());
            }
        }, "NativeCamera-highspeed-start").start();
    }

    private static String size2(HsCandidate c) {
        return c.size.getWidth() + "x" + c.size.getHeight() + c.range;
    }
    @PluginMethod
    public void stopHighSpeed(PluginCall call) {
        new Thread(() -> {
            final Rig rig = hsRig;
            final MediaRecorder rec = hsRecorder;
            final File file = hsFile;
            if (rig == null || rec == null || file == null) {
                call.reject("No slow-motion recording is running");
                return;
            }
            hsRig = null;
            hsRecorder = null;
            boolean valid = true;
            try {
                try { rig.session.stopRepeating(); } catch (Exception ignored) { }
                try { rig.session.abortCaptures(); } catch (Exception ignored) { }
                try {
                    rec.stop();
                } catch (RuntimeException tooShort) {
                    valid = false; // stop() throws when no frame was written yet
                }
            } finally {
                try { rec.release(); } catch (Exception ignored) { }
                try { if (hsTexture != null) hsTexture.release(); } catch (Exception ignored) { }
                hsTexture = null;
                rig.close();
            }
            if (!valid || !file.exists() || file.length() == 0) {
                if (file.exists()) file.delete();
                call.reject("The slow-motion clip was too short to save");
                return;
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("path", file.getAbsolutePath());
            ret.put("width", hsSize == null ? 0 : hsSize.getWidth());
            ret.put("height", hsSize == null ? 0 : hsSize.getHeight());
            ret.put("fps", hsFps);
            ret.put("durationMs", System.currentTimeMillis() - hsStartedAt);
            ret.put("bytes", file.length());
            call.resolve(ret);
        }, "NativeCamera-highspeed-stop").start();
    }

    // ------------------------------------------------------------------------------------------------
    // Multi-frame: night stacking and HDR
    // ------------------------------------------------------------------------------------------------

    @PluginMethod
    public void captureStack(PluginCall call) {
        final String mode = call.getString("mode", "night");
        final String facing = call.getString("facing", "back");
        final boolean hdr = "hdr".equals(mode);
        final int frames = Math.max(3, Math.min(hdr ? 5 : 15, call.getInt("frames", hdr ? 3 : 6)));
        new Thread(() -> {
            Rig rig = new Rig();
            try {
                requireCameraPermission();
                String id = pickCamera(facing);
                if (id == null) throw new IOException("No suitable camera found");
                CameraCharacteristics ch = manager().getCameraCharacteristics(id);
                StreamConfigurationMap map = ch.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
                Size size = largestJpeg(ch, map, STACK_MAX_AREA);
                if (size == null) throw new IOException("No JPEG size available");

                ImageReader jpgReader = ImageReader.newInstance(size.getWidth(), size.getHeight(), ImageFormat.JPEG, 2);
                ImageReader previewReader = newPreviewReader(rig);
                rig.readers.add(jpgReader);
                rig.readers.add(previewReader);
                openDevice(rig, id);
                List<Surface> surfaces = new ArrayList<>();
                surfaces.add(previewReader.getSurface());
                surfaces.add(jpgReader.getSurface());
                createSession(rig, surfaces);

                CaptureRequest.Builder preview = rig.device.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
                preview.addTarget(previewReader.getSurface());
                preview.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
                CaptureResult metered = converge(rig, preview, 3000);
                if (metered == null) throw new IOException("Camera did not deliver preview frames");

                Long baseExposure = metered.get(CaptureResult.SENSOR_EXPOSURE_TIME);
                Integer baseIso = metered.get(CaptureResult.SENSOR_SENSITIVITY);
                Range<Long> expRange = ch.get(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE);
                Range<Integer> isoRange = ch.get(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE);
                int[] caps = ch.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES);
                boolean manual = has(caps, CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_MANUAL_SENSOR)
                        && baseExposure != null && baseIso != null && expRange != null && isoRange != null;

                // Exposure plan for each frame (in EV relative to the metered exposure)
                double[] evs = new double[frames];
                if (hdr) {
                    double[] plan = frames >= 5 ? new double[]{0, -2, 2, -1, 1} : new double[]{0, -2, 2};
                    System.arraycopy(plan, 0, evs, 0, frames);
                } else {
                    // Night: same brightness every frame (no EV change); noise is cut by lower ISO + stacking
                    for (int i = 0; i < frames; i++) evs[i] = 0.0;
                }

                int jpegOrientation = jpegOrientation(ch, facing);
                List<byte[]> jpegs = new ArrayList<>();
                for (int i = 0; i < frames; i++) {
                    CaptureRequest.Builder still = rig.device.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE);
                    still.addTarget(jpgReader.getSurface());
                    still.set(CaptureRequest.JPEG_QUALITY, (byte) 97);
                    still.set(CaptureRequest.JPEG_ORIENTATION, 0); // decoded unrotated; rotated once at the end
                    if (manual) {
                        long[] exposure = new long[]{baseExposure};
                        int[] iso = new int[]{baseIso};
                        planExposure(evs[i], hdr, exposure, iso, expRange, isoRange);
                        still.set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_OFF);
                        still.set(CaptureRequest.SENSOR_EXPOSURE_TIME, exposure[0]);
                        still.set(CaptureRequest.SENSOR_SENSITIVITY, iso[0]);
                        still.set(CaptureRequest.CONTROL_AWB_LOCK, true);
                    } else {
                        Range<Integer> compRange = ch.get(CameraCharacteristics.CONTROL_AE_COMPENSATION_RANGE);
                        android.util.Rational step = ch.get(CameraCharacteristics.CONTROL_AE_COMPENSATION_STEP);
                        if (compRange != null && step != null && step.doubleValue() > 0) {
                            int steps = (int) Math.round(evs[i] / step.doubleValue());
                            steps = Math.max(compRange.getLower(), Math.min(compRange.getUpper(), steps));
                            still.set(CaptureRequest.CONTROL_AE_EXPOSURE_COMPENSATION, steps);
                        }
                    }
                    Shot shot = takeShot(rig, still, jpgReader, null, 8_000);
                    if (shot.jpeg != null) jpegs.add(shot.jpeg);
                }
                rig.close();
                if (jpegs.size() < 2) throw new IOException("Only " + jpegs.size() + " frame(s) were captured");

                int[] stats = new int[2]; // [framesUsed, framesTotal]
                Bitmap merged = hdr ? fuseHdr(jpegs, stats) : stackNight(jpegs, stats);
                if (merged == null) throw new IOException("Merging the frames failed");

                Matrix rot = new Matrix();
                rot.postRotate(jpegOrientation);
                Bitmap rotated = jpegOrientation == 0 ? merged : Bitmap.createBitmap(merged, 0, 0, merged.getWidth(), merged.getHeight(), rot, true);
                if (rotated != merged) merged.recycle();
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                rotated.compress(Bitmap.CompressFormat.JPEG, 95, bos);
                final byte[] out = bos.toByteArray();
                int outW = rotated.getWidth();
                int outH = rotated.getHeight();
                rotated.recycle();

                String stamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
                String name = (hdr ? "HDR_" : "NIGHT_") + stamp + ".jpg";
                Uri uri = saveToGallery(name, "image/jpeg", os -> os.write(out));

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("mode", hdr ? "hdr" : "night");
                ret.put("fileName", name);
                ret.put("uri", uri == null ? "" : uri.toString());
                ret.put("width", outW);
                ret.put("height", outH);
                ret.put("framesCaptured", jpegs.size());
                ret.put("framesUsed", stats[0]);
                ret.put("manualExposure", manual);
                ret.put("jpegBase64", Base64.encodeToString(out, Base64.NO_WRAP));
                call.resolve(ret);
            } catch (Throwable t) {
                Log.e(TAG, "captureStack failed", t);
                call.reject((hdr ? "HDR" : "Night") + " capture failed: " + t.getMessage());
            } finally {
                rig.close();
            }
        }, "NativeCamera-stack").start();
    }

    /** Applies an EV change to the metered exposure: shutter first (capped for handheld), then ISO. */
    private static void planExposure(double ev, boolean hdr, long[] exposureNs, int[] iso, Range<Long> expRange, Range<Integer> isoRange) {
        double factor = Math.pow(2.0, ev);
        long baseExp = exposureNs[0];
        int baseIso = iso[0];
        if (hdr) {
            // Bracket with shutter time only so noise and colour stay consistent between frames
            long target = Math.round(baseExp * factor);
            exposureNs[0] = Math.max(expRange.getLower(), Math.min(expRange.getUpper(), target));
            return;
        }
        // Night: keep the metered brightness (a bright scene must not be blown out) but trade ISO for shutter time:
        // a longer exposure at a lower ISO has less sensor noise for the same picture. Handheld cap is 1/15 s;
        // the stack then averages what noise is left.
        long cap = Math.min(expRange.getUpper(), 66_666_667L);
        double kShutter = baseExp >= cap ? 1.0 : (double) cap / (double) baseExp;
        double kIso = (double) baseIso / (double) isoRange.getLower();
        double k = Math.max(1.0, Math.min(kShutter, kIso));
        exposureNs[0] = Math.max(expRange.getLower(), Math.min(expRange.getUpper(), Math.round(baseExp * k)));
        iso[0] = Math.max(isoRange.getLower(), Math.min(isoRange.getUpper(), (int) Math.round(baseIso / k)));
    }

    // ------------------------------------------------------------------------------------------------
    // Merging
    // ------------------------------------------------------------------------------------------------

    private static Bitmap decode(byte[] jpeg) {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inPreferredConfig = Bitmap.Config.ARGB_8888;
        return BitmapFactory.decodeByteArray(jpeg, 0, jpeg.length, o);
    }

    /** Low-resolution, zero-mean/unit-variance luma used for alignment. */
    private static float[] lowLumaNormalized(Bitmap b, int lw, int lh) {
        Bitmap s = Bitmap.createScaledBitmap(b, lw, lh, true);
        int[] px = new int[lw * lh];
        s.getPixels(px, 0, lw, 0, 0, lw, lh);
        if (s != b) s.recycle();
        float[] l = new float[lw * lh];
        double mean = 0;
        for (int i = 0; i < px.length; i++) {
            int p = px[i];
            float y = (0.299f * ((p >> 16) & 255) + 0.587f * ((p >> 8) & 255) + 0.114f * (p & 255)) / 255f;
            l[i] = y;
            mean += y;
        }
        mean /= l.length;
        double var = 0;
        for (float v : l) var += (v - mean) * (v - mean);
        double sd = Math.sqrt(var / l.length);
        if (sd < 1e-4) sd = 1e-4;
        for (int i = 0; i < l.length; i++) l[i] = (float) ((l[i] - mean) / sd);
        return l;
    }

    private static float[] lowLumaRaw(Bitmap b, int lw, int lh) {
        Bitmap s = Bitmap.createScaledBitmap(b, lw, lh, true);
        int[] px = new int[lw * lh];
        s.getPixels(px, 0, lw, 0, 0, lw, lh);
        if (s != b) s.recycle();
        float[] l = new float[lw * lh];
        for (int i = 0; i < px.length; i++) {
            int p = px[i];
            l[i] = (0.299f * ((p >> 16) & 255) + 0.587f * ((p >> 8) & 255) + 0.114f * (p & 255)) / 255f;
        }
        return l;
    }

    /**
     * Integer translation (in low-res pixels) so that cur(x+dx, y+dy) matches ref(x, y).
     * Returns null when the best match sits on the search border (too much motion to trust).
     */
    private static int[] align(float[] ref, float[] cur, int w, int h) {
        final int R = ALIGN_RANGE;
        double best = Double.MAX_VALUE;
        int bx = 0, by = 0;
        for (int dy = -R; dy <= R; dy++) {
            for (int dx = -R; dx <= R; dx++) {
                double sum = 0;
                int n = 0;
                for (int y = R; y < h - R; y += 2) {
                    int rowRef = y * w;
                    int rowCur = (y + dy) * w;
                    for (int x = R; x < w - R; x += 2) {
                        sum += Math.abs(ref[rowRef + x] - cur[rowCur + x + dx]);
                        n++;
                    }
                }
                double cost = n == 0 ? Double.MAX_VALUE : sum / n;
                if (cost < best) {
                    best = cost;
                    bx = dx;
                    by = dy;
                }
            }
        }
        if (Math.abs(bx) == R || Math.abs(by) == R) return null;
        return new int[]{bx, by};
    }

    /** Aligned average of all frames: random noise falls by about sqrt(N). */
    private static Bitmap stackNight(List<byte[]> jpegs, int[] stats) {
        Bitmap ref = decode(jpegs.get(0));
        if (ref == null) return null;
        final int W = ref.getWidth();
        final int H = ref.getHeight();
        final int lw = W / ALIGN_SCALE;
        final int lh = H / ALIGN_SCALE;
        short[] sum = new short[W * H * 3];
        byte[] cnt = new byte[W * H];
        float[] refLow = lowLumaNormalized(ref, lw, lh);
        int used = 0;
        for (int i = 0; i < jpegs.size(); i++) {
            Bitmap b = i == 0 ? ref : decode(jpegs.get(i));
            jpegs.set(i, null);
            if (b == null || b.getWidth() != W || b.getHeight() != H) {
                if (b != null && b != ref) b.recycle();
                continue;
            }
            int dx = 0;
            int dy = 0;
            boolean ok = true;
            if (i > 0) {
                int[] off = align(refLow, lowLumaNormalized(b, lw, lh), lw, lh);
                if (off == null) ok = false;
                else {
                    dx = off[0] * ALIGN_SCALE;
                    dy = off[1] * ALIGN_SCALE;
                }
            }
            if (ok) {
                accumulate(b, dx, dy, sum, cnt, W, H);
                used++;
            }
            if (b != ref) b.recycle();
        }
        ref.recycle();
        stats[0] = used;
        stats[1] = jpegs.size();
        Bitmap out = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
        int[] row = new int[W];
        for (int y = 0; y < H; y++) {
            for (int x = 0; x < W; x++) {
                int idx = y * W + x;
                int c = Math.max(1, cnt[idx]);
                int i3 = idx * 3;
                int r = Math.min(255, sum[i3] / c);
                int g = Math.min(255, sum[i3 + 1] / c);
                int bl = Math.min(255, sum[i3 + 2] / c);
                row[x] = 0xFF000000 | (r << 16) | (g << 8) | bl;
            }
            out.setPixels(row, 0, W, 0, y, W, 1);
        }
        return out;
    }

    private static void accumulate(Bitmap b, int dx, int dy, short[] sum, byte[] cnt, int W, int H) {
        int[] px = new int[W];
        for (int y = 0; y < H; y++) {
            int sy = y + dy;
            if (sy < 0 || sy >= H) continue;
            b.getPixels(px, 0, W, 0, sy, W, 1);
            for (int x = 0; x < W; x++) {
                int sx = x + dx;
                if (sx < 0 || sx >= W) continue;
                int p = px[sx];
                int idx = y * W + x;
                int i3 = idx * 3;
                sum[i3] += (p >> 16) & 255;
                sum[i3 + 1] += (p >> 8) & 255;
                sum[i3 + 2] += p & 255;
                cnt[idx]++;
            }
        }
    }

    /**
     * Exposure fusion: every pixel is a weighted blend of the bracketed frames, favouring the frame in which
     * that region is best exposed. Weights are computed at low resolution and smoothed so the blend has no seams.
     */
    private static Bitmap fuseHdr(List<byte[]> jpegs, int[] stats) {
        int n = jpegs.size();
        Bitmap[] bm = new Bitmap[n];
        int W = 0;
        int H = 0;
        for (int i = 0; i < n; i++) {
            bm[i] = decode(jpegs.get(i));
            jpegs.set(i, null);
            if (bm[i] != null && W == 0) {
                W = bm[i].getWidth();
                H = bm[i].getHeight();
            }
        }
        if (W == 0) return null;
        final int lw = (W + ALIGN_SCALE - 1) / ALIGN_SCALE;
        final int lh = (H + ALIGN_SCALE - 1) / ALIGN_SCALE;
        // Keep only frames that decoded at the same size
        List<Bitmap> frames = new ArrayList<>();
        for (Bitmap b : bm) {
            if (b != null && b.getWidth() == W && b.getHeight() == H) frames.add(b);
            else if (b != null) b.recycle();
        }
        n = frames.size();
        if (n < 2) return null;
        int[] dx = new int[n];
        int[] dy = new int[n];
        float[] refLow = lowLumaNormalized(frames.get(0), lw, lh);
        int used = 1;
        for (int i = 1; i < n; i++) {
            int[] off = align(refLow, lowLumaNormalized(frames.get(i), lw, lh), lw, lh);
            if (off != null) {
                dx[i] = off[0] * ALIGN_SCALE;
                dy[i] = off[1] * ALIGN_SCALE;
                used++;
            }
        }
        float[][] wmap = new float[n][];
        for (int i = 0; i < n; i++) {
            float[] l = lowLumaRaw(frames.get(i), lw, lh);
            float[] w = new float[l.length];
            for (int k = 0; k < l.length; k++) {
                float d = l[k] - 0.5f;
                w[k] = (float) Math.exp(-(d * d) / (2 * 0.2 * 0.2)) + 1e-4f;
            }
            wmap[i] = boxBlur(boxBlur(w, lw, lh), lw, lh);
        }
        Bitmap out = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
        int[][] rows = new int[n][W];
        int[] outRow = new int[W];
        for (int y = 0; y < H; y++) {
            int[] sy = new int[n];
            for (int i = 0; i < n; i++) {
                sy[i] = Math.max(0, Math.min(H - 1, y + dy[i]));
                frames.get(i).getPixels(rows[i], 0, W, 0, sy[i], W, 1);
            }
            for (int x = 0; x < W; x++) {
                float ws = 0, r = 0, g = 0, b = 0;
                for (int i = 0; i < n; i++) {
                    int sx = Math.max(0, Math.min(W - 1, x + dx[i]));
                    float w = sample(wmap[i], lw, lh, sx / (float) ALIGN_SCALE, sy[i] / (float) ALIGN_SCALE);
                    int p = rows[i][sx];
                    ws += w;
                    r += w * ((p >> 16) & 255);
                    g += w * ((p >> 8) & 255);
                    b += w * (p & 255);
                }
                int ri = Math.min(255, Math.round(r / ws));
                int gi = Math.min(255, Math.round(g / ws));
                int bi = Math.min(255, Math.round(b / ws));
                outRow[x] = 0xFF000000 | (ri << 16) | (gi << 8) | bi;
            }
            out.setPixels(outRow, 0, W, 0, y, W, 1);
        }
        for (Bitmap b : frames) b.recycle();
        stats[0] = used;
        stats[1] = n;
        autoLevels(out);
        return out;
    }

    /**
     * Fusion alone lifts the blacks and flattens the picture. Stretch the levels between the 0.5% and 99.7%
     * luma percentiles (same scale on all channels, so colour is kept) and add a gentle S-curve for punch.
     */
    private static void autoLevels(Bitmap bmp) {
        final int W = bmp.getWidth();
        final int H = bmp.getHeight();
        int[] row = new int[W];
        long[] hist = new long[256];
        for (int y = 0; y < H; y += 2) {
            bmp.getPixels(row, 0, W, 0, y, W, 1);
            for (int x = 0; x < W; x += 2) {
                int p = row[x];
                int l = (int) (0.299f * ((p >> 16) & 255) + 0.587f * ((p >> 8) & 255) + 0.114f * (p & 255));
                hist[Math.min(255, l)]++;
            }
        }
        long total = 0;
        for (long h : hist) total += h;
        long loTarget = (long) (total * 0.005);
        long hiTarget = (long) (total * 0.997);
        long acc = 0;
        int lo = 0;
        int hi = 255;
        boolean loSet = false;
        for (int i = 0; i < 256; i++) {
            acc += hist[i];
            if (!loSet && acc >= loTarget) {
                lo = i;
                loSet = true;
            }
            if (acc >= hiTarget) {
                hi = i;
                break;
            }
        }
        if (hi - lo < 40) return; // already a narrow scene: leave it alone
        // Apply only part of the full stretch so the result stays natural (a full stretch crushes the blacks and
        // oversaturates colour), then a mild S-curve for punch.
        final float strength = 0.55f;
        final float loEff = lo * strength;
        final float hiEff = 255f - (255f - hi) * strength;
        final float range = hiEff - loEff;
        int[] lut = new int[256];
        for (int v = 0; v < 256; v++) {
            float x = Math.max(0f, Math.min(1f, (v - loEff) / range));
            float s = x * x * (3f - 2f * x);
            lut[v] = Math.round(255f * (0.8f * x + 0.2f * s));
        }
        for (int y = 0; y < H; y++) {
            bmp.getPixels(row, 0, W, 0, y, W, 1);
            for (int x = 0; x < W; x++) {
                int p = row[x];
                row[x] = 0xFF000000 | (lut[(p >> 16) & 255] << 16) | (lut[(p >> 8) & 255] << 8) | lut[p & 255];
            }
            bmp.setPixels(row, 0, W, 0, y, W, 1);
        }
    }

    private static float[] boxBlur(float[] src, int w, int h) {
        float[] dst = new float[src.length];
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                float s = 0;
                int c = 0;
                for (int yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) {
                    for (int xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
                        s += src[yy * w + xx];
                        c++;
                    }
                }
                dst[y * w + x] = s / c;
            }
        }
        return dst;
    }

    /** Bilinear sample of a low-res map at (fx, fy) in map coordinates. */
    private static float sample(float[] m, int w, int h, float fx, float fy) {
        fx = Math.max(0, Math.min(w - 1, fx - 0.5f));
        fy = Math.max(0, Math.min(h - 1, fy - 0.5f));
        int x0 = (int) fx;
        int y0 = (int) fy;
        int x1 = Math.min(w - 1, x0 + 1);
        int y1 = Math.min(h - 1, y0 + 1);
        float tx = fx - x0;
        float ty = fy - y0;
        float a = m[y0 * w + x0] * (1 - tx) + m[y0 * w + x1] * tx;
        float b = m[y1 * w + x0] * (1 - tx) + m[y1 * w + x1] * tx;
        return a * (1 - ty) + b * ty;
    }

    // ------------------------------------------------------------------------------------------------
    // Camera2 plumbing
    // ------------------------------------------------------------------------------------------------

    private static final class Rig {
        final HandlerThread thread = new HandlerThread("NativeCamera");
        final Handler handler;
        CameraDevice device;
        CameraCaptureSession session;
        final List<ImageReader> readers = new ArrayList<>();
        private boolean closed;

        Rig() {
            thread.start();
            handler = new Handler(thread.getLooper());
        }

        synchronized void close() {
            if (closed) return;
            closed = true;
            try { if (session != null) session.close(); } catch (Exception ignored) { }
            try { if (device != null) device.close(); } catch (Exception ignored) { }
            for (ImageReader r : readers) {
                try { r.close(); } catch (Exception ignored) { }
            }
            thread.quitSafely();
        }
    }

    private static final class Shot {
        TotalCaptureResult result;
        byte[] jpeg;
        int jpegWidth;
        int jpegHeight;
        Image raw; // caller closes
    }

    private interface Writer {
        void write(OutputStream os) throws Exception;
    }

    private CameraManager manager() {
        return (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
    }

    private void requireCameraPermission() throws IOException {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            throw new IOException("Camera permission not granted");
        }
    }

    private String pickCamera(String facing) throws CameraAccessException {
        int want = "front".equals(facing) ? CameraCharacteristics.LENS_FACING_FRONT : CameraCharacteristics.LENS_FACING_BACK;
        String best = null;
        long bestArea = -1;
        for (String id : manager().getCameraIdList()) {
            CameraCharacteristics ch = manager().getCameraCharacteristics(id);
            Integer f = ch.get(CameraCharacteristics.LENS_FACING);
            if (f == null || f != want) continue;
            int[] caps = ch.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES);
            if (!has(caps, CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_BACKWARD_COMPATIBLE)) continue;
            StreamConfigurationMap map = ch.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
            if (map == null) continue;
            Size s = largest(map.getOutputSizes(ImageFormat.JPEG), Long.MAX_VALUE);
            if (s == null) continue;
            long area = (long) s.getWidth() * s.getHeight();
            if (area > bestArea) {
                bestArea = area;
                best = id;
            }
        }
        return best;
    }

    /**
     * Largest JPEG size that keeps the sensor's own aspect ratio (so the photo uses the full field of view
     * instead of a cropped 16:9 strip). Falls back to the largest size of any shape.
     */
    private static Size largestJpeg(CameraCharacteristics ch, StreamConfigurationMap map, long maxArea) {
        Size[] sizes = map.getOutputSizes(ImageFormat.JPEG);
        android.graphics.Rect active = ch.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE);
        if (sizes == null || active == null || active.height() == 0) return largest(sizes, maxArea);
        double sensorAspect = (double) active.width() / active.height();
        Size best = null;
        for (Size s : sizes) {
            long area = (long) s.getWidth() * s.getHeight();
            if (area > maxArea) continue;
            double aspect = (double) s.getWidth() / s.getHeight();
            if (Math.abs(aspect - sensorAspect) / sensorAspect > 0.03) continue;
            if (best == null || area > (long) best.getWidth() * best.getHeight()) best = s;
        }
        return best != null ? best : largest(sizes, maxArea);
    }

    private static Size largest(Size[] sizes, long maxArea) {
        if (sizes == null || sizes.length == 0) return null;
        Size best = null;
        for (Size s : sizes) {
            long area = (long) s.getWidth() * s.getHeight();
            if (area > maxArea) continue;
            if (best == null || area > (long) best.getWidth() * best.getHeight()) best = s;
        }
        if (best == null) {
            // Everything is larger than the cap: use the smallest available
            for (Size s : sizes) {
                if (best == null || (long) s.getWidth() * s.getHeight() < (long) best.getWidth() * best.getHeight()) best = s;
            }
        }
        return best;
    }

    private static boolean has(int[] arr, int v) {
        if (arr == null) return false;
        for (int a : arr) if (a == v) return true;
        return false;
    }

    private static String levelName(Integer level) {
        if (level == null) return "unknown";
        switch (level) {
            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_LEGACY: return "LEGACY";
            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_LIMITED: return "LIMITED";
            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_FULL: return "FULL";
            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_3: return "LEVEL_3";
            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_EXTERNAL: return "EXTERNAL";
            default: return "unknown";
        }
    }

    private static boolean hasEncoder(String mime) {
        try {
            MediaCodecList list = new MediaCodecList(MediaCodecList.REGULAR_CODECS);
            for (MediaCodecInfo info : list.getCodecInfos()) {
                if (!info.isEncoder()) continue;
                for (String t : info.getSupportedTypes()) {
                    if (t.equalsIgnoreCase(mime)) return true;
                }
            }
        } catch (Exception ignored) { }
        return false;
    }

    private int jpegOrientation(CameraCharacteristics ch, String facing) {
        Integer so = ch.get(CameraCharacteristics.SENSOR_ORIENTATION);
        int sensor = so == null ? 90 : so;
        int rotation = 0;
        try {
            int r = getActivity().getWindowManager().getDefaultDisplay().getRotation();
            rotation = r == Surface.ROTATION_90 ? 90 : r == Surface.ROTATION_180 ? 180 : r == Surface.ROTATION_270 ? 270 : 0;
        } catch (Exception ignored) { }
        boolean front = "front".equals(facing);
        return front ? (sensor + rotation) % 360 : (sensor - rotation + 360) % 360;
    }

    private static int exifOrientation(int degrees) {
        switch (degrees) {
            case 90: return ExifInterface.ORIENTATION_ROTATE_90;
            case 180: return ExifInterface.ORIENTATION_ROTATE_180;
            case 270: return ExifInterface.ORIENTATION_ROTATE_270;
            default: return ExifInterface.ORIENTATION_NORMAL;
        }
    }

    private ImageReader newPreviewReader(Rig rig) {
        ImageReader reader = ImageReader.newInstance(640, 480, ImageFormat.YUV_420_888, 2);
        reader.setOnImageAvailableListener(r -> {
            Image img = r.acquireLatestImage();
            if (img != null) img.close();
        }, rig.handler);
        return reader;
    }

    @SuppressWarnings("MissingPermission")
    private void openDevice(Rig rig, String id) throws Exception {
        final CountDownLatch latch = new CountDownLatch(1);
        final Throwable[] error = new Throwable[1];
        manager().openCamera(id, new CameraDevice.StateCallback() {
            @Override public void onOpened(CameraDevice d) {
                rig.device = d;
                latch.countDown();
            }
            @Override public void onDisconnected(CameraDevice d) {
                d.close();
                error[0] = new IOException("Camera disconnected");
                latch.countDown();
            }
            @Override public void onError(CameraDevice d, int code) {
                d.close();
                error[0] = new IOException("Camera error " + code + (code == 1 ? " (in use by another app)" : ""));
                latch.countDown();
            }
        }, rig.handler);
        if (!latch.await(6, TimeUnit.SECONDS)) throw new TimeoutException("Camera open timed out");
        if (error[0] != null || rig.device == null) {
            throw new IOException(error[0] != null ? error[0].getMessage() : "Camera did not open");
        }
    }

    private void createSession(Rig rig, List<Surface> surfaces) throws Exception {
        final CountDownLatch latch = new CountDownLatch(1);
        final boolean[] ok = new boolean[1];
        rig.device.createCaptureSession(surfaces, new CameraCaptureSession.StateCallback() {
            @Override public void onConfigured(CameraCaptureSession s) {
                rig.session = s;
                ok[0] = true;
                latch.countDown();
            }
            @Override public void onConfigureFailed(CameraCaptureSession s) {
                latch.countDown();
            }
        }, rig.handler);
        if (!latch.await(6, TimeUnit.SECONDS) || !ok[0]) throw new IOException("Capture session could not be configured");
    }

    /** Runs the preview until auto-exposure and auto-focus settle; returns the last result. */
    private CaptureResult converge(Rig rig, CaptureRequest.Builder previewReq, long timeoutMs) throws Exception {
        final CountDownLatch done = new CountDownLatch(1);
        final CaptureResult[] last = new CaptureResult[1];
        final int[] stable = {0};
        rig.session.setRepeatingRequest(previewReq.build(), new CameraCaptureSession.CaptureCallback() {
            @Override
            public void onCaptureCompleted(CameraCaptureSession s, CaptureRequest r, TotalCaptureResult res) {
                last[0] = res;
                Integer ae = res.get(CaptureResult.CONTROL_AE_STATE);
                Integer af = res.get(CaptureResult.CONTROL_AF_STATE);
                boolean aeOk = ae == null || ae == CaptureResult.CONTROL_AE_STATE_CONVERGED
                        || ae == CaptureResult.CONTROL_AE_STATE_FLASH_REQUIRED || ae == CaptureResult.CONTROL_AE_STATE_LOCKED;
                boolean afOk = af == null || af == CaptureResult.CONTROL_AF_STATE_PASSIVE_FOCUSED
                        || af == CaptureResult.CONTROL_AF_STATE_FOCUSED_LOCKED || af == CaptureResult.CONTROL_AF_STATE_NOT_FOCUSED_LOCKED
                        || af == CaptureResult.CONTROL_AF_STATE_INACTIVE;
                if (aeOk && afOk) {
                    if (++stable[0] >= 6) done.countDown();
                } else {
                    stable[0] = 0;
                }
            }
        }, rig.handler);
        done.await(timeoutMs, TimeUnit.MILLISECONDS);
        return last[0];
    }

    private Shot takeShot(Rig rig, CaptureRequest.Builder request, ImageReader jpgReader, ImageReader rawReader, long timeoutMs) throws Exception {
        final BlockingQueue<Image> jpgQ = new LinkedBlockingQueue<>();
        final BlockingQueue<Image> rawQ = new LinkedBlockingQueue<>();
        jpgReader.setOnImageAvailableListener(r -> {
            Image im = r.acquireNextImage();
            if (im != null) jpgQ.offer(im);
        }, rig.handler);
        if (rawReader != null) {
            rawReader.setOnImageAvailableListener(r -> {
                Image im = r.acquireNextImage();
                if (im != null) rawQ.offer(im);
            }, rig.handler);
        }
        final CountDownLatch latch = new CountDownLatch(1);
        final TotalCaptureResult[] result = new TotalCaptureResult[1];
        rig.session.capture(request.build(), new CameraCaptureSession.CaptureCallback() {
            @Override
            public void onCaptureCompleted(CameraCaptureSession s, CaptureRequest r, TotalCaptureResult res) {
                result[0] = res;
                latch.countDown();
            }
            @Override
            public void onCaptureFailed(CameraCaptureSession s, CaptureRequest r, android.hardware.camera2.CaptureFailure f) {
                latch.countDown();
            }
        }, rig.handler);
        Shot shot = new Shot();
        if (!latch.await(timeoutMs, TimeUnit.MILLISECONDS)) throw new TimeoutException("Capture timed out");
        shot.result = result[0];
        Image j = jpgQ.poll(timeoutMs, TimeUnit.MILLISECONDS);
        if (j != null) {
            shot.jpegWidth = j.getWidth();
            shot.jpegHeight = j.getHeight();
            ByteBuffer buf = j.getPlanes()[0].getBuffer();
            byte[] bytes = new byte[buf.remaining()];
            buf.get(bytes);
            j.close();
            shot.jpeg = bytes;
        }
        if (rawReader != null) shot.raw = rawQ.poll(timeoutMs, TimeUnit.MILLISECONDS);
        return shot;
    }

    private Uri saveToGallery(String displayName, String mime, Writer writer) throws Exception {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentResolver resolver = context.getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, displayName);
            values.put(MediaStore.Images.Media.MIME_TYPE, mime);
            values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + ALBUM);
            values.put(MediaStore.Images.Media.IS_PENDING, 1);
            Uri uri = resolver.insert(MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values);
            if (uri == null) throw new IOException("Could not create a gallery entry");
            try (OutputStream os = resolver.openOutputStream(uri)) {
                if (os == null) throw new IOException("Could not open the gallery entry for writing");
                writer.write(os);
                os.flush();
            } catch (Exception e) {
                resolver.delete(uri, null, null);
                throw e;
            }
            values.clear();
            values.put(MediaStore.Images.Media.IS_PENDING, 0);
            resolver.update(uri, values, null, null);
            return uri;
        }
        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), ALBUM);
        if (!dir.exists()) dir.mkdirs();
        File file = new File(dir, displayName);
        try (OutputStream os = new FileOutputStream(file)) {
            writer.write(os);
            os.flush();
        }
        MediaScannerConnection.scanFile(context, new String[]{file.getAbsolutePath()}, new String[]{mime}, null);
        return Uri.fromFile(file);
    }
}
