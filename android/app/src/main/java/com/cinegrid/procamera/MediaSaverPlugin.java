package com.cinegrid.procamera;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

@CapacitorPlugin(name = "MediaSaver")
public class MediaSaverPlugin extends Plugin {
    private static final String TAG = "MediaSaverPlugin";
    private static final String ALBUM_NAME = "CineGrid Pro";

    @PluginMethod
    public void saveMedia(PluginCall call) {
        String base64Data = call.getString("data");
        String tempFilePath = call.getString("tempFilePath");
        String mediaType = call.getString("mediaType", "photo"); // "photo" or "video"
        String mimeType = call.getString("mimeType");
        String requestedName = call.getString("fileName");

        if (base64Data == null && tempFilePath == null) {
            call.reject("Either 'data' (Base64) or 'tempFilePath' must be provided");
            return;
        }

        try {
            Context context = getContext();
            ContentResolver resolver = context.getContentResolver();
            boolean isVideo = "video".equalsIgnoreCase(mediaType);

            // Determine file extension and MIME type
            String effectiveMimeType;
            String extension;
            if (isVideo) {
                if (mimeType != null && mimeType.contains("webm")) {
                    effectiveMimeType = "video/webm";
                    extension = ".webm";
                } else {
                    effectiveMimeType = "video/mp4";
                    extension = ".mp4";
                }
            } else {
                if (mimeType != null && mimeType.contains("png")) {
                    effectiveMimeType = "image/png";
                    extension = ".png";
                } else {
                    effectiveMimeType = "image/jpeg";
                    extension = ".jpg";
                }
            }

            // Generate clean filename
            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            String finalFileName;
            if (requestedName != null && !requestedName.trim().isEmpty()) {
                String clean = requestedName.trim();
                if (!clean.endsWith(extension)) {
                    clean += extension;
                }
                finalFileName = clean;
            } else {
                finalFileName = (isVideo ? "VID_" : "IMG_") + timeStamp + extension;
            }

            Uri savedUri = null;
            long bytesWritten = 0;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Modern Android 10+ (API 29 to 36) Scoped Storage MediaStore
                ContentValues values = new ContentValues();
                Uri collectionUri;

                if (isVideo) {
                    collectionUri = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                    values.put(MediaStore.Video.Media.DISPLAY_NAME, finalFileName);
                    values.put(MediaStore.Video.Media.MIME_TYPE, effectiveMimeType);
                    values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/" + ALBUM_NAME);
                    values.put(MediaStore.Video.Media.IS_PENDING, 1);
                    values.put(MediaStore.Video.Media.DATE_ADDED, System.currentTimeMillis() / 1000);
                    values.put(MediaStore.Video.Media.DATE_TAKEN, System.currentTimeMillis());
                } else {
                    collectionUri = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                    values.put(MediaStore.Images.Media.DISPLAY_NAME, finalFileName);
                    values.put(MediaStore.Images.Media.MIME_TYPE, effectiveMimeType);
                    values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + ALBUM_NAME);
                    values.put(MediaStore.Images.Media.IS_PENDING, 1);
                    values.put(MediaStore.Images.Media.DATE_ADDED, System.currentTimeMillis() / 1000);
                    values.put(MediaStore.Images.Media.DATE_TAKEN, System.currentTimeMillis());
                }

                savedUri = resolver.insert(collectionUri, values);
                if (savedUri == null) {
                    call.reject("Failed to create MediaStore entry");
                    return;
                }

                try (OutputStream out = resolver.openOutputStream(savedUri)) {
                    if (out == null) {
                        call.reject("Failed to open output stream for MediaStore URI");
                        return;
                    }

                    if (tempFilePath != null) {
                        File srcFile = new File(tempFilePath);
                        if (!srcFile.exists()) {
                            call.reject("Temporary file does not exist: " + tempFilePath);
                            return;
                        }
                        try (InputStream in = new FileInputStream(srcFile)) {
                            byte[] buffer = new byte[64 * 1024];
                            int read;
                            while ((read = in.read(buffer)) != -1) {
                                out.write(buffer, 0, read);
                                bytesWritten += read;
                            }
                        }
                        // Clean up temporary file
                        srcFile.delete();
                    } else {
                        // Base64 Data
                        String rawBase64 = base64Data;
                        // The media type may itself contain a comma (e.g. "video/mp4;codecs=avc1,opus;base64,..."),
                        // so split at the base64 marker, not at the first comma.
                        int marker = rawBase64.indexOf(";base64,");
                        if (marker >= 0) {
                            rawBase64 = rawBase64.substring(marker + 8);
                        } else if (rawBase64.contains(",")) {
                            rawBase64 = rawBase64.substring(rawBase64.indexOf(",") + 1);
                        }
                        byte[] decoded = Base64.decode(rawBase64, Base64.DEFAULT);
                        out.write(decoded);
                        bytesWritten = decoded.length;
                    }
                    out.flush();
                }

                // Finalize pending entry
                values.clear();
                if (isVideo) {
                    values.put(MediaStore.Video.Media.IS_PENDING, 0);
                } else {
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                }
                resolver.update(savedUri, values, null, null);

            } else {
                // Legacy Android (API < 29)
                File parentDir = Environment.getExternalStoragePublicDirectory(
                        isVideo ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_PICTURES
                );
                File targetDir = new File(parentDir, ALBUM_NAME);
                if (!targetDir.exists()) {
                    targetDir.mkdirs();
                }

                File destFile = new File(targetDir, finalFileName);
                try (OutputStream out = new FileOutputStream(destFile)) {
                    if (tempFilePath != null) {
                        File srcFile = new File(tempFilePath);
                        try (InputStream in = new FileInputStream(srcFile)) {
                            byte[] buffer = new byte[64 * 1024];
                            int read;
                            while ((read = in.read(buffer)) != -1) {
                                out.write(buffer, 0, read);
                                bytesWritten += read;
                            }
                        }
                        srcFile.delete();
                    } else {
                        String rawBase64 = base64Data;
                        // The media type may itself contain a comma (e.g. "video/mp4;codecs=avc1,opus;base64,..."),
                        // so split at the base64 marker, not at the first comma.
                        int marker = rawBase64.indexOf(";base64,");
                        if (marker >= 0) {
                            rawBase64 = rawBase64.substring(marker + 8);
                        } else if (rawBase64.contains(",")) {
                            rawBase64 = rawBase64.substring(rawBase64.indexOf(",") + 1);
                        }
                        byte[] decoded = Base64.decode(rawBase64, Base64.DEFAULT);
                        out.write(decoded);
                        bytesWritten = decoded.length;
                    }
                    out.flush();
                }

                savedUri = Uri.fromFile(destFile);
                MediaScannerConnection.scanFile(
                        context,
                        new String[]{destFile.getAbsolutePath()},
                        new String[]{effectiveMimeType},
                        null
                );
            }

            Log.i(TAG, "Successfully saved " + mediaType + " to Gallery: " + finalFileName + " (" + bytesWritten + " bytes)");

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("fileName", finalFileName);
            ret.put("uri", savedUri != null ? savedUri.toString() : "");
            ret.put("bytesWritten", bytesWritten);
            ret.put("mediaType", mediaType);
            call.resolve(ret);

        } catch (Exception e) {
            Log.e(TAG, "Error saving media to Gallery: " + e.getMessage(), e);
            call.reject("Error saving media to Gallery: " + e.getMessage());
        }
    }
}
